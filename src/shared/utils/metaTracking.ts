/**
 * Helper para captura de identificadores de atribución de Meta (_fbp, _fbc, fbclid)
 * Compatible con SPA y navegadores con políticas de cookies estrictas.
 *
 * El parámetro fbclid solo llega en la primera página (cuando la persona hace clic
 * en un anuncio). Se guarda al entrar para que siga disponible al momento del pago,
 * aunque la URL ya haya cambiado o el navegador bloquee la cookie _fbc.
 */

export interface MetaTrackingData {
  fbp?: string;
  fbc?: string;
  fbclid?: string;
}

const STORED_FBC_KEY = 'ess_meta_fbc';
const FBC_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // Meta acepta clics de hasta 90 días

function readCookie(name: string): string | undefined {
  const rawCookies = document.cookie ? document.cookie.split(';') : [];
  for (const cookieStr of rawCookies) {
    const parts = cookieStr.trim().split('=');
    if (parts[0] === name) {
      const val = parts.slice(1).join('=');
      return val ? decodeURIComponent(val) : undefined;
    }
  }
  return undefined;
}

function readStoredFbc(): string | undefined {
  try {
    const raw = window.localStorage.getItem(STORED_FBC_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { fbc: string; at: number };
    if (!parsed?.fbc || Date.now() - parsed.at > FBC_MAX_AGE_MS) {
      window.localStorage.removeItem(STORED_FBC_KEY);
      return undefined;
    }
    return parsed.fbc;
  } catch {
    return undefined;
  }
}

/**
 * Llamar una vez al cargar la app: si la persona llegó desde un anuncio de Meta
 * (URL con fbclid), guarda el identificador del clic.
 */
export function captureMetaClickId(): void {
  if (typeof window === 'undefined') return;
  try {
    const fbclid = new URLSearchParams(window.location.search).get('fbclid');
    if (!fbclid) return;
    const fbc = `fb.1.${Date.now()}.${fbclid}`;
    window.localStorage.setItem(STORED_FBC_KEY, JSON.stringify({ fbc, at: Date.now() }));
  } catch {
    // localStorage no disponible: la cookie _fbc del píxel sigue funcionando
  }
}

export function getMetaTrackingData(): MetaTrackingData {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {};
  }

  const result: MetaTrackingData = {};

  try {
    // 1. Parámetro fbclid de la URL actual, si existe
    const fbclid = new URLSearchParams(window.location.search).get('fbclid') || undefined;
    if (fbclid) {
      result.fbclid = fbclid;
    }

    // 2. Cookies de primer nivel creadas por el píxel de Meta
    result.fbp = readCookie('_fbp');
    result.fbc = readCookie('_fbc');

    // 3. Respaldo: clic guardado al entrar, o construido desde la URL actual
    if (!result.fbc) {
      result.fbc = readStoredFbc() || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined);
    }
  } catch (err) {
    console.warn('[Meta Tracking] Error al leer cookies o parámetros de atribución:', err);
  }

  return result;
}
