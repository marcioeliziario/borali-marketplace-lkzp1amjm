/**
 * BORALI v0.3 — Controle de estado de operação das cidades.
 * Adiciona o campo `status` (preparation, onboarding, active, suspended)
 * à coleção `cities`, permitindo que cidades estejam em cadastro ou
 * suspensas sem impedir que usuários as vejam na listagem.
 */
migrate(
  (app) => {
    const citiesCol = app.findCollectionByNameOrId('cities')

    if (!citiesCol.fields.getByName('status')) {
      citiesCol.fields.add(
        new SelectField({
          name: 'status',
          required: false,
          values: ['preparation', 'onboarding', 'active', 'suspended'],
          defaultValue: 'active',
          maxSelect: 1,
        }),
      )
    }

    app.save(citiesCol)
  },
  (app) => {
    try {
      const citiesCol = app.findCollectionByNameOrId('cities')
      const statusField = citiesCol.fields.getByName('status')
      if (statusField) citiesCol.fields.remove(statusField)
      app.save(citiesCol)
    } catch (_) {}
  },
)
