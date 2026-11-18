/**
 * BORALI v0.2 — Migração 0006: usuário de teste do Mercadinho (dados de DEMONSTRAÇÃO).
 *
 * Cria um usuário merchant vinculado ao Mercadinho para validar isolamento entre
 * estabelecimentos. NÃO altera o acesso do comerciante da Distribuidora Barbosa.
 * Idempotente: se o e-mail já existir, apenas garante vínculo e função corretos.
 */
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    const mercadinho = app.findFirstRecordByData('stores', 'slug', 'mercadinho')
    if (!mercadinho)
      throw new Error('Loja mercadinho não encontrada — migração 0005 deve rodar antes')

    let user
    try {
      user = app.findAuthRecordByEmail('_pb_users_auth_', 'comerciante.mercadinho@borali.local')
    } catch (_) {
      user = new Record(usersCol)
      user.setEmail('comerciante.mercadinho@borali.local')
      user.setPassword('Skip@Pass')
      user.setVerified(true)
      user.set('name', 'Comerciante Mercadinho (teste)')
      user.set('phone', '(93) 90000-0000')
      user.set('role', 'merchant')
      app.save(user)
    }

    user.set('role', 'merchant')
    user.set('store_id', mercadinho.id)
    app.save(user)
  },
  (app) => {
    // Rollback: remove somente o usuário de teste se ele existir
    try {
      const user = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'comerciante.mercadinho@borali.local',
      )
      app.delete(user)
    } catch (_) {}
  },
)
