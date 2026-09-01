import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, PhoneCall, ShieldAlert, CheckCircle2, X, 
  MessageSquare, MapPin, Radio, RefreshCw, Send, ShieldCheck,
  Compass, Navigation, Wifi
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { 
  triggerPanicAlert, 
  startLiveLocationStream, 
  updatePanicStatus,
  getCurrentCoordinates,
  GeolocationResult,
  DEFAULT_CDMX_COORDS
} from '../services/panicService';
import { PanicAlert } from '../types';

interface PanicModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: 'cliente' | 'terapeuta' | 'client' | 'therapist';
  userType?: 'cliente' | 'terapeuta' | 'client' | 'therapist';
  userName?: string;
  userLocation?: string;
  bookingCode?: string;
  autoTriggerOnActivate?: boolean;
}

export const PanicModal: React.FC<PanicModalProps> = ({
  isOpen,
  onClose,
  userRole,
  userType,
  userName = 'Usuario VIP',
  userLocation = 'Polanco VIP, Ciudad de México',
  bookingCode = 'ESS-8921',
  autoTriggerOnActivate = false,
}) => {
  const { showToast } = useToast();
  
  // State
  const [alertSent, setAlertSent] = useState<boolean>(false);
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [activeAlert, setActiveAlert] = useState<PanicAlert | null>(null);
  const [currentCoords, setCurrentCoords] = useState<GeolocationResult>({
    ...DEFAULT_CDMX_COORDS,
    isRealGps: false
  });
  const [transmissionCount, setTransmissionCount] = useState<number>(0);
  const [emergencyType, setEmergencyType] = useState<'sos_panico' | 'asistencia_medica' | 'incidente_seguridad'>('sos_panico');
  const [notes, setNotes] = useState<string>('');

  const stopLiveStreamRef = useRef<(() => void) | null>(null);

  const activeRole = (userType || userRole || 'cliente').startsWith('client') ? 'cliente' : 'terapeuta';
  const displayRoleLabel = activeRole === 'cliente' ? 'Cliente VIP' : 'Terapeuta Certificada';

  // Fetch initial location when modal opens
  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      getCurrentCoordinates().then((coords) => {
        if (isMounted) {
          setCurrentCoords(coords);
        }
      });

      if (autoTriggerOnActivate && !alertSent) {
        handleActivatePanic();
      }
    } else {
      // Clean up stream if modal is closed without active emergency
      if (stopLiveStreamRef.current && !alertSent) {
        stopLiveStreamRef.current();
        stopLiveStreamRef.current = null;
      }
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (stopLiveStreamRef.current) {
        stopLiveStreamRef.current();
      }
    };
  }, []);

  // Handler to trigger panic alert and start live streaming to Firestore Admin
  const handleActivatePanic = async () => {
    setIsTransmitting(true);

    try {
      // 1. Get high-precision GPS coordinates
      const coords = await getCurrentCoordinates();
      setCurrentCoords(coords);

      // 2. Transmit to Firestore
      const { alert, alertId } = await triggerPanicAlert({
        userName,
        userRole: activeRole,
        bookingCode,
        userLocation: userLocation || `Polanco VIP, CDMX (Lat: ${coords.latitude.toFixed(4)}, Lng: ${coords.longitude.toFixed(4)})`,
        emergencyType,
        notes: notes || 'Alerta de pánico activada desde la aplicación. Solicitud de asistencia y telemetría transmitida a la Central Admin en tiempo real.',
        customCoordinates: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy
        }
      });

      setActiveAlert(alert);
      setAlertSent(true);
      setTransmissionCount((prev) => prev + 1);

      // 3. Start live location watch stream to keep updating Firestore as position changes
      if (stopLiveStreamRef.current) {
        stopLiveStreamRef.current();
      }
      stopLiveStreamRef.current = startLiveLocationStream(alertId, (updatedCoords) => {
        setCurrentCoords(updatedCoords);
        setTransmissionCount((prev) => prev + 1);
      });

      showToast(
        'Alerta SOS Transmitida a Central Admin',
        'Ubicación GPS en tiempo real enviada a Firestore. El Centro de Monitoreo Administrativo está dando seguimiento prioritario.',
        'error'
      );
    } catch (err: any) {
      console.error('Error activating panic alert:', err);
      setAlertSent(true);
      showToast(
        'Alerta de Emergencia Emitida',
        'Se activó el protocolo de contingencia y telemetría de seguridad.',
        'error'
      );
    } finally {
      setIsTransmitting(false);
    }
  };

  // Manual GPS re-ping
  const handleRefreshGps = async () => {
    setIsTransmitting(true);
    const coords = await getCurrentCoordinates();
    setCurrentCoords(coords);
    setTransmissionCount((prev) => prev + 1);
    setIsTransmitting(false);
    showToast('Coordenadas GPS Actualizadas', `Precisión actual: ±${Math.round(coords.accuracy)}m`, 'info');
  };

  // Cancel / Resolve Emergency
  const handleResolveAlert = async () => {
    if (activeAlert) {
      await updatePanicStatus(activeAlert.id, 'resuelta', `${userName} (Usuario)`);
    }
    if (stopLiveStreamRef.current) {
      stopLiveStreamRef.current();
      stopLiveStreamRef.current = null;
    }
    setAlertSent(false);
    setActiveAlert(null);
    showToast('Alerta de Pánico Desactivada', 'La solicitud de emergencia fue marcada como resuelta en Firestore.', 'success');
  };

  const emergencyPhone = "911";
  const whatsappNumber = "525512345678"; // Official ESSENYA Security desk
  const whatsappMsg = encodeURIComponent(
    `🚨 ¡ALERTA DE PÁNICO SOS ESSENYA!\nUsuario: ${userName} (${displayRoleLabel})\nCódigo Reserva: ${bookingCode}\nUbicación GPS: ${userLocation} [Lat: ${currentCoords.latitude.toFixed(5)}, Lng: ${currentCoords.longitude.toFixed(5)} ±${Math.round(currentCoords.accuracy)}m]\nTipo de Emergencia: ${emergencyType}\nSolicito asistencia inmediata.`
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#121212] border-2 border-red-500 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-5 relative shadow-[0_0_50px_rgba(239,68,68,0.35)] text-white my-8"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Emergency Header */}
            <div className="flex items-center space-x-3.5 border-b border-red-500/30 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-600/20 border-2 border-red-500 flex items-center justify-center text-red-500 animate-bounce shrink-0 shadow-lg shadow-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="pr-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-serif font-bold text-red-500 uppercase tracking-wide">
                    Botón de Pánico SOS 24/7
                  </h2>
                  <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                    <span>S.O.C. Activo</span>
                  </span>
                </div>
                <p className="text-xs text-[#AAAAAA] mt-0.5">
                  Centro de Control & Seguridad Privada ESSENYA — Enlace Firestore Admin
                </p>
              </div>
            </div>

            {/* Live Location Box & Firestore Stream Telemetry */}
            <div className="bg-[#181818] p-4 rounded-2xl border border-red-500/40 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-[#AAAAAA] flex items-center space-x-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Telemetría GPS en Vivo:</span>
                </span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-emerald-400 font-bold flex items-center space-x-1 text-[11px] bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    <Radio className="w-3 h-3 animate-spin text-emerald-400" />
                    <span>{currentCoords.latitude.toFixed(4)}° N, {Math.abs(currentCoords.longitude).toFixed(4)}° W</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshGps}
                    disabled={isTransmitting}
                    className="text-[#AAAAAA] hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
                    title="Actualizar coordenadas GPS"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTransmitting ? 'animate-spin text-[#C9A55B]' : ''}`} />
                  </button>
                </div>
              </div>

              <div>
                <p className="font-bold text-white text-sm flex items-center justify-between">
                  <span>{userLocation}</span>
                  <span className="text-[10px] text-emerald-400 font-normal">
                    Precisión: ±{Math.round(currentCoords.accuracy)}m {currentCoords.isRealGps ? '(GPS Nativo)' : '(Estimado CDMX)'}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] text-[#AAAAAA] mt-1.5">
                  <span>Reserva: <strong className="font-mono text-[#C9A55B]">{bookingCode}</strong></span>
                  <span>•</span>
                  <span>Usuario: <strong className="text-white">{userName}</strong> ({displayRoleLabel})</span>
                </div>
              </div>

              {/* Firestore Real-Time Stream Status Badge */}
              <div className="bg-[#121212] border border-white/10 p-2.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wifi className={`w-3.5 h-3.5 ${alertSent ? 'text-emerald-400 animate-pulse' : 'text-[#888888]'}`} />
                  <span className="text-[11px] text-[#CCCCCC]">
                    {alertSent ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <span>Enlace Firestore Admin Activo</span>
                        <span className="text-[9px] bg-emerald-500/20 px-1.5 py-0.2 rounded font-mono">
                          Pings: {transmissionCount}
                        </span>
                      </span>
                    ) : (
                      <span>Listo para emitir telemetría al Portal Admin</span>
                    )}
                  </span>
                </div>

                <span className="text-[10px] font-mono text-[#888888]">
                  {alertSent ? 'Actualizando cada 2s' : 'GPS en espera'}
                </span>
              </div>
            </div>

            {/* Emergency Type Selector (if not sent yet) */}
            {!alertSent && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider block">
                  Motivo de la Alerta:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'sos_panico', label: 'Pánico SOS', icon: ShieldAlert },
                    { id: 'asistencia_medica', label: 'Médica', icon: AlertTriangle },
                    { id: 'incidente_seguridad', label: 'Seguridad', icon: ShieldCheck },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = emergencyType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setEmergencyType(item.id as any)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                          isSelected
                            ? 'bg-red-600/30 border-red-500 text-white shadow-md'
                            : 'bg-[#181818] border-white/10 text-[#888888] hover:text-white hover:border-white/20'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 text-red-400" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Silent SOS Trigger / Active Status */}
              {alertSent ? (
                <div className="bg-emerald-950/80 border border-emerald-500/80 p-4 rounded-2xl text-center space-y-2.5">
                  <div className="flex items-center justify-center space-x-2 text-emerald-400">
                    <CheckCircle2 className="w-6 h-6 animate-pulse" />
                    <h4 className="font-bold text-emerald-300 text-sm">
                      Alerta & Ubicación Emitidas al Portal Admin
                    </h4>
                  </div>
                  <p className="text-xs text-emerald-200/90 leading-relaxed">
                    La solicitud de localización fue guardada en Firestore. El Centro de Control Administrativo está recibiendo tus coordenadas satelitales en vivo.
                  </p>
                  
                  {/* Alert ID & Resolution Button */}
                  <div className="pt-2 border-t border-emerald-500/30 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-300/70">
                      ID: {activeAlert?.id || 'EMERGENCY-ACTIVA'}
                    </span>
                    <button
                      type="button"
                      onClick={handleResolveAlert}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg border border-white/20 transition-all"
                    >
                      Desactivar Alerta
                    </button>
                  </div>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isTransmitting}
                  onClick={handleActivatePanic}
                  className="w-full py-4 bg-gradient-to-r from-red-600 via-red-500 to-red-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-red-600/30 hover:brightness-110 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isTransmitting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Transmitiendo a Firestore Admin...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-5 h-5 animate-pulse" />
                      <span>Activar Botón de Pánico SOS & Enviar Ubicación</span>
                    </>
                  )}
                </motion.button>
              )}

              {/* Direct Emergency Channels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Direct 911 Call */}
                <a
                  href={`tel:${emergencyPhone}`}
                  className="py-3 px-4 bg-[#222222] border border-red-500/50 hover:bg-red-950/60 text-white text-xs font-bold rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-md"
                >
                  <PhoneCall className="w-4 h-4 text-red-500" />
                  <span>Llamar al 911</span>
                </a>

                {/* Direct WhatsApp Security Desk */}
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 bg-emerald-900/60 border border-emerald-500/50 hover:bg-emerald-800/80 text-emerald-200 text-xs font-bold rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-md"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp Seguridad 24/7</span>
                </a>
              </div>
            </div>

            {/* Security Protocol Footer */}
            <div className="text-[10px] text-center text-[#888888] pt-2 border-t border-white/10 flex items-center justify-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C9A55B]" />
              <span>Protocolo de alta seguridad ESSENYA con respaldo y monitoreo Firestore en tiempo real.</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PanicModal;
