import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import { LuxuryButton } from './ui/LuxuryButton';
import { Therapist, Booking, BookingState } from '../types';
import { 
  Calendar, Clock, MapPin, Navigation, MessageSquare, DollarSign, 
  CheckCircle2, XCircle, Play, Shield, Award, Star, Bot, Send, UserCheck, Check, CheckCheck,
  AlertTriangle, X, Volume2, VolumeX, Vibrate, BellRing, Sparkles, Smartphone, Mic, Square, Bell,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { PanicModal } from './PanicModal';
import { BookingChatDrawer } from '../shared/components/BookingChatDrawer';
import { WhatsAppButton } from './WhatsAppButton';
import { fetchPostCareProtocol } from '../shared/services/api';
import { LiveTrackingMap } from '../shared/components/LiveTrackingMap';
import { ServiceCompletionModal } from '../aplicaciones/terapeuta/components/ServiceCompletionModal';
import { VoiceNotificationService } from '../shared/services/VoiceNotificationService';
import { VoiceRecorderService, ServiceRecording } from '../shared/services/VoiceRecorderService';
import { TherapistNotificationsPanel } from '../aplicaciones/terapeuta/components/TherapistNotificationsPanel';
import { NotificationHistoryService } from '../shared/services/NotificationHistoryService';
import { 
  notifyTherapistNewMessage, 
  isUrgentChatMessage 
} from '../shared/utils/notificationAudio';
import { sendChatMessage, subscribeToChatMessages } from '../shared/services/chatService';
import { TherapistNotificationPermissionPrompt } from '../aplicaciones/terapeuta/components/TherapistNotificationPermissionPrompt';


interface TherapistAppProps {
  therapist: Therapist;
  bookings: Booking[];
  onUpdateBookingState: (bookingId: string, newState: BookingState) => void;
  onAcceptBooking?: (bookingId: string, therapist: Therapist) => void;
  onRejectBooking?: (bookingId: string, reason?: string) => void;
  onUpdateLiveLocation?: (bookingId: string, lat: number, lng: number) => Promise<void>;
}

function DispatchCountdownTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire?: () => void }) {
  const [timeLeftSec, setTimeLeftSec] = useState<number>(() => {
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setTimeLeftSec(0);
        clearInterval(timer);
        if (onExpire) onExpire();
      } else {
        setTimeLeftSec(diff);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  const mins = Math.floor(timeLeftSec / 60);
  const secs = timeLeftSec % 60;
  const isUrgent = timeLeftSec <= 30;

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-mono font-bold text-xs ${
      isUrgent
        ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    }`}>
      <Clock className="w-3.5 h-3.5" />
      <span>Ventana para aceptar: {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
    </div>
  );
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
    currentZone: therapist?.currentZone || therapist?.coverageZones?.[0] || 'Zona no configurada',
    coverageZones: Array.isArray(therapist?.coverageZones) && therapist.coverageZones.length > 0
      ? therapist.coverageZones
      : (Array.isArray((therapist as any)?.zonasCobertura) && (therapist as any).zonasCobertura.length > 0
          ? (therapist as any).zonasCobertura
          : []),
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
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [activeMediaRecorder, setActiveMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState<boolean>(false);

  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    const handleOnlineEvent = () => {
      setIsOnline(true);
      VoiceRecorderService.processPendingSyncQueue();
    };
    const handleOfflineEvent = () => setIsOnline(false);
    window.addEventListener('online', handleOnlineEvent);
    window.addEventListener('offline', handleOfflineEvent);
    return () => {
      window.removeEventListener('online', handleOnlineEvent);
      window.removeEventListener('offline', handleOfflineEvent);
    };
  }, []);

  const startLiveRecording = async () => {
    if (!currentBooking) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = VoiceRecorderService.getBestMimeType() || 'audio/webm';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      const recId = `rec-${Date.now()}`;
      const now = new Date();
      const startTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const durationSecs = recordingSeconds;
          const newRec: ServiceRecording = {
            id: recId,
            serviceId: currentBooking.id,
            therapistId: activeTherapist.id,
            date: now.toLocaleDateString(),
            startTime: startTimeStr,
            endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            durationSeconds: durationSecs,
            durationFormatted: VoiceRecorderService.formatDuration(durationSecs),
            mimeType: mimeType,
            audioDataUrl: base64data,
            syncStatus: navigator.onLine ? 'sincronizada' : 'pendiente_sincronizacion',
            createdAt: now.toISOString()
          };

          await VoiceRecorderService.saveRecordingLocal(newRec);
          if (navigator.onLine) {
            await VoiceRecorderService.syncRecordingToFirestore(newRec);
            showToast('Grabación Guardada', 'Audio grabado y sincronizado correctamente.', 'success');
          } else {
            showToast('Sin Conexión', 'Grabación guardada localmente. Se sincronizará cuando vuelva la conexión.', 'info');
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(1000);
      setActiveMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingSeconds(0);
      showToast('Grabación Iniciada', '🎙️ El micrófono se encuentra activo.', 'success');
    } catch (err: any) {
      showToast('Error de Micrófono', err?.message || 'No fue posible acceder al micrófono.', 'error');
    }
  };

  const stopLiveRecording = () => {
    if (activeMediaRecorder && activeMediaRecorder.state !== 'inactive') {
      activeMediaRecorder.stop();
    }
    setIsRecording(false);
    setActiveMediaRecorder(null);
  };

  const defaultCompletedServices: any[] = [];

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

  const [historyDateFilter, setHistoryDateFilter] = useState<'all' | 'week' | 'month'>('all');
  const [historyServiceFilter, setHistoryServiceFilter] = useState<string>('all');

  const availableServiceNames = React.useMemo(() => {
    const setNames = new Set<string>();
    mergedCompletedBookings.forEach(b => {
      if (b.serviceName) setNames.add(b.serviceName);
    });
    return Array.from(setNames);
  }, [mergedCompletedBookings]);

  const filteredCompletedBookings = React.useMemo(() => {
    return mergedCompletedBookings.filter(bk => {
      if (historyServiceFilter !== 'all' && bk.serviceName !== historyServiceFilter) {
        return false;
      }
      if (historyDateFilter !== 'all') {
        const bkDate = new Date(bk.date);
        const now = new Date();
        const diffTime = now.getTime() - bkDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        if (historyDateFilter === 'week' && diffDays > 7) {
          return false;
        }
        if (historyDateFilter === 'month' && diffDays > 30) {
          return false;
        }
      }
      return true;
    });
  }, [mergedCompletedBookings, historyDateFilter, historyServiceFilter]);

  const [showPanicModal, setShowPanicModal] = useState<boolean>(false);
  const [declinedBookingIds, setDeclinedBookingIds] = useState<string[]>([]);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Pending bookings that need therapist acceptance according to dispatch levels and coverage zones
  const pendingBookings = bookings.filter(b => {
    if (b.state !== 'pendiente') return false;
    if (declinedBookingIds.includes(b.id)) return false;
    if (Array.isArray(b.rejectedBy) && b.rejectedBy.includes(activeTherapist.id)) return false;

    // Direct targeted dispatch offer override: if dispatch engine specifically targeted this therapist, always allow!
    if (Array.isArray(b.activeOfferTherapistIds) && b.activeOfferTherapistIds.includes(activeTherapist.id)) {
      return true;
    }

    // Direct assignment check: if specifically assigned to another therapist, exclude
    if (b.therapistId && b.therapistId !== activeTherapist.id) {
      const isDualSlot = b.requiresDualTherapist || b.serviceId === 'srv-pareja';
      if (!isDualSlot) return false;
      // In dual slot, if therapist 1 is someone else, therapist 2 can accept
      if (b.therapistId2 && b.therapistId2 !== activeTherapist.id) return false;
    }

    // EXCLUSION: If the therapist is already assigned to this booking, it is no longer "pending" for them.
    // It should transition to the "currentBooking" (active) selection.
    if (b.therapistId === activeTherapist.id || b.therapistId2 === activeTherapist.id || (Array.isArray(b.therapistIds) && b.therapistIds.includes(activeTherapist.id))) {
      return false;
    }

    // Normalize therapist coverage zones across all possible property names in Firestore profile
    const zones: string[] = Array.isArray(activeTherapist.coverageZones) && activeTherapist.coverageZones.length > 0
      ? activeTherapist.coverageZones
      : (Array.isArray((activeTherapist as any).zonasCobertura) && (activeTherapist as any).zonasCobertura.length > 0
          ? (activeTherapist as any).zonasCobertura
          : (activeTherapist.currentZone ? [activeTherapist.currentZone] : ((activeTherapist as any).zonaActual ? [(activeTherapist as any).zonaActual] : [])));

    if (zones.length > 0) {
      const bZone = (b.cityZone || '').toLowerCase().trim();
      const inZone = zones.some(z => {
        const normZ = String(z).toLowerCase().trim();
        return normZ === bZone || bZone.includes(normZ) || normZ.includes(bZone) ||
          normZ.includes('cdmx') || bZone.includes('cdmx') || normZ.includes('ciudad de méxico') || bZone.includes('ciudad de méxico') ||
          bZone.includes('metropolitana');
      });
      if (!inZone) return false;
    }

    return true;
  });
  const [expandedPendingId, setExpandedPendingId] = useState<string | null>(null);
  const activePending = pendingBookings[0] || null;

  // Periodically report live GPS to server so dispatch engine recognizes location as fresh
  useEffect(() => {
    if (!navigator.geolocation) return;
    const reportLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetch('/api/therapist/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              status: activeTherapist.status || 'disponible'
            })
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    };
    reportLocation();
    const interval = setInterval(reportLocation, 60000);
    return () => clearInterval(interval);
  }, [activeTherapist.id, activeTherapist.status]);

  // Find active booking assigned to therapist.
  // We only pick bookings where the therapist is explicitly assigned and is not in a final state.
  const currentBooking = bookings.find(b => {
    const isAssignedToMe = b.therapistId === activeTherapist.id || 
                           b.therapistId2 === activeTherapist.id || 
                           (Array.isArray(b.therapistIds) && b.therapistIds.includes(activeTherapist.id));
    
    // We prioritize bookings that are in an active flow (accepted, on the way, arrived, or started)
    // but we also include 'pendiente' if the therapist has already accepted a slot (e.g. dual booking slot 1).
    return isAssignedToMe && b.state !== 'servicio_finalizado' && b.state !== 'cancelado';
  }) || null;

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
  const [messages, setMessages] = useState<Array<{ sender: string, text: string, time: string, read?: boolean }>>([]);

  // Subtle Audio & Tactile Vibration Notification States
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('essenya_therapist_sound_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('essenya_therapist_vibration_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [recentMessageAlert, setRecentMessageAlert] = useState<{
    sender: string;
    text: string;
    time: string;
    isUrgent: boolean;
  } | null>(null);
  const [isNotifyingPulse, setIsNotifyingPulse] = useState<boolean>(false);

  // Auto-dismiss floating notification banner after 6 seconds
  useEffect(() => {
    if (!recentMessageAlert) return;
    const timer = setTimeout(() => {
      setRecentMessageAlert(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [recentMessageAlert]);

  // Real-time listener for incoming messages from active booking client
  useEffect(() => {
    const handleRemoteMessage = (event: any) => {
      const { bookingId, text, sender } = event?.detail || {};
      if (text) {
        // If it belongs to current active booking or any active booking
        if (!bookingId || !currentBooking?.id || bookingId === currentBooking.id) {
          handleIncomingMessage(text, sender || currentBooking?.clientName || 'Cliente');
        }
      }
    };

    window.addEventListener('essenya_chat_message', handleRemoteMessage);
    return () => {
      window.removeEventListener('essenya_chat_message', handleRemoteMessage);
    };
  }, [currentBooking?.id, currentBooking?.clientName, activeTab, soundEnabled, vibrationEnabled]);

  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    try {
      localStorage.setItem('essenya_therapist_sound_enabled', String(nextState));
    } catch {}

    if (nextState) {
      notifyTherapistNewMessage({ soundEnabled: true, vibrationEnabled: false, isUrgent: false });
      showToast('Notificación Sonora Activada', 'Campanilla sutil activada para nuevos mensajes.', 'gold');
    } else {
      showToast('Sonido Silenciado', 'Los mensajes se recibirán en modo silencioso.', 'info');
    }
  };

  const handleToggleVibration = () => {
    const nextState = !vibrationEnabled;
    setVibrationEnabled(nextState);
    try {
      localStorage.setItem('essenya_therapist_vibration_enabled', String(nextState));
    } catch {}

    if (nextState) {
      notifyTherapistNewMessage({ soundEnabled: false, vibrationEnabled: true, isUrgent: false });
      showToast('Vibración Táctil Activada', 'Respuesta háptica habilitada para el terapeuta.', 'gold');
    } else {
      showToast('Vibración Desactivada', 'Vibración táctil deshabilitada.', 'info');
    }
  };

  const handleTestAlert = (urgent: boolean = false) => {
    setIsNotifyingPulse(true);
    setTimeout(() => setIsNotifyingPulse(false), 1200);

    notifyTherapistNewMessage({
      soundEnabled: true,
      vibrationEnabled: true,
      isUrgent: urgent
    });

    showToast(
      urgent ? '⚠️ Petición Urgente (Prueba)' : '🔔 Notificación Spa (Prueba)',
      urgent 
        ? 'Campanilla distintiva de 3 armónicos y vibración háptica triple ejecutadas.'
        : 'Campanilla armónica sutil de 2 tonos y vibración táctil suave ejecutadas.',
      urgent ? 'error' : 'gold'
    );
  };

  const handleIncomingMessage = (text: string, senderName?: string) => {
    setIsClientTyping(false);
    const resolvedSender = senderName || currentBooking?.clientName || 'Don Alejandro';
    const isUrgent = isUrgentChatMessage(text);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg = {
      sender: resolvedSender,
      text,
      time: timeStr,
      read: activeTab === 'active'
    };

    setMessages(prev => [...prev, newMsg]);

    // Trigger subtle audio chime & tactile vibration
    setIsNotifyingPulse(true);
    setTimeout(() => setIsNotifyingPulse(false), 1500);

    notifyTherapistNewMessage({
      soundEnabled,
      vibrationEnabled,
      isUrgent
    });

    // Provide immediate visual notification
    setRecentMessageAlert({
      sender: resolvedSender,
      text,
      time: timeStr,
      isUrgent
    });

    if (activeTab !== 'active') {
      setUnreadChatCount(prev => prev + 1);
    }

    showToast(
      isUrgent ? '⚠️ Petición Urgente del Cliente' : '💬 Mensaje de la Cita Activa',
      `${resolvedSender}: "${text.length > 55 ? text.substring(0, 52) + '...' : text}"`,
      isUrgent ? 'error' : 'gold'
    );
  };

  const handleSimulateClientMessage = (type: 'urgent' | 'access' | 'routine') => {
    setIsClientTyping(true);
    setTimeout(() => {
      let msg = '';
      if (type === 'urgent') {
        msg = 'Por favor tomen nota: tengo alergia al aceite de almendras y ligera molestia en cervicales, requiero toallas adicionales tibias.';
      } else if (type === 'access') {
        msg = 'El timbre principal no funciona, por favor toca el interfón 4B o avísame al llegar para abrir el portón.';
      } else {
        msg = 'Hola Elena, ¿podrías confirmarme si traen el difusor aromático de lavanda? Muchas gracias.';
      }
      handleIncomingMessage(msg);
    }, 1000);
  };

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


  // Real-time chat listener for active reservation
  useEffect(() => {
    if (!currentBooking?.id) return;

    const unsubscribe = subscribeToChatMessages(currentBooking.id, (realMsgs) => {
      if (realMsgs.length > 0) {
        setMessages(realMsgs.map(m => ({
          sender: m.senderName,
          text: m.text,
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: m.read
        })));
      }
    });

    return () => unsubscribe();
  }, [currentBooking?.id]);

  const handleSendChat = async () => {
    const textToSend = chatInput.trim();
    if (!textToSend || !currentBooking) return;

    setChatInput('');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages(prev => [...prev, { 
      sender: activeTherapist.name || 'Terapeuta', 
      text: textToSend, 
      time: timeStr,
      read: false
    }]);

    try {
      await sendChatMessage({
        bookingId: currentBooking.id,
        bookingCode: currentBooking.code,
        senderId: activeTherapist.id,
        senderName: activeTherapist.name || 'Terapeuta',
        senderRole: 'terapeuta',
        text: textToSend,
        clientId: currentBooking.clientId,
        clientName: currentBooking.clientName,
        therapistId: activeTherapist.id,
        therapistName: activeTherapist.name
      });
    } catch (err: any) {
      console.error('[TherapistApp] Error sending chat message:', err);
      showToast('Error de Mensajería', 'No se pudo enviar el mensaje al cliente.', 'error');
    }
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

      {/* Floating Immediate Alert Banner for Incoming Client Messages */}
      <AnimatePresence>
        {recentMessageAlert && (
          <motion.aside
            aria-label="Alerta de mensaje del cliente"
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`fixed top-5 right-5 z-50 max-w-md w-[calc(100%-2.5rem)] sm:w-auto p-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-start space-x-3.5 ${
              recentMessageAlert.isUrgent
                ? 'bg-[#1F1206]/95 border-amber-500/60 text-amber-100 shadow-amber-950/40'
                : 'bg-[#141414]/95 border-[#C9A55B]/40 text-white shadow-black/60'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${
              recentMessageAlert.isUrgent
                ? 'bg-amber-500/25 text-amber-300 ring-2 ring-amber-500/40 animate-pulse'
                : 'bg-[#C9A55B]/20 text-[#C9A55B]'
            }`}>
              {recentMessageAlert.isUrgent ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : (
                <MessageSquare className="w-5 h-5 text-[#C9A55B]" />
              )}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <span className="text-xs font-bold text-[#C9A55B] truncate">
                    {recentMessageAlert.sender}
                  </span>
                  {recentMessageAlert.isUrgent && (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/30 text-amber-300 border border-amber-500/50">
                      Urgente
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-stone-400 shrink-0">{recentMessageAlert.time}</span>
              </div>

              <p className="text-xs text-stone-200 mt-1 line-clamp-2 leading-relaxed">
                {recentMessageAlert.text}
              </p>

              <div className="flex items-center space-x-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('active');
                    setUnreadChatCount(0);
                    setRecentMessageAlert(null);
                  }}
                  className="text-[11px] font-bold px-3 py-1 bg-[#C9A55B] text-black rounded-lg hover:bg-[#E6CA65] transition-colors flex items-center space-x-1 shadow-xs"
                >
                  <MessageSquare className="w-3 h-3 text-black" />
                  <span>Responder en Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecentMessageAlert(null)}
                  className="text-[11px] text-stone-400 hover:text-white px-2 py-1 transition-colors"
                >
                  Descartar
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRecentMessageAlert(null)}
              className="text-stone-400 hover:text-white p-1 -mr-1 -mt-1 rounded-lg"
              title="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.aside>
        )}
      </AnimatePresence>

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
                <span>{activeTherapist.coverageZones?.length ? activeTherapist.coverageZones.join(', ') : 'Sin zonas configuradas'}</span>
              </p>
            </div>
          </div>

          {/* Availability Toggle */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto">

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

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setIsNotificationsModalOpen(true)}
                className="relative p-2.5 bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#C9A55B]/30 rounded-xl text-[#806020] dark:text-[#C9A55B] hover:bg-[#FAF8F5] dark:hover:bg-[#1E1E1E] transition-all cursor-pointer flex items-center justify-center shadow-xs"
                title="Historial de Notificaciones"
              >
                <Bell className="w-4 h-4" />
                {NotificationHistoryService.getNotifications(activeTherapist.id).filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                    {NotificationHistoryService.getNotifications(activeTherapist.id).filter(n => !n.read).length}
                  </span>
                )}
              </button>

              <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#C9A55B]/30 px-3.5 py-1.5 rounded-xl text-center shadow-xs shrink-0">
                <span className="text-[10px] text-[#6B655F] dark:text-[#888888] uppercase tracking-wider block font-semibold">Ganancia Semanal</span>
                <span className="text-sm font-bold text-[#806020] dark:text-gold-gradient">$18,450 MXN</span>
              </div>
            </div>
          </div>
        </div>

        {/* Therapist Navigation Tabs */}
        <div className="max-w-7xl mx-auto flex items-center space-x-2 mt-6 border-t border-[#E5DFD3] dark:border-[#C9A55B]/10 pt-4 overflow-x-auto no-scrollbar">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setActiveTab('active');
              setUnreadChatCount(0);
              setRecentMessageAlert(null);
            }}
            id="therapist-tab-active"
            className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all duration-300 ease-in-out shrink-0 whitespace-nowrap cursor-pointer ${
              unreadChatCount > 0 
                ? 'animate-pulse scale-105 sm:scale-110 ring-2 ring-[#C9A55B] shadow-[0_0_20px_rgba(201,165,91,0.7)] text-[#1C1917] dark:text-white bg-gradient-to-r from-[#E6CA65]/30 via-[#C9A55B]/40 to-[#9A7B38]/30 border-2 border-[#E6CA65]' 
                : activeTab === 'active'
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
            {unreadChatCount > 0 ? (
              <span className="relative z-10 px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-extrabold shadow-xs animate-pulse">
                {unreadChatCount}
              </span>
            ) : (
              currentBooking && currentBooking.state !== 'servicio_finalizado' && (
                <span className="relative z-10 w-2 h-2 rounded-full bg-[#C9A55B] animate-ping"></span>
              )
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
        
        {/* Prominent, descriptive push permission request specifically for therapists */}
        <TherapistNotificationPermissionPrompt therapistId={activeTherapist.id} />

        {/* INCOMING BOOKING NOTIFICATIONS (FOR PENDING BOOKINGS) */}
        {pendingBookings.length > 0 && (
          <div className="space-y-3">
            {pendingBookings.map((pendingBk) => {
              const isExpanded = expandedPendingId === pendingBk.id;
              const activeOffer = pendingBk.activeOffers?.find(o => o.therapistId === activeTherapist.id);
              const displayedEta = activeOffer?.etaMinutes ?? pendingBk.etaMinutes ?? 15;
              const currentLevel = pendingBk.currentDispatchLevel ?? 10;
              const isDual = pendingBk.requiresDualTherapist || pendingBk.serviceId === 'srv-pareja';
              const existingTherapistIds = Array.isArray(pendingBk.therapistIds)
                ? pendingBk.therapistIds
                : (pendingBk.therapistId ? [pendingBk.therapistId] : []);
              const assignedCount = typeof pendingBk.assignedTherapistsCount === 'number'
                ? pendingBk.assignedTherapistsCount
                : existingTherapistIds.length;

              if (!isExpanded) {
                return (
                  <motion.div
                    key={pendingBk.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setExpandedPendingId(pendingBk.id)}
                    className="bg-gradient-to-r from-[#1C1A17] via-[#2A2418] to-[#1C1A17] border-2 border-[#C9A55B] p-4.5 rounded-2xl shadow-xl hover:border-[#E6CA65] transition-all cursor-pointer flex items-center justify-between gap-4 ring-2 ring-[#C9A55B]/30 group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#C9A55B]/20 border border-[#C9A55B]/40 flex items-center justify-center text-[#C9A55B] shrink-0 group-hover:scale-105 transition-transform">
                        <Bell className="w-5 h-5 text-[#C9A55B] animate-bounce" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-serif font-bold text-white flex items-center gap-2">
                            🔔 Masaje solicitado
                          </h4>
                          {isDual && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#C9A55B]/20 text-[#C9A55B] border border-[#C9A55B]/40 uppercase tracking-wider">
                              Pareja ({assignedCount}/2)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#AAAAAA] mt-0.5 font-medium">
                          Toca para ver los detalles
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-[#C9A55B]">
                      <span className="hidden sm:inline">Ver detalles</span>
                      <ChevronDown className="w-5 h-5 text-[#C9A55B]" />
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={pendingBk.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-[#1C1A17] via-[#2A2418] to-[#1C1A17] border-2 border-[#C9A55B] p-6 rounded-2xl shadow-2xl relative overflow-hidden text-white space-y-4 ring-2 ring-[#C9A55B]/40"
                >
                  {/* Header with collapse toggle */}
                  <div
                    onClick={() => setExpandedPendingId(null)}
                    className="flex items-center justify-between border-b border-[#C9A55B]/30 pb-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#C9A55B]/20 border border-[#C9A55B]/40 flex items-center justify-center text-[#C9A55B]">
                        <Bell className="w-4 h-4 text-[#C9A55B] animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                          🔔 Masaje solicitado
                        </h3>
                        <span className="text-[11px] text-[#C9A55B] font-mono">Cita #{pendingBk.code || pendingBk.id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#C9A55B] font-bold group-hover:text-white transition-colors">
                      <span>Contraer</span>
                      <ChevronUp className="w-5 h-5 text-[#C9A55B]" />
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#C9A55B]/30 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                          {pendingBk.paymentStatus === 'pagado' ? '✓ Pago Acreditado' : 'Pago al Recibir'}
                        </span>
                        {isDual && (
                          <span className="bg-[#C9A55B]/20 text-[#C9A55B] text-[10px] font-bold px-2 py-0.5 rounded border border-[#C9A55B]/30">
                            Masaje en Pareja ({assignedCount}/2)
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-serif font-bold text-white">{pendingBk.serviceName}</h3>
                      <p className="text-xs text-[#AAAAAA]">
                        Cliente VIP: <strong className="text-white font-semibold">{pendingBk.clientName}</strong> • Zona: {pendingBk.cityZone || 'CDMX'}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <span className="text-xs text-[#AAAAAA] block">Ganancia por Servicio</span>
                      <span className="text-2xl font-bold text-gold-gradient">${(pendingBk.total ?? pendingBk.price ?? 0).toLocaleString()} MXN</span>
                    </div>
                  </div>

                  {/* Real-time Route ETA & Response Window Banner */}
                  <div className="bg-gradient-to-r from-amber-500/20 via-amber-600/15 to-black/40 p-3.5 rounded-xl border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-[#C9A55B]/20 border border-[#C9A55B]/40 flex items-center justify-center text-amber-300">
                        <Navigation className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#AAAAAA] font-bold">Tiempo Estimado de Llegada (ETA por Ruta)</div>
                        <div className="text-xl font-bold text-white flex items-center gap-2">
                          <span>⏱️ {displayedEta} minutos</span>
                          <span className="text-[11px] font-normal text-amber-300/80 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                            Ruta calculada a tu ubicación
                          </span>
                        </div>
                      </div>
                    </div>

                    {pendingBk.dispatchExpiresAt && (
                      <DispatchCountdownTimer
                        expiresAt={pendingBk.dispatchExpiresAt}
                      />
                    )}
                  </div>

                  {/* Service & Location Specs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-black/40 p-4 rounded-xl border border-[#C9A55B]/20 text-xs">
                    <div className="space-y-1">
                      <span className="text-[#888888] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#C9A55B]" />
                        <span>📅 Fecha & Horario</span>
                      </span>
                      <p className="font-bold text-white">{pendingBk.date} a las {pendingBk.time} hrs</p>
                      <p className="text-[11px] text-[#AAAAAA]">{pendingBk.durationMinutes} min de sesión</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[#888888] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#C9A55B]" />
                        <span>📍 Dirección del Cliente</span>
                      </span>
                      <p className="font-bold text-white">{pendingBk.clientAddress}</p>
                      <p className="text-[11px] text-[#AAAAAA]">Zona: {pendingBk.cityZone}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[#888888] flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-[#C9A55B]" />
                        <span>💆 Preferencias & Molestias</span>
                      </span>
                      <p className="text-[#C9A55B] font-semibold">Presión: {pendingBk.preferences?.pressureLevel ?? 'Media'} • {pendingBk.preferences?.essentialOil ?? 'Lavanda Francesa'}</p>
                      {pendingBk.painPoints && (
                        <p className="text-[11px] text-amber-300 font-medium truncate">Puntos dolor: {pendingBk.painPoints}</p>
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
                        type="button"
                        onClick={() => handleDecline(pendingBk)}
                        className="flex-1 sm:flex-none px-5 py-3 rounded-xl border border-white/20 text-xs font-semibold text-[#AAAAAA] hover:text-red-400 hover:border-red-400/50 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Rechazar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAccept(pendingBk)}
                        className="flex-1 sm:flex-none px-8 py-3 rounded-xl bg-gradient-to-r from-[#E6CA65] via-[#C9A55B] to-[#9A7B38] text-black font-extrabold text-sm hover:opacity-95 shadow-lg shadow-[#C9A55B]/30 transition-all cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <CheckCircle2 className="w-5 h-5 text-black" />
                        <span>
                          {isDual 
                            ? (assignedCount === 1 ? 'Aceptar 2º Cupo (Pareja)' : 'Aceptar Cupo (1 de 2)')
                            : 'Aceptar Masaje Ahora'}
                        </span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
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
                    Presión: {currentBooking.preferences?.pressureLevel ?? 'Media'} • Aceite: {currentBooking.preferences?.essentialOil ?? 'Lavanda Francesa'}
                  </p>
                  <p className="text-[11px] text-[#AAAAAA] italic mt-1">"{currentBooking.preferences?.specialInstructions || 'Sin instrucciones adicionales'}"</p>
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

              {/* Live Voice Recorder Widget (Active only when servicio_iniciado) */}
              {currentBooking?.state === 'servicio_iniciado' && (
                <div className="bg-[#1C160C] dark:bg-[#1C1813] border-2 border-[#C9A55B] rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-3.5 h-3.5 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                      <div>
                        <span className="text-xs uppercase text-[#C9A55B] tracking-wider font-extrabold block">
                          {isRecording ? `🔴 GRABANDO ${VoiceRecorderService.formatDuration(recordingSeconds)}` : '🔊 Servicio en Curso — Sistema de Voz Activo'}
                        </span>
                        <span className="text-[11px] text-[#AAAAAA]">
                          {isRecording ? 'Micrófono activo y grabando audio en vivo' : 'Listo para iniciar grabaciones de voz en vivo'}
                        </span>
                      </div>
                    </div>

                    <div>
                      {!isRecording ? (
                        <button
                          onClick={startLiveRecording}
                          className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-xs rounded-xl shadow-md hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Mic className="w-4 h-4 animate-bounce" />
                          <span>🎙️ INICIAR GRABACIÓN</span>
                        </button>
                      ) : (
                        <button
                          onClick={stopLiveRecording}
                          className="px-4 py-2.5 bg-white text-black font-extrabold text-xs rounded-xl shadow-lg hover:bg-zinc-200 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Square className="w-4 h-4 fill-black" />
                          <span>DETENER GRABACIÓN</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {!isOnline && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Sin conexión. La grabación se sincronizará cuando vuelva la conexión. (Pendiente de sincronización)</span>
                    </div>
                  )}
                </div>
              )}

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
                            if (st.key === 'servicio_iniciado') {
                              onUpdateBookingState(currentBooking.id, 'servicio_iniciado');
                              VoiceNotificationService.playServiceStarted(currentBooking.id, currentBooking.clientName);
                              showToast('Servicio Iniciado', 'Voz del sistema reproducida y notificación enviada al cliente.', 'success');
                            } else if (st.key === 'servicio_finalizado') {
                              if (isRecording) {
                                setShowFinishConfirmModal(true);
                              } else {
                                onUpdateBookingState(currentBooking.id, 'servicio_finalizado');
                                VoiceNotificationService.playServiceFinished(currentBooking.id);
                                setCompletedCelebrationBooking(currentBooking);
                                showToast('¡Servicio Finalizado!', 'Has completado la sesión con éxito. Ganancia registrada en tu balance.', 'success');
                              }
                            } else {
                              onUpdateBookingState(currentBooking.id, st.key as any);
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

            {/* Finish Service Confirmation Modal if Active Recording */}
            {showFinishConfirmModal && (
              <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="bg-[#1A1A1A] border border-amber-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                  <h3 className="font-serif font-bold text-base text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span>Grabación Activa en Curso</span>
                  </h3>
                  <p className="text-xs text-[#CCCCCC]">
                    Tienes una grabación activa. ¿Quieres detenerla y finalizar el servicio?
                  </p>

                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      onClick={() => setShowFinishConfirmModal(false)}
                      className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#333333] text-[#CCCCCC] text-xs font-semibold rounded-xl transition-all cursor-pointer"
                    >
                      CANCELAR
                    </button>
                    <button
                      onClick={() => {
                        stopLiveRecording();
                        setShowFinishConfirmModal(false);
                        if (currentBooking) {
                          onUpdateBookingState(currentBooking.id, 'servicio_finalizado');
                          VoiceNotificationService.playServiceFinished(currentBooking.id);
                          setCompletedCelebrationBooking(currentBooking);
                          showToast('¡Servicio Finalizado!', 'Has completado la sesión con éxito.', 'success');
                        }
                      }}
                      className="px-4 py-2 bg-[#C9A55B] hover:opacity-95 text-black font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow"
                    >
                      DETENER Y FINALIZAR
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Chat with Client with Subtle Audio & Tactile Vibration Controls */}
            <div className={`bg-[#141414] p-5 sm:p-6 rounded-2xl border transition-all duration-500 space-y-4 shadow-xl ${
              isNotifyingPulse ? 'border-[#C9A55B] ring-2 ring-[#C9A55B]/40 shadow-[#C9A55B]/10' : 'border-[#C9A55B]/20'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A2A2A] pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="relative">
                    <div className={`p-2 rounded-xl transition-colors ${
                      isNotifyingPulse ? 'bg-[#C9A55B] text-black animate-bounce' : 'bg-[#1E1E1E] text-[#C9A55B]'
                    }`}>
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    {isNotifyingPulse && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#C9A55B] animate-ping" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs uppercase text-[#CCCCCC] tracking-wider font-semibold flex items-center gap-1.5">
                      <span>Chat Directo con {currentBooking?.clientName || 'Don Alejandro'}</span>
                    </h4>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Cita activa en curso
                      </span>
                      <span className="text-[10px] text-[#555555]">•</span>
                      <span className="text-[10px] text-[#888888] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#C9A55B]" />
                        Alertas auditivas y hápticas
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audio & Tactile Notification Controls & Chat Drawer Trigger */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#1A1A1A] p-1 rounded-xl border border-[#333333] shadow-inner">
                  <button
                    type="button"
                    onClick={() => setIsChatOpen(true)}
                    title="Abrir ventana de chat completa y segura"
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#C9A55B] text-black hover:bg-[#E6CA65] transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat en Vivo</span>
                  </button>

                  {/* Subtle Sound Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleSound}
                    title={soundEnabled ? "Notificación sonora activa (Campanilla spa sutil). Clic para silenciar." : "Sonido silenciado. Clic para activar campanilla spa."}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      soundEnabled 
                        ? 'bg-[#C9A55B]/20 text-[#C9A55B] border border-[#C9A55B]/40 shadow-xs' 
                        : 'text-[#666666] hover:text-[#AAAAAA]'
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span className="hidden xs:inline">{soundEnabled ? 'Sonido ON' : 'Mute'}</span>
                  </button>

                  {/* Tactile Vibration Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleVibration}
                    title={vibrationEnabled ? "Vibración táctil activa. Clic para desactivar." : "Vibración táctil desactivada. Clic para activar respuesta háptica."}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      vibrationEnabled 
                        ? 'bg-[#C9A55B]/20 text-[#C9A55B] border border-[#C9A55B]/40 shadow-xs' 
                        : 'text-[#666666] hover:text-[#AAAAAA]'
                    }`}
                  >
                    <Vibrate className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">{vibrationEnabled ? 'Vibración ON' : 'Sin vibrar'}</span>
                  </button>

                  {/* Test Chime & Vibration */}
                  <button
                    type="button"
                    onClick={() => handleTestAlert(false)}
                    title="Probar sonido de campanilla spa y vibración táctil"
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#AAAAAA] hover:text-white hover:bg-[#252525] transition-all flex items-center space-x-1 cursor-pointer border border-transparent hover:border-[#444444]"
                  >
                    <BellRing className="w-3.5 h-3.5 text-[#C9A55B]" />
                    <span>Probar</span>
                  </button>
                </div>
              </div>

              {/* Message List */}
              <div className="bg-[#181818] p-4 rounded-xl border border-[#2A2A2A] h-52 overflow-y-auto space-y-3.5 text-xs scroll-smooth">
                {messages.map((m, idx) => {
                  const isFromTherapist = m.sender === activeTherapist.name;
                  const isUrgent = !isFromTherapist && isUrgentChatMessage(m.text);

                  return (
                    <div key={idx} className={`flex flex-col ${isFromTherapist ? 'items-end' : 'items-start'}`}>
                      {isUrgent && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/40 mb-1 shadow-xs animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          Petición Prioritaria del Cliente
                        </span>
                      )}
                      <div className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                        isFromTherapist 
                          ? 'bg-[#C9A55B] text-black font-semibold shadow-xs' 
                          : isUrgent
                            ? 'bg-[#261506] border border-amber-500/60 text-amber-100 shadow-md shadow-amber-950/30'
                            : 'bg-[#242424] text-stone-100 border border-[#333333]'
                      }`}>
                        <p>{m.text}</p>
                      </div>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <span className="text-[9px] text-[#666666]">{m.sender} • {m.time}</span>
                        {isFromTherapist && (
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
                  );
                })}

                {isClientTyping && (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-[#222222] rounded-xl w-fit text-[11px] text-[#C9A55B] border border-[#C9A55B]/30 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A55B] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A55B] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A55B] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    <span className="font-medium">{currentBooking?.clientName || 'El cliente'} está escribiendo...</span>
                  </div>
                )}
              </div>

              {/* Simulation triggers for instant testing */}
              <div className="pt-2 border-t border-[#222222] flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] text-[#888888] font-medium flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#C9A55B]" />
                  Simular peticiones del cliente (Prueba de Alertas):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSimulateClientMessage('urgent')}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>⚠️ Petición Urgente (Alergia / Toallas)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateClientMessage('access')}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <span>🚪 Acceso / Interfón</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateClientMessage('routine')}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>💬 Consulta Rutinaria</span>
                  </button>
                </div>
              </div>

              {/* Input Area */}
              <div className="flex space-x-2">
                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Enviar actualización o respuesta al cliente..."
                  className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A55B] placeholder:text-[#666666]"
                />
                <button
                  type="button"
                  onClick={handleSendChat}
                  className="px-5 py-2.5 bg-[#C9A55B] text-black font-bold text-xs rounded-xl hover:bg-[#E6CA65] transition-colors flex items-center justify-center space-x-1 cursor-pointer shadow-md"
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
                        ) : bk.state === 'servicio_finalizado' ? (
                          <WhatsAppButton
                            phoneNumber="525512345678"
                            message={`Hola Concierge ESSENYA, envío mi comprobante de pago para la reserva ${bk.code || bk.id} (${bk.serviceName}, $${bk.total || bk.price || 0} MXN).`}
                            buttonText="Enviar Comprobante"
                            variant="outline"
                            size="sm"
                          />
                        ) : (
                          <motion.span
                            key={`badge-${bk.id}-${bk.state}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className={`text-xs font-bold px-3 py-1 rounded-full border uppercase ${
                              bk.state === 'servicio_iniciado'
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
                <span className="text-xs text-[#888888] uppercase block">Total Ganancias ($650/hr)</span>
                <span className="text-2xl font-bold text-gold-gradient">${(mergedCompletedBookings.reduce((sum, b) => sum + Math.round(((b.durationMinutes || 60) / 60) * 650), 0) + mergedCompletedBookings.reduce((sum, b) => sum + (b.tip || 0), 0)).toLocaleString()} MXN</span>
              </div>

              <div className="bg-[#141414] p-5 rounded-2xl border border-[#C9A55B]/30">
                <span className="text-xs text-[#888888] uppercase block">Propinas Acumuladas</span>
                <span className="text-2xl font-bold text-emerald-400">${mergedCompletedBookings.reduce((sum, b) => sum + (b.tip || 0), 0).toLocaleString()} MXN</span>
              </div>

              <div className="bg-[#141414] p-5 rounded-2xl border border-[#C9A55B]/30">
                <span className="text-xs text-[#888888] uppercase block">Servicios Completados</span>
                <span className="text-2xl font-bold text-white">{mergedCompletedBookings.length} Sesiones</span>
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
                {filteredCompletedBookings.length} de {mergedCompletedBookings.length} Servicios
              </span>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-[#141414] p-4 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/20 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Date Filter */}
                <div className="flex items-center space-x-1.5 bg-[#FAF8F5] dark:bg-[#1A1A1A] p-1 rounded-xl border border-[#E5DFD3] dark:border-[#333333]">
                  <button
                    type="button"
                    onClick={() => setHistoryDateFilter('all')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      historyDateFilter === 'all'
                        ? 'bg-[#C9A55B] text-white shadow-sm'
                        : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryDateFilter('week')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      historyDateFilter === 'week'
                        ? 'bg-[#C9A55B] text-white shadow-sm'
                        : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
                    }`}
                  >
                    Última Semana
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryDateFilter('month')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      historyDateFilter === 'month'
                        ? 'bg-[#C9A55B] text-white shadow-sm'
                        : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
                    }`}
                  >
                    Último Mes
                  </button>
                </div>

                {/* Service Type Filter */}
                <select
                  value={historyServiceFilter}
                  onChange={(e) => setHistoryServiceFilter(e.target.value)}
                  className="bg-[#FAF8F5] dark:bg-[#1A1A1A] text-xs font-medium text-[#1C1917] dark:text-white px-3 py-2 rounded-xl border border-[#E5DFD3] dark:border-[#333333] focus:outline-none focus:border-[#C9A55B]"
                >
                  <option value="all">Todos los Tipos de Servicio</option>
                  {availableServiceNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {(historyDateFilter !== 'all' || historyServiceFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setHistoryDateFilter('all');
                    setHistoryServiceFilter('all');
                  }}
                  className="text-xs font-bold text-[#806020] dark:text-[#C9A55B] hover:underline shrink-0"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* Scrollable List Container */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
              {filteredCompletedBookings.map((bk) => {
                const sessionRate = Math.round(((bk.durationMinutes || 60) / 60) * 650);
                return (
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
                            <td className="px-4 py-2 text-[10px] text-[#6B655F] dark:text-[#888888] uppercase tracking-wider font-bold">Tarifa Sesión ({bk.durationMinutes || 60}m)</td>
                            <td className="px-4 py-2 text-xs font-bold text-[#1C1917] dark:text-white text-right font-mono">${sessionRate}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-[10px] text-[#6B655F] dark:text-[#888888] uppercase tracking-wider font-bold">Propina</td>
                            <td className="px-4 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right font-mono">+${(bk.tip || 0).toLocaleString()}</td>
                          </tr>
                          <tr className="bg-[#C9A55B]/10 dark:bg-[#C9A55B]/5">
                            <td className="px-4 py-2 text-[10px] text-[#806020] dark:text-[#C9A55B] uppercase tracking-wider font-black">Pago Total</td>
                            <td className="px-4 py-2 text-sm font-black text-[#806020] dark:text-[#C9A55B] text-right font-mono">${(sessionRate + (bk.tip || 0)).toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
              })}

              {filteredCompletedBookings.length === 0 && (
                <div className="bg-white dark:bg-[#141414] p-8 rounded-2xl border border-[#E5DFD3] dark:border-[#333333] text-center space-y-2 text-[#6B655F] dark:text-[#888888]">
                  <Clock className="w-8 h-8 text-[#C9A55B]/40 mx-auto animate-pulse" />
                  <p className="text-sm font-semibold">No se encontraron servicios que coincidan con los filtros seleccionados.</p>
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

      {/* Realtime Chat Drawer with Client */}
      {currentBooking && (
        <BookingChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          bookingId={currentBooking.id}
          bookingCode={currentBooking.code}
          currentUserId={activeTherapist.id}
          currentUserName={activeTherapist.name || 'Terapeuta'}
          currentUserRole="terapeuta"
          otherUserName={currentBooking.clientName || 'Cliente VIP'}
          otherUserRole="cliente"
          clientId={currentBooking.clientId}
          clientName={currentBooking.clientName}
          therapistId={activeTherapist.id}
          therapistName={activeTherapist.name}
        />
      )}

      {/* Global Safety Emergency Panic Modal - Mobile-Optimized Full-Screen Overlay */}
      <PanicModal 
        isOpen={showPanicModal}
        onClose={() => setShowPanicModal(false)}
        userType="therapist"
        userRole="terapeuta"
        userId={activeTherapist.userId || activeTherapist.id}
        userName={activeTherapist.name || 'Terapeuta Certificada'}
        userLocation={currentBooking?.clientAddress || activeTherapist.coverageZones?.[0] || 'CDMX'}
        bookingCode={currentBooking?.code || 'EMERGENCY-THERAPIST'}
        fullScreenOnMobile={true}
      />

      {/* Therapist Notification History Panel (Missed Push & Alert Review) */}
      <TherapistNotificationsPanel
        therapistId={activeTherapist.id}
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
      />
    </div>
  );
};
