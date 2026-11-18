import React, { useMemo } from 'react'
import { Search, SlidersHorizontal, Percent, AlertCircle, X, Plus, Minus } from 'lucide-react'
import { Product, StoreCategory } from '@/types'
import { getPromoInfo, isPromoActive, formatBRL, getUnitLabel } from '@/lib/catalog'
import {
  filterAndSortProducts,
  defaultCatalogFilters,
  type CatalogFilters,
  type PriceRange,
  type SortOption,
} from '@/lib/publicCatalog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface Props {
  products: Product[]
  storeCategories: StoreCategory[]
  filters: CatalogFilters
  onFiltersChange: (f: CatalogFilters) => void
  onOpenProduct: (p: Product) => void
  onQuickAdd: (p: Product) => void
  quantityInCart: (productId: string) => number
}

const PRICE_RANGES: { value: PriceRange; label: string }[] = [
  { value: 'all', label: 'Todos os preços' },
  { value: '0-10', label: 'Até R$ 10' },
  { value: '10-25', label: 'R$ 10 a R$ 25' },
  { value: '25-50', label: 'R$ 25 a R$ 50' },
  { value: '50+', label: 'Acima de R$ 50' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Nome (A-Z)' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
]

export const StoreCatalog: React.FC<Props> = ({
  products,
  storeCategories,
  filters,
  onFiltersChange,
  onOpenProduct,
  onQuickAdd,
  quantityInCart,
}) => {
  const result = useMemo(() => filterAndSortProducts(products, filters), [products, filters])
  const patch = (p: Partial<CatalogFilters>) => onFiltersChange({ ...filters, ...p })
  const hasActiveFilters =
    !!filters.search ||
    !!filters.storeCategoryId ||
    filters.priceRange !== 'all' ||
    filters.onlyAvailable ||
    filters.onlyPromo

  return (
    <div className="space-y-5">
      {/* BUSCA + ORDENAÇÃO */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
            placeholder="Buscar produto por nome ou descrição..."
            className="pl-9 pr-8 h-10 text-xs bg-white"
            aria-label="Buscar produtos"
          />
          {filters.search && (
            <button
              onClick={() => patch({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Select value={filters.sort} onValueChange={(v) => patch({ sort: v as SortOption })}>
          <SelectTrigger
            className="w-full sm:w-[190px] h-10 text-xs bg-white"
            aria-label="Ordenar por"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-slate-400" />
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select
            value={filters.storeCategoryId ?? 'all'}
            onValueChange={(v) => patch({ storeCategoryId: v === 'all' ? null : v })}
          >
            <SelectTrigger className="h-9 text-xs" aria-label="Categoria da loja">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Todas as categorias
              </SelectItem>
              {storeCategories.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.priceRange}
            onValueChange={(v) => patch({ priceRange: v as PriceRange })}
          >
            <SelectTrigger className="h-9 text-xs" aria-label="Faixa de preço">
              <SelectValue placeholder="Faixa de preço" />
            </SelectTrigger>
            <SelectContent>
              {PRICE_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-xs">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 sm:justify-end">
            <div className="flex items-center gap-2">
              <Checkbox
                id="f-avail"
                checked={filters.onlyAvailable}
                onCheckedChange={(v) => patch({ onlyAvailable: v === true })}
              />
              <Label htmlFor="f-avail" className="text-xs text-slate-700 cursor-pointer">
                Só disponíveis
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="f-promo"
                checked={filters.onlyPromo}
                onCheckedChange={(v) => patch({ onlyPromo: v === true })}
              />
              <Label
                htmlFor="f-promo"
                className="text-xs text-[#E63239] cursor-pointer font-semibold"
              >
                Só promoções
              </Label>
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>{result.products.length} produto(s) encontrado(s)</span>
            <button
              onClick={() => onFiltersChange({ ...defaultCatalogFilters })}
              className="text-[#1754AE] font-semibold hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* OFERTAS DA LOJA (somente promoções vigentes) */}
      {result.promoCount > 0 && !filters.onlyPromo && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-100 text-[#E63239] flex items-center justify-center">
              <Percent className="w-3.5 h-3.5 font-bold" />
            </div>
            <h3 className="text-sm font-bold text-[#172033]">Ofertas da loja</h3>
            <Badge className="bg-[#E63239] text-white text-[10px] font-bold">
              {result.promoCount} vigente(s)
            </Badge>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {result.products
              .filter((p) => isPromoActive(p))
              .map((p) => {
                const info = getPromoInfo(p)
                return (
                  <button
                    key={p.id}
                    onClick={() => onOpenProduct(p)}
                    className="flex-shrink-0 w-44 bg-white rounded-xl border border-[#E63239]/30 p-3 text-left hover:shadow-md transition space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <Badge className="bg-[#E63239] text-white text-[9px] font-bold">
                        -{info.discountPct}%
                      </Badge>
                      <span className="text-[10px] text-slate-400">{p.unit}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2">{p.name}</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[10px] text-slate-400 line-through">
                        {formatBRL(Number(p.price))}
                      </span>
                      <span className="text-sm font-extrabold text-[#E63239]">
                        {formatBRL(Number(p.promo_price))}
                      </span>
                    </div>
                  </button>
                )
              })}
          </div>
        </div>
      )}

      {/* GRID DE PRODUTOS */}
      {result.products.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-medium text-slate-700">
            {products.length === 0
              ? 'Nenhum produto cadastrado nesta loja ainda.'
              : 'Nenhum produto encontrado com os filtros atuais.'}
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFiltersChange({ ...defaultCatalogFilters })}
              className="text-xs"
            >
              Limpar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {result.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpen={() => onOpenProduct(product)}
              onQuickAdd={() => onQuickAdd(product)}
              qtyInCart={quantityInCart(product.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---- CARD DE PRODUTO ----

interface CardProps {
  product: Product
  onOpen: () => void
  onQuickAdd: () => void
  qtyInCart: number
}

const ProductCard: React.FC<CardProps> = ({ product, onOpen, onQuickAdd, qtyInCart }) => {
  const promoInfo = getPromoInfo(product)
  const promoActive = promoInfo.hasPromo && !promoInfo.expired && !promoInfo.notStarted

  return (
    <Card
      className="border border-slate-200 hover:border-[#1754AE]/40 transition shadow-sm overflow-hidden flex flex-col cursor-pointer group"
      onClick={onOpen}
    >
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {product.is_demo && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-red-50 text-red-700 border-red-300 font-bold"
                >
                  DEMO
                </Badge>
              )}
              {promoActive && (
                <Badge className="bg-[#E63239] text-white text-[10px] font-bold">
                  -{promoInfo.discountPct}%
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
              {getUnitLabel(product.unit, product.custom_unit)}
            </span>
          </div>

          <h3 className="font-bold text-sm text-slate-900 leading-snug group-hover:text-[#1754AE] transition-colors">
            {product.name}
          </h3>

          {product.description && (
            <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>
          )}

          {product.is_regulated && (
            <p className="text-[10px] text-amber-700 bg-amber-50 p-1 rounded font-medium">
              Regulamentado: venda proibida para menores de 18 anos.
            </p>
          )}
        </div>

        {/* Preço e Ação — SEMPRE via util central (getPromoInfo) */}
        <div
          className="pt-3 border-t border-slate-100 flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            {promoActive ? (
              <>
                <p className="text-xs text-slate-400 line-through">
                  {formatBRL(Number(product.price))}
                </p>
                <p className="text-base font-extrabold text-[#E63239]">
                  {formatBRL(Number(product.promo_price))}
                </p>
              </>
            ) : (
              <p className="text-base font-extrabold text-slate-900">
                {formatBRL(Number(product.price))}
              </p>
            )}
          </div>

          {qtyInCart > 0 ? (
            <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1">
              <button
                onClick={onOpen}
                className="w-6 h-6 rounded bg-white text-slate-700 flex items-center justify-center hover:bg-slate-200 transition"
                aria-label="Diminuir quantidade ou editar opções"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs font-bold w-5 text-center">{qtyInCart}</span>
              <button
                onClick={onQuickAdd}
                className="w-6 h-6 rounded bg-[#1754AE] text-white flex items-center justify-center hover:bg-[#12428C] transition"
                aria-label="Adicionar novamente"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={onQuickAdd}
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
}
