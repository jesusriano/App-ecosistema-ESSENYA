import React, { useState } from 'react';
import { usePush } from '../context/PushContext';
import { SoundPreset } from '../services/pushService';
import { Bell, BellOff, Volume2, VolumeX, CheckCircle2, AlertTriangle, Send, RefreshCw, Play, Sparkles, Key, Copy, Check } from 'lucide-react';

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
    fcmToken: contextFcmToken,
    getRegistrationToken,
    soundEnabled,
    soundPreset,
    volume,
    setSoundEnabled,
    setSoundPreset,
    setVolume,
    enablePush,
    disablePush,
    testPush,
    previewSound
  } = usePush();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedTestEvent, setSelectedTestEvent] = useState<string>('reservation.created');
  const [fcmToken, setFcmToken] = useState<string | null>(contextFcmToken);
  const [loadingFcm, setLoadingFcm] = useState<boolean>(false);
  const [copiedFcm, setCopiedFcm] = useState<boolean>(false);

  const handleFetchFcmToken = async () => {
    setLoadingFcm(true);
    const token = await getRegistrationToken(userId);
    if (token) {
      setFcmToken(token);
    }
    setLoadingFcm(false);
  };

  const handleCopyFcmToken = async () => {
    if (fcmToken && navigator.clipboard) {
      await navigator.clipboard.writeText(fcmToken);
      setCopiedFcm(true);
      setTimeout(() => setCopiedFcm(false), 2500);
    }
  };

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

  const handleTogglePush = async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (subscribed) {
        const res = await disablePush();
        if (res.success) {
          setMessage({ type: 'success', text: 'Notificaciones push desactivadas correctamente.' });
        } else {
          setMessage({ type: 'error', text: res.error || 'Error al desactivar.' });
        }
      } else {
        const res = await enablePush(userId);
        if (res.success) {
          setMessage({ type: 'success', text: '¡Notificaciones push activadas y dispositivo registrado!' });
        } else {
          setMessage({ type: 'error', text: res.error || 'No se pudieron activar las notificaciones.' });
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error inesperado.' });
    } finally {
      setLoading(false);
    }
  };

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

      const res = await testPush(userId, title, body, soundPreset);
      if (res.success) {
        setMessage({ type: 'success', text: `Notificación "${selectedTestEvent}" enviada y probada con éxito.` });
      } else {
        setMessage({ type: 'error', text: res.error || 'Error al enviar prueba.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
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
              {role === 'therapist' ? 'Portal de Masajista — Alertas de servicio y nuevos clientes' : 'Portal de Cliente — Ciclo de vida de reservas y masajista en vivo'}
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

      {/* Main Toggles */}
      <div className="space-y-4">
        
        {/* Push Active Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F9F8F6] dark:bg-white/5 border border-[#E7E5E4] dark:border-white/10">
          <div className="flex items-center gap-3.5">
            {subscribed ? <Bell className="w-5 h-5 text-emerald-600" /> : <BellOff className="w-5 h-5 text-[#78716C]" />}
            <div>
              <p className="text-sm font-semibold text-[#1C1917] dark:text-white">
                {subscribed ? 'Notificaciones Push Externas Activas' : 'Activar Notificaciones Push'}
              </p>
              <p className="text-xs text-[#78716C] dark:text-[#A8A29E]">
                Recibe alertas nativas en segundo plano, fuera de la aplicación.
              </p>
            </div>
          </div>
          <button
            onClick={handleTogglePush}
            disabled={loading || permission === 'denied'}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              subscribed
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-[#C9A55B] hover:bg-[#B89448] text-[#1C1917]'
            } disabled:opacity-50`}
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : subscribed ? 'Desactivar' : 'Activar Push'}
          </button>
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

        {/* Firebase Registration Token (FCM) Diagnostic Box */}
        <div className="p-4 rounded-2xl bg-[#0F172A] border border-cyan-500/30 text-white space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400">
              <Key className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Token de Registro de Firebase (FCM)</h4>
            </div>
            {fcmToken && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                ✓ Listo para copiar
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-300">
            Obtén el token de registro de este dispositivo/navegador para enviar notificaciones directas desde Firebase Console o inspeccionar en los logs del sistema.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <button
              type="button"
              onClick={handleFetchFcmToken}
              disabled={loadingFcm}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{loadingFcm ? 'Obteniendo Token...' : 'Obtener Token FCM'}</span>
            </button>

            {fcmToken && (
              <button
                type="button"
                onClick={handleCopyFcmToken}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#C9A55B] hover:bg-[#E6CA65] text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                {copiedFcm ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedFcm ? '¡Copiado al Portapapeles!' : 'Copiar Token'}</span>
              </button>
            )}
          </div>

          {fcmToken && (
            <div className="mt-2 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono">Token activo (también registrado en consola):</span>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-cyan-300 break-all select-all">
                {fcmToken}
              </div>
            </div>
          )}
        </div>

        {permission === 'denied' && (
          <p className="text-xs text-rose-600 text-center">
            El permiso de notificaciones fue bloqueado en tu navegador. Debes habilitarlo manualmente desde el icono de configuración o candado en la barra de direcciones.
          </p>
        )}

      </div>

    </div>
  );
};
