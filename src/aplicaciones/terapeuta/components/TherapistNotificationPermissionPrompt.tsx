import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, BellOff, BellRing, CheckCircle2, ShieldAlert, Smartphone, 
  HelpCircle, ChevronRight, X, ArrowRight, Sparkles, Volume2, Info, Compass,
  RefreshCw, Award, Play, AlertCircle, HeartHandshake
} from 'lucide-react';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  isPushSupported,
  registerServiceWorker,
  urlBase64ToUint8Array,
  getVapidPublicKeyFromServer
} from '../../../shared/services/pushService';
import { usePush } from '../../../shared/context/PushContext';
import { vapidKey, getMessagingService, auth } from '../../../lib/firebase';
import { getToken } from 'firebase/messaging';

interface TherapistNotificationPermissionPromptProps {
  therapistId: string;
  onPermissionGranted?: () => void;
}

type SubscribingStep = 
  | 'idle' 
  | 'sw_register' 
  | 'requesting_permission' 
  | 'subscribing_vapid' 
  | 'fcm_registering' 
  | 'backend_sync' 
  | 'completed' 
  | 'failed';

export const TherapistNotificationPermissionPrompt: React.FC<TherapistNotificationPermissionPromptProps> = ({
  therapistId,
  onPermissionGranted
}) => {
  const pushContext = usePush();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [osType, setOsType] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [showInstructionsModal, setShowInstructionsModal] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return localStorage.getItem('essenya_therapist_push_prompt_dismissed') === 'true';
  });

  // Custom detailed pipeline state
  const [subStep, setSubStep] = useState<SubscribingStep>('idle');
  const [subError, setSubError] = useState<string | null>(null);
  const [testSent, setTestSent] = useState<boolean>(false);
  const [testLoading, setTestLoading] = useState<boolean>(false);

  useEffect(() => {
    setIsSupported(isPushSupported());
    setPermission(getNotificationPermission());

    // Detect operating system
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setOsType('ios');
    } else if (/android/.test(ua)) {
      setOsType('android');
    } else {
      setOsType('desktop');
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('essenya_therapist_push_prompt_dismissed', 'true');
  };

  const resetDismiss = () => {
    setIsDismissed(false);
    localStorage.removeItem('essenya_therapist_push_prompt_dismissed');
  };

  // The custom high-fidelity subscription flow pipeline
  const executeSubscriptionPipeline = async () => {
    if (!isSupported) {
      setSubError('Las notificaciones push no son compatibles con este navegador.');
      setSubStep('failed');
      return;
    }

    setSubError(null);
    try {
      // 1. Service Worker registration (with 2.5s timeout to prevent hanging at 20%)
      setSubStep('sw_register');
      let registration = await registerServiceWorker();
      if (!registration && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
        const readyPromise = navigator.serviceWorker.ready.catch(() => null);
        registration = await Promise.race([readyPromise, timeoutPromise]);
      }
      if (!registration && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        registration = await navigator.serviceWorker.getRegistration().catch(() => null) || null;
      }
      if (!registration) {
        console.warn('[PushOnboarding] No se pudo obtener Service Worker activo, continuando con permisos de sistema.');
      }

      // 2. Request browser permission
      setSubStep('requesting_permission');
      const userPerm = await requestNotificationPermission();
      setPermission(userPerm);

      if (userPerm !== 'granted') {
        const isIframe = typeof window !== 'undefined' && window.self !== window.top;
        if (isIframe) {
          throw new Error('Los navegadores bloquean permisos en ventanas embebidas (iframe). Por favor, abre la aplicación directamente en su pestaña principal.');
        } else if (userPerm === 'denied') {
          throw new Error('El permiso de notificaciones ha sido bloqueado en el navegador. Por favor restablece los permisos haciendo clic en el icono de candado de tu barra de URL.');
        } else {
          throw new Error('La solicitud de permisos fue rechazada o cerrada por el usuario.');
        }
      }

      // 3. VAPID subscription details (sincronizado con el servidor)
      setSubStep('subscribing_vapid');
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
              console.log('[PushOnboarding] VAPID key mismatch. Renewing push subscription...');
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
          console.warn('[PushOnboarding] Error al generar suscripción PushManager:', subErr);
        }
      }

      // 4. Firebase Cloud Messaging (FCM) registration token
      setSubStep('fcm_registering');
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
          }
        }
      } catch (fcmErr: any) {
        console.warn('[PushOnboarding] Error generating FCM token:', fcmErr);
      }

      // 5. Backend & Firestore sync of subscription data
      setSubStep('backend_sync');
      let isSynced = false;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      } catch {}

      try {
        const response = await fetch('/api/push/registrations', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            fcmToken: currentFcmToken || null,
            subscription: sub ? sub.toJSON() : null
          })
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          console.error('[Push Registrations] HTTP error:', {
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
        console.warn('[PushOnboarding] Error llamando API de suscripción:', netErr);
      }

      // Direct Firestore fallback for seamless device linking
      const pushRecipientUid = auth.currentUser?.uid || therapistId;
      if (pushRecipientUid) {
        try {
          const { updateDoc, doc } = await import('firebase/firestore');
          const { db } = await import('../../../lib/firebase');
          await updateDoc(doc(db, 'terapeutas', pushRecipientUid), {
            fcmToken: currentFcmToken || null,
            pushSubscribed: true,
            fcmUpdatedAt: new Date().toISOString()
          }).catch(() => {});
          await updateDoc(doc(db, 'users', pushRecipientUid), {
            fcmToken: currentFcmToken || null,
            pushSubscribed: true,
            fcmUpdatedAt: new Date().toISOString()
          }).catch(() => {});
          isSynced = true;
        } catch (dbErr) {
          console.warn('[PushOnboarding] Respaldo Firestore:', dbErr);
        }
      }

      // Enable push context
      if (pushContext) {
        await pushContext.enablePush(pushRecipientUid).catch(() => {});
      }

      setSubStep('completed');
      onPermissionGranted?.();

    } catch (err: any) {
      console.error('[PushOnboarding] Pipeline failure:', err);
      setSubError(err?.message || 'Error desconocido durante la suscripción push.');
      setSubStep('failed');
    }
  };

  const triggerTestNotification = async () => {
    setTestLoading(true);
    try {
      if (pushContext) {
        const pushRecipientUid = auth.currentUser?.uid || therapistId;
        const result = await pushContext.testPush(
          pushRecipientUid,
          '👑 Alerta de Servicio VIP',
          '¡Felicitaciones! Tu dispositivo está correctamente enlazado para recibir reservas de alto valor en tiempo real.',
          'urgent'
        );
        if (result.success) {
          setTestSent(true);
        }
      }
    } catch (err) {
      console.warn('Error sending test push:', err);
    } finally {
      setTestLoading(false);
    }
  };

  const getPercentageForStep = (step: SubscribingStep): number => {
    switch (step) {
      case 'idle': return 0;
      case 'sw_register': return 20;
      case 'requesting_permission': return 40;
      case 'subscribing_vapid': return 65;
      case 'fcm_registering': return 80;
      case 'backend_sync': return 90;
      case 'completed': return 100;
      case 'failed': return 100;
    }
  };

  const getStepText = (step: SubscribingStep): string => {
    switch (step) {
      case 'sw_register': return 'Iniciando módulo de seguridad (Service Worker)...';
      case 'requesting_permission': return 'Esperando autorización de notificaciones del sistema...';
      case 'subscribing_vapid': return 'Generando llaves criptográficas exclusivas...';
      case 'fcm_registering': return 'Registrando token de alta velocidad en Firebase FCM...';
      case 'backend_sync': return 'Sincronizando dispositivo con tu agenda ESSENYA Cloud...';
      default: return 'Conectando dispositivo...';
    }
  };

  // If permission is already granted, we don't need to show the full prominent banner, 
  // but if it's default/denied, we show it to ensure they don't miss notifications.
  if (permission === 'granted' || !isSupported) {
    return null;
  }

  if (isDismissed) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="bg-[#FFFDF9] dark:bg-[#141310] border border-[#C9A55B]/30 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <BellRing className="w-4 h-4 text-[#C9A55B]" />
            <span className="text-xs text-[#6B655F] dark:text-[#CCCCCC] font-medium">
              Suscripción inactiva. Podrías perder reservas de clientes VIP en tu zona actual.
            </span>
          </div>
          <button 
            onClick={resetDismiss}
            className="text-xs text-[#806020] dark:text-[#C9A55B] font-bold hover:underline cursor-pointer"
          >
            Activar Alertas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      <motion.div 
        layout
        className="relative overflow-hidden bg-gradient-to-br from-[#1C1917] via-[#2A241F] to-[#141210] border border-[#C9A55B]/60 rounded-3xl p-5 sm:p-6 text-white shadow-xl"
      >
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#C9A55B]/10 rounded-full blur-3xl -z-10" />
        
        {/* Close Button */}
        {subStep === 'idle' && (
          <button 
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer z-10"
            title="Descartar por ahora"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        )}

        <AnimatePresence mode="wait">
          {subStep === 'idle' ? (
            <motion.div 
              key="idle-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center"
            >
              <div className="md:col-span-7 space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="bg-[#C9A55B]/20 text-[#C9A55B] text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border border-[#C9A55B]/40 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#C9A55B]" />
                    Suscripción Profesional Push
                  </span>
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border border-emerald-500/20">
                    Altas Ganancias
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-white flex items-center gap-2">
                    <BellRing className="w-5.5 h-5.5 text-[#C9A55B] animate-pulse" />
                    Enlace de Alertas en Tiempo Real
                  </h3>
                  <p className="text-xs sm:text-sm text-[#CCCCCC] leading-relaxed">
                    Habilita la suscripción push autorizada para enlazar tu teléfono con el despachador de ESSENYA. Recibe notificaciones de nuevas reservas VIP al instante sin necesidad de refrescar la app.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5">
                  <div className="flex items-start space-x-2 bg-white/5 p-2.5 rounded-xl border border-white/5">
                    <Volume2 className="w-4 h-4 text-[#C9A55B] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#BBBBBB]">
                      <strong>Canal de Audio Dedicado:</strong> Avisos de voz y sonidos ejecutivos para alertar de inmediato.
                    </p>
                  </div>
                  <div className="flex items-start space-x-2 bg-white/5 p-2.5 rounded-xl border border-white/5">
                    <Compass className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#BBBBBB]">
                      <strong>Actualizaciones de Estado:</strong> Recibe avisos si el cliente VIP cancela o reprograma la cita.
                    </p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 flex flex-col items-stretch space-y-3 bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10">
                <div className="text-center md:text-left">
                  <span className="text-[10px] text-[#AAAAAA] uppercase tracking-wider block font-bold">
                    Seguridad & Enlace:
                  </span>
                  <span className="text-xs font-mono font-bold uppercase inline-block mt-0.5 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ⚙️ Por Enlazar
                  </span>
                </div>

                <button 
                  onClick={executeSubscriptionPipeline}
                  className="w-full text-xs font-bold py-3 px-4 bg-gradient-to-r from-[#C9A55B] to-[#B38F43] hover:from-[#E6CA65] hover:to-[#C9A55B] text-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2 font-semibold cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-black" />
                  <span>Enlazar Mi Dispositivo Ahora</span>
                </button>

                <div className="border-t border-white/10 pt-3 flex items-center justify-between text-[11px] text-[#CCCCCC]">
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-[#C9A55B]" />
                    Guía de {osType === 'ios' ? 'iOS / Safari' : osType === 'android' ? 'Android / Chrome' : 'Escritorio'}
                  </span>
                  <button 
                    onClick={() => setShowInstructionsModal(true)}
                    className="text-[#C9A55B] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    Ver Pasos <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : subStep === 'completed' ? (
            <motion.div 
              key="completed-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 px-4 space-y-4 max-w-lg mx-auto"
            >
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-serif font-bold text-white">
                  ¡Dispositivo Enlazado Exitosamente!
                </h3>
                <p className="text-xs text-[#CCCCCC]">
                  Tu canal de notificaciones push de alta velocidad con ESSENYA Cloud se ha activado correctamente para el terapeuta. Ya puedes recibir alertas automáticas.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={triggerTestNotification}
                  disabled={testLoading || testSent}
                  className={`w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    testSent 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-[#C9A55B] text-black hover:bg-[#B38F43]'
                  }`}
                >
                  {testLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : testSent ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>¡Prueba Enviada! Revisa tu pantalla</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-black fill-black" />
                      <span>Enviar Notificación de Prueba</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDismiss}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold border border-white/20 hover:bg-white/5 rounded-xl transition-all cursor-pointer"
                >
                  Ir a mi Agenda
                </button>
              </div>
            </motion.div>
          ) : subStep === 'failed' ? (
            <motion.div 
              key="failed-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4 max-w-md mx-auto text-center py-4"
            >
              <div className="w-12 h-12 bg-red-500/15 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-red-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base text-white">Error de Enlace Push</h4>
                <p className="text-xs text-[#ECA1A1]">
                  {subError || 'No se pudo completar el registro de suscripción criptográfica.'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={executeSubscriptionPipeline}
                  className="px-4 py-2 bg-white text-black font-bold text-xs rounded-xl hover:bg-white/90 transition-all cursor-pointer"
                >
                  Reintentar Enlace
                </button>
                <button
                  onClick={() => {
                    setSubStep('idle');
                    setSubError(null);
                  }}
                  className="px-4 py-2 border border-white/20 text-white font-bold text-xs rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                >
                  Volver
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="loader-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center space-y-6 max-w-md mx-auto"
            >
              <div className="relative w-16 h-16 mx-auto">
                {/* Custom glowing spinner */}
                <div className="absolute inset-0 rounded-full border-4 border-[#C9A55B]/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-[#C9A55B] border-t-transparent animate-spin"></div>
                <div className="absolute inset-2 bg-[#C9A55B]/10 rounded-full flex items-center justify-center text-[#C9A55B]">
                  <Bell className="w-5 h-5 animate-pulse" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[#C9A55B] tracking-widest font-extrabold animate-pulse">
                    ENLACE EN PROGRESO — {getPercentageForStep(subStep)}%
                  </span>
                  <h4 className="font-serif font-bold text-base text-white">
                    Registrando Dispositivo
                  </h4>
                  <p className="text-xs text-[#BBBBBB] italic">
                    {getStepText(subStep)}
                  </p>
                </div>

                {/* Elegant gold progress bar */}
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${getPercentageForStep(subStep)}%` }}
                    transition={{ duration: 0.3 }}
                    className="bg-gradient-to-r from-[#C9A55B] to-[#E6CA65] h-full"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>

      {/* Instructions Overlay Modal for extreme clarity */}
      <AnimatePresence>
        {showInstructionsModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1C1917] border border-[#C9A55B] w-full max-w-md rounded-3xl overflow-hidden text-white"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-[#C9A55B]" />
                  <h4 className="font-serif font-bold text-base text-white">
                    Guía de Configuración Móvil
                  </h4>
                </div>
                <button 
                  onClick={() => setShowInstructionsModal(false)}
                  className="p-1 text-white/50 hover:text-white rounded-full hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-4 text-xs text-[#DDDDDD] max-h-[75vh] overflow-y-auto">
                {osType === 'ios' ? (
                  <div className="space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-amber-200">
                      <span className="font-bold block text-sm">✓ Requisito PWA en Apple</span>
                      iOS de Apple (iPhone) exige que agregues la aplicación a tu pantalla de inicio como PWA para poder recibir notificaciones push.
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#C9A55B]/20 text-[#C9A55B] font-bold flex items-center justify-center shrink-0">1</span>
                        <div>
                          <p className="font-bold text-white text-sm">Instalar PWA primero</p>
                          <p className="text-[#AAAAAA] mt-0.5">Toca el botón <span className="font-semibold text-white">"Compartir" 𐂃</span> de Safari en tu iPhone y selecciona <span className="font-semibold text-white">"Agregar al Inicio" ➕</span>.</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#C9A55B]/20 text-[#C9A55B] font-bold flex items-center justify-center shrink-0">2</span>
                        <div>
                          <p className="font-bold text-white text-sm">Abrir desde Pantalla de Inicio</p>
                          <p className="text-[#AAAAAA] mt-0.5">Inicia ESSENYA desde el icono en tu pantalla de inicio e inicia sesión con tus credenciales de terapeuta.</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#C9A55B]/20 text-[#C9A55B] font-bold flex items-center justify-center shrink-0">3</span>
                        <div>
                          <p className="font-bold text-white text-sm">Permitir Notificaciones</p>
                          <p className="text-[#AAAAAA] mt-0.5">Toca <span className="text-[#C9A55B] font-bold">"Activar Alertas"</span> y acepta la ventana emergente oficial de iOS para terminar.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : osType === 'android' ? (
                  <div className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-emerald-200">
                      <span className="font-bold block text-sm">✓ Óptimo para Android</span>
                      Android admite alertas push de inmediato. Sigue estos pasos para un funcionamiento impecable en segundo plano.
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#C9A55B]/20 text-[#C9A55B] font-bold flex items-center justify-center shrink-0">1</span>
                        <div>
                          <p className="font-bold text-white text-sm">Otorgar permiso directo</p>
                          <p className="text-[#AAAAAA] mt-0.5">Toca el botón <span className="text-[#C9A55B] font-bold">"Activar Alertas"</span> de la pantalla anterior y presiona "Permitir" cuando Google Chrome o tu navegador lo solicite.</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#C9A55B]/20 text-[#C9A55B] font-bold flex items-center justify-center shrink-0">2</span>
                        <div>
                          <p className="font-bold text-white text-sm">Optimización de Batería</p>
                          <p className="text-[#AAAAAA] mt-0.5">Para evitar que el teléfono apague la app en segundo plano, ve a <span className="font-semibold text-white">Ajustes &gt; Aplicaciones &gt; ESSENYA &gt; Batería</span> y configúrala como <span className="font-semibold text-white">"Sin Restricciones"</span>.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="font-bold text-white">Configuración rápida en computadoras:</p>
                    <p className="text-[#AAAAAA]">1. Haz clic en el botón de suscripción de la pantalla anterior.</p>
                    <p className="text-[#AAAAAA]">2. Confirma la ventana de alerta que muestra tu navegador en la esquina superior izquierda.</p>
                    <p className="text-[#AAAAAA]">3. Si no aparece, haz clic en el candado <span className="font-mono">🔒</span> junto a la dirección del sitio y habilita "Notificaciones".</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-white/10 bg-white/2 flex justify-end">
                <button 
                  onClick={() => setShowInstructionsModal(false)}
                  className="px-4 py-2 bg-[#C9A55B] text-black font-bold text-xs rounded-xl hover:bg-[#B38F43] transition-all cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
