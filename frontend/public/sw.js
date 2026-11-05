// Service worker for Web Push reminders (registered by src/utils/push.js).
self.addEventListener('push', (event) => {
  let data = { title: 'Task reminder', body: '' }
  try {
    data = { ...data, ...event.data.json() }
  } catch {
    // non-JSON payload: keep defaults
  }
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, tag: data.task_id }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) return clients[0].focus()
      return self.clients.openWindow('/')
    }),
  )
})
