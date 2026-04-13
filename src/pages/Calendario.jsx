import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getCalendarioEventos, createCalendarioEvento, updateCalendarioEvento, deleteCalendarioEvento,
  getOperarios, getEmpresas, getTickets, getDispositivos,
} from '../services/api'
import ChatNavLink from '../components/ChatNavLink'
import ThemeToggle from '../components/ThemeToggle'
import './Calendario.css'

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

// ── SearchableSelect (empresa) ────────────────────────────────
function SearchableSelect({ value, onChange, options, placeholder = 'Seleccionar...' }) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const [typing, setTyping] = useState(false)
  const wrapRef             = useRef(null)
  const inputRef            = useRef(null)
  const selected            = options.find(o => o.value === value)
  const displayValue        = typing ? query : (selected?.label || '')
  const filtered            = typing && query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options
  useEffect(() => {
    function h(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setTyping(false); setQuery('') } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  function select(val) { onChange(val); setTyping(false); setQuery(''); setOpen(false) }
  return (
    <div className="ss-wrap" ref={wrapRef}>
      <div className={`ss-input-wrap ${open ? 'open' : ''}`}>
        <i className="fas fa-search ss-input-icon"></i>
        <input ref={inputRef} className="ss-input" value={displayValue}
          onChange={e => { setQuery(e.target.value); setTyping(true); setOpen(true) }}
          onFocus={() => { setOpen(true); setTyping(true); setQuery(''); setTimeout(() => inputRef.current?.select(), 0) }}
          placeholder={placeholder} autoComplete="off" />
        {value && !typing && (
          <button type="button" className="ss-clear-query" onMouseDown={e => { e.preventDefault(); onChange(''); setTyping(true); setQuery(''); setOpen(true); inputRef.current?.focus() }}>
            <i className="fas fa-times"></i>
          </button>
        )}
        <i className={`fas fa-chevron-down ss-arrow ${open ? 'open' : ''}`}></i>
      </div>
      {open && (
        <div className="ss-dropdown">
          <div className="ss-list">
            {filtered.length === 0 ? <div className="ss-empty">Sin resultados</div>
              : filtered.map(o => (
                <div key={o.value} className={`ss-option ${value === o.value ? 'active' : ''}`}
                  onMouseDown={e => { e.preventDefault(); select(o.value) }}>
                  <span className="ss-opt-label">{o.label}</span>
                  {value === o.value && <i className="fas fa-check ss-opt-check"></i>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── OperariosSelector ─────────────────────────────────────────
function OperariosSelector({ operarios, selected, onChange }) {
  const [query, setQuery] = useState('')
  const admins  = operarios.filter(o => o.rol === 'admin' || o.rol === 'gestor')
  const workers = operarios.filter(o => o.rol === 'trabajador')
  const filtered = query.trim()
    ? operarios.filter(o => (o.nombre || o.email || '').toLowerCase().includes(query.toLowerCase()))
    : operarios
  function toggle(id) { onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]) }
  return (
    <div>
      <div className="cal-op-quick-filters">
        <button type="button" className="cal-op-qf qf-all"     onClick={() => onChange(operarios.map(o => o.id))}><i className="fas fa-users"></i> Todos</button>
        <button type="button" className="cal-op-qf qf-admins"  onClick={() => onChange(admins.map(o => o.id))}><i className="fas fa-shield-alt"></i> Admins</button>
        <button type="button" className="cal-op-qf qf-workers" onClick={() => onChange(workers.map(o => o.id))}><i className="fas fa-hard-hat"></i> Trabajadores</button>
        {selected.length > 0 && <button type="button" className="cal-op-qf qf-clear" onClick={() => onChange([])}><i className="fas fa-times"></i> Limpiar</button>}
      </div>
      <div className="cal-op-search-bar">
        <i className="fas fa-search cal-op-search-icon"></i>
        <input type="text" placeholder="Buscar operario..." value={query}
          onChange={e => setQuery(e.target.value)} className="cal-op-search-input" />
        {query && <button type="button" onClick={() => setQuery('')} className="cal-op-search-clear"><i className="fas fa-times"></i></button>}
      </div>
      <div className="cal-op-list">
        {filtered.length === 0 && <p className="cal-op-empty">Sin resultados.</p>}
        {filtered.map(op => {
          const isSel = selected.includes(op.id)
          return (
            <div key={op.id} className={`cal-op-item ${isSel ? 'selected' : ''}`} onClick={() => toggle(op.id)}>
              <div className="cal-op-avatar" style={{ background: getAvatarColor(op.id) }}>{getInitials(op.nombre)}</div>
              <div className="cal-op-info">
                <span className="cal-op-nombre">{op.nombre || op.email}</span>
                {op.rol === 'admin'
                  ? <span className="cal-op-badge admin"><i className="fas fa-shield-alt"></i> Admin</span>
                  : op.rol === 'gestor'
                  ? <span className="cal-op-badge gestor"><i className="fas fa-user-tie"></i> Gestor</span>
                  : <span className="cal-op-badge worker"><i className="fas fa-hard-hat"></i> Trabajador</span>}
              </div>
              <span className="cal-op-check"><i className="fas fa-check"></i></span>
            </div>
          )
        })}
      </div>
      <div className="cal-op-count">
        {selected.length > 0
          ? `${selected.length} operario${selected.length > 1 ? 's' : ''} seleccionado${selected.length > 1 ? 's' : ''}`
          : <span style={{ color: '#aaa' }}>Ningún operario seleccionado</span>}
      </div>
    </div>
  )
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const COLORES = ['#0047b3', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#0891b2', '#be185d', '#065f46']
const AVISO_OPCIONES = [
  { value: 0, label: 'En el momento' },
  { value: 5, label: '5 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
  { value: 1440, label: '1 día antes' },
  { value: 2880, label: '2 días antes' },
]

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1 // Lunes = 0
}

function formatHour(h) {
  return `${h.toString().padStart(2, '0')}:00`
}

function toLocalDateStr(date) {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toLocalTimeStr(date) {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

export default function Calendario() {
  const { user, logout, isAdmin, isGestor } = useAuth()
  const [eventos, setEventos] = useState([])
  const [operarios, setOperarios] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  // Datos del modal (tickets/dispositivos de la empresa seleccionada)
  const [modalTickets, setModalTickets] = useState([])
  const [modalDispositivos, setModalDispositivos] = useState([])
  const [loadingModalData, setLoadingModalData] = useState(false)

  // Vista: 'mes' o 'semana' o 'dia'
  const [vista, setVista] = useState('mes')

  // Fecha de navegación
  const hoy = new Date()
  const [year, setYear] = useState(hoy.getFullYear())
  const [month, setMonth] = useState(hoy.getMonth())
  const [selectedDate, setSelectedDate] = useState(hoy)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editEvento, setEditEvento] = useState(null)
  const [form, setForm] = useState({
    titulo: '', descripcion: '', fecha_inicio_date: '', fecha_inicio_time: '09:00',
    fecha_fin_date: '', fecha_fin_time: '10:00', todo_el_dia: false,
    color: '#0047b3', tipo: 'evento', asignados: [], avisos: [],
    empresa_id: '', ticket_ids: [], dispositivo_ids: [],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Detalle evento
  const [showDetalle, setShowDetalle] = useState(null)

  const canAssign = isAdmin() || isGestor()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [data, emps] = await Promise.all([getCalendarioEventos(), getEmpresas()])
      setEventos(data)
      setEmpresas(emps || [])
      if (canAssign) {
        const ops = await getOperarios()
        setOperarios(ops)
      }
    } catch (err) {
      console.error('Error cargando calendario:', err)
    }
    setLoading(false)
  }, [canAssign])

  useEffect(() => { cargar() }, [cargar])

  // Cargar tickets y dispositivos cuando cambia la empresa en el formulario
  useEffect(() => {
    if (!showModal || !form.empresa_id) {
      setModalTickets([])
      setModalDispositivos([])
      return
    }
    let cancelled = false
    async function loadEmpresaData() {
      setLoadingModalData(true)
      try {
        const [tickets, dispos] = await Promise.all([
          getTickets({ empresa_id: form.empresa_id }),
          getDispositivos(form.empresa_id),
        ])
        if (!cancelled) {
          setModalTickets(tickets || [])
          setModalDispositivos(dispos || [])
        }
      } catch {}
      if (!cancelled) setLoadingModalData(false)
    }
    loadEmpresaData()
    return () => { cancelled = true }
  }, [form.empresa_id, showModal])

  function handleLogout() { logout() }

  // ── Navegación meses ──────────────────────────────────────
  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  function goToday() {
    const h = new Date()
    setYear(h.getFullYear())
    setMonth(h.getMonth())
    setSelectedDate(h)
  }

  // ── Navegación semana/día ─────────────────────────────────
  function prevWeek() { setSelectedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7)) }
  function nextWeek() { setSelectedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)) }
  function prevDay()  { setSelectedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)) }
  function nextDay()  { setSelectedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) }

  // ── Obtener eventos de un día ─────────────────────────────
  function getEventosDelDia(date) {
    const dateStr = toLocalDateStr(date)
    return eventos.filter(e => {
      const start = toLocalDateStr(new Date(e.fecha_inicio))
      const end = toLocalDateStr(new Date(e.fecha_fin))
      return dateStr >= start && dateStr <= end
    })
  }

  // ── Semana actual ─────────────────────────────────────────
  function getWeekDays() {
    const d = new Date(selectedDate)
    const day = d.getDay()
    const diff = day === 0 ? 6 : day - 1 // Monday-based
    const monday = new Date(d)
    monday.setDate(d.getDate() - diff)
    const days = []
    for (let i = 0; i < 7; i++) {
      const dd = new Date(monday)
      dd.setDate(monday.getDate() + i)
      days.push(dd)
    }
    return days
  }

  // ── Abrir modal para crear ────────────────────────────────
  function abrirCrear(date) {
    const dateStr = toLocalDateStr(date || new Date())
    setEditEvento(null)
    setForm({
      titulo: '', descripcion: '',
      fecha_inicio_date: dateStr, fecha_inicio_time: '09:00',
      fecha_fin_date: dateStr, fecha_fin_time: '10:00',
      todo_el_dia: false, color: '#0047b3', tipo: 'evento',
      asignados: [], avisos: [], empresa_id: '', ticket_ids: [], dispositivo_ids: [],
    })
    setError('')
    setShowModal(true)
  }

  function abrirCrearConHora(date, hora) {
    const dateStr = toLocalDateStr(date)
    setEditEvento(null)
    setForm({
      titulo: '', descripcion: '',
      fecha_inicio_date: dateStr, fecha_inicio_time: `${hora.toString().padStart(2, '0')}:00`,
      fecha_fin_date: dateStr, fecha_fin_time: `${(hora + 1).toString().padStart(2, '0')}:00`,
      todo_el_dia: false, color: '#0047b3', tipo: 'evento',
      asignados: [], avisos: [], empresa_id: '', ticket_ids: [], dispositivo_ids: [],
    })
    setError('')
    setShowModal(true)
  }

  // ── Abrir modal para editar ───────────────────────────────
  function abrirEditar(ev) {
    const inicio = new Date(ev.fecha_inicio)
    const fin = new Date(ev.fecha_fin)
    setEditEvento(ev)
    setForm({
      titulo: ev.titulo,
      descripcion: ev.descripcion || '',
      fecha_inicio_date: toLocalDateStr(inicio),
      fecha_inicio_time: toLocalTimeStr(inicio),
      fecha_fin_date: toLocalDateStr(fin),
      fecha_fin_time: toLocalTimeStr(fin),
      todo_el_dia: ev.todo_el_dia || false,
      color: ev.color || '#0047b3',
      tipo: ev.tipo || 'evento',
      asignados: (ev.asignados || []).map(a => a.id),
      avisos: (ev.calendario_avisos || []).map(a => a.minutos_antes),
      empresa_id: ev.empresa_id || '',
      ticket_ids: (ev.tickets_vinculados || []).map(t => t.id),
      dispositivo_ids: (ev.dispositivos_vinculados || []).map(d => d.id),
    })
    setError('')
    setShowDetalle(null)
    setShowModal(true)
  }

  // ── Guardar ───────────────────────────────────────────────
  async function handleSave() {
    if (!form.titulo.trim()) { setError('El título es obligatorio.'); return }
    if (!form.fecha_inicio_date) { setError('La fecha de inicio es obligatoria.'); return }

    setSaving(true)
    setError('')
    try {
      const fecha_inicio = form.todo_el_dia
        ? `${form.fecha_inicio_date}T00:00:00`
        : new Date(`${form.fecha_inicio_date}T${form.fecha_inicio_time}:00`).toISOString()
      const fecha_fin = form.todo_el_dia
        ? `${form.fecha_fin_date || form.fecha_inicio_date}T23:59:59`
        : new Date(`${form.fecha_fin_date || form.fecha_inicio_date}T${form.fecha_fin_time}:00`).toISOString()

      const payload = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || null,
        fecha_inicio,
        fecha_fin,
        todo_el_dia: form.todo_el_dia,
        color: form.color,
        tipo: form.tipo,
        asignados: form.asignados,
        avisos: form.avisos,
        empresa_id: form.empresa_id || null,
        ticket_ids: form.ticket_ids,
        dispositivo_ids: form.dispositivo_ids,
      }

      if (editEvento) {
        await updateCalendarioEvento(editEvento.id, payload)
      } else {
        await createCalendarioEvento(payload)
      }
      setShowModal(false)
      await cargar()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  // ── Eliminar ──────────────────────────────────────────────
  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar este evento?')) return
    try {
      await deleteCalendarioEvento(id)
      setShowDetalle(null)
      await cargar()
    } catch (err) {
      alert(err.message)
    }
  }

  // ── Toggle completada ─────────────────────────────────────
  async function toggleCompletada(ev) {
    try {
      await updateCalendarioEvento(ev.id, { completada: !ev.completada })
      await cargar()
      if (showDetalle?.id === ev.id) setShowDetalle({ ...ev, completada: !ev.completada })
    } catch (err) {
      alert(err.message)
    }
  }

  // ── Toggle aviso ──────────────────────────────────────────
  function toggleAviso(min) {
    setForm(f => ({
      ...f,
      avisos: f.avisos.includes(min) ? f.avisos.filter(a => a !== min) : [...f.avisos, min],
    }))
  }

  // ── RENDER: Calendario mes ────────────────────────────────
  function renderMes() {
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const prevDays = getDaysInMonth(year, month === 0 ? 11 : month - 1)
    const cells = []

    // Días del mes anterior
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevDays - i
      const date = new Date(year, month - 1, d)
      const evs = getEventosDelDia(date)
      cells.push(
        <div key={`prev-${d}`} className="cal-day other-month" onClick={() => abrirCrear(date)}>
          <span className="day-num">{d}</span>
          {evs.slice(0, 3).map(e => (
            <div key={e.id} className={`cal-event-pill${e.completada ? ' completada' : ''}`}
              style={{ background: e.color || '#0047b3' }}
              onClick={ev => { ev.stopPropagation(); setShowDetalle(e) }}>
              {e.titulo}
            </div>
          ))}
          {evs.length > 3 && <span className="cal-more">+{evs.length - 3} más</span>}
        </div>
      )
    }

    // Días del mes actual
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const isToday = d === hoy.getDate() && month === hoy.getMonth() && year === hoy.getFullYear()
      const evs = getEventosDelDia(date)
      cells.push(
        <div key={`cur-${d}`} className={`cal-day${isToday ? ' today' : ''}`} onClick={() => {
          setSelectedDate(date)
          if (vista === 'mes') abrirCrear(date)
        }}>
          <span className={`day-num${isToday ? ' today-num' : ''}`}>{d}</span>
          {evs.slice(0, 3).map(e => (
            <div key={e.id} className={`cal-event-pill${e.completada ? ' completada' : ''}`}
              style={{ background: e.color || '#0047b3' }}
              onClick={ev => { ev.stopPropagation(); setShowDetalle(e) }}>
              {!e.todo_el_dia && <span className="pill-time">{toLocalTimeStr(new Date(e.fecha_inicio))}</span>}
              {e.titulo}
            </div>
          ))}
          {evs.length > 3 && <span className="cal-more" onClick={ev => { ev.stopPropagation(); setSelectedDate(date); setVista('dia') }}>+{evs.length - 3} más</span>}
        </div>
      )
    }

    // Rellenar siguiente mes
    const remaining = 42 - cells.length
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d)
      const evs = getEventosDelDia(date)
      cells.push(
        <div key={`next-${d}`} className="cal-day other-month" onClick={() => abrirCrear(date)}>
          <span className="day-num">{d}</span>
          {evs.slice(0, 3).map(e => (
            <div key={e.id} className={`cal-event-pill${e.completada ? ' completada' : ''}`}
              style={{ background: e.color || '#0047b3' }}
              onClick={ev => { ev.stopPropagation(); setShowDetalle(e) }}>
              {e.titulo}
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="cal-month-grid">
        {DIAS.map(d => <div key={d} className="cal-day-header">{d}</div>)}
        {cells}
      </div>
    )
  }

  // ── RENDER: Vista semana ──────────────────────────────────
  function renderSemana() {
    const weekDays = getWeekDays()
    const hours = Array.from({ length: 24 }, (_, i) => i)

    return (
      <div className="cal-week-view">
        <div className="cal-week-header">
          <div className="cal-time-gutter"></div>
          {weekDays.map((d, i) => {
            const isToday = toLocalDateStr(d) === toLocalDateStr(hoy)
            return (
              <div key={i} className={`cal-week-day-header${isToday ? ' today' : ''}`}
                onClick={() => { setSelectedDate(d); setVista('dia') }}>
                <span className="week-day-name">{DIAS[i]}</span>
                <span className={`week-day-num${isToday ? ' today-num' : ''}`}>{d.getDate()}</span>
              </div>
            )
          })}
        </div>
        <div className="cal-week-body">
          {hours.map(h => (
            <div key={h} className="cal-week-row">
              <div className="cal-time-gutter">{formatHour(h)}</div>
              {weekDays.map((d, i) => {
                const evs = getEventosDelDia(d).filter(e => {
                  if (e.todo_el_dia) return false
                  const eH = new Date(e.fecha_inicio).getHours()
                  return eH === h
                })
                return (
                  <div key={i} className="cal-week-cell" onClick={() => abrirCrearConHora(d, h)}>
                    {evs.map(e => (
                      <div key={e.id} className={`cal-week-event${e.completada ? ' completada' : ''}`}
                        style={{ background: e.color || '#0047b3' }}
                        onClick={ev => { ev.stopPropagation(); setShowDetalle(e) }}>
                        <span className="week-ev-time">{toLocalTimeStr(new Date(e.fecha_inicio))}</span>
                        <span className="week-ev-title">{e.titulo}</span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
          {/* Eventos de todo el día */}
          {weekDays.some(d => getEventosDelDia(d).some(e => e.todo_el_dia)) && (
            <div className="cal-week-allday">
              <div className="cal-time-gutter" style={{ fontSize: 11 }}>Todo el día</div>
              {weekDays.map((d, i) => {
                const evs = getEventosDelDia(d).filter(e => e.todo_el_dia)
                return (
                  <div key={i} className="cal-week-cell allday-cell">
                    {evs.map(e => (
                      <div key={e.id} className="cal-event-pill" style={{ background: e.color || '#0047b3' }}
                        onClick={() => setShowDetalle(e)}>{e.titulo}</div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── RENDER: Vista día ─────────────────────────────────────
  function renderDia() {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const evsDia = getEventosDelDia(selectedDate)
    const allDayEvs = evsDia.filter(e => e.todo_el_dia)

    return (
      <div className="cal-day-view">
        {allDayEvs.length > 0 && (
          <div className="cal-day-allday">
            <span className="allday-label">Todo el día</span>
            {allDayEvs.map(e => (
              <div key={e.id} className={`cal-event-pill${e.completada ? ' completada' : ''}`}
                style={{ background: e.color || '#0047b3' }}
                onClick={() => setShowDetalle(e)}>{e.titulo}</div>
            ))}
          </div>
        )}
        <div className="cal-day-body">
          {hours.map(h => {
            const evs = evsDia.filter(e => {
              if (e.todo_el_dia) return false
              return new Date(e.fecha_inicio).getHours() === h
            })
            return (
              <div key={h} className="cal-day-row" onClick={() => abrirCrearConHora(selectedDate, h)}>
                <div className="cal-time-gutter">{formatHour(h)}</div>
                <div className="cal-day-cell">
                  {evs.map(e => (
                    <div key={e.id} className={`cal-week-event${e.completada ? ' completada' : ''}`}
                      style={{ background: e.color || '#0047b3' }}
                      onClick={ev => { ev.stopPropagation(); setShowDetalle(e) }}>
                      <span className="week-ev-time">{toLocalTimeStr(new Date(e.fecha_inicio))} - {toLocalTimeStr(new Date(e.fecha_fin))}</span>
                      <span className="week-ev-title">{e.titulo}</span>
                      {e.descripcion && <span className="week-ev-desc">{e.descripcion}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Topbar ────────────────────────────────────────────────
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
            {isAdmin() && <Link to="/usuarios" className="nav-link"><i className="fas fa-users"></i> Usuarios</Link>}
            <Link to="/tickets" className="nav-link"><i className="fas fa-headset"></i> Tickets</Link>
            {(isAdmin() || isGestor()) && <Link to="/estadisticas" className="nav-link"><i className="fas fa-chart-bar"></i> Estadísticas</Link>}
            <Link to="/calendario" className="nav-link active"><i className="fas fa-calendar-alt"></i> Calendario</Link>
            <ChatNavLink mode="top" />
          </nav>
          <div className="user-area">
            <div className="user-info">
              <div className="user-avatar" style={{ background: getAvatarColor(user?.id) }}>{getInitials(user?.nombre || user?.email)}</div>
              <span>{user?.nombre || user?.email}</span>
            </div>
            <Link to="/documentacion" className="btn-help" title="Documentación técnica"><i className="fas fa-question-circle"></i></Link>
            <ThemeToggle />
            <button className="btn-logout" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i><span>Salir</span>
            </button>
          </div>
        </header>
        <nav className="bottom-nav">
          <Link to="/" className="bottom-nav-item"><i className="fas fa-building"></i><span>Empresas</span></Link>
          {isAdmin() && <Link to="/usuarios" className="bottom-nav-item"><i className="fas fa-users"></i><span>Usuarios</span></Link>}
          <Link to="/tickets" className="bottom-nav-item"><i className="fas fa-headset"></i><span>Tickets</span></Link>
          {(isAdmin() || isGestor()) && <Link to="/estadisticas" className="bottom-nav-item"><i className="fas fa-chart-bar"></i><span>Stats</span></Link>}
          <Link to="/calendario" className="bottom-nav-item active"><i className="fas fa-calendar-alt"></i><span>Calendario</span></Link>
          <ChatNavLink mode="bottom" />
        </nav>
      </>
    )
  }

  // ── Título de navegación ──────────────────────────────────
  function navTitle() {
    if (vista === 'mes') return `${MESES[month]} ${year}`
    if (vista === 'semana') {
      const wk = getWeekDays()
      const s = wk[0], e = wk[6]
      if (s.getMonth() === e.getMonth()) return `${s.getDate()} – ${e.getDate()} ${MESES[s.getMonth()]} ${s.getFullYear()}`
      return `${s.getDate()} ${MESES[s.getMonth()].substring(0, 3)} – ${e.getDate()} ${MESES[e.getMonth()].substring(0, 3)} ${e.getFullYear()}`
    }
    return `${selectedDate.getDate()} de ${MESES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
  }

  function handlePrev() {
    if (vista === 'mes') prevMonth()
    else if (vista === 'semana') prevWeek()
    else prevDay()
  }
  function handleNext() {
    if (vista === 'mes') nextMonth()
    else if (vista === 'semana') nextWeek()
    else nextDay()
  }

  return (
    <div className="calendario-page">
      <Topbar />

      <main className="calendario-main">
        {/* Toolbar */}
        <div className="cal-toolbar">
          <div className="cal-toolbar-left">
            <button className="btn-cal-today" onClick={goToday}>Hoy</button>
            <button className="btn-cal-nav" onClick={handlePrev}><i className="fas fa-chevron-left"></i></button>
            <button className="btn-cal-nav" onClick={handleNext}><i className="fas fa-chevron-right"></i></button>
            <h2 className="cal-title">{navTitle()}</h2>
          </div>
          <div className="cal-toolbar-right">
            <div className="cal-view-tabs">
              <button className={vista === 'mes' ? 'active' : ''} onClick={() => setVista('mes')}>Mes</button>
              <button className={vista === 'semana' ? 'active' : ''} onClick={() => setVista('semana')}>Semana</button>
              <button className={vista === 'dia' ? 'active' : ''} onClick={() => setVista('dia')}>Día</button>
            </div>
            <button className="btn-cal-crear" onClick={() => abrirCrear(selectedDate)}>
              <i className="fas fa-plus"></i> Nuevo evento
            </button>
          </div>
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="cal-loading"><i className="fas fa-spinner fa-spin"></i> Cargando calendario...</div>
        ) : (
          <>
            {vista === 'mes' && renderMes()}
            {vista === 'semana' && renderSemana()}
            {vista === 'dia' && renderDia()}
          </>
        )}
      </main>

      {/* ── Modal crear/editar ──────────────────────────────── */}
      {showModal && (
        <div className="modal" style={{ display: 'flex' }} onClick={() => setShowModal(false)}>
          <div className="modal-content cal-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-calendar-plus"></i> {editEvento ? 'Editar evento' : 'Nuevo evento'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body">
              {error && <div className="cal-error"><i className="fas fa-exclamation-triangle"></i> {error}</div>}

              <div className="form-group">
                <label>Título *</label>
                <input type="text" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Nombre del evento" autoFocus />
              </div>

              <div className="form-group">
                <label>Tipo</label>
                <div className="cal-tipo-tabs">
                  {['evento', 'tarea', 'nota'].map(t => (
                    <button key={t} className={form.tipo === t ? 'active' : ''}
                      onClick={() => setForm(f => ({ ...f, tipo: t }))}>
                      <i className={`fas ${t === 'evento' ? 'fa-calendar' : t === 'tarea' ? 'fa-tasks' : 'fa-sticky-note'}`}></i>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <label className="form-check">
                  <input type="checkbox" checked={form.todo_el_dia}
                    onChange={e => setForm(f => ({ ...f, todo_el_dia: e.target.checked }))} />
                  Todo el día
                </label>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Fecha inicio *</label>
                  <input type="date" value={form.fecha_inicio_date}
                    onChange={e => setForm(f => ({ ...f, fecha_inicio_date: e.target.value, fecha_fin_date: f.fecha_fin_date || e.target.value }))} />
                </div>
                {!form.todo_el_dia && (
                  <div className="form-group">
                    <label>Hora inicio</label>
                    <input type="time" value={form.fecha_inicio_time}
                      onChange={e => setForm(f => ({ ...f, fecha_inicio_time: e.target.value }))} />
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Fecha fin</label>
                  <input type="date" value={form.fecha_fin_date}
                    onChange={e => setForm(f => ({ ...f, fecha_fin_date: e.target.value }))} />
                </div>
                {!form.todo_el_dia && (
                  <div className="form-group">
                    <label>Hora fin</label>
                    <input type="time" value={form.fecha_fin_time}
                      onChange={e => setForm(f => ({ ...f, fecha_fin_time: e.target.value }))} />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea rows={3} value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Detalles del evento..." />
              </div>

              {/* ── Empresa ─────────────────────────── */}
              <div className="form-group">
                <label><i className="fas fa-building" style={{ marginRight: 5, color: '#64748b' }}></i>Empresa relacionada</label>
                <SearchableSelect
                  value={form.empresa_id}
                  onChange={val => setForm(f => ({ ...f, empresa_id: val, ticket_ids: [], dispositivo_ids: [] }))}
                  placeholder="— Sin empresa —"
                  options={[
                    { value: '', label: '— Sin empresa —' },
                    ...empresas.map(e => ({ value: e.id, label: e.nombre })),
                  ]}
                />
              </div>

              {/* ── Tickets de la empresa ───────────── */}
              {form.empresa_id && (
                <div className="form-group">
                  <label><i className="fas fa-headset" style={{ marginRight: 5, color: '#64748b' }}></i>Tickets relacionados</label>
                  {loadingModalData ? (
                    <div className="cal-modal-loading"><i className="fas fa-spinner fa-spin"></i> Cargando...</div>
                  ) : modalTickets.filter(t => t.estado !== 'Completado').length === 0 ? (
                    <p className="cal-empty-hint">Sin tickets abiertos para esta empresa.</p>
                  ) : (
                    <div className="cal-ticket-list">
                      {modalTickets.filter(t => t.estado !== 'Completado').map(t => {
                        const sel = form.ticket_ids.includes(t.id)
                        return (
                          <div key={t.id} className={`cal-ticket-item${sel ? ' selected' : ''}`}
                            onClick={() => setForm(f => ({
                              ...f,
                              ticket_ids: sel ? f.ticket_ids.filter(id => id !== t.id) : [...f.ticket_ids, t.id],
                            }))}>
                            <span className="cal-ticket-num">#{t.numero}</span>
                            <span className="cal-ticket-asunto">{t.asunto}</span>
                            <span className={`cal-ticket-estado est-${(t.estado || '').toLowerCase().replace(/\s+/g, '-')}`}>{t.estado}</span>
                            <span className="cal-tick-check"><i className="fas fa-check"></i></span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Equipos / Servidores de la empresa ── */}
              {form.empresa_id && (
                <div className="form-group">
                  <label><i className="fas fa-desktop" style={{ marginRight: 5, color: '#64748b' }}></i>Equipos / Servidores</label>
                  {loadingModalData ? (
                    <div className="cal-modal-loading"><i className="fas fa-spinner fa-spin"></i> Cargando...</div>
                  ) : modalDispositivos.length === 0 ? (
                    <p className="cal-empty-hint">Sin equipos registrados para esta empresa.</p>
                  ) : (
                    <div className="cal-disp-list">
                      {modalDispositivos.map(d => {
                        const sel = form.dispositivo_ids.includes(d.id)
                        const iconMap = { equipo: 'fa-desktop', servidor: 'fa-server', nas: 'fa-hdd', red: 'fa-network-wired', correo: 'fa-envelope', web: 'fa-globe', otro: 'fa-box' }
                        const icon = iconMap[d.categoria] || 'fa-box'
                        return (
                          <div key={d.id} className={`cal-disp-item${sel ? ' selected' : ''}`}
                            onClick={() => setForm(f => ({
                              ...f,
                              dispositivo_ids: sel ? f.dispositivo_ids.filter(id => id !== d.id) : [...f.dispositivo_ids, d.id],
                            }))}>
                            <i className={`fas ${icon} cal-disp-icon`}></i>
                            <div className="cal-disp-info">
                              <span className="cal-disp-nombre">{d.nombre}</span>
                              {d.ip && <span className="cal-disp-ip">{d.ip}</span>}
                            </div>
                            <span className="cal-disp-check"><i className="fas fa-check"></i></span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Color</label>
                <div className="cal-color-picker">
                  {COLORES.map(c => (
                    <button key={c} className={`cal-color-btn${form.color === c ? ' selected' : ''}`}
                      style={{ background: c }} onClick={() => setForm(f => ({ ...f, color: c }))} />
                  ))}
                </div>
              </div>

              {canAssign && operarios.length > 0 && (
                <div className="form-group">
                  <label>Asignar a operarios</label>
                  <OperariosSelector
                    operarios={operarios}
                    selected={form.asignados}
                    onChange={ids => setForm(f => ({ ...f, asignados: ids }))}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Avisos / Recordatorios</label>
                <div className="cal-avisos-list">
                  {AVISO_OPCIONES.map(a => (
                    <button key={a.value} type="button"
                      className={`cal-aviso-chip${form.avisos.includes(a.value) ? ' active' : ''}`}
                      onClick={() => toggleAviso(a.value)}>
                      <i className={`fas ${form.avisos.includes(a.value) ? 'fa-bell' : 'fa-bell-slash'}`}></i>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? <><i className="fas fa-spinner fa-spin"></i> Guardando...</> : <><i className="fas fa-check"></i> {editEvento ? 'Guardar cambios' : 'Crear evento'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal detalle ───────────────────────────────────── */}
      {showDetalle && (
        <div className="modal" style={{ display: 'flex' }} onClick={() => setShowDetalle(null)}>
          <div className="modal-content cal-modal cal-detalle" onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderLeftColor: showDetalle.color || '#0047b3' }}>
              <h2>
                <span className="cal-detalle-color" style={{ background: showDetalle.color || '#0047b3' }}></span>
                {showDetalle.titulo}
              </h2>
              <button className="modal-close" onClick={() => setShowDetalle(null)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body">
              <div className="cal-detalle-meta">
                <span className={`cal-tipo-badge ${showDetalle.tipo}`}>
                  <i className={`fas ${showDetalle.tipo === 'tarea' ? 'fa-tasks' : showDetalle.tipo === 'nota' ? 'fa-sticky-note' : 'fa-calendar'}`}></i>
                  {showDetalle.tipo.charAt(0).toUpperCase() + showDetalle.tipo.slice(1)}
                </span>
                {showDetalle.completada && <span className="cal-badge-completada"><i className="fas fa-check-circle"></i> Completada</span>}
              </div>

              <div className="cal-detalle-info">
                <div className="cal-detalle-row">
                  <i className="fas fa-clock"></i>
                  <span>
                    {showDetalle.todo_el_dia ? 'Todo el día — ' : ''}
                    {new Date(showDetalle.fecha_inicio).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    {!showDetalle.todo_el_dia && ` ${toLocalTimeStr(new Date(showDetalle.fecha_inicio))} – ${toLocalTimeStr(new Date(showDetalle.fecha_fin))}`}
                  </span>
                </div>
                {showDetalle.empresa && (
                  <div className="cal-detalle-row">
                    <i className="fas fa-building"></i>
                    <span>{showDetalle.empresa.nombre}</span>
                  </div>
                )}
                {showDetalle.creador?.nombre && (
                  <div className="cal-detalle-row">
                    <i className="fas fa-user"></i>
                    <span>Creado por: {showDetalle.creador.nombre}</span>
                  </div>
                )}
                {showDetalle.asignados?.length > 0 && (
                  <div className="cal-detalle-row">
                    <i className="fas fa-users"></i>
                    <span>
                      Asignado a:{' '}
                      <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {showDetalle.asignados.map(a => (
                          <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 22, height: 22, borderRadius: '50%', background: getAvatarColor(a.id), color: '#fff', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              {getInitials(a.nombre)}
                            </span>
                            {a.nombre}
                          </span>
                        ))}
                      </span>
                    </span>
                  </div>
                )}
                {showDetalle.calendario_avisos?.length > 0 && (
                  <div className="cal-detalle-row">
                    <i className="fas fa-bell"></i>
                    <span>Avisos: {showDetalle.calendario_avisos.map(a => {
                      const opt = AVISO_OPCIONES.find(o => o.value === a.minutos_antes)
                      return opt?.label || `${a.minutos_antes} min antes`
                    }).join(', ')}</span>
                  </div>
                )}
              </div>

              {showDetalle.tickets_vinculados?.length > 0 && (
                <div className="cal-detalle-vinculados">
                  <div className="cal-vinc-title"><i className="fas fa-headset"></i> Tickets</div>
                  {showDetalle.tickets_vinculados.map(t => {
                    const iconMap = { 'Pendiente': 'fa-clock', 'En curso': 'fa-spinner', 'Completado': 'fa-check-circle' }
                    return (
                      <div key={t.id} className="cal-vinc-item">
                        <span className="cal-ticket-num">#{t.numero}</span>
                        <span className="cal-vinc-label">{t.asunto}</span>
                        <span className={`cal-ticket-estado est-${(t.estado || '').toLowerCase().replace(/\s+/g, '-')}`}>{t.estado}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {showDetalle.dispositivos_vinculados?.length > 0 && (
                <div className="cal-detalle-vinculados">
                  <div className="cal-vinc-title"><i className="fas fa-desktop"></i> Equipos</div>
                  {showDetalle.dispositivos_vinculados.map(d => {
                    const iconMap = { equipo: 'fa-desktop', servidor: 'fa-server', nas: 'fa-hdd', red: 'fa-network-wired', correo: 'fa-envelope', web: 'fa-globe', otro: 'fa-box' }
                    const icon = iconMap[d.categoria] || 'fa-box'
                    return (
                      <div key={d.id} className="cal-vinc-item">
                        <i className={`fas ${icon}`} style={{ color: '#64748b', width: 14 }}></i>
                        <span className="cal-vinc-label">{d.nombre}</span>
                        {d.ip && <span className="cal-disp-ip">{d.ip}</span>}
                      </div>
                    )
                  })}
                </div>
              )}

              {showDetalle.descripcion && (
                <div className="cal-detalle-desc">
                  <p>{showDetalle.descripcion}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {showDetalle.tipo === 'tarea' && (
                <button className={`btn-completar${showDetalle.completada ? ' undo' : ''}`} onClick={() => toggleCompletada(showDetalle)}>
                  <i className={`fas ${showDetalle.completada ? 'fa-undo' : 'fa-check'}`}></i>
                  {showDetalle.completada ? 'Desmarcar' : 'Completar'}
                </button>
              )}
              <button className="btn-edit" onClick={() => abrirEditar(showDetalle)}>
                <i className="fas fa-edit"></i> Editar
              </button>
              {(showDetalle.creado_por === user.id || isAdmin() || isGestor()) && (
                <button className="btn-delete" onClick={() => handleDelete(showDetalle.id)}>
                  <i className="fas fa-trash"></i> Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
