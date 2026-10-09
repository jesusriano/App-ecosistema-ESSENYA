import crypto from 'crypto';

export interface MetaPurchasePayload {
  eventId: string;
  value: number;
  currency: string;
  fbp?: string;
  fbc?: string;
  email?: string;
  phone?: string;
  /** IP of the CUSTOMER's browser (never Stripe's or the admin's). */
  clientIp?: string;
  /** User agent of the CUSTOMER's browser. */
  userAgent?: string;
  serviceName?: string;
  serviceId?: string;
  bookingId?: string;
  /** Stable customer id (Firebase uid). It is hashed before sending. */
  externalId?: string;
  fullName?: string;
  country?: string;
  /** Unix seconds when the payment happened. Defaults to now. */
  eventTime?: number;
  eventSourceUrl?: string;
  testEventCode?: string;
}

export interface MetaCapiResponse {
  success: boolean;
  eventsReceived?: number;
  fbtraceId?: string;
  skipped?: boolean;
  reason?: string;
  error?: string;
  payloadSent?: any;
}

const GRAPH_API_VERSION = 'v21.0';
const DEFAULT_EVENT_SOURCE_URL = 'https://www.essenya.app/cliente';

/** Meta's normalization: trimmed, lowercase, without accents. */
function normalizeText(value?: string): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  const clean = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return clean || undefined;
}

function hashSha256(value?: string): string | undefined {
  const normalized = normalizeText(value);
  if (!normalized) return undefined;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return undefined;
  // Mexican 10-digit numbers get the 52 country code
  const formatted = digits.length === 10 ? `52${digits}` : digits;
  return crypto.createHash('sha256').update(formatted).digest('hex');
}

function splitName(fullName?: string): { fn?: string; ln?: string } {
  const clean = normalizeText(fullName);
  if (!clean || clean === 'cliente vip' || clean === 'cliente distinguido') return {};
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  return { fn: parts[0], ln: parts.length > 1 ? parts.slice(1).join(' ') : undefined };
}

/** Meta rejects event_time in the future or older than 7 days. */
function safeEventTime(eventTime?: number): number {
  const now = Math.floor(Date.now() / 1000);
  if (!eventTime || !Number.isFinite(eventTime)) return now;
  const sevenDays = 7 * 24 * 60 * 60;
  if (eventTime > now || eventTime < now - sevenDays + 60) return now;
  return Math.floor(eventTime);
}

function isLiveMode(): boolean {
  return process.env.STRIPE_MODE === 'live' ||
    Boolean(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_'));
}

export class MetaConversionsService {
  private getPixel(): string {
    return (process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID || '1591130989374283').trim();
  }

  private getAccessToken(): string {
    return (
      process.env.META_CONVERSIONS_API_ACCESS_TOKEN ||
      process.env.META_CONVERSION_TOKEN ||
      process.env.META_ACCESS_TOKEN ||
      ''
    ).trim();
  }

  getPixelId(): string {
    return this.getPixel();
  }

  hasAccessToken(): boolean {
    return this.getAccessToken().length > 10;
  }

  /**
   * Sends an authoritative 'Purchase' event to the Meta Conversions API (CAPI).
   */
  async sendPurchaseEvent(payload: MetaPurchasePayload): Promise<MetaCapiResponse> {
    const {
      eventId,
      value,
      currency = 'MXN',
      fbp,
      fbc,
      email,
      phone,
      clientIp,
      userAgent,
      serviceName,
      serviceId,
      bookingId,
      externalId,
      fullName,
      country = 'mx',
      eventTime,
      eventSourceUrl,
      testEventCode
    } = payload;

    const pixelId = this.getPixel();
    const accessToken = this.getAccessToken();

    // In LIVE mode the test event code is never sent
    const activeTestCode = isLiveMode()
      ? undefined
      : (testEventCode || process.env.META_TEST_EVENT_CODE || undefined);

    const userData: Record<string, any> = {};

    const em = hashSha256(email);
    if (em) userData.em = [em];

    const ph = normalizePhone(phone);
    if (ph) userData.ph = [ph];

    const { fn, ln } = splitName(fullName);
    const fnHash = hashSha256(fn);
    const lnHash = hashSha256(ln);
    if (fnHash) userData.fn = [fnHash];
    if (lnHash) userData.ln = [lnHash];

    const countryHash = hashSha256(country);
    if (countryHash) userData.country = [countryHash];

    const externalIdHash = hashSha256(externalId);
    if (externalIdHash) userData.external_id = [externalIdHash];

    if (fbp) userData.fbp = fbp;
    if (fbc) userData.fbc = fbc;
    if (clientIp) userData.client_ip_address = clientIp;
    if (userAgent) userData.client_user_agent = userAgent;

    // 'website' events require the customer's browser user agent. Without it (e.g. an old booking
    // confirmed by an admin) the event is reported as generated by the business system.
    const actionSource = userAgent ? 'website' : 'system_generated';

    const numericValue = Number(value) || 0;
    const contentId = serviceId || bookingId || 'vip-service';
    const eventPayload: Record<string, any> = {
      event_name: 'Purchase',
      event_time: safeEventTime(eventTime),
      event_id: eventId,
      action_source: actionSource,
      user_data: userData,
      custom_data: {
        currency: (currency || 'MXN').toUpperCase(),
        value: numericValue,
        content_type: 'product',
        content_name: serviceName || 'Servicio de Masaje VIP ESSENYA',
        content_ids: [contentId],
        num_items: 1,
        ...(bookingId ? { order_id: bookingId } : {}),
        contents: [{ id: contentId, quantity: 1, item_price: numericValue }]
      }
    };
    if (actionSource === 'website') {
      eventPayload.event_source_url = eventSourceUrl || DEFAULT_EVENT_SOURCE_URL;
    }

    const requestBody: Record<string, any> = { data: [eventPayload] };
    if (activeTestCode) {
      requestBody.test_event_code = activeTestCode;
    }

    console.log(`[Meta CAPI] Preparando evento Purchase para ${bookingId || eventId} (Valor: $${numericValue} ${currency}, EventID: ${eventId}, origen: ${actionSource})`);

    if (!accessToken) {
      const errorMsg = 'Falta el token de Meta en Vercel (META_CONVERSIONS_API_ACCESS_TOKEN o META_CONVERSION_TOKEN).';
      console.error(`[Meta CAPI Error]: ${errorMsg}`);
      return {
        success: false,
        skipped: true,
        error: errorMsg,
        reason: 'META_CONVERSIONS_API_ACCESS_TOKEN_MISSING',
        payloadSent: requestBody
      };
    }

    try {
      // The token travels in the request body, never in the URL (URLs end up in logs)
      const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(pixelId)}/events`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ ...requestBody, access_token: accessToken })
      });

      const data: any = await response.json().catch(() => null);

      if (!response.ok || !data?.events_received || data.events_received < 1) {
        const errorDetail = data?.error?.message || `Meta Graph API HTTP ${response.status} sin eventos confirmados (events_received: ${data?.events_received || 0})`;
        console.error(`[Meta CAPI Error]: HTTP ${response.status}`, data?.error || data);
        return {
          success: false,
          eventsReceived: data?.events_received || 0,
          error: errorDetail,
          fbtraceId: data?.error?.fbtrace_id || data?.fbtrace_id,
          payloadSent: requestBody
        };
      }

      console.log(`[Meta CAPI Éxito]: Evento Purchase aceptado por Meta. Events received: ${data.events_received}, FBTrace: ${data.fbtrace_id}`);
      return {
        success: true,
        eventsReceived: data.events_received,
        fbtraceId: data.fbtrace_id,
        payloadSent: requestBody
      };
    } catch (err: any) {
      console.error('[Meta CAPI Exception]:', err?.message || err);
      return {
        success: false,
        error: err?.message || 'Error de red al contactar a Meta',
        payloadSent: requestBody
      };
    }
  }
}

export const metaConversionsService = new MetaConversionsService();
