import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email.trim(), password)
      navigate('/')
    } catch (err) {
      setError(err.message)
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="grid-pattern"></div>
      
      <div className="login-container">
        <div className="logo-section">
          <div className="logo">
            <img src="/img/logoHola.png" alt="Hola Informática" className="logo-img" />
          </div>
          <p className="subtitle">Panel de Gestión · Acceso</p>
        </div>

        <div className={`error-message ${error ? 'show' : ''}`}>
          <i className="fas fa-exclamation-circle"></i>
          <span>{error || 'Email o contraseña incorrectos.'}</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">
              <i className="fas fa-envelope"></i> Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autocomplete="email"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">
              <i className="fas fa-lock"></i> Contraseña
            </label>
            <div className="input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autocomplete="current-password"
                required
              />
              <button
                type="button"
                className="toggle-pwd"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>
          
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Verificando...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i> Entrar
              </>
            )}
          </button>
        </form>

        <p className="footer-text">Hola Informática &copy; 2026</p>
      </div>
    </div>
  )
}
