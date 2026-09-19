import * as adminFirestore from 'firebase-admin/firestore';

export interface CanonicalService {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  basePrice: number;
  price90?: number;
  price120?: number;
  category: string;
  allowedDurations: number[];
  isActive: boolean;
  active: boolean;
  image?: string;
  requiresDualTherapist?: boolean;
  therapistAssignmentNote?: string;
}

export const OFFICIAL_SERVICES_CATALOG: Record<string, CanonicalService> = {
  'SRB-relajante': {
    id: 'SRB-relajante',
    name: 'Masaje Relajante',
    tagline: 'Maniobras suaves y fluidas para inducir relajación profunda y calmar el estrés.',
    description: 'Tratamiento sedante que combina efluvios rítmicos y presión progresiva para calmar el sistema nervioso, aliviar la fatiga mental y renovar la vitalidad corporal.',
    basePrice: 1100,
    price90: 1650,
    price120: 2200,
    category: 'Holístico',
    allowedDurations: [60, 90, 120],
    isActive: true,
    active: true,
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=800'
  },
  'srv-relajante': {
    id: 'srv-relajante',
    name: 'Masaje Relajante',
    tagline: 'Maniobras suaves y fluidas para inducir relajación profunda y calmar el estrés.',
    description: 'Tratamiento sedante que combina efluvios rítmicos y presión progresiva para calmar el sistema nervioso, aliviar la fatiga mental y renovar la vitalidad corporal.',
    basePrice: 1100,
    price90: 1650,
    price120: 2200,
    category: 'Holístico',
    allowedDurations: [60, 90, 120],
    isActive: true,
    active: true,
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=800'
  },
  'srv-descontracturante': {
    id: 'srv-descontracturante',
    name: 'Masaje Descontracturante',
    tagline: 'Presión focalizada para disolver nudos musculares y rigidez acumulada.',
    description: 'Sesión terapéutica diseñada para liberar la tensión concentrada en espalda, cuello y hombros. Elimina contracturas provocadas por estrés postural o trabajo intenso.',
    basePrice: 1200,
    price90: 1800,
    price120: 2400,
    category: 'Terapéutico',
    allowedDurations: [60, 90, 120],
    isActive: true,
    active: true,
    image: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=800'
  },
  'srv-deportivo': {
    id: 'srv-deportivo',
    name: 'Masaje Deportivo',
    tagline: 'Terapia muscular de alto rendimiento para preparación o recuperación física.',
    description: 'Técnicas dinámicas, compresiones y estiramientos asistidos para acondicionar o recuperar la musculatura antes o después de la actividad deportiva intensa.',
    basePrice: 1250,
    price90: 1875,
    price120: 2500,
    category: 'Terapéutico',
    allowedDurations: [60, 90, 120],
    isActive: true,
    active: true,
    image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&q=80&w=800'
  },
  'srv-tejido-profundo': {
    id: 'srv-tejido-profundo',
    name: 'Masaje de Tejido Profundo',
    tagline: 'Presión firme sobre la fascia subyacente y capas musculares profundas.',
    description: 'Enfoque biomecánico meticuloso que actúa sobre los tejidos conectivos más profundos para eliminar contracturas crónicas resistentes y restaurar la postura.',
    basePrice: 1300,
    price90: 1950,
    price120: 2600,
    category: 'Terapéutico',
    allowedDurations: [60, 90, 120],
    isActive: true,
    active: true,
    image: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&q=80&w=800'
  },
  'srv-prenatal': {
    id: 'srv-prenatal',
    name: 'Masaje Prenatal',
    tagline: 'Cuidado especializado y seguro en posiciones ergonómicas para gestantes.',
    description: 'Terapia reconfortante adaptada especialmente para la etapa de embarazo. Alivia la sobrecarga en zona lumbar, cadera y piernas, proporcionando un estado de calma total.',
    basePrice: 1100,
    price90: 1650,
    price120: 2200,
    category: 'Exclusivo',
    allowedDurations: [60, 90, 120],
    isActive: true,
    active: true,
    image: 'https://images.unsplash.com/photo-1512290900672-189f032225e3?auto=format&fit=crop&q=80&w=800'
  },
  'srv-pareja': {
    id: 'srv-pareja',
    name: 'Masaje en Pareja',
    tagline: 'Experiencia simultánea coordinada con 2 masajistas (1 para cada cliente).',
    description: 'Ritual armonizado para dos personas en la comodidad de tu residencia. El sistema asigna automáticamente a 2 masajistas certificadas simultáneas con montaje completo.',
    basePrice: 2400,
    price90: 3600,
    price120: 4800,
    category: 'Parejas',
    allowedDurations: [60, 90, 120],
    isActive: true,
    active: true,
    image: 'https://images.unsplash.com/photo-1529693257888-3df085b4b9b2?auto=format&fit=crop&q=80&w=800',
    requiresDualTherapist: true,
    therapistAssignmentNote: '2 Masajistas asignados automáticamente (1 para cada persona)'
  }
};

interface CacheStore {
  data: Record<string, CanonicalService>;
  timestamp: number;
}

let catalogCache: CacheStore | null = null;
let pendingCatalogPromise: Promise<Record<string, CanonicalService>> | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export async function getServiceCatalog(db: adminFirestore.Firestore): Promise<Record<string, CanonicalService>> {
  const now = Date.now();
  if (catalogCache && (now - catalogCache.timestamp < CACHE_TTL_MS)) {
    return catalogCache.data;
  }

  if (pendingCatalogPromise) {
    return pendingCatalogPromise;
  }

  pendingCatalogPromise = (async () => {
    try {
      const snapshot = await db.collection("servicios").get();
      const services: Record<string, CanonicalService> = {};

      if (!snapshot.empty) {
        snapshot.forEach(doc => {
          const data = doc.data() as any;
          const id = doc.id || data.id;
          if (id) {
            services[id] = {
              id,
              name: data.name || data.nombre || 'Servicio ESSENYA',
              tagline: data.tagline || '',
              description: data.description || '',
              basePrice: data.basePrice || data.price || 1100,
              price90: data.price90 || Math.round((data.basePrice || data.price || 1100) * 1.5),
              price120: data.price120 || Math.round((data.basePrice || data.price || 1100) * 2),
              category: data.category || 'Holístico',
              allowedDurations: Array.isArray(data.allowedDurations) ? data.allowedDurations : [60, 90, 120],
              isActive: data.isActive !== false && data.active !== false && data.estado !== 'inactivo',
              active: data.active !== false && data.estado !== 'inactivo',
              image: data.image || '',
              requiresDualTherapist: !!data.requiresDualTherapist,
              therapistAssignmentNote: data.therapistAssignmentNote || ''
            };
          }
        });
      }

      if (Object.keys(services).length > 0) {
        catalogCache = {
          data: services,
          timestamp: Date.now()
        };
        pendingCatalogPromise = null;
        return services;
      }
    } catch (err) {
      console.warn("Non-fatal: Failed to fetch service catalog from Firestore, using static fallback:", err);
    }

    // Fallback to static catalog if Firestore fails or is empty
    const fallbackData = catalogCache ? catalogCache.data : OFFICIAL_SERVICES_CATALOG;
    catalogCache = {
      data: fallbackData,
      timestamp: Date.now()
    };
    pendingCatalogPromise = null;
    return fallbackData;
  })();

  return pendingCatalogPromise;
}

export async function getServiceById(db: adminFirestore.Firestore, serviceId: string): Promise<CanonicalService | null> {
  const catalog = await getServiceCatalog(db);
  
  // Exact match
  if (catalog[serviceId]) {
    return catalog[serviceId];
  }

  // Historical alias resolution
  if (serviceId === 'SRB-relajante' && catalog['srv-relajante']) {
    return catalog['srv-relajante'];
  }
  if (serviceId === 'srv-relajante' && catalog['SRB-relajante']) {
    return catalog['SRB-relajante'];
  }

  // Try direct fetch from Firestore document as a last resort
  try {
    const doc = await db.collection("servicios").doc(serviceId).get();
    if (doc.exists) {
      const data = doc.data() as any;
      return {
        id: serviceId,
        name: data.name || data.nombre || 'Servicio ESSENYA',
        tagline: data.tagline || '',
        description: data.description || '',
        basePrice: data.basePrice || data.price || 1100,
        price90: data.price90 || 1650,
        price120: data.price120 || 2200,
        category: data.category || 'Holístico',
        allowedDurations: Array.isArray(data.allowedDurations) ? data.allowedDurations : [60, 90, 120],
        isActive: data.isActive !== false && data.active !== false,
        active: data.active !== false,
        image: data.image || ''
      };
    }
  } catch (e) {
    // ignore
  }

  return OFFICIAL_SERVICES_CATALOG[serviceId] || null;
}

export function invalidateServiceCache() {
  catalogCache = null;
}
