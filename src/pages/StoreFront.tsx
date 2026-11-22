import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, MapPin, Phone, ShoppingCart, Search as SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useCity } from '@/contexts/CityContext'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/hooks/use-toast'
import { getStoreBySlug, getProductsByStore, getStoreCategories } from '@/services/api'
import type { Product, Store, StoreCategory } from '@/types'
import { getEffectivePrice, formatBRL, parseJSON } from '@/lib/catalog'
import type { CatalogFilters } from '@/lib/publicCatalog'
import { defaultCatalogFilters } from '@/lib/publicCatalog'
import { StoreCatalog } from '@/components/store/StoreCatalog'
import { ProductDetailModal } from '@/components/store/ProductDetailModal'

export const StoreFront: React.FC = () => {
  const { citySlug, storeSlug } = useParams<{ citySlug: string; storeSlug: string }>()
  const navigate = useNavigate()
  const { selectedCity } = useCity()
  const { items, addItem, totalCount, totalAmount } = useCart()
  const { toast } = useToast()

  const [store, setStore] = useState<Store | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<CatalogFilters>({ ...defaultCatalogFilters })
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        if (!citySlug || !storeSlug) return
        const data = await getStoreBySlug(citySlug, storeSlug)
        if (cancelled) return
        setStore(data)
        if (data) {
          const [prods, cats] = await Promise.all([
            getProductsByStore(data.id),
            getStoreCategories(data.id),
          ])
          if (cancelled) return
          setProducts(prods)
          setStoreCategories(cats)
        }
      } catch (e) {
        console.error('Erro ao carregar loja:', e)
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar a loja. Tente novamente.',
          variant: 'destructive',
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [citySlug, storeSlug, toast])

  const quantityInCart = useCallback(
    (productId: string) =>
      items.filter((i) => i.product.id === productId).reduce((acc, i) => acc + i.quantity, 0),
    [items],
  )

  const handleQuickAdd = (product: Product) => {
    if (!store) return
    if (product.track_stock !== false && product.stock <= 0) {
      toast({
        title: 'Indisponível',
        description: 'Este produto está temporariamente indisponível.',
        variant: 'destructive',
      })
      return
    }
    addItem(product, store, 1)
    toast({
      title: 'Adicionado ao carrinho',
      description: `${product.name} — ${formatBRL(getEffectivePrice(product))}`,
    })
  }

  const handleOpenProduct = (product: Product) => {
    setSelectedProduct(product)
    setDetailOpen(true)
  }

  const storeOpenNow = useMemo(() => {
    if (!store) return false
    // Horário semanal (StoreOpeningHours) — interpretado aqui apenas para EXIBIÇÃO
    const hours = parseJSON<Record<string, string | undefined>>(store.opening_hours, {})
    if (!hours || Object.keys(hours).length === 0) return true
    const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
    const now = new Date()
    const key = days[now.getDay()]
    const range = hours[key]
    if (!range || range.toLowerCase() === 'fechado') return false
    const match = range.match(/(\d{1,2}):(\d{2})\s*[-–às até]*\s*(\d{1,2}):(\d{2})/i)
    if (!match) return true
    const minutes = (h: string, m: string) => Number(h) * 60 + Number(m)
    const cur = now.getHours() * 60 + now.getMinutes()
    const open = minutes(match[1], match[2])
    let close = minutes(match[3], match[4])
    if (close <= open) close += 24 * 60 // vira o dia
    const c = cur < open ? cur + 24 * 60 : cur
    return c >= open && c <= close
  }, [store])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <SearchIcon className="w-10 h-10 text-slate-300 mx-auto" />
        <h1 className="text-lg font-bold text-slate-800">Loja não encontrada</h1>
        <p className="text-sm text-slate-500">
          O estabelecimento que você procura não existe ou está indisponível.
        </p>
        <Button
          onClick={() => navigate(`/${selectedCity?.slug || citySlug || 'obidos'}`)}
          className="bg-[#1754AE] hover:bg-[#12428C]"
        >
          Voltar ao início
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-28 md:pb-10 space-y-6">
      {/* Cabeçalho da loja */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-[#1754AE] to-[#12428C] relative">
          <button
            onClick={() => navigate(-1)}
            className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-[#1754AE] hover:bg-white transition"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 sm:px-6 pb-5 -mt-8 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-3xl font-extrabold text-[#1754AE] flex-shrink-0">
              {store.name?.charAt(0) || 'L'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold text-[#172033] leading-tight">
                  {store.name}
                </h1>
                <Badge
                  className={
                    storeOpenNow
                      ? 'bg-green-100 text-green-700 text-[10px] font-bold'
                      : 'bg-slate-100 text-slate-500 text-[10px] font-bold'
                  }
                >
                  {storeOpenNow ? 'Aberto agora' : 'Fechado'}
                </Badge>
                {store.is_demo && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-red-50 text-red-700 border-red-300 font-bold"
                  >
                    DEMO
                  </Badge>
                )}
              </div>
              {store.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{store.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500">
                {(store.address_street || store.address_neighborhood) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {[store.address_street, store.address_number, store.address_neighborhood]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                )}
                {(store.phone || store.whatsapp) && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {store.whatsapp || store.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {storeOpenNow ? 'Aberto agora' : 'Fechado no momento'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Catálogo: busca, filtros, ofertas e grid */}
      <StoreCatalog
        products={products}
        storeCategories={storeCategories}
        filters={filters}
        onFiltersChange={setFilters}
        onOpenProduct={handleOpenProduct}
        onQuickAdd={handleQuickAdd}
        quantityInCart={quantityInCart}
      />

      {/* Modal de detalhes do produto */}
      <ProductDetailModal
        product={selectedProduct}
        store={store}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* Barra flutuante do carrinho (mobile) */}
      {totalCount > 0 && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 px-4">
          <button
            onClick={() => navigate('/carrinho')}
            className="w-full bg-[#1754AE] hover:bg-[#12428C] text-white rounded-2xl shadow-lg px-4 py-3 flex items-center justify-between transition"
            aria-label="Abrir carrinho"
          >
            <span className="flex items-center gap-2 text-xs font-bold">
              <ShoppingCart className="w-4 h-4" />
              {totalCount} {totalCount === 1 ? 'item' : 'itens'}
            </span>
            <span className="text-sm font-extrabold">{formatBRL(totalAmount)}</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default StoreFront
