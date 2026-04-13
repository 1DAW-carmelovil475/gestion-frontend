import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ChatNotificationsProvider } from './context/ChatNotificationsContext'
import ChatToasts from './components/ChatToasts'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Usuarios from './pages/Usuarios'
import Tickets from './pages/Tickets'
import Estadisticas from './pages/Estadisticas'
import Chat from './pages/Chat'
import Calendario from './pages/Calendario'
import ClienteIncidencias from './pages/ClienteIncidencias'
import Documentacion from './pages/Documentacion'
import './App.css'
import './dark.css'

function ProtectedRoute({ children, adminOnly = false, clienteOnly = false }) {
  const { user, loading, isAdmin, isCliente, isGestor } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="loading-screen">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Cargando...</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // Clientes solo pueden acceder a /incidencias
  if (isCliente() && !clienteOnly) return <Navigate to="/incidencias" replace />

  // No-clientes no pueden acceder a rutas exclusivas de cliente
  if (!isCliente() && clienteOnly) return <Navigate to="/tickets" replace />

  if (adminOnly && !isAdmin() && !isGestor()) return <Navigate to="/tickets" replace />

  return children
}

function AppRoutes() {
  return (
    <ChatNotificationsProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Ruta exclusiva para clientes */}
        <Route
          path="/incidencias"
          element={
            <ProtectedRoute clienteOnly>
              <ClienteIncidencias />
            </ProtectedRoute>
          }
        />

        {/* Rutas para trabajadores, gestores y admins */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute adminOnly>
              <Usuarios />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <ProtectedRoute>
              <Tickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estadisticas"
          element={
            <ProtectedRoute adminOnly>
              <Estadisticas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendario"
          element={
            <ProtectedRoute>
              <Calendario />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documentacion"
          element={
            <ProtectedRoute>
              <Documentacion />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Toasts globales — visibles en todas las páginas */}
      <ChatToasts />
    </ChatNotificationsProvider>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
