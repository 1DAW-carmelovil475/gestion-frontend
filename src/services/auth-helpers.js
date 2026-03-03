export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function getTokenExp(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000
  } catch {
    return null
  }
}

export async function tryRefreshToken() {
  const refreshToken = sessionStorage.getItem('hola_refresh')
  if (!refreshToken) return null

  try {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    )

    if (!res.ok) return null

    const data = await res.json()
    if (!data.access_token) return null

    sessionStorage.setItem('hola_token', data.access_token)
    if (data.refresh_token)
      sessionStorage.setItem('hola_refresh', data.refresh_token)

    return data.access_token
  } catch {
    return null
  }
}