import { api } from '../api/client.js'

// Converts the base64url VAPID public key to the Uint8Array PushManager expects.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// Registers the service worker, asks for notification permission, subscribes
// this browser and stores the subscription on the server. Throws a
// user-readable Error on failure.
export async function enablePush(vapidPublicKey) {
  if (!pushSupported()) throw new Error('This browser does not support push notifications.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')
  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }))
  await api.subscribePush(subscription.toJSON())
}

export async function isPushEnabledHere() {
  if (!pushSupported()) return false
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  return Boolean(registration && (await registration.pushManager.getSubscription()))
}
