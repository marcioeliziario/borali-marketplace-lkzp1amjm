/**
 * Catálogo público da loja virtual: busca, filtros e ordenação.
 * Regra de preço: SEMPRE via util central de promoção (src/lib/catalog.ts) —
 * `getEffectivePrice` / `isPromoActive` / `getPromoInfo`. Nunca duplicar aqui.
 */

import {
  getEffectivePrice,
  isPromoActive,
  getPromoInfo,
  formatBRL,
  parseJSON,
  getProductVariations,
  getProductComplements,
  type ProductPromoInfo,
  type Variation,
  type ComplementGroup,
} from '@/lib/catalog'
import type { Product, StoreCategory } from '@/types'

export type PriceRange = 'all' | '0-10' | '10-25' | '25-50' | '50+'
export type SortOption = 'name' | 'price_asc' | 'price_desc'

export interface CatalogFilters {
  search: string
  storeCategoryId: string | null
  priceRange: PriceRange
  onlyAvailable: boolean
  onlyPromo: boolean
  sort: SortOption
}

export const defaultCatalogFilters: CatalogFilters = {
  search: '',
  storeCategoryId: null,
  priceRange: 'all',
  onlyAvailable: false,
  onlyPromo: false,
  sort: 'name',
}

export interface ProductFilterResult {
  products: Product[]
  promoCount: number
  minPrice: number
  maxPrice: number
}

const PRICE_RANGES: Record<Exclude<PriceRange, 'all'>, { min: number; max: number }> = {
  '0-10': { min: 0, max: 10 },
  '10-25': { min: 10, max: 25 },
  '25-50': { min: 25, max: 50 },
  '50+': { min: 50, max: Infinity },
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function filterAndSortProducts(
  products: Product[],
  filters: CatalogFilters,
): ProductFilterResult {
  const term = normalize(filters.search.trim())
  const range = filters.priceRange === 'all' ? null : PRICE_RANGES[filters.priceRange as PriceRange]

  const list = products.filter((p) => {
    if (p.status !== 'active') return false

    // categoria interna da loja
    if (filters.storeCategoryId && p.store_category_id !== filters.storeCategoryId) return false

    // disponibilidade (somente itens disponíveis; track_stock=false conta como disponível)
    if (filters.onlyAvailable) {
      const tracked = p.track_stock !== false
      if (tracked && (Number(p.stock) || 0) <= 0) return false
      if (!p.is_available) return false
    }

    // somente promoções vigentes — via util central (período + preço)
    if (filters.onlyPromo && !isPromoActive(p)) return false

    // faixa de preço pelo preço EFETIVO (promocional quando vigente)
    const eff = getEffectivePrice(p)
    if (range && (eff < range.min || eff >= range.max)) return false

    // busca por nome e descrição
    if (term) {
      const haystack = normalize(
        `${p.name} ${p.description ?? ''} ${p.description_full ?? ''} ${p.brand ?? ''}`,
      )
      if (!haystack.includes(term)) return false
    }
    return true
  })

  const sorted = [...list].sort((a, b) => {
    switch (filters.sort) {
      case 'price_asc':
        return getEffectivePrice(a) - getEffectivePrice(b)
      case 'price_desc':
        return getEffectivePrice(b) - getEffectivePrice(a)
      case 'name':
      default:
        return a.name.localeCompare(b.name, 'pt-BR')
    }
  })

  const promos = products.filter((p) => p.status === 'active' && isPromoActive(p))
  const prices = products
    .filter((p) => p.status === 'active')
    .map((p) => getEffectivePrice(p))
    .filter((v) => v > 0)

  return {
    products: sorted,
    promoCount: promos.length,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
  }
}

export function groupProductsByStoreCategory(
  products: Product[],
  storeCategories: StoreCategory[],
): Array<{ category: StoreCategory | null; products: Product[] }> {
  const active = storeCategories.filter((c) => c.is_active)
  const groups: Array<{ category: StoreCategory | null; products: Product[] }> = []
  const used = new Set<string>()

  for (const cat of active) {
    const items = products.filter((p) => p.store_category_id === cat.id)
    if (items.length > 0) {
      groups.push({ category: cat, products: items })
      items.forEach((p) => used.add(p.id))
    }
  }
  const orphans = products.filter((p) => !used.has(p.id))
  if (orphans.length > 0) groups.push({ category: null, products: orphans })
  return groups
}

// ---- Detalhes do produto: variações e complementos selecionáveis ----

export interface SelectedOptions {
  [groupId: string]: string[]
}

export function unitPriceFor(
  product: Product,
  selectedVariationKey: string | null,
  selected: SelectedOptions,
): number {
  let base = getEffectivePrice(product)
  if (selectedVariationKey) {
    const variation = getProductVariations(product).find((v) => v.key === selectedVariationKey)
    if (variation && variation.price > 0) base = variation.price
  }
  const extras = Object.values(selected)
    .flat()
    .reduce((sum, optionId) => {
      const group = getProductComplements(product).find((g) =>
        g.options.some((o) => o.id === optionId),
      )
      const option = group?.options.find((o) => o.id === optionId)
      return sum + (option?.price ?? 0)
    }, 0)
  return base + extras
}

export function countSelectedInGroup(selected: SelectedOptions, groupId: string): number {
  return (selected[groupId] ?? []).length
}

/** Variações visíveis ao consumidor (sem custo, código administrativo ou estoque exato) */
export function consumerVariations(product: Product): Variation[] {
  return getProductVariations(product).map((v) => ({
    ...v,
    stock: 0,
    barcode: undefined,
    unit: v.unit,
  }))
}

export function consumerComplements(product: Product): ComplementGroup[] {
  return getProductComplements(product).map((g) => ({
    ...g,
    options: g.options.filter((o) => o.available).map((o) => ({ ...o })),
  }))
}

export interface PromoBadgeInfo {
  active: boolean
  discountPct: number
  label: string
}

export function promoBadgeInfo(product: Product | PromoProductRefLike): PromoBadgeInfo {
  const info: ProductPromoInfo = getPromoInfo(product)
  if (!isPromoActive(product)) return { active: false, discountPct: 0, label: '' }
  return { active: true, discountPct: info.discountPct, label: `-${info.discountPct}%` }
}

type PromoProductRefLike = Parameters<typeof getPromoInfo>[0]

export { formatBRL, parseJSON }
