/**
 * BORALI v0.2 — HOOK TEMPORÁRIO DE HOMOLOGAÇÃO (NÃO COMMITAR)
 *
 * Executa as 7 tentativas de acesso cruzado entre lojas + 1 controle positivo
 * na própria loja, autenticando como o usuário de teste do Mercadinho.
 *
 * Autenticação SEM senha: o token é gerado server-side com $tokens.recordAuthToken
 * para o registro do usuário de teste — não há senha em código, env ou log.
 * As requisições passam pela API REST real (loopback no próprio PocketBase),
 * então exercem exatamente as mesmas regras de autorização de produção.
 *
 * Loga nome do caso, status HTTP recebido vs. esperado e PASS/FAIL.
 * NUNCA loga senha, token ou dados sensíveis.
 *
 * Duas entradas (mesma lógica duplicada: a JSVM não permite referenciar
 * declarações top-level dentro de callbacks):
 * - Cron "borali-homolog-isolamento" (* * * * *) — loga no stream crons e
 *   remove o próprio cron após a primeira execução com os 8 casos.
 * - GET /backend/v1/borali/homolog/isolamento — dispara sob demanda e retorna
 *   o resultado em JSON (leitura direta quando o stream de logs não está visível).
 */

// ==================== CRON ====================
cronAdd('borali-homolog-isolamento', '* * * * *', () => {
  const BASE = $os.getenv('PB_INSTANCE_URL') || ''
  const results = []

  const logResult = (name, got, want, ok, note) => {
    results.push({ name: name, got: got, want: want, ok: ok, note: note || '' })
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
      return res.statusCode
    } catch (err) {
      return -1 // erro de rede/timeout (loopback local: não deve acontecer)
    }
  }

  try {
    // Token server-side do usuário de teste (sem senha envolvida)
    let token = ''
    try {
      const user = $app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'comerciante.mercadinho@borali.local',
      )
      token = $tokens.recordAuthToken(user)
    } catch (err) {
      console.log(
        '[HOMOLOG-ISOLAMENTO] ERRO: nao foi possivel gerar token do usuario de teste: ' + err,
      )
      return
    }
    if (!token) {
      console.log('[HOMOLOG-ISOLAMENTO] ERRO: token vazio gerado para o usuario de teste.')
      return
    }

    // IDs verificados no banco de homologação (IDs não são dados sensíveis)
    // Barbosa: zc5y4y12z243toe | Mercadinho: jcm1keiv55i8q6v
    const BARBOSA_STORE = 'zc5y4y12z243toe'
    const BARBOSA_PRODUCT = 'hl2yinx6nx5mou0' // [DEMO] Água Mineral 500ml sem gás
    const MERCADINHO_STORE = 'jcm1keiv55i8q6v'

    // C7 list cross-store: a API retorna 200, mas o filtro explícito por
    // store_id de OUTRA loja deve trazer ZERO itens da Barbosa para o
    // comerciante do Mercadinho (isolation via listRule por loja).
    let c7got = -1
    let c7note = ''
    let c7ok = false
    try {
      const res = $http.send({
        url:
          BASE +
          '/api/collections/products/records?filter=' +
          encodeURIComponent("store_id = '" + BARBOSA_STORE + "'") +
          '&perPage=10',
        method: 'GET',
        headers: { Authorization: token },
        timeout: 15,
      })
      c7got = res.statusCode
      const items = (res.json && res.json.items) || []
      const fromOtherStore = items.filter(function (it) {
        return it.store_id !== BARBOSA_STORE
      })
      c7ok =
        res.statusCode === 200 && fromOtherStore.length === 0 && (res.json.totalItems || 0) === 0
      c7note = 'totalItems=' + (res.json.totalItems || 0)
    } catch (err) {
      c7got = -1
      c7note = 'list retornou erro inesperado'
    }

    // Controle positivo: busca um produto da PRÓPRIA loja e faz PATCH com body vazio
    let ownId = ''
    try {
      const res = $http.send({
        url:
          BASE +
          '/api/collections/products/records?filter=' +
          encodeURIComponent("store_id = '" + MERCADINHO_STORE + "'") +
          '&perPage=1',
        method: 'GET',
        headers: { Authorization: token },
        timeout: 15,
      })
      ownId = (res.json && res.json.items && res.json.items[0] && res.json.items[0].id) || ''
    } catch (_) {}

    const posStatus = ownId
      ? req('PATCH', '/api/collections/products/records/' + ownId, {}, token)
      : 0

    const cases = [
      {
        name: 'C1 PATCH cross-store (products)',
        want: 403,
        got: req(
          'PATCH',
          '/api/collections/products/records/' + BARBOSA_PRODUCT,
          { price: 0.01 },
          token,
        ),
        note: '',
      },
      {
        name: 'C2 DELETE cross-store (products)',
        want: 403,
        got: req('DELETE', '/api/collections/products/records/' + BARBOSA_PRODUCT, null, token),
        note: '',
      },
      {
        name: 'C3 bulk-update cross-store',
        want: 403,
        got: req(
          'POST',
          '/api/borali/products/bulk-update',
          { ids: [BARBOSA_PRODUCT], patch: { price: 0.01 } },
          token,
        ),
        note: '',
      },
      {
        name: 'C4 bulk-delete cross-store',
        want: 403,
        got: req('POST', '/api/borali/products/bulk-delete', { ids: [BARBOSA_PRODUCT] }, token),
        note: '',
      },
      {
        name: 'C5 stock/adjust cross-store',
        want: 403,
        got: req(
          'POST',
          '/api/borali/stock/adjust',
          { product_id: BARBOSA_PRODUCT, delta: -1, reason: 'homolog' },
          token,
        ),
        note: '',
      },
      {
        name: 'C6 create cross-store (products)',
        want: 400,
        got: req(
          'POST',
          '/api/collections/products/records',
          { store_id: BARBOSA_STORE, name: 'HOMOLOG-TESTE', price: 1, unit: 'un' },
          token,
        ),
        note: 'createRule exige store_id = @request.body.store_id',
      },
      { name: 'C7 list cross-store (products)', want: 200, got: c7got, note: c7note, ok: c7ok },
      {
        name: 'C0 controle positivo (PATCH própria loja)',
        want: 200,
        got: posStatus,
        note: ownId
          ? 'PATCH com body vazio = sem mutação de dados'
          : 'sem produto próprio encontrado',
        ok: posStatus === 200,
      },
    ]

    for (const c of cases) {
      const ok = c.ok !== undefined ? c.ok : c.got === c.want
      logResult(c.name, c.got, c.want, ok, c.note)
    }

    for (const r of results) {
      console.log(
        '[HOMOLOG-ISOLAMENTO] ' +
          r.name +
          ' | recebido=' +
          r.got +
          ' esperado=' +
          r.want +
          ' | ' +
          (r.ok ? 'PASS' : 'FAIL') +
          (r.note ? ' | ' + r.note : ''),
      )
    }
    const fails = results.filter(function (r) {
      return !r.ok
    }).length
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

    // Autolimpeza: cancela o cron após a primeira execução com os 8 casos
    if (results.length === 8) {
      try {
        cronRemove('borali-homolog-isolamento')
        console.log('[HOMOLOG-ISOLAMENTO] Autolimpeza: cron removido após execução completa.')
      } catch (err) {
        console.log('[HOMOLOG-ISOLAMENTO] Autolimpeza FALHOU: ' + err)
      }
    }
  } catch (err) {
    console.log('[HOMOLOG-ISOLAMENTO] ERRO na execução: ' + err)
  }
})

// ==================== ROTA DE VERIFICAÇÃO MANUAL ====================
routerAdd('GET', '/backend/v1/borali/homolog/isolamento', (e) => {
  const BASE = $os.getenv('PB_INSTANCE_URL') || ''
  const results = []

  const logResult = (name, got, want, ok, note) => {
    results.push({ name: name, got: got, want: want, ok: ok, note: note || '' })
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
      return res.statusCode
    } catch (err) {
      return -1
    }
  }

  let token = ''
  try {
    const user = $app.findAuthRecordByEmail(
      '_pb_users_auth_',
      'comerciante.mercadinho@borali.local',
    )
    token = $tokens.recordAuthToken(user)
  } catch (err) {
    return e.json(500, { error: 'nao foi possivel gerar token do usuario de teste: ' + err })
  }
  if (!token) {
    return e.json(500, { error: 'token vazio gerado para o usuario de teste' })
  }

  const BARBOSA_STORE = 'zc5y4y12z243toe'
  const BARBOSA_PRODUCT = 'hl2yinx6nx5mou0'
  const MERCADINHO_STORE = 'jcm1keiv55i8q6v'

  let c7got = -1
  let c7note = ''
  let c7ok = false
  try {
    const res = $http.send({
      url:
        BASE +
        '/api/collections/products/records?filter=' +
        encodeURIComponent("store_id = '" + BARBOSA_STORE + "'") +
        '&perPage=10',
      method: 'GET',
      headers: { Authorization: token },
      timeout: 15,
    })
    c7got = res.statusCode
    const items = (res.json && res.json.items) || []
    const fromOtherStore = items.filter(function (it) {
      return it.store_id !== BARBOSA_STORE
    })
    c7ok = res.statusCode === 200 && fromOtherStore.length === 0 && (res.json.totalItems || 0) === 0
    c7note = 'totalItems=' + (res.json.totalItems || 0)
  } catch (err) {
    c7got = -1
    c7note = 'list retornou erro inesperado'
  }

  let ownId = ''
  try {
    const res = $http.send({
      url:
        BASE +
        '/api/collections/products/records?filter=' +
        encodeURIComponent("store_id = '" + MERCADINHO_STORE + "'") +
        '&perPage=1',
      method: 'GET',
      headers: { Authorization: token },
      timeout: 15,
    })
    ownId = (res.json && res.json.items && res.json.items[0] && res.json.items[0].id) || ''
  } catch (_) {}

  const posStatus = ownId
    ? req('PATCH', '/api/collections/products/records/' + ownId, {}, token)
    : 0

  const cases = [
    {
      name: 'C1 PATCH cross-store (products)',
      want: 403,
      got: req(
        'PATCH',
        '/api/collections/products/records/' + BARBOSA_PRODUCT,
        { price: 0.01 },
        token,
      ),
      note: '',
    },
    {
      name: 'C2 DELETE cross-store (products)',
      want: 403,
      got: req('DELETE', '/api/collections/products/records/' + BARBOSA_PRODUCT, null, token),
      note: '',
    },
    {
      name: 'C3 bulk-update cross-store',
      want: 403,
      got: req(
        'POST',
        '/api/borali/products/bulk-update',
        { ids: [BARBOSA_PRODUCT], patch: { price: 0.01 } },
        token,
      ),
      note: '',
    },
    {
      name: 'C4 bulk-delete cross-store',
      want: 403,
      got: req('POST', '/api/borali/products/bulk-delete', { ids: [BARBOSA_PRODUCT] }, token),
      note: '',
    },
    {
      name: 'C5 stock/adjust cross-store',
      want: 403,
      got: req(
        'POST',
        '/api/borali/stock/adjust',
        { product_id: BARBOSA_PRODUCT, delta: -1, reason: 'homolog' },
        token,
      ),
      note: '',
    },
    {
      name: 'C6 create cross-store (products)',
      want: 400,
      got: req(
        'POST',
        '/api/collections/products/records',
        { store_id: BARBOSA_STORE, name: 'HOMOLOG-TESTE', price: 1, unit: 'un' },
        token,
      ),
      note: 'createRule exige store_id = @request.body.store_id',
    },
    { name: 'C7 list cross-store (products)', want: 200, got: c7got, note: c7note, ok: c7ok },
    {
      name: 'C0 controle positivo (PATCH própria loja)',
      want: 200,
      got: posStatus,
      note: ownId
        ? 'PATCH com body vazio = sem mutação de dados'
        : 'sem produto próprio encontrado',
      ok: posStatus === 200,
    },
  ]

  for (const c of cases) {
    const ok = c.ok !== undefined ? c.ok : c.got === c.want
    logResult(c.name, c.got, c.want, ok, c.note)
  }

  const fails = results.filter(function (r) {
    return !r.ok
  }).length
  return e.json(200, {
    summary: results.length - fails + '/' + results.length + ' PASS',
    results: results,
  })
})
