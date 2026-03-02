import { Link, useLocation } from 'react-router-dom'
import { useChatNotifications } from '../context/ChatNotificationsContext'

/**
 * ChatNavLink — shows unread badge on the Chat nav item.
 * mode="top"    → renders as top-nav link  (default)
 * mode="bottom" → renders as bottom-nav item
 */
export default function ChatNavLink({ mode = 'top', isActive = false }) {
  const { totalUnread } = useChatNotifications()
  const location = useLocation()

  const onChatPage = location.pathname === '/chat'
  const count = Math.min(totalUnread, 99)
  const showBadge = !onChatPage && totalUnread > 0

  if (mode === 'bottom') {
    return (
      <Link to="/chat" className={`bottom-nav-item${onChatPage || isActive ? ' active' : ''}`} style={{ position: 'relative' }}>
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <i className="fas fa-comments"></i>
          {showBadge && <span className="chat-nav-badge chat-nav-badge-bottom">{count > 9 ? '9+' : count}</span>}
        </span>
        <span>Chat</span>
      </Link>
    )
  }

  return (
    <Link to="/chat" className={`nav-link chat-nav-link-wrapper${isActive ? ' active' : ''}`}>
      <i className="fas fa-comments"></i> Chat
      {showBadge && (
        <span className="chat-nav-badge">{count > 9 ? '9+' : count}</span>
      )}
    </Link>
  )
}