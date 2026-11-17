import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Search,
  Store as StoreIcon,
  Clock,
  Bike,
  Star,
  ChevronRight,
  Info,
  ShieldCheck,
  Percent,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { useCity } from '@/contexts/CityContext'
import { Category, Store, Product } from '@/types'
import { getCategories, getStoresByCity, getProductsByStore } from '@/services/api'
import CategoryIcon from '@/components/common/CategoryIcon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export const MarketplaceHome: React.FC = () => {
  const { citySlug } = useParams<{ citySlug?: string }>()
  const { selectedCity, selectCityBySlug, cities } = useCity()

  const [categories, setCategories] = useState<Category[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [popularProducts, setPopularProducts] = useState<Product[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Sincronizar slug da URL com a cidade
  useEffect(() => {
    if (citySlug) {
      selectCityBySlug(citySlug)
    }
  }, [citySlug, cities])

  // Carregar dados quando a cidade mudar
  useEffect(() => {
    async function loadData() {
      if (!selectedCity) return
      setIsLoading(true)

      const [cats, storeList] = await Promise.all([
        getCategories(),
        getStoresByCity(selectedCity.id),
      ])

      setCategories(cats)
      setStores(storeList)

      // Carregar alguns produtos das lojas piloto para a seção de destaques/ofertas
      if (storeList.length > 0) {
        const prodPromises = storeList.slice(0, 2).map((s) => getProductsByStore(s.id))
        const prodLists = await Promise.all(prodPromises)
        setPopularProducts(prodLists.flat())
      }

      setIsLoading(false)
    }

    loadData()
  }, [selectedCity])

  const currentCityName = selectedCity
    ? `${selectedCity.name} - ${selectedCity.state}`
    : 'Óbidos - PA'
  const currentCitySlug = selectedCity?.slug || 'obidos'

  // Filtragem de lojas por busca e categoria
  const filteredStores = stores.filter((store) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (store.trade_name && store.trade_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (store.description && store.description.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory =
      !activeCategory || (store.category_ids && store.category_ids.includes(activeCategory))

    return matchesSearch && matchesCategory
  })

  // Ofertas (produtos com preço promocional)
  const promoProducts = popularProducts.filter((p) => p.promo_price && p.promo_price < p.price)

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* BANNER DE AVISO: Versão 0.1 e Dados Demonstrativos */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>BORALI v0.1 (Piloto Óbidos/PA):</strong> Os estabelecimentos e produtos
              exibidos possuem marcação{' '}
              <Badge
                variant="outline"
                className="text-[10px] bg-red-50 text-red-700 border-red-300 font-bold ml-1 py-0 h-4"
              >
                DEMO
              </Badge>{' '}
              para validação de estrutura conforme especificação.
            </span>
          </div>
          <Link
            to="/roadmap"
            className="text-amber-800 underline font-medium hover:text-amber-950 flex-shrink-0 hidden sm:inline"
          >
            Ver Roadmap
          </Link>
        </div>
      </div>

      {/* HERO SECTION / BANNER PRINCIPAL */}
      <div className="bg-gradient-to-br from-[#1754AE] via-[#12428C] to-[#0D3067] text-white py-8 sm:py-12 px-4 shadow-inner relative overflow-hidden">
        {/* Elemento de fundo sutil */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-white/90">
              <span className="w-2 h-2 rounded-full bg-[#E63239] animate-pulse" />
              <span>O comércio local de Óbidos na palma da sua mão</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Sua cidade, <span className="text-[#E63239]">mais perto de você</span>
            </h1>

            <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-xl">
              Peça dos melhores mercados, mercearias, distribuidoras e comércios locais em{' '}
              {currentCityName}. Rápido, fácil e valorizando os empreendedores da nossa terra.
            </p>

            {/* BARRA DE PESQUISA */}
            <div className="pt-2">
              <div className="relative flex items-center bg-white rounded-xl shadow-lg p-1.5 max-w-xl text-slate-800">
                <Search className="w-5 h-5 text-slate-400 ml-2.5 flex-shrink-0" />
                <Input
                  type="text"
                  placeholder="Buscar estabelecimentos, bebidas, mercearias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-none shadow-none focus-visible:ring-0 text-sm placeholder:text-slate-400 h-10 px-3"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-xs text-slate-400 hover:text-slate-600 px-2 font-medium"
                  >
                    Limpar
                  </button>
                )}
                <Button className="bg-[#E63239] hover:bg-[#c9242a] text-white px-5 rounded-lg font-semibold text-xs h-10 shadow-sm flex-shrink-0">
                  Buscar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* CARROSSEL DE CATEGORIAS (19 Categorias Iniciais) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#172033]">Categorias Comerciais</h2>
              <p className="text-xs text-slate-500">Explore o comércio local por segmento</p>
            </div>
            {activeCategory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveCategory(null)}
                className="text-xs text-[#1754AE] hover:text-[#0D3067]"
              >
                Ver todas ({categories.length})
              </Button>
            )}
          </div>

          <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {categories.map((cat) => {
              const isSelected = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(isSelected ? null : cat.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl min-w-[105px] max-w-[110px] text-center transition-all duration-200 border flex-shrink-0 ${
                    isSelected
                      ? 'bg-[#1754AE] text-white border-[#1754AE] shadow-md scale-105'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#1754AE]'
                    }`}
                  >
                    <CategoryIcon slug={cat.slug} iconName={cat.icon} className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-medium leading-tight line-clamp-2">
                    {cat.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* BANNERS PROMOCIONAIS DO PILOTO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-blue-700 to-[#1754AE] text-white p-6 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10 space-y-2">
              <span className="bg-[#E63239] text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block">
                Piloto Óbidos
              </span>
              <h3 className="text-xl font-bold">Distribuidora Barbosa</h3>
              <p className="text-xs text-blue-100 max-w-sm">
                Bebidas geladas, água mineral e gelo com entrega rápida em Óbidos.
              </p>
            </div>
            <div className="pt-4 relative z-10">
              <Link to={`/${currentCitySlug}/distribuidora-barbosa`}>
                <Button
                  size="sm"
                  className="bg-white text-[#1754AE] hover:bg-blue-50 font-semibold text-xs"
                >
                  Ver Loja Virtual
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10 space-y-2">
              <span className="bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block">
                Piloto Óbidos
              </span>
              <h3 className="text-xl font-bold">Mercadinho de Bairro</h3>
              <p className="text-xs text-emerald-100 max-w-sm">
                Mercearia completa com alimentos, itens essenciais e entrega na sua casa.
              </p>
            </div>
            <div className="pt-4 relative z-10">
              <Link to={`/${currentCitySlug}/mercadinho`}>
                <Button
                  size="sm"
                  className="bg-white text-emerald-900 hover:bg-emerald-50 font-semibold text-xs"
                >
                  Ver Loja Virtual
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ESTABELECIMENTOS EM DESTAQUE E ABERTOS */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#172033]">
                Estabelecimentos em {selectedCity?.name || 'Óbidos'}
              </h2>
              <p className="text-xs text-slate-500">
                Lojas ativas e aprovadas para compras na sua região
              </p>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {filteredStores.length} loja(s) encontrada(s)
            </span>
          </div>

          {filteredStores.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md mx-auto my-6 space-y-3">
              <StoreIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-medium text-slate-700">
                Nenhum estabelecimento encontrado nesta categoria.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveCategory(null)
                  setSearchTerm('')
                }}
              >
                Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStores.map((store) => (
                <Link
                  key={store.id}
                  to={`/${currentCitySlug}/${store.slug}`}
                  className="group block bg-white rounded-2xl border border-slate-200 hover:border-[#1754AE]/40 hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Capa do estabelecimento */}
                  <div className="h-32 bg-gradient-to-r from-slate-100 to-slate-200 relative flex items-center justify-center overflow-hidden">
                    {store.is_featured && (
                      <span className="absolute top-3 left-3 bg-[#1754AE] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        Destaque
                      </span>
                    )}

                    {store.is_demo && (
                      <span className="absolute top-3 right-3 bg-red-100 text-[#E63239] border border-red-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full z-10">
                        PILOTO DEMO
                      </span>
                    )}

                    <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center border border-slate-100 text-[#1754AE] group-hover:scale-105 transition-transform duration-200">
                      <StoreIcon className="w-8 h-8" />
                    </div>
                  </div>

                  {/* Informações da Loja */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-[#1754AE] transition">
                          {store.name}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {store.trade_name || store.description}
                        </p>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium">
                        Aberta
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{store.estimated_time || '30-50 min'}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Bike className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {store.delivery_fee
                            ? `R$ ${Number(store.delivery_fee).toFixed(2).replace('.', ',')}`
                            : 'Entrega Grátis'}
                        </span>
                      </div>
                    </div>

                    {/* Endereço resumido */}
                    <p className="text-[11px] text-slate-400 truncate">
                      {store.address_neighborhood || 'Centro'}, {store.address_street || 'Óbidos'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* OFERTAS E PRODUTOS POPULARES (Com tag DEMO explícita) */}
        {promoProducts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-[#E63239] flex items-center justify-center">
                  <Percent className="w-4 h-4 font-bold" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#172033]">Ofertas em Óbidos</h2>
                  <p className="text-xs text-slate-500">
                    Preços especiais nos estabelecimentos piloto
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {promoProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col justify-between hover:shadow-sm transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] bg-red-100 text-[#E63239] font-bold px-1.5 py-0.5 rounded">
                        DEMO
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {prod.unit ? `por ${prod.unit}` : ''}
                      </span>
                    </div>

                    <h4 className="font-semibold text-xs text-slate-800 line-clamp-2 pt-1">
                      {prod.name}
                    </h4>

                    <p className="text-[11px] text-slate-400 line-clamp-1">{prod.description}</p>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-baseline justify-between">
                    <div>
                      <p className="text-xs text-slate-400 line-through">
                        R$ {Number(prod.price).toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-sm font-bold text-[#E63239]">
                        R$ {Number(prod.promo_price).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MarketplaceHome
