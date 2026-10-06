/**
 * getFirebaseRegistrationToken.ts
 * Utilidad oficial para obtener el token de registro de Firebase (FCM Device Registration Token),
 * imprimirlo resaltado en la consola del navegador y en los logs del servidor para copiarlo fácilmente.
 */

import { getToken } from 'firebase/messaging';
import { getMessagingService, vapidKey, auth } from '../../lib/firebase';
import { registerServiceWorker, getVapidPublicKeyFromServer, urlBase64ToUint8Array } from '../services/pushService';

export interface FirebaseTokenResult {
  success: boolean;
  token?: string;
  error?: string;
}

export async function getFirebaseRegistrationToken(userId?: string): Promise<FirebaseTokenResult> {
  try {
    if (typeof window === 'undefined') {
      return { success: false, error: 'No se puede obtener token en entorno servidor.' };
    }

    if (!('Notification' in window)) {
      const err = 'Este navegador no soporta notificaciones de Firebase.';
      console.warn('[FCM]', err);
      return { success: false, error: err };
    }

    // 1. Verificar o solicitar permiso de notificaciones
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      const err = 'Permiso de notificaciones denegado. Habilita las notificaciones en el navegador para generar el token.';
      console.warn('[FCM]', err);
      return { success: false, error: err };
    }

    // 2. Inicializar servicio de mensajería Firebase
    const messaging = await getMessagingService();
    if (!messaging) {
      const err = 'Firebase Cloud Messaging no es compatible o no se pudo inicializar en este navegador.';
      console.warn('[FCM]', err);
      return { success: false, error: err };
    }

    // 3. Registrar o enlazar Service Worker
    let swRegistration = await registerServiceWorker();
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.ready;
    }

    // 4. Obtener la VAPID Key activa sincronizada con el servidor
    const activeVapidKey = await getVapidPublicKeyFromServer();

    // 5. Detectar y desuscribir de forma segura cualquier PushSubscription nativa previa creada con una VAPID antigua incompatible
    if (swRegistration && 'pushManager' in swRegistration) {
      try {
        const existingSub = await swRegistration.pushManager.getSubscription();
        if (existingSub) {
          const activeBytes = urlBase64ToUint8Array(activeVapidKey);
          const existingKey = existingSub.options?.applicationServerKey;
          let isMatchingKey = false;

          if (existingKey) {
            const existingBytes = new Uint8Array(existingKey);
            if (existingBytes.length === activeBytes.length) {
              isMatchingKey = true;
              for (let i = 0; i < existingBytes.length; i++) {
                if (existingBytes[i] !== activeBytes[i]) {
                  isMatchingKey = false;
                  break;
                }
              }
            }
          }

          if (!isMatchingKey) {
            console.warn('[FCM] Suscripción Push previa desalineada detectada. Eliminando suscripción antigua para sincronizar con la VAPID activa...');
            try {
              const unsubscribed = await existingSub.unsubscribe();
              if (!unsubscribed) {
                console.error('[FCM] Fallo al desuscribir la suscripción Push antigua incompatible.');
              } else {
                console.log('[FCM] Suscripción Push antigua eliminada con éxito. Procediendo a registrar con la VAPID actual.');
              }
            } catch (unsubErr) {
              console.error('[FCM] Error técnico al intentar desuscribir la suscripción antigua:', unsubErr);
            }
          }
        }
      } catch (subCheckErr) {
        console.warn('[FCM] Advertencia al verificar suscripción previa:', subCheckErr);
      }
    }

    // Sincronizar token de autenticación de usuario de Firebase si existe
    if (auth.currentUser) {
      try {
        await auth.currentUser.getIdToken(/* forceRefresh */ false);
      } catch (authErr) {
        console.warn('[FCM] Usuario sin token de autenticación activo antes de FCM:', authErr);
      }
    }

    let currentToken: string | undefined = undefined;

    try {
      currentToken = await getToken(messaging, {
        vapidKey: activeVapidKey,
        serviceWorkerRegistration: swRegistration || undefined
      });
    } catch (tokenErr: any) {
      console.warn('[FCM] Intento de token VAPID servidor:', tokenErr?.message || tokenErr);
      
      // Si falla por token-subscribe-failed, reintentar con la clave VAPID por defecto del cliente
      if (tokenErr?.code === 'messaging/token-subscribe-failed' || tokenErr?.message?.includes('token-subscribe-failed')) {
        try {
          if (vapidKey && vapidKey !== activeVapidKey) {
            currentToken = await getToken(messaging, {
              vapidKey: vapidKey,
              serviceWorkerRegistration: swRegistration || undefined
            });
          }
        } catch (retryErr: any) {
          console.warn('[FCM] Reintento con clave VAPID por defecto:', retryErr?.message || retryErr);
        }
      }
    }

    if (currentToken) {
      // 5. Mostrar en consola con formato destacado para copiar
      console.log('%c========================================================', 'color: #C9A55B; font-weight: bold;');
      console.log('%c🔥 TOKEN DE REGISTRO DE FIREBASE (FCM REGISTRATION TOKEN):', 'color: #10B981; font-weight: bold; font-size: 14px;');
      console.log('%c' + currentToken, 'color: #E2E8F0; background: #0F172A; padding: 6px 10px; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: bold;');
      console.log('%cClave VAPID utilizada: ' + activeVapidKey, 'color: #94A3B8; font-size: 11px;');
      console.log('%cPuedes copiar este token directamente arriba ☝️', 'color: #F59E0B; font-weight: bold;');
      console.log('%c========================================================', 'color: #C9A55B; font-weight: bold;');

      // 6. Transmitir al servidor para que aparezca en los logs del backend con autorización segura
      const reportLogToken = async () => {
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          const idToken = await auth.currentUser?.getIdToken();
          if (idToken) {
            headers['Authorization'] = `Bearer ${idToken}`;
          }
          await fetch('/api/push/log-token', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              token: currentToken,
              userId: auth.currentUser?.uid || userId || 'usuario_local'
            })
          });
        } catch (err) {
          console.warn('[FCM-Diagnostic] No se pudo enviar el token de diagnóstico al servidor:', err);
        }
      };
      reportLogToken();

      // 7. Exponer globalmente en window para acceso instantáneo desde DevTools
      if (typeof window !== 'undefined') {
        (window as any).firebaseRegistrationToken = currentToken;
      }

      return { success: true, token: currentToken };
    } else {
      const err = 'No se pudo generar el token de registro de Firebase. Se utilizará la suscripción Web Push nativa del navegador.';
      console.info('[FCM]', err);
      return { success: false, error: err };
    }
  } catch (error: any) {
    const isSubscribeFailed = error?.code === 'messaging/token-subscribe-failed' || error?.message?.includes('token-subscribe-failed');
    if (isSubscribeFailed) {
      console.warn('[FCM] Suscripción de token FCM directa omitida (usando Web Push estándar del Service Worker):', error?.message || error);
    } else {
      console.warn('[FCM] Nota al obtener el token de registro de Firebase:', error?.message || error);
    }
    return { success: false, error: error?.message || 'Error al obtener token de registro de Firebase.' };
  }
}

// Configurar helpers globales accesibles desde consola del navegador:
if (typeof window !== 'undefined') {
  (window as any).getFirebaseToken = getFirebaseRegistrationToken;
  (window as any).copyFirebaseToken = async () => {
    const res = await getFirebaseRegistrationToken();
    if (res.token && navigator.clipboard) {
      await navigator.clipboard.writeText(res.token);
      console.log('✅ ¡Token copiado al portapapeles exitosamente!');
    }
    return res.token;
  };
}

export default getFirebaseRegistrationToken;
