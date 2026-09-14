import React, { useState } from 'react';
import { Layers, Clock, MapPin, CheckCircle2, User, Bell, Check, X, AlertCircle, Sparkles, BookOpen } from 'lucide-react';
import { useTerapeuta } from '../hooks/useTerapeuta';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { useToast } from '../../../shared/context/ToastContext';
import { getServiceImage, getStaticServiceImageFallback } from '../../../shared/utils/serviceImage';

export const ServiciosPage: React.FC = () => {
  const { therapist, bookings, services, handleUpdateBookingState, handleAcceptBooking, handleRejectBooking } = useTerapeuta();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'citas' | 'catalogo'>('citas');

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

        {/* Tab switch */}
        <div className="flex items-center bg-[#FAF8F5] dark:bg-[#1A1A1A] p-1 rounded-xl border border-[#E5DFD3] dark:border-[#333333]">
          <button
            onClick={() => setActiveTab('citas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'citas'
                ? 'bg-[#C9A55B] text-black font-bold shadow-xs'
                : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Mis Citas ({bookings.length})</span>
            {pendingBookings.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('catalogo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'catalogo'
                ? 'bg-[#C9A55B] text-black font-bold shadow-xs'
                : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Catálogo ({services.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'citas' ? (
        <div className="space-y-6">
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
                  return (
                    <div
                      key={booking.id}
                      className="bg-[#FAF6EE] dark:bg-[#1A1813] border-2 border-[#C9A55B] rounded-2xl p-5 space-y-4 shadow-md relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 bg-[#C9A55B] text-black text-[10px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                        ¡Nueva Solicitud!
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
                          <span className="text-xs font-semibold text-[#806020] dark:text-[#C9A55B] block mt-1">
                            ${(booking.total ?? booking.price ?? 0).toLocaleString()} MXN • {booking.paymentStatus === 'pagado' ? '✓ Pagado' : 'Pago al Recibir'}
                          </span>
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
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* CATÁLOGO OFICIAL DE SERVICIOS */
        <div className="space-y-4">
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
        </div>
      )}
    </div>
  );
};
