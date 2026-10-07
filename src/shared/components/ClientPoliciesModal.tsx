import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, AlertTriangle, Wallet, Calendar, Lock, 
  X, CheckCircle2, Shield
} from 'lucide-react';
import { LuxuryButton } from './ui/LuxuryButton';
import { EssenyaLogo } from './EssenyaLogo';

interface ClientPoliciesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClientPoliciesModal: React.FC<ClientPoliciesModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'cancelacion' | 'privacidad' | 'seguridad'>('cancelacion');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-white dark:bg-[#141414] border border-[#C9A55B]/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 overflow-hidden text-[#1C1917] dark:text-white"
        >
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#D8B76C] via-[#C9A55B] to-[#806020]" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white hover:bg-[#F5F1EA] dark:hover:bg-[#222222] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="space-y-1.5 pr-8">
            <div className="flex items-center gap-2">
              <EssenyaLogo className="w-6 h-6 text-[#C9A55B]" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#806020] dark:text-[#C9A55B]">
                ESSENYA WELLNESS PRIVÉ
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold">
              Políticas de Privacidad y Cancelación
            </h2>
            <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
              Condiciones oficiales vigentes para reservas, cancelaciones, billetera virtual y tratamiento de datos.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-[#F5F1EA] dark:bg-[#1F1F1F] rounded-2xl border border-[#E5DFD3] dark:border-[#333333] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('cancelacion')}
              className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'cancelacion'
                  ? 'bg-white dark:bg-[#0D0D0D] text-[#806020] dark:text-[#C9A55B] shadow-xs font-bold'
                  : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 shrink-0" />
              <span>Cancelación y Billetera</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('privacidad')}
              className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'privacidad'
                  ? 'bg-white dark:bg-[#0D0D0D] text-[#806020] dark:text-[#C9A55B] shadow-xs font-bold'
                  : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Privacidad</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('seguridad')}
              className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'seguridad'
                  ? 'bg-white dark:bg-[#0D0D0D] text-[#806020] dark:text-[#C9A55B] shadow-xs font-bold'
                  : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Seguridad</span>
            </button>
          </div>

          {/* Tab Content Box */}
          <div className="bg-[#FAF8F5] dark:bg-[#181818] border border-[#E5DFD3] dark:border-[#2A2A2A] rounded-2xl p-4 sm:p-5 max-h-[320px] overflow-y-auto text-xs space-y-4 text-[#1C1917] dark:text-white/90 leading-relaxed shadow-inner">
            {activeTab === 'cancelacion' && (
              <div className="space-y-3.5">
                <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl flex items-start space-x-2.5 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <strong className="block font-bold">Sin devolución en efectivo ni transferencia</strong>
                    <p className="mt-0.5 text-[11px] leading-relaxed">
                      En ESSENYA no realizamos devoluciones monetarias en efectivo ni transferencias bancarias de regreso.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pl-2 border-l-2 border-[#C9A55B]/40">
                  <h4 className="font-bold text-[#806020] dark:text-[#C9A55B] flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Abono a Billetera Virtual (Mín. 5 Horas)</span>
                  </h4>
                  <p className="text-[#6B655F] dark:text-[#CCCCCC]">
                    Con un mínimo de <strong>5 horas de anticipación</strong> a tu cita, el <strong>100% de tu saldo pagado</strong> se abona en tu Billetera Virtual ESSENYA de manera automática para ser usado cuando desees en cualquier servicio (el dinero no se devuelve a la tarjeta bancaria, queda 100% disponible como saldo a favor en la aplicación).
                  </p>
                </div>

                <div className="space-y-1.5 pl-2 border-l-2 border-[#C9A55B]/40">
                  <h4 className="font-bold text-[#806020] dark:text-[#C9A55B] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Reagendación / Modificación Flexible</span>
                  </h4>
                  <p className="text-[#6B655F] dark:text-[#CCCCCC]">
                    Puedes reprogramar tu fecha y hora sin costo alguno con al menos 5 horas de anticipación desde el portal, o modificar tus preferencias de masaje en cualquier momento.
                  </p>
                </div>

                <div className="space-y-1.5 pl-2 border-l-2 border-red-500/40">
                  <h4 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Cancelaciones con Menos de 5 Horas</span>
                  </h4>
                  <p className="text-[#6B655F] dark:text-[#CCCCCC]">
                    Cancelaciones con menos de 5 horas o ausencia en el domicilio no admiten reembolso ni abono a billetera, cubriendo los traslados y el bloqueo exclusivo de agenda de la terapeuta.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'privacidad' && (
              <div className="space-y-3.5">
                <div className="space-y-1.5 pl-2 border-l-2 border-[#C9A55B]/40">
                  <h4 className="font-bold text-[#806020] dark:text-[#C9A55B]">
                    Protección de Datos Personales (LFPDPPP)
                  </h4>
                  <p className="text-[#6B655F] dark:text-[#CCCCCC]">
                    Tus notas de salud, dolencias y teléfono son resguardadas con cifrado y confidencialidad absoluta.
                  </p>
                </div>

                <div className="space-y-1.5 pl-2 border-l-2 border-[#C9A55B]/40">
                  <h4 className="font-bold text-[#806020] dark:text-[#C9A55B]">
                    Privacidad de Domicilio
                  </h4>
                  <p className="text-[#6B655F] dark:text-[#CCCCCC]">
                    Tu ubicación exacta solo es visible para la terapeuta cuando se encuentra en ruta hacia tu servicio.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'seguridad' && (
              <div className="space-y-3.5">
                <div className="space-y-1.5 pl-2 border-l-2 border-[#C9A55B]/40">
                  <h4 className="font-bold text-[#806020] dark:text-[#C9A55B]">
                    Servicios Estrictamente Terapéuticos
                  </h4>
                  <p className="text-[#6B655F] dark:text-[#CCCCCC]">
                    Masajes 100% de relajación, bienestar y descontracturación muscular.
                  </p>
                </div>

                <div className="space-y-1.5 pl-2 border-l-2 border-red-500/40">
                  <h4 className="font-bold text-red-600 dark:text-red-400">
                    Cero Tolerancia a Insinuaciones
                  </h4>
                  <p className="text-[#6B655F] dark:text-[#CCCCCC]">
                    Cualquier falta de respeto faculta la suspensión inmediata del servicio sin reembolso y la baja definitiva de la cuenta.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="pt-1 flex justify-end">
            <LuxuryButton
              type="button"
              variant="gold"
              onClick={onClose}
              size="md"
            >
              Entendido
            </LuxuryButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
