import Stripe from 'stripe';

/**
 * Servicio modular de Node.js para integraciones con Stripe API.
 * Gestiona Checkout Sessions, validación segura de Webhooks y Reembolsos.
 */
export class StripeService {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(secretKey?: string, webhookSecret?: string) {
    const apiKey = secretKey || process.env.STRIPE_SECRET_KEY || '';
    if (!apiKey) {
      console.warn('⚠️ [StripeService]: STRIPE_SECRET_KEY no configurada en las variables de entorno.');
    }
    this.stripe = new Stripe(apiKey);
    this.webhookSecret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '';
  }

  /**
   * Obtiene la instancia subyacente del SDK de Stripe
   */
  getStripeInstance(): Stripe {
    const currentKey = process.env.STRIPE_SECRET_KEY || '';
    if (currentKey && (!this.stripe || !(this.stripe as any)._apiKey || (this.stripe as any)._apiKey === '')) {
      this.stripe = new Stripe(currentKey);
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

    if (this.webhookSecret && sig) {
      return this.stripe.webhooks.constructEvent(rawBody, sig, this.webhookSecret);
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
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: params.paymentIntentId,
      reason: params.reason || 'requested_by_customer',
    };

    if (params.amount && params.amount > 0) {
      refundParams.amount = Math.round(params.amount * 100);
    }

    return await this.stripe.refunds.create(refundParams);
  }
}

export const stripeService = new StripeService();
