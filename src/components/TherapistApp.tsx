import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import { LuxuryButton } from './ui/LuxuryButton';
import { Therapist, Booking, BookingState } from '../types';
import { 
  Calendar, Clock, MapPin, Navigation, MessageSquare, DollarSign, 
  CheckCircle2, XCircle, Play, Shield, Award, Star, Bot, Send, UserCheck, Check,
  AlertTriangle, X
} from 'lucide-react';
import { PanicModal } from './PanicModal';
import { WhatsAppButton } from './WhatsAppButton';
import { fetchPostCareProtocol } from '../shared/services/api';


interface TherapistAppProps {
  therapist: Therapist;
  bookings: Booking[];
  onUpdateBookingState: (bookingId: string, newState: BookingState) => void;
  onAcceptBooking?: (bookingId: string, therapist: Therapist) => void;
  onRejectBooking?: (bookingId: string, reason?: string) => void;
}

export const TherapistApp: React.FC<TherapistAppProps> = ({
  therapist,
  bookings,
  onUpdateBookingState,
  onAcceptBooking,
  onRejectBooking,
}) => {
  const activeTherapist = therapist || {
    id: 'ther-1',
    name: 'Elena Rostova',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    phone: '525512345678',
    rating: 4.9,
    reviewCount: 128,
    specialties: ['Masaje Tejido Profundo', 'Descontracturante VIP'],
    status: 'disponible',
    coverageZones: ['Polanco', 'Lomas de Chapultepec'],
    completedServicesCount: 342,
    bio: 'Especialista certificada con 8 años de experiencia en masajes terapéuticos de alto nivel.'
  };

  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'schedule' | 'active' | 'earnings' | 'postcare'>('active');
  const [availability, setAvailability] = useState<'disponible' | 'desconectado'>('disponible');
  const [showPanicModal, setShowPanicModal] = useState<boolean>(false);
  const [declinedBookingIds, setDeclinedBookingIds] = useState<string[]>([]);

  // Pending bookings that need therapist acceptance
  const pendingBookings = bookings.filter(b => b.state === 'pendiente' && !declinedBookingIds.includes(b.id));
  const activePending = pendingBookings[0] || null;

  // Find active booking assigned to therapist
  const currentBooking = bookings.find(b => b.state !== 'servicio_finalizado' && b.state !== 'cancelado' && b.state !== 'pendiente') || bookings.find(b => b.state !== 'servicio_finalizado' && b.state !== 'cancelado') || bookings[0];

  const handleAccept = (booking: Booking) => {
    if (onAcceptBooking) {
      onAcceptBooking(booking.id, activeTherapist);
    } else {
      onUpdateBookingState(booking.id, 'aceptado');
    }
    showToast(
      '¡Servicio Aceptado!',
      `Has aceptado la reserva ${booking.code}. Se ha notificado al cliente ${booking.clientName} que tú (${activeTherapist.name}) serás su terapeuta.`,
      'success'
    );
    setActiveTab('active');
  };

  const handleDecline = (booking: Booking) => {
    setDeclinedBookingIds(prev => [...prev, booking.id]);
    if (onRejectBooking) {
      onRejectBooking(booking.id, 'Terapeuta no disponible');
    }
    showToast(
      'Solicitud Declinada',
      'La solicitud fue rechazada y enviada a la central de despacho para reasignación.',
      'gold'
    );
  };

  // Post care state
  const [therapistNotes, setTherapistNotes] = useState<string>('Rigidez liberada en trapecios y lumbar izquierda. Se recomienda buena hidratación.');
  const [postCareLoading, setPostCareLoading] = useState<boolean>(false);
  const [postCareResult, setPostCareResult] = useState<any>(null);

  // Chat state
  const [chatInput, setChatInput] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ sender: string, text: string, time: string }>>([
    { sender: 'Don Alejandro', text: 'Hola Elena, ¿a qué hora aproximadamente estás llegando a Palmas?', time: '10:18 AM' },
    { sender: activeTherapist.name, text: 'Hola Don Alejandro. Estoy a 12 minutos. El chofer ejecutivo ya está estacionando.', time: '10:20 AM' }
  ]);

  const handleUpdateStatus = (bookingId: string, newState: BookingState, label: string) => {
    onUpdateBookingState(bookingId, newState);
    showToast('Estado de Servicio Actualizado', `Servicio marcado como "${label}". Notificado al cliente y a central dispatch.`, 'gold');
  };

  const handleGeneratePostCare = async () => {
    setPostCareLoading(true);
    setPostCareResult(null);
    try {
      const data = await fetchPostCareProtocol({
        ritualName: currentBooking?.serviceName || 'Ritual Holístico Essenya',
        therapistNotes: therapistNotes
      });
      if (data.protocol) {
        setPostCareResult(data.protocol);
        showToast('Protocolo Generado', 'Recomendaciones post-care sincronizadas con el expediente del socio.', 'gold');
      } else {
        throw new Error('No protocol returned');
      }
    } catch (e: any) {
      console.warn('Post-care protocol warning:', e?.message || e);
      setPostCareResult({
        hydrationTip: "Beba al menos 750ml de agua tibia con infusión de lavanda o manzanilla durante las próximas 3 horas para favorecer la desintoxicación muscular.",
        stretchingProtocol: ["Inclinación suave de cuello lateral 15 seg por lado", "Rotación posterior de escápulas para apertura torácica"],
        careMessage: "Ha sido un absoluto honor brindarle este servicio. Le recomendamos reposar confortablemente para maximizar los beneficios terapéuticos de su experiencia ESSENYA."
      });
      showToast('Protocolo Personalizado', 'Protocolo generado exitosamente.', 'gold');
    } finally {
      setPostCareLoading(false);
    }
  };


  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setMessages(prev => [
      ...prev,
      { sender: activeTherapist.name, text: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setChatInput('');
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white pb-20 transition-colors duration-300">
      {/* Top Professional Strip */}
      <section className="bg-[#F5F1EA] dark:bg-gradient-to-b dark:from-[#141414] dark:to-[#0D0D0D] border-b border-[#E5DFD3] dark:border-[#C9A55B]/20 py-6 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img 
                src={activeTherapist.photo || undefined} 
                alt={activeTherapist.name} 
                className="w-16 h-16 rounded-full object-cover border-2 border-[#C9A55B] shadow-lg shadow-[#C9A55B]/20"
                referrerPolicy="no-referrer"
              />
              <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-[#0D0D0D] ${
                availability === 'disponible' ? 'bg-emerald-400' : 'bg-red-500'
              }`}></span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-serif font-bold text-[#1C1917] dark:text-white">{activeTherapist.name}</h2>
                <span className="bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#C9A55B]/30">
                  Fisioterapeuta Senior
                </span>
              </div>
              <p className="text-xs text-[#6B655F] dark:text-[#888888] flex items-center space-x-2 mt-1">
                <span className="flex items-center text-[#9A7B38] dark:text-[#C9A55B] font-bold">
                  <Star className="w-3.5 h-3.5 fill-[#C9A55B] mr-0.5 text-[#C9A55B]" />
                  {activeTherapist.rating} ({activeTherapist.reviewCount} reseñas)
                </span>
                <span>•</span>
                <span>{activeTherapist.coverageZones?.[0] || 'Polanco / Lomas'}</span>
              </p>
            </div>
          </div>

          {/* Availability Toggle & Panic SOS Button */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => setShowPanicModal(true)}
              id="therapist-panic-sos-btn"
              title="Botón de Pánico Emergencia SOS"
              className="flex items-center justify-center space-x-1.5 bg-gradient-to-r from-red-600 via-red-500 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md animate-pulse shrink-0"
            >
              <AlertTriangle className="w-4 h-4 text-white" />
              <span>Botón Pánico SOS</span>
            </button>

            <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#C9A55B]/30 p-1 rounded-xl flex items-center space-x-1 shadow-xs shrink-0">
              <button
                onClick={() => setAvailability('disponible')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  availability === 'disponible'
                    ? 'bg-emerald-500 text-black font-bold'
                    : 'text-[#6B655F] dark:text-[#888888] hover:text-[#1C1917] dark:hover:text-white'
                }`}
              >
                Online
              </button>
              <button
                onClick={() => setAvailability('desconectado')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  availability === 'desconectado'
                    ? 'bg-red-500 text-white font-bold'
                    : 'text-[#6B655F] dark:text-[#888888] hover:text-[#1C1917] dark:hover:text-white'
                }`}
              >
                Offline
              </button>
            </div>

            <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#C9A55B]/30 px-3.5 py-1.5 rounded-xl text-center shadow-xs shrink-0">
              <span className="text-[10px] text-[#6B655F] dark:text-[#888888] uppercase tracking-wider block font-semibold">Ganancia Semanal</span>
              <span className="text-sm font-bold text-[#806020] dark:text-gold-gradient">$18,450 MXN</span>
            </div>
          </div>
        </div>

        {/* Therapist Navigation Tabs */}
        <div className="max-w-7xl mx-auto flex items-center space-x-2 mt-6 border-t border-[#E5DFD3] dark:border-[#C9A55B]/10 pt-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('active')}
            id="therapist-tab-active"
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'active'
                ? 'bg-[#C9A55B]/20 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/50'
                : 'text-[#6B655F] dark:text-white/60 hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>Servicio en Curso</span>
            {currentBooking && currentBooking.state !== 'servicio_finalizado' && (
              <span className="w-2 h-2 rounded-full bg-[#C9A55B] animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            id="therapist-tab-schedule"
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'bg-[#C9A55B]/20 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/50'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Mi Agenda Hoy</span>
          </button>

          <button
            onClick={() => setActiveTab('earnings')}
            id="therapist-tab-earnings"
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'earnings'
                ? 'bg-[#C9A55B]/20 text-[#C9A55B] border border-[#C9A55B]/40'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Mis Ganancias</span>
          </button>

          <button
            onClick={() => setActiveTab('postcare')}
            id="therapist-tab-postcare"
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'postcare'
                ? 'bg-[#C9A55B]/20 text-[#C9A55B] border border-[#C9A55B]/40'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Generador Post-Care AI</span>
          </button>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* INCOMING BOOKING ALERT MODAL / BANNER (FOR PENDING BOOKINGS) */}
        {activePending && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#1C1A17] via-[#2A2418] to-[#1C1A17] border-2 border-[#C9A55B] p-6 rounded-2xl shadow-2xl relative overflow-hidden text-white space-y-4 ring-2 ring-[#C9A55B]/40"
          >
            <div className="absolute top-0 right-0 bg-[#C9A55B] text-black font-extrabold text-[11px] px-4 py-1 rounded-bl-2xl uppercase tracking-widest flex items-center gap-1.5 shadow-md">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
              <span>¡Nueva Solicitud Entrante!</span>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#C9A55B]/30 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-[#C9A55B]">Cita #{activePending.code || activePending.id}</span>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                    {activePending.paymentStatus === 'pagado' ? '✓ Pago Acreditado' : 'Pago al Recibir'}
                  </span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-white">{activePending.serviceName}</h3>
                <p className="text-xs text-[#AAAAAA]">
                  Cliente VIP: <strong className="text-white font-semibold">{activePending.clientName}</strong> • {activePending.clientPhone}
                </p>
              </div>

              <div className="text-left md:text-right">
                <span className="text-xs text-[#AAAAAA] block">Ganancia por Servicio</span>
                <span className="text-2xl font-bold text-gold-gradient">${(activePending.total ?? activePending.price ?? 0).toLocaleString()} MXN</span>
              </div>
            </div>

            {/* Service & Location Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-black/40 p-4 rounded-xl border border-[#C9A55B]/20 text-xs">
              <div className="space-y-1">
                <span className="text-[#888888] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#C9A55B]" />
                  <span>Fecha & Horario</span>
                </span>
                <p className="font-bold text-white">{activePending.date} a las {activePending.time}</p>
                <p className="text-[11px] text-[#AAAAAA]">{activePending.durationMinutes} min de sesión</p>
              </div>

              <div className="space-y-1">
                <span className="text-[#888888] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#C9A55B]" />
                  <span>Dirección del Cliente</span>
                </span>
                <p className="font-bold text-white">{activePending.clientAddress}</p>
                <p className="text-[11px] text-[#AAAAAA]">Zona: {activePending.cityZone}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[#888888] flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-[#C9A55B]" />
                  <span>Preferencias & Molestias</span>
                </span>
                <p className="text-[#C9A55B] font-semibold">Presión: {activePending.preferences.pressureLevel} • {activePending.preferences.essentialOil}</p>
                {activePending.painPoints && (
                  <p className="text-[11px] text-amber-300 font-medium truncate">Puntos dolor: {activePending.painPoints}</p>
                )}
              </div>
            </div>

            {/* Action Buttons: Accept / Decline */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-xs text-[#AAAAAA] italic">
                Al aceptar, el cliente verá tu nombre ({activeTherapist.name}) y fotografía oficial en su pantalla de seguimiento en vivo.
              </p>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  onClick={() => handleDecline(activePending)}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-xl border border-white/20 text-xs font-semibold text-[#AAAAAA] hover:text-red-400 hover:border-red-400/50 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Declinar</span>
                </button>

                <button
                  onClick={() => handleAccept(activePending)}
                  className="flex-1 sm:flex-none px-8 py-3 rounded-xl bg-gradient-to-r from-[#E6CA65] via-[#C9A55B] to-[#9A7B38] text-black font-extrabold text-sm hover:opacity-95 shadow-lg shadow-[#C9A55B]/30 transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-5 h-5 text-black" />
                  <span>Aceptar Masaje Ahora</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB: ACTIVE SERVICE & STATE STEPPER */}
        {activeTab === 'active' && currentBooking && (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Active Service Banner */}
            <div className="bg-[#141414] p-6 rounded-2xl border border-[#C9A55B]/30 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#222222] pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-[#C9A55B]">{currentBooking.code}</span>
                    <span className="bg-[#C9A55B]/20 text-[#C9A55B] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border border-[#C9A55B]/30">
                      Estado: {currentBooking.state}
                    </span>
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-white mt-1">{currentBooking.serviceName}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    <p className="text-xs text-[#AAAAAA]">Cliente VIP: <span className="text-white font-semibold">{currentBooking.clientName}</span> (Atención por Concierge Admin)</p>
                    <WhatsAppButton 
                      phoneNumber="525512345678"
                      message={`Hola Administrador ESSENYA, soy la terapeuta ${activeTherapist.name}. Notifico actualización sobre la reserva ${currentBooking.code} de ${currentBooking.clientName}.`}
                      buttonText="WhatsApp con Administrador"
                      variant="outline"
                      size="sm"
                    />
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-[#888888] block">Pago a Recibir</span>
                  <span className="text-xl font-bold text-gold-gradient">${(currentBooking?.total ?? 0).toLocaleString()} MXN</span>
                </div>
              </div>

              {/* Domicilio & Client Preferences */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#1A1A1A] p-4 rounded-xl border border-[#C9A55B]/20 text-xs">
                <div className="space-y-1">
                  <span className="text-[#888888] block">Ubicación Domicilio VIP:</span>
                  <p className="font-bold text-white">{currentBooking.clientAddress}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[#888888] block">Preferencias de la Sesión:</span>
                  <p className="text-[#C9A55B] font-semibold">
                    Presión: {currentBooking.preferences.pressureLevel} • Aceite: {currentBooking.preferences.essentialOil}
                  </p>
                  <p className="text-[11px] text-[#AAAAAA] italic mt-1">"{currentBooking.preferences.specialInstructions || 'Sin instrucciones adicionales'}"</p>
                </div>
              </div>

              {/* Service State Controller Buttons */}
              <div className="space-y-3 pt-2">
                <span className="text-xs uppercase text-[#AAAAAA] tracking-wider font-semibold block">
                  Panel de Control de Estado del Servicio (Sincronizado en tiempo real)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {[
                    { key: 'aceptado', label: '1. Aceptar Solicitud', icon: CheckCircle2, color: 'bg-[#C9A55B]' },
                    { key: 'en_camino', label: '2. En Camino (GPS)', icon: Navigation, color: 'bg-[#C9A55B]' },
                    { key: 'llegue', label: '3. Llegué a Domicilio', icon: MapPin, color: 'bg-[#C9A55B]' },
                    { key: 'servicio_iniciado', label: '4. Iniciar Masaje', icon: Play, color: 'bg-[#C9A55B]' },
                    { key: 'servicio_finalizado', label: '5. Finalizar Masaje', icon: UserCheck, color: 'bg-emerald-500' }
                  ].map((st) => (
                    <button
                      key={st.key}
                      onClick={() => onUpdateBookingState(currentBooking.id, st.key as any)}
                      className={`p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                        currentBooking.state === st.key
                          ? `${st.color} text-black ring-2 ring-white shadow-lg`
                          : 'bg-[#222222] text-white hover:bg-[#C9A55B] hover:text-black'
                      }`}
                    >
                      <st.icon className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chat with Client */}
            <div className="bg-[#141414] p-6 rounded-2xl border border-[#C9A55B]/20 space-y-4">
              <h4 className="text-xs uppercase text-[#AAAAAA] tracking-wider font-semibold flex items-center space-x-1.5">
                <MessageSquare className="w-4 h-4 text-[#C9A55B]" />
                <span>Chat Directo con Don Alejandro</span>
              </h4>

              <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#333333] h-48 overflow-y-auto space-y-3 text-xs">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex flex-col ${m.sender === activeTherapist.name ? 'items-end' : 'items-start'}`}>
                    <div className={`p-2.5 rounded-xl max-w-[80%] ${
                      m.sender === activeTherapist.name ? 'bg-[#C9A55B] text-black font-semibold' : 'bg-[#222222] text-white'
                    }`}>
                      <p>{m.text}</p>
                    </div>
                    <span className="text-[9px] text-[#666666] mt-0.5">{m.sender} • {m.time}</span>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Enviar actualización o pregunta al cliente..."
                  className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A55B]"
                />
                <button
                  onClick={handleSendChat}
                  className="px-5 py-2.5 bg-[#C9A55B] text-black font-bold text-xs rounded-xl hover:bg-[#E6CA65]"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-serif font-bold text-white">Agenda y Citas Programadas</h3>
              <span className="text-xs text-[#C9A55B] bg-[#C9A55B]/15 px-3 py-1 rounded-full border border-[#C9A55B]/30 font-semibold">
                {bookings.length} Citas Registradas
              </span>
            </div>

            <div className="space-y-4">
              {bookings.map((bk) => (
                <div key={bk.id} className="bg-[#141414] p-5 rounded-2xl border border-[#C9A55B]/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-[#C9A55B] font-mono font-bold">{bk.time} hrs</span>
                      <span className="text-xs text-[#888888]">• {bk.date}</span>
                      <span className="font-mono text-[10px] text-[#C9A55B]/80">#{bk.code || bk.id}</span>
                    </div>
                    <h4 className="text-base font-bold text-white">{bk.serviceName} ({bk.durationMinutes} min)</h4>
                    <p className="text-xs text-[#AAAAAA]">{bk.clientName} • {bk.clientAddress} ({bk.cityZone})</p>
                    <p className="text-xs text-[#C9A55B] font-semibold">${(bk.total ?? bk.price ?? 0).toLocaleString()} MXN</p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {bk.state === 'pendiente' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAccept(bk)}
                          className="bg-[#C9A55B] text-black font-extrabold text-xs px-3.5 py-1.5 rounded-lg hover:bg-[#E6CA65] transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Aceptar</span>
                        </button>
                        <button
                          onClick={() => handleDecline(bk)}
                          className="bg-[#222222] text-[#AAAAAA] hover:text-red-400 text-xs px-2.5 py-1.5 rounded-lg border border-[#333333] transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-bold bg-[#C9A55B]/15 text-[#C9A55B] px-3 py-1 rounded-full border border-[#C9A55B]/30 uppercase">
                        {bk.state.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: EARNINGS */}
        {activeTab === 'earnings' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <h3 className="text-2xl font-serif font-bold text-white">Reporte de Ganancias y Comisiones</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#141414] p-5 rounded-2xl border border-[#C9A55B]/30">
                <span className="text-xs text-[#888888] uppercase block">Total Ganancias Semanales</span>
                <span className="text-2xl font-bold text-gold-gradient">$18,450 MXN</span>
              </div>

              <div className="bg-[#141414] p-5 rounded-2xl border border-[#C9A55B]/30">
                <span className="text-xs text-[#888888] uppercase block">Propinas Acumuladas</span>
                <span className="text-2xl font-bold text-emerald-400">$3,200 MXN</span>
              </div>

              <div className="bg-[#141414] p-5 rounded-2xl border border-[#C9A55B]/30">
                <span className="text-xs text-[#888888] uppercase block">Servicios Completados</span>
                <span className="text-2xl font-bold text-white">12 Sesiones</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB: POST CARE GENERATOR */}
        {activeTab === 'postcare' && (
          <div className="max-w-2xl mx-auto bg-[#141414] p-6 sm:p-8 rounded-2xl border border-[#C9A55B]/30 space-y-6">
            <div className="space-y-1 border-b border-[#C9A55B]/20 pb-4">
              <span className="text-xs text-[#C9A55B] uppercase font-bold tracking-widest">Herramienta Terapeuta AI</span>
              <h3 className="text-2xl font-serif font-bold text-white">Generador de Protocolo Post-Masaje</h3>
              <p className="text-xs text-[#AAAAAA]">
                Crea un protocolo de cuidados personalizados de lujo para enviar al cliente al finalizar la sesión.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs text-[#AAAAAA] uppercase font-semibold block">
                Notas y Evaluación Clínica del Masaje
              </label>
              <textarea
                rows={3}
                value={therapistNotes}
                onChange={(e) => setTherapistNotes(e.target.value)}
                placeholder="Escribe hallazgos musculares, nudos liberados, recomendación de estiramiento..."
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#C9A55B]"
              ></textarea>

              <button
                onClick={handleGeneratePostCare}
                disabled={postCareLoading}
                className="w-full py-3 bg-gradient-to-r from-[#C9A55B] via-[#E6CA65] to-[#C9A55B] text-black font-bold text-xs rounded-xl gold-button-hover flex items-center justify-center space-x-2"
              >
                {postCareLoading ? (
                  <span>Generando Recomendación con Gemini...</span>
                ) : (
                  <>
                    <Bot className="w-4 h-4 text-black" />
                    <span>Generar Reporte Post-Atención de Lujo</span>
                  </>
                )}
              </button>
            </div>

            {postCareResult && (
              <div className="bg-[#1A1A1A] p-5 rounded-xl border border-[#C9A55B]/40 space-y-3 text-xs">
                <h4 className="font-serif font-bold text-[#C9A55B] text-sm">Protocolo Listo para Enviar al Cliente:</h4>
                <p className="text-white/90 italic">"{postCareResult.careMessage}"</p>
                <div className="pt-2">
                  <span className="text-[#AAAAAA] font-bold block">Recomendación de Hidratación:</span>
                  <p className="text-white">{postCareResult.hydrationTip}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Global Safety Emergency Panic Modal */}
      <PanicModal 
        isOpen={showPanicModal}
        onClose={() => setShowPanicModal(false)}
        userType="therapist"
      />
    </div>
  );
};
