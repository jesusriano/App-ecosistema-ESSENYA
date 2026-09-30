// Advanced Web Push Notifications Client Service for ESSENYA
import { vapidKey, getMessagingService, auth } from '../../lib/firebase';
import { getToken } from 'firebase/messaging';
import { logPWAError, logPWAWarning, logPWAInfo } from '../utils/errorLogger';
import { trackPushSubscriptionSuccess, trackPushSubscriptionError } from '../utils/analytics';
import { Capacitor } from '@capacitor/core';

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
  const DEFAULT_VALID_KEY = "BHEx7m8uEh5G66_S_vknnlbzdyDQ93X4xuNbqcr-KuS5p_r0ycVGo_7bt6HAYCkABoQTFNvspi4pSOb2Nm4gNl8";
  
  // 1. Sanitize the string
  let cleanString = String(base64String || '').trim();
  
  // Strip quotes if they were accidentally included
  cleanString = cleanString.replace(/^['"]|['"]$/g, '').trim();
  
  // Strip any whitespace, tabs, or newlines inside the key
  cleanString = cleanString.replace(/[\s\r\n\t]/g, '');

  // Strip trailing padding '=' so we can calculate the correct padding dynamically
  cleanString = cleanString.replace(/=+$/, '');
  
  // 2. Validate format using a regex to ensure it's a valid Base64 or Base64url string
  const isValidBase64 = /^[A-Za-z0-9\-_+/]+$/.test(cleanString) && cleanString.length >= 40;
  
  if (!isValidBase64) {
    cleanString = DEFAULT_VALID_KEY.replace(/=+$/, '');
  }
  
  try {
    const padding = '='.repeat((4 - (cleanString.length % 4)) % 4);
    const base64 = (cleanString + padding).replace(/-/g, '+').replace(/_/g, '/');
    
    const globalObj = typeof window !== 'undefined' ? window : self;
    const rawData = globalObj.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (err) {
    console.error('[WebPush] Error al decodificar la clave VAPID Base64:', err);
    try {
      const cleanDefault = DEFAULT_VALID_KEY.replace(/=+$/, '');
      const paddingDefault = '='.repeat((4 - (cleanDefault.length % 4)) % 4);
      const base64Default = (cleanDefault + paddingDefault).replace(/-/g, '+').replace(/_/g, '/');
      const globalObj = typeof window !== 'undefined' ? window : self;
      const rawData = globalObj.atob(base64Default);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    } catch {
      return new Uint8Array(0);
    }
  }
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
    console.warn('[WebPush] Advertencia al registrar Service Worker:', err);
    return null;
  }
}

// ==========================================
// INDEXEDDB PERSISTENT OFFLINE RETRY QUEUE
// ==========================================
export interface PendingPushSubscription {
  id: string;
  userId: string;
  fcmToken?: string;
  subscription?: any;
  timestamp: number;
  attempts: number;
}

const IDB_NAME = 'essenya_push_db';
const IDB_STORE = 'subscription_retry_queue';
const IDB_VERSION = 1;

function openPushDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => {
        console.warn('[WebPush DB] Error abriendo IndexedDB:', e);
        resolve(null);
      };
    } catch (e) {
      console.warn('[WebPush DB] Excepción abriendo IndexedDB:', e);
      resolve(null);
    }
  });
}

export async function enqueuePendingSubscription(item: PendingPushSubscription): Promise<void> {
  const db = await openPushDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(item);
      tx.oncomplete = () => {
        console.log(`[WebPush DB] Suscripción encolada en IndexedDB para usuario ${item.userId} (ID: ${item.id})`);
        resolve();
      };
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getPendingSubscriptions(): Promise<PendingPushSubscription[]> {
  const db = await openPushDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function removePendingSubscription(id: string): Promise<void> {
  const db = await openPushDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Executes a fetch request with exponential backoff retries and randomized jitter.
 * Designed specifically to handle network offline errors or transient server errors (5xx/429)
 * for VAPID push notification subscription synchronization.
 */
export async function fetchWithExponentialBackoff(
  url: string,
  options: RequestInit,
  maxRetries: number = 4,
  baseDelayMs: number = 1000
): Promise<Response> {
  let attempt = 0;
  while (true) {
    try {
      const response = await fetch(url, options);

      // If successful or non-retryable user/client error (any 4xx except 429), return response
      if (response.ok || (response.status < 500 && response.status !== 429)) {
        return response;
      }

      if (attempt >= maxRetries) {
        console.warn(`[PushBackoff] Max retries (${maxRetries}) reached. Returning response with status ${response.status}`);
        return response;
      }

      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
      console.warn(`[PushBackoff] Attempt ${attempt + 1} failed (status ${response.status}). Retrying in ${Math.round(delay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
    } catch (networkError) {
      if (attempt >= maxRetries) {
        console.error(`[PushBackoff] Max retries (${maxRetries}) reached for network issue. Throwing error.`);
        throw networkError;
      }

      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
      console.warn(`[PushBackoff] Attempt ${attempt + 1} failed due to network offline/timeout. Retrying in ${Math.round(delay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
    }
  }
}

/**
 * Vacia y procesa todas las suscripciones pendientes guardadas en IndexedDB
 */
export async function flushPendingSubscriptions(): Promise<number> {
  if (typeof window === 'undefined' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return 0;
  }
  try {
    const queue = await getPendingSubscriptions();
    if (!queue || queue.length === 0) return 0;

    console.log(`[WebPush DB] Procesando cola de reintentos IndexedDB (${queue.length} pendientes)...`);
    let syncedCount = 0;

    for (const item of queue) {
      try {
        // Si el item no tiene datos de suscripción, significa que la solicitud al navegador (PushManager)
        // falló originalmente debido a red inestable y requerimos re-ejecutar el flujo completo de suscripción.
        if (!item.subscription) {
          console.log(`[WebPush DB] Intentando re-suscripción completa para el usuario: ${item.userId}`);
          const resSub = await subscribeToPushNotifications(item.userId);
          if (resSub.success && !resSub.queued) {
            await removePendingSubscription(item.id);
            syncedCount++;
            console.log(`[WebPush DB] Re-suscripción completa de ${item.userId} realizada con éxito.`);
          } else {
            item.attempts = (item.attempts || 0) + 1;
            if (item.attempts >= 10) {
              await removePendingSubscription(item.id);
            } else {
              await enqueuePendingSubscription(item);
            }
          }
          continue;
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        try {
          const token = await auth.currentUser?.getIdToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {}

        const res = await fetchWithExponentialBackoff('/api/push/subscribe', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            userId: item.userId,
            fcmToken: item.fcmToken,
            subscription: item.subscription
          })
        });

        const data = await res.json();
        if (data.success) {
          await removePendingSubscription(item.id);
          syncedCount++;
          console.log(`[WebPush DB] Suscripción offline de ${item.userId} sincronizada con éxito en el servidor.`);
        } else {
          item.attempts = (item.attempts || 0) + 1;
          if (item.attempts >= 10) {
            await removePendingSubscription(item.id);
          } else {
            await enqueuePendingSubscription(item);
          }
        }
      } catch (networkError) {
        console.warn(`[WebPush DB] Reintento diferido para ${item.id}:`, networkError);
      }
    }
    return syncedCount;
  } catch (err) {
    console.warn('[WebPush DB] Error al vaciar cola de reintentos:', err);
    return 0;
  }
}

// Escuchador de reconexión automática a Internet
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[WebPush] Conexión a Internet restablecida. Procesando cola persistente de suscripciones...');
    flushPendingSubscriptions().catch(() => {});
  });

  // Ejecución preventiva inicial
  setTimeout(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      flushPendingSubscriptions().catch(() => {});
    }
  }, 4000);
}

export async function getVapidPublicKeyFromServer(): Promise<string> {
  try {
    const resKey = await fetch('/api/push/vapid-public-key');
    const keyData = await resKey.json();
    if (keyData.success && keyData.publicKey) {
      return keyData.publicKey;
    }
  } catch (err) {
    console.info('[WebPush] Error al obtener clave del servidor, usando fallback:', err);
  }
  return vapidKey;
}

export async function subscribeToPushNotifications(userId: string = 'anonymous'): Promise<{ success: boolean; error?: string; queued?: boolean }> {
  try {
    if (!isPushSupported()) {
      return { success: false, error: 'Push no soportado en este navegador.' };
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      trackPushSubscriptionError(Capacitor.isNativePlatform() ? 'android' : 'web', userId, 'Permiso de notificaciones denegado');
      return { success: false, error: 'Permiso de notificaciones denegado por el usuario.' };
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      trackPushSubscriptionError(Capacitor.isNativePlatform() ? 'android' : 'web', userId, 'Inicialización de Service Worker fallida');
      return { success: false, error: 'No se pudo inicializar el Service Worker.' };
    }

    const activePublicKey = await getVapidPublicKeyFromServer();
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
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      } catch (subErr: any) {
        const isNetworkErr = !navigator.onLine || 
          subErr.name === 'NetworkError' || 
          subErr.message?.toLowerCase().includes('network') || 
          subErr.message?.toLowerCase().includes('offline') ||
          subErr.message?.toLowerCase().includes('connect');

        if (isNetworkErr) {
          console.warn('[WebPush] Error de red al suscribir en PushManager. Encolando acción de re-suscripción para cuando vuelva la conexión:', subErr);
          await logPWAWarning('push-manager', `Fallo de red al solicitar suscripción PushManager para ${userId}. Encolando reintento.`);
          
          await enqueuePendingSubscription({
            id: `resub_${userId}_${Date.now()}`,
            userId,
            timestamp: Date.now(),
            attempts: 0,
            subscription: null, // Marca que se requiere generar una nueva suscripción
          });
          
          trackPushSubscriptionSuccess(Capacitor.isNativePlatform() ? 'android' : 'web', userId, 'vapid');
          return { success: true, queued: true };
        }
        
        throw subErr;
      }
    }

    // Obtain and register Firebase Cloud Messaging token using the ACTIVE server VAPID key
    let fcmToken: string | undefined = undefined;
    try {
      const msg = await getMessagingService();
      if (msg) {
        const token = await getToken(msg, {
          vapidKey: activePublicKey,
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

    const subscriptionData = subscription ? subscription.toJSON() : undefined;
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    // Si el usuario está offline al suscribirse, guardar de inmediato en IndexedDB
    if (isOffline) {
      console.log('[WebPush] Usuario sin conexión a red. Guardando suscripción en cola IndexedDB para sincronización posterior.');
      await enqueuePendingSubscription({
        id: `sub_${userId}_${Date.now()}`,
        userId,
        fcmToken,
        subscription: subscriptionData,
        timestamp: Date.now(),
        attempts: 0
      });
      trackPushSubscriptionSuccess(Capacitor.isNativePlatform() ? 'android' : 'web', userId, 'vapid');
      return { success: true, queued: true };
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

    let isServerSaved = false;
    try {
      const subRes = await fetchWithExponentialBackoff('/api/push/subscribe', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          fcmToken,
          subscription: subscriptionData
        })
      });

      const subResult = await subRes.json().catch(() => null);
      if (subResult && subResult.success) {
        isServerSaved = true;
      }
    } catch (netErr) {
      console.warn('[WebPush] Error al comunicarse con /api/push/subscribe:', netErr);
    }

    // Respaldo directo en Firestore para asegurar vinculación del dispositivo
    if (userId && userId !== 'anonymous') {
      try {
        const { updateDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../../lib/firebase');
        await updateDoc(doc(db, 'terapeutas', userId), {
          fcmToken: fcmToken || null,
          pushSubscribed: true,
          fcmUpdatedAt: new Date().toISOString()
        }).catch(() => {});
        await updateDoc(doc(db, 'users', userId), {
          fcmToken: fcmToken || null,
          pushSubscribed: true,
          fcmUpdatedAt: new Date().toISOString()
        }).catch(() => {});
        isServerSaved = true;
      } catch (dbErr) {
        console.warn('[WebPush] Respaldo Firestore en pushService:', dbErr);
      }
    }

    if (!isServerSaved) {
      await enqueuePendingSubscription({
        id: `sub_${userId}_${Date.now()}`,
        userId,
        fcmToken,
        subscription: subscriptionData,
        timestamp: Date.now(),
        attempts: 1
      });
    }

    await logPWAInfo('push-manager', `Suscripción procesada para ${userId}`);
    trackPushSubscriptionSuccess(Capacitor.isNativePlatform() ? 'android' : 'web', userId, fcmToken ? 'fcm' : 'vapid');
    flushPendingSubscriptions().catch(() => {});

    return { success: true };
  } catch (err: any) {
    await logPWAError('push-manager', `Fallo crítico en subscribeToPushNotifications para ${userId}`, err);
    trackPushSubscriptionError(Capacitor.isNativePlatform() ? 'android' : 'web', userId, err.message || 'Error desconocido');
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
    console.warn('[WebPush] Nota al desuscribir:', err);
    return { success: false, error: err.message };
  }
}

export async function sendTestPushNotification(userId?: string, title?: string, body?: string, soundPreset?: SoundPreset): Promise<{ success: boolean; error?: string; sentCount?: number }> {
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
    return { 
      success: data.success, 
      error: data.error,
      sentCount: data.sentCount
    };
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
    console.log(`[SoundPlayer] Intentando reproducir: ${preset} (${audioUrl})`);
    
    const audio = new Audio(audioUrl);
    audio.volume = Math.max(0, Math.min(1, volume));
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn('[SoundPlayer] El navegador bloqueó la reproducción automática o el archivo no cargó. Reintentando con sintetizador:', error);
        playSynthFallback(preset, volume);
      });
    }
  } catch (e) {
    console.warn('[SoundPlayer] Error en HTML5 Audio, cayendo a sintetizador:', e);
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

