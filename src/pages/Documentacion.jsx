import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import ChatNavLink from '../components/ChatNavLink'
import ThemeToggle from '../components/ThemeToggle'
import './Documentacion.css'

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

// Heading tree is loaded dynamically from iframe

export default function Documentacion() {
  const { user, logout, isAdmin, isGestor } = useAuth()
  const { dark } = useTheme()
  const navigate = useNavigate()
  const iframeRef = useRef(null)
  const searchRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchCount, setSearchCount] = useState(0)
  const [searchCurrent, setSearchCurrent] = useState(0)
  const [searchActive, setSearchActive] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768)
  const [activeSection, setActiveSection] = useState('')
  const [headingTree, setHeadingTree] = useState([])
  const [expandedSections, setExpandedSections] = useState({})
  const debounceRef = useRef(null)

  // Sync theme to iframe
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const send = () => {
      try {
        iframe.contentDocument.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
      } catch (_) { /* cross-origin fallback */ }
      iframe.contentWindow.postMessage({ type: 'theme-change', theme: dark ? 'dark' : 'light' }, '*')
    }
    iframe.addEventListener('load', send)
    send()
    return () => iframe.removeEventListener('load', send)
  }, [dark])

  // Load heading tree and scroll spy
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    let handler = null
    function setup() {
      try {
        const win = iframe.contentWindow
        const doc = iframe.contentDocument || win.document
        // Load heading tree
        if (win.getHeadingTree) {
          const tree = win.getHeadingTree()
          setHeadingTree(tree)
          // Auto-expand all h1 sections
          const expanded = {}
          tree.forEach(h1 => { expanded[h1.id] = true })
          setExpandedSections(expanded)
        }
        // Scroll spy tracking h1, h2, h3
        handler = function() {
          const allHeadings = doc.querySelectorAll('h1[id^="sec"], h2[id], h3[id]')
          let current = ''
          allHeadings.forEach(function(h) {
            const rect = h.getBoundingClientRect()
            if (rect.top <= 120) current = h.id
          })
          if (current) setActiveSection(current)
        }
        doc.addEventListener('scroll', handler, true)
        const scrollEl = doc.scrollingElement || doc.documentElement
        scrollEl.addEventListener('scroll', handler)
        handler()
      } catch (_) {}
    }
    iframe.addEventListener('load', setup)
    setup()
    return () => {
      iframe.removeEventListener('load', setup)
      if (handler) {
        try {
          const doc = iframe.contentDocument
          doc.removeEventListener('scroll', handler, true)
          const scrollEl = doc.scrollingElement || doc.documentElement
          scrollEl.removeEventListener('scroll', handler)
        } catch (_) {}
      }
    }
  }, [])

  // Ctrl+F shortcut
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
      if (e.key === 'Escape' && searchActive) clearSearch()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchActive])

  function handleLogout() {
    if (confirm('¿Cerrar sesión?')) { logout(); navigate('/login') }
  }

  const callIframe = useCallback((method, ...args) => {
    try {
      const win = iframeRef.current?.contentWindow
      if (win && win[method]) return win[method](...args)
    } catch (_) {}
    return undefined
  }, [])

  function readCount() {
    try {
      const win = iframeRef.current?.contentWindow
      const marks = win?.document?.querySelectorAll('.search-highlight, .search-highlight-active')
      const count = marks?.length || 0
      setSearchCount(count)
      setSearchCurrent(count > 0 ? 1 : 0)
    } catch (_) {
      setSearchCount(0)
      setSearchCurrent(0)
    }
  }

  function doSearch(term) {
    callIframe('doSearch', term)
    readCount()
  }

  function handleSearch(e) {
    const term = e.target.value
    setSearchTerm(term)
    setSearchActive(term.length > 0)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(term.trim()), 250)
  }

  function goNext() {
    callIframe('searchNext')
    setSearchCurrent(prev => prev < searchCount ? prev + 1 : 1)
  }

  function goPrev() {
    callIframe('searchPrev')
    setSearchCurrent(prev => prev > 1 ? prev - 1 : searchCount)
  }

  function clearSearch() {
    setSearchTerm('')
    setSearchActive(false)
    setSearchCount(0)
    setSearchCurrent(0)
    callIframe('doSearch', '')
    searchRef.current?.blur()
  }

  function handleSearchKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.shiftKey ? goPrev() : goNext()
    }
    if (e.key === 'Escape') clearSearch()
  }

  function scrollToSection(sectionId) {
    try {
      const doc = iframeRef.current?.contentDocument
      const el = doc?.getElementById(sectionId)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (_) {}
    setActiveSection(sectionId)
    // Close sidebar on mobile after clicking
    if (window.innerWidth <= 768) setSidebarOpen(false)
  }

  function toggleExpand(sectionId) {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  // Check if a heading or any of its children is active
  function isChildActive(node) {
    if (activeSection === node.id) return true
    if (node.children) return node.children.some(c => isChildActive(c))
    return false
  }

  return (
    <div className="documentacion-page">

      {/* ── Topbar ─────────────────────────────────── */}
      <header className="topbar">
        <div className="logo">
          <img src="/img/logoHola.png" alt="Logo" />
          <span className="logo-text">Hola Informática</span>
        </div>
        <nav className="top-nav">
          <Link to="/" className="nav-link"><i className="fas fa-building"></i> Empresas</Link>
          {isAdmin() && (
            <Link to="/usuarios" className="nav-link"><i className="fas fa-users-cog"></i> Usuarios</Link>
          )}
          <Link to="/tickets" className="nav-link"><i className="fas fa-headset"></i> Tickets</Link>
          {(isAdmin() || isGestor()) && <Link to="/estadisticas" className="nav-link"><i className="fas fa-chart-bar"></i> Estadísticas</Link>}
          <Link to="/calendario" className="nav-link"><i className="fas fa-calendar-alt"></i> Calendario</Link>
          <ChatNavLink mode="top" />
        </nav>
        <div className="user-area">
          <div className="user-info">
            <div className="user-avatar" style={{ background: getAvatarColor(user?.id) }}>
              {getInitials(user?.nombre || user?.email)}
            </div>
            <span>{user?.nombre || user?.email}</span>
          </div>
          <ThemeToggle />
          <button className="btn-logout" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i><span>Salir</span>
          </button>
        </div>
      </header>

      {/* ── Bottom nav (móvil) ─────────────────────── */}
      <nav className="bottom-nav">
        <Link to="/" className="bottom-nav-item"><i className="fas fa-building"></i><span>Empresas</span></Link>
        {isAdmin() && <Link to="/usuarios" className="bottom-nav-item"><i className="fas fa-users-cog"></i><span>Usuarios</span></Link>}
        <Link to="/tickets" className="bottom-nav-item"><i className="fas fa-headset"></i><span>Tickets</span></Link>
        {(isAdmin() || isGestor()) && <Link to="/estadisticas" className="bottom-nav-item"><i className="fas fa-chart-bar"></i><span>Stats</span></Link>}
        <Link to="/calendario" className="bottom-nav-item"><i className="fas fa-calendar-alt"></i><span>Calendario</span></Link>
        <ChatNavLink mode="bottom" />
      </nav>

      {/* ── Search toolbar ────────────────────────── */}
      <div className="doc-search-bar">
        {/* Toggle sidebar */}
        <button
          className={`doc-sidebar-toggle ${sidebarOpen ? 'active' : ''}`}
          onClick={() => setSidebarOpen(o => !o)}
          title="Índice de secciones"
        >
          <i className="fas fa-list-ul"></i>
        </button>

        {/* Download PDF */}
        <button
          className="doc-download-btn"
          title="Descargar como PDF"
          onClick={() => {
            try {
              iframeRef.current?.contentWindow?.print()
            } catch (_) {
              window.open('/documentacion.html', '_blank')
            }
          }}
        >
          <i className="fas fa-file-pdf"></i>
          <span>PDF</span>
        </button>

        {/* Search input group */}
        <div className="doc-search-wrapper">
          <i className="fas fa-search doc-search-icon"></i>
          <input
            ref={searchRef}
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            onKeyDown={handleSearchKey}
            placeholder="Buscar en la documentación... (Ctrl+F)"
            className="doc-search-input"
          />
          {searchActive && (
            <>
              <span className="doc-search-count">
                {searchCount > 0 ? `${searchCurrent} / ${searchCount}` : 'Sin resultados'}
              </span>
              <div className="doc-search-divider"></div>
              <div className="doc-search-nav">
                <button onClick={goPrev} title="Anterior (Shift+Enter)" disabled={searchCount === 0}>
                  <i className="fas fa-chevron-up"></i>
                </button>
                <button onClick={goNext} title="Siguiente (Enter)" disabled={searchCount === 0}>
                  <i className="fas fa-chevron-down"></i>
                </button>
              </div>
              <button className="doc-search-clear" onClick={clearSearch} title="Limpiar (Esc)">
                <i className="fas fa-times"></i>
              </button>
            </>
          )}
        </div>

      </div>

      {/* ── Content area ──────────────────────────── */}
      <div className="doc-content-area">

        {/* ── Sidebar / Índice ──────────────────────── */}
        <aside className={`doc-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="doc-sidebar-header">
            <i className="fas fa-book"></i>
            <span>Índice</span>
          </div>
          <ul className="doc-sidebar-list">
            {headingTree.map(h1 => (
              <li key={h1.id} className={`doc-tree-h1 ${isChildActive(h1) ? 'active' : ''}`}>
                <div className="doc-tree-row">
                  {h1.children.length > 0 && (
                    <button className="doc-tree-toggle" onClick={() => toggleExpand(h1.id)}>
                      <i className={`fas fa-chevron-${expandedSections[h1.id] ? 'down' : 'right'}`}></i>
                    </button>
                  )}
                  <button className={`doc-tree-label ${activeSection === h1.id ? 'current' : ''}`} onClick={() => scrollToSection(h1.id)}>
                    {h1.text}
                  </button>
                </div>
                {expandedSections[h1.id] && h1.children.length > 0 && (
                  <ul className="doc-tree-children">
                    {h1.children.map(h2 => (
                      <li key={h2.id} className="doc-tree-h2">
                        <div className="doc-tree-row">
                          {h2.children && h2.children.length > 0 && (
                            <button className="doc-tree-toggle" onClick={() => toggleExpand(h2.id)}>
                              <i className={`fas fa-chevron-${expandedSections[h2.id] ? 'down' : 'right'}`}></i>
                            </button>
                          )}
                          <button className={`doc-tree-label ${activeSection === h2.id ? 'current' : ''}`} onClick={() => scrollToSection(h2.id)}>
                            {h2.text}
                          </button>
                        </div>
                        {expandedSections[h2.id] && h2.children && h2.children.length > 0 && (
                          <ul className="doc-tree-children">
                            {h2.children.map(h3 => (
                              <li key={h3.id} className="doc-tree-h3">
                                <button className={`doc-tree-label ${activeSection === h3.id ? 'current' : ''}`} onClick={() => scrollToSection(h3.id)}>
                                  {h3.text}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </aside>

        {/* ── Backdrop (mobile) ──────────────────────── */}
        {sidebarOpen && <div className="doc-sidebar-backdrop" onClick={() => setSidebarOpen(false)}></div>}

        {/* ── Iframe ─────────────────────────────────── */}
        <iframe
          ref={iframeRef}
          src="/documentacion.html"
          title="Documentación Técnica"
          className="doc-iframe"
        />
      </div>
    </div>
  )
}
