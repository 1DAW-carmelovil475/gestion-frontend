// ── Constantes de Supabase ────────────────────────────────────────────────
export const SUPABASE_URL      = 'https://tectctwdrrmlzujakzyq.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlY3RjdHdkcnJtbHp1amFrenlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMTQ5NDQsImV4cCI6MjA4Njg5MDk0NH0.s_IsL2yJKgb33j-8VvvOxEuCzFH4WjFv_s5MqhVBTjI'

// ── Lee la fecha de expiración del JWT ───────────────────────────────────
export function getTokenExp(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 // ms
  } catch { return null }
}

// ── Refresca el access_token usando el refresh_token ─────────────────────
export async function tryRefreshToken() {
  const refreshToken = sessionStorage.getItem('hola_refresh')
  if (!refreshToken) return null
  try {
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
  } catch { return null }
}