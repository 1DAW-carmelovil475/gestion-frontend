import { useState, useEffect, useRef, useCallback } from 'react'
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

  // Listas
  const [tickets, setTickets]     = useState([])
  const [empresas, setEmpresas]   = useState([])
  const [operarios, setOperarios] = useState([])
  const [stats, setStats]         = useState({})
  const [loading, setLoading]     = useState(true)

  // Filtros
  const [estadoFilter, setEstadoFilter]       = useState('all')
  const [prioridadFilter, setPrioridadFilter] = useState('all')
  const [operarioFilter, setOperarioFilter]   = useState('all')
  const [empresaFilter, setEmpresaFilter]     = useState('all')
  const [searchTerm, setSearchTerm]           = useState('')
  const [filtroDesde, setFiltroDesde]         = useState('')
  const [filtroHasta, setFiltroHasta]         = useState('')
  const searchTimer = useRef(null)

  // Vista detalle
  const [vistaDetalle, setVistaDetalle]   = useState(false)
  const [ticketActual, setTicketActual]   = useState(null)
  const [comentarios, setComentarios]     = useState([])
  const [activeTab, setActiveTab]         = useState('notas')
  const [notasValue, setNotasValue]       = useState('')
  const [historialVisible, setHistorialVisible] = useState(false)

  // Modal ticket
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [editingTicket, setEditingTicket]     = useState(null)
  const [modalEmprId, setModalEmprId]         = useState('')
  const [modalDispositivos, setModalDispositivos] = useState([])
  const [modalOperariosCheck, setModalOperariosCheck] = useState([])

  // Modal asignar operarios (en detalle)
  const [showAsignarModal, setShowAsignarModal]           = useState(false)
  const [asignarOperariosCheck, setAsignarOperariosCheck] = useState([])

  // Comentarios
  const [comentarioText, setComentarioText] = useState('')
  const [pendingComFiles, setPendingComFiles] = useState([])

  // Archivos del ticket
  const archivoInputRef = useRef(null)
  const comArchivoInputRef = useRef(null)

  // Notas autosave timer
  const notasTimer = useRef(null)
  const notasGuardado = useRef(null)

  // ============================================================
  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!loading) loadTickets()
  }, [estadoFilter, prioridadFilter, operarioFilter, empresaFilter, filtroDesde, filtroHasta])

  async function loadData() {
    setLoading(true)
    try {
      const [ticketsData, empresasData, operariosData] = await Promise.all([
        getTickets(),
        getEmpresas(),
        getOperarios(),
      ])
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

  async function loadTickets() {
    const params = {}
    if (estadoFilter    !== 'all') params.estado       = estadoFilter
    if (prioridadFilter !== 'all') params.prioridad    = prioridadFilter
    if (operarioFilter  !== 'all') params.operario_id  = operarioFilter
    if (empresaFilter   !== 'all') params.empresa_id   = empresaFilter
    if (searchTerm)  params.search = searchTerm
    if (filtroDesde) params.desde  = filtroDesde
    if (filtroHasta) params.hasta  = filtroHasta

    try {
      let data = await getTickets(params)
      if (estadoFilter === 'abiertos') data = data.filter(t => t.estado === 'Pendiente' || t.estado === 'En curso')
      setTickets(data || [])
      calcStats(data || [])
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  function onSearchChange(e) {
    setSearchTerm(e.target.value)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(loadTickets, 400)
  }

  // ============================================================
  // ABRIR TICKET DETALLE
  // ============================================================
  async function abrirTicket(id) {
    setVistaDetalle(true)
    setActiveTab('notas')
    setHistorialVisible(false)
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
    setActiveTab('notas')
    setPendingComFiles([])
    setComentarioText('')
    loadTickets()
  }

  // ============================================================
  // NOTAS AUTOSAVE
  // ============================================================
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

  // ============================================================
  // TABS DETALLE
  // ============================================================
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

  // ============================================================
  // CAMBIAR ESTADO
  // ============================================================
  async function cambiarEstado(nuevoEstado) {
    if (!ticketActual) return
    try {
      await updateTicket(ticketActual.id, { estado: nuevoEstado })
      showToast('success', 'Actualizado', `Estado: "${nuevoEstado}"`)
      const updated = await getTicket(ticketActual.id)
      setTicketActual(updated)
    } catch (error) {
      showToast('error', 'Error', error.message)
      // Restaurar valor anterior en el select
    }
  }

  // ============================================================
  // OPERARIOS
  // ============================================================
  function abrirModalAsignar() {
    const asignadosIds = (ticketActual?.ticket_asignaciones || []).map(a => a.user_id)
    setAsignarOperariosCheck(
      operarios.map(op => ({ ...op, checked: asignadosIds.includes(op.id) }))
    )
    setShowAsignarModal(true)
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

  // ============================================================
  // ARCHIVOS DEL TICKET
  // ============================================================
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
    }
    e.target.value = ''
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

  // ============================================================
  // COMENTARIOS
  // ============================================================
  async function enviarComentario() {
    if (!ticketActual) return
    if (!comentarioText.trim() && !pendingComFiles.length) {
      showToast('warning', 'Aviso', 'Escribe algo o adjunta un archivo'); return
    }
    try {
      await createTicketComentario(ticketActual.id, comentarioText, pendingComFiles)
      setComentarioText('')
      setPendingComFiles([])
      const data = await getTicketComentarios(ticketActual.id)
      setComentarios(data || [])
      // Badge
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

  // ============================================================
  // MODAL TICKET (NUEVO / EDITAR)
  // ============================================================
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
    // Cargar dispositivos de la empresa
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
    const formData = new FormData(e.target)

    const empresa_id     = formData.get('empresa_id')
    const dispositivo_id = formData.get('dispositivo_id') || null
    const asunto         = formData.get('asunto')?.trim()
    const descripcion    = formData.get('descripcion')?.trim() || null
    const prioridad      = formData.get('prioridad')
    const estado         = formData.get('estado')

    if (!empresa_id || !asunto) {
      showToast('error', 'Error', 'Empresa y asunto son obligatorios'); return
    }

    const operariosSeleccionados = modalOperariosCheck.filter(o => o.checked).map(o => o.id)

    const btn = e.target.querySelector('button[type="submit"]')
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...' }

    try {
      if (editingTicket) {
        await updateTicket(editingTicket.id, { asunto, descripcion, prioridad, estado, dispositivo_id })
        if (operariosSeleccionados.length > 0) {
          await assignOperarios(editingTicket.id, operariosSeleccionados)
        }
        showToast('success', 'Ticket actualizado', '')
        // Si estamos en el detalle, refrescar
        if (ticketActual?.id === editingTicket.id) {
          const updated = await getTicket(editingTicket.id)
          setTicketActual(updated)
        }
      } else {
        await createTicket({ empresa_id, dispositivo_id, asunto, descripcion, prioridad, estado, operarios: operariosSeleccionados })
        showToast('success', 'Ticket creado', asunto)
      }
      setShowTicketModal(false)
      await loadTickets()
    } catch (error) {
      showToast('error', 'Error', error.message)
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar' }
    }
  }

  // Eliminar ticket
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
      await loadTickets()
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  // ============================================================
  // TOAST
  // ============================================================
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
    if (confirm('¿Cerrar sesión?')) {
      logout()
      navigate('/login')
    }
  }

  // ============================================================
  // LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="loading-screen">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Cargando...</p>
      </div>
    )
  }

  // ============================================================
  // TOPBAR (reutilizable)
  // ============================================================
  function Topbar({ detalleActive = false }) {
    return (
      <header className="topbar">
        <div className="logo">
          <img src="/img/logoHola.png" alt="Logo" />
          <span className="logo-text">Hola Informática</span>
        </div>
        <nav className="top-nav">
          <Link to="/" className="nav-link"><i className="fas fa-building"></i> Empresas</Link>
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
    )
  }

  // ============================================================
  // MODAL TICKET
  // ============================================================
  function TicketModal() {
    return (
      <div className="modal" style={{ display: 'flex' }} onClick={e => e.target.classList.contains('modal') && setShowTicketModal(false)}>
        <div className="modal-content">
          <div className="modal-header">
            <h2 id="ticketModalTitle">
              <i className="fas fa-ticket-alt"></i> {editingTicket ? `Editar Ticket #${editingTicket.numero}` : 'Nuevo Ticket'}
            </h2>
            <button className="modal-close" onClick={() => setShowTicketModal(false)}><i className="fas fa-times"></i></button>
          </div>
          <form onSubmit={saveTicket}>
            <div className="modal-body">
              <div className="form-group">
                <label>Empresa *</label>
                <select
                  name="empresa_id"
                  value={modalEmprId}
                  onChange={e => onModalEmpresaChange(e.target.value)}
                  id="ticketEmpresa"
                  required
                >
                  <option value="">Seleccionar empresa...</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Dispositivo</label>
                <select name="dispositivo_id" id="ticketDispositivo" defaultValue={editingTicket?.dispositivo_id || ''}>
                  <option value="">Sin dispositivo</option>
                  {modalDispositivos.map(d => (
                    <option key={d.id} value={d.id}>[{d.tipo || d.categoria}] {d.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Asunto *</label>
                <input type="text" name="asunto" id="ticketAsunto" defaultValue={editingTicket?.asunto} required placeholder="Describe brevemente el problema..." />
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea name="descripcion" id="ticketDescripcion" defaultValue={editingTicket?.descripcion} rows={3} placeholder="Detalles adicionales..." />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Prioridad</label>
                  <select name="prioridad" id="ticketPrioridad" defaultValue={editingTicket?.prioridad || 'Media'}>
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Estado</label>
                  <select name="estado" id="ticketEstado" defaultValue={editingTicket?.estado || 'Pendiente'}>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En curso">En curso</option>
                    <option value="Completado">Completado</option>
                    <option value="Facturado">Facturado</option>
                  </select>
                </div>
              </div>

              {/* Operarios checkboxes */}
              <div className="form-group">
                <label>Asignar operarios</label>
                <div className="operarios-checkboxes" id="operariosCheckboxes">
                  {modalOperariosCheck.length === 0
                    ? <p style={{ color: 'var(--gray)', fontSize: '0.88rem' }}>No hay operarios disponibles.</p>
                    : modalOperariosCheck.map((op, i) => (
                      <div
                        key={op.id}
                        className={`operario-check-item ${op.checked ? 'checked' : ''}`}
                        data-user-id={op.id}
                        onClick={() => {
                          const updated = [...modalOperariosCheck]
                          updated[i] = { ...updated[i], checked: !updated[i].checked }
                          setModalOperariosCheck(updated)
                        }}
                      >
                        <div className="operario-check-avatar" style={{ background: getAvatarColor(op.id) }}>
                          {getInitials(op.nombre)}
                        </div>
                        <span className="operario-check-nombre">{op.nombre}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>{op.rol}</span>
                        <div className="operario-check-tick">
                          {op.checked ? <i className="fas fa-check"></i> : ''}
                        </div>
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

  // ============================================================
  // VISTA: DETALLE TICKET
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

    return (
      <div className="tickets-page">
        <div className="toast-container" id="toastContainer"></div>
        <input type="file" ref={archivoInputRef} multiple style={{ display: 'none' }} onChange={subirArchivos} />
        <input type="file" ref={comArchivoInputRef} multiple style={{ display: 'none' }}
          onChange={e => { setPendingComFiles([...pendingComFiles, ...Array.from(e.target.files)]); e.target.value = '' }} />

        <Topbar />

        <main className="main-content detalle-ticket" id="vistaDetalle">
          {/* Header */}
          <div className="detalle-header">
            <button className="btn-back" onClick={volverALista}>
              <i className="fas fa-arrow-left"></i> Volver
            </button>
            <div className="detalle-titulo">
              <span className="ticket-numero">#{ticketActual.numero}</span>
              <h2 id="detalleAsunto">{ticketActual.asunto}</h2>
            </div>
            <div className="detalle-acciones">
              <select
                id="detalleEstadoSelect"
                value={ticketActual.estado}
                onChange={e => cambiarEstado(e.target.value)}
                className="estado-select"
              >
                <option value="Pendiente">Pendiente</option>
                <option value="En curso">En curso</option>
                <option value="Completado">Completado</option>
                <option value="Facturado">Facturado</option>
              </select>
              <button className="btn-primary btn-sm" onClick={() => abrirModalEditarTicket(ticketActual)}>
                <i className="fas fa-edit"></i> Editar
              </button>
              {isAdmin() && (
                <button id="btnEliminarTicket" className="btn-action btn-delete" onClick={eliminarTicket}>
                  <i className="fas fa-trash"></i>
                </button>
              )}
            </div>
          </div>

          <div className="detalle-body">
            {/* Sidebar derecha */}
            <aside className="detalle-sidebar">

              {/* Info */}
              <div className="sidebar-card">
                <h4><i className="fas fa-info-circle"></i> Información</h4>
                <div id="detalleInfoRows">
                  <div className="info-row"><span className="info-row-label">Empresa</span><span className="info-row-value">{ticketActual.empresas?.nombre || '—'}</span></div>
                  <div className="info-row">
                    <span className="info-row-label">Prioridad</span>
                    <span className="info-row-value"><PrioridadBadge p={ticketActual.prioridad} /></span>
                  </div>
                  <div className="info-row">
                    <span className="info-row-label">Estado</span>
                    <span className="info-row-value"><EstadoBadge e={ticketActual.estado} /></span>
                  </div>
                  {ticketActual.dispositivos && (
                    <div className="info-row">
                      <span className="info-row-label">Equipo</span>
                      <span className="info-row-value"><i className="fas fa-desktop" style={{ color: 'var(--primary)' }}></i> {ticketActual.dispositivos.nombre}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-row-label">⏱ Tiempo</span>
                    <span className="info-row-value">
                      {estadoCerrado
                        ? <strong style={{ color: 'var(--gray)' }}>{formatHoras(ticketActual.horas_transcurridas || 0)} <i className="fas fa-lock" style={{ fontSize: '0.75rem', opacity: 0.5 }}></i></strong>
                        : <strong style={{ color: 'var(--primary)' }}>{formatHoras(ticketActual.horas_transcurridas || 0)}</strong>
                      }
                    </span>
                  </div>
                  {ticketActual.descripcion && (
                    <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span className="info-row-label">Descripción</span>
                      <span className="info-row-value" style={{ whiteSpace: 'pre-wrap', marginTop: '4px' }}>{ticketActual.descripcion}</span>
                    </div>
                  )}
                  <div className="info-row"><span className="info-row-label">Creado</span><span className="info-row-value">{formatFecha(ticketActual.created_at)}</span></div>
                  {ticketActual.started_at   && <div className="info-row"><span className="info-row-label">Iniciado</span><span className="info-row-value">{formatFecha(ticketActual.started_at)}</span></div>}
                  {ticketActual.completed_at && <div className="info-row"><span className="info-row-label">Completado</span><span className="info-row-value">{formatFecha(ticketActual.completed_at)}</span></div>}
                  {ticketActual.invoiced_at  && <div className="info-row"><span className="info-row-label">Facturado</span><span className="info-row-value">{formatFecha(ticketActual.invoiced_at)}</span></div>}
                </div>
              </div>

              {/* Operarios */}
              <div className="sidebar-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0 }}><i className="fas fa-users"></i> Operarios</h4>
                  <button className="btn-primary btn-sm" onClick={abrirModalAsignar}>
                    <i className="fas fa-user-plus"></i>
                  </button>
                </div>
                <div id="detalleOperarios">
                  {asignados.length === 0
                    ? <div style={{ color: 'var(--gray)', fontSize: '0.82rem', padding: '8px 0' }}>Sin operarios asignados</div>
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
                    })}
                </div>
              </div>

              {/* Archivos */}
              <div className="sidebar-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0 }}><i className="fas fa-paperclip"></i> Archivos</h4>
                  <button className="btn-primary btn-sm" onClick={() => archivoInputRef.current?.click()}>
                    <i className="fas fa-upload"></i>
                  </button>
                </div>
                <div id="detalleArchivos">
                  {archivos.length === 0
                    ? <div style={{ color: 'var(--gray)', fontSize: '0.82rem', padding: '8px 0' }}>Sin archivos adjuntos</div>
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
                    ))}
                </div>
              </div>

              {/* Historial */}
              <div className="sidebar-card">
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setHistorialVisible(!historialVisible)}
                >
                  <h4 style={{ margin: 0 }}><i className="fas fa-history"></i> Historial</h4>
                  <i id="historialChevron" className={`fas ${historialVisible ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                </div>
                {historialVisible && (
                  <div id="detalleHistorial" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                    {historial.length === 0
                      ? <div style={{ color: 'var(--gray)', fontSize: '0.82rem' }}>Sin historial</div>
                      : [...historial]
                          .filter(h => h.tipo !== 'nota_interna')
                          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                          .map(h => {
                            const color = colorMap[h.tipo] || '#94a3b8'
                            const icon  = historialIconos[h.tipo] || 'circle'
                            return (
                              <div className="historial-item" key={h.id}>
                                <div className="historial-icon" style={{ background: `${color}20`, color }}>
                                  <i className={`fas fa-${icon}`}></i>
                                </div>
                                <div className="historial-texto">
                                  {h.descripcion}
                                  <div className="historial-fecha">
                                    {h.profiles?.nombre ? `${h.profiles.nombre} · ` : ''}{formatFecha(h.created_at)}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                  </div>
                )}
              </div>
            </aside>

            {/* Panel principal: Notas + Comentarios */}
            <div className="detalle-main">
              <div className="detalle-tabs">
                <button
                  className={`detalle-tab ${activeTab === 'notas' ? 'active' : ''}`}
                  onClick={() => switchTab('notas')}
                >
                  <i className="fas fa-sticky-note"></i> Notas privadas
                </button>
                <button
                  className={`detalle-tab ${activeTab === 'comentarios' ? 'active' : ''}`}
                  onClick={() => switchTab('comentarios')}
                >
                  <i className="fas fa-comments"></i> Comentarios
                  {comentarios.length > 0 && (
                    <span id="comentariosBadge" className="tab-badge">{comentarios.length}</span>
                  )}
                </button>
              </div>

              {/* TAB: NOTAS */}
              {activeTab === 'notas' && (
                <div className="tab-panel" id="panelNotas" style={{ display: 'flex' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Solo visibles para el equipo. Se guardan automáticamente.</span>
                    <span id="notasIndicador" ref={notasGuardado} style={{ fontSize: '0.8rem', color: 'var(--primary)' }}></span>
                  </div>
                  <textarea
                    id="detalleNotas"
                    className="notas-textarea"
                    placeholder="Escribe notas privadas aquí..."
                    value={notasValue}
                    onChange={onNotasChange}
                  />
                </div>
              )}

              {/* TAB: COMENTARIOS */}
              {activeTab === 'comentarios' && (
                <div className="tab-panel" id="panelComentarios" style={{ display: 'flex' }}>
                  <div className="comentarios-lista" id="comentariosLista">
                    {comentarios.length === 0 ? (
                      <div className="comentarios-empty">
                        <i className="fas fa-comments"></i>
                        <p>Sin comentarios aún</p>
                        <span>Sé el primero en añadir un comentario a este ticket</span>
                      </div>
                    ) : (
                      comentarios.map(c => {
                        const nombre = c.profiles?.nombre || 'Desconocido'
                        const esMio  = c.user_id === user?.id
                        const archivosC = c.ticket_comentarios_archivos || []
                        return (
                          <div className="comentario-item" key={c.id} id={`comentario-${c.id}`}>
                            <div className="comentario-avatar" style={{ background: getAvatarColor(c.user_id) }}>
                              {getInitials(nombre)}
                            </div>
                            <div className="comentario-cuerpo">
                              <div className="comentario-meta">
                                <span className="comentario-autor">{nombre}</span>
                                <span className="comentario-fecha">{formatFecha(c.created_at)}</span>
                                {c.editado && <span className="comentario-editado">(editado)</span>}
                                {(esMio || isAdmin()) && (
                                  <div className="comentario-acciones">
                                    <button onClick={() => eliminarComentario(c.id)} title="Eliminar" className="btn-comentario-accion btn-comentario-delete">
                                      <i className="fas fa-trash"></i>
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="comentario-texto">{escHtml(c.contenido)}</div>
                              {archivosC.length > 0 && (
                                <div className="comentario-archivos">
                                  {archivosC.map(a => (
                                    <div key={a.id} className="comentario-archivo-chip"
                                      onClick={() => descargarArchivo(a.id, a.nombre_original)}
                                      title={a.nombre_original}>
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

                  {/* Nuevo comentario */}
                  <div className="comentario-nuevo">
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div className="comentario-autor-avatar">
                        <div id="comentarioAutorAvatar" className="avatar" style={{ background: getAvatarColor(user?.id) }}>
                          {getInitials(user?.nombre)}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <textarea
                          id="nuevoComentarioTexto"
                          placeholder="Escribe un comentario... (Enter para enviar, Shift+Enter para nueva línea)"
                          value={comentarioText}
                          onChange={e => setComentarioText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarComentario() } }}
                          rows={3}
                        />

                        {pendingComFiles.length > 0 && (
                          <div id="comentarioArchivosPreview" className="archivos-preview" style={{ display: 'flex' }}>
                            {pendingComFiles.map((f, i) => (
                              <div className="archivo-preview-chip" key={i}>
                                {iconoArchivo(f.type)}
                                <span>{f.name}</span>
                                <small>{formatBytes(f.size)}</small>
                                <button onClick={() => setPendingComFiles(pendingComFiles.filter((_, j) => j !== i))} title="Quitar">
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                          <button className="btn-secondary btn-sm" onClick={() => comArchivoInputRef.current?.click()}>
                            <i className="fas fa-paperclip"></i> Adjuntar
                          </button>
                          <button className="btn-primary" onClick={enviarComentario}>
                            <i className="fas fa-paper-plane"></i> Comentar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Modal asignar operarios */}
        {showAsignarModal && (
          <div className="modal" style={{ display: 'flex' }} onClick={e => e.target.classList.contains('modal') && setShowAsignarModal(false)}>
            <div className="modal-content">
              <div className="modal-header">
                <h2><i className="fas fa-user-plus"></i> Asignar Operarios</h2>
                <button className="modal-close" onClick={() => setShowAsignarModal(false)}><i className="fas fa-times"></i></button>
              </div>
              <div className="modal-body">
                <div className="operarios-checkboxes" id="asignarOperariosLista">
                  {asignarOperariosCheck.map((op, i) => (
                    <div
                      key={op.id}
                      className={`operario-check-item ${op.checked ? 'checked' : ''}`}
                      onClick={() => {
                        const updated = [...asignarOperariosCheck]
                        updated[i] = { ...updated[i], checked: !updated[i].checked }
                        setAsignarOperariosCheck(updated)
                      }}
                    >
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
        )}

        {showTicketModal && <TicketModal />}
      </div>
    )
  }

  // ============================================================
  // VISTA: LISTA TICKETS
  // ============================================================
  return (
    <div className="tickets-page">
      <div className="toast-container" id="toastContainer"></div>

      <Topbar />

      <nav className="bottom-nav">
        <Link to="/" className="bottom-nav-item"><i className="fas fa-building"></i><span>Empresas</span></Link>
        <Link to="/tickets" className="bottom-nav-item active"><i className="fas fa-headset"></i><span>Tickets</span></Link>
        {isAdmin() && <Link to="/estadisticas" className="bottom-nav-item"><i className="fas fa-chart-bar"></i><span>Stats</span></Link>}
        <Link to="/chat" className="bottom-nav-item"><i className="fas fa-comments"></i><span>Chat</span></Link>
      </nav>

      <main className="main-content" id="vistaLista">
        <div className="section-header">
          <div>
            <h1><i className="fas fa-headset"></i> Tickets</h1>
            <p>
              <span id="totalFiltrado">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
            </p>
          </div>
          <button className="btn-primary" onClick={abrirModalNuevoTicket}>
            <i className="fas fa-plus"></i> Nuevo Ticket
          </button>
        </div>

        {/* Stats rápidas */}
        <div className="stats">
          {[
            { id: 'statTotal',       label: 'Total',      val: stats.total || 0,       icon: 'fa-ticket-alt',       bg: '#dbeafe', col: '#2563eb', click: () => setEstadoFilter('all') },
            { id: 'statPendientes',  label: 'Pendientes', val: stats.pendientes || 0,  icon: 'fa-clock',            bg: '#fef3c7', col: '#d97706', click: () => setEstadoFilter('Pendiente') },
            { id: 'statEnCurso',     label: 'En curso',   val: stats.en_curso || 0,    icon: 'fa-spinner',          bg: '#dbeafe', col: '#2563eb', click: () => setEstadoFilter('En curso') },
            { id: 'statCompletados', label: 'Completados',val: stats.completados || 0, icon: 'fa-check-circle',     bg: '#dcfce7', col: '#16a34a', click: () => setEstadoFilter('Completado') },
            { id: 'statFacturados',  label: 'Facturados', val: stats.facturados || 0,  icon: 'fa-file-invoice-dollar', bg: '#f3e8ff', col: '#9333ea', click: () => setEstadoFilter('Facturado') },
            { id: 'statUrgentes',    label: 'Urgentes',   val: stats.urgentes || 0,    icon: 'fa-exclamation-circle', bg: '#fee2e2', col: '#dc2626', click: () => setPrioridadFilter('Urgente') },
          ].map(s => (
            <div className="stat-card" key={s.id} onClick={s.click} style={{ cursor: 'pointer' }}>
              <div className="stat-icon" style={{ background: s.bg, color: s.col }}>
                <i className={`fas ${s.icon}`}></i>
              </div>
              <div className="stat-info">
                <h3 id={s.id}>{s.val}</h3>
                <p>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="filters">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              id="searchTicket"
              type="text"
              placeholder="Buscar tickets..."
              value={searchTerm}
              onChange={onSearchChange}
            />
          </div>
          <div className="filter-row" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <select id="filtroEstado" value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
              <option value="all">Todos los estados</option>
              <option value="abiertos">Abiertos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En curso">En curso</option>
              <option value="Completado">Completado</option>
              <option value="Facturado">Facturado</option>
            </select>
            <select id="filtroPrioridad" value={prioridadFilter} onChange={e => setPrioridadFilter(e.target.value)}>
              <option value="all">Prioridad</option>
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>
            <select id="filtroOperario" value={operarioFilter} onChange={e => setOperarioFilter(e.target.value)}>
              <option value="all">Operario</option>
              {operarios.map(op => <option key={op.id} value={op.id}>{op.nombre}</option>)}
            </select>
            <select id="filtroEmpresa" value={empresaFilter} onChange={e => setEmpresaFilter(e.target.value)}>
              <option value="all">Empresa</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
            <input type="date" id="filtroDesde" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} />
            <input type="date" id="filtroHasta" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} />
            {(filtroDesde || filtroHasta) && (
              <button className="btn-secondary btn-sm" onClick={() => { setFiltroDesde(''); setFiltroHasta('') }}>
                <i className="fas fa-undo"></i>
              </button>
            )}
          </div>
        </div>

        {/* Tabla desktop */}
        <div className="table-container desktop-only">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Empresa</th><th>Asunto</th><th>Operarios</th>
                <th>Prioridad</th><th>Estado</th><th>Tiempo</th><th>Fecha</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody id="ticketsTableBody">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-state">
                    <i className="fas fa-inbox" style={{ display: 'block', fontSize: '2rem', color: '#cbd5e1', marginBottom: '12px' }}></i>
                    No hay tickets con los filtros actuales
                  </td>
                </tr>
              ) : (
                tickets.map(t => {
                  const asignados = t.ticket_asignaciones || []
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
                                <div key={a.user_id} className="avatar-operario"
                                  style={{ background: getAvatarColor(a.user_id) }} title={nombre}>
                                  {getInitials(nombre)}
                                </div>
                              )
                            })}
                        </div>
                      </td>
                      <td><PrioridadBadge p={t.prioridad} /></td>
                      <td><EstadoBadge e={t.estado} /></td>
                      <td style={{ fontWeight: 600, color: estadoCerrado ? 'var(--gray)' : 'var(--primary)', fontSize: '0.82rem' }}>
                        {formatHoras(t.horas_transcurridas || 0)}
                        {estadoCerrado && <i className="fas fa-lock" style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: '4px' }} title="Tiempo cerrado"></i>}
                      </td>
                      <td style={{ color: 'var(--gray)', fontSize: '0.82rem' }}>{formatFechaCorta(t.created_at)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn-action btn-edit" onClick={() => abrirModalEditarTicket(t)} title="Editar">
                          <i className="fas fa-edit"></i>
                        </button>
                        {isAdmin() && (
                          <button className="btn-action btn-delete" onClick={() => eliminarTicketLista(t.id)} title="Eliminar">
                            <i className="fas fa-trash"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Cards mobile */}
        <div className="mobile-only" id="ticketsCardsList">
          {tickets.length === 0 ? (
            <div className="empty-state"><i className="fas fa-inbox"></i><br />Sin tickets</div>
          ) : (
            tickets.map(t => {
              const asignados = t.ticket_asignaciones || []
              const nombresOps = asignados.map(a => a.profiles?.nombre).filter(Boolean).join(', ')
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