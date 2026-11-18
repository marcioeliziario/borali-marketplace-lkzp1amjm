import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Store as StoreIcon,
  Clock,
  Bike,
  MapPin,
  Phone,
  MessageCircle,
  Plus,
  Minus,
  ShoppingBag,
  Info,
  CheckCircle2,
  ChevronLeft,
  Share2,
  AlertCircle,
} from 'lucide-react'
import { getCityBySlug, getStoreBySlug, getProductsByStore, getCategories } from '@/services/api'
import { Store, Product, Category, City } from '@/types'
import { useCart } from '@/contexts/CartContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export const StoreFront: React.FC = () => {
  const { citySlug, storeSlug } = useParams<{ citySlug: string; storeSlug: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { cartStore, items, addItem, removeItem, updateQuantity, totalCount, totalAmount } =
    useCart()

  const [city, setCity] = useState<City | null>(null)
  const [store, setStore] = useState<Store | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function loadStore() {
      if (!citySlug || !storeSlug) return
      setIsLoading(true)

      const cityData = await getCityBySlug(citySlug)
      if (!cityData) {
        setNotFound(true)
        setIsLoading(false)
        return
      }
      setCity(cityData)

      const storeData = await getStoreBySlug(cityData.id, storeSlug)
      if (!storeData) {
        setNotFound(true)
        setIsLoading(false)
        return
      }
      setStore(storeData)

      const [prods, cats] = await Promise.all([getProductsByStore(storeData.id), getCategories()])

      setProducts(prods)
      setCategories(cats)
      setIsLoading(false)
    }

    loadStore()
  }, [citySlug, storeSlug])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-[#1754AE] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Carregando loja virtual...</p>
        </div>
      </div>
    )
  }

  if (notFound || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md shadow-sm space-y-4">
          <StoreIcon className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Estabelecimento não encontrado</h2>
          <p className="text-xs text-slate-500">
            A loja solicitada não existe ou não está ativa na cidade de {citySlug}.
          </p>
          <Button onClick={() => navigate(`/${citySlug || 'obidos'}`)} className="bg-[#1754AE]">
            Voltar para o Marketplace
          </Button>
        </div>
      </div>
    )
  }

  // Filtragem de produtos por categoria na loja
  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products

  // Obter quantidade no carrinho para um produto específico
  const getProductQuantityInCart = (productId: string) => {
    const item = items.find((i) => i.product.id === productId)
    return item ? item.quantity : 0
  }

  // Horários de funcionamento parseados
  let hoursDisplay: Record<string, string> = {}
  try {
    if (typeof store.opening_hours === 'string') {
      hoursDisplay = JSON.parse(store.opening_hours)
    } else if (store.opening_hours) {
      hoursDisplay = store.opening_hours as Record<string, string>
    }
  } catch {
    /* intentionally ignored */
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-24">
      {/* BANNER DEMO / PILOTO */}
      {store.is_demo && (
        <div className="bg-red-500 text-white text-xs px-4 py-1.5 text-center font-medium shadow-sm">
          <strong>AVISO DO PILOTO:</strong> Este estabelecimento contém catálogo com dados
          demonstrativos identificados como{' '}
          <span className="bg-white text-red-600 px-1.5 py-0.2 rounded font-bold">[DEMO]</span> para
          testes em Óbidos/PA.
        </div>
      )}

      {/* CABEÇALHO / HERO DA LOJA */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto">
          {/* Capa */}
          <div className="h-44 sm:h-56 bg-gradient-to-r from-[#1754AE] via-blue-800 to-indigo-900 relative">
            <div className="absolute top-4 left-4 z-10">
              <Link to={`/${citySlug || 'obidos'}`}>
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/90 hover:bg-white text-slate-800 text-xs shadow"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
              </Link>
            </div>

            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href)
                  toast({
                    title: 'Link copiado!',
                    description: 'O link da loja foi copiado para a área de transferência.',
                  })
                }}
                className="bg-white/90 hover:bg-white text-slate-800 text-xs shadow"
              >
                <Share2 className="w-3.5 h-3.5 mr-1" />
                Compartilhar
              </Button>
            </div>
          </div>

          {/* Dados Principais do Estabelecimento */}
          <div className="px-4 sm:px-8 pb-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-14 sm:-mt-16 gap-4">
              <div className="flex items-end gap-4">
                {/* Logo da Loja */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-[#1754AE] flex-shrink-0">
                  <StoreIcon className="w-12 h-12" />
                </div>

                <div className="space-y-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                      {store.name}
                    </h1>
                    {store.is_demo && (
                      <Badge className="bg-red-100 text-[#E63239] border border-red-200 font-bold text-xs">
                        DEMO
                      </Badge>
                    )}
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                      Aberta
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    {store.trade_name || store.description}
                  </p>
                </div>
              </div>

              {/* Botões de Contato */}
              <div className="flex items-center gap-2 self-start sm:self-end pt-2 sm:pt-0">
                {store.whatsapp && (
                  <a
                    href={`https://wa.me/55${store.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      <MessageCircle className="w-4 h-4 mr-1.5" />
                      WhatsApp
                    </Button>
                  </a>
                )}
                {store.phone && (
                  <a href={`tel:${store.phone.replace(/\D/g, '')}`}>
                    <Button size="sm" variant="outline" className="text-xs">
                      <Phone className="w-4 h-4 mr-1.5" />
                      Ligar
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* Badges de Informações: Entrega, Horários, Endereço */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-100 mt-6 text-xs text-slate-600">
              <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <Bike className="w-4 h-4 text-[#1754AE]" />
                <div>
                  <p className="font-semibold text-slate-800">
                    {store.delivery_fee
                      ? `Taxa de R$ ${Number(store.delivery_fee).toFixed(2).replace('.', ',')}`
                      : 'Entrega Grátis'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Tempo estimado: {store.estimated_time || '30-50 min'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <Clock className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="font-semibold text-slate-800">Funcionamento hoje</p>
                  <p className="text-[11px] text-slate-500">
                    {hoursDisplay.seg || 'Aberto comercial'} • Óbidos/PA
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <MapPin className="w-4 h-4 text-[#E63239]" />
                <div>
                  <p className="font-semibold text-slate-800">
                    {store.address_neighborhood || 'Centro'}, {store.address_street || 'Óbidos'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Ref: {store.address_reference || 'Óbidos/PA'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA DE PRODUTOS E CATÁLOGO */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* COLUNA ESQUERDA: CATÁLOGO DE PRODUTOS (3 colunas) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Catálogo da Loja</h2>
                <p className="text-xs text-slate-500">
                  {filteredProducts.length} produto(s) disponível(is)
                </p>
              </div>
              {selectedCategory && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs text-[#1754AE]"
                >
                  Ver todos
                </Button>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-medium text-slate-700">
                  Nenhum produto cadastrado nesta categoria.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredProducts.map((product) => {
                  const qtyInCart = getProductQuantityInCart(product.id)
                  const hasPromo = product.promo_price && product.promo_price < product.price

                  return (
                    <Card
                      key={product.id}
                      className="border border-slate-200 hover:border-[#1754AE]/40 transition shadow-sm overflow-hidden flex flex-col justify-between"
                    >
                      <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            {product.is_demo ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-red-50 text-red-700 border-red-300 font-bold"
                              >
                                DEMO
                              </Badge>
                            ) : (
                              <span />
                            )}

                            {product.unit && (
                              <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                                Unidade: {product.unit}
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-sm text-slate-900 leading-snug">
                            {product.name}
                          </h3>

                          {product.description && (
                            <p className="text-xs text-slate-500 line-clamp-2">
                              {product.description}
                            </p>
                          )}

                          {product.is_regulated && (
                            <p className="text-[10px] text-amber-700 bg-amber-50 p-1 rounded font-medium">
                              Regulamentado: venda proibida para menores de 18 anos.
                            </p>
                          )}
                        </div>

                        {/* Preço e Botão de Ação */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            {hasPromo ? (
                              <>
                                <p className="text-xs text-slate-400 line-through">
                                  R$ {Number(product.price).toFixed(2).replace('.', ',')}
                                </p>
                                <p className="text-base font-extrabold text-[#E63239]">
                                  R$ {Number(product.promo_price).toFixed(2).replace('.', ',')}
                                </p>
                              </>
                            ) : (
                              <p className="text-base font-extrabold text-slate-900">
                                R$ {Number(product.price).toFixed(2).replace('.', ',')}
                              </p>
                            )}
                          </div>

                          {/* Seletor de Quantidade / Adicionar ao Carrinho */}
                          {qtyInCart > 0 ? (
                            <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1">
                              <button
                                onClick={() => updateQuantity(product.id, qtyInCart - 1)}
                                className="w-6 h-6 rounded bg-white text-slate-700 flex items-center justify-center hover:bg-slate-200 transition"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold w-5 text-center">{qtyInCart}</span>
                              <button
                                onClick={() => updateQuantity(product.id, qtyInCart + 1)}
                                className="w-6 h-6 rounded bg-[#1754AE] text-white flex items-center justify-center hover:bg-[#12428C] transition"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                addItem(product, store, 1)
                                toast({
                                  title: 'Adicionado ao carrinho',
                                  description: `${product.name} foi adicionado com sucesso.`,
                                })
                              }}
                              className="bg-[#1754AE] hover:bg-[#12428C] text-white text-xs h-8 px-3 rounded-lg font-semibold"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              Adicionar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* COLUNA DIREITA: ESTRUTURA DO CARRINHO NA LOJA (1 coluna) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#1754AE]" />
                  <h3 className="font-bold text-sm text-slate-900">Seu Carrinho</h3>
                </div>
                <Badge variant="secondary" className="text-xs font-bold">
                  {totalCount} itens
                </Badge>
              </div>

              {items.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">Seu carrinho está vazio</p>
                  <p className="text-[11px] text-slate-400">
                    Selecione itens do catálogo para montar seu pedido.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {items.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50"
                      >
                        <div className="truncate pr-2">
                          <p className="font-medium text-slate-800 truncate">{item.product.name}</p>
                          <p className="text-[11px] text-slate-400">
                            {item.quantity}x R${' '}
                            {(item.product.promo_price || item.product.price)
                              .toFixed(2)
                              .replace('.', ',')}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-5 h-5 rounded bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="font-bold text-xs w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-5 h-5 rounded bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Resumo financeiro */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span>R$ {totalAmount.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Taxa de Entrega</span>
                      <span>
                        {store.delivery_fee
                          ? `R$ ${Number(store.delivery_fee).toFixed(2).replace('.', ',')}`
                          : 'Grátis'}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 text-sm pt-1 border-t border-slate-100">
                      <span>Total estimado</span>
                      <span className="text-[#1754AE]">
                        R${' '}
                        {(totalAmount + (Number(store.delivery_fee) || 0))
                          .toFixed(2)
                          .replace('.', ',')}
                      </span>
                    </div>
                  </div>

                  {/* Aviso v0.1: Estrutura sem checkout ainda */}
                  <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-900 leading-snug">
                    <strong className="block mb-0.5">Versão 0.2 do Borali:</strong>
                    A estrutura de carrinho e produtos está funcional. O fluxo completo de checkout
                    e pagamentos entrará na <strong>v0.3 e v0.4</strong> conforme o roadmap.
                  </div>

                  <Link to="/carrinho" className="block w-full">
                    <Button className="w-full bg-[#E63239] hover:bg-[#c9242a] text-white text-xs font-bold py-2.5 rounded-xl shadow-sm">
                      Ver Detalhes do Pedido
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StoreFront
