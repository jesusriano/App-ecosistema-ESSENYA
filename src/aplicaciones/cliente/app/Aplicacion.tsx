import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../../../context/ToastContext';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { 
  ServiceItem, Therapist, ClientUser, Booking, Invoice, 
  ServicePreference, BookingState, PressureLevel, EssentialOil, MusicStyle, ExtraServiceSelection 
} from '../../../shared/types/index';
import { 
  calculateServicePrice, OIL_OPTIONS, MUSIC_OPTIONS, PAYMENT_METHODS 
} from '../../../shared/data/catalog';
import { 
  Calendar, Clock, MapPin, Sparkles, CheckCircle2, CheckCircle, Navigation, 
  MessageSquare, FileText, Star, Award, ShieldCheck, ChevronRight, 
  Bot, AlertCircle, RefreshCw, Send, X, Heart, Droplets, Music, Sliders,
  AlertTriangle, CreditCard, Building2, Check, Copy, Users, UserCheck, Banknote, Camera, Upload,
  LocateFixed, Crown, Gem, Shield, Gift, Wallet, Lock
} from 'lucide-react';
import { PanicModal } from '../../../shared/components/PanicModal';
import { WhatsAppButton } from '../../../shared/components/WhatsAppButton';
import { LiveTrackingMap } from '../../../shared/components/LiveTrackingMap';
import { useGeolocation } from '../../../shared/hooks/useGeolocation';
import { fetchAiConciergeRecommendation } from '../../../shared/services/api';
import { 
  calculateMembershipTier, 
  getCompletedAndPaidBookings, 
  getVipCourtesyStatus, 
  markVipCourtesyAsUsed,
  validatePromotionCode,
  PromoValidationResult
} from '../services/membershipService';
import { 
  validateGiftCardCode, 
  applyGiftCardToBooking, 
  getGiftCards, 
  GiftCard 
} from '../services/billeteraService';


interface ClientAppProps {
  client: ClientUser;
  services: ServiceItem[];
  therapists: Therapist[];
  bookings: Booking[];
  invoices: Invoice[];
  onNewBooking: (booking: Booking) => Promise<void> | void;
  onUpdateBookingState: (bookingId: string, newState: BookingState) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onSendMessage: (bookingId: string, text: string) => void;
  onRateBooking?: (bookingId: string, rating: number, comment: string) => void;
}

export const ClientApp: React.FC<ClientAppProps> = ({
  client,
  services,
  therapists,
  bookings,
  invoices,
  onNewBooking,
  onUpdateBookingState,
  onViewInvoice,
  onSendMessage,
  onRateBooking,
}) => {
  const { showToast } = useToast();
  const { lat, lng, loading: geolocLoading, error: geolocError, getPosition } = useGeolocation();
  const [activeTab, setActiveTab] = useState<'book' | 'tracking' | 'history' | 'membership'>('book');

  // Rating state for completed bookings
  const [pendingRating, setPendingRating] = useState<Record<string, number>>({});
  const [pendingComment, setPendingComment] = useState<Record<string, string>>({});

  // Booking Flow State
  const [step, setStep] = useState<number>(1);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(services?.[0] || null);
  const [duration, setDuration] = useState<60 | 90 | 120>(90);
  const [selectedDate, setSelectedDate] = useState<string>('2026-07-23');
  const [selectedTime, setSelectedTime] = useState<string>('18:00');
  const [address, setAddress] = useState<string>(client?.address || 'Av. Paseo de las Palmas 735, Polanco');
  const [cityZone, setCityZone] = useState<string>(client?.cityZone || 'Polanco / Lomas CDMX');
  
  // Luxury Preferences
  const [preferences, setPreferences] = useState<ServicePreference>({
    genderPreference: 'femenino',
    pressureLevel: 'Firme',
    essentialOil: 'Aceite de olor',
    musicStyle: 'Sonido de la naturaleza',
    painPoints: '',
    arrivalInstructions: '',
    specialInstructions: '',
    focusAreas: ['Espalda / Cervicales', 'Lumbares']
  });

  const [selectedTherapistId, setSelectedTherapistId] = useState<string | 'auto'>('auto');
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    label: string;
    discountPercent?: number;
    fixedDiscount?: number;
    type: 'DIAMOND10' | 'VIP15' | 'STANDARD';
  } | null>(null);

  // Tarjeta de Regalo / Billetera State (para canjear un regalo recibido por el cliente)
  const [giftCardCodeInput, setGiftCardCodeInput] = useState<string>('');
  const [appliedGiftCard, setAppliedGiftCard] = useState<GiftCard | null>(null);
  const [showGiftCardSection, setShowGiftCardSection] = useState<boolean>(false);

  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [isCustomTip, setIsCustomTip] = useState<boolean>(false);
  const [customTipVal, setCustomTipVal] = useState<string>('0');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState<boolean>(false);

  // Client Photo State & Local Persistence
  const [clientPhoto, setClientPhoto] = useState<string>(() => {
    return localStorage.getItem('essenya_client_photo') || client?.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';
  });

  // Sync geolocation to address
  React.useEffect(() => {
    if (lat && lng) {
      showToast('Ubicación obtenida', `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}. Buscando dirección...`, 'success');
      // In a real app, we would reverse geocode here.
      // For this audit, we will set a placeholder that indicates GPS success.
      setAddress(`Ubicación GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)} (Detectada)`);
    }
  }, [lat, lng]);

  React.useEffect(() => {
    if (geolocError) {
      showToast('Error de Ubicación', geolocError, 'error');
    }
  }, [geolocError]);

  const handleClientPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast('Error de tamaño', 'La imagen supera el límite de 8MB.', 'error');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast('Formato inválido', 'Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setClientPhoto(dataUrl);
        localStorage.setItem('essenya_client_photo', dataUrl);
        showToast('Foto de Perfil Actualizada', 'Tu fotografía de socio VIP se ha guardado exitosamente.', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Payment Method Selection State (Apple Pay completely removed)
  const [paymentMethodType, setPaymentMethodType] = useState<'transferencia' | 'efectivo'>('transferencia');
  const [clabeCopied, setClabeCopied] = useState<boolean>(false);

  // Safety & Emergency Panic Modal State
  const [showPanicModal, setShowPanicModal] = useState<boolean>(false);

  // Active tracking booking
  const activeBooking = bookings.find(b => b.state !== 'servicio_finalizado' && b.state !== 'cancelado') || bookings[0];

  // Popover state for client tier incentive ladder
  const [showTierPopover, setShowTierPopover] = useState<boolean>(false);

  // Masajes adquiridos por el cliente que ya han terminado de pagarse y ya concluyó el masaje
  const completedAndPaidBookings = useMemo(() => {
    return getCompletedAndPaidBookings(bookings, client?.id);
  }, [bookings, client?.id]);

  const completedMassagesCount = completedAndPaidBookings.length;

  // Niveles de membresía calculados según masajes concluidos y pagados
  const currentTierData = useMemo(() => {
    return calculateMembershipTier(completedMassagesCount);
  }, [completedMassagesCount]);

  // AI Concierge State
  const [showAiConcierge, setShowAiConcierge] = useState<boolean>(false);
  const [aiQuery, setAiQuery] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiRecommendation, setAiRecommendation] = useState<any>(null);

  // Chat Drawer
  const [showChat, setShowChat] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string, text: string, time: string }>>([
    { sender: 'Concierge', text: 'Bienvenido a ESSENYA, Don Alejandro. Su terapeuta fue notificada y está coordinando el transporte ejecutivo.', time: '10:16 AM' },
    { sender: 'Dra. Elena Rostova', text: 'Buenas tardes. Me encuentro en camino con todo el equipo esterilizado y camilla VIP.', time: '10:20 AM' }
  ]);

  // Extras Selection State
  const [selectedReflexology, setSelectedReflexology] = useState<'none' | '15' | '30'>('none');
  const [selectedCraneofacial, setSelectedCraneofacial] = useState<'none' | '15' | '30'>('none');

  // Calculate Prices and Durations
  const reflexologyPrice = selectedReflexology === '15' ? 300 : selectedReflexology === '30' ? 500 : 0;
  const reflexologyDuration = selectedReflexology === '15' ? 15 : selectedReflexology === '30' ? 30 : 0;

  const craneofacialPrice = selectedCraneofacial === '15' ? 300 : selectedCraneofacial === '30' ? 500 : 0;
  const craneofacialDuration = selectedCraneofacial === '15' ? 15 : selectedCraneofacial === '30' ? 30 : 0;

  const extrasTotalPrice = reflexologyPrice + craneofacialPrice;
  const totalServiceDurationMinutes = duration + reflexologyDuration + craneofacialDuration;

  const calculateBasePrice = () => {
    if (!selectedService) return 0;
    return calculateServicePrice(selectedService.basePrice, duration);
  };

  const baseMassagePrice = calculateBasePrice();
  const rawPrice = baseMassagePrice + extrasTotalPrice;

  // Calculate promotional discount dynamically
  const promoDiscountAmount = useMemo(() => {
    if (!appliedPromo) return discountAmount;
    if (appliedPromo.discountPercent) {
      return Math.round(rawPrice * (appliedPromo.discountPercent / 100));
    }
    return appliedPromo.fixedDiscount || discountAmount;
  }, [appliedPromo, rawPrice, discountAmount]);

  const priceAfterPromo = Math.max(0, rawPrice - promoDiscountAmount);

  // Calculate Gift Card deduction ($1,400 MXN card system)
  const giftCardDeduction = useMemo(() => {
    if (!appliedGiftCard) return 0;
    return Math.min(appliedGiftCard.currentBalance, priceAfterPromo);
  }, [appliedGiftCard, priceAfterPromo]);

  const giftCardRemainingBalance = useMemo(() => {
    if (!appliedGiftCard) return 0;
    return Math.max(0, appliedGiftCard.currentBalance - giftCardDeduction);
  }, [appliedGiftCard, giftCardDeduction]);

  const totalPrice = Math.max(0, priceAfterPromo - giftCardDeduction);

  // Select service helper
  const handleSelectService = (srv: ServiceItem) => {
    setSelectedService(srv);
    const allowed = srv.allowedDurations || [60, 90, 120];
    if (!allowed.includes(duration)) {
      setDuration(allowed[0] as 60 | 90 | 120);
    }
  };

  // Apply Coupon with strict membership tier validation (DIAMOND10, VIP15, GOLD2026, ESSENYABLACK)
  const handleApplyCoupon = (customCode?: string) => {
    const code = (typeof customCode === 'string' ? customCode : couponCode).trim().toUpperCase();
    if (!code) {
      showToast('Ingresa un código', 'Por favor escribe un código promocional o de membresía.', 'error');
      return;
    }

    const result = validatePromotionCode(code, completedMassagesCount, currentTierData);
    if (!result.valid) {
      showToast(result.title, result.message, 'error');
      return;
    }

    setAppliedPromo({
      code: result.code || code,
      label: result.label || 'Descuento Promocional',
      discountPercent: result.discountPercent,
      fixedDiscount: result.fixedDiscount,
      type: result.type || 'STANDARD'
    });

    showToast(result.title, result.message, 'gold');
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setDiscountAmount(0);
    setCouponCode('');
    showToast('Cupón Removido', 'Se ha eliminado el descuento de la reserva.', 'info');
  };

  // Gift Card application handler ($1,400 MXN system)
  const handleApplyGiftCard = (customCode?: string) => {
    const code = (typeof customCode === 'string' ? customCode : giftCardCodeInput).trim().toUpperCase();
    const result = validateGiftCardCode(code);
    if (!result.valid || !result.card) {
      showToast('Tarjeta Inválida', result.message, 'error');
      return;
    }
    setAppliedGiftCard(result.card);
    showToast(
      'Tarjeta de Regalo Aplicada',
      `Saldo de $${result.card.currentBalance.toLocaleString()} MXN disponible. Se aplicará a esta reserva.`,
      'gold'
    );
  };

  const handleRemoveGiftCard = () => {
    setAppliedGiftCard(null);
    showToast('Tarjeta de Regalo Quitada', 'Se ha desvinculado la tarjeta de esta reserva.', 'info');
  };

  // Submit Booking
  const handleConfirmBooking = async () => {
    if (!selectedService || isSubmittingBooking) return;
    setIsSubmittingBooking(true);

    // NO therapist is assigned at creation time
    const therapistDisplayName = undefined;

    
    const extrasList: any[] = [];
    if (selectedReflexology !== 'none') {
      extrasList.push({
        id: `extra-ref-${selectedReflexology}`,
        name: `Reflexología Podal (${selectedReflexology} min)`,
        durationMinutes: selectedReflexology === '15' ? 15 : 30,
        price: reflexologyPrice
      });
    }
    if (selectedCraneofacial !== 'none') {
      extrasList.push({
        id: `extra-cra-${selectedCraneofacial}`,
        name: `Masaje Craneofacial (${selectedCraneofacial} min)`,
        durationMinutes: selectedCraneofacial === '15' ? 15 : 30,
        price: craneofacialPrice
      });
    }

    const newBk: Booking = {
      id: `bk-${Math.floor(1000 + Math.random() * 9000)}`,
      code: `ESS-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: client?.id || '',
      clientName: client?.name || 'Cliente VIP',
      clientPhone: client?.phone || '',
      clientAddress: address || '',
      cityZone: cityZone || 'Zona Metropolitana CDMX',
      serviceId: selectedService.id,
      serviceName: selectedService?.name || 'Masaje Exclusivo',
      durationMinutes: duration,
      totalDurationMinutes: totalServiceDurationMinutes,
      ...(extrasList.length > 0 ? { selectedExtras: extrasList } : {}),
      ...(selectedService.requiresDualTherapist ? { requiresDualTherapist: true } : {}),
      ...(selectedService.therapistAssignmentNote ? { dualTherapistNote: selectedService.therapistAssignmentNote } : {}),
      price: rawPrice,
      tip: tipAmount,
      total: totalPrice,
      date: selectedDate,
      time: selectedTime,
      preferences: { ...preferences },
      state: 'pendiente',
      etaMinutes: 20,
      paymentMethod: totalPrice === 0 && giftCardDeduction > 0
        ? 'Tarjeta de Regalo (Saldo Billetera)'
        : paymentMethodType === 'efectivo'
        ? 'Efectivo (Pago al Recibir)'
        : paymentMethodType === 'transferencia'
        ? 'Transferencia Interbancaria (SPEI)'
        : 'Tarjeta de Crédito / Débito',
      paymentStatus: totalPrice === 0 ? 'pagado' : paymentMethodType === 'efectivo' ? 'pendiente' : 'pagado',
      painPoints: preferences.painPoints || '',
      arrivalInstructions: preferences.arrivalInstructions || '',
      createdAt: new Date().toISOString(),
      invoiceId: `inv-${Math.floor(1000 + Math.random() * 9000)}`
    };

    try {
      await onNewBooking(newBk);

      // Consume VIP15 courtesy benefit if applied (single-use)
      if (appliedPromo?.type === 'VIP15') {
        markVipCourtesyAsUsed();
      }

      // Deduct Gift Card balance if applied
      if (appliedGiftCard && giftCardDeduction > 0) {
        applyGiftCardToBooking(
          appliedGiftCard.code,
          giftCardDeduction,
          newBk.code,
          selectedService?.name || 'Masaje ESSENYA'
        );
      }

      showToast(
        'Reserva Confirmada',
        `Su código es ${newBk.code}. La solicitud ha sido registrada en tiempo real en la Central de Operaciones.`,
        'gold'
      );
      
      // Reset coupon & gift card states
      setAppliedPromo(null);
      setAppliedGiftCard(null);
      setCouponCode('');

      setActiveTab('tracking');
      setStep(1);
    } catch (bookingErr: any) {
      console.error('Error guardando reserva en Firestore:', bookingErr);
      showToast(
        'Error al procesar reserva',
        bookingErr?.message || 'No fue posible conectar con Firestore. Intente nuevamente.',
        'error'
      );
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Call AI Concierge Server Endpoint
  const handleConsultAiConcierge = async () => {
    setAiLoading(true);
    setAiRecommendation(null);
    try {
      const data = await fetchAiConciergeRecommendation({
        userQuery: aiQuery,
        muscleTension: preferences.specialInstructions || 'Rigidez de cuello y lumbar',
        userPreferences: preferences
      });
      if (data.success && data.recommendation) {
        setAiRecommendation(data.recommendation);
        
        // Auto match service
        const matched = services.find(s => s?.name?.toLowerCase().includes(data.recommendation.recommendedRitual?.toLowerCase())) || services[0];
        setSelectedService(matched);
        if (data.recommendation.recommendedDuration) {
          setDuration(data.recommendation.recommendedDuration as any);
        }
      }
    } catch (e) {
      console.error('Error al consultar Concierge IA:', e);
    } finally {
      setAiLoading(false);
    }
  };


  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const newMsg = {
      sender: client?.name,
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, newMsg]);
    onSendMessage(activeBooking.id, chatInput);
    setChatInput('');

    // Simulate therapist quick auto reply
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          sender: activeBooking.therapistName || 'Dra. Elena Rostova',
          text: 'Entendido, Don Alejandro. Llevo la mezcla de aromaterapia de Ylang Ylang Dorado indicada.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#FAF8F5] dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white pb-20 transition-colors duration-300">
      {/* Subheader / Client Profile Strip */}
      <section className="bg-white/80 dark:bg-[#141414]/80 backdrop-blur-md border-b border-[#E5DFD3] dark:border-[#262626] py-3 sm:py-5 px-3 sm:px-6 lg:px-8 shadow-xs w-full">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
          <div className="flex items-center space-x-4">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative shrink-0 group cursor-pointer"
            >
              <img 
                src={clientPhoto || client.photo || undefined} 
                alt={client?.name} 
                className="w-14 h-14 rounded-2xl border-2 border-[#C9A55B] object-cover shadow-md shadow-[#C9A55B]/15"
                referrerPolicy="no-referrer"
              />
              
              {/* Photo Upload Overlay on Hover */}
              <label 
                htmlFor="client-photo-input"
                className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[9px] font-bold"
                title="Subir o cambiar foto de perfil"
              >
                <Camera className="w-4 h-4 text-[#E6CA65] mb-0.5" />
                <span>Cambiar</span>
              </label>

              <input
                id="client-photo-input"
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={handleClientPhotoUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => document.getElementById('client-photo-input')?.click()}
                className="absolute -bottom-1 -right-1 bg-[#C9A55B] text-black p-1 rounded-full shadow border-2 border-white dark:border-[#141414] hover:bg-[#E6CA65] transition-colors cursor-pointer"
                title="Subir foto"
              >
                <Camera className="w-3 h-3" />
              </button>
            </motion.div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-serif font-bold text-[#1C1917] dark:text-white tracking-wide">{client?.name}</h2>
                <span 
                  id="client-membership-tier-badge"
                  onClick={() => setShowTierPopover(prev => !prev)}
                  onMouseEnter={() => setShowTierPopover(true)}
                  onMouseLeave={() => setShowTierPopover(false)}
                  title={`${currentTierData.fullLabel} • ${completedMassagesCount} ${completedMassagesCount === 1 ? 'masaje concluido y pagado' : 'masajes concluidos y pagados'}. ${currentTierData.incentiveMessage}`}
                  className={`relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider cursor-pointer transition-all duration-300 select-none ${currentTierData.badgeStyle}`}
                >
                  {/* Icon according to tier */}
                  {currentTierData.iconType === 'shield' && <Shield className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200 shrink-0" />}
                  {currentTierData.iconType === 'crown' && <Crown className="w-3.5 h-3.5 shrink-0" />}
                  {currentTierData.iconType === 'gem' && <Gem className="w-3.5 h-3.5 shrink-0 animate-pulse" />}
                  {currentTierData.iconType === 'sparkles' && <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-300" />}

                  {/* Tier Label */}
                  <span>{currentTierData.fullLabel}</span>

                  {/* Massages completed counter pill */}
                  <span className="bg-black/15 dark:bg-white/20 px-1.5 py-0.5 rounded-full text-[9px] font-bold lowercase tracking-normal flex items-center gap-0.5">
                    <span>{completedMassagesCount} {completedMassagesCount === 1 ? 'masaje' : 'masajes'}</span>
                  </span>

                  {/* Incentive Ladder Popover on Hover or Click */}
                  <AnimatePresence>
                    {showTierPopover && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-2 z-50 w-72 p-3.5 rounded-2xl bg-white dark:bg-[#1A1A1A] text-[#1C1917] dark:text-white border border-[#E5DFD3] dark:border-[#333333] shadow-2xl normal-case tracking-normal text-left pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-[#E5DFD3] dark:border-[#2A2A2A]">
                          <div className="flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-[#C9A55B]" />
                            <span className="font-serif font-bold text-xs">Programa de Ascenso VIP</span>
                          </div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B]">
                            Nivel {currentTierData.level}
                          </span>
                        </div>

                        <div className="mt-2.5 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[#6B655F] dark:text-[#AAAAAA]">Masajes concluidos & pagados:</span>
                            <span className="font-bold text-[#1C1917] dark:text-white">{completedMassagesCount}</span>
                          </div>

                          {currentTierData.neededForNext > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-[#6B655F] dark:text-[#AAAAAA]">
                                <span>Próximo ascenso: <strong className="text-[#806020] dark:text-[#C9A55B]">{currentTierData.nextTier}</strong></span>
                                <span className="font-bold">{currentTierData.neededForNext} {currentTierData.neededForNext === 1 ? 'masaje' : 'masajes'}</span>
                              </div>
                              <div className="w-full bg-[#E5DFD3] dark:bg-[#2A2A2A] h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-[#C9A55B] to-[#E6CA65] rounded-full transition-all duration-500"
                                  style={{ width: `${Math.max(8, currentTierData.progressPercent)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Máximo nivel alcanzado</span>
                            </p>
                          )}

                          <p className="text-[11px] text-[#6B655F] dark:text-[#AAAAAA] leading-snug pt-1">
                            {currentTierData.incentiveMessage}
                          </p>

                          <div className="p-2 rounded-xl bg-[#FAF8F5] dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] text-[10px] text-[#806020] dark:text-[#D4AF37]">
                            {currentTierData.perk}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </span>
                <label 
                  htmlFor="client-photo-input"
                  className="text-[10px] text-[#806020] dark:text-[#C9A55B] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                >
                  <Upload className="w-3 h-3" />
                  <span>Subir Foto</span>
                </label>
              </div>
              <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] flex items-center space-x-1 mt-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-[#C9A55B] shrink-0" />
                <span className="truncate">{client.address}</span>
              </p>
            </div>
          </div>

          {/* Quick Stats & AI Concierge Trigger & Panic SOS */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto">
            <LuxuryButton
              onClick={() => {
                setShowPanicModal(true);
                showToast('Protocolo de Seguridad SOS', 'Activando geolocalización de emergencia...', 'error');
              }}
              variant="danger"
              size="sm"
              id="panic-sos-btn"
              title="Botón de Pánico / Seguridad 24/7"
              className="py-2.5"
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="inline text-xs">Pánico SOS</span>
            </LuxuryButton>

            <LuxuryButton
              onClick={() => setShowAiConcierge(true)}
              variant="gold"
              size="sm"
              id="ai-concierge-btn"
              className="flex-1 md:flex-none py-2.5"
            >
              <Bot className="w-4 h-4" />
              <span>Sommelier & Concierge AI</span>
            </LuxuryButton>

            <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] px-3.5 py-1.5 rounded-2xl text-center shadow-xs shrink-0">
              <span className="text-[9px] text-[#6B655F] dark:text-[#AAAAAA] uppercase tracking-wider block font-semibold">Puntos VIP</span>
              <span className="text-xs font-bold text-[#806020] dark:text-[#C9A55B]">{client.rewardsPoints} pts</span>
            </div>
          </div>
        </div>

        {/* Client App Tabs */}
        <div className="max-w-7xl mx-auto flex items-center space-x-2 mt-6 border-t border-[#E5DFD3] dark:border-[#C9A55B]/10 pt-4 overflow-x-auto no-scrollbar w-full">
          <button
            onClick={() => setActiveTab('book')}
            id="tab-btn-book"
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'book'
                ? 'bg-[#C9A55B]/20 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/50'
                : 'text-[#6B655F] dark:text-white/60 hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Reservar Masaje</span>
          </button>

          <button
            onClick={() => setActiveTab('tracking')}
            id="tab-btn-tracking"
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 whitespace-nowrap relative ${
              activeTab === 'tracking'
                ? 'bg-[#C9A55B]/20 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/50'
                : 'text-[#6B655F] dark:text-white/60 hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            <Navigation className="w-4 h-4 text-[#16A34A]" />
            <span>Seguimiento en Vivo</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] ring-2 ring-[#22C55E]/40"></span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            id="tab-btn-history"
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-[#C9A55B]/20 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/50'
                : 'text-[#6B655F] dark:text-white/60 hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Historial y Facturas</span>
          </button>

          <button
            onClick={() => setActiveTab('membership')}
            id="tab-btn-membership"
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'membership'
                ? 'bg-[#C9A55B]/20 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/50'
                : 'text-[#6B655F] dark:text-white/60 hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Membresía Black</span>
          </button>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: BOOKING FLOW */}
        {activeTab === 'book' && (
          <div className="space-y-8">
            {/* Step Stepper Header */}
            <div className="max-w-3xl mx-auto bg-white dark:bg-[#141414] p-3.5 sm:p-5 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/20 space-y-3 shadow-sm">
              <div className="flex items-center justify-between relative">
                {[
                  { stepNum: 1, label: 'Ritual' },
                  { stepNum: 2, label: 'Duración & Cita' },
                  { stepNum: 3, label: 'Preferencias' },
                  { stepNum: 4, label: 'Terapeuta' },
                  { stepNum: 5, label: 'Confirmación' }
                ].map((s, idx) => (
                  <React.Fragment key={s.stepNum}>
                    <div 
                      onClick={() => { if (step > s.stepNum) setStep(s.stepNum); }}
                      className={`flex items-center space-x-2 cursor-pointer transition-all shrink-0 ${step < s.stepNum ? 'pointer-events-none' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                        step === s.stepNum
                          ? 'bg-gradient-to-r from-[#E6CA65] to-[#C9A55B] text-black ring-2 ring-[#C9A55B]/40 shadow-md shadow-[#C9A55B]/30'
                          : step > s.stepNum
                          ? 'bg-[#C9A55B]/20 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/40'
                          : 'bg-[#F5F1EA] dark:bg-[#1A1A1A] text-[#888888] dark:text-[#666666] border border-[#E5DFD3] dark:border-[#333333]'
                      }`}>
                        {step > s.stepNum ? '✓' : s.stepNum}
                      </div>
                      <span className={`text-xs hidden md:inline whitespace-nowrap ${step === s.stepNum ? 'text-[#1C1917] dark:text-white font-bold' : 'text-[#6B655F] dark:text-[#888888]'}`}>
                        {s.label}
                      </span>
                    </div>

                    {idx < 4 && (
                      <div className={`flex-1 h-0.5 mx-1.5 sm:mx-3 transition-colors ${
                        step > s.stepNum ? 'bg-[#C9A55B]' : 'bg-[#E5DFD3] dark:bg-[#282828]'
                      }`}></div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Mobile Active Step Label Bar */}
              <div className="md:hidden flex items-center justify-between text-xs pt-1 border-t border-[#E5DFD3] dark:border-[#222222]">
                <span className="text-[#806020] dark:text-[#C9A55B] font-bold">Paso {step} de 5</span>
                <span className="text-[#1C1917] dark:text-white font-semibold">
                  {[
                    'Ritual',
                    'Duración & Cita',
                    'Preferencias',
                    'Terapeuta',
                    'Confirmación'
                  ][step - 1]}
                </span>
              </div>
            </div>

            {/* STEP 1: SELECT RITUAL */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center max-w-xl mx-auto space-y-2">
                  <h3 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white">Selecciona tu Ritual de Bienestar</h3>
                  <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                    Cada tratamiento incluye montaje completo de camilla VIP, lencería de algodón egipcio de 600 hilos y aromaterapia orgánica.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map((srv) => (
                    <div
                      key={srv.id}
                      onClick={() => setSelectedService(srv)}
                      className={`bg-white dark:bg-[#141414] rounded-2xl overflow-hidden border transition-all cursor-pointer group flex flex-col justify-between shadow-sm hover:shadow-md ${
                        selectedService?.id === srv.id
                          ? 'border-[#C9A55B] ring-2 ring-[#C9A55B] shadow-xl shadow-[#C9A55B]/10'
                          : 'border-[#E5DFD3] dark:border-[#C9A55B]/20 hover:border-[#C9A55B]/60'
                      }`}
                    >
                      <div>
                        <div className="relative h-48 overflow-hidden">
                          <img 
                            src={srv.image || undefined} 
                            alt={srv.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-white/90 dark:from-[#141414] via-transparent to-transparent"></div>
                          <span className="absolute top-3 right-3 bg-white/90 dark:bg-[#0D0D0D]/80 backdrop-blur-md text-[#806020] dark:text-[#C9A55B] text-[10px] font-bold uppercase px-3 py-1 rounded-full border border-[#C9A55B]/30">
                            {srv.category}
                          </span>
                        </div>

                        <div className="p-5 space-y-3">
                          <h4 className="text-lg font-serif font-bold text-[#1C1917] dark:text-white group-hover:text-[#C9A55B] transition-colors">
                            {srv.name}
                          </h4>
                          <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] line-clamp-2">{srv.description}</p>

                          <div className="space-y-1 pt-2">
                            <p className="text-[10px] uppercase text-[#6B655F] dark:text-[#888888] tracking-wider font-semibold">Beneficios Clave:</p>
                            <ul className="text-xs text-[#1C1917]/80 dark:text-white/80 space-y-1">
                              {srv.benefits.map((b, idx) => (
                                <li key={idx} className="flex items-center space-x-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A55B]"></span>
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 border-t border-[#E5DFD3] dark:border-[#C9A55B]/15 bg-[#FAF8F5] dark:bg-[#171717] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-[#6B655F] dark:text-[#888888] uppercase block">Desde (60 min)</span>
                          <span className="text-lg font-bold text-[#806020] dark:text-gold-gradient">${srv.basePrice.toLocaleString()} MXN</span>
                        </div>

                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedService(srv); setStep(2); }}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                            selectedService?.id === srv.id
                              ? 'bg-[#C9A55B] text-black shadow-md shadow-[#C9A55B]/30'
                              : 'bg-[#F5F1EA] dark:bg-[#222222] text-[#1C1917] dark:text-white border border-[#E5DFD3] dark:border-[#333333] hover:bg-[#C9A55B] hover:text-black'
                          }`}
                        >
                          Seleccionar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    disabled={!selectedService}
                    onClick={() => setStep(2)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-[#C9A55B] to-[#B38F43] text-black font-semibold px-6 py-3 rounded-xl gold-button-hover disabled:opacity-50"
                  >
                    <span>Siguiente: Duración & Cita</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: DURATION, EXTRAS & DATE/TIME */}
            {step === 2 && selectedService && (
              <div className="max-w-2xl mx-auto space-y-8 bg-white dark:bg-[#141414] p-6 sm:p-8 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/20 shadow-sm">
                <div className="border-b border-[#E5DFD3] dark:border-[#C9A55B]/20 pb-4">
                  <span className="text-xs text-[#806020] dark:text-[#C9A55B] uppercase tracking-widest font-bold">Ritual Seleccionado</span>
                  <h3 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white mt-1">{selectedService?.name}</h3>
                  <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] mt-1">{selectedService.description}</p>
                </div>

                {/* Dual Therapist Notice */}
                {selectedService.requiresDualTherapist && (
                  <div className="bg-[#FAF6EE] dark:bg-[#1F1B13] p-4 rounded-xl border border-[#C9A55B]/50 flex items-start space-x-3">
                    <Sparkles className="w-5 h-5 text-[#806020] dark:text-[#C9A55B] shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <span className="font-bold text-[#806020] dark:text-[#C9A55B] block uppercase tracking-wider">
                        Atención Especial Dúo Incluida (2 Masajistas)
                      </span>
                      <p className="text-[#1C1917]/90 dark:text-white/90">
                        {selectedService.therapistAssignmentNote || 'Este servicio requiere e includes 2 terapeutas profesionales asignadas.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Duration Picker */}
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] font-semibold block">
                    1. Selecciona la Duración del Masaje Base
                  </label>
                  <div className={`grid gap-3 ${
                    (selectedService.allowedDurations || [60, 90, 120]).length === 1 
                      ? 'grid-cols-1' 
                      : (selectedService.allowedDurations || [60, 90, 120]).length === 2 
                      ? 'grid-cols-2' 
                      : 'grid-cols-1 sm:grid-cols-2'
                  }`}>
                    {(selectedService.allowedDurations || [60, 90, 120]).map((m) => {
                      const p = m === 60 ? selectedService.basePrice : m === 90 ? selectedService.price90 : selectedService.price120;
                      const desc = m === 60 ? 'Sesión Express focalizada' : m === 90 ? 'Recomendación ESSENYA' : 'Inmersión Total de Lujo';
                      return (
                        <div
                          key={m}
                          onClick={() => setDuration(m as 60 | 90 | 120)}
                          className={`p-3.5 sm:p-4 rounded-xl border text-center cursor-pointer transition-all ${
                            duration === m
                              ? 'bg-[#C9A55B]/20 border-[#C9A55B] ring-2 ring-[#C9A55B]'
                              : 'bg-[#F5F1EA] dark:bg-[#1A1A1A] border-[#E5DFD3] dark:border-[#333333] hover:border-[#C9A55B]/50'
                          }`}
                        >
                          <span className="text-lg sm:text-xl font-bold text-[#1C1917] dark:text-white block">{m} Min</span>
                          <span className="text-xs sm:text-sm font-semibold text-[#806020] dark:text-gold-gradient block mt-1">
                            ${p.toLocaleString()} MXN
                          </span>
                          <span className="text-[10px] text-[#6B655F] dark:text-[#888888] block mt-1">{desc}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Extras Selection Section */}
                <div className="space-y-4 pt-2 border-t border-[#E5DFD3] dark:border-[#222222]">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-[#806020] dark:text-[#C9A55B] font-bold block">
                      2. Servicios Adicionales (Extras)
                    </label>
                    <p className="text-[11px] text-[#6B655F] dark:text-[#AAAAAA] mt-0.5">
                      Personaliza tu sesión sumando tiempo y beneficios focalizados.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Extra 1: Reflexología Podal */}
                    <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-4 rounded-xl border border-[#E5DFD3] dark:border-[#333333] space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-[#1C1917] dark:text-white">Reflexología Podal</h4>
                          <p className="text-[10px] text-[#6B655F] dark:text-[#AAAAAA]">Estímulo de puntos reflejos en pies</p>
                        </div>
                        <span className="text-[10px] bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] font-bold px-2 py-0.5 rounded border border-[#C9A55B]/20">
                          Extra
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedReflexology('none')}
                          className={`py-2 px-1 rounded-lg border text-[11px] font-semibold transition-all ${
                            selectedReflexology === 'none'
                              ? 'bg-[#C9A55B] text-black border-[#C9A55B] font-bold'
                              : 'bg-white dark:bg-[#141414] text-[#6B655F] dark:text-[#888888] border-[#E5DFD3] dark:border-[#333333] hover:text-[#1C1917] dark:hover:text-white'
                          }`}
                        >
                          Sin Extra
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedReflexology('15')}
                          className={`py-2 px-1 rounded-lg border text-[11px] font-semibold transition-all ${
                            selectedReflexology === '15'
                              ? 'bg-[#C9A55B] text-black border-[#C9A55B] font-bold'
                              : 'bg-white dark:bg-[#141414] text-[#6B655F] dark:text-[#888888] border-[#E5DFD3] dark:border-[#333333] hover:text-[#1C1917] dark:hover:text-white'
                          }`}
                        >
                          15 min ($300)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedReflexology('30')}
                          className={`py-2 px-1 rounded-lg border text-[11px] font-semibold transition-all ${
                            selectedReflexology === '30'
                              ? 'bg-[#C9A55B] text-black border-[#C9A55B] font-bold'
                              : 'bg-white dark:bg-[#141414] text-[#6B655F] dark:text-[#888888] border-[#E5DFD3] dark:border-[#333333] hover:text-[#1C1917] dark:hover:text-white'
                          }`}
                        >
                          30 min ($500)
                        </button>
                      </div>
                    </div>

                    {/* Extra 2: Masaje Craneofacial */}
                    <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-4 rounded-xl border border-[#E5DFD3] dark:border-[#333333] space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-[#1C1917] dark:text-white">Masaje Craneofacial</h4>
                          <p className="text-[10px] text-[#6B655F] dark:text-[#AAAAAA]">Alivio de tensión en cráneo y rostro</p>
                        </div>
                        <span className="text-[10px] bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] font-bold px-2 py-0.5 rounded border border-[#C9A55B]/20">
                          Extra
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedCraneofacial('none')}
                          className={`py-2 px-1 rounded-lg border text-[11px] font-semibold transition-all ${
                            selectedCraneofacial === 'none'
                              ? 'bg-[#C9A55B] text-black border-[#C9A55B] font-bold'
                              : 'bg-white dark:bg-[#141414] text-[#6B655F] dark:text-[#888888] border-[#E5DFD3] dark:border-[#333333] hover:text-[#1C1917] dark:hover:text-white'
                          }`}
                        >
                          Sin Extra
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCraneofacial('15')}
                          className={`py-2 px-1 rounded-lg border text-[11px] font-semibold transition-all ${
                            selectedCraneofacial === '15'
                              ? 'bg-[#C9A55B] text-black border-[#C9A55B] font-bold'
                              : 'bg-white dark:bg-[#141414] text-[#6B655F] dark:text-[#888888] border-[#E5DFD3] dark:border-[#333333] hover:text-[#1C1917] dark:hover:text-white'
                          }`}
                        >
                          15 min ($300)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCraneofacial('30')}
                          className={`py-2 px-1 rounded-lg border text-[11px] font-semibold transition-all ${
                            selectedCraneofacial === '30'
                              ? 'bg-[#C9A55B] text-black border-[#C9A55B] font-bold'
                              : 'bg-white dark:bg-[#141414] text-[#6B655F] dark:text-[#888888] border-[#E5DFD3] dark:border-[#333333] hover:text-[#1C1917] dark:hover:text-white'
                          }`}
                        >
                          30 min ($500)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Duration & Price Live Box */}
                <div className="bg-[#FAF6EE] dark:bg-[#1A1813] p-4 rounded-xl border border-[#C9A55B]/40 space-y-2 text-xs">
                  <div className="flex justify-between text-[#6B655F] dark:text-[#888888]">
                    <span>Masaje Base ({duration} min):</span>
                    <span className="text-[#1C1917] dark:text-white font-medium">${baseMassagePrice.toLocaleString()} MXN</span>
                  </div>
                  {extrasTotalPrice > 0 && (
                    <div className="flex justify-between text-[#6B655F] dark:text-[#888888]">
                      <span>Servicios Extras (+{reflexologyDuration + craneofacialDuration} min):</span>
                      <span className="text-[#806020] dark:text-[#C9A55B] font-medium">+${extrasTotalPrice.toLocaleString()} MXN</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-[#E5DFD3] dark:border-[#333333] flex justify-between items-center text-sm font-bold">
                    <span className="text-[#1C1917] dark:text-white flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#C9A55B]" />
                      <span>Tiempo Total: {totalServiceDurationMinutes} Minutos</span>
                    </span>
                    <span className="text-[#806020] dark:text-[#C9A55B] text-base">${rawPrice.toLocaleString()} MXN</span>
                  </div>
                </div>

                {/* Date & Time Picker */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E5DFD3] dark:border-[#222222]">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] font-semibold flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#C9A55B]" />
                      <span>Fecha del Servicio</span>
                    </label>
                    <input 
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-4 py-3 text-sm text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] font-semibold flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#C9A55B]" />
                      <span>Horario Sugerido</span>
                    </label>
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-4 py-3 text-sm text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                    >
                      {['09:00', '11:00', '13:00', '15:00', '17:00', '18:00', '19:30', '21:00'].map((t) => (
                        <option key={t} value={t} className="bg-white dark:bg-[#141414] text-[#1C1917] dark:text-white">{t} hrs</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Location / Domicilio Address */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] font-semibold flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#C9A55B]" />
                      <span>Domicilio de Servicio (Residencia o Hotel VIP)</span>
                    </label>
                    <button 
                      onClick={() => getPosition()}
                      disabled={geolocLoading}
                      className="text-[10px] font-bold text-[#C9A55B] flex items-center gap-1 hover:underline disabled:opacity-50"
                    >
                      {geolocLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <LocateFixed className="w-3 h-3" />}
                      <span>{geolocLoading ? 'Ubicando...' : 'Usar Ubicación Actual'}</span>
                    </button>
                  </div>
                  <input 
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle, Número, Colonia, Piso / Suite..."
                    className="w-full bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-4 py-3 text-sm text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                  />
                  <p className="text-[11px] text-[#6B655F] dark:text-[#888888] flex items-center space-x-1 mt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#C9A55B]" />
                    <span>Cobertura activa confirmada para {cityZone}</span>
                  </p>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-[#E5DFD3] dark:border-[#C9A55B]/15">
                  <button
                    onClick={() => setStep(1)}
                    className="px-5 py-2.5 rounded-xl border border-[#E5DFD3] dark:border-[#333333] text-xs text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white"
                  >
                    Atrás
                  </button>

                  <button
                    onClick={() => setStep(3)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-[#C9A55B] to-[#B38F43] text-black font-semibold px-6 py-3 rounded-xl gold-button-hover"
                  >
                    <span>Siguiente: Personalizar Lujo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: LUXURY PREFERENCES */}
            {step === 3 && (
              <div className="max-w-2xl mx-auto space-y-8 bg-white dark:bg-[#141414] p-6 sm:p-8 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/20 shadow-sm">
                <div className="border-b border-[#E5DFD3] dark:border-[#C9A55B]/20 pb-4">
                  <span className="text-xs text-[#806020] dark:text-[#C9A55B] uppercase tracking-widest font-bold">Personalización de Experiencia</span>
                  <h3 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white mt-1">Configura tus Detalles Preferidos</h3>
                </div>

                {/* Therapist Gender Preference */}
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] font-semibold block">
                    Preferencia de Género del Terapeuta
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { id: 'femenino', label: 'Terapeuta Femenino' },
                      { id: 'masculino', label: 'Terapeuta Masculino' },
                      { id: 'sin_preferencia', label: 'Sin Preferencia' }
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setPreferences(prev => ({ ...prev, genderPreference: g.id as any }))}
                        className={`py-3 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          preferences.genderPreference === g.id
                            ? 'bg-[#C9A55B]/20 border-[#C9A55B] text-[#806020] dark:text-[#C9A55B] font-bold'
                            : 'bg-[#F5F1EA] dark:bg-[#1A1A1A] border-[#E5DFD3] dark:border-[#333333] text-[#6B655F] dark:text-[#AAAAAA]'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pressure Level */}
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] font-semibold flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#C9A55B]" />
                    <span>Nivel de Presión Muscular</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(['Suave', 'Media', 'Firme', 'Profunda'] as PressureLevel[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPreferences(prev => ({ ...prev, pressureLevel: p }))}
                        className={`py-3 px-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                          preferences.pressureLevel === p
                            ? 'bg-[#C9A55B]/20 border-[#C9A55B] text-[#806020] dark:text-[#C9A55B] font-bold'
                            : 'bg-[#F5F1EA] dark:bg-[#1A1A1A] border-[#E5DFD3] dark:border-[#333333] text-[#6B655F] dark:text-[#AAAAAA]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Essential Oil Aromatherapy */}
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] font-semibold flex items-center space-x-1.5">
                    <Droplets className="w-3.5 h-3.5 text-[#C9A55B]" />
                    <span>Aceite Esencial para la Sesión</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {OIL_OPTIONS.map((oil) => (
                      <button
                        key={oil.id}
                        type="button"
                        onClick={() => setPreferences(prev => ({ ...prev, essentialOil: oil.id as EssentialOil }))}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          preferences.essentialOil === oil.id
                            ? 'bg-[#C9A55B]/20 border-[#C9A55B] text-[#806020] dark:text-[#C9A55B] font-bold shadow-xs'
                            : 'bg-[#F5F1EA] dark:bg-[#1A1A1A] border-[#E5DFD3] dark:border-[#333333] text-[#6B655F] dark:text-[#AAAAAA]'
                        }`}
                      >
                        <span className="text-xs font-bold block">{oil.label}</span>
                        <span className="text-[10px] opacity-70 block mt-0.5">{oil.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ambient Music */}
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] font-semibold flex items-center space-x-1.5">
                    <Music className="w-3.5 h-3.5 text-[#C9A55B]" />
                    <span>Ambiente Sonoro</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MUSIC_OPTIONS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPreferences(prev => ({ ...prev, musicStyle: m.id as MusicStyle }))}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          preferences.musicStyle === m.id
                            ? 'bg-[#C9A55B]/20 border-[#C9A55B] text-[#806020] dark:text-[#C9A55B] font-bold shadow-xs'
                            : 'bg-[#F5F1EA] dark:bg-[#1A1A1A] border-[#E5DFD3] dark:border-[#333333] text-[#6B655F] dark:text-[#AAAAAA]'
                        }`}
                      >
                        <span className="text-xs font-bold block">{m.label}</span>
                        <span className="text-[10px] opacity-70 block mt-0.5">{m.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Special Instructions - Field 1: Pain Points */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] font-semibold block">
                    ¿Tienes algún punto de dolor o zona que quieras que trabajemos especialmente?
                  </label>
                  <textarea
                    rows={2}
                    value={preferences.painPoints || ''}
                    onChange={(e) => setPreferences(prev => ({ ...prev, painPoints: e.target.value }))}
                    placeholder="Ej. espalda baja, cuello, hombros, piernas..."
                    className="w-full bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl p-3 text-sm text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                  ></textarea>
                </div>

                {/* Special Instructions - Field 2: Home Arrival Instructions */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] font-semibold block">
                    Indicaciones para llegar a tu domicilio
                  </label>
                  <textarea
                    rows={2}
                    value={preferences.arrivalInstructions || ''}
                    onChange={(e) => setPreferences(prev => ({ ...prev, arrivalInstructions: e.target.value }))}
                    placeholder="Escribe referencias o instrucciones para que la terapeuta pueda llegar fácilmente a tu domicilio (privada, número interior, timbre, referencias)."
                    className="w-full bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl p-3 text-sm text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
                  ></textarea>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-[#E5DFD3] dark:border-[#C9A55B]/15">
                  <button
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 rounded-xl border border-[#E5DFD3] dark:border-[#333333] text-xs text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white"
                  >
                    Atrás
                  </button>

                  <button
                    onClick={() => setStep(4)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-[#C9A55B] to-[#B38F43] text-black font-semibold px-6 py-3 rounded-xl gold-button-hover"
                  >
                    <span>Siguiente: Terapeuta</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: SELECT THERAPIST GENDER PREFERENCE */}
            {step === 4 && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center space-y-1">
                  <h3 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white">Preferencia de Terapeuta</h3>
                  <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                    Selecciona el género de terapeuta que prefieres para tu sesión. ESSENYA asignará automáticamente al profesional certificado disponible en tu zona.
                  </p>
                </div>

                {/* Gender Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 1: Mujer (Femenino) */}
                  <div
                    onClick={() => setPreferences(prev => ({ ...prev, genderPreference: 'femenino' }))}
                    className={`p-6 rounded-2xl border cursor-pointer transition-all space-y-4 text-center ${
                      preferences.genderPreference === 'femenino'
                        ? 'bg-[#C9A55B]/15 dark:bg-[#C9A55B]/20 border-[#C9A55B] ring-2 ring-[#C9A55B] shadow-lg shadow-[#C9A55B]/15'
                        : 'bg-white dark:bg-[#141414] border-[#E5DFD3] dark:border-[#C9A55B]/20 hover:border-[#C9A55B]'
                    }`}
                  >
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#E6CA65] to-[#C9A55B] flex items-center justify-center text-black shadow-md">
                      <Users className="w-8 h-8 text-black" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-lg text-[#1C1917] dark:text-white">Terapeuta Mujer</h4>
                      <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] mt-1">
                        Especialista fisioterapeuta o cosmiatra mujer con certificación internacional CIBTAC.
                      </p>
                    </div>
                    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase ${
                      preferences.genderPreference === 'femenino'
                        ? 'bg-[#C9A55B] text-black font-extrabold'
                        : 'bg-[#F5F1EA] dark:bg-[#222222] text-[#806020] dark:text-[#C9A55B]'
                    }`}>
                      {preferences.genderPreference === 'femenino' ? '✓ Seleccionado' : 'Elegir Mujer'}
                    </span>
                  </div>

                  {/* Option 2: Hombre (Masculino) */}
                  <div
                    onClick={() => setPreferences(prev => ({ ...prev, genderPreference: 'masculino' }))}
                    className={`p-6 rounded-2xl border cursor-pointer transition-all space-y-4 text-center ${
                      preferences.genderPreference === 'masculino'
                        ? 'bg-[#C9A55B]/15 dark:bg-[#C9A55B]/20 border-[#C9A55B] ring-2 ring-[#C9A55B] shadow-lg shadow-[#C9A55B]/15'
                        : 'bg-white dark:bg-[#141414] border-[#E5DFD3] dark:border-[#C9A55B]/20 hover:border-[#C9A55B]'
                    }`}
                  >
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#E6CA65] to-[#9A7B38] flex items-center justify-center text-black shadow-md">
                      <UserCheck className="w-8 h-8 text-black" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-lg text-[#1C1917] dark:text-white">Terapeuta Hombre</h4>
                      <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] mt-1">
                        Especialista fisioterapeuta hombre capacitado en masajes profundos, deportivos y descontracturantes.
                      </p>
                    </div>
                    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase ${
                      preferences.genderPreference === 'masculino'
                        ? 'bg-[#C9A55B] text-black font-extrabold'
                        : 'bg-[#F5F1EA] dark:bg-[#222222] text-[#806020] dark:text-[#C9A55B]'
                    }`}>
                      {preferences.genderPreference === 'masculino' ? '✓ Seleccionado' : 'Elegir Hombre'}
                    </span>
                  </div>

                  {/* Option 3: Sin Preferencia (Indistinto) */}
                  <div
                    onClick={() => setPreferences(prev => ({ ...prev, genderPreference: 'sin_preferencia' }))}
                    className={`p-6 rounded-2xl border cursor-pointer transition-all space-y-4 text-center ${
                      preferences.genderPreference === 'sin_preferencia'
                        ? 'bg-[#C9A55B]/15 dark:bg-[#C9A55B]/20 border-[#C9A55B] ring-2 ring-[#C9A55B] shadow-lg shadow-[#C9A55B]/15'
                        : 'bg-white dark:bg-[#141414] border-[#E5DFD3] dark:border-[#C9A55B]/20 hover:border-[#C9A55B]'
                    }`}
                  >
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#E6CA65] via-[#C9A55B] to-[#9A7B38] flex items-center justify-center text-black shadow-md">
                      <Sparkles className="w-8 h-8 text-black" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-lg text-[#1C1917] dark:text-white">Indistinto / Asignación Rápida</h4>
                      <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] mt-1">
                        Asigna a la o el terapeuta mejor calificado con el tiempo de llegada más rápido a tu ubicación.
                      </p>
                    </div>
                    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase ${
                      preferences.genderPreference === 'sin_preferencia'
                        ? 'bg-[#C9A55B] text-black font-extrabold'
                        : 'bg-[#F5F1EA] dark:bg-[#222222] text-[#806020] dark:text-[#C9A55B]'
                    }`}>
                      {preferences.genderPreference === 'sin_preferencia' ? '✓ Seleccionado' : 'Indistinto'}
                    </span>
                  </div>
                </div>

                {/* System Protocol Notice */}
                <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-4 rounded-xl border border-[#E5DFD3] dark:border-[#C9A55B]/30 flex items-start space-x-3 text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                  <ShieldCheck className="w-5 h-5 text-[#C9A55B] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#1C1917] dark:text-white block">Asignación Directa y Confidencial ESSENYA:</span>
                    <span>
                      Usted no necesita seleccionar individualmente a la persona; el Centro de Operaciones ESSENYA coordinará el envío del especialista (hombre o mujer) con kit VIP completo para su cita.
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6">
                  <button
                    onClick={() => setStep(3)}
                    className="px-5 py-2.5 rounded-xl border border-[#333333] text-xs text-[#AAAAAA] hover:text-white"
                  >
                    Atrás
                  </button>

                  <button
                    onClick={() => setStep(5)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-[#C9A55B] to-[#B38F43] text-black font-semibold px-6 py-3 rounded-xl gold-button-hover"
                  >
                    <span>Siguiente: Resumen de Pago</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: SUMMARY & PAYMENT CONFIRMATION */}
            {step === 5 && selectedService && (
              <div className="max-w-2xl mx-auto bg-white dark:bg-[#141414] p-6 sm:p-8 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/30 space-y-6 shadow-xl">
                <div className="text-center space-y-1 border-b border-[#E5DFD3] dark:border-[#C9A55B]/20 pb-4">
                  <span className="text-xs text-[#806020] dark:text-[#C9A55B] uppercase tracking-widest font-bold">Resumen Final de Reserva</span>
                  <h3 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white">Confirmación de la Experiencia</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-[#E5DFD3] dark:border-[#222222]">
                    <span className="text-[#6B655F] dark:text-[#AAAAAA]">Ritual Seleccionado:</span>
                    <span className="font-bold text-[#1C1917] dark:text-white text-sm">{selectedService?.name}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-[#E5DFD3] dark:border-[#222222]">
                    <span className="text-[#6B655F] dark:text-[#AAAAAA]">Duración Masaje Base:</span>
                    <span className="font-bold text-[#1C1917] dark:text-white">{duration} Minutos</span>
                  </div>

                  {extrasTotalPrice > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-[#E5DFD3] dark:border-[#222222]">
                      <span className="text-[#6B655F] dark:text-[#AAAAAA]">Extras Seleccionados:</span>
                      <span className="font-bold text-[#806020] dark:text-[#C9A55B] text-right">
                        {[
                          selectedReflexology !== 'none' ? `Reflexología (${selectedReflexology}m)` : null,
                          selectedCraneofacial !== 'none' ? `Craneofacial (${selectedCraneofacial}m)` : null
                        ].filter(Boolean).join(' + ')}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-2 border-b border-[#E5DFD3] dark:border-[#222222]">
                    <span className="text-[#6B655F] dark:text-[#AAAAAA]">Tiempo Total del Servicio:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{totalServiceDurationMinutes} Minutos</span>
                  </div>

                  {selectedService.requiresDualTherapist && (
                    <div className="bg-[#FAF6EE] dark:bg-[#1A1813] p-3 rounded-xl border border-[#C9A55B]/40 space-y-1 my-1">
                      <span className="text-[11px] font-bold text-[#806020] dark:text-[#C9A55B] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Asignación de 2 Masajistas</span>
                      </span>
                      <p className="text-[11px] text-[#6B655F] dark:text-[#AAAAAA]">
                        {selectedService.therapistAssignmentNote || '2 terapeutas profesionales enviadas a tu domicilio.'}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-2 border-b border-[#E5DFD3] dark:border-[#222222]">
                    <span className="text-[#6B655F] dark:text-[#AAAAAA]">Aceite Esencial:</span>
                    <span className="font-bold text-[#1C1917] dark:text-white">{preferences.essentialOil}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-[#E5DFD3] dark:border-[#222222]">
                    <span className="text-[#6B655F] dark:text-[#AAAAAA]">Ambiente Sonoro:</span>
                    <span className="font-bold text-[#1C1917] dark:text-white">{preferences.musicStyle}</span>
                  </div>

                  {preferences.painPoints && (
                    <div className="flex justify-between items-center py-2 border-b border-[#E5DFD3] dark:border-[#222222]">
                      <span className="text-[#6B655F] dark:text-[#AAAAAA]">Zonas de Atención:</span>
                      <span className="font-bold text-[#806020] dark:text-[#C9A55B] text-right max-w-xs">{preferences.painPoints}</span>
                    </div>
                  )}

                  {preferences.arrivalInstructions && (
                    <div className="flex justify-between items-center py-2 border-b border-[#E5DFD3] dark:border-[#222222]">
                      <span className="text-[#6B655F] dark:text-[#AAAAAA]">Indicaciones Llegada:</span>
                      <span className="font-bold text-[#1C1917] dark:text-white text-right max-w-xs">{preferences.arrivalInstructions}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-2 border-b border-[#E5DFD3] dark:border-[#222222]">
                    <span className="text-[#6B655F] dark:text-[#AAAAAA]">Preferencia Terapeuta:</span>
                    <span className="font-bold text-[#806020] dark:text-[#C9A55B] capitalize">
                      {preferences.genderPreference === 'femenino' ? 'Mujer' : preferences.genderPreference === 'masculino' ? 'Hombre' : 'Indistinto'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-[#E5DFD3] dark:border-[#222222]">
                    <span className="text-[#6B655F] dark:text-[#AAAAAA]">Fecha y Hora:</span>
                    <span className="font-bold text-[#1C1917] dark:text-white">{selectedDate} a las {selectedTime} hrs</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-[#E5DFD3] dark:border-[#222222]">
                    <span className="text-[#6B655F] dark:text-[#AAAAAA]">Domicilio de Atención:</span>
                    <span className="font-bold text-[#1C1917] dark:text-white text-right max-w-xs">{address}</span>
                  </div>
                </div>

                {/* Coupon Code & Membership Benefits Section */}
                <div className="pt-2 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-[#6B655F] dark:text-[#AAAAAA] uppercase font-semibold block">
                      ¿Tienes un Cupón Promocional o Beneficio VIP?
                    </label>
                    <span className="text-[10px] text-[#806020] dark:text-[#C9A55B] font-bold">
                      Nivel: {currentTierData.fullLabel}
                    </span>
                  </div>

                  {appliedPromo ? (
                    <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-3 flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{appliedPromo.label}</span>
                        </div>
                        <p className="text-[11px] text-[#6B655F] dark:text-[#AAAAAA]">
                          Código <span className="font-mono font-bold text-[#806020] dark:text-[#E6CA65]">{appliedPromo.code}</span> activo • Descuento: -${promoDiscountAmount.toLocaleString()} MXN
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="text-[11px] text-red-600 dark:text-red-400 font-bold hover:underline px-2 py-1"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <input 
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="Ej. DIAMOND10, VIP15 o GOLD2026"
                          className="flex-1 bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white uppercase focus:outline-none focus:border-[#C9A55B]"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyCoupon()}
                          className="px-4 py-2 bg-[#F5F1EA] dark:bg-[#222222] border border-[#C9A55B]/40 text-[#806020] dark:text-[#C9A55B] font-semibold text-xs rounded-xl hover:bg-[#C9A55B] hover:text-black transition-colors"
                        >
                          Aplicar
                        </button>
                      </div>

                      {/* Quick access pills for eligible codes */}
                      <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                        {currentTierData.level >= 3 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCouponCode('DIAMOND10');
                              handleApplyCoupon('DIAMOND10');
                            }}
                            className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-400/30 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-sky-500/20 transition-all cursor-pointer"
                          >
                            <Gem className="w-3 h-3 text-sky-500" />
                            <span>Usar DIAMOND10 (10% OFF)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setCouponCode('DIAMOND10');
                              handleApplyCoupon('DIAMOND10');
                            }}
                            className="text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 text-[10px] flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/20 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-red-300 dark:hover:border-red-800 transition-all cursor-pointer"
                            title="Haz clic para verificar requisitos de categoría"
                          >
                            <Lock className="w-3 h-3 text-zinc-400" />
                            <span>DIAMOND10 (Solo Socios Diamante en adelante)</span>
                          </button>
                        )}

                        {completedMassagesCount >= 5 && !getVipCourtesyStatus(completedMassagesCount).used ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCouponCode('VIP15');
                              handleApplyCoupon('VIP15');
                            }}
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-emerald-500/20 transition-all cursor-pointer"
                          >
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            <span>Usar VIP15 (15% Cortesía)</span>
                          </button>
                        ) : completedMassagesCount < 5 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCouponCode('VIP15');
                              handleApplyCoupon('VIP15');
                            }}
                            className="text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 text-[10px] flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/20 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-red-300 dark:hover:border-red-800 transition-all cursor-pointer"
                            title="Haz clic para verificar requisitos de fidelidad"
                          >
                            <Lock className="w-3 h-3 text-zinc-400" />
                            <span>VIP15 (Requiere 5 masajes concluidos: {completedMassagesCount}/5)</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tarjeta de Regalo Recibida ($1,400 MXN) — Billetera ESSENYA Section */}
                <div className="pt-2">
                  <div className="bg-gradient-to-br from-[#FAF8F5] via-white to-[#FAF8F5] dark:from-[#1A1A1A] dark:via-[#141414] dark:to-[#1A1A1A] p-4 rounded-2xl border border-[#C9A55B]/40 space-y-3 shadow-xs">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-lg bg-[#C9A55B]/20 text-[#806020] dark:text-[#E6CA65]">
                          <Gift className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#1C1917] dark:text-white block">
                            ¿Te obsequiaron una Tarjeta de Regalo ESSENYA? ($1,400 MXN)
                          </span>
                          <span className="text-[10px] text-[#6B655F] dark:text-[#AAAAAA]">
                            Ingresa el código que te regalaron para aplicar su saldo monetario a esta reserva.
                          </span>
                        </div>
                      </div>

                      {appliedGiftCard && (
                        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          Aplicada
                        </span>
                      )}
                    </div>

                    {appliedGiftCard ? (
                      <div className="bg-white dark:bg-[#202020] p-3 rounded-xl border border-[#C9A55B]/30 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-[#6B655F] dark:text-[#AAAAAA]">Tarjeta Activa:</span>
                          <span className="font-mono font-bold text-[#806020] dark:text-[#E6CA65]">{appliedGiftCard.code}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#6B655F] dark:text-[#AAAAAA]">Saldo Total en Tarjeta:</span>
                          <span className="font-bold text-[#1C1917] dark:text-white">${appliedGiftCard.currentBalance.toLocaleString()} MXN</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                          <span>Saldo a Descontar en esta Cita:</span>
                          <span>-${giftCardDeduction.toLocaleString()} MXN</span>
                        </div>
                        <div className="flex justify-between items-center text-[#806020] dark:text-[#E6CA65] font-semibold border-t border-dashed border-[#E5DFD3] dark:border-[#333333] pt-1.5 text-[11px]">
                          <span>Saldo Remanente Conservado:</span>
                          <span>${giftCardRemainingBalance.toLocaleString()} MXN</span>
                        </div>
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={handleRemoveGiftCard}
                            className="text-[11px] text-red-600 dark:text-red-400 font-bold hover:underline"
                          >
                            Quitar Tarjeta de Regalo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={giftCardCodeInput}
                          onChange={(e) => setGiftCardCodeInput(e.target.value)}
                          placeholder="Ingresa código recibido (ej. REGALO-ESS-1400)"
                          className="flex-1 bg-white dark:bg-[#202020] border border-[#E5DFD3] dark:border-[#333333] rounded-xl px-3 py-2 text-xs text-[#1C1917] dark:text-white uppercase focus:outline-none focus:border-[#C9A55B]"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyGiftCard()}
                          className="px-4 py-2 bg-[#C9A55B] hover:bg-[#E6CA65] text-black font-bold text-xs rounded-xl transition-all shadow-xs"
                        >
                          Aplicar Saldo
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tip Notice & Option */}
                <div className="pt-2 space-y-2 bg-[#FAF6EE] dark:bg-[#1C1A17] p-4 rounded-2xl border border-[#C9A55B]/30">
                  <div className="flex items-start space-x-2">
                    <span className="text-[#C9A55B] text-base">💡</span>
                    <div>
                      <label className="text-xs font-bold text-[#1C1917] dark:text-white uppercase tracking-wider block">
                        Propina a tu elección (En efectivo directamente con la terapeuta)
                      </label>
                      <p className="text-[11px] text-[#6B655F] dark:text-[#AAAAAA] mt-0.5">
                        La propina o gratificación <strong>no es obligatoria</strong>. Si deseas reconocer la atención de tu terapeuta, puedes entregársela en efectivo al finalizar el servicio.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Method Options Selection */}
                {totalPrice === 0 && giftCardDeduction > 0 ? (
                  <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 p-4 rounded-xl flex items-center space-x-3 text-xs text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold block">Reserva 100% Cubierta con Tarjeta de Regalo:</span>
                      <span>
                        El costo total de tu experiencia ha sido cubierto con tu Tarjeta de Regalo. Tu saldo remanente de <strong className="text-[#806020] dark:text-[#E6CA65]">${giftCardRemainingBalance.toLocaleString()} MXN</strong> permanece en tu Billetera para futuras citas.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 space-y-3">
                    <label className="text-xs text-[#6B655F] dark:text-[#AAAAAA] uppercase font-semibold block">
                      Selecciona tu Método de Pago
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Option 2: Transferencia Bancaria SPEI */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethodType('transferencia')}
                        className={`p-3.5 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all text-xs font-bold ${
                          paymentMethodType === 'transferencia'
                            ? 'bg-[#C9A55B]/15 border-[#C9A55B] text-[#806020] dark:text-[#C9A55B] ring-1 ring-[#C9A55B]'
                            : 'bg-[#F5F1EA] dark:bg-[#1A1A1A] border-[#E5DFD3] dark:border-[#333333] text-[#6B655F] dark:text-[#AAAAAA]'
                        }`}
                      >
                        <Building2 className="w-5 h-5 text-[#C9A55B]" />
                        <span>Transferencia (SPEI)</span>
                      </button>

                      {/* Option 3: Efectivo (Pago al Recibir) */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethodType('efectivo')}
                        className={`p-3.5 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all text-xs font-bold ${
                          paymentMethodType === 'efectivo'
                            ? 'bg-[#C9A55B]/15 border-[#C9A55B] text-[#806020] dark:text-[#C9A55B] ring-1 ring-[#C9A55B]'
                            : 'bg-[#F5F1EA] dark:bg-[#1A1A1A] border-[#E5DFD3] dark:border-[#333333] text-[#6B655F] dark:text-[#AAAAAA]'
                        }`}
                      >
                        <Banknote className="w-5 h-5 text-[#C9A55B]" />
                        <span>Efectivo (Pago al Recibir)</span>
                      </button>
                    </div>


                    {paymentMethodType === 'transferencia' && (
                      <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-4 rounded-xl border border-[#C9A55B]/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#806020] dark:text-[#C9A55B] flex items-center">
                            <Building2 className="w-4 h-4 mr-1.5 text-[#C9A55B]" />
                            Datos para Transferencia Interbancaria (SPEI)
                          </span>
                          <span className="text-[10px] text-[#C9A55B] font-bold">BBVA Mexico</span>
                        </div>

                        <div className="bg-white dark:bg-[#141414] p-3 rounded-lg border border-[#E5DFD3] dark:border-[#333333] space-y-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-[#6B655F] dark:text-[#AAAAAA]">CLABE Interbancaria:</span>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-[#1C1917] dark:text-white">012180001234567890</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText('012180001234567890');
                                  setClabeCopied(true);
                                  setTimeout(() => setClabeCopied(false), 2000);
                                }}
                                className="text-[10px] bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] px-2 py-0.5 rounded border border-[#C9A55B]/30 font-bold flex items-center space-x-1"
                              >
                                {clabeCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                <span>{clabeCopied ? 'Copiado' : 'Copiar'}</span>
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#6B655F] dark:text-[#AAAAAA]">Beneficiario:</span>
                            <span className="font-bold text-[#1C1917] dark:text-white">ESSENYA S.A. DE C.V.</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#6B655F] dark:text-[#AAAAAA]">Banco Receptivo:</span>
                            <span className="font-bold text-[#1C1917] dark:text-white">BBVA México</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentMethodType === 'efectivo' && (
                      <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-4 rounded-xl border border-[#C9A55B]/50 space-y-2">
                        <div className="flex items-center space-x-2 text-xs font-bold text-[#806020] dark:text-[#C9A55B]">
                          <Banknote className="w-4 h-4 text-[#C9A55B]" />
                          <span>Pago en Efectivo (Pago al Recibir)</span>
                        </div>
                        <p className="text-xs text-[#1C1917] dark:text-white font-medium">
                          Pago en efectivo directo a la masajista antes de iniciar el masaje.
                        </p>
                        <p className="text-[11px] text-[#6B655F] dark:text-[#AAAAAA]">
                          Se solicita entregar el importe exacto de <strong className="text-[#806020] dark:text-[#C9A55B]">${totalPrice.toLocaleString()} MXN</strong> al momento de recibir a la terapeuta en tu domicilio.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Financial Summary Box */}
                <div className="bg-[#F5F1EA] dark:bg-[#1F1F1F] p-5 rounded-xl border border-[#E5DFD3] dark:border-[#C9A55B]/30 space-y-2 shadow-xs">
                  <div className="flex justify-between text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                    <span>Masaje Base ({selectedService?.name} - {duration} min):</span>
                    <span>${baseMassagePrice.toLocaleString()} MXN</span>
                  </div>

                  {extrasTotalPrice > 0 && (
                    <div className="flex justify-between text-xs text-[#806020] dark:text-[#C9A55B]">
                      <span>Servicios Extras (+{reflexologyDuration + craneofacialDuration} min):</span>
                      <span>+${extrasTotalPrice.toLocaleString()} MXN</span>
                    </div>
                  )}

                  {promoDiscountAmount > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                      <span>Descuento {appliedPromo ? appliedPromo.label : 'Cupón VIP'}:</span>
                      <span>-${promoDiscountAmount.toLocaleString()} MXN</span>
                    </div>
                  )}

                  {giftCardDeduction > 0 && (
                    <div className="flex justify-between text-xs text-[#806020] dark:text-[#E6CA65] font-bold">
                      <span>Saldo Tarjeta de Regalo Aplicado:</span>
                      <span>-${giftCardDeduction.toLocaleString()} MXN</span>
                    </div>
                  )}

                  {appliedGiftCard && (
                    <div className="flex justify-between text-[11px] text-[#6B655F] dark:text-[#888888] italic">
                      <span>Saldo remanente conservado en Tarjeta:</span>
                      <span>${giftCardRemainingBalance.toLocaleString()} MXN</span>
                    </div>
                  )}

                  <div className="flex justify-between text-base font-bold text-[#1C1917] dark:text-white pt-2 border-t border-[#E5DFD3] dark:border-[#333333]">
                    <span>Total a Cargo:</span>
                    <span className="text-xl text-[#806020] dark:text-gold-gradient">${totalPrice.toLocaleString()} MXN</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    onClick={() => setStep(4)}
                    className="px-5 py-2.5 rounded-xl border border-[#E5DFD3] dark:border-[#333333] text-xs text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white"
                  >
                    Atrás
                  </button>

                  <button
                    onClick={handleConfirmBooking}
                    disabled={isSubmittingBooking}
                    className={`flex items-center space-x-2 bg-gradient-to-r from-[#E6CA65] via-[#C9A55B] to-[#9A7B38] text-black font-extrabold text-sm px-8 py-3.5 rounded-xl gold-button-hover shadow-lg shadow-[#C9A55B]/20 transition-all ${isSubmittingBooking ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmittingBooking ? (
                      <>
                        <RefreshCw className="w-5 h-5 text-black animate-spin" />
                        <span>Guardando en Central ESSENYA...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-black" />
                        <span>Confirmar y Reservar Cita</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE TRACKING & GPS SIMULATOR */}
        {activeTab === 'tracking' && activeBooking && (
          <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header Status Banner */}
            <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] ring-2 ring-[#22C55E]/40"></span>
                  <span className="text-xs text-[#16A34A] dark:text-[#22C55E] uppercase font-bold tracking-widest">Seguimiento en Vivo Activo • Cita: {activeBooking.code}</span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white mt-1">{activeBooking.serviceName}</h3>
                <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] mt-1">{activeBooking.clientAddress}</p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowChat(true)}
                  className="flex items-center space-x-2 bg-[#FAF6EE] dark:bg-[#222222] border border-[#C9A55B]/40 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#806020] dark:text-[#C9A55B] hover:bg-[#C9A55B] hover:text-black transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat con Terapeuta</span>
                </button>
              </div>
            </div>

            {/* Stepper Status Bar */}
            <div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/20 space-y-4 shadow-sm">
              <h4 className="text-xs uppercase text-[#6B655F] dark:text-[#AAAAAA] tracking-wider font-semibold">Estado de Progreso en Tiempo Real</h4>
              
              {activeBooking.state === 'rechazada' ? (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-center text-rose-500 dark:text-rose-400 font-bold text-sm">
                  🛑 Solicitud Rechazada por la Administración
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 text-center">
                  {[
                    { stateKey: 'pendiente', label: '1. Solicitud' },
                    { stateKey: 'aceptada', label: '2. Aceptada' },
                    { stateKey: 'aceptada', label: '3. Agenda' },
                    { stateKey: 'en_camino', label: '4. En Camino' },
                    { stateKey: 'llegue', label: '5. Llegué' },
                    { stateKey: 'servicio_iniciado', label: '6. Sesión' },
                    { stateKey: 'servicio_finalizado', label: '7. Concluido' }
                  ].map((st) => {
                    const isCurrent = activeBooking.state === st.stateKey;
                    return (
                      <div
                        key={st.stateKey}
                        className={`p-3 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-[#C9A55B] text-black font-extrabold border-[#C9A55B] shadow-lg shadow-[#C9A55B]/20'
                            : 'bg-[#F5F1EA] dark:bg-[#1A1A1A] text-[#6B655F] dark:text-[#888888] border-[#E5DFD3] dark:border-[#333333] hover:text-[#1C1917] dark:hover:text-white'
                        }`}
                      >
                        <span className="text-xs block">{st.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="text-xs text-center text-[#6B655F] dark:text-[#AAAAAA] pt-2">
              </div>
            </div>

            {/* Live GPS Google Maps SDK View & Therapist Card Grid */}
            {activeBooking.state === 'rechazada' ? (
              <div className="bg-white dark:bg-[#141414] p-8 sm:p-10 rounded-2xl border-2 border-rose-500/40 text-center space-y-5 shadow-sm">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping"></div>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/30 z-10 text-2xl">
                    ❌
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="bg-rose-500/15 text-rose-700 dark:text-rose-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-rose-500/30">
                    Solicitud Rechazada por la Administración
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white">Lo sentimos, tu solicitud no ha podido ser procesada</h3>
                  <p className="text-sm text-[#6B655F] dark:text-[#AAAAAA] max-w-md mx-auto">
                    La administración central de ESSENYA ha evaluado tu solicitud y no ha sido aprobada en esta ocasión.
                  </p>
                  
                  {activeBooking.motivoRechazo && (
                    <div className="bg-rose-500/5 dark:bg-rose-950/10 p-4 rounded-xl border border-rose-500/20 max-w-lg mx-auto text-sm text-rose-700 dark:text-rose-300 mt-2">
                      <strong>Motivo del rechazo:</strong> "{activeBooking.motivoRechazo}"
                    </div>
                  )}

                  <p className="text-xs text-[#6B655F] dark:text-[#888888] italic pt-2">
                    Si tienes alguna duda o deseas reprogramar con otros datos, por favor contacta con soporte o inicia una nueva solicitud.
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E5DFD3] dark:border-[#262626] max-w-xs mx-auto flex justify-center">
                  <button
                    onClick={() => setActiveTab('book')}
                    className="bg-[#C9A55B] text-black font-bold px-5 py-2 rounded-xl text-xs hover:bg-[#E6CA65] transition-all cursor-pointer shadow-sm"
                  >
                    Crear Nueva Solicitud
                  </button>
                </div>
              </div>
            ) : (!activeBooking.therapistId || activeBooking.state === 'pendiente' || activeBooking.state === 'aceptada') ? (
              <div className="bg-white dark:bg-[#141414] p-8 sm:p-10 rounded-2xl border-2 border-dashed border-[#C9A55B]/40 text-center space-y-5 shadow-sm">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[#C9A55B]/20 animate-ping"></div>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#C9A55B] to-[#E6CA65] flex items-center justify-center shadow-lg shadow-[#C9A55B]/30 z-10 text-2xl">
                    🛎️
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-[#C9A55B]/30">
                    {activeBooking.state === 'pendiente' ? 'Esperando Aprobación' : 'Solicitud Aprobada por Administración'}
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white">
                    {activeBooking.state === 'pendiente' 
                      ? 'Procesando tu Solicitud...' 
                      : 'Buscando Terapeuta Certificada...'}
                  </h3>
                  <p className="text-sm text-[#6B655F] dark:text-[#AAAAAA] max-w-md mx-auto">
                    {activeBooking.state === 'pendiente' 
                      ? 'Nuestra administración central está evaluando los detalles de tu ritual para proceder con su aprobación inmediata.'
                      : `¡Excelente! Tu solicitud para ${activeBooking.serviceName} ha sido aprobada y se está asignando la mejor terapeuta certificada disponible en la zona de ${activeBooking.cityZone}.`}
                  </p>
                  <p className="text-xs text-[#6B655F] dark:text-[#888888] italic">
                    En cuanto una profesional sea asignada, verás aquí inmediatamente su <strong>nombre completo</strong>, <strong>fotografía</strong> y seguimiento en tiempo real.
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E5DFD3] dark:border-[#262626] max-w-sm mx-auto grid grid-cols-2 gap-3 text-xs text-[#6B655F] dark:text-[#AAAAAA] text-left">
                  <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-2.5 rounded-xl border border-[#E5DFD3] dark:border-[#333333]">
                    <span className="text-[10px] text-[#888888] block">Fecha & Horario</span>
                    <strong className="text-[#1C1917] dark:text-white">{activeBooking.date} • {activeBooking.time}</strong>
                  </div>
                  <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-2.5 rounded-xl border border-[#E5DFD3] dark:border-[#333333]">
                    <span className="text-[10px] text-[#888888] block">Estado Administrativo</span>
                    <strong className="text-[#1C1917] dark:text-white capitalize">
                      {activeBooking.state === 'aceptada' ? 'Aprobada (Sin Asignar)' : activeBooking.state}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Acceptance Announcement Banner */}
                <div className="bg-gradient-to-r from-[#FAF6EE] via-[#F5EEDD] to-[#FAF6EE] dark:from-[#1C1A14] dark:via-[#262218] dark:to-[#1C1A14] border-2 border-[#C9A55B] p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                  <div className="flex items-center space-x-3.5">
                    <img 
                      src={activeBooking.therapistPhoto || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'} 
                      alt={activeBooking.therapistName}
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#C9A55B] shadow-md shadow-[#C9A55B]/30"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>¡Masaje Aceptado!</span>
                        </span>
                      </div>
                      <h4 className="text-lg sm:text-xl font-serif font-bold text-[#1C1917] dark:text-white mt-0.5">
                        {activeBooking.therapistName}
                      </h4>
                      <p className="text-xs text-[#806020] dark:text-[#C9A55B] font-semibold">
                        Terapeuta Profesional Asignada • {activeBooking.therapistPhone || 'Atención VIP'}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-[#6B655F] dark:text-[#AAAAAA] uppercase font-semibold block">Tiempo Estimado de Llegada</span>
                    <span className="text-xl font-bold text-[#806020] dark:text-gold-gradient">15 - 20 minutos</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Google Maps SDK Live Tracking View */}
                  <div className="lg:col-span-2">
                    <LiveTrackingMap
                      clientAddress={activeBooking.clientAddress}
                      cityZone={activeBooking.cityZone}
                      therapistName={activeBooking.therapistName || 'Terapeuta ESSENYA'}
                      therapistPhoto={activeBooking.therapistPhoto || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80'}
                      therapistPhone={activeBooking.therapistPhone}
                      bookingState={activeBooking.state}
                    />
                  </div>

                  {/* Therapist Details Sidebar */}
                  <div className="bg-white dark:bg-[#141414] rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/20 p-6 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center border-b border-[#E5DFD3] dark:border-[#222222] pb-3">
                      <h4 className="text-xs uppercase text-[#6B655F] dark:text-[#AAAAAA] tracking-wider font-semibold">Terapeuta Confirmada</h4>
                      <span className="text-[10px] bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] font-bold px-2 py-0.5 rounded-full">
                        Certificada
                      </span>
                    </div>
                      
                    <div className="flex items-center space-x-3">
                      <img 
                        src={activeBooking?.therapistPhoto || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'} 
                        alt={activeBooking.therapistName} 
                        className="w-14 h-14 rounded-full object-cover border-2 border-[#C9A55B]"
                      />
                      <div>
                        <h5 className="font-bold text-[#1C1917] dark:text-white text-base">{activeBooking.therapistName}</h5>
                        <p className="text-xs text-[#806020] dark:text-[#C9A55B] flex items-center mt-0.5">
                          <Star className="w-3.5 h-3.5 fill-[#C9A55B] text-[#C9A55B] mr-1" />
                          <span>4.98 • Fisioterapeuta Especialista</span>
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-[#E5DFD3] dark:border-[#222222] pt-3 space-y-2 text-xs">
                      <div className="flex justify-between text-[#6B655F] dark:text-[#888888]">
                        <span>Persona que aceptó:</span>
                        <span className="text-[#1C1917] dark:text-white font-bold">{activeBooking.therapistName}</span>
                      </div>
                      <div className="flex justify-between text-[#6B655F] dark:text-[#888888]">
                        <span>Atención y Concierge:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">WhatsApp Concierge ESSENYA</span>
                      </div>
                      <div className="flex justify-between text-[#6B655F] dark:text-[#888888]">
                        <span>Aromaterapia:</span>
                        <span className="text-[#806020] dark:text-[#C9A55B] font-medium">{activeBooking.preferences.essentialOil}</span>
                      </div>
                      <div className="flex justify-between text-[#6B655F] dark:text-[#888888]">
                        <span>Presión Muscular:</span>
                        <span className="text-[#806020] dark:text-[#C9A55B] font-medium">{activeBooking.preferences.pressureLevel}</span>
                      </div>
                      {activeBooking.painPoints && (
                        <div className="flex justify-between text-[#6B655F] dark:text-[#888888]">
                          <span>Puntos a tratar:</span>
                          <span className="text-amber-600 dark:text-amber-400 font-medium">{activeBooking.painPoints}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-2">
                      <WhatsAppButton 
                        phoneNumber="525512345678"
                        message={`Hola Concierge Administrador ESSENYA, necesito asistencia con la reserva ${activeBooking.code} atendida por ${activeBooking.therapistName}.`}
                        buttonText="WhatsApp Concierge Admin"
                        variant="primary"
                        size="md"
                        className="w-full justify-center"
                      />
                      <button
                        onClick={() => setShowChat(true)}
                        className="w-full py-2.5 bg-[#FAF6EE] dark:bg-[#222222] border border-[#C9A55B]/40 text-[#806020] dark:text-[#C9A55B] font-semibold text-xs rounded-xl hover:bg-[#C9A55B] hover:text-black transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Chat con {activeBooking.therapistName}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeBooking.state === 'servicio_finalizado' && (
              <div className="bg-gradient-to-b from-[#FAF6EE] to-white dark:from-[#1C1A17] dark:to-[#141414] p-6 sm:p-8 rounded-2xl border-2 border-[#C9A55B]/60 space-y-6 shadow-xl text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DFD3] dark:border-[#C9A55B]/20 pb-4">
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-widest text-[#806020] dark:text-[#C9A55B] font-extrabold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#C9A55B]" />
                      <span>Sesión Concluida</span>
                    </span>
                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1C1917] dark:text-white">
                      ¿Cómo estuvo tu experiencia con {activeBooking.therapistName || 'tu terapeuta'}?
                    </h3>
                  </div>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full self-start sm:self-auto">
                    ✓ Servicio Finalizado
                  </span>
                </div>

                {activeBooking.rating ? (
                  <div className="bg-white dark:bg-[#181818] p-5 rounded-xl border border-[#E5DFD3] dark:border-[#333333] space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 text-[#C9A55B]">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-5 h-5 ${s <= (activeBooking.rating || 5) ? 'fill-[#C9A55B] text-[#C9A55B]' : 'text-gray-300 dark:text-gray-600'}`} />
                        ))}
                      </div>
                      <span className="font-bold text-[#1C1917] dark:text-white text-sm">
                        {activeBooking.rating} de 5 Estrellas
                      </span>
                    </div>
                    {activeBooking.reviewComment && (
                      <div className="bg-[#FAF6EE] dark:bg-[#202020] p-3 rounded-lg border border-[#E5DFD3] dark:border-[#2C2C2C]">
                        <span className="text-[11px] text-[#806020] dark:text-[#C9A55B] font-bold block mb-1">Tu mensaje dejado:</span>
                        <p className="text-[#1C1917] dark:text-white text-xs italic">"{activeBooking.reviewComment}"</p>
                      </div>
                    )}
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Calificación y mensaje enviados a {activeBooking.therapistName} y guardados en tu historial.</span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Star selector */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] font-bold block">
                          Calificación General
                        </label>
                        <span className="text-xs font-bold text-[#806020] dark:text-[#C9A55B]">
                          {(() => {
                            const val = pendingRating[activeBooking.id] || 5;
                            if (val === 5) return '⭐⭐⭐⭐⭐ Extraordinario (5/5)';
                            if (val === 4) return '⭐⭐⭐⭐ Muy Bueno (4/5)';
                            if (val === 3) return '⭐⭐⭐ Bueno (3/5)';
                            if (val === 2) return '⭐⭐ Regular (2/5)';
                            return '⭐ A Mejorar (1/5)';
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 bg-white dark:bg-[#181818] p-3 rounded-xl border border-[#E5DFD3] dark:border-[#333333] justify-center sm:justify-start">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setPendingRating(prev => ({ ...prev, [activeBooking.id]: star }))}
                            className="p-1 hover:scale-125 transition-transform cursor-pointer focus:outline-none"
                            title={`${star} estrellas`}
                          >
                            <Star
                              className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                                star <= (pendingRating[activeBooking.id] || 5)
                                  ? 'text-[#C9A55B] fill-[#C9A55B] drop-shadow-sm'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Compliment Suggestions */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-[#6B655F] dark:text-[#AAAAAA] font-semibold block">
                        Comentarios rápidos sugeridos:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'Excelente técnica y presión',
                          'Muy puntual y profesional',
                          'Aromaterapia y música relajante',
                          'Alivio total de nudos y tensión',
                          'Atención y trato impecable'
                        ].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setPendingComment(prev => {
                                const current = prev[activeBooking.id] || '';
                                if (!current) return { ...prev, [activeBooking.id]: tag };
                                if (current.includes(tag)) return prev;
                                return { ...prev, [activeBooking.id]: `${current}. ${tag}` };
                              });
                            }}
                            className="text-[11px] bg-white dark:bg-[#1F1F1F] border border-[#E5DFD3] dark:border-[#333333] hover:border-[#C9A55B] hover:text-[#806020] dark:hover:text-[#C9A55B] text-[#6B655F] dark:text-[#CCCCCC] px-2.5 py-1 rounded-full transition-colors"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Review Textarea */}
                    <div className="space-y-1.5">
                      <label className="text-xs uppercase tracking-wider text-[#6B655F] dark:text-[#AAAAAA] font-bold block">
                        Mensaje para tu Terapeuta ({activeBooking.therapistName})
                      </label>
                      <textarea
                        rows={3}
                        value={pendingComment[activeBooking.id] || ''}
                        onChange={(e) => setPendingComment(prev => ({ ...prev, [activeBooking.id]: e.target.value }))}
                        placeholder={`Escribe un mensaje o felicitación para ${activeBooking.therapistName || 'tu masajista'}...`}
                        className="w-full bg-white dark:bg-[#181818] border border-[#E5DFD3] dark:border-[#333333] rounded-xl p-3 text-xs sm:text-sm text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B] focus:ring-1 focus:ring-[#C9A55B]"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const r = pendingRating[activeBooking.id] || 5;
                        const c = pendingComment[activeBooking.id] || 'Servicio excelente y altamente recomendado.';
                        if (onRateBooking) {
                          onRateBooking(activeBooking.id, r, c);
                        }
                      }}
                      className="w-full py-3 bg-gradient-to-r from-[#C9A55B] to-[#B38F43] text-black font-bold text-sm rounded-xl hover:opacity-95 shadow-md shadow-[#C9A55B]/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <Star className="w-4 h-4 fill-black" />
                      <span>Enviar Calificación y Mensaje</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BOOKING HISTORY & INVOICES */}
        {activeTab === 'history' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center border-b border-[#E5DFD3] dark:border-[#C9A55B]/20 pb-4">
              <div>
                <h3 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white">Historial de Experiencias y Facturación</h3>
                <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">Gestiona tus facturas fiscales y consulta los registros de sesiones pasadas.</p>
              </div>
            </div>

            <div className="space-y-4">
              {bookings.map((bk) => {
                const inv = invoices.find(i => i.bookingId === bk.id);
                return (
                  <div 
                    key={bk.id}
                    className="bg-white dark:bg-[#141414] p-5 rounded-2xl border border-[#E5DFD3] dark:border-[#C9A55B]/20 space-y-4 shadow-sm"
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-xs font-bold text-[#806020] dark:text-[#C9A55B]">{bk.code}</span>
                          <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                            bk.state === 'servicio_finalizado'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-[#C9A55B]/20 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/30'
                          }`}>
                            {bk.state === 'servicio_finalizado' ? 'Finalizado' : bk.state}
                          </span>
                          <span className="text-xs text-[#6B655F] dark:text-[#888888] font-medium">({bk.paymentMethod})</span>
                        </div>
                        <h4 className="text-base font-bold text-[#1C1917] dark:text-white">{bk.serviceName}</h4>
                        <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                          {bk.date} a las {bk.time} • Terapeuta: {bk.therapistName}
                        </p>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <span className="text-xs text-[#6B655F] dark:text-[#888888] block">Monto Pagado</span>
                          <span className="text-base font-bold text-[#806020] dark:text-gold-gradient">${bk.total.toLocaleString()} MXN</span>
                        </div>

                        {inv && (
                          <button
                            onClick={() => onViewInvoice(inv)}
                            className="flex items-center space-x-1.5 bg-[#FAF6EE] dark:bg-[#222222] border border-[#C9A55B]/40 px-3.5 py-2 rounded-xl text-xs text-[#806020] dark:text-[#C9A55B] font-semibold hover:bg-[#C9A55B] hover:text-black transition-all"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Ver Factura PDF</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Rating Section for Completed Services in History */}
                    {bk.state === 'servicio_finalizado' && (
                      <div className="border-t border-[#E5DFD3] dark:border-[#222222] pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="text-[#6B655F] dark:text-[#AAAAAA] font-semibold">Puntuación a Masajista:</span>
                          {bk.rating ? (
                            <div className="flex items-center space-x-1 text-[#C9A55B]">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`w-3.5 h-3.5 ${s <= (bk.rating || 5) ? 'fill-[#C9A55B] text-[#C9A55B]' : 'text-gray-300 dark:text-gray-600'}`} />
                              ))}
                              <span className="font-bold text-[#1C1917] dark:text-white text-xs ml-1">({bk.rating}/5)</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setPendingRating(prev => ({ ...prev, [bk.id]: star }))}
                                  className="hover:scale-110 transition-transform p-0.5"
                                >
                                  <Star
                                    className={`w-4 h-4 ${
                                      star <= (pendingRating[bk.id] || 5)
                                        ? 'text-[#C9A55B] fill-[#C9A55B]'
                                        : 'text-gray-300 dark:text-gray-600'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {!bk.rating && (
                          <div className="flex items-center space-x-2 w-full sm:w-auto">
                            <input
                              type="text"
                              value={pendingComment[bk.id] || ''}
                              onChange={(e) => setPendingComment(prev => ({ ...prev, [bk.id]: e.target.value }))}
                              placeholder="Opinión / Comentarios..."
                              className="bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-lg px-2.5 py-1 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B] flex-1 sm:w-64"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const r = pendingRating[bk.id] || 5;
                                const c = pendingComment[bk.id] || 'Servicio impecable.';
                                if (onRateBooking) {
                                  onRateBooking(bk.id, r, c);
                                }
                              }}
                              className="px-3 py-1 bg-[#C9A55B] text-black font-bold text-xs rounded-lg hover:bg-[#E6CA65] transition-colors shrink-0"
                            >
                              Enviar
                            </button>
                          </div>
                        )}

                        {bk.rating && bk.reviewComment && (
                          <span className="text-[#6B655F] dark:text-[#AAAAAA] italic text-xs">"{bk.reviewComment}"</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: MEMBERSHIP CLUB */}
        {activeTab === 'membership' && (
          <div className="space-y-8 max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs text-[#806020] dark:text-[#C9A55B] uppercase font-bold tracking-widest">Club Privado ESSENYA</span>
              <h3 className="text-3xl font-serif font-bold text-[#1C1917] dark:text-white">Membresías Exclusivas de Bienestar</h3>
              <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                Asegura tu agenda mensual con terapeutas Senior dedicados, tarifas preferenciales y atención prioritaria 24/7.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  tier: 'Gold',
                  price: '4,500',
                  desc: '2 Masajes de 90 min al mes',
                  benefits: ['15% desc en servicios extra', 'Elección de aromaterapia premium', 'Cancelación flexible sin penalización']
                },
                {
                  tier: 'Diamond',
                  price: '8,200',
                  desc: '4 Masajes de 90 min al mes',
                  benefits: ['20% desc en servicios extra', 'Terapeuta preferido reservado', '1 Experiencia en pareja al año gratis']
                },
                {
                  tier: 'Black',
                  price: '14,000',
                  desc: 'Ilimitado & Concierge Privado',
                  benefits: ['Asignación inmediata garantizada', 'Lencería de seda exclusiva', 'Transferencias de créditos a familiares']
                }
              ].map((m) => (
                <div 
                  key={m.tier}
                  className={`bg-white dark:bg-[#141414] p-6 rounded-2xl border transition-all flex flex-col justify-between space-y-6 shadow-sm ${
                    client.membershipTier === m.tier
                      ? 'border-[#C9A55B] ring-2 ring-[#C9A55B] shadow-xl'
                      : 'border-[#E5DFD3] dark:border-[#C9A55B]/20'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-serif text-xl font-bold text-[#1C1917] dark:text-white">{m.tier}</span>
                      {client.membershipTier === m.tier && (
                        <span className="bg-[#C9A55B] text-black text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                          Tu Nivel Actual
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-2xl font-bold text-[#806020] dark:text-gold-gradient">${m.price} MXN</span>
                      <span className="text-xs text-[#6B655F] dark:text-[#888888] block">/ mes</span>
                    </div>

                    <p className="text-xs text-[#806020] dark:text-[#C9A55B] font-semibold">{m.desc}</p>

                    <ul className="text-xs text-[#6B655F] dark:text-[#AAAAAA] space-y-2 pt-2 border-t border-[#E5DFD3] dark:border-[#222222]">
                      {m.benefits.map((b, idx) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#C9A55B]" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C9A55B] to-[#B38F43] text-black font-bold text-xs gold-button-hover">
                    {client.membershipTier === m.tier ? 'Membresía Activa' : 'Mejorar a este Plan'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* AI CONCIERGE DRAWER / MODAL */}
      {showAiConcierge && (
        <div className="fixed inset-0 z-50 bg-black/70 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#C9A55B]/40 rounded-2xl max-w-xl w-full p-6 space-y-6 relative shadow-2xl">
            <button
              onClick={() => setShowAiConcierge(false)}
              className="absolute top-4 right-4 text-[#6B655F] dark:text-[#888888] hover:text-[#1C1917] dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-[#E5DFD3] dark:border-[#C9A55B]/20 pb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E6CA65] to-[#9A7B38] flex items-center justify-center text-black">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#1C1917] dark:text-white">Sommelier de Bienestar AI ESSENYA</h3>
                <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">Asistente inteligente alimentado por Gemini 3.6 Flash</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs text-[#6B655F] dark:text-[#AAAAAA] uppercase font-semibold block">
                ¿Cómo te sientes hoy o qué deseas aliviar?
              </label>
              <textarea
                rows={3}
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Ej. Siento mucha tensión en el cuello por estrés laboral y busco dormir mejor esta noche..."
                className="w-full bg-[#F5F1EA] dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#333333] rounded-xl p-3 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
              ></textarea>

              <button
                onClick={handleConsultAiConcierge}
                disabled={aiLoading}
                className="w-full py-3 bg-gradient-to-r from-[#C9A55B] via-[#E6CA65] to-[#C9A55B] text-black font-bold text-xs rounded-xl gold-button-hover flex items-center justify-center space-x-2"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Analizando con Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>Generar Recomendación de Lujo</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Result Box */}
            {aiRecommendation && (
              <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-4 rounded-xl border border-[#C9A55B]/40 space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-[#E5DFD3] dark:border-[#333333] pb-2">
                  <span className="text-[#806020] dark:text-[#C9A55B] font-bold uppercase">Ritual Recomendado:</span>
                  <span className="font-bold text-[#1C1917] dark:text-white">{aiRecommendation.recommendedRitual}</span>
                </div>

                <p className="text-[#1C1917]/90 dark:text-white/90 italic">"{aiRecommendation.conciergeGreeting}"</p>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-[#6B655F] dark:text-[#888888] block">Duración Sugerida:</span>
                    <span className="font-semibold text-[#806020] dark:text-[#C9A55B]">{aiRecommendation.recommendedDuration} Minutos</span>
                  </div>
                  <div>
                    <span className="text-[#6B655F] dark:text-[#888888] block">Aceite Recomendado:</span>
                    <span className="font-semibold text-[#806020] dark:text-[#C9A55B]">{aiRecommendation.essentialOil}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setStep(2);
                    setActiveTab('book');
                    setShowAiConcierge(false);
                  }}
                  className="w-full py-2 bg-[#C9A55B] text-black font-bold rounded-lg text-xs hover:bg-[#E6CA65]"
                >
                  Aplicar esta Recomendación en mi Reserva
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHAT DRAWER */}
      {showChat && (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#C9A55B]/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-96">
          <div className="p-3 bg-[#FAF8F5] dark:bg-[#1A1A1A] border-b border-[#E5DFD3] dark:border-[#C9A55B]/20 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-bold text-[#1C1917] dark:text-white">Chat con {activeBooking.therapistName}</span>
            </div>
            <button onClick={() => setShowChat(false)} className="text-[#6B655F] dark:text-[#888888] hover:text-[#1C1917] dark:hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
            {chatMessages.map((msg, idx) => (
              <div 
                key={idx}
                className={`flex flex-col ${msg.sender === client?.name ? 'items-end' : 'items-start'}`}
              >
                <div className={`p-2.5 rounded-xl max-w-[80%] ${
                  msg.sender === client?.name
                    ? 'bg-[#C9A55B] text-black font-medium'
                    : 'bg-[#F5F1EA] dark:bg-[#222222] text-[#1C1917] dark:text-white border border-[#E5DFD3] dark:border-[#333333]'
                }`}>
                  <p>{msg.text}</p>
                </div>
                <span className="text-[9px] text-[#888888] dark:text-[#666666] mt-0.5">{msg.sender} • {msg.time}</span>
              </div>
            ))}
          </div>

          <div className="p-2 bg-[#FAF8F5] dark:bg-[#1A1A1A] border-t border-[#E5DFD3] dark:border-[#333333] flex items-center space-x-2">
            <input 
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#333333] rounded-lg px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:border-[#C9A55B]"
            />
            <button
              onClick={handleSendChat}
              className="p-2 bg-[#C9A55B] text-black rounded-lg hover:bg-[#E6CA65]"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Global Safety & Emergency Panic Modal */}
      <PanicModal 
        isOpen={showPanicModal}
        onClose={() => setShowPanicModal(false)}
        userType="client"
      />
    </div>
  );
};

export default ClientApp;
