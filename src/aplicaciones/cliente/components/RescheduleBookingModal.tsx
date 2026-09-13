import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, X, CheckCircle2, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import { Booking } from '../../../shared/types';
import { 
  getTodayDateString, 
  getScheduleSlotsForDate, 
  evaluateTimeSlot, 
  getFirstAvailableSlot 
} from '../../../shared/data/catalog';

interface RescheduleBookingModalProps {
  booking: Booking | null;
  isOpen: boolean;
  isHighTier?: boolean;
  onClose: () => void;
  onConfirmReschedule: (bookingId: string, newDate: string, newTime: string) => Promise<void> | void;
}

export const RescheduleBookingModal: React.FC<RescheduleBookingModalProps> = ({
  booking,
  isOpen,
  isHighTier = false,
  onClose,
  onConfirmReschedule,
}) => {
  const todayStr = useMemo(() => getTodayDateString(), []);
  
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedTime, setSelectedTime] = useState<string>('12:00');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Quick dates (Today, Tomorrow, Day after tomorrow)
  const quickDates = useMemo(() => {
    const dates = [];
    const base = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const str = `${y}-${m}-${day}`;
      const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : 'Pasado Mañana';
      dates.push({ str, label });
    }
    return dates;
  }, []);

  // Sync state when modal opens
  useEffect(() => {
    if (booking && isOpen) {
      const initialDate = booking.date >= todayStr ? booking.date : todayStr;
      setSelectedDate(initialDate);
      const firstValid = getFirstAvailableSlot(initialDate, isHighTier) || booking.time || '12:00';
      setSelectedTime(firstValid);
    }
  }, [booking, isOpen, todayStr, isHighTier]);

  const scheduleSlots = useMemo(() => {
    if (!selectedDate) return [];
    return getScheduleSlotsForDate(selectedDate, isHighTier);
  }, [selectedDate, isHighTier]);

  const selectedSlotStatus = useMemo(() => {
    if (!selectedDate || !selectedTime) return null;
    return evaluateTimeSlot(selectedDate, selectedTime, isHighTier);
  }, [selectedDate, selectedTime, isHighTier]);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !selectedSlotStatus?.available) return;
    setIsSubmitting(true);
    try {
      await onConfirmReschedule(booking.id, selectedDate, selectedTime);
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
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-full transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#C9A55B]/15 border border-[#C9A55B]/30 flex items-center justify-center text-[#806020] dark:text-[#C9A55B]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold text-[#1C1917] dark:text-white">
                Reprogramar Cita de Masaje
              </h3>
              <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                Cita <span className="font-mono font-bold text-[#806020] dark:text-[#C9A55B]">#{booking.code}</span> • {booking.serviceName}
              </p>
            </div>
          </div>

          {/* Current schedule banner */}
          <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-3.5 rounded-2xl border border-[#E5DFD3] dark:border-[#262626] mb-5 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-[#6B655F] dark:text-[#AAAAAA]">
              <Clock className="w-4 h-4 text-[#806020] dark:text-[#C9A55B]" />
              <span>Horario actual programado:</span>
            </div>
            <span className="font-bold text-[#1C1917] dark:text-white">
              {booking.date} a las {booking.time} hrs
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] mb-2">
                1. Selecciona la Nueva Fecha
              </label>

              {/* Quick day buttons */}
              <div className="grid grid-cols-3 gap-2 mb-2.5">
                {quickDates.map(qd => (
                  <button
                    key={qd.str}
                    type="button"
                    onClick={() => {
                      setSelectedDate(qd.str);
                      const first = getFirstAvailableSlot(qd.str, isHighTier);
                      if (first) setSelectedTime(first);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border text-center cursor-pointer ${
                      selectedDate === qd.str
                        ? 'bg-[#C9A55B] text-black border-[#C9A55B] font-bold shadow-xs'
                        : 'bg-white dark:bg-[#1A1A1A] border-[#E5DFD3] dark:border-[#333333] text-[#1C1917] dark:text-[#CCCCCC] hover:border-[#C9A55B]/50'
                    }`}
                  >
                    <span className="block text-[10px] opacity-75">{qd.label}</span>
                    <span className="text-xs font-bold">{qd.str.slice(5)}</span>
                  </button>
                ))}
              </div>

              {/* Custom date input */}
              <input
                type="date"
                min={todayStr}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  const first = getFirstAvailableSlot(e.target.value, isHighTier);
                  if (first) setSelectedTime(first);
                }}
                className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1917] dark:text-white font-medium focus:outline-none focus:border-[#C9A55B]"
              />
            </div>

            {/* Time slot selection */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA]">
                  2. Horario Deseado (09:00 a 20:00 hrs)
                </label>
                <span className="text-[11px] text-[#806020] dark:text-[#C9A55B] font-semibold">
                  {selectedTime} hrs
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-44 overflow-y-auto p-1.5 bg-[#FAF8F5] dark:bg-[#181818] rounded-2xl border border-[#E5DFD3] dark:border-[#262626]">
                {scheduleSlots.map((slot) => {
                  const isSelected = selectedTime === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-[#C9A55B] text-black shadow-md'
                          : slot.available
                          ? 'bg-white dark:bg-[#202020] text-[#1C1917] dark:text-white hover:border-[#C9A55B] border border-[#E5DFD3] dark:border-[#333333]'
                          : 'opacity-30 bg-transparent text-gray-400 cursor-not-allowed line-through'
                      }`}
                      title={slot.reason || slot.time}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>

              {selectedSlotStatus && !selectedSlotStatus.available && (
                <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center space-x-2 text-[11px] text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{selectedSlotStatus.reason}</span>
                </div>
              )}
            </div>

            {/* Confirmation summary */}
            <div className="bg-[#FAF6EE] dark:bg-[#1C1A14] border border-[#C9A55B]/30 p-3 rounded-2xl text-xs space-y-1">
              <div className="flex items-center space-x-2 text-[#806020] dark:text-[#C9A55B] font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Resumen de la Reprogramación</span>
              </div>
              <p className="text-[#6B655F] dark:text-[#AAAAAA] text-[11px]">
                Tu sesión pasará a ser el <strong className="text-[#1C1917] dark:text-white">{selectedDate}</strong> a las <strong className="text-[#1C1917] dark:text-white">{selectedTime} hrs</strong>. Tu terapeuta certificada y la central de concierge serán notificadas al instante.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#6B655F] dark:text-[#AAAAAA] hover:bg-gray-100 dark:hover:bg-[#222222] transition-colors cursor-pointer"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedSlotStatus?.available}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-[#C9A55B] hover:bg-[#E6CA65] shadow-md shadow-[#C9A55B]/20 transition-all cursor-pointer ${
                  isSubmitting || !selectedSlotStatus?.available ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Reprogramando...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar Reprogramación</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
