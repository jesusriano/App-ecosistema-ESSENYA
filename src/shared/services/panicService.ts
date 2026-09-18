import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { PanicAlert } from '../types';
import { handleFirestoreError, OperationType, cleanForFirestore } from '../utils/firestoreDebug';

// CDMX VIP Default Reference Coordinates (Polanco / Lomas de Chapultepec)
export const DEFAULT_CDMX_COORDS = {
  latitude: 19.432608,
  longitude: -99.191376,
  accuracy: 15,
};

export interface TriggerPanicParams {
  userId?: string;
  userName: string;
  userRole?: 'cliente' | 'terapeuta' | 'client' | 'therapist' | 'administrador';
  bookingCode?: string;
  userLocation?: string;
  emergencyType?: 'sos_panico' | 'asistencia_medica' | 'incidente_seguridad' | 'asistencia_urgente';
  notes?: string;
  customCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  speed?: number | null;
  isRealGps: boolean;
  error?: string;
}

/**
 * Obtain high-precision GPS coordinates from the browser with fallback
 */
export async function getCurrentCoordinates(): Promise<GeolocationResult> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return {
      ...DEFAULT_CDMX_COORDS,
      altitude: null,
      speed: null,
      isRealGps: false,
      error: 'Geolocalización no soportada por el navegador'
    };
  }

  return new Promise((resolve) => {
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed,
          isRealGps: true
        });
      },
      (err) => {
        console.warn('GPS position error, using default luxury coordinates:', err.message);
        resolve({
          ...DEFAULT_CDMX_COORDS,
          altitude: null,
          speed: null,
          isRealGps: false,
          error: err.message
        });
      },
      options
    );
  });
}

/**
 * Triggers a real-time Panic Alert in Firestore and returns the created alert ID and initial payload.
 */
export async function triggerPanicAlert(params: TriggerPanicParams): Promise<{ alert: PanicAlert; alertId: string }> {
  const alertId = `PANIC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  
  // Obtain live GPS telemetric coordinates
  let coords: GeolocationResult;
  if (params.customCoordinates) {
    coords = {
      latitude: params.customCoordinates.latitude,
      longitude: params.customCoordinates.longitude,
      accuracy: params.customCoordinates.accuracy || 10,
      altitude: null,
      speed: null,
      isRealGps: true
    };
  } else {
    coords = await getCurrentCoordinates();
  }

  const nowIso = new Date().toISOString();

  // Prioritize active authenticated Firebase user UID to guarantee consistency with Firestore rules
  const resolvedUserId = auth.currentUser?.uid || params.userId || 'anon_user';

  const panicData: PanicAlert = {
    id: alertId,
    userId: resolvedUserId,
    userName: params.userName || 'Usuario VIP ESSENYA',
    userRole: params.userRole || 'cliente',
    bookingCode: params.bookingCode || 'ESS-VIP-EMERGENCY',
    userLocation: params.userLocation || `Polanco VIP, CDMX (GPS: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    altitude: coords.altitude || null,
    speed: coords.speed || null,
    status: 'activa',
    emergencyType: params.emergencyType || 'sos_panico',
    notes: params.notes || 'Botón de pánico SOS activado. Solicitud de asistencia y telemetría transmitida a la Central Admin.',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const collectionPath = 'alertas_panico';
  try {
    const docRef = doc(db, collectionPath, alertId);
    await setDoc(docRef, cleanForFirestore({
      ...panicData,
      serverTime: serverTimestamp()
    }));
    failedAlertIds.delete(alertId);
    console.log(`[ESSENYA S.O.C.] Alerta de pánico ${alertId} registrada exitosamente en Firestore.`);
  } catch (error) {
    failedAlertIds.add(alertId);
    console.error('Error writing panic alert to Firestore:', error);
    try {
      handleFirestoreError(error, OperationType.CREATE, `${collectionPath}/${alertId}`, panicData);
    } catch (_) {
      // Keep going so UI does not freeze during emergency
    }
    throw error;
  }

  // No backup in localStorage for 100% security
  return { alert: panicData, alertId };
}

// Keep track of failed alert IDs to prevent infinite error spamming
const failedAlertIds = new Set<string>();

/**
 * Updates live telemetry coordinates for an existing panic alert in Firestore
 */
export async function updatePanicLocation(
  alertId: string, 
  coords: { latitude: number; longitude: number; accuracy?: number; speed?: number | null }
): Promise<void> {
  if (failedAlertIds.has(alertId)) {
    return;
  }

  const collectionPath = 'alertas_panico';
  const nowIso = new Date().toISOString();

  try {
    const docRef = doc(db, collectionPath, alertId);
    const locPayload: any = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy || 10,
      updatedAt: nowIso,
      lastTelemetryPing: serverTimestamp()
    };
    if (coords.speed != null) {
      locPayload.speed = coords.speed;
    }
    await updateDoc(docRef, cleanForFirestore(locPayload));
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.warn(`Could not update panic location for ${alertId}:`, errorMsg);
    // Mark as failed if document does not exist or permissions error so watcher halts attempts
    failedAlertIds.add(alertId);
  }
}

/**
 * Mark a panic alert as under attention / resolved by the Admin
 */
export async function updatePanicStatus(
  alertId: string, 
  status: 'activa' | 'en_atencion' | 'resuelta',
  adminName: string = 'Administrador S.O.C.'
): Promise<void> {
  const collectionPath = 'alertas_panico';
  const nowIso = new Date().toISOString();

  const updatePayload: any = {
    status,
    updatedAt: nowIso
  };

  if (status === 'en_atencion') {
    updatePayload.attendedBy = adminName;
    updatePayload.attendedAt = nowIso;
  } else if (status === 'resuelta') {
    updatePayload.resolvedBy = adminName;
    updatePayload.resolvedAt = nowIso;
  }

  try {
    const docRef = doc(db, collectionPath, alertId);
    await updateDoc(docRef, cleanForFirestore(updatePayload));
  } catch (error) {
    console.error(`Error changing panic alert status ${alertId}:`, error);
    try {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionPath}/${alertId}`, updatePayload);
    } catch (_) {}
  }
}

/**
 * Subscribe to real-time panic alerts for the Admin Portal
 */
export function subscribeToPanicAlerts(
  onAlertsUpdate: (alerts: PanicAlert[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const collectionPath = 'alertas_panico';

  try {
    const q = query(
      collection(db, collectionPath),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const alerts: PanicAlert[] = [];
        snapshot.forEach((docSnap) => {
          alerts.push(docSnap.data() as PanicAlert);
        });
        onAlertsUpdate(alerts);
      },
      (error) => {
        console.warn('Firestore snapshot error on alertas_panico:', error.message);
        onAlertsUpdate([]);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.error('Error attaching listener to alertas_panico:', err);
    onAlertsUpdate([]);
    return () => {};
  }
}

/**
 * Starts a live geolocation watcher that streams continuous GPS coordinate updates to Firestore
 */
export function startLiveLocationStream(
  alertId: string, 
  onLocationUpdate?: (coords: GeolocationResult) => void
): () => void {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const res: GeolocationResult = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        speed: position.coords.speed,
        isRealGps: true
      };

      if (onLocationUpdate) {
        onLocationUpdate(res);
      }

      // Stream to Firestore
      updatePanicLocation(alertId, {
        latitude: res.latitude,
        longitude: res.longitude,
        accuracy: res.accuracy,
        speed: res.speed
      });
    },
    (err) => {
      console.warn('Live location watch error:', err.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 15000
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}
