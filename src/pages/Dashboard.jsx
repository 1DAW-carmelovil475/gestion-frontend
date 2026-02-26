import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getEmpresas, createEmpresa, updateEmpresa, deleteEmpresa,
  getDispositivos, createDispositivo, updateDispositivo, deleteDispositivo,
  getTickets,
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
    { key: 'tipo',      label: 'Tipo' },
    { key: 'ip',        label: 'IP' },
    { key: 'usuario',   label: 'Usuario' },
    { key: 'password',  label: 'Contraseña', password: true },
    { key: 'capacidad', label: 'Capacidad' },
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

const SERVICIO_COLORS = {
  Cloud:     { bg: '#dbeafe', color: '#1d4ed8', icon: 'fa-cloud' },
  Soporte:   { bg: '#fce7f3', color: '#be185d', icon: 'fa-headset' },
  Hardware:  { bg: '#d1fae5', color: '#065f46', icon: 'fa-microchip' },
  Redes:     { bg: '#fef3c7', color: '#92400e', icon: 'fa-network-wired' },
  Seguridad: { bg: '#ede9fe', color: '#6d28d9', icon: 'fa-shield-alt' },
  Backup:    { bg: '#fee2e2', color: '#991b1b', icon: 'fa-database' },
}

// ============================================================
// MODAL: EMPRESA
// ============================================================
function CompanyModal({ editingCompany, contactos, setContactos, onSave, onClose, SERVICIOS }) {
  const [activeTab, setActiveTab] = useState('datos')

  function addContacto() {
    setContactos(prev => [...prev, { nombre: '', telefono: '', email: '', cargo: '' }])
  }

  function updateContacto(index, field, value) {
    setContactos(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  function removeContacto(index) {
    setContactos(prev =>
      prev.length <= 1
        ? [{ nombre: '', telefono: '', email: '', cargo: '' }]
        : prev.filter((_, i) => i !== index)
    )
  }

  return (
    <div className="modal" style={{ display: 'flex' }} onClick={e => e.target.classList.contains('modal') && onClose()}>
      <div className="modal-content modal-large">
        <div className="modal-header">
          <h2><i className={`fas ${editingCompany ? 'fa-building' : 'fa-plus-circle'}`}></i>{editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}</h2>
          <button className="modal-close" onClick={onClose}><i className="fas fa-times"></i></button>
        </div>
        <form onSubmit={onSave}>
          <div className="form-tabs">
            {[
              { key: 'datos', icon: 'fa-info-circle', label: 'Datos' },
              { key: 'servicios', icon: 'fa-cogs', label: 'Servicios' },
              { key: 'contactos', icon: 'fa-users', label: 'Contactos' },
            ].map(({ key, icon, label }) => (
              <button key={key} type="button"
                className={`form-tab ${activeTab === key ? 'active' : ''}`}
                onClick={() => setActiveTab(key)}>
                <i className={`fas ${icon}`}></i> {label}
              </button>
            ))}
          </div>

        <div className={`form-tab-content ${activeTab === 'datos' ? 'active' : ''}`}>
            <div className="form-row">
              <div className="form-group"><label><i className="fas fa-building"></i> Nombre *</label><input type="text" name="nombre" defaultValue={editingCompany?.nombre} placeholder="Ej: Empresa S.L." required /></div>
              <div className="form-group"><label><i className="fas fa-id-card"></i> CIF *</label><input type="text" name="cif" defaultValue={editingCompany?.cif} placeholder="Ej: B12345678" required /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label><i className="fas fa-envelope"></i> Email</label><input type="email" name="email" defaultValue={editingCompany?.email} placeholder="Ej: info@empresa.com" /></div>
              <div className="form-group"><label><i className="fas fa-phone"></i> Teléfono</label><input type="tel" name="telefono" defaultValue={editingCompany?.telefono} placeholder="Ej: 912 345 678" /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label><i className="fas fa-map-marker-alt"></i> Dirección</label><input type="text" name="direccion" defaultValue={editingCompany?.direccion} placeholder="Ej: Calle Mayor 1, Madrid" /></div>
              <div className="form-group">
                <label><i className="fas fa-toggle-on"></i> Estado</label>
                <select name="estado" defaultValue={editingCompany?.estado || 'Activo'}>
                  <option value="Activo">Activo</option>
                  <option value="En revisión">En revisión</option>
                  <option value="Suspendido">Suspendido</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label><i className="fas fa-sticky-note"></i> Notas</label><textarea name="notas" defaultValue={editingCompany?.notas} placeholder="Observaciones internas sobre la empresa..."></textarea></div>
          </div>

          <div className={`form-tab-content ${activeTab === 'servicios' ? 'active' : ''}`}>
            <div className="services-grid">
              {SERVICIOS.map(s => (
                <label className="service-checkbox" key={s}>
                  <input type="checkbox" name="services" value={s} defaultChecked={editingCompany?.servicios?.includes(s)} />
                  <span className="checkmark"><i className="fas fa-check"></i></span>
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={`form-tab-content ${activeTab === 'contactos' ? 'active' : ''}`}>
            <div id="contactsContainer">
              {contactos.map((c, i) => (
                <div className="contact-card-form" key={i}>
                  <div className="contact-card-form-fields">
                    <div className="contact-card-form-row">
                      <input type="text"  placeholder="Nombre"   value={c.nombre}   onChange={e => updateContacto(i, 'nombre',   e.target.value)} />
                      <input type="tel"   placeholder="Teléfono" value={c.telefono} onChange={e => updateContacto(i, 'telefono', e.target.value)} />
                      <input type="email" placeholder="Email"    value={c.email}    onChange={e => updateContacto(i, 'email',    e.target.value)} />
                    </div>
                    <div className="contact-card-form-cargo">
                      <input type="text" placeholder="Cargo (ej: Responsable IT, Gerente...)" value={c.cargo} onChange={e => updateContacto(i, 'cargo', e.target.value)} />
                    </div>
                  </div>
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
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// MODAL: IT ITEM
// ============================================================
function ITModal({ editingITItem, selectedITCategory, extraFields, setExtraFields, onSave, onClose, CAT_LABELS, TIPO_SUGERENCIAS }) {
  const cat = selectedITCategory
  const sugerencias = TIPO_SUGERENCIAS[cat] || []

  function addExtraField() { setExtraFields(prev => [...prev, { key: '', val: '' }]) }
  function updateExtraField(index, field, value) {
    setExtraFields(prev => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u })
  }
  function removeExtraField(index) { setExtraFields(prev => prev.filter((_, i) => i !== index)) }

  return (
    <div className="modal" style={{ display: 'flex' }} onClick={e => e.target.classList.contains('modal') && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{editingITItem ? 'Editar' : 'Añadir'} {CAT_LABELS[cat]?.slice(0, -1) || cat}</h2>
          <button className="modal-close" onClick={onClose}><i className="fas fa-times"></i></button>
        </div>
        <form onSubmit={onSave}>
          <div className="modal-body">
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
            {cat === 'equipo' && (<>
              <div className="form-group"><label>Número de Serie *</label><input type="text" name="numero_serie" defaultValue={editingITItem?.numero_serie} placeholder="Ej: SN-2024-ABC123" required /></div>
              <div className="form-row">
                <div className="form-group"><label>IP</label><input type="text" name="ip" defaultValue={editingITItem?.ip} placeholder="192.168.1.10" /></div>
                <div className="form-group"><label>AnyDesk ID</label><input type="text" name="anydesk_id" defaultValue={editingITItem?.anydesk_id} placeholder="123456789" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Usuario</label><input type="text" name="usuario" defaultValue={editingITItem?.usuario} placeholder="admin" /></div>
                <div className="form-group"><label>Contraseña</label><input type="text" name="password" defaultValue={editingITItem?.password} placeholder="••••••••" /></div>
              </div>
            </>)}
            {cat === 'servidor' && (<>
              <div className="form-row">
                <div className="form-group"><label>IP</label><input type="text" name="ip" defaultValue={editingITItem?.ip} placeholder="192.168.1.5" /></div>
                <div className="form-group"><label>S.O.</label><input type="text" name="sistema_operativo" defaultValue={editingITItem?.sistema_operativo} placeholder="Windows Server 2022" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Usuario</label><input type="text" name="usuario" defaultValue={editingITItem?.usuario} placeholder="admin" /></div>
                <div className="form-group"><label>Contraseña</label><input type="text" name="password" defaultValue={editingITItem?.password} placeholder="••••••••" /></div>
              </div>
            </>)}
            {cat === 'nas' && (<>
              <div className="form-row">
                <div className="form-group"><label>IP</label><input type="text" name="ip" defaultValue={editingITItem?.ip} placeholder="192.168.1.20" /></div>
                <div className="form-group"><label>Capacidad</label><input type="text" name="capacidad" defaultValue={editingITItem?.capacidad} placeholder="4TB" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Usuario</label><input type="text" name="usuario" defaultValue={editingITItem?.usuario} placeholder="admin" /></div>
                <div className="form-group"><label>Contraseña</label><input type="text" name="password" defaultValue={editingITItem?.password} placeholder="••••••••" /></div>
              </div>
            </>)}
            {cat === 'red' && (<>
              <div className="form-row">
                <div className="form-group"><label>IP</label><input type="text" name="ip" defaultValue={editingITItem?.ip} placeholder="192.168.1.1" /></div>
                <div className="form-group"><label>Modelo</label><input type="text" name="modelo" defaultValue={editingITItem?.modelo} placeholder="Cisco RV340" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Usuario</label><input type="text" name="usuario" defaultValue={editingITItem?.usuario} placeholder="admin" /></div>
                <div className="form-group"><label>Contraseña</label><input type="text" name="password" defaultValue={editingITItem?.password} placeholder="••••••••" /></div>
              </div>
            </>)}
            {cat === 'correo' && (<>
              <div className="form-group"><label>Nombre del cliente</label><input type="text" name="nombre_cliente" defaultValue={editingITItem?.nombre_cliente} placeholder="Juan García" /></div>
              <div className="form-row">
                <div className="form-group"><label>Correo</label><input type="email" name="correo_cliente" defaultValue={editingITItem?.correo_cliente} placeholder="juan@empresa.com" /></div>
                <div className="form-group"><label>Contraseña</label><input type="text" name="password_cliente" defaultValue={editingITItem?.password_cliente} placeholder="••••••••" /></div>
              </div>
            </>)}
            {cat === 'otro' && (<>
              <div className="form-row">
                <div className="form-group"><label>IP</label><input type="text" name="ip" defaultValue={editingITItem?.ip} placeholder="192.168.1.x" /></div>
                <div className="form-group"><label>Usuario</label><input type="text" name="usuario" defaultValue={editingITItem?.usuario} placeholder="admin" /></div>
              </div>
              <div className="form-group"><label>Contraseña</label><input type="text" name="password" defaultValue={editingITItem?.password} placeholder="••••••••" /></div>
            </>)}

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
              {extraFields.map((ef, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input type="text" value={ef.key} onChange={e => updateExtraField(i, 'key', e.target.value)} placeholder="Campo" style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.88rem' }} />
                  <input type="text" value={ef.val} onChange={e => updateExtraField(i, 'val', e.target.value)} placeholder="Valor" style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.88rem' }} />
                  <button type="button" onClick={() => removeExtraField(i)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-buttons">
            <button type="submit" className="btn-primary"><i className="fas fa-save"></i> Guardar</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// DASHBOARD PRINCIPAL
// ============================================================
export default function Dashboard() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [empresas, setEmpresas]   = useState([])
  const [tickets, setTickets]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [currentPage, setCurrentPage]     = useState(1)
  const [searchTerm, setSearchTerm]       = useState('')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [currentCompanyId, setCurrentCompanyId]   = useState(null)
  const [currentITCategory, setCurrentITCategory] = useState('equipo')
  const [itItems, setItItems]   = useState([])
  const [itSearch, setItSearch] = useState('')

  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [showITModal, setShowITModal]           = useState(false)
  const [editingCompany, setEditingCompany]     = useState(null)
  const [editingITItem, setEditingITItem]       = useState(null)
  const [selectedITCategory, setSelectedITCategory] = useState('equipo')

  const [contactos, setContactos] = useState([{ nombre: '', telefono: '', email: '', cargo: '' }])
  const [extraFields, setExtraFields] = useState([])
  const [visiblePwds, setVisiblePwds] = useState({})
  const excelInputRef = useRef(null)
  const itemsPerPage = 10

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [empresasData, ticketsData] = await Promise.all([getEmpresas(), getTickets()])
      setEmpresas(empresasData || [])
      setTickets(ticketsData || [])
    } catch (error) {
      showToast('error', 'Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    if (confirm('¿Cerrar sesión?')) { logout(); navigate('/login') }
  }

  function getFilteredCompanies() {
    return empresas.filter(c => {
      const cts = c.contactos || []
      const matchSearch = !searchTerm ||
        c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cts.some(ct => ct.nombre?.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchStatus  = statusFilter  === 'all' || c.estado === statusFilter
      const matchService = serviceFilter === 'all' || (c.servicios || []).includes(serviceFilter)
      return matchSearch && matchStatus && matchService
    })
  }

  const filteredCompanies  = getFilteredCompanies()
  const totalPages         = Math.ceil(filteredCompanies.length / itemsPerPage)
  const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  function exportToExcel() {
    if (!empresas.length) { showToast('warning', 'Sin datos', 'No hay empresas para exportar'); return }
    const data = empresas.map(c => ({
      Nombre: c.nombre || '', CIF: c.cif || '', Email: c.email || '',
      Teléfono: c.telefono || '', Dirección: c.direccion || '',
      Estado: c.estado || '', Servicios: Array.isArray(c.servicios) ? c.servicios.join(', ') : '',
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
            nombre: row['Nombre'] || '', cif: row['CIF'] || '',
            email: row['Email'] || null, telefono: row['Teléfono'] || null,
            direccion: row['Dirección'] || null, estado: row['Estado'] || 'Activo',
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

  async function viewCompany(id) {
    setCurrentCompanyId(id)
    setCurrentITCategory('equipo')
    setItSearch('')
    await loadITItems(id, 'equipo')
  }

  function volverAEmpresas() { setCurrentCompanyId(null); setItItems([]); setItSearch('') }

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
      empresa_id: currentCompanyId, categoria: selectedITCategory,
      nombre: selectedITCategory !== 'correo' ? (formData.get('nombre') || '') : 'correo',
      tipo: formData.get('tipo') || null, ip: formData.get('ip') || null,
      usuario: formData.get('usuario') || null, password: formData.get('password') || null,
      anydesk_id: formData.get('anydesk_id') || null,
      sistema_operativo: formData.get('sistema_operativo') || null,
      capacidad: formData.get('capacidad') || null, modelo: formData.get('modelo') || null,
      numero_serie: formData.get('numero_serie') || null,
      nombre_cliente: formData.get('nombre_cliente') || null,
      correo_cliente: formData.get('correo_cliente') || null,
      password_cliente: formData.get('password_cliente') || null,
      campos_extra,
    }
    if (selectedITCategory !== 'correo' && !payload.nombre) { showToast('error', 'Error', 'El nombre es obligatorio'); return }
    if (selectedITCategory === 'equipo' && !payload.numero_serie) { showToast('error', 'Error', 'El número de serie es obligatorio'); return }
    try {
      if (editingITItem) { await updateDispositivo(editingITItem.id, payload); showToast('success', 'Actualizado', 'Dispositivo actualizado correctamente') }
      else { await createDispositivo(payload); showToast('success', 'Guardado', 'Dispositivo añadido correctamente') }
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

  function togglePassword(key) { setVisiblePwds(prev => ({ ...prev, [key]: !prev[key] })) }

  function showToast(type, title, message) {
    const container = document.getElementById('toastContainer')
    if (!container) return
    const toast = document.createElement('div')
    toast.className = `toast ${type}`
    const icons = { success: 'check-circle', error: 'times-circle', warning: 'exclamation-circle' }
    toast.innerHTML = `
      <i class="fas fa-${icons[type] || 'info-circle'}"></i>
      <div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div>
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

  const itItemsFiltered = itItems.filter(item => {
    if (!itSearch) return true
    const s = itSearch.toLowerCase()
    return (
      (item.nombre || '').toLowerCase().includes(s) ||
      (item.numero_serie || '').toLowerCase().includes(s) ||
      (item.correo_cliente || '').toLowerCase().includes(s) ||
      (item.nombre_cliente || '').toLowerCase().includes(s)
    )
  })

  if (loading) {
    return (
      <div className="loading-screen">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Cargando...</p>
      </div>
    )
  }

  // ── Topbar compartido ──────────────────────────────────────
  const TopBar = () => (
    <header className="topbar">
      <div className="logo">
        <img src="/img/logoHola.png" alt="Logo Hola Informática" />
        <span className="logo-text">Hola Informática</span>
      </div>
      <nav className="top-nav">
        <a className="nav-link active" style={{ cursor: 'pointer' }} onClick={volverAEmpresas}>
          <i className="fas fa-building"></i> Empresas
        </a>
        {isAdmin() && (
          <Link to="/usuarios" className="nav-link">
            <i className="fas fa-users-cog"></i> Usuarios
          </Link>
        )}
        <Link to="/tickets"      className="nav-link"><i className="fas fa-headset"></i> Tickets</Link>
        {isAdmin() && <Link to="/estadisticas" className="nav-link"><i className="fas fa-chart-bar"></i> Estadísticas</Link>}
        <Link to="/chat"         className="nav-link"><i className="fas fa-comments"></i> Chat</Link>
      </nav>
      <div className="user-area">
        <div className="user-info"><i className="fas fa-user-circle"></i><span>{user?.nombre || user?.email}</span></div>
        <button className="btn-logout" onClick={handleLogout}><i className="fas fa-sign-out-alt"></i><span>Salir</span></button>
      </div>
    </header>
  )

  // ============================================================
  // VISTA: DETALLE EMPRESA
  // ============================================================
  if (currentCompanyId) {
    const company = empresas.find(c => c.id === currentCompanyId)
    const contactosEmpresa = company?.contactos || []
    const estadoDot = {
      'Activo':      '#16a34a',
      'En revisión': '#d97706',
      'Suspendido':  '#dc2626',
    }

    return (
      <div className="dashboard">
        <div className="toast-container" id="toastContainer"></div>
        <TopBar />

        <main className="main-content">
          <div className="emp-header">
            <button className="btn-back" onClick={volverAEmpresas}>
              <i className="fas fa-arrow-left"></i> Volver
            </button>
            <div className="emp-header-avatar">
              {(company?.nombre || '?').charAt(0).toUpperCase()}
            </div>
            <div className="emp-header-info">
              <div className="emp-header-title">
                <span className="emp-estado-dot" style={{ background: estadoDot[company?.estado] || '#94a3b8' }} title={company?.estado}></span>
                <h1>{company?.nombre}</h1>
              </div>
              <div className="emp-header-meta">
                {company?.cif      && <span><i className="fas fa-id-card"></i> {company.cif}</span>}
                {company?.email    && <a href={`mailto:${company.email}`}><i className="fas fa-envelope"></i> {company.email}</a>}
                {company?.telefono && <a href={`tel:${company.telefono}`}><i className="fas fa-phone"></i> {company.telefono}</a>}
                {company?.direccion && <span><i className="fas fa-map-marker-alt"></i> {company.direccion}</span>}
              </div>
              {company?.servicios?.length > 0 && (
                <div className="emp-header-services">
                  {company.servicios.map(s => {
                    const cfg = SERVICIO_COLORS[s] || { bg: '#f1f5f9', color: '#475569', icon: 'fa-circle' }
                    return (
                      <span key={s} className="emp-service-pill" style={{ background: cfg.bg, color: cfg.color }}>
                        <i className={`fas ${cfg.icon}`}></i> {s}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
            <button className="btn-primary emp-edit-btn" onClick={() => openCompanyModal(company)}>
              <i className="fas fa-edit"></i> Editar
            </button>
          </div>

          <div className="emp-info-row">
            {company?.notas && (
              <div className="emp-card emp-notas-card">
                <div className="emp-card-title"><i className="fas fa-sticky-note"></i> Notas internas</div>
                <p className="emp-notas-text">{company.notas}</p>
              </div>
            )}
            <div className="emp-card emp-contactos-card" style={{ flex: company?.notas ? 2 : 1 }}>
              <div className="emp-card-title-row">
                <div className="emp-card-title">
                  <i className="fas fa-users"></i> Contactos
                  {contactosEmpresa.length > 0 && <span className="emp-badge">{contactosEmpresa.length}</span>}
                </div>
                <button className="btn-secondary btn-sm" onClick={() => openCompanyModal(company)}>
                  <i className="fas fa-plus"></i> Añadir
                </button>
              </div>
              {contactosEmpresa.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--gray)', margin: 0 }}>Sin contactos registrados</p>
              ) : (
                <div className="emp-contactos-inline">
                  {contactosEmpresa.map((ct, i) => (
                    <div className="emp-contacto-row" key={i}>
                      <div className="emp-contacto-avatar-sm">{(ct.nombre || '?').charAt(0).toUpperCase()}</div>
                      <div className="emp-contacto-row-info">
                        <span className="emp-contacto-row-nombre">{ct.nombre}</span>
                        {ct.cargo && <span className="emp-contacto-row-cargo">{ct.cargo}</span>}
                        <span className="emp-contacto-row-links">
                          {ct.telefono && <a href={`tel:${ct.telefono}`}><i className="fas fa-phone"></i>{ct.telefono}</a>}
                          {ct.email    && <a href={`mailto:${ct.email}`}><i className="fas fa-envelope"></i>{ct.email}</a>}
                        </span>
                      </div>
                      <button className="emp-contacto-delete" title="Eliminar contacto"
                        onClick={async () => {
                          if (!confirm(`¿Eliminar el contacto "${ct.nombre}"?`)) return
                          const nuevos = contactosEmpresa.filter((_, idx) => idx !== i)
                          try {
                            await updateEmpresa(company.id, { ...company, contactos: nuevos })
                            await loadData()
                            showToast('success', 'Contacto eliminado', '')
                          } catch (err) {
                            showToast('error', 'Error', err.message)
                          }
                        }}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="it-page-section">
            <div className="it-tabs-wrapper">
              <div className="it-tabs">
                {Object.entries(TAB_TO_CAT).map(([tabLabel, cat]) => (
                  <button key={tabLabel} className={`it-tab ${currentITCategory === cat ? 'active' : ''}`} onClick={() => handleITTabChange(tabLabel)}>
                    <i className={`fas ${ICONOS[cat]}`}></i>
                    <span>{tabLabel.charAt(0).toUpperCase() + tabLabel.slice(1)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="it-content">
              {itItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--gray)' }}>
                  <i className={`fas ${ICONOS[currentITCategory]}`} style={{ fontSize: '3rem', opacity: 0.2, display: 'block', marginBottom: '16px' }}></i>
                  <p style={{ fontSize: '1.05rem', fontWeight: 500, marginBottom: '20px' }}>No hay {CAT_LABELS[currentITCategory].toLowerCase()} registrados</p>
                  <button className="btn-primary" onClick={() => openITModal(null, currentITCategory)}>
                    <i className="fas fa-plus"></i> Añadir {CAT_LABELS[currentITCategory]}
                  </button>
                </div>
              ) : (
                <>
                  <div className="it-search-bar">
                    <div className="it-search-box">
                      <i className="fas fa-search"></i>
                      <input type="text"
                        placeholder={currentITCategory === 'correo' ? 'Buscar por nombre o correo...' : 'Buscar por nombre o número de serie...'}
                        value={itSearch} onChange={e => setItSearch(e.target.value)} />
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
                            {currentITCategory === 'correo' ? (item.nombre_cliente || item.correo_cliente || '—') : item.nombre}
                            {item.tipo && <small style={{ fontWeight: 400, opacity: 0.65, fontSize: '0.82rem' }}> ({item.tipo})</small>}
                          </h4>
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button className="btn-action btn-edit" onClick={() => openITModal(item, currentITCategory)} title="Editar"><i className="fas fa-edit"></i></button>
                            <button className="btn-action btn-delete" onClick={() => handleDeleteITItem(item.id)} title="Eliminar"><i className="fas fa-trash"></i></button>
                          </div>
                        </div>
                        <div className="it-item-body">
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
                                  <span>{visiblePwds[`${field.key}-${item.id}`] ? (item[field.key] || '(vacío)') : '••••••••'}</span>
                                  <button className="btn-icon" onClick={() => togglePassword(`${field.key}-${item.id}`)}>
                                    <i className={`fas ${visiblePwds[`${field.key}-${item.id}`] ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                  </button>
                                </div>
                              ) : (
                                <span>{item[field.key] || <em style={{ color: 'var(--gray)', fontSize: '0.82rem' }}>—</em>}</span>
                              )}
                            </div>
                          ))}
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

        {showITModal && (
          <ITModal editingITItem={editingITItem} selectedITCategory={selectedITCategory}
            extraFields={extraFields} setExtraFields={setExtraFields}
            onSave={saveITItem} onClose={() => setShowITModal(false)}
            CAT_LABELS={CAT_LABELS} TIPO_SUGERENCIAS={TIPO_SUGERENCIAS} />
        )}
        {showCompanyModal && (
          <CompanyModal editingCompany={editingCompany} contactos={contactos} setContactos={setContactos}
            onSave={saveCompany} onClose={() => setShowCompanyModal(false)} SERVICIOS={SERVICIOS} />
        )}
      </div>
    )
  }

  // ============================================================
  // VISTA: PRINCIPAL — Empresas
  // ============================================================
  return (
    <div className="dashboard">
      <div className="toast-container" id="toastContainer"></div>
      <input type="file" ref={excelInputRef} accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleExcelImport} />

      <TopBar />

      <nav className="bottom-nav">
        <a className="bottom-nav-item active" style={{ cursor: 'pointer' }}>
          <i className="fas fa-building"></i><span>Empresas</span>
        </a>
        {isAdmin() && (
          <Link to="/usuarios" className="bottom-nav-item">
            <i className="fas fa-users-cog"></i><span>Usuarios</span>
          </Link>
        )}
        <Link to="/tickets"      className="bottom-nav-item"><i className="fas fa-headset"></i><span>Tickets</span></Link>
        {isAdmin() && <Link to="/estadisticas" className="bottom-nav-item"><i className="fas fa-chart-bar"></i><span>Stats</span></Link>}
        <Link to="/chat"         className="bottom-nav-item"><i className="fas fa-comments"></i><span>Chat</span></Link>
      </nav>

      <main className="main-content">
        <div className="section-header">
          <div>
            <h1><i className="fas fa-building"></i> Empresas</h1>
            <p>Gestión integral de clientes</p>
          </div>
          <div className="header-actions">
            <button className="btn-secondary btn-icon-only" onClick={exportToExcel} title="Exportar Excel">
              <i className="fas fa-file-excel"></i><span className="btn-label">Exportar</span>
            </button>
            <button className="btn-secondary btn-icon-only" onClick={() => excelInputRef.current?.click()} title="Importar Excel">
              <i className="fas fa-file-import"></i><span className="btn-label">Importar</span>
            </button>
            <button className="btn-primary" onClick={() => openCompanyModal()}>
              <i className="fas fa-plus"></i><span className="btn-label">Nueva</span>
            </button>
          </div>
        </div>

        <div className="stats">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}><i className="fas fa-building"></i></div>
            <div className="stat-info"><h3>{empresas.length}</h3><p>Total</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}><i className="fas fa-check-circle"></i></div>
            <div className="stat-info"><h3>{empresas.filter(c => c.estado === 'Activo').length}</h3><p>Activos</p></div>
          </div>
        </div>

        <div className="filters">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Buscar empresa, CIF, email..." value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }} />
          </div>
          <div className="filter-row">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}>
              <option value="all">Estado</option>
              <option value="Activo">Activo</option>
              <option value="En revisión">En revisión</option>
              <option value="Suspendido">Suspendido</option>
            </select>
            <select value={serviceFilter} onChange={e => { setServiceFilter(e.target.value); setCurrentPage(1) }}>
              <option value="all">Servicio</option>
              {SERVICIOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="table-container desktop-only">
          <table>
            <thead>
              <tr><th>Empresa</th><th>CIF</th><th>Email</th><th>Teléfono</th><th>Servicios</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {paginatedCompanies.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
                  <i className="fas fa-search" style={{ fontSize: '2rem', opacity: 0.3, display: 'block', marginBottom: '10px' }}></i>
                  No se encontraron empresas
                </td></tr>
              ) : paginatedCompanies.map(c => (
                <tr key={c.id}>
                  <td onClick={() => viewCompany(c.id)} style={{ cursor: 'pointer' }}><strong>{c.nombre}</strong></td>
                  <td>{c.cif || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.telefono || '—'}</td>
                  <td><div className="services-tags">{(c.servicios || []).map(s => <span className="service-tag" key={s}>{s}</span>)}</div></td>
                  <td><span className={`status ${(c.estado || '').replace(/ /g, '-')}`}>{c.estado || '—'}</span></td>
                  <td>
                    <button className="btn-action btn-view"   onClick={() => viewCompany(c.id)}       title="Ver IT"><i className="fas fa-server"></i></button>
                    <button className="btn-action btn-edit"   onClick={() => openCompanyModal(c)}     title="Editar"><i className="fas fa-edit"></i></button>
                    <button className="btn-action btn-delete" onClick={() => handleDeleteCompany(c.id)} title="Eliminar"><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="company-cards mobile-only">
          {paginatedCompanies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
              <i className="fas fa-search" style={{ fontSize: '2.5rem', opacity: 0.25, display: 'block', marginBottom: '12px' }}></i>
              <p>No se encontraron empresas</p>
            </div>
          ) : paginatedCompanies.map(c => (
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
                  <button className="btn-action btn-view"   onClick={() => viewCompany(c.id)}><i className="fas fa-server"></i> Ver IT</button>
                  <button className="btn-action btn-edit"   onClick={() => openCompanyModal(c)}><i className="fas fa-edit"></i> Editar</button>
                  <button className="btn-action btn-delete" onClick={() => handleDeleteCompany(c.id)}><i className="fas fa-trash"></i></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i + 1} className={currentPage === i + 1 ? 'active' : ''} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
            ))}
          </div>
        )}
      </main>

      {showCompanyModal && (
        <CompanyModal editingCompany={editingCompany} contactos={contactos} setContactos={setContactos}
          onSave={saveCompany} onClose={() => setShowCompanyModal(false)} SERVICIOS={SERVICIOS} />
      )}
    </div>
  )
}