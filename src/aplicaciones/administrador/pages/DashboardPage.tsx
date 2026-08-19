import React, { useState, useEffect } from 'react';
import { 
  Activity, Calendar, Users, UserCheck, DollarSign, 
  MapPin, Clock, Star, ShieldAlert, Sparkles, Navigation, 
  CheckCircle2, AlertTriangle, ArrowUpRight, Zap, RefreshCw, ChevronRight, Lock, ShieldCheck, XCircle, Car
} from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { useTherapistContext } from '../../../shared/context/TherapistContext';
import { useToast } from '../../../shared/context/ToastContext';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { Booking, Therapist, BookingState } from '../../../shared/types';
import { ReservasMap } from '../components/ReservasMap';
import { AdminStatsPanel } from '../components/AdminStatsPanel';

export const DashboardPage: React.FC = () => {
  const { 
    bookings, therapists, clients, zones, auditLogs, 
    handleReassignTherapist 
  } = useAdmin();
  const { therapists: fullTherapists } = useTherapistContext();
  const { showToast } = useToast();

  const pendingTherapistsCount = fullTherapists.filter(t => t.estado === 'pendiente').length;
  const approvedTherapistsCount = fullTherapists.filter(t => t.estado === 'activo').length;
  const rejectedTherapistsCount = fullTherapists.filter(t => t.estado === 'rechazado').length;

  // Selected Active Booking for Live Tracking
  const activeServicesOnTrack = bookings.filter(b => 
    b.state === 'en_camino' || b.state === 'llegue' || b.state === 'servicio_iniciado' || b.state === 'aceptado'
  );

  const [selectedTrackBookingId, setSelectedTrackBookingId] = useState<string>(
    activeServicesOnTrack.length > 0 ? activeServicesOnTrack[0].id : bookings[0]?.id || ''
  );

  // Auto-focus on active tracking booking whenever a masseuse starts route or arrives
  useEffect(() => {
    if (activeServicesOnTrack.length > 0) {
      const isCurrentActive = activeServicesOnTrack.some(b => b.id === selectedTrackBookingId);
      if (!isCurrentActive) {
        setSelectedTrackBookingId(activeServicesOnTrack[0].id);
      }
    }
  }, [bookings]);

  const currentTrackBooking = bookings.find(b => b.id === selectedTrackBookingId) || bookings[0];

  // Find assigned therapist if any
  const assignedTherapist = therapists.find(t => t.id === currentTrackBooking?.therapistId);

  // Financial KPIs
  const totalGMV = bookings.reduce((acc, b) => acc + (b.total || b.price || 0), 0);
  const todayRevenue = bookings
    .filter(b => b.state !== 'cancelado')
    .reduce((acc, b) => acc + (b.total || b.price || 0), 0);
  
  const activeCount = bookings.filter(b => b.state !== 'servicio_finalizado' && b.state !== 'cancelado').length;
  const finishedCount = bookings.filter(b => b.state === 'servicio_finalizado').length;
  const canceledCount = bookings.filter(b => b.state === 'cancelado').length;

  const avgRating = (therapists.reduce((acc, t) => acc + t.rating, 0) / (therapists.length || 1)).toFixed(2);

  // Status Step Progress Bar Helper
  const getStepNumber = (state: BookingState) => {
    switch (state) {
      case 'pendiente': return 0;
      case 'aceptado': return 1;
      case 'en_camino': return 2;
      case 'llegue': return 3;
      case 'servicio_iniciado': return 4;
      case 'servicio_finalizado': return 5;
      default: return 0;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner / Hero Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#141414] border border-[#262626] rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#C9A55B]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <div className="flex items-center space-x-2 text-[#C9A55B]">
            <Activity className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest">
              CENTRO DE OPERACIONES SERVICIOS A DOMICILIO ESSENYA
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            Monitoreo en Tiempo Real CDMX
          </h1>
          <p className="text-xs text-[#888888] max-w-xl">
            Control de logística VIP, radar geolocalizado con estricto protocolo de privacidad y despacho inteligente de terapeutas.
          </p>
        </div>

        <div className="flex items-center space-x-3 relative z-10">
          <div className="bg-[#1A1A1A] border border-[#333333] px-4 py-2 rounded-2xl text-right">
            <span className="text-[10px] text-[#888888] block">Servicios Activos Hoy</span>
            <span className="text-lg font-serif font-bold text-[#C9A55B]">{activeCount} En Curso</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-center text-[#888888]">
            <span className="text-xs font-semibold">Reservas Hoy</span>
            <Calendar className="w-4 h-4 text-[#C9A55B]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-serif font-bold text-white">{bookings.length}</span>
            <span className="text-[10px] text-emerald-400 font-bold">{finishedCount} concluidos</span>
          </div>
          <p className="text-[10px] text-[#888888]">{canceledCount} cancelaciones registradas</p>
        </div>

        {/* KPI 2 */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center text-[#888888]">
            <span className="text-xs font-semibold">Ingresos Hoy (GMV)</span>
            <DollarSign className="w-4 h-4 text-[#C9A55B]" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-serif font-bold text-[#C9A55B]">${todayRevenue.toLocaleString()}</span>
            <span className="text-[10px] text-[#888888]">MXN</span>
          </div>
          <p className="text-[10px] text-emerald-400 font-semibold">100% cobro garantizado</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center text-[#888888]">
            <span className="text-xs font-semibold">Red Terapeutas</span>
            <UserCheck className="w-4 h-4 text-[#C9A55B]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-serif font-bold text-white">{therapists.length}</span>
            <span className="text-[10px] text-[#C9A55B] font-mono">⭐ {avgRating}</span>
          </div>
          <p className="text-[10px] text-[#888888]">{therapists.filter(t => t.status === 'disponible').length} disponibles en zona</p>
        </div>

        {/* KPI 4 */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center text-[#888888]">
            <span className="text-xs font-semibold">Socios VIP Activos</span>
            <Users className="w-4 h-4 text-[#C9A55B]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-serif font-bold text-white">{clients.length}</span>
            <span className="text-[10px] text-emerald-400 font-bold">100% Verificados</span>
          </div>
          <p className="text-[10px] text-[#888888]">3 Membresías Black & Diamond</p>
        </div>
      </div>

      {/* Indicadores de Acreditación de Masajistas */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 space-y-3 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#262626] pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-[#C9A55B]" />
            <h3 className="font-serif font-bold text-sm text-white">
              Estado de Solicitudes y Acreditación de Masajistas
            </h3>
          </div>
          <span className="text-[10px] text-[#888888] font-mono">Control Aprobación ESSENYA</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#1A1A1A] border border-[#C9A55B]/40 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#C9A55B] font-bold uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Masajistas Pendientes</span>
              </p>
              <p className="text-2xl font-mono font-bold text-[#C9A55B] mt-1">{pendingTherapistsCount}</p>
              <p className="text-[10px] text-[#888888] mt-0.5">Expedientes por revisar</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#C9A55B]/10 border border-[#C9A55B]/30 flex items-center justify-center text-[#C9A55B]">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-emerald-500/30 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Masajistas Aprobadas</span>
              </p>
              <p className="text-2xl font-mono font-bold text-emerald-400 mt-1">{approvedTherapistsCount}</p>
              <p className="text-[10px] text-[#888888] mt-0.5">Acceso activo al Radar</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-red-500/30 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>Masajistas Rechazadas</span>
              </p>
              <p className="text-2xl font-mono font-bold text-red-400 mt-1">{rejectedTherapistsCount}</p>
              <p className="text-[10px] text-[#888888] mt-0.5">Solicitudes no acreditadas</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Operations Radar & Tracking Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Tracking Map (Left 2 Columns) */}
        <div className="lg:col-span-2 bg-[#141414] border border-[#262626] rounded-3xl p-6 space-y-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#262626] pb-4">
            <div>
              <div className="flex items-center space-x-2 text-[#C9A55B]">
                <Navigation className="w-4 h-4 animate-pulse" />
                <h3 className="font-serif font-bold text-lg text-white">
                  Monitoreo GPS en Vivo — Ruta hacia Domicilio CDMX
                </h3>
              </div>
              <p className="text-xs text-[#888888] mt-0.5">
                Visualización de la terapeuta en camino al domicilio y estado del servicio en tiempo real.
              </p>
            </div>

            {/* Privacy Compliance & Realtime Badge */}
            <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-[10px] text-emerald-400 font-semibold shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Telemetría GPS Activa</span>
            </div>
          </div>

          {/* Real Live Tracking Map Component */}
          {currentTrackBooking ? (
            <div className="w-full space-y-3">
              <div className="rounded-2xl overflow-hidden border border-[#262626] shadow-xl">
                <ReservasMap
                  clientAddress={currentTrackBooking.clientAddress || 'Paseo de las Palmas 781, Lomas de Chapultepec'}
                  cityZone={currentTrackBooking.cityZone || 'Lomas'}
                  therapistName={currentTrackBooking.therapistName || assignedTherapist?.name || 'Terapeuta ESSENYA'}
                  therapistPhoto={currentTrackBooking.therapistPhoto || assignedTherapist?.photo || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'}
                  bookingState={currentTrackBooking.state}
                />
              </div>

              {/* Status Header info */}
              <div className="bg-[#1A1A1A] border border-[#262626] rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-[#C9A55B] font-bold uppercase">
                      SERVICIO #{currentTrackBooking.code || currentTrackBooking.id}
                    </span>
                    <h4 className="font-serif font-bold text-base text-white">
                      {currentTrackBooking.serviceName} ({currentTrackBooking.durationMinutes} min)
                    </h4>
                    <p className="text-xs text-[#888888]">
                      Terapeuta: <strong className="text-[#C9A55B]">{currentTrackBooking.therapistName || assignedTherapist?.name || 'Sin asignar'}</strong> • Cliente: <strong className="text-white">{currentTrackBooking.clientName}</strong>
                    </p>
                    <p className="text-[11px] text-[#AAAAAA] mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#C9A55B] shrink-0" />
                      <span>Destino: {currentTrackBooking.clientAddress} ({currentTrackBooking.cityZone})</span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>ETA: ~{currentTrackBooking.etaMinutes || 15} MIN</span>
                    </span>
                  </div>
                </div>

                {/* READ-ONLY Progress Steps Indicator - Controlled EXCLUSIVELY by Therapist */}
                <div className="pt-2 border-t border-[#262626] space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#888888]">
                    <span className="flex items-center gap-1.5 font-semibold text-white/90">
                      <Lock className="w-3.5 h-3.5 text-[#C9A55B]" />
                      <span>Estado del Servicio (Solo Lectura — La terapeuta es quien actualiza las etapas desde su app)</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    {[
                      { state: 'en_camino', label: '1. En Camino' },
                      { state: 'llegue', label: '2. Llegó a Domicilio' },
                      { state: 'servicio_iniciado', label: '3. En Sesión' },
                      { state: 'servicio_finalizado', label: '4. Concluido' },
                    ].map((stepItem) => {
                      const isCurrent = currentTrackBooking.state === stepItem.state;
                      const isPast = getStepNumber(currentTrackBooking.state) > getStepNumber(stepItem.state as any);

                      return (
                        <div
                          key={stepItem.state}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                            isCurrent
                              ? 'bg-[#C9A55B] text-black border-[#C9A55B] shadow-md ring-2 ring-[#C9A55B]/40'
                              : isPast
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-[#141414] text-[#666666] border-[#262626]'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {isPast && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                            {isCurrent && <span className="w-2 h-2 rounded-full bg-black animate-ping" />}
                            <span>{stepItem.label}</span>
                          </div>
                          {isCurrent && (
                            <span className="block text-[9px] font-mono font-extrabold uppercase mt-0.5 tracking-wider">
                              ● EN CURSO
                            </span>
                          )}
                          {isPast && (
                            <span className="block text-[9px] font-mono text-emerald-400/90 mt-0.5">
                              ✓ Completado
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center text-center p-8 bg-[#0D0D0D] border border-[#262626] rounded-2xl text-[#888888] space-y-2">
              <Car className="w-10 h-10 text-[#444444]" />
              <p className="text-sm font-semibold text-white">No hay servicios en curso</p>
              <p className="text-xs max-w-sm">Cuando una terapeuta acepte un servicio y se ponga en camino, el mapa y ruta aparecerán aquí automáticamente.</p>
            </div>
          )}
        </div>

        {/* Live Active Services Feed & Urgent Alerts (Right 1 Column) */}
        <div className="space-y-6">
          {/* Active Bookings Quick Switch List */}
          <div className="bg-[#141414] border border-[#262626] rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#262626] pb-3">
              <h3 className="font-serif font-bold text-sm text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C9A55B]" />
                <span>Servicios de Hoy ({bookings.length})</span>
              </h3>
              <span className="text-[10px] text-[#C9A55B] font-mono font-bold">LIVE FEED</span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedTrackBookingId(b.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedTrackBookingId === b.id
                      ? 'bg-[#C9A55B]/15 border-[#C9A55B]'
                      : 'bg-[#1A1A1A] border-[#262626] hover:border-[#333333]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[10px] text-[#C9A55B] font-bold">{b.code}</span>
                      <h4 className="font-serif font-bold text-xs text-white line-clamp-1">{b.serviceName}</h4>
                      <p className="text-[10px] text-[#888888]">{b.clientName} ({b.cityZone})</p>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#262626] text-[#AAAAAA] capitalize">
                      {b.state.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Alerts & Audit Activity */}
          <div className="bg-[#141414] border border-[#262626] rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#262626] pb-3">
              <h3 className="font-serif font-bold text-sm text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#C9A55B]" />
                <span>Bitácora & Alertas Operativas</span>
              </h3>
            </div>

            <div className="space-y-3">
              {auditLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="text-xs border-b border-[#262626] pb-2 space-y-0.5">
                  <div className="flex justify-between text-[10px] text-[#888888]">
                    <span className="font-semibold text-[#C9A55B]">{log.action}</span>
                    <span>{log.timestamp.substring(11, 16)} hrs</span>
                  </div>
                  <p className="text-[#CCCCCC] text-[11px]">{log.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics & Monthly Volume / Therapist Occupancy Charts */}
      <div className="pt-4 border-t border-[#262626]">
        <div className="mb-4">
          <h2 className="text-xl font-serif font-bold text-white">Analítica Ejecutiva & Rendimiento</h2>
          <p className="text-xs text-[#888888]">Volumen de reservas mensuales y porcentaje de ocupación por terapeuta.</p>
        </div>
        <AdminStatsPanel />
      </div>
    </div>
  );
};
