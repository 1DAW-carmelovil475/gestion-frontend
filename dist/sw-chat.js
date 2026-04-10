/* sw-chat.js — copiar a /public/sw-chat.js */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// Fallback: la pagina ahora llama reg.showNotification() directamente
// Este handler es para compatibilidad
self.addEventListener('message', event => {
  const data = event.data || {}
  if (data.type !== 'SHOW_NOTIFICATION') return
  const { title, body, tag } = data
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/img/logoHola.png',
      badge: '/img/logoHola.png',
      tag,
      renotify: true,
      data: { url: '/chat' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/chat'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clients) {
        var chatTab = clients.find(function(c) { return c.url.includes('/chat') })
        if (chatTab) return chatTab.focus()
        return self.clients.openWindow(targetUrl)
      })
  )
})