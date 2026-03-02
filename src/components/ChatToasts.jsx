// components/ChatToasts.jsx
// Renderiza los toasts de notificaciones in-app a nivel global (fuera de Chat.jsx)
// para que funcionen en cualquier página de la app.

import { useNavigate } from 'react-router-dom'
import { useChatNotifications } from '../context/ChatNotificationsContext'

export default function ChatToasts() {
  const { inAppNotifs, dismissInAppNotif } = useChatNotifications()
  const navigate = useNavigate()

  if (!inAppNotifs.length) return null

  return (
    <div className="in-app-notif-container">
      {inAppNotifs.map(notif => (
        <div
          key={notif.id}
          className="in-app-notif"
          onClick={() => {
            dismissInAppNotif(notif.id)
            navigate('/chat', { state: { canalId: notif.canalId } })
          }}
        >
          <div className="in-app-notif-icon">
            <i className="fas fa-comment-alt"></i>
          </div>
          <div className="in-app-notif-content">
            <div className="in-app-notif-title">{notif.title}</div>
            <div className="in-app-notif-body">{notif.body}</div>
          </div>
          <button
            className="in-app-notif-close"
            onClick={e => { e.stopPropagation(); dismissInAppNotif(notif.id) }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      ))}
    </div>
  )
}