import type { ServiceItem } from '../types';

export const OFFICIAL_SERVICE_BASE_PRICES: Record<string, number> = {
  'SRB-relajante': 1100,
  'srv-relajante': 1100,
  'srv-descontracturante': 1200,
  'srv-deportivo': 1250,
  'srv-tejido-profundo': 1300,
  'srv-prenatal': 1100,
  'srv-pareja': 2400
};

// Helper function to calculate duration pricing according to official rules:
// - 60 min: Base price
// - 90 min: Base price + 50% (1.5x)
// - 120 min: Double base price (2x)
export function calculateServicePrice(basePrice: number, durationMinutes: number): number {
  if (durationMinutes === 60) return basePrice;
  if (durationMinutes === 90) return Math.round(basePrice * 1.5);
  if (durationMinutes === 120) return Math.round(basePrice * 2);
  return basePrice;
}

export interface BookingPricingResult {
  basePrice: number;
  durationPrice: number;
  durationAdjustment: number;
  extrasTotal: number;
  subtotal: number;
  discountAmount: number;
  giftCardDeduction: number;
  tip: number;
  total: number;
  isPriceAvailable: boolean;
  unavailableMessage?: string;
}

export interface BookingPricingInput {
  service: Partial<ServiceItem> | null | undefined;
  duration: number;
  extrasTotal?: number;
  selectedExtras?: Array<{ id: string; name: string; durationMinutes: number; price: number }>;
  tip?: number;
  promoDiscount?: number;
  giftCardBalance?: number;
}

/**
 * Single source of truth calculation for booking pricing across Step 2, Step 5, and backend verification.
 */
export function calculateBookingPricing({
  service,
  duration,
  extrasTotal: rawExtrasTotal = 0,
  selectedExtras,
  tip = 0,
  promoDiscount = 0,
  giftCardBalance = 0
}: BookingPricingInput): BookingPricingResult {
  // If selectedExtras array is provided, sum its prices
  let extrasTotal = rawExtrasTotal;
  if (Array.isArray(selectedExtras) && selectedExtras.length > 0) {
    extrasTotal = selectedExtras.reduce((sum, e) => sum + (Number(e.price) || 0), 0);
  }

  if (!service) {
    return {
      basePrice: 0,
      durationPrice: 0,
      durationAdjustment: 0,
      extrasTotal,
      subtotal: 0,
      discountAmount: 0,
      giftCardDeduction: 0,
      tip: 0,
      total: 0,
      isPriceAvailable: false,
      unavailableMessage: 'Precio no disponible. Selecciona otro servicio o comunícate con ESSENYA.'
    };
  }

  // Base price resolution: check service.basePrice or fallback to official map
  let base = typeof service.basePrice === 'number' && service.basePrice > 0 ? service.basePrice : undefined;
  if (!base && service.id) {
    base = OFFICIAL_SERVICE_BASE_PRICES[service.id];
  }

  if (!base || base <= 0) {
    return {
      basePrice: 0,
      durationPrice: 0,
      durationAdjustment: 0,
      extrasTotal,
      subtotal: 0,
      discountAmount: 0,
      giftCardDeduction: 0,
      tip: 0,
      total: 0,
      isPriceAvailable: false,
      unavailableMessage: 'Precio no disponible. Selecciona otro servicio o comunícate con ESSENYA.'
    };
  }

  // Calculate official duration price
  let durationPrice: number;
  if (duration === 60) {
    durationPrice = base;
  } else if (duration === 90) {
    durationPrice = typeof service.price90 === 'number' && service.price90 > 0
      ? service.price90
      : Math.round(base * 1.5);
  } else if (duration === 120) {
    durationPrice = typeof service.price120 === 'number' && service.price120 > 0
      ? service.price120
      : Math.round(base * 2);
  } else {
    durationPrice = base;
  }

  const durationAdjustment = Math.max(0, durationPrice - base);
  const subtotal = durationPrice + (extrasTotal || 0);
  const discountAmount = Math.min(subtotal, Math.max(0, promoDiscount || 0));
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const giftCardDeduction = Math.min(giftCardBalance || 0, afterDiscount);
  const afterGiftCard = Math.max(0, afterDiscount - giftCardDeduction);
  const tipAmount = Math.max(0, tip || 0);
  const total = afterGiftCard + tipAmount;

  return {
    basePrice: base,
    durationPrice,
    durationAdjustment,
    extrasTotal: extrasTotal || 0,
    subtotal,
    discountAmount,
    giftCardDeduction,
    tip: tipAmount,
    total,
    isPriceAvailable: true
  };
}

// Official Pressure Level Options (Spanish-only, unambiguous terminology)
export const PRESSURE_OPTIONS = [
  {
    value: 'suave',
    label: 'Suave',
    description: 'Presión ligera, movimientos delicados y relajantes.'
  },
  {
    value: 'media',
    label: 'Media',
    description: 'Presión equilibrada para relajación y tensión moderada.'
  },
  {
    value: 'firme',
    label: 'Firme',
    description: 'Presión más intensa para trabajar contracturas y tensión acumulada.'
  },
  {
    value: 'profunda',
    label: 'Profunda',
    description: 'Presión intensa y localizada, recomendada para tejido profundo o masaje deportivo.'
  }
] as const;

export type PressureOptionValue = typeof PRESSURE_OPTIONS[number]['value'];

export function formatPressureLevel(level?: string): string {
  if (!level) return 'Media';
  const found = PRESSURE_OPTIONS.find(
    o => o.value.toLowerCase() === level.toLowerCase() || o.label.toLowerCase() === level.toLowerCase()
  );
  return found ? found.label : level;
}
