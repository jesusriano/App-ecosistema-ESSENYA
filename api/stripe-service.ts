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
    this.webhookSecret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '';
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
   * Crea una sesión de Stripe Checkout para cobro con tarjeta
   */
  async createCheckoutSession(params: {
    bookingId: string;
    serviceName: string;
    total: number;
    priceId?: string;
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ success: boolean; url: string; sessionId: string }> {
    const { bookingId, serviceName, total, priceId, customerEmail, successUrl, cancelUrl } = params;

    if (!total && !priceId) {
      throw new Error("Faltan datos requeridos de la reserva (total o priceId).");
    }

    const stripe = this.getStripeInstance();
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
                  description: `Reserva y Servicio de Masaje a Domicilio (${bookingId || 'VIP'})`
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
      sessionId: session.id
    };
  }

  /**
   * Valida criptográficamente el evento del Webhook usando el 'raw body' de la petición
   * y la firma 'stripe-signature' con el STRIPE_WEBHOOK_SECRET.
   */
  handleWebhook(rawBody: Buffer | string, signature: string | string[] | undefined): Stripe.Event {
    const sig = Array.isArray(signature) ? signature[0] : signature;
    const stripe = this.getStripeInstance();
    const secret = this.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '';

    if (secret && sig) {
      return stripe.webhooks.constructEvent(rawBody, sig, secret);
    }

    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : (rawBody as any).toString ? JSON.parse(rawBody.toString()) : rawBody;
    return payload as Stripe.Event;
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
