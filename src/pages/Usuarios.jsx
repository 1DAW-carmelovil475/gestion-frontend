import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario } from '../services/api'
import './Usuarios.css'

// ============================================================
// MODAL: USUARIO
// ============================================================
function UserModal({ editingUser, onSave, onClose }) {
  return (
    <div
      className="modal"
      style={{ display: 'flex' }}
      onClick={e => e.target.classList.contains('modal') && onClose()}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2>
            <i className={`fas ${editingUser ? 'fa-user-edit' : 'fa-user-plus'}`}></i>
            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={onSave}>
          <div className="modal-body">

            {/* Nombre */}
            <div className="form-group">
              <label><i className="fas fa-id-badge"></i> Nombre completo *</label>
              <input
                type="text"
                name="nombre"
                defaultValue={editingUser?.nombre}
                placeholder="Ej: María García López"
                required
              />
            </div>

            {/* Email — solo en creación */}
            {!editingUser && (
              <div className="form-group">
                <label><i className="fas fa-envelope"></i> Email *</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Ej: maria.garcia@holainformatica.com"
                  required
                />
              </div>
            )}

            {/* Rol */}
            <div className="form-group">
              <label><i className="fas fa-user-tag"></i> Rol *</label>
              <select name="rol" defaultValue={editingUser?.rol || 'trabajador'}>
                <option value="trabajador">Trabajador — acceso estándar</option>
                <option value="admin">Administrador — acceso total</option>
              </select>
            </div>

            {/* Estado — solo en edición */}
            {editingUser && (
              <div className="form-group">
                <label><i className="fas fa-toggle-on"></i> Estado</label>
                <select name="activo" defaultValue={String(editingUser.activo)}>
                  <option value="true">Activo</option>
                  <option value="false">Desactivado</option>
                </select>
              </div>
            )}

            {/* Contraseña — solo en creación */}
            {!editingUser && (
              <div className="form-group">
                <label><i className="fas fa-lock"></i> Contraseña *</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Mínimo 8 caracteres recomendado"
                  required
                />
              </div>
            )}

            {/* Hint info */}
            {!editingUser && (
              <div className="user-modal-hint">
                <i className="fas fa-info-circle"></i>
                Recuerda que la contraseña debe ser segura.
              </div>
            )}
          </div>

          <div className="modal-buttons">
            <button type="submit" className="btn-primary">
              <i className="fas fa-save"></i> Guardar
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// PÁGINA USUARIOS
// ============================================================
export default function Usuarios() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [usuarios, setUsuarios]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [searchTerm, setSearchTerm]   = useState('')
  const [rolFilter, setRolFilter]     = useState('all')
  const [estadoFilter, setEstadoFilter] = useState('all')

  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser]     = useState(null)

  useEffect(() => {
    if (!isAdmin()) { navigate('/'); return }
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getUsuarios()
      setUsuarios(data || [])
    } catch (error) {
      showToast('error', 'Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    if (confirm('¿Cerrar sesión?')) { logout(); navigate('/login') }
  }

  function openUserModal(u = null) {
    setEditingUser(u)
    setShowUserModal(true)
  }

  async function saveUser(e) {
    e.preventDefault()
    const formData = new FormData(e.target)
    const payload = {
      nombre: formData.get('nombre'),
      rol:    formData.get('rol'),
      activo: formData.get('activo') === 'true',
    }
    if (!editingUser) {
      payload.email    = formData.get('email')
      payload.password = formData.get('password')
    }
    try {
      if (editingUser) {
        await updateUsuario(editingUser.id, payload)
        showToast('success', 'Actualizado', 'Usuario actualizado correctamente')
      } else {
        await createUsuario(payload)
        showToast('success', 'Creado', 'Usuario creado correctamente')
      }
      setShowUserModal(false)
      await loadData()
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  async function handleDeleteUser(id, nombre) {
    if (!confirm(`¿Eliminar el usuario "${nombre}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteUsuario(id)
      showToast('success', 'Eliminado', `Usuario ${nombre} eliminado`)
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
    const icons = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-circle' }
    toast.innerHTML = `
      <i class="fas fa-${icons[type] || 'info-circle'}"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `
    container.appendChild(toast)
    setTimeout(() => { if (toast.parentElement) toast.remove() }, 5000)
  }

  function formatDate(str) {
    if (!str) return '—'
    const d = new Date(str)
    return isNaN(d) ? str : d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  // ── Filtrado ──────────────────────────────────────
  const filtered = usuarios.filter(u => {
    const s = searchTerm.toLowerCase()
    const matchSearch = !searchTerm ||
      u.nombre?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s)
    const matchRol    = rolFilter    === 'all' || u.rol === rolFilter
    const matchEstado = estadoFilter === 'all' ||
      (estadoFilter === 'activo'      && u.activo) ||
      (estadoFilter === 'desactivado' && !u.activo)
    return matchSearch && matchRol && matchEstado
  })

  const totalAdmins      = usuarios.filter(u => u.rol === 'admin').length
  const totalTrabajadores = usuarios.filter(u => u.rol === 'trabajador').length
  const totalActivos     = usuarios.filter(u => u.activo).length

  if (loading) {
    return (
      <div className="loading-screen">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Cargando usuarios…</p>
      </div>
    )
  }

  return (
    <div className="usuarios-page">
      <div className="toast-container" id="toastContainer"></div>

      {/* ── Topbar ─────────────────────────────────── */}
      <header className="topbar">
        <div className="logo">
          <img src="/img/logoHola.png" alt="Logo" />
          <span className="logo-text">Hola Informática</span>
        </div>
        <nav className="top-nav">
          <Link to="/"             className="nav-link"><i className="fas fa-building"></i> Empresas</Link>
          <Link to="/usuarios"     className="nav-link active"><i className="fas fa-users-cog"></i> Usuarios</Link>
          <Link to="/tickets"      className="nav-link"><i className="fas fa-headset"></i> Tickets</Link>
          <Link to="/estadisticas" className="nav-link"><i className="fas fa-chart-bar"></i> Estadísticas</Link>
          <Link to="/chat"         className="nav-link"><i className="fas fa-comments"></i> Chat</Link>
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
        <Link to="/"             className="bottom-nav-item"><i className="fas fa-building"></i><span>Empresas</span></Link>
        <Link to="/usuarios"     className="bottom-nav-item active"><i className="fas fa-users-cog"></i><span>Usuarios</span></Link>
        <Link to="/tickets"      className="bottom-nav-item"><i className="fas fa-headset"></i><span>Tickets</span></Link>
        <Link to="/estadisticas" className="bottom-nav-item"><i className="fas fa-chart-bar"></i><span>Stats</span></Link>
        <Link to="/chat"         className="bottom-nav-item"><i className="fas fa-comments"></i><span>Chat</span></Link>
      </nav>

      <main className="main-content">
        <div className="section-header">
          <div>
            <h1><i className="fas fa-users-cog"></i> Usuarios</h1>
            <p>Gestión de accesos y permisos del panel</p>
          </div>
          <button className="btn-primary" onClick={() => openUserModal()}>
            <i className="fas fa-user-plus"></i> Nuevo usuario
          </button>
        </div>

        {/* ── KPI Cards ────────────────────────────── */}
        <div className="stats">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-info">
              <h3>{usuarios.length}</h3>
              <p>Total usuarios</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>
              <i className="fas fa-user-shield"></i>
            </div>
            <div className="stat-info">
              <h3>{totalAdmins}</h3>
              <p>Administradores</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
              <i className="fas fa-user-tie"></i>
            </div>
            <div className="stat-info">
              <h3>{totalTrabajadores}</h3>
              <p>Trabajadores</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <i className="fas fa-user-check"></i>
            </div>
            <div className="stat-info">
              <h3>{totalActivos}</h3>
              <p>Activos</p>
            </div>
          </div>
        </div>

        {/* ── Filtros ──────────────────────────────── */}
        <div className="filters">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Buscar por nombre o email…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-row">
            <select value={rolFilter} onChange={e => setRolFilter(e.target.value)}>
              <option value="all">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="trabajador">Trabajador</option>
            </select>
            <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
              <option value="all">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="desactivado">Desactivado</option>
            </select>
          </div>
        </div>

        {/* ── Tabla (desktop) ──────────────────────── */}
        <div className="table-container desktop-only">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Alta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <i className="fas fa-user-slash"></i>
                      <p>No se encontraron usuarios</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <div
                        className="user-cell-avatar"
                        style={{ background: u.rol === 'admin' ? '#7c3aed' : '#0047b3' }}
                      >
                        {(u.nombre || u.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="user-cell-name">
                          {u.nombre}
                          {u.id === user?.id && (
                            <span className="badge-yo">Tú</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="u-email">{u.email}</td>
                  <td>
                    <span className={`badge-rol ${u.rol}`}>
                      <i className={`fas ${u.rol === 'admin' ? 'fa-shield-alt' : 'fa-user'}`}></i>
                      {u.rol === 'admin' ? 'Admin' : 'Trabajador'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge-estado ${u.activo ? 'activo' : 'inactivo'}`}>
                      {u.activo ? 'Activo' : 'Desactivado'}
                    </span>
                  </td>
                  <td className="u-fecha">{formatDate(u.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="btn-action btn-edit"
                        onClick={() => openUserModal(u)}
                        title="Editar usuario"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      {u.id !== user?.id && (
                        <button
                          className="btn-action btn-delete"
                          onClick={() => handleDeleteUser(u.id, u.nombre)}
                          title="Eliminar usuario"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Cards (mobile) ───────────────────────── */}
        <div className="mobile-only">
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ background: 'white', borderRadius: 10, padding: 40 }}>
              <i className="fas fa-user-slash"></i>
              <p>No se encontraron usuarios</p>
            </div>
          ) : filtered.map(u => (
            <div className="data-card" key={u.id}>
              <div className="data-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    className="user-cell-avatar"
                    style={{ background: u.rol === 'admin' ? '#7c3aed' : '#0047b3' }}
                  >
                    {(u.nombre || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="data-card-title">
                      {u.nombre}
                      {u.id === user?.id && <span className="badge-yo">Tú</span>}
                    </div>
                    <div className="data-card-subtitle">{u.email}</div>
                  </div>
                </div>
                <span className={`badge-estado ${u.activo ? 'activo' : 'inactivo'}`}>
                  {u.activo ? 'Activo' : 'Desactivado'}
                </span>
              </div>
              <div className="data-card-meta">
                <span>
                  <i className={`fas ${u.rol === 'admin' ? 'fa-shield-alt' : 'fa-user'}`}></i>
                  {u.rol === 'admin' ? 'Administrador' : 'Trabajador'}
                </span>
                <span><i className="fas fa-calendar-alt"></i> {formatDate(u.created_at)}</span>
              </div>
              <div className="data-card-actions">
                <button className="btn-action btn-edit" onClick={() => openUserModal(u)}>
                  <i className="fas fa-edit"></i> Editar
                </button>
                {u.id !== user?.id && (
                  <button className="btn-action btn-delete" onClick={() => handleDeleteUser(u.id, u.nombre)}>
                    <i className="fas fa-trash"></i> Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

      </main>

      {showUserModal && (
        <UserModal
          editingUser={editingUser}
          onSave={saveUser}
          onClose={() => setShowUserModal(false)}
        />
      )}
    </div>
  )
}