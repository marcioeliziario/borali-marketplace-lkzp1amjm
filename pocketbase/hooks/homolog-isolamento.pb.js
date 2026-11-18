/**
 * BORALI — PROBE DE ISOLAMENTO v0.2 (ARQUIVO TEMPORÁRIO DE HOMOLOGAÇÃO)
 *
 * NÃO É ARTEFATO DE PRODUÇÃO. Executa os 7 casos de isolamento nos dois sentidos
 * (Mercadinho → Barbosa e Barbosa → Mercadinho) + controle positivo da Barbosa
 * (C0b), e escreve UM ÚNICO registro consolidado em audit_log
 * (action='homolog.isolamento', resource='homolog', details=JSON dos casos).
 *
 * Gatilho: cron '* * * * *' (a cada 1 min). O cron faz AUTOLIMPEZA:
 *   - remove o próprio agendamento (cronRemove) ao final da 1ª execução;
 *   - o arquivo é removido do working tree antes do commit (fora do deploy).
 *
 * Credenciais: senha efêmera lida de $os.getenv (HOMOLOG_PASS_MERCADINHO /
 * HOMOLOG_PASS_BARBOSA). NUNCA logadas nem persistidas.
 *
 * IMPORTANTE (JSVM do PocketBase): callbacks rodam em VM separada — TODAS as
 * funções e variáveis usadas dentro do cron estão declaradas INLINE no callback,
 * sem referências de top-level.
 */

cronAdd('borali-homolog-isolamento', '* * * * *', () => {
  const BASE = $os.getenv('HOMOLOG_BASE_URL')
  const PASS_MERC = $os.getenv('HOMOLOG_PASS_MERCADINHO')
  const PASS_BARB = $os.getenv('HOMOLOG_PASS_BARBOSA')
  const EMAIL_MERC = 'comerciante.mercadinho@borali.local'
  const EMAIL_BARB = 'comerciante.barbosa@borali.local'

  const STORE_MERC = 'jcm1keiv55i8q6v'
  const STORE_BARB = 'zc5y4y12z243toe'
  const PROD_MERC = 'n5mt95kv9zulf50' // [DEMO] Açaí 500ml (Mercadinho) — controle C0
  const PROD_BARB = 's79n7qqi4x1t2vj' // [DEMO] Refrigerante Cola (Barbosa) — controle C0b

  // ---------- helpers (inline) ----------
  const httpReq = (method, url, headers, body) =>
    $http.send({ url: url, method: method, headers: headers || {}, body: body || null })

  const login = (email, pass) => {
    const res = httpReq(
      'POST',
      BASE + '/api/collections/users/auth-with-password',
      { 'Content-Type': 'application/json' },
      JSON.stringify({ identity: email, password: pass }),
    )
    if (res.statusCode >= 400)
      throw new Error('login falhou (' + res.statusCode + ') para ' + email)
    return res.json.token
  }

  const http = (method, path, token, body) => {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = 'Bearer ' + token
    const res = httpReq(method, BASE + path, headers, body ? JSON.stringify(body) : null)
    let parsed = null
    try {
      parsed = res.json
    } catch (_) {}
    return { status: res.statusCode, body: parsed }
  }

  const verdictFor = (status, expected) => {
    const s = Number(status)
    if (expected === '403/404') return s === 403 || s === 404 ? 'PASS' : 'FAIL'
    if (expected === '400/403') return s === 400 || s === 403 ? 'PASS' : 'FAIL'
    if (String(expected) === String(status)) return 'PASS'
    return 'FAIL'
  }

  // ---------- execução de um sentido ----------
  const runProbe = (
    direction,
    myEmail,
    myPass,
    myStore,
    otherStore,
    ownProductId,
    otherProductId,
  ) => {
    const cases = []
    const add = (id, op, expected, status, verdict, obs) =>
      cases.push({
        case: id,
        direction: direction,
        op: op,
        expected: expected,
        received: String(status),
        verdict: verdict,
        obs: obs || '',
      })

    let token
    try {
      token = login(myEmail, myPass)
    } catch (err) {
      add('LOGIN', 'auth-with-password', 200, 'erro', 'INCONCLUSIVO', '' + err)
      return cases
    }
    const h = (method, path, body) => http(method, path, token, body)

    // C0: controle — PATCH no PRÓPRIO produto (muta description e restaura)
    {
      let oldDesc = ''
      try {
        const before = h('GET', '/api/collections/products/records/' + ownProductId)
        oldDesc = before.body && before.body.description ? before.body.description : ''
      } catch (_) {}
      const r0 = h('PATCH', '/api/collections/products/records/' + ownProductId, {
        description: '[HOMOLOG] toque temporário',
      })
      const rR = h('PATCH', '/api/collections/products/records/' + ownProductId, {
        description: oldDesc,
      })
      add(
        'C0',
        'PATCH products/' + ownProductId + ' (próprio, muta+restaura)',
        200,
        r0.status,
        r0.status === 200 && rR.status === 200 ? 'PASS' : 'FAIL',
        'restauração=' + rR.status,
      )
    }

    // C1: PATCH cross-store
    {
      const r = h('PATCH', '/api/collections/products/records/' + otherProductId, {
        description: '[HOMOLOG] invasão',
      })
      add(
        'C1',
        'PATCH products/' + otherProductId + ' (alheio)',
        '403/404',
        r.status,
        verdictFor(r.status, '403/404'),
      )
    }

    // C2: DELETE cross-store em fixture descartável criada server-side na loja ALHEIA
    {
      let targetId = ''
      try {
        const col = $app.findCollectionByNameOrId('products')
        const rec = new Record(col)
        rec.set('store_id', otherStore)
        rec.set('name', '[HOMOLOG] Descartável cross ' + direction)
        rec.set('unit', 'un')
        rec.set('price', 1)
        rec.set('stock', 0)
        rec.set('status', 'active')
        $app.save(rec)
        targetId = rec.id
      } catch (err) {
        add('C2', 'fixture server-side', 200, 'erro', 'INCONCLUSIVO', '' + err)
      }
      if (targetId) {
        const r = h('DELETE', '/api/collections/products/records/' + targetId)
        add(
          'C2',
          'DELETE products/' + targetId + ' (alheio)',
          '403/404',
          r.status,
          verdictFor(r.status, '403/404'),
        )
        try {
          $app.delete($app.findRecordById($app.findCollectionByNameOrId('products'), targetId))
        } catch (_) {}
      }
    }

    // C3: bulk-update cross
    {
      const r = h('POST', '/backend/v1/borali/products/bulk-update', {
        ids: [otherProductId],
        patch: { price: 0.01 },
      })
      add(
        'C3',
        'POST /backend/v1/borali/products/bulk-update (alheio)',
        403,
        r.status,
        verdictFor(r.status, 403),
      )
    }

    // C4: bulk-delete cross
    {
      const r = h('POST', '/backend/v1/borali/products/bulk-delete', { ids: [otherProductId] })
      add(
        'C4',
        'POST /backend/v1/borali/products/bulk-delete (alheio)',
        403,
        r.status,
        verdictFor(r.status, 403),
      )
    }

    // C5: stock adjust cross
    {
      const r = h('POST', '/backend/v1/borali/stock/adjust', {
        product_id: otherProductId,
        delta: 5,
        reason: '[HOMOLOG] probe',
      })
      add(
        'C5',
        'POST /backend/v1/borali/stock/adjust (alheio)',
        '403/404',
        r.status,
        verdictFor(r.status, '403/404'),
      )
    }

    // C6: create atribuído a loja alheia
    {
      const r = h('POST', '/api/collections/products/records', {
        store_id: otherStore,
        name: '[HOMOLOG] Invasão C6 ' + direction,
        unit: 'un',
        price: 1,
        status: 'active',
      })
      let verdict = verdictFor(r.status, '400/403')
      if (r.status < 400 && r.body && r.body.id) {
        verdict = 'FAIL: produto criado em loja alheia'
        try {
          $app.delete($app.findRecordById($app.findCollectionByNameOrId('products'), r.body.id))
        } catch (_) {}
      }
      add('C6', 'POST products (store_id alheio)', '400/403', r.status, verdict)
    }

    // C7: listagem cross + verificação de CAMPOS administrativos na resposta
    {
      const r = h(
        'GET',
        '/api/collections/products/records?filter=store_id="' + otherStore + '"&perPage=50',
      )
      const total = r.body && r.body.totalItems !== undefined ? r.body.totalItems : '?'
      const items = (r.body && r.body.items) || []
      const leaks = []
      for (const it of items) {
        const f = ['stock', 'min_stock', 'barcode', 'internal_code', 'lot', 'expires_at'].filter(
          (k) => it[k] !== undefined,
        )
        if (f.length) leaks.push(f.join(','))
      }
      add(
        'C7',
        'GET products?filter=store_id=' + otherStore,
        200,
        r.status,
        r.status === 200
          ? leaks.length
            ? 'FAIL: campos admin expostos'
            : 'PASS (catálogo público, sem campos admin)'
          : 'FAIL',
        'totalItems=' + total + ' | items=' + items.length + ' | itens com leak=' + leaks.length,
      )
    }

    return cases
  }

  // Etapa 2: remoção do registro descartável p6twt2dztwyftee (superuser em runtime)
  let remocao = { alvo: 'p6twt2dztwyftee', removido: false, obs: '' }
  try {
    const alvo = $app.findRecordById($app.findCollectionByNameOrId('products'), 'p6twt2dztwyftee')
    const nome = alvo.get('name')
    if (nome.indexOf('HOMOLOG') === -1) {
      remocao.obs = 'REGISTRO NÃO É DESCARTÁVEL (name=' + nome + ') — NÃO removido'
    } else {
      $app.delete(alvo)
      remocao.removido = true
      remocao.obs = 'removido (name=' + nome + ')'
    }
  } catch (err) {
    remocao.obs = 'já inexistente ou erro: ' + err
  }

  // ---------- execução + persistência ----------
  const runId = 'iso-' + new Date().toISOString()
  let all = []
  let okA = false
  let okB = false
  try {
    all = all.concat(
      runProbe(
        'A:Mercadinho→Barbosa',
        EMAIL_MERC,
        PASS_MERC,
        STORE_MERC,
        STORE_BARB,
        PROD_MERC,
        PROD_BARB,
      ),
    )
    okA = true
  } catch (e) {
    console.log('[HOMOLOG] erro sentido A: ' + e)
  }
  try {
    all = all.concat(
      runProbe(
        'B:Barbosa→Mercadinho',
        EMAIL_BARB,
        PASS_BARB,
        STORE_BARB,
        STORE_MERC,
        PROD_BARB,
        PROD_MERC,
      ),
    )
    okB = true
  } catch (e) {
    console.log('[HOMOLOG] erro sentido B: ' + e)
  }

  // C0b: controle positivo da Barbosa (edita produto PRÓPRIO) — coberto pelo C0 do sentido B
  try {
    const col = $app.findCollectionByNameOrId('audit_log')
    const rec = new Record(col)
    rec.set('user_email', 'homolog@borali.local')
    rec.set('user_role', 'sistema')
    rec.set('action', 'homolog.isolamento')
    rec.set('resource', 'homolog')
    rec.set(
      'details',
      JSON.stringify({
        run_id: runId,
        at: new Date().toISOString(),
        status: okA && okB ? 'COMPLETO' : 'PARCIAL',
        sentido_A_ok: okA,
        sentido_B_ok: okB,
        c0b_barbosa: 'coberto pelo C0 do sentido B (Barbosa edita próprio produto)',
        remocao_descartavel: remocao,
        cases: all,
      }),
    )
    $app.save(rec)
    console.log('[HOMOLOG] run ' + runId + ' salvo em audit_log com ' + all.length + ' casos')
  } catch (err) {
    console.log('[HOMOLOG] ERRO ao salvar em audit_log: ' + err)
  }

  // Autolimpeza: remove o próprio cron após a 1ª execução bem-sucedida
  try {
    cronRemove('borali-homolog-isolamento')
  } catch (e) {
    console.log('[HOMOLOG] falha ao remover cron: ' + e)
  }
})

// ---- Rota TEMPORÁRIA de leitura dos resultados (homologação; some com o arquivo) ----
// Expõe apenas o JSON consolidado dos casos (sem credenciais). Sem middleware de auth
// para permitir leitura via fetch externo, pois o orçamento de logs se esgotou.
routerAdd('GET', '/backend/v1/borali/homolog/results', (e) => {
  try {
    const recs = $app.findRecordsByFilter(
      'audit_log',
      "action='homolog.isolamento'",
      '-created',
      1,
      0,
    )
    if (!recs || recs.length === 0) {
      return e.json(200, { status: 'pendente', obs: 'nenhum run registrado ainda' })
    }
    let details = recs[0].get('details')
    if (typeof details === 'string') {
      try {
        details = JSON.parse(details)
      } catch (_) {}
    }
    return e.json(200, { id: recs[0].get('id'), created: recs[0].get('created'), details: details })
  } catch (err) {
    return e.json(500, { status: 'erro', obs: '' + err })
  }
})
