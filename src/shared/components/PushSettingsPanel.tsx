import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, BellOff, BellRing, RefreshCw, ShieldCheck, AlertTriangle, 
  Clock, CheckCircle2, XCircle, Send, Database, Key, Sparkles, ExternalLink 
} from 'lucide-react';
import { usePush } from '../context/PushContext';
import { 
  isPushSupported, 
  getNotificationPermission, 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications,
  getPendingSubscriptions,
  flushPendingSubscriptions
} from '../services/pushService';
import { vapidKey } from '../../lib/firebase';

export interface PushSettingsPanelProps {
  userId?: string;
  role?: 'client' | 'therapist' | 'admin';
  className?: string;
  onSubscriptionChange?: (subscribed: boolean) => void;
}

export const PushSettingsPanel: React.FC<PushSettingsPanelProps> = ({
  userId = 'anonymous',
  role = 'client',
  className = '',
  onSubscriptionChange
}) => {
  const { 
    supported, 
    subscribed: contextSubscribed, 
    fcmToken,
    enablePush, 
    disablePush,
    testPush 
  } = usePush();

  const [loading, setLoading] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(contextSubscribed);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [endpointPreview, setEndpointPreview] = useState<string | null>(null);
  const [offlinePendingCount, setOfflinePendingCount] = useState<number>(0);

  // Comprobar estado real de PushSubscription en el navegador
  const inspectCurrentSubscription = useCallback(async () => {
    if (!isPushSupported()) return;

    setPermission(getNotificationPermission());

    try {
      // Consultar cola de reintentos en IndexedDB
      const pending = await getPendingSubscriptions();
      setOfflinePendingCount(pending.length);

      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();

        if (sub) {
          setIsSubscribed(true);
          
          // Verificar expiración si el navegador proporciona expirationTime
          if (sub.expirationTime) {
            const isPast = Date.now() > sub.expirationTime;
            setIsExpired(isPast);
            setExpirationDate(new Date(sub.expirationTime).toLocaleString());
          } else {
            setIsExpired(false);
            setExpirationDate('Permanente / Gestionada por el navegador');
          }

          // Ofuscar endpoint para visualización segura
          try {
            const url = new URL(sub.endpoint);
            setEndpointPreview(`${url.protocol}//${url.hostname}/...${sub.endpoint.slice(-8)}`);
          } catch {
            setEndpointPreview(sub.endpoint.slice(0, 30) + '...');
          }
        } else {
          setIsSubscribed(false);
          setEndpointPreview(null);
          setExpirationDate(null);

          // Si el permiso está concedido pero no hay suscripción, caducó o fue invalidada
          if (Notification.permission === 'granted') {
            setIsExpired(true);
          } else {
            setIsExpired(false);
          }
        }
      }
    } catch (err) {
      console.warn('[PushSettingsPanel] Error consultando suscripción:', err);
    }
  }, []);

  useEffect(() => {
    inspectCurrentSubscription();
  }, [inspectCurrentSubscription, contextSubscribed]);

  // Manejar activación manual
  const handleEnable = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await enablePush(userId);
      await inspectCurrentSubscription();

      if (res.success) {
        setIsSubscribed(true);
        setIsExpired(false);
        setMessage({ type: 'success', text: '¡Notificaciones push activadas exitosamente!' });
        onSubscriptionChange?.(true);
      } else {
        setMessage({ type: 'error', text: res.error || 'No se pudo activar la suscripción.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error inesperado al activar.' });
    } finally {
      setLoading(false);
    }
  };

  // Manejar desactivación manual
  const handleDisable = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await disablePush();
      await inspectCurrentSubscription();

      if (res.success) {
        setIsSubscribed(false);
        setIsExpired(false);
        setMessage({ type: 'success', text: 'Notificaciones push desactivadas correctamente.' });
        onSubscriptionChange?.(false);
      } else {
        setMessage({ type: 'error', text: res.error || 'Error al desactivar las notificaciones.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error inesperado al desactivar.' });
    } finally {
      setLoading(false);
    }
  };

  // Manejar re-suscripción forzada (cuando caducó o se requiere renovar)
  const handleResubscribe = async () => {
    setLoading(true);
    setMessage(null);
    try {
      // 1. Desuscribir la clave antigua si existía
      await unsubscribeFromPushNotifications();

      // 2. Renovar suscripción con la clave VAPID oficial
      const res = await subscribeToPushNotifications(userId);
      await inspectCurrentSubscription();

      if (res.success) {
        setIsSubscribed(true);
        setIsExpired(false);
        setMessage({ type: 'success', text: 'Suscripción renovada con éxito con la clave VAPID actual.' });
        onSubscriptionChange?.(true);
      } else {
        setMessage({ type: 'error', text: res.error || 'No se pudo renovar la suscripción.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al re-suscribir.' });
    } finally {
      setLoading(false);
    }
  };

  // Manejar prueba de notificación
  const handleSendTest = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const title = role === 'therapist' 
        ? '🔴 Nueva solicitud de masaje' 
        : role === 'admin'
        ? '🛡️ Alerta de monitor ESSENYA'
        : '🔔 Reserva confirmada';

      const body = role === 'therapist'
        ? 'Tienes una nueva reserva pendiente de atención.'
        : role === 'admin'
        ? 'Prueba del sistema de alertas para administradores.'
        : 'Tu masajista ha confirmado la cita.';

      const res = await testPush(userId, title, body);
      if (res.success) {
        setMessage({ type: 'success', text: 'Notificación de prueba enviada con éxito a este dispositivo.' });
      } else {
        setMessage({ type: 'warning', text: res.error || 'La prueba no pudo enviarse.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al enviar prueba.' });
    } finally {
      setTesting(false);
    }
  };

  // Sincronizar cola IndexedDB manualmente
  const handleFlushOfflineQueue = async () => {
    setLoading(true);
    try {
      const synced = await flushPendingSubscriptions();
      await inspectCurrentSubscription();
      setMessage({ 
        type: 'success', 
        text: synced > 0 
          ? `¡${synced} suscripciones pendientes sincronizadas con el servidor!` 
          : 'Cola de IndexedDB al día.' 
      });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error al sincronizar cola.' });
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className={`bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 ${className}`}>
        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <h3 className="font-serif font-bold text-base">Notificaciones Push No Disponibles</h3>
        </div>
        <p className="text-xs text-[#78716C] dark:text-[#A8A29E]">
          Este navegador o dispositivo no soporta la API nativa de Web Push Notifications o se encuentra en una vista restringida.
        </p>
      </div>
    );
  }

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  return (
    <div className={`bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 ${className}`}>
      
      {/* Header con Estado General */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5DFD3] dark:border-[#262626]">
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
            isSubscribed && !isExpired
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
              : isExpired
              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
              : 'bg-[#C9A55B]/10 text-[#C9A55B] border-[#C9A55B]/30'
          }`}>
            {isSubscribed && !isExpired ? (
              <BellRing className="w-6 h-6 animate-pulse" />
            ) : isExpired ? (
              <Clock className="w-6 h-6 text-amber-500" />
            ) : (
              <BellOff className="w-6 h-6 text-[#78716C]" />
            )}
          </div>

          <div>
            <h3 className="font-serif font-bold text-lg text-[#1C1917] dark:text-white flex items-center gap-2">
              <span>Panel de Control Push</span>
              {/* Badge de Estado */}
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isSubscribed && !isExpired
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : isExpired
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : permission === 'denied'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30'
              }`}>
                {isSubscribed && !isExpired 
                  ? '● Activa' 
                  : isExpired 
                  ? '⚠ Caducada' 
                  : permission === 'denied' 
                  ? '✕ Bloqueada' 
                  : '○ Inactiva'}
              </span>
            </h3>
            <p className="text-xs text-[#78716C] dark:text-[#A8A29E]">
              {role === 'therapist' 
                ? 'Alertas en segundo plano para recepción inmediata de servicios' 
                : role === 'admin'
                ? 'Monitoreo de incidencias y confirmaciones de sistema'
                : 'Seguimiento en vivo de tu masajista y actualizaciones de tu cita'}
            </p>
          </div>
        </div>

        {/* Permiso en el navegador */}
        <div className="flex items-center gap-2 self-start sm:self-center px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#2A2A2A] text-xs">
          <span className="text-[#78716C] dark:text-[#888888]">Permiso:</span>
          <span className={`font-bold ${
            permission === 'granted' 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : permission === 'denied'
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}>
            {permission === 'granted' ? 'Concedido' : permission === 'denied' ? 'Denegado' : 'Pendiente'}
          </span>
        </div>
      </div>

      {/* Mensaje de Feedback */}
      {message && (
        <div className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 animate-fadeIn ${
          message.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            : message.type === 'warning'
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : message.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="font-medium flex-1">{message.text}</span>
        </div>
      )}

      {/* ALERTA: Suscripción Caducada / Expirada */}
      {isExpired && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 space-y-3">
          <div className="flex items-start gap-2.5">
            <Clock className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
            <div className="space-y-1">
              <h4 className="font-bold text-xs">Tu suscripción de notificaciones ha caducado o fue renovada en el servidor</h4>
              <p className="text-[11px] leading-relaxed opacity-90">
                La clave del servidor o el tiempo de vida de la suscripción local expiró. Pulsa el botón de abajo para renovarla instantáneamente con la clave VAPID activa.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResubscribe}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>Re-suscribirme ahora (Renovar con VAPID)</span>
          </button>
        </div>
      )}

      {/* Aviso de Ventana Embebida (Iframe) */}
      {isIframe && permission !== 'granted' && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span>Para activar notificaciones sin restricciones, abre la app en una pestaña directa:</span>
          </div>
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-[#C9A55B] text-black font-bold text-xs flex items-center gap-1 shrink-0"
          >
            <span>Abrir en Pestaña</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Controles Principales de Activación y Desactivación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Botón Principal Activar / Desactivar */}
        <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#2A2A2A] flex flex-col justify-between space-y-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] dark:text-[#888888] block mb-1">
              Interruptor Principal
            </span>
            <p className="text-xs font-semibold text-[#1C1917] dark:text-white">
              {isSubscribed ? 'Notificaciones Push Activas' : 'Notificaciones Push Inactivas'}
            </p>
            <p className="text-[11px] text-[#78716C] dark:text-[#888888] mt-0.5">
              Controla manualmente si este navegador debe recibir alertas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isSubscribed ? (
              <button
                type="button"
                onClick={handleDisable}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
                <span>Desactivar Notificaciones</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnable}
                disabled={loading || permission === 'denied'}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A55B] to-[#D4AF37] hover:from-[#B89448] hover:to-[#C9A55B] text-[#1C1917] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                <span>Activar Notificaciones</span>
              </button>
            )}

            {/* Botón de Re-suscripción disponible en todo momento */}
            <button
              type="button"
              onClick={handleResubscribe}
              disabled={loading}
              title="Forzar actualización de suscripción con la clave VAPID actual"
              className="p-2.5 rounded-xl bg-white dark:bg-[#202020] hover:bg-[#F2ECE1] dark:hover:bg-[#262626] border border-[#E5DFD3] dark:border-[#333333] text-[#C9A55B] transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Prueba Nativa en Vivo */}
        <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#2A2A2A] flex flex-col justify-between space-y-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] dark:text-[#888888] block mb-1">
              Verificación en Vivo
            </span>
            <p className="text-xs font-semibold text-[#1C1917] dark:text-white">
              Prueba de Alerta Nativa
            </p>
            <p className="text-[11px] text-[#78716C] dark:text-[#888888] mt-0.5">
              Envía una notificación real para comprobar el sonido, icono y vibración.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSendTest}
            disabled={testing || !isSubscribed}
            className="self-start px-5 py-2.5 rounded-xl bg-[#C9A55B]/15 hover:bg-[#C9A55B]/25 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/30 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40"
          >
            {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Enviar Notificación de Prueba</span>
          </button>
        </div>

      </div>

      {/* Detalles Técnicos y Cola IndexedDB */}
      <div className="p-4 rounded-2xl bg-[#FAF8F5]/80 dark:bg-[#181818] border border-[#E5DFD3] dark:border-[#262626] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] dark:text-[#888888] flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-[#C9A55B]" />
            <span>Detalles de Suscripción VAPID</span>
          </span>

          {offlinePendingCount > 0 && (
            <button
              type="button"
              onClick={handleFlushOfflineQueue}
              className="text-[10px] font-bold text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Database className="w-3 h-3" />
              <span>{offlinePendingCount} en cola offline (Sincronizar)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-[#78716C] dark:text-[#888888] block">Vigencia / Caducidad:</span>
            <span className="font-mono text-[11px] text-[#1C1917] dark:text-white font-medium">
              {expirationDate || 'Sin suscripción registrada'}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-[#78716C] dark:text-[#888888] block">Endpoint del Navegador:</span>
            <span className="font-mono text-[11px] text-[#78716C] dark:text-[#A8A29E] truncate block">
              {endpointPreview || 'No disponible'}
            </span>
          </div>
        </div>

        {fcmToken && (
          <div className="pt-2 border-t border-[#E5DFD3] dark:border-[#2A2A2A] text-[10px] text-[#78716C] dark:text-[#888888] flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Token FCM vinculado y registrado en Firestore</span>
            </span>
            <span className="font-mono text-[#C9A55B]">
              {fcmToken.slice(0, 10)}...{fcmToken.slice(-6)}
            </span>
          </div>
        )}
      </div>

    </div>
  );
};
