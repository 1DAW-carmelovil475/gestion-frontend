import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getChatCanales, getChatMensajes } from '../services/api'

const Ctx = createContext(null)

// ─────────────────────────────────────────────────────────────────────────────
// Persistencia localStorage
// ─────────────────────────────────────────────────────────────────────────────
function loadLS(key, fallback = {}) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback } catch { return fallback }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Worker
// ─────────────────────────────────────────────────────────────────────────────
let swReg = null

async function getSW() {
  if (!('serviceWorker' in navigator)) return null
  if (swReg?.active) return swReg
  try {
    const existing = await navigator.serviceWorker.getRegistration('/sw-chat.js')
    if (existing) {
      swReg = existing
      if (!existing.active) await waitForActivation(existing.installing || existing.waiting)
      return swReg
    }
    const reg = await navigator.serviceWorker.register('/sw-chat.js', { scope: '/' })
    swReg = reg
    if (!reg.active) await waitForActivation(reg.installing || reg.waiting)
    return swReg
  } catch (e) {
    console.warn('[SW] Error al registrar:', e)
    return null
  }
}

function waitForActivation(sw) {
  if (!sw) return Promise.resolve()
  return new Promise(resolve => {
    if (sw.state === 'activated') { resolve(); return }
    function h() { if (sw.state === 'activated') { sw.removeEventListener('statechange', h); resolve() } }
    sw.addEventListener('statechange', h)
    setTimeout(resolve, 5000)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Permisos
// ─────────────────────────────────────────────────────────────────────────────
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') { await getSW(); return 'granted' }
  if (Notification.permission === 'denied') return 'denied'
  try {
    // Algunos navegadores (Edge, Safari) usan callback en vez de promesa
    let result
    if (typeof Notification.requestPermission === 'function') {
      const prom = Notification.requestPermission()
      // Si devuelve promesa la usamos; si es callback-based prom será undefined
      if (prom && typeof prom.then === 'function') {
        result = await prom
      } else {
        // Fallback callback
        result = await new Promise(resolve => {
          Notification.requestPermission(resolve)
        })
      }
    } else {
      return 'unsupported'
    }
    if (result === 'granted') await getSW()
    return result
  } catch {
    // Devolver el estado real aunque haya fallado la petición
    return Notification.permission || 'denied'
  }
}

export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

// ─────────────────────────────────────────────────────────────────────────────
// Enviar notificación — simple y directo
// new Notification() funciona en localhost (HTTP) y en HTTPS
// En HTTPS también intentamos via SW para que funcione con Chrome cerrado
// ─────────────────────────────────────────────────────────────────────────────
function sendNotif(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  // En HTTPS intentar via SW registration (background notifications)
  if (location.protocol === 'https:') {
    getSW().then(reg => {
      if (reg) {
        reg.showNotification(title, {
          body, tag,
          icon: '/img/logoHola.png',
          badge: '/img/logoHola.png',
          renotify: true,
          data: { url: '/chat' },
        }).catch(() => _fireDirectNotif(title, body, tag))
      } else {
        _fireDirectNotif(title, body, tag)
      }
    }).catch(() => _fireDirectNotif(title, body, tag))
    return
  }

  // HTTP/localhost: Notification API directa (siempre funciona si hay permiso)
  _fireDirectNotif(title, body, tag)
}

function _fireDirectNotif(title, body, tag) {
  try {
    const n = new Notification(title, {
      body, tag,
      icon: '/img/logoHola.png',
      renotify: true,
      silent: false,
    })
    n.onclick = () => {
      window.focus()
      if (!window.location.pathname.includes('/chat')) window.location.href = '/chat'
      n.close()
    }
    setTimeout(() => { try { n.close() } catch {} }, 8000)
  } catch (e) {
    console.warn('[Notif] Error:', e)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────
function stripHtml(html = '') {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
    .substring(0, 150)
}

function hasMention(contenido = '', userId = '', userName = '') {
  if (!contenido) return false
  if (userId && (
    contenido.includes(`data-id="${userId}"`) ||
    contenido.includes(`data-id='${userId}'`)
  )) return true
  if (userName) {
    const plain = stripHtml(contenido).toLowerCase()
    if (plain.includes(`@${userName.toLowerCase()}`)) return true
  }
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function ChatNotificationsProvider({ children }) {
  const { user } = useAuth()

  const [dmUnread,          setDmUnread]          = useState({})
  const [channelUnread,     setChannelUnread]      = useState({})
  const [channelMentionCnt, setChannelMentionCnt] = useState({})
  const [notifPermission,   setNotifPermission]   = useState(() => getNotificationPermission())
  const [activeCanalId,     _setActiveCanalId]    = useState(null)
  const [prefs,             _setPrefs]            = useState({})
  const [inAppNotifs,       setInAppNotifs]       = useState([]) // toasts in-app

  // Refs — no causan re-render
  // lastSeenRef:  último mensaje VISTO por el usuario (persistido)
  // lastNotifRef: último mensaje del que se envió notificación (persistido)
  // badgeRef:     badge acumulado por canal mientras no está abierto (en memoria)
  const lastSeenRef      = useRef({})
  const lastNotifRef     = useRef({})
  const badgeRef         = useRef({}) // { canalId: { dm: number, unread: number, mention: number } }
  const canalesRef       = useRef([])
  const activeCanalIdRef = useRef(null)
  const prefsRef         = useRef({})
  const mountedRef       = useRef(true)
  const userIdRef        = useRef(null)
  const pollingTimer     = useRef(null)
  const tickRef          = useRef(0)

  const setActiveCanalId = useCallback((id) => {
    activeCanalIdRef.current = id
    _setActiveCanalId(id)
  }, [])

  // Añadir toast in-app (máximo 4 a la vez, se auto-eliminan en 6s)
  const inAppNotifIdRef = useRef(0)
  const addInAppNotif = useCallback((title, body, canalId) => {
    const id = ++inAppNotifIdRef.current
    setInAppNotifs(prev => {
      const next = [...prev.slice(-3), { id, title, body, canalId }]
      return next
    })
    setTimeout(() => {
      setInAppNotifs(prev => prev.filter(n => n.id !== id))
    }, 6000)
  }, [])

  const dismissInAppNotif = useCallback((id) => {
    setInAppNotifs(prev => prev.filter(n => n.id !== id))
  }, [])

  // ── Inicialización ────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    if (!user) return

    userIdRef.current    = user.id
    lastSeenRef.current  = loadLS(`chat_seen_${user.id}`)
    lastNotifRef.current = loadLS(`chat_notified_${user.id}`)
    const p = loadLS(`chat_prefs_${user.id}`)
    prefsRef.current = p
    _setPrefs(p)

    if (Notification.permission === 'granted') getSW()
    requestNotificationPermission().then(r => setNotifPermission(r))

    return () => { mountedRef.current = false }
  }, [user?.id])

  useEffect(() => {
    if (!('permissions' in navigator)) return
    let ps
    navigator.permissions.query({ name: 'notifications' }).then(s => {
      ps = s
      s.addEventListener('change', () => {
        setNotifPermission(Notification.permission)
        if (Notification.permission === 'granted') getSW()
      })
    }).catch(() => {})
    return () => { ps?.removeEventListener('change', () => {}) }
  }, [])

  function persistSeen()  { if (userIdRef.current) saveLS(`chat_seen_${userIdRef.current}`,     lastSeenRef.current) }
  function persistNotif() { if (userIdRef.current) saveLS(`chat_notified_${userIdRef.current}`, lastNotifRef.current) }

  const updatePref = useCallback((canalId, changes) => {
    if (!user || !canalId) return
    const next = { ...prefsRef.current, [canalId]: { ...(prefsRef.current[canalId] || {}), ...changes } }
    prefsRef.current = next
    _setPrefs({ ...next })
    saveLS(`chat_prefs_${user.id}`, next)
  }, [user?.id]) // eslint-disable-line

  // markRead: llamado cuando el usuario ABRE un canal
  const markRead = useCallback((canalId, lastMsgId) => {
    if (!canalId || !lastMsgId) return
    lastSeenRef.current[canalId]  = lastMsgId
    lastNotifRef.current[canalId] = lastMsgId
    persistSeen()
    persistNotif()
    // Limpiar badge acumulado
    if (badgeRef.current[canalId]) delete badgeRef.current[canalId]
    setDmUnread(prev          => ({ ...prev, [canalId]: 0 }))
    setChannelUnread(prev     => ({ ...prev, [canalId]: 0 }))
    setChannelMentionCnt(prev => ({ ...prev, [canalId]: 0 }))
  }, [user?.id]) // eslint-disable-line

  // ── Poll ──────────────────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    if (!user || !mountedRef.current) return

    const myId   = user.id
    const myName = user.nombre || user.email || ''

    try {
      tickRef.current++

      if (!canalesRef.current.length || tickRef.current % 3 === 0) {
        const data = await getChatCanales().catch(() => null)
        if (data) canalesRef.current = data
      }

      const canales = canalesRef.current
      if (!canales.length) return

      const newDm      = {}
      const newUnread  = {}
      const newMention = {}

      await Promise.allSettled(canales.map(async canal => {
        try {
          const msgs = await getChatMensajes(canal.id, 30)
          const isDm = canal.tipo === 'directo'

          if (!msgs?.length) {
            newDm[canal.id]      = 0
            newUnread[canal.id]  = 0
            newMention[canal.id] = 0
            return
          }

          const lastMsg    = msgs[msgs.length - 1]
          const isOpen     = activeCanalIdRef.current === canal.id
          const isMuted    = prefsRef.current[canal.id]?.muted
          const lastSeenId = lastSeenRef.current[canal.id]

          // Canal abierto → marcar leído
          if (isOpen) {
            lastSeenRef.current[canal.id]  = lastMsg.id
            lastNotifRef.current[canal.id] = lastMsg.id
            persistSeen(); persistNotif()
            if (badgeRef.current[canal.id]) delete badgeRef.current[canal.id]
            newDm[canal.id]      = 0
            newUnread[canal.id]  = 0
            newMention[canal.id] = 0
            return
          }

          // Sin historial previo → inicializar sin badge ni notif
          if (!lastSeenId) {
            lastSeenRef.current[canal.id]  = lastMsg.id
            lastNotifRef.current[canal.id] = lastMsg.id
            persistSeen(); persistNotif()
            newDm[canal.id]      = 0
            newUnread[canal.id]  = 0
            newMention[canal.id] = 0
            return
          }

          // Sin mensajes nuevos → preservar badge acumulado (si lo hay)
          if (lastSeenId === lastMsg.id) {
            const cached = badgeRef.current[canal.id]
            newDm[canal.id]      = cached?.dm      ?? 0
            newUnread[canal.id]  = cached?.unread  ?? 0
            newMention[canal.id] = cached?.mention ?? 0
            return
          }

          // ── Hay mensajes nuevos ──────────────────────────────────────────
          const seenIdx = msgs.findIndex(m => m.id === lastSeenId)
          const unread  = (seenIdx >= 0 ? msgs.slice(seenIdx + 1) : msgs)
            .filter(m => m.user_id !== myId)

          const count = unread.length

          if (isMuted || count === 0) {
            // Silenciado o sin mensajes no leídos de otros — limpiar badge
            if (badgeRef.current[canal.id]) delete badgeRef.current[canal.id]
            newDm[canal.id]      = 0
            newUnread[canal.id]  = 0
            newMention[canal.id] = 0
            return
          }

          const latest = unread[unread.length - 1]

          if (isDm) {
            // Acumular badge DM
            badgeRef.current[canal.id] = { dm: count, unread: 0, mention: 0 }
            newDm[canal.id] = count

            // Notif solo por mensajes realmente nuevos (que aún no notificamos)
            const lastNotified = lastNotifRef.current[canal.id]
            const lastNotifIdx = lastNotified ? msgs.findIndex(m => m.id === lastNotified) : -1
            // Si lastNotifIdx === -1 y hay lastNotified → el msg notificado es más antiguo
            // que nuestra ventana de 30 msgs, todos los unread son nuevos
            const toNotify = lastNotifIdx >= 0
              ? unread.filter(m => msgs.indexOf(m) > lastNotifIdx)
              : unread // sin lastNotified O más antiguo que la ventana → notificar todos

            if (toNotify.length > 0) {
              const newest  = toNotify[toNotify.length - 1]
              lastNotifRef.current[canal.id] = newest.id
              persistNotif()
              const sender  = newest.profiles?.nombre || newest.profiles?.email || 'Alguien'
              const preview = stripHtml(newest.contenido) || '📎 Archivo adjunto'
              const title   = `${sender} te ha enviado un mensaje`
              sendNotif(title, preview, `hola-dm-${canal.id}`)
              addInAppNotif(title, preview, canal.id)
            }

          } else {
            const mentions     = unread.filter(m => hasMention(m.contenido, myId, myName))
            const mentionCount = mentions.length

            // Acumular badge canal
            badgeRef.current[canal.id] = { dm: 0, unread: count, mention: mentionCount }
            newUnread[canal.id]  = count
            newMention[canal.id] = mentionCount

            if (mentionCount > 0) {
              const latestMention  = mentions[mentions.length - 1]
              const lastNotified   = lastNotifRef.current[canal.id]
              const lastNotifIdx   = lastNotified ? msgs.findIndex(m => m.id === lastNotified) : -1
              const mentionsToNotify = lastNotifIdx >= 0
                ? mentions.filter(m => msgs.indexOf(m) > lastNotifIdx)
                : mentions // sin lastNotified O más antiguo que la ventana → notificar todos

              if (mentionsToNotify.length > 0) {
                const newest  = mentionsToNotify[mentionsToNotify.length - 1]
                lastNotifRef.current[canal.id] = newest.id
                persistNotif()
                const sender  = newest.profiles?.nombre || newest.profiles?.email || 'Alguien'
                const preview = stripHtml(newest.contenido) || '📎 Archivo adjunto'
                const title   = `${sender} te ha mencionado en #${canal.nombre}`
                sendNotif(title, preview, `hola-canal-${canal.id}`)
                addInAppNotif(title, preview, canal.id)
              }
            }
          }

        } catch (err) {
          console.error(`[Poll] canal ${canal.id}:`, err)
        }
      }))

      if (!mountedRef.current) return

      setDmUnread(newDm)
      setChannelUnread(newUnread)
      setChannelMentionCnt(newMention)

    } catch (err) {
      console.error('[Poll] error general:', err)
    }
  }, [user?.id]) // eslint-disable-line

  useEffect(() => {
    if (!user) return
    const t0 = setTimeout(poll, 800)
    pollingTimer.current = setInterval(poll, 6000)
    return () => { clearTimeout(t0); clearInterval(pollingTimer.current) }
  }, [user?.id, poll])

  // ── Valores derivados ─────────────────────────────────────────────────────
  const totalDmUnread = Object.values(dmUnread).reduce((s, v) => s + v, 0)
  const totalMentions = Object.values(channelMentionCnt).reduce((s, v) => s + v, 0)
  const totalUnread   = totalDmUnread + totalMentions

  const channelActivity = Object.fromEntries(
    Object.entries(channelUnread).map(([id, n]) => [id, n > 0])
  )
  const channelMention = Object.fromEntries(
    Object.entries(channelMentionCnt).map(([id, n]) => [id, n > 0])
  )

  return (
    <Ctx.Provider value={{
      dmUnread,
      channelUnread,
      channelMentionCnt,
      channelActivity,
      channelMention,
      notifPermission,
      totalDmUnread,
      totalMentions,
      totalUnread,
      markRead,
      activeCanalId,
      setActiveCanalId,
      prefs,
      updatePref,
      requestNotificationPermission: async () => {
        const p = await requestNotificationPermission()
        setNotifPermission(p)
        return p
      },
      inAppNotifs,
      dismissInAppNotif,
      addInAppNotif,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useChatNotifications() {
  const ctx = useContext(Ctx)
  if (!ctx) return {
    dmUnread: {},
    channelUnread: {},
    channelMentionCnt: {},
    channelActivity: {},
    channelMention: {},
    notifPermission: 'default',
    totalDmUnread: 0,
    totalMentions: 0,
    totalUnread: 0,
    markRead: () => {},
    activeCanalId: null,
    setActiveCanalId: () => {},
    prefs: {},
    updatePref: () => {},
    requestNotificationPermission: async () => {},
    inAppNotifs: [],
    dismissInAppNotif: () => {},
    addInAppNotif: () => {},
  }
  return ctx
}
