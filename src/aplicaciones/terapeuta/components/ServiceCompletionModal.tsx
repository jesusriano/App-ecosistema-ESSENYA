import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Sparkles, DollarSign, Clock, User, HeartHandshake, ArrowRight, X } from 'lucide-react';
import { Booking } from '../../../shared/types';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';

interface ServiceCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onViewHistory?: () => void;
  onSendPostCare?: () => void;
}

export const ServiceCompletionModal: React.FC<ServiceCompletionModalProps> = ({
  isOpen,
  onClose,
  booking,
  onViewHistory,
  onSendPostCare,
}) => {
  if (!booking) return null;

  const earnings = booking.total ?? booking.price ?? 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop with subtle blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="relative w-full max-w-lg bg-[#FAF8F5] dark:bg-[#141414] border-2 border-[#C9A55B] rounded-3xl shadow-2xl shadow-[#C9A55B]/15 overflow-hidden text-[#1C1917] dark:text-white p-6 sm:p-8 z-10 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Glowing Golden Badge & Animated Particles */}
            <div className="flex flex-col items-center text-center space-y-3 relative pt-2">
              {/* Floating Sparkles Background */}
              <div className="absolute -top-4 w-32 h-32 flex items-center justify-center pointer-events-none">
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0.5, 0.2] }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                  className="w-24 h-24 rounded-full bg-[#C9A55B]/25 blur-xl"
                />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 16, ease: 'linear' }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Sparkles className="w-4 h-4 text-[#C9A55B] absolute -top-1 left-2 animate-pulse" />
                  <Sparkles className="w-3.5 h-3.5 text-[#E6CA65] absolute -bottom-1 right-3 animate-pulse" />
                </motion.div>
              </div>

              {/* Animated Check Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.1, stiffness: 380, damping: 22 }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#806020] via-[#C9A55B] to-[#F3E1A2] p-0.5 shadow-xl shadow-[#C9A55B]/30 flex items-center justify-center"
              >
                <div className="w-full h-full bg-[#FAF8F5] dark:bg-[#1A1A1A] rounded-[14px] flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-[#C9A55B]" />
                </div>
              </motion.div>

              <div className="space-y-1">
                <motion.span
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  className="inline-block text-[11px] uppercase tracking-widest font-extrabold text-[#806020] dark:text-[#C9A55B] bg-[#C9A55B]/15 px-3 py-1 rounded-full border border-[#C9A55B]/30"
                >
                  ¡Servicio Finalizado con Éxito!
                </motion.span>
                <motion.h3
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 }}
                  className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] dark:text-white"
                >
                  {booking.serviceName}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.26 }}
                  className="text-xs text-[#6B655F] dark:text-[#AAAAAA] max-w-sm mx-auto"
                >
                  Has completado la sesión cumpliendo con los estándares de excelencia ESSENYA. La ganancia ha sido registrada.
                </motion.p>
              </div>
            </div>

            {/* Financial & Session Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-[#1C1C1C] border border-[#E5DFD3] dark:border-[#333333] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm"
            >
              <div className="flex justify-between items-center pb-3 border-b border-[#E5DFD3] dark:border-[#2A2A2A]">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-[#C9A55B]" />
                  <span className="text-xs font-semibold text-[#1C1917] dark:text-white">
                    Cliente: <strong>{booking.clientName}</strong>
                  </span>
                </div>
                <span className="font-mono text-[11px] font-bold text-[#806020] dark:text-[#C9A55B]">
                  #{booking.code || booking.id}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#FAF8F5] dark:bg-[#141414] p-3 rounded-xl border border-[#E5DFD3] dark:border-[#262626] space-y-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-[#6B655F] dark:text-[#888888] flex items-center gap-1 font-semibold">
                    <Clock className="w-3 h-3 text-[#C9A55B]" />
                    Duración
                  </span>
                  <p className="font-bold text-sm text-[#1C1917] dark:text-white">
                    {booking.durationMinutes} min
                  </p>
                </div>

                <div className="bg-[#FAF8F5] dark:bg-[#141414] p-3 rounded-xl border border-[#C9A55B]/30 space-y-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-[#806020] dark:text-[#C9A55B] flex items-center gap-1 font-semibold">
                    <DollarSign className="w-3 h-3 text-[#C9A55B]" />
                    Ganancia Registrada
                  </span>
                  <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    +${earnings.toLocaleString()} MXN
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="space-y-2.5 pt-1"
            >
              {onSendPostCare && (
                <LuxuryButton
                  variant="gold"
                  size="md"
                  className="w-full justify-center text-xs py-3"
                  onClick={() => {
                    onClose();
                    onSendPostCare();
                  }}
                >
                  <HeartHandshake className="w-4 h-4 mr-1.5" />
                  <span>Emitir Recomendación Post-Care</span>
                </LuxuryButton>
              )}

              <div className="flex gap-2">
                {onViewHistory && (
                  <button
                    onClick={() => {
                      onClose();
                      onViewHistory();
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#C9A55B]/40 text-[#806020] dark:text-[#C9A55B] hover:bg-[#C9A55B]/10 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Ver Historial</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[#1C1917] dark:text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
