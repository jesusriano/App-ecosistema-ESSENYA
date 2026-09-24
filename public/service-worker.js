// ESSENYA Advanced Service Worker with Web Push, Vibrate, and Audio Sound Support

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'ESSENYA — Notificación',
    body: 'Tienes una nueva actualización en tu ecosistema.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    url: '/',
    tag: 'essenya-notification',
    soundPreset: 'classic',
    data: { type: 'general' }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      console.warn('[ServiceWorker] Could not parse push payload as JSON:', e);
      data.body = event.data.text() || data.body;
    }
  }

  // Map sound preset to sound file if needed or vibrate pattern
  const vibrateMap: Record<string, number[]> = {
    classic: [200, 100, 200],
    bell: [300, 150, 300, 150],
    alert: [100, 50, 100, 50, 100],
    soft: [150, 200, 150],
    urgent: [400, 200, 400, 200, 400]
  };

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    tag: data.tag || 'essenya-notification',
    data: {
      url: data.url || '/',
      soundPreset: data.soundPreset || 'classic',
      ...data.data
    },
    vibrate: vibrateMap[data.soundPreset || 'classic'] || [200, 100, 200],
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client && client.url !== new URL(targetUrl, self.location.origin).href) {
              return client.navigate(targetUrl);
            }
            return;
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[ServiceWorker] Notification closed:', event.notification.tag);
});
