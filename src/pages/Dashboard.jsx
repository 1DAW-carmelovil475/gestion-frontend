import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getEmpresas, createEmpresa, updateEmpresa, deleteEmpresa,
  getDispositivos, createDispositivo, updateDispositivo, deleteDispositivo,
  getTickets, getUsuarios, createUsuario, updateUsuario, deleteUsuario
} from '../services/api'
import * as XLSX from 'xlsx'
import './Dashboard.css'

const SERVICIOS = ['Cloud', 'Soporte', 'Hardware', 'Redes', 'Seguridad', 'Backup']

const TIPO_SUGERENCIAS = {
  equipo:   ['PC', 'Portátil', 'Cámara de Seguridad', 'Impresora', 'Tablet', 'All-in-One'],
  servidor: ['Servidor Físico', 'Servidor Virtual', 'Servidor de Archivos'],
  nas:      ['NAS Synology', 'NAS QNAP'],
  red:      ['Router', 'Switch', 'Access Point', 'Firewall', 'Modem'],
  otro:     ['Otro'],
}

const CAMPOS = {
  equipo: [
    { key: 'tipo',       label: 'Tipo' },
    { key: 'usuario',    label: 'Usuario' },
    { key: 'password',   label: 'Contraseña', password: true },
    { key: 'ip',         label: 'IP' },
    { key: 'anydesk_id', label: 'AnyDesk ID' },
  ],
  servidor: [
    { key: 'tipo',              label: 'Tipo' },
    { key: 'ip',                label: 'IP' },
    { key: 'usuario',           label: 'Usuario' },
    { key: 'password',          label: 'Contraseña', password: true },
    { key: 'sistema_operativo', label: 'S.O.' },
  ],
  nas: [
    { key: 'tipo',     label: 'Tipo' },
    { key: 'ip',       label: 'IP' },
    { key: 'usuario',  label: 'Usuario' },
    { key: 'password', label: 'Contraseña', password: true },
    { key: 'capacidad',label: 'Capacidad' },
  ],
  red: [
    { key: 'tipo',     label: 'Tipo' },
    { key: 'ip',       label: 'IP' },
    { key: 'usuario',  label: 'Usuario' },
    { key: 'password', label: 'Contraseña', password: true },
    { key: 'modelo',   label: 'Modelo' },
  ],
  correo: [
    { key: 'correo_cliente',   label: 'Correo' },
    { key: 'password_cliente', label: 'Contraseña', password: true },
  ],
  otro: [
    { key: 'tipo',     label: 'Tipo' },
    { key: 'ip',       label: 'IP' },
    { key: 'usuario',  label: 'Usuario' },
    { key: 'password', label: 'Contraseña', password: true },
  ],
}

const ICONOS = {
  equipo:   'fa-desktop',
  servidor: 'fa-server',
  nas:      'fa-hdd',
  red:      'fa-network-wired',
  correo:   'fa-envelope',
  otro:     'fa-cube',
}

// Mapeo tab label → categoria backend
const TAB_TO_CAT = {
  equipos:    'equipo',
  servidores: 'servidor',
  nas:        'nas',
  redes:      'red',
  correos:    'correo',
  otros:      'otro',
}

const CAT_LABELS = {
  equipo:   'Equipos',
  servidor: 'Servidores',
  nas:      'NAS',
  red:      'Redes',
  correo:   'Correos',
  otro:     'Otros',
}

export default function Dashboard() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [activeSection, setActiveSection] = useState('empresas')
  const [empresas, setEmpresas]     = useState([])
  const [tickets, setTickets]       = useState([])
  const [usuarios, setUsuarios]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [currentPage, setCurrentPage]       = useState(1)
  const [searchTerm, setSearchTerm]         = useState('')
  const [statusFilter, setStatusFilter]     = useState('all')
  const [serviceFilter, setServiceFilter]   = useState('all')
  const [currentCompanyId, setCurrentCompanyId]   = useState(null)
  const [currentITCategory, setCurrentITCategory] = useState('equipo')
  const [itItems, setItItems]   = useState([])
  const [itSearch, setItSearch] = useState('')

  // Modals
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [showUserModal, setShowUserModal]       = useState(false)
  const [showITModal, setShowITModal]           = useState(false)
  const [editingCompany, setEditingCompany]     = useState(null)
  const [editingUser, setEditingUser]           = useState(null)
  const [editingITItem, setEditingITItem]       = useState(null)
  const [selectedITCategory, setSelectedITCategory] = useState('equipo')

  // Contactos en el modal de empresa
  const [contactos, setContactos] = useState([{ nombre: '', telefono: '', email: '', cargo: '' }])

  // Campos extra IT
  const [extraFields, setExtraFields] = useState([])

  // Passwords visibles
  const [visiblePwds, setVisiblePwds] = useState({})

  // Excel import ref
  const excelInputRef = useRef(null)

  const itemsPerPage = 10

  // ============================================================
  // INIT
  // ============================================================
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [empresasData, ticketsData] = await Promise.all([
        getEmpresas(),
        getTickets(),
      ])
      setEmpresas(empresasData || [])
      setTickets(ticketsData || [])

      if (isAdmin()) {
        const usuariosData = await getUsuarios()
        setUsuarios(usuariosData || [])
      }
    } catch (error) {
      showToast('error', 'Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    if (confirm('¿Cerrar sesión?')) {
      logout()
      navigate('/login')
    }
  }

  // ============================================================
  // FILTROS EMPRESAS
  // ============================================================
  function getFilteredCompanies() {
    return empresas.filter(c => {
      const contactos = c.contactos || []
      const matchSearch = !searchTerm ||
        c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contactos.some(ct => ct.nombre?.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchStatus  = statusFilter  === 'all' || c.estado === statusFilter
      const matchService = serviceFilter === 'all' || (c.servicios || []).includes(serviceFilter)
      return matchSearch && matchStatus && matchService
    })
  }

  const filteredCompanies  = getFilteredCompanies()
  const totalPages         = Math.ceil(filteredCompanies.length / itemsPerPage)
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // ============================================================
  // EXCEL EXPORT / IMPORT
  // ============================================================
  function exportToExcel() {
    if (!empresas.length) {
      showToast('warning', 'Sin datos', 'No hay empresas para exportar')
      return
    }
    const data = empresas.map(c => ({
      Nombre:    c.nombre    || '',
      CIF:       c.cif       || '',
      Email:     c.email     || '',
      Teléfono:  c.telefono  || '',
      Dirección: c.direccion || '',
      Estado:    c.estado    || '',
      Servicios: Array.isArray(c.servicios) ? c.servicios.join(', ') : '',
    }))
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook  = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Empresas')
    XLSX.writeFile(workbook, `empresas_${new Date().toISOString().split('T')[0]}.xlsx`)
    showToast('success', 'Exportado', `${empresas.length} empresas exportadas`)
  }

  async function handleExcelImport(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async function (ev) {
      try {
        const data     = new Uint8Array(ev.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet    = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(sheet)
        if (!jsonData.length) { showToast('warning', 'Vacío', 'El archivo no contiene datos'); return }

        setLoading(true)
        for (const row of jsonData) {
          const payload = {
            nombre:    row['Nombre']    || '',
            cif:       row['CIF']       || '',
            email:     row['Email']     || null,
            telefono:  row['Teléfono']  || null,
            direccion: row['Dirección'] || null,
            estado:    row['Estado']    || 'Activo',
            servicios: row['Servicios'] ? row['Servicios'].split(',').map(s => s.trim()) : [],
          }
          if (!payload.nombre || !payload.cif) continue
          await createEmpresa(payload)
        }
        showToast('success', 'Importado', `${jsonData.length} empresas importadas`)
        await loadData()
      } catch (err) {
        console.error(err)
        showToast('error', 'Error', 'No se pudo importar el archivo')
      } finally {
        setLoading(false)
        e.target.value = ''
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // ============================================================
  // EMPRESAS CRUD
  // ============================================================
  function openCompanyModal(company = null) {
    setEditingCompany(company)
    setContactos(
      company?.contactos?.length
        ? company.contactos
        : [{ nombre: '', telefono: '', email: '', cargo: '' }]
    )
    setShowCompanyModal(true)
  }

  async function saveCompany(e) {
    e.preventDefault()
    const formData = new FormData(e.target)

    const servicios = [...document.querySelectorAll('input[name="services"]:checked')].map(cb => cb.value)
    const contactosFiltrados = contactos.filter(c => c.nombre.trim())

    const payload = {
      nombre:    formData.get('nombre'),
      cif:       formData.get('cif'),
      email:     formData.get('email')     || null,
      telefono:  formData.get('telefono')  || null,
      direccion: formData.get('direccion') || null,
      estado:    formData.get('estado'),
      notas:     formData.get('notas')     || null,
      servicios,
      contactos: contactosFiltrados,
    }

    try {
      if (editingCompany) {
        await updateEmpresa(editingCompany.id, payload)
        showToast('success', 'Actualizado', 'Empresa actualizada')
      } else {
        await createEmpresa(payload)
        showToast('success', 'Creado', 'Empresa creada correctamente')
      }
      setShowCompanyModal(false)
      await loadData()
      // Si estamos en el detalle, refrescar
      if (editingCompany && currentCompanyId === editingCompany.id) {
        setCurrentCompanyId(editingCompany.id)
      }
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  async function handleDeleteCompany(id) {
    const company = empresas.find(c => c.id === id)
    if (!confirm(`¿Eliminar "${company?.nombre}"? Se borrarán todos sus datos.`)) return
    try {
      await deleteEmpresa(id)
      showToast('success', 'Eliminado', 'Empresa eliminada')
      if (currentCompanyId === id) volverAEmpresas()
      await loadData()
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  // Contactos
  function addContacto() {
    setContactos([...contactos, { nombre: '', telefono: '', email: '', cargo: '' }])
  }

  function updateContacto(index, field, value) {
    const updated = [...contactos]
    updated[index] = { ...updated[index], [field]: value }
    setContactos(updated)
  }

  function removeContacto(index) {
    if (contactos.length <= 1) {
      setContactos([{ nombre: '', telefono: '', email: '', cargo: '' }])
    } else {
      setContactos(contactos.filter((_, i) => i !== index))
    }
  }

  // ============================================================
  // USUARIOS CRUD
  // ============================================================
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
        showToast('success', 'Actualizado', 'Usuario actualizado')
      } else {
        await createUsuario(payload)
        showToast('success', 'Creado', 'Usuario creado correctamente')
      }
      setShowUserModal(false)
      const usuariosData = await getUsuarios()
      setUsuarios(usuariosData || [])
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  async function handleDeleteUser(id, nombre) {
    if (!confirm(`¿Eliminar el usuario "${nombre}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteUsuario(id)
      showToast('success', 'Eliminado', `Usuario ${nombre} eliminado`)
      const usuariosData = await getUsuarios()
      setUsuarios(usuariosData || [])
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  // ============================================================
  // DETALLE EMPRESA + IT
  // ============================================================
  async function viewCompany(id) {
    setCurrentCompanyId(id)
    setCurrentITCategory('equipo')
    setItSearch('')
    await loadITItems(id, 'equipo')
  }

  function volverAEmpresas() {
    setCurrentCompanyId(null)
    setItItems([])
    setItSearch('')
  }

  async function loadITItems(empresaId, categoria) {
    try {
      const items = await getDispositivos(empresaId, categoria)
      setItItems(items || [])
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  async function handleITTabChange(tabLabel) {
    const categoria = TAB_TO_CAT[tabLabel]
    setCurrentITCategory(categoria)
    setItSearch('')
    if (currentCompanyId) await loadITItems(currentCompanyId, categoria)
  }

  // IT Modal
  function openITModal(item = null, categoria = currentITCategory) {
    setEditingITItem(item)
    setSelectedITCategory(categoria)
    setExtraFields(
      item?.campos_extra
        ? Object.entries(item.campos_extra).map(([k, v]) => ({ key: k, val: v }))
        : []
    )
    setShowITModal(true)
  }

  async function saveITItem(e) {
    e.preventDefault()
    const formData = new FormData(e.target)

    const campos_extra = {}
    extraFields.forEach(({ key, val }) => { if (key && val) campos_extra[key] = val })

    const payload = {
      empresa_id:        currentCompanyId,
      categoria:         selectedITCategory,
      nombre:            selectedITCategory !== 'correo' ? (formData.get('nombre') || '') : 'correo',
      tipo:              formData.get('tipo')              || null,
      ip:                formData.get('ip')                || null,
      usuario:           formData.get('usuario')           || null,
      password:          formData.get('password')          || null,
      anydesk_id:        formData.get('anydesk_id')        || null,
      sistema_operativo: formData.get('sistema_operativo') || null,
      capacidad:         formData.get('capacidad')         || null,
      modelo:            formData.get('modelo')            || null,
      numero_serie:      formData.get('numero_serie')      || null,
      nombre_cliente:    formData.get('nombre_cliente')    || null,
      correo_cliente:    formData.get('correo_cliente')    || null,
      password_cliente:  formData.get('password_cliente')  || null,
      campos_extra,
    }

    // Validaciones
    if (selectedITCategory !== 'correo' && !payload.nombre) {
      showToast('error', 'Error', 'El nombre es obligatorio'); return
    }
    if (selectedITCategory === 'equipo' && !payload.numero_serie) {
      showToast('error', 'Error', 'El número de serie es obligatorio'); return
    }

    try {
      if (editingITItem) {
        await updateDispositivo(editingITItem.id, payload)
        showToast('success', 'Actualizado', 'Dispositivo actualizado correctamente')
      } else {
        await createDispositivo(payload)
        showToast('success', 'Guardado', 'Dispositivo añadido correctamente')
      }
      setShowITModal(false)
      await loadITItems(currentCompanyId, selectedITCategory)
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  async function handleDeleteITItem(id) {
    if (!confirm('¿Eliminar este dispositivo?')) return
    try {
      await deleteDispositivo(id)
      showToast('success', 'Eliminado', 'Dispositivo eliminado')
      await loadITItems(currentCompanyId, currentITCategory)
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  function togglePassword(key) {
    setVisiblePwds(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Campos extra
  function addExtraField() {
    setExtraFields([...extraFields, { key: '', val: '' }])
  }
  function updateExtraField(index, field, value) {
    const updated = [...extraFields]
    updated[index] = { ...updated[index], [field]: value }
    setExtraFields(updated)
  }
  function removeExtraField(index) {
    setExtraFields(extraFields.filter((_, i) => i !== index))
  }

  // ============================================================
  // TOAST
  // ============================================================
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
      <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `
    container.appendChild(toast)
    setTimeout(() => { if (toast.parentElement) toast.remove() }, 5000)
  }

  function formatDate(str) {
    if (!str) return '—'
    const d = new Date(str)
    return isNaN(d) ? str : d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  // ============================================================
  // IT SEARCH FILTER
  // ============================================================
  const itItemsFiltered = itItems.filter(item => {
    if (!itSearch) return true
    const s = itSearch.toLowerCase()
    return (
      (item.nombre          || '').toLowerCase().includes(s) ||
      (item.numero_serie    || '').toLowerCase().includes(s) ||
      (item.correo_cliente  || '').toLowerCase().includes(s) ||
      (item.nombre_cliente  || '').toLowerCase().includes(s)
    )
  })

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
  // VISTA: DETALLE EMPRESA
  // ============================================================
  if (currentCompanyId) {
    const company = empresas.find(c => c.id === currentCompanyId)

    return (
      <div className="dashboard">
        <div className="toast-container" id="toastContainer"></div>

        {/* TOPBAR */}
        <header className="topbar">
          <div className="logo">
            <img src="/img/logoHola.png" alt="Logo Hola Informática" />
            <span className="logo-text">Hola Informática</span>
          </div>
          <nav className="top-nav">
            <a className="nav-link active"><i className="fas fa-building"></i> Empresas</a>
            <Link to="/tickets" className="nav-link"><i className="fas fa-headset"></i> Tickets</Link>
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

        <main className="main-content">
          {/* Header detalle */}
          <div className="empresa-detalle-header">
            <button className="btn-back" onClick={volverAEmpresas}>
              <i className="fas fa-arrow-left"></i> Volver
            </button>
            <h1 id="empresaDetalleTitulo"><i className="fas fa-building"></i> {company?.nombre}</h1>
            <button className="btn-primary btn-sm" onClick={() => openCompanyModal(company)}>
              <i className="fas fa-edit"></i> Editar
            </button>
          </div>

          {/* Info empresa */}
          <div className="empresa-info-grid">
            <div className="empresa-info-card"><label>CIF</label><span>{company?.cif || '—'}</span></div>
            <div className="empresa-info-card"><label>Email</label><span>{company?.email || '—'}</span></div>
            <div className="empresa-info-card"><label>Teléfono</label><span>{company?.telefono || '—'}</span></div>
            <div className="empresa-info-card">
              <label>Estado</label>
              <span className={`status ${(company?.estado || '').replace(/ /g, '-')}`}>{company?.estado || '—'}</span>
            </div>
            <div className="empresa-info-card"><label>Dirección</label><span>{company?.direccion || '—'}</span></div>
            <div className="empresa-info-card">
              <label>Servicios</label>
              {company?.servicios?.length
                ? <div className="services-tags">{company.servicios.map(s => <span className="service-tag" key={s}>{s}</span>)}</div>
                : <span style={{ color: 'var(--gray)' }}>Sin servicios</span>}
            </div>
          </div>

          {/* IT Tabs */}
          <div className="it-page-section">
            <div className="it-tabs-wrapper">
              <div className="it-tabs" id="itTabsPage">
                {Object.entries(TAB_TO_CAT).map(([tabLabel, cat]) => (
                  <button
                    key={tabLabel}
                    className={`it-tab ${currentITCategory === cat ? 'active' : ''}`}
                    onClick={() => handleITTabChange(tabLabel)}
                  >
                    <i className={`fas ${ICONOS[cat]}`}></i>
                    <span>{tabLabel.charAt(0).toUpperCase() + tabLabel.slice(1)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="it-content" id="itContent">
              {itItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--gray)' }}>
                  <i className={`fas ${ICONOS[currentITCategory]}`} style={{ fontSize: '3rem', opacity: 0.25, display: 'block', marginBottom: '16px' }}></i>
                  <p style={{ fontSize: '1.05rem', fontWeight: 500, marginBottom: '20px' }}>
                    No hay {CAT_LABELS[currentITCategory].toLowerCase()} registrados
                  </p>
                  <button className="btn-primary" onClick={() => openITModal(null, currentITCategory)}>
                    <i className="fas fa-plus"></i> Añadir {CAT_LABELS[currentITCategory]}
                  </button>
                </div>
              ) : (
                <>
                  {/* Barra búsqueda IT */}
                  <div className="it-search-bar">
                    <div className="it-search-box">
                      <i className="fas fa-search"></i>
                      <input
                        type="text"
                        placeholder={currentITCategory === 'correo' ? 'Buscar por nombre o correo...' : 'Buscar por nombre o número de serie...'}
                        value={itSearch}
                        onChange={e => setItSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className={`fas ${ICONOS[currentITCategory]}`} style={{ color: 'var(--primary)' }}></i>
                      {CAT_LABELS[currentITCategory]}
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600 }}>
                        {itItemsFiltered.length}{itSearch ? ` de ${itItems.length}` : ''}
                      </span>
                    </h3>
                    <button className="btn-primary btn-sm" onClick={() => openITModal(null, currentITCategory)}>
                      <i className="fas fa-plus"></i> Añadir
                    </button>
                  </div>

                  <div className="it-items-grid">
                    {itItemsFiltered.map(item => (
                      <div className="it-item-card" key={item.id}>
                        <div className="it-item-header">
                          <h4>
                            <i className={`fas ${ICONOS[currentITCategory]}`}></i>
                            {currentITCategory === 'correo'
                              ? (item.nombre_cliente || item.correo_cliente || '—')
                              : item.nombre}
                            {item.tipo && <small style={{ fontWeight: 400, opacity: 0.65, fontSize: '0.82rem' }}> ({item.tipo})</small>}
                          </h4>
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button className="btn-action btn-edit" onClick={() => openITModal(item, currentITCategory)} title="Editar">
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn-action btn-delete" onClick={() => handleDeleteITItem(item.id)} title="Eliminar">
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                        <div className="it-item-body">
                          {/* Número de serie para equipos */}
                          {currentITCategory === 'equipo' && item.numero_serie && (
                            <div className="it-item-row">
                              <span className="it-label">Nº Serie:</span>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#0369a1', fontWeight: 600 }}>{item.numero_serie}</span>
                            </div>
                          )}
                          {(CAMPOS[currentITCategory] || []).map(field => (
                            <div className="it-item-row" key={field.key}>
                              <span className="it-label">{field.label}:</span>
                              {field.password ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                  <span>
                                    {visiblePwds[`${field.key}-${item.id}`]
                                      ? (item[field.key] || '(vacío)')
                                      : '••••••••'}
                                  </span>
                                  <button className="btn-icon" onClick={() => togglePassword(`${field.key}-${item.id}`)}>
                                    <i className={`fas ${visiblePwds[`${field.key}-${item.id}`] ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                  </button>
                                </div>
                              ) : (
                                <span>{item[field.key] || <em style={{ color: 'var(--gray)', fontSize: '0.82rem' }}>—</em>}</span>
                              )}
                            </div>
                          ))}
                          {/* Campos extra */}
                          {Object.entries(item.campos_extra || {}).map(([k, v]) => (
                            <div className="it-item-row" key={k}>
                              <span className="it-label">{k}:</span>
                              <span>{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>

        {/* IT Modal */}
        {showITModal && <ITModal />}
        {/* Company Modal (para editar desde detalle) */}
        {showCompanyModal && <CompanyModal />}
      </div>
    )
  }

  // ============================================================
  // VISTA: PRINCIPAL (Empresas / Usuarios)
  // ============================================================
  return (
    <div className="dashboard">
      <div className="toast-container" id="toastContainer"></div>
      {/* Input oculto para Excel */}
      <input
        type="file"
        ref={excelInputRef}
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleExcelImport}
      />

      {/* TOPBAR */}
      <header className="topbar">
        <div className="logo">
          <img src="/img/logoHola.png" alt="Logo Hola Informática" />
          <span className="logo-text">Hola Informática</span>
        </div>
        <nav className="top-nav">
          <a
            className={`nav-link ${activeSection === 'empresas' ? 'active' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveSection('empresas')}
          >
            <i className="fas fa-building"></i> Empresas
          </a>
          {isAdmin() && (
            <a
              className={`nav-link ${activeSection === 'usuarios' ? 'active' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setActiveSection('usuarios')}
            >
              <i className="fas fa-users-cog"></i> Usuarios
            </a>
          )}
          <Link to="/tickets" className="nav-link"><i className="fas fa-headset"></i> Tickets</Link>
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

      {/* BOTTOM NAV MOBILE */}
      <nav className="bottom-nav">
        <a className={`bottom-nav-item ${activeSection === 'empresas' ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setActiveSection('empresas')}>
          <i className="fas fa-building"></i><span>Empresas</span>
        </a>
        {isAdmin() && (
          <a className={`bottom-nav-item ${activeSection === 'usuarios' ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setActiveSection('usuarios')}>
            <i className="fas fa-users-cog"></i><span>Usuarios</span>
          </a>
        )}
        <Link to="/tickets" className="bottom-nav-item"><i className="fas fa-headset"></i><span>Tickets</span></Link>
        {isAdmin() && <Link to="/estadisticas" className="bottom-nav-item"><i className="fas fa-chart-bar"></i><span>Stats</span></Link>}
        <Link to="/chat" className="bottom-nav-item"><i className="fas fa-comments"></i><span>Chat</span></Link>
      </nav>

      <main className="main-content">

        {/* ============================== */}
        {/* SECCIÓN: EMPRESAS             */}
        {/* ============================== */}
        {activeSection === 'empresas' && (
          <section className="content-section active">
            <div className="section-header">
              <div>
                <h1><i className="fas fa-building"></i> Empresas</h1>
                <p>Gestión integral de clientes</p>
              </div>
              <div className="header-actions">
                <button className="btn-secondary btn-icon-only" onClick={exportToExcel} title="Exportar Excel">
                  <i className="fas fa-file-excel"></i>
                  <span className="btn-label">Exportar</span>
                </button>
                <button className="btn-secondary btn-icon-only" onClick={() => excelInputRef.current?.click()} title="Importar Excel">
                  <i className="fas fa-file-import"></i>
                  <span className="btn-label">Importar</span>
                </button>
                <button className="btn-primary" onClick={() => openCompanyModal()}>
                  <i className="fas fa-plus"></i>
                  <span className="btn-label">Nueva</span>
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="stats">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
                  <i className="fas fa-building"></i>
                </div>
                <div className="stat-info">
                  <h3 id="totalEmpresas">{empresas.length}</h3>
                  <p>Total</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                  <i className="fas fa-check-circle"></i>
                </div>
                <div className="stat-info">
                  <h3 id="empresasActivas">{empresas.filter(c => c.estado === 'Activo').length}</h3>
                  <p>Activos</p>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="filters">
              <div className="search-box">
                <i className="fas fa-search"></i>
                <input
                  id="searchInput"
                  type="text"
                  placeholder="Buscar empresa, CIF, email..."
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                />
              </div>
              <div className="filter-row">
                <select id="statusFilter" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}>
                  <option value="all">Estado</option>
                  <option value="Activo">Activo</option>
                  <option value="En revisión">En revisión</option>
                  <option value="Suspendido">Suspendido</option>
                </select>
                <select id="serviceFilter" value={serviceFilter} onChange={e => { setServiceFilter(e.target.value); setCurrentPage(1) }}>
                  <option value="all">Servicio</option>
                  {SERVICIOS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Tabla desktop */}
            <div className="table-container desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>Empresa</th><th>CIF</th><th>Email</th><th>Teléfono</th>
                    <th>Servicios</th><th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody id="companyTable">
                  {paginatedCompanies.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
                        <i className="fas fa-search" style={{ fontSize: '2rem', opacity: 0.3, display: 'block', marginBottom: '10px' }}></i>
                        No se encontraron empresas
                      </td>
                    </tr>
                  ) : (
                    paginatedCompanies.map(c => (
                      <tr key={c.id}>
                        <td onClick={() => viewCompany(c.id)} style={{ cursor: 'pointer' }}><strong>{c.nombre}</strong></td>
                        <td>{c.cif || '—'}</td>
                        <td>{c.email || '—'}</td>
                        <td>{c.telefono || '—'}</td>
                        <td>
                          <div className="services-tags">
                            {(c.servicios || []).map(s => <span className="service-tag" key={s}>{s}</span>)}
                          </div>
                        </td>
                        <td><span className={`status ${(c.estado || '').replace(/ /g, '-')}`}>{c.estado || '—'}</span></td>
                        <td>
                          <button className="btn-action btn-view" onClick={() => viewCompany(c.id)} title="Ver IT"><i className="fas fa-server"></i></button>
                          <button className="btn-action btn-edit" onClick={() => openCompanyModal(c)} title="Editar"><i className="fas fa-edit"></i></button>
                          <button className="btn-action btn-delete" onClick={() => handleDeleteCompany(c.id)} title="Eliminar"><i className="fas fa-trash"></i></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Cards mobile */}
            <div className="company-cards mobile-only" id="companyCards">
              {paginatedCompanies.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
                  <i className="fas fa-search" style={{ fontSize: '2.5rem', opacity: 0.25, display: 'block', marginBottom: '12px' }}></i>
                  <p>No se encontraron empresas</p>
                </div>
              ) : (
                paginatedCompanies.map(c => (
                  <div className="company-card" key={c.id}>
                    <div className="company-card-header" onClick={() => viewCompany(c.id)}>
                      <div className="company-card-header-left">
                        <div className="company-card-name">{c.nombre}</div>
                        <div className="company-card-cif">{c.cif || '—'}</div>
                      </div>
                      <span className={`status ${(c.estado || '').replace(/ /g, '-')}`}>{c.estado || '—'}</span>
                    </div>
                    <div className="company-card-body">
                      <div className="company-card-info">
                        {c.email    && <div className="company-card-info-item"><i className="fas fa-envelope"></i> {c.email}</div>}
                        {c.telefono && <div className="company-card-info-item"><i className="fas fa-phone"></i> {c.telefono}</div>}
                      </div>
                      {(c.servicios || []).length > 0 && (
                        <div className="services-tags" style={{ marginBottom: '12px' }}>
                          {c.servicios.map(s => <span className="service-tag" key={s}>{s}</span>)}
                        </div>
                      )}
                      <div className="company-card-actions">
                        <button className="btn-action btn-view" onClick={() => viewCompany(c.id)}><i className="fas fa-server"></i> Ver IT</button>
                        <button className="btn-action btn-edit" onClick={() => openCompanyModal(c)}><i className="fas fa-edit"></i> Editar</button>
                        <button className="btn-action btn-delete" onClick={() => handleDeleteCompany(c.id)}><i className="fas fa-trash"></i></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="pagination" id="pagination">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i + 1} className={currentPage === i + 1 ? 'active' : ''} onClick={() => setCurrentPage(i + 1)}>
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ============================== */}
        {/* SECCIÓN: USUARIOS             */}
        {/* ============================== */}
        {activeSection === 'usuarios' && isAdmin() && (
          <section className="content-section active">
            <div className="section-header">
              <div>
                <h1><i className="fas fa-users-cog"></i> Usuarios</h1>
                <p>Gestión de accesos al panel</p>
              </div>
              <button className="btn-primary" onClick={() => openUserModal()}>
                <i className="fas fa-plus"></i><span className="btn-label">Nuevo</span>
              </button>
            </div>

            {/* Stats */}
            <div className="stats">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><i className="fas fa-users"></i></div>
                <div className="stat-info"><h3 id="totalUsuarios">{usuarios.length}</h3><p>Total</p></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}><i className="fas fa-user-shield"></i></div>
                <div className="stat-info"><h3 id="totalAdmins">{usuarios.filter(u => u.rol === 'admin').length}</h3><p>Admins</p></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}><i className="fas fa-user-check"></i></div>
                <div className="stat-info"><h3 id="totalTrabajadores">{usuarios.filter(u => u.rol === 'trabajador').length}</h3><p>Trabajadores</p></div>
              </div>
            </div>

            {/* Tabla */}
            <div className="table-container desktop-only">
              <table>
                <thead>
                  <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr>
                </thead>
                <tbody id="usersTable">
                  {usuarios.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--gray)' }}>Sin usuarios registrados</td></tr>
                  ) : (
                    usuarios.map(u => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.nombre}</strong>
                          {u.id === user?.id && <span style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#2563eb', padding: '2px 7px', borderRadius: '10px', marginLeft: '6px' }}>Tú</span>}
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span className="status" style={{ background: u.rol === 'admin' ? '#f3e8ff' : '#dcfce7', color: u.rol === 'admin' ? '#9333ea' : '#15803d' }}>
                            {u.rol === 'admin' ? 'Admin' : 'Trabajador'}
                          </span>
                        </td>
                        <td><span className={`status ${u.activo ? 'Activo' : 'Suspendido'}`}>{u.activo ? 'Activo' : 'Desactivado'}</span></td>
                        <td>{formatDate(u.created_at)}</td>
                        <td>
                          <button className="btn-action btn-edit" onClick={() => openUserModal(u)} title="Editar"><i className="fas fa-edit"></i></button>
                          {u.id !== user?.id && (
                            <button className="btn-action btn-delete" onClick={() => handleDeleteUser(u.id, u.nombre)} title="Eliminar"><i className="fas fa-trash"></i></button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Cards mobile */}
            <div className="mobile-only" id="usersCards">
              {usuarios.map(u => (
                <div className="data-card" key={u.id}>
                  <div className="data-card-header">
                    <div>
                      <div className="data-card-title">
                        {u.nombre}
                        {u.id === user?.id && <span style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#2563eb', padding: '2px 7px', borderRadius: '10px', marginLeft: '6px' }}>Tú</span>}
                      </div>
                      <div className="data-card-subtitle">{u.email}</div>
                    </div>
                    <span className={`status ${u.activo ? 'Activo' : 'Suspendido'}`}>{u.activo ? 'Activo' : 'Desactivado'}</span>
                  </div>
                  <div className="data-card-meta">
                    <span><i className="fas fa-user-tag"></i> {u.rol === 'admin' ? 'Administrador' : 'Trabajador'}</span>
                    <span><i className="fas fa-calendar-alt"></i> {formatDate(u.created_at)}</span>
                  </div>
                  <div className="data-card-actions">
                    <button className="btn-action btn-edit" onClick={() => openUserModal(u)}><i className="fas fa-edit"></i> Editar</button>
                    {u.id !== user?.id && (
                      <button className="btn-action btn-delete" onClick={() => handleDeleteUser(u.id, u.nombre)}><i className="fas fa-trash"></i></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Modals */}
      {showCompanyModal && <CompanyModal />}
      {showUserModal    && <UserModal />}
    </div>
  )

  // ============================================================
  // MODAL: EMPRESA
  // ============================================================
  function CompanyModal() {
    const [activeTab, setActiveTab] = useState('datos')

    return (
      <div className="modal" style={{ display: 'flex' }} onClick={e => e.target.classList.contains('modal') && setShowCompanyModal(false)}>
        <div className="modal-content modal-large">
          <div className="modal-header">
            <h2>{editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}</h2>
            <button className="modal-close" onClick={() => setShowCompanyModal(false)}><i className="fas fa-times"></i></button>
          </div>
          <form id="companyForm" onSubmit={saveCompany}>
            <div className="form-tabs">
              {['datos', 'servicios', 'contactos'].map(tab => (
                <button key={tab} type="button"
                  className={`form-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* TAB: DATOS */}
            <div className={`form-tab-content ${activeTab === 'datos' ? 'active' : ''}`} id="tab-datos">
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input type="text" name="nombre" defaultValue={editingCompany?.nombre} required />
                </div>
                <div className="form-group">
                  <label>CIF *</label>
                  <input type="text" name="cif" defaultValue={editingCompany?.cif} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email" defaultValue={editingCompany?.email} />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" name="telefono" defaultValue={editingCompany?.telefono} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Dirección</label>
                  <input type="text" name="direccion" defaultValue={editingCompany?.direccion} />
                </div>
                <div className="form-group">
                  <label>Estado</label>
                  <select name="estado" defaultValue={editingCompany?.estado || 'Activo'}>
                    <option value="Activo">Activo</option>
                    <option value="En revisión">En revisión</option>
                    <option value="Suspendido">Suspendido</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Notas</label>
                <textarea name="notas" defaultValue={editingCompany?.notas}></textarea>
              </div>
            </div>

            {/* TAB: SERVICIOS */}
            <div className={`form-tab-content ${activeTab === 'servicios' ? 'active' : ''}`} id="tab-servicios">
              <div className="services-grid">
                {SERVICIOS.map(s => (
                  <label className="service-checkbox" key={s}>
                    <input
                      type="checkbox"
                      name="services"
                      value={s}
                      defaultChecked={editingCompany?.servicios?.includes(s)}
                    />
                    <span className="checkmark"><i className="fas fa-check"></i></span>
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* TAB: CONTACTOS */}
            <div className={`form-tab-content ${activeTab === 'contactos' ? 'active' : ''}`} id="tab-contactos">
              <div id="contactsContainer">
                {contactos.map((c, i) => (
                  <div className="contact-row" key={i}>
                    <input type="text"  placeholder="Nombre"   className="contact-name"  value={c.nombre}   onChange={e => updateContacto(i, 'nombre',   e.target.value)} />
                    <input type="tel"   placeholder="Teléfono" className="contact-phone" value={c.telefono}  onChange={e => updateContacto(i, 'telefono',  e.target.value)} />
                    <input type="email" placeholder="Email"    className="contact-email" value={c.email}    onChange={e => updateContacto(i, 'email',    e.target.value)} />
                    <input type="text"  placeholder="Cargo"    className="contact-role"  value={c.cargo}    onChange={e => updateContacto(i, 'cargo',    e.target.value)} />
                    <button type="button" className="btn-remove-contact" onClick={() => removeContacto(i)}>
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-add-contact" onClick={addContacto}>
                <i className="fas fa-plus"></i> Añadir Contacto
              </button>
            </div>

            <div className="modal-buttons">
              <button type="submit" className="btn-primary"><i className="fas fa-save"></i> Guardar</button>
              <button type="button" className="btn-secondary" onClick={() => setShowCompanyModal(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ============================================================
  // MODAL: USUARIO
  // ============================================================
  function UserModal() {
    return (
      <div className="modal" style={{ display: 'flex' }} onClick={e => e.target.classList.contains('modal') && setShowUserModal(false)}>
        <div className="modal-content">
          <div className="modal-header">
            <h2><span id="userModalTitle">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</span></h2>
            <button className="modal-close" onClick={() => setShowUserModal(false)}><i className="fas fa-times"></i></button>
          </div>
          <form onSubmit={saveUser}>
            <div className="modal-body">
              <div className="form-group">
                <label>Nombre completo *</label>
                <input type="text" name="nombre" id="userNombre" defaultValue={editingUser?.nombre} required />
              </div>
              {!editingUser && (
                <div className="form-group" id="userEmailGroup">
                  <label>Email *</label>
                  <input type="email" name="email" id="userEmail" required />
                </div>
              )}
              <div className="form-group">
                <label>Rol *</label>
                <select name="rol" id="userRol" defaultValue={editingUser?.rol || 'trabajador'}>
                  <option value="trabajador">Trabajador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              {editingUser && (
                <div className="form-group" id="userActivoGroup">
                  <label>Estado</label>
                  <select name="activo" id="userActivo" defaultValue={String(editingUser.activo)}>
                    <option value="true">Activo</option>
                    <option value="false">Desactivado</option>
                  </select>
                </div>
              )}
              {!editingUser && (
                <div className="form-group" id="userPasswordGroup">
                  <label>Contraseña *</label>
                  <input type="password" name="password" id="userPassword" required />
                </div>
              )}
            </div>
            <div className="modal-buttons">
              <button type="submit" className="btn-primary"><i className="fas fa-save"></i> Guardar</button>
              <button type="button" className="btn-secondary" onClick={() => setShowUserModal(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ============================================================
  // MODAL: IT ITEM
  // ============================================================
  function ITModal() {
    const cat = selectedITCategory
    const sugerencias = TIPO_SUGERENCIAS[cat] || []

    return (
      <div className="modal" style={{ display: 'flex' }} onClick={e => e.target.classList.contains('modal') && setShowITModal(false)}>
        <div className="modal-content">
          <div className="modal-header">
            <h2 id="itItemModalTitle">{editingITItem ? 'Editar' : 'Añadir'} {CAT_LABELS[cat]?.slice(0, -1) || cat}</h2>
            <button className="modal-close" onClick={() => setShowITModal(false)}><i className="fas fa-times"></i></button>
          </div>
          <form id="itItemForm" onSubmit={saveITItem}>
            <div className="modal-body">

              {/* Nombre + Tipo (todos excepto correo) */}
              {cat !== 'correo' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre *</label>
                    <input type="text" name="nombre" defaultValue={editingITItem?.nombre} required placeholder="Nombre del dispositivo" />
                  </div>
                  <div className="form-group">
                    <label>Tipo</label>
                    <input type="text" name="tipo" defaultValue={editingITItem?.tipo} list="fi-tipo-list" placeholder="Selecciona o escribe..." />
                    <datalist id="fi-tipo-list">{sugerencias.map(s => <option key={s} value={s} />)}</datalist>
                  </div>
                </div>
              )}

              {/* EQUIPO */}
              {cat === 'equipo' && (
                <>
                  <div className="form-group">
                    <label>Número de Serie *</label>
                    <input type="text" name="numero_serie" defaultValue={editingITItem?.numero_serie} placeholder="Ej: SN-2024-ABC123" required />
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>IP</label><input type="text" name="ip" defaultValue={editingITItem?.ip} placeholder="192.168.1.10" /></div>
                    <div className="form-group"><label>AnyDesk ID</label><input type="text" name="anydesk_id" defaultValue={editingITItem?.anydesk_id} placeholder="123456789" /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Usuario</label><input type="text" name="usuario" defaultValue={editingITItem?.usuario} placeholder="admin" /></div>
                    <div className="form-group"><label>Contraseña</label><input type="text" name="password" defaultValue={editingITItem?.password} placeholder="••••••••" /></div>
                  </div>
                </>
              )}

              {/* SERVIDOR */}
              {cat === 'servidor' && (
                <>
                  <div className="form-row">
                    <div className="form-group"><label>IP</label><input type="text" name="ip" defaultValue={editingITItem?.ip} placeholder="192.168.1.5" /></div>
                    <div className="form-group"><label>S.O.</label><input type="text" name="sistema_operativo" defaultValue={editingITItem?.sistema_operativo} placeholder="Windows Server 2022" /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Usuario</label><input type="text" name="usuario" defaultValue={editingITItem?.usuario} placeholder="admin" /></div>
                    <div className="form-group"><label>Contraseña</label><input type="text" name="password" defaultValue={editingITItem?.password} placeholder="••••••••" /></div>
                  </div>
                </>
              )}

              {/* NAS */}
              {cat === 'nas' && (
                <>
                  <div className="form-row">
                    <div className="form-group"><label>IP</label><input type="text" name="ip" defaultValue={editingITItem?.ip} placeholder="192.168.1.20" /></div>
                    <div className="form-group"><label>Capacidad</label><input type="text" name="capacidad" defaultValue={editingITItem?.capacidad} placeholder="4TB" /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Usuario</label><input type="text" name="usuario" defaultValue={editingITItem?.usuario} placeholder="admin" /></div>
                    <div className="form-group"><label>Contraseña</label><input type="text" name="password" defaultValue={editingITItem?.password} placeholder="••••••••" /></div>
                  </div>
                </>
              )}

              {/* RED */}
              {cat === 'red' && (
                <>
                  <div className="form-row">
                    <div className="form-group"><label>IP</label><input type="text" name="ip" defaultValue={editingITItem?.ip} placeholder="192.168.1.1" /></div>
                    <div className="form-group"><label>Modelo</label><input type="text" name="modelo" defaultValue={editingITItem?.modelo} placeholder="Cisco RV340" /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Usuario</label><input type="text" name="usuario" defaultValue={editingITItem?.usuario} placeholder="admin" /></div>
                    <div className="form-group"><label>Contraseña</label><input type="text" name="password" defaultValue={editingITItem?.password} placeholder="••••••••" /></div>
                  </div>
                </>
              )}

              {/* CORREO */}
              {cat === 'correo' && (
                <>
                  <div className="form-group">
                    <label>Nombre del cliente</label>
                    <input type="text" name="nombre_cliente" defaultValue={editingITItem?.nombre_cliente} placeholder="Juan García" />
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>Correo</label><input type="email" name="correo_cliente" defaultValue={editingITItem?.correo_cliente} placeholder="juan@empresa.com" /></div>
                    <div className="form-group"><label>Contraseña</label><input type="text" name="password_cliente" defaultValue={editingITItem?.password_cliente} placeholder="••••••••" /></div>
                  </div>
                </>
              )}

              {/* OTRO */}
              {cat === 'otro' && (
                <>
                  <div className="form-row">
                    <div className="form-group"><label>IP</label><input type="text" name="ip" defaultValue={editingITItem?.ip} placeholder="192.168.1.x" /></div>
                    <div className="form-group"><label>Usuario</label><input type="text" name="usuario" defaultValue={editingITItem?.usuario} placeholder="admin" /></div>
                  </div>
                  <div className="form-group">
                    <label>Contraseña</label>
                    <input type="text" name="password" defaultValue={editingITItem?.password} placeholder="••••••••" />
                  </div>
                </>
              )}

              {/* Campos personalizados */}
              <div style={{ borderTop: '1px dashed #e2e8f0', margin: '12px 0 14px', paddingTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>
                    <i className="fas fa-plus-circle" style={{ color: 'var(--primary)', marginRight: '5px' }}></i>Campos personalizados
                  </label>
                  <button type="button" onClick={addExtraField}
                    style={{ background: 'none', border: '1px solid #e2e8f0', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', padding: '5px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'inherit' }}>
                    <i className="fas fa-plus"></i> Añadir
                  </button>
                </div>
                <div id="extraFieldsContainer">
                  {extraFields.map((ef, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                      <input type="text" className="extra-key" value={ef.key} onChange={e => updateExtraField(i, 'key', e.target.value)}
                        placeholder="Campo" style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.88rem' }} />
                      <input type="text" className="extra-val" value={ef.val} onChange={e => updateExtraField(i, 'val', e.target.value)}
                        placeholder="Valor" style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.88rem' }} />
                      <button type="button" onClick={() => removeExtraField(i)}
                        style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
            <div className="modal-buttons">
              <button type="submit" className="btn-primary"><i className="fas fa-save"></i> Guardar</button>
              <button type="button" className="btn-secondary" onClick={() => setShowITModal(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    )
  }
}