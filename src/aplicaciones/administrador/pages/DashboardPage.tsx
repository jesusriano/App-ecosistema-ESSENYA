import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { AdminRechartsDashboard } from '../components/AdminRechartsDashboard';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    bookings, therapists, clients, zones, auditLogs, 
    handleReassignTherapist, panicAlerts, activePanicAlertsCount,
    handleResolvePanicAlert, handleAttendPanicAlert
  } = useAdmin();
  const { therapists: fullTherapists } = useTherapistContext();
  const { showToast } = useToast();

  const activePanicAlerts = useMemo(() => {
    return (panicAlerts || []).filter(a => a && (a.status === 'activa' || a.status === 'en_atencion'));
  }, [panicAlerts]);
  const [userSelectedPanicAlertId, setUserSelectedPanicAlertId] = useState<string | null>(null);

  const selectedPanicAlert = useMemo(() => {
    if (activePanicAlerts.length === 0) return null;
    if (userSelectedPanicAlertId && activePanicAlerts.some(a => a.id === userSelectedPanicAlertId)) {
      return activePanicAlerts.find(a => a.id === userSelectedPanicAlertId) || activePanicAlerts[0];
    }
    return activePanicAlerts[0];
  }, [activePanicAlerts, userSelectedPanicAlertId]);

  const pendingTherapistsCount = fullTherapists.filter(t => t.estado === 'pendiente').length;
  const approvedTherapistsCount = fullTherapists.filter(t => t.estado === 'activo').length;
  const rejectedTherapistsCount = fullTherapists.filter(t => t.estado === 'rechazado').length;

  const formatLogTime = (ts: any): string => {
    if (!ts) return '';
    if (typeof ts === 'string') {
      return ts.length >= 16 ? ts.substring(11, 16) : ts;
    }
    try {
      const date = ts instanceof Date ? ts : (typeof ts.toDate === 'function' ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts)));
      if (!isNaN(date.getTime())) {
        return date.toTimeString().substring(0, 5);
      }
    } catch (e) {}
    return String(ts);
  };

  // Selected Active Booking for Live Tracking
  const activeServicesOnTrack = useMemo(() => {
    return (bookings || []).filter(b => 
      b && (b.state === 'en_camino' || b.state === 'llegue' || b.state === 'servicio_iniciado' || b.state === 'aceptada')
    );
  }, [bookings]);

  const [userSelectedTrackBookingId, setUserSelectedTrackBookingId] = useState<string>('');

  const selectedTrackBookingId = useMemo(() => {
    if (userSelectedTrackBookingId && (bookings || []).some(b => b.id === userSelectedTrackBookingId)) {
      return userSelectedTrackBookingId;
    }
    if (activeServicesOnTrack.length > 0) {
      return activeServicesOnTrack[0].id;
    }
    return bookings[0]?.id || '';
  }, [bookings, activeServicesOnTrack, userSelectedTrackBookingId]);

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

  const avgRating = (therapists.reduce((acc, t) => acc + (t.rating || 5), 0) / (therapists.length || 1)).toFixed(2);

  // Status Step Progress Bar Helper
  const getStepNumber = (state: BookingState) => {
    switch (state) {
      case 'pendiente': return 0;
      case 'aceptada': return 1;
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#C9A55B]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <div className="flex items-center space-x-2 text-[#C9A55B]">
            <Activity className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest">
              CENTRO DE OPERACIONES SERVICIOS A DOMICILIO ESSENYA
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text-primary)]">
            Monitoreo en Tiempo Real CDMX
          </h1>
          <p className="text-xs text-[var(--text-muted)] max-w-xl">
            Control de logística VIP, radar geolocalizado con estricto protocolo de privacidad y despacho inteligente de terapeutas.
          </p>
        </div>

        <div className="flex items-center space-x-3 relative z-10">
          <div className="bg-[var(--bg-subcard)] border border-[var(--border-color)] px-4 py-2 rounded-2xl text-right">
            <span className="text-[10px] text-[var(--text-muted)] block">Servicios Activos Hoy</span>
            <span className="text-lg font-serif font-bold text-[#C9A55B]">{activeCount} En Curso</span>
          </div>
        </div>
      </div>

      {/* SOS Panic Alerts Realtime Panel (High Priority) */}
      {panicAlerts.length > 0 && (
        <div className={`rounded-3xl p-5 border transition-all ${
          activePanicAlerts.length > 0
            ? 'bg-gradient-to-r from-red-950/70 via-[#1F1212] to-[#141414] border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
            : 'bg-[var(--bg-card)] border-[var(--border-color)]'
        }`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-red-500/30 pb-3">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                activePanicAlerts.length > 0
                  ? 'bg-red-600 text-white animate-bounce shadow-lg shadow-red-600/40'
                  : 'bg-[var(--bg-subcard)] text-[var(--text-muted)]'
              }`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-base text-[var(--text-primary)]">
                    Central de Telemetría SOS & Solicitudes de Ubicación
                  </h3>
                  {activePanicAlerts.length > 0 ? (
                    <span className="bg-red-600 text-white text-[10px] font-mono font-black px-2 py-0.5 rounded-full animate-pulse">
                      {activePanicAlerts.length} ALERTA{activePanicAlerts.length > 1 ? 'S' : ''} ACTIVA{activePanicAlerts.length > 1 ? 'S' : ''}
                    </span>
                  ) : (
                    <span className="bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Sin Alertas Pendientes
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Transmisión continua de coordenadas GPS vía Firestore desde el botón de pánico del cliente/terapeuta.
                </p>
              </div>
            </div>

            <div className="text-right text-[11px] font-mono text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Satelital Firestore 24/7</span>
            </div>
          </div>

          {/* List of Recent & Active Alerts */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {panicAlerts.slice(0, 3).map((alert) => {
              const isActive = alert.status === 'activa';
              const isAttending = alert.status === 'en_atencion';
              const isResolved = alert.status === 'resuelta';

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                    isActive
                      ? 'bg-red-950/40 border-red-500 shadow-md ring-1 ring-red-500/50'
                      : isAttending
                      ? 'bg-amber-950/30 border-amber-500/50'
                      : 'bg-[var(--bg-subcard)] border-[var(--border-color)] opacity-75'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-[10px] text-[#C9A55B] font-bold">
                        {alert.id}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isActive
                          ? 'bg-red-600 text-white animate-pulse'
                          : isAttending
                          ? 'bg-amber-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {alert.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                      <span>{alert.userName}</span>
                      <span className="text-[10px] font-normal text-[var(--text-muted)] capitalize">
                        ({alert.userRole})
                      </span>
                    </h4>

                    <p className="text-xs text-[var(--text-primary)] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-red-500 dark:text-red-400 shrink-0" />
                      <span className="truncate">{alert.userLocation}</span>
                    </p>

                    {/* GPS Exact Coordinates Display */}
                    <div className="bg-[var(--bg-main)] p-2 rounded-xl text-[11px] font-mono flex items-center justify-between text-emerald-600 dark:text-emerald-400 border border-[var(--border-color)]">
                      <span>Lat: {alert.latitude?.toFixed(5) || '19.4326'}</span>
                      <span>Lng: {alert.longitude?.toFixed(5) || '-99.1913'}</span>
                      <span className="text-[9px] text-[var(--text-muted)]">±{Math.round(alert.accuracy || 10)}m</span>
                    </div>

                    {alert.notes && (
                      <p className="text-[10px] text-[var(--text-muted)] italic line-clamp-2">
                        "{alert.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions for Admin */}
                  <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-[var(--bg-card)] hover:bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] text-[11px] font-bold rounded-lg transition-all flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3 text-[#C9A55B]" />
                      <span>Ver Mapa</span>
                    </a>

                    <div className="flex items-center gap-1.5">
                      {isActive && (
                        <button
                          type="button"
                          onClick={() => {
                            handleAttendPanicAlert(alert.id);
                            showToast('Alerta en Atención', `Personal del S.O.C. asignado a la alerta ${alert.id}`, 'info');
                          }}
                          className="px-2 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-500 dark:text-amber-300 text-[10px] font-bold rounded-lg border border-amber-500/40 transition-all cursor-pointer"
                        >
                          Atender
                        </button>
                      )}

                      {!isResolved && (
                        <button
                          type="button"
                          onClick={() => {
                            handleResolvePanicAlert(alert.id);
                            showToast('Alerta Resuelta', `La alerta ${alert.id} fue archivada como atendida.`, 'success');
                          }}
                          className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-500/40 transition-all cursor-pointer"
                        >
                          Resolver
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div 
          onClick={() => navigate('/admin/reservas')}
          className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#C9A55B]/60 rounded-2xl p-4 space-y-2 relative overflow-hidden cursor-pointer transition-all hover:shadow-md group"
          title="Ver Módulo de Reservas"
        >
          <div className="flex justify-between items-center text-[var(--text-muted)] group-hover:text-[#C9A55B] transition-colors">
            <span className="text-xs font-semibold">Reservas Hoy</span>
            <Calendar className="w-4 h-4 text-[#C9A55B]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-serif font-bold text-[var(--text-primary)]">{bookings.length}</span>
            <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold">{finishedCount} concluidos</span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] flex items-center justify-between">
            <span>{canceledCount} cancelaciones</span>
            <span className="text-[#C9A55B] text-[10px] font-bold group-hover:translate-x-0.5 transition-transform">Ver &rarr;</span>
          </p>
        </div>

        {/* KPI 2 */}
        <div 
          onClick={() => navigate('/admin/finanzas')}
          className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#C9A55B]/60 rounded-2xl p-4 space-y-2 cursor-pointer transition-all hover:shadow-md group"
          title="Ver Módulo de Finanzas"
        >
          <div className="flex justify-between items-center text-[var(--text-muted)] group-hover:text-[#C9A55B] transition-colors">
            <span className="text-xs font-semibold">Ingresos Hoy (GMV)</span>
            <DollarSign className="w-4 h-4 text-[#C9A55B]" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-serif font-bold text-[#C9A55B]">${todayRevenue.toLocaleString()}</span>
            <span className="text-[10px] text-[var(--text-muted)]">MXN</span>
          </div>
          <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-semibold flex items-center justify-between">
            <span>100% cobro garantizado</span>
            <span className="text-[#C9A55B] text-[10px] font-bold group-hover:translate-x-0.5 transition-transform">Ver &rarr;</span>
          </p>
        </div>

        {/* KPI 3 */}
        <div 
          onClick={() => navigate('/admin/terapeutas')}
          className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#C9A55B]/60 rounded-2xl p-4 space-y-2 cursor-pointer transition-all hover:shadow-md group"
          title="Ver Red de Terapeutas"
        >
          <div className="flex justify-between items-center text-[var(--text-muted)] group-hover:text-[#C9A55B] transition-colors">
            <span className="text-xs font-semibold">Red Terapeutas</span>
            <UserCheck className="w-4 h-4 text-[#C9A55B]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-serif font-bold text-[var(--text-primary)]">{therapists.length}</span>
            <span className="text-[10px] text-[#C9A55B] font-mono">⭐ {avgRating}</span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] flex items-center justify-between">
            <span>{therapists.filter(t => t.status === 'disponible').length} disponibles</span>
            <span className="text-[#C9A55B] text-[10px] font-bold group-hover:translate-x-0.5 transition-transform">Gestionar &rarr;</span>
          </p>
        </div>

        {/* KPI 4 */}
        <div 
          onClick={() => navigate('/admin/clientes')}
          className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#C9A55B]/60 rounded-2xl p-4 space-y-2 cursor-pointer transition-all hover:shadow-md group"
          title="Ver Socios VIP"
        >
          <div className="flex justify-between items-center text-[var(--text-muted)] group-hover:text-[#C9A55B] transition-colors">
            <span className="text-xs font-semibold">Socios VIP Activos</span>
            <Users className="w-4 h-4 text-[#C9A55B]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-serif font-bold text-[var(--text-primary)]">{clients.length}</span>
            <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold">100% Verificados</span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] flex items-center justify-between">
            <span>3 Membresías Black</span>
            <span className="text-[#C9A55B] text-[10px] font-bold group-hover:translate-x-0.5 transition-transform">Ver &rarr;</span>
          </p>
        </div>
      </div>

      {/* Indicadores de Acreditación de Masajistas */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-[#C9A55B]" />
            <h3 className="font-serif font-bold text-sm text-[var(--text-primary)]">
              Estado de Solicitudes y Acreditación de Masajistas
            </h3>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">Control Aprobación ESSENYA</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div 
            onClick={() => navigate('/admin/terapeutas')}
            className="bg-[var(--bg-subcard)] border border-[#C9A55B]/40 hover:border-[#C9A55B] rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all hover:shadow-md group"
            title="Ir a Terapeutas Pendientes"
          >
            <div>
              <p className="text-[10px] text-[#C9A55B] font-bold uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Masajistas Pendientes</span>
              </p>
              <p className="text-2xl font-mono font-bold text-[#C9A55B] mt-1">{pendingTherapistsCount}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                <span>Expedientes por revisar</span>
                <span className="text-[#C9A55B] font-bold group-hover:translate-x-0.5 transition-transform">&rarr;</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#C9A55B]/10 border border-[#C9A55B]/30 flex items-center justify-center text-[#C9A55B] group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div 
            onClick={() => navigate('/admin/terapeutas')}
            className="bg-[var(--bg-subcard)] border border-emerald-500/30 hover:border-emerald-500 rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all hover:shadow-md group"
            title="Ir a Terapeutas Aprobadas"
          >
            <div>
              <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Masajistas Aprobadas</span>
              </p>
              <p className="text-2xl font-mono font-bold text-emerald-500 dark:text-emerald-400 mt-1">{approvedTherapistsCount}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                <span>Acceso activo al Radar</span>
                <span className="text-emerald-500 font-bold group-hover:translate-x-0.5 transition-transform">&rarr;</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div 
            onClick={() => navigate('/admin/terapeutas')}
            className="bg-[var(--bg-subcard)] border border-red-500/30 hover:border-red-500 rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all hover:shadow-md group"
            title="Ir a Terapeutas Rechazadas"
          >
            <div>
              <p className="text-[10px] text-red-500 dark:text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>Masajistas Rechazadas</span>
              </p>
              <p className="text-2xl font-mono font-bold text-red-500 dark:text-red-400 mt-1">{rejectedTherapistsCount}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                <span>Solicitudes no acreditadas</span>
                <span className="text-red-500 font-bold group-hover:translate-x-0.5 transition-transform">&rarr;</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 dark:text-red-400 group-hover:scale-110 transition-transform">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Operations Radar & Tracking Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Tracking Map (Left 2 Columns) */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[var(--border-color)] pb-4">
            <div>
              <div className="flex items-center space-x-2 text-[#C9A55B]">
                <Navigation className="w-4 h-4 animate-pulse" />
                <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">
                  Monitoreo GPS en Vivo — Ruta hacia Domicilio CDMX
                </h3>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Visualización de la terapeuta en camino al domicilio y estado del servicio en tiempo real.
              </p>
            </div>

            {/* Privacy Compliance & Realtime Badge */}
            <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-[10px] text-emerald-500 dark:text-emerald-400 font-semibold shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Telemetría GPS Activa</span>
            </div>
          </div>

          {/* Real Live Tracking Map Component */}
          {currentTrackBooking ? (
            <div className="w-full space-y-3">
              <div className="rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-xl">
                <ReservasMap
                  clientAddress={currentTrackBooking.clientAddress || 'Paseo de las Palmas 781, Lomas de Chapultepec'}
                  cityZone={currentTrackBooking.cityZone || 'Lomas'}
                  therapistName={currentTrackBooking.therapistName || assignedTherapist?.name || 'Terapeuta ESSENYA'}
                  therapistPhoto={currentTrackBooking.therapistPhoto || assignedTherapist?.photo || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'}
                  bookingState={currentTrackBooking.state}
                />
              </div>

              {/* Status Header info */}
              <div className="bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-[#C9A55B] font-bold uppercase">
                      SERVICIO #{currentTrackBooking.code || currentTrackBooking.id}
                    </span>
                    <h4 className="font-serif font-bold text-base text-[var(--text-primary)]">
                      {currentTrackBooking.serviceName} ({currentTrackBooking.durationMinutes} min)
                    </h4>
                    <p className="text-xs text-[var(--text-muted)]">
                      Terapeuta: <strong className="text-[#C9A55B]">{currentTrackBooking.therapistName || assignedTherapist?.name || 'Sin asignar'}</strong> • Cliente: <strong className="text-[var(--text-primary)]">{currentTrackBooking.clientName}</strong>
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#C9A55B] shrink-0" />
                      <span>Destino: {currentTrackBooking.clientAddress} ({currentTrackBooking.cityZone})</span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-xs font-mono font-bold text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>ETA: ~{currentTrackBooking.etaMinutes || 15} MIN</span>
                    </span>
                  </div>
                </div>

                {/* READ-ONLY Progress Steps Indicator - Controlled EXCLUSIVELY by Therapist */}
                <div className="pt-2 border-t border-[var(--border-color)] space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
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
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                              : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-color)]'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {isPast && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />}
                            {isCurrent && <span className="w-2 h-2 rounded-full bg-black animate-ping" />}
                            <span>{stepItem.label}</span>
                          </div>
                          {isCurrent && (
                            <span className="block text-[9px] font-mono font-extrabold uppercase mt-0.5 tracking-wider">
                              ● EN CURSO
                            </span>
                          )}
                          {isPast && (
                            <span className="block text-[9px] font-mono text-emerald-600 dark:text-emerald-400/90 mt-0.5">
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
            <div className="h-72 flex flex-col items-center justify-center text-center p-8 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl text-[var(--text-muted)] space-y-2">
              <Car className="w-10 h-10 text-[var(--text-muted)]" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">No hay servicios en curso</p>
              <p className="text-xs max-w-sm">Cuando una terapeuta acepte un servicio y se ponga en camino, el mapa y ruta aparecerán aquí automáticamente.</p>
            </div>
          )}
        </div>

        {/* Live Active Services Feed & Urgent Alerts (Right 1 Column) */}
        <div className="space-y-6">
          {/* Active Bookings Quick Switch List */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
              <h3 className="font-serif font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C9A55B]" />
                <span>Servicios de Hoy ({bookings.length})</span>
              </h3>
              <span className="text-[10px] text-[#C9A55B] font-mono font-bold">LIVE FEED</span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setUserSelectedTrackBookingId(b.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedTrackBookingId === b.id
                      ? 'bg-[#C9A55B]/15 border-[#C9A55B]'
                      : 'bg-[var(--bg-subcard)] border-[var(--border-color)] hover:border-[var(--border-color)]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[10px] text-[#C9A55B] font-bold">{b.code}</span>
                      <h4 className="font-serif font-bold text-xs text-[var(--text-primary)] line-clamp-1">{b.serviceName}</h4>
                      <p className="text-[10px] text-[var(--text-muted)]">{b.clientName} ({b.cityZone})</p>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-color)] capitalize">
                      {b.state.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Alerts & Audit Activity */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
              <h3 className="font-serif font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#C9A55B]" />
                <span>Bitácora & Alertas Operativas</span>
              </h3>
            </div>

            <div className="space-y-3">
              {auditLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="text-xs border-b border-[var(--border-color)] pb-2 space-y-0.5">
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                    <span className="font-semibold text-[#C9A55B]">{log.action}</span>
                    <span>{formatLogTime(log.timestamp)} hrs</span>
                  </div>
                  <p className="text-[var(--text-primary)] text-[11px]">{log.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics & Monthly Volume / Therapist Occupancy Charts */}
      <div className="pt-4 border-t border-[var(--border-color)] space-y-6">
        <AdminRechartsDashboard bookings={bookings} therapists={therapists} zones={zones} />
        
        <div className="mb-4 pt-4 border-t border-[var(--border-color)]">
          <h2 className="text-xl font-serif font-bold text-[var(--text-primary)]">Analítica Ejecutiva & Rendimiento</h2>
          <p className="text-xs text-[var(--text-muted)]">Volumen de reservas mensuales y porcentaje de ocupación por terapeuta.</p>
        </div>
        <AdminStatsPanel />
      </div>
    </div>
  );
};
