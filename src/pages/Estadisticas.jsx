import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getEstadisticasResumen, getEstadisticasOperarios, getEstadisticasEmpresas } from '../services/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell,
  PieChart, Pie,
  RadialBarChart, RadialBar
} from 'recharts'
import './Estadisticas.css'

// ── Paleta ──────────────────────────────────────────
const PRIMARY   = '#0047b3'
const PRIMARY_L = '#3a7bd5'
const ACCENT    = '#22c55e'
const WARN      = '#f59e0b'
const DANGER    = '#ef4444'
const PURPLE    = '#8b5cf6'
const CYAN      = '#06b6d4'
const GRAY      = '#94a3b8'

const STATUS_COLORS = {
  Pendientes: WARN,
  'En curso':  CYAN,
  Completados: ACCENT,
  Facturados:  PURPLE,
}

// ── Tooltip personalizado ────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="chart-tooltip-item">
          <span className="chart-tooltip-dot" style={{ background: p.color }} />
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ── Eje Y personalizado (sin decimales) ──────────────
const intFormatter = (v) => Number.isInteger(v) ? v : ''

export default function Estadisticas() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading]             = useState(true)
  const [activeTab, setActiveTab]         = useState('tickets')
  const [resumen, setResumen]             = useState(null)
  const [operariosStats, setOperariosStats] = useState([])
  const [empresasStats, setEmpresasStats] = useState([])
  const [desde, setDesde]                 = useState('')
  const [hasta, setHasta]                 = useState('')

  useEffect(() => {
    if (!isAdmin()) { navigate('/'); return }
    loadData()
  }, [])

  useEffect(() => {
    if (!loading) loadData()
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
    if (confirm('¿Cerrar sesión?')) { logout(); navigate('/login') }
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

  // ── Datos derivados para gráficos ─────────────────

  /** Línea de evolución semanal (si la API devuelve resumen.evolucion) */
  const evolucionData = resumen?.evolucion || []

  /** Distribución de estados → LineChart / BarChart / PieChart */
  const estadosData = [
    { name: 'Pendientes', value: resumen?.pendientes  || 0, color: WARN   },
    { name: 'En curso',   value: resumen?.en_curso    || 0, color: CYAN   },
    { name: 'Completados',value: resumen?.completados || 0, color: ACCENT },
    { name: 'Facturados', value: resumen?.facturados  || 0, color: PURPLE },
  ]

  /**
   * Simple Line Chart de operarios:
   * Cada punto del eje X es un operario.
   * Dos líneas: Completados y Pendientes.
   */
  const operariosLineData = operariosStats.slice(0, 8).map(op => ({
    name:        op.nombre?.split(' ')[0] || '?',
    Completados: op.tickets_completados || 0,
    Pendientes:  op.tickets_pendientes  || 0,
  }))

  /** Empresas top 10 para BarChart horizontal */
  const empresasBarData = empresasStats.slice(0, 10).map(e => ({
    name:  e.nombre?.length > 18 ? e.nombre.slice(0, 16) + '…' : e.nombre,
    Total: e.total,
    Completados: e.completados || 0,
    Pendientes:  e.pendientes  || 0,
  }))

  if (loading) {
    return (
      <div className="loading-screen">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Cargando estadísticas…</p>
      </div>
    )
  }

  return (
    <div className="estadisticas-page">
      <div className="toast-container" id="toastContainer"></div>

      {/* ── Topbar ─────────────────────────────────── */}
      <header className="topbar">
        <div className="logo">
          <img src="/img/logoHola.png" alt="Logo" />
          <span className="logo-text">Hola Informática</span>
        </div>
        <nav className="top-nav">
          <Link to="/"             className="nav-link"><i className="fas fa-building"></i> Empresas</Link>
          <Link to="/usuarios"     className="nav-link"><i className="fas fa-user"></i> Usuarios</Link>
          <Link to="/tickets"      className="nav-link"><i className="fas fa-headset"></i> Tickets</Link>
          <Link to="/estadisticas" className="nav-link active"><i className="fas fa-chart-bar"></i> Estadísticas</Link>
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

      {/* ── Bottom nav (móvil) ─────────────────────── */}
      <nav className="bottom-nav">
        <Link to="/"             className="bottom-nav-item"><i className="fas fa-building"></i><span>Empresas</span></Link>
        <Link to="/usuarios"     className="bottom-nav-item"><i className="fas fa-users-cog"></i><span>Usuarios</span></Link>
        <Link to="/tickets"      className="bottom-nav-item"><i className="fas fa-headset"></i><span>Tickets</span></Link>
        <Link to="/estadisticas" className="bottom-nav-item active"><i className="fas fa-chart-bar"></i><span>Stats</span></Link>
        <Link to="/chat"         className="bottom-nav-item"><i className="fas fa-comments"></i><span>Chat</span></Link>
      </nav>

      <main className="main-content">
        {/* ── Cabecera ─────────────────────────────── */}
        <div className="section-header">
          <div>
            <h1><i className="fas fa-chart-bar"></i> Estadísticas</h1>
            <p>Análisis de rendimiento del equipo y clientes</p>
          </div>
          <div className="header-actions">
            <div className="date-range">
              <i className="fas fa-calendar"></i>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
              <span>—</span>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
              <button className="btn-secondary btn-sm" onClick={() => { setDesde(''); setHasta('') }}>
                <i className="fas fa-undo"></i> Todo
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI cards ────────────────────────────── */}
        <div className="stats">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
              <i className="fas fa-ticket-alt"></i>
            </div>
            <div className="stat-info">
              <h3>{resumen?.total || 0}</h3>
              <p>Total tickets</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-info">
              <h3>{(resumen?.pendientes || 0) + (resumen?.en_curso || 0)}</h3>
              <p>Abiertos</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-info">
              <h3>{resumen?.completados || 0}</h3>
              <p>Completados</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>
              <i className="fas fa-file-invoice-dollar"></i>
            </div>
            <div className="stat-info">
              <h3>{resumen?.facturados || 0}</h3>
              <p>Facturados</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <i className="fas fa-exclamation-circle"></i>
            </div>
            <div className="stat-info">
              <h3>{resumen?.urgentes || 0}</h3>
              <p>Urgentes</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
              <i className="fas fa-calendar-week"></i>
            </div>
            <div className="stat-info">
              <h3>{resumen?.ultimos_7_dias || 0}</h3>
              <p>Últimos 7 días</p>
            </div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────── */}
        <div className="stats-tabs">
          {[
            { id: 'tickets',   icon: 'ticket-alt', label: 'Tickets'   },
            { id: 'operarios', icon: 'users',       label: 'Operarios' },
            { id: 'empresas',  icon: 'building',    label: 'Empresas'  },
          ].map(t => (
            <button
              key={t.id}
              className={`stats-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <i className={`fas fa-${t.icon}`}></i> {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════
            TAB: TICKETS
        ══════════════════════════════════════════ */}
        {activeTab === 'tickets' && (
          <div className="stats-tab-content">

            {/* Gráfico de líneas — evolución temporal */}
            {evolucionData.length > 0 && (
              <div className="stats-panel stats-panel-full">
                <div className="stats-panel-header">
                  <i className="fas fa-chart-line"></i> Evolución de tickets en el tiempo
                </div>
                <div className="stats-panel-body stats-panel-body--chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={evolucionData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: GRAY }} />
                      <YAxis tickFormatter={intFormatter} tick={{ fontSize: 12, fill: GRAY }} width={32} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 13 }} />
                      <Line
                        type="monotone"
                        dataKey="Abiertos"
                        stroke={WARN}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        activeDot={{ r: 7 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Completados"
                        stroke={ACCENT}
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        activeDot={{ r: 7 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Facturados"
                        stroke={PURPLE}
                        strokeWidth={2}
                        strokeDasharray="4 2"
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Grid 2 columnas — Pie + Bar de estados */}
            <div className="stats-grid-2">
              {/* Distribución por estado — Pie */}
              <div className="stats-panel">
                <div className="stats-panel-header">
                  <i className="fas fa-chart-pie"></i> Distribución por estado
                </div>
                <div className="stats-panel-body stats-panel-body--chart">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={estadosData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        label={({ name, percent }) => percent > 0.04 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                        labelLine={false}
                      >
                        {estadosData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Leyenda manual */}
                  <div className="pie-legend">
                    {estadosData.map(e => (
                      <div key={e.name} className="pie-legend-item">
                        <span className="pie-legend-dot" style={{ background: e.color }} />
                        <span className="pie-legend-label">{e.name}</span>
                        <span className="pie-legend-value">{e.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Distribución por estado — BarChart simple */}
              <div className="stats-panel">
                <div className="stats-panel-header">
                  <i className="fas fa-bars"></i> Volumen por estado
                </div>
                <div className="stats-panel-body stats-panel-body--chart">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={estadosData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: GRAY }} />
                      <YAxis tickFormatter={intFormatter} tick={{ fontSize: 12, fill: GRAY }} width={30} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Tickets">
                        {estadosData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: OPERARIOS
        ══════════════════════════════════════════ */}
        {activeTab === 'operarios' && (
          <div className="stats-tab-content">
            {operariosStats.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-users"></i>
                <p>No hay datos de operarios</p>
              </div>
            ) : (
              <>
                {/* Simple Line Chart — Completados vs Pendientes por operario */}
                <div className="stats-panel stats-panel-full">
                  <div className="stats-panel-header">
                    <i className="fas fa-chart-line"></i> Tickets por operario
                  </div>
                  <div className="stats-panel-body stats-panel-body--chart">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={operariosLineData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: GRAY }} />
                        <YAxis tickFormatter={intFormatter} tick={{ fontSize: 12, fill: GRAY }} width={32} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 13 }} />
                        <Line
                          type="monotone"
                          dataKey="Completados"
                          stroke={ACCENT}
                          strokeWidth={2.5}
                          dot={{ r: 5, fill: ACCENT }}
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Pendientes"
                          stroke={WARN}
                          strokeWidth={2.5}
                          dot={{ r: 5, fill: WARN }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Cards individuales */}
                <div className="operarios-grid">
                  {operariosStats.map(op => (
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

                      {/* Mini line chart por operario (si hay datos de evolucion por operario) */}
                      {op.evolucion?.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <ResponsiveContainer width="100%" height={60}>
                            <LineChart data={op.evolucion}>
                              <Line type="monotone" dataKey="value" stroke={PRIMARY} strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      <div className="operario-stat-body">
                        <div className="stat-mini">
                          <span className="stat-mini-value" style={{ color: ACCENT }}>{op.tickets_completados || 0}</span>
                          <span className="stat-mini-label">Completados</span>
                        </div>
                        <div className="stat-mini">
                          <span className="stat-mini-value" style={{ color: WARN }}>{op.tickets_pendientes || 0}</span>
                          <span className="stat-mini-label">Pendientes</span>
                        </div>
                        <div className="stat-mini">
                          <span className="stat-mini-value" style={{ color: PRIMARY }}>{op.horas_totales || 0}h</span>
                          <span className="stat-mini-label">Horas</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: EMPRESAS
        ══════════════════════════════════════════ */}
        {activeTab === 'empresas' && (
          <div className="stats-tab-content">
            {empresasStats.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-building"></i>
                <p>No hay datos de empresas</p>
              </div>
            ) : (
              <>
                {/* Gráfico de barras horizontal — Top empresas */}
                <div className="stats-panel stats-panel-full">
                  <div className="stats-panel-header">
                    <i className="fas fa-chart-bar"></i> Top clientes por volumen de tickets
                  </div>
                  <div className="stats-panel-body stats-panel-body--chart">
                    <ResponsiveContainer width="100%" height={Math.max(260, empresasBarData.length * 42)}>
                      <BarChart
                        data={empresasBarData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" horizontal={false} />
                        <XAxis type="number" tickFormatter={intFormatter} tick={{ fontSize: 12, fill: GRAY }} />
                        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fill: GRAY }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 13 }} />
                        <Bar dataKey="Completados" fill={ACCENT}  stackId="a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Pendientes"  fill={WARN}    stackId="a" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Lista detallada */}
                <div className="stats-panel">
                  <div className="stats-panel-header">
                    <i className="fas fa-list"></i> Detalle por empresa
                  </div>
                  <div className="stats-panel-body">
                    <div className="empresas-list">
                      {empresasStats.map((empresa, index) => (
                        <div key={empresa.id} className="empresa-stat-row">
                          <div className="empresa-rank" style={{
                            background: index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : index === 2 ? '#cd7f32' : PRIMARY
                          }}>
                            {index + 1}
                          </div>
                          <div className="empresa-info">
                            <span className="empresa-nombre">{empresa.nombre}</span>
                            <div className="empresa-stats">
                              <span className="empresa-stat" style={{ color: WARN }}>
                                <i className="fas fa-clock" style={{ fontSize: '0.7rem', marginRight: 3 }} />
                                {empresa.pendientes} pend.
                              </span>
                              <span className="empresa-stat" style={{ color: ACCENT }}>
                                <i className="fas fa-check" style={{ fontSize: '0.7rem', marginRight: 3 }} />
                                {empresa.completados} comp.
                              </span>
                            </div>
                            {/* Barra de progreso */}
                            <div className="empresa-progress-bar">
                              <div
                                className="empresa-progress-fill"
                                style={{
                                  width: empresa.total > 0
                                    ? `${((empresa.completados || 0) / empresa.total) * 100}%`
                                    : '0%'
                                }}
                              />
                            </div>
                          </div>
                          <div className="empresa-total">
                            <span className="total-badge">{empresa.total}</span>
                            <span className="total-label">tickets</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}