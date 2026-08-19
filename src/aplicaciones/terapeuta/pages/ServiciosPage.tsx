import React from 'react';
import { Layers, Clock, MapPin, CheckCircle2, User, Bell, Check, X, AlertCircle } from 'lucide-react';
import { useTerapeuta } from '../hooks/useTerapeuta';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { useToast } from '../../../shared/context/ToastContext';

export const ServiciosPage: React.FC = () => {
  const { therapist, bookings, handleUpdateBookingState, handleAcceptBooking, handleRejectBooking } = useTerapeuta();
  const { showToast } = useToast();

  const pendingBookings = bookings.filter(b => b.state === 'pendiente');
  const activeAndCompletedBookings = bookings.filter(b => b.state !== 'pendiente');

  const onAccept = (bookingId: string) => {
    handleAcceptBooking(bookingId, therapist);
    showToast('Masaje Aceptado', 'Has aceptado la solicitud. El cliente ya puede ver tu nombre y perfil.', 'success');
  };

  const onDecline = (bookingId: string) => {
    handleRejectBooking(bookingId, 'Terapeuta no disponible en este horario');
    showToast('Solicitud Declinada', 'La solicitud se ha enviado de vuelta a la central para reasignación.', 'gold');
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E5DFD3] dark:border-[#262626] pb-4">
        <h1 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
          <Layers className="w-6 h-6 text-[#C9A55B]" />
          <span>Servicios y Citas</span>
        </h1>
        <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-1">
          Gestión de solicitudes entrantes y servicios asignados en tiempo real.
        </p>
      </div>

      {/* SOLICITUDES PENDIENTES DE ACEPTACIÓN */}
      {pendingBookings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#806020] dark:text-[#C9A55B]">
            <Bell className="w-4 h-4 text-[#C9A55B] animate-bounce" />
            <span>Solicitudes Nuevas por Confirmar ({pendingBookings.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-[#FAF6EE] dark:bg-[#1A1813] border-2 border-[#C9A55B] rounded-2xl p-5 space-y-4 shadow-md relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 bg-[#C9A55B] text-black text-[10px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                  ¡Nueva Solicitud!
                </div>

                <div>
                  <span className="font-mono font-bold text-xs text-[#806020] dark:text-[#C9A55B]">#{booking.code || booking.id}</span>
                  <h3 className="font-serif font-bold text-base text-[#1C1917] dark:text-white mt-1">{booking.serviceName}</h3>
                  <span className="text-xs font-semibold text-[#806020] dark:text-[#C9A55B]">
                    ${(booking.total ?? booking.price ?? 0).toLocaleString()} MXN • {booking.paymentStatus === 'pagado' ? '✓ Pagado' : 'Pago al Recibir'}
                  </span>
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
                </div>

                <div className="pt-3 border-t border-[#E5DFD3] dark:border-[#333333] flex items-center gap-2.5">
                  <button
                    onClick={() => onAccept(booking.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#E6CA65] via-[#C9A55B] to-[#9A7B38] text-black font-extrabold text-xs py-2.5 px-4 rounded-xl shadow hover:opacity-95 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-black" />
                    <span>Aceptar Masaje</span>
                  </button>
                  <button
                    onClick={() => onDecline(booking.id)}
                    className="flex items-center justify-center gap-1 bg-white dark:bg-[#262626] border border-[#E5DFD3] dark:border-[#444444] text-xs font-semibold text-[#6B655F] dark:text-[#AAAAAA] hover:text-red-500 py-2.5 px-3 rounded-xl transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Declinar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HISTORIAL Y SERVICIOS ACTIVOS */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#1C1917] dark:text-white">
          Servicios en Proceso y Finalizados ({activeAndCompletedBookings.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeAndCompletedBookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-2xl p-5 space-y-4 shadow-xs"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono font-bold text-xs text-[#806020] dark:text-[#C9A55B]">#{booking.code || booking.id}</span>
                  <h3 className="font-serif font-bold text-base text-[#1C1917] dark:text-white mt-1">{booking.serviceName}</h3>
                </div>
                <span className="bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
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
              </div>

              <div className="pt-3 border-t border-[#E5DFD3] dark:border-[#262626] flex justify-between items-center">
                <span className="text-sm font-bold text-[#806020] dark:text-[#C9A55B]">${(booking.total ?? booking.price ?? 0).toLocaleString()} MXN</span>
                {booking.state !== 'servicio_finalizado' && (
                  <LuxuryButton
                    variant="gold"
                    size="sm"
                    onClick={() => handleUpdateBookingState(booking.id, 'servicio_finalizado')}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    <span>Marcar Finalizado</span>
                  </LuxuryButton>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
