import React, { useState } from 'react';
import { usePush } from '../context/PushContext';
import { SoundPreset } from '../services/pushService';
import { Bell, Volume2, VolumeX, CheckCircle2, AlertTriangle, Send, Play, Sparkles } from 'lucide-react';
import { PushSubscriptionButton } from './PushSubscriptionButton';

interface PushSettingsCardProps {
  userId?: string;
  role?: 'client' | 'therapist' | 'admin';
  className?: string;
}

export const PushSettingsCard: React.FC<PushSettingsCardProps> = ({ userId, role = 'client', className = '' }) => {
  const {
    supported,
    permission,
    subscribed,
    soundEnabled,
    soundPreset,
    volume,
    setSoundEnabled,
    setSoundPreset,
    setVolume,
    testPush,
    previewSound
  } = usePush();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedTestEvent, setSelectedTestEvent] = useState<string>('reservation.created');

  if (!supported) {
    return (
      <div className={`bg-[#1C1917]/5 dark:bg-white/5 border border-[#C9A55B]/20 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <h3 className="font-serif font-bold text-base">Notificaciones Push no compatibles</h3>
        </div>
        <p className="text-xs text-[#78716C] dark:text-[#A8A29E]">
          Tu navegador o dispositivo actual no soporta Web Push Notifications nativas en segundo plano. Te recomendamos utilizar un navegador moderno como Google Chrome, Safari o Firefox actualizado.
        </p>
      </div>
    );
  }

  const handleTestEvent = async () => {
    setLoading(true);
    setMessage(null);
    try {
      let title = 'Prueba ESSENYA';
      let body = 'Notificación push en tiempo real.';
      
      if (selectedTestEvent === 'reservation.created') {
        title = role === 'therapist' ? '🔴 Nueva reserva asignada' : '🔔 Reserva solicitada con éxito';
        body = role === 'therapist' ? 'Tienes una nueva solicitud de servicio de masaje.' : 'Tu solicitud de reserva fue enviada correctamente.';
      } else if (selectedTestEvent === 'reservation.accepted') {
        title = '🟢 Reserva confirmada';
        body = 'Tu masajista ha aceptado la reserva y está preparando su salida.';
      } else if (selectedTestEvent === 'therapist.travel_started') {
        title = '🔵 Masajista en camino';
        body = 'Tu masajista ha iniciado el viaje hacia tu ubicación.';
      } else if (selectedTestEvent === 'therapist.arrived') {
        title = '🟣 Masajista ha llegado';
        body = 'Tu masajista ya llegó al punto de la reserva.';
      } else if (selectedTestEvent === 'service.started') {
        title = '🟡 Servicio iniciado';
        body = 'Tu sesión de masaje ha comenzado oficialmente.';
      } else if (selectedTestEvent === 'service.completed') {
        title = '⚪ Servicio finalizado';
        body = 'Tu sesión ha concluido. Gracias por confiar en ESSENYA.';
      }

      // If userId is missing or placeholder 'admin', try to use context's internal real UID if possible
      const targetUid = (userId === 'admin' || !userId) ? undefined : userId;

      const res = await testPush(targetUid, title, body, soundPreset);
      if (res.success) {
        if (res.sentCount === 0) {
          setMessage({ 
            type: 'error', 
            text: 'La suscripción está activa en el navegador, pero no se encontró el registro en el servidor. Por favor, haz clic en "Renovar" para resincronizar.' 
          });
        } else {
          setMessage({ type: 'success', text: `Notificación "${selectedTestEvent}" enviada y probada con éxito.` });
        }
      } else {
        setMessage({ 
          type: 'error', 
          text: res.error || 'Fallo en el servidor al intentar enviar la notificación push.' 
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `Error de red o sistema: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-[#1C1917] border border-[#C9A55B]/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#C9A55B]/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C9A55B]/10 flex items-center justify-center text-[#C9A55B] border border-[#C9A55B]/30">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-[#1C1917] dark:text-white">
              Configuración de Notificaciones Push
            </h3>
            <p className="text-xs text-[#78716C] dark:text-[#A8A29E]">
              {role === 'therapist' 
                ? 'Portal de Masajista — Alertas inmediatas de nuevos servicios y asignaciones' 
                : role === 'admin'
                ? 'Panel de Administración — Alertas críticas de sistema, despachos y monitor de plataforma'
                : 'Portal de Cliente — Ciclo de vida de reservas y seguimiento de masajista en vivo'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#C9A55B]/10 text-[#C9A55B] border border-[#C9A55B]/30">
          <span className="w-2 h-2 rounded-full bg-[#C9A55B] animate-pulse"></span>
          {permission === 'granted' ? 'Permiso Concedido' : permission === 'denied' ? 'Permiso Denegado' : 'Sin configurar'}
        </div>
      </div>

      {message && (
        <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
          message.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Main Push Subscription Control */}
      <div className="space-y-4">
        
        {/* Unified Push Subscription Button */}
        <div className="p-5 rounded-2xl bg-[#F9F8F6] dark:bg-white/5 border border-[#E7E5E4] dark:border-white/10 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C9A55B] animate-pulse"></span>
              <h4 className="text-sm font-bold text-[#1C1917] dark:text-white">
                Gestión Central de Notificaciones Push
              </h4>
            </div>
            <p className="text-xs text-[#78716C] dark:text-[#A8A29E]">
              Gestiona en un solo clic el registro del Service Worker, la autorización de permisos del navegador y la suscripción Web Push con la clave pública VAPID oficial.
            </p>
          </div>

          <PushSubscriptionButton
            userId={userId}
            showDetails={true}
            className="w-full"
            onSuccess={() => {
              setMessage({ type: 'success', text: '¡Suscripción Push con clave VAPID completada y vinculada!' });
            }}
            onError={(err) => {
              setMessage({ type: 'error', text: err });
            }}
          />
        </div>

        {/* Sound Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F9F8F6] dark:bg-white/5 border border-[#E7E5E4] dark:border-white/10">
          <div className="flex items-center gap-3.5">
            {soundEnabled ? <Volume2 className="w-5 h-5 text-[#C9A55B]" /> : <VolumeX className="w-5 h-5 text-[#78716C]" />}
            <div>
              <p className="text-sm font-semibold text-[#1C1917] dark:text-white">
                Sonidos de Notificación
              </p>
              <p className="text-xs text-[#78716C] dark:text-[#A8A29E]">
                Reproducir tonos diferenciados por tipo de evento.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`w-12 h-6 rounded-full transition-colors relative p-1 ${soundEnabled ? 'bg-[#C9A55B]' : 'bg-[#D6D3D1]'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Sound Presets Selection */}
        {soundEnabled && (
          <div className="p-4 rounded-2xl bg-[#F9F8F6] dark:bg-white/5 border border-[#E7E5E4] dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#78716C] dark:text-[#A8A29E]">
                Elegir Tono de Sonido
              </label>
              <button
                onClick={() => previewSound()}
                className="px-3 py-1 rounded-lg bg-[#C9A55B]/10 hover:bg-[#C9A55B]/20 text-[#C9A55B] text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>▶ Probar sonido</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(['classic', 'bell', 'alert', 'soft', 'urgent'] as SoundPreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setSoundPreset(preset);
                    previewSound(preset);
                  }}
                  className={`p-3 rounded-xl border text-xs font-semibold capitalize transition-all text-center ${
                    soundPreset === preset
                      ? 'bg-[#C9A55B] text-[#1C1917] border-[#C9A55B] shadow-md'
                      : 'bg-white dark:bg-white/5 border-[#E7E5E4] dark:border-white/10 text-[#1C1917] dark:text-white hover:border-[#C9A55B]/50'
                  }`}
                >
                  {preset === 'classic' && 'Clásico'}
                  {preset === 'bell' && 'Campana'}
                  {preset === 'alert' && 'Alerta'}
                  {preset === 'soft' && 'Suave'}
                  {preset === 'urgent' && 'Urgente'}
                </button>
              ))}
            </div>

            {/* Volume slider */}
            <div className="pt-2 space-y-1">
              <div className="flex justify-between text-xs text-[#78716C] dark:text-[#A8A29E]">
                <span>Volumen</span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-[#C9A55B] cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Real Push Testing Section */}
        {subscribed && (
          <div className="p-4 rounded-2xl bg-[#C9A55B]/5 border border-[#C9A55B]/30 space-y-3">
            <div className="flex items-center gap-2 text-[#C9A55B]">
              <Sparkles className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Prueba de Notificación Push Real en Segundo Plano</h4>
            </div>
            <p className="text-xs text-[#78716C] dark:text-[#A8A29E]">
              Selecciona un evento del ciclo de vida de la reserva para enviar una notificación nativa de prueba:
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedTestEvent}
                onChange={(e) => setSelectedTestEvent(e.target.value)}
                className="flex-1 bg-white dark:bg-[#1C1917] border border-[#C9A55B]/30 rounded-xl px-3 py-2 text-xs font-medium text-[#1C1917] dark:text-white focus:outline-none"
              >
                <option value="reservation.created">1. Reserva Creada (Solicitud)</option>
                <option value="reservation.accepted">2. Reserva Confirmada (Aceptada)</option>
                <option value="therapist.travel_started">3. Masajista en Camino (Viaje)</option>
                <option value="therapist.arrived">4. Masajista Llegó (Ubicación)</option>
                <option value="service.started">5. Servicio Iniciado (Sesión)</option>
                <option value="service.completed">6. Servicio Finalizado (Fin)</option>
              </select>

              <button
                onClick={handleTestEvent}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-[#C9A55B] hover:bg-[#B89448] text-[#1C1917] text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Push</span>
              </button>
            </div>
          </div>
        )}

        {permission === 'denied' && (
          <p className="text-xs text-rose-600 text-center">
            El permiso de notificaciones fue bloqueado en tu navegador. Debes habilitarlo manualmente desde el icono de configuración o candado en la barra de direcciones.
          </p>
        )}

      </div>

    </div>
  );
};
