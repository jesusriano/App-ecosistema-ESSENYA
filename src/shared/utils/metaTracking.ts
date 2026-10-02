/**
 * Helper para captura de identificadores de atribución de Meta (_fbp, _fbc, fbclid)
 * Compatible con SPA y navegadores con políticas de cookies estrictas.
 */

export interface MetaTrackingData {
  fbp?: string;
  fbc?: string;
  fbclid?: string;
}

export function getMetaTrackingData(): MetaTrackingData {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {};
  }

  const result: MetaTrackingData = {};

  try {
    // 1. Obtener parámetro fbclid de la URL si existe
    const searchParams = new URLSearchParams(window.location.search);
    const fbclid = searchParams.get('fbclid') || undefined;
    if (fbclid) {
      result.fbclid = fbclid;
    }

    // 2. Extraer cookies de primer nivel creadas por Meta Pixel (_fbp, _fbc)
    const rawCookies = document.cookie ? document.cookie.split(';') : [];
    for (const cookieStr of rawCookies) {
      const parts = cookieStr.trim().split('=');
      const name = parts[0];
      const val = parts.slice(1).join('=');
      if (name === '_fbp' && val) {
        result.fbp = decodeURIComponent(val);
      } else if (name === '_fbc' && val) {
        result.fbc = decodeURIComponent(val);
      }
    }

    // 3. Si no existe la cookie _fbc pero sí el parámetro fbclid en URL,
    // estructuramos el formato oficial de Meta: fb.1.{timestamp}.{fbclid}
    if (!result.fbc && fbclid) {
      result.fbc = `fb.1.${Date.now()}.${fbclid}`;
    }
  } catch (err) {
    console.warn('[Meta Tracking] Error al leer cookies o parámetros de atribución:', err);
  }

  return result;
}
