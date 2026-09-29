import { doc, setDoc, collection } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';

export type PWALogType = 'service-worker' | 'push-manager' | 'network' | 'application';
export type PWALogLevel = 'error' | 'warn' | 'info';

export interface PWADiagnosticLog {
  id: string;
  type: PWALogType;
  level: PWALogLevel;
  message: string;
  stack?: string;
  timestamp: string;
  userId?: string;
  userAgent: string;
  isOnline: boolean;
  metadata?: Record<string, any>;
}

const LOCAL_STORAGE_KEY = 'essenya_cached_pwa_logs';

/**
 * Helper to safely serialize error objects into strings or structured metadata
 */
function serializeError(err: any): { message: string; stack?: string } {
  if (err instanceof Error) {
    return {
      message: err.message,
      stack: err.stack ? err.stack.substring(0, 1500) : undefined // Truncate to avoid large payloads
    };
  } else if (err && typeof err === 'object') {
    try {
      return {
        message: JSON.stringify(err)
      };
    } catch {
      return {
        message: String(err)
      };
    }
  }
  return {
    message: String(err || 'Unknown Error')
  };
}

/**
 * Gets cached logs from localStorage
 */
function getCachedLogs(): PWADiagnosticLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Saves cached logs back to localStorage
 */
function saveCachedLogs(logs: PWADiagnosticLog[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Keep a maximum of 50 logs in local storage to prevent bloat
    const limitedLogs = logs.slice(-50);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(limitedLogs));
  } catch (e) {
    console.warn('[ErrorLogger] Failed to write cache to localStorage:', e);
  }
}

/**
 * Dispatches a single diagnostic log to Firestore.
 * If offline or if Firestore write fails, cache it for later retry.
 */
async function sendToFirestore(log: PWADiagnosticLog): Promise<boolean> {
  try {
    if (!navigator.onLine) {
      return false;
    }
    const logRef = doc(collection(db, 'pwa_diagnostic_logs'), log.id);
    await setDoc(logRef, log);
    return true;
  } catch (err) {
    console.warn('[ErrorLogger] Firestore remote diagnostic logging deferred:', err);
    return false;
  }
}

/**
 * Creates and processes a diagnostic trace log.
 * Consoles the entry and attempts sending to remote telemetry, or stores in offline cache.
 */
export async function createPWALog(
  type: PWALogType,
  level: PWALogLevel,
  message: string,
  rawError?: any,
  metadata?: Record<string, any>
): Promise<void> {
  const serialized = rawError ? serializeError(rawError) : undefined;
  const timestamp = new Date().toISOString();
  const id = `log_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const userId = auth.currentUser?.uid || 'anonymous';
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'NodeServer';
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;

  const log: PWADiagnosticLog = {
    id,
    type,
    level,
    message: serialized ? `${message} (Error: ${serialized.message})` : message,
    stack: serialized?.stack,
    timestamp,
    userId,
    userAgent,
    isOnline,
    metadata: metadata || {}
  };

  // Console output
  const consolePrefix = `[PWA-${type.toUpperCase()}] [${level.toUpperCase()}]`;
  if (level === 'error') {
    console.error(consolePrefix, message, rawError || '');
  } else if (level === 'warn') {
    console.warn(consolePrefix, message);
  } else {
    console.log(consolePrefix, message);
  }

  // Remote telemetry dispatch
  const success = await sendToFirestore(log);
  if (!success) {
    // Save to local cache for offline/resilience fallback
    const cached = getCachedLogs();
    cached.push(log);
    saveCachedLogs(cached);
  }
}

/**
 * Convenience logger for PWA/ServiceWorker Errors
 */
export async function logPWAError(
  type: PWALogType,
  message: string,
  rawError?: any,
  metadata?: Record<string, any>
): Promise<void> {
  await createPWALog(type, 'error', message, rawError, metadata);
}

/**
 * Convenience logger for PWA/ServiceWorker Warnings
 */
export async function logPWAWarning(
  type: PWALogType,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  await createPWALog(type, 'warn', message, undefined, metadata);
}

/**
 * Convenience logger for PWA/ServiceWorker Info/Telemetry Traces
 */
export async function logPWAInfo(
  type: PWALogType,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  await createPWALog(type, 'info', message, undefined, metadata);
}

/**
 * Flushes all locally cached offline diagnostic logs to Firestore when connection is online.
 */
export async function syncCachedLogs(): Promise<number> {
  if (typeof navigator === 'undefined' || !navigator.onLine) {
    return 0;
  }

  const logs = getCachedLogs();
  if (logs.length === 0) return 0;

  console.log(`[ErrorLogger] Syncing ${logs.length} cached offline logs to Firestore...`);
  const failedToSync: PWADiagnosticLog[] = [];
  let syncedCount = 0;

  for (const log of logs) {
    const success = await sendToFirestore({ ...log, isOnline: true });
    if (success) {
      syncedCount++;
    } else {
      failedToSync.push(log);
    }
  }

  saveCachedLogs(failedToSync);
  if (syncedCount > 0) {
    console.log(`[ErrorLogger] Telemetry synchronization completed. ${syncedCount} logs uploaded.`);
  }
  return syncedCount;
}

// Auto-activate offline log syncing on internet reconnection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncCachedLogs().catch(() => {});
  });

  // Preventive trigger on app startup
  setTimeout(() => {
    if (navigator.onLine) {
      syncCachedLogs().catch(() => {});
    }
  }, 5000);
}
