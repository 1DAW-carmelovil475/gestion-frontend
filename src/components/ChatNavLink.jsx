/**
 * ChatNavLink - VERSIÓN AGRESIVA Y PERSISTENTE
 * 
 * Garantiza que el badge desaparezca Y SE MANTENGA DESAPARECIDO
 * mientras estés en la página de Chat
 */
import { Link } from 'react-router-dom'
import { useChatNotifications } from '../context/ChatNotificationsContext'
import { useLocation } from 'react-router-dom'

export default function ChatNavLink({ isActive = false, className = 'nav-link' }) {
  const { totalUnread, activeCanalId } = useChatNotifications()
  const location = useLocation()
  
  // ============================================================
  // 🔥 LÓGICA DEFINITIVA:
  // Si estamos en la ruta /chat, NO mostrar badge NUNCA
  // No importa si activeCanalId está o no
  // ============================================================
  const estamosEnChat = location.pathname === '/chat'
  const shouldShowBadge = !estamosEnChat && totalUnread > 0
  
  const count = Math.min(totalUnread, 9)

  return (
    <Link to="/chat" className={`${className} ${isActive ? 'active' : ''} chat-nav-link-wrapper`}>
      <i className="fas fa-comments"></i> Chat
      {shouldShowBadge && (
        <span className="chat-nav-badge">
          {count}{totalUnread > 9 ? '+' : ''}
        </span>
      )}
    </Link>
  )
}