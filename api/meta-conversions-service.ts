import crypto from 'crypto';

export interface MetaPurchasePayload {
  eventId: string;
  value: number;
  currency: string;
  fbp?: string;
  fbc?: string;
  email?: string;
  phone?: string;
  clientIp?: string;
  userAgent?: string;
  serviceName?: string;
  bookingId?: string;
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

function hashSha256(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;
  return crypto.createHash('sha256').update(trimmed).digest('hex');
}

function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return undefined;
  // If Mexican phone without 52 prefix, prepend 52
  const formatted = digits.length === 10 ? `52${digits}` : digits;
  return hashSha256(formatted);
}

export class MetaConversionsService {
  private pixelId: string;
  private accessToken: string;
  private testEventCode: string;

  constructor() {
    this.pixelId = process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID || '1591130989374283';
    this.accessToken = process.env.META_CONVERSIONS_API_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
    this.testEventCode = process.env.META_TEST_EVENT_CODE || '';
  }

  getPixelId(): string {
    return this.pixelId;
  }

  hasAccessToken(): boolean {
    return !!(this.accessToken && this.accessToken.trim().length > 10);
  }

  /**
   * Envía un evento 'Purchase' autoritativo a la API de Conversiones de Meta (CAPI)
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
      bookingId,
      testEventCode
    } = payload;

    const currentPixel = this.pixelId;
    const currentToken = this.accessToken || process.env.META_CONVERSIONS_API_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
    const activeTestCode = testEventCode || this.testEventCode || process.env.META_TEST_EVENT_CODE;

    const userData: Record<string, any> = {};

    if (email) {
      const hashedEmail = hashSha256(email);
      if (hashedEmail) userData.em = [hashedEmail];
    }

    if (phone) {
      const hashedPhone = normalizePhone(phone);
      if (hashedPhone) userData.ph = [hashedPhone];
    }

    if (fbp) userData.fbp = fbp;
    if (fbc) userData.fbc = fbc;
    if (clientIp) userData.client_ip_address = clientIp;
    if (userAgent) userData.client_user_agent = userAgent;

    const eventPayload: Record<string, any> = {
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: 'https://essenya.app/cliente',
      action_source: 'website',
      user_data: userData,
      custom_data: {
        currency: (currency || 'MXN').toUpperCase(),
        value: Number(value) || 0,
        content_type: 'product',
        content_name: serviceName || 'Servicio de Masaje VIP ESSENYA',
        contents: [
          {
            id: bookingId || 'vip-service',
            quantity: 1,
            item_price: Number(value) || 0
          }
        ]
      }
    };

    const requestBody: Record<string, any> = {
      data: [eventPayload]
    };

    if (activeTestCode) {
      requestBody.test_event_code = activeTestCode;
    }

    console.log(`[Meta CAPI] Preparando evento Purchase para ${bookingId || eventId} (Valor: $${value} ${currency}, EventID: ${eventId})`);

    // Si no hay token de acceso configurado, registramos el payload con fines de prueba y trazabilidad sin abortar
    if (!currentToken) {
      console.warn(`[Meta CAPI] AVISO: META_CONVERSIONS_API_ACCESS_TOKEN no está definido en variables de entorno. Evento Purchase registrado en modo SIMULACIÓN:`, JSON.stringify(requestBody, null, 2));
      return {
        success: true,
        skipped: true,
        reason: 'META_CONVERSIONS_API_ACCESS_TOKEN no configurado (Simulado correctamente para TEST)',
        payloadSent: requestBody
      };
    }

    try {
      const url = `https://graph.facebook.com/v19.0/${currentPixel}/events?access_token=${currentToken}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        console.error(`[Meta CAPI Error]: HTTP ${response.status}`, data);
        return {
          success: false,
          error: data?.error?.message || `HTTP ${response.status} from Meta Graph API`,
          fbtraceId: data?.error?.fbtrace_id,
          payloadSent: requestBody
        };
      }

      console.log(`[Meta CAPI Éxito]: Evento Purchase aceptado por Meta. Events received: ${data?.events_received}, FBTrace: ${data?.fbtrace_id}`);

      return {
        success: true,
        eventsReceived: data?.events_received,
        fbtraceId: data?.fbtrace_id,
        payloadSent: requestBody
      };
    } catch (err: any) {
      console.error('[Meta CAPI Exception]:', err);
      return {
        success: false,
        error: err.message,
        payloadSent: requestBody
      };
    }
  }
}

export const metaConversionsService = new MetaConversionsService();
