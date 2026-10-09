// Google Analytics 4 (GA4) & Meta Pixel helper utilities for SPA & Capacitor compatibility

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-CTEEJ1427G';
export const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || '1591130989374283';

/**
 * Prefijos de rutas pertenecientes a portales internos que no deben medirse en analítica pública
 */
export const INTERNAL_PORTAL_PREFIXES = [
  '/admin',
  '/administrador',
  '/administracion',
  '/panel-admin',
  '/terapeuta',
  '/terapeutas',
  '/app-terapeuta',
  '/checkout-demo',
];

/**
 * Determina si la ruta actual o indicada corresponde a un portal interno
 */
export function isInternalPortalPath(path?: string): boolean {
  const currentPath = path || (typeof window !== 'undefined' ? window.location.pathname : '');
  const normalized = currentPath.toLowerCase();
  return INTERNAL_PORTAL_PREFIXES.some(prefix => normalized.startsWith(prefix.toLowerCase()));
}

/**
 * Initialize Google Analytics 4 script dynamically in index.html or at runtime.
 */
export function initGA(measurementId: string = GA_MEASUREMENT_ID) {
  if (typeof window === 'undefined') return;
  if (window.gtag) return; // Already initialized

  // Inject GA4 script
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  window.dataLayer = window.dataLayer || [];
  function gtag(..._args: any[]) {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', measurementId, {
    send_page_view: false,
    transport_type: 'beacon',
  });
}

/**
 * Track SPA Page Views across Google Analytics and Meta Pixel
 */
export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined') return;
  if (isInternalPortalPath(path)) return;

  // Google Analytics 4
  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title,
    });
  }

  // Meta Pixel (triggers PageView on SPA route changes)
  if (window.fbq) {
    window.fbq('track', 'PageView');
  }
}

/**
 * Track Key Conversion Events
 */
export interface ConversionEventParams {
  transaction_id?: string;
  value?: number;
  currency?: string;
  items?: Array<{
    item_id: string;
    item_name: string;
    price?: number;
    quantity?: number;
  }>;
  /** Same event id as the server-side Meta Conversions API, so Meta counts the sale once. */
  meta_event_id?: string;
  [key: string]: any;
}

/** Returns true the first time a key is seen in this browser (avoids counting a purchase twice on reload). */
function markOnce(key: string): boolean {
  try {
    const storageKey = `ess_tracked_${key}`;
    if (window.localStorage.getItem(storageKey)) return false;
    window.localStorage.setItem(storageKey, String(Date.now()));
    return true;
  } catch {
    return true; // Storage unavailable: GA4 (transaction_id) and Meta (eventID) still deduplicate
  }
}

const metaStandardEvents: Record<string, string> = {
  purchase: 'Purchase',
  begin_checkout: 'InitiateCheckout',
  generate_lead: 'Lead',
  sign_up: 'CompleteRegistration',
  contact: 'Contact',
};

export function trackConversion(eventName: string, params: ConversionEventParams = {}) {
  if (typeof window === 'undefined') return;

  const { meta_event_id, ...gaParams } = params;
  const currency = gaParams.currency || 'MXN';
  const normalized = eventName.toLowerCase();

  // A purchase is counted only once per transaction in this browser
  if (normalized === 'purchase' && gaParams.transaction_id && !markOnce(`purchase_${gaParams.transaction_id}`)) {
    return;
  }

  // Standard Google Tag Manager (GTM) dataLayer push with both root & ecommerce schemas
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    value: gaParams.value,
    currency,
    transaction_id: gaParams.transaction_id,
    items: gaParams.items,
    ecommerce: {
      transaction_id: gaParams.transaction_id,
      value: gaParams.value,
      currency,
      items: gaParams.items,
    },
  });

  if (window.gtag) {
    window.gtag('event', eventName, {
      ...gaParams,
      currency,
      send_to: GA_MEASUREMENT_ID,
    });
  } else {
    console.log(`[GA4 Conversion Event]: ${eventName}`, gaParams);
  }

  // Meta Pixel. The eventID lets Meta merge this browser event with the server (CAPI) event.
  if (window.fbq) {
    const standardEvent = metaStandardEvents[normalized];
    const options = meta_event_id ? { eventID: meta_event_id } : undefined;
    if (standardEvent) {
      const metaData: Record<string, any> = { currency, content_type: 'product' };
      if (typeof gaParams.value === 'number') metaData.value = gaParams.value;
      if (gaParams.items?.length) {
        metaData.content_name = gaParams.items[0].item_name;
        metaData.content_ids = gaParams.items.map(i => i.item_id);
        metaData.num_items = gaParams.items.reduce((acc, i) => acc + (i.quantity || 1), 0);
      }
      if (options) window.fbq('track', standardEvent, metaData, options);
      else window.fbq('track', standardEvent, metaData);
    } else {
      if (options) window.fbq('trackCustom', eventName, gaParams, options);
      else window.fbq('trackCustom', eventName, gaParams);
    }
  }
}

/*
 * Push notification events are technical diagnostics: they go only to Google Analytics,
 * without personal identifiers, and are NOT sent to the Meta pixel (they would add noise
 * to the ad audiences).
 */

export function trackPushSubscriptionSuccess(
  platform: 'web' | 'android' | 'ios',
  _userId: string = 'anonymous',
  method: 'vapid' | 'fcm' = 'vapid'
) {
  if (typeof window === 'undefined' || isInternalPortalPath()) return;
  const params = { platform, method };
  if (window.gtag) {
    window.gtag('event', 'push_subscription_success', { ...params, send_to: GA_MEASUREMENT_ID });
  } else {
    console.log('[Analytics] Event: push_subscription_success', params);
  }
}

export function trackPushSubscriptionError(
  platform: 'web' | 'android' | 'ios',
  _userId: string = 'anonymous',
  errorMessage: string = 'Unknown Error'
) {
  if (typeof window === 'undefined' || isInternalPortalPath()) return;
  const params = { platform, error_message: String(errorMessage || '').substring(0, 100) };
  if (window.gtag) {
    window.gtag('event', 'push_subscription_failed', { ...params, send_to: GA_MEASUREMENT_ID });
  } else {
    console.log('[Analytics] Event: push_subscription_failed', params);
  }
}

export function trackPushNotificationReceived(
  platform: 'web' | 'android' | 'ios',
  title: string,
  _bookingId?: string
) {
  if (typeof window === 'undefined' || isInternalPortalPath()) return;
  const params = { platform, notification_title: String(title || '').substring(0, 100) };
  if (window.gtag) {
    window.gtag('event', 'push_notification_received', { ...params, send_to: GA_MEASUREMENT_ID });
  } else {
    console.log('[Analytics] Event: push_notification_received', params);
  }
}

export function trackPushNotificationClicked(
  platform: 'web' | 'android' | 'ios',
  title: string,
  _bookingId?: string,
  action?: string
) {
  if (typeof window === 'undefined' || isInternalPortalPath()) return;
  const params = {
    platform,
    notification_title: String(title || '').substring(0, 100),
    action_clicked: action || 'open_app',
  };
  if (window.gtag) {
    window.gtag('event', 'push_notification_clicked', { ...params, send_to: GA_MEASUREMENT_ID });
  } else {
    console.log('[Analytics] Event: push_notification_clicked', params);
  }
}
