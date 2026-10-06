// public/service-worker.js
// ESSENYA Unified Service Worker — Web Push (VAPID) & FCM Native Support
// Aligned with the push notification and exponential backoff subscription system in 'src/shared/services/pushService.ts'

// Injection point for precache manifest when using VitePWA / Workbox build tooling
// eslint-disable-next-line no-unused-expressions
self.__WB_MANIFEST;

// ========================================================
// 1. LIFECYCLE: Immediate Installation & Activation
// ========================================================
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installed. Activating immediately...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activated. Reclaiming active client tabs...');
  event.waitUntil(self.clients.claim());
});

// ========================================================
// 2. EVENT 'push': Web Push Reception & OS Notification Display
// ========================================================
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push event received.');

  // Default backup configuration for the ESSENYA ecosystem
  let data = {
    title: '🔔 ESSENYA',
    body: 'Tienes una nueva actualización en tu panel de bienestar.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    url: '/',
    tag: 'essenya-alert',
    sound: '/sounds/notification_default.mp3',
    data: {}
  };

  // Try parsing incoming JSON data payload
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[ServiceWorker] Parsing push JSON payload:', payload);

      // Support Firebase Cloud Messaging (FCM) payload formats
      if (payload.notification) {
        data.title = payload.notification.title || data.title;
        data.body = payload.notification.body || data.body;
        data.icon = payload.notification.icon || data.icon;
        data.badge = payload.notification.badge || data.badge;
      }

      if (payload.fcmOptions?.link) {
        data.url = payload.fcmOptions.link;
      }

      // Read custom attached metadata fields
      if (payload.data) {
        data.data = { ...data.data, ...payload.data };
        if (payload.data.title && !payload.notification?.title) data.title = payload.data.title;
        if (payload.data.body && !payload.notification?.body) data.body = payload.data.body;
        if (payload.data.url) data.url = payload.data.url;
        if (payload.data.sound) data.sound = payload.data.sound;
      }

      // Support standard RFC 8291 / Web-Push package formats
      data = {
        ...data,
        ...payload,
        data: { ...data.data, ...(payload.data || {}) }
      };

      if (payload.notification) {
        data.title = payload.notification.title || data.title;
        data.body = payload.notification.body || data.body;
      }
    } catch (parseError) {
      console.warn('[ServiceWorker] Push payload is not valid JSON. Reading as plain text:', parseError);
      data.body = event.data.text() || data.body;
    }
  }

  // Choose the optimal sound file based on the preset or payload parameter
  const soundFile = data.sound || '/sounds/notification_default.mp3';
  const vibratePattern = [300, 150, 300, 150];

  // Configure high-fidelity operating system notification options
  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    tag: data.tag || (data.data?.bookingId ? `booking-${data.data.bookingId}` : 'essenya-push-alert'),
    sound: soundFile,
    data: {
      url: data.url || (data.data?.bookingId ? `/terapeuta/servicios?bookingId=${data.data.bookingId}` : '/'),
      sound: soundFile,
      timestamp: Date.now(),
      ...data.data
    },
    vibrate: vibratePattern,
    // requireInteraction keeps notification active on screen until user explicitly clicks or dismisses it
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Ver en ESSENYA',
        icon: '/icons/icon-192.png'
      },
      {
        action: 'close',
        title: 'Cerrar'
      }
    ]
  };

  /**
   * Muestra la notificación con degradación progresiva (multi-tier fallback),
   * asegurando la visualización del título y mensaje en cualquier plataforma (iOS, Safari, Android, Windows, Mac).
   */
  async function showNotificationRobust(title, options) {
    const safeTitle = title || '🔔 ESSENYA';
    const safeBody = options.body || 'Tienes una nueva actualización en tu panel.';

    // Nivel 1: Opciones enriquecidas completas (para navegadores de escritorio y Android modernos)
    try {
      await self.registration.showNotification(safeTitle, options);
      console.log('[ServiceWorker] Notificación mostrada exitosamente con opciones completas.');
      return;
    } catch (errTier1) {
      console.warn('[ServiceWorker] Falló opción completa (posible incompatibilidad de actions/requireInteraction). Degradando...', errTier1);
    }

    // Nivel 2: Opciones estándar sin 'actions' ni 'requireInteraction' (evita TypeErrors en Safari / iOS PWA)
    try {
      const tier2Options = {
        body: safeBody,
        icon: options.icon || '/icons/icon-192.png',
        badge: options.badge || '/icons/icon-192.png',
        tag: options.tag,
        data: options.data,
        vibrate: options.vibrate
      };
      await self.registration.showNotification(safeTitle, tier2Options);
      console.log('[ServiceWorker] Notificación mostrada con opciones estándar (Nivel 2).');
      return;
    } catch (errTier2) {
      console.warn('[ServiceWorker] Falló Nivel 2. Degradando a opciones esenciales...', errTier2);
    }

    // Nivel 3: Opciones esenciales (cuerpo, icono y URL para redirección al tocar)
    try {
      const tier3Options = {
        body: safeBody,
        icon: options.icon || '/icons/icon-192.png',
        data: { url: options.data?.url || '/' }
      };
      await self.registration.showNotification(safeTitle, tier3Options);
      console.log('[ServiceWorker] Notificación mostrada con opciones esenciales (Nivel 3).');
      return;
    } catch (errTier3) {
      console.warn('[ServiceWorker] Falló Nivel 3. Intentando fallback ultra-mínimo de solo texto...', errTier3);
    }

    // Nivel 4: Fallback absoluto universal (estrictamente título y cuerpo, garantizando visualización)
    try {
      await self.registration.showNotification(safeTitle, {
        body: safeBody
      });
      console.log('[ServiceWorker] Notificación mostrada en modo ultra-mínimo (solo texto).');
    } catch (finalErr) {
      console.error('[ServiceWorker] Error crítico: No fue posible mostrar la notificación en ninguna variante:', finalErr);
    }
  }

  // Enforce user visible notifications requirement (W3C Push API specification)
  event.waitUntil(
    (async () => {
      // 1. Show the OS system-level native notification with resilient fallback
      await showNotificationRobust(data.title, notificationOptions);

      // 2. Broadcast message internally to all active tabs for instant React UI sync/sound playback
      try {
        const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of windowClients) {
          client.postMessage({
            type: 'PUSH_NOTIFICATION_RECEIVED',
            payload: data,
            sound: soundFile
          });
        }
      } catch (broadcastErr) {
        console.warn('[ServiceWorker] No se pudo notificar a pestañas activas:', broadcastErr);
      }
    })()
  );
});

// ========================================================
// 3. EVENT 'notificationclick': Focus & Deep Navigation
// ========================================================
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event.notification.tag);

  // Close the clicked system notification immediately
  event.notification.close();

  // If "Cerrar" action button was clicked, stop further processing
  if (event.action === 'close') {
    return;
  }

  const notificationData = event.notification.data || {};
  const bookingId = notificationData.bookingId;
  const baseUrl = notificationData.url || '/';

  // Construct target URL. If bookingId exists, append query parameter for direct state opening in React
  const targetUrl = bookingId && !baseUrl.includes('bookingId=')
    ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}bookingId=${bookingId}`
    : baseUrl;

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      // Search for any existing open ESSENYA tab to focus and navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          await client.focus();

          // Navigate the tab if its current URL differs from the push target URL
          const targetAbsoluteUrl = new URL(targetUrl, self.location.origin).href;
          if ('navigate' in client && client.url !== targetAbsoluteUrl) {
            await client.navigate(targetAbsoluteUrl);
          }

          // Send an internal notification to React for immediate overlay opening / booking detail expansion
          client.postMessage({
            type: 'NOTIFICATION_CLICKED_BOOKING',
            bookingId: bookingId,
            url: targetUrl
          });
          return;
        }
      }

      // If no open tabs exist, open a fresh window/tab directly on the destination URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});

// ========================================================
// 4. EVENT 'notificationclose': Audit & Tracking
// ========================================================
self.addEventListener('notificationclose', (event) => {
  console.log('[ServiceWorker] Notification dismissed by user:', event.notification.tag);
});

// ========================================================
// 5. EVENT 'pushsubscriptionchange': Auto Renewal on Expiration / Rotation
// ========================================================
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[ServiceWorker] Push subscription expired or rotated by browser. Re-subscribing in background...');
  event.waitUntil(
    (async () => {
      try {
        let activeVapidKey = "BAUvrHF6zeG0owm8gJL997JQPueRBzedGAcRA2tsV5Kl57cXfPk8d1NR9Wtqmg8HNSkD2RK1lXBCWwNSiUfBzpY";
        try {
          const res = await fetch('/api/push/vapid-public-key');
          if (res.ok) {
            const data = await res.json();
            if (data && data.publicKey) activeVapidKey = data.publicKey;
          }
        } catch (fetchErr) {
          console.warn('[ServiceWorker] Could not fetch fresh VAPID key in pushsubscriptionchange:', fetchErr);
        }

        function urlBase64ToUint8Array(base64String) {
          const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
          const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
          const rawData = atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        }

        const newSubscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(activeVapidKey)
        });

        await fetch('/api/push/registrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: newSubscription ? newSubscription.toJSON() : null,
            oldEndpoint: event.oldSubscription ? event.oldSubscription.endpoint : undefined
          })
        });
        console.log('[ServiceWorker] Push subscription renewed and registered successfully in background.');
      } catch (err) {
        console.error('[ServiceWorker] Error handling pushsubscriptionchange:', err);
      }
    })()
  );
});

// ========================================================
// 6. EVENT 'fetch': 'Stale-While-Revalidate' for Images
// ========================================================
const IMAGE_CACHE_NAME = 'essenya-images-cache';

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Identify therapist portrait assets, service catalog photos, and other general visual resources
  const isImageRequest = 
    event.request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i) ||
    url.hostname.includes('images.unsplash.com') ||
    url.hostname.includes('firebasestorage.googleapis.com');

  // Skip non-GET requests, API calls, and external non-image queries
  if (event.request.method !== 'GET' || !isImageRequest) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const cache = await caches.open(IMAGE_CACHE_NAME);
        const cachedResponse = await cache.match(event.request);

        // Dispatch network fetch in parallel (Revalidate)
        const fetchPromise = fetch(event.request).then(async (networkResponse) => {
          // Store response copy if successful or if it's an opaque cross-origin resource (status 0)
          if (networkResponse.ok || networkResponse.status === 0) {
            await cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((err) => {
          console.log('[ServiceWorker Fetch] Revalidation failed (offline mode):', url.href, err);
          // Return the cached response if fetch failed (to support offline mode)
          if (cachedResponse) return cachedResponse;
          throw err;
        });

        // Serve the cached version instantly, or wait for the network request to resolve as fallback
        return cachedResponse || fetchPromise;
      } catch (err) {
        // Safe fallback in case of cache access failure
        return fetch(event.request);
      }
    })()
  );
});
