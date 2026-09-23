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
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', measurementId, {
    send_page_view: true,
    transport_type: 'beacon',
  });
}

/**
 * Track SPA Page Views across Google Analytics and Meta Pixel
 */
export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined') return;

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
  [key: string]: any;
}

export function trackConversion(eventName: string, params: ConversionEventParams = {}) {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('event', eventName, {
      ...params,
      send_to: GA_MEASUREMENT_ID,
    });
  } else {
    // Fallback console log for development debugging
    console.log(`[GA4 Conversion Event]: ${eventName}`, params);
  }

  // Meta Pixel Conversion Tracking
  if (window.fbq) {
    const metaStandardEvents: Record<string, string> = {
      purchase: 'Purchase',
      begin_checkout: 'InitiateCheckout',
      generate_lead: 'Lead',
      sign_up: 'CompleteRegistration',
      contact: 'Contact',
    };
    const standardEvent = metaStandardEvents[eventName.toLowerCase()];
    if (standardEvent) {
      window.fbq('track', standardEvent, {
        value: params.value,
        currency: params.currency || 'MXN',
        content_name: params.items?.[0]?.item_name,
        content_ids: params.items?.map(i => i.item_id),
      });
    } else {
      window.fbq('trackCustom', eventName, params);
    }
  }
}
