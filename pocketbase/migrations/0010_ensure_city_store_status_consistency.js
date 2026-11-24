/**
 * BORALI v0.3 — Migração de segurança para consistência de status
 *
 * Garante que todas as cidades e lojas existentes tenham status válido.
 * NÃO ativa automaticamente registros previamente inativos.
 * Casos ambíguos ficam com status 'pending_review' e is_active=false.
 */
migrate(
 (app) => {
 const citiesCol = app.findCollectionByNameOrId('cities')
 const storesCol = app.findCollectionByNameOrId('stores')

 // 1. Corrigir cidades com status ausente ou inválido
 const allCities = app.findAllRecords(citiesCol)
 for (const city of allCities) {
 const currentStatus = city.get('status') || ''

 if (!['preparation', 'onboarding', 'active', 'suspended'].includes(currentStatus)) {
 // Caso ambíguo: não ativar automaticamente, marcar para revisão
 city.set('status', 'pending_review')
 city.set('is_active', false)
 app.save(city)
 }
 }

 // 2. Corrigir lojas com status ausente ou inválido
 const allStores = app.findAllRecords(storesCol)
 for (const store of allStores) {
 const currentStatus = store.get('status') || ''

 if (!['pending', 'approved', 'rejected', 'suspended'].includes(currentStatus)) {
 // Caso ambíguo: não aprovar automaticamente, marcar para revisão
 store.set('status', 'pending_review')
 store.set('is_active', false)
 app.save(store)
 }
 }
 },
 (app) => {
 // Rollback: não reverte alterações automaticamente
 // Os registros com status 'pending_review' devem ser revisados manualmente
 },
)