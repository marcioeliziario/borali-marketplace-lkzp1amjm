import type { Variation, ComplementGroup } from '@/lib/catalog'

export type UserRole = 'admin' | 'merchant' | 'delivery' | 'customer'

export interface City {
  id: string
  name: string
  state: string
  slug: string
  is_active: boolean
  is_pilot?: boolean
  created?: string
  updated?: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string
  display_order?: number
  is_active: boolean
  created?: string
  updated?: string
}

export interface StoreOpeningHours {
  seg?: string
  ter?: string
  qua?: string
  qui?: string
  sex?: string
  sab?: string
  dom?: string
  [key: string]: string | undefined
}

export interface Store {
  id: string
  name: string
  trade_name?: string
  slug: string
  city_id: string
  category_ids?: string[]
  description?: string
  logo_url?: string
  banner_url?: string
  phone?: string
  whatsapp?: string
  address_street?: string
  address_number?: string
  address_neighborhood?: string
  address_reference?: string
  opening_hours?: StoreOpeningHours | string
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  is_active: boolean
  is_featured?: boolean
  is_demo?: boolean
  delivery_type?: 'fixed' | 'neighborhood' | 'free' | 'pickup_only'
  delivery_fee?: number
  min_order_value?: number
  estimated_time?: string
  accepts_pix?: boolean
  accepts_cash?: boolean
  accepts_card_on_delivery?: boolean
  created?: string
  updated?: string
  // Relações expandidas
  expand?: {
    city_id?: City
    category_ids?: Category[]
  }
}

export type ProductUnit =
  | 'un'
  | 'kg'
  | 'g'
  | 'l'
  | 'ml'
  | 'cx'
  | 'pct'
  | 'fardo'
  | 'duzia'
  | 'porcao'
  | 'garrafa'
  | 'lata'
  | 'bandeja'

/** Categoria interna configurada pelo próprio estabelecimento */
export interface StoreCategory {
  id: string
  store_id: string
  name: string
  display_order?: number
  is_active: boolean
  created?: string
  updated?: string
}

/** Movimentação de estoque (histórico com motivo, usuário e data) */
export interface StockMovement {
  id: string
  store_id: string
  product_id: string
  variation_key?: string
  delta: number
  result_stock: number
  reason: string
  user_email?: string
  created?: string
}

export interface Product {
  id: string
  store_id: string
  category_id?: string
  /** Categoria interna do estabelecimento */
  store_category_id?: string
  name: string
  description?: string
  description_full?: string
  image_url?: string
  photos?: string[]
  main_photo?: string
  brand?: string
  subcategory?: string
  internal_code?: string
  unit: ProductUnit
  custom_unit?: string
  price: number
  promo_price?: number
  promo_starts_at?: string
  promo_ends_at?: string
  stock?: number
  min_stock?: number
  track_stock?: boolean
  allow_fractional?: boolean
  estimated_weight?: number
  final_weight?: number
  is_available: boolean
  barcode?: string
  returnable?: boolean
  sale_locked?: boolean
  expires_at?: string
  lot?: string
  is_demo?: boolean
  is_regulated?: boolean
  variations?: Variation[] | string
  complements?: ComplementGroup[] | string
  status: 'active' | 'inactive' | 'draft' | 'archived'
  created?: string
  updated?: string
  expand?: {
    store_id?: Store
    category_id?: Category
    store_category_id?: StoreCategory
  }
}

export type OrderStatus =
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

export interface OrderItem {
  product_id: string
  name: string
  unit_price: number
  quantity: number
  total_price: number
  unit?: string
  notes?: string
}

export interface Order {
  id: string
  order_number: string
  store_id: string
  customer_id?: string
  customer_name: string
  customer_phone: string
  delivery_address: {
    street: string
    number: string
    neighborhood: string
    complement?: string
    reference?: string
  }
  payment_method: 'pix' | 'cash' | 'card_on_delivery'
  subtotal: number
  delivery_fee: number
  total: number
  items: OrderItem[]
  status: OrderStatus
  status_history?: Array<{ status: OrderStatus; timestamp: string; note?: string }>
  notes?: string
  created?: string
  updated?: string
  expand?: {
    store_id?: Store
  }
}

export interface AuditLog {
  id: string
  user_id?: string
  user_email?: string
  user_role?: string
  action: string
  resource: string
  resource_id?: string
  details?: any
  created?: string
}

export interface UserProfile {
  id: string
  email: string
  name?: string
  phone?: string
  role: UserRole
  store_id?: string
  avatar?: string
}
