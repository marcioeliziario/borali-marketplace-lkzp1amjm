import React, { createContext, useContext, useState, useEffect } from 'react'
import { Product, Store } from '@/types'
import { getEffectivePrice, getProductVariations, getProductComplements } from '@/lib/catalog'
import type { SelectedOptions } from '@/lib/publicCatalog'

export interface CartItemSelection {
  variationKey?: string | null
  variationName?: string
  variationUnitPrice?: number
  complementOptions?: string[]
  complementNames?: string[]
  complementUnitExtra?: number
}

export interface CartItem {
  /** id único da linha: product.id + variação + complementos */
  lineId: string
  product: Product
  quantity: number
  selection?: CartItemSelection
}

interface CartContextType {
  cartStore: Store | null
  items: CartItem[]
  addItem: (
    product: Product,
    store: Store,
    quantity?: number,
    selectedVariationKey?: string | null,
    selectedComplementOptions?: Record<string, string[]>,
  ) => void
  removeItem: (lineId: string) => void
  updateQuantity: (lineId: string, quantity: number) => void
  clearCart: () => void
  totalCount: number
  totalAmount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartStore, setCartStore] = useState<Store | null>(null)
  const [items, setItems] = useState<CartItem[]>([])

  // Carregar do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('borali_cart')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.store && Array.isArray(parsed?.items)) {
          // Sanitiza itens de versões antigas (sem lineId/seleção)
          const safe: CartItem[] = parsed.items
            .filter((i: CartItem) => i?.product?.id)
            .map((i: CartItem) => ({
              lineId: i.lineId ?? i.product.id,
              product: i.product,
              quantity: Math.max(1, Number(i.quantity) || 1),
              selection: i.selection,
            }))
          setCartStore(parsed.store)
          setItems(safe)
        }
      }
    } catch (e) {
      console.warn('Falha ao restaurar carrinho:', e)
    }
  }, [])

  // Persistir no localStorage
  useEffect(() => {
    try {
      localStorage.setItem('borali_cart', JSON.stringify({ store: cartStore, items }))
    } catch (e) {
      console.warn('Falha ao persistir carrinho:', e)
    }
  }, [cartStore, items])

  const addItem = (
    product: Product,
    store: Store,
    quantity = 1,
    selectedVariationKey?: string | null,
    selectedComplementOptions?: Record<string, string[]>,
  ) => {
    // Regra: carrinho pertence a UM ÚNICO estabelecimento por pedido
    if (cartStore && cartStore.id !== store.id) {
      const confirmReplace = window.confirm(
        `Seu carrinho já contém itens de "${cartStore.name}". Deseja esvaziar o carrinho para adicionar produtos de "${store.name}"?`,
      )
      if (!confirmReplace) return
      setCartStore(store)
      setItems(buildItems([{ product, quantity, selectedVariationKey, selectedComplementOptions }]))
      return
    }

    if (!cartStore) {
      setCartStore(store)
    }

    setItems((prev) => {
      const pending: PendingAdd[] = [
        ...prev.map((i) => ({
          product: i.product,
          quantity: i.quantity,
          selectedVariationKey: i.selection?.variationKey ?? null,
          selectedComplementOptions: complementSelectionMap(i.product, i.selection),
        })),
        { product, quantity, selectedVariationKey, selectedComplementOptions },
      ]
      return buildItems(pending)
    })
  }

  const removeItem = (lineId: string) => {
    setItems((prev) => {
      const updated = prev.filter((i) => i.lineId !== lineId)
      if (updated.length === 0) {
        setCartStore(null)
      }
      return updated
    })
  }

  const updateQuantity = (lineId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(lineId)
      return
    }
    setItems((prev) => prev.map((i) => (i.lineId === lineId ? { ...i, quantity } : i)))
  }

  const clearCart = () => {
    setItems([])
    setCartStore(null)
  }

  const totalCount = items.reduce((acc, i) => acc + i.quantity, 0)
  const totalAmount = items.reduce((acc, i) => {
    return acc + lineUnitPrice(i) * i.quantity
  }, 0)

  return (
    <CartContext.Provider
      value={{
        cartStore,
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalCount,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

/** Preço unitário REAL da linha (preço vigente + variação + complementos) */
export function lineUnitPrice(item: CartItem): number {
  const sel = item.selection
  if (!sel) return getEffectivePrice(item.product)
  return (
    (sel.variationUnitPrice ?? getEffectivePrice(item.product)) + (sel.complementUnitExtra ?? 0)
  )
}

interface PendingAdd {
  product: Product
  quantity: number
  selectedVariationKey?: string | null
  selectedComplementOptions?: Record<string, string[]>
}

/**
 * Agrupa adições por (produto + variação + complementos) e calcula nomes/valores.
 * Regra de preço: SEMPRE via util central (getEffectivePrice) — nunca duplicada aqui.
 */
/** Converte a seleção persistida de uma linha de volta para o mapa grupo→opções */
function complementSelectionMap(
  product: Product,
  sel?: CartItemSelection,
): Record<string, string[]> | undefined {
  if (!sel?.complementOptions?.length) return undefined
  const groups = getProductComplements(product)
  const map: Record<string, string[]> = {}
  for (const optionId of sel.complementOptions) {
    const group = groups.find((g) => g.options.some((o) => o.id === optionId))
    if (!group) continue
    map[group.id] = [...(map[group.id] ?? []), optionId]
  }
  return map
}

function buildItems(pending: PendingAdd[]): CartItem[] {
  const items: CartItem[] = []
  for (const p of pending) {
    const selection: CartItemSelection = {
      variationKey: p.selectedVariationKey ?? null,
      variationName: undefined,
      variationUnitPrice: undefined,
      complementOptions: [],
      complementNames: [],
      complementUnitExtra: 0,
    }

    const variations = getProductVariations(p.product)
    if (p.selectedVariationKey) {
      const variation = variations.find((v) => v.key === p.selectedVariationKey)
      if (variation) {
        selection.variationName = variation.name
        selection.variationUnitPrice = variation.price > 0 ? variation.price : undefined
      }
    }

    if (p.selectedComplementOptions) {
      const names: string[] = []
      let extra = 0
      const groups = getProductComplements(p.product)
      for (const groupId of Object.keys(p.selectedComplementOptions)) {
        const group = groups.find((g) => g.id === groupId)
        if (!group) continue
        for (const optionId of p.selectedComplementOptions[groupId]) {
          const option = group.options.find((o) => o.id === optionId)
          if (!option) continue
          names.push(option.name)
          extra += option.price
          selection.complementOptions?.push(optionId)
        }
      }
      selection.complementNames = names
      selection.complementUnitExtra = extra
    }

    const hasSelection = !!selection.variationKey || (selection.complementOptions?.length ?? 0) > 0
    const lineId = hasSelection
      ? `${p.product.id}::${selection.variationKey ?? '-'}::${(selection.complementOptions ?? []).join(',')}`
      : p.product.id

    const existing = items.find((i) => i.lineId === lineId)
    if (existing) {
      existing.quantity += p.quantity
    } else {
      items.push({
        lineId,
        product: p.product,
        quantity: p.quantity,
        selection: hasSelection ? selection : undefined,
      })
    }
  }
  return items
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
