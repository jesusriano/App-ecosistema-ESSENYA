import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Clock, X, CheckCircle2, RefreshCw, ShieldAlert, HeartHandshake } from 'lucide-react';
import { Booking } from '../../../shared/types';
import { checkCancellationEligibility } from '../../../shared/data/catalog';
import { WhatsAppButton } from '../../../shared/components/WhatsAppButton';

interface CancelBookingModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (bookingId: string, reason: string) => Promise<void> | void;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  booking,
  isOpen,
  onClose,
  onConfirmCancel,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('Cambio de planes personales');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !booking) return null;

  const eligibility = checkCancellationEligibility(booking.date, booking.time, booking.state);

  const reasonOptions = [
    'Cambio de planes personales',
    'Imprevisto laboral o de fuerza mayor',
    'Indisposición o tema de salud',
    'Deseo reprogramar para otra fecha',
    'Otro motivo'
  ];

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eligibility.canCancel) return;

    setIsSubmitting(true);
    try {
      const finalReason = selectedReason === 'Otro motivo' && customReason.trim()
        ? customReason.trim()
        : selectedReason;
      await onConfirmCancel(booking.id, finalReason);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#C9A55B]/30 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative text-left"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-full transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          {eligibility.canCancel ? (
            /* CANCEL PERMITTED (UP TO 5 HOURS BEFORE) */
            <form onSubmit={handleConfirm} className="space-y-4">
              <div className="flex items-center space-x-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-[#1C1917] dark:text-white">
                    Cancelar Cita de Masaje
                  </h3>
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Plazo Válido (Más de 5 horas de anticipación)
                  </span>
                </div>
              </div>

              {/* Service details summary */}
              <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-4 rounded-2xl border border-[#E5DFD3] dark:border-[#262626] space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-[#E5DFD3] dark:border-[#262626] pb-2">
                  <span className="text-[#6B655F] dark:text-[#AAAAAA]">Cita Programada:</span>
                  <span className="font-mono font-bold text-[#806020] dark:text-[#C9A55B]">#{booking.code}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B655F] dark:text-[#AAAAAA]">Servicio:</span>
                  <span className="font-bold text-[#1C1917] dark:text-white">{booking.serviceName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B655F] dark:text-[#AAAAAA]">Fecha y Horario:</span>
                  <span className="font-bold text-[#1C1917] dark:text-white">{booking.date} a las {booking.time} hrs</span>
                </div>
                {booking.therapistName && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#6B655F] dark:text-[#AAAAAA]">Terapeuta Asignada:</span>
                    <span className="text-[#1C1917] dark:text-white font-medium">{booking.therapistName}</span>
                  </div>
                )}
              </div>

              {/* Reason selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] mb-2">
                  Motivo de Cancelación (Opcional)
                </label>
                <div className="space-y-1.5">
                  {reasonOptions.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedReason === reason
                          ? 'bg-[#C9A55B]/10 border-[#C9A55B] text-[#1C1917] dark:text-white font-semibold'
                          : 'bg-white dark:bg-[#1A1A1A] border-[#E5DFD3] dark:border-[#333333] text-[#6B655F] dark:text-[#CCCCCC] hover:border-[#C9A55B]/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancelReason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={() => setSelectedReason(reason)}
                        className="accent-[#C9A55B] w-3.5 h-3.5"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>

                {selectedReason === 'Otro motivo' && (
                  <textarea
                    rows={2}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Escribe brevemente el motivo..."
                    className="w-full mt-2 bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl p-2.5 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                  />
                )}
              </div>

              {/* Policy & Wallet notice */}
              <div className="bg-[#FAF6EE] dark:bg-[#1C1A14] border border-[#C9A55B]/30 p-3.5 rounded-2xl text-xs space-y-1.5">
                <div className="flex items-center space-x-1.5 font-bold text-[#806020] dark:text-[#C9A55B]">
                  <HeartHandshake className="w-4 h-4 text-[#C9A55B]" />
                  <span>Política de Abono a Billetera Virtual (Regla 5 Horas)</span>
                </div>
                <p className="text-[11px] text-[#6B655F] dark:text-[#AAAAAA] leading-relaxed">
                  Al cancelar con más de <strong>5 horas de anticipación</strong>, cualquier pago anticipado con tarjeta o saldo se abonará <strong>íntegramente en tu Billetera ESSENYA</strong> (el dinero no se devuelve a la tarjeta bancaria, queda 100% disponible de inmediato como saldo a favor en la app para agendar cualquier otro masaje cuando lo desees).
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#6B655F] dark:text-[#AAAAAA] hover:bg-gray-100 dark:hover:bg-[#222222] transition-colors cursor-pointer"
                >
                  Conservar Cita
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all cursor-pointer ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Cancelando...</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      <span>Confirmar Cancelación</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* CANCEL NOT PERMITTED (LESS THAN 4 HOURS BEFORE) */
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-[#1C1917] dark:text-white">
                    Política de Cancelación ESSENYA
                  </h3>
                  <span className="inline-flex items-center text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 mt-0.5">
                    <Clock className="w-3 h-3 mr-1" />
                    Menos de 5 horas de anticipación
                  </span>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs space-y-2 text-amber-800 dark:text-amber-300">
                <p className="font-bold">
                  {eligibility.message}
                </p>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  Para garantizar la disponibilidad y el respeto al tiempo de nuestras terapeutas certificadas (quienes ya tienen bloqueada la agenda, kit de insumos y ruta hacia tu domicilio), las cancelaciones automáticas en la aplicación solo están permitidas hasta 5 horas antes de la sesión.
                </p>
              </div>

              {/* Service details */}
              <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-3.5 rounded-2xl border border-[#E5DFD3] dark:border-[#262626] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#6B655F] dark:text-[#AAAAAA]">Cita:</span>
                  <span className="font-bold text-[#1C1917] dark:text-white">#{booking.code} • {booking.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B655F] dark:text-[#AAAAAA]">Hora programada:</span>
                  <span className="font-bold text-[#806020] dark:text-[#C9A55B]">{booking.date} a las {booking.time} hrs</span>
                </div>
              </div>

              <div className="bg-[#FAF6EE] dark:bg-[#1C1A14] border border-[#C9A55B]/30 p-3.5 rounded-2xl text-xs space-y-2">
                <p className="text-[#6B655F] dark:text-[#AAAAAA] text-[11px]">
                  ¿Tienes una emergencia imprevista o necesitas asistencia especial? Nuestro Concierge puede evaluar tu caso de forma personalizada:
                </p>
                <WhatsAppButton
                  phoneNumber="525512345678"
                  message={`Hola Concierge ESSENYA, necesito asistencia con mi cita ${booking.code} (${booking.serviceName}) programada para hoy a las ${booking.time} hrs.`}
                  buttonText="Contactar Concierge por WhatsApp"
                  variant="primary"
                  size="md"
                  className="w-full justify-center"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#C9A55B] text-black hover:bg-[#E6CA65] transition-colors cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
