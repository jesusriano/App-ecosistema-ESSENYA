import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Clock, MapPin, CheckCircle2, User, Bell, Sparkles, BookOpen, AlertCircle, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useTerapeuta } from '../hooks/useTerapeuta';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { useToast } from '../../../shared/context/ToastContext';
import { getServiceImage, getStaticServiceImageFallback } from '../../../shared/utils/serviceImage';
import { ServiceCompletionModal } from '../components/ServiceCompletionModal';
import { Booking } from '../../../shared/types';
import { LiveVoiceRecorderWidget } from '../../../shared/components/LiveVoiceRecorderWidget';

export const ServiciosPage: React.FC = () => {
  const { therapist, bookings, services, handleUpdateBookingState, handleAcceptBooking, handleRejectBooking } = useTerapeuta();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'citas' | 'catalogo'>('citas');
  const [completedCelebrationBooking, setCompletedCelebrationBooking] = useState<Booking | null>(null);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  // Auto-expand and scroll to booking when clicked from Push Notification or Foreground alert
  React.useEffect(() => {
    const handleCheckUrlParam = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get('bookingId');
      if (targetId) {
        setExpandedBookingId(targetId);
        setActiveTab('citas');
        setTimeout(() => {
          const el = document.getElementById(`booking-card-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    };

    handleCheckUrlParam();

    const handleSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'NOTIFICATION_CLICKED_BOOKING' && e.data?.bookingId) {
        setExpandedBookingId(e.data.bookingId);
        setActiveTab('citas');
        setTimeout(() => {
          const el = document.getElementById(`booking-card-${e.data.bookingId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    };

    const handleFcmForeground = (e: any) => {
      if (e.detail?.bookingId) {
        setExpandedBookingId(e.detail.bookingId);
        setActiveTab('citas');
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }
    window.addEventListener('fcm-new-booking', handleFcmForeground);

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
      window.removeEventListener('fcm-new-booking', handleFcmForeground);
    };
  }, []);

  const pendingBookings = bookings.filter(b => b.state === 'pendiente');
  const activeAndCompletedBookings = bookings.filter(b => b.state !== 'pendiente' && b.state !== 'servicio_finalizado' && b.state !== 'cancelado');

  const onAccept = async (bookingId: string) => {
    try {
      await handleAcceptBooking(bookingId, therapist);
      showToast('Masaje Aceptado', 'Has aceptado la solicitud exitosamente.', 'success');
    } catch (err: any) {
      showToast('Aceptación de Reserva', err.message || 'No fue posible aceptar la reserva.', 'error');
    }
  };

  const onDecline = (bookingId: string) => {
    handleRejectBooking(bookingId, 'Terapeuta no disponible en este horario');
    showToast('Solicitud Declinada', 'La solicitud se ha enviado de vuelta a la central para reasignación.', 'gold');
  };

  const onMarkCompleted = (booking: Booking) => {
    handleUpdateBookingState(booking.id, 'servicio_finalizado');
    setCompletedCelebrationBooking(booking);
    showToast('¡Servicio Completado!', 'Has finalizado la sesión. Ganancia registrada con éxito.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5DFD3] dark:border-[#262626] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#C9A55B]" />
            <span>Servicios y Citas</span>
          </h1>
          <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-1">
            Gestión de citas asignadas y catálogo oficial de tratamientos ESSENYA.
          </p>
        </div>

        {/* Tab switch with Framer Motion layoutId */}
        <div className="flex items-center bg-[#FAF8F5] dark:bg-[#1A1A1A] p-1 rounded-xl border border-[#E5DFD3] dark:border-[#333333]">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab('citas')}
            className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'citas'
                ? 'text-black font-bold'
                : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            {activeTab === 'citas' && (
              <motion.div
                layoutId="serviciosSubTabIndicator"
                className="absolute inset-0 bg-[#C9A55B] rounded-lg shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Clock className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">Mis Citas ({bookings.length})</span>
            {pendingBookings.length > 0 && (
              <span className="relative z-10 w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            )}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab('catalogo')}
            className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'catalogo'
                ? 'text-black font-bold'
                : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            {activeTab === 'catalogo' && (
              <motion.div
                layoutId="serviciosSubTabIndicator"
                className="absolute inset-0 bg-[#C9A55B] rounded-lg shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <BookOpen className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">Catálogo ({services.length})</span>
          </motion.button>
        </div>
      </div>

      {therapist?.notificacionAprobacion && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/15 to-emerald-500/10 border-2 border-emerald-500/40 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 flex items-center justify-center font-bold shrink-0 shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-widest">
                  ¡Acreditación Aprobada!
                </span>
              </div>
              <h4 className="text-sm font-serif font-bold text-[#1C1917] dark:text-white mt-1">
                🎉 ¡Fuiste aceptada por Administración!
              </h4>
              <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] mt-0.5">
                Tu expediente ha sido validado exitosamente. Ya tienes acceso completo a las alertas de servicio a domicilio.
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                const { updateDoc, doc } = await import('firebase/firestore');
                const { db } = await import('../../../lib/firebase');
                if (therapist?.id) {
                  await updateDoc(doc(db, 'terapeutas', therapist.id), { notificacionAprobacion: false }).catch(() => {});
                  await updateDoc(doc(db, 'users', therapist.id), { notificacionAprobacion: false }).catch(() => {});
                }
              } catch {}
            }}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer shrink-0 self-end sm:self-center"
          >
            Entendido
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'citas' ? (
          <motion.div
            key="tab-citas"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="space-y-6"
          >
          {/* SOLICITUDES PENDIENTES DE ACEPTACIÓN */}
          {pendingBookings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#806020] dark:text-[#C9A55B]">
                <Bell className="w-4 h-4 text-[#C9A55B] animate-bounce" />
                <span>Solicitudes Nuevas por Confirmar ({pendingBookings.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingBookings.map((booking) => {
                  const serviceImg = getServiceImage(booking.serviceId || booking.serviceName);
                  const isDual = booking.requiresDualTherapist || booking.serviceId === 'srv-pareja';
                  const currentTherapistId = therapist?.id || (therapist as any)?.uid;
                  const existingTherapistIds = Array.isArray(booking.therapistIds)
                    ? booking.therapistIds
                    : (booking.therapistId ? [booking.therapistId] : []);
                  const assignedCount = typeof booking.assignedTherapistsCount === 'number'
                    ? booking.assignedTherapistsCount
                    : existingTherapistIds.length;
                  const alreadyAcceptedByMe = currentTherapistId && (
                    booking.therapistId === currentTherapistId || existingTherapistIds.includes(currentTherapistId)
                  );
                  const isExpanded = expandedBookingId === booking.id;

                  if (!isExpanded) {
                    return (
                      <div
                        key={booking.id}
                        onClick={() => setExpandedBookingId(booking.id)}
                        className="bg-[#FAF6EE] dark:bg-[#1A1813] border-2 border-[#C9A55B] rounded-2xl p-4.5 shadow-md relative overflow-hidden cursor-pointer hover:border-[#E6CA65] transition-all flex items-center justify-between gap-4 group"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-[#C9A55B]/20 border border-[#C9A55B]/40 flex items-center justify-center text-[#806020] dark:text-[#C9A55B] shrink-0 group-hover:scale-105 transition-transform">
                            <Bell className="w-5 h-5 text-[#C9A55B] animate-bounce" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-serif font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
                                🔔 Masaje solicitado
                              </h4>
                              {isDual && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#C9A55B]/20 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/40 uppercase tracking-wider">
                                  Pareja ({assignedCount}/2)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] mt-0.5 font-medium">
                              Toca para ver los detalles
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-bold text-[#806020] dark:text-[#C9A55B]">
                          <span className="hidden sm:inline">Ver detalles</span>
                          <ChevronDown className="w-5 h-5 text-[#C9A55B]" />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={booking.id}
                      className="bg-[#FAF6EE] dark:bg-[#1A1813] border-2 border-[#C9A55B] rounded-2xl p-5 space-y-4 shadow-md relative overflow-hidden"
                    >
                      {/* Header with collapse button */}
                      <div
                        onClick={() => setExpandedBookingId(null)}
                        className="flex items-center justify-between border-b border-[#E5DFD3] dark:border-[#333333] pb-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-[#C9A55B]" />
                          <h4 className="text-base font-serif font-bold text-[#1C1917] dark:text-white">
                            🔔 Masaje solicitado
                          </h4>
                          {isDual && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#C9A55B]/20 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/30 uppercase">
                              Pareja ({assignedCount}/2)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[#806020] dark:text-[#C9A55B] font-bold group-hover:text-black dark:group-hover:text-white transition-colors">
                          <span>Contraer</span>
                          <ChevronUp className="w-4 h-4 text-[#C9A55B]" />
                        </div>
                      </div>

                      <div className="flex gap-4 items-start">
                        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-[#C9A55B]/40 relative bg-black/20">
                          <img
                            src={serviceImg}
                            alt={booking.serviceName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.currentTarget;
                              const fb = getStaticServiceImageFallback(booking.serviceId || booking.serviceName);
                              if (target.src !== fb) target.src = fb;
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-mono font-bold text-xs text-[#806020] dark:text-[#C9A55B]">#{booking.code || booking.id}</span>
                          <h3 className="font-serif font-bold text-base text-[#1C1917] dark:text-white mt-0.5 truncate">{booking.serviceName}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-xs font-semibold text-[#806020] dark:text-[#C9A55B]">
                              ${(booking.total ?? booking.price ?? 0).toLocaleString()} MXN • {booking.paymentStatus === 'pagado' ? '✓ Pagado' : 'Pago al Recibir'}
                            </span>
                            {isDual && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C9A55B]/20 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/30">
                                2 Terapeutas ({assignedCount}/2)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                        <p className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-[#C9A55B]" />
                          <span>Cliente VIP: <strong className="text-[#1C1917] dark:text-white">{booking.clientName}</strong></span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-[#C9A55B]" />
                          <span>Fecha & Hora: <strong>{booking.date} a las {booking.time}</strong> ({booking.durationMinutes} min)</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#C9A55B]" />
                          <span>Dirección: {booking.clientAddress} ({booking.cityZone})</span>
                        </p>
                        {booking.painPoints && (
                          <p className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Molestias: <strong>{booking.painPoints}</strong></span>
                          </p>
                        )}
                        {isDual && assignedCount === 1 && (
                          <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>1ª Terapeuta asignada: <strong>{booking.therapistName || 'Compañera'}</strong></span>
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-[#E5DFD3] dark:border-[#333333] flex items-center gap-2.5">
                        {alreadyAcceptedByMe ? (
                          <div className="flex-1 py-2 px-3 text-center bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/40 rounded-xl text-xs font-bold">
                            ✓ Ya aceptaste tu cupo • Esperando compañera
                          </div>
                        ) : (
                          <button
                            onClick={() => onAccept(booking.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#E6CA65] via-[#C9A55B] to-[#9A7B38] text-black font-extrabold text-xs py-2.5 px-4 rounded-xl shadow hover:opacity-95 transition-all cursor-pointer"
                          >
                            <Check className="w-4 h-4 text-black" />
                            <span>
                              {isDual 
                                ? (assignedCount === 1 ? 'Aceptar 2º Cupo (Pareja)' : 'Aceptar Cupo (1 de 2)')
                                : 'Aceptar Masaje'}
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => onDecline(booking.id)}
                          className="flex items-center justify-center gap-1 bg-white dark:bg-[#262626] border border-[#E5DFD3] dark:border-[#444444] text-xs font-semibold text-[#6B655F] dark:text-[#AAAAAA] hover:text-red-500 py-2.5 px-3 rounded-xl transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Rechazar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* HISTORIAL Y SERVICIOS ACTIVOS */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#1C1917] dark:text-white">
              Servicios en Proceso y Finalizados ({activeAndCompletedBookings.length})
            </h2>

            {activeAndCompletedBookings.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-2xl">
                <Clock className="w-8 h-8 text-[#C9A55B] mx-auto mb-2 opacity-60" />
                <p className="text-xs text-[#6B655F] dark:text-[#888888]">No tienes citas activas o pasadas en este momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeAndCompletedBookings.map((booking) => {
                  const serviceImg = getServiceImage(booking.serviceId || booking.serviceName);
                  return (
                    <div
                      key={booking.id}
                      className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-2xl p-5 space-y-4 shadow-xs"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex gap-3 items-center min-w-0">
                          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-[#E5DFD3] dark:border-[#333333]">
                            <img
                              src={serviceImg}
                              alt={booking.serviceName}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const target = e.currentTarget;
                                const fb = getStaticServiceImageFallback(booking.serviceId || booking.serviceName);
                                if (target.src !== fb) target.src = fb;
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-xs text-[#806020] dark:text-[#C9A55B]">#{booking.code || booking.id}</span>
                            <h3 className="font-serif font-bold text-base text-[#1C1917] dark:text-white mt-0.5 truncate">{booking.serviceName}</h3>
                          </div>
                        </div>
                        <span className="bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase whitespace-nowrap shrink-0">
                          {booking.state.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                        <p className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-[#C9A55B]" />
                          <span>Cliente: <strong>{booking.clientName}</strong></span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-[#C9A55B]" />
                          <span>Horario: {booking.time || booking.date} ({booking.durationMinutes} min)</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#C9A55B]" />
                          <span>Ubicación: {booking.clientAddress} ({booking.cityZone})</span>
                        </p>
                        {(booking.requiresDualTherapist || booking.serviceId === 'srv-pareja') && (
                          <p className="flex items-center gap-2 text-[#806020] dark:text-[#C9A55B]">
                            <Sparkles className="w-3.5 h-3.5 text-[#C9A55B]" />
                            <span>Terapeutas: <strong>{booking.therapistName || '1ª Asignada'} & {booking.therapistName2 || '2ª Asignada'}</strong></span>
                          </p>
                        )}
                      </div>

                      {/* Live Voice Recording Widget during active service */}
                      {booking.state !== 'servicio_finalizado' && (
                        <div className="pt-2">
                          <LiveVoiceRecorderWidget
                            serviceId={booking.id}
                            therapistId={therapist.id}
                            therapistName={therapist.name}
                          />
                        </div>
                      )}

                      <div className="pt-3 border-t border-[#E5DFD3] dark:border-[#262626] flex justify-between items-center">
                        <span className="text-sm font-bold text-[#806020] dark:text-[#C9A55B]">${(booking.total ?? booking.price ?? 0).toLocaleString()} MXN</span>
                        {booking.state !== 'servicio_finalizado' && (
                          <LuxuryButton
                            variant="gold"
                            size="sm"
                            onClick={() => onMarkCompleted(booking)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            <span>Marcar Finalizado</span>
                          </LuxuryButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        /* CATÁLOGO OFICIAL DE SERVICIOS */
        <motion.div
          key="tab-catalogo"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
          className="space-y-4"
        >
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C9A55B]" />
              <span>Tratamientos Certificados ESSENYA ({services.length})</span>
            </h2>
            <span className="text-[11px] text-[#6B655F] dark:text-[#888888]">
              Protocolos de atención a domicilio
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((service) => {
              const imgUrl = getServiceImage(service);
              return (
                <div
                  key={service.id}
                  className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="relative aspect-video overflow-hidden bg-black/20">
                      <img
                        src={imgUrl}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          const fb = getStaticServiceImageFallback(service.id || service.name);
                          if (target.src !== fb) target.src = fb;
                        }}
                      />
                      <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-[#C9A55B]/40 flex items-center space-x-1 shadow-md">
                        <span className="text-[9px] font-serif font-bold text-[#C9A55B] tracking-widest">ESSENYA</span>
                      </div>
                      <span className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-sm text-[#C9A55B] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#C9A55B]/30">
                        {service.category}
                      </span>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-6">
                        <p className="text-white font-serif font-bold text-xs tracking-wide drop-shadow-md">{service.name}</p>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <h3 className="font-serif font-bold text-base text-[#1C1917] dark:text-white">{service.name}</h3>
                      <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] line-clamp-2">{service.description}</p>

                      {service.benefits && service.benefits.length > 0 && (
                        <div className="pt-2 border-t border-[#E5DFD3]/60 dark:border-[#262626]">
                          <p className="text-[10px] font-semibold text-[#806020] dark:text-[#C9A55B] uppercase tracking-wider mb-1">
                            Enfoque Terapéutico:
                          </p>
                          <ul className="text-[11px] text-[#6B655F] dark:text-[#888888] space-y-0.5">
                            {service.benefits.slice(0, 2).map((b, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <span className="text-[#C9A55B] font-bold">•</span>
                                <span className="truncate">{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-2 border-t border-[#E5DFD3] dark:border-[#262626] flex justify-between items-center text-xs">
                    <span className="text-sm font-bold text-[#806020] dark:text-[#C9A55B]">
                      ${service.basePrice.toLocaleString()} MXN
                    </span>
                    <span className="text-[10px] font-semibold bg-[#FAF8F5] dark:bg-[#1E1E1E] px-2 py-1 rounded-md text-[#6B655F] dark:text-[#AAAAAA] border border-[#E5DFD3] dark:border-[#333333]">
                      {(service.allowedDurations || [60, 90, 120]).join(' / ')} min
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Celebration Modal when service is marked completed */}
      <ServiceCompletionModal
        isOpen={!!completedCelebrationBooking}
        onClose={() => setCompletedCelebrationBooking(null)}
        booking={completedCelebrationBooking}
      />
    </div>
  );
};
