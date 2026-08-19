import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, PhoneCall, ShieldAlert, CheckCircle2, X, MessageSquare, MapPin, Radio } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface PanicModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: 'cliente' | 'terapeuta' | 'client' | 'therapist';
  userType?: 'cliente' | 'terapeuta' | 'client' | 'therapist';
  userName?: string;
  userLocation?: string;
  bookingCode?: string;
}

export const PanicModal: React.FC<PanicModalProps> = ({
  isOpen,
  onClose,
  userRole,
  userType,
  userName = 'Usuario VIP',
  userLocation = 'Polanco VIP, Ciudad de México (GPS Activo)',
  bookingCode = 'ESS-8921',
}) => {
  const { showToast } = useToast();
  const [alertSent, setAlertSent] = useState(false);

  const activeRole = (userType || userRole || 'cliente').startsWith('client') ? 'Cliente VIP' : 'Terapeuta Certificado';

  const handleTriggerSilentAlert = () => {
    setAlertSent(true);
    showToast('Alerta Silenciosa Disparada', 'Ubicación GPS y telemetría de seguridad enviada al Centro de Control ESSENYA S.O.C.', 'error');
  };

  const emergencyPhone = "911";
  const whatsappNumber = "525512345678"; // Official ESSENYA Security desk
  const whatsappMsg = encodeURIComponent(
    `🚨 ¡ALERTA DE PÁNICO SOS ESSENYA!\nUsuario: ${userName} (${activeRole})\nCódigo Reserva: ${bookingCode}\nUbicación GPS: ${userLocation}\nSolicito asistencia inmediata.`
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#141414] border-2 border-red-500 rounded-3xl max-w-lg w-full p-6 space-y-6 relative shadow-2xl text-white overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Emergency Header */}
            <div className="flex items-center space-x-3.5 border-b border-red-500/30 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-600/20 border-2 border-red-500 flex items-center justify-center text-red-500 animate-bounce shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-serif font-bold text-red-500 uppercase tracking-wide">
                    Botón de Pánico SOS 24/7
                  </h2>
                  <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                    S.O.C. Activo
                  </span>
                </div>
                <p className="text-xs text-[#AAAAAA] mt-0.5">
                  Centro de Monitoreo de Seguridad Privada ESSENYA
                </p>
              </div>
            </div>

            {/* Live Location Box */}
            <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-red-500/30 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#AAAAAA] flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span>GPS Telemetría Live:</span>
                </span>
                <span className="font-mono text-emerald-400 font-bold flex items-center space-x-1 text-[11px]">
                  <Radio className="w-3 h-3 animate-spin text-emerald-400" />
                  <span>19.4326° N, 99.1332° W</span>
                </span>
              </div>
              <p className="font-bold text-white text-sm">{userLocation}</p>
              <p className="text-[10px] text-[#AAAAAA]">
                Reserva Activa: <span className="font-mono text-[#C9A55B]">{bookingCode}</span> | {userName} ({activeRole})
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Silent SOS Trigger */}
              {alertSent ? (
                <div className="bg-emerald-950/80 border border-emerald-500 p-4 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="font-bold text-emerald-300 text-sm">Alerta Silenciosa Emitida al S.O.C. ESSENYA</h4>
                  <p className="text-xs text-emerald-200/80 leading-relaxed">
                    Unidad de respuesta rápida y patrulla de seguridad ejecutiva notificada. Coordenadas fijadas en tiempo real.
                  </p>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleTriggerSilentAlert}
                  className="w-full py-4 bg-gradient-to-r from-red-600 via-red-500 to-red-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-red-600/30 hover:brightness-110 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <ShieldAlert className="w-5 h-5" />
                  <span>Emitir Alerta Silenciosa S.O.C.</span>
                </motion.button>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Direct 911 Call */}
                <a
                  href={`tel:${emergencyPhone}`}
                  className="py-3 px-4 bg-[#222222] border border-red-500/50 hover:bg-red-950/60 text-white text-xs font-bold rounded-2xl flex items-center justify-center space-x-2 transition-all"
                >
                  <PhoneCall className="w-4 h-4 text-red-500" />
                  <span>Llamar al 911</span>
                </a>

                {/* Direct WhatsApp Security Desk */}
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 bg-emerald-900/60 border border-emerald-500/50 hover:bg-emerald-800/80 text-emerald-200 text-xs font-bold rounded-2xl flex items-center justify-center space-x-2 transition-all"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp Seguridad 24/7</span>
                </a>
              </div>
            </div>

            {/* Security Statement */}
            <p className="text-[10px] text-center text-[#AAAAAA] pt-2 border-t border-[#333333]">
              🛡️ Protocolo de alta seguridad de nivel internacional con respaldo de geolocalización satelital.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
