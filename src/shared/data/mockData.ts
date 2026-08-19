import { ServiceItem, Therapist, ClientUser, Booking, CoverageZone, Invoice, SystemAuditLog } from '../types';
import heroBgImage from '../../assets/images/essenya_hero_bg_1784828247187.jpg';
import { OFFICIAL_SERVICES } from './catalog';

export { heroBgImage };
export * from './catalog';

export const INITIAL_SERVICES: ServiceItem[] = OFFICIAL_SERVICES;

export const INITIAL_THERAPISTS: Therapist[] = [];

export const INITIAL_CLIENT: ClientUser = {
  id: '',
  name: '',
  email: '',
  phone: '',
  membershipTier: 'Gold',
  totalBookings: 0,
  spentTotal: 0,
  address: '',
  cityZone: '',
  photo: '',
  rewardsPoints: 0
};

export const INITIAL_BOOKINGS: Booking[] = [];

export const INITIAL_INVOICES: Invoice[] = [];

export const INITIAL_COVERAGE_ZONES: CoverageZone[] = [
  {
    id: 'zone-1',
    name: 'Interlomas & Bosques',
    coloniases: ['Interlomas', 'Bosque Real', 'Country Club', 'Tecamachalco', 'Bosques de las Lomas', 'Jesús del Monte'],
    activeTherapists: 0,
    surgeMultiplier: 1.0,
    isHighDemand: false,
    isCovered: true
  },
  {
    id: 'zone-2',
    name: 'Polanco, Lomas & Anzures',
    coloniases: ['Polanco I a V Sección', 'Lomas de Chapultepec', 'Bosques de Chapultepec', 'Anzures', 'Granada'],
    activeTherapists: 0,
    surgeMultiplier: 1.0,
    isHighDemand: false,
    isCovered: true
  },
  {
    id: 'zone-3',
    name: 'Santa Fe & Cuajimalpa',
    coloniases: ['Santa Fe Peña Blanca', 'Cruz Manca', 'Lomas de Santa Fe', 'Cuajimalpa Centro', 'Contadero'],
    activeTherapists: 0,
    surgeMultiplier: 1.0,
    isHighDemand: false,
    isCovered: true
  },
  {
    id: 'zone-4',
    name: 'San Ángel, Pedregal & Zona Sur',
    coloniases: ['Jardines del Pedregal', 'San Ángel Inn', 'San Jerónimo Lídice', 'Las Águilas', 'Guadalupe Inn', 'Magdalena Contreras'],
    activeTherapists: 0,
    surgeMultiplier: 1.0,
    isHighDemand: false,
    isCovered: true
  },
  {
    id: 'zone-5',
    name: 'Roma, Condesa & Juárez',
    coloniases: ['Roma Norte', 'Roma Sur', 'Hipódromo Condesa', 'Juárez', 'Cuauhtémoc'],
    activeTherapists: 0,
    surgeMultiplier: 1.0,
    isHighDemand: false,
    isCovered: true
  }
];

export const INITIAL_AUDIT_LOGS: SystemAuditLog[] = [];

