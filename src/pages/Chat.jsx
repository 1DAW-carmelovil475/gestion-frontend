import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getChatCanales, createChatCanal, deleteChatCanal, getChatMensajes, sendChatMensaje, deleteChatMensaje, getOperarios } from '../services/api'
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

export default function Chat() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  
  const [canales, setCanales] = useState([])
  const [operarios, setOperarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [canalActual, setCanalActual] = useState(null)
  const [mensajes, setMensajes] = useState([])
  const [mensajeText, setMensajeText] = useState('')
  const [pendingFiles, setPendingFiles] = useState([])
  
  // Modals
  const [showCanalModal, setShowCanalModal] = useState(false)
  const [showDirectoModal, setShowDirectoModal] = useState(false)
  
  const mensajesEndRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (canalActual) {
      loadMensajes(canalActual.id)
    }
  }, [canalActual])

  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  async function loadData() {
    setLoading(true)
    try {
      const [canalesData, operariosData] = await Promise.all([
        getChatCanales(),
        getOperarios()
      ])
      setCanales(canalesData || [])
      setOperarios(operariosData || [])
    } catch (error) {
      showToast('error', 'Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadMensajes(canalId) {
    try {
      const data = await getChatMensajes(canalId)
      setMensajes(data || [])
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  function handleLogout() {
    if (confirm('¿Cerrar sesión?')) {
      logout()
      navigate('/login')
    }
  }

  // Select canal
  function selectCanal(canal) {
    setCanalActual(canal)
  }

  // Create canal
  async function crearCanal(e) {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    const seleccionados = [...document.querySelectorAll('.operario-checkbox:checked')].map(el => el.value)
    
    try {
      await createChatCanal({
        nombre: formData.get('nombre'),
        descripcion: formData.get('descripcion') || null,
        tipo: 'canal',
        miembros: seleccionados
      })
      showToast('success', 'Creado', 'Canal creado correctamente')
      setShowCanalModal(false)
      loadData()
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  // Create direct message
  async function crearDirecto(userId) {
    try {
      await createChatCanal({
        nombre: `directo-${userId}`,
        descripcion: null,
        tipo: 'directo',
        miembros: [userId]
      })
      showToast('success', 'Creado', 'Conversación iniciada')
      setShowDirectoModal(false)
      loadData()
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  // Send message
  async function enviarMensaje() {
    if (!canalActual) return
    if (!mensajeText.trim() && !pendingFiles.length) return

    try {
      await sendChatMensaje(canalActual.id, mensajeText, null, pendingFiles)
      setMensajeText('')
      setPendingFiles([])
      loadMensajes(canalActual.id)
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  // Delete message
  async function eliminarMensaje(id) {
    if (!confirm('¿Eliminar este mensaje?')) return
    try {
      await deleteChatMensaje(id)
      showToast('success', 'Eliminado', 'Mensaje eliminado')
      loadMensajes(canalActual.id)
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  // Delete canal
  async function eliminarCanal() {
    if (!canalActual || !isAdmin()) return
    if (!confirm(`¿Eliminar el canal "${canalActual.nombre}"?`)) return
    try {
      await deleteChatCanal(canalActual.id)
      showToast('success', 'Eliminado', 'Canal eliminado')
      setCanalActual(null)
      loadData()
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  // File handlers
  function handleFileSelect(e) {
    const files = Array.from(e.target.files)
    setPendingFiles([...pendingFiles, ...files])
  }

  function removePendingFile(index) {
    setPendingFiles(pendingFiles.filter((_, i) => i !== index))
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensaje()
    }
  }

  // Helpers
  function escHtml(str) {
    if (str == null) return ''
    return String(str).replace(/&/g, '&amp;').replace(/</g, '<').replace(/>/g, '>')
  }

  function formatFecha(isoStr) {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  function showToast(type, title, message) {
    const container = document.getElementById('toastContainer')
    if (!container) return
    const toast = document.createElement('div')
    toast.className = `toast ${type}`
    const icons = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-circle' }
    toast.innerHTML = `
      <i class="fas fa-${icons[type]}"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `
    container.appendChild(toast)
    setTimeout(() => { if (toast.parentElement) toast.remove() }, 5000)
  }

  const canalesList = canales.filter(c => c.tipo === 'canal')
  const directosList = canales.filter(c => c.tipo === 'directo')

  if (loading) {
    return (
      <div className="loading-screen">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="chat-page">
      <div className="toast-container" id="toastContainer"></div>
      
      <header className="topbar">
        <div className="logo">
          <img src="/img/logoHola.png" alt="Logo" />
          <span className="logo-text">Hola Informática</span>
        </div>
        <nav className="top-nav">
          <Link to="/" className="nav-link"><i className="fas fa-building"></i> Empresas</Link>
          <Link to="/tickets" className="nav-link"><i className="fas fa-headset"></i> Tickets</Link>
          <Link to="/estadisticas" className="nav-link" data-admin-only><i className="fas fa-chart-bar"></i> Estadísticas</Link>
          <Link to="/chat" className="nav-link active"><i className="fas fa-comments"></i> Chat</Link>
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

      <div className="chat-layout">
        {/* Sidebar */}
        <aside className="chat-sidebar">
          <div className="chat-sidebar-header">
            <div className="workspace-info">
              <div className="workspace-icon">
                <i className="fas fa-comments"></i>
              </div>
              <div>
                <div className="workspace-name">Chat del equipo</div>
                <div className="workspace-sub">Hola Informática</div>
              </div>
            </div>
          </div>

          {/* Canales */}
          <div className="canal-section">
            <div className="canal-section-header">
              <span>Canales</span>
              <button className="btn-canal-nuevo" onClick={() => setShowCanalModal(true)}>
                <i className="fas fa-plus"></i>
              </button>
            </div>
            <div className="canales-list">
              {canalesList.length === 0 ? (
                <div className="canal-empty">Sin canales</div>
              ) : (
                canalesList.map(canal => (
                  <div 
                    key={canal.id} 
                    className={`canal-item ${canalActual?.id === canal.id ? 'active' : ''}`}
                    onClick={() => selectCanal(canal)}
                  >
                    <i className="fas fa-hashtag"></i>
                    <span>{canal.nombre}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Mensajes Directos */}
          <div className="canal-section">
            <div className="canal-section-header">
              <span>Mensajes directos</span>
              <button className="btn-canal-nuevo" onClick={() => setShowDirectoModal(true)}>
                <i className="fas fa-plus"></i>
              </button>
            </div>
            <div className="canales-list">
              {directosList.length === 0 ? (
                <div className="canal-empty">Sin mensajes</div>
              ) : (
                directosList.map(canal => (
                  <div 
                    key={canal.id} 
                    className={`canal-item ${canalActual?.id === canal.id ? 'active' : ''}`}
                    onClick={() => selectCanal(canal)}
                  >
                    <i className="fas fa-user"></i>
                    <span>
                      {canal.chat_canales_miembros
                        ?.filter(m => m.user_id !== user?.id)
                        .map(m => m.profiles?.nombre || 'Desconocido')
                        .join(', ') || 'Chat'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Main Area */}
        <section className="chat-main">
          {!canalActual ? (
            <div className="chat-empty">
              <i className="fas fa-comments"></i>
              <h2>Bienvenido al chat del equipo</h2>
              <p>Selecciona un canal de la barra lateral para empezar a chatear</p>
            </div>
          ) : (
            <div className="chat-canal">
              <div className="chat-canal-header">
                <div className="chat-canal-info">
                  <div className="chat-canal-icono">
                    <i className={`fas ${canalActual.tipo === 'directo' ? 'fa-user' : 'fa-hashtag'}`}></i>
                  </div>
                  <div>
                    <div className="chat-canal-nombre">{canalActual.nombre}</div>
                    <div className="chat-canal-desc">{canalActual.descripcion || ''}</div>
                  </div>
                </div>
                {isAdmin() && (
                  <button className="btn-action btn-delete" onClick={eliminarCanal}>
                    <i className="fas fa-trash"></i>
                  </button>
                )}
              </div>

              <div className="chat-mensajes">
                {mensajes.length === 0 ? (
                  <div className="chat-mensajes-empty">
                    <i className="fas fa-comment-dots"></i>
                    <p>Sin mensajes aún</p>
                  </div>
                ) : (
                  mensajes.map(msg => (
                    <div key={msg.id} className={`chat-mensaje ${msg.user_id === user?.id ? 'own' : ''}`}>
                      <div className="chat-mensaje-avatar" style={{background: getAvatarColor(msg.user_id)}}>
                        {getInitials(msg.profiles?.nombre)}
                      </div>
                      <div className="chat-mensaje-body">
                        <div className="chat-mensaje-meta">
                          <strong>{msg.profiles?.nombre || 'Desconocido'}</strong>
                          <span>{formatFecha(msg.created_at)}</span>
                          {(msg.user_id === user?.id || isAdmin()) && (
                            <button className="btn-delete-msg" onClick={() => eliminarMensaje(msg.id)}>
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </div>
                        <div className="chat-mensaje-text">{escHtml(msg.contenido)}</div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={mensajesEndRef} />
              </div>

              <div className="chat-input">
                {pendingFiles.length > 0 && (
                  <div className="pending-files">
                    {pendingFiles.map((f, i) => (
                      <div key={i} className="pending-file">
                        <span>{f.name}</span>
                        <button onClick={() => removePendingFile(i)}><i className="fas fa-times"></i></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="chat-input-row">
                  <label className="btn-attach">
                    <i className="fas fa-paperclip"></i>
                    <input type="file" multiple onChange={handleFileSelect} style={{display: 'none'}} />
                  </label>
                  <textarea
                    placeholder="Escribe un mensaje..."
                    value={mensajeText}
                    onChange={(e) => setMensajeText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                  />
                  <button className="chat-send-btn" onClick={enviarMensaje}>
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* New Canal Modal */}
      {showCanalModal && (
        <div className="modal" style={{display: 'flex'}} onClick={(e) => e.target.classList.contains('modal') && setShowCanalModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h2><i className="fas fa-hashtag"></i> Nuevo Canal</h2>
              <button className="modal-close" onClick={() => setShowCanalModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={crearCanal}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre del canal *</label>
                  <input type="text" name="nombre" placeholder="ej: soporte, proyectos, general..." required />
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <input type="text" name="descripcion" placeholder="¿Para qué se usará este canal?" />
                </div>
                <div className="form-group">
                  <label>Añadir miembros</label>
                  <div className="operarios-checkboxes">
                    {operarios.filter(o => o.id !== user?.id).map(op => (
                      <label key={op.id} className="operario-checkbox">
                        <input type="checkbox" className="operario-checkbox" value={op.id} />
                        <div className="avatar" style={{background: getAvatarColor(op.id)}}>
                          {getInitials(op.nombre)}
                        </div>
                        <span>{op.nombre}</span>
                      </label>
                    ))}
                  </div>
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

      {/* New Directo Modal */}
      {showDirectoModal && (
        <div className="modal" style={{display: 'flex'}} onClick={(e) => e.target.classList.contains('modal') && setShowDirectoModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h2><i className="fas fa-user"></i> Mensaje Directo</h2>
              <button className="modal-close" onClick={() => setShowDirectoModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body">
              <p className="modal-hint">Selecciona el compañero al que quieres escribir:</p>
              <div className="operarios-checkboxes">
                {operarios.filter(o => o.id !== user?.id).map(op => (
                  <label key={op.id} className="operario-checkbox" onClick={() => crearDirecto(op.id)}>
                    <div className="avatar" style={{background: getAvatarColor(op.id)}}>
                      {getInitials(op.nombre)}
                    </div>
                    <span>{op.nombre}</span>
                  </label>
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
