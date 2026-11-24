/**
 * BORALI v0.3 — Hooks de pedidos (PocketBase pb_hooks)
 *
 * 1. Bloqueio de criação de pedidos em cidades não operacionais
 * 2. Validação server-side do status da cidade antes de aceitar pedido
 * 3. Auditoria de tentativas de pedido bloqueadas
 */

// ---- BLOQUEIO DE PEDIDOS EM CIDADES NÃO OPERACIONAIS ----
// Antes de criar um pedido, verifica se a cidade da loja está com status 'active'
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

    // Buscar a loja para obter city_id
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

    // Buscar a cidade para verificar status
    const citiesCol = e.app.findCollectionByNameOrId('cities')
    let city
    try {
      city = e.app.findRecordById(citiesCol, cityId)
    } catch (_) {
      throw new NotFoundError('Cidade não encontrada: ' + cityId)
    }

    const cityStatus = city.get('status') || 'active'

    // Somente cidades com status 'active' podem receber novos pedidos
    if (cityStatus !== 'active') {
      // Registrar tentativa bloqueada em auditoria
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

      // Mensagens amigáveis por status
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

    // Cidade está ativa — permitir criação do pedido
    return e.next()
  } catch (err) {
    // Se já é um erro tratado (BadRequestError, etc), repassar
    if (err.status || err.message) {
      throw err
    }
    // Erro inesperado
    throw new BadRequestError('Erro ao validar cidade para pedido: ' + err.message)
  }
}, 'orders')