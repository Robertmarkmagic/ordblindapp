/* OverSkill Web Push Service Worker.
 *
 * Companion to the SDK's `overskill.push.subscribe()`. Receives `push`
 * events from the platform's push relay and shows a system notification.
 *
 * Lives at /sw-push.js so it has root scope (can show notifications
 * for any URL on the app's origin). Vite's PWA plugin generates ITS OWN
 * service worker for offline asset caching — that one lives at /sw.js
 * by default. We don't want to merge the two: precaching has very
 * different lifecycle semantics from push, and Workbox's auto-update
 * model would clobber our push handlers on every deploy.
 *
 * If your generated app needs both PWA precaching AND push, both SWs
 * coexist fine — each owns its own scope. Browsers allow multiple
 * service workers per origin.
 */

self.addEventListener('install', () => {
  // Activate immediately on first install so the user gets push reception
  // without needing to refresh after subscribe.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (err) {
    payload = { title: 'Notification', body: event.data.text() };
  }

  const title = payload.title || 'Notification';
  const options = {
    body: payload.body,
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || payload.icon || '/icon-192.png',
    data: {
      url: payload.url || '/',
      ...(payload.data || {})
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  // Focus an existing window with the same URL if possible; otherwise
  // open a new one. Standard "click to deep-link" UX.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.endsWith(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
