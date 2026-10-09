import Stripe from 'stripe';

/**
 * Servicio modular de Node.js para integraciones con Stripe API.
 * Gestiona Checkout Sessions, validación segura de Webhooks y Reembolsos.
 */
export class StripeService {
  private stripe: Stripe | null = null;
  private currentKey: string = '';
  private webhookSecret: string = '';

  constructor(secretKey?: string, webhookSecret?: string) {
    this.currentKey = secretKey || process.env.STRIPE_SECRET_KEY || '';
    if (this.currentKey) {
      this.stripe = new Stripe(this.currentKey);
    }
    this.webhookSecret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || process.env.CLAVE_SECRETA_WEBHOOK_STRIPE || '';
  }

  /**
   * Obtiene la instancia subyacente del SDK de Stripe de manera reactiva al entorno
   */
  getStripeInstance(): Stripe {
    const envKey = process.env.STRIPE_SECRET_KEY || '';
    if (!this.stripe || this.currentKey !== envKey) {
      if (!envKey) {
        throw new Error("STRIPE_SECRET_KEY no está configurada en las variables de entorno.");
      }
      this.currentKey = envKey;
      this.stripe = new Stripe(envKey);
    }
    return this.stripe;
  }

  /**
   * Determina de forma determinista si la integración opera en modo TEST o LIVE
   */
  getStripeMode(): 'test' | 'live' {
    if (process.env.STRIPE_MODE === 'test') return 'test';
    if (process.env.STRIPE_MODE === 'live') return 'live';
    const key = process.env.STRIPE_SECRET_KEY || this.currentKey || '';
    return key.startsWith('sk_test_') ? 'test' : 'live';
  }

  isTestMode(): boolean {
    return this.getStripeMode() === 'test';
  }

  /**
   * Crea una sesión de Stripe Checkout para cobro con tarjeta
   */
  async createCheckoutSession(params: {
    bookingId: string;
    serviceName: string;
    total: number;
    priceId?: string;
    customerEmail?: string;
    fbp?: string;
    fbc?: string;
    eventId?: string;
    /** Customer's browser IP / user agent, so Meta can match the purchase to the person who saw the ad. */
    clientIp?: string;
    clientUserAgent?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ success: boolean; url: string; sessionId: string; mode: 'test' | 'live' }> {
    const { bookingId, serviceName, total, priceId, customerEmail, fbp, fbc, clientIp, clientUserAgent, successUrl, cancelUrl } = params;
    // The purchase event id is always derived from the booking, so browser and server events match in Meta
    const eventId = bookingId ? `purchase_${bookingId}` : (params.eventId || `purchase_${Date.now()}`);

    if (!total && !priceId) {
      throw new Error("Faltan datos requeridos de la reserva (total o priceId).");
    }

    const mode = this.getStripeMode();
    const stripe = this.getStripeInstance();

    // Medida de seguridad estricta: si se solicitó STRIPE_MODE=test pero la clave no es de test, abortar
    if (process.env.STRIPE_MODE === 'test' && !this.currentKey.startsWith('sk_test_')) {
      throw new Error("SEGURIDAD: STRIPE_MODE está en 'test' pero la clave configurada no es una clave de prueba (sk_test_). Operación bloqueada.");
    }

    console.log(`[Stripe Checkout] Creando sesión de Checkout en MODO ${mode.toUpperCase()} para reserva: ${bookingId}, Monto: $${total} MXN`);

    const sessionParams: any = {
      mode: 'payment',
      ui_mode: 'hosted_page',
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: priceId
        ? [
            {
              price: priceId,
              quantity: 1,
            },
          ]
        : [
            {
              price_data: {
                currency: 'mxn',
                product_data: {
                  name: `ESSENYA — ${serviceName || 'Servicio de Masaje VIP'}`,
                  description: `Reserva y Servicio de Masaje a Domicilio (${bookingId || 'VIP'}) [${mode.toUpperCase()}]`
                },
                unit_amount: Math.round(Number(total) * 100),
              },
              quantity: 1,
            },
          ],
      billing_address_collection: 'auto',
      phone_number_collection: {
        enabled: true,
      },
      allow_promotion_codes: false,
      submit_type: 'auto',
      customer_email: customerEmail || undefined,
      metadata: {
        bookingId: bookingId || '',
        stripe_mode: mode,
        fbp: (fbp || '').slice(0, 300),
        fbc: (fbc || '').slice(0, 300),
        client_ip: (clientIp || '').slice(0, 64),
        client_ua: (clientUserAgent || '').slice(0, 450),
        eventId,
        integration_identifier: 'hosted_mobile_app_0001',
        origin_context: 'mobile_app'
      }
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      throw new Error("Stripe no retornó una URL válida para la sesión de Checkout.");
    }

    return {
      success: true,
      url: session.url,
      sessionId: session.id,
      mode
    };
  }

  /**
   * Valida criptográficamente el evento del Webhook usando el 'raw body' de la petición
   * y la firma 'stripe-signature' con el STRIPE_WEBHOOK_SECRET.
   */
  handleWebhook(rawBody: Buffer | string, signature: string | string[] | undefined): Stripe.Event {
    const sig = Array.isArray(signature) ? signature[0] : signature;
    const stripe = this.getStripeInstance();
    const secret = this.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || process.env.CLAVE_SECRETA_WEBHOOK_STRIPE || '';

    if (!secret || !sig) {
      throw new Error("STRIPE_WEBHOOK_SECRET o la firma (stripe-signature) ausentes. Validación criptográfica obligatoria para webhooks de Stripe.");
    }

    return stripe.webhooks.constructEvent(rawBody, sig, secret);
  }

  /**
   * Procesa un reembolso parcial o total a través de la API de Stripe
   */
  async createRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason?: Stripe.RefundCreateParams.Reason;
  }): Promise<Stripe.Refund> {
    const stripe = this.getStripeInstance();
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: params.paymentIntentId,
      reason: params.reason || 'requested_by_customer',
    };

    if (params.amount && params.amount > 0) {
      refundParams.amount = Math.round(params.amount * 100);
    }

    return await stripe.refunds.create(refundParams);
  }
}

export const stripeService = new StripeService();
