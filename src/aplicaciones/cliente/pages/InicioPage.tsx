import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Calendar, Award, ShieldCheck, Clock, MapPin, ChevronRight, Star } from 'lucide-react';
import { useCliente } from '../hooks/useCliente';
import { useAuth } from '../../../shared/context/AuthContext';
import { LiveTrackingMap } from '../../../shared/components/LiveTrackingMap';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';

interface InicioPageProps {
  onGoToReservas: () => void;
}

export const InicioPage: React.FC<InicioPageProps> = ({ onGoToReservas }) => {
  const { client, activeBooking, services, therapists } = useCliente();
  const { getUser } = useAuth();
  const authUser = getUser('cliente');

  const clientName = authUser?.nombre || client?.name?.split(' ')[0] || 'Jesús';

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#1C1917] via-[#2A241B] to-[#1C1917] text-white border border-[#C9A55B]/30 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C9A55B]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 bg-[#C9A55B]/20 border border-[#C9A55B]/40 px-3 py-1 rounded-full text-xs font-semibold text-[#E6CA65]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Haute Wellness At-Home Experience</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-wide">
            Hola, {clientName}. Bienvenido a ESSENYA.
          </h1>

          <p className="text-xs sm:text-sm text-[#CCCCCC] leading-relaxed">
            Tu membresía <strong className="text-[#C9A55B]">{client?.membershipTier || 'Club Black VIP'}</strong> te concede prioridad inmediata en masajes terapéuticos de alto nivel a domicilio en CDMX.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <LuxuryButton variant="gold" size="md" onClick={onGoToReservas}>
              <Calendar className="w-4 h-4 mr-1.5" />
              <span>Agendar Nuevo Masaje</span>
            </LuxuryButton>
          </div>
        </div>
      </div>

      {/* Active Service Tracking if available */}
      {activeBooking && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-serif font-bold text-[#1C1917] dark:text-white flex items-center space-x-2">
              <Clock className="w-5 h-5 text-[#C9A55B]" />
              <span>Servicio Activo en Seguimiento Live</span>
            </h2>
            <span className="text-xs font-mono font-bold bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] px-3 py-1 rounded-full border border-[#C9A55B]/30">
              Reserva #{activeBooking.code || activeBooking.id}
            </span>
          </div>

          <LiveTrackingMap
            clientAddress={activeBooking.clientAddress}
            cityZone={activeBooking.cityZone}
            therapistName={activeBooking.therapistName}
            therapistPhoto={activeBooking.therapistPhoto}
            bookingState={activeBooking.state}
          />
        </div>
      )}

      {/* Featured Luxury Treatments */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-serif font-bold text-[#1C1917] dark:text-white">
            Tratamientos Destacados ESSENYA
          </h2>
          <button onClick={onGoToReservas} className="text-xs font-bold text-[#806020] dark:text-[#C9A55B] hover:underline flex items-center">
            <span>Ver Menú Completo</span>
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.slice(0, 3).map((service) => (
            <div
              key={service.id}
              className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-2xl p-5 space-y-4 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="aspect-video rounded-xl overflow-hidden relative">
                <img src={service.image || undefined} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute top-2 right-2 bg-black/80 text-[#C9A55B] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#C9A55B]/30">
                  {service.category}
                </span>
              </div>

              <div>
                <h3 className="font-serif font-bold text-base text-[#1C1917] dark:text-white">{service.name}</h3>
                <p className="text-xs text-[#6B655F] dark:text-[#888888] line-clamp-2 mt-1">{service.description}</p>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#E5DFD3] dark:border-[#262626]">
                <span className="text-sm font-bold text-[#806020] dark:text-[#C9A55B]">${service.basePrice.toLocaleString()} MXN</span>
                <LuxuryButton variant="outline" size="sm" onClick={onGoToReservas}>
                  Reservar
                </LuxuryButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
