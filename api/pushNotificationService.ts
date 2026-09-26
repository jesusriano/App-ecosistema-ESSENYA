import path from 'path';
import fs from 'fs';
import webPush from 'web-push';
import type { Firestore } from 'firebase-admin/firestore';

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
 * Sends a native Web Push notification to a specific user (therapist, client, or admin)
 */
export async function sendPushNotificationToUser(
  db: Firestore,
  userId: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; sentCount: number; errors?: any[] }> {
  if (!db || !userId) {
    return { success: false, sentCount: 0 };
  }

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
      url: payload.url || '/',
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
          // Subscription has expired or is invalid
          await doc.ref.delete().catch(() => {});
        } else {
          errors.push({ docId: doc.id, error: err?.message });
        }
      }
    }

    console.log(`[WebPush] Sent ${sentCount} notifications to user ${userId} (${payload.title})`);
    return { success: true, sentCount, errors: errors.length > 0 ? errors : undefined };
  } catch (err: any) {
    console.error(`[WebPush] Error in sendPushNotificationToUser:`, err);
    return { success: false, sentCount: 0, errors: [err?.message] };
  }
}
