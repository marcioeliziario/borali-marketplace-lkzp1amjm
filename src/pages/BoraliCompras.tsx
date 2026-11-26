import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Search, SlidersHorizontal, ArrowLeft } from 'lucide-react'
import ProductCard from '../components/marketplace/ProductCard'
import StoreCard from '../components/marketplace/StoreCard'
import OfferBanner from '../components/marketplace/OfferBanner'

const categories = [
  { name: 'Supermercados', icon: '🛒' },
  { name: 'Distribuidoras', icon: '📦' },
  { name: 'Mercearias', icon: '🏪' },
  { name: 'Açougue', icon: '🥩' },
  { name: 'Padarias', icon: '🍞' },
  { name: 'Hortifruti', icon: '🥬' },
  { name: 'Farmácias', icon: '💊' },
  { name: 'Bebidas', icon: '🥤' },
  { name: 'Pet Shop', icon: '🐾' },
]

const featuredStores = [
  {
    id: 'distribuidora-barbosa',
    name: 'Distribuidora Barbosa',
    slug: 'distribuidora-barbosa',
    description: 'Distribuidora de bebidas e gás em Óbidos',
    city: 'Óbidos',
    category: 'Distribuidoras',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
  },
  {
    id: 'mercadinho-piloto',
    name: 'Mercadinho Piloto',
    slug: 'mercadinho-piloto',
    description: 'Mercadinho completo com produtos básicos e frescos',
    city: 'Óbidos',
    category: 'Mercearias',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
  },
]

export default function BoraliCompras() {
  const { citySlug } = useParams()
  const [query, setQuery] = useState('')
  const cityLabel = citySlug ? citySlug.charAt(0).toUpperCase() + citySlug.slice(1) : 'Cidade'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header com busca */}
      <div className="bg-[#1754AE] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Link to={`/${citySlug}`} className="p-1 hover:bg-white/10 rounded">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Borali Compras • {cityLabel}</h1>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar produtos ou lojas..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E63239]"
              />
            </div>
            <button className="px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Categorias */}
        <section>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.name}
                className="flex flex-col items-center gap-1 min-w-[80px] bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-[#1754AE]/40 transition"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-medium text-slate-700">{cat.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Ofertas */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">Ofertas do dia</h2>
          <OfferBanner />
        </section>

        {/* Lojas em destaque */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">Lojas em destaque</h2>
            <Link to="#" className="text-sm text-[#1754AE] font-semibold">
              Ver todas
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {featuredStores.map((store) => (
              <Link key={store.id} to={`/${citySlug}/${store.slug}`}>
                <StoreCard store={store} />
              </Link>
            ))}
          </div>
        </section>

        {/* Catálogo demonstrativo */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">Catálogo</h2>
          <p className="text-sm text-slate-500 mb-4">
            Exibição demonstrativa de produtos. Nenhum pedido real será realizado.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <ProductCard
                key={idx}
                title={['Café Torrado', 'Arroz 5kg', 'Feijão Carioca', 'Refrigerante 2L', 'Sabão em pó', 'Macarrão', 'Açúcar 1kg', 'Farinha de mandioca'][idx]}
                price={['R$ 18,90', 'R$ 22,50', 'R$ 8,90', 'R$ 12,00', 'R$ 16,50', 'R$ 4,20', 'R$ 5,90', 'R$ 7,50'][idx]}
                image="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&q=80"
                disabled
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
