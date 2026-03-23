const API_URL = import.meta.env.VITE_API_URL

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
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

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
