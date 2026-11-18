import React, { createContext, useContext, useState, useEffect } from 'react'
import { Product, Store } from '@/types'
import { getEffectivePrice } from '@/lib/catalog'

export interface CartItem {
  product: Product
  quantity: number
}

interface CartContextType {
  cartStore: Store | null
  items: CartItem[]
  addItem: (product: Product, store: Store, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
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
          setCartStore(parsed.store)
          setItems(parsed.items)
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

  const addItem = (product: Product, store: Store, quantity = 1) => {
    // Regra: carrinho pertence a UM ÚNICO estabelecimento por pedido
    if (cartStore && cartStore.id !== store.id) {
      const confirmReplace = window.confirm(
        `Seu carrinho já contém itens de "${cartStore.name}". Deseja esvaziar o carrinho para adicionar produtos de "${store.name}"?`,
      )
      if (!confirmReplace) return
      setItems([{ product, quantity }])
      setCartStore(store)
      return
    }

    if (!cartStore) {
      setCartStore(store)
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i,
        )
      }
      return [...prev, { product, quantity }]
    })
  }

  const removeItem = (productId: string) => {
    setItems((prev) => {
      const updated = prev.filter((i) => i.product.id !== productId)
      if (updated.length === 0) {
        setCartStore(null)
      }
      return updated
    })
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    setItems((prev) => prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i)))
  }

  const clearCart = () => {
    setItems([])
    setCartStore(null)
  }

  const totalCount = items.reduce((acc, i) => acc + i.quantity, 0)
  const totalAmount = items.reduce((acc, i) => {
    return acc + getEffectivePrice(i.product) * i.quantity
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

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
