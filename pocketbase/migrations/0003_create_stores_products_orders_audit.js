migrate(
  (app) => {
    const citiesCol = app.findCollectionByNameOrId('cities')
    const categoriesCol = app.findCollectionByNameOrId('categories')

    // 3. Estabelecimentos (stores)
    const stores = new Collection({
      name: 'stores',
      type: 'base',
      // Leitura pública de lojas ativas e aprovadas, ou autenticado admin / dono da loja
      listRule:
        "status = 'approved' && is_active = true || @request.auth.role = 'admin' || (@request.auth.store_id != '' && @request.auth.store_id = id)",
      viewRule:
        "status = 'approved' && is_active = true || @request.auth.role = 'admin' || (@request.auth.store_id != '' && @request.auth.store_id = id)",
      createRule: "@request.auth.role = 'admin'",
      updateRule:
        "@request.auth.role = 'admin' || (@request.auth.role = 'merchant' && @request.auth.store_id = id)",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'trade_name', type: 'text' }, // Nome fantasia
        { name: 'slug', type: 'text', required: true },
        {
          name: 'city_id',
          type: 'relation',
          required: true,
          collectionId: citiesCol.id,
          maxSelect: 1,
        },
        {
          name: 'category_ids',
          type: 'relation',
          required: false,
          collectionId: categoriesCol.id,
          maxSelect: 10,
        },
        { name: 'description', type: 'text' },
        { name: 'logo_url', type: 'text' },
        { name: 'banner_url', type: 'text' },
        { name: 'phone', type: 'text' },
        { name: 'whatsapp', type: 'text' },
        { name: 'address_street', type: 'text' },
        { name: 'address_number', type: 'text' },
        { name: 'address_neighborhood', type: 'text' },
        { name: 'address_reference', type: 'text' },
        { name: 'opening_hours', type: 'json' }, // Dias e horários estruturados em JSON
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pending', 'approved', 'rejected', 'suspended'],
          maxSelect: 1,
        },
        { name: 'is_active', type: 'bool' },
        { name: 'is_featured', type: 'bool' },
        { name: 'is_demo', type: 'bool' }, // Tag para lojas piloto/demonstrativas
        {
          name: 'delivery_type',
          type: 'select',
          values: ['fixed', 'neighborhood', 'free', 'pickup_only'],
          maxSelect: 1,
        },
        { name: 'delivery_fee', type: 'number' },
        { name: 'min_order_value', type: 'number' },
        { name: 'estimated_time', type: 'text' }, // ex: "30-50 min"
        { name: 'accepts_pix', type: 'bool' },
        { name: 'accepts_cash', type: 'bool' },
        { name: 'accepts_card_on_delivery', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_stores_city_slug ON stores (city_id, slug)'],
    })
    app.save(stores)

    // 4. Produtos (products)
    const products = new Collection({
      name: 'products',
      type: 'base',
      // Leitura pública para produtos de lojas ativas, ou admin / comerciante da loja
      listRule:
        "@request.auth.role = 'admin' || (@request.auth.store_id != '' && @request.auth.store_id = store_id) || store_id != ''",
      viewRule:
        "@request.auth.role = 'admin' || (@request.auth.store_id != '' && @request.auth.store_id = store_id) || store_id != ''",
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
          collectionId: stores.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'category_id',
          type: 'relation',
          required: false,
          collectionId: categoriesCol.id,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'image_url', type: 'text' },
        { name: 'brand', type: 'text' },
        {
          name: 'unit',
          type: 'select',
          required: true,
          values: ['un', 'kg', 'g', 'l', 'ml', 'cx', 'pct', 'fardo', 'duzia'],
          maxSelect: 1,
        },
        { name: 'price', type: 'number', required: true },
        { name: 'promo_price', type: 'number' },
        { name: 'stock', type: 'number' },
        { name: 'is_available', type: 'bool' },
        { name: 'barcode', type: 'text' },
        { name: 'is_demo', type: 'bool' }, // Tag dados demonstrativos
        { name: 'is_regulated', type: 'bool' }, // Flag para produtos regulados (apenas flag nesta versão)
        { name: 'variations', type: 'json' }, // Estrutura para variações
        { name: 'complements', type: 'json' }, // Estrutura para complementos
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['active', 'inactive', 'draft'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_products_store ON products (store_id)',
        'CREATE INDEX idx_products_category ON products (category_id)',
      ],
    })
    app.save(products)

    // 5. Pedidos (orders) - Estrutura básica para v0.1
    const orders = new Collection({
      name: 'orders',
      type: 'base',
      listRule:
        "@request.auth.role = 'admin' || (@request.auth.role = 'merchant' && @request.auth.store_id = store_id) || (@request.auth.id != '' && customer_id = @request.auth.id)",
      viewRule:
        "@request.auth.role = 'admin' || (@request.auth.role = 'merchant' && @request.auth.store_id = store_id) || (@request.auth.id != '' && customer_id = @request.auth.id)",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.role = 'admin' || (@request.auth.role = 'merchant' && @request.auth.store_id = store_id)",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        { name: 'order_number', type: 'text', required: true },
        {
          name: 'store_id',
          type: 'relation',
          required: true,
          collectionId: stores.id,
          maxSelect: 1,
        },
        {
          name: 'customer_id',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'customer_name', type: 'text', required: true },
        { name: 'customer_phone', type: 'text', required: true },
        { name: 'delivery_address', type: 'json' }, // rua, bairro, numero, complemento, ref
        {
          name: 'payment_method',
          type: 'select',
          required: true,
          values: ['pix', 'cash', 'card_on_delivery'],
          maxSelect: 1,
        },
        { name: 'subtotal', type: 'number', required: true },
        { name: 'delivery_fee', type: 'number', required: true },
        { name: 'total', type: 'number', required: true },
        { name: 'items', type: 'json', required: true }, // Preserva preços e detalhes do momento da compra
        {
          name: 'status',
          type: 'select',
          required: true,
          values: [
            'awaiting_confirmation', // Aguardando confirmação
            'confirmed', // Confirmado
            'preparing', // Em preparação
            'ready_for_pickup', // Pronto para retirada
            'out_for_delivery', // Saiu para entrega
            'delivered', // Entregue
            'cancelled', // Cancelado
          ],
          maxSelect: 1,
        },
        { name: 'status_history', type: 'json' }, // Histórico de alterações de status
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_orders_number ON orders (order_number)',
        'CREATE INDEX idx_orders_store ON orders (store_id)',
      ],
    })
    app.save(orders)

    // 6. Registro de Auditoria (audit_log)
    const auditLog = new Collection({
      name: 'audit_log',
      type: 'base',
      listRule: "@request.auth.role = 'admin'",
      viewRule: "@request.auth.role = 'admin'",
      createRule: "@request.auth.id != ''",
      updateRule: null, // Auditoria é somente inserção e leitura por admin
      deleteRule: null,
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'user_email', type: 'text' },
        { name: 'user_role', type: 'text' },
        { name: 'action', type: 'text', required: true }, // ex: "store.approved", "product.created", "login"
        { name: 'resource', type: 'text', required: true }, // ex: "stores", "products", "users"
        { name: 'resource_id', type: 'text' },
        { name: 'details', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_audit_created ON audit_log (created DESC)'],
    })
    app.save(auditLog)
  },
  (app) => {
    try {
      const auditLog = app.findCollectionByNameOrId('audit_log')
      app.delete(auditLog)
    } catch (_) {}
    try {
      const orders = app.findCollectionByNameOrId('orders')
      app.delete(orders)
    } catch (_) {}
    try {
      const products = app.findCollectionByNameOrId('products')
      app.delete(products)
    } catch (_) {}
    try {
      const stores = app.findCollectionByNameOrId('stores')
      app.delete(stores)
    } catch (_) {}
  },
)
