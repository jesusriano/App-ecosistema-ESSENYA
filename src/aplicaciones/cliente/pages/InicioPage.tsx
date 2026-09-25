import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, Calendar, Award, ShieldCheck, Clock, MapPin, ChevronRight, 
  Crown, Gem, Shield, Gift, CheckCircle2, Lock, ArrowUpRight, Wallet, X
} from 'lucide-react';
import { useCliente } from '../hooks/useCliente';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { LiveTrackingMap } from '../../../shared/components/LiveTrackingMap';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { RescheduleBookingModal } from '../components/RescheduleBookingModal';
import { CancelBookingModal } from '../components/CancelBookingModal';
import { checkRescheduleEligibility } from '../../../shared/data/scheduling';
import { Booking } from '../../../shared/types';
import { 
  calculateMembershipTier, 
  getCompletedAndPaidBookings, 
  getVipCourtesyStatus 
} from '../services/membershipService';
import { getBilleteraTotalBalance } from '../services/billeteraService';
import { getServiceImage, getStaticServiceImageFallback } from '../../../shared/utils/serviceImage';

interface InicioPageProps {
  onGoToReservas: () => void;
}

export const InicioPage: React.FC<InicioPageProps> = ({ onGoToReservas }) => {
  const { 
    client, 
    bookings, 
    activeBooking, 
    services, 
    handleRescheduleBooking, 
    handleCancelBooking 
  } = useCliente();
  const { getUser } = useAuth();
  const { showToast } = useToast();
  const authUser = getUser('cliente');

  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  const onConfirmReschedule = async (bookingId: string, newDate: string, newTime: string) => {
    if (handleRescheduleBooking) {
      await handleRescheduleBooking(bookingId, newDate, newTime);
      showToast('Cita Reprogramada', `Tu cita ha sido reprogramada para el ${newDate} a las ${newTime} hrs.`, 'success');
    }
  };

  const onConfirmCancel = async (bookingId: string, reason: string) => {
    if (handleCancelBooking) {
      await handleCancelBooking(bookingId, reason);
      showToast('Cita Cancelada', 'Tu cita ha sido cancelada correctamente.', 'info');
    }
  };

  const clientName = authUser?.nombre || (client?.name ? client.name.split(' ')[0] : '') || 'Socio';

  // Masajes concluidos y pagados
  const completedAndPaidBookings = useMemo(() => {
    return getCompletedAndPaidBookings(bookings, client?.id);
  }, [bookings, client?.id]);

  const completedCount = completedAndPaidBookings.length;

  // Información dinámica de categoría y nivel
  const tierInfo = useMemo(() => {
    return calculateMembershipTier(completedCount);
  }, [completedCount]);

  const [billeteraBalance, setBilleteraBalance] = useState<number>(0);
  const [vipCourtesy, setVipCourtesy] = useState<{
    unlocked: boolean;
    used: boolean;
    massagesCompleted: number;
    massagesNeeded: number;
    code: string;
    discountPercent: number;
  }>({
    unlocked: false,
    used: false,
    massagesCompleted: 0,
    massagesNeeded: 5,
    code: 'VIP15',
    discountPercent: 15
  });

  // Fetch async security-sensitive data from Firestore
  React.useEffect(() => {
    const fetchSecurityData = async () => {
      if (client?.id) {
        const balance = await getBilleteraTotalBalance(client.id);
        const courtesy = await getVipCourtesyStatus(client.id, completedCount);
        setBilleteraBalance(balance);
        setVipCourtesy(courtesy);
      }
    };
    fetchSecurityData();
  }, [client?.id, completedCount]);

  const getTierIcon = () => {
    switch (tierInfo.iconType) {
      case 'crown':
        return <Crown className="w-5 h-5 text-[#E6CA65]" />;
      case 'gem':
        return <Gem className="w-5 h-5 text-sky-400" />;
      case 'sparkles':
        return <Sparkles className="w-5 h-5 text-amber-400" />;
      default:
        return <Shield className="w-5 h-5 text-slate-300" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#1C1917] via-[#2A241B] to-[#1C1917] text-white border border-[#C9A55B]/30 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C9A55B]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center space-x-2 bg-[#C9A55B]/20 border border-[#C9A55B]/40 px-3 py-1 rounded-full text-xs font-semibold text-[#E6CA65]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Experiencia de Alta Terapia Spa a Domicilio</span>
            </div>

            <span className={`inline-flex items-center space-x-1.5 text-xs px-3 py-1 rounded-full ${tierInfo.badgeStyle}`}>
              {getTierIcon()}
              <span>{tierInfo.fullLabel}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-wide">
            Hola, {clientName}. Bienvenido a ESSENYA.
          </h1>

          <p className="text-xs sm:text-sm text-[#CCCCCC] leading-relaxed">
            Tu membresía en categoría <strong className="text-[#E6CA65]">{tierInfo.fullLabel}</strong> te concede prioridad inmediata en masajes terapéuticos de alto nivel a domicilio en CDMX, con terapeutas especializadas y kits esterilizados.
          </p>

          <div className="pt-2 flex flex-wrap gap-3 items-center">
            <LuxuryButton variant="gold" size="md" onClick={onGoToReservas}>
              <Calendar className="w-4 h-4 mr-1.5" />
              <span>Agendar Nuevo Masaje</span>
            </LuxuryButton>

            {billeteraBalance > 0 && (
              <div className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white">
                <Wallet className="w-4 h-4 text-[#E6CA65]" />
                <span>Saldo en Billetera: <strong className="text-[#E6CA65] font-bold">${billeteraBalance.toLocaleString()} MXN</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN PRINCIPAL: SISTEMA DE NIVELES Y CATEGORÍAS DE MEMBRESÍA */}
      <section 
        id="seccion-membresia-niveles"
        className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm transition-all relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5DFD3] dark:border-[#262626] pb-5">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Award className="w-4 h-4 text-[#C9A55B]" />
              <span className="text-xs uppercase tracking-widest font-bold text-[#806020] dark:text-[#C9A55B]">
                Club de Beneficios y Lealtad ESSENYA
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1C1917] dark:text-white flex items-center gap-3">
              <span>Tu Categoría Actual:</span>
              <span className={`inline-flex items-center space-x-1.5 text-xs sm:text-sm px-3.5 py-1 rounded-full ${tierInfo.badgeStyle}`}>
                {getTierIcon()}
                <span>{tierInfo.fullLabel}</span>
              </span>
            </h2>
          </div>

          <div className="text-left sm:text-right bg-[#FAF8F5] dark:bg-[#1A1A1A] px-4 py-2.5 rounded-2xl border border-[#E5DFD3] dark:border-[#262626]">
            <span className="text-[11px] text-[#6B655F] dark:text-[#888888] block">Masajes Completados y Pagados:</span>
            <span className="text-lg sm:text-xl font-serif font-bold text-[#806020] dark:text-[#E6CA65]">
              {completedCount} {completedCount === 1 ? 'Masaje' : 'Masajes'}
            </span>
          </div>
        </div>

        {/* Dynamic Progress towards Next Level */}
        <div className="space-y-3 bg-[#FAF8F5] dark:bg-[#1A1A1A] p-5 rounded-2xl border border-[#E5DFD3] dark:border-[#262626]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-[#1C1917] dark:text-white block">
                Progreso hacia: <strong className="text-[#806020] dark:text-[#E6CA65]">{tierInfo.nextTier}</strong>
              </span>
              <span className="text-[#6B655F] dark:text-[#AAAAAA]">
                {tierInfo.incentiveMessage}
              </span>
            </div>

            <div className="font-mono font-bold text-[#806020] dark:text-[#E6CA65] bg-white dark:bg-[#222222] px-3 py-1 rounded-lg border border-[#E5DFD3] dark:border-[#333333] shrink-0">
              {tierInfo.progressPercent}% Completado
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full bg-[#E5DFD3] dark:bg-[#2A2A2A] h-3 rounded-full overflow-hidden p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${tierInfo.progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-[#C9A55B] via-[#E6CA65] to-[#B38728] rounded-full shadow-sm"
            />
          </div>

          {tierInfo.neededForNext > 0 ? (
            <div className="flex items-center justify-between text-[11px] text-[#6B655F] dark:text-[#888888] pt-1">
              <span>Nivel actual: {tierInfo.fullLabel}</span>
              <span className="font-semibold text-[#806020] dark:text-[#C9A55B]">
                {tierInfo.neededForNext === 1 ? '¡Solo 1 masaje restante para subir!' : `Faltan ${tierInfo.neededForNext} masajes para ascender`}
              </span>
              <span>Próximo nivel: {tierInfo.nextTier}</span>
            </div>
          ) : (
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold pt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Has alcanzado el estatus máximo de excelencia vitalicia.</span>
            </div>
          )}
        </div>

        {/* Benefits Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Current Category Benefits */}
          <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-5 rounded-2xl border border-[#E5DFD3] dark:border-[#262626] space-y-3">
            <div className="flex items-center justify-between border-b border-[#E5DFD3] dark:border-[#262626] pb-2.5">
              <h3 className="font-serif font-bold text-sm text-[#1C1917] dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#C9A55B]" />
                <span>Beneficios de tu Categoría ({tierInfo.fullLabel})</span>
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Activos Ahora
              </span>
            </div>

            <ul className="space-y-2.5 text-xs text-[#44403C] dark:text-[#D6D3D1]">
              {tierInfo.perks.map((perk, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A55B] mt-1.5 shrink-0" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Siguiente Categoría & Beneficio Cortesía VIP */}
          <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-5 rounded-2xl border border-[#E5DFD3] dark:border-[#262626] space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-[#E5DFD3] dark:border-[#262626] pb-2.5">
                <h3 className="font-serif font-bold text-sm text-[#1C1917] dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E6CA65]" />
                  <span>Próxima Meta: {tierInfo.nextTier}</span>
                </h3>
                <span className="text-[10px] font-bold text-[#806020] dark:text-[#C9A55B] bg-[#C9A55B]/10 px-2 py-0.5 rounded border border-[#C9A55B]/20">
                  Por Desbloquear
                </span>
              </div>
              <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] mt-2">
                Al alcanzar <strong>{tierInfo.nextTier}</strong> tendrás prioridad adicional en reservas, tarifas exclusivas y acceso a promociones de élite.
              </p>
            </div>

            {/* Beneficio Cortesía VIP Preview Card */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#202020] border border-[#E5DFD3] dark:border-[#333333] space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#1C1917] dark:text-white flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-[#C9A55B]" />
                  <span>Beneficio "Cortesía VIP" (15% de Descuento)</span>
                </span>
                {vipCourtesy.used ? (
                  <span className="text-[10px] font-bold text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded">
                    Utilizado
                  </span>
                ) : vipCourtesy.unlocked ? (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    ¡Disponible! Código: VIP15
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Requiere 5 masajes ({completedCount}/5)</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#6B655F] dark:text-[#888888]">
                {vipCourtesy.unlocked && !vipCourtesy.used
                  ? '¡Has desbloqueado este beneficio exclusivo! Utiliza el código VIP15 al agendar tu próxima reserva.'
                  : vipCourtesy.used
                  ? 'Este beneficio de uso único ya fue redimido en una cita anterior.'
                  : `Se desbloquea al acumular 5 masajes terminados y pagados. Te faltan ${vipCourtesy.massagesNeeded} sesiones.`}
              </p>
            </div>
          </div>
        </div>

        {/* Action button inside Membership section */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E5DFD3] dark:border-[#262626]">
          <p className="text-xs text-[#6B655F] dark:text-[#888888]">
            Cada masaje concluido y pagado en tu domicilio acumula puntos y te acerca a la siguiente categoría.
          </p>
          <LuxuryButton variant="gold" size="sm" onClick={onGoToReservas}>
            <span>Reservar Masaje para Subir de Nivel</span>
            <ArrowUpRight className="w-4 h-4 ml-1.5" />
          </LuxuryButton>
        </div>
      </section>

      {/* Active Service Tracking if available */}
      {activeBooking && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-serif font-bold text-[#1C1917] dark:text-white flex items-center space-x-2">
              <Clock className="w-5 h-5 text-[#C9A55B]" />
              <span>Servicio Activo en Seguimiento en Vivo</span>
            </h2>
            <span className="text-xs font-mono font-bold bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] px-3 py-1 rounded-full border border-[#C9A55B]/30">
              Cita #{activeBooking.code || activeBooking.id}
            </span>
          </div>

          <LiveTrackingMap
            clientAddress={activeBooking.clientAddress}
            cityZone={activeBooking.cityZone}
            therapistName={activeBooking.therapistName}
            therapistPhoto={activeBooking.therapistPhoto}
            bookingState={activeBooking.state}
          />

          {/* Quick Action Buttons for Cancellation (<4h policy) and Reschedule */}
          {activeBooking.state !== 'servicio_finalizado' && activeBooking.state !== 'cancelado' && (
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  const eligibility = checkRescheduleEligibility(activeBooking.date, activeBooking.time, activeBooking.state);
                  if (!eligibility.canReschedule) {
                    showToast('Reprogramación no disponible', 'Esta reserva ya no puede reprogramarse porque faltan menos de 4 horas para el inicio del servicio.', 'error');
                  }
                  setRescheduleTarget(activeBooking);
                }}
                className="flex items-center space-x-1.5 bg-[#FAF6EE] dark:bg-[#222222] border border-[#C9A55B]/40 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#806020] dark:text-[#C9A55B] hover:bg-[#C9A55B] hover:text-black transition-all cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-[#C9A55B]" />
                <span>Reprogramar Masaje</span>
              </button>
              <button
                type="button"
                onClick={() => setCancelTarget(activeBooking)}
                className="flex items-center space-x-1.5 bg-rose-500/10 border border-rose-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                title="Cancelación disponible hasta 4 horas antes"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancelar Cita</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Featured Treatments */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-serif font-bold text-[#1C1917] dark:text-white">
            Tratamientos Destacados ESSENYA
          </h2>
          <button onClick={onGoToReservas} className="text-xs font-bold text-[#806020] dark:text-[#C9A55B] hover:underline flex items-center cursor-pointer">
            <span>Ver Catálogo Completo</span>
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
                <img 
                  src={getServiceImage(service)} 
                  alt={service.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const fb = getStaticServiceImageFallback(service?.id || service?.name);
                    if (target.src !== fb) target.src = fb;
                  }}
                />
                <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-[#C9A55B]/40 flex items-center space-x-1 shadow-md">
                  <span className="text-[9px] font-serif font-bold text-[#C9A55B] tracking-widest">ESSENYA</span>
                </div>
                <span className="absolute top-2.5 right-2.5 bg-black/80 text-[#C9A55B] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#C9A55B]/30">
                  {service.category}
                </span>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-6">
                  <p className="text-white font-serif font-bold text-xs tracking-wide drop-shadow-md">{service.name}</p>
                </div>
              </div>

              <div>
                <h3 className="font-serif font-bold text-base text-[#1C1917] dark:text-white">{service.name}</h3>
                <p className="text-xs text-[#6B655F] dark:text-[#888888] line-clamp-2 mt-1">{service.description}</p>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#E5DFD3] dark:border-[#262626]">
                <span className="text-sm font-bold text-[#806020] dark:text-[#C9A55B]">${service.basePrice.toLocaleString()} MXN</span>
                <LuxuryButton variant="outline" size="sm" onClick={onGoToReservas}>
                  Reservar Cita
                </LuxuryButton>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reschedule Booking Modal */}
      <RescheduleBookingModal
        isOpen={!!rescheduleTarget}
        booking={rescheduleTarget}
        isHighTier={tierInfo.tierName === 'Black' || tierInfo.tierName === 'Gold' || tierInfo.isDiamondOrHigher}
        onClose={() => setRescheduleTarget(null)}
        onConfirmReschedule={onConfirmReschedule}
      />

      {/* Cancel Booking Modal (Enforcing 4-hour rule) */}
      <CancelBookingModal
        isOpen={!!cancelTarget}
        booking={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirmCancel={onConfirmCancel}
      />
    </div>
  );
};
