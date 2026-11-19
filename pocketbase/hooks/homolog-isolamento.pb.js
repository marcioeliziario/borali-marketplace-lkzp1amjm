/**
 * BORALI — ROTA DE LEITURA DOS RESULTADOS DE HOMOLOGAÇÃO (v0.2)
 *
 * Mantida de propósito (decisão da recuperação): serve em GET
 * /backend/v1/borali/homolog/results o ÚLTIMO registro consolidado em audit_log
 * (action='homolog.isolamento') escrito pelo probe de isolamento, que rodou via
 * cron temporário com AUTOLIMPEZA (cronRemove) — o cron já não existe no
 * agendador do servidor e o arquivo NÃO registra mais nenhum cronAdd (nem em
 * reinicializações). Nenhum segredo é exposto: só o JSON consolidado dos casos.
 *
 * IMPORTANTE (JSVM do PocketBase): callbacks rodam em VM separada — TODAS as
 * funções e variáveis usadas dentro do callback estão declaradas INLINE nele.
 */

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
