import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { sendPushNotificationToUser, sendFcmNotificationToUser } from './pushNotificationService.js';

export interface DispatchLevelConfig {
  maxEtaMinutes: number;
  responseWindowSeconds: number;
}

export const DEFAULT_DISPATCH_LEVELS: DispatchLevelConfig[] = [
  { maxEtaMinutes: 10, responseWindowSeconds: 120 },
  { maxEtaMinutes: 20, responseWindowSeconds: 120 },
  { maxEtaMinutes: 30, responseWindowSeconds: 120 },
  { maxEtaMinutes: 40, responseWindowSeconds: 120 },
  { maxEtaMinutes: 50, responseWindowSeconds: 120 },
  { maxEtaMinutes: 60, responseWindowSeconds: 120 }
];

export interface DispatchSettings {
  levels: DispatchLevelConfig[];
  maxLocationAgeMinutes: number;
  urbanSpeedKmh: number;
  routeTortuosityFactor: number;
  enableGoogleRoutes: boolean;
}

export const DEFAULT_DISPATCH_SETTINGS: DispatchSettings = {
  levels: DEFAULT_DISPATCH_LEVELS,
  maxLocationAgeMinutes: 25, // therapists location within last 25 minutes
  urbanSpeedKmh: 20.0, // average driving speed in Mexico City metropolitan traffic
  routeTortuosityFactor: 1.38, // street network detour multiplier vs Haversine straight line
  enableGoogleRoutes: true
};

export interface RouteCalculationResult {
  distanceKm: number;
  etaMinutes: number;
  source: 'google_routes' | 'cdmx_calibrated_traffic' | 'cached';
}

// In-memory ETA Cache with 10-minute TTL to reduce unnecessary Google API calls and costs
interface CachedRoute {
  result: RouteCalculationResult;
  expiresAt: number;
}
const routeEtaCache = new Map<string, CachedRoute>();

/**
 * Great-circle distance between two GPS points in kilometers (Haversine formula).
 */
export function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates driving ETA between therapist and client coordinates.
 * Prioritizes Google Distance Matrix / Routes if key is available,
 * with fallback to the calibrated CDMX urban street-network traffic model.
 */
export async function calculateRouteEta(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  googleApiKey?: string,
  settings: DispatchSettings = DEFAULT_DISPATCH_SETTINGS
): Promise<RouteCalculationResult> {
  const cacheKey = `${originLat.toFixed(3)},${originLng.toFixed(3)}->${destLat.toFixed(3)},${destLng.toFixed(3)}`;
  const now = Date.now();
  const cached = routeEtaCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return { ...cached.result, source: 'cached' };
  }

  // Attempt Google Maps Distance Matrix API if key is available
  if (googleApiKey && settings.enableGoogleRoutes) {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=driving&departure_time=now&traffic_model=best_guess&key=${googleApiKey}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (resp.ok) {
        const data = await resp.json();
        const element = data.rows?.[0]?.elements?.[0];
        if (element && element.status === 'OK') {
          const durationSeconds = element.duration_in_traffic?.value || element.duration?.value;
          const distanceMeters = element.distance?.value;
          if (durationSeconds && distanceMeters) {
            const result: RouteCalculationResult = {
              distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
              etaMinutes: Math.max(1, Math.round(durationSeconds / 60)),
              source: 'google_routes'
            };
            routeEtaCache.set(cacheKey, { result, expiresAt: now + 10 * 60 * 1000 });
            return result;
          }
        }
      }
    } catch (err) {
      console.warn('[Dispatch] Google Routes API call failed or timed out, falling back to calibrated model:', err);
    }
  }

  // Calibrated urban street-network traffic model for CDMX
  const straightKm = calculateHaversineKm(originLat, originLng, destLat, destLng);
  const estimatedDrivingKm = straightKm * settings.routeTortuosityFactor;
  // ETA in minutes = (estimatedDrivingKm / speed) * 60 + 2 min buffer for parking / building entry
  const drivingMinutes = (estimatedDrivingKm / settings.urbanSpeedKmh) * 60;
  const etaMinutes = Math.max(2, Math.round(drivingMinutes + 2));

  const result: RouteCalculationResult = {
    distanceKm: Math.round(estimatedDrivingKm * 10) / 10,
    etaMinutes,
    source: 'cdmx_calibrated_traffic'
  };

  routeEtaCache.set(cacheKey, { result, expiresAt: now + 10 * 60 * 1000 });
  return result;
}

/**
 * Loads dynamic dispatch settings from Firestore 'configuraciones/dispatch'.
 */
export async function getDispatchSettings(db: Firestore): Promise<DispatchSettings> {
  try {
    const docSnap = await db.collection('configuraciones').doc('dispatch').get();
    if (docSnap.exists) {
      const data = docSnap.data() || {};
      return {
        levels: Array.isArray(data.levels) && data.levels.length > 0 ? data.levels : DEFAULT_DISPATCH_LEVELS,
        maxLocationAgeMinutes: typeof data.maxLocationAgeMinutes === 'number' ? data.maxLocationAgeMinutes : DEFAULT_DISPATCH_SETTINGS.maxLocationAgeMinutes,
        urbanSpeedKmh: typeof data.urbanSpeedKmh === 'number' ? data.urbanSpeedKmh : DEFAULT_DISPATCH_SETTINGS.urbanSpeedKmh,
        routeTortuosityFactor: typeof data.routeTortuosityFactor === 'number' ? data.routeTortuosityFactor : DEFAULT_DISPATCH_SETTINGS.routeTortuosityFactor,
        enableGoogleRoutes: data.enableGoogleRoutes !== false
      };
    }
  } catch (err) {
    console.warn('[Dispatch] Could not load configuraciones/dispatch, using default settings:', err);
  }
  return DEFAULT_DISPATCH_SETTINGS;
}

/**
 * Registers a dispatch audit event into 'audit_logs'.
 */
export async function recordDispatchAuditLog(
  db: Firestore,
  event: {
    action: string;
    bookingId: string;
    bookingCode?: string;
    therapistId?: string;
    therapistName?: string;
    clientId?: string;
    dispatchLevel?: number;
    etaMinutes?: number;
    details?: string;
    metadata?: Record<string, any>;
  }
) {
  try {
    const nowIso = new Date().toISOString();
    await db.collection('audit_logs').add({
      tipo: 'DESPACHO_ETA',
      action: event.action,
      bookingId: event.bookingId,
      bookingCode: event.bookingCode || '',
      therapistId: event.therapistId || null,
      therapistName: event.therapistName || null,
      clientId: event.clientId || null,
      dispatchLevel: event.dispatchLevel || null,
      etaMinutes: event.etaMinutes || null,
      detalles: event.details || `Evento de despacho: ${event.action}`,
      timestamp: nowIso,
      createdAt: nowIso,
      metadata: event.metadata || {}
    });
  } catch (e) {
    console.error('[Dispatch] Error recording audit log:', e);
  }
}

/**
 * Evaluates candidate therapist eligibility for a booking.
 * 
 * Criteria (Section 4):
 * 1. Registered and approved (estado === 'activo')
 * 2. Active availability (status === 'disponible')
 * 3. Valid GPS location
 * 4. Location freshness (lastLocationUpdate <= maxLocationAgeMinutes)
 * 5. Not busy in conflicting active booking
 * 6. Has not previously rejected THIS booking
 * 7. Has not already been offered in a previous level of THIS booking
 */
export async function getEligibleTherapistCandidates(
  db: Firestore,
  booking: Record<string, any>,
  maxEtaMinutes: number,
  googleApiKey?: string,
  settings: DispatchSettings = DEFAULT_DISPATCH_SETTINGS
): Promise<Array<{
  therapistId: string;
  therapistName: string;
  therapistPhone?: string;
  therapistPhoto?: string;
  lat: number;
  lng: number;
  etaMinutes: number;
  distanceKm: number;
  etaSource: string;
}>> {
  const rejectedTherapistIds: string[] = Array.isArray(booking.rejectedBy) ? booking.rejectedBy : [];
  const dispatchHistory: any[] = Array.isArray(booking.dispatchHistory) ? booking.dispatchHistory : [];
  const alreadyContactedIds = new Set<string>([
    ...rejectedTherapistIds,
    ...dispatchHistory.map(h => h.therapistId).filter(Boolean)
  ]);

  // Client coordinates resolution
  let clientLat = typeof booking.clientLat === 'number' ? booking.clientLat : null;
  let clientLng = typeof booking.clientLng === 'number' ? booking.clientLng : null;

  // Fallback coordinates by CDMX cityZone if clientLat is not set
  if (clientLat === null || clientLng === null) {
    const zoneCoords: Record<string, [number, number]> = {
      'polanco': [19.4338, -99.1912],
      'polanco vip': [19.4338, -99.1912],
      'lomas de chapultepec': [19.4184, -99.2155],
      'bosques de las lomas': [19.3950, -99.2450],
      'santa fe': [19.3601, -99.2600],
      'interlomas': [19.3990, -99.2810],
      'atizapán de zaragoza': [19.5630, -99.2450],
      'atizapan de zaragoza': [19.5630, -99.2450],
      'naucalpan': [19.4770, -99.2380],
      'huixquilucan': [19.3640, -99.3520],
      'satélite': [19.5100, -99.2350],
      'satelite': [19.5100, -99.2350],
      'lomas verdes': [19.5050, -99.2550],
      'tecamachalco': [19.4280, -99.2420],
      'la herradura': [19.4180, -99.2650],
      'bosque real': [19.3850, -99.3100],
      'jesús del monte': [19.3750, -99.2850],
      'condesa': [19.4116, -99.1714],
      'roma norte': [19.4195, -99.1620],
      'del valle': [19.3820, -99.1670],
      'narvarte': [19.3920, -99.1550],
      'pedregal': [19.3140, -99.2070],
      'san ángel': [19.3450, -99.1900],
      'san angel': [19.3450, -99.1900],
      'coyoacán': [19.3500, -99.1620],
      'coyoacan': [19.3500, -99.1620],
      'nápoles': [19.3920, -99.1750],
      'napoles': [19.3920, -99.1750],
      'tlalpan': [19.2980, -99.1680],
      'san jerónimo': [19.3240, -99.2300]
    };
    const rawZone = (booking.cityZone || 'Polanco').toLowerCase().trim();
    const match = zoneCoords[rawZone] || Object.entries(zoneCoords).find(([k]) => rawZone.includes(k))?.[1] || [19.4326, -99.1332];
    clientLat = match[0];
    clientLng = match[1];
  }

  // Query active & available therapists
  const therapistsSnap = await db.collection('terapeutas')
    .where('estado', '==', 'activo')
    .where('status', '==', 'disponible')
    .get();

  if (therapistsSnap.empty) {
    return [];
  }

  // Get active busy bookings to filter out therapists who have overlapping active sessions
  const busyTherapistsSnap = await db.collection('reservas')
    .where('state', 'in', ['aceptada', 'en_camino', 'llegue', 'servicio_iniciado'])
    .get();

  const busyTherapistIds = new Set<string>();
  busyTherapistsSnap.forEach(doc => {
    const data = doc.data();
    if (data.therapistId) busyTherapistIds.add(data.therapistId);
    if (data.therapistId2) busyTherapistIds.add(data.therapistId2);
    if (Array.isArray(data.therapistIds)) {
      data.therapistIds.forEach((id: string) => busyTherapistIds.add(id));
    }
  });

  const nowMs = Date.now();
  const maxAgeMs = settings.maxLocationAgeMinutes * 60 * 1000;
  const candidates = [];

  for (const doc of therapistsSnap.docs) {
    const tId = doc.id;
    const tData = doc.data();

    // Exclude if already contacted or rejected
    if (alreadyContactedIds.has(tId)) continue;
    // Exclude if busy in another booking
    if (busyTherapistIds.has(tId)) continue;

    // Check therapist work zones (coverage)
    const therapistZones: string[] = Array.isArray(tData.zonasCobertura) && tData.zonasCobertura.length > 0
      ? tData.zonasCobertura
      : (Array.isArray(tData.coverageZones) && tData.coverageZones.length > 0 ? tData.coverageZones : []);

    // Therapist must only receive work if she has configured zones in her profile
    if (therapistZones.length === 0) {
      continue;
    }

    // Match booking zone or address against therapist's configured work zones
    const bookingZone = (booking.cityZone || '').toLowerCase().trim();
    const bookingAddress = (booking.clientAddress || booking.address || '').toLowerCase().trim();

    const matchesCoverage = therapistZones.some((zone: string) => {
      const normZone = (zone || '').toLowerCase().trim();
      if (!normZone) return false;
      return (
        bookingZone === normZone ||
        bookingZone.includes(normZone) ||
        normZone.includes(bookingZone) ||
        bookingAddress.includes(normZone)
      );
    });

    if (!matchesCoverage) {
      // The therapist does NOT work in this zone! Exclude candidate.
      continue;
    }

    // Check location coordinates
    const lat = typeof tData.lat === 'number' ? tData.lat : null;
    const lng = typeof tData.lng === 'number' ? tData.lng : null;
    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
      continue;
    }

    // Check location freshness (Section 10)
    if (tData.lastLocationUpdate) {
      const locAgeMs = nowMs - new Date(tData.lastLocationUpdate).getTime();
      if (locAgeMs > maxAgeMs) {
        // Location is stale
        continue;
      }
    }

    // Calculate real driving route ETA
    const route = await calculateRouteEta(lat, lng, clientLat, clientLng, googleApiKey, settings);

    // Filter by maxEtaMinutes of the current level
    if (route.etaMinutes <= maxEtaMinutes) {
      const name = tData.name || tData.nombre || [tData.nombre, tData.apellidos].filter(Boolean).join(' ') || 'Terapeuta Certificada';
      const pushRecipientUid = tData.firebaseAuthUid || tData.authUid || tData.userId || tId;
      candidates.push({
        therapistId: tId,
        pushRecipientUid,
        therapistName: name,
        therapistPhone: tData.phone || tData.telefono || '',
        therapistPhoto: tData.photo || tData.fotografia || '',
        lat,
        lng,
        etaMinutes: route.etaMinutes,
        distanceKm: route.distanceKm,
        etaSource: route.source
      });
    }
  }

  // Sort candidates by lowest ETA
  candidates.sort((a, b) => a.etaMinutes - b.etaMinutes);
  return candidates;
}

/**
 * Steps the Dispatch Engine for a given reservation.
 * 
 * Flow:
 * 1. Checks current state. If not 'pendiente' or 'buscando', exits.
 * 2. If dispatch has not started, initializes at Level 1 (maxEta 10 min).
 * 3. Checks whether the current level offer window has expired.
 * 4. If window expired (or all offered therapists rejected), advances to the next level:
 *    10 -> 20 -> 30 -> 40 -> 50 -> 60.
 * 5. If Level 60 expires and no acceptance: sets dispatchState = 'sin_disponibilidad'.
 * 6. Finds newly eligible therapists within current maxEta, sends offers, and sets expiration window.
 */
export async function stepDispatchEngine(
  db: Firestore,
  bookingId: string,
  googleApiKey?: string
): Promise<{
  stepped: boolean;
  dispatchState: string;
  currentLevel: number;
  offersSent: number;
  message: string;
}> {
  const bookingRef = db.collection('reservas').doc(bookingId);
  const bookingSnap = await bookingRef.get();

  if (!bookingSnap.exists) {
    return { stepped: false, dispatchState: 'not_found', currentLevel: 0, offersSent: 0, message: 'Reserva no existe' };
  }

  const booking = bookingSnap.data()!;

  // Only run dispatch for bookings in 'pendiente' and dispatchState !== 'asignada' / 'sin_disponibilidad' / 'cancelada'
  if (booking.state !== 'pendiente') {
    return {
      stepped: false,
      dispatchState: booking.dispatchState || 'terminada',
      currentLevel: booking.currentDispatchLevel || 0,
      offersSent: 0,
      message: `Reserva no está pendiente (estado actual: ${booking.state})`
    };
  }

  if (booking.dispatchState === 'asignada' || booking.dispatchState === 'sin_disponibilidad' || booking.dispatchState === 'cancelada') {
    return {
      stepped: false,
      dispatchState: booking.dispatchState,
      currentLevel: booking.currentDispatchLevel || 0,
      offersSent: 0,
      message: `Despacho finalizado con estado: ${booking.dispatchState}`
    };
  }

  const settings = await getDispatchSettings(db);
  const levels = settings.levels;
  const now = new Date();
  const nowIso = now.toISOString();
  const nowMs = now.getTime();

  let currentLevelNum = typeof booking.currentDispatchLevel === 'number' ? booking.currentDispatchLevel : 10;
  let levelIndex = levels.findIndex(l => l.maxEtaMinutes === currentLevelNum);
  if (levelIndex === -1) levelIndex = 0;

  const currentLevelConfig = levels[levelIndex] || levels[0];
  const dispatchHistory = Array.isArray(booking.dispatchHistory) ? [...booking.dispatchHistory] : [];
  let activeOfferTherapistIds: string[] = Array.isArray(booking.activeOfferTherapistIds) ? [...booking.activeOfferTherapistIds] : [];
  let activeOffers: any[] = Array.isArray(booking.activeOffers) ? [...booking.activeOffers] : [];

  let shouldAdvanceLevel = false;

  // Check if dispatch was never started
  const isBrandNew = !booking.dispatchStartedAt || booking.dispatchState !== 'buscando';

  if (isBrandNew) {
    await recordDispatchAuditLog(db, {
      action: 'dispatch_started',
      bookingId,
      bookingCode: booking.code,
      clientId: booking.clientId,
      dispatchLevel: currentLevelConfig.maxEtaMinutes,
      details: `Iniciado despacho inteligente progresivo para reserva ${booking.code}`
    });
  } else {
    // Check if active offers have expired or if all offered therapists declined
    const expiresAtMs = booking.dispatchExpiresAt ? new Date(booking.dispatchExpiresAt).getTime() : 0;
    const isWindowExpired = expiresAtMs > 0 && nowMs >= expiresAtMs;
    const allRejectedInLevel = activeOfferTherapistIds.length === 0 && activeOffers.length > 0;

    if (isWindowExpired || allRejectedInLevel) {
      // Mark timed-out therapists in dispatch history
      for (const offer of activeOffers) {
        const hasAction = dispatchHistory.some(h => h.therapistId === offer.therapistId && (h.action === 'rejected' || h.action === 'accepted'));
        if (!hasAction) {
          dispatchHistory.push({
            therapistId: offer.therapistId,
            therapistName: offer.therapistName || '',
            level: offer.level || currentLevelConfig.maxEtaMinutes,
            etaMinutes: offer.etaMinutes || 0,
            action: 'timeout',
            timestamp: nowIso
          });
          await recordDispatchAuditLog(db, {
            action: 'offer_expired',
            bookingId,
            bookingCode: booking.code,
            therapistId: offer.therapistId,
            therapistName: offer.therapistName,
            dispatchLevel: currentLevelConfig.maxEtaMinutes,
            details: `Expiró ventana de respuesta sin aceptación por parte de ${offer.therapistName}`
          });
        }
      }

      // Check if we reached the maximum level (e.g. 60 min)
      if (levelIndex >= levels.length - 1) {
        // No therapists accepted after level 60
        await bookingRef.update({
          dispatchState: 'sin_disponibilidad',
          activeOfferTherapistIds: [],
          activeOffers: [],
          dispatchHistory,
          updatedAt: nowIso
        });
        await recordDispatchAuditLog(db, {
          action: 'dispatch_failed',
          bookingId,
          bookingCode: booking.code,
          clientId: booking.clientId,
          dispatchLevel: currentLevelConfig.maxEtaMinutes,
          details: 'Despacho completado sin disponibilidad: ningún terapeuta aceptó dentro del rango de 60 minutos'
        });
        return {
          stepped: true,
          dispatchState: 'sin_disponibilidad',
          currentLevel: currentLevelConfig.maxEtaMinutes,
          offersSent: 0,
          message: 'Sin disponibilidad tras agotar el nivel máximo de 60 minutos'
        };
      } else {
        // Advance to next level
        levelIndex += 1;
        currentLevelNum = levels[levelIndex].maxEtaMinutes;
        shouldAdvanceLevel = true;
        activeOfferTherapistIds = [];
        activeOffers = [];
      }
    }
  }

  const levelConfigToExecute = levels[levelIndex];

  if (shouldAdvanceLevel || isBrandNew) {
    await recordDispatchAuditLog(db, {
      action: 'dispatch_level_started',
      bookingId,
      bookingCode: booking.code,
      clientId: booking.clientId,
      dispatchLevel: levelConfigToExecute.maxEtaMinutes,
      details: `Iniciado nivel de despacho: ETA <= ${levelConfigToExecute.maxEtaMinutes} minutos (ventana: ${levelConfigToExecute.responseWindowSeconds}s)`
    });
  }

  // Find eligible candidate therapists for this level
  const candidates = await getEligibleTherapistCandidates(
    db,
    { ...booking, dispatchHistory, rejectedBy: booking.rejectedBy },
    levelConfigToExecute.maxEtaMinutes,
    googleApiKey,
    settings
  );

  const windowExpiresAt = new Date(nowMs + levelConfigToExecute.responseWindowSeconds * 1000).toISOString();
  const newOffers: any[] = [];
  const newOfferedIds: string[] = [];

  const notifiedTherapistIds = new Set<string>();

  for (const cand of candidates) {
    if (notifiedTherapistIds.has(cand.therapistId)) {
      continue;
    }
    notifiedTherapistIds.add(cand.therapistId);

    newOfferedIds.push(cand.therapistId);
    newOffers.push({
      therapistId: cand.therapistId,
      therapistName: cand.therapistName,
      etaMinutes: cand.etaMinutes,
      distanceKm: cand.distanceKm,
      level: levelConfigToExecute.maxEtaMinutes,
      offeredAt: nowIso,
      expiresAt: windowExpiresAt
    });

    dispatchHistory.push({
      therapistId: cand.therapistId,
      therapistName: cand.therapistName,
      level: levelConfigToExecute.maxEtaMinutes,
      etaMinutes: cand.etaMinutes,
      action: 'contacted',
      timestamp: nowIso
    });

    await recordDispatchAuditLog(db, {
      action: 'offer_sent',
      bookingId,
      bookingCode: booking.code,
      therapistId: cand.therapistId,
      therapistName: cand.therapistName,
      dispatchLevel: levelConfigToExecute.maxEtaMinutes,
      etaMinutes: cand.etaMinutes,
      details: `Solicitud despachada a ${cand.therapistName} (ETA estimado: ${cand.etaMinutes} min)`
    });

    // Envío unificado al terapeuta (Prioriza FCM; si no tiene token, usa WebPush como fallback; exactamente 1 notificación lógica)
    sendPushNotificationToUser(db, (cand as any).pushRecipientUid || cand.therapistId, {
      title: '🔔 Masaje solicitado',
      body: `${booking.serviceName || 'Masaje a Domicilio'} en ${booking.cityZone || 'tu zona'} (${booking.time || 'Ahora'} - ETA ${cand.etaMinutes} min)`,
      url: `/terapeuta/servicios?bookingId=${bookingId}`,
      tag: `booking-offer-${bookingId}`,
      soundPreset: 'bell',
      sound: '/sounds/notification_reservation.mp3',
      data: {
        type: 'NEW_BOOKING',
        bookingId,
        role: 'therapist',
        bookingCode: String(booking.code || ''),
        serviceName: String(booking.serviceName || ''),
        cityZone: String(booking.cityZone || ''),
        time: String(booking.time || ''),
        etaMinutes: String(cand.etaMinutes || 0)
      }
    }).catch(e => console.warn('[Dispatch] Error enviando notificación unificada al terapeuta:', e));
  }

  const updatePayload: Record<string, any> = {
    dispatchState: 'buscando',
    currentDispatchLevel: levelConfigToExecute.maxEtaMinutes,
    dispatchLevelStartedAt: (shouldAdvanceLevel || isBrandNew) ? nowIso : (booking.dispatchLevelStartedAt || nowIso),
    dispatchStartedAt: booking.dispatchStartedAt || nowIso,
    dispatchExpiresAt: windowExpiresAt,
    activeOfferTherapistIds: [...activeOfferTherapistIds, ...newOfferedIds],
    activeOffers: [...activeOffers, ...newOffers],
    dispatchHistory,
    updatedAt: nowIso
  };

  // If initial level had ETA, update booking's etaMinutes
  if (candidates.length > 0 && typeof candidates[0].etaMinutes === 'number') {
    updatePayload.etaMinutes = candidates[0].etaMinutes;
  }

  await bookingRef.update(updatePayload);

  return {
    stepped: true,
    dispatchState: 'buscando',
    currentLevel: levelConfigToExecute.maxEtaMinutes,
    offersSent: newOfferedIds.length,
    message: `Nivel ${levelConfigToExecute.maxEtaMinutes} min activo. ${newOfferedIds.length} solicitudes enviadas.`
  };
}

/**
 * Handles explicit rejection by a therapist.
 * Appends therapist to rejectedBy, marks 'rejected' in dispatchHistory,
 * removes therapist from active offers, and if active offers are empty,
 * immediately steps to next level.
 */
export async function rejectDispatchOffer(
  db: Firestore,
  bookingId: string,
  therapistId: string,
  reason: string = 'Declinada por terapeuta'
) {
  const bookingRef = db.collection('reservas').doc(bookingId);
  const nowIso = new Date().toISOString();

  let needsImmediateStep = false;
  let bookingCode = '';

  await db.runTransaction(async (t: Transaction) => {
    const docSnap = await t.get(bookingRef);
    if (!docSnap.exists) throw new Error('Reserva no existe');
    const data = docSnap.data()!;
    bookingCode = data.code || '';

    const rejectedBy = Array.isArray(data.rejectedBy) ? [...data.rejectedBy] : [];
    if (!rejectedBy.includes(therapistId)) {
      rejectedBy.push(therapistId);
    }

    const activeOfferTherapistIds = (Array.isArray(data.activeOfferTherapistIds) ? data.activeOfferTherapistIds : [])
      .filter((id: string) => id !== therapistId);

    const dispatchHistory = Array.isArray(data.dispatchHistory) ? [...data.dispatchHistory] : [];
    const currentOffer = (Array.isArray(data.activeOffers) ? data.activeOffers : []).find((o: any) => o.therapistId === therapistId);

    dispatchHistory.push({
      therapistId,
      therapistName: currentOffer?.therapistName || '',
      level: data.currentDispatchLevel || 10,
      etaMinutes: currentOffer?.etaMinutes || 0,
      action: 'rejected',
      timestamp: nowIso
    });

    if (activeOfferTherapistIds.length === 0) {
      needsImmediateStep = true;
    }

    t.update(bookingRef, {
      rejectedBy,
      activeOfferTherapistIds,
      dispatchHistory,
      updatedAt: nowIso
    });
  });

  await recordDispatchAuditLog(db, {
    action: 'offer_rejected',
    bookingId,
    bookingCode,
    therapistId,
    details: `Terapeuta declinó la solicitud: ${reason}`
  });

  if (needsImmediateStep) {
    // Advance dispatch level immediately without waiting for timeout
    await stepDispatchEngine(db, bookingId);
  }

  return { success: true, immediateStepTriggered: needsImmediateStep };
}

/**
 * Atomic acceptance of a booking by a therapist.
 * 
 * Strict Concurrency Guarantee (Section 8 & 16):
 * - Runs inside an atomic Firestore Transaction.
 * - Confirms booking.state === 'pendiente'.
 * - First therapist wins, updates state to 'aceptada', sets dispatchState to 'asignada',
 *   and clears pending offers.
 * - Any simultaneous/subsequent attempt is rejected with Conflict.
 */
export async function acceptDispatchOfferAtomic(
  db: Firestore,
  bookingId: string,
  therapistId: string,
  therapistData: {
    name?: string;
    photo?: string;
    phone?: string;
  } = {}
) {
  const bookingRef = db.collection('reservas').doc(bookingId);
  const nowIso = new Date().toISOString();

  const result = await db.runTransaction(async (t: Transaction) => {
    const snap = await t.get(bookingRef);
    if (!snap.exists) {
      throw new Error('La reserva no existe.');
    }

    const data = snap.data()!;
    if (data.state !== 'pendiente') {
      throw new Error('Esta reserva ya fue aceptada por otra terapeuta o ya no está disponible.');
    }

    const isDual = data.requiresDualTherapist === true || data.serviceId === 'srv-pareja';
    const existingIds: string[] = Array.isArray(data.therapistIds)
      ? data.therapistIds
      : (data.therapistId ? [data.therapistId] : []);
    const assignedCount = typeof data.assignedTherapistsCount === 'number'
      ? data.assignedTherapistsCount
      : existingIds.length;

    const dispatchHistory = Array.isArray(data.dispatchHistory) ? [...data.dispatchHistory] : [];
    const activeOffer = (Array.isArray(data.activeOffers) ? data.activeOffers : []).find((o: any) => o.therapistId === therapistId);

    const name = therapistData.name || 'Terapeuta Certificada';
    const photo = therapistData.photo || '';
    const phone = therapistData.phone || '';

    let updatePayload: Record<string, any> = {};

    if (!isDual) {
      dispatchHistory.push({
        therapistId,
        therapistName: name,
        level: data.currentDispatchLevel || 10,
        etaMinutes: activeOffer?.etaMinutes || data.etaMinutes || 10,
        action: 'accepted',
        timestamp: nowIso
      });

      updatePayload = {
        state: 'aceptada',
        dispatchState: 'asignada',
        therapistId,
        therapistName: name,
        therapistPhoto: photo,
        therapistPhone: phone,
        therapistIds: [therapistId],
        assignedTherapistsCount: 1,
        activeOfferTherapistIds: [],
        activeOffers: [],
        dispatchHistory,
        acceptedAt: nowIso,
        updatedAt: nowIso
      };
      if (activeOffer?.etaMinutes) {
        updatePayload.etaMinutes = activeOffer.etaMinutes;
      }
    } else {
      // Dual therapist booking
      if (assignedCount >= 2 || existingIds.length >= 2) {
        throw new Error('Esta reserva de masaje en pareja ya tiene sus dos terapeutas asignadas.');
      }
      if (existingIds.includes(therapistId) || data.therapistId === therapistId) {
        throw new Error('Ya has aceptado un cupo en esta reserva. No puedes ocupar ambos cupos.');
      }

      if (assignedCount === 0 || existingIds.length === 0) {
        // Slot 1
        dispatchHistory.push({
          therapistId,
          therapistName: name,
          level: data.currentDispatchLevel || 10,
          etaMinutes: activeOffer?.etaMinutes || data.etaMinutes || 10,
          action: 'accepted',
          timestamp: nowIso
        });
        updatePayload = {
          therapistId,
          therapistName: name,
          therapistPhoto: photo,
          therapistPhone: phone,
          therapistIds: [therapistId],
          assignedTherapistsCount: 1,
          dispatchHistory,
          acceptedAt: nowIso,
          updatedAt: nowIso
        };
      } else {
        // Slot 2: completes dual booking
        dispatchHistory.push({
          therapistId,
          therapistName: name,
          level: data.currentDispatchLevel || 10,
          etaMinutes: activeOffer?.etaMinutes || data.etaMinutes || 10,
          action: 'accepted',
          timestamp: nowIso
        });
        updatePayload = {
          therapistId2: therapistId,
          therapistName2: name,
          therapistPhoto2: photo,
          therapistPhone2: phone,
          therapistIds: [...existingIds, therapistId],
          assignedTherapistsCount: 2,
          state: 'aceptada',
          dispatchState: 'asignada',
          activeOfferTherapistIds: [],
          activeOffers: [],
          dispatchHistory,
          acceptedAt: nowIso,
          updatedAt: nowIso
        };
      }
    }

    t.update(bookingRef, updatePayload);

    return {
      bookingId,
      bookingCode: data.code,
      clientId: data.clientId,
      assignedCount: (updatePayload.assignedTherapistsCount as number),
      state: updatePayload.state || data.state,
      dispatchState: updatePayload.dispatchState || data.dispatchState,
      therapistId,
      therapistName: name
    };
  });

  // Audit logging
  await recordDispatchAuditLog(db, {
    action: 'therapist_assigned',
    bookingId,
    bookingCode: result.bookingCode,
    clientId: result.clientId,
    therapistId: result.therapistId,
    therapistName: result.therapistName,
    details: `Terapeuta ${result.therapistName} asignado exitosamente a la reserva ${result.bookingCode}`
  });

  if (result.state === 'aceptada') {
    await recordDispatchAuditLog(db, {
      action: 'dispatch_completed',
      bookingId,
      bookingCode: result.bookingCode,
      clientId: result.clientId,
      therapistId: result.therapistId,
      therapistName: result.therapistName,
      details: `Despacho completado con éxito. Reserva ${result.bookingCode} confirmada y asignada.`
    });
  }

  // Send native push notification to client
  if (result.clientId) {
    sendPushNotificationToUser(db, result.clientId, {
      title: '✨ ¡Reserva Confirmada!',
      body: `Tu terapeuta ${result.therapistName} ha aceptado tu servicio #${result.bookingCode}.`,
      url: '/cliente',
      tag: `booking-accepted-${bookingId}`,
      soundPreset: 'classic',
      sound: '/sounds/notification_accepted.mp3',
      data: {
        type: 'booking_accepted',
        bookingId,
        bookingCode: result.bookingCode
      }
    }).catch(e => console.warn('[Dispatch] Error sending acceptance push to client:', e));
  }

  return { success: true, ...result };
}
