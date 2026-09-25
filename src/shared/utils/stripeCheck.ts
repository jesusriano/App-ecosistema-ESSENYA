/**
 * Utility to verify Stripe frontend configuration (VITE_STRIPE_PUBLISHABLE_KEY)
 * and validate environment readiness for Stripe payments.
 */
export function verifyStripeFrontendConfig(): { isConfigured: boolean; keyPrefix: string } {
  const pubKey = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY || '';
  const isConfigured = typeof pubKey === 'string' && pubKey.startsWith('pk_');
  const keyPrefix = isConfigured ? pubKey.substring(0, 7) + '...' : 'no_key_detected';

  if (!isConfigured) {
    console.warn('[Stripe Config Warning] VITE_STRIPE_PUBLISHABLE_KEY no está definida o no comienza con "pk_". Asegúrate de configurarla en tu entorno (ej. Vercel Project Settings -> Environment Variables).');
  } else {
    console.log(`[Stripe Config OK] Clave pública de Stripe detectada correctamente (${keyPrefix}).`);
  }

  return { isConfigured, keyPrefix };
}
