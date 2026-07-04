'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'SUPER_ADMIN'
  avatar?: string | null
  isActive: boolean
  createdAt: string
}

interface RestaurantSettings {
  id: string
  name: string
  currency: string
  timezone: string
  address?: string | null
  phone?: string | null
  email?: string | null
  gstin?: string | null
  logo?: string | null
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  settings: RestaurantSettings | null
  refetch: () => Promise<void>
  refetchSettings: () => Promise<void>
  logout: () => Promise<void>
  isSuperAdmin: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  settings: null,
  refetch: async () => {},
  refetchSettings: async () => {},
  logout: async () => {},
  isSuperAdmin: false,
  isAdmin: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState<RestaurantSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.data)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data.data)
      }
    } catch {
      // ignore
    }
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setSettings(null)
    window.location.href = '/admin/login'
  }, [])

  useEffect(() => {
    fetchUser()
    fetchSettings()
  }, [fetchUser, fetchSettings])

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  return (
    <AuthContext.Provider value={{
      user, loading, settings,
      refetch: fetchUser,
      refetchSettings: fetchSettings,
      logout,
      isSuperAdmin,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
