import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { UserProfile, UserRole } from '@/types'

interface AuthContextType {
  user: UserProfile | null
  token: string | null
  isLoading: boolean
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isAdmin: boolean
  isMerchant: boolean
  isCustomer: boolean
  isDelivery: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const syncAuth = () => {
    if (pb.authStore.isValid && pb.authStore.model) {
      const model = pb.authStore.model
      setUser({
        id: model.id,
        email: model.email,
        name: model.name || model.email.split('@')[0],
        phone: model.phone || '',
        role: (model.role as UserRole) || 'customer',
        store_id: model.store_id || '',
        avatar: model.avatar || '',
      })
      setToken(pb.authStore.token)
    } else {
      setUser(null)
      setToken(null)
    }
  }

  useEffect(() => {
    syncAuth()
    setIsLoading(false)

    const unsubscribe = pb.authStore.onChange(() => {
      syncAuth()
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, pass)
      const model = authData.record
      setUser({
        id: model.id,
        email: model.email,
        name: model.name || model.email.split('@')[0],
        phone: model.phone || '',
        role: (model.role as UserRole) || 'customer',
        store_id: model.store_id || '',
        avatar: model.avatar || '',
      })
      setToken(authData.token)
      return { success: true }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Falha ao autenticar. Verifique email e senha.',
      }
    }
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setToken(null)
  }

  const role = user?.role

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAdmin: role === 'admin',
        isMerchant: role === 'merchant',
        isCustomer: role === 'customer' || !role,
        isDelivery: role === 'delivery',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
