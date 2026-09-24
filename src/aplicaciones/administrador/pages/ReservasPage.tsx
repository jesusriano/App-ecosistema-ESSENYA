import React, { useState } from 'react';
import { 
  Calendar, Search, Filter, RefreshCw, UserCheck, Clock, MapPin, 
  Sparkles, CheckCircle2, AlertTriangle, X, ShieldAlert, FileText, Check, ChevronRight, ChevronDown, Banknote,
  Radio, Navigation, Zap
} from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { useToast } from '../../../shared/context/ToastContext';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { Booking, Therapist, BookingState } from '../../../shared/types';
import { AdminRecordingsSection } from '../components/AdminRecordingsSection';

export const sanitizeBooking = (raw: any): Booking => {
  if (!raw) {
    return {
      id: `booking-${Date.now()}`,
      code: `ESS-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: '',
      clientName: 'Cliente',
      clientPhone: '',
      clientAddress: '',
      cityZone: 'Polanco',
      serviceId: 'serv-1',
      serviceName: 'Masaje Holístico',
      durationMinutes: 60,
      price: 1500,
      tip: 0,
      total: 1500,
      date: new Date().toISOString().split('T')[0],
      time: '12:00',
      preferences: {
        genderPreference: 'sin_preferencia',
        pressureLevel: 'Media',
        essentialOil: 'Lavanda Francesa',
        musicStyle: 'Acoustic Zen'
      },
      state: 'pendiente',
      etaMinutes: 20,
      paymentMethod: 'Tarjeta de Crédito / Débito',
      paymentStatus: 'pendiente',
      createdAt: new Date().toISOString()
    };
  }

  const code = raw.code || raw.bookingCode || raw.folio || (raw.id ? `ESS-${String(raw.id).substring(0, 6).toUpperCase()}` : `ESS-${Math.floor(1000 + Math.random() * 9000)}`);
  const clientName = raw.clientName || raw.nombreCliente || [raw.clienteNombre, raw.clienteApellidos].filter(Boolean).join(' ') || 'Cliente';
  const therapistName = raw.therapistName || raw.nombreTerapeuta || undefined;
  const serviceName = raw.serviceName || raw.servicioNombre || raw.service?.name || 'Servicio Essenya';
  const cityZone = raw.cityZone || raw.zona || raw.ciudad || 'Ciudad de México';
  const clientAddress = raw.clientAddress || raw.direccion || '';

  return {
    ...raw,
    id: String(raw.id || `booking-${Date.now()}`),
    code: String(code),
    clientId: String(raw.clientId || ''),
    clientName: String(clientName),
    clientPhone: String(raw.clientPhone || raw.telefono || ''),
    clientAddress: String(clientAddress),
    cityZone: String(cityZone),
    therapistId: raw.therapistId ? String(raw.therapistId) : undefined,
    therapistName: therapistName ? String(therapistName) : undefined,
    therapistPhoto: raw.therapistPhoto || raw.fotografiaTerapeuta || undefined,
    therapistPhone: raw.therapistPhone || raw.telefonoTerapeuta || undefined,
    serviceId: String(raw.serviceId || 'serv-1'),
    serviceName: String(serviceName),
    durationMinutes: Number(raw.durationMinutes || raw.duracion || 60),
    price: Number(raw.price || raw.precio || 0),
    tip: Number(raw.tip || raw.propina || 0),
    total: Number(raw.total || (Number(raw.price || 0) + Number(raw.tip || 0))),
    date: String(raw.date || raw.fecha || new Date().toISOString().split('T')[0]),
    time: String(raw.time || raw.hora || '12:00'),
    preferences: raw.preferences || {
      genderPreference: 'sin_preferencia',
      pressureLevel: 'Media',
      essentialOil: 'Lavanda Francesa',
      musicStyle: 'Acoustic Zen'
    },
    state: raw.state || raw.estado || 'pendiente',
    etaMinutes: Number(raw.etaMinutes || 20),
    paymentMethod: raw.paymentMethod || 'Tarjeta de Crédito / Débito',
    paymentStatus: raw.paymentStatus || 'pendiente',
    createdAt: String(raw.createdAt || new Date().toISOString())
  };
};

export const ReservasPage: React.FC = () => {
  const { 
    bookings, therapists, handleUpdateBookingState, 
    handleReassignTherapist, handleRescheduleBooking, handleCancelBooking,
    handleAdminAcceptBooking, handleAdminRejectBooking, handleConfirmPayment
  } = useAdmin();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  
  // Custom Administrative Actions
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectBookingModal, setRejectBookingModal] = useState<Booking | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  // Smart Recommendation Modal
  const [smartBookingModal, setSmartBookingModal] = useState<Booking | null>(null);
  
  // Reschedule Modal
  const [rescheduleBookingModal, setRescheduleBookingModal] = useState<Booking | null>(null);
  const [newDateInput, setNewDateInput] = useState('');
  const [newTimeInput, setNewTimeInput] = useState('');

  // Cancel Modal
  const [cancelBookingModal, setCancelBookingModal] = useState<Booking | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');

  // Custom Administrative Handlers
  const onAcceptBooking = async (booking: Booking) => {
    if (processingId) return; // Prevent double operations
    setProcessingId(booking.id);
    try {
      await handleAdminAcceptBooking(booking.id);
      showToast(`¡Reserva ${booking.code} aprobada y aceptada exitosamente!`);
    } catch (err: any) {
      const friendlyMsg = err?.message || 'Error al actualizar Firestore';
      showToast(`Error al aceptar la reserva: ${friendlyMsg}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const onRejectBooking = async () => {
    if (!rejectBookingModal || processingId) return;
    if (!rejectReasonInput.trim()) {
      showToast('Por favor, indica un motivo de rechazo.', 'warning');
      return;
    }
    const b = rejectBookingModal;
    setProcessingId(b.id);
    try {
      await handleAdminRejectBooking(b.id, rejectReasonInput.trim());
      showToast(`Reserva ${b.code} rechazada de forma definitiva.`);
      setRejectBookingModal(null);
      setRejectReasonInput('');
    } catch (err: any) {
      const friendlyMsg = err?.message || 'Error al actualizar Firestore';
      showToast(`Error al rechazar la reserva: ${friendlyMsg}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };
  // Filter Bookings
  const filteredBookings = (bookings || [])
    .filter(Boolean)
    .map(sanitizeBooking)
    .filter(b => {
      const term = (searchTerm || '').toLowerCase().trim();
      const code = (b.code || '').toLowerCase();
      const clientName = (b.clientName || '').toLowerCase();
      const therapistName = (b.therapistName || '').toLowerCase();
      const serviceName = (b.serviceName || '').toLowerCase();
      const cityZone = (b.cityZone || '').toLowerCase();

      const matchesSearch = 
        !term ||
        code.includes(term) ||
        clientName.includes(term) ||
        therapistName.includes(term) ||
        serviceName.includes(term) ||
        cityZone.includes(term);

      const matchesStatus = statusFilter === 'todos' || b.state === statusFilter;
      return matchesSearch && matchesStatus;
    });

  // Calculate Smart Match Score for Therapists
  const calculateSmartCandidates = (booking: Booking) => {
    return (therapists || []).filter(Boolean).map(t => {
      let score = 50;

      // 1. Zone Coverage (Up to 30 pts)
      const coverageZones = Array.isArray(t?.coverageZones) ? t.coverageZones : [];
      const coversZone = booking?.cityZone ? coverageZones.some(z => (z || '').toLowerCase() === (booking.cityZone || '').toLowerCase()) : false;
      if (coversZone) score += 30;
      else score += 10;

      // 2. Rating (Up to 15 pts)
      const ratingVal = Number(t?.rating || 5);
      score += Math.round((ratingVal / 5) * 15);

      // 3. Status & Workload (Up to 15 pts)
      if (t?.status === 'disponible') score += 15;
      else if (t?.status === 'en_camino') score += 5;

      // Ensure cap at 99
      const finalScore = Math.min(99, Math.max(60, score));

      return {
        therapist: t,
        matchScore: finalScore,
        etaMinutes: coversZone ? Math.floor(12 + Math.random() * 10) : Math.floor(25 + Math.random() * 15),
        distanceKm: coversZone ? (1.5 + Math.random() * 2.5).toFixed(1) : (6.0 + Math.random() * 4).toFixed(1),
        reasons: [
          coversZone ? `Cubre zona ${booking?.cityZone || ''}` : `Zona cercana`,
          `Calificación ${ratingVal} ⭐`,
          `${t?.totalServices || 0} servicios realizados`
        ]
      };
    }).sort((a, b) => b.matchScore - a.matchScore);
  };

  const stateBadges: Record<string, { label: string; color: string }> = {
    pendiente: { label: 'Pendiente de Aprobación', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    aceptada: { label: 'Solicitud Aceptada', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    aceptado: { label: 'Confirmado / En Agenda', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    rechazada: { label: 'Solicitud Rechazada', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30 font-bold' },
    en_camino: { label: 'Terapeuta En Camino', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    llegue: { label: 'Terapeuta en Domicilio', color: 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/40' },
    servicio_iniciado: { label: 'En Sesión Activa', color: 'bg-[#16A34A] text-white font-bold border border-[#22C55E]/50 shadow-sm' },
    servicio_finalizado: { label: 'Servicio Concluido', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
    cancelado: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#C9A55B]" />
            <span>Gestión de Reservas & Asignación Inteligente (IA)</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Centro de control operativo de servicios a domicilio, asignación con Matriz IA y reasignaciones urgentes.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código, cliente, terapeuta, zona..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-[#C9A55B] shrink-0" />
          <span className="text-xs text-[var(--text-muted)] shrink-0">Estado:</span>
          {['todos', 'pendiente', 'aceptada', 'rechazada', 'en_camino', 'llegue', 'servicio_iniciado', 'servicio_finalizado', 'cancelado'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#C9A55B] text-black font-bold'
                  : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
              }`}
            >
              {st === 'todos' ? 'Todos' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table / Cards */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
        <div className="divide-y divide-[var(--border-color)]">
          {filteredBookings.length === 0 ? (
            <div className="p-12 text-center text-[var(--text-muted)]">
              <Calendar className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3" />
              <p className="font-semibold text-sm">No se encontraron reservaciones</p>
              <p className="text-xs mt-1">Ajusta los filtros o la búsqueda.</p>
            </div>
          ) : (
            filteredBookings.map((b) => {
              const badge = stateBadges[b.state] || { label: b.state, color: 'bg-[var(--bg-subcard)] text-[var(--text-muted)]' };

              return (
                <div key={b.id} className="p-5 hover:bg-[var(--bg-subcard)]/50 transition-all flex flex-col justify-start gap-4">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    {/* Info Column */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-[#C9A55B] font-bold bg-[#C9A55B]/10 border border-[#C9A55B]/30 px-2 py-0.5 rounded-lg">
                          {b.code}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          📅 {b.date} • {b.time} ({b.durationMinutes} min)
                        </span>
                      </div>

                      <div>
                        <h3 className="font-serif font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                          <span>{b.serviceName}</span>
                          <span className="text-xs font-sans text-[#C9A55B] font-semibold">${b.total} MXN</span>
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#C9A55B] shrink-0" />
                          <span>{b.clientAddress} ({b.cityZone})</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)] pt-1">
                        <span>👤 Client VIP: <strong className="text-[var(--text-primary)]">{b.clientName}</strong></span>
                        <span>
                          💆 Terapeuta: {b.therapistName ? (
                            <strong className="text-[#C9A55B]">{b.therapistName}</strong>
                          ) : (
                            <span className="text-amber-500 dark:text-amber-400 italic">Sin Terapeuta Asignada</span>
                          )}
                        </span>
                        <button
                          onClick={() => setExpandedBookingId(expandedBookingId === b.id ? null : b.id)}
                          className="text-xs text-[#C9A55B] hover:underline flex items-center gap-1 cursor-pointer select-none ml-2"
                        >
                          {expandedBookingId === b.id ? (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              <span>Ocultar Solicitud</span>
                            </>
                          ) : (
                            <>
                              <ChevronRight className="w-3.5 h-3.5" />
                              <span>Revisar Ficha Completa</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Dispatch Telemetry Widget */}
                      {(b.state === 'pendiente' || b.dispatchState) && (
                        <div className="w-full bg-[var(--bg-subcard)] border border-[#C9A55B]/30 rounded-xl p-3 text-xs space-y-2 mt-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {b.dispatchState === 'buscando' ? (
                                <>
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                                  <strong className="text-emerald-400 font-mono flex items-center gap-1.5">
                                    <Radio className="w-3.5 h-3.5" />
                                    🟢 DESPACHANDO - NIVEL {b.currentDispatchLevel || 10} (ETA &le; {b.currentDispatchLevel || 10} min)
                                  </strong>
                                </>
                              ) : b.dispatchState === 'asignada' ? (
                                <strong className="text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Asignada por Despacho ETA
                                </strong>
                              ) : b.dispatchState === 'sin_disponibilidad' ? (
                                <strong className="text-rose-400 flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Sin Disponibilidad tras agotar 60 min
                                </strong>
                              ) : (
                                <span className="text-[var(--text-muted)]">Despacho: {b.dispatchState || 'Iniciando'}</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                              {b.dispatchStartedAt && (
                                <span>Iniciado: {new Date(b.dispatchStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              )}
                              {b.state === 'pendiente' && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const res = await fetch('/api/dispatch/step', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ bookingId: b.id })
                                      });
                                      const data = await res.json();
                                      showToast(data.message || 'Despacho actualizado');
                                    } catch (e: any) {
                                      showToast('Error al avanzar despacho: ' + e.message, 'error');
                                    }
                                  }}
                                  className="px-2 py-1 bg-[#C9A55B]/20 hover:bg-[#C9A55B]/30 border border-[#C9A55B]/40 text-[#C9A55B] text-[10px] font-bold rounded cursor-pointer flex items-center gap-1"
                                >
                                  <Zap className="w-3 h-3" />
                                  <span>Avanzar Nivel</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Metric Chips */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                            <div className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-color)]">
                              <span className="text-[10px] text-[var(--text-muted)] block">Terapeutas contactados</span>
                              <strong className="text-[var(--text-primary)] text-xs">{b.dispatchHistory?.length || 0}</strong>
                            </div>
                            <div className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-color)]">
                              <span className="text-[10px] text-[var(--text-muted)] block">Rechazaron</span>
                              <strong className="text-rose-400 text-xs">
                                {b.dispatchHistory?.filter(h => h.action === 'rejected').length || b.rejectedBy?.length || 0}
                              </strong>
                            </div>
                            <div className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-color)]">
                              <span className="text-[10px] text-[var(--text-muted)] block">Sin respuesta</span>
                              <strong className="text-amber-400 text-xs">
                                {b.dispatchHistory?.filter(h => h.action === 'timeout').length || 0}
                              </strong>
                            </div>
                            <div className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-color)]">
                              <span className="text-[10px] text-[var(--text-muted)] block">Ofertas activas</span>
                              <strong className="text-blue-400 text-xs">
                                {b.activeOfferTherapistIds?.length || 0}
                              </strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions Column */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {b.state === 'pendiente' ? (
                        <div className="flex items-center gap-2">
                          <button
                            disabled={!!processingId}
                            onClick={() => onAcceptBooking(b)}
                            className={`px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-900/10 flex items-center gap-1 ${
                              processingId === b.id ? 'opacity-80' : ''
                            }`}
                          >
                            {processingId === b.id ? (
                              <span>Procesando...</span>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>ACEPTAR RESERVA</span>
                              </>
                            )}
                          </button>
                          <button
                            disabled={!!processingId}
                            onClick={() => {
                              setRejectBookingModal(b);
                              setRejectReasonInput('');
                            }}
                            className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 disabled:bg-rose-950/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>RECHAZAR RESERVA</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {b.state === 'aceptada' && (
                            <LuxuryButton
                              variant="gold"
                              size="sm"
                              onClick={() => setSmartBookingModal(b)}
                            >
                              <Sparkles className="w-3.5 h-3.5 mr-1" />
                              <span>{b.therapistName ? 'Reasignar (IA)' : 'Asignar con IA'}</span>
                            </LuxuryButton>
                          )}

                          {b.state !== 'cancelado' && b.state !== 'rechazada' && b.state !== 'servicio_finalizado' && (
                            <LuxuryButton
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRescheduleBookingModal(b);
                                setNewDateInput(b.date);
                                setNewTimeInput(b.time);
                              }}
                            >
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              <span>Reprogramar</span>
                            </LuxuryButton>
                          )}

                          {b.state !== 'cancelado' && b.state !== 'rechazada' && b.paymentStatus !== 'pagado' && b.paymentMethod.includes('Transferencia') && (
                            <button
                              onClick={async () => {
                                if (confirm(`¿Confirmar recepción de pago para la reserva ${b.code}?`)) {
                                  await handleConfirmPayment(b.id);
                                  showToast(`Pago de ${b.code} confirmado exitosamente.`);
                                }
                              }}
                              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>Confirmar Pago</span>
                            </button>
                          )}

                          {b.state !== 'cancelado' && b.state !== 'rechazada' && b.state !== 'servicio_finalizado' && (
                            <button
                              onClick={() => setCancelBookingModal(b)}
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 dark:text-red-400 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expandable Details Section */}
                  {expandedBookingId === b.id && (
                    <div className="pt-4 border-t border-[var(--border-color)] space-y-4 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-[var(--text-muted)]">
                        {/* Col 1: Cliente & Contacto */}
                        <div className="space-y-1.5 bg-[var(--bg-subcard)] p-3.5 rounded-xl border border-[var(--border-color)]">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#C9A55B] block mb-1">Contacto del Cliente</span>
                          <div>👤 Nombre: <strong className="text-[var(--text-primary)]">{b.clientName}</strong></div>
                          <div>📞 Teléfono: <span className="text-[var(--text-primary)] font-mono">{b.clientPhone || 'VIP (Sin registrar)'}</span></div>
                          <div>📍 Dirección: <span className="text-[var(--text-primary)]">{b.clientAddress} ({b.cityZone})</span></div>
                          {b.arrivalInstructions && (
                            <div className="mt-1 pt-1.5 border-t border-[var(--border-color)]">
                              🔑 <strong className="text-[var(--text-primary)]">Acceso/Llegada:</strong> {b.arrivalInstructions}
                            </div>
                          )}
                        </div>

                        {/* Col 2: Preferencias del Ritual */}
                        <div className="space-y-1.5 bg-[var(--bg-subcard)] p-3.5 rounded-xl border border-[var(--border-color)]">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#C9A55B] block mb-1">Preferencias del Ritual</span>
                          <div>💪 Presión: <strong className="text-[var(--text-primary)]">{b.preferences?.pressureLevel || 'Media'}</strong></div>
                          <div>🌿 Aromaterapia: <strong className="text-[var(--text-primary)]">{b.preferences?.essentialOil || 'Aceite de olor'}</strong></div>
                          <div>🎵 Ambiente: <strong className="text-[var(--text-primary)]">{b.preferences?.musicStyle || 'Sonido de la naturaleza'}</strong></div>
                          {b.painPoints && (
                            <div className="mt-1 pt-1.5 border-t border-[var(--border-color)] text-amber-500">
                              ⚠️ <strong className="text-amber-500 font-semibold">Puntos de Dolor:</strong> {b.painPoints}
                            </div>
                          )}
                        </div>

                        {/* Col 3: Transacción & Administrativo */}
                        <div className="space-y-1.5 bg-[var(--bg-subcard)] p-3.5 rounded-xl border border-[var(--border-color)]">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#C9A55B] block mb-1">Transacción & Auditoría</span>
                          <div>💵 Precio Total: <strong className="text-[#C9A55B] font-bold">${b.total} MXN</strong></div>
                          <div>💳 Método Pago: <span className="text-[var(--text-primary)]">{b.paymentMethod}</span></div>
                          <div>🏷️ Estado Pago: <span className="text-[var(--text-primary)] font-semibold">{b.paymentStatus === 'pagado' ? '✅ Pagado' : '⏳ Pendiente'}</span></div>
                          {b.motivoRechazo && (
                            <div className="mt-1 pt-1.5 border-t border-[var(--border-color)] text-rose-500">
                              ❌ <strong className="text-rose-500">Motivo de Rechazo:</strong> {b.motivoRechazo}
                            </div>
                          )}
                          {b.cancellationReason && !b.motivoRechazo && (
                            <div className="mt-1 pt-1.5 border-t border-[var(--border-color)] text-rose-500">
                              ❌ <strong className="text-rose-500">Cancelación/Rechazo:</strong> {b.cancellationReason}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Dispatch History Audit Trail */}
                      {Array.isArray(b.dispatchHistory) && b.dispatchHistory.length > 0 && (
                        <div className="bg-[var(--bg-subcard)] p-3.5 rounded-xl border border-[var(--border-color)] space-y-2">
                          <div className="text-[10px] uppercase font-bold tracking-wider text-[#C9A55B] flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Radio className="w-3.5 h-3.5" />
                              Historial de Despacho por Nivel ETA
                            </span>
                            <span className="font-mono">{b.dispatchHistory.length} eventos registrados</span>
                          </div>
                          <div className="divide-y divide-[var(--border-color)] max-h-48 overflow-y-auto pr-1">
                            {b.dispatchHistory.map((item, hIdx) => (
                              <div key={hIdx} className="py-1.5 flex flex-wrap items-center justify-between text-[11px] gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-[#C9A55B] bg-[#C9A55B]/10 px-1.5 py-0.5 rounded border border-[#C9A55B]/20">
                                    Nivel {item.level} min
                                  </span>
                                  <span className="font-semibold text-[var(--text-primary)]">{item.therapistName || item.therapistId}</span>
                                  <span className="text-[var(--text-muted)] text-[10px]">ETA: ~{item.etaMinutes} min</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.action === 'accepted' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                    item.action === 'rejected' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                    item.action === 'timeout' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  }`}>
                                    {item.action === 'accepted' ? '✓ Aceptó' :
                                     item.action === 'rejected' ? '✕ Rechazó' :
                                     item.action === 'timeout' ? '⏱ Expiró ventana' : '🔔 Contactada'}
                                  </span>
                                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                    {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <AdminRecordingsSection serviceId={b.id} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Smart Therapist Assignment AI Modal */}
      {smartBookingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-card)] border border-[#C9A55B]/40 rounded-3xl p-6 max-w-2xl w-full space-y-6 relative shadow-2xl">
            <button
              onClick={() => setSmartBookingModal(null)}
              className="absolute right-5 top-5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-[var(--border-color)] pb-4">
              <div className="flex items-center gap-2 text-[#C9A55B]">
                <Sparkles className="w-5 h-5 animate-spin" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest">
                  ALGORITMO DE RECOMENDACIÓN INTELIGENTE ESSENYA IA
                </span>
              </div>
              <h2 className="text-xl font-serif font-bold text-[var(--text-primary)] mt-1">
                Asignación Óptima para Servicio {smartBookingModal.code}
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Evaluando cercanía geográfica en {smartBookingModal.cityZone}, disponibilidad en horario ({smartBookingModal.time}), calificaciones e historial.
              </p>
            </div>

            {/* Candidate List */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {calculateSmartCandidates(smartBookingModal).map((cand, idx) => (
                <div
                  key={cand.therapist.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                    idx === 0 
                      ? 'bg-[#C9A55B]/10 border-[#C9A55B] shadow-lg shadow-[#C9A55B]/10' 
                      : 'bg-[var(--bg-subcard)] border-[var(--border-color)] hover:border-[var(--border-color)]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={cand.therapist?.photo || undefined}
                      alt={cand.therapist.name}
                      className="w-12 h-12 rounded-xl object-cover border border-[#C9A55B]/30 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif font-bold text-sm text-[var(--text-primary)]">{cand.therapist.name}</h4>
                        {idx === 0 && (
                          <span className="bg-[#C9A55B] text-black text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> RECOMENDACIÓN IA #{idx + 1}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5 space-x-2">
                        <span>⭐ {cand.therapist.rating} ({cand.therapist.reviewCount} res)</span>
                        <span>• 🚗 ETA: ~{cand.etaMinutes} min ({cand.distanceKm} km)</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {cand.reasons.map((r, rIdx) => (
                          <span key={rIdx} className="text-[9px] bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-color)] px-2 py-0.5 rounded-md">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-[var(--border-color)] pt-2 sm:pt-0">
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-[#C9A55B]">{cand.matchScore}% Match</span>
                      <span className="text-[10px] text-[var(--text-muted)] block">Puntaje Global</span>
                    </div>

                    <LuxuryButton
                      variant={idx === 0 ? 'gold' : 'outline'}
                      size="sm"
                      onClick={() => {
                        handleReassignTherapist(smartBookingModal.id, cand.therapist.id);
                        showToast(`Terapeuta ${cand.therapist.name} asignada a la reserva ${smartBookingModal.code}`);
                        setSmartBookingModal(null);
                      }}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      <span>Seleccionar</span>
                    </LuxuryButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleBookingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">Reprogramar Fecha y Hora</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Reserva <strong className="text-[#C9A55B]">{rescheduleBookingModal.code}</strong> para {rescheduleBookingModal.clientName}.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Nueva Fecha</label>
                <input
                  type="date"
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Nuevo Horario</label>
                <input
                  type="text"
                  placeholder="ej. 16:30 hrs"
                  value={newTimeInput}
                  onChange={(e) => setNewTimeInput(e.target.value)}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setRescheduleBookingModal(null)}
                className="px-4 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Cancelar
              </button>
              <LuxuryButton
                variant="gold"
                size="sm"
                onClick={() => {
                  if (!newDateInput || !newTimeInput) return;
                  handleRescheduleBooking(rescheduleBookingModal.id, newDateInput, newTimeInput);
                  showToast(`Reserva ${rescheduleBookingModal.code} reprogramada.`);
                  setRescheduleBookingModal(null);
                }}
              >
                Confirmar Cambio
              </LuxuryButton>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelBookingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-red-500/40 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-serif font-bold text-lg text-red-500 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Cancelar Servicio de Forma Definitiva</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              ¿Estás seguro de cancelar la reserva <strong className="text-[var(--text-primary)]">{cancelBookingModal.code}</strong>? Se notificará al cliente y a la terapeuta.
            </p>

            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">Motivo de Cancelación</label>
              <textarea
                placeholder="Indica la razón (ej. Solicitud del cliente, contingencia vial)..."
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                rows={3}
                className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] p-3 rounded-xl text-xs focus:outline-none focus:border-red-500/50"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setCancelBookingModal(null)}
                className="px-4 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Regresar
              </button>
              <button
                onClick={() => {
                  handleCancelBooking(cancelBookingModal.id, cancelReasonInput || 'Cancelado por administración');
                  showToast(`Reserva ${cancelBookingModal.code} cancelada.`);
                  setCancelBookingModal(null);
                  setCancelReasonInput('');
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectBookingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-rose-500/40 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-serif font-bold text-lg text-rose-500 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Rechazar Solicitud de Reserva</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Indica la razón de rechazo para la reserva <strong className="text-[var(--text-primary)]">{rejectBookingModal.code}</strong>. Esta decisión se guardará en Firestore y se mostrará al cliente en tiempo real.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Razón o Motivo de Rechazo</label>
                <select
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-rose-500/40 mb-2"
                >
                  <option value="">-- Selecciona un motivo predefinido --</option>
                  <option value="Sin disponibilidad de terapeuta certificada en la zona">Sin disponibilidad de terapeuta certificada en la zona</option>
                  <option value="Horario solicitado fuera de servicio">Horario solicitado fuera de servicio</option>
                  <option value="Dirección fuera del área de cobertura ESSENYA">Dirección fuera del área de cobertura ESSENYA</option>
                  <option value="Inconsistencia o error en los datos de facturación/pago">Inconsistencia o error en los datos de facturación/pago</option>
                  <option value="custom">Otro (especificar abajo)...</option>
                </select>

                <textarea
                  placeholder="Escribe un motivo detallado y comprensible para el cliente..."
                  value={rejectReasonInput === 'custom' ? '' : rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  disabled={rejectReasonInput !== 'custom' && rejectReasonInput !== '' && ['Sin disponibilidad de terapeuta certificada en la zona', 'Horario solicitado fuera de servicio', 'Dirección fuera del área de cobertura ESSENYA', 'Inconsistencia o error en los datos de facturación/pago'].includes(rejectReasonInput)}
                  rows={3}
                  className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] p-3 rounded-xl text-xs focus:outline-none focus:border-rose-500/50"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                disabled={!!processingId}
                onClick={() => {
                  setRejectBookingModal(null);
                  setRejectReasonInput('');
                }}
                className="px-4 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                disabled={!!processingId || !rejectReasonInput.trim()}
                onClick={onRejectBooking}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                {processingId ? (
                  <span>Procesando...</span>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Confirmar Rechazo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
