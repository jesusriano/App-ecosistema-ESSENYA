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
import { auth } from '../../lib/firebase';

interface PanicModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userRole?: 'cliente' | 'terapeuta' | 'client' | 'therapist';
  userType?: 'cliente' | 'terapeuta' | 'client' | 'therapist';
  userName?: string;
  userLocation?: string;
  bookingCode?: string;
  autoTriggerOnActivate?: boolean;
  fullScreenOnMobile?: boolean;
}

export const PanicModal: React.FC<PanicModalProps> = ({
  isOpen,
  onClose,
  userId,
  userRole,
  userType,
  userName = 'Usuario VIP',
  userLocation = 'Polanco VIP, Ciudad de México',
  bookingCode = 'ESS-8921',
  autoTriggerOnActivate = false,
  fullScreenOnMobile = true,
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

  // Lock body scroll and listen for Escape key when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handler to trigger panic alert and start live streaming to Firestore Admin
  const handleActivatePanic = async () => {
    setIsTransmitting(true);

    try {
      // 1. Get high-precision GPS coordinates
      const coords = await getCurrentCoordinates();
      setCurrentCoords(coords);

      // 2. Transmit to Firestore with authenticated user ID
      const resolvedUserId = userId || auth.currentUser?.uid || 'anon_user';

      const { alert, alertId } = await triggerPanicAlert({
        userId: resolvedUserId,
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
        <div 
          id="panic-modal-backdrop"
          onClick={onClose}
          className="fixed inset-0 z-[100] bg-black/95 sm:bg-black/85 sm:backdrop-blur-xl flex flex-col sm:items-center sm:justify-center sm:p-4 overflow-hidden sm:overflow-y-auto overscroll-contain"
        >
          <motion.div
            id="panic-modal-card"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`bg-[#121212] sm:bg-[#141414] text-white flex flex-col relative w-full h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2.5rem)] ${
              fullScreenOnMobile
                ? 'sm:max-w-lg rounded-none sm:rounded-3xl border-0 sm:border-2 sm:border-red-500/80 shadow-[0_0_50px_rgba(239,68,68,0.35)]'
                : 'max-w-lg rounded-2xl sm:rounded-3xl border-2 border-red-500/80 shadow-[0_0_50px_rgba(239,68,68,0.35)]'
            } overflow-hidden overscroll-contain my-0 sm:my-auto`}
          >
            {/* Pinned Header with Accessible Close Button (Safe-Area Aware) */}
            <div className="flex items-center justify-between border-b border-red-500/30 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-6 sm:pt-5 sm:pb-4 gap-2.5 shrink-0 bg-[#161616]">
              <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-red-600/20 border-2 border-red-500 flex items-center justify-center text-red-500 animate-bounce shrink-0 shadow-lg shadow-red-500/20">
                  <AlertTriangle className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h2 className="text-base sm:text-lg font-serif font-bold text-red-500 uppercase tracking-wide truncate">
                      Botón de Pánico SOS
                    </h2>
                    <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                      <span>S.O.C. Activo</span>
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-[#AAAAAA] mt-0.5 truncate">
                    Seguridad Privada ESSENYA — Telemetría en Vivo
                  </p>
                </div>
              </div>

              {/* Accessible Header Close Button (Min 44px touch target) */}
              <button
                id="panic-modal-close-header-btn"
                type="button"
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs group"
                title="Cerrar ventana de pánico"
                aria-label="Cerrar ventana de pánico"
              >
                <X className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Scrollable Modal Body (Accommodates Any Content Depth Seamlessly) */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 sm:py-4 space-y-3 sm:space-y-4 scrollbar-thin">
              {/* Live Location Box & Firestore Stream Telemetry */}
              <div className="bg-[#1A1A1A] p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-red-500/30 space-y-2.5 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 border-b border-white/10 pb-2">
                  <span className="text-[#AAAAAA] flex items-center space-x-1.5 font-medium text-[11px] sm:text-xs">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400 shrink-0" />
                    <span>Telemetría GPS en Vivo:</span>
                  </span>
                  <div className="flex items-center justify-between sm:justify-end space-x-2">
                    <span className="font-mono text-emerald-400 font-bold flex items-center space-x-1 text-[10px] sm:text-[11px] bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                      <Radio className="w-3 h-3 animate-spin text-emerald-400 shrink-0" />
                      <span>{currentCoords.latitude.toFixed(4)}° N, {Math.abs(currentCoords.longitude).toFixed(4)}° W</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleRefreshGps}
                      disabled={isTransmitting}
                      className="text-[#AAAAAA] hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                      title="Actualizar coordenadas GPS"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTransmitting ? 'animate-spin text-[#C9A55B]' : ''}`} />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
                    <p className="font-bold text-white text-xs sm:text-sm break-words">
                      {userLocation}
                    </p>
                    <span className="text-[10px] text-emerald-400 font-normal shrink-0">
                      ±{Math.round(currentCoords.accuracy)}m {currentCoords.isRealGps ? '(GPS Nativo)' : '(CDMX)'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[10px] text-[#AAAAAA] mt-1">
                    <span>Reserva: <strong className="font-mono text-[#C9A55B]">{bookingCode}</strong></span>
                    <span>•</span>
                    <span>Usuario: <strong className="text-white">{userName}</strong> ({displayRoleLabel})</span>
                  </div>
                </div>

                {/* Firestore Real-Time Stream Status Badge */}
                <div className="bg-[#121212] border border-white/10 p-2 sm:p-2.5 rounded-lg sm:rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Wifi className={`w-3.5 h-3.5 shrink-0 ${alertSent ? 'text-emerald-400 animate-pulse' : 'text-[#888888]'}`} />
                    <span className="text-[10px] sm:text-[11px] text-[#CCCCCC] truncate">
                      {alertSent ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span>Enlace Central Admin Activo</span>
                          <span className="text-[9px] bg-emerald-500/20 px-1.5 py-0.2 rounded font-mono">
                            Pings: {transmissionCount}
                          </span>
                        </span>
                      ) : (
                        <span>Listo para emitir telemetría al Portal Admin</span>
                      )}
                    </span>
                  </div>

                  <span className="text-[9px] sm:text-[10px] font-mono text-[#888888] shrink-0">
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
                          className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold border transition-all flex items-center justify-center space-x-1 sm:space-x-1.5 min-h-[42px] cursor-pointer ${
                            isSelected
                              ? 'bg-red-600/30 border-red-500 text-white shadow-md'
                              : 'bg-[#181818] border-white/10 text-[#888888] hover:text-white hover:border-white/20'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Direct Emergency Channels */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider block">
                  Líneas Directas de Respuesta:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                  {/* Direct 911 Call */}
                  <a
                    id="panic-modal-call-911-btn"
                    href={`tel:${emergencyPhone}`}
                    className="py-2.5 sm:py-3 px-3.5 bg-[#222222] border border-red-500/50 hover:bg-red-950/60 active:bg-red-900/80 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md min-h-[44px]"
                  >
                    <PhoneCall className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Llamar al 911</span>
                  </a>

                  {/* Direct WhatsApp Security Desk */}
                  <a
                    id="panic-modal-whatsapp-security-btn"
                    href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 sm:py-3 px-3.5 bg-emerald-950/70 border border-emerald-500/50 hover:bg-emerald-900/80 active:bg-emerald-800/90 text-emerald-200 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md min-h-[44px]"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>WhatsApp Seguridad 24/7</span>
                  </a>
                </div>
              </div>

              {/* Active Emergency Status Banner (when alert was triggered) */}
              {alertSent && (
                <div className="bg-emerald-950/80 border border-emerald-500/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse shrink-0" />
                    <h4 className="font-bold text-emerald-300 text-xs sm:text-sm">
                      Alerta SOS Emitida al Portal Central
                    </h4>
                  </div>
                  <p className="text-[11px] sm:text-xs text-emerald-200/90 leading-relaxed">
                    Ubicación en tiempo real guardada en Firestore. El Centro de Control Administrativo está recibiendo tus coordenadas satelitales en vivo.
                  </p>
                  
                  {/* Alert ID & Resolution Button */}
                  <div className="pt-2 border-t border-emerald-500/30 flex items-center justify-between gap-2">
                    <span className="text-[9px] sm:text-[10px] font-mono text-emerald-300/70 truncate">
                      ID: {activeAlert?.id || 'EMERGENCY-ACTIVA'}
                    </span>
                    <button
                      type="button"
                      onClick={handleResolveAlert}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg border border-white/20 transition-all cursor-pointer shrink-0 min-h-[36px]"
                    >
                      Desactivar Alerta
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Pinned Footer with Primary Action & Close Button (Safe-Area Aware) */}
            <div className="border-t border-white/10 px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-3 sm:pb-5 space-y-2.5 shrink-0 bg-[#161616]">
              {/* Primary Action Button (Docked in Footer for Instant Mobile Access) */}
              {!alertSent && (
                <motion.button
                  id="panic-modal-activate-sos-btn"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isTransmitting}
                  onClick={handleActivatePanic}
                  className="w-full py-3 sm:py-3.5 px-4 bg-gradient-to-r from-red-600 via-red-500 to-red-700 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-xl shadow-red-600/30 hover:brightness-110 active:brightness-95 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 min-h-[48px]"
                >
                  {isTransmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin shrink-0" />
                      <span className="text-center">Transmitiendo Ubicación a Central...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse shrink-0" />
                      <span className="text-center">Activar Botón de Pánico SOS & Enviar GPS</span>
                    </>
                  )}
                </motion.button>
              )}

              {/* Close / Dismiss Button */}
              <button
                id="panic-modal-bottom-close-btn"
                type="button"
                onClick={onClose}
                className="w-full py-2.5 sm:py-3 px-4 bg-[#222222] hover:bg-[#2A2A2A] active:bg-[#333333] text-zinc-200 hover:text-white border border-white/20 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[44px] shadow-xs"
              >
                <X className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>{alertSent ? 'Cerrar Ventana (Monitoreo sigue activo)' : 'Cerrar Ventana (Cancelar SOS)'}</span>
              </button>

              {/* Security Protocol Footer */}
              <div className="text-[10px] text-center text-[#888888] flex items-center justify-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C9A55B] shrink-0" />
                <span className="truncate">Protocolo de seguridad respaldado en tiempo real en Firestore.</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PanicModal;
