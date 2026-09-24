import { ServiceItem } from '../types';
import imgRelaxing from '../../assets/images/relaxing_massage_essenya_1789423105022.jpg';
import imgDeepTissue from '../../assets/images/deep_tissue_essenya_1789423125038.jpg';
import imgSports from '../../assets/images/sports_massage_essenya_1789423135431.jpg';
import imgPrenatal from '../../assets/images/prenatal_massage_essenya_1789423145499.jpg';
import imgCouples from '../../assets/images/couples_massage_essenya_1789423155702.jpg';
import imgTension from '../../assets/images/tension_release_essenya_1789423167792.jpg';

export * from './pricing';
export * from './scheduling';
import { calculateServicePrice } from './pricing';

// Official and Definitive Catalog of 6 Services
export const OFFICIAL_SERVICES: ServiceItem[] = [
  {
    id: 'SRB-relajante',
    name: 'Masaje Relajante',
    tagline: 'Maniobras suaves y fluidas para inducir relajación profunda y calmar el estrés.',
    description: 'Tratamiento sedante que combina efluvios rítmicos y presión progresiva para calmar el sistema nervioso, aliviar la fatiga mental y renovar la vitalidad corporal.',
    basePrice: 1100,
    price90: 1650,
    price120: 2200,
    category: 'Holístico',
    iconName: 'Feather',
    image: imgRelaxing,
    benefits: ['Alivio inmediato del estrés y tensión', 'Inducción al sueño reparador', 'Mejora de la circulación celular'],
    recommendedFor: 'Estrés mental, cansancio acumulado e insomnio.',
    allowedDurations: [60, 90, 120],
    isActive: true,
    isVipFeatured: false,
    discountPercent: 0
  },
  {
    id: 'srv-descontracturante',
    name: 'Masaje Descontracturante',
    tagline: 'Presión focalizada para disolver nudos musculares y rigidez acumulada.',
    description: 'Sesión terapéutica diseñada para liberar la tensión concentrada en espalda, cuello y hombros. Elimina contracturas provocadas por estrés postural o trabajo intenso.',
    basePrice: 1200,
    price90: 1800,
    price120: 2400,
    category: 'Terapéutico',
    iconName: 'Zap',
    image: imgTension,
    benefits: ['Disolución de contracturas profundas', 'Restauración del rango de movimiento', 'Alivio del dolor de cuello y espalda'],
    recommendedFor: 'Tensión laboral, rigidez física y dolor muscular localizado.',
    allowedDurations: [60, 90, 120],
    isActive: true,
    isVipFeatured: false,
    discountPercent: 0
  },
  {
    id: 'srv-deportivo',
    name: 'Masaje Deportivo',
    tagline: 'Terapia muscular de alto rendimiento para preparación o recuperación física.',
    description: 'Técnicas dinámicas, compresiones y estiramientos asistidos para acondicionar o recuperar la musculatura antes o después de la actividad deportiva intensa.',
    basePrice: 1250,
    price90: 1875,
    price120: 2500,
    category: 'Terapéutico',
    iconName: 'Compass',
    image: imgSports,
    benefits: ['Aceleración del drenaje del ácido láctico', 'Prevención de lesiones atléticas', 'Optimización de flexibilidad muscular'],
    recommendedFor: 'Deportistas, entrenamiento constante y recuperación articular.',
    allowedDurations: [60, 90, 120],
    isActive: true,
    isVipFeatured: false,
    discountPercent: 0
  },
  {
    id: 'srv-tejido-profundo',
    name: 'Masaje de Tejido Profundo',
    tagline: 'Presión firme sobre la fascia subyacente y capas musculares profundas.',
    description: 'Enfoque biomecánico meticuloso que actúa sobre los tejidos conectivos más profundos para eliminar contracturas crónicas resistentes y restaurar la postura.',
    basePrice: 1300,
    price90: 1950,
    price120: 2600,
    category: 'Terapéutico',
    iconName: 'Sparkles',
    image: imgDeepTissue,
    benefits: ['Liberación de nudos crónicos', 'Alineación de fibras de colágeno', 'Alivio sostenido de fatiga articular'],
    recommendedFor: 'Contracturas persistentes, mala postura y tensión crónica profunda.',
    allowedDurations: [60, 90, 120],
    isActive: true,
    isVipFeatured: false,
    discountPercent: 0
  },
  {
    id: 'srv-prenatal',
    name: 'Masaje Prenatal',
    tagline: 'Cuidado especializado y seguro en posiciones ergonómicas para gestantes.',
    description: 'Terapia reconfortante adaptada especialmente para la etapa de embarazo. Alivia la sobrecarga en zona lumbar, cadera y piernas, proporcionando un estado de calma total.',
    basePrice: 1100,
    price90: 1650,
    price120: 2200,
    category: 'Exclusivo',
    iconName: 'Heart',
    image: imgPrenatal,
    benefits: ['Reducción de inflamación en piernas y pies', 'Alivio de sobrecarga lumbar y pélvica', 'Conexión serena entre mamá y bebé'],
    recommendedFor: 'Mujeres gestantes a partir del primer trimestre.',
    allowedDurations: [60, 90, 120],
    isActive: true,
    isVipFeatured: false,
    discountPercent: 0
  },
  {
    id: 'srv-pareja',
    name: 'Masaje en Pareja',
    tagline: 'Experiencia simultánea coordinada con 2 masajistas (1 para cada cliente).',
    description: 'Ritual armonizado para dos personas en la comodidad de tu residencia. El sistema asigna automáticamente a 2 masajistas certificadas simultáneas con montaje completo.',
    basePrice: 2400,
    price90: 3600,
    price120: 4800,
    category: 'Parejas',
    iconName: 'Users',
    image: imgCouples,
    benefits: ['Asignación automática de 2 Masajistas', 'Conexión y relajación coordinada', 'Montaje de Suite Spa Dúo VIP'],
    recommendedFor: 'Aniversarios, fechas especiales y parejas.',
    allowedDurations: [60, 90, 120],
    isActive: true,
    isVipFeatured: true,
    discountPercent: 0,
    requiresDualTherapist: true,
    therapistAssignmentNote: '2 Masajistas asignados automáticamente (1 para cada persona)'
  }
];

// Official Oil Options
export const OIL_OPTIONS = [
  { id: 'Aceite de olor', label: 'Aceite de olor', description: 'Aromaterapia botánica sutil y relajante' },
  { id: 'Aceite neutro', label: 'Aceite neutro', description: 'Fórmula hipoalergénica sin fragancia añadida' }
] as const;

// Official Music Options
export const MUSIC_OPTIONS = [
  { id: 'Sonido de la naturaleza', label: 'Sonido de la naturaleza', description: 'Ambiente acústico natural, brisa y agua serena' },
  { id: 'Un mantra', label: 'Un mantra', description: 'Vibraciones armónicas meditativas y frecuencias de calma' },
  { id: 'Otra música', label: 'Otra música', description: 'Ambiente musical relajante contemporáneo o sin música' }
] as const;

// Official Payment Methods (Transferencia SPEI and Tarjeta Stripe)
export const PAYMENT_METHODS = [
  {
    id: 'tarjeta',
    label: 'Tarjeta de Crédito / Débito',
    badge: 'Stripe Seguro',
    description: 'Pago cifrado y seguro con tarjeta de crédito o débito.'
  },
  {
    id: 'transferencia',
    label: 'Transferencia Interbancaria (SPEI)',
    badge: 'BBVA México',
    description: 'Transferencia directa a cuenta CLABE con validación central.'
  }
] as const;

