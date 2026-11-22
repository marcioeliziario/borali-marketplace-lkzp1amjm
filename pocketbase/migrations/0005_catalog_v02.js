/**
 * BORALI v0.2 — Catálogo e Gestão de Produtos
 * Novos campos em products (promoções com período, fotos, variações, complementos,
 * estoque detalhado, peso variável, dados regulados), nova coleção store_categories
 * (categorias internas por estabelecimento) e stock_movements (histórico de estoque).
 * NÃO remove nem recria coleções da v0.1.
 */
migrate(
  (app) => {
    const storesCol = app.findCollectionByNameOrId('stores')
    const productsCol = app.findCollectionByNameOrId('products')

    // 1. Coleção de categorias internas por estabelecimento
    let storeCategories
    try {
      storeCategories = app.findCollectionByNameOrId('store_categories')
    } catch (_) {
      storeCategories = new Collection({
        name: 'store_categories',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule:
          "@request.auth.role = 'admin' || (@request.auth.role = 'merchant' && @request.auth.store_id = @request.body.store_id)",
        updateRule:
          "@request.auth.role = 'admin' || (@request.auth.role = 'merchant' && @request.auth.store_id = store_id)",
        deleteRule:
          "@request.auth.role = 'admin' || (@request.auth.role = 'merchant' && @request.auth.store_id = store_id)",
        fields: [
          {
            name: 'store_id',
            type: 'relation',
            required: true,
            collectionId: storesCol.id,
            maxSelect: 1,
          },
          { name: 'name', type: 'text', required: true },
          { name: 'display_order', type: 'number' },
          { name: 'is_active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_storecat_store ON store_categories (store_id)'],
      })
      app.save(storeCategories)
    }

    // 2. Histórico de movimentações de estoque (somente leitura via API; gravado pelo hook)
    let stockMovements
    try {
      stockMovements = app.findCollectionByNameOrId('stock_movements')
    } catch (_) {
      stockMovements = new Collection({
        name: 'stock_movements',
        type: 'base',
        listRule:
          "@request.auth.role = 'admin' || (@request.auth.role = 'merchant' && @request.auth.store_id = store_id)",
        viewRule:
          "@request.auth.role = 'admin' || (@request.auth.role = 'merchant' && @request.auth.store_id = store_id)",
        createRule: "@request.auth.role = 'admin'",
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'store_id',
            type: 'relation',
            required: true,
            collectionId: storesCol.id,
            maxSelect: 1,
          },
          {
            name: 'product_id',
            type: 'relation',
            required: true,
            collectionId: productsCol.id,
            maxSelect: 1,
          },
          { name: 'variation_key', type: 'text' }, // opcional: ajuste por variação
          { name: 'delta', type: 'number', required: true }, // +entrada / -saída
          { name: 'result_stock', type: 'number', required: true },
          { name: 'reason', type: 'text', required: true },
          { name: 'user_email', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        ],
        indexes: [
          'CREATE INDEX idx_stockmov_product ON stock_movements (product_id)',
          'CREATE INDEX idx_stockmov_created ON stock_movements (created DESC)',
        ],
      })
      app.save(stockMovements)
    }

    // 3. Novos campos em products (todos opcionais — não afeta produtos v0.1)
    const fields = productsCol.fields
    const getByName = (name) => fields.getByName(name)

    const addTextField = (name) => {
      if (!getByName(name)) fields.add(new TextField({ name }))
    }
    const addNumberField = (name) => {
      if (!getByName(name)) fields.add(new NumberField({ name }))
    }
    const addBoolField = (name) => {
      if (!getByName(name)) fields.add(new BoolField({ name }))
    }

    // Unidades extras + unidades personalizadas
    const unitField = getByName('unit')
    if (unitField) {
      const wanted = [
        'un',
        'kg',
        'g',
        'l',
        'ml',
        'cx',
        'pct',
        'fardo',
        'duzia',
        'porcao',
        'garrafa',
        'lata',
        'bandeja',
      ]
      for (const v of wanted) {
        if (!unitField.values.includes(v)) unitField.values.push(v)
      }
    }

    // status ganha 'archived'
    const statusField = getByName('status')
    if (statusField && !statusField.values.includes('archived')) {
      statusField.values.push('archived')
    }

    addTextField('description_full')
    addTextField('subcategory')
    addTextField('internal_code')
    addTextField('custom_unit')
    addTextField('main_photo')
    addTextField('lot')
    addNumberField('promo_starts_at') // timestamp unix
    addNumberField('promo_ends_at') // timestamp unix
    addNumberField('min_stock')
    addNumberField('estimated_weight') // peso estimado (peso variável)
    addNumberField('final_weight') // peso final (sem cobrança automática nesta rodada)
    addBoolField('track_stock') // false p/ sob encomenda / feito na hora
    addBoolField('allow_fractional') // quantidades fracionadas (peso/volume)
    addBoolField('returnable') // embalagem retornável (distribuidoras)
    addBoolField('sale_locked') // venda bloqueada (regulados até validação legal)

    if (!getByName('photos')) {
      fields.add(
        new FileField({
          name: 'photos',
          maxSelect: 10,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          thumbs: ['400x400', '100x100'],
        }),
      )
    }

    if (!getByName('expires_at')) {
      fields.add(new DateField({ name: 'expires_at' })) // estrutura futura: validade
    }

    if (!getByName('store_category_id')) {
      fields.add(
        new RelationField({
          name: 'store_category_id',
          collectionId: storeCategories.id,
          maxSelect: 1,
        }),
      )
    }

    // Catálogo público: só produtos ativos; loja/admin veem tudo
    productsCol.listRule =
      "@request.auth.role = 'admin' || (@request.auth.store_id != '' && @request.auth.store_id = store_id) || status = 'active'"
    productsCol.viewRule =
      "@request.auth.role = 'admin' || (@request.auth.store_id != '' && @request.auth.store_id = store_id) || status = 'active'"
    // Impedir que o comerciante altere o store_id de um produto (transferência cruzada)
    productsCol.updateRule =
      "@request.auth.role = 'admin' || (@request.auth.role = 'merchant' && @request.auth.store_id = store_id && store_id = @request.body.store_id)"

    app.save(productsCol)

    // 4. Dados demonstrativos claramente identificados ([DEMO]) para teste da v0.2
    const barbosa = app.findFirstRecordByData('stores', 'slug', 'distribuidora-barbosa')
    const mercadinho = app.findFirstRecordByData('stores', 'slug', 'mercadinho')

    const now = new Date()
    const unix = (d) => Math.floor(d.getTime() / 1000)
    const pastStart = unix(new Date(now.getTime() - 86400000 * 2))
    const futureEnd = unix(new Date(now.getTime() + 86400000 * 30))
    const expiredEnd = unix(new Date(now.getTime() - 86400000))

    const createDemoStoreCategory = (store, name, order) => {
      try {
        return app.findFirstRecordByFilter(
          'store_categories',
          'store_id = {:sid} && name = {:name}',
          { sid: store.id, name },
        )
      } catch (_) {
        const rec = new Record(storeCategories)
        rec.set('store_id', store.id)
        rec.set('name', name)
        rec.set('display_order', order)
        rec.set('is_active', true)
        app.save(rec)
        return rec
      }
    }

    const scBarbosa = {
      cervejas: createDemoStoreCategory(barbosa, '[DEMO] Cervejas', 1),
      refrigerantes: createDemoStoreCategory(barbosa, '[DEMO] Refrigerantes', 2),
      aguas: createDemoStoreCategory(barbosa, '[DEMO] Águas e Gelo', 3),
    }
    const scMercadinho = {
      mercearia: createDemoStoreCategory(mercadinho, '[DEMO] Mercearia', 1),
      bebidas: createDemoStoreCategory(mercadinho, '[DEMO] Bebidas', 2),
      frios: createDemoStoreCategory(mercadinho, '[DEMO] Frios e Perecíveis', 3),
    }

    const demoProducts = [
      // Distribuidora Barbosa: variações independentes (preço/estoque por volume)
      {
        store: barbosa.id,
        store_category: scBarbosa.refrigerantes.id,
        name: '[DEMO] Refrigerante Cola (variações 350ml/1L/2L)',
        desc: 'Produto demonstrativo com variações de volume, cada uma com preço e estoque próprios.',
        desc_full:
          'Exemplo de produto com variações independentes para distribuidoras de bebidas: lata 350ml, garrafa 1L e garrafa 2L.',
        brand: 'Marca Demonstrativa',
        unit: 'un',
        price: 12.9,
        stock: 100,
        min_stock: 10,
        internal_code: 'DEMO-REF-001',
        variations: [
          { key: '350ml', name: 'Lata 350ml', price: 4.0, stock: 50, unit: 'lata' },
          { key: '1L', name: 'Garrafa 1L', price: 7.5, stock: 30, unit: 'garrafa' },
          { key: '2L', name: 'Garrafa 2L', price: 12.9, stock: 20, unit: 'garrafa' },
        ],
      },
      // Alcoólico: venda bloqueada até validação legal
      {
        store: barbosa.id,
        store_category: scBarbosa.cervejas.id,
        name: '[DEMO] Cerveja Pilsen Long Neck 330ml (retornável)',
        desc: 'Venda proibida para menores de 18 anos. Demonstração de produto regulado com venda bloqueada.',
        desc_full:
          'Produto regulado demonstrativo: identificação de bebida alcoólica com comercialização BLOQUEADA até validação das exigências legais.',
        brand: 'Marca Demonstrativa',
        unit: 'garrafa',
        price: 6.0,
        promo_price: 5.5,
        promo_starts_at: pastStart,
        promo_ends_at: futureEnd,
        stock: 48,
        min_stock: 12,
        is_regulated: true,
        sale_locked: true,
        returnable: true,
      },
      // Mercadinho: produto por peso variável
      {
        store: mercadinho.id,
        store_category: scMercadinho.frios.id,
        name: '[DEMO] Queijo Coalho (peso variável, kg)',
        desc: 'Venda por quilograma com peso variável. Item demonstrativo.',
        desc_full:
          'Exemplo de produto vendido por peso: peso estimado informado no cadastro; peso final registrado na separação, sem cobrança automática de diferença nesta rodada.',
        brand: 'Produtos Demonstrativos',
        unit: 'kg',
        allow_fractional: true,
        estimated_weight: 0.5,
        price: 34.9,
        stock: 20,
        min_stock: 5,
        track_stock: true,
      },
      // Mercadinho: promoção expirada (não deve aparecer no catálogo)
      {
        store: mercadinho.id,
        store_category: scMercadinho.mercearia.id,
        name: '[DEMO] Arroz Tipo 1 - 5kg (promoção expirada)',
        desc: 'Promoção demonstrativa com período já encerrado — não deve exibir preço promocional no catálogo.',
        unit: 'pct',
        price: 27.9,
        promo_price: 22.9,
        promo_starts_at: unix(new Date(now.getTime() - 86400000 * 10)),
        promo_ends_at: expiredEnd,
        stock: 30,
        min_stock: 6,
      },
      // Mercadinho: complementos (grupos opcionais e obrigatórios)
      {
        store: mercadinho.id,
        store_category: scMercadinho.bebidas.id,
        name: '[DEMO] Açaí 500ml com complementos',
        desc: 'Exemplo de produto com grupos de complementos opcionais e obrigatórios.',
        desc_full:
          'Demonstração da estrutura de personalização: grupo obrigatório de sabor (mín. 1, máx. 1) e grupo opcional de acompanhamentos (máx. 3).',
        unit: 'un',
        price: 14.0,
        stock: 15,
        min_stock: 3,
        complements: [
          {
            id: 'g-sabor',
            name: 'Escolha o sabor',
            required: true,
            min: 1,
            max: 1,
            options: [
              { id: 'o-trad', name: 'Tradicional', price: 0, available: true },
              { id: 'o-cacau', name: 'Cacau', price: 1.5, available: true },
            ],
          },
          {
            id: 'g-acomp',
            name: 'Acompanhamentos',
            required: false,
            min: 0,
            max: 3,
            options: [
              { id: 'o-gran', name: 'Granola', price: 2.0, available: true },
              { id: 'o-ban', name: 'Banana', price: 1.5, available: true },
              { id: 'o-cond', name: 'Leite condensado', price: 2.0, available: true },
              { id: 'o-cast', name: 'Castanha', price: 2.5, available: false },
            ],
          },
        ],
      },
      // Mercadinho: sem controle de estoque (feito na hora)
      {
        store: mercadinho.id,
        store_category: scMercadinho.mercearia.id,
        name: '[DEMO] Tapioca da Hora (feita sob encomenda)',
        desc: 'Exemplo de produto preparado na hora, sem controle quantitativo de estoque.',
        unit: 'porcao',
        price: 7.0,
        track_stock: false,
        stock: 0,
      },
    ]

    for (const p of demoProducts) {
      try {
        app.findFirstRecordByFilter('products', 'store_id = {:sid} && name = {:name}', {
          sid: p.store,
          name: p.name,
        })
        continue // já existe: preservar dados
      } catch (_) {
        const rec = new Record(productsCol)
        rec.set('store_id', p.store)
        rec.set('store_category_id', p.store_category || '')
        rec.set('name', p.name)
        rec.set('description', p.desc || '')
        rec.set('description_full', p.desc_full || '')
        rec.set('brand', p.brand || '')
        rec.set('unit', p.unit || 'un')
        rec.set('price', p.price)
        if (p.promo_price) rec.set('promo_price', p.promo_price)
        if (p.promo_starts_at !== undefined) rec.set('promo_starts_at', p.promo_starts_at)
        if (p.promo_ends_at !== undefined) rec.set('promo_ends_at', p.promo_ends_at)
        rec.set('stock', p.stock ?? 0)
        rec.set('min_stock', p.min_stock ?? 0)
        rec.set('track_stock', p.track_stock !== false)
        rec.set('allow_fractional', !!p.allow_fractional)
        if (p.estimated_weight) rec.set('estimated_weight', p.estimated_weight)
        rec.set('internal_code', p.internal_code || '')
        rec.set('is_demo', true)
        rec.set('is_regulated', !!p.is_regulated)
        rec.set('sale_locked', !!p.sale_locked)
        rec.set('returnable', !!p.returnable)
        rec.set('is_available', true)
        rec.set('status', 'active')
        rec.set('variations', JSON.stringify(p.variations || []))
        rec.set('complements', JSON.stringify(p.complements || []))
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('stock_movements'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('store_categories'))
    } catch (_) {}
  },
)
