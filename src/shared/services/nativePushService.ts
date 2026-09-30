import { Capacitor } from '@capacitor/core';
import { PushNotifications, PermissionStatus } from '@capacitor/push-notifications';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export interface NativePushPermissionResult {
  granted: boolean;
  receive: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied';
}

export interface NativePushRegistrationResult {
  success: boolean;
  token?: string;
  error?: string;
}

let registrationListener: any = null;
let errorListener: any = null;
let receivedListener: any = null;
let actionListener: any = null;
let activeUserId: string | null = null;

export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Checks current push notification permission status on native devices (iOS/Android)
 */
export const checkNativePushPermissions = async (): Promise<NativePushPermissionResult> => {
  if (!Capacitor.isNativePlatform()) {
    const isGranted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
    return {
      granted: isGranted,
      receive: isGranted ? 'granted' : (typeof Notification !== 'undefined' && Notification.permission === 'denied' ? 'denied' : 'prompt')
    };
  }

  try {
    const status: PermissionStatus = await PushNotifications.checkPermissions();
    return {
      granted: status.receive === 'granted',
      receive: status.receive
    };
  } catch (err) {
    console.warn('[NativePushService] Error comprobando permisos nativos:', err);
    return { granted: false, receive: 'prompt' };
  }
};

/**
 * Requests push notification permissions on native devices (iOS/Android)
 */
export const requestNativePushPermissions = async (): Promise<NativePushPermissionResult> => {
  if (!Capacitor.isNativePlatform()) {
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      return {
        granted: perm === 'granted',
        receive: perm === 'granted' ? 'granted' : (perm === 'denied' ? 'denied' : 'prompt')
      };
    }
    return { granted: false, receive: 'denied' };
  }

  try {
    const status: PermissionStatus = await PushNotifications.requestPermissions();
    return {
      granted: status.receive === 'granted',
      receive: status.receive
    };
  } catch (err) {
    console.error('[NativePushService] Error solicitando permisos nativos:', err);
    return { granted: false, receive: 'denied' };
  }
};

/**
 * Registers native push notifications and persists the token directly to Firestore in the user auth flow
 */
export const registerNativePushToken = async (
  userId: string,
  userRole?: string,
  options?: {
    onNotificationReceived?: (notification: any) => void;
    onActionPerformed?: (action: any) => void;
  }
): Promise<NativePushRegistrationResult> => {
  if (!userId) {
    return { success: false, error: 'UserId requerido para registro de push nativo.' };
  }

  activeUserId = userId;

  if (!Capacitor.isNativePlatform()) {
    console.info('[NativePushService] Plataforma no nativa (Web/PWA). El registro nativo se gestiona vía WebPush/FCM.');
    return { success: true };
  }

  try {
    // 1. Verificar/Solicitar permisos
    const perm = await requestNativePushPermissions();
    if (!perm.granted) {
      console.warn('[NativePushService] Permisos de notificaciones nativas denegados por el usuario.');
      return { success: false, error: 'Permisos de notificaciones nativas denegados.' };
    }

    // 2. Limpiar oyentes previos si existen
    await removeNativePushListeners();

    // 3. Registrar oyente de token exitoso
    registrationListener = await PushNotifications.addListener('registration', async (token) => {
      console.log(`[NativePushService] Token APNs/FCM nativo recibido para usuario (${userId}):`, token.value);
      
      const payload = {
        pushToken: token.value,
        fcmToken: token.value,
        devicePlatform: Capacitor.getPlatform(),
        nativePushEnabled: true,
        tokenUpdatedAt: new Date().toISOString()
      };

      try {
        // Guardar token en /users/{userId}
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, payload, { merge: true });

        // Guardar en colección de rol específica
        if (userRole === 'terapeuta') {
          const therapistRef = doc(db, 'terapeutas', userId);
          await setDoc(therapistRef, payload, { merge: true });
        } else if (userRole === 'cliente') {
          const clientRef = doc(db, 'clientes', userId);
          await setDoc(clientRef, payload, { merge: true });
        }

        console.log('[NativePushService] Token nativo guardado exitosamente en Firestore para rol:', userRole || 'general');
      } catch (firestoreErr) {
        console.error('[NativePushService] Error guardando token nativo en Firestore:', firestoreErr);
      }
    });

    // 4. Registrar oyente de errores
    errorListener = await PushNotifications.addListener('registrationError', (err: any) => {
      console.error('[NativePushService] Error en registro de notificaciones nativas:', err);
    });

    // 5. Registrar oyente de notificaciones recibidas en primer plano
    receivedListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[NativePushService] Notificación nativa recibida en primer plano:', notification);
      if (options?.onNotificationReceived) {
        options.onNotificationReceived(notification);
      }
    });

    // 6. Registrar oyente de acciones (clic en notificación)
    actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[NativePushService] Acción de notificación nativa realizada:', action);
      if (options?.onActionPerformed) {
        options.onActionPerformed(action);
      }
    });

    // 7. Solicitar registro oficial a nivel de sistema operativo
    await PushNotifications.register();

    return { success: true };
  } catch (err: any) {
    console.error('[NativePushService] Fallo al iniciar registro de push nativo:', err);
    return { success: false, error: err?.message || 'Error registrando push nativo.' };
  }
};

/**
 * Removes active native push listeners
 */
export const removeNativePushListeners = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    if (registrationListener) {
      await registrationListener.remove();
      registrationListener = null;
    }
    if (errorListener) {
      await errorListener.remove();
      errorListener = null;
    }
    if (receivedListener) {
      await receivedListener.remove();
      receivedListener = null;
    }
    if (actionListener) {
      await actionListener.remove();
      actionListener = null;
    }
  } catch (err) {
    console.warn('[NativePushService] Error al remover oyentes nativos:', err);
  }
};

/**
 * Unregisters native push notifications and cleans up user token on logout
 */
export const unregisterNativePushToken = async (userId?: string): Promise<{ success: boolean }> => {
  const targetId = userId || activeUserId;
  await removeNativePushListeners();

  if (targetId && Capacitor.isNativePlatform()) {
    try {
      const userRef = doc(db, 'users', targetId);
      await setDoc(userRef, {
        nativePushEnabled: false,
        tokenUpdatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('[NativePushService] Error actualizando estado de token nativo al salir:', err);
    }
  }

  activeUserId = null;
  return { success: true };
};
