import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Clock, X, CheckCircle2, RefreshCw, AlertCircle, ArrowRight,
  Sliders, Sparkles, Music, FileText, MapPin, Check, Heart
} from 'lucide-react';
import { Booking } from '../../../shared/types';
import { 
  getTodayDateString, 
  getScheduleSlotsForDate, 
  evaluateTimeSlot, 
  getFirstAvailableSlot 
} from '../../../shared/data/catalog';
import { checkRescheduleEligibility } from '../../../shared/data/scheduling';

interface RescheduleBookingModalProps {
  booking: Booking | null;
  isOpen: boolean;
  isHighTier?: boolean;
  onClose: () => void;
  onConfirmReschedule: (
    bookingId: string, 
    newDate: string, 
    newTime: string,
    preferences?: any,
    notes?: string,
    clientAddress?: string
  ) => Promise<void> | void;
}

export const RescheduleBookingModal: React.FC<RescheduleBookingModalProps> = ({
  booking,
  isOpen,
  isHighTier = false,
  onClose,
  onConfirmReschedule,
}) => {
  const todayStr = useMemo(() => getTodayDateString(), []);
  
  const [activeTab, setActiveTab] = useState<'schedule' | 'preferences'>('schedule');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedTime, setSelectedTime] = useState<string>('12:00');
  
  // Massage Customization / Preferences
  const [pressureLevel, setPressureLevel] = useState<string>('Media');
  const [essentialOil, setEssentialOil] = useState<string>('Lavanda Relajante');
  const [musicStyle, setMusicStyle] = useState<string>('Spa Lounge / Zen');
  const [notes, setNotes] = useState<string>('');
  const [clientAddress, setClientAddress] = useState<string>('');
  
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
      
      const prefs = (booking.preferences as any) || {};
      setPressureLevel(prefs.pressureLevel || 'Media');
      setEssentialOil(prefs.oil || prefs.essentialOil || 'Lavanda Relajante');
      setMusicStyle(prefs.music || prefs.musicStyle || 'Spa Lounge / Zen');
      setNotes(booking.notes || '');
      setClientAddress(booking.clientAddress || '');
      setActiveTab('schedule');
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

  const eligibility = checkRescheduleEligibility(booking.date, booking.time, booking.state);
  const isChangingDateTime = selectedDate !== booking.date || selectedTime !== booking.time;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChangingDateTime && (!eligibility.canReschedule || !selectedSlotStatus?.available)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedPreferences = {
        ...(booking.preferences || {}),
        pressureLevel,
        oil: essentialOil,
        essentialOil,
        music: musicStyle,
        musicStyle
      };

      await onConfirmReschedule(
        booking.id, 
        selectedDate, 
        selectedTime,
        updatedPreferences,
        notes,
        clientAddress
      );
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pressureOptions = [
    { label: 'Suave', desc: 'Relajación sutil, caricias y drenaje suave' },
    { label: 'Media', desc: 'Tensión estándar, equilibrio perfecto' },
    { label: 'Fuerte', desc: 'Presión profunda, descontracturante intenso' },
  ];

  const oilOptions = [
    'Lavanda Relajante (Antiestrés)',
    'Eucalipto & Menta (Descontracturante)',
    'Cítricos & Bergamota (Revitalizante)',
    'Aceite Neutro Hipoalergénico (Sin aroma)'
  ];

  const musicOptions = [
    'Spa Lounge / Zen & Cuencos',
    'Sonidos de la Naturaleza (Bosque / Lluvia)',
    'Música Clásica Suave',
    'Silencio Absoluto'
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#C9A55B]/30 rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl relative text-left my-auto max-h-[90vh] flex flex-col"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-full transition-colors cursor-pointer z-10"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center space-x-3 mb-3 pr-8 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-[#C9A55B]/15 border border-[#C9A55B]/30 flex items-center justify-center text-[#806020] dark:text-[#C9A55B] shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-serif font-bold text-[#1C1917] dark:text-white truncate">
                Modificar o Reprogramar Cita
              </h3>
              <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] truncate">
                Cita <span className="font-mono font-bold text-[#806020] dark:text-[#C9A55B]">#{booking.code}</span> • {booking.serviceName}
              </p>
            </div>
          </div>

          {/* Current schedule banner */}
          <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-3 rounded-2xl border border-[#E5DFD3] dark:border-[#262626] mb-3 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center space-x-2 text-[#6B655F] dark:text-[#AAAAAA]">
              <Clock className="w-3.5 h-3.5 text-[#806020] dark:text-[#C9A55B]" />
              <span>Horario actual:</span>
            </div>
            <span className="font-bold text-[#1C1917] dark:text-white">
              {booking.date} a las {booking.time} hrs
            </span>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center space-x-1 p-1 bg-[#FAF8F5] dark:bg-[#1E1E1E] rounded-xl border border-[#E5DFD3] dark:border-[#333333] mb-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'schedule'
                  ? 'bg-white dark:bg-[#141414] text-[#806020] dark:text-[#C9A55B] shadow-xs'
                  : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Fecha y Horario</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preferences')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'preferences'
                  ? 'bg-white dark:bg-[#141414] text-[#806020] dark:text-[#C9A55B] shadow-xs'
                  : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Preferencias del Masaje</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
            {activeTab === 'schedule' && (
              <>
                {!eligibility.canReschedule ? (
                  <div className="space-y-3">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs space-y-2 text-amber-800 dark:text-amber-300">
                      <div className="flex items-center space-x-2 font-bold text-amber-700 dark:text-amber-400">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                        <span>Política de Anticipación (Mínimo 5 Horas)</span>
                      </div>
                      <p className="font-bold leading-snug text-amber-900 dark:text-amber-200">
                        {eligibility.message}
                      </p>
                      <p className="text-[11px] opacity-90 leading-relaxed pt-1 border-t border-amber-500/20">
                        Para garantizar la preparación de insumos, el bloqueo exclusivo de agenda y la ruta de la terapeuta hacia tu domicilio, el cambio de fecha/horario requiere al menos 5 horas de anticipación.
                      </p>
                    </div>
                    <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-3 rounded-xl border border-[#E5DFD3] dark:border-[#262626] text-xs">
                      <p className="text-[#6B655F] dark:text-[#AAAAAA]">
                        💡 <strong>Nota:</strong> Aunque no puedas cambiar la fecha/hora, aún puedes <strong>modificar las notas, nivel de presión o aceites esenciales</strong> en la pestaña superior.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Date selection */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] mb-2">
                        1. Selecciona la Nueva Fecha
                      </label>

                      {/* Quick day buttons */}
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {quickDates.map(qd => (
                          <button
                            key={qd.str}
                            type="button"
                            onClick={() => {
                              setSelectedDate(qd.str);
                              const first = getFirstAvailableSlot(qd.str, isHighTier);
                              if (first) setSelectedTime(first);
                            }}
                            className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition-all border text-center cursor-pointer ${
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
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA]">
                          2. Horario Deseado (09:00 a 20:00 hrs)
                        </label>
                        <span className="text-[11px] text-[#806020] dark:text-[#C9A55B] font-semibold">
                          {selectedTime} hrs
                        </span>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-[#FAF8F5] dark:bg-[#181818] rounded-2xl border border-[#E5DFD3] dark:border-[#262626]">
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
                  </div>
                )}
              </>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-3.5">
                {/* Pressure Level */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] mb-1.5">
                    Nivel de Presión del Masaje
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {pressureOptions.map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setPressureLevel(p.label)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          pressureLevel === p.label
                            ? 'bg-[#C9A55B]/15 border-[#C9A55B] text-[#806020] dark:text-[#C9A55B] font-bold shadow-xs'
                            : 'bg-white dark:bg-[#1A1A1A] border-[#E5DFD3] dark:border-[#333333] text-[#6B655F] dark:text-[#CCCCCC]'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>{p.label}</span>
                          {pressureLevel === p.label && <Check className="w-3.5 h-3.5 text-[#C9A55B]" />}
                        </div>
                        <p className="text-[10px] opacity-75 mt-0.5 line-clamp-2">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Essential Oil */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] mb-1.5">
                    Aceite Esencial / Aromaterapia
                  </label>
                  <div className="space-y-1.5">
                    {oilOptions.map(oil => (
                      <label
                        key={oil}
                        className={`flex items-center space-x-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                          essentialOil === oil
                            ? 'bg-[#C9A55B]/10 border-[#C9A55B] text-[#1C1917] dark:text-white font-semibold'
                            : 'bg-white dark:bg-[#1A1A1A] border-[#E5DFD3] dark:border-[#333333] text-[#6B655F] dark:text-[#CCCCCC]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="essentialOil"
                          value={oil}
                          checked={essentialOil === oil}
                          onChange={() => setEssentialOil(oil)}
                          className="accent-[#C9A55B]"
                        />
                        <span>{oil}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Music Style */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] mb-1.5">
                    Ambiente Musical
                  </label>
                  <select
                    value={musicStyle}
                    onChange={(e) => setMusicStyle(e.target.value)}
                    className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white font-medium focus:outline-none focus:border-[#C9A55B]"
                  >
                    {musicOptions.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Special Instructions & Notes */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] mb-1">
                    Indicaciones para la Terapeuta / Dolencias
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. Tensión en hombro izquierdo, tocar interfón departamento 402, estacionamiento en sótano..."
                    className="w-full bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl p-2.5 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                  />
                </div>
              </div>
            )}

            {/* Summary preview */}
            <div className="bg-[#FAF6EE] dark:bg-[#1C1A14] border border-[#C9A55B]/30 p-3 rounded-2xl text-xs space-y-1">
              <div className="flex items-center space-x-2 text-[#806020] dark:text-[#C9A55B] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmación de Cambios</span>
              </div>
              <p className="text-[#6B655F] dark:text-[#AAAAAA] text-[11px] leading-relaxed">
                {isChangingDateTime ? (
                  <>Tu sesión se programará para el <strong className="text-[#1C1917] dark:text-white">{selectedDate}</strong> a las <strong className="text-[#1C1917] dark:text-white">{selectedTime} hrs</strong>. </>
                ) : (
                  <>La fecha y hora se mantienen (<strong className="text-[#1C1917] dark:text-white">{selectedDate} {selectedTime} hrs</strong>). </>
                )}
                Se actualizarán las preferencias de presión (<span className="text-[#806020] dark:text-[#C9A55B] font-bold">{pressureLevel}</span>) y aromaterapia.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2 shrink-0">
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
                disabled={isSubmitting || (isChangingDateTime && (!eligibility.canReschedule || !selectedSlotStatus?.available))}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-[#C9A55B] hover:bg-[#E6CA65] shadow-md shadow-[#C9A55B]/20 transition-all cursor-pointer ${
                  isSubmitting || (isChangingDateTime && (!eligibility.canReschedule || !selectedSlotStatus?.available)) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <span>Guardar Cambios</span>
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
