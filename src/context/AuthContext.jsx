import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { apiFetch } from '../services/api'

const AuthContext = createContext(null)

const SUPABASE_URL      = 'https://tectctwdrrmlzujakzyq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3RjdHdkcnJtbHp1amFrenlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMTQ5NDQsImV4cCI6MjA4Njg5MDk0NH0.s_IsL2yJKgb33j-8VvvOxEuCzFH4WjFv_s5MqhVBTjI'

// ── Helpers para leer la expiración del JWT ────────────────────────────────
function getTokenExp(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 // en ms
  } catch { return null }
}

// ── Refresca el access_token usando el refresh_token ──────────────────────
async function refreshAccessToken() {
  const refreshToken = sessionStorage.getItem('hola_refresh')
  if (!refreshToken) return null

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!res.ok) return null

  const data = await res.json()
  if (!data.access_token) return null

  sessionStorage.setItem('hola_token', data.access_token)
  if (data.refresh_token) sessionStorage.setItem('hola_refresh', data.refresh_token)
  return data.access_token
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const refreshTimer          = useRef(null)

  // ── Programa el refresco automático ─────────────────────────────────────
  function scheduleRefresh(token) {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    const exp = getTokenExp(token)
    if (!exp) return
    // Refrescar 2 minutos antes de que expire
    const delay = exp - Date.now() - 2 * 60 * 1000
    if (delay <= 0) {
      // Ya está a punto de expirar, refrescar ahora
      doRefresh()
      return
    }
    refreshTimer.current = setTimeout(doRefresh, delay)
  }

  async function doRefresh() {
    const newToken = await refreshAccessToken()
    if (newToken) {
      scheduleRefresh(newToken)
    } else {
      // No se pudo refrescar → logout silencioso
      logout()
    }
  }

  useEffect(() => {
    checkSession()
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [])

  async function checkSession() {
    const token = sessionStorage.getItem('hola_token')
    if (!token) {
      setLoading(false)
      return
    }

    // Si el token ya expiró, intentar refrescarlo antes de usarlo
    const exp = getTokenExp(token)
    if (exp && exp - Date.now() < 60 * 1000) {
      const newToken = await refreshAccessToken()
      if (!newToken) {
        sessionStorage.clear()
        setLoading(false)
        return
      }
      scheduleRefresh(newToken)
    } else {
      scheduleRefresh(token)
    }

    try {
      const userData = await apiFetch('/api/auth/me')
      setUser(userData)
    } catch {
      sessionStorage.clear()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error_description || data.msg || 'Email o contraseña incorrectos.')
    }

    sessionStorage.setItem('hola_token', data.access_token)
    sessionStorage.setItem('hola_refresh', data.refresh_token)
    scheduleRefresh(data.access_token)

    const userData = await apiFetch('/api/auth/me')
    setUser(userData)
    return userData
  }

  function logout() {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
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