import { createContext, useContext, useState, useEffect } from 'react'
import { apiFetch } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    const token = sessionStorage.getItem('hola_token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const userData = await apiFetch('/api/auth/me')
      setUser(userData)
    } catch (error) {
      sessionStorage.clear()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    const SUPABASE_URL = 'https://tectctwdrrmlzujakzyq.supabase.co'
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3RjdHdkcnJtbHp1amFrenlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMTQ5NDQsImV4cCI6MjA4Njg5MDk0NH0.s_IsL2yJKgb33j-8VvvOxEuCzFH4WjFv_s5MqhVBTjI'

    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error_description || data.msg || 'Email o contraseña incorrectos.')
    }

    sessionStorage.setItem('hola_token', data.access_token)
    sessionStorage.setItem('hola_refresh', data.refresh_token)

    const userData = await apiFetch('/api/auth/me')
    setUser(userData)
    
    return userData
  }

  function logout() {
    sessionStorage.clear()
    setUser(null)
  }

  function isAdmin() {
    return user?.rol === 'admin'
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, checkSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
