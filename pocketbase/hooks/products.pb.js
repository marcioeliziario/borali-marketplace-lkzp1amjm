/**
 * BORALI v0.2 — Hooks de catálogo (PocketBase pb_hooks)
 *
 * 1. Rotas em lote (atualizar / excluir) com isolamento server-side entre estabelecimentos
 * 2. Registro de movimentações de estoque quando stock muda
 * 3. Log de auditoria server-side para alterações de produtos
 */
routerAdd(
  'POST',
  '/backend/v1/borali/products/bulk-update',
  (e) => {
    const info = e.requestInfo()
    const auth = e.auth
    const body = info.body || {}

    const ids = Array.isArray(body.ids) ? body.ids : []
    const patch = body.patch || {}

    if (!auth) {
      throw new BadRequestError('Autenticação necessária.')
    }
    if (auth.get('role') !== 'merchant' && auth.get('role') !== 'admin') {
      throw new ForbiddenError('Somente comerciantes ou administradores.')
    }
    if (ids.length === 0) {
      throw new BadRequestError('Nenhum produto selecionado.')
    }
    if (auth.get('role') !== 'admin' && !auth.get('store_id')) {
      throw new ForbiddenError('Usuário sem estabelecimento vinculado.')
    }

    const allowedPatchFields = [
      'price',
      'promo_price',
      'promo_starts_at',
      'promo_ends_at',
      'stock',
      'min_stock',
      'is_available',
      'status',
      'store_category_id',
      'track_stock',
    ]
    const cleanPatch = {}
    for (const k of allowedPatchFields) {
      if (patch[k] !== undefined) cleanPatch[k] = patch[k]
    }
    if (Object.keys(cleanPatch).length === 0) {
      throw new BadRequestError('Nenhum campo válido para atualizar.')
    }

    const productsCol = e.app.findCollectionByNameOrId('products')
    const updated = []
    for (const id of ids) {
      let rec
      try {
        rec = e.app.findRecordById(productsCol, id)
      } catch (_) {
        throw new NotFoundError('Produto não encontrado: ' + id)
      }

      // Isolamento entre estabelecimentos (teste explícito de acesso cruzado)
      if (auth.get('role') !== 'admin' && rec.get('store_id') !== auth.get('store_id')) {
        throw new ForbiddenError(
          'Acesso negado: o produto pertence a outro estabelecimento. Operação registrada.',
        )
      }

      for (const k in cleanPatch) {
        rec.set(k, cleanPatch[k])
      }
      e.app.save(rec)
      updated.push(rec.id)
    }

    // Auditoria server-side da operação em lote
    try {
      const log = new Record(e.app.findCollectionByNameOrId('audit_log'))
      log.set('user_id', auth.get('id'))
      log.set('user_email', auth.get('email'))
      log.set('user_role', auth.get('role'))
      log.set('action', 'product.bulk_update')
      log.set('resource', 'products')
      log.set('resource_id', '')
      log.set(
        'details',
        JSON.stringify({
          ids: updated,
          patch: Object.keys(cleanPatch),
          store_id: auth.get('store_id'),
        }),
      )
      e.app.save(log)
    } catch (_) {}

    return e.json(200, { updated })
  },
  $apis.requireAuth(),
)

// ---- Ajuste manual de estoque (registra movimentação + auditoria, bloqueia negativo) ----
routerAdd(
  'POST',
  '/backend/v1/borali/stock/adjust',
  (e) => {
    const info = e.requestInfo()
    const auth = e.auth
    const body = info.body || {}

    if (!auth) throw new BadRequestError('Autenticação necessária.')
    if (auth.get('role') !== 'merchant' && auth.get('role') !== 'admin') {
      throw new ForbiddenError('Somente comerciantes ou administradores.')
    }
    if (auth.get('role') !== 'admin' && !auth.get('store_id')) {
      throw new ForbiddenError('Usuário sem estabelecimento vinculado.')
    }

    const productId = body.product_id
    const delta = Math.trunc(Number(body.delta) || 0)
    const reason = String(body.reason || 'Ajuste manual').slice(0, 200)
    if (!productId || delta === 0) {
      throw new BadRequestError('Informe produto e quantidade (diferente de zero).')
    }

    const productsCol = e.app.findCollectionByNameOrId('products')
    let rec
    try {
      rec = e.app.findRecordById(productsCol, productId)
    } catch (_) {
      throw new NotFoundError('Produto não encontrado.')
    }

    // Isolamento entre estabelecimentos
    if (auth.get('role') !== 'admin' && rec.get('store_id') !== auth.get('store_id')) {
      throw new ForbiddenError(
        'Acesso negado: o produto pertence a outro estabelecimento. Operação registrada.',
      )
    }
    if (rec.get('track_stock') === false) {
      throw new BadRequestError('Este produto é sob encomenda e não controla estoque.')
    }

    const current = Number(rec.get('stock') ?? 0)
    const result = current + delta
    if (result < 0) {
      throw new BadRequestError(
        'Estoque não pode ficar negativo. Saída máxima: ' +
          current +
          ' ' +
          (rec.get('unit') || 'un'),
      )
    }

    rec.set('stock', result)
    e.app.save(rec)

    try {
      const mv = new Record(e.app.findCollectionByNameOrId('stock_movements'))
      mv.set('store_id', rec.get('store_id'))
      mv.set('product_id', rec.get('id'))
      mv.set('delta', delta)
      mv.set('result_stock', result)
      mv.set('reason', reason)
      mv.set('user_email', auth.get('email'))
      e.app.save(mv)
    } catch (_) {}

    try {
      const log = new Record(e.app.findCollectionByNameOrId('audit_log'))
      log.set('user_id', auth.get('id'))
      log.set('user_email', auth.get('email'))
      log.set('user_role', auth.get('role'))
      log.set('action', 'stock.adjusted')
      log.set('resource', 'stock_movements')
      log.set('resource_id', rec.get('id'))
      log.set('details', JSON.stringify({ delta, result, reason, store_id: rec.get('store_id') }))
      e.app.save(log)
    } catch (_) {}

    return e.json(200, {
      id: rec.get('id'),
      name: rec.get('name'),
      stock: result,
      unit: rec.get('unit'),
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/borali/products/bulk-delete',
  (e) => {
    const info = e.requestInfo()
    const auth = e.auth
    const body = info.body || {}
    const ids = Array.isArray(body.ids) ? body.ids : []

    if (!auth) {
      throw new BadRequestError('Autenticação necessária.')
    }
    if (auth.get('role') !== 'merchant' && auth.get('role') !== 'admin') {
      throw new ForbiddenError('Somente comerciantes ou administradores.')
    }
    if (ids.length === 0) {
      throw new BadRequestError('Nenhum produto selecionado.')
    }

    const productsCol = e.app.findCollectionByNameOrId('products')
    const ordersCol = e.app.findCollectionByNameOrId('orders')
    const deleted = []
    const skipped = []

    for (const id of ids) {
      let rec
      try {
        rec = e.app.findRecordById(productsCol, id)
      } catch (_) {
        continue
      }

      if (auth.get('role') !== 'admin' && rec.get('store_id') !== auth.get('store_id')) {
        throw new ForbiddenError(
          'Acesso negado: o produto pertence a outro estabelecimento. Operação registrada.',
        )
      }

      // PROTEÇÃO: produtos com histórico comercial NÃO são excluídos
      let hasHistory = false
      try {
        e.app.findFirstRecordByFilter(ordersCol, 'items ~ {:pid}', { pid: id })
        hasHistory = true
      } catch (_) {}

      if (hasHistory) {
        skipped.push(rec.id)
        // em vez de excluir, arquivar
        rec.set('status', 'archived')
        e.app.save(rec)
        continue
      }

      e.app.delete(rec)
      deleted.push(rec.id)
    }

    try {
      const log = new Record(e.app.findCollectionByNameOrId('audit_log'))
      log.set('user_id', auth.get('id'))
      log.set('user_email', auth.get('email'))
      log.set('user_role', auth.get('role'))
      log.set('action', 'product.bulk_delete')
      log.set('resource', 'products')
      log.set('resource_id', '')
      log.set(
        'details',
        JSON.stringify({
          deleted,
          skipped_archived: skipped,
          store_id: auth.get('store_id'),
        }),
      )
      e.app.save(log)
    } catch (_) {}

    return e.json(200, { deleted, skipped_archived: skipped })
  },
  $apis.requireAuth(),
)

// ---- Hooks de gravação de produtos: histórico de estoque + auditoria ----
onRecordAfterUpdateSuccess((e) => {
  try {
    const before = e.record.original()
    const after = e.record

    const oldStock = before.get('stock') ?? 0
    const newStock = after.get('stock') ?? 0
    const trackStock = after.get('track_stock')

    if ((trackStock === undefined || trackStock) && newStock !== oldStock) {
      const delta = newStock - oldStock
      try {
        const mv = new Record(e.app.findCollectionByNameOrId('stock_movements'))
        mv.set('store_id', after.get('store_id'))
        mv.set('product_id', after.get('id'))
        mv.set('delta', delta)
        mv.set('result_stock', newStock)
        mv.set('reason', delta > 0 ? 'Ajuste manual: entrada' : 'Ajuste manual: saída')
        mv.set('user_email', e.auth ? e.auth.get('email') : 'sistema')
        e.app.save(mv)
      } catch (_) {}
    }

    // Auditoria de alterações relevantes
    try {
      const log = new Record(e.app.findCollectionByNameOrId('audit_log'))
      log.set('user_id', e.auth ? e.auth.get('id') : '')
      log.set('user_email', e.auth ? e.auth.get('email') : 'sistema')
      log.set('user_role', e.auth ? e.auth.get('role') : 'sistema')
      log.set('action', 'product.updated')
      log.set('resource', 'products')
      log.set('resource_id', after.get('id'))
      log.set('details', JSON.stringify({ name: after.get('name') }))
      e.app.save(log)
    } catch (_) {}
  } finally {
    e.next()
  }
}, 'products')

onRecordAfterCreateSuccess((e) => {
  try {
    const log = new Record(e.app.findCollectionByNameOrId('audit_log'))
    log.set('user_id', e.auth ? e.auth.get('id') : '')
    log.set('user_email', e.auth ? e.auth.get('email') : 'sistema')
    log.set('user_role', e.auth ? e.auth.get('role') : 'sistema')
    log.set('action', 'product.created')
    log.set('resource', 'products')
    log.set('resource_id', e.record.get('id'))
    log.set('details', JSON.stringify({ name: e.record.get('name') }))
    e.app.save(log)
  } catch (_) {
  } finally {
    e.next()
  }
}, 'products')

onRecordAfterDeleteSuccess((e) => {
  try {
    const log = new Record(e.app.findCollectionByNameOrId('audit_log'))
    log.set('user_id', e.auth ? e.auth.get('id') : '')
    log.set('user_email', e.auth ? e.auth.get('email') : 'sistema')
    log.set('user_role', e.auth ? e.auth.get('role') : 'sistema')
    log.set('action', 'product.deleted')
    log.set('resource', 'products')
    log.set('resource_id', e.record.get('id'))
    log.set('details', JSON.stringify({ name: e.record.original().get('name') }))
    e.app.save(log)
  } catch (_) {
  } finally {
    e.next()
  }
}, 'products')
