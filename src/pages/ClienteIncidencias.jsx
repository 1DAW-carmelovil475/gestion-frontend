import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getIncidenciasCliente, createIncidencia, getTicket, getArchivoUrl } from '../services/api'
import ThemeToggle from '../components/ThemeToggle'
import './ClienteIncidencias.css'


function formatDate(str) {
  if (!str) return '—'
  const d = new Date(str)
  return isNaN(d) ? str : d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── MODAL NUEVA INCIDENCIA ────────────────────────────────────────────────────
function NuevaIncidenciaModal({ onSave, onClose, loading }) {
  const [archivos, setArchivos] = useState([])

  function handleFileChange(e) {
    const nuevos = Array.from(e.target.files)
    setArchivos(prev => [...prev, ...nuevos])
    e.target.value = ''
  }

  function removeFile(idx) {
    setArchivos(prev => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave(e, archivos)
  }

  return (
    <div className="ci-modal-overlay" onClick={e => e.target.classList.contains('ci-modal-overlay') && onClose()}>
      <div className="ci-modal">
        <div className="ci-modal-header">
          <h2><i className="fas fa-plus-circle"></i> Nueva incidencia</h2>
          <button className="ci-modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ci-modal-body">
            <div className="ci-form-group">
              <label><i className="fas fa-tag"></i> Asunto *</label>
              <input
                type="text"
                name="asunto"
                placeholder="Describe brevemente el problema..."
                required
                autoFocus
              />
            </div>
            <div className="ci-form-group">
              <label><i className="fas fa-align-left"></i> Descripción</label>
              <textarea
                name="descripcion"
                placeholder="Explica con más detalle qué está ocurriendo, cuándo empezó, qué has intentado..."
                rows={4}
              />
            </div>
            <div className="ci-form-group">
              <label><i className="fas fa-paperclip"></i> Archivos adjuntos</label>
              <label className="ci-file-label" htmlFor="ci-file-input">
                <i className="fas fa-upload"></i>
                Seleccionar archivos (imágenes, PDF, documentos...)
              </label>
              <input
                id="ci-file-input"
                type="file"
                className="ci-file-input"
                multiple
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
              />
              {archivos.length > 0 && (
                <ul className="ci-file-list">
                  {archivos.map((f, i) => (
                    <li key={i} className="ci-file-item">
                      <i className="fas fa-file"></i>
                      <span title={f.name}>{f.name}</span>
                      <span className="ci-file-size">{formatFileSize(f.size)}</span>
                      <button type="button" className="ci-file-remove" onClick={() => removeFile(i)} title="Quitar">
                        <i className="fas fa-times"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="ci-form-hint">
              <i className="fas fa-info-circle"></i>
              Tu incidencia será atendida por nuestro equipo lo antes posible.
            </div>
          </div>

          <div className="ci-modal-footer">
            <button type="submit" className="ci-btn-primary" disabled={loading}>
              {loading
                ? <><i className="fas fa-spinner fa-spin"></i> Enviando...</>
                : <><i className="fas fa-paper-plane"></i> Enviar incidencia</>
              }
            </button>
            <button type="button" className="ci-btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function getFileIcon(mime) {
  if (!mime) return 'fa-file'
  if (mime.startsWith('image/'))                           return 'fa-file-image'
  if (mime === 'application/pdf')                          return 'fa-file-pdf'
  if (mime.includes('word'))                               return 'fa-file-word'
  if (mime.includes('excel') || mime.includes('sheet'))    return 'fa-file-excel'
  if (mime.includes('zip') || mime.includes('compressed')) return 'fa-file-archive'
  if (mime.startsWith('video/'))                           return 'fa-file-video'
  return 'fa-file'
}

// ── MODAL DETALLE INCIDENCIA ──────────────────────────────────────────────────
function DetalleModal({ inc, onClose, showEmpresa }) {
  const [archivos, setArchivos] = useState([])
  const [loadingArchivos, setLoadingArchivos] = useState(false)

  useEffect(() => {
    if (!inc?.id) return
    setLoadingArchivos(true)
    getTicket(inc.id)
      .then(data => setArchivos(data?.ticket_archivos || []))
      .catch(() => {})
      .finally(() => setLoadingArchivos(false))
  }, [inc?.id])

  async function handleDownload(archivo) {
    try {
      const { url } = await getArchivoUrl(archivo.id)
      window.open(url, '_blank')
    } catch {}
  }

  if (!inc) return null
  return (
    <div className="ci-modal-overlay" onClick={e => e.target.classList.contains('ci-modal-overlay') && onClose()}>
      <div className="ci-modal">
        <div className="ci-modal-header">
          <h2><i className="fas fa-exclamation-triangle"></i> Detalle de incidencia</h2>
          <button className="ci-modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="ci-modal-body">
          <div className="ci-detalle-field">
            <span className="ci-detalle-label"><i className="fas fa-tag"></i> Asunto</span>
            <span className="ci-detalle-value">{inc.asunto}</span>
          </div>
          {showEmpresa && inc.empresas?.nombre && (
            <div className="ci-detalle-field">
              <span className="ci-detalle-label"><i className="fas fa-building"></i> Empresa</span>
              <span className="ci-detalle-value">{inc.empresas.nombre}</span>
            </div>
          )}
          <div className="ci-detalle-field">
            <span className="ci-detalle-label"><i className="fas fa-info-circle"></i> Estado</span>
            <span className={`status ${inc.estado.replace(/ /g, '-')}`}>{inc.estado}</span>
          </div>
          <div className="ci-detalle-field">
            <span className="ci-detalle-label"><i className="fas fa-calendar-alt"></i> Fecha</span>
            <span className="ci-detalle-value">{formatDate(inc.created_at)}</span>
          </div>
          {inc.descripcion && (
            <div className="ci-detalle-field ci-detalle-field--col">
              <span className="ci-detalle-label"><i className="fas fa-align-left"></i> Descripción</span>
              <p className="ci-detalle-desc">{inc.descripcion}</p>
            </div>
          )}
          <div className="ci-detalle-field ci-detalle-field--col">
            <span className="ci-detalle-label"><i className="fas fa-paperclip"></i> Archivos adjuntos</span>
            {loadingArchivos ? (
              <span className="ci-archivos-loading"><i className="fas fa-spinner fa-spin"></i> Cargando...</span>
            ) : archivos.length === 0 ? (
              <span className="ci-archivos-empty">Sin archivos adjuntos</span>
            ) : (
              <ul className="ci-file-list">
                {archivos.map(a => (
                  <li key={a.id} className="ci-file-item ci-file-item--download" onClick={() => handleDownload(a)}>
                    <i className={`fas ${getFileIcon(a.mime_type)}`}></i>
                    <span title={a.nombre_original}>{a.nombre_original}</span>
                    {a.tamanio && <span className="ci-file-size">{formatFileSize(a.tamanio)}</span>}
                    <i className="fas fa-download ci-file-download-icon"></i>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="ci-modal-footer">
          <button className="ci-btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function ClienteIncidencias() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [incidencias, setIncidencias] = useState([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [showModal, setShowModal]     = useState(false)
  const [detalle, setDetalle]         = useState(null)
  const [toast, setToast]             = useState(null)

  const empresaNombre = user?.empresa_nombre || 'Mi empresa'

  // Mostrar columna empresa si los tickets pertenecen a más de una empresa (cliente es matriz)
  const multiEmpresa = new Set(incidencias.map(i => i.empresa_id)).size > 1

  useEffect(() => {
    loadIncidencias()
  }, [])

  async function loadIncidencias() {
    setLoading(true)
    try {
      const data = await getIncidenciasCliente()
      setIncidencias(data || [])
    } catch (err) {
      showToast('error', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e, archivos = []) {
    const raw = new FormData(e.target)
    const fd  = new FormData()
    fd.append('asunto',      raw.get('asunto'))
    fd.append('descripcion', raw.get('descripcion') || '')
    fd.append('file_names',  JSON.stringify(archivos.map(f => f.name)))
    archivos.forEach(f => fd.append('archivos', f, f.name))
    setSaving(true)
    try {
      await createIncidencia(fd)
      setShowModal(false)
      showToast('success', 'Incidencia enviada correctamente. Nuestro equipo la atenderá pronto.')
      await loadIncidencias()
    } catch (err) {
      showToast('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  function showToast(type, message) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 5000)
  }

  function handleLogout() {
    if (confirm('¿Cerrar sesión?')) { logout(); navigate('/login') }
  }

  return (
    <div className="ci-page">

      {/* ── Toast ──────────────────────────────────── */}
      {toast && (
        <div className={`ci-toast ci-toast--${toast.type}`}>
          <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)}><i className="fas fa-times"></i></button>
        </div>
      )}

      {/* ── Topbar (igual que admin/trabajador) ────── */}
      <header className="topbar">
        <div className="logo">
          <img src="/img/logoHola.png" alt="Logo Hola Informática" />
          <span className="logo-text">{empresaNombre}</span>
        </div>
        <div className="user-area">
          <div className="user-info">
            <div className="user-avatar" style={{ background: '#0047b3' }}>
              {(user?.nombre || '?').charAt(0).toUpperCase()}
            </div>
            <span>{user?.nombre}</span>
          </div>
          <ThemeToggle />
          <button className="btn-logout" onClick={handleLogout} title="Cerrar sesión">
            <i className="fas fa-sign-out-alt"></i><span>Salir</span>
          </button>
        </div>
      </header>

      {/* ── Contenido ──────────────────────────────── */}
      <main className="ci-main">
        <div className="ci-section-header">
          <div>
            <h1><i className="fas fa-exclamation-triangle"></i> Incidencias</h1>
            <p>Historial de incidencias de <strong>{empresaNombre}</strong></p>
          </div>
          <button className="ci-btn-primary" onClick={() => setShowModal(true)}>
            <i className="fas fa-plus"></i> Nueva incidencia
          </button>
        </div>

        {/* ── Tabla ───────────────────────────────── */}
        {loading ? (
          <div className="ci-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Cargando incidencias...</p>
          </div>
        ) : incidencias.length === 0 ? (
          <div className="ci-empty">
            <i className="fas fa-check-circle"></i>
            <h3>Todo en orden</h3>
            <p>No tienes incidencias registradas.</p>
            <button className="ci-btn-primary" onClick={() => setShowModal(true)}>
              <i className="fas fa-plus"></i> Crear primera incidencia
            </button>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="ci-table-wrap desktop-only">
              <table className="ci-table">
                <thead>
                  <tr>
                    <th>Asunto</th>
                    {multiEmpresa && <th>Empresa</th>}
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {incidencias.map(inc => {
                    return (
                      <tr key={inc.id} className="ci-row-clickable" onClick={() => setDetalle(inc)}>
                        <td className="ci-asunto">{inc.asunto}</td>
                        {multiEmpresa && (
                          <td className="ci-empresa-col">
                            <span className="ci-empresa-tag">
                              <i className="fas fa-building"></i> {inc.empresas?.nombre || '—'}
                            </span>
                          </td>
                        )}
                        <td>
                          <span className={`status ${inc.estado.replace(/ /g, '-')}`}>{inc.estado}</span>
                        </td>
                        <td className="ci-fecha">{formatDate(inc.created_at)}</td>
                        <td className="ci-ver"><i className="fas fa-eye"></i></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="ci-cards mobile-only">
              {incidencias.map(inc => {
                return (
                  <div className="ci-card ci-row-clickable" key={inc.id} onClick={() => setDetalle(inc)}>
                    <div className="ci-card-top">
                      <span className={`status ${inc.estado.replace(/ /g, '-')}`}>{inc.estado}</span>
                      <i className="fas fa-eye ci-card-eye"></i>
                    </div>
                    <div className="ci-card-asunto">{inc.asunto}</div>
                    {multiEmpresa && inc.empresas?.nombre && (
                      <div className="ci-card-empresa">
                        <i className="fas fa-building"></i> {inc.empresas.nombre}
                      </div>
                    )}
                    <div className="ci-card-fecha">
                      <i className="fas fa-calendar-alt"></i> {formatDate(inc.created_at)}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>

      {/* ── Modal nueva incidencia ──────────────── */}
      {showModal && (
        <NuevaIncidenciaModal
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          loading={saving}
        />
      )}

      {/* ── Modal detalle incidencia ────────────── */}
      {detalle && (
        <DetalleModal inc={detalle} onClose={() => setDetalle(null)} showEmpresa={multiEmpresa} />
      )}
    </div>
  )
}
