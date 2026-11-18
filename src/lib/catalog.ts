/**
 * Utilitários de catálogo Borali v0.2
 * - Promoções com período (ativas/expiradas) e % de desconto
 * - Unidades de medida (padrão + personalizadas)
 * - Formatação de preços
 */

export const UNITS: { value: string; label: string; fractional: boolean }[] = [
  { value: 'un', label: 'Unidade', fractional: false },
  { value: 'kg', label: 'Quilograma (kg)', fractional: true },
  { value: 'g', label: 'Grama (g)', fractional: true },
  { value: 'l', label: 'Litro (L)', fractional: true },
  { value: 'ml', label: 'Mililitro (ml)', fractional: true },
  { value: 'pct', label: 'Pacote', fractional: false },
  { value: 'cx', label: 'Caixa', fractional: false },
  { value: 'fardo', label: 'Fardo', fractional: false },
  { value: 'duzia', label: 'Dúzia', fractional: false },
  { value: 'porcao', label: 'Porção', fractional: false },
  { value: 'garrafa', label: 'Garrafa', fractional: false },
  { value: 'lata', label: 'Lata', fractional: false },
  { value: 'bandeja', label: 'Bandeja', fractional: false },
]

export function getUnitLabel(unit?: string, customUnit?: string): string {
  if (customUnit) return customUnit
  const found = UNITS.find((u) => u.value === unit)
  return found ? found.label : unit || 'Unidade'
}

export function isUnitFractional(unit?: string, allowFractional?: boolean): boolean {
  const found = UNITS.find((u) => u.value === unit)
  return !!allowFractional || !!found?.fractional
}

export interface ProductPromoInfo {
  hasPromo: boolean
  expired: boolean
  notStarted: boolean
  discountPct: number
}

/**
 * Calcula o estado da promoção de um produto.
 * Promoção só é válida se promo_price > 0 e (opcionalmente) dentro do período.
 */
export type PromoProductRef = {
  price?: number
  promo_price?: number | null
  promo_starts_at?: string | number | null
  promo_ends_at?: string | number | null
}

/**
 * Estado da promoção de um produto — ÚNICA fonte de verdade para exibir preço.
 * Uma promoção só é considerada vigente quando:
 * - promo_price existe e é MENOR que o preço normal;
 * - a data atual está dentro do período (promo_starts_at / promo_ends_at, se informados).
 * Os campos de período aceitam timestamp unix (segundos, como gravado pela migração 0005),
 * data ISO ou "yyyy-mm-dd".
 */
export function getPromoInfo(product: PromoProductRef, now: Date = new Date()): ProductPromoInfo {
  const price = Number(product.price) || 0
  const promo = Number(product.promo_price) || 0
  if (promo <= 0 || promo >= price) {
    return { hasPromo: false, expired: false, notStarted: false, discountPct: 0 }
  }
  const toDate = (v?: string | number | null): Date | null => {
    if (v === null || v === undefined || v === '') return null
    if (typeof v === 'number') return new Date(v < 1e12 ? v * 1000 : v)
    const asNum = Number(v)
    if (!Number.isNaN(asNum) && v !== '' && /^-?\d+(\.\d+)?$/.test(String(v).trim())) {
      return new Date(asNum < 1e12 ? asNum * 1000 : asNum)
    }
    const parsed = new Date(v)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const start = toDate(product.promo_starts_at)
  const end = toDate(product.promo_ends_at)
  const notStarted = !!start && start.getTime() > now.getTime()
  // fim vigora durante todo o último dia: comparar com o fim do dia quando só data
  const endTime = end
    ? end.getHours() === 0 && end.getMinutes() === 0
      ? end.getTime() + 86399999
      : end.getTime()
    : 0
  const expired = !!end && endTime < now.getTime()
  const discountPct = Math.round(((price - promo) / price) * 100)
  return { hasPromo: true, expired, notStarted, discountPct }
}

/** Promoção vigente agora (dentro do período e preço promocional menor) */
export function isPromoActive(product: PromoProductRef, now: Date = new Date()): boolean {
  const info = getPromoInfo(product, now)
  return info.hasPromo && !info.expired && !info.notStarted
}

/** Preço efetivamente vigente (promocional se promoção ativa) */
export function getEffectivePrice(product: PromoProductRef, now: Date = new Date()): number {
  return isPromoActive(product, now) ? Number(product.promo_price) : Number(product.price) || 0
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ---- Variações e complementos (JSON em products) ----

export interface Variation {
  key: string
  name: string
  price: number
  stock: number
  unit?: string
  barcode?: string
  photo_url?: string
  is_available?: boolean
}

export interface ComplementOption {
  id: string
  name: string
  price: number
  available: boolean
}

export interface ComplementGroup {
  id: string
  name: string
  required: boolean
  min: number
  max: number
  options: ComplementOption[]
}

export function parseJSON<T>(value: unknown, fallback: T): T {
  if (!value) return fallback
  if (typeof value === 'object') return value as T
  try {
    return JSON.parse(value as string) as T
  } catch {
    return fallback
  }
}

export function getProductVariations(product: { variations?: unknown }): Variation[] {
  return parseJSON<Variation[]>(product.variations, [])
}

export function getProductComplements(product: { complements?: unknown }): ComplementGroup[] {
  return parseJSON<ComplementGroup[]>(product.complements, [])
}
