// Advanced Web Push Notifications Client Service for ESSENYA
import { vapidKey, getMessagingService, auth } from '../../lib/firebase';
import { getToken } from 'firebase/messaging';

export type SoundPreset = 'classic' | 'bell' | 'alert' | 'soft' | 'urgent';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  soundPreset?: SoundPreset;
  data?: Record<string, any>;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.info('[PushService] Permiso de notificaciones no disponible o restringido en este contexto:', err);
    return Notification.permission || 'denied';
  }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) {
      return existing;
    }
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    console.log('[WebPush] Service Worker registrado con éxito:', registration.scope);
    return registration;
  } catch (err) {
    console.error('[WebPush] Error al registrar Service Worker:', err);
    return null;
  }
}

export async function subscribeToPushNotifications(userId: string = 'anonymous'): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isPushSupported()) {
      return { success: false, error: 'Push no soportado en este navegador.' };
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Permiso de notificaciones denegado por el usuario.' };
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, error: 'No se pudo inicializar el Service Worker.' };
    }

    let activePublicKey = vapidKey;
    try {
      const resKey = await fetch('/api/push/vapid-public-key');
      const keyData = await resKey.json();
      if (keyData.success && keyData.publicKey) {
        activePublicKey = keyData.publicKey;
      }
    } catch {
      console.info('[WebPush] Utilizando vapidKey configurada de Firebase:', vapidKey);
    }

    const convertedVapidKey = urlBase64ToUint8Array(activePublicKey);

    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      // Check if existing subscription applicationServerKey matches current VAPID public key
      const existingKey = subscription.options?.applicationServerKey;
      let keyMatch = false;
      if (existingKey) {
        const existingArray = new Uint8Array(existingKey);
        if (existingArray.length === convertedVapidKey.length) {
          keyMatch = true;
          for (let i = 0; i < existingArray.length; i++) {
            if (existingArray[i] !== convertedVapidKey[i]) {
              keyMatch = false;
              break;
            }
          }
        }
      }
      if (!keyMatch) {
        console.log('[WebPush] VAPID key changed or missing key, re-subscribing...');
        await subscription.unsubscribe();
        subscription = null;
      }
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    // Obtain and register Firebase Cloud Messaging token using vapidKey and active ServiceWorkerRegistration
    let fcmToken: string | undefined = undefined;
    try {
      const msg = await getMessagingService();
      if (msg) {
        const token = await getToken(msg, {
          vapidKey,
          serviceWorkerRegistration: registration
        });
        if (token) {
          fcmToken = token;
          console.log('[FCM] Token obtenido correctamente para asociación');
        }
      }
    } catch (fcmErr) {
      console.info('[FCM] Nota de obtención FCM:', fcmErr);
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (authErr) {
      console.warn('[WebPush] No se pudo obtener el token de autenticación para push subscribe:', authErr);
    }

    const subRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        fcmToken,
        subscription: subscription ? subscription.toJSON() : undefined
      })
    });

    const subResult = await subRes.json();
    if (!subResult.success) {
      return { success: false, error: subResult.error || 'Error al guardar la suscripción en el servidor.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[WebPush] Error en subscribeToPushNotifications:', err);
    return { success: false, error: err.message || 'Error desconocido al suscribirse a Push.' };
  }
}

export async function unsubscribeFromPushNotifications(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isPushSupported()) return { success: true };

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return { success: true };

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (authErr) {
        console.warn('[WebPush] No se pudo obtener el token de autenticación para push unsubscribe:', authErr);
      }

      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers,
        body: JSON.stringify({ endpoint })
      }).catch(() => {});
    }

    return { success: true };
  } catch (err: any) {
    console.error('[WebPush] Error al desuscribir:', err);
    return { success: false, error: err.message };
  }
}

export async function sendTestPushNotification(userId?: string, title?: string, body?: string, soundPreset?: SoundPreset): Promise<{ success: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: userId || auth.currentUser?.uid,
        title: title || 'Prueba de Notificación ESSENYA',
        body: body || 'Notificación push nativa operando en tiempo real con sonido.',
        url: '/',
        tag: 'essenya-test',
        soundPreset: soundPreset || 'classic'
      })
    });
    const data = await res.json();
    return { success: data.success, error: data.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Advanced Sound Player supporting real audio files and Web Audio API synth fallback
export function playNotificationSound(preset: SoundPreset | string = 'classic', volume: number = 0.8) {
  try {
    const soundFileMap: Record<string, string> = {
      classic: '/sounds/notification_default.mp3',
      bell: '/sounds/notification_reservation.mp3',
      alert: '/sounds/notification_arrived.mp3',
      soft: '/sounds/notification_started.mp3',
      urgent: '/sounds/notification_completed.mp3',
      reservation: '/sounds/notification_reservation.mp3',
      accepted: '/sounds/notification_accepted.mp3',
      arrived: '/sounds/notification_arrived.mp3',
      started: '/sounds/notification_started.mp3',
      completed: '/sounds/notification_completed.mp3',
      message: '/sounds/notification_message.mp3'
    };

    const audioUrl = soundFileMap[preset] || (preset.startsWith('/') ? preset : `/sounds/${preset}.mp3`);
    const audio = new Audio(audioUrl);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch(() => {
      // Fallback to Web Audio API synthesis if HTML5 Audio fails or blocked
      playSynthFallback(preset, volume);
    });
  } catch (e) {
    playSynthFallback(preset, volume);
  }
}

function playSynthFallback(preset: SoundPreset | string, volume: number = 0.8) {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)) * 0.4, now);

    if (preset === 'bell' || preset === 'reservation') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (preset === 'alert' || preset === 'arrived') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(800, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (preset === 'soft' || preset === 'started') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(392, now);
      osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.start(now);
      osc.stop(now + 0.7);
    } else if (preset === 'urgent' || preset === 'completed') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.setValueAtTime(1100, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
  } catch (err) {
    console.warn('[WebPush] Synth fallback audio error:', err);
  }
}

