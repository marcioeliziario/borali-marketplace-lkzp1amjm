/**
 * TEMPORÁRIO — limpeza one-off de registros FATAIS artificiais do probe de
 * homologação em audit_log. O cron executa UMA vez, remove apenas os IDs
 * listados (guarda dupla: action + fatal no details), se remove do agendador
 * via cronRemove e a execução fica registrada em log. NÃO permanece: o arquivo
 * será excluído do repositório e do servidor imediatamente após o run.
 */
cronAdd('borali-cleanup-fatal', '* * * * *', () => {
  cronRemove('borali-cleanup-fatal')
  const fatalIds = [
    'gw2rk96d2fka040',
    'v1qup569d4ekpzs',
    'hksvg496sg5jv0e',
    'ds8qlqdsymis3lu',
    '6f8glzw9j5xhsbs',
    'zggxjtcbu1hrwlq',
  ]
  let removed = 0
  let skipped = 0
  for (let i = 0; i < fatalIds.length; i++) {
    try {
      const rec = $app.findRecordById('audit_log', fatalIds[i])
      if (rec.get('action') !== 'homolog.isolamento') {
        skipped++
        continue
      }
      const details = String(rec.get('details') || '')
      if (details.indexOf('"fatal"') === -1) {
        skipped++
        continue
      }
      $app.delete(rec)
      removed++
    } catch (_) {
      skipped++
    }
  }
  console.log(
    '[CLEANUP-FATAL] registros removidos: ' + removed + ' | ignorados/ausentes: ' + skipped,
  )
})
