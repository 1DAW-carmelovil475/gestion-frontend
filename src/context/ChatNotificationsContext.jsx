/**
 * ChatNotificationsContext — VERSIÓN COMPLETA
 * ─────────────────────────────────────────────
 * FIX: lastSeen ahora se guarda en localStorage (no sessionStorage)
 *      para que sobreviva al cierre del navegador/pestaña.
 */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getChatCanales, getChatMensajes } from '../services/api'

const Ctx = createContext(null)

// ── Helpers para lastSeen — ahora en localStorage ─────────────────────────
function loadLastSeen(userId) {
  try {
    const raw = localStorage.getItem(`chat_seen_${userId}`)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveLastSeen(userId, seen) {
  try { localStorage.setItem(`chat_seen_${userId}`, JSON.stringify(seen)) } catch {}
}

// ── Helpers para prefs ────────────────────────────────────────────────────
function loadPrefs(userId) {
  try {
    const raw = localStorage.getItem(`chat_prefs_${userId}`)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function savePrefsStorage(userId, prefs) {
  try { localStorage.setItem(`chat_prefs_${userId}`, JSON.stringify(prefs)) } catch {}
}

export function ChatNotificationsProvider({ children }) {
  const { user } = useAuth()

  const [dmUnread,        setDmUnread]        = useState({})
  const [channelUnread,   setChannelUnread]   = useState({})
  const [channelActivity, setChannelActivity] = useState({})
  const [activeCanalId,   _setActiveCanalId]  = useState(null)
  const [prefs,           _setPrefs]          = useState({})

  const lastSeenRef      = useRef({})
  const canalesRef       = useRef([])
  const activeCanalIdRef = useRef(null)
  const prefsRef         = useRef({})
  const mountedRef       = useRef(true)
  const tickRef          = useRef(0)
  const pollingTimer     = useRef(null)

  // ── setter síncrono para activeCanalId ───────────────────────────────────
  const setActiveCanalId = useCallback((id) => {
    activeCanalIdRef.current = id
    _setActiveCanalId(id)
  }, [])

  // ── Cargar lastSeen (localStorage) y prefs al iniciar sesión ─────────────
  useEffect(() => {
    mountedRef.current = true
    if (!user) return

    // FIX: usar localStorage en lugar de sessionStorage
    lastSeenRef.current = loadLastSeen(user.id)

    const p = loadPrefs(user.id)
    prefsRef.current = p
    _setPrefs(p)

    return () => { mountedRef.current = false }
  }, [user?.id])

  function saveSeen() {
    if (!user) return
    // FIX: guardar en localStorage
    saveLastSeen(user.id, lastSeenRef.current)
  }

  // ── updatePref ────────────────────────────────────────────────────────────
  const updatePref = useCallback((canalId, changes) => {
    if (!user || !canalId) return
    const next = {
      ...prefsRef.current,
      [canalId]: { ...(prefsRef.current[canalId] || {}), ...changes }
    }
    prefsRef.current = next
    _setPrefs({ ...next })
    savePrefsStorage(user.id, next)
  }, [user?.id]) // eslint-disable-line

  // ── markRead ──────────────────────────────────────────────────────────────
  const markRead = useCallback((canalId, lastMsgId) => {
    if (!canalId || !lastMsgId) return
    lastSeenRef.current[canalId] = lastMsgId
    saveSeen()
    setDmUnread(prev      => ({ ...prev, [canalId]: 0 }))
    setChannelUnread(prev => ({ ...prev, [canalId]: 0 }))
    setChannelActivity(prev => ({ ...prev, [canalId]: false }))
  }, [user?.id]) // eslint-disable-line

  // ── Polling ───────────────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    if (!user || !mountedRef.current) return
    try {
      tickRef.current++
      if (!canalesRef.current.length || tickRef.current % 5 === 0) {
        const data = await getChatCanales().catch(() => null)
        if (data) canalesRef.current = data
      }

      const canales = canalesRef.current
      if (!canales.length) return

      const newDm  = {}
      const newCh  = {}
      const newAct = {}

      await Promise.allSettled(canales.map(async canal => {
        try {
          const msgs = await getChatMensajes(canal.id, 20)

          if (!msgs?.length) {
            if (canal.tipo === 'directo') newDm[canal.id] = 0
            else { newCh[canal.id] = 0; newAct[canal.id] = false }
            return
          }

          const lastMsg         = msgs[msgs.length - 1]
          const lastSeenId      = lastSeenRef.current[canal.id]
          const currentActiveId = activeCanalIdRef.current
          const isMuted         = prefsRef.current[canal.id]?.muted

          // Canal abierto ahora mismo → 0 y actualizar lastSeen
          if (currentActiveId === canal.id) {
            lastSeenRef.current[canal.id] = lastMsg.id
            saveSeen()
            if (canal.tipo === 'directo') newDm[canal.id] = 0
            else { newCh[canal.id] = 0; newAct[canal.id] = false }
            return
          }

          // Silenciado → 0
          if (isMuted) {
            if (canal.tipo === 'directo') newDm[canal.id] = 0
            else { newCh[canal.id] = 0; newAct[canal.id] = false }
            return
          }

          // Calcular no leídos
          let unread = 0
          if (!lastSeenId) {
            unread = msgs.filter(m => m.user_id !== user.id).length
          } else if (lastSeenId === lastMsg.id) {
            unread = 0
          } else {
            const idx = msgs.findIndex(m => m.id === lastSeenId)
            unread = idx >= 0
              ? msgs.slice(idx + 1).filter(m => m.user_id !== user.id).length
              : msgs.filter(m => m.user_id !== user.id).length
          }

          if (canal.tipo === 'directo') {
            newDm[canal.id] = Math.min(unread, 99)
          } else {
            newCh[canal.id]  = Math.min(unread, 99)
            newAct[canal.id] = unread > 0
          }

        } catch (err) {
          console.error(`[Poll] Error canal ${canal.id}:`, err)
        }
      }))

      if (!mountedRef.current) return
      setDmUnread(newDm)
      setChannelUnread(newCh)
      setChannelActivity(prev => ({ ...prev, ...newAct }))

    } catch (err) {
      console.error('[Poll] Error general:', err)
    }
  }, [user?.id]) // eslint-disable-line

  useEffect(() => {
    if (!user) return
    const t0 = setTimeout(poll, 1200)
    pollingTimer.current = setInterval(poll, 8000)
    return () => { clearTimeout(t0); clearInterval(pollingTimer.current) }
  }, [user?.id, poll])

  const totalDmUnread = Object.values(dmUnread).reduce((s, v) => s + v, 0)
  const totalUnread   = totalDmUnread + Object.values(channelUnread).reduce((s, v) => s + v, 0)

  return (
    <Ctx.Provider value={{
      dmUnread, channelUnread, channelActivity,
      totalDmUnread, totalUnread,
      markRead, activeCanalId, setActiveCanalId,
      prefs, updatePref,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useChatNotifications() {
  const ctx = useContext(Ctx)
  if (!ctx) return {
    dmUnread: {}, channelUnread: {}, channelActivity: {},
    totalDmUnread: 0, totalUnread: 0,
    markRead: () => {}, activeCanalId: null, setActiveCanalId: () => {},
    prefs: {}, updatePref: () => {},
  }
  return ctx
}