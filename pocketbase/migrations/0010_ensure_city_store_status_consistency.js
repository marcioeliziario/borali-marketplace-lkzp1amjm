/**
 * BORALI v0.3 — Migração de segurança para consistência de status
 *
 * Garante que todas as cidades e lojas existentes tenham:
 * 1. Status válido (preparation/onboarding/active/suspended para cidades)
 * 2. is_active consistente com o status
 * 3. Lojas com status approved/rejected/pending/suspended e is_active coerente
 *
 * Esta migração é idempotente e preserva dados legados.
 */
migrate(
  (app) => {
    const citiesCol = app.findCollectionByNameOrId('cities')
    const storesCol = app.findCollectionByNameOrId('stores')

    // 1. Corrigir cidades sem status ou com status inválido
    const allCities = app.findAllRecords(citiesCol)
    for (const city of allCities) {
      let needsUpdate = false
      let currentStatus = city.get('status') || ''

      // Se status está vazio ou não é válido, definir como 'active' (presumindo cidade operacional)
      if (!['preparation', 'onboarding', 'active', 'suspended'].includes(currentStatus)) {
        city.set('status', 'active')
        currentStatus = 'active'
        needsUpdate = true
      }

      // Garantir is_active=true para cidades active
      if (currentStatus === 'active' && city.get('is_active') !== true) {
        city.set('is_active', true)
        needsUpdate = true
      }

      // Garantir is_active=false para cidades suspended
      if (currentStatus === 'suspended' && city.get('is_active') !== false) {
        city.set('is_active', false)
        needsUpdate = true
      }

      if (needsUpdate) {
        app.save(city)
      }
    }

    // 2. Corrigir lojas sem status ou com status inválido
    const allStores = app.findAllRecords(storesCol)
    for (const store of allStores) {
      let needsUpdate = false
      let currentStatus = store.get('status') || ''

      // Se status está vazio ou não é válido, definir como 'approved' se is_active=true
      if (!['pending', 'approved', 'rejected', 'suspended'].includes(currentStatus)) {
        const defaultStatus = store.get('is_active') ? 'approved' : 'pending'
        store.set('status', defaultStatus)
        currentStatus = defaultStatus
        needsUpdate = true
      }

      // Garantir is_active=true para lojas approved
      if (currentStatus === 'approved' && store.get('is_active') !== true) {
        store.set('is_active', true)
        needsUpdate = true
      }

      // Garantir is_active=false para lojas suspended/rejected/pending
      if (['suspended', 'rejected', 'pending'].includes(currentStatus) && store.get('is_active') !== false) {
        store.set('is_active', false)
        needsUpdate = true
      }

      if (needsUpdate) {
        app.save(store)
      }
    }
  },
  (app) => {
    // Rollback seguro: não reverte alterações, apenas registra que foi executada
    // Para reverter, ajuste manualmente os registros afetados
  },
)