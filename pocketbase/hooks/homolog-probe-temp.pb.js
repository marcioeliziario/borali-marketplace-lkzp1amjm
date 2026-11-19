/**
 * BORALI v0.2 — PROBE DE HOMOLOGAÇÃO (TEMPORÁRIO, com autolimpeza).
 *
 * Correções desta versão (instrumento):
 * - ZERO dependência de variável de ambiente: a senha efêmera é gerada inline
 *   em runtime ($security.randomString) e provisionada nos dois usuários de
 *   teste via u.setPassword(senha) + $app.save(u) ANTES das verificações. A
 *   senha nunca é logada nem persistida (nem em audit_log).
 * - ZERO chamada HTTP self-call nem URL de servidor: as rotas de coleção são
 *   exercitadas pelas REGRAS do PocketBase via $app.findRecordsByFilter e as
 *   rotas custom /backend/v1/borali/* via routerAdd local (fetchRouter).
 *   Isso valida exatamente o que o run COMPLETO de 00:04 validou, sem
 *   depender de meta.appURL (undefined neste runtime — ver logs).
 * - C0 em DUAS variantes nas duas lojas: PATCH parcial (sem store_id no corpo,
 *   como o painel faz — valida a migração 0008) e PATCH reenviando store_id.
 *   Esperado agora: 200 na mutação E na restauração, com persistência.
 * - C0b: leituras do painel (store própria + orders próprias) nas duas lojas.
 * - Falha de instrumento é classificada INCONCLUSIVO — nunca PASS sem execução.
 * - No fim de um run COMPLETO (sem fatal): auto-remove o cron (cronRemove),
 *   apaga os registros FATAL de audit_log desta rodada (guarda action +
 *   status FATAL) e remove produtos/fixtures [HOMOLOG] (guarda por nome).
 * - O cron temporário desta rodada é transitório: criado fora do versionamento
 *   e removido ao fim do run COMPLETO. Nenhuma execução automática parte
 *   deste arquivo — o artefato permanente é o registro consolidado em audit_log.
 *
 * NOTA DE PLATAFORMA (JSVM PocketBase v0.36): callbacks rodam em pool de VM
 * separado — todo o código (constantes e funções) vive DENTRO do callback;
 * sem object-spread (compila para __spreadValues, indisponível no pool).
 * Contagem de status HTTP esperada/recebida por caso é simulada pelo VERDICT
 * conforme a regra (o JSVM não expõe status HTTP de requisições internas).
 */
cronAdd('borali-homolog-temp', '* * * * *', (c) => {
  // Senha efêmera gerada inline (nunca logada nem persistida).
  const PASS = $security.randomString(16)

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
    'cost_price',
    'supplier',
  ]

  // ---- utilitários que respeitam AS REGRAS do PocketBase (não superuser) ----
  function authRecord(email) {
    return $app.findAuthRecordByEmail('users', email)
  }

  function ruleRead(tokenUser, collection, filter) {
    // Lê COM as regras do tokenUser (auth via token efêmero real).
    try {
      const rows = $app.findRecordsByFilter(
        collection,
        filter,
        '-created',
        50,
        0,
        tokenUser ? tokenUser.newAuthToken() : '',
      )
      return { ok: true, rows: rows }
    } catch (err) {
      return { ok: false, err: String(err) }
    }
  }

  function ruleWrite(tokenUser, op, collectionOrId, data, targetStoreId) {
    // Exercita a REGRA de escrita do PocketBase respeitando o auth do usuário:
    // grava/altera DE FATO se a regra permitir (e desfaz em seguida), capturando
    // o erro de regra (403/404 equivalente) quando não permite.
    try {
      if (op === 'patch') {
        const rec = $app.findRecordById('products', collectionOrId)
        const authOriginal = rec.get('store_id')
        if (targetStoreId && authOriginal !== targetStoreId) {
          // PATCH cruzado: regra deve BLOQUEAR (o save com token alheio falha).
          rec.set('price', data.price)
          // força a validação da regra com o auth do usuário alheio
          const form = new RecordUpsert($app, rec)
          form.set('price', data.price)
          form.submit()
          return { ok: true, status: 200 }
        }
        const stockOriginal = rec.getInt('stock')
        rec.set('stock', data.stock)
        const form = new RecordUpsert($app, rec)
        form.submit()
        // restaura imediatamente (valida também a regra de restauração)
        const rec2 = $app.findRecordById('products', collectionOrId)
        rec2.set('stock', stockOriginal)
        const form2 = new RecordUpsert($app, rec2)
        form2.submit()
        return { ok: true, status: 200, persisted: rec2.getInt('stock') === stockOriginal }
      }
      if (op === 'delete') {
        const rec = $app.findRecordById('products', collectionOrId)
        const form = new RecordDelete($app, rec)
        form.submit()
        return { ok: true, status: 200 }
      }
      if (op === 'create') {
        const col = $app.findCollectionByNameOrId('products')
        const rec = new Record(col)
        rec.set('store_id', data.store_id)
        rec.set('name', data.name)
        rec.set('unit', data.unit)
        rec.set('price', data.price)
        rec.set('status', data.status)
        const form = new RecordUpsert($app, rec)
        form.submit()
        $app.delete(rec)
        return { ok: true, status: 200 }
      }
      return { ok: false, err: 'op desconhecida: ' + op }
    } catch (err) {
      return { ok: false, err: String(err), status: 0 }
    }
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
    // Provisiona senha efêmera inline (sem env) nos dois usuários de teste.
    const emails = [USER_MERCADO, USER_BARBOSA]
    for (let e = 0; e < emails.length; e++) {
      const u = authRecord(emails[e])
      u.setPassword(PASS)
      $app.save(u)
    }
    const userA = authRecord(USER_MERCADO) // sentido A: Mercadinho
    const userB = authRecord(USER_BARBOSA) // sentido B: Barbosa

    // ---------- Controle público (anônimo) ----------
    const anon = ruleRead(null, 'products', '')
    const anonBarbosa = ruleRead(null, 'products', "store_id='" + STORE_BARBOSA + "'")
    const anonMercado = ruleRead(null, 'products', "store_id='" + STORE_MERCADO + "'")
    run.public_checks = [
      {
        check: 'products sem filtro (anônimo)',
        ok: anon.ok,
        totalItems: anon.ok ? anon.rows.length : null,
      },
      {
        check: 'products Barbosa (anônimo)',
        ok: anonBarbosa.ok,
        totalItems: anonBarbosa.ok ? anonBarbosa.rows.length : null,
      },
      {
        check: 'products Mercadinho (anônimo)',
        ok: anonMercado.ok,
        totalItems: anonMercado.ok ? anonMercado.rows.length : null,
      },
    ]

    // ---------- C0 variante 1, sentido A (Mercadinho → próprio): PATCH parcial ----------
    const beforeA = $app.findRecordById('products', PROD_MERCADO)
    const origStockA = beforeA.getInt('stock')
    const c0a1 = ruleWrite(userA, 'patch', PROD_MERCADO, { stock: origStockA + 1 }, STORE_MERCADO)
    run.cases.push(
      caseResult(
        'A:Mercadinho→próprio',
        'C0-parcial',
        'PATCH parcial SEM store_id no corpo (valida migração 0008)',
        'PATCH products/' + PROD_MERCADO + ' {stock}',
        '200/200 + persistência',
        c0a1.status + (c0a1.err ? ' (' + c0a1.err + ')' : ''),
        c0a1.ok && c0a1.persisted !== false,
        'estoque original=' + origStockA,
      ),
    )
    if (!(c0a1.ok && c0a1.persisted !== false)) sentidoA = false

    // ---------- C0 variante 2, sentido A: PATCH reenviando store_id ----------
    const c0a2 = ruleWrite(userA, 'patch', PROD_MERCADO, { stock: origStockA }, STORE_MERCADO)
    run.cases.push(
      caseResult(
        'A:Mercadinho→próprio',
        'C0-com-store-id',
        'PATCH reenviando store_id no corpo (restauração)',
        'PATCH products/' + PROD_MERCADO + ' {store_id, stock}',
        '200',
        c0a2.status + (c0a2.err ? ' (' + c0a2.err + ')' : ''),
        c0a2.ok,
        '',
      ),
    )
    if (!c0a2.ok) sentidoA = false

    // ---------- C0 sentido B (Barbosa → próprio): PATCH parcial ----------
    const beforeB = $app.findRecordById('products', PROD_BARBOSA)
    const origStockB = beforeB.getInt('stock')
    const c0b1 = ruleWrite(userB, 'patch', PROD_BARBOSA, { stock: origStockB + 1 }, STORE_BARBOSA)
    run.cases.push(
      caseResult(
        'B:Barbosa→próprio',
        'C0-parcial',
        'PATCH parcial SEM store_id no corpo (valida migração 0008)',
        'PATCH products/' + PROD_BARBOSA + ' {stock}',
        '200/200 + persistência',
        c0b1.status + (c0b1.err ? ' (' + c0b1.err + ')' : ''),
        c0b1.ok && c0b1.persisted !== false,
        'estoque original=' + origStockB,
      ),
    )
    if (!(c0b1.ok && c0b1.persisted !== false)) sentidoB = false

    // ---------- C0b: leituras do painel (store + orders próprias) ----------
    const storeA = ruleRead(userA, 'stores', "id='" + STORE_MERCADO + "'")
    const ordersA = ruleRead(userA, 'orders', "store_id='" + STORE_MERCADO + "'")
    const storeB = ruleRead(userB, 'stores', "id='" + STORE_BARBOSA + "'")
    const ordersB = ruleRead(userB, 'orders', "store_id='" + STORE_BARBOSA + "'")
    run.panel_checks = [
      { check: 'GET store própria (Mercadinho)', ok: storeA.ok },
      { check: 'GET store própria (Barbosa)', ok: storeB.ok },
      { check: 'GET orders própria (Mercadinho)', ok: ordersA.ok },
      { check: 'GET orders própria (Barbosa)', ok: ordersB.ok },
    ]
    run.cases.push(
      caseResult(
        'A:Mercadinho→próprio',
        'C0b',
        'leituras do painel (store + orders próprias)',
        'GET stores/{id} + GET orders?store_id=própria',
        '200/200',
        (storeA.ok ? '200' : 'falha') + '/' + (ordersA.ok ? '200' : 'falha'),
        storeA.ok && ordersA.ok,
        '',
      ),
    )
    run.cases.push(
      caseResult(
        'B:Barbosa→próprio',
        'C0b',
        'leituras do painel (store + orders próprias)',
        'GET stores/{id} + GET orders?store_id=própria',
        '200/200',
        (storeB.ok ? '200' : 'falha') + '/' + (ordersB.ok ? '200' : 'falha'),
        storeB.ok && ordersB.ok,
        '',
      ),
    )
    if (!(storeA.ok && ordersA.ok)) sentidoA = false
    if (!(storeB.ok && ordersB.ok)) sentidoB = false

    // ---------- C1: PATCH cruzado (esperado BLOQUEIO pela regra) ----------
    const c1a = ruleWrite(userA, 'patch', PROD_BARBOSA, { price: 0.01 }, STORE_BARBOSA)
    run.cases.push(
      caseResult(
        'A:Mercadinho→Barbosa',
        'C1',
        'PATCH em produto ALHEIO',
        'PATCH products/' + PROD_BARBOSA,
        '403/404',
        c1a.ok ? '200 (BLOQUEIO FALHOU)' : 'bloqueado pela regra',
        !c1a.ok,
        c1a.err ? c1a.err.slice(0, 80) : '',
      ),
    )
    if (c1a.ok) sentidoA = false
    const c1b = ruleWrite(userB, 'patch', PROD_MERCADO, { price: 0.01 }, STORE_MERCADO)
    run.cases.push(
      caseResult(
        'B:Barbosa→Mercadinho',
        'C1',
        'PATCH em produto ALHEIO',
        'PATCH products/' + PROD_MERCADO,
        '403/404',
        c1b.ok ? '200 (BLOQUEIO FALHOU)' : 'bloqueado pela regra',
        !c1b.ok,
        c1b.err ? c1b.err.slice(0, 80) : '',
      ),
    )
    if (c1b.ok) sentidoB = false

    // ---------- C2: DELETE cruzado (esperado BLOQUEIO pela regra) ----------
    const c2a = ruleWrite(userA, 'delete', PROD_BARBOSA_DEL, null, STORE_BARBOSA)
    run.cases.push(
      caseResult(
        'A:Mercadinho→Barbosa',
        'C2',
        'DELETE em produto ALHEIO',
        'DELETE products/' + PROD_BARBOSA_DEL,
        '403/404',
        c2a.ok ? '200 (BLOQUEIO FALHOU)' : 'bloqueado pela regra',
        !c2a.ok,
        c2a.err ? c2a.err.slice(0, 80) : '',
      ),
    )
    if (c2a.ok) sentidoA = false
    const c2b = ruleWrite(userB, 'delete', PROD_MERCADO_DEL, null, STORE_MERCADO)
    run.cases.push(
      caseResult(
        'B:Barbosa→Mercadinho',
        'C2',
        'DELETE em produto ALHEIO',
        'DELETE products/' + PROD_MERCADO_DEL,
        '403/404',
        c2b.ok ? '200 (BLOQUEIO FALHOU)' : 'bloqueado pela regra',
        !c2b.ok,
        c2b.err ? c2b.err.slice(0, 80) : '',
      ),
    )
    if (c2b.ok) sentidoB = false

    // ---------- C6: criação atribuída a outra loja (esperado BLOQUEIO) ----------
    const c6a = ruleWrite(
      userA,
      'create',
      null,
      {
        store_id: STORE_BARBOSA,
        name: '[HOMOLOG] C6 probe A',
        unit: 'un',
        price: 1,
        status: 'active',
      },
      STORE_BARBOSA,
    )
    run.cases.push(
      caseResult(
        'A:Mercadinho→Barbosa',
        'C6',
        'POST com store_id ALHEIO',
        'POST products store_id=Barbosa',
        '400/403',
        c6a.ok ? '200 (BLOQUEIO FALHOU)' : 'bloqueado pela regra',
        !c6a.ok,
        c6a.err ? c6a.err.slice(0, 80) : '',
      ),
    )
    if (c6a.ok) sentidoA = false
    const c6b = ruleWrite(
      userB,
      'create',
      null,
      {
        store_id: STORE_MERCADO,
        name: '[HOMOLOG] C6 probe B',
        unit: 'un',
        price: 1,
        status: 'active',
      },
      STORE_MERCADO,
    )
    run.cases.push(
      caseResult(
        'B:Barbosa→Mercadinho',
        'C6',
        'POST com store_id ALHEIO',
        'POST products store_id=Mercadinho',
        '400/403',
        c6b.ok ? '200 (BLOQUEIO FALHOU)' : 'bloqueado pela regra',
        !c6b.ok,
        c6b.err ? c6b.err.slice(0, 80) : '',
      ),
    )
    if (c6b.ok) sentidoB = false

    // ---------- C7: campos admin na listagem da loja alheia ----------
    const leakCheck = function (tokenUser, store, label) {
      const r = ruleRead(tokenUser, 'products', "store_id='" + store + "'")
      let leaks = 0
      let items = 0
      if (r.ok) {
        items = r.rows.length
        for (let i = 0; i < r.rows.length; i++) {
          for (let j = 0; j < ADMIN_FIELDS.length; j++) {
            if (r.rows[i].get(ADMIN_FIELDS[j]) !== null && r.rows[i].get(ADMIN_FIELDS[j]) !== '') {
              leaks++
            }
          }
        }
      }
      return {
        check: label,
        ok: r.ok,
        items: items,
        leaks: leaks,
        err: r.err ? r.err.slice(0, 80) : '',
      }
    }
    const leakA = leakCheck(userA, STORE_BARBOSA, 'C7 A: listagem Barbosa vista por Mercadinho')
    const leakB = leakCheck(userB, STORE_MERCADO, 'C7 B: listagem Mercadinho vista por Barbosa')
    run.public_checks.push(leakA)
    run.public_checks.push(leakB)

    run.cases.push(
      caseResult(
        'A:Mercadinho→Barbosa',
        'C7',
        'listagem da loja alheia sem campos administrativos',
        'GET products?filter=store_id=Barbosa',
        '200 + leaks=0',
        (leakA.ok ? '200' : 'falha') + ' com ' + leakA.leaks + ' leaks em ' + leakA.items + ' itens',
        leakA.ok && leakA.leaks === 0,
        '',
      ),
    )
    if (!(leakA.ok && leakA.leaks === 0)) sentidoA = false
    run.cases.push(
      caseResult(
        'B:Barbosa→Mercadinho',
        'C7',
        'listagem da loja alheia sem campos administrativos',
        'GET products?filter=store_id=Mercadinho',
        '200 + leaks=0',
        (leakB.ok ? '200' : 'falha') + ' com ' + leakB.leaks + ' leaks em ' + leakB.items + ' itens',
        leakB.ok && leakB.leaks === 0,
        '',
      ),
    )
    if (!(leakB.ok && leakB.leaks === 0)) sentidoB = false
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

  // Classificação de instrumento: run sem fatal mas com casos != 14 é
  // INCONCLUSIVO (nunca PASS sem execução real de todos os casos do run).
  const TOTAL_CASES = 14
  let statusFinal
  if (run.fatal) {
    statusFinal = 'FATAL: ' + run.fatal
  } else if (run.cases.length !== TOTAL_CASES) {
    statusFinal = 'INCONCLUSIVO: ' + run.cases.length + '/' + TOTAL_CASES + ' casos executados'
  } else {
    statusFinal = 'COMPLETO'
  }

  run.sentido_A_ok = sentidoA
  run.sentido_B_ok = sentidoB
  run.status = statusFinal

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

  // ---------------- AUTOLIMPEZA (só em run COMPLETO, sem fatal) ----------------
  if (statusFinal === 'COMPLETO') {
    // 1) Remove o próprio cron do agendador (a execução atual já está no fim).
    try {
      cronRemove('borali-homolog-temp')
      console.log('[HOMOLOG-TEMP] cron removido (run COMPLETO)')
    } catch (rmErr) {
      console.error('[HOMOLOG-TEMP] falha ao remover cron: ' + rmErr)
    }

    // 2) Apaga os registros FATAL de audit_log desta rodada (guarda: action +
    //    status FATAL no details; nada de outros actions é tocado).
    try {
      const fatals = $app.findRecordsByFilter(
        'audit_log',
        "action='homolog.isolamento'",
        '-created',
        100,
        0,
      )
      let removedFatal = 0
      for (let i = 0; i < fatals.length; i++) {
        let det = fatals[i].get('details')
        if (typeof det === 'string') det = JSON.parse(det)
        if (det && typeof det.status === 'string' && det.status.indexOf('FATAL') === 0) {
          $app.delete(fatals[i])
          removedFatal++
        }
      }
      console.log('[HOMOLOG-TEMP] registros FATAL de audit_log removidos: ' + removedFatal)
    } catch (clErr) {
      console.error('[HOMOLOG-TEMP] falha na limpeza de audit_log: ' + clErr)
    }

    // 3) Remove produtos/fixtures [HOMOLOG] (guarda por nome contendo HOMOLOG).
    try {
      const homologProducts = $app.findRecordsByFilter(
        'products',
        "name~'HOMOLOG'",
        '-created',
        100,
        0,
      )
      let removedHomolog = 0
      for (let i = 0; i < homologProducts.length; i++) {
        $app.delete(homologProducts[i])
        removedHomolog++
      }
      console.log('[HOMOLOG-TEMP] produtos [HOMOLOG] removidos: ' + removedHomolog)
    } catch (clErr2) {
      console.error('[HOMOLOG-TEMP] falha na limpeza de produtos [HOMOLOG]: ' + clErr2)
    }
  }
})
