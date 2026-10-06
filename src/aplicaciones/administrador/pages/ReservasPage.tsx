import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Calendar, Search, Filter, RefreshCw, UserCheck, Clock, MapPin, 
  Sparkles, CheckCircle2, AlertTriangle, X, ShieldAlert, FileText, Check, ChevronRight, ChevronDown, Banknote,
  Radio, Navigation, Zap, MessageSquare, Trash2, Plus, User, Phone, Mail, DollarSign, Layers
} from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { useToast } from '../../../shared/context/ToastContext';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { Booking, Therapist, BookingState, PressureLevel, EssentialOil, MusicStyle } from '../../../shared/types';
import { AdminRecordingsSection } from '../components/AdminRecordingsSection';
import { AdminChatSupervisorModal } from '../components/AdminChatSupervisorModal';

export const sanitizeBooking = (raw: any): Booking => {
  if (!raw) {
    return {
      id: `booking-${Date.now()}`,
      code: `ESS-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: '',
      clientName: 'Cliente',
      clientPhone: '',
      clientAddress: '',
      cityZone: 'Ciudad de México',
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
    bookings, therapists, services, clients, zones,
    handleUpdateBookingState, 
    handleReassignTherapist, handleRescheduleBooking, handleCancelBooking,
    handleAdminAcceptBooking, handleAdminRejectBooking, handleConfirmPayment,
    handleDeleteBooking, handleCreateManualBooking
  } = useAdmin();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

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

  // Chat Supervisor Modal
  const [chatSupervisorBooking, setChatSupervisorBooking] = useState<Booking | null>(null);

  // Manual Booking Modal States
  const [showManualModal, setShowManualModal] = useState(false);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualClientMode, setManualClientMode] = useState<'existente' | 'nuevo'>('nuevo');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientPhone, setManualClientPhone] = useState('');
  const [manualClientEmail, setManualClientEmail] = useState('');
  const [manualClientAddress, setManualClientAddress] = useState('');
  const [manualCityZone, setManualCityZone] = useState('Polanco / CDMX');
  
  const [manualServiceId, setManualServiceId] = useState('');
  const [manualServiceName, setManualServiceName] = useState('');
  const [manualDurationMinutes, setManualDurationMinutes] = useState(60);
  const [manualPrice, setManualPrice] = useState(1500);
  const [manualTip, setManualTip] = useState(0);
  
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState('14:00');
  
  const [manualTherapistId, setManualTherapistId] = useState(''); // empty = auto dispatch
  const [manualPaymentMethod, setManualPaymentMethod] = useState<any>('Tarjeta de Crédito / Débito');
  const [manualPaymentStatus, setManualPaymentStatus] = useState<'pendiente' | 'pagado'>('pendiente');
  
  const [manualPressureLevel, setManualPressureLevel] = useState<PressureLevel>('Media');
  const [manualEssentialOil, setManualEssentialOil] = useState<EssentialOil>('Lavanda Francesa');
  const [manualMusicStyle, setManualMusicStyle] = useState<MusicStyle>('Acoustic Zen');
  const [manualGenderPref, setManualGenderPref] = useState<'sin_preferencia' | 'femenino' | 'masculino'>('sin_preferencia');
  const [manualNotes, setManualNotes] = useState('');

  const openManualModalWithService = (serviceIdToSelect?: string) => {
    const availableServices = (services || []).filter(Boolean);
    const targetService = serviceIdToSelect 
      ? availableServices.find(s => s.id === serviceIdToSelect)
      : availableServices[0];

    const sId = targetService?.id || 'serv-holistico';
    const sName = targetService?.name || 'Masaje Holístico Personalizado';
    const baseP = Number(targetService?.basePrice || 1500);

    setManualClientMode('nuevo');
    setSelectedClientId('');
    setManualClientName('');
    setManualClientPhone('');
    setManualClientEmail('');
    setManualClientAddress('');
    setManualCityZone(zones && zones.length > 0 ? zones[0].name : 'Polanco / CDMX');

    setManualServiceId(sId);
    setManualServiceName(sName);
    setManualDurationMinutes(60);
    setManualPrice(baseP);
    setManualTip(0);

    const todayStr = new Date().toISOString().split('T')[0];
    setManualDate(todayStr);

    const now = new Date();
    const nextHour = Math.min(21, Math.max(9, now.getHours() + 1));
    setManualTime(`${String(nextHour).padStart(2, '0')}:00`);

    setManualTherapistId('');
    setManualPaymentMethod('Tarjeta de Crédito / Débito');
    setManualPaymentStatus('pendiente');
    setManualPressureLevel('Media');
    setManualEssentialOil('Lavanda Francesa');
    setManualMusicStyle('Acoustic Zen');
    setManualGenderPref('sin_preferencia');
    setManualNotes('');

    setShowManualModal(true);
  };

  // Detect URL parameter to trigger manual booking modal
  useEffect(() => {
    const sId = searchParams.get('manualServiceId') || searchParams.get('newManualServiceId');
    if (sId) {
      openManualModalWithService(sId);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('manualServiceId');
      nextParams.delete('newManualServiceId');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams]);

  const handleSelectClient = (cId: string) => {
    setSelectedClientId(cId);
    const found = (clients || []).find(c => c.id === cId);
    if (found) {
      const anyC = found as any;
      setManualClientName(anyC.nombre || anyC.name || [anyC.nombre, anyC.apellidos].filter(Boolean).join(' ') || '');
      setManualClientPhone(anyC.telefono || anyC.phone || '');
      setManualClientEmail(anyC.email || '');
      setManualClientAddress(anyC.direccion || anyC.address || '');
      if (anyC.zona || anyC.cityZone) {
        setManualCityZone(anyC.zona || anyC.cityZone);
      }
    }
  };

  const handleServiceChange = (sId: string) => {
    setManualServiceId(sId);
    const srv = (services || []).find(s => s.id === sId);
    if (srv) {
      setManualServiceName(srv.name);
      if (manualDurationMinutes === 90) {
        setManualPrice(srv.price90 || Math.round(srv.basePrice * 1.35));
      } else if (manualDurationMinutes === 120) {
        setManualPrice(srv.price120 || Math.round(srv.basePrice * 1.7));
      } else {
        setManualPrice(srv.basePrice || 1500);
      }
    }
  };

  const handleDurationChange = (dur: number) => {
    setManualDurationMinutes(dur);
    const srv = (services || []).find(s => s.id === manualServiceId);
    if (srv) {
      if (dur === 90) {
        setManualPrice(srv.price90 || Math.round(srv.basePrice * 1.35));
      } else if (dur === 120) {
        setManualPrice(srv.price120 || Math.round(srv.basePrice * 1.7));
      } else {
        setManualPrice(srv.basePrice || 1500);
      }
    }
  };

  const onSubmitManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualClientName.trim()) {
      showToast('Por favor, indica el nombre completo del cliente.', 'warning');
      return;
    }
    if (!manualClientAddress.trim()) {
      showToast('Por favor, indica la dirección completa de entrega.', 'warning');
      return;
    }
    if (!manualDate || !manualTime) {
      showToast('Por favor, define la fecha y hora de la cita.', 'warning');
      return;
    }

    setIsSubmittingManual(true);
    try {
      const assignedTherapist = (therapists || []).find(t => t.id === manualTherapistId);
      const totalAmount = Number(manualPrice || 0) + Number(manualTip || 0);

      const payload: Partial<Booking> = {
        clientName: manualClientName.trim(),
        clientPhone: manualClientPhone.trim(),
        clientEmail: manualClientEmail.trim(),
        clientAddress: manualClientAddress.trim(),
        cityZone: manualCityZone,
        serviceId: manualServiceId || 'serv-personalizado',
        serviceName: manualServiceName || 'Masaje Personalizado ESSENYA',
        durationMinutes: Number(manualDurationMinutes),
        price: Number(manualPrice),
        tip: Number(manualTip || 0),
        total: totalAmount,
        date: manualDate,
        time: manualTime,
        therapistId: manualTherapistId || undefined,
        therapistName: assignedTherapist ? (assignedTherapist.name || (assignedTherapist as any).nombre) : undefined,
        paymentMethod: manualPaymentMethod,
        paymentStatus: manualPaymentStatus,
        notes: manualNotes.trim(),
        preferences: {
          pressureLevel: manualPressureLevel,
          essentialOil: manualEssentialOil,
          musicStyle: manualMusicStyle,
          genderPreference: manualGenderPref
        }
      };

      const created = await handleCreateManualBooking(payload);
      const assignNotice = manualTherapistId && assignedTherapist 
        ? ` Asignado directamente a ${assignedTherapist.name || (assignedTherapist as any).nombre}.`
        : ' Enviado a despacho automático.';
      showToast(`¡Reserva ${created.code || ''} de ${created.serviceName} creada con éxito!${assignNotice}`);
      setShowManualModal(false);
    } catch (err: any) {
      const msg = err?.message || 'Error al persistir la reserva';
      showToast(`Error al crear la reserva manual: ${msg}`, 'error');
    } finally {
      setIsSubmittingManual(false);
    }
  };

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
  const onDeleteBooking = async (b: Booking) => {
    if (window.confirm(`¿Estás seguro de eliminar permanentemente la solicitud ${b.code} (${b.serviceName})? Los registros de finanzas permanecerán intactos.`)) {
      try {
        await handleDeleteBooking(b.id);
        showToast(`Solicitud ${b.code} eliminada exitosamente.`);
      } catch (err: any) {
        showToast('Error al eliminar la solicitud.', 'error');
      }
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
    pendiente: { label: 'Pendiente de Asignación', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    en_espera_pago: { label: 'En Espera de Pago (Stripe)', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30 font-bold animate-pulse' },
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

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <LuxuryButton
            id="btn-agendar-servicio-manual"
            variant="gold"
            size="sm"
            onClick={() => openManualModalWithService()}
            className="w-full sm:w-auto justify-center shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4 mr-1.5 shrink-0" />
            <span>+ Agendar Servicio Manual</span>
          </LuxuryButton>
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

        <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-[#C9A55B] shrink-0" />
          <span className="text-xs text-[var(--text-muted)] shrink-0">Estado:</span>
          {['todos', 'pendiente', 'aceptada', 'rechazada', 'en_camino', 'llegue', 'servicio_iniciado', 'servicio_finalizado', 'cancelado'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
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
                              {b.dispatchState === 'en_espera_pago' ? (
                                <strong className="text-amber-400 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 animate-spin" />
                                  ⏳ EN ESPERA DE PAGO DEL CLIENTE (PASARELA STRIPE)
                                </strong>
                              ) : b.dispatchState === 'buscando' ? (
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
                    <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto">
                      {b.state === 'pendiente' ? (
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                          <button
                            disabled={!!processingId}
                            onClick={() => onAcceptBooking(b)}
                            className={`flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-900/10 flex items-center justify-center gap-1 ${
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
                            className="flex-1 sm:flex-initial px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 disabled:bg-rose-950/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>RECHAZAR RESERVA</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
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

                          {/* Supervisar Chat button */}
                          <button
                            onClick={() => setChatSupervisorBooking(b)}
                            className="px-3 py-1.5 bg-[#C9A55B]/15 hover:bg-[#C9A55B]/25 border border-[#C9A55B]/40 text-[#806020] dark:text-[#C9A55B] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                            title="Supervisar chat en vivo entre cliente y terapeuta"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Supervisar Chat</span>
                          </button>

                          {b.state !== 'cancelado' && b.state !== 'rechazada' && b.state !== 'servicio_finalizado' && (
                            <button
                              onClick={() => setCancelBookingModal(b)}
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 dark:text-red-400 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}

                          <button
                            onClick={() => onDeleteBooking(b)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 dark:text-red-400 rounded-xl transition-all cursor-pointer"
                            title="Eliminar solicitud/reserva (Finanzas intactas)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Modal: Agendar Servicio Manual / Nueva Reserva */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[var(--bg-card)] border border-[#C9A55B]/40 rounded-3xl p-5 sm:p-7 max-w-2xl w-full my-8 space-y-6 shadow-2xl relative">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-[var(--border-color)] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-[#C9A55B]/15 text-[#C9A55B] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-[#C9A55B]/30 uppercase tracking-widest">
                    Módulo Operativo Manual
                  </span>
                </div>
                <h3 className="font-serif font-bold text-xl text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#C9A55B]" />
                  <span>Agendar Servicio de Masaje Manual</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Crea e ingresa manualmente una cita de bienestar en el sistema, asigna terapeuta directa o activa el motor de despacho.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="p-1.5 rounded-xl bg-[var(--bg-subcard)] hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)] cursor-pointer transition-colors"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onSubmitManualBooking} className="space-y-6">
              {/* 1. SELECCIÓN DE CLIENTE */}
              <div className="bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-serif font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#C9A55B]" />
                    <span>Datos del Cliente VIP</span>
                  </span>

                  <div className="flex items-center bg-[var(--bg-card)] p-0.5 rounded-xl border border-[var(--border-color)] text-[11px]">
                    <button
                      type="button"
                      onClick={() => setManualClientMode('nuevo')}
                      className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-all ${
                        manualClientMode === 'nuevo'
                          ? 'bg-[#C9A55B] text-black font-bold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Cliente Nuevo
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualClientMode('existente')}
                      className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-all ${
                        manualClientMode === 'existente'
                          ? 'bg-[#C9A55B] text-black font-bold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Cliente Registrado
                    </button>
                  </div>
                </div>

                {manualClientMode === 'existente' && (
                  <div>
                    <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                      Seleccionar de la lista de socios ({clients?.length || 0} disponibles)
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => handleSelectClient(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B] cursor-pointer"
                    >
                      <option value="">-- Elige un cliente existente para autorellenar --</option>
                      {(clients || []).map((c) => {
                        const anyC = c as any;
                        const cName = anyC.nombre || anyC.name || [anyC.nombre, anyC.apellidos].filter(Boolean).join(' ') || 'Cliente';
                        const cTel = anyC.telefono || anyC.phone || '';
                        return (
                          <option key={c.id} value={c.id}>
                            {cName} {cTel ? `(${cTel})` : ''} - {anyC.zona || anyC.cityZone || 'CDMX'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                      Nombre Completo <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Sofía Garza Martínez"
                      value={manualClientName}
                      onChange={(e) => setManualClientName(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                      Teléfono / WhatsApp <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej. +52 55 1234 5678"
                      value={manualClientPhone}
                      onChange={(e) => setManualClientPhone(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                      Correo Electrónico (Opcional)
                    </label>
                    <input
                      type="email"
                      placeholder="sofia@ejemplo.com"
                      value={manualClientEmail}
                      onChange={(e) => setManualClientEmail(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                      Zona / Alcaldía
                    </label>
                    <select
                      value={manualCityZone}
                      onChange={(e) => setManualCityZone(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B] cursor-pointer"
                    >
                      {zones && zones.length > 0 ? (
                        zones.map(z => (
                          <option key={z.id} value={z.name}>{z.name}</option>
                        ))
                      ) : (
                        <>
                          <option value="Polanco / CDMX">Polanco / CDMX</option>
                          <option value="Roma / Condesa">Roma / Condesa</option>
                          <option value="Santa Fe">Santa Fe</option>
                          <option value="Interlomas">Interlomas</option>
                          <option value="San Ángel / Pedregal">San Ángel / Pedregal</option>
                          <option value="Lomas de Chapultepec">Lomas de Chapultepec</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                    Dirección Completa de Servicio <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Calle, número exterior/interior, colonia, referencias de acceso..."
                    value={manualClientAddress}
                    onChange={(e) => setManualClientAddress(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                  />
                </div>
              </div>

              {/* 2. SERVICIO DE MASAJE & DURACIÓN */}
              <div className="bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
                <span className="text-xs font-serif font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#C9A55B]" />
                  <span>Ritual de Masaje & Duración</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                      Tipo de Masaje / Servicio
                    </label>
                    <select
                      value={manualServiceId}
                      onChange={(e) => handleServiceChange(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B] cursor-pointer"
                    >
                      {(services || []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.category}) - Desde ${s.basePrice} MXN
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                      Duración de la Sesión
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[60, 90, 120].map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => handleDurationChange(dur)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            manualDurationMinutes === dur
                              ? 'bg-[#C9A55B] text-black border-[#C9A55B] shadow-xs'
                              : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[#C9A55B]/40'
                          }`}
                        >
                          {dur} min
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Precios & Desglose */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                      Precio Servicio ($ MXN)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={manualPrice}
                      onChange={(e) => setManualPrice(Number(e.target.value))}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-[#C9A55B]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                      Propina Opcional ($ MXN)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={manualTip}
                      onChange={(e) => setManualTip(Number(e.target.value))}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                    />
                  </div>

                  <div className="bg-[#C9A55B]/10 border border-[#C9A55B]/30 rounded-xl px-3 py-2 flex flex-col justify-center">
                    <span className="text-[10px] text-[#C9A55B] font-bold uppercase tracking-wider">Total a Cobrar</span>
                    <span className="text-base font-serif font-black text-[#C9A55B]">
                      ${Number(manualPrice || 0) + Number(manualTip || 0)} MXN
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. PROGRAMACIÓN & ASIGNACIÓN */}
              <div className="bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
                <span className="text-xs font-serif font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#C9A55B]" />
                  <span>Programación de Agenda & Masajista</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                      Fecha de la Cita <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                      Hora de Inicio <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={manualTime}
                      onChange={(e) => setManualTime(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                    Asignación de Terapeuta
                  </label>
                  <select
                    value={manualTherapistId}
                    onChange={(e) => setManualTherapistId(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B] cursor-pointer"
                  >
                    <option value="">
                      🚀 Despacho Automático Inteligente (Búsqueda por radar y cercanía)
                    </option>
                    {(therapists || []).map((t) => {
                      const tName = t.name || (t as any).nombre || 'Terapeuta';
                      const tStatus = t.status || (t as any).estado || 'disponible';
                      const tRating = t.rating || 5;
                      return (
                        <option key={t.id} value={t.id}>
                          👤 Asignar directamente a: {tName} ({tRating}⭐) - Estado: {tStatus}
                        </option>
                      );
                    })}
                  </select>
                  <span className="text-[10px] text-[var(--text-muted)] block mt-1">
                    {manualTherapistId 
                      ? 'La cita quedará confirmada de inmediato y la terapeuta recibirá la notificación Push instantáneamente.'
                      : 'La solicitud se enviará al pool de terapeutas disponibles en la zona para que acepten el servicio.'}
                  </span>
                </div>
              </div>

              {/* 4. PAGO & PREFERENCIAS */}
              <div className="bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
                <span className="text-xs font-serif font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-[#C9A55B]" />
                  <span>Método de Pago & Preferencias del Ritual</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                      Método de Pago
                    </label>
                    <select
                      value={manualPaymentMethod}
                      onChange={(e) => setManualPaymentMethod(e.target.value as any)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B] cursor-pointer"
                    >
                      <option value="Tarjeta de Crédito / Débito">Tarjeta de Crédito / Débito (Stripe)</option>
                      <option value="Transferencia Interbancaria (SPEI)">Transferencia Interbancaria (SPEI)</option>
                      <option value="Efectivo / Pago al Recibir">Efectivo / Pago al Recibir en Domicilio</option>
                      <option value="Tarjeta Crédito VIP">Tarjeta Corporativa / VIP Essenya</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                      Estado del Pago
                    </label>
                    <select
                      value={manualPaymentStatus}
                      onChange={(e) => setManualPaymentStatus(e.target.value as any)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B] cursor-pointer"
                    >
                      <option value="pendiente">Pendiente de Cobro</option>
                      <option value="pagado">Pagado / Confirmado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div>
                    <label className="text-[10px] text-[var(--text-muted)] block mb-1">Presión</label>
                    <select
                      value={manualPressureLevel}
                      onChange={(e) => setManualPressureLevel(e.target.value as any)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-2 py-1.5 rounded-xl text-[11px] focus:outline-none"
                    >
                      <option value="Suave">Suave</option>
                      <option value="Media">Media</option>
                      <option value="Firme">Firme</option>
                      <option value="Profunda">Profunda</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[var(--text-muted)] block mb-1">Esencia</label>
                    <select
                      value={manualEssentialOil}
                      onChange={(e) => setManualEssentialOil(e.target.value as any)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-2 py-1.5 rounded-xl text-[11px] focus:outline-none"
                    >
                      <option value="Lavanda Francesa">Lavanda</option>
                      <option value="Eucalipto Silvestre">Eucalipto</option>
                      <option value="Ylang Ylang Dorado">Ylang Ylang</option>
                      <option value="Menta & Romero">Menta & Romero</option>
                      <option value="Aceite neutro">Neutro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[var(--text-muted)] block mb-1">Música</label>
                    <select
                      value={manualMusicStyle}
                      onChange={(e) => setManualMusicStyle(e.target.value as any)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-2 py-1.5 rounded-xl text-[11px] focus:outline-none"
                    >
                      <option value="Acoustic Zen">Acoustic Zen</option>
                      <option value="Ambient Gold">Ambient Gold</option>
                      <option value="Frecuencias 432Hz">432Hz</option>
                      <option value="Silencio Absoluto">Silencio</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[var(--text-muted)] block mb-1">Preferencia</label>
                    <select
                      value={manualGenderPref}
                      onChange={(e) => setManualGenderPref(e.target.value as any)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] px-2 py-1.5 rounded-xl text-[11px] focus:outline-none"
                    >
                      <option value="sin_preferencia">Sin pref.</option>
                      <option value="femenino">Femenino</option>
                      <option value="masculino">Masculino</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                    Notas Especiales / Dolencias / Instrucciones de Llegada
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej. Tensión en espalda baja y cervicales. Timbre 402, dejar pasar con identificación."
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C9A55B]"
                  />
                </div>
              </div>

              {/* Botones de acción del Modal */}
              <div className="flex justify-end items-center gap-3 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  disabled={isSubmittingManual}
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>

                <LuxuryButton
                  type="submit"
                  variant="gold"
                  size="md"
                  disabled={isSubmittingManual}
                  className="px-6 py-2.5 shadow-lg"
                >
                  {isSubmittingManual ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Agendando servicio...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Crear y Confirmar Cita</span>
                    </div>
                  )}
                </LuxuryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Realtime Admin Chat Supervisor Modal */}
      <AdminChatSupervisorModal
        booking={chatSupervisorBooking}
        isOpen={!!chatSupervisorBooking}
        onClose={() => setChatSupervisorBooking(null)}
      />
    </div>
  );
};
