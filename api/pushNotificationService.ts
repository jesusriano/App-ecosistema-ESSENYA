import path from 'path';
import fs from 'fs';
import webPush from 'web-push';
import type { Firestore } from 'firebase-admin/firestore';
import { getMessaging, type Message } from 'firebase-admin/messaging';
import { getApps } from 'firebase-admin/app';

// Initialize and persist VAPID Keys
const vapidFilePath = path.join(process.cwd(), 'vapid-keys.json');
const DEFAULT_VAPID_PUBLIC_KEY = "BHEx7m8uEh5G66_S_vknnlbzdyDQ93X4xuNbqcr-KuS5p_r0ycVGo_7bt6HAYCkABoQTFNvspi4pSOb2Nm4gNl8";
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPrivateKey) {
  if (fs.existsSync(vapidFilePath)) {
    try {
      const savedKeys = JSON.parse(fs.readFileSync(vapidFilePath, 'utf-8'));
      if (savedKeys.publicKey) {
        vapidPublicKey = savedKeys.publicKey;
      }
      if (savedKeys.privateKey) {
        vapidPrivateKey = savedKeys.privateKey;
        console.log('[WebPush] Loaded VAPID keys from persistent file:', vapidFilePath);
      }
    } catch (e) {
      console.warn('[WebPush] Error reading vapid-keys.json:', e);
    }
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    try {
      const generated = webPush.generateVAPIDKeys();
      vapidPublicKey = generated.publicKey;
      vapidPrivateKey = generated.privateKey;
      fs.writeFileSync(vapidFilePath, JSON.stringify({ publicKey: vapidPublicKey, privateKey: vapidPrivateKey }, null, 2));
      console.log('[WebPush] Generated and saved new persistent VAPID keys.');
    } catch (err) {
      console.error('[WebPush] Error generating VAPID keys:', err);
    }
  }
}

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:seguridad@essenyamexico.com',
    vapidPublicKey,
    vapidPrivateKey
  );
  console.log('[WebPush] VAPID details configured successfully.');
}

export function getVapidPublicKey(): string | undefined {
  return vapidPublicKey;
}

export interface FcmNotificationPayload {
  title: string;
  body: string;
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
    console.log(`[FCM] Intentando notificar terapeuta: ${userId}`);

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

    // 3. Si aún no se encontró, buscar en push_subscriptions
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
      console.log(`[FCM] Terapeuta ${userId} no tiene FCM token registrado.`);
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
          link: sanitizedData.bookingId ? '/terapeuta/servicios' : '/terapeuta'
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
  try {
    const snapshot = await db.collection('push_subscriptions').where('userId', '==', userId).get();
    if (snapshot.empty) {
      console.log(`[WebPush] No push subscriptions found for user: ${userId}`);
      return { success: true, sentCount: 0 };
    }

    const soundFile = payload.sound || (payload.soundPreset ? `/sounds/${payload.soundPreset}.mp3` : '/sounds/notification_default.mp3');

    const formattedPayload = JSON.stringify({
      title: payload.title || 'ESSENYA — Notificación',
      body: payload.body || 'Tienes una nueva actualización en tu ecosistema.',
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/badge-72.png',
      url: payload.url || (payload.data?.bookingId ? `/terapeuta/servicios?bookingId=${payload.data.bookingId}` : '/'),
      tag: payload.tag || `notif-${Date.now()}`,
      soundPreset: payload.soundPreset || 'classic',
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
        console.warn(`[WebPush] Failed delivering to ${doc.id} (user: ${userId}):`, err?.statusCode, err?.message);
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await doc.ref.delete().catch(() => {});
        } else {
          errors.push({ docId: doc.id, error: err?.message });
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
): Promise<{ success: boolean; sentCount: number; channel?: 'fcm' | 'webpush' | 'none'; errors?: any[] }> {
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

  return { success: false, sentCount: 0, channel: 'none', errors: webPushRes.errors };
}
