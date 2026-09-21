// Google Analytics 4 (GA4) helper utilities for SPA & Capacitor compatibility

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-ESSENYAMX';

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
 * Track SPA Page Views
 */
export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
  });
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
  if (typeof window === 'undefined' || !window.gtag) {
    // Fallback console log for development debugging
    console.log(`[GA4 Conversion Event]: ${eventName}`, params);
    return;
  }

  window.gtag('event', eventName, {
    ...params,
    send_to: GA_MEASUREMENT_ID,
  });
}
