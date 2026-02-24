import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getEstadisticasResumen, getEstadisticasOperarios, getEstadisticasEmpresas } from '../services/api'
import './Estadisticas.css'

export default function Estadisticas() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('tickets')
  const [resumen, setResumen] = useState(null)
  const [operariosStats, setOperariosStats] = useState([])
  const [empresasStats, setEmpresasStats] = useState([])
  
  // Date filters
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/')
      return
    }
    loadData()
  }, [])

  useEffect(() => {
    if (!loading) {
      loadData()
    }
  }, [desde, hasta])

  async function loadData() {
    setLoading(true)
    try {
      const params = {}
      if (desde) params.desde = desde
      if (hasta) params.hasta = hasta
      
      const [resumenData, operariosData, empresasData] = await Promise.all([
        getEstadisticasResumen(),
        getEstadisticasOperarios(params),
        getEstadisticasEmpresas(params)
      ])
      
      setResumen(resumenData)
      setOperariosStats(operariosData || [])
      setEmpresasStats(empresasData || [])
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

  if (loading) {
    return (
      <div className="loading-screen">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="estadisticas-page">
      <div className="toast-container" id="toastContainer"></div>
      
      <header className="topbar">
        <div className="logo">
          <img src="/img/logoHola.png" alt="Logo" />
          <span className="logo-text">Hola Informática</span>
        </div>
        <nav className="top-nav">
          <Link to="/" className="nav-link"><i className="fas fa-building"></i> Empresas</Link>
          <Link to="/tickets" className="nav-link"><i className="fas fa-headset"></i> Tickets</Link>
          <Link to="/estadisticas" className="nav-link active"><i className="fas fa-chart-bar"></i> Estadísticas</Link>
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
        <div className="section-header">
          <div>
            <h1><i className="fas fa-chart-bar"></i> Estadísticas</h1>
            <p>Análisis de rendimiento del equipo y clientes</p>
          </div>
          <div className="header-actions">
            <div className="date-range">
              <i className="fas fa-calendar"></i>
              <input 
                type="date" 
                value={desde} 
                onChange={(e) => setDesde(e.target.value)} 
              />
              <span>—</span>
              <input 
                type="date" 
                value={hasta} 
                onChange={(e) => setHasta(e.target.value)} 
              />
              <button className="btn-secondary btn-sm" onClick={() => { setDesde(''); setHasta('') }}>
                <i className="fas fa-undo"></i> Todo
              </button>
            </div>
          </div>
        </div>

        {/* Stats Generales */}
        <div className="stats">
          <div className="stat-card">
            <div className="stat-icon" style={{background: '#dbeafe', color: '#2563eb'}}>
              <i className="fas fa-ticket-alt"></i>
            </div>
            <div className="stat-info">
              <h3>{resumen?.total || 0}</h3>
              <p>Total tickets</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background: '#fef3c7', color: '#d97706'}}>
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-info">
              <h3>{(resumen?.pendientes || 0) + (resumen?.en_curso || 0)}</h3>
              <p>Abiertos</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background: '#dcfce7', color: '#16a34a'}}>
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-info">
              <h3>{resumen?.completados || 0}</h3>
              <p>Completados</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background: '#f3e8ff', color: '#9333ea'}}>
              <i className="fas fa-file-invoice-dollar"></i>
            </div>
            <div className="stat-info">
              <h3>{resumen?.facturados || 0}</h3>
              <p>Facturados</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background: '#fee2e2', color: '#dc2626'}}>
              <i className="fas fa-exclamation-circle"></i>
            </div>
            <div className="stat-info">
              <h3>{resumen?.urgentes || 0}</h3>
              <p>Urgentes</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{background: '#dbeafe', color: '#2563eb'}}>
              <i className="fas fa-calendar-week"></i>
            </div>
            <div className="stat-info">
              <h3>{resumen?.ultimos_7_dias || 0}</h3>
              <p>Últimos 7 días</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="stats-tabs">
          <button 
            className={`stats-tab ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tickets')}
          >
            <i className="fas fa-ticket-alt"></i> Tickets
          </button>
          <button 
            className={`stats-tab ${activeTab === 'operarios' ? 'active' : ''}`}
            onClick={() => setActiveTab('operarios')}
          >
            <i className="fas fa-users"></i> Operarios
          </button>
          <button 
            className={`stats-tab ${activeTab === 'empresas' ? 'active' : ''}`}
            onClick={() => setActiveTab('empresas')}
          >
            <i className="fas fa-building"></i> Empresas
          </button>
        </div>

        {/* Tab Content */}
        <div className="stats-tab-content">
          {activeTab === 'tickets' && (
            <div className="stats-grid-2">
              <div className="stats-panel">
                <div className="stats-panel-header">
                  <i className="fas fa-chart-donut"></i> Distribución por estado
                </div>
                <div className="stats-panel-body">
                  <div className="donut-chart">
                    {[
                      { label: 'Pendientes', value: resumen?.pendientes || 0, color: '#fef3c7' },
                      { label: 'En curso', value: resumen?.en_curso || 0, color: '#dbeafe' },
                      { label: 'Completados', value: resumen?.completados || 0, color: '#dcfce7' },
                      { label: 'Facturados', value: resumen?.facturados || 0, color: '#f3e8ff' },
                    ].map(item => (
                      <div key={item.label} className="donut-item">
                        <div className="donut-color" style={{background: item.color}}></div>
                        <span className="donut-label">{item.label}</span>
                        <span className="donut-value">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="stats-panel">
                <div className="stats-panel-header">
                  <i className="fas fa-flag"></i> Distribución por prioridad
                </div>
                <div className="stats-panel-body">
                  <div className="donut-chart">
                    {[
                      { label: 'Baja', value: resumen?.total - (resumen?.urgentes || 0), color: '#dcfce7' },
                      { label: 'Urgente', value: resumen?.urgentes || 0, color: '#fee2e2' },
                    ].map(item => (
                      <div key={item.label} className="donut-item">
                        <div className="donut-color" style={{background: item.color}}></div>
                        <span className="donut-label">{item.label}</span>
                        <span className="donut-value">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'operarios' && (
            <div className="operarios-grid">
              {operariosStats.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-users"></i>
                  <p>No hay datos de operarios</p>
                </div>
              ) : (
                operariosStats.map(op => (
                  <div key={op.id} className="operario-stat-card">
                    <div className="operario-stat-header">
                      <div className="operario-avatar">
                        {op.nombre?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h4>{op.nombre}</h4>
                        <span className="operario-role">{op.tickets_totales} tickets</span>
                      </div>
                    </div>
                    <div className="operario-stat-body">
                      <div className="stat-mini">
                        <span className="stat-mini-value">{op.tickets_completados || 0}</span>
                        <span className="stat-mini-label">Completados</span>
                      </div>
                      <div className="stat-mini">
                        <span className="stat-mini-value">{op.tickets_pendientes || 0}</span>
                        <span className="stat-mini-label">Pendientes</span>
                      </div>
                      <div className="stat-mini">
                        <span className="stat-mini-value">{op.horas_totales || 0}h</span>
                        <span className="stat-mini-label">Horas</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'empresas' && (
            <div className="stats-panel">
              <div className="stats-panel-header">
                <i className="fas fa-building"></i> Clientes con más incidencias
              </div>
              <div className="stats-panel-body">
                {empresasStats.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-building"></i>
                    <p>No hay datos de empresas</p>
                  </div>
                ) : (
                  <div className="empresas-list">
                    {empresasStats.map((empresa, index) => (
                      <div key={empresa.id} className="empresa-stat-row">
                        <div className="empresa-rank">{index + 1}</div>
                        <div className="empresa-info">
                          <span className="empresa-nombre">{empresa.nombre}</span>
                          <div className="empresa-stats">
                            <span className="empresa-stat">{empresa.pendientes} pendientes</span>
                            <span className="empresa-stat">{empresa.completados} completados</span>
                          </div>
                        </div>
                        <div className="empresa-total">
                          <span className="total-badge">{empresa.total}</span>
                          <span className="total-label">tickets</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
