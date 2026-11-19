/**
 * BORALI v0.2 — PROBE DE HOMOLOGAÇÃO (TEMPORÁRIO, com autolimpeza).
 *
 * Roda 1x via cron temporário registrado neste deploy e se remove do agendador
 * (cronRemove) ao final, gravando o run consolidado em audit_log
 * (action='homolog.isolamento') — lido depois pela rota GET
 * /backend/v1/borali/homolog/results (mantida em homolog-isolamento.pb.js).
 *
 * NOTA DE PLATAFORMA: o JSVM executa callbacks em pool separado — todo o código
 * (constantes e funções) vive DENTRO do callback do cron; nada no escopo global.
 *
 * Correções do instrumento vs. rodadas anteriores:
 * - Autenticação por login convencional (auth-with-password com senha efêmera
 *   gravada em runtime via superuser, lida de $os.getenv) — sem token efêmero.
 * - C0 em DUAS variantes: PATCH parcial (sem store_id no corpo, como o painel
 *   faz) e PATCH reenviando store_id — isola diferença entre instrumento e regra.
 * - O cron criado aqui é removido no fim do run (autolimpeza).
 */
cronAdd('borali-homolog-temp', '* * * * *', (c) => {
  const API = $os.getenv('PB_INSTANCE_URL')
  const PASS = $os.getenv('BORALI_HOMOLOG_PASSWORD')

  // Guarda de idempotência: se o ÚLTIMO run em audit_log já é COMPLETO (sem
  // fatal), não reexecuta — apenas se autolimpa do agendador.
  try {
    const last = $app.findRecordsByFilter(
      'audit_log',
      "action='homolog.isolamento'",
      '-created',
      1,
      0,
    )
    if (last && last.length > 0) {
      let det = last[0].get('details')
      if (typeof det === 'string') det = JSON.parse(det)
      if (det && det.status === 'COMPLETO' && !det.fatal && det.cases && det.cases.length > 0) {
        console.log('[HOMOLOG-TEMP] último run já COMPLETO — nada a fazer')
        cronRemove('borali-homolog-temp')
        return
      }
    }
  } catch (guardErr) {
    console.error('[HOMOLOG-TEMP] guarda: ' + guardErr)
  }

  // IDs reais confirmados no banco (stores/products/users)
  const STORE_MERCADO = 'jcm1keiv55i8q6v'
  const STORE_BARBOSA = 'zc5y4y12z243toe'
  const USER_MERCADO = 'comerciante.mercadinho@borali.local'
  const USER_BARBOSA = 'comerciante.barbosa@borali.local'
  const PROD_MERCADO = 'n5mt95kv9zulf50' // [DEMO] Açaí 500ml (estoque 15)
  const PROD_BARBOSA = 's79n7qqi4x1t2vj' // [DEMO] Refrigerante Cola (estoque 100)
  const PROD_MERCADO_DEL = 'h29u2muo6y20d4f' // alvo do DELETE cruzado (nunca é excluído — 403/404)
  const PROD_BARBOSA_DEL = 'z6qee6v3vgi2zv1'

  const ADMIN_FIELDS = [
    'stock',
    'min_stock',
    'barcode',
    'internal_code',
    'lot',
    'expires_at',
    'estimated_weight',
    'final_weight',
  ]

  function httpAuth(path, method, token, body) {
    // Sem object-spread: o esbuild do JSVM compila spread para __spreadValues,
    // indisponível no pool de VM do callback (ReferenceError em runtime).
    const opts = { method: method, headers: { 'Content-Type': 'application/json' } }
    if (token) opts.headers['Authorization'] = token
    if (body !== undefined) opts.body = JSON.stringify(body)
    opts.url = API + path
    const res = $http.send(opts)
    const corpo = res.body && typeof res.body === 'string' && res.body !== '' ? res.body : null
    return {
      status: res.statusCode,
      data: corpo !== null ? JSON.parse(corpo) : null,
    }
  }

  function login(email, password) {
    const r = httpAuth('/api/collections/users/auth-with-password', 'POST', '', {
      identity: email,
      password: password,
    })
    if (r.status !== 200) {
      throw new Error('login falhou ' + email + ': HTTP ' + r.status)
    }
    return r.data.token
  }

  function expectIn(status, list) {
    for (let i = 0; i < list.length; i++) {
      if (status === list[i]) return true
    }
    return false
  }

  function caseResult(dir, id, desc, op, expected, got, pass, obs) {
    return {
      case: id,
      direction: dir,
      desc: desc,
      op: op,
      expected: expected,
      received: got,
      verdict: pass ? 'PASS' : 'FAIL',
      obs: obs || '',
    }
  }

  const run = { run_id: 'iso-' + new Date().toISOString(), cases: [], public_checks: [] }
  let sentidoA = true
  let sentidoB = true

  try {
    // Provisiona senha efêmera em runtime via superuser (padrão do projeto —
    // nunca persistida nem versionada). Login convencional, não token efêmero.
    const emails = [USER_MERCADO, USER_BARBOSA]
    for (let e = 0; e < emails.length; e++) {
      const u = $app.findAuthRecordByEmail('users', emails[e])
      u.setPassword(PASS)
      $app.save(u)
    }

    const tokenA = login(USER_MERCADO, PASS) // sentido A: Mercadinho
    const tokenB = login(USER_BARBOSA, PASS) // sentido B: Barbosa

    // ---------- Controle público (anônimo) ----------
    const p0 = httpAuth('/api/collections/products/records?perPage=1', 'GET', '', undefined)
    const p1 = httpAuth(
      '/api/collections/products/records?filter=store_id%3D%27' + STORE_BARBOSA + '%27',
      'GET',
      '',
      undefined,
    )
    const p2 = httpAuth(
      '/api/collections/products/records?filter=store_id%3D%27' + STORE_MERCADO + '%27',
      'GET',
      '',
      undefined,
    )
    run.public_checks = [
      {
        check: 'products sem filtro (anônimo)',
        status: p0.status,
        totalItems: p0.data ? p0.data.totalItems : null,
      },
      {
        check: 'products Barbosa (anônimo)',
        status: p1.status,
        totalItems: p1.data ? p1.data.totalItems : null,
      },
      {
        check: 'products Mercadinho (anônimo)',
        status: p2.status,
        totalItems: p2.data ? p2.data.totalItems : null,
      },
    ]

    // ---------- C0 variante 1, sentido A (Mercadinho → próprio): PATCH parcial ----------
    const beforeA = httpAuth(
      '/api/collections/products/records/' + PROD_MERCADO,
      'GET',
      tokenA,
      undefined,
    )
    const origStockA = beforeA.data ? beforeA.data.stock : 0
    const c0a1 = httpAuth('/api/collections/products/records/' + PROD_MERCADO, 'PATCH', tokenA, {
      stock: origStockA + 1,
    })
    const c0a1r = httpAuth('/api/collections/products/records/' + PROD_MERCADO, 'PATCH', tokenA, {
      stock: origStockA,
    })
    const restoredA = httpAuth(
      '/api/collections/products/records/' + PROD_MERCADO,
      'GET',
      tokenA,
      undefined,
    )
    const persistedA = restoredA.data && restoredA.data.stock === origStockA
    run.cases.push(
      caseResult(
        'A:Mercadinho→próprio',
        'C0-parcial',
        'PATCH parcial SEM store_id no corpo (como o painel faz)',
        'PATCH products/' + PROD_MERCADO + ' {stock}',
        '200/200 + persistência',
        c0a1.status + '/restauração ' + c0a1r.status,
        c0a1.status === 200 && c0a1r.status === 200 && persistedA,
        'estoque antes/depois=' + origStockA + '/' + (restoredA.data ? restoredA.data.stock : '?'),
      ),
    )
    if (!(c0a1.status === 200 && c0a1r.status === 200 && persistedA)) sentidoA = false

    // ---------- C0 variante 2, sentido A: PATCH reenviando store_id ----------
    const c0a2 = httpAuth('/api/collections/products/records/' + PROD_MERCADO, 'PATCH', tokenA, {
      store_id: STORE_MERCADO,
      stock: origStockA + 1,
    })
    const c0a2r = httpAuth('/api/collections/products/records/' + PROD_MERCADO, 'PATCH', tokenA, {
      store_id: STORE_MERCADO,
      stock: origStockA,
    })
    run.cases.push(
      caseResult(
        'A:Mercadinho→próprio',
        'C0-com-store-id',
        'PATCH reenviando store_id no corpo',
        'PATCH products/' + PROD_MERCADO + ' {store_id, stock}',
        '200/200',
        c0a2.status + '/restauração ' + c0a2r.status,
        c0a2.status === 200 && c0a2r.status === 200,
        '',
      ),
    )
    if (!(c0a2.status === 200 && c0a2r.status === 200)) sentidoA = false

    // ---------- C0 sentido B (Barbosa → próprio): PATCH parcial ----------
    const beforeB = httpAuth(
      '/api/collections/products/records/' + PROD_BARBOSA,
      'GET',
      tokenB,
      undefined,
    )
    const origStockB = beforeB.data ? beforeB.data.stock : 0
    const c0b = httpAuth('/api/collections/products/records/' + PROD_BARBOSA, 'PATCH', tokenB, {
      stock: origStockB + 1,
    })
    const c0br = httpAuth('/api/collections/products/records/' + PROD_BARBOSA, 'PATCH', tokenB, {
      stock: origStockB,
    })
    const restoredB = httpAuth(
      '/api/collections/products/records/' + PROD_BARBOSA,
      'GET',
      tokenB,
      undefined,
    )
    const persistedB = restoredB.data && restoredB.data.stock === origStockB
    run.cases.push(
      caseResult(
        'B:Barbosa→próprio',
        'C0-parcial',
        'PATCH parcial SEM store_id no corpo (como o painel faz)',
        'PATCH products/' + PROD_BARBOSA + ' {stock}',
        '200/200 + persistência',
        c0b.status + '/restauração ' + c0br.status,
        c0b.status === 200 && c0br.status === 200 && persistedB,
        'estoque antes/depois=' + origStockB + '/' + (restoredB.data ? restoredB.data.stock : '?'),
      ),
    )
    if (!(c0b.status === 200 && c0br.status === 200 && persistedB)) sentidoB = false

    // ---------- C1: PATCH cruzado ----------
    const c1a = httpAuth('/api/collections/products/records/' + PROD_BARBOSA, 'PATCH', tokenA, {
      price: 0.01,
    })
    run.cases.push(
      caseResult(
        'A:Mercadinho→Barbosa',
        'C1',
        'PATCH em produto ALHEIO',
        'PATCH products/' + PROD_BARBOSA,
        '403/404',
        c1a.status,
        expectIn(c1a.status, [403, 404]),
      ),
    )
    const c1b = httpAuth('/api/collections/products/records/' + PROD_MERCADO, 'PATCH', tokenB, {
      price: 0.01,
    })
    run.cases.push(
      caseResult(
        'B:Barbosa→Mercadinho',
        'C1',
        'PATCH em produto ALHEIO',
        'PATCH products/' + PROD_MERCADO,
        '403/404',
        c1b.status,
        expectIn(c1b.status, [403, 404]),
      ),
    )

    // ---------- C2: DELETE cruzado ----------
    const c2a = httpAuth(
      '/api/collections/products/records/' + PROD_BARBOSA_DEL,
      'DELETE',
      tokenA,
      undefined,
    )
    run.cases.push(
      caseResult(
        'A:Mercadinho→Barbosa',
        'C2',
        'DELETE em produto ALHEIO',
        'DELETE products/' + PROD_BARBOSA_DEL,
        '403/404',
        c2a.status,
        expectIn(c2a.status, [403, 404]),
      ),
    )
    const c2b = httpAuth(
      '/api/collections/products/records/' + PROD_MERCADO_DEL,
      'DELETE',
      tokenB,
      undefined,
    )
    run.cases.push(
      caseResult(
        'B:Barbosa→Mercadinho',
        'C2',
        'DELETE em produto ALHEIO',
        'DELETE products/' + PROD_MERCADO_DEL,
        '403/404',
        c2b.status,
        expectIn(c2b.status, [403, 404]),
      ),
    )

    // ---------- C3/C4: bulk cruzado ----------
    const c3a = httpAuth('/backend/v1/borali/products/bulk-update', 'POST', tokenA, {
      ids: [PROD_BARBOSA],
      patch: { price: 0.01 },
    })
    run.cases.push(
      caseResult(
        'A:Mercadinho→Barbosa',
        'C3',
        'bulk-update cruzado',
        'POST bulk-update ids=[alheio]',
        403,
        c3a.status,
        c3a.status === 403,
      ),
    )
    const c3b = httpAuth('/backend/v1/borali/products/bulk-update', 'POST', tokenB, {
      ids: [PROD_MERCADO],
      patch: { price: 0.01 },
    })
    run.cases.push(
      caseResult(
        'B:Barbosa→Mercadinho',
        'C3',
        'bulk-update cruzado',
        'POST bulk-update ids=[alheio]',
        403,
        c3b.status,
        c3b.status === 403,
      ),
    )
    const c4a = httpAuth('/backend/v1/borali/products/bulk-delete', 'POST', tokenA, {
      ids: [PROD_BARBOSA],
    })
    run.cases.push(
      caseResult(
        'A:Mercadinho→Barbosa',
        'C4',
        'bulk-delete cruzado',
        'POST bulk-delete ids=[alheio]',
        403,
        c4a.status,
        c4a.status === 403,
      ),
    )
    const c4b = httpAuth('/backend/v1/borali/products/bulk-delete', 'POST', tokenB, {
      ids: [PROD_MERCADO],
    })
    run.cases.push(
      caseResult(
        'B:Barbosa→Mercadinho',
        'C4',
        'bulk-delete cruzado',
        'POST bulk-delete ids=[alheio]',
        403,
        c4b.status,
        c4b.status === 403,
      ),
    )

    // ---------- C5: ajuste de estoque cruzado ----------
    const c5a = httpAuth('/backend/v1/borali/stock/adjust', 'POST', tokenA, {
      product_id: PROD_BARBOSA,
      delta: -1,
      reason: '[HOMOLOG] probe C5',
    })
    run.cases.push(
      caseResult(
        'A:Mercadinho→Barbosa',
        'C5',
        'stock/adjust cruzado',
        'POST stock/adjust alheio',
        '403/404',
        c5a.status,
        expectIn(c5a.status, [403, 404]),
      ),
    )
    const c5b = httpAuth('/backend/v1/borali/stock/adjust', 'POST', tokenB, {
      product_id: PROD_MERCADO,
      delta: -1,
      reason: '[HOMOLOG] probe C5',
    })
    run.cases.push(
      caseResult(
        'B:Barbosa→Mercadinho',
        'C5',
        'stock/adjust cruzado',
        'POST stock/adjust alheio',
        '403/404',
        c5b.status,
        expectIn(c5b.status, [403, 404]),
      ),
    )

    // ---------- C6: criação atribuída a outra loja ----------
    const c6a = httpAuth('/api/collections/products/records', 'POST', tokenA, {
      store_id: STORE_BARBOSA,
      name: '[HOMOLOG] C6 probe A',
      unit: 'un',
      price: 1,
      status: 'active',
    })
    run.cases.push(
      caseResult(
        'A:Mercadinho→Barbosa',
        'C6',
        'POST com store_id ALHEIO',
        'POST products store_id=Barbosa',
        '400/403',
        c6a.status,
        expectIn(c6a.status, [400, 403]),
      ),
    )
    const c6b = httpAuth('/api/collections/products/records', 'POST', tokenB, {
      store_id: STORE_MERCADO,
      name: '[HOMOLOG] C6 probe B',
      unit: 'un',
      price: 1,
      status: 'active',
    })
    run.cases.push(
      caseResult(
        'B:Barbosa→Mercadinho',
        'C6',
        'POST com store_id ALHEIO',
        'POST products store_id=Mercadinho',
        '400/403',
        c6b.status,
        expectIn(c6b.status, [400, 403]),
      ),
    )

    // ---------- C7: campos admin na listagem da loja alheia ----------
    const leakCheck = function (store, token, label) {
      const r = httpAuth(
        '/api/collections/products/records?filter=store_id%3D%27' + store + '%27&perPage=50',
        'GET',
        token,
        undefined,
      )
      let leaks = 0
      let items = 0
      if (r.data && r.data.items) {
        items = r.data.items.length
        for (let i = 0; i < r.data.items.length; i++) {
          for (let j = 0; j < ADMIN_FIELDS.length; j++) {
            if (r.data.items[i][ADMIN_FIELDS[j]] !== undefined) leaks++
          }
        }
      }
      return {
        check: label,
        status: r.status,
        totalItems: r.data ? r.data.totalItems : null,
        items: items,
        leaks: leaks,
      }
    }
    run.public_checks.push(
      leakCheck(STORE_BARBOSA, tokenA, 'C7 A: listagem Barbosa vista por Mercadinho'),
    )
    run.public_checks.push(
      leakCheck(STORE_MERCADO, tokenB, 'C7 B: listagem Mercadinho vista por Barbosa'),
    )

    // ---------- C0b: endpoints que alimentam /painel-lojista ----------
    const c0bA = httpAuth(
      '/api/collections/stores/records/' + STORE_MERCADO,
      'GET',
      tokenA,
      undefined,
    )
    const c0bB = httpAuth(
      '/api/collections/stores/records/' + STORE_BARBOSA,
      'GET',
      tokenB,
      undefined,
    )
    const ordersA = httpAuth(
      '/api/collections/orders/records?filter=store_id%3D%27' + STORE_MERCADO + '%27',
      'GET',
      tokenA,
      undefined,
    )
    const ordersB = httpAuth(
      '/api/collections/orders/records?filter=store_id%3D%27' + STORE_BARBOSA + '%27',
      'GET',
      tokenB,
      undefined,
    )
    run.panel_checks = [
      { check: 'GET store própria (Mercadinho)', status: c0bA.status },
      { check: 'GET store própria (Barbosa)', status: c0bB.status },
      { check: 'GET orders própria (Mercadinho)', status: ordersA.status },
      { check: 'GET orders própria (Barbosa)', status: ordersB.status },
    ]
  } catch (err) {
    run.fatal = String(err)
  }
  console.log('[HOMOLOG-TEMP] status parcial: ' + run.status + ' | fatal: ' + run.fatal)
  console.log(
    '[HOMOLOG-TEMP] casos executados: ' +
      run.cases.length +
      ' | checks públicos: ' +
      run.public_checks.length,
  )
  for (let i = 0; i < run.cases.length; i++) {
    console.log(
      '[HOMOLOG-TEMP] ' +
        run.cases[i].case +
        ' (' +
        run.cases[i].direction +
        ') ' +
        run.cases[i].verdict +
        ' — esperado ' +
        run.cases[i].expected +
        ', recebido ' +
        run.cases[i].received,
    )
  }

  for (let i = 0; i < run.cases.length; i++) {
    const caso = run.cases[i]
    if (caso.verdict !== 'PASS') {
      if (caso.direction.indexOf('A:') === 0) sentidoA = false
      else if (caso.direction.indexOf('B:') === 0) sentidoB = false
    }
  }

  run.sentido_A_ok = sentidoA
  run.sentido_B_ok = sentidoB
  run.status = run.fatal ? 'FATAL: ' + run.fatal : 'COMPLETO'

  try {
    const log = new Record($app.findCollectionByNameOrId('audit_log'))
    log.set('user_id', '')
    log.set('user_email', 'homolog@borali.local')
    log.set('user_role', 'sistema')
    log.set('action', 'homolog.isolamento')
    log.set('resource', 'homolog')
    log.set('resource_id', '')
    log.set('details', JSON.stringify(run))
    $app.save(log)
  } catch (err2) {
    console.error('probe: falha ao gravar audit_log: ' + err2)
  }

  cronRemove('borali-homolog-temp')
})
