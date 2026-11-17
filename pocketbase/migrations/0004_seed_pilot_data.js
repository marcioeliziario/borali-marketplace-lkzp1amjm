migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const citiesCol = app.findCollectionByNameOrId('cities')
    const categoriesCol = app.findCollectionByNameOrId('categories')
    const storesCol = app.findCollectionByNameOrId('stores')
    const productsCol = app.findCollectionByNameOrId('products')

    // 1. Seed Usuário Administrador
    const adminEmail = 'marcio.eliziario@hotmail.com'
    let adminUser
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', adminEmail)
      adminUser.set('role', 'admin')
      adminUser.set('name', 'Marcio Admin Borali')
      app.save(adminUser)
    } catch (_) {
      adminUser = new Record(usersCol)
      adminUser.setEmail(adminEmail)
      adminUser.setPassword('Skip@Pass')
      adminUser.setVerified(true)
      adminUser.set('name', 'Marcio Admin Borali')
      adminUser.set('role', 'admin')
      app.save(adminUser)
    }

    // 2. Seed Usuário Comerciante Demo (Distribuidora Barbosa)
    const merchantEmail = 'comerciante.barbosa@borali.local'
    let merchantUser
    try {
      merchantUser = app.findAuthRecordByEmail('_pb_users_auth_', merchantEmail)
    } catch (_) {
      merchantUser = new Record(usersCol)
      merchantUser.setEmail(merchantEmail)
      merchantUser.setPassword('Skip@Pass')
      merchantUser.setVerified(true)
      merchantUser.set('name', 'Gestor Distribuidora Barbosa')
      merchantUser.set('role', 'merchant')
      app.save(merchantUser)
    }

    // 3. Seed Cidade Óbidos, Pará (Piloto)
    let obidos
    try {
      obidos = app.findFirstRecordByData('cities', 'slug', 'obidos')
    } catch (_) {
      obidos = new Record(citiesCol)
      obidos.set('name', 'Óbidos')
      obidos.set('state', 'PA')
      obidos.set('slug', 'obidos')
      obidos.set('is_active', true)
      obidos.set('is_pilot', true)
      app.save(obidos)
    }

    // 4. Seed das 19 Categorias Iniciais
    const initialCategories = [
      { name: 'Mercados e mercearias', slug: 'mercados-e-mercearias', icon: 'Store', order: 1 },
      { name: 'Bebidas', slug: 'bebidas', icon: 'Wine', order: 2 },
      { name: 'Farmácias', slug: 'farmacias', icon: 'Pill', order: 3 },
      {
        name: 'Restaurantes e lanchonetes',
        slug: 'restaurantes-e-lanchonetes',
        icon: 'Utensils',
        order: 4,
      },
      { name: 'Açougues', slug: 'acougues', icon: 'Beef', order: 5 },
      { name: 'Peixarias', slug: 'peixarias', icon: 'Fish', order: 6 },
      { name: 'Frutas e verduras', slug: 'frutas-e-verduras', icon: 'Apple', order: 7 },
      { name: 'Padarias', slug: 'padarias', icon: 'Croissant', order: 8 },
      { name: 'Açaí e sorvetes', slug: 'acai-e-sorvetes', icon: 'IceCream', order: 9 },
      { name: 'Gás e água', slug: 'gas-e-agua', icon: 'Flame', order: 10 },
      { name: 'Pet shops', slug: 'pet-shops', icon: 'Dog', order: 11 },
      { name: 'Beleza e perfumaria', slug: 'beleza-e-perfumaria', icon: 'Sparkles', order: 12 },
      { name: 'Sabores da Terra', slug: 'sabores-da-terra', icon: 'Wheat', order: 13 },
      { name: 'Moda e calçados', slug: 'moda-e-calcados', icon: 'Shirt', order: 14 },
      {
        name: 'Construção e ferramentas',
        slug: 'construcao-e-ferramentas',
        icon: 'Hammer',
        order: 15,
      },
      { name: 'Motopeças', slug: 'motopecas', icon: 'Bike', order: 16 },
      { name: 'Papelaria', slug: 'papelaria', icon: 'BookOpen', order: 17 },
      { name: 'Casa e utilidades', slug: 'casa-e-utilidades', icon: 'Home', order: 18 },
      { name: 'Presentes e festas', slug: 'presentes-e-festas', icon: 'Gift', order: 19 },
    ]

    const categoryMap = {}
    for (const cat of initialCategories) {
      try {
        const existing = app.findFirstRecordByData('categories', 'slug', cat.slug)
        categoryMap[cat.slug] = existing
      } catch (_) {
        const rec = new Record(categoriesCol)
        rec.set('name', cat.name)
        rec.set('slug', cat.slug)
        rec.set('icon', cat.icon)
        rec.set('display_order', cat.order)
        rec.set('is_active', true)
        rec.set('description', `Comércio e serviços de ${cat.name.toLowerCase()} em Óbidos`)
        app.save(rec)
        categoryMap[cat.slug] = rec
      }
    }

    // 5. Seed dos 2 Estabelecimentos Piloto em Óbidos
    // Piloto 1: Distribuidora Barbosa (Bebidas)
    let barbosa
    try {
      barbosa = app.findFirstRecordByData('stores', 'slug', 'distribuidora-barbosa')
    } catch (_) {
      barbosa = new Record(storesCol)
      barbosa.set('name', 'Distribuidora Barbosa')
      barbosa.set('trade_name', 'Distribuidora Barbosa - Bebidas e Gelo')
      barbosa.set('slug', 'distribuidora-barbosa')
      barbosa.set('city_id', obidos.id)
      barbosa.set('category_ids', categoryMap['bebidas'] ? [categoryMap['bebidas'].id] : [])
      barbosa.set(
        'description',
        'Distribuidora de bebidas em Óbidos/PA. Atendimento rápido e entrega na sua porta.',
      )
      barbosa.set('logo_url', '')
      barbosa.set('banner_url', '')
      barbosa.set('phone', '(93) 98100-0001')
      barbosa.set('whatsapp', '(93) 98100-0001')
      barbosa.set('address_street', 'Rua do Comércio')
      barbosa.set('address_number', '120')
      barbosa.set('address_neighborhood', 'Centro')
      barbosa.set('address_reference', 'Próximo à Praça de Santa Maria')
      barbosa.set('status', 'approved')
      barbosa.set('is_active', true)
      barbosa.set('is_featured', true)
      barbosa.set('is_demo', true) // Estabelecimento piloto / demonstrativo
      barbosa.set('delivery_type', 'fixed')
      barbosa.set('delivery_fee', 5.0)
      barbosa.set('min_order_value', 20.0)
      barbosa.set('estimated_time', '30-50 min')
      barbosa.set('accepts_pix', true)
      barbosa.set('accepts_cash', true)
      barbosa.set('accepts_card_on_delivery', true)
      barbosa.set(
        'opening_hours',
        JSON.stringify({
          seg: '08:00 - 22:00',
          ter: '08:00 - 22:00',
          qua: '08:00 - 22:00',
          qui: '08:00 - 22:00',
          sex: '08:00 - 23:30',
          sab: '08:00 - 23:30',
          dom: '09:00 - 20:00',
        }),
      )
      app.save(barbosa)
    }

    // Vincular o usuário comerciante à Distribuidora Barbosa
    merchantUser.set('store_id', barbosa.id)
    app.save(merchantUser)

    // Piloto 2: Mercadinho (Mercados e mercearias - nome a confirmar)
    let mercadinho
    try {
      mercadinho = app.findFirstRecordByData('stores', 'slug', 'mercadinho')
    } catch (_) {
      mercadinho = new Record(storesCol)
      mercadinho.set('name', 'Mercadinho')
      mercadinho.set('trade_name', 'Mercadinho (Nome comercial a confirmar)')
      mercadinho.set('slug', 'mercadinho')
      mercadinho.set('city_id', obidos.id)
      mercadinho.set(
        'category_ids',
        categoryMap['mercados-e-mercearias'] ? [categoryMap['mercados-e-mercearias'].id] : [],
      )
      mercadinho.set(
        'description',
        'Mercado de bairro em Óbidos/PA com produtos essenciais do dia a dia.',
      )
      mercadinho.set('logo_url', '')
      mercadinho.set('banner_url', '')
      mercadinho.set('phone', '(93) 98100-0002')
      mercadinho.set('whatsapp', '(93) 98100-0002')
      mercadinho.set('address_street', 'Av. Deputado Raimundo Chaves')
      mercadinho.set('address_number', '45')
      mercadinho.set('address_neighborhood', 'Centro')
      mercadinho.set('address_reference', 'Em frente ao porto')
      mercadinho.set('status', 'approved')
      mercadinho.set('is_active', true)
      mercadinho.set('is_featured', false)
      mercadinho.set('is_demo', true) // Piloto com dados demonstrativos
      mercadinho.set('delivery_type', 'fixed')
      mercadinho.set('delivery_fee', 4.0)
      mercadinho.set('min_order_value', 15.0)
      mercadinho.set('estimated_time', '25-45 min')
      mercadinho.set('accepts_pix', true)
      mercadinho.set('accepts_cash', true)
      mercadinho.set('accepts_card_on_delivery', true)
      mercadinho.set(
        'opening_hours',
        JSON.stringify({
          seg: '07:30 - 19:30',
          ter: '07:30 - 19:30',
          qua: '07:30 - 19:30',
          qui: '07:30 - 19:30',
          sex: '07:30 - 19:30',
          sab: '07:30 - 18:00',
          dom: '07:30 - 12:00',
        }),
      )
      app.save(mercadinho)
    }

    // 6. Produtos Demonstrativos na Distribuidora Barbosa (claramente identificados como [DEMO])
    const demoProductsBarbosa = [
      {
        name: '[DEMO] Água Mineral 500ml sem gás',
        desc: 'Garrafa individual de água mineral límpida da Amazônia. Exemplo demonstrativo.',
        unit: 'un',
        price: 3.0,
        promo_price: 2.5,
        stock: 120,
        barcode: '7890001000101',
      },
      {
        name: '[DEMO] Água Mineral Garrafão 20L',
        desc: 'Retornável 20 litros. Item de amostra para visualização do catálogo.',
        unit: 'un',
        price: 14.0,
        promo_price: null,
        stock: 45,
        barcode: '7890001000102',
      },
      {
        name: '[DEMO] Refrigerante Guaraná 2L',
        desc: 'Refrigerante sabor guaraná pet 2 litros. Produto demonstrativo para testes do piloto.',
        unit: 'un',
        price: 9.5,
        promo_price: 8.9,
        stock: 60,
        barcode: '7890001000103',
      },
      {
        name: '[DEMO] Cerveja Pilsen Lata 350ml (Fardo 12un)',
        desc: 'Fardo com 12 latas de 350ml. Venda proibida para menores de 18 anos. Demonstração de catálogo.',
        unit: 'fardo',
        price: 48.0,
        promo_price: 44.9,
        stock: 30,
        barcode: '7890001000104',
        is_regulated: true,
      },
      {
        name: '[DEMO] Saco de Gelo Filtrado 5kg',
        desc: 'Gelo em cubos para conservação de bebidas. Exemplo de produto.',
        unit: 'pct',
        price: 10.0,
        promo_price: null,
        stock: 25,
        barcode: '7890001000105',
      },
    ]

    for (const p of demoProductsBarbosa) {
      try {
        app.findFirstRecordByData('products', 'name', p.name)
      } catch (_) {
        const prod = new Record(productsCol)
        prod.set('store_id', barbosa.id)
        if (categoryMap['bebidas']) {
          prod.set('category_id', categoryMap['bebidas'].id)
        }
        prod.set('name', p.name)
        prod.set('description', p.desc)
        prod.set('brand', 'Marca Piloto')
        prod.set('unit', p.unit)
        prod.set('price', p.price)
        if (p.promo_price) prod.set('promo_price', p.promo_price)
        prod.set('stock', p.stock)
        prod.set('is_available', true)
        prod.set('barcode', p.barcode)
        prod.set('is_demo', true)
        prod.set('is_regulated', p.is_regulated || false)
        prod.set('status', 'active')
        app.save(prod)
      }
    }

    // 7. Produtos Demonstrativos no Mercadinho
    const demoProductsMercadinho = [
      {
        name: '[DEMO] Café Torrado e Moído 250g',
        desc: 'Café tradicional da região. Amostra demonstrativa para navegação da loja.',
        unit: 'pct',
        price: 11.5,
        promo_price: 9.9,
        stock: 40,
        barcode: '7890002000201',
      },
      {
        name: '[DEMO] Farinha de Mandioca Torrada 1kg',
        desc: 'Farinha tradicional do Baixo Amazonas. Item demonstrativo.',
        unit: 'kg',
        price: 8.0,
        promo_price: null,
        stock: 80,
        barcode: '7890002000202',
      },
      {
        name: '[DEMO] Leite Integral UHT 1L',
        desc: 'Caixa longa vida 1 litro. Exemplo de mercearia.',
        unit: 'cx',
        price: 6.8,
        promo_price: 6.2,
        stock: 50,
        barcode: '7890002000203',
      },
    ]

    for (const p of demoProductsMercadinho) {
      try {
        app.findFirstRecordByData('products', 'name', p.name)
      } catch (_) {
        const prod = new Record(productsCol)
        prod.set('store_id', mercadinho.id)
        if (categoryMap['mercados-e-mercearias']) {
          prod.set('category_id', categoryMap['mercados-e-mercearias'].id)
        }
        prod.set('name', p.name)
        prod.set('description', p.desc)
        prod.set('brand', 'Piloto Regional')
        prod.set('unit', p.unit)
        prod.set('price', p.price)
        if (p.promo_price) prod.set('promo_price', p.promo_price)
        prod.set('stock', p.stock)
        prod.set('is_available', true)
        prod.set('barcode', p.barcode)
        prod.set('is_demo', true)
        prod.set('is_regulated', false)
        prod.set('status', 'active')
        app.save(prod)
      }
    }
  },
  (app) => {
    // down: rollback seed
  },
)
