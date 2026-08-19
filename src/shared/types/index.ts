export type PortalType = 'client' | 'therapist' | 'admin' | 'website';

export type PressureLevel = 'Suave' | 'Media' | 'Firme' | 'Profunda';
export type EssentialOil = 'Aceite de olor' | 'Aceite neutro' | 'Lavanda Francesa' | 'Eucalipto Silvestre' | 'Ylang Ylang Dorado' | 'Menta & Romero';
export type MusicStyle = 'Sonido de la naturaleza' | 'Un mantra' | 'Otra música' | 'Acoustic Zen' | 'Ambient Gold' | 'Frecuencias 432Hz' | 'Silencio Absoluto';
export type MembershipTier = 'Gold' | 'Diamond' | 'Black';

export type BookingState = 
  | 'pendiente' 
  | 'aceptado' 
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
}

export interface ClientUser {
  id: string;
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

export interface Booking {
  id: string;
  code: string; // e.g. ESS-8921
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  cityZone: string;
  therapistId?: string;
  therapistName?: string;
  therapistPhoto?: string;
  therapistPhone?: string;
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
  paymentMethod: 'Tarjeta de Crédito / Débito' | 'Tarjeta Crédito VIP' | 'Transferencia Interbancaria (SPEI)' | 'Transferencia Bank VIP' | 'Efectivo (Pago al Recibir)';
  paymentStatus: 'pagado' | 'pendiente' | 'reembolsado';
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
  paymentProofUrl?: string;
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
  invoiceNumber: string;
  date: string;
  rfc: string;
  businessName: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'emitida' | 'cancelada';
  pdfUrl?: string;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  userRole: string;
  userName: string;
  action: string;
  details: string;
}
