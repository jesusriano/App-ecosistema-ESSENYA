export type PortalType = 'client' | 'therapist' | 'admin' | 'website';

export type PressureLevel = 'Suave' | 'Media' | 'Firme' | 'Profunda';
export type EssentialOil = 'Aceite de olor' | 'Aceite neutro' | 'Lavanda Francesa' | 'Eucalipto Silvestre' | 'Ylang Ylang Dorado' | 'Menta & Romero';
export type MusicStyle = 'Sonido de la naturaleza' | 'Un mantra' | 'Otra música' | 'Acoustic Zen' | 'Ambient Gold' | 'Frecuencias 432Hz' | 'Silencio Absoluto';
export type MembershipTier = 'Platino' | 'Gold' | 'Diamond' | 'Black Diamond' | 'Imperial VIP' | string;

export type BookingState = 
  | 'pendiente' 
  | 'aceptada' 
  | 'rechazada'
  | 'en_camino' 
  | 'llegue' 
  | 'servicio_iniciado' 
  | 'servicio_finalizado' 
  | 'cancelado';

export interface ExtraServiceSelection {
  id: string;
  name: string;
  durationMinutes: 15 | 30;
  price: number;
}

export interface ServiceItem {
  id: string;
  name: string;
  tagline: string;
  description: string;
  basePrice: number; // For 60 min
  price90: number;
  price120: number;
  category: 'Holístico' | 'Terapéutico' | 'Exclusivo' | 'Parejas';
  iconName: string;
  image: string;
  benefits: string[];
  recommendedFor: string;
  allowedDurations?: number[];
  requiresDualTherapist?: boolean;
  therapistAssignmentNote?: string;
  isActive?: boolean;
  discountPercent?: number;
  isVipFeatured?: boolean;
}

export interface Therapist {
  id: string;
  userId?: string;
  name: string;
  photo: string;
  rating: number;
  reviewCount: number;
  totalServices: number;
  gender: 'femenino' | 'masculino';
  bio: string;
  certifications: string[];
  status: 'disponible' | 'en_servicio' | 'en_camino' | 'desconectado';
  currentZone: string;
  coverageZones: string[];
  phone: string;
  email: string;
  vehicleType: 'Auto Ejecutivo' | 'SUV Premium' | 'Servicio Chofer';
  lat: number;
  lng: number;
  lastLocationUpdate?: string;
  estado?: 'activo' | 'bloqueado' | 'pendiente';
  specialties?: string[];
  completedServicesCount?: number;
}

export interface ClientUser {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  membershipTier: MembershipTier;
  totalBookings: number;
  spentTotal: number;
  address: string;
  cityZone: string;
  photo: string;
  rewardsPoints: number;
  isBlocked?: boolean;
  specialNotes?: string;
  vipPreferences?: string;
  registeredAddresses?: string[];
  courtesyUsed?: boolean;
}

export interface ServicePreference {
  genderPreference: 'femenino' | 'masculino' | 'sin_preferencia';
  pressureLevel: PressureLevel;
  essentialOil: EssentialOil;
  musicStyle: MusicStyle;
  therapistId?: string;
  painPoints?: string;
  arrivalInstructions?: string;
  specialInstructions?: string;
  focusAreas?: string[];
}

export type DispatchState = 'buscando' | 'asignada' | 'sin_disponibilidad' | 'cancelada';

export interface DispatchLevelConfig {
  maxEtaMinutes: number;
  responseWindowSeconds: number;
}

export interface DispatchOffer {
  therapistId: string;
  therapistName?: string;
  etaMinutes: number;
  level: number;
  offeredAt: string;
  expiresAt: string;
}

export interface DispatchHistoryItem {
  therapistId: string;
  therapistName?: string;
  level: number;
  etaMinutes: number;
  action: 'contacted' | 'rejected' | 'timeout' | 'accepted';
  timestamp: string;
}

export interface Booking {
  id: string;
  code: string; // e.g. ESS-8921
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  cityZone: string;
  clientLat?: number;
  clientLng?: number;
  therapistId?: string;
  therapistName?: string;
  therapistPhoto?: string;
  therapistPhone?: string;
  therapistId2?: string;
  therapistName2?: string;
  therapistPhoto2?: string;
  therapistPhone2?: string;
  therapistIds?: string[];
  assignedTherapistsCount?: number;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  price: number;
  tip: number;
  total: number;
  date: string;
  time: string;
  preferences: ServicePreference;
  state: BookingState;
  etaMinutes: number;
  liveLat?: number;
  liveLng?: number;
  // Dispatch engine telemetry fields
  dispatchState?: DispatchState;
  currentDispatchLevel?: number;
  dispatchStartedAt?: string;
  dispatchLevelStartedAt?: string;
  applyGiftCard?: boolean;
  giftCardCode?: string;
  expectedWalletDeduction?: number;
  expectedFinalTotal?: number;
  applyCourtesy?: boolean;
  dispatchExpiresAt?: string;
  activeOfferTherapistIds?: string[];
  activeOffers?: DispatchOffer[];
  dispatchHistory?: DispatchHistoryItem[];
  paymentMethod: 'Tarjeta de Crédito / Débito' | 'Tarjeta Crédito VIP' | 'Transferencia Interbancaria (SPEI)' | 'Transferencia Bank VIP' | 'Efectivo (Pago al Recibir)' | 'Tarjeta de Regalo (Saldo Billetera)';
  paymentStatus: 'pagado' | 'pendiente' | 'reembolsado' | 'rechazado';
  paid?: boolean;
  updatedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  reviewedAt?: string;
  painPoints?: string;
  arrivalInstructions?: string;
  createdAt: string;
  invoiceId?: string;
  rating?: number;
  reviewComment?: string;
  selectedExtras?: ExtraServiceSelection[];
  totalDurationMinutes?: number;
  requiresDualTherapist?: boolean;
  dualTherapistNote?: string;
  adminNotes?: string;
  cancellationReason?: string;
  motivoRechazo?: string;
  paymentProofUrl?: string;
  rejectedBy?: string[];
  messages?: Array<{ sender: string; text: string; time: string; timestamp?: string; read?: boolean }>;
  paidMassageCounted?: boolean;
}

export interface CoverageZone {
  id: string;
  name: string;
  coloniases: string[];
  activeTherapists: number;
  surgeMultiplier: number;
  isHighDemand: boolean;
  isCovered: boolean;
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderRole: 'client' | 'therapist' | 'admin' | 'ai_concierge';
  senderName: string;
  text: string;
  timestamp: string;
}

export interface Invoice {
  id: string;
  bookingId: string;
  clientId?: string;
  invoiceNumber: string;
  date: string;
  rfc: string;
  businessName: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'emitida' | 'cancelada' | 'pagada';
  paymentStatus?: 'pagado' | 'pendiente' | 'reembolsado' | 'rechazado';
  paidAt?: string;
  updatedAt?: string;
  pdfUrl?: string;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  userRole: string;
  userName: string;
  action: string;
  details: string;
  actorId?: string;
}

export interface PanicAlert {
  id: string;
  userId?: string;
  userName: string;
  userRole: 'cliente' | 'terapeuta' | 'client' | 'therapist' | 'administrador';
  bookingCode?: string;
  userLocation: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  speed?: number | null;
  status: 'activa' | 'en_atencion' | 'resuelta';
  emergencyType: 'sos_panico' | 'asistencia_medica' | 'incidente_seguridad' | 'asistencia_urgente';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
  attendedBy?: string;
  attendedAt?: string;
  isSimulated?: boolean;
}
