import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario, getEmpresas } from '../services/api'
import ChatNavLink from '../components/ChatNavLink'
import './Usuarios.css'

// Avatar helper functions
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

// ============================================================
// SEARCHABLE SELECT (igual que en Tickets)
// ============================================================
function SearchableSelect({ value, onChange, options, placeholder = 'Seleccionar...', required = false, name }) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const [typing, setTyping] = useState(false)
  const wrapRef             = useRef(null)
  const inputRef            = useRef(null)

  const selected     = options.find(o => o.value === value)
  const displayValue = typing ? query : (selected?.label || '')
  const filtered     = typing && query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setTyping(false); setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleInputChange(e) { setQuery(e.target.value); setTyping(true); setOpen(true) }
  function handleFocus() { setOpen(true); setTyping(true); setQuery(''); setTimeout(() => inputRef.current?.select(), 0) }
  function select(val) { onChange(val); setTyping(false); setQuery(''); setOpen(false) }
  function handleClear() { onChange(''); setTyping(true); setQuery(''); setOpen(true); inputRef.current?.focus() }

  return (
    <div className="ss-wrap" ref={wrapRef}>
      {required && <input type="text" name={name} value={value} onChange={() => {}} required style={{ display: 'none' }} />}
      <div className={`ss-input-wrap ${open ? 'open' : ''}`}>
        <i className="fas fa-search ss-input-icon"></i>
        <input ref={inputRef} className="ss-input" value={displayValue} onChange={handleInputChange}
          onFocus={handleFocus} placeholder={placeholder} autoComplete="off" />
        {value && !typing && (
          <button type="button" className="ss-clear-query" onMouseDown={e => { e.preventDefault(); handleClear() }}>
            <i className="fas fa-times"></i>
          </button>
        )}
        <i className={`fas fa-chevron-down ss-arrow ${open ? 'open' : ''}`}></i>
      </div>
      {open && (
        <div className="ss-dropdown">
          <div className="ss-list">
            {filtered.length === 0
              ? <div className="ss-empty">Sin resultados</div>
              : filtered.map(o => (
                  <div key={o.value} className={`ss-option ${value === o.value ? 'active' : ''}`}
                    onMouseDown={e => { e.preventDefault(); select(o.value) }}>
                    <span className="ss-opt-label">{o.label}</span>
                    {value === o.value && <i className="fas fa-check ss-opt-check"></i>}
                  </div>
                ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// MODAL: USUARIO
// ============================================================
function UserModal({ editingUser, empresas, onSave, onClose }) {
  const [showPwd, setShowPwd] = useState(false)
  const [rolSeleccionado, setRolSeleccionado] = useState(editingUser?.rol || 'trabajador')
  const [empresaId, setEmpresaId] = useState(editingUser?.empresa_id || '')

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
                  placeholder="Ej: maria.garcia@empresa.com"
                  required
                />
              </div>
            )}

            {/* Rol */}
            <div className="form-group">
              <label><i className="fas fa-user-tag"></i> Rol *</label>
              <select
                name="rol"
                defaultValue={editingUser?.rol || 'trabajador'}
                onChange={e => { setRolSeleccionado(e.target.value); if (e.target.value !== 'cliente') setEmpresaId('') }}
              >
                <option value="trabajador">Trabajador — acceso estándar</option>
                <option value="gestor">Gestor — recibe incidencias de clientes</option>
                <option value="admin">Administrador — acceso total</option>
                <option value="cliente">Cliente — portal de incidencias</option>
              </select>
            </div>

            {/* Empresa — solo para clientes */}
            {rolSeleccionado === 'cliente' && (
              <div className="form-group">
                <label><i className="fas fa-building"></i> {editingUser ? 'Empresa asignada' : 'Añadir a empresa *'}</label>
                <SearchableSelect
                  name="empresa_id"
                  value={empresaId}
                  onChange={setEmpresaId}
                  options={empresas.map(e => ({ value: e.id, label: e.nombre }))}
                  placeholder="Buscar empresa..."
                  required={!editingUser}
                />
              </div>
            )}

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

            {/* Contraseña */}
            <div className="form-group">
              <label>
                <i className="fas fa-lock"></i>{' '}
                {editingUser ? 'Nueva contraseña' : 'Contraseña *'}
                {editingUser && (
                  <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.78rem', marginLeft: 6 }}>
                    (dejar vacío para no cambiar)
                  </span>
                )}
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  name="password"
                  placeholder={editingUser ? 'Nueva contraseña...' : 'Mínimo 8 caracteres recomendado'}
                  required={!editingUser}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{
                    position: 'absolute', right: 10,
                    background: 'none', border: 'none',
                    color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem', padding: 0,
                  }}
                  title={showPwd ? 'Ocultar' : 'Mostrar'}
                >
                  <i className={`fas ${showPwd ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            {/* Hint info */}
            <div className="user-modal-hint">
              <i className="fas fa-info-circle"></i>
              {editingUser
                ? 'La contraseña solo se cambiará si introduces un valor. Mínimo 6 caracteres.'
                : 'Recuerda que la contraseña debe ser segura.'}
            </div>
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
  const [empresas, setEmpresas]       = useState([])
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
      const [usersData, empresasData] = await Promise.all([getUsuarios(), getEmpresas()])
      setUsuarios(usersData || [])
      setEmpresas(empresasData || [])
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
    const rolValue = formData.get('rol')
    const payload = {
      nombre: formData.get('nombre'),
      rol:    rolValue,
      activo: formData.get('activo') === 'true',
    }
    if (!editingUser) {
      payload.email    = formData.get('email')
      payload.password = formData.get('password')
      if (rolValue === 'cliente') {
        payload.empresa_id = formData.get('empresa_id')
      }
    } else {
      const pwd = formData.get('password')?.trim()
      if (pwd) payload.password = pwd
      if (rolValue === 'cliente') {
        payload.empresa_id = formData.get('empresa_id') || null
      }
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

  function getRolLabel(rol) {
    const labels = { admin: 'Admin', trabajador: 'Trabajador', gestor: 'Gestor', cliente: 'Cliente' }
    return labels[rol] || rol
  }

  function getRolIcon(rol) {
    const icons = { admin: 'fa-shield-alt', trabajador: 'fa-user', gestor: 'fa-user-tie', cliente: 'fa-user-tag' }
    return icons[rol] || 'fa-user'
  }

  function getRolColor(rol) {
    const colors = { admin: '#7c3aed', trabajador: '#0047b3', gestor: '#0891b2', cliente: '#16a34a' }
    return colors[rol] || '#0047b3'
  }

  // ── Filtrado ──────────────────────────────────────
  const filtered = usuarios.filter(u => {
    const s = searchTerm.toLowerCase()
    const matchSearch = !searchTerm ||
      u.nombre?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.empresa_nombre?.toLowerCase().includes(s)
    const matchRol    = rolFilter    === 'all' || u.rol === rolFilter
    const matchEstado = estadoFilter === 'all' ||
      (estadoFilter === 'activo'      && u.activo) ||
      (estadoFilter === 'desactivado' && !u.activo)
    return matchSearch && matchRol && matchEstado
  })

  const totalAdmins      = usuarios.filter(u => u.rol === 'admin').length
  const totalTrabajadores = usuarios.filter(u => u.rol === 'trabajador').length
  const totalGestores    = usuarios.filter(u => u.rol === 'gestor').length
  const totalClientes    = usuarios.filter(u => u.rol === 'cliente').length
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
          <ChatNavLink mode="top" />
        </nav>
        <div className="user-area">
          <div className="user-info">
            <div className="user-avatar" style={{ background: getAvatarColor(user?.id) }}>
              {getInitials(user?.nombre || user?.email)}
            </div>
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
        <ChatNavLink mode="bottom" />
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
              <h3>{totalTrabajadores + totalGestores}</h3>
              <p>Trabajadores / Gestores</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <i className="fas fa-user-tag"></i>
            </div>
            <div className="stat-info">
              <h3>{totalClientes}</h3>
              <p>Clientes</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef9c3', color: '#ca8a04' }}>
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
              placeholder="Buscar por nombre, email o empresa…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-row">
            <select value={rolFilter} onChange={e => setRolFilter(e.target.value)}>
              <option value="all">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="trabajador">Trabajador</option>
              <option value="gestor">Gestor</option>
              <option value="cliente">Cliente</option>
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
                <th>Empresa</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Alta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7">
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
                        style={{ background: getRolColor(u.rol) }}
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
                  <td style={{ color: u.empresa_nombre ? '#222' : '#aaa', fontSize: '0.9rem' }}>
                    {u.empresa_nombre || '—'}
                  </td>
                  <td>
                    <span className={`badge-rol ${u.rol}`}>
                      <i className={`fas ${getRolIcon(u.rol)}`}></i>
                      {getRolLabel(u.rol)}
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
                    style={{ background: getRolColor(u.rol) }}
                  >
                    {(u.nombre || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="data-card-title">
                      {u.nombre}
                      {u.id === user?.id && <span className="badge-yo">Tú</span>}
                    </div>
                    <div className="data-card-subtitle">{u.email}</div>
                    {u.empresa_nombre && (
                      <div className="data-card-subtitle" style={{ color: '#0047b3' }}>
                        <i className="fas fa-building" style={{ marginRight: 4 }}></i>
                        {u.empresa_nombre}
                      </div>
                    )}
                  </div>
                </div>
                <span className={`badge-estado ${u.activo ? 'activo' : 'inactivo'}`}>
                  {u.activo ? 'Activo' : 'Desactivado'}
                </span>
              </div>
              <div className="data-card-meta">
                <span>
                  <i className={`fas ${getRolIcon(u.rol)}`}></i>
                  {getRolLabel(u.rol)}
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
          empresas={empresas}
          onSave={saveUser}
          onClose={() => setShowUserModal(false)}
        />
      )}
    </div>
  )
}
