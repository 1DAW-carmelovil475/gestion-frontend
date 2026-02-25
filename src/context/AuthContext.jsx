import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { apiFetch } from '../services/api'
import { SUPABASE_URL, SUPABASE_ANON_KEY, getTokenExp, tryRefreshToken } from '../services/auth-helpers'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const refreshTimer          = useRef(null)

  function scheduleRefresh(token) {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    const exp = getTokenExp(token)
    if (!exp) return
    const delay = exp - Date.now() - 2 * 60 * 1000
    if (delay <= 0) { doRefresh(); return }
    refreshTimer.current = setTimeout(doRefresh, delay)
  }

  async function doRefresh() {
    const newToken = await tryRefreshToken()
    if (newToken) {
      scheduleRefresh(newToken)
    } else {
      logout()
    }
  }

  useEffect(() => {
    checkSession()
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current) }
  }, [])

  async function checkSession() {
    const token = sessionStorage.getItem('hola_token')
    if (!token) { setLoading(false); return }

    const exp = getTokenExp(token)
    if (exp && exp - Date.now() < 60 * 1000) {
      const newToken = await tryRefreshToken()
      if (!newToken) { sessionStorage.clear(); setLoading(false); return }
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
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error_description || data.msg || 'Email o contraseña incorrectos.')

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

  function isAdmin() { return user?.rol === 'admin' }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, checkSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}