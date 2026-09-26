/**
 * getFirebaseRegistrationToken.ts
 * Utilidad oficial para obtener el token de registro de Firebase (FCM Device Registration Token),
 * imprimirlo resaltado en la consola del navegador y en los logs del servidor para copiarlo fácilmente.
 */

import { getToken } from 'firebase/messaging';
import { getMessagingService, vapidKey } from '../../lib/firebase';
import { registerServiceWorker } from '../services/pushService';

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

    // 4. Obtener el Token de Registro con el VAPID Key configurado
    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration || undefined
    });

    if (currentToken) {
      // 5. Mostrar en consola con formato destacado para copiar
      console.log('%c========================================================', 'color: #C9A55B; font-weight: bold;');
      console.log('%c🔥 TOKEN DE REGISTRO DE FIREBASE (FCM REGISTRATION TOKEN):', 'color: #10B981; font-weight: bold; font-size: 14px;');
      console.log('%c' + currentToken, 'color: #E2E8F0; background: #0F172A; padding: 6px 10px; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: bold;');
      console.log('%cClave VAPID utilizada: ' + vapidKey, 'color: #94A3B8; font-size: 11px;');
      console.log('%cPuedes copiar este token directamente arriba ☝️', 'color: #F59E0B; font-weight: bold;');
      console.log('%c========================================================', 'color: #C9A55B; font-weight: bold;');

      // 6. Transmitir al servidor para que aparezca en los logs del backend
      fetch('/api/push/log-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: currentToken,
          userId: userId || 'usuario_local'
        })
      }).catch(() => {});

      // 7. Exponer globalmente en window para acceso instantáneo desde DevTools
      if (typeof window !== 'undefined') {
        (window as any).firebaseRegistrationToken = currentToken;
      }

      return { success: true, token: currentToken };
    } else {
      const err = 'No se pudo generar el token de registro de Firebase. Revisa los permisos y el service worker.';
      console.warn('[FCM]', err);
      return { success: false, error: err };
    }
  } catch (error: any) {
    console.error('🔥 Error al obtener el token de registro de Firebase:', error);
    return { success: false, error: error?.message || 'Error desconocido al obtener token.' };
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
