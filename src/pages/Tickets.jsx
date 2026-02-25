import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getTickets, getTicket, createTicket, updateTicket, deleteTicket,
  getEmpresas, getOperarios, getDispositivos,
  assignOperarios, removeOperario,
  getTicketComentarios, createTicketComentario, deleteTicketComentario,
  uploadTicketArchivo, deleteArchivo, getArchivoUrl,
  updateTicketNotas
} from '../services/api'
import './Tickets.css'

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

function escHtml(str) {
  if (str == null) return ''
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatFecha(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function formatFechaCorta(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit'
  })
}

function formatHoras(horas) {
  if (!horas || horas <= 0) return '< 1h'
  if (horas < 1) return `${Math.round(horas * 60)}min`
  if (horas < 24) return `${horas.toFixed(1)}h`
  const dias = Math.floor(horas / 24)
  const restH = Math.round(horas % 24)
  if (dias < 30) return restH > 0 ? `${dias}d ${restH}h` : `${dias}d`
  const meses = Math.floor(dias / 30)
  const restD = dias % 30
  return restD > 0 ? `${meses}m ${restD}d` : `${meses}m`
}

function iconoArchivo(mime) {
  if (!mime) return <i className="fas fa-paperclip"></i>
  if (mime.startsWith('image/'))                           return <i className="fas fa-image" style={{ color: '#3b82f6' }}></i>
  if (mime === 'application/pdf')                          return <i className="fas fa-file-pdf" style={{ color: '#ef4444' }}></i>
  if (mime.includes('word'))                               return <i className="fas fa-file-word" style={{ color: '#2563eb' }}></i>
  if (mime.includes('excel') || mime.includes('sheet'))    return <i className="fas fa-file-excel" style={{ color: '#16a34a' }}></i>
  if (mime.includes('zip') || mime.includes('compressed')) return <i className="fas fa-file-archive" style={{ color: '#d97706' }}></i>
  if (mime.startsWith('video/'))                           return <i className="fas fa-file-video" style={{ color: '#9333ea' }}></i>
  return <i className="fas fa-file" style={{ color: '#64748b' }}></i>
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function PrioridadBadge({ p }) {
  const colors = { Baja: '#22c55e', Media: '#3b82f6', Alta: '#f59e0b', Urgente: '#ef4444' }
  return (
    <span className={`prioridad-badge prioridad-${p}`}>
      <i className="fas fa-circle" style={{ color: colors[p] || '#94a3b8', fontSize: '0.7rem' }}></i> {p}
    </span>
  )
}

function EstadoBadge({ e }) {
  return <span className={`estado-badge estado-${e}`}>{e}</span>
}

export default function Tickets() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [tickets, setTickets]         = useState([])
  const [allTickets, setAllTickets]   = useState([])
  const [empresas, setEmpresas]       = useState([])
  const [operarios, setOperarios]     = useState([])
  const [stats, setStats]             = useState({})
  const [loading, setLoading]         = useState(true)

  const [estadoFilter, setEstadoFilter]       = useState('all')
  const [prioridadFilter, setPrioridadFilter] = useState('all')
  const [operarioFilter, setOperarioFilter]   = useState('all')
  const [empresaFilter, setEmpresaFilter]     = useState('all')
  const [searchTerm, setSearchTerm]           = useState('')
  const [filtroDesde, setFiltroDesde]         = useState('')
  const [filtroHasta, setFiltroHasta]         = useState('')
  const searchTimer = useRef(null)

  const [vistaDetalle, setVistaDetalle]         = useState(false)
  const [ticketActual, setTicketActual]         = useState(null)
  const [comentarios, setComentarios]           = useState([])
  const [activeTab, setActiveTab]               = useState('comentarios')
  const [notasValue, setNotasValue]             = useState('')

  const [showTicketModal, setShowTicketModal]         = useState(false)
  const [editingTicket, setEditingTicket]             = useState(null)
  const [modalEmprId, setModalEmprId]                 = useState('')
  const [modalDispositivos, setModalDispositivos]     = useState([])
  const [modalOperariosCheck, setModalOperariosCheck] = useState([])

  const [showAsignarModal, setShowAsignarModal]           = useState(false)
  const [asignarOperariosCheck, setAsignarOperariosCheck] = useState([])
  const [historialAbierto, setHistorialAbierto]           = useState(false)

  const [comentarioText, setComentarioText] = useState('')

  const archivoInputRef = useRef(null)
  const notasTimer      = useRef(null)
  const notasGuardado   = useRef(null)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!loading && allTickets.length > 0) applyFilters()
  }, [estadoFilter, prioridadFilter, operarioFilter, empresaFilter, filtroDesde, filtroHasta, searchTerm, allTickets])

  async function loadData() {
    setLoading(true)
    try {
      const [ticketsData, empresasData, operariosData] = await Promise.all([
        getTickets(), getEmpresas(), getOperarios(),
      ])
      setAllTickets(ticketsData || [])
      setTickets(ticketsData || [])
      setEmpresas(empresasData || [])
      setOperarios(operariosData || [])
      calcStats(ticketsData || [])
    } catch (error) {
      showToast('error', 'Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  function calcStats(list) {
    setStats({
      total:       list.length,
      pendientes:  list.filter(t => t.estado === 'Pendiente').length,
      en_curso:    list.filter(t => t.estado === 'En curso').length,
      completados: list.filter(t => t.estado === 'Completado').length,
      facturados:  list.filter(t => t.estado === 'Facturado').length,
      urgentes:    list.filter(t => t.prioridad === 'Urgente').length,
    })
  }

  function applyFilters() {
    let filtered = [...allTickets]
    if (searchTerm && searchTerm.trim() !== '') {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(t =>
        t.asunto?.toLowerCase().includes(search) ||
        t.descripcion?.toLowerCase().includes(search) ||
        t.numero?.toString().includes(search) ||
        t.empresas?.nombre?.toLowerCase().includes(search)
      )
    }
    if (estadoFilter !== 'all') {
      if (estadoFilter === 'abiertos') {
        filtered = filtered.filter(t => t.estado === 'Pendiente' || t.estado === 'En curso')
      } else {
        filtered = filtered.filter(t => t.estado === estadoFilter)
      }
    }
    if (prioridadFilter !== 'all') filtered = filtered.filter(t => t.prioridad === prioridadFilter)
    if (operarioFilter !== 'all') {
      filtered = filtered.filter(t => (t.ticket_asignaciones || []).some(a => a.user_id === operarioFilter))
    }
    if (empresaFilter !== 'all') filtered = filtered.filter(t => t.empresa_id === empresaFilter)
    if (filtroDesde) filtered = filtered.filter(t => new Date(t.created_at) >= new Date(filtroDesde))
    if (filtroHasta) {
      const hasta = new Date(filtroHasta)
      hasta.setHours(23, 59, 59, 999)
      filtered = filtered.filter(t => new Date(t.created_at) <= hasta)
    }
    setTickets(filtered)
  }

  function onSearchChange(e) { setSearchTerm(e.target.value) }

  async function abrirTicket(id) {
    setVistaDetalle(true)
    setActiveTab('comentarios')
    try {
      const data = await getTicket(id)
      setTicketActual(data)
      setNotasValue(data.notas || '')
      setComentarios(data.ticket_comentarios || [])
    } catch (error) {
      showToast('error', 'Error', error.message)
      setVistaDetalle(false)
    }
  }

  function volverALista() {
    setVistaDetalle(false)
    setTicketActual(null)
    setComentarios([])
    setActiveTab('comentarios')
    setComentarioText('')
    loadData()
  }

  function onNotasChange(e) {
    const val = e.target.value
    setNotasValue(val)
    if (notasGuardado.current) notasGuardado.current.textContent = 'Guardando...'
    clearTimeout(notasTimer.current)
    notasTimer.current = setTimeout(async () => {
      if (!ticketActual) return
      try {
        await updateTicketNotas(ticketActual.id, val)
        setTicketActual(prev => ({ ...prev, notas: val }))
        if (notasGuardado.current) {
          notasGuardado.current.textContent = 'Guardado ✓'
          setTimeout(() => { if (notasGuardado.current) notasGuardado.current.textContent = '' }, 2000)
        }
      } catch {
        if (notasGuardado.current) notasGuardado.current.textContent = 'Error al guardar'
      }
    }, 1200)
  }

  async function switchTab(tab) {
    setActiveTab(tab)
    if (tab === 'comentarios' && ticketActual) {
      try {
        const data = await getTicketComentarios(ticketActual.id)
        setComentarios(data || [])
      } catch (error) {
        showToast('error', 'Error', error.message)
      }
    }
  }

  async function cambiarEstado(nuevoEstado) {
    if (!ticketActual) return
    try {
      await updateTicket(ticketActual.id, { estado: nuevoEstado })
      showToast('success', 'Actualizado', `Estado: "${nuevoEstado}"`)
      const updated = await getTicket(ticketActual.id)
      setTicketActual(updated)
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  function abrirModalAsignar() {
    const asignadosIds = (ticketActual?.ticket_asignaciones || []).map(a => a.user_id)
    setAsignarOperariosCheck(operarios.map(op => ({ ...op, checked: asignadosIds.includes(op.id) })))
    setShowAsignarModal(true)
  }

  function toggleAsignarOperario(i) {
    const updated = [...asignarOperariosCheck]
    updated[i] = { ...updated[i], checked: !updated[i].checked }
    setAsignarOperariosCheck(updated)
  }

  function toggleModalOperario(i) {
    const updated = [...modalOperariosCheck]
    updated[i] = { ...updated[i], checked: !updated[i].checked }
    setModalOperariosCheck(updated)
  }

  async function guardarAsignaciones() {
    const seleccionados = asignarOperariosCheck.filter(o => o.checked).map(o => o.id)
    if (!seleccionados.length) { showToast('warning', 'Aviso', 'Selecciona al menos un operario'); return }
    try {
      await assignOperarios(ticketActual.id, seleccionados)
      const updated = await getTicket(ticketActual.id)
      setTicketActual(updated)
      setShowAsignarModal(false)
      showToast('success', 'Operarios asignados', '')
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  async function quitarOperario(userId) {
    if (!ticketActual) return
    if (!confirm('¿Quitar este operario del ticket?')) return
    try {
      await removeOperario(ticketActual.id, userId)
      const updated = await getTicket(ticketActual.id)
      setTicketActual(updated)
      showToast('success', 'Operario eliminado', '')
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  async function subirArchivos(e) {
    const files = Array.from(e.target.files)
    if (!files.length || !ticketActual) return
    try {
      await uploadTicketArchivo(ticketActual.id, files)
      const updated = await getTicket(ticketActual.id)
      setTicketActual(updated)
      showToast('success', 'Archivos subidos', `${files.length} archivo(s) añadido(s)`)
    } catch (error) {
      showToast('error', 'Error al subir archivos', error.message)
    } finally {
      e.target.value = ''
    }
  }

  async function eliminarArchivo(archivoId) {
    if (!confirm('¿Eliminar este archivo?')) return
    try {
      await deleteArchivo(archivoId)
      const updated = await getTicket(ticketActual.id)
      setTicketActual(updated)
      showToast('success', 'Archivo eliminado', '')
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  async function descargarArchivo(archivoId, nombre) {
    try {
      const { url } = await getArchivoUrl(archivoId)
      const a = document.createElement('a')
      a.href = url; a.download = nombre; a.target = '_blank'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    } catch {
      showToast('error', 'Error', 'No se pudo descargar el archivo')
    }
  }

  async function enviarComentario() {
    if (!ticketActual) return
    const textoLimpio = comentarioText.replace(/<[^>]*>/g, '').trim()
    if (!textoLimpio) {
      showToast('warning', 'Aviso', 'Escribe algo para comentar'); return
    }
    try {
      await createTicketComentario(ticketActual.id, comentarioText, [])
      setComentarioText('')
      // Limpiar el editor rich text
      const editor = document.querySelector('.editor-content')
      if (editor) editor.innerHTML = ''
      const data = await getTicketComentarios(ticketActual.id)
      setComentarios(data || [])
      showToast('success', 'Comentario añadido', '')
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  async function eliminarComentario(id) {
    if (!confirm('¿Eliminar este comentario?')) return
    try {
      await deleteTicketComentario(id)
      const data = await getTicketComentarios(ticketActual.id)
      setComentarios(data || [])
      showToast('success', 'Eliminado', 'Comentario eliminado')
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  async function abrirModalNuevoTicket() {
    setEditingTicket(null)
    setModalEmprId('')
    setModalDispositivos([])
    setModalOperariosCheck(operarios.map(op => ({ ...op, checked: false })))
    setShowTicketModal(true)
  }

  async function abrirModalEditarTicket(t) {
    setEditingTicket(t)
    setModalEmprId(t.empresa_id || '')
    const asignadosIds = (t.ticket_asignaciones || []).map(a => a.user_id)
    setModalOperariosCheck(operarios.map(op => ({ ...op, checked: asignadosIds.includes(op.id) })))
    if (t.empresa_id) {
      try {
        const dispositivos = await getDispositivos(t.empresa_id)
        setModalDispositivos(dispositivos?.filter(d => d.categoria !== 'correo') || [])
      } catch { setModalDispositivos([]) }
    }
    setShowTicketModal(true)
  }

  async function onModalEmpresaChange(empresaId) {
    setModalEmprId(empresaId)
    setModalDispositivos([])
    if (!empresaId) return
    try {
      const dispositivos = await getDispositivos(empresaId)
      setModalDispositivos(dispositivos?.filter(d => d.categoria !== 'correo') || [])
    } catch { setModalDispositivos([]) }
  }

  async function saveTicket(e) {
    e.preventDefault()
    const formData       = new FormData(e.target)
    const empresa_id     = formData.get('empresa_id')
    const dispositivo_id = formData.get('dispositivo_id') || null
    const asunto         = formData.get('asunto')?.trim()
    const descripcion    = formData.get('descripcion')?.trim() || null
    const prioridad      = formData.get('prioridad')
    const estado         = formData.get('estado')

    if (!empresa_id || !asunto) { showToast('error', 'Error', 'Empresa y asunto son obligatorios'); return }

    const operariosSeleccionados = modalOperariosCheck.filter(o => o.checked).map(o => o.id)
    const btn = e.target.querySelector('button[type="submit"]')
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...' }

    try {
      if (editingTicket) {
        await updateTicket(editingTicket.id, { asunto, descripcion, prioridad, estado, dispositivo_id })
        if (operariosSeleccionados.length > 0) await assignOperarios(editingTicket.id, operariosSeleccionados)
        showToast('success', 'Ticket actualizado', '')
        if (ticketActual?.id === editingTicket.id) {
          const updated = await getTicket(editingTicket.id)
          setTicketActual(updated)
        }
      } else {
        await createTicket({ empresa_id, dispositivo_id, asunto, descripcion, prioridad, estado, operarios: operariosSeleccionados })
        showToast('success', 'Ticket creado', asunto)
      }
      setShowTicketModal(false)
      await loadData()
    } catch (error) {
      showToast('error', 'Error', error.message)
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar' }
    }
  }

  async function eliminarTicket() {
    if (!ticketActual) return
    if (!confirm(`¿Eliminar el ticket #${ticketActual.numero}? Esta acción no se puede deshacer.`)) return
    try {
      await deleteTicket(ticketActual.id)
      showToast('success', 'Ticket eliminado', '')
      volverALista()
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  async function eliminarTicketLista(id) {
    if (!confirm('¿Eliminar este ticket?')) return
    try {
      await deleteTicket(id)
      showToast('success', 'Ticket eliminado', '')
      await loadData()
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  function showToast(type, title, message) {
    const container = document.getElementById('toastContainer')
    if (!container) return
    const toast = document.createElement('div')
    toast.className = `toast ${type}`
    const icons = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-triangle' }
    toast.innerHTML = `
      <i class="fas fa-${icons[type] || 'info-circle'}"></i>
      <div class="toast-content">
        <div class="toast-title">${escHtml(title)}</div>
        ${message ? `<div class="toast-message">${escHtml(message)}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `
    container.appendChild(toast)
    setTimeout(() => { if (toast.parentElement) toast.remove() }, 5000)
  }

  function handleLogout() {
    if (confirm('¿Cerrar sesión?')) { logout(); navigate('/login') }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Cargando...</p>
      </div>
    )
  }

  function Topbar() {
    return (
      <>
        <header className="topbar">
          <div className="logo">
            <img src="/img/logoHola.png" alt="Logo" />
            <span className="logo-text">Hola Informática</span>
          </div>
          <nav className="top-nav">
            <Link to="/" className="nav-link"><i className="fas fa-building"></i> Empresas</Link>
            {isAdmin() && <Link to="/" className="nav-link"><i className="fas fa-users"></i> Usuarios</Link>}
            <Link to="/tickets" className="nav-link active"><i className="fas fa-headset"></i> Tickets</Link>
            {isAdmin() && <Link to="/estadisticas" className="nav-link"><i className="fas fa-chart-bar"></i> Estadísticas</Link>}
            <Link to="/chat" className="nav-link"><i className="fas fa-comments"></i> Chat</Link>
          </nav>
          <div className="user-area">
            <div className="user-info">
              <i className="fas fa-user-circle"></i>
              <span>{user?.nombre || user?.email}</span>
            </div>
            <button className="btn-logout" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i><span>Salir</span>
            </button>
          </div>
        </header>
        <nav className="bottom-nav">
          <Link to="/" className="bottom-nav-item"><i className="fas fa-building"></i><span>Empresas</span></Link>
          {isAdmin() && <Link to="/" className="bottom-nav-item"><i className="fas fa-users"></i><span>Usuarios</span></Link>}
          <Link to="/tickets" className="bottom-nav-item active"><i className="fas fa-headset"></i><span>Tickets</span></Link>
          {isAdmin() && <Link to="/estadisticas" className="bottom-nav-item"><i className="fas fa-chart-bar"></i><span>Stats</span></Link>}
          <Link to="/chat" className="bottom-nav-item"><i className="fas fa-comments"></i><span>Chat</span></Link>
        </nav>
      </>
    )
  }

  function TicketModal() {
    return (
      <div
        className="modal"
        style={{ display: 'flex' }}
        onClick={e => e.target.classList.contains('modal') && setShowTicketModal(false)}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h2>
              <i className="fas fa-ticket-alt"></i>{' '}
              {editingTicket ? `Editar Ticket #${editingTicket.numero}` : 'Nuevo Ticket'}
            </h2>
            <button className="modal-close" onClick={() => setShowTicketModal(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <form onSubmit={saveTicket}>
            <div className="modal-body">
              <div className="form-group">
                <label>Empresa *</label>
                <select name="empresa_id" value={modalEmprId} onChange={e => onModalEmpresaChange(e.target.value)} required>
                  <option value="">Seleccionar empresa...</option>
                  {empresas.map(e => (<option key={e.id} value={e.id}>{e.nombre}</option>))}
                </select>
              </div>
              <div className="form-group">
                <label>Dispositivo</label>
                <select name="dispositivo_id" defaultValue={editingTicket?.dispositivo_id || ''}>
                  <option value="">Sin dispositivo</option>
                  {modalDispositivos.map(d => (<option key={d.id} value={d.id}>[{d.tipo || d.categoria}] {d.nombre}</option>))}
                </select>
              </div>
              <div className="form-group">
                <label>Asunto *</label>
                <input type="text" name="asunto" defaultValue={editingTicket?.asunto} required placeholder="Describe brevemente el problema..." />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea name="descripcion" defaultValue={editingTicket?.descripcion} rows={3} placeholder="Detalles adicionales..." />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Prioridad</label>
                  <select name="prioridad" defaultValue={editingTicket?.prioridad || 'Media'}>
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Estado</label>
                  <select name="estado" defaultValue={editingTicket?.estado || 'Pendiente'}>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En curso">En curso</option>
                    <option value="Completado">Completado</option>
                    <option value="Facturado">Facturado</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Asignar operarios</label>
                <div className="operarios-checkboxes">
                  {modalOperariosCheck.length === 0
                    ? <p style={{ color: 'var(--gray)', fontSize: '0.88rem' }}>No hay operarios disponibles.</p>
                    : modalOperariosCheck.map((op, i) => (
                        <div key={op.id} className={`operario-check-item ${op.checked ? 'checked' : ''}`} onClick={() => toggleModalOperario(i)}>
                          <div className="operario-check-avatar" style={{ background: getAvatarColor(op.id) }}>{getInitials(op.nombre)}</div>
                          <span className="operario-check-nombre">{op.nombre}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{op.rol}</span>
                          <div className="operario-check-tick">{op.checked ? <i className="fas fa-check"></i> : ''}</div>
                        </div>
                      ))
                  }
                </div>
              </div>
            </div>
            <div className="modal-buttons">
              <button type="submit" className="btn-primary"><i className="fas fa-save"></i> Guardar</button>
              <button type="button" className="btn-secondary" onClick={() => setShowTicketModal(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  function AsignarModal() {
    return (
      <div
        className="modal"
        style={{ display: 'flex' }}
        onClick={e => e.target.classList.contains('modal') && setShowAsignarModal(false)}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h2><i className="fas fa-user-plus"></i> Asignar Operarios</h2>
            <button className="modal-close" onClick={() => setShowAsignarModal(false)}><i className="fas fa-times"></i></button>
          </div>
          <div className="modal-body">
            <div className="operarios-checkboxes">
              {asignarOperariosCheck.map((op, i) => (
                <div key={op.id} className={`operario-check-item ${op.checked ? 'checked' : ''}`} onClick={() => toggleAsignarOperario(i)}>
                  <div className="operario-check-avatar" style={{ background: getAvatarColor(op.id) }}>{getInitials(op.nombre)}</div>
                  <span className="operario-check-nombre">{op.nombre}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{op.rol}</span>
                  <div className="operario-check-tick">{op.checked ? <i className="fas fa-check"></i> : ''}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-buttons">
            <button className="btn-primary" onClick={guardarAsignaciones}><i className="fas fa-save"></i> Guardar</button>
            <button className="btn-secondary" onClick={() => setShowAsignarModal(false)}>Cancelar</button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // VISTA DETALLE
  // ============================================================
  if (vistaDetalle && ticketActual) {
    const asignados     = ticketActual.ticket_asignaciones || []
    const archivos      = ticketActual.ticket_archivos     || []
    const historial     = ticketActual.ticket_historial    || []
    const estadoCerrado = ticketActual.estado === 'Completado' || ticketActual.estado === 'Facturado'

    const colorMap = {
      creacion: '#22c55e', estado: '#3b82f6', asignacion: '#9333ea',
      desasignacion: '#f59e0b', prioridad: '#f59e0b', archivo: '#0891b2',
      horas: '#16a34a', comentario: '#0066ff',
    }
    const historialIconos = {
      creacion: 'star', estado: 'exchange-alt', asignacion: 'user-plus',
      desasignacion: 'user-minus', prioridad: 'flag', horas: 'clock',
      archivo: 'paperclip', comentario: 'comment',
    }

    // Historial filtrado y ordenado (reutilizable)
    const historialFiltrado = [...historial]
      .filter(h => h.tipo !== 'nota_interna')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return (
      <div className="tickets-page detalle-view-active">
        <div className="toast-container" id="toastContainer"></div>

        <input type="file" ref={archivoInputRef} multiple style={{ display: 'none' }} onChange={subirArchivos} />

        <Topbar />

        <main className="main-content detalle-ticket">

          <div className="detalle-header">
            <button className="btn-back" onClick={volverALista} style={{ padding: '6px 12px', fontSize: '0.85rem', flexShrink: 0 }}>
              <i className="fas fa-arrow-left"></i> Tickets
            </button>
            <span className="ticket-numero" style={{ flexShrink: 0 }}>#{ticketActual.numero}</span>
            <div className="detalle-header-titulo">
              <h2 className="detalle-header-asunto">
                {ticketActual.empresas?.nombre && (
                  <span className="detalle-header-empresa-inline">{ticketActual.empresas.nombre}</span>
                )}
                {ticketActual.empresas?.nombre && <span className="detalle-header-sep">—</span>}
                <span className="detalle-header-asunto-text">{ticketActual.asunto}</span>
              </h2>
            </div>
            <div className="detalle-acciones">
              <select value={ticketActual.estado} onChange={e => cambiarEstado(e.target.value)} className="estado-select">
                <option value="Pendiente">Pendiente</option>
                <option value="En curso">En curso</option>
                <option value="Completado">Completado</option>
                <option value="Facturado">Facturado</option>
              </select>
              <button className="btn-primary btn-sm" onClick={() => abrirModalEditarTicket(ticketActual)}>
                <i className="fas fa-edit"></i> Editar
              </button>
              {isAdmin() && (
                <button className="btn-action btn-delete" onClick={eliminarTicket}
                  style={{ background: '#fee2e2', color: '#dc2626', width: '34px', height: '34px' }}>
                  <i className="fas fa-trash"></i>
                </button>
              )}
            </div>
          </div>

          <div className="detalle-ticket-body-wrapper">
            <div className="detalle-body">

              {/* SIDEBAR */}
              <aside className="detalle-sidebar">

                <div className="sidebar-card">
                  <h4><i className="fas fa-info-circle"></i> Información</h4>
                  <div className="info-row"><span className="info-row-label">Empresa</span><span className="info-row-value">{ticketActual.empresas?.nombre || '—'}</span></div>
                  <div className="info-row"><span className="info-row-label">Prioridad</span><span className="info-row-value"><PrioridadBadge p={ticketActual.prioridad} /></span></div>
                  <div className="info-row"><span className="info-row-label">Estado</span><span className="info-row-value"><EstadoBadge e={ticketActual.estado} /></span></div>
                  {ticketActual.dispositivos && (
                    <div className="info-row">
                      <span className="info-row-label">Equipo</span>
                      <span className="info-row-value"><i className="fas fa-desktop" style={{ color: 'var(--primary)' }}></i> {ticketActual.dispositivos.nombre}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-row-label">⏱ Tiempo</span>
                    <span className="info-row-value">
                      {estadoCerrado ? (
                        <strong style={{ color: 'var(--gray)' }}>{formatHoras(ticketActual.horas_transcurridas || 0)}<i className="fas fa-lock" style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: '4px' }}></i></strong>
                      ) : (
                        <strong style={{ color: 'var(--primary)' }}>{formatHoras(ticketActual.horas_transcurridas || 0)}</strong>
                      )}
                    </span>
                  </div>
                  {ticketActual.descripcion && (
                    <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span className="info-row-label">Descripción</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--dark)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{ticketActual.descripcion}</span>
                    </div>
                  )}
                  <div className="info-row"><span className="info-row-label">Creado</span><span className="info-row-value">{formatFecha(ticketActual.created_at)}</span></div>
                  {ticketActual.started_at && <div className="info-row"><span className="info-row-label">Iniciado</span><span className="info-row-value">{formatFecha(ticketActual.started_at)}</span></div>}
                  {ticketActual.completed_at && <div className="info-row"><span className="info-row-label">Completado</span><span className="info-row-value">{formatFecha(ticketActual.completed_at)}</span></div>}
                  {ticketActual.invoiced_at && <div className="info-row"><span className="info-row-label">Facturado</span><span className="info-row-value">{formatFecha(ticketActual.invoiced_at)}</span></div>}
                </div>

                <div className="sidebar-card">
                  <div className="sidebar-card-header">
                    <h4><i className="fas fa-users"></i> Operarios</h4>
                    <button className="btn-primary btn-sm" onClick={abrirModalAsignar}><i className="fas fa-user-plus"></i></button>
                  </div>
                  <div>
                    {asignados.length === 0
                      ? <p className="sidebar-empty">Sin operarios asignados</p>
                      : asignados.map(a => {
                          const nombre = a.profiles?.nombre || 'Desconocido'
                          const esMio  = a.user_id === user?.id
                          return (
                            <div className="operario-chip" key={a.user_id}>
                              <div className="avatar" style={{ background: getAvatarColor(a.user_id) }}>{getInitials(nombre)}</div>
                              <span className="operario-chip-nombre">{nombre}</span>
                              {(isAdmin() || esMio) && (
                                <button className="btn-remove-operario" onClick={() => quitarOperario(a.user_id)} title="Quitar">
                                  <i className="fas fa-times"></i>
                                </button>
                              )}
                            </div>
                          )
                        })
                    }
                  </div>
                </div>

                <div className="sidebar-card">
                  <div className="sidebar-card-header">
                    <h4><i className="fas fa-paperclip"></i> Archivos del ticket</h4>
                    <button className="btn-primary btn-sm" onClick={() => archivoInputRef.current?.click()}><i className="fas fa-upload"></i></button>
                  </div>
                  <div>
                    {archivos.length === 0
                      ? <p className="sidebar-empty">Sin archivos adjuntos</p>
                      : archivos.map(a => (
                          <div className="archivo-item" key={a.id} onClick={() => descargarArchivo(a.id, a.nombre_original)}>
                            <span className="archivo-icon">{iconoArchivo(a.mime_type)}</span>
                            <div className="archivo-info">
                              <div className="archivo-nombre">{a.nombre_original}</div>
                              <div className="archivo-meta">{formatBytes(a.tamanio)} · {formatFechaCorta(a.created_at)}</div>
                            </div>
                            {(isAdmin() || a.subido_by === user?.id) && (
                              <button className="btn-delete-archivo" onClick={e => { e.stopPropagation(); eliminarArchivo(a.id) }} title="Eliminar">
                                <i className="fas fa-times"></i>
                              </button>
                            )}
                          </div>
                        ))
                    }
                  </div>
                </div>

                {/* HISTORIAL — acordeón desplegable */}
                <div className="sidebar-card sidebar-card-historial">
                  <button
                    className={`historial-accordion-btn ${historialAbierto ? 'open' : ''}`}
                    onClick={() => setHistorialAbierto(v => !v)}
                  >
                    <span className="historial-accordion-left">
                      <i className="fas fa-history"></i>
                      <span>Historial</span>
                      {historialFiltrado.length > 0 && (
                        <span className="historial-accordion-count">{historialFiltrado.length}</span>
                      )}
                    </span>
                    <i className={`fas fa-chevron-${historialAbierto ? 'up' : 'down'} historial-chevron`}></i>
                  </button>

                  {historialAbierto && (
                    <div className="historial-accordion-body">
                      {historialFiltrado.length === 0 ? (
                        <p className="sidebar-empty" style={{ marginTop: '10px' }}>Sin historial aún</p>
                      ) : (
                        <div className="historial-timeline sidebar-timeline">
                          {historialFiltrado.map((h, idx) => {
                            const color  = colorMap[h.tipo] || '#94a3b8'
                            const icon   = historialIconos[h.tipo] || 'circle'
                            const isLast = idx === historialFiltrado.length - 1
                            return (
                              <div className={`historial-timeline-item ${isLast ? 'last' : ''}`} key={h.id}>
                                <div className="historial-timeline-line">
                                  <div className="historial-timeline-dot" style={{ background: color, boxShadow: `0 0 0 3px ${color}22` }}>
                                    <i className={`fas fa-${icon}`} style={{ color: 'white', fontSize: '0.55rem' }}></i>
                                  </div>
                                  {!isLast && <div className="historial-timeline-connector"></div>}
                                </div>
                                <div className="historial-timeline-content">
                                  <div className="historial-timeline-badge" style={{ background: `${color}15`, color, borderColor: `${color}30` }}>
                                    {h.tipo ? h.tipo.charAt(0).toUpperCase() + h.tipo.slice(1).replace('_', ' ') : 'Evento'}
                                  </div>
                                  <p className="historial-timeline-desc">{h.descripcion}</p>
                                  <div className="historial-timeline-meta">
                                    {h.profiles?.nombre && (
                                      <span className="historial-timeline-autor">
                                        <div className="historial-mini-avatar" style={{ background: getAvatarColor(h.profiles.nombre) }}>
                                          {getInitials(h.profiles.nombre)}
                                        </div>
                                        {h.profiles.nombre}
                                      </span>
                                    )}
                                    <span className="historial-timeline-fecha">
                                      <i className="fas fa-clock"></i> {formatFecha(h.created_at)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </aside>

              <div className="detalle-main">
                <div className="detalle-tabs">
                  <button className={`detalle-tab ${activeTab === 'comentarios' ? 'active' : ''}`} onClick={() => switchTab('comentarios')}>
                    <i className="fas fa-comments"></i> Comentarios
                    {comentarios.length > 0 && <span className="tab-badge">{comentarios.length}</span>}
                  </button>
                  <button className={`detalle-tab ${activeTab === 'notas' ? 'active' : ''}`} onClick={() => switchTab('notas')}>
                    <i className="fas fa-sticky-note"></i> Notas privadas
                  </button>
                </div>

                {activeTab === 'notas' && (
                  <div className="tab-panel tab-panel-notas">
                    <div className="notas-header">
                      <span style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Solo visibles para el equipo. Se guardan automáticamente.</span>
                      <span ref={notasGuardado} style={{ fontSize: '0.8rem', color: 'var(--primary)' }}></span>
                    </div>
                    <textarea className="notas-textarea" placeholder="Escribe notas privadas aquí..." value={notasValue} onChange={onNotasChange} />
                  </div>
                )}

                {activeTab === 'comentarios' && (
                  <div className="tab-panel tab-panel-comentarios">
                    <div className="comentarios-lista">
                      {comentarios.length === 0 ? (
                        <div className="comentarios-empty">
                          <i className="fas fa-comments"></i>
                          <p>Sin comentarios aún</p>
                          <span>Sé el primero en añadir un comentario a este ticket</span>
                        </div>
                      ) : (
                        comentarios.map(c => {
                          const nombre    = c.profiles?.nombre || 'Desconocido'
                          const esMio     = c.user_id === user?.id
                          const archivosC = c.ticket_comentarios_archivos || []
                          return (
                            <div className="comentario-item" key={c.id}>
                              <div className="comentario-avatar" style={{ background: getAvatarColor(c.user_id) }}>{getInitials(nombre)}</div>
                              <div className="comentario-cuerpo">
                                <div className="comentario-meta">
                                  <span className="comentario-autor">{nombre}</span>
                                  <span className="comentario-fecha">{formatFecha(c.created_at)}</span>
                                  {c.editado && <span className="comentario-editado">(editado)</span>}
                                  {(esMio || isAdmin()) && (
                                    <div className="comentario-acciones">
                                      <button className="btn-comentario-accion btn-comentario-delete" onClick={() => eliminarComentario(c.id)} title="Eliminar">
                                        <i className="fas fa-trash"></i>
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="comentario-texto" dangerouslySetInnerHTML={{ __html: c.contenido }}></div>
                                {archivosC.length > 0 && (
                                  <div className="comentario-archivos">
                                    {archivosC.map(a => (
                                      <div key={a.id} className="comentario-archivo-chip" onClick={() => descargarArchivo(a.id, a.nombre_original)}>
                                        {iconoArchivo(a.mime_type)}
                                        <span>{a.nombre_original}</span>
                                        <small>{formatBytes(a.tamanio)}</small>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Nuevo comentario — editor enriquecido */}
                    <div className="comentario-nuevo">
                      <div className="comentario-nuevo-avatar" style={{ background: getAvatarColor(user?.id) }}>
                        {getInitials(user?.nombre || user?.email)}
                      </div>
                      <div className="comentario-nuevo-body">
                        <div className="comentario-nuevo-nombre">{user?.nombre || user?.email}</div>
                        <div className="editor-rich">
                          <div className="editor-toolbar">
                            <button type="button" className="editor-btn" title="Negrita" onMouseDown={e => { e.preventDefault(); document.execCommand('bold') }}><i className="fas fa-bold"></i></button>
                            <button type="button" className="editor-btn" title="Cursiva" onMouseDown={e => { e.preventDefault(); document.execCommand('italic') }}><i className="fas fa-italic"></i></button>
                            <button type="button" className="editor-btn" title="Subrayado" onMouseDown={e => { e.preventDefault(); document.execCommand('underline') }}><i className="fas fa-underline"></i></button>
                            <button type="button" className="editor-btn" title="Tachado" onMouseDown={e => { e.preventDefault(); document.execCommand('strikeThrough') }}><i className="fas fa-strikethrough"></i></button>
                            <div className="editor-sep"></div>
                            <button type="button" className="editor-btn" title="Lista con viñetas" onMouseDown={e => { e.preventDefault(); document.execCommand('insertUnorderedList') }}><i className="fas fa-list-ul"></i></button>
                            <button type="button" className="editor-btn" title="Lista numerada" onMouseDown={e => { e.preventDefault(); document.execCommand('insertOrderedList') }}><i className="fas fa-list-ol"></i></button>
                            <div className="editor-sep"></div>
                            <button type="button" className="editor-btn" title="Cita" onMouseDown={e => { e.preventDefault(); document.execCommand('formatBlock', false, 'blockquote') }}><i className="fas fa-quote-right"></i></button>
                            <button type="button" className="editor-btn" title="Código" onMouseDown={e => { e.preventDefault(); document.execCommand('formatBlock', false, 'pre') }}><i className="fas fa-code"></i></button>
                            <div className="editor-sep"></div>
                            <button type="button" className="editor-btn" title="Limpiar formato" onMouseDown={e => { e.preventDefault(); document.execCommand('removeFormat') }}><i className="fas fa-remove-format"></i></button>
                          </div>
                          <div
                            className="editor-content"
                            contentEditable
                            suppressContentEditableWarning
                            data-placeholder="Escribe un comentario..."
                            onInput={e => setComentarioText(e.currentTarget.innerHTML)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                                // Permitir Enter normal dentro del editor rich text
                              }
                            }}
                            ref={el => {
                              if (el && comentarioText === '') el.innerHTML = ''
                            }}
                          />
                        </div>
                        <div className="comentario-nuevo-acciones">
                          <span style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>Ctrl+Enter para enviar</span>
                          <button className="btn-primary" onClick={enviarComentario}>
                            <i className="fas fa-paper-plane"></i> Comentar
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* ── PESTAÑA HISTORIAL eliminada — ahora es acordeón en sidebar ── */}

              </div>
            </div>
          </div>

        </main>

        {showAsignarModal && <AsignarModal />}
        {showTicketModal && <TicketModal />}
      </div>
    )
  }

  // ============================================================
  // VISTA LISTA
  // ============================================================
  return (
    <div className="tickets-page">
      <div className="toast-container" id="toastContainer"></div>
      <Topbar />
      <main className="main-content">
        <div className="section-header">
          <div>
            <h1><i className="fas fa-headset"></i> Tickets</h1>
            <p><span>{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span></p>
          </div>
          <button className="btn-primary" onClick={abrirModalNuevoTicket}><i className="fas fa-plus"></i> Nuevo Ticket</button>
        </div>

        <div className="stats">
          {[
            { id: 'statTotal',       label: 'Total',       val: stats.total || 0,       icon: 'fa-ticket-alt',          bg: '#dbeafe', col: '#2563eb', click: () => { setEstadoFilter('all'); setPrioridadFilter('all') } },
            { id: 'statPendientes',  label: 'Pendientes',  val: stats.pendientes || 0,  icon: 'fa-clock',               bg: '#fef3c7', col: '#d97706', click: () => { setEstadoFilter('Pendiente'); setPrioridadFilter('all') } },
            { id: 'statEnCurso',     label: 'En curso',    val: stats.en_curso || 0,    icon: 'fa-spinner',             bg: '#dbeafe', col: '#2563eb', click: () => { setEstadoFilter('En curso'); setPrioridadFilter('all') } },
            { id: 'statCompletados', label: 'Completados', val: stats.completados || 0, icon: 'fa-check-circle',        bg: '#dcfce7', col: '#16a34a', click: () => { setEstadoFilter('Completado'); setPrioridadFilter('all') } },
            { id: 'statFacturados',  label: 'Facturados',  val: stats.facturados || 0,  icon: 'fa-file-invoice-dollar', bg: '#f3e8ff', col: '#9333ea', click: () => { setEstadoFilter('Facturado'); setPrioridadFilter('all') } },
            { id: 'statUrgentes',    label: 'Urgentes',    val: stats.urgentes || 0,    icon: 'fa-exclamation-circle',  bg: '#fee2e2', col: '#dc2626', click: () => { setEstadoFilter('all'); setPrioridadFilter('Urgente') } },
          ].map(s => (
            <div className="stat-card" key={s.id} onClick={s.click} style={{ cursor: 'pointer' }}>
              <div className="stat-icon" style={{ background: s.bg, color: s.col }}><i className={`fas ${s.icon}`}></i></div>
              <div className="stat-info"><h3>{s.val}</h3><p>{s.label}</p></div>
            </div>
          ))}
        </div>

        <div className="filters">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Buscar tickets..." value={searchTerm} onChange={onSearchChange} />
          </div>
          <div className="filter-row" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
              <option value="all">Todos los estados</option>
              <option value="abiertos">Abiertos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En curso">En curso</option>
              <option value="Completado">Completado</option>
              <option value="Facturado">Facturado</option>
            </select>
            <select value={prioridadFilter} onChange={e => setPrioridadFilter(e.target.value)}>
              <option value="all">Prioridad</option>
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>
            <select value={operarioFilter} onChange={e => setOperarioFilter(e.target.value)}>
              <option value="all">Operario</option>
              {operarios.map(op => <option key={op.id} value={op.id}>{op.nombre}</option>)}
            </select>
            <select value={empresaFilter} onChange={e => setEmpresaFilter(e.target.value)}>
              <option value="all">Empresa</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
            <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} />
            <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} />
            {(filtroDesde || filtroHasta) && (
              <button className="btn-secondary btn-sm" onClick={() => { setFiltroDesde(''); setFiltroHasta('') }}>
                <i className="fas fa-undo"></i>
              </button>
            )}
          </div>
        </div>

        <div className="table-container desktop-only">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Empresa</th><th>Asunto</th><th>Operarios</th>
                <th>Prioridad</th><th>Estado</th><th>Tiempo</th><th>Fecha</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-state">
                    <i className="fas fa-inbox" style={{ display: 'block', fontSize: '2rem', color: '#cbd5e1', marginBottom: '12px' }}></i>
                    No hay tickets con los filtros actuales
                  </td>
                </tr>
              ) : (
                tickets.map(t => {
                  const asignados     = t.ticket_asignaciones || []
                  const estadoCerrado = t.estado === 'Completado' || t.estado === 'Facturado'
                  return (
                    <tr key={t.id} onClick={() => abrirTicket(t.id)} style={{ cursor: 'pointer' }}>
                      <td><span className="ticket-numero">#{t.numero}</span></td>
                      <td>{t.empresas?.nombre || '—'}</td>
                      <td>
                        <div className="ticket-asunto-cell">
                          <span className="ticket-asunto-text">{t.asunto}</span>
                          {t.dispositivos && (
                            <span className="ticket-empresa-sub">
                              <i className="fas fa-desktop" style={{ fontSize: '0.7rem' }}></i> {t.dispositivos.nombre}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="avatares-operarios">
                          {asignados.length === 0
                            ? <span style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>Sin asignar</span>
                            : asignados.map(a => {
                                const nombre = a.profiles?.nombre || '?'
                                return (
                                  <div key={a.user_id} className="avatar-operario" style={{ background: getAvatarColor(a.user_id) }} title={nombre}>
                                    {getInitials(nombre)}
                                  </div>
                                )
                              })
                          }
                        </div>
                      </td>
                      <td><PrioridadBadge p={t.prioridad} /></td>
                      <td><EstadoBadge e={t.estado} /></td>
                      <td style={{ fontWeight: 600, color: estadoCerrado ? 'var(--gray)' : 'var(--primary)', fontSize: '0.82rem' }}>
                        {formatHoras(t.horas_transcurridas || 0)}
                        {estadoCerrado && <i className="fas fa-lock" style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: '4px' }}></i>}
                      </td>
                      <td style={{ color: 'var(--gray)', fontSize: '0.82rem' }}>{formatFechaCorta(t.created_at)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn-action btn-edit" onClick={() => abrirModalEditarTicket(t)} title="Editar"><i className="fas fa-edit"></i></button>
                        {isAdmin() && (
                          <button className="btn-action btn-delete" onClick={() => eliminarTicketLista(t.id)} title="Eliminar"><i className="fas fa-trash"></i></button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mobile-only">
          {tickets.length === 0 ? (
            <div className="empty-state"><i className="fas fa-inbox"></i><br />Sin tickets</div>
          ) : (
            tickets.map(t => {
              const asignados     = t.ticket_asignaciones || []
              const nombresOps    = asignados.map(a => a.profiles?.nombre).filter(Boolean).join(', ')
              const estadoCerrado = t.estado === 'Completado' || t.estado === 'Facturado'
              return (
                <div key={t.id} className={`ticket-card-mobile prio-${t.prioridad}`} onClick={() => abrirTicket(t.id)}>
                  <div className="ticket-card-top">
                    <div>
                      <span className="ticket-numero">#{t.numero}</span>
                      <div className="ticket-card-asunto">{t.asunto}</div>
                    </div>
                    <EstadoBadge e={t.estado} />
                  </div>
                  <div className="ticket-card-meta">
                    <span><i className="fas fa-building"></i> {t.empresas?.nombre || '—'}</span>
                    {nombresOps && <span><i className="fas fa-user"></i> {nombresOps}</span>}
                    <span>
                      <i className="fas fa-clock"></i> {formatHoras(t.horas_transcurridas || 0)}
                      {estadoCerrado && <i className="fas fa-lock" style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: '3px' }}></i>}
                    </span>
                    <span className={`prioridad-badge prioridad-${t.prioridad}`} style={{ marginLeft: 'auto' }}>{t.prioridad}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

      </main>
      {showTicketModal && <TicketModal />}
    </div>
  )
}