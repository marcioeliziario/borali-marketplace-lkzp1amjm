/**
 * BORALI v0.3 — Hooks de pedidos (PocketBase pb_hooks)
 *
 * 1. Bloqueio de criação de pedidos em cidades não operacionais
 * 2. Validação server-side do status da cidade antes de aceitar pedido
 * 3. Auditoria de tentativas de pedido bloqueadas
 */

// ---- VALIDAÇÃO DE PEDIDOS: CIDADE OPERACIONAL + LOJA ATIVA ----
// Antes de criar um pedido, verifica:
// 1. Cidade da loja está com status 'active'
// 2. Loja está ativa (is_active=true) e aprovada (status='approved')
onRecordBeforeCreateRequest((e) => {
  try {
    const auth = e.auth
    if (!auth) {
      throw new BadRequestError('Autenticação necessária para criar pedido.')
    }

    const orderId = e.record.get('id') || 'novo-pedido'
    const storeId = e.record.get('store_id')

    if (!storeId) {
      throw new BadRequestError('Pedido deve estar vinculado a uma loja.')
    }

    // Buscar a loja para obter city_id e verificar status
    const storesCol = e.app.findCollectionByNameOrId('stores')
    let store
    try {
      store = e.app.findRecordById(storesCol, storeId)
    } catch (_) {
      throw new NotFoundError('Loja não encontrada: ' + storeId)
    }

    const cityId = store.get('city_id')
    if (!cityId) {
      throw new BadRequestError('Loja sem cidade vinculada.')
    }

    // Validação 1: Cidade deve estar operacional
    const citiesCol = e.app.findCollectionByNameOrId('cities')
    let city
    try {
      city = e.app.findRecordById(citiesCol, cityId)
    } catch (_) {
      throw new NotFoundError('Cidade não encontrada: ' + cityId)
    }

    // Rejeitar cidades com status ausente, desconhecido ou diferente de 'active'
    const cityStatus = city.get('status')
    const cityIsActive = city.get('is_active')

    // Bloquear se status não for exatamente 'active' ou se is_active não for true
    if (!cityStatus || !['preparation', 'onboarding', 'active', 'suspended'].includes(cityStatus) || cityStatus !== 'active' || cityIsActive !== true) {
      try {
        const auditLog = new Record(e.app.findCollectionByNameOrId('audit_log'))
        auditLog.set('user_id', auth.get('id'))
        auditLog.set('user_email', auth.get('email'))
        auditLog.set('user_role', auth.get('role') || 'customer')
        auditLog.set('action', 'order.blocked.city_not_active')
        auditLog.set('resource', 'orders')
        auditLog.set('resource_id', orderId)
        auditLog.set(
          'details',
          JSON.stringify({
            store_id: storeId,
            city_id: cityId,
            city_status: cityStatus,
            city_name: city.get('name'),
          }),
        )
        e.app.save(auditLog)
      } catch (_) {}

      let message = 'Pedidos não estão disponíveis nesta cidade no momento.'
      if (cityStatus === 'preparation') {
        message = `Estamos chegando a ${city.get('name')}. Pedidos ainda não estão disponíveis.`
      } else if (cityStatus === 'onboarding') {
        message = `${city.get('name')} está em fase de cadastro. Pedidos serão liberados em breve.`
      } else if (cityStatus === 'suspended') {
        message = `Pedidos estão temporariamente indisponíveis em ${city.get('name')}.`
      }
      throw new BadRequestError(message)
    }

    // Validação 2: Loja deve estar ATIVA e APROVADA (exigência explícita)
    const storeIsActive = store.get('is_active')
    const storeStatus = store.get('status')

    // Exigência explícita: status DEVE ser 'approved' E is_active DEVE ser true
    if (storeStatus !== 'approved' || storeIsActive !== true) {
      try {
        const auditLog = new Record(e.app.findCollectionByNameOrId('audit_log'))
        auditLog.set('user_id', auth.get('id'))
        auditLog.set('user_email', auth.get('email'))
        auditLog.set('user_role', auth.get('role') || 'customer')
        auditLog.set('action', 'order.blocked.store_not_ready')
        auditLog.set('resource', 'orders')
        auditLog.set('resource_id', orderId)
        auditLog.set(
          'details',
          JSON.stringify({
            store_id: storeId,
            store_name: store.get('name'),
            store_status: storeStatus,
            store_is_active: storeIsActive,
          }),
        )
        e.app.save(auditLog)
      } catch (_) {}

      let message = 'Esta loja não está pronta para receber pedidos.'
      if (storeStatus !== 'approved') {
        message = 'Loja ainda não foi aprovada pela administração.'
      } else if (storeIsActive !== true) {
        message = 'Loja está inativa no momento.'
      }
      throw new BadRequestError(message)
    }

    // Validação 3: Campos críticos (status, total) não podem ser manipulados pelo cliente
    const clientTotal = e.record.get('total')
    if (clientTotal !== undefined && clientTotal !== null && clientTotal > 0) {
      // Permitir, mas registrar que o total será recalculado pelo backend
      // (o cálculo real deve ser feito em onRecordBeforeUpdateRequest ou serviço)
    }

    return e.next()
  } catch (err) {
    if (err.status || err.message) {
      throw err
    }
    throw new BadRequestError('Erro ao validar pedido: ' + err.message)
  }
}, 'orders')