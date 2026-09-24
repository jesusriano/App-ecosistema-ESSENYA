// Advanced Web Push Notifications Client Service for ESSENYA

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
    throw new Error('Las notificaciones Push no son compatibles con este navegador o dispositivo.');
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
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

    const resKey = await fetch('/api/push/vapid-public-key');
    const keyData = await resKey.json();
    if (!keyData.success || !keyData.publicKey) {
      return { success: false, error: 'No se pudo obtener la clave VAPID pública del servidor.' };
    }

    const convertedVapidKey = urlBase64ToUint8Array(keyData.publicKey);

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    const subRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        subscription: subscription.toJSON()
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

      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
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

// Advanced Web Audio API synthesizer for sound presets (Classic, Bell, Alert, Soft, Urgent) and volume
export function playNotificationSound(preset: SoundPreset = 'classic', volume: number = 0.8) {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)) * 0.4, now);

    if (preset === 'classic') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (preset === 'bell') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (preset === 'alert') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(800, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (preset === 'soft') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(392, now); // G4
      osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.start(now);
      osc.stop(now + 0.7);
    } else if (preset === 'urgent') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.setValueAtTime(1100, now + 0.08);
      osc.frequency.setValueAtTime(900, now + 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
  } catch (e) {
    console.warn('[WebPush] Could not play notification sound preset:', e);
  }
}

