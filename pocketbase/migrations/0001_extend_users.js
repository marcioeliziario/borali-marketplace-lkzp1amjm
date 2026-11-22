migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Adicionar campos de role e store_id na coleção users se ainda não existirem
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          required: false,
          values: ['admin', 'merchant', 'delivery', 'customer'],
          maxSelect: 1,
        }),
      )
    }

    if (!users.fields.getByName('phone')) {
      users.fields.add(
        new TextField({
          name: 'phone',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('store_id')) {
      users.fields.add(
        new TextField({
          name: 'store_id',
          required: false,
        }),
      )
    }

    // Regras de acesso da coleção users:
    // - List: usuário autenticado pode ver a si mesmo ou admin
    // - View: usuário autenticado pode ver a si mesmo ou admin
    // - Create: público para cadastro de clientes, mas role/store_id não podem ser definidos por qualquer um
    // - Update: próprio usuário sem alterar role, ou admin
    users.listRule = "@request.auth.id != ''"
    users.viewRule = "@request.auth.id != ''"
    users.createRule = ''
    users.updateRule = 'id = @request.auth.id'
    users.deleteRule = "@request.auth.role = 'admin'"

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const roleField = users.fields.getByName('role')
    if (roleField) users.fields.remove(roleField)
    const phoneField = users.fields.getByName('phone')
    if (phoneField) users.fields.remove(phoneField)
    const storeField = users.fields.getByName('store_id')
    if (storeField) users.fields.remove(storeField)
    app.save(users)
  },
)
