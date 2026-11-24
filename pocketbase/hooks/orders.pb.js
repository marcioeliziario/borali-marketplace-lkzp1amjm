/**
 * BORALI v0.3 — Hooks de pedidos (PocketBase pb_hooks)
 *
 * BLOQUEIO TOTAL DE CRIAÇÃO DE PEDIDOS
 * Enquanto não existir cálculo seguro no servidor, a criação de pedidos
 * é completamente bloqueada para evitar manipulação de preços e totais.
 */

onRecordBeforeCreateRequest((e) => {
 const auth = e.auth
 if (!auth) {
 throw new BadRequestError('Autenticação necessária para criar pedido.')
 }

 const orderId = e.record.get('id') || 'novo-pedido'

 // Registrar tentativa de pedido em auditoria
 try {
 const auditLog = new Record(e.app.findCollectionByNameOrId('audit_log'))
 auditLog.set('user_id', auth.get('id'))
 auditLog.set('user_email', auth.get('email'))
 auditLog.set('user_role', auth.get('role') || 'customer')
 auditLog.set('action', 'order.creation.blocked.pending_server_calc')
 auditLog.set('resource', 'orders')
 auditLog.set('resource_id', orderId)
 auditLog.set(
 'details',
 JSON.stringify({
 reason: 'Order creation is temporarily disabled until server-side price calculation is implemented.',
 store_id: e.record.get('store_id'),
 }),
 )
 e.app.save(auditLog)
 } catch (_) {}

 throw new BadRequestError(
 'A criação de pedidos está temporariamente desabilitada. Esta funcionalidade será reativada após a implementação do cálculo seguro de valores no servidor.',
 )
}, 'orders')