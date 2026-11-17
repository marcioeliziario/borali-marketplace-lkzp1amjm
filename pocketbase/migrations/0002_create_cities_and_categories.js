migrate(
  (app) => {
    // 1. Cidades (cities)
    const cities = new Collection({
      name: 'cities',
      type: 'base',
      listRule: '', // Leitura pública
      viewRule: '', // Leitura pública
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'state', type: 'text', required: true }, // ex: "PA"
        { name: 'slug', type: 'text', required: true }, // ex: "obidos"
        { name: 'is_active', type: 'bool' },
        { name: 'is_pilot', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_cities_slug ON cities (slug)'],
    })
    app.save(cities)

    // 2. Categorias (categories)
    const categories = new Collection({
      name: 'categories',
      type: 'base',
      listRule: '', // Leitura pública
      viewRule: '', // Leitura pública
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'icon', type: 'text' }, // Nome do ícone Lucide
        { name: 'display_order', type: 'number' },
        { name: 'is_active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_categories_slug ON categories (slug)'],
    })
    app.save(categories)
  },
  (app) => {
    try {
      const categories = app.findCollectionByNameOrId('categories')
      app.delete(categories)
    } catch (_) {}
    try {
      const cities = app.findCollectionByNameOrId('cities')
      app.delete(cities)
    } catch (_) {}
  },
)
