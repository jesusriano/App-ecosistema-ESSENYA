import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import { LuxuryButton } from './ui/LuxuryButton';
import { Therapist, Booking, BookingState } from '../types';
import { 
  Calendar, Clock, MapPin, Navigation, MessageSquare, DollarSign, 
  CheckCircle2, XCircle, Play, Shield, Award, Star, Bot, Send, UserCheck, Check, CheckCheck,
  AlertTriangle, X
} from 'lucide-react';
import { PanicModal } from './PanicModal';
import { WhatsAppButton } from './WhatsAppButton';
import { fetchPostCareProtocol } from '../shared/services/api';
import { LiveTrackingMap } from '../shared/components/LiveTrackingMap';
import { ServiceCompletionModal } from '../aplicaciones/terapeuta/components/ServiceCompletionModal';


interface TherapistAppProps {
  therapist: Therapist;
  bookings: Booking[];
  onUpdateBookingState: (bookingId: string, newState: BookingState) => void;
  onAcceptBooking?: (bookingId: string, therapist: Therapist) => void;
  onRejectBooking?: (bookingId: string, reason?: string) => void;
  onUpdateLiveLocation?: (bookingId: string, lat: number, lng: number) => Promise<void>;
}

export const TherapistApp: React.FC<TherapistAppProps> = ({
  therapist,
  bookings,
  onUpdateBookingState,
  onAcceptBooking,
  onRejectBooking,
  onUpdateLiveLocation,
}) => {
  const activeTherapist: Therapist = therapist || {
    id: 'ther-1',
    name: 'Elena Rostova',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    phone: '525512345678',
    email: 'elena.rostova@essenya.mx',
    rating: 4.9,
    reviewCount: 128,
    totalServices: 342,
    gender: 'femenino',
    specialties: ['Masaje Tejido Profundo', 'Descontracturante VIP'],
    status: 'disponible',
    currentZone: 'Polanco',
    coverageZones: ['Polanco', 'Lomas de Chapultepec'],
    certifications: ['Certificación Internacional Spa & Wellness'],
    vehicleType: 'Auto Ejecutivo',
    lat: 19.4326,
    lng: -99.1332,
    completedServicesCount: 342,
    bio: 'Especialista certificada con 8 años de experiencia en masajes terapéuticos de alto nivel.'
  };

  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'schedule' | 'active' | 'earnings' | 'postcare' | 'history'>('active');
  const [availability, setAvailability] = useState<'disponible' | 'desconectado'>('disponible');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [completedCelebrationBooking, setCompletedCelebrationBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const defaultCompletedServices = [
    {
      id: 'bk-comp-1',
      code: 'ESS-4821',
      serviceName: 'Masaje Tejido Profundo VIP',
      date: '2026-09-10',
      time: '16:00',
      clientName: 'Don Alejandro',
      clientPhone: '55 1234 5678',
      price: 1800,
      tip: 300,
      total: 2100,
      rating: 5,
      reviewComment: 'Excelente técnica y profesionalismo. Alivió por completo mi dolor lumbar.',
    },
    {
      id: 'bk-comp-2',
      code: 'ESS-3921',
      serviceName: 'Ritual Holístico Essenya',
      date: '2026-09-08',
      time: '11:30',
      clientName: 'Sra. Sofia Lorenz',
      clientPhone: '55 8765 4321',
      price: 2200,
      tip: 400,
      total: 2600,
      rating: 5,
      reviewComment: 'Una experiencia verdaderamente mística. El aceite de lavanda y la música zen crearon una atmósfera insuperable.',
    },
    {
      id: 'bk-comp-3',
      code: 'ESS-3104',
      serviceName: 'Masaje Descontracturante VIP',
      date: '2026-09-05',
      time: '18:00',
      clientName: 'Ing. Carlos Mendoza',
      clientPhone: '55 4321 8765',
      price: 1950,
      tip: 200,
      total: 2150,
      rating: 4.8,
      reviewComment: 'Muy recomendado. Liberó la rigidez de mis hombros y cuello después de una semana muy pesada.',
    }
  ];

  const mergedCompletedBookings = React.useMemo(() => {
    const realCompleted = bookings.filter(b => b.state === 'servicio_finalizado');
    const allCompleted = [...realCompleted];
    
    defaultCompletedServices.forEach(def => {
      if (!allCompleted.some(b => b.code === def.code)) {
        allCompleted.push({
          id: def.id,
          code: def.code,
          clientId: 'client-dummy',
          clientName: def.clientName,
          clientPhone: def.clientPhone,
          clientAddress: 'Lomas de Chapultepec, CDMX',
          cityZone: 'Lomas',
          serviceId: 'srv-dummy',
          serviceName: def.serviceName,
          durationMinutes: 90,
          price: def.price,
          tip: def.tip,
          total: def.total,
          date: def.date,
          time: def.time,
          preferences: {
            genderPreference: 'sin_preferencia',
            pressureLevel: 'Firme',
            essentialOil: 'Lavanda Francesa',
            musicStyle: 'Ambient Gold'
          },
          state: 'servicio_finalizado',
          etaMinutes: 0,
          paymentMethod: 'Tarjeta de Crédito / Débito',
          paymentStatus: 'pagado',
          createdAt: def.date,
          rating: def.rating,
          reviewComment: def.reviewComment
        });
      }
    });
    return allCompleted;
  }, [bookings]);
  const [showPanicModal, setShowPanicModal] = useState<boolean>(false);
  const [declinedBookingIds, setDeclinedBookingIds] = useState<string[]>([]);

  // Pending bookings that need therapist acceptance
  const pendingBookings = bookings.filter(b => b.state === 'pendiente' && !declinedBookingIds.includes(b.id));
  const activePending = pendingBookings[0] || null;

  // Find active booking assigned to therapist
  const currentBooking = bookings.find(b => b.state !== 'servicio_finalizado' && b.state !== 'cancelado' && b.state !== 'pendiente') || bookings.find(b => b.state !== 'servicio_finalizado' && b.state !== 'cancelado') || bookings[0];

  // Watch position and update Firestore for active bookings
  useEffect(() => {
    if (!currentBooking || !onUpdateLiveLocation) return;
    
    // Only track if moving towards or at client
    const statesToTrack: BookingState[] = ['en_camino', 'llegue', 'servicio_iniciado'];
    if (!statesToTrack.includes(currentBooking.state)) return;

    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onUpdateLiveLocation(currentBooking.id, latitude, longitude);
      },
      (error) => {
        console.warn('Geolocation error in tracking:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [currentBooking?.id, currentBooking?.state, onUpdateLiveLocation]);

  const handleAccept = (booking: Booking) => {
    if (onAcceptBooking) {
      onAcceptBooking(booking.id, activeTherapist);
    } else {
      onUpdateBookingState(booking.id, 'aceptada');
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
  const [isClientTyping, setIsClientTyping] = useState<boolean>(false);
  const [messages, setMessages] = useState<Array<{ sender: string, text: string, time: string, read?: boolean }>>([
    { sender: 'Don Alejandro', text: 'Hola Elena, ¿a qué hora aproximadamente estás llegando a Palmas?', time: '10:18 AM', read: true },
    { sender: activeTherapist.name, text: 'Hola Don Alejandro. Estoy a 12 minutos. El chofer ejecutivo ya está estacionando.', time: '10:20 AM', read: true }
  ]);

  const handleUpdateStatus = (bookingId: string, newState: BookingState, label: string) => {
    onUpdateBookingState(bookingId, newState);
    showToast('Estado de Servicio Actualizado', `Servicio marcado como "${label}". Notificado al cliente y a central dispatch.`, 'gold');
  };

  const handleGeneratePostCare = async () => {
    if (therapistNotes.trim().length < 20) {
      showToast(
        'Notas insuficientes',
        'Por favor, ingresa al menos 20 caracteres en las notas clínicas para asegurar recomendaciones precisas.',
        'error'
      );
      return;
    }

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
    const newMsg = { 
      sender: activeTherapist.name, 
      text: chatInput, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    setMessages(prev => [...prev, newMsg]);
    setChatInput('');

    // Mark as read after 1s
    setTimeout(() => {
      setMessages(prev => prev.map(m => m === newMsg ? { ...m, read: true } : m));
    }, 1000);

    // Client typing after 800ms
    setTimeout(() => {
      setIsClientTyping(true);
    }, 800);

    // Client reply after 2500ms
    setTimeout(() => {
      setIsClientTyping(false);
      setMessages(prev => [
        ...prev,
        {
          sender: 'Don Alejandro',
          text: 'Perfecto Elena, aquí te esperamos en la recepción con gusto.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: true
        }
      ]);
    }, 2500);
  };

  const [etaInfo, setEtaInfo] = useState<{distance: string, duration: string} | null>(null);

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white pb-20 transition-colors duration-300">
      {!isOnline && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-center text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center justify-center gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" />
          <span>Modo Sin Conexión Activo: Tu agenda y servicios programados se sincronizarán automáticamente al recuperar la conexión.</span>
        </div>
      )}

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
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab('active')}
            id="therapist-tab-active"
            className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'active'
                ? 'text-[#806020] dark:text-[#C9A55B]'
                : 'text-[#6B655F] dark:text-white/60 hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            {activeTab === 'active' && (
              <motion.div
                layoutId="therapistInnerTabIndicator"
                className="absolute inset-0 bg-[#C9A55B]/20 border border-[#C9A55B]/50 rounded-lg shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Navigation className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Servicio en Curso</span>
            {currentBooking && currentBooking.state !== 'servicio_finalizado' && (
              <span className="relative z-10 w-2 h-2 rounded-full bg-[#C9A55B] animate-ping"></span>
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab('schedule')}
            id="therapist-tab-schedule"
            className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'schedule'
                ? 'text-[#806020] dark:text-[#C9A55B]'
                : 'text-[#6B655F] dark:text-white/60 hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            {activeTab === 'schedule' && (
              <motion.div
                layoutId="therapistInnerTabIndicator"
                className="absolute inset-0 bg-[#C9A55B]/20 border border-[#C9A55B]/50 rounded-lg shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Calendar className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Mi Agenda Hoy</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab('earnings')}
            id="therapist-tab-earnings"
            className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'earnings'
                ? 'text-[#806020] dark:text-[#C9A55B] font-bold'
                : 'text-[#6B655F] dark:text-white/60 hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            {activeTab === 'earnings' && (
              <motion.div
                layoutId="therapistInnerTabIndicator"
                className="absolute inset-0 bg-[#C9A55B]/20 border border-[#C9A55B]/50 rounded-lg shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <DollarSign className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Mis Ganancias</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab('history')}
            id="therapist-tab-history"
            className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'history'
                ? 'text-[#806020] dark:text-[#C9A55B] font-bold'
                : 'text-[#6B655F] dark:text-white/60 hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            {activeTab === 'history' && (
              <motion.div
                layoutId="therapistInnerTabIndicator"
                className="absolute inset-0 bg-[#C9A55B]/20 border border-[#C9A55B]/50 rounded-lg shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Clock className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Historial de Servicios</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab('postcare')}
            id="therapist-tab-postcare"
            className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'postcare'
                ? 'text-[#806020] dark:text-[#C9A55B] font-bold'
                : 'text-[#6B655F] dark:text-white/60 hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            {activeTab === 'postcare' && (
              <motion.div
                layoutId="therapistInnerTabIndicator"
                className="absolute inset-0 bg-[#C9A55B]/20 border border-[#C9A55B]/50 rounded-lg shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <Bot className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Generador Post-Care AI</span>
          </motion.button>
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

        {/* TAB CONTENTS WITH SMOOTH ANIMATIONS */}
        <AnimatePresence mode="wait">
        {/* TAB: ACTIVE SERVICE & STATE STEPPER */}
        {activeTab === 'active' && (
          <motion.div
            key="tab-active-content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="space-y-8 max-w-4xl mx-auto"
          >
            {currentBooking ? (
              <div className="space-y-8">
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

                <div className="text-right flex flex-col items-end">
                  <span className="text-xs text-[#888888] block">Pago a Recibir</span>
                  <span className="text-xl font-bold text-gold-gradient">${(currentBooking?.total ?? 0).toLocaleString()} MXN</span>
                  {etaInfo && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] bg-[#C9A55B]/10 text-[#C9A55B] px-2 py-0.5 rounded border border-[#C9A55B]/20 font-bold uppercase animate-pulse">
                      <Clock className="w-3 h-3" />
                      <span>Arribo en: {etaInfo.duration}</span>
                    </div>
                  )}
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

              {/* Live Tracking Map Preview */}
              <div className="mt-4 border border-[#C9A55B]/20 rounded-2xl overflow-hidden shadow-lg">
                <LiveTrackingMap
                  clientAddress={currentBooking.clientAddress}
                  cityZone={currentBooking.cityZone}
                  therapistName={activeTherapist.name}
                  therapistPhoto={activeTherapist.photo}
                  bookingState={currentBooking.state}
                  therapistLat={activeTherapist.lat}
                  therapistLng={activeTherapist.lng}
                  isTherapistView={true}
                  onRouteCalculated={setEtaInfo}
                />
              </div>

              {/* Service State Controller Buttons */}
              <div className="space-y-3 pt-2">
                <span className="text-xs uppercase text-[#AAAAAA] tracking-wider font-semibold block">
                  Panel de Control de Estado del Servicio (Sincronizado en tiempo real)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {(() => {
                    const stateOrder = ['pendiente', 'aceptada', 'en_camino', 'llegue', 'servicio_iniciado', 'servicio_finalizado'];
                    const currentIndex = stateOrder.indexOf(currentBooking.state);
                    
                    return [
                      { key: 'aceptada', label: '1. Aceptar Solicitud', icon: CheckCircle2 },
                      { key: 'en_camino', label: '2. En Camino (GPS)', icon: Navigation },
                      { key: 'llegue', label: '3. Llegué a Domicilio', icon: MapPin },
                      { key: 'servicio_iniciado', label: '4. Iniciar Masaje', icon: Play },
                      { key: 'servicio_finalizado', label: '5. Finalizar Masaje', icon: UserCheck }
                    ].map((st) => {
                      const stepIndex = stateOrder.indexOf(st.key);
                      const isCompleted = stepIndex <= currentIndex;
                      const isNext = stepIndex === currentIndex + 1;
                      
                      let btnClasses = '';
                      if (isCompleted) {
                        btnClasses = 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 border border-emerald-400';
                      } else if (isNext) {
                        btnClasses = 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30 ring-2 ring-yellow-400 transform scale-105 z-10';
                      } else {
                        btnClasses = 'bg-[#1A1A1A] text-[#666666] border border-[#333333] hover:bg-[#222222] hover:text-[#AAAAAA]';
                      }

                      return (
                        <motion.button
                          key={st.key}
                          whileTap={{ scale: 0.96 }}
                          whileHover={{ scale: isNext ? 1.04 : 1.01 }}
                          onClick={() => {
                            onUpdateBookingState(currentBooking.id, st.key as any);
                            if (st.key === 'servicio_finalizado') {
                              setCompletedCelebrationBooking(currentBooking);
                              showToast('¡Servicio Finalizado!', 'Has completado la sesión con éxito. Ganancia registrada en tu balance.', 'success');
                            }
                          }}
                          className={`p-3 rounded-xl text-[11px] lg:text-xs font-bold transition-all duration-300 flex items-center justify-center space-x-1.5 sm:space-x-2 cursor-pointer ${btnClasses}`}
                        >
                          <st.icon className={`w-4 h-4 shrink-0 ${isCompleted ? 'text-white' : isNext ? 'text-black' : 'text-[#666666]'}`} />
                          <span className="whitespace-nowrap">{st.label}</span>
                        </motion.button>
                      );
                    });
                  })()}
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
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span className="text-[9px] text-[#666666]">{m.sender} • {m.time}</span>
                      {m.sender === activeTherapist.name && (
                        <span className="flex items-center text-[9px] text-[#C9A55B]">
                          {m.read ? (
                            <span className="flex items-center space-x-0.5 font-semibold text-[#C9A55B]">
                              <CheckCheck className="w-3 h-3 text-[#C9A55B] inline" />
                              <span className="text-[8px]">Visto</span>
                            </span>
                          ) : (
                            <Check className="w-3 h-3 text-[#666666] inline" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {isClientTyping && (
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#222222] rounded-xl w-fit text-[10px] text-[#C9A55B] italic border border-[#C9A55B]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A55B] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A55B] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A55B] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    <span>Don Alejandro está escribiendo...</span>
                  </div>
                )}
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
            ) : (
              <div className="bg-[#141414] p-10 rounded-2xl border border-[#C9A55B]/20 text-center space-y-4">
                <Navigation className="w-10 h-10 text-[#C9A55B]/40 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-white font-serif">No Hay Servicio en Curso</h4>
                  <p className="text-xs text-[#888888] max-w-md mx-auto">
                    No tienes una sesión activa en este momento. Consulta tu agenda para ver las próximas citas asignadas o confirmar solicitudes.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="px-5 py-2.5 rounded-xl bg-[#C9A55B] text-black font-bold text-xs hover:bg-[#E6CA65] transition-colors cursor-pointer"
                >
                  Ver Mi Agenda Hoy
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB: SCHEDULE */}
        {activeTab === 'schedule' && (
          <motion.div
            key="tab-schedule-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6 max-w-4xl mx-auto"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-serif font-bold text-white">Agenda y Citas Programadas</h3>
              <span className="text-xs text-[#C9A55B] bg-[#C9A55B]/15 px-3 py-1 rounded-full border border-[#C9A55B]/30 font-semibold">
                {bookings.length} Citas Registradas
              </span>
            </div>

            <motion.div layout className="space-y-4">
              <AnimatePresence mode="popLayout">
                {bookings.map((bk) => (
                  <motion.div
                    key={bk.id}
                    layout
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{
                      layout: { type: "spring", stiffness: 350, damping: 30 },
                      opacity: { duration: 0.25 },
                      scale: { duration: 0.2 }
                    }}
                    className="bg-[#141414] p-5 rounded-2xl border border-[#C9A55B]/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-[#C9A55B]/40 transition-colors shadow-lg"
                  >
                    <motion.div layout="position" className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-[#C9A55B] font-mono font-bold">{bk.time} hrs</span>
                        <span className="text-xs text-[#888888]">• {bk.date}</span>
                        <span className="font-mono text-[10px] text-[#C9A55B]/80">#{bk.code || bk.id}</span>
                      </div>
                      <h4 className="text-base font-bold text-white">{bk.serviceName} ({bk.durationMinutes} min)</h4>
                      <p className="text-xs text-[#AAAAAA]">{bk.clientName} • {bk.clientAddress} ({bk.cityZone})</p>
                      <p className="text-xs text-[#C9A55B] font-semibold">${(bk.total ?? bk.price ?? 0).toLocaleString()} MXN</p>
                    </motion.div>

                    <motion.div layout="position" className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <AnimatePresence mode="wait">
                        {bk.state === 'pendiente' ? (
                          <motion.div
                            key={`actions-${bk.id}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-2"
                          >
                            <button
                              onClick={() => handleAccept(bk)}
                              className="bg-[#C9A55B] text-black font-extrabold text-xs px-3.5 py-1.5 rounded-lg hover:bg-[#E6CA65] transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Aceptar</span>
                            </button>
                            <button
                              onClick={() => handleDecline(bk)}
                              className="bg-[#222222] text-[#AAAAAA] hover:text-red-400 text-xs px-2.5 py-1.5 rounded-lg border border-[#333333] transition-all cursor-pointer hover:border-red-500/30 active:scale-95"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        ) : (
                          <motion.span
                            key={`badge-${bk.id}-${bk.state}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className={`text-xs font-bold px-3 py-1 rounded-full border uppercase ${
                              bk.state === 'servicio_finalizado'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : bk.state === 'servicio_iniciado'
                                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                : bk.state === 'en_camino' || bk.state === 'llegue'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-[#C9A55B]/15 text-[#C9A55B] border-[#C9A55B]/30'
                            }`}
                          >
                            {bk.state.replace('_', ' ')}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {bookings.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#141414] p-8 rounded-2xl border border-[#333333] text-center space-y-2 text-[#888888]"
                >
                  <Calendar className="w-8 h-8 text-[#C9A55B]/40 mx-auto" />
                  <p className="text-sm font-medium">No tienes citas programadas en este momento.</p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* TAB: EARNINGS */}
        {activeTab === 'earnings' && (
          <motion.div
            key="tab-earnings-content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="space-y-6 max-w-4xl mx-auto"
          >
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
          </motion.div>
        )}

        {/* TAB: HISTORY */}
        {activeTab === 'history' && (
          <motion.div
            key="tab-history-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6 max-w-4xl mx-auto"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white">Historial de Servicios Completados</h3>
                <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] mt-1">
                  Consulta el registro de tus sesiones finalizadas, ingresos y la retroalimentación de los socios VIP.
                </p>
              </div>
              <span className="text-xs text-[#806020] dark:text-[#C9A55B] bg-[#C9A55B]/15 px-3.5 py-1.5 rounded-full border border-[#C9A55B]/30 font-bold shrink-0">
                {mergedCompletedBookings.length} Servicios en Historial
              </span>
            </div>

            {/* Scrollable List Container */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
              {mergedCompletedBookings.map((bk) => (
                <div
                  key={bk.id}
                  className="bg-white dark:bg-[#141414] p-5 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-[#C9A55B]/40 dark:hover:border-[#C9A55B]/40 transition-all duration-300 shadow-md"
                >
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[#806020] dark:text-[#C9A55B] font-mono font-bold">{bk.time} hrs</span>
                      <span className="text-xs text-[#6B655F] dark:text-[#888888] font-medium">• {bk.date}</span>
                      <span className="font-mono text-[10px] text-[#6B655F] dark:text-[#C9A55B]/70 bg-[#F5F1EA] dark:bg-[#1C1C1C] px-2 py-0.5 rounded border border-[#E5DFD3] dark:border-transparent">
                        #{bk.code}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-[#1C1917] dark:text-white flex items-center gap-1.5">
                        {bk.serviceName}
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
                          Completado
                        </span>
                      </h4>
                      <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] mt-0.5">
                        Socio VIP: <span className="text-[#1C1917] dark:text-white font-semibold">{bk.clientName}</span>
                        {bk.clientPhone && <span className="ml-1.5 text-[#888888]">({bk.clientPhone})</span>}
                      </p>
                    </div>

                    {/* Feedback summary */}
                    <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-3 rounded-xl border border-[#E5DFD3] dark:border-[#333333] space-y-1.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-[#1C1917] dark:text-white">Calificación del Cliente:</span>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < Math.floor(bk.rating || 5)
                                  ? 'text-[#C9A55B] fill-[#C9A55B]'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-[#806020] dark:text-[#C9A55B] ml-1">
                          {bk.rating || 5} / 5
                        </span>
                      </div>
                      
                      {bk.reviewComment ? (
                        <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] italic pl-2 border-l-2 border-[#C9A55B]/40">
                          "{bk.reviewComment}"
                        </p>
                      ) : (
                        <p className="text-xs text-[#888888] dark:text-[#666666] italic">
                          El cliente no dejó comentarios, pero calificó la experiencia con excelente puntuación.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="w-full md:w-56 shrink-0 border-t md:border-t-0 border-[#E5DFD3] dark:border-[#333333] pt-4 md:pt-0">
                    <div className="bg-[#FAF8F5] dark:bg-[#0D0D0D] rounded-2xl border border-[#E5DFD3] dark:border-[#333333] overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <tbody className="divide-y divide-[#E5DFD3] dark:divide-[#333333]">
                          <tr>
                            <td className="px-4 py-2 text-[10px] text-[#6B655F] dark:text-[#888888] uppercase tracking-wider font-bold">Servicio</td>
                            <td className="px-4 py-2 text-xs font-bold text-[#1C1917] dark:text-white text-right font-mono">${bk.price.toLocaleString()}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-[10px] text-[#6B655F] dark:text-[#888888] uppercase tracking-wider font-bold">Propina</td>
                            <td className="px-4 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right font-mono">+${(bk.tip || 0).toLocaleString()}</td>
                          </tr>
                          <tr className="bg-[#C9A55B]/10 dark:bg-[#C9A55B]/5">
                            <td className="px-4 py-2 text-[10px] text-[#806020] dark:text-[#C9A55B] uppercase tracking-wider font-black">Total</td>
                            <td className="px-4 py-2 text-sm font-black text-[#806020] dark:text-[#C9A55B] text-right font-mono">${bk.total.toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}

              {mergedCompletedBookings.length === 0 && (
                <div className="bg-white dark:bg-[#141414] p-8 rounded-2xl border border-[#E5DFD3] dark:border-[#333333] text-center space-y-2 text-[#6B655F] dark:text-[#888888]">
                  <Clock className="w-8 h-8 text-[#C9A55B]/40 mx-auto animate-pulse" />
                  <p className="text-sm font-semibold">No se encontraron servicios completados en tu historial.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB: POST CARE GENERATOR */}
        {activeTab === 'postcare' && (
          <motion.div
            key="tab-postcare-content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="max-w-2xl mx-auto bg-[#141414] p-6 sm:p-8 rounded-2xl border border-[#C9A55B]/30 space-y-6"
          >
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

              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] text-[#888888]">
                  Mínimo 20 caracteres para activar IA
                </span>
                <span className={`text-[10px] font-semibold transition-colors ${therapistNotes.trim().length >= 20 ? 'text-[#C9A55B]' : 'text-red-400'}`}>
                  {therapistNotes.trim().length} / 20
                </span>
              </div>

              <button
                onClick={handleGeneratePostCare}
                disabled={postCareLoading || therapistNotes.trim().length < 20}
                className={`w-full py-3 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  therapistNotes.trim().length >= 20 && !postCareLoading
                    ? 'bg-gradient-to-r from-[#C9A55B] via-[#E6CA65] to-[#C9A55B] text-black gold-button-hover'
                    : 'bg-[#222222] text-[#666666] border border-[#333333] cursor-not-allowed opacity-60'
                }`}
              >
                {postCareLoading ? (
                  <span>Generando Recomendación con Gemini...</span>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
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
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Celebration Modal when service is marked completed */}
      <ServiceCompletionModal
        isOpen={!!completedCelebrationBooking}
        onClose={() => setCompletedCelebrationBooking(null)}
        booking={completedCelebrationBooking}
        onViewHistory={() => setActiveTab('history')}
        onSendPostCare={() => setActiveTab('postcare')}
      />

      {/* Global Safety Emergency Panic Modal */}
      <PanicModal 
        isOpen={showPanicModal}
        onClose={() => setShowPanicModal(false)}
        userType="therapist"
      />
    </div>
  );
};
