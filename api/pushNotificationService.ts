import path from 'path';
import fs from 'fs';
import webPush from 'web-push';
import type { Firestore } from 'firebase-admin/firestore';
import { getMessaging, type Message } from 'firebase-admin/messaging';
import { getApps } from 'firebase-admin/app';

function sanitizeVapidKey(key: string): string {
  let str = String(key || '').trim();
  // Strip outer quotes if any
  str = str.replace(/^['"]|['"]$/g, '').trim();
  // Check if it has JSON or key label artifacts like "publicKey":"..."
  if (str.includes('"') || str.includes(':') || str.includes('{')) {
    const lastQuote = str.lastIndexOf('"');
    if (lastQuote !== -1) {
      str = str.slice(lastQuote + 1);
    }
  }
  return str
    .replace(/^=+/g, '')            // Strip leading '=' padding/artifacts
    .replace(/=+$/g, '')            // Strip trailing '=' padding
    .replace(/\+/g, '-')           // Replace + with -
    .replace(/\//g, '_')           // Replace / with _
    .replace(/[^a-zA-Z0-9_-]/g, '') // Keep only URL-safe base64 characters
    .trim();
}

function isValidVapidKey(key: string | undefined, minLength: number): boolean {
  if (!key) return false;
  const clean = sanitizeVapidKey(key);
  if (clean === 'undefined' || clean === 'null' || clean === '' || clean.startsWith('placeholder') || clean.includes('YOUR_')) {
    return false;
  }
  return clean.length >= minLength;
}

// Initialize VAPID Keys exclusively from environment variables or official Firebase Console key
const DEFAULT_VAPID_PUBLIC_KEY = "BAUvrHF6zeG0owm8gJL997JQPueRBzedGAcRA2tsV5Kl57cXfPk8d1NR9Wtqmg8HNSkD2RK1lXBCWwNSiUfBzpY";
let rawPublicKey = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
if (rawPublicKey && rawPublicKey.includes("BHEx")) {
  rawPublicKey = DEFAULT_VAPID_PUBLIC_KEY;
}
let rawPrivateKey = process.env.VAPID_PRIVATE_KEY;

let vapidPublicKey = isValidVapidKey(rawPublicKey, 80) ? sanitizeVapidKey(rawPublicKey!) : undefined;
let vapidPrivateKey = isValidVapidKey(rawPrivateKey, 40) ? sanitizeVapidKey(rawPrivateKey!) : undefined;
let vapidConfigured = false;

const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:seguridad@essenyamexico.com';

/**
 * Ensures VAPID keys are configured. If missing from env, attempts to retrieve from Firestore.
 */
export async function ensureVapidConfig(db: Firestore): Promise<boolean> {
  // If already configured and both keys exist and are valid, return true
  if (vapidConfigured && vapidPublicKey && vapidPrivateKey) {
    return true;
  }

  // 1. Check if both keys exist from env
  if (isValidVapidKey(rawPublicKey, 80) && isValidVapidKey(rawPrivateKey, 40)) {
    const pub = sanitizeVapidKey(rawPublicKey!);
    const priv = sanitizeVapidKey(rawPrivateKey!);
    try {
      webPush.setVapidDetails(vapidSubject, pub, priv);
      vapidPublicKey = pub;
      vapidPrivateKey = priv;
      vapidConfigured = true;
      console.log('[WebPush-Audit] Web Push (VAPID) configured via environment variables.');
      return true;
    } catch (setErr: any) {
      console.warn('[WebPush-Audit] Error configuring VAPID from env:', setErr?.message);
    }
  }

  try {
    // 2. Try Firestore retrieval from 'config/vapid' or 'configuraciones/vapid'
    const configRef = db.collection('config').doc('vapid');
    const configSnap = await configRef.get();
    
    if (configSnap.exists) {
      const data = configSnap.data();
      const pub = data?.publicKey ? sanitizeVapidKey(data.publicKey) : (isValidVapidKey(rawPublicKey, 80) ? sanitizeVapidKey(rawPublicKey!) : '');
      const priv = data?.privateKey ? sanitizeVapidKey(data.privateKey) : '';
      if (isValidVapidKey(pub, 80) && isValidVapidKey(priv, 40)) {
        try {
          webPush.setVapidDetails(vapidSubject, pub, priv);
          vapidPublicKey = pub;
          vapidPrivateKey = priv;
          vapidConfigured = true;
          console.log('[WebPush-Audit] VAPID keys retrieved and verified from Firestore (config/vapid).');
          return true;
        } catch (setErr: any) {
          console.warn('[WebPush-Audit] Stored Firestore VAPID keys invalid:', setErr?.message);
        }
      }
    }

    const configGlobalSnap = await db.collection('configuraciones').doc('vapid').get();
    if (configGlobalSnap.exists) {
      const data = configGlobalSnap.data();
      const pub = data?.publicKey ? sanitizeVapidKey(data.publicKey) : (isValidVapidKey(rawPublicKey, 80) ? sanitizeVapidKey(rawPublicKey!) : '');
      const priv = data?.privateKey ? sanitizeVapidKey(data.privateKey) : '';
      if (isValidVapidKey(pub, 80) && isValidVapidKey(priv, 40)) {
        try {
          webPush.setVapidDetails(vapidSubject, pub, priv);
          vapidPublicKey = pub;
          vapidPrivateKey = priv;
          vapidConfigured = true;
          console.log('[WebPush-Audit] VAPID keys retrieved and verified from Firestore (configuraciones/vapid).');
          return true;
        } catch (setErr: any) {
          console.warn('[WebPush-Audit] Stored Firestore configuraciones/vapid keys invalid:', setErr?.message);
        }
      }
    }
  } catch (err: any) {
    console.error('[WebPush-Audit] Critical error reading VAPID from Firestore:', err?.message);
  }

  // Ensure public key is available for client subscriptions
  if (isValidVapidKey(rawPublicKey, 80)) {
    vapidPublicKey = sanitizeVapidKey(rawPublicKey!);
  }

  return Boolean(vapidConfigured && vapidPublicKey && vapidPrivateKey);
}

// Initial sync check (non-blocking)
if (vapidPublicKey && vapidPrivateKey) {
  try {
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    vapidConfigured = true;
    console.log('[WebPush-Audit] Web Push (VAPID) configured via environment variables.');
  } catch (err: any) {
    console.error('[WebPush-Audit] Error configuring VAPID from env:', err?.message);
    vapidPublicKey = undefined;
    vapidPrivateKey = undefined;
    vapidConfigured = false;
  }
}

export function getVapidPublicKey(): string {
  return vapidPublicKey || (isValidVapidKey(rawPublicKey, 80) ? sanitizeVapidKey(rawPublicKey!) : DEFAULT_VAPID_PUBLIC_KEY);
}

export interface FcmNotificationPayload {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, string>;
  icon?: string;
  badge?: string;
}

/**
 * Sends a real Firebase Cloud Messaging (FCM) push notification to a user/therapist
 * using the existing Firebase Admin Messaging SDK instance.
 */
export async function sendFcmNotificationToUser(
  db: Firestore,
  userId: string,
  payload: FcmNotificationPayload
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  if (!db || !userId) {
    return { success: false, sentCount: 0, error: 'Parámetros inválidos' };
  }

  try {
    console.log(`[FCM] Intentando notificar usuario: ${userId}`);

    // 1. Obtener FCM token desde terapeutas/{userId}
    let fcmToken: string | null = null;
    try {
      const therapistDoc = await db.collection('terapeutas').doc(userId).get();
      if (therapistDoc.exists) {
        fcmToken = therapistDoc.data()?.fcmToken || null;
      }
    } catch (e) {
      console.warn(`[FCM] Error leyendo documento terapeuta ${userId}:`, e);
    }

    // 2. Si no se encontró en terapeutas, buscar en users/{userId}
    if (!fcmToken) {
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          fcmToken = userDoc.data()?.fcmToken || null;
        }
      } catch {}
    }

    // 3. Si no se encontró en users, buscar en clientes/{userId}
    if (!fcmToken) {
      try {
        const clientDoc = await db.collection('clientes').doc(userId).get();
        if (clientDoc.exists) {
          fcmToken = clientDoc.data()?.fcmToken || null;
        }
      } catch {}
    }

    // 4. Si aún no se encontró, buscar en push_subscriptions
    if (!fcmToken) {
      try {
        const snap = await db.collection('push_subscriptions').where('userId', '==', userId).get();
        for (const doc of snap.docs) {
          if (doc.data()?.fcmToken) {
            fcmToken = doc.data().fcmToken;
            break;
          }
        }
      } catch {}
    }

    if (!fcmToken) {
      console.log(`[FCM] Usuario ${userId} no tiene FCM token registrado.`);
      return { success: false, sentCount: 0, error: 'No FCM token' };
    }

    const maskedToken = fcmToken.length > 10
      ? `${fcmToken.substring(0, 6)}...${fcmToken.substring(fcmToken.length - 4)}`
      : '***';
    console.log(`[FCM] Token encontrado: SÍ (${maskedToken})`);

    // 4. Validar que exista la app de Firebase Admin inicializada
    if (getApps().length === 0) {
      console.warn('[FCM] Firebase Admin App no está inicializada.');
      return { success: false, sentCount: 0, error: 'Firebase Admin not initialized' };
    }

    const messaging = getMessaging();

    // Sanitizar datos como strings requeridos por FCM
    const sanitizedData: Record<string, string> = {};
    if (payload.data) {
      for (const [key, val] of Object.entries(payload.data)) {
        sanitizedData[key] = String(val ?? '');
      }
    }
    if (payload.url && !sanitizedData.url) {
      sanitizedData.url = String(payload.url);
    }

    const deepLinkUrl = sanitizedData.bookingId 
      ? `/terapeuta/servicios?bookingId=${sanitizedData.bookingId}` 
      : (payload.url || '/terapeuta/servicios');

    const fcmMessage: Message = {
      token: fcmToken,
      notification: {
        title: payload.title || '🔔 Masaje solicitado',
        body: payload.body || 'Tienes una nueva solicitud de masaje.'
      },
      data: sanitizedData,
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          title: payload.title || '🔔 Masaje solicitado',
          body: payload.body || 'Tienes una nueva solicitud de masaje.',
          icon: payload.icon || '/icons/icon-192.png',
          badge: payload.badge || '/icons/badge-72.png',
          tag: sanitizedData.bookingId ? `booking-${sanitizedData.bookingId}` : undefined,
          requireInteraction: true
        },
        fcmOptions: {
          link: deepLinkUrl
        }
      }
    };

    const response = await messaging.send(fcmMessage);
    console.log(`[FCM] Envío FCM: OK`);
    console.log(`[FCM] bookingId: ${sanitizedData.bookingId || 'N/A'}`);
    return { success: true, sentCount: 1 };
  } catch (err: any) {
    console.error(`[FCM] Error enviando notificación al terapeuta ${userId}:`, err?.code || err?.message);

    // FASE 7: Manejo de tokens inválidos o no registrados
    if (
      err?.code === 'messaging/invalid-registration-token' ||
      err?.code === 'messaging/registration-token-not-registered'
    ) {
      console.warn(`[FCM] Limpiando token obsoleto o inválido para terapeuta ${userId}...`);
      try {
        await db.collection('terapeutas').doc(userId).set({
          fcmToken: null,
          fcmInvalidatedAt: new Date().toISOString()
        }, { merge: true });
        await db.collection('users').doc(userId).set({
          fcmToken: null,
          fcmInvalidatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (cleanErr) {
        console.warn(`[FCM] Error al limpiar token inválido:`, cleanErr);
      }
    }

    return { success: false, sentCount: 0, error: err?.message };
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  soundPreset?: string;
  sound?: string;
  eventId?: string;
  data?: Record<string, any>;
}

/**
 * Sends a native Web Push notification to a specific user using VAPID
 */
export async function sendStandardWebPushToUser(
  db: Firestore,
  userId: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; sentCount: number; errors?: any[] }> {
  // Ensure keys are ready (env -> firestore -> auto-gen)
  const isReady = await ensureVapidConfig(db);
  
  if (!isReady || !vapidPrivateKey || !vapidPublicKey) {
    console.warn('[WebPush-Audit] Cancelando Web Push fallback: No se pudieron configurar las claves VAPID.');
    return { success: false, sentCount: 0, errors: ['VAPID keys not configured in server environment and auto-generation failed'] };
  }

  try {
    const snapshot = await db.collection('push_subscriptions').where('userId', '==', userId).get();
    if (snapshot.empty) {
      console.log(`[WebPush] No push subscriptions found for user: ${userId}`);
      return { success: true, sentCount: 0 };
    }

    const presetMap: Record<string, string> = {
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

    const resolvedPreset = payload.soundPreset || 'classic';
    const soundFile = payload.sound || presetMap[resolvedPreset] || '/sounds/notification_default.mp3';

    const formattedPayload = JSON.stringify({
      title: payload.title || 'ESSENYA — Notificación',
      body: payload.body || 'Tienes una nueva actualización en tu ecosistema.',
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/badge-72.png',
      url: payload.url || (payload.data?.bookingId ? `/terapeuta/servicios?bookingId=${payload.data.bookingId}` : '/'),
      tag: payload.tag || `notif-${Date.now()}`,
      soundPreset: resolvedPreset,
      sound: soundFile,
      data: payload.data || { type: 'general' }
    });

    let sentCount = 0;
    const errors: any[] = [];

    for (const doc of snapshot.docs) {
      const subData = doc.data();
      if (!subData.endpoint || !subData.p256dh || !subData.auth) {
        continue;
      }

      const pushSub = {
        endpoint: subData.endpoint,
        keys: {
          p256dh: subData.p256dh,
          auth: subData.auth
        }
      };

      try {
        await webPush.sendNotification(pushSub, formattedPayload);
        sentCount++;
      } catch (err: any) {
        const status = err?.statusCode;
        const msg = String(err?.message || '');
        const isStale = (status >= 400 && status < 500) || 
          msg.includes('unexpected response code') || 
          status === 410 || 
          status === 404 || 
          status === 401 || 
          status === 403 || 
          status === 400;

        // Clean up stale, invalid, expired, or forbidden endpoints silently as standard maintenance
        if (isStale) {
          console.log(`[WebPush] Suscripción caducada/incompatible eliminada: ${doc.id} (user: ${userId}, HTTP ${status || '4xx'})`);
          await doc.ref.delete().catch(() => {});
        } else {
          console.warn(`[WebPush] Error temporal de entrega para ${doc.id} (user: ${userId}):`, status, msg);
          errors.push({ docId: doc.id, error: msg || 'Error de entrega WebPush' });
        }
      }
    }

    console.log(`[WebPush] Sent ${sentCount} notifications to user ${userId} (${payload.title})`);
    return { success: true, sentCount, errors: errors.length > 0 ? errors : undefined };
  } catch (err: any) {
    console.error(`[WebPush] Error in sendStandardWebPushToUser:`, err);
    return { success: false, sentCount: 0, errors: [err?.message] };
  }
}

/**
 * Unified notification dispatcher for ESSENYA:
 * - Prioritizes native Firebase Cloud Messaging (FCM) via Firebase Admin SDK
 * - If FCM succeeds, stops immediately (GUARANTEES NO DUPLICATES)
 * - If FCM token is not registered, safely falls back to standard WebPush (VAPID)
 * - Guarantees EXACTLY ONE delivery attempt per logical notification
 */
export async function sendPushNotificationToUser(
  db: Firestore,
  userId: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; sentCount: number; channel?: 'fcm' | 'webpush' | 'none'; error?: string; errors?: any[] }> {
  if (!db || !userId) {
    return { success: false, sentCount: 0, channel: 'none' };
  }

  // 1. Intentar entrega nativa primaria con Firebase Cloud Messaging (FCM)
  try {
    const fcmRes = await sendFcmNotificationToUser(db, userId, {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/badge-72.png',
      data: {
        ...(payload.data || {}),
        url: payload.url || (payload.data?.bookingId ? `/terapeuta/servicios?bookingId=${payload.data.bookingId}` : '/terapeuta/servicios'),
        bookingId: payload.data?.bookingId ? String(payload.data.bookingId) : ''
      }
    });

    if (fcmRes.success && fcmRes.sentCount > 0) {
      console.log(`[PushNotification] Notificación entregada con éxito a ${userId} vía FCM (sin duplicados)`);
      return { success: true, sentCount: 1, channel: 'fcm' };
    }
  } catch (fcmErr) {
    console.warn(`[PushNotification] Error en intento FCM para ${userId}, evaluando fallback a WebPush...`, fcmErr);
  }

  // 2. Fallback complementario a WebPush VAPID si FCM no estaba disponible
  const webPushRes = await sendStandardWebPushToUser(db, userId, payload);
  if (webPushRes.sentCount > 0) {
    return { success: true, sentCount: webPushRes.sentCount, channel: 'webpush', errors: webPushRes.errors };
  }

  // If we reached here, no notification was sent via any channel
  const firstErrorObj = webPushRes.errors?.[0];
  const firstErrorMessage = typeof firstErrorObj === 'string' 
    ? firstErrorObj 
    : (firstErrorObj?.error || firstErrorObj?.message || JSON.stringify(firstErrorObj));

  const finalError = webPushRes.sentCount === 0 && !webPushRes.errors 
    ? 'No se encontraron suscripciones activas (FCM ni WebPush) para este usuario en el servidor.'
    : (firstErrorMessage || 'Error desconocido en el canal de notificaciones.');

  return { 
    success: false, 
    sentCount: 0, 
    channel: 'none', 
    error: finalError,
    errors: webPushRes.errors 
  };
}

/**
 * Broadcasts a high-priority push notification to all active administrators.
 */
export async function notifyAdmins(
  db: Firestore,
  payload: PushNotificationPayload
): Promise<{ success: boolean; sentCount: number }> {
  try {
    const adminUids = new Set<string>();

    // 1. From 'administradores' collection
    try {
      const snap = await db.collection('administradores').get();
      snap.docs.forEach(doc => {
        const d = doc.data();
        if (d.estado !== 'inactivo' && d.estado !== 'bloqueado') {
          adminUids.add(doc.id);
        }
      });
    } catch (e) {
      console.warn('[Push Notification] Error consultando administradores:', e);
    }

    // 2. From 'admins' fallback collection
    try {
      const snap = await db.collection('admins').get();
      snap.docs.forEach(doc => {
        const d = doc.data();
        if (d.estado !== 'inactivo' && d.estado !== 'bloqueado') {
          adminUids.add(doc.id);
        }
      });
    } catch {}

    // 3. From 'users' collection where rol == 'administrador'
    try {
      const snap = await db.collection('users').where('rol', '==', 'administrador').get();
      snap.docs.forEach(doc => adminUids.add(doc.id));
    } catch {}

    let totalSent = 0;
    for (const uid of adminUids) {
      try {
        const res = await sendPushNotificationToUser(db, uid, payload);
        if (res.success && res.sentCount > 0) totalSent += res.sentCount;
      } catch (err) {
        console.warn(`[Push Notification] Error notificando admin ${uid}:`, err);
      }
    }
    return { success: true, sentCount: totalSent };
  } catch (err: any) {
    console.warn('[Push Notification] Error general en notifyAdmins:', err);
    return { success: false, sentCount: 0 };
  }
}

// ========================================================
// IDEMPOTENCY & EVENT ID VERIFICATION ENGINE
// ========================================================

const processedEventIdsCache = new Map<string, number>();
const EVENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

export function isEventProcessedInMemory(eventId: string): boolean {
  if (!eventId) return false;
  const ts = processedEventIdsCache.get(eventId);
  if (!ts) return false;
  if (Date.now() - ts > EVENT_CACHE_TTL_MS) {
    processedEventIdsCache.delete(eventId);
    return false;
  }
  return true;
}

export function markEventProcessedInMemory(eventId: string): void {
  if (!eventId) return;
  if (processedEventIdsCache.size > 5000) {
    const cutoff = Date.now() - EVENT_CACHE_TTL_MS;
    for (const [k, v] of processedEventIdsCache.entries()) {
      if (v < cutoff) processedEventIdsCache.delete(k);
    }
  }
  processedEventIdsCache.set(eventId, Date.now());
}

/**
 * Checks if an event ID has already been recorded or is currently being processed.
 * Uses an atomic Firestore transaction + in-memory cache to guarantee exactly ONE execution.
 */
export async function acquireNotificationEventLock(
  db: Firestore,
  eventId: string,
  metadata: {
    bookingId?: string;
    state?: string;
    recipientId?: string;
    eventType?: string;
  }
): Promise<{ acquired: boolean; reason?: string }> {
  if (!eventId) return { acquired: true };

  // 1. In-memory fast check (prevents millisecond duplicate triggers in same instance)
  if (isEventProcessedInMemory(eventId)) {
    return { acquired: false, reason: 'ALREADY_PROCESSED_IN_MEMORY' };
  }

  // 2. Persistent Firestore atomic check and lock
  try {
    const eventRef = db.collection('notification_events').doc(eventId);
    const acquired = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(eventRef);
      if (snap.exists) {
        const data = snap.data();
        if (data?.status === 'completed' || data?.status === 'processing') {
          return false;
        }
      }
      transaction.set(eventRef, {
        eventId,
        bookingId: metadata.bookingId || null,
        state: metadata.state || null,
        recipientId: metadata.recipientId || null,
        eventType: metadata.eventType || (metadata.state ? `booking_state_${metadata.state}` : 'generic_event'),
        status: 'processing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    });

    if (!acquired) {
      markEventProcessedInMemory(eventId);
      return { acquired: false, reason: 'ALREADY_EXISTS_IN_FIRESTORE' };
    }

    return { acquired: true };
  } catch (err: any) {
    console.warn(`[Push-Idempotency] Error al verificar lock de evento ${eventId} en Firestore:`, err?.message);
    // If transaction failed due to contention or transient error, allow in memory lock check
    return { acquired: true };
  }
}

/**
 * Updates an event ID record in Firestore and in-memory cache upon completion.
 */
export async function markNotificationEventCompleted(
  db: Firestore,
  eventId: string,
  details: {
    sentCount: number;
    channel?: string;
    error?: string;
    recipients?: string[];
  }
): Promise<void> {
  if (!eventId) return;
  markEventProcessedInMemory(eventId);
  try {
    const eventRef = db.collection('notification_events').doc(eventId);
    await eventRef.set({
      status: details.error && details.sentCount === 0 ? 'failed' : 'completed',
      sentCount: details.sentCount || 0,
      channel: details.channel || 'none',
      error: details.error || null,
      recipients: details.recipients || [],
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err: any) {
    console.warn(`[Push-Idempotency] Error actualizando estado de evento ${eventId}:`, err?.message);
  }
}

export interface BookingStateNotificationOptions {
  eventId?: string;
  bookingData?: Record<string, any>;
  reason?: string;
  sound?: string;
  soundPreset?: string;
  customTitle?: string;
  customBody?: string;
  url?: string;
  tag?: string;
}

/**
 * Centralized, idempotent notification dispatcher for booking state transitions.
 * Guarantees EXACTLY ONE push notification is delivered per state transition
 * using strict Event ID verification.
 */
export async function notifyBookingStateTransition(
  db: Firestore,
  bookingId: string,
  newState: string,
  options: BookingStateNotificationOptions = {}
): Promise<{ success: boolean; sent: boolean; eventId: string; reason?: string; channel?: string; sentCount?: number }> {
  if (!db || !bookingId || !newState) {
    return { success: false, sent: false, eventId: '', reason: 'MISSING_PARAMETERS' };
  }

  // 1. Generate or verify deterministic Event ID
  const eventId = options.eventId || `booking_${bookingId}_state_${newState}`;

  // 2. Verify Event ID lock to prevent any duplicate calls
  const lock = await acquireNotificationEventLock(db, eventId, {
    bookingId,
    state: newState,
    eventType: `booking_state_${newState}`
  });

  if (!lock.acquired) {
    console.log(`[Push-Deduplication] Omitiendo llamada duplicada para reserva ${bookingId} en estado '${newState}' (EventID: ${eventId}, Motivo: ${lock.reason})`);
    return { success: true, sent: false, eventId, reason: lock.reason };
  }

  // 3. Obtain booking data
  let bookingData = options.bookingData;
  if (!bookingData) {
    try {
      const snap = await db.collection('reservas').doc(bookingId).get();
      if (snap.exists) {
        bookingData = snap.data();
      }
    } catch (e: any) {
      console.warn(`[Push-Deduplication] Error leyendo reserva ${bookingId}:`, e?.message);
    }
  }

  if (!bookingData) {
    await markNotificationEventCompleted(db, eventId, { sentCount: 0, error: 'Reserva no encontrada' });
    return { success: false, sent: false, eventId, reason: 'BOOKING_NOT_FOUND' };
  }

  console.log(`[Push-State] Procesando notificación única para reserva ${bookingId} -> estado: '${newState}' (EventID: ${eventId})`);

  let sentCount = 0;
  let primaryChannel: 'fcm' | 'webpush' | 'none' = 'none';
  const recipients: string[] = [];

  try {
    const bookingCode = bookingData.code || bookingId;
    const therapistName = bookingData.therapistName || 'Tu terapeuta';
    const serviceName = bookingData.serviceName || 'Masaje ESSENYA';

    if (newState === 'pendiente') {
      const targetTherapistIds = [
        bookingData.therapistId,
        ...(Array.isArray(bookingData.activeOfferTherapistIds) ? bookingData.activeOfferTherapistIds : [])
      ].filter(Boolean);

      for (const tId of new Set(targetTherapistIds)) {
        recipients.push(tId);
        const res = await sendPushNotificationToUser(db, tId, {
          title: options.customTitle || '🔔 Masaje solicitado',
          body: options.customBody || `${serviceName} en ${bookingData.cityZone || 'tu zona'} (${bookingData.time || 'Ahora'})`,
          url: options.url || `/terapeuta/servicios?bookingId=${bookingId}`,
          tag: options.tag || `booking-offer-${bookingId}`,
          soundPreset: (options.soundPreset || 'bell') as any,
          sound: options.sound || '/sounds/notification_reservation.mp3',
          data: { type: 'NEW_BOOKING', bookingId, bookingCode: String(bookingCode), state: 'pendiente' }
        });
        if (res.sentCount > 0) {
          sentCount += res.sentCount;
          primaryChannel = res.channel || 'fcm';
        }
      }
    } else if (newState === 'aceptada') {
      if (bookingData.clientId) {
        recipients.push(bookingData.clientId);
        const res = await sendPushNotificationToUser(db, bookingData.clientId, {
          title: options.customTitle || '✨ ¡Reserva Confirmada!',
          body: options.customBody || `Tu terapeuta ${therapistName} ha aceptado tu servicio #${bookingCode}.`,
          url: options.url || '/cliente',
          tag: options.tag || `booking-state-${bookingId}`,
          soundPreset: (options.soundPreset || 'classic') as any,
          sound: options.sound || '/sounds/notification_accepted.mp3',
          data: { type: 'booking_accepted', bookingId, bookingCode: String(bookingCode), state: 'aceptada' }
        });
        if (res.sentCount > 0) {
          sentCount += res.sentCount;
          primaryChannel = res.channel || 'fcm';
        }
      }
    } else if (newState === 'en_camino') {
      if (bookingData.clientId) {
        recipients.push(bookingData.clientId);
        const res = await sendPushNotificationToUser(db, bookingData.clientId, {
          title: options.customTitle || '🚗 Terapeuta En Camino',
          body: options.customBody || `${therapistName} va en camino a tu domicilio.`,
          url: options.url || '/cliente',
          tag: options.tag || `booking-state-${bookingId}`,
          soundPreset: (options.soundPreset || 'bell') as any,
          sound: options.sound || '/sounds/notification_arrived.mp3',
          data: { type: 'booking_state_update', bookingId, state: 'en_camino' }
        });
        if (res.sentCount > 0) {
          sentCount += res.sentCount;
          primaryChannel = res.channel || 'fcm';
        }
      }
    } else if (newState === 'llegue') {
      if (bookingData.clientId) {
        recipients.push(bookingData.clientId);
        const res = await sendPushNotificationToUser(db, bookingData.clientId, {
          title: options.customTitle || '📍 ¡Terapeuta Ha Llegado!',
          body: options.customBody || `${therapistName} ha llegado al domicilio.`,
          url: options.url || '/cliente',
          tag: options.tag || `booking-state-${bookingId}`,
          soundPreset: (options.soundPreset || 'alert') as any,
          sound: options.sound || '/sounds/notification_arrived.mp3',
          data: { type: 'booking_state_update', bookingId, state: 'llegue' }
        });
        if (res.sentCount > 0) {
          sentCount += res.sentCount;
          primaryChannel = res.channel || 'fcm';
        }
      }
    } else if (newState === 'servicio_iniciado') {
      if (bookingData.clientId) {
        recipients.push(bookingData.clientId);
        const res = await sendPushNotificationToUser(db, bookingData.clientId, {
          title: options.customTitle || '🌸 Sesión Iniciada',
          body: options.customBody || `Tu masaje ${serviceName} ha comenzado. ¡Disfruta la experiencia ESSENYA!`,
          url: options.url || '/cliente',
          tag: options.tag || `booking-state-${bookingId}`,
          soundPreset: (options.soundPreset || 'soft') as any,
          sound: options.sound || '/sounds/notification_started.mp3',
          data: { type: 'booking_state_update', bookingId, state: 'servicio_iniciado' }
        });
        if (res.sentCount > 0) {
          sentCount += res.sentCount;
          primaryChannel = res.channel || 'fcm';
        }
      }
    } else if (newState === 'servicio_finalizado') {
      if (bookingData.clientId) {
        recipients.push(bookingData.clientId);
        const res = await sendPushNotificationToUser(db, bookingData.clientId, {
          title: options.customTitle || '✨ Sesión Finalizada',
          body: options.customBody || `Tu experiencia ha concluido con éxito. ¡Gracias por confiar en ESSENYA!`,
          url: options.url || '/cliente',
          tag: options.tag || `booking-state-${bookingId}`,
          soundPreset: (options.soundPreset || 'classic') as any,
          sound: options.sound || '/sounds/notification_completed.mp3',
          data: { type: 'booking_state_update', bookingId, state: 'servicio_finalizado' }
        });
        if (res.sentCount > 0) {
          sentCount += res.sentCount;
          primaryChannel = res.channel || 'fcm';
        }
      }
    } else if (newState === 'cancelado') {
      const targetTherapistIds = [
        bookingData.therapistId,
        bookingData.therapistId2,
        ...(Array.isArray(bookingData.therapistIds) ? bookingData.therapistIds : [])
      ].filter(Boolean);

      const cancelReason = options.reason || bookingData.cancellationReason || 'Cancelación de servicio';

      for (const tId of new Set(targetTherapistIds)) {
        recipients.push(tId);
        const res = await sendPushNotificationToUser(db, tId, {
          title: options.customTitle || '⚠️ Cita Cancelada',
          body: options.customBody || `El servicio ${bookingCode} para el ${bookingData.date || 'hoy'} ha sido cancelado. Motivo: ${cancelReason}.`,
          url: options.url || '/terapeuta/servicios',
          tag: options.tag || `booking-cancelled-${bookingId}`,
          soundPreset: (options.soundPreset || 'gentle') as any,
          data: { type: 'booking_cancelled', bookingId }
        });
        if (res.sentCount > 0) {
          sentCount += res.sentCount;
          primaryChannel = res.channel || 'fcm';
        }
      }

      if (bookingData.clientId) {
        recipients.push(bookingData.clientId);
        const res = await sendPushNotificationToUser(db, bookingData.clientId, {
          title: options.customTitle || '⚠️ Cita Cancelada',
          body: options.customBody || `Tu reserva #${bookingCode} ha sido cancelada. Motivo: ${cancelReason}.`,
          url: options.url || '/cliente',
          tag: options.tag || `booking-cancelled-${bookingId}`,
          soundPreset: (options.soundPreset || 'gentle') as any,
          data: { type: 'booking_cancelled', bookingId }
        });
        if (res.sentCount > 0) {
          sentCount += res.sentCount;
          primaryChannel = res.channel || 'fcm';
        }
      }
    } else {
      // Estado genérico
      if (bookingData.clientId) {
        recipients.push(bookingData.clientId);
        const res = await sendPushNotificationToUser(db, bookingData.clientId, {
          title: options.customTitle || 'Actualización de Servicio',
          body: options.customBody || `Tu reserva #${bookingCode} ha cambiado a estado: ${newState}`,
          url: options.url || '/cliente',
          tag: options.tag || `booking-state-${bookingId}`,
          soundPreset: (options.soundPreset || 'classic') as any,
          sound: options.sound || '/sounds/notification_default.mp3',
          data: { type: 'booking_state_update', bookingId, state: newState }
        });
        if (res.sentCount > 0) {
          sentCount += res.sentCount;
          primaryChannel = res.channel || 'fcm';
        }
      }
    }

    // 4. Marcar evento como completado en Firestore y memoria
    await markNotificationEventCompleted(db, eventId, {
      sentCount,
      channel: primaryChannel,
      recipients
    });

    // 5. Registrar en la reserva la última notificación procesada
    await db.collection('reservas').doc(bookingId).set({
      lastNotifiedState: newState,
      lastNotificationEventId: eventId,
      lastNotificationAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});

    return {
      success: true,
      sent: sentCount > 0,
      eventId,
      channel: primaryChannel,
      sentCount
    };
  } catch (err: any) {
    console.error(`[Push-State] Error enviando notificación de estado '${newState}' para reserva ${bookingId}:`, err);
    await markNotificationEventCompleted(db, eventId, {
      sentCount: 0,
      error: err?.message || 'Error en envío de notificación'
    });
    return {
      success: false,
      sent: false,
      eventId,
      reason: err?.message
    };
  }
}


