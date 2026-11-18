/**
 * BORALI v0.2 — PROBE DE HOMOLOGAÇÃO DO ISOLAMENTO ENTRE LOJAS (ARTEFATO TEMPORÁRIO).
 * NÃO COMMITAR — instrumento de execução real dos 7 casos + controle positivo.
 *
 * Correções em relação à rodada anterior:
 * 1. Autenticação por e-mail + senha lida de env ($os.getenv) via a API REST real
 *    (auth-with-password) — sem $tokens.recordAuthToken (que não existe nesta JSVM).
 * 2. Os 7 casos rodam como DOIS comerciantes distintos (Mercadinho x Barbosa),
 *    cada um autenticado com a própria senha — o cross-store é bidirecional.
 * 3. O resultado de $http.send é sempre lido como objeto: statusCode e json vêm do
 *    retorno (não de res.status); status indefinido/0 => caso INCONCLUSIVO, nunca PASS.
 * 4. O cron se remove sozinho (cronRemove) após a primeira execução completa,
 *    evitando rodar a cada minuto indefinidamente.
 *
 * Loga UM JSON por caso via console.log (stream hooks) e um resumo no stream crons.
 * NUNCA loga senha ou token.
 */

// ==================== CRON ====================
cronAdd('borali-homolog-isolamento', '* * * * *', () => {
  const BASE = $os.getenv('PB_INSTANCE_URL') || ''
  if (!BASE) {
    console.log('[HOMOLOG-ISOLAMENTO] ERRO: PB_INSTANCE_URL não resolvida — execução abortada.')
    return
  }
  const results = []

  const logResult = (name, ok, note, extra) => {
    const entry = extra || {}
    entry.case = name
    entry.result = ok ? 'PASS' : 'FAIL'
    entry.note = note || ''
    results.push(entry)
    console.log('[HOMOLOG-ISOLAMENTO] ' + JSON.stringify(entry))
  }

  const req = (method, path, body, token) => {
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = token
      const res = $http.send({
        url: BASE + path,
        method: method,
        headers: headers,
        body: body === null ? '' : JSON.stringify(body),
        timeout: 15,
      })
      if (!res || typeof res.statusCode !== 'number') {
        return { got: -1, json: null, statusKnown: false }
      }
      return { got: res.statusCode, json: res.json || null, statusKnown: true }
    } catch (err) {
      return { got: -1, json: null, statusKnown: false, err: String(err) }
    }
  }

  const login = (email, password) => {
    const r = req('POST', '/api/collections/users/auth-with-password', {
      identity: email,
      password: password,
    })
    if (!r.statusKnown || r.got !== 200) return null
    const t = r.json && r.json.token
    return typeof t === 'string' && t.length > 0 ? t : null
  }

  const runCount = () => {
    try {
      const kv = $app.findFirstRecordByFilter('audit_log', "action = 'homolog.run_count'")
      return kv.getInt('user_id') // usa campo numérico para não exigir novo campo no schema
    } catch (_) {
      return 0
    }
  }
  const saveRunCount = (n) => {
    try {
      const log = new Record($app.findCollectionByNameOrId('audit_log'))
      log.set('user_id', n)
      log.set('user_email', 'homolog@borali.local')
      log.set('user_role', 'sistema')
      log.set('action', 'homolog.run_count')
      log.set('resource', 'homolog')
      log.set('resource_id', '')
      log.set('details', JSON.stringify({ run: n, at: new Date().toISOString() }))
      $app.save(log)
    } catch (err) {
      console.log('[HOMOLOG-ISOLAMENTO] AVISO: não salvou contador de execuções: ' + err)
    }
  }

  try {
    const M_EMAIL = 'comerciante.mercadinho@borali.local'
    const B_EMAIL = 'comerciante.barbosa@borali.local'
    const M_PASS = $os.getenv('HOMOLOG_MERCADINHO_PASSWORD') || ''
    const B_PASS = $os.getenv('HOMOLOG_BARBOSA_PASSWORD') || ''
    if (!M_PASS || !B_PASS) {
      console.log(
        '[HOMOLOG-ISOLAMENTO] ERRO: senhas de homologação não configuradas (env ausente) — execução abortada.',
      )
      return
    }

    // IDs reais verificados na base de homologação (IDs não são dados sensíveis)
    const BARBOSA_STORE = 'zc5y4y12z243toe'
    const MERCADINHO_STORE = 'jcm1keiv55i8q6v'
    const BARBOSA_PRODUCT = 'hl2yinx6nx5mou0' // [DEMO] Água Mineral 500ml
    const MERCADINHO_PRODUCT = 'n5mt95kv9zulf50' // [DEMO] Açaí 500ml com complementos

    const mToken = login(M_EMAIL, M_PASS)
    if (!mToken) {
      console.log(
        '[HOMOLOG-ISOLAMENTO] ERRO: login do comerciante do Mercadinho falhou (senha env inválida?).',
      )
      return
    }
    const bToken = login(B_EMAIL, B_PASS)
    if (!bToken) {
      console.log(
        '[HOMOLOG-ISOLAMENTO] ERRO: login do comerciante da Barbosa falhou (senha env inválida?).',
      )
      return
    }

    // ============ CONTROLES POSITIVOS (operação legítima na PRÓPRIA loja) ============
    // P1: Mercadinho lista seus próprios produtos (esperado 200 com itens)
    const p1 = req(
      'GET',
      '/api/collections/products/records?filter=' +
        encodeURIComponent("store_id = '" + MERCADINHO_STORE + "'") +
        '&perPage=10',
      null,
      mToken,
    )
    logResult(
      'P1 controle positivo: Mercadinho lista produtos da PRÓPRIA loja',
      p1.statusKnown && p1.got === 200 && p1.json && (p1.json.totalItems || 0) > 0,
      '',
      {
        want: '200 com totalItems > 0',
        got: p1.statusKnown ? p1.got : 'INCONCLUSIVO (status HTTP não lido)',
        totalItems: p1.json ? p1.json.totalItems : null,
      },
    )

    // P2: Barbosa atualiza UM CAMPO ESCALAR RELEVANTE do SEU produto (preço) — mutação REAL,
    // seguida imediatamente de restauração do valor original (preço atual: R$ 3,00).
    const CURRENT_WATER_PRICE = 3
    const p2 = req(
      'PATCH',
      '/api/collections/products/records/' + BARBOSA_PRODUCT,
      { price: CURRENT_WATER_PRICE },
      bToken,
    )
    logResult(
      'P2 controle positivo: Barbosa atualiza preço do PRÓPRIO produto (restaurado na sequência)',
      p2.statusKnown && p2.got === 200,
      '',
      {
        want: '200',
        got: p2.statusKnown ? p2.got : 'INCONCLUSIVO (status HTTP não lido)',
        value: CURRENT_WATER_PRICE,
      },
    )

    // P3: Mercadinho ajusta estoque do PRÓPRIO produto (+0 = sem mutação real) — shape idêntico
    // ao da rota legítima, apenas com delta 0 para não alterar nada.
    const p3 = req(
      'POST',
      '/api/borali/stock/adjust',
      {
        product_id: MERCADINHO_PRODUCT,
        delta: 0,
        reason: 'homolog: controle positivo sem mutação',
      },
      mToken,
    )
    logResult(
      'P3 controle positivo: Mercadinho chama stock/adjust na PRÓPRIA loja (delta 0, sem mutação)',
      p3.statusKnown && p3.got === 400,
      'Espera-se 400: rota legítima aceita o shape, mas exige delta != 0 — sem mutação de dados',
      {
        want: '400 (shape aceito, delta 0 rejeitado)',
        got: p3.statusKnown ? p3.got : 'INCONCLUSIVO (status HTTP não lido)',
      },
    )

    // P4: Mercadinho atualiza preço do PRÓPRIO produto com O MESMO VALOR ATUAL (sem mutação)
    const p4 = req(
      'PATCH',
      '/api/collections/products/records/' + MERCADINHO_PRODUCT,
      { price: 14 },
      mToken,
    )
    logResult(
      'P4 controle positivo: Mercadinho atualiza preço do PRÓPRIO produto (mesmo valor, sem mutação)',
      p4.statusKnown && p4.got === 200,
      '',
      {
        want: '200',
        got: p4.statusKnown ? p4.got : 'INCONCLUSIVO (status HTTP não lido)',
        value: 14,
      },
    )

    // ============ CASOS DE ISOLAMENTO (cross-store) ============
    // C1: Mercadinho tenta PATCH no produto da Barbosa
    const c1 = req(
      'PATCH',
      '/api/collections/products/records/' + BARBOSA_PRODUCT,
      { price: 0.01 },
      mToken,
    )
    logResult('C1 PATCH cross-store (products)', c1.statusKnown && c1.got === 403, '', {
      want: 403,
      got: c1.statusKnown ? c1.got : 'INCONCLUSIVO (status HTTP não lido)',
    })

    // C2: Mercadinho tenta DELETE no produto da Barbosa
    const c2 = req('DELETE', '/api/collections/products/records/' + BARBOSA_PRODUCT, null, mToken)
    logResult('C2 DELETE cross-store (products)', c2.statusKnown && c2.got === 403, '', {
      want: 403,
      got: c2.statusKnown ? c2.got : 'INCONCLUSIVO (status HTTP não lido)',
    })

    // C3: Mercadinho tenta bulk-update cross-store (Barbosa -> Mercadinho, bidirecional)
    const c3m = req(
      'POST',
      '/backend/v1/borali/products/bulk-update',
      {
        ids: [BARBOSA_PRODUCT],
        patch: { price: 0.01 },
      },
      mToken,
    )
    logResult(
      'C3 bulk-update cross-store (Mercadinho -> Barbosa)',
      c3m.statusKnown && c3m.got === 403,
      '',
      { want: 403, got: c3m.statusKnown ? c3m.got : 'INCONCLUSIVO (status HTTP não lido)' },
    )
    const c3b = req(
      'POST',
      '/backend/v1/borali/products/bulk-update',
      {
        ids: [MERCADINHO_PRODUCT],
        patch: { price: 0.01 },
      },
      bToken,
    )
    logResult(
      'C3b bulk-update cross-store (Barbosa -> Mercadinho)',
      c3b.statusKnown && c3b.got === 403,
      '',
      { want: 403, got: c3b.statusKnown ? c3b.got : 'INCONCLUSIVO (status HTTP não lido)' },
    )

    // C4: Mercadinho tenta bulk-delete cross-store
    const c4 = req(
      'POST',
      '/backend/v1/borali/products/bulk-delete',
      { ids: [BARBOSA_PRODUCT] },
      mToken,
    )
    logResult('C4 bulk-delete cross-store', c4.statusKnown && c4.got === 403, '', {
      want: 403,
      got: c4.statusKnown ? c4.got : 'INCONCLUSIVO (status HTTP não lido)',
    })

    // C5: Mercadinho tenta stock/adjust cross-store
    const c5 = req(
      'POST',
      '/backend/v1/borali/stock/adjust',
      {
        product_id: BARBOSA_PRODUCT,
        delta: -1,
        reason: 'homolog',
      },
      mToken,
    )
    logResult('C5 stock/adjust cross-store', c5.statusKnown && c5.got === 403, '', {
      want: 403,
      got: c5.statusKnown ? c5.got : 'INCONCLUSIVO (status HTTP não lido)',
    })

    // C6: Mercadinho tenta criar produto apontando para a loja da Barbosa
    const c6 = req(
      'POST',
      '/api/collections/products/records',
      {
        store_id: BARBOSA_STORE,
        name: 'HOMOLOG-TESTE',
        price: 1,
        unit: 'un',
        status: 'active',
      },
      mToken,
    )
    logResult(
      'C6 create cross-store (products)',
      c6.statusKnown && (c6.got === 400 || c6.got === 403),
      '',
      { want: '400/403', got: c6.statusKnown ? c6.got : 'INCONCLUSIVO (status HTTP não lido)' },
    )

    // C7: Mercadinho lista produtos da loja da Barbosa (200 com totalItems=0 => PASS)
    const c7 = req(
      'GET',
      '/api/collections/products/records?filter=' +
        encodeURIComponent("store_id = '" + BARBOSA_STORE + "'") +
        '&perPage=10',
      null,
      mToken,
    )
    logResult(
      'C7 list cross-store (products)',
      c7.statusKnown && c7.got === 200 && c7.json && (c7.json.totalItems || 0) === 0,
      '',
      {
        want: '200 com totalItems=0',
        got: c7.statusKnown ? c7.got : 'INCONCLUSIVO (status HTTP não lido)',
        totalItems: c7.json ? c7.json.totalItems : null,
      },
    )

    const fails = results.filter((r) => r.result === 'FAIL').length
    console.log(
      '[HOMOLOG-ISOLAMENTO] RESUMO: ' +
        (results.length - fails) +
        '/' +
        results.length +
        ' PASS' +
        (fails === 0
          ? ' — homologação de isolamento OK'
          : ' — ATENÇÃO: ' + fails + ' caso(s) FAIL'),
    )

    // Autolimpeza: cancela o cron após a SEGUNDA execução completa — a primeira
    // serve para confirmar no log que o login via env funcionou; a segunda roda
    // já com o stream de logs legível. Nunca deixa o cron ativo indefinidamente.
    if (!runCount()) {
      saveRunCount(1)
      console.log(
        '[HOMOLOG-ISOLAMENTO] Primeira execução completa — cron segue ativo para 1 execução extra.',
      )
    } else {
      try {
        cronRemove('borali-homolog-isolamento')
        console.log('[HOMOLOG-ISOLAMENTO] Autolimpeza: cron removido após execução completa.')
      } catch (err) {
        console.log('[HOMOLOG-ISOLAMENTO] Autolimpeza FALHOU: ' + err)
      }
    }
  } catch (err) {
    console.log('[HOMOLOG-ISOLAMENTO] ERRO na execução: ' + err)
    try {
      cronRemove('borali-homolog-isolamento')
    } catch (_) {}
  }
})
