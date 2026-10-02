import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Check, RefreshCw, AlertTriangle, ShieldCheck, Copy, Sparkles, XCircle } from 'lucide-react';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  urlBase64ToUint8Array,
  unsubscribeFromPushNotifications,
  getVapidPublicKeyFromServer
} from '../services/pushService';
import { vapidKey, getMessagingService, auth } from '../../lib/firebase';
import { getToken } from 'firebase/messaging';
import { usePush } from '../context/PushContext';

interface PushSubscriptionButtonProps {
  userId?: string;
  className?: string;
  variant?: 'primary' | 'minimal' | 'card' | 'badge';
  showDetails?: boolean;
  onSuccess?: (details: { fcmToken?: string; endpoint?: string }) => void;
  onError?: (error: string) => void;
}

export const PushSubscriptionButton: React.FC<PushSubscriptionButtonProps> = ({
  userId = 'anonymous',
  className = '',
  variant = 'primary',
  showDetails = false,
  onSuccess,
  onError
}) => {
  const { subscribed: contextSubscribed, enablePush, disablePush } = usePush();
  const [loading, setLoading] = useState<boolean>(false);
  const [stepStatus, setStepStatus] = useState<string>('');
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(contextSubscribed);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [supported, setSupported] = useState<boolean>(true);

  // Check initial state on mount
  useEffect(() => {
    const isSup = isPushSupported();
    setSupported(isSup);
    if (!isSup) return;

    setPermission(getNotificationPermission());

    // Check existing push subscription
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(async (reg) => {
        try {
          const sub = await reg.pushManager.getSubscription();
          setIsSubscribed(Boolean(sub));
        } catch (e) {
          console.warn('[PushSubscriptionButton] Error al consultar suscripción:', e);
        }
      });
    }
  }, []);

  // Synchronize with context if updated externally
  useEffect(() => {
    setIsSubscribed(contextSubscribed);
  }, [contextSubscribed]);

  /**
   * Pipeline Completo:
   * 1. Registro del Service Worker
   * 2. Solicitud de Permiso del Usuario
   * 3. Suscripción Push con Clave VAPID convertida a Uint8Array
   * 4. Registro y Sincronización en Backend
   */
  const handleSubscribeFlow = async () => {
    if (!supported) {
      const err = 'Las notificaciones push no son compatibles con este navegador.';
      setErrorMsg(err);
      onError?.(err);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // PASO 1: Registrar y asegurar Service Worker activo (con timeout de 2.5s)
      setStepStatus('1/3 Registrando Service Worker...');
      let registration = await registerServiceWorker();
      if (!registration && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
        const readyPromise = navigator.serviceWorker.ready.catch(() => null);
        registration = await Promise.race([readyPromise, timeoutPromise]);
      }
      if (!registration && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        registration = await navigator.serviceWorker.getRegistration().catch(() => null) || null;
      }

      // PASO 2: Solicitar permiso al usuario
      setStepStatus('2/3 Solicitando permiso de notificaciones...');
      const userPerm = await requestNotificationPermission();
      setPermission(userPerm);

      if (userPerm !== 'granted') {
        const isIframe = typeof window !== 'undefined' && window.self !== window.top;
        let userMessage = 'El permiso de notificaciones no fue otorgado.';
        if (isIframe) {
          userMessage = 'Los navegadores bloquean la solicitud de permisos en ventanas embebidas (iframe). Abre la aplicación en una pestaña propia para conceder el permiso.';
        } else if (userPerm === 'denied') {
          userMessage = 'El permiso de notificaciones está bloqueado en tu navegador. Puedes habilitarlo en el icono de candado o configuración del sitio en la barra de URL.';
        } else {
          userMessage = 'La solicitud de permiso fue cerrada. Vuelve a hacer clic para autorizar.';
        }
        setErrorMsg(userMessage);
        setStepStatus('');
        setLoading(false);
        return;
      }

      // PASO 3: Convertir clave VAPID y ejecutar registration.pushManager.subscribe
      setStepStatus('3/3 Suscribiendo con clave VAPID...');
      const activeVapidKey = await getVapidPublicKeyFromServer();
      const convertedVapidKey = urlBase64ToUint8Array(activeVapidKey);

      let sub: PushSubscription | null = null;
      if (registration && 'pushManager' in registration) {
        try {
          sub = await registration.pushManager.getSubscription();
          if (sub) {
            const existingKey = sub.options?.applicationServerKey;
            let match = false;
            if (existingKey) {
              const arr = new Uint8Array(existingKey);
              if (arr.length === convertedVapidKey.length) {
                match = arr.every((val, idx) => val === convertedVapidKey[idx]);
              }
            }
            if (!match) {
              console.log('[PushSubscriptionButton] Clave VAPID diferente detectada. Renovando suscripción...');
              await sub.unsubscribe().catch(() => {});
              sub = null;
            }
          }

          if (!sub) {
            sub = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedVapidKey
            });
          }
        } catch (subErr) {
          console.warn('[PushSubscriptionButton] Error suscribiendo en PushManager:', subErr);
        }
      }

      // Obtener Token de Firebase Cloud Messaging (FCM)
      let currentFcmToken: string | undefined = undefined;
      try {
        const messaging = await getMessagingService();
        if (messaging) {
          const token = await getToken(messaging, {
            vapidKey: activeVapidKey,
            ...(registration ? { serviceWorkerRegistration: registration } : {})
          });
          if (token) {
            currentFcmToken = token;
            setFcmToken(token);
          }
        }
      } catch (fcmErr) {
        console.info('[PushSubscriptionButton] Nota al generar token FCM:', fcmErr);
      }

      // PASO 4: Enviar datos al backend y guardar respaldo en Firestore
      let isSynced = false;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let idToken: string | undefined = undefined;
      try {
        if (auth.authStateReady) await auth.authStateReady();
        idToken = await auth.currentUser?.getIdToken();
        if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      } catch {}

      if (idToken) {
        try {
          const response = await fetch('/api/push/registrations', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              fcmToken: currentFcmToken,
              subscription: sub ? sub.toJSON() : null
            })
          });

          if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.warn('[Push Registrations] Respuesta no exitosa:', {
              status: response.status,
              statusText: response.statusText,
              body: errText
            });
          } else {
            const result = await response.json().catch(() => null);
            if (result && result.success) {
              isSynced = true;
            }
          }
        } catch (netErr) {
          console.warn('[PushSubscriptionButton] Error en API push registrations:', netErr);
        }
      }

      // Respaldo directo en Firestore si el backend devolvió 401 o estuvo inaccesible
      if (userId && userId !== 'anonymous') {
        try {
          const { updateDoc, doc } = await import('firebase/firestore');
          const { db } = await import('../../lib/firebase');
          await updateDoc(doc(db, 'terapeutas', userId), {
            fcmToken: currentFcmToken || null,
            pushSubscribed: true,
            fcmUpdatedAt: new Date().toISOString()
          }).catch(() => {});
          await updateDoc(doc(db, 'users', userId), {
            fcmToken: currentFcmToken || null,
            pushSubscribed: true,
            fcmUpdatedAt: new Date().toISOString()
          }).catch(() => {});
          isSynced = true;
        } catch (dbErr) {
          console.warn('[PushSubscriptionButton] Respaldo Firestore:', dbErr);
        }
      }

      // Actualizar estado general
      setIsSubscribed(true);
      setStepStatus('¡Suscripción Push completada con éxito!');
      enablePush(userId).catch(() => {});

      onSuccess?.({
        fcmToken: currentFcmToken,
        endpoint: sub?.endpoint
      });

    } catch (err: any) {
      const message = err?.message || 'Error al completar el registro y suscripción push.';
      console.warn('[PushSubscriptionButton] Nota en el flujo push:', message);
      setErrorMsg(message);
      onError?.(message);
    } finally {
      setLoading(false);
      setTimeout(() => setStepStatus(''), 4000);
    }
  };

  const handleUnsubscribeFlow = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await unsubscribeFromPushNotifications();
      await disablePush();
      setIsSubscribed(false);
      setFcmToken(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cancelar la suscripción.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyFcm = async () => {
    if (fcmToken && navigator.clipboard) {
      await navigator.clipboard.writeText(fcmToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2500);
    }
  };

  if (!supported) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-medium ${className}`}>
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>Push no compatible en este navegador</span>
      </div>
    );
  }

  // Minimal variant (for headers or compact navbars)
  if (variant === 'minimal') {
    return (
      <button
        onClick={isSubscribed ? handleUnsubscribeFlow : handleSubscribeFlow}
        disabled={loading}
        title={isSubscribed ? 'Notificaciones Push activadas. Clic para desactivar.' : 'Activar Notificaciones Push con clave VAPID'}
        className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
          isSubscribed
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
            : 'bg-[#C9A55B] hover:bg-[#B89448] text-[#1C1917]'
        } disabled:opacity-50 cursor-pointer ${className}`}
      >
        {loading ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : isSubscribed ? (
          <BellRing className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Bell className="w-3.5 h-3.5" />
        )}
        <span>{loading ? 'Conectando...' : isSubscribed ? 'Push Activo' : 'Activar Push'}</span>
      </button>
    );
  }

  // Badge variant
  if (variant === 'badge') {
    return (
      <button
        onClick={handleSubscribeFlow}
        disabled={loading || isSubscribed}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
          isSubscribed
            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
            : 'bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/30 hover:bg-[#C9A55B]/25'
        } ${className}`}
      >
        <span className={`w-2 h-2 rounded-full ${isSubscribed ? 'bg-emerald-500' : 'bg-[#C9A55B] animate-pulse'}`} />
        <span>{loading ? 'Registrando...' : isSubscribed ? 'Notificaciones Activas' : 'Activar Alertas Push'}</span>
      </button>
    );
  }

  // Full Card or Primary button
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={isSubscribed ? handleUnsubscribeFlow : handleSubscribeFlow}
          disabled={loading || permission === 'denied'}
          className={`flex-1 min-w-[200px] px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer ${
            isSubscribed
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
              : 'bg-gradient-to-r from-[#C9A55B] to-[#D4AF37] hover:from-[#B89448] hover:to-[#C9A55B] text-[#1C1917]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{stepStatus || 'Procesando registro y suscripción...'}</span>
            </>
          ) : isSubscribed ? (
            <>
              <ShieldCheck className="w-5 h-5 text-white" />
              <span>Notificaciones Push Activas (Desactivar)</span>
            </>
          ) : (
            <>
              <BellRing className="w-5 h-5" />
              <span>Activar Notificaciones Push (VAPID)</span>
            </>
          )}
        </button>

        {isSubscribed && (
          <button
            type="button"
            onClick={handleSubscribeFlow}
            disabled={loading}
            title="Volver a sincronizar el Service Worker y renovar suscripción con la clave VAPID"
            className="px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#C9A55B] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Renovar</span>
          </button>
        )}
      </div>

      {/* Progress / Step status indicator */}
      {stepStatus && !errorMsg && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 flex-shrink-0 animate-spin" />
          <span>{stepStatus}</span>
        </div>
      )}

      {/* Error / Notice Message */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs space-y-1.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{errorMsg}</p>
              {typeof window !== 'undefined' && window.self !== window.top && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 font-bold text-[#C9A55B] hover:underline"
                >
                  <span>Abrir app en ventana propia para otorgar permiso</span>
                  <span>↗</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Permission Denied Notice */}
      {permission === 'denied' && !errorMsg && (
        <p className="text-xs text-rose-500 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
          ⚠️ El permiso de notificaciones está bloqueado en tu navegador. Haz clic en el ícono de candado o configuración al lado de la URL para desbloquearlo.
        </p>
      )}

      {/* Diagnostic details if enabled or FCM token available */}
      {showDetails && isSubscribed && (
        <div className="p-4 rounded-2xl bg-black/40 border border-[#C9A55B]/20 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Estado de la suscripción:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Activa con VAPID
            </span>
          </div>

          {fcmToken && (
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Token FCM (Registro - Enmascarado):</span>
                <button
                  type="button"
                  onClick={handleCopyFcm}
                  className="text-[11px] text-[#C9A55B] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedToken ? '¡Copiado!' : 'Copiar Token Real'}</span>
                </button>
              </div>
              <p className="font-mono text-[10px] text-slate-300 bg-black/60 p-2 rounded-lg break-all select-all">
                {fcmToken.length > 20 
                  ? `${fcmToken.substring(0, 10)}...${fcmToken.substring(fcmToken.length - 10)}` 
                  : '***'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
