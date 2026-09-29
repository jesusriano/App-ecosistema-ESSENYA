/**
 * CacheManager Utility for ESSENYA PWA
 *
 * Provides a reliable, developer-friendly interface to query, measure, and clear
 * browser HTTP caches, Workbox runtime caches, and unregistered Service Workers.
 * Specifically designed to empower therapists or administrators to purge desynchronized catalog
 * or profile caches directly from their settings panels.
 */

const CUSTOM_CACHES = {
  services: 'essenya-services-cache',
  firestore: 'firestore-documents-cache',
  fonts: 'google-fonts-cache',
  fontAssets: 'gstatic-fonts-cache'
};

/**
 * Checks if the browser supports the Cache Storage API
 */
export function isCacheStorageSupported(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

/**
 * Purges the services catalog cache specifically.
 * Used when therapists detect out-of-date service descriptions or prices.
 */
export async function clearServicesCache(): Promise<boolean> {
  if (!isCacheStorageSupported()) return false;
  try {
    const success = await window.caches.delete(CUSTOM_CACHES.services);
    console.log(`[CacheManager] Purged custom services cache (${CUSTOM_CACHES.services}):`, success);
    return success;
  } catch (err) {
    console.error('[CacheManager] Error purging services cache:', err);
    return false;
  }
}

/**
 * Purges the Firestore offline cached documents specifically.
 * Useful for forcing fresh live queries when data updates feel lagged.
 */
export async function clearFirestoreDocumentsCache(): Promise<boolean> {
  if (!isCacheStorageSupported()) return false;
  try {
    const success = await window.caches.delete(CUSTOM_CACHES.firestore);
    console.log(`[CacheManager] Purged custom firestore documents cache (${CUSTOM_CACHES.firestore}):`, success);
    return success;
  } catch (err) {
    console.error('[CacheManager] Error purging firestore cache:', err);
    return false;
  }
}

/**
 * Purges ALL caches registered under the current application origin.
 * Includes both custom runtime caches and precached static assets.
 * 
 * @returns List of cache names successfully deleted
 */
export async function purgeAllApplicationCaches(): Promise<{ success: boolean; clearedCaches: string[] }> {
  if (!isCacheStorageSupported()) {
    return { success: false, clearedCaches: [] };
  }

  try {
    const cacheNames = await window.caches.keys();
    console.log('[CacheManager] Found active caches:', cacheNames);
    
    const clearedCaches: string[] = [];
    const deletePromises = cacheNames.map(async (name) => {
      const deleted = await window.caches.delete(name);
      if (deleted) {
        clearedCaches.push(name);
      }
    });

    await Promise.all(deletePromises);
    console.log('[CacheManager] All application caches successfully purged:', clearedCaches);
    return { success: true, clearedCaches };
  } catch (err) {
    console.error('[CacheManager] Critical failure purging all application caches:', err);
    return { success: false, clearedCaches: [] };
  }
}

/**
 * Calculates estimated storage size for each active cache under the current origin.
 * Generates user-friendly metrics for settings panels.
 */
export async function getCacheStorageMetrics(): Promise<{ name: string; sizeBytes: number; itemsCount: number }[]> {
  if (!isCacheStorageSupported()) return [];

  try {
    const cacheNames = await window.caches.keys();
    const metrics = await Promise.all(
      cacheNames.map(async (name) => {
        try {
          const cache = await window.caches.open(name);
          const requests = await cache.keys();
          let sizeBytes = 0;

          // Estimate cache sizes by reading sizes of cached responses
          const sizes = await Promise.all(
            requests.map(async (req) => {
              try {
                const res = await cache.match(req);
                if (!res) return 0;
                const blob = await res.blob();
                return blob.size;
              } catch {
                return 0;
              }
            })
          );

          sizeBytes = sizes.reduce((acc, curr) => acc + curr, 0);

          return {
            name,
            sizeBytes,
            itemsCount: requests.length
          };
        } catch {
          return {
            name,
            sizeBytes: 0,
            itemsCount: 0
          };
        }
      })
    );

    return metrics;
  } catch (err) {
    console.warn('[CacheManager] Failed to compile storage cache metrics:', err);
    return [];
  }
}

/**
 * Unregisters any active Service Workers and purges caches, then triggers
 * a clean reload of the active document.
 * 
 * This is the ultimate "nuclear option" for clients or therapists whose PWAs
 * are stuck in a bad local state or corrupted manifest.
 */
export async function hardResetPWAEcosystem(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    console.warn('[CacheManager] Executing PWA hard reset...');

    // 1. Purge all Cache API stores
    await purgeAllApplicationCaches();

    // 2. Unregister Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        const success = await registration.unregister();
        console.log('[CacheManager] Unregistered Service Worker:', registration.scope, success);
      }
    }

    // 3. Purge LocalStorage and SessionStorage metrics
    try {
      localStorage.removeItem('essenya_cached_pwa_logs');
      sessionStorage.removeItem('essenya_install_prompt_dismissed');
    } catch {
      // Storage access could fail in highly restrictive or iframe contexts
    }

    console.log('[CacheManager] Hard reset complete. Force reloading page...');
    
    // 4. Force reload document from network
    window.location.reload();
  } catch (err) {
    console.error('[CacheManager] Critical failure in PWA hard reset flow:', err);
    // Safe fallback page reload
    window.location.reload();
  }
}
