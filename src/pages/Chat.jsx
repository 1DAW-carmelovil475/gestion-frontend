import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useChatNotifications } from '../context/ChatNotificationsContext'
import {
  getChatCanales, createChatCanal, updateChatCanal, deleteChatCanal,
  getChatMensajes, sendChatMensaje, deleteChatMensaje, editChatMensaje, pinChatMensaje,
  getOperarios, getTickets, getChatArchivoUrl
} from '../services/api'
import './Chat.css'

const AVATAR_COLORS = ['#0066ff', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#0891b2', '#be185d', '#065f46']

function getAvatarColor(str) {
  if (!str) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
function getInitials(nombre) {
  if (!nombre) return '?'
  return nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}
function getDmNombre(canal, userId) {
  if (!canal?.chat_canales_miembros) return 'Chat'
  const otros = canal.chat_canales_miembros.filter(m => m.user_id !== userId)
  if (otros.length === 0) return 'Tú mismo'
  return otros.map(m => m.profiles?.nombre || m.profiles?.email || 'Desconocido').join(', ')
}
function getDmOtros(canal, userId) {
  if (!canal?.chat_canales_miembros) return []
  return canal.chat_canales_miembros.filter(m => m.user_id !== userId)
}
function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
function getFileIcon(mime) {
  if (!mime) return 'fa-paperclip'
  if (mime.startsWith('image/')) return 'fa-image'
  if (mime === 'application/pdf') return 'fa-file-pdf'
  if (mime.includes('word')) return 'fa-file-word'
  if (mime.includes('excel') || mime.includes('sheet')) return 'fa-file-excel'
  if (mime.includes('zip') || mime.includes('compressed')) return 'fa-file-archive'
  if (mime.startsWith('video/')) return 'fa-file-video'
  return 'fa-file'
}
const ESTADO_COLORS = {
  'Pendiente':  { bg: '#fef3c7', color: '#d97706' },
  'En curso':   { bg: '#dbeafe', color: '#2563eb' },
  'Completado': { bg: '#d1fae5', color: '#059669' },
  'Facturado':  { bg: '#ede9fe', color: '#7c3aed' },
}

const DM_INVITE_PREFIX = '__DM_INVITE__:'
const DM_ACCEPTED_PREFIX = '__DM_ACCEPTED__:'
const DM_REJECTED_PREFIX = '__DM_REJECTED__:'
const SISTEMA_PREFIX = '__SISTEMA__:'

// ── MiembrosSelector ──────────────────────────────────────────────────────────
function MiembrosSelector({ operarios, userId, selected, onChange, showQuickFilters = false }) {
  const lista   = operarios.filter(o => o.id !== userId)
  const admins  = lista.filter(o => o.rol === 'admin')
  const workers = lista.filter(o => o.rol !== 'admin')
  function toggle(id) { onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]) }
  return (
    <div>
      {showQuickFilters && (
        <div className="miembros-quick-filters">
          <button type="button" className="qf-btn qf-all" onClick={() => onChange(lista.map(o => o.id))}><i className="fas fa-users"></i> Todos</button>
          <button type="button" className="qf-btn qf-admins" onClick={() => onChange(admins.map(o => o.id))}><i className="fas fa-shield-alt"></i> Solo admins</button>
          <button type="button" className="qf-btn qf-workers" onClick={() => onChange(workers.map(o => o.id))}><i className="fas fa-hard-hat"></i> Solo trabajadores</button>
          {selected.length > 0 && <button type="button" className="qf-btn qf-clear" onClick={() => onChange([])}><i className="fas fa-times"></i> Limpiar</button>}
        </div>
      )}
      <div className="operarios-checkboxes">
        {lista.length === 0 && <p style={{ color: '#6c757d', fontSize: '0.85rem' }}>No hay otros operarios.</p>}
        {lista.map(op => {
          const isSel = selected.includes(op.id)
          return (
            <div key={op.id} className={`operario-checkbox-item ${isSel ? 'selected' : ''}`} onClick={() => toggle(op.id)}>
              <div className="avatar" style={{ background: getAvatarColor(op.id) }}>{getInitials(op.nombre)}</div>
              <div className="operario-info">
                <span className="nombre">{op.nombre || op.email}</span>
                {op.rol === 'admin' ? <span className="badge-rol admin">Admin</span> : <span className="badge-rol worker">Trabajador</span>}
              </div>
              <span className="check-icon"><i className="fas fa-check"></i></span>
            </div>
          )
        })}
      </div>
      <div className="selected-count">
        {selected.length > 0
          ? `${selected.length} miembro${selected.length > 1 ? 's' : ''} seleccionado${selected.length > 1 ? 's' : ''}`
          : <span style={{ color: '#aaa' }}>Ningún miembro seleccionado</span>}
      </div>
    </div>
  )
}

// ── Context menu: mensajes ────────────────────────────────────────────────────
function MsgContextMenu({ x, y, msg, userId, isAdmin, onClose, onEdit, onDelete, onPin }) {
  const ref = useRef(null)
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  const [pos, setPos] = useState({ top: y, left: x })
  useEffect(() => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({ top: r.bottom > window.innerHeight ? y - r.height : y, left: r.right > window.innerWidth ? x - r.width : x })
  }, [x, y])
  return (
    <div ref={ref} className="context-menu" style={{ top: pos.top, left: pos.left }} onClick={e => e.stopPropagation()}>
      <button onClick={() => { onPin(msg, !msg.anclado); onClose() }}>
        <i className="fas fa-thumbtack"></i> {msg.anclado ? 'Desanclar' : 'Anclar mensaje'}
      </button>
      {msg.user_id === userId && (
        <button onClick={() => { onEdit(msg); onClose() }}><i className="fas fa-pen"></i> Editar mensaje</button>
      )}
      {(msg.user_id === userId || isAdmin) && (
        <button className="ctx-danger" onClick={() => { onDelete(msg.id); onClose() }}><i className="fas fa-trash"></i> Eliminar</button>
      )}
    </div>
  )
}

// ── Context menu: canal (sidebar) ─────────────────────────────────────────────
function CanalContextMenu({ x, y, canal, prefs, isAdmin, onClose, onPin, onMute, onHide, onUnhide, onEdit, onDelete }) {
  const ref = useRef(null)
  const cp  = prefs[canal.id] || {}
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  const [pos, setPos] = useState({ top: y, left: x })
  useEffect(() => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({ top: r.bottom > window.innerHeight ? y - r.height : y, left: r.right > window.innerWidth ? x - r.width : x })
  }, [x, y])
  return (
    <div ref={ref} className="context-menu canal-ctx-menu" style={{ top: pos.top, left: pos.left }} onClick={e => e.stopPropagation()}>
      <button onClick={() => { onPin(canal.id, !cp.pinned); onClose() }}>
        <i className={`fas ${cp.pinned ? 'fa-unlink' : 'fa-thumbtack'}`}></i>
        {cp.pinned ? 'Desfijar canal' : 'Fijar canal'}
      </button>
      <button onClick={() => { onMute(canal.id, !cp.muted); onClose() }}>
        <i className={`fas ${cp.muted ? 'fa-bell' : 'fa-bell-slash'}`}></i>
        {cp.muted ? 'Activar notificaciones' : 'Silenciar notificaciones'}
      </button>
      {cp.hidden
        ? <button onClick={() => { onUnhide(canal.id); onClose() }}><i className="fas fa-eye"></i> Mostrar canal</button>
        : <button onClick={() => { onHide(canal.id); onClose() }}><i className="fas fa-eye-slash"></i> Ocultar canal</button>
      }
      {(isAdmin || canal.tipo === 'directo') && (
        <>
          <div className="ctx-separator" />
          {isAdmin && canal.tipo === 'canal' && (
            <button onClick={() => { onEdit(canal); onClose() }}><i className="fas fa-pen"></i> Editar canal</button>
          )}
          <button className="ctx-danger" onClick={() => { onDelete(canal); onClose() }}>
            <i className="fas fa-trash"></i>
            {canal.tipo === 'directo' ? 'Eliminar chat' : 'Eliminar canal'}
          </button>
        </>
      )}
    </div>
  )
}

// ── TicketPicker ──────────────────────────────────────────────────────────────
function TicketPicker({ tickets, onSelect, onClose }) {
  const [q, setQ] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', h)
    }, 100)
    return () => { clearTimeout(timeout); document.removeEventListener('mousedown', h) }
  }, [onClose])
  const filtered = tickets.filter(t => String(t.numero).includes(q) || t.asunto?.toLowerCase().includes(q.toLowerCase())).slice(0, 25)
  return (
    <div ref={ref} className="ticket-picker">
      <div className="ticket-picker-header">
        <i className="fas fa-search"></i>
        <input autoFocus type="text" placeholder="Buscar por #ID o nombre del ticket..." value={q} onChange={e => setQ(e.target.value)} />
        <button onMouseDown={e => { e.preventDefault(); onClose() }}><i className="fas fa-times"></i></button>
      </div>
      <div className="ticket-picker-list">
        {filtered.length === 0
          ? <div className="ticket-picker-empty">Sin resultados</div>
          : filtered.map(t => {
            const ec = ESTADO_COLORS[t.estado] || { bg: '#f0f0f0', color: '#666' }
            return (
              <div key={t.id} className="ticket-picker-item" onMouseDown={e => { e.preventDefault(); onSelect(t) }}>
                <span className="tp-num">#{t.numero}</span>
                <span className="tp-asunto">{t.asunto}</span>
                <span className="tp-estado" style={{ background: ec.bg, color: ec.color }}>{t.estado}</span>
              </div>
            )
          })}
      </div>
    </div>
  )
}

// ── Drag-and-drop hook ────────────────────────────────────────────────────────
function useDragSort(items, onReorder) {
  const dragIdx     = useRef(null)
  const dragOverIdx = useRef(null)

  function onDragStart(e, idx) {
    dragIdx.current = idx
    e.dataTransfer.effectAllowed = 'move'
    e.currentTarget.classList.add('dragging')
  }
  function onDragOver(e, idx) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dragOverIdx.current = idx
    document.querySelectorAll('.canal-item.drag-over').forEach(el => el.classList.remove('drag-over'))
    e.currentTarget.classList.add('drag-over')
  }
  function onDragEnd(e) {
    e.currentTarget.classList.remove('dragging')
    document.querySelectorAll('.canal-item.drag-over').forEach(el => el.classList.remove('drag-over'))
    if (dragIdx.current === null || dragOverIdx.current === null || dragIdx.current === dragOverIdx.current) {
      dragIdx.current = null; dragOverIdx.current = null; return
    }
    const next = [...items]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(dragOverIdx.current, 0, moved)
    onReorder(next)
    dragIdx.current = null; dragOverIdx.current = null
  }
  function onDrop(e) { e.preventDefault() }

  return { onDragStart, onDragOver, onDragEnd, onDrop }
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Chat() {
  const { user, logout, isAdmin } = useAuth()
  const { dmUnread, channelUnread, channelActivity, markRead, setActiveCanalId, prefs, updatePref } = useChatNotifications()
  const navigate = useNavigate()

  // FIX: clave de localStorage por usuario
  const CANAL_KEY = `chat_canal_activo_${user?.id || 'u'}`

  const [canales,      setCanales]      = useState([])
  const [operarios,    setOperarios]    = useState([])
  const [allTickets,   setAllTickets]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [canalActual,  setCanalActual]  = useState(null)
  const [mensajes,     setMensajes]     = useState([])
  const [mensajeText,  setMensajeText]  = useState('')
  const [pendingFiles, setPendingFiles] = useState([])
  const [pendingImages, setPendingImages] = useState([])
  const [ticketRef,    setTicketRef]    = useState(null)
  const [showHidden,   setShowHidden]   = useState(false)
  const [customOrder,  setCustomOrder]  = useState({ canales: [], directos: [] })

  const [pendingInvites, setPendingInvites] = useState({})
  const [sentInvites,    setSentInvites]    = useState({})
  const sentInvitesRef = useRef({})

  const [showTicketPicker, setShowTicketPicker] = useState(false)
  const [showCanalModal,   setShowCanalModal]   = useState(false)
  const [showEditModal,    setShowEditModal]    = useState(false)
  const [showDirectoModal, setShowDirectoModal] = useState(false)

  const [nuevoNombre,      setNuevoNombre]      = useState('')
  const [nuevoDesc,        setNuevoDesc]        = useState('')
  const [selectedMiembros, setSelectedMiembros] = useState([])
  const [editingCanal,     setEditingCanal]     = useState(null)
  const [editNombre,       setEditNombre]       = useState('')
  const [editDesc,         setEditDesc]         = useState('')
  const [editMiembros,     setEditMiembros]     = useState([])
  const [editLoading,      setEditLoading]      = useState(false)

  const [editingMsg,     setEditingMsg]     = useState(null)
  const [editingMsgText, setEditingMsgText] = useState('')
  const [msgCtxMenu,     setMsgCtxMenu]     = useState(null)
  const [canalCtxMenu,   setCanalCtxMenu]   = useState(null)

  const mensajesEndRef  = useRef(null)
  const fileInputRef    = useRef(null)
  const textareaRef     = useRef(null)
  const editorRef       = useRef(null)
  const pollingRef      = useRef(null)
  const canalActualRef  = useRef(null)
  const mensajesRef     = useRef([])
  const shouldScrollRef = useRef(false)

  useEffect(() => { canalActualRef.current = canalActual }, [canalActual])
  useEffect(() => { mensajesRef.current = mensajes }, [mensajes])

  useEffect(() => {
    if (!user) return
    try {
      const saved = localStorage.getItem(`chat_order_${user.id}`)
      if (saved) setCustomOrder(JSON.parse(saved))
    } catch {}
  }, [user?.id])

  function saveOrder(o) {
    if (!user) return
    try { localStorage.setItem(`chat_order_${user.id}`, JSON.stringify(o)) } catch {}
  }

  useEffect(() => { loadData() }, [])

  // ── Polling de canales ─────────────────────────────────────────────────────
  const canalesIdsRef = useRef('')
  useEffect(() => {
    if (!user) return
    const pollCanales = async () => {
      try {
        const data = await getChatCanales().catch(() => null)
        if (!data) return
        const newIds = data.map(c => c.id).sort().join(',')
        if (newIds !== canalesIdsRef.current) {
          canalesIdsRef.current = newIds
          setCanales(data)
        }
      } catch {}
    }
    const t = setInterval(pollCanales, 8000)
    return () => clearInterval(t)
  }, [user?.id]) // eslint-disable-line

  // ── FIX: Restaurar canal activo desde localStorage (persiste entre visitas) ─
  const restoredRef = useRef(false)
  useEffect(() => {
    if (!canales.length || restoredRef.current) return
    restoredRef.current = true
    const savedId = localStorage.getItem(CANAL_KEY)
    if (savedId) {
      const canal = canales.find(c => c.id === savedId)
      if (canal) { setCanalActual(canal); shouldScrollRef.current = true }
    }
  }, [canales])

  useEffect(() => {
    if (!canalActual) return
    // FIX: guardar en localStorage para que persista al salir y volver
    localStorage.setItem(CANAL_KEY, canalActual.id)
    setActiveCanalId(canalActual.id)
    loadMensajes(canalActual.id)
  }, [canalActual?.id])

  useEffect(() => {
    if (!canalActual || !mensajes.length) return
    markRead(canalActual.id, mensajes[mensajes.length - 1].id)
  }, [mensajes, canalActual?.id])

  useEffect(() => {
    return () => {
      const canal = canalActualRef.current
      const msgs  = mensajesRef.current
      if (canal && msgs.length) {
        markRead(canal.id, msgs[msgs.length - 1].id)
      }
      setActiveCanalId(null)
      // FIX: NO eliminamos la clave al salir — así se restaura al volver
      // localStorage.removeItem(CANAL_KEY)  ← eliminado intencionalmente
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    const container = mensajesEndRef.current?.parentElement
    if (!container) return
    if (shouldScrollRef.current) {
      mensajesEndRef.current?.scrollIntoView({ behavior: 'auto' })
      shouldScrollRef.current = false; return
    }
    if (container.scrollHeight - container.scrollTop - container.clientHeight < 120)
      mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (!canalActual) return
    pollingRef.current = setInterval(async () => {
      const canal = canalActualRef.current; if (!canal) return
      try {
        const data = await getChatMensajes(canal.id)
        const nuevos = data || []; const actuales = mensajesRef.current
        if (nuevos.length !== actuales.length || nuevos[nuevos.length - 1]?.id !== actuales[actuales.length - 1]?.id)
          setMensajes(nuevos)
      } catch {}
    }, 4000)
    return () => clearInterval(pollingRef.current)
  }, [canalActual?.id])

  // ── Polling de invitaciones DM ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const checkInvites = async () => {
      try {
        const dms = canales.filter(c => c.tipo === 'directo')
        const newPending = {}
        const newSent    = {}
        for (const canal of dms) {
          try {
            const msgs = await getChatMensajes(canal.id, 30)
            if (!msgs?.length) continue
            for (let i = msgs.length - 1; i >= 0; i--) {
              const m = msgs[i]
              if (m.contenido?.startsWith(DM_INVITE_PREFIX)) {
                const hasResponse = msgs.slice(i + 1).some(
                  r => r.contenido?.startsWith(DM_ACCEPTED_PREFIX) || r.contenido?.startsWith(DM_REJECTED_PREFIX)
                )
                if (!hasResponse) {
                  const payload = m.contenido.replace(DM_INVITE_PREFIX, '')
                  try {
                    const parsed = JSON.parse(payload)
                    if (m.user_id !== user.id) {
                      newPending[canal.id] = { nombreRemitente: parsed.remitente, remitenteId: m.user_id, canalId: canal.id }
                    } else {
                      newSent[canal.id] = { nombreDestinatario: parsed.destinatario }
                    }
                  } catch {}
                }
                break
              }
              if (m.contenido?.startsWith(DM_ACCEPTED_PREFIX) || m.contenido?.startsWith(DM_REJECTED_PREFIX)) break
            }
          } catch {}
        }
        const prevSent = sentInvitesRef.current
        const canalIds = new Set(canales.map(c => c.id))
        for (const [canalId, info] of Object.entries(prevSent)) {
          if (!canalIds.has(canalId) && !newSent[canalId]) {
            showToast('warning', 'Chat rechazado', `${info.nombreDestinatario} rechazó tu solicitud de chat`)
          }
        }
        sentInvitesRef.current = newSent
        setPendingInvites(newPending)
        setSentInvites(newSent)
      } catch {}
    }
    checkInvites()
    const t = setInterval(checkInvites, 6000)
    return () => clearInterval(t)
  }, [user?.id, canales]) // eslint-disable-line

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { setMsgCtxMenu(null); setCanalCtxMenu(null); setEditingMsg(null) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [c, o, t] = await Promise.all([getChatCanales(), getOperarios(), getTickets()])
      setCanales(c || []); setOperarios(o || []); setAllTickets(t || [])
    } catch (err) { showToast('error', 'Error', err.message) }
    finally { setLoading(false) }
  }

  async function loadMensajes(canalId) {
    try {
      const data = await getChatMensajes(canalId)
      setMensajes(data || []); shouldScrollRef.current = true
    } catch (err) { showToast('error', 'Error', err.message) }
  }

  function sortList(list, section) {
    const order = customOrder[section] || []
    if (!order.length) return list
    const indexed   = list.filter(c => order.includes(c.id)).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    const unindexed = list.filter(c => !order.includes(c.id))
    return [...indexed, ...unindexed]
  }

  function handleReorder(section, newList) {
    const o = { ...customOrder, [section]: newList.map(c => c.id) }
    setCustomOrder(o); saveOrder(o)
  }

  const allCanalesRaw  = canales.filter(c => c.tipo === 'canal')
  const allDirectosRaw = canales.filter(c => c.tipo === 'directo')

  const canalesVisible  = sortList(allCanalesRaw.filter(c => !prefs[c.id]?.hidden),  'canales')
  const directosVisible = sortList(allDirectosRaw.filter(c => !prefs[c.id]?.hidden), 'directos')
  const hiddenAll       = [...allCanalesRaw, ...allDirectosRaw].filter(c => prefs[c.id]?.hidden)

  const pinnedAll = [...canalesVisible, ...directosVisible].filter(c => prefs[c.id]?.pinned)
  const unPinnedCanales  = canalesVisible.filter(c => !prefs[c.id]?.pinned)
  const unPinnedDirectos = directosVisible.filter(c => !prefs[c.id]?.pinned)

  const dragCanales  = useDragSort(unPinnedCanales,  (nl) => handleReorder('canales',  nl))
  const dragDirectos = useDragSort(unPinnedDirectos, (nl) => handleReorder('directos', nl))

  function handlePin(id, v)   { updatePref(id, { pinned: v }) }
  function handleMute(id, v)  { updatePref(id, { muted: v }) }
  function handleHide(id)     {
    updatePref(id, { hidden: true })
    if (canalActual?.id === id) { setCanalActual(null); setActiveCanalId(null) }
  }
  function handleUnhide(id)   { updatePref(id, { hidden: false }) }

  function handleLogout() {
    if (confirm('¿Cerrar sesión?')) { logout(); navigate('/login') }
  }
  function openEditModalForCanal(canal) {
    setEditingCanal(canal)
    setEditNombre(canal.nombre || '')
    setEditDesc(canal.descripcion || '')
    setEditMiembros((canal.chat_canales_miembros || []).filter(m => m.user_id !== user?.id).map(m => m.user_id))
    setShowEditModal(true)
  }
  async function crearCanal(e) {
    e.preventDefault(); if (!nuevoNombre.trim()) return
    try {
      await createChatCanal({ nombre: nuevoNombre.trim(), descripcion: nuevoDesc.trim() || null, tipo: 'canal', miembros: selectedMiembros })
      showToast('success', 'Creado', 'Canal creado'); setShowCanalModal(false); loadData()
    } catch (err) { showToast('error', 'Error', err.message) }
  }
  async function guardarEdicion(e) {
    e.preventDefault(); if (!editNombre.trim() || !editingCanal) return
    setEditLoading(true)
    try {
      await updateChatCanal(editingCanal.id, { nombre: editNombre.trim(), descripcion: editDesc.trim() || null, miembros: editMiembros })
      showToast('success', 'Guardado', 'Canal actualizado'); setShowEditModal(false)
      const cd = await getChatCanales(); setCanales(cd || [])
      const updated = (cd || []).find(c => c.id === editingCanal.id)
      if (updated && canalActual?.id === editingCanal.id) setCanalActual(updated)
    } catch (err) { showToast('error', 'Error', err.message) }
    finally { setEditLoading(false) }
  }

  async function crearDirecto(opId) {
    const operario = operarios.find(o => o.id === opId)
    if (isAdmin()) {
      try {
        await createChatCanal({ nombre: `directo-${opId}`, descripcion: null, tipo: 'directo', miembros: [opId] })
        showToast('success', 'Creado', 'Conversación iniciada'); setShowDirectoModal(false); loadData()
      } catch (err) { showToast('error', 'Error', err.message) }
    } else {
      try {
        const canal = await createChatCanal({ nombre: `directo-${opId}`, descripcion: null, tipo: 'directo', miembros: [opId] })
        const nombreRemitente     = user?.nombre || user?.email || 'Alguien'
        const nombreDestinatario  = operario?.nombre || operario?.email || 'Alguien'
        const payload = JSON.stringify({ remitente: nombreRemitente, destinatario: nombreDestinatario })
        await sendChatMensaje(canal.id || canal, `${DM_INVITE_PREFIX}${payload}`, null, [])
        showToast('success', 'Petición enviada', `Esperando que ${nombreDestinatario} acepte`)
        setShowDirectoModal(false)
        loadData()
      } catch (err) { showToast('error', 'Error', err.message) }
    }
  }

  async function aceptarInvitacion(canalId, nombreRemitente) {
    try {
      const nombrePropio = user?.nombre || user?.email || 'Alguien'
      await sendChatMensaje(canalId, `${DM_ACCEPTED_PREFIX}${nombrePropio} aceptó el chat`, null, [])
      setPendingInvites(prev => { const n = { ...prev }; delete n[canalId]; return n })
      const canal = canales.find(c => c.id === canalId)
      if (canal) setCanalActual(canal)
      showToast('success', 'Chat aceptado', `Ahora puedes chatear con ${nombreRemitente}`)
    } catch (err) { showToast('error', 'Error', err.message) }
  }

  async function rechazarInvitacion(canalId, nombreRemitente) {
    try {
      await deleteChatCanal(canalId)
      setPendingInvites(prev => { const n = { ...prev }; delete n[canalId]; return n })
      setCanales(prev => prev.filter(c => c.id !== canalId))
      if (canalActual?.id === canalId) { setCanalActual(null); setActiveCanalId(null) }
      showToast('info', 'Chat rechazado', `Rechazaste el chat de ${nombreRemitente}`)
    } catch (err) { showToast('error', 'Error', err.message) }
  }

  async function eliminarCanalObj(canal) {
    if (!canal) return
    const isDm  = canal.tipo === 'directo'
    const nombre = isDm ? getDmNombre(canal, user?.id) : canal.nombre
    if (!isDm && !isAdmin()) return
    if (isDm && !isAdmin() && !confirm(`¿Eliminar el chat con "${nombre}"?\n\nTodos los miembros verán un aviso de que eliminaste el chat.`)) return
    if (!isDm && !confirm(`¿Eliminar el canal "${nombre}"?`)) return
    try {
      if (isDm) {
        const nombreUsuario = user?.nombre || user?.email || 'Alguien'
        await sendChatMensaje(canal.id, `${SISTEMA_PREFIX}${nombreUsuario} eliminó el chat de mensajes directos`, null, [])
        if (isAdmin()) {
          await deleteChatCanal(canal.id)
          setCanales(prev => prev.filter(c => c.id !== canal.id))
          if (canalActual?.id === canal.id) { setCanalActual(null); setActiveCanalId(null) }
        } else {
          setCanales(prev => prev.filter(c => c.id !== canal.id))
          if (canalActual?.id === canal.id) { setCanalActual(null); setActiveCanalId(null) }
        }
      } else {
        await deleteChatCanal(canal.id)
        setCanales(prev => prev.filter(c => c.id !== canal.id))
        if (canalActual?.id === canal.id) { setCanalActual(null); setActiveCanalId(null) }
        loadData()
      }
    } catch (err) { showToast('error', 'Error', err.message) }
  }

  async function enviarMensaje() {
    const htmlContent = editorRef.current?.innerHTML || ''
    const textoPlano  = editorRef.current?.innerText?.trim() || ''
    const allFiles    = [
      ...pendingFiles,
      ...pendingImages.map(p => p.file)
    ]
    if (!canalActual || (!textoPlano && !allFiles.length && !ticketRef)) return
    try {
      await sendChatMensaje(canalActual.id, htmlContent, ticketRef?.id || null, allFiles)
      if (editorRef.current) editorRef.current.innerHTML = ''
      setMensajeText('')
      setPendingFiles([])
      pendingImages.forEach(p => URL.revokeObjectURL(p.previewUrl))
      setPendingImages([])
      setTicketRef(null)
      await loadMensajes(canalActual.id)
    } catch (err) { showToast('error', 'Error', err.message) }
  }

  async function eliminarMensaje(id) {
    if (!confirm('¿Eliminar este mensaje?')) return
    try { await deleteChatMensaje(id); loadMensajes(canalActual.id) }
    catch (err) { showToast('error', 'Error', err.message) }
  }
  function iniciarEdicionMsg(msg) {
    setEditingMsg(msg); setEditingMsgText(msg.contenido || '')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }
  async function guardarEdicionMsg() {
    if (!editingMsgText.trim()) return
    try {
      await editChatMensaje(editingMsg.id, editingMsgText)
      setEditingMsg(null); setEditingMsgText(''); loadMensajes(canalActual.id)
    } catch (err) { showToast('error', 'Error', err.message) }
  }
  async function anclarMensaje(msg, anclar) {
    try {
      await pinChatMensaje(msg.id, anclar); loadMensajes(canalActual.id)
      showToast('success', anclar ? 'Mensaje anclado' : 'Mensaje desanclado', '')
    } catch (err) { showToast('error', 'Error', err.message) }
  }
  function onMsgRightClick(e, msg)     { e.preventDefault(); setMsgCtxMenu({ x: e.clientX, y: e.clientY, msg }) }
  function onCanalRightClick(e, canal) { e.preventDefault(); e.stopPropagation(); setCanalCtxMenu({ x: e.clientX, y: e.clientY, canal }) }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files)
    const imgs = files.filter(f => f.type.startsWith('image/'))
    const rest = files.filter(f => !f.type.startsWith('image/'))
    if (imgs.length) {
      const newImgs = imgs.map(f => ({ file: f, previewUrl: URL.createObjectURL(f) }))
      setPendingImages(prev => [...prev, ...newImgs])
    }
    if (rest.length) setPendingFiles(prev => [...prev, ...rest])
    e.target.value = ''
  }

  function removePendingFile(i)  { setPendingFiles(prev => prev.filter((_, idx) => idx !== i)) }
  function removePendingImage(i) {
    setPendingImages(prev => {
      URL.revokeObjectURL(prev[i].previewUrl)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  function handlePaste(e) {
    const items = Array.from(e.clipboardData?.items || [])
    const imageItems = items.filter(item => item.type.startsWith('image/'))
    if (imageItems.length) {
      e.preventDefault()
      imageItems.forEach(item => {
        const file = item.getAsFile()
        if (file) {
          const previewUrl = URL.createObjectURL(file)
          setPendingImages(prev => [...prev, { file, previewUrl }])
        }
      })
    }
  }

  function handleKeyDownEditor(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensaje()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); guardarEdicionMsg() }
  }

  async function descargarArchivo(archivoId, nombre) {
    try {
      const { url } = await getChatArchivoUrl(archivoId)
      const a = document.createElement('a'); a.href = url; a.download = nombre; a.target = '_blank'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    } catch { showToast('error', 'Error', 'No se pudo descargar') }
  }
  function formatFecha(iso) {
    return iso ? new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''
  }
  function showToast(type, title, message) {
    const container = document.getElementById('toastContainer'); if (!container) return
    const toast = document.createElement('div'); toast.className = `toast ${type}`
    const icons = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-circle', info: 'info-circle' }
    toast.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i>
      <div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${message || ''}</div></div>
      <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`
    container.appendChild(toast)
    setTimeout(() => { if (toast.parentElement) toast.remove() }, 5000)
  }

  function execFormat(command, value) {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
  }

  const mensajesAnclados = mensajes.filter(m => m.anclado)

  function renderCanalItem(canal, idx, dragHandlers, extraClass = '') {
    const isDm     = canal.tipo === 'directo'
    const unread   = isDm ? (dmUnread[canal.id] || 0) : (channelUnread[canal.id] || 0)
    const isActive = canalActual?.id === canal.id
    const isMuted  = prefs[canal.id]?.muted
    const isPinned = prefs[canal.id]?.pinned
    const otros    = isDm ? getDmOtros(canal, user?.id) : []
    const hasPendingInvite = isDm && !!pendingInvites[canal.id]
    const hasSentInvite    = isDm && !!sentInvites[canal.id]

    return (
      <div
        key={canal.id}
        className={`canal-item ${isActive ? 'active' : ''} ${unread > 0 && !isActive ? 'has-unread' : ''} ${extraClass}`}
        draggable
        onDragStart={e => dragHandlers.onDragStart(e, idx)}
        onDragOver={e => dragHandlers.onDragOver(e, idx)}
        onDragEnd={dragHandlers.onDragEnd}
        onDrop={dragHandlers.onDrop}
        onClick={() => {
          if (hasPendingInvite || hasSentInvite) return
          setCanalActual(canal)
        }}
        onContextMenu={e => onCanalRightClick(e, canal)}
      >
        <span className="drag-handle" onMouseDown={e => e.stopPropagation()} title="Arrastrar para reordenar">
          <i className="fas fa-grip-vertical"></i>
        </span>
        {isDm ? (
          <div className="dm-avatars">
            {otros.length === 0
              ? <div className="dm-avatar" style={{ background: getAvatarColor(user?.id) }}>{getInitials(user?.nombre)}</div>
              : otros.slice(0, 2).map(m => (
                <div key={m.user_id} className="dm-avatar" style={{ background: getAvatarColor(m.user_id) }}>
                  {getInitials(m.profiles?.nombre)}
                </div>
              ))}
          </div>
        ) : (
          <i className="fas fa-hashtag canal-hash"></i>
        )}
        <span className="canal-nombre" style={{ flex: hasPendingInvite || hasSentInvite ? 'none' : 1 }}>
          {isDm ? getDmNombre(canal, user?.id) : canal.nombre}
        </span>
        {hasSentInvite && (
          <span className="dm-invite-sent-badge" title="Esperando respuesta">
            <i className="fas fa-clock"></i>
          </span>
        )}
        {hasPendingInvite && (
          <div className="dm-invite-actions" onClick={e => e.stopPropagation()}>
            <button className="dm-invite-btn accept" title="Aceptar"
              onClick={() => aceptarInvitacion(canal.id, pendingInvites[canal.id].nombreRemitente)}>
              <i className="fas fa-check"></i>
            </button>
            <button className="dm-invite-btn reject" title="Rechazar"
              onClick={() => rechazarInvitacion(canal.id, pendingInvites[canal.id].nombreRemitente)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
        {!hasPendingInvite && !hasSentInvite && (
          <div className="canal-badges">
            {isPinned && <i className="fas fa-thumbtack canal-pin-icon" title="Fijado"></i>}
            {isMuted  && <i className="fas fa-bell-slash canal-mute-icon" title="Silenciado"></i>}
            {unread > 0 && !isActive && <span className="canal-unread-badge">{unread > 9 ? '9+' : unread}</span>}
            {unread === 0 && !isActive && !isMuted && !isDm && channelActivity[canal.id] && (
              <span className="canal-activity-dot">···</span>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) return (
    <div className="loading-screen"><i className="fas fa-spinner fa-spin"></i><p>Cargando...</p></div>
  )

  const mensajesFiltrados = mensajes.map(m => {
    const c = m.contenido || ''
    if (c.startsWith(DM_INVITE_PREFIX)) {
      try {
        const parsed = JSON.parse(c.replace(DM_INVITE_PREFIX, ''))
        return { ...m, __sistema: true, __sistemaTexto: `${parsed.remitente} quiere iniciar un chat directo` }
      } catch {
        return { ...m, __sistema: true, __sistemaTexto: 'Solicitud de chat directo enviada' }
      }
    }
    if (c.startsWith(DM_ACCEPTED_PREFIX)) {
      return { ...m, __sistema: true, __sistemaTexto: c.replace(DM_ACCEPTED_PREFIX, '') }
    }
    if (c.startsWith(DM_REJECTED_PREFIX)) return null
    return m
  }).filter(Boolean)

  const hasPendingContent = pendingFiles.length > 0 || pendingImages.length > 0 || ticketRef

  return (
    <div className="chat-page" onClick={() => { setMsgCtxMenu(null); setCanalCtxMenu(null) }}>
      <div className="toast-container" id="toastContainer"></div>
      <input ref={fileInputRef} type="file" multiple accept="*/*" style={{ display: 'none' }} onChange={handleFileSelect} />

      {Object.values(pendingInvites).length > 0 && (
        <div className="dm-invites-banner">
          {Object.values(pendingInvites).map(invite => (
            <div key={invite.canalId} className="dm-invite-banner-item">
              <div className="dm-invite-avatar" style={{ background: getAvatarColor(invite.remitenteId) }}>
                {getInitials(invite.nombreRemitente)}
              </div>
              <div className="dm-invite-text">
                <strong>{invite.nombreRemitente}</strong> quiere iniciar un chat directo contigo
              </div>
              <button className="dm-invite-banner-btn accept" onClick={() => aceptarInvitacion(invite.canalId, invite.nombreRemitente)}>
                <i className="fas fa-check"></i> Aceptar
              </button>
              <button className="dm-invite-banner-btn reject" onClick={() => rechazarInvitacion(invite.canalId, invite.nombreRemitente)}>
                <i className="fas fa-times"></i> Rechazar
              </button>
            </div>
          ))}
        </div>
      )}

      <header className="topbar">
        <div className="logo">
          <img src="/img/logoHola.png" alt="Logo" />
          <span className="logo-text">Hola Informática</span>
        </div>
        <nav className="top-nav">
          <Link to="/" className="nav-link"><i className="fas fa-building"></i> Empresas</Link>
          <Link to="/usuarios" className="nav-link"><i className="fas fa-user"></i> Usuarios</Link>
          <Link to="/tickets" className="nav-link"><i className="fas fa-headset"></i> Tickets</Link>
          <Link to="/estadisticas" className="nav-link"><i className="fas fa-chart-bar"></i> Estadísticas</Link>
          <Link to="/chat" className="nav-link active"><i className="fas fa-comments"></i> Chat</Link>
        </nav>
        <div className="user-area">
          <div className="user-info"><i className="fas fa-user-circle"></i><span>{user?.nombre || user?.email}</span></div>
          <button className="btn-logout" onClick={handleLogout}><i className="fas fa-sign-out-alt"></i><span>Salir</span></button>
        </div>
      </header>

      <div className="chat-layout">

        {/* ── Sidebar ── */}
        <aside className="chat-sidebar">
          <div className="chat-sidebar-header">
            <div className="workspace-info">
              <div className="workspace-icon"><i className="fas fa-comments"></i></div>
              <div>
                <div className="workspace-name">Chat del equipo</div>
                <div className="workspace-sub">Hola Informática</div>
              </div>
            </div>
          </div>

          <div className="sidebar-scroll">

            {pinnedAll.length > 0 && (
              <div className="canal-section">
                <div className="canal-section-header">
                  <span><i className="fas fa-thumbtack" style={{ marginRight: 5, fontSize: '0.65rem' }}></i>Fijados</span>
                </div>
                <div className="canales-list">
                  {pinnedAll.map(canal => {
                    const isDm   = canal.tipo === 'directo'
                    const unread = isDm ? (dmUnread[canal.id] || 0) : (channelUnread[canal.id] || 0)
                    const isAct  = canalActual?.id === canal.id
                    const otros  = isDm ? getDmOtros(canal, user?.id) : []
                    const hasPend = isDm && !!pendingInvites[canal.id]
                    const hasSent = isDm && !!sentInvites[canal.id]
                    return (
                      <div key={canal.id}
                        className={`canal-item pinned-item ${isAct ? 'active' : ''} ${unread > 0 && !isAct ? 'has-unread' : ''}`}
                        onClick={() => { if (!hasPend && !hasSent) setCanalActual(canal) }}
                        onContextMenu={e => onCanalRightClick(e, canal)}
                      >
                        {isDm ? (
                          <div className="dm-avatars">
                            {otros.length === 0
                              ? <div className="dm-avatar" style={{ background: getAvatarColor(user?.id) }}>{getInitials(user?.nombre)}</div>
                              : otros.slice(0, 2).map(m => (
                                <div key={m.user_id} className="dm-avatar" style={{ background: getAvatarColor(m.user_id) }}>
                                  {getInitials(m.profiles?.nombre)}
                                </div>
                              ))}
                          </div>
                        ) : (
                          <i className="fas fa-hashtag canal-hash"></i>
                        )}
                        <span className="canal-nombre">{isDm ? getDmNombre(canal, user?.id) : canal.nombre}</span>
                        {hasSent && <span className="dm-invite-sent-badge"><i className="fas fa-clock"></i></span>}
                        {hasPend && (
                          <div className="dm-invite-actions" onClick={e => e.stopPropagation()}>
                            <button className="dm-invite-btn accept" onClick={() => aceptarInvitacion(canal.id, pendingInvites[canal.id].nombreRemitente)}><i className="fas fa-check"></i></button>
                            <button className="dm-invite-btn reject" onClick={() => rechazarInvitacion(canal.id, pendingInvites[canal.id].nombreRemitente)}><i className="fas fa-times"></i></button>
                          </div>
                        )}
                        {!hasPend && !hasSent && unread > 0 && !isAct && <span className="canal-unread-badge">{unread > 9 ? '9+' : unread}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="canal-section">
              <div className="canal-section-header">
                <span>Canales</span>
                <button className="btn-canal-nuevo" onClick={() => { setNuevoNombre(''); setNuevoDesc(''); setSelectedMiembros([]); setShowCanalModal(true) }} title="Nuevo canal">
                  <i className="fas fa-plus"></i>
                </button>
              </div>
              <div className="canales-list">
                {unPinnedCanales.length === 0
                  ? <div className="canal-empty">Sin canales</div>
                  : unPinnedCanales.map((canal, idx) => renderCanalItem(canal, idx, dragCanales))}
              </div>
            </div>

            <div className="canal-section">
              <div className="canal-section-header">
                <span>Mensajes directos</span>
                <button className="btn-canal-nuevo" onClick={() => setShowDirectoModal(true)} title="Nuevo DM">
                  <i className="fas fa-plus"></i>
                </button>
              </div>
              <div className="canales-list">
                {unPinnedDirectos.length === 0
                  ? <div className="canal-empty">Sin mensajes</div>
                  : unPinnedDirectos.map((canal, idx) => {
                    const hasSent = !!sentInvites[canal.id]
                    const item = renderCanalItem(canal, idx, dragDirectos)
                    return (
                      <div key={canal.id}>
                        {item}
                        {hasSent && (
                          <div className="dm-invite-sent-label">
                            <i className="fas fa-paper-plane"></i> Petición enviada a {sentInvites[canal.id].nombreDestinatario}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>

            {hiddenAll.length > 0 && (
              <div className="canal-section hidden-section">
                <button className="btn-show-hidden" onClick={() => setShowHidden(v => !v)}>
                  <i className={`fas ${showHidden ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  {showHidden ? 'Ocultar lista' : `${hiddenAll.length} canal${hiddenAll.length > 1 ? 'es' : ''} oculto${hiddenAll.length > 1 ? 's' : ''}`}
                </button>
                {showHidden && (
                  <>
                    <div className="hidden-notice">
                      <i className="fas fa-user-secret"></i>
                      Solo tú ves esta lista — clic derecho para mostrar
                    </div>
                    <div className="canales-list">
                      {hiddenAll.map(canal => {
                        const isDm  = canal.tipo === 'directo'
                        const otros = isDm ? getDmOtros(canal, user?.id) : []
                        return (
                          <div key={canal.id}
                            className="canal-item hidden-item"
                            onClick={() => { handleUnhide(canal.id); setCanalActual(canal) }}
                            onContextMenu={e => onCanalRightClick(e, canal)}
                          >
                            {isDm ? (
                              <div className="dm-avatars">
                                {otros.length === 0
                                  ? <div className="dm-avatar" style={{ background: getAvatarColor(user?.id) }}>{getInitials(user?.nombre)}</div>
                                  : otros.slice(0, 2).map(m => (
                                    <div key={m.user_id} className="dm-avatar" style={{ background: getAvatarColor(m.user_id) }}>
                                      {getInitials(m.profiles?.nombre)}
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <i className="fas fa-hashtag canal-hash"></i>
                            )}
                            <span className="canal-nombre">{isDm ? getDmNombre(canal, user?.id) : canal.nombre}</span>
                            <i className="fas fa-eye canal-eye-icon" title="Clic para mostrar"></i>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </aside>

        {/* ── Main ── */}
        <section className="chat-main">
          {!canalActual ? (
            <div className="chat-empty">
              <i className="fas fa-comments"></i>
              <h2>Bienvenido al chat del equipo</h2>
              <p>Selecciona un canal de la barra lateral para empezar</p>
            </div>
          ) : (
            <div className="chat-canal">
              <div className="chat-canal-header">
                <div className="chat-canal-info">
                  <div className="chat-canal-icono">
                    <i className={`fas ${canalActual.tipo === 'directo' ? 'fa-user' : 'fa-hashtag'}`}></i>
                  </div>
                  <div>
                    <div className="chat-canal-nombre">
                      {canalActual.tipo === 'directo' ? getDmNombre(canalActual, user?.id) : canalActual.nombre}
                    </div>
                    <div className="chat-canal-desc">{canalActual.descripcion || ''}</div>
                  </div>
                </div>
                {isAdmin() && canalActual.tipo === 'canal' && (
                  <div className="canal-header-actions">
                    <button className="btn-canal-icon btn-edit-canal" onClick={() => openEditModalForCanal(canalActual)} title="Editar canal">
                      <i className="fas fa-pen"></i>
                    </button>
                    <button className="btn-canal-icon btn-delete-canal" onClick={() => eliminarCanalObj(canalActual)} title="Eliminar canal">
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                )}
              </div>

              {mensajesAnclados.length > 0 && (
                <div className="mensajes-anclados">
                  <i className="fas fa-thumbtack"></i>
                  <span className="anclados-label">Anclados:</span>
                  {mensajesAnclados.map(m => {
                    const textoChip = m.contenido?.trim()
                      ? m.contenido.substring(0, 40) + (m.contenido.length > 40 ? '…' : '')
                      : (m.chat_mensajes_archivos?.length ? '📎 Archivo adjunto' : '(sin texto)')
                    return (
                      <span key={m.id} className="anclado-chip" onClick={() =>
                        document.getElementById(`msg-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }>
                        {m.profiles?.nombre}: {textoChip}
                      </span>
                    )
                  })}
                </div>
              )}

              <div className="chat-mensajes">
                {mensajesFiltrados.length === 0 ? (
                  <div className="chat-mensajes-empty"><i className="fas fa-comment-dots"></i><p>Sin mensajes aún</p></div>
                ) : mensajesFiltrados.map(msg => {
                  const esSistema = msg.__sistema || msg.contenido?.startsWith(SISTEMA_PREFIX)
                  if (esSistema) {
                    const texto = msg.__sistemaTexto || msg.contenido?.replace(SISTEMA_PREFIX, '') || ''
                    const esEliminacion = msg.contenido?.startsWith(SISTEMA_PREFIX)
                    return (
                      <div key={msg.id} id={`msg-${msg.id}`} className="msg-sistema">
                        <i className="fas fa-info-circle"></i>
                        <span>{texto}</span>
                        {isAdmin() && esEliminacion && (
                          <button className="msg-sistema-eliminar" title="Eliminar el chat definitivamente"
                            onClick={async () => {
                              if (!confirm('¿Eliminar este chat de mensajes directos definitivamente?')) return
                              try {
                                await deleteChatCanal(canalActual.id)
                                setCanales(prev => prev.filter(c => c.id !== canalActual.id))
                                setCanalActual(null)
                              } catch (err) { showToast('error', 'Error', err.message) }
                            }}>
                            <i className="fas fa-trash"></i> Eliminar
                          </button>
                        )}
                      </div>
                    )
                  }

                  const esPropio  = msg.user_id === user?.id
                  const archivos  = msg.chat_mensajes_archivos || []
                  const ticketData = msg.tickets
                  const contenidoVisible = msg.contenido || ''
                  if (contenidoVisible.startsWith(DM_INVITE_PREFIX) ||
                      contenidoVisible.startsWith(DM_ACCEPTED_PREFIX) ||
                      contenidoVisible.startsWith(DM_REJECTED_PREFIX)) return null
                  return (
                    <div key={msg.id} id={`msg-${msg.id}`}
                      className={`chat-mensaje ${esPropio ? 'own' : ''} ${msg.anclado ? 'anclado' : ''}`}
                      onContextMenu={e => onMsgRightClick(e, msg)}
                    >
                      <div className="chat-mensaje-avatar" style={{ background: getAvatarColor(msg.user_id) }}>
                        {getInitials(msg.profiles?.nombre)}
                      </div>
                      <div className="chat-mensaje-body">
                        <div className="chat-mensaje-meta">
                          <strong>{msg.profiles?.nombre || 'Desconocido'}</strong>
                          <span>{formatFecha(msg.created_at)}</span>
                          {msg.editado && <span className="msg-editado">(editado)</span>}
                          {msg.anclado && <span className="msg-pin-badge"><i className="fas fa-thumbtack"></i></span>}
                        </div>
                        {contenidoVisible
                          ? <div className="chat-mensaje-text" dangerouslySetInnerHTML={{ __html: contenidoVisible }} />
                          : archivos.length > 0
                            ? <div className="chat-mensaje-text msg-solo-archivo"><i className="fas fa-paperclip"></i> {archivos.length === 1 ? 'Archivo adjunto' : `${archivos.length} archivos adjuntos`}</div>
                            : null}

                        {/* FIX: navegar directamente al ticket usando router state */}
                        {ticketData && (
                          <div
                            className="msg-ticket-ref"
                            onClick={() => navigate('/tickets', { state: { abrirTicketId: ticketData.id } })}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="msg-ticket-ref-header">
                              <i className="fas fa-ticket-alt"></i>
                              <span>Ticket #{ticketData.numero}</span>
                              {ticketData.estado && (() => {
                                const ec = ESTADO_COLORS[ticketData.estado] || { bg: '#f0f0f0', color: '#666' }
                                return <span className="msg-ticket-estado" style={{ background: ec.bg, color: ec.color }}>{ticketData.estado}</span>
                              })()}
                            </div>
                            <div className="msg-ticket-asunto">{ticketData.asunto}</div>
                          </div>
                        )}

                        {archivos.length > 0 && (
                          <div className="msg-archivos">
                            {archivos.map(a => {
                              const isImg = a.mime_type?.startsWith('image/')
                              return isImg ? (
                                <div key={a.id} className="msg-archivo-img-wrap" onClick={() => descargarArchivo(a.id, a.nombre_original)} title={`Ver/descargar ${a.nombre_original}`}>
                                  <img
                                    src={`/api/chat/archivos/${a.id}/preview`}
                                    alt={a.nombre_original}
                                    className="msg-archivo-img"
                                    onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                                  />
                                  <div className="msg-archivo-chip" style={{ display: 'none' }}>
                                    <i className="fas fa-image"></i>
                                    <div className="msg-archivo-info">
                                      <span className="msg-archivo-nombre">{a.nombre_original}</span>
                                      {a.tamanio && <span className="msg-archivo-size">{formatBytes(a.tamanio)}</span>}
                                    </div>
                                    <i className="fas fa-download msg-archivo-dl"></i>
                                  </div>
                                </div>
                              ) : (
                                <div key={a.id} className="msg-archivo-chip" onClick={() => descargarArchivo(a.id, a.nombre_original)} title={`Descargar ${a.nombre_original}`}>
                                  <i className={`fas ${getFileIcon(a.mime_type)}`}></i>
                                  <div className="msg-archivo-info">
                                    <span className="msg-archivo-nombre">{a.nombre_original}</span>
                                    {a.tamanio && <span className="msg-archivo-size">{formatBytes(a.tamanio)}</span>}
                                  </div>
                                  <i className="fas fa-download msg-archivo-dl"></i>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={mensajesEndRef} />
              </div>

              {/* ── Input area ── */}
              <div className="chat-input">
                {ticketRef && (
                  <div className="pending-ticket-ref">
                    <i className="fas fa-ticket-alt"></i>
                    <span>#{ticketRef.numero} — {ticketRef.asunto}</span>
                    <button onClick={() => setTicketRef(null)}><i className="fas fa-times"></i></button>
                  </div>
                )}
                {pendingFiles.length > 0 && (
                  <div className="pending-files">
                    {pendingFiles.map((f, i) => (
                      <div key={i} className="pending-file">
                        <i className={`fas ${getFileIcon(f.type)}`}></i>
                        <span>{f.name}</span><small>{formatBytes(f.size)}</small>
                        <button onClick={() => removePendingFile(i)}><i className="fas fa-times"></i></button>
                      </div>
                    ))}
                  </div>
                )}
                {pendingImages.length > 0 && (
                  <div className="pending-images">
                    {pendingImages.map((img, i) => (
                      <div key={i} className="pending-image-item">
                        <img src={img.previewUrl} alt={img.file.name} className="pending-image-thumb" />
                        <button className="pending-image-remove" onClick={() => removePendingImage(i)} title="Eliminar imagen">
                          <i className="fas fa-times"></i>
                        </button>
                        <span className="pending-image-name">{img.file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {showTicketPicker && (
                  <TicketPicker
                    tickets={allTickets}
                    onSelect={t => { setTicketRef(t); setShowTicketPicker(false) }}
                    onClose={() => setShowTicketPicker(false)}
                  />
                )}

                <div className="chat-editor-wrap">
                  <div className="chat-editor-toolbar">
                    <div className="toolbar-group">
                      <button type="button" className="chat-editor-btn" title="Negrita (Ctrl+B)"
                        onMouseDown={e => { e.preventDefault(); execFormat('bold') }}>
                        <i className="fas fa-bold"></i>
                      </button>
                      <button type="button" className="chat-editor-btn" title="Cursiva (Ctrl+I)"
                        onMouseDown={e => { e.preventDefault(); execFormat('italic') }}>
                        <i className="fas fa-italic"></i>
                      </button>
                      <button type="button" className="chat-editor-btn" title="Subrayado (Ctrl+U)"
                        onMouseDown={e => { e.preventDefault(); execFormat('underline') }}>
                        <i className="fas fa-underline"></i>
                      </button>
                      <button type="button" className="chat-editor-btn" title="Tachado"
                        onMouseDown={e => { e.preventDefault(); execFormat('strikeThrough') }}>
                        <i className="fas fa-strikethrough"></i>
                      </button>
                    </div>
                    <div className="chat-editor-sep"></div>
                    <div className="toolbar-group">
                      <button type="button" className="chat-editor-btn" title="Lista con viñetas"
                        onMouseDown={e => { e.preventDefault(); execFormat('insertUnorderedList') }}>
                        <i className="fas fa-list-ul"></i>
                      </button>
                      <button type="button" className="chat-editor-btn" title="Lista numerada"
                        onMouseDown={e => { e.preventDefault(); execFormat('insertOrderedList') }}>
                        <i className="fas fa-list-ol"></i>
                      </button>
                    </div>
                    <div className="chat-editor-sep"></div>
                    <div className="toolbar-group">
                      <button type="button" className="chat-editor-btn" title="Cita"
                        onMouseDown={e => { e.preventDefault(); execFormat('formatBlock', 'blockquote') }}>
                        <i className="fas fa-quote-right"></i>
                      </button>
                      <button type="button" className="chat-editor-btn" title="Código"
                        onMouseDown={e => { e.preventDefault(); execFormat('formatBlock', 'pre') }}>
                        <i className="fas fa-code"></i>
                      </button>
                      <button type="button" className="chat-editor-btn" title="Limpiar formato"
                        onMouseDown={e => { e.preventDefault(); execFormat('removeFormat') }}>
                        <i className="fas fa-remove-format"></i>
                      </button>
                    </div>
                    <div style={{ flex: 1 }}></div>
                    <div className="toolbar-group toolbar-actions">
                      <button
                        type="button"
                        className={`chat-editor-btn toolbar-action-btn ${ticketRef ? 'active' : ''}`}
                        title="Referenciar ticket"
                        onClick={() => setShowTicketPicker(v => !v)}
                      >
                        <i className="fas fa-ticket-alt"></i>
                        <span className="toolbar-btn-label">Ticket</span>
                      </button>
                      <button
                        type="button"
                        className="chat-editor-btn toolbar-action-btn"
                        title="Adjuntar archivo o imagen"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <i className="fas fa-paperclip"></i>
                        <span className="toolbar-btn-label">Adjuntar</span>
                      </button>
                    </div>
                  </div>

                  {editingMsg ? (
                    <div className="chat-edit-row">
                      <textarea
                        ref={textareaRef}
                        className="chat-edit-textarea"
                        placeholder="Editar mensaje..."
                        value={editingMsgText}
                        onChange={e => setEditingMsgText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={2}
                      />
                      <button className="chat-send-btn" onClick={guardarEdicionMsg} title="Guardar (Enter)">
                        <i className="fas fa-check"></i>
                      </button>
                      <button className="chat-cancel-btn" onClick={() => { setEditingMsg(null); setEditingMsgText('') }} title="Cancelar (Esc)">
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ) : (
                    <div className="chat-editor-body-row">
                      <div
                        ref={editorRef}
                        className="chat-editor-content"
                        contentEditable
                        suppressContentEditableWarning
                        data-placeholder="Escribe un mensaje… (Enter para enviar, Shift+Enter para nueva línea)"
                        onInput={e => setMensajeText(e.currentTarget.innerText)}
                        onKeyDown={handleKeyDownEditor}
                        onPaste={handlePaste}
                      />
                      <button className="chat-send-btn" onClick={enviarMensaje} title="Enviar (Enter)">
                        <i className="fas fa-paper-plane"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {msgCtxMenu && (
        <MsgContextMenu x={msgCtxMenu.x} y={msgCtxMenu.y} msg={msgCtxMenu.msg}
          userId={user?.id} isAdmin={isAdmin()}
          onClose={() => setMsgCtxMenu(null)}
          onEdit={iniciarEdicionMsg} onDelete={eliminarMensaje} onPin={anclarMensaje}
        />
      )}
      {canalCtxMenu && (
        <CanalContextMenu x={canalCtxMenu.x} y={canalCtxMenu.y} canal={canalCtxMenu.canal}
          prefs={prefs} isAdmin={isAdmin()}
          onClose={() => setCanalCtxMenu(null)}
          onPin={handlePin} onMute={handleMute}
          onHide={handleHide} onUnhide={handleUnhide}
          onEdit={openEditModalForCanal} onDelete={eliminarCanalObj}
        />
      )}

      {showCanalModal && (
        <div className="modal" style={{ display: 'flex' }} onClick={e => e.target.classList.contains('modal') && setShowCanalModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h2><i className="fas fa-hashtag"></i> Nuevo Canal</h2>
              <button className="modal-close" onClick={() => setShowCanalModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={crearCanal}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre del canal *</label>
                  <input type="text" placeholder="ej: soporte, proyectos, general..." required value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <input type="text" placeholder="¿Para qué se usará este canal?" value={nuevoDesc} onChange={e => setNuevoDesc(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Miembros</label>
                  <MiembrosSelector operarios={operarios} userId={user?.id} selected={selectedMiembros} onChange={setSelectedMiembros} showQuickFilters />
                </div>
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-primary"><i className="fas fa-plus"></i> Crear canal</button>
                <button type="button" className="btn-secondary" onClick={() => setShowCanalModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && editingCanal && (
        <div className="modal" style={{ display: 'flex' }} onClick={e => e.target.classList.contains('modal') && setShowEditModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h2><i className="fas fa-pen"></i> Editar Canal</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={guardarEdicion}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input type="text" required value={editNombre} onChange={e => setEditNombre(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <input type="text" placeholder="Descripción del canal" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Miembros</label>
                  <MiembrosSelector operarios={operarios} userId={user?.id} selected={editMiembros} onChange={setEditMiembros} showQuickFilters />
                </div>
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-primary" disabled={editLoading}>
                  {editLoading ? <><i className="fas fa-spinner fa-spin"></i> Guardando...</> : <><i className="fas fa-save"></i> Guardar cambios</>}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showDirectoModal && (
        <div className="modal" style={{ display: 'flex' }} onClick={e => e.target.classList.contains('modal') && setShowDirectoModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h2><i className="fas fa-user"></i> Mensaje Directo</h2>
              <button className="modal-close" onClick={() => setShowDirectoModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body">
              <p className="modal-hint">Selecciona el compañero al que quieres escribir:</p>
              <div className="operarios-checkboxes">
                {operarios.filter(o => o.id !== user?.id).map(op => (
                  <div key={op.id} className="operario-checkbox-item" onClick={() => crearDirecto(op.id)}>
                    <div className="avatar" style={{ background: getAvatarColor(op.id) }}>{getInitials(op.nombre)}</div>
                    <div className="operario-info">
                      <span className="nombre">{op.nombre || op.email}</span>
                      {op.rol === 'admin' && <span className="badge-rol admin">Admin</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-buttons">
              <button type="button" className="btn-secondary" onClick={() => setShowDirectoModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}