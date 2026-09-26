// ESSENYA Advanced Service Worker with Firebase Cloud Messaging (FCM) & Web Push Support

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: '🔔 Masaje solicitado',
    body: 'Tienes una nueva solicitud de masaje.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    url: '/terapeuta/servicios',
    tag: 'essenya-notification',
    soundPreset: 'bell',
    sound: '/sounds/notification_reservation.mp3',
    data: { type: 'NEW_BOOKING' }
  };

  if (event.data) {
    try {
      const payload = event.data.json();

      // Soporte para estructura nativa de Firebase Cloud Messaging (FCM)
      if (payload.notification) {
        data.title = payload.notification.title || data.title;
        data.body = payload.notification.body || data.body;
        data.icon = payload.notification.icon || data.icon;
        data.badge = payload.notification.badge || data.badge;
      }
      if (payload.fcmOptions?.link) {
        data.url = payload.fcmOptions.link;
      }
      if (payload.data) {
        data.data = { ...data.data, ...payload.data };
        if (payload.data.title && !payload.notification?.title) data.title = payload.data.title;
        if (payload.data.body && !payload.notification?.body) data.body = payload.data.body;
        if (payload.data.url) data.url = payload.data.url;
      }

      // Soporte para WebPush estándar
      data = {
        ...data,
        ...payload,
        data: { ...data.data, ...(payload.data || {}) }
      };
      if (payload.notification) {
        data.title = payload.notification.title || data.title;
        data.body = payload.notification.body || data.body;
      }
    } catch (e) {
      console.warn('[ServiceWorker] Could not parse push payload as JSON:', e);
      data.body = event.data.text() || data.body;
    }
  }

  const soundFile = data.sound || (data.soundPreset ? `/sounds/${data.soundPreset}.mp3` : '/sounds/notification_reservation.mp3');

  const vibrateMap = {
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
    tag: data.tag || (data.data?.bookingId ? `booking-${data.data.bookingId}` : 'essenya-booking-notification'),
    sound: soundFile,
    data: {
      url: data.url || '/terapeuta/servicios',
      sound: soundFile,
      soundPreset: data.soundPreset || 'bell',
      ...data.data
    },
    vibrate: vibrateMap[data.soundPreset || 'bell'] || [300, 150, 300, 150],
    requireInteraction: true
  };

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const hasVisibleWindow = allClients.some(c => c.visibilityState === 'visible');

      // FASE 6 (Evitar Duplicados): Si la app está en segundo plano o cerrada, mostrar la notificación del sistema
      if (!hasVisibleWindow) {
        await self.registration.showNotification(data.title, options);
      }

      // Notificar a las ventanas activas para actualización inmediata de estado
      for (const client of allClients) {
        client.postMessage({
          type: 'PUSH_NOTIFICATION_RECEIVED',
          payload: data,
          sound: soundFile
        });
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/terapeuta/servicios';

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
