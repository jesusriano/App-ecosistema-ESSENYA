import React, { useState } from 'react';
import { CreditCard, ExternalLink, ShieldCheck, Sparkles, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export const StripeProductCheckout: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionResult, setSessionResult] = useState<{ sessionId: string; url: string } | null>(null);
  const [testAmount, setTestAmount] = useState<number>(20);
  const [serviceName, setServiceName] = useState<string>('Masaje Relajante VIP — Prueba Stripe TEST');

  const handleCreateCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setSessionResult(null);

    const bookingId = `TEST-DEMO-${Date.now()}`;

    try {
      const response = await fetch('/api/create-stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          serviceName,
          total: testAmount,
          customerEmail: 'prueba.cliente@essenyamexico.com',
          successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}&bookingId=${bookingId}`,
          cancelUrl: `${window.location.origin}/checkout-demo?status=cancelled`
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.url) {
        throw new Error(data.error || `Error del servidor HTTP ${response.status}`);
      }

      setSessionResult({
        sessionId: data.sessionId,
        url: data.url
      });

      // Manejo de iframe: si está dentro de un iframe (AI Studio preview), abrir en nueva pestaña para eludir SAMEORIGIN
      const isInIframe = window.self !== window.top;
      if (isInIframe) {
        const opened = window.open(data.url, '_blank');
        if (!opened) {
          // Si el bloqueador de popups interceptó la ventana, la UI ofrece el botón manual directo
          console.warn('[Stripe Demo] Popup bloqueado, se muestra botón de acceso manual.');
        }
      } else {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('[Stripe Demo] Error al crear sesión de checkout:', err);
      setError(err.message || 'No se pudo comunicar con el endpoint /api/create-stripe-checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-[#FAF8F5] dark:bg-[#0D0D0D] rounded-3xl border border-[#E5DFD3] dark:border-[#262626] shadow-2xl max-w-lg w-full mx-auto my-6">
      {/* Header Badge */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A55B]/10 border border-[#C9A55B]/30 text-[#806020] dark:text-[#C9A55B] text-[11px] font-mono uppercase tracking-widest font-bold mb-4">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Stripe TEST Environment</span>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1C1917] dark:text-white">
          Verificación de Checkout Stripe TEST
        </h2>
        <p className="text-xs text-[#78716C] dark:text-[#A8A29E] mt-1.5 max-w-sm mx-auto">
          Prueba en tiempo real de la nueva clave secreta con el endpoint <code className="font-mono text-[#806020] dark:text-[#C9A55B]">/api/create-stripe-checkout</code>.
        </p>
      </div>

      {/* Product Test Card */}
      <section className="bg-white dark:bg-[#181818] border border-[#E5DFD3] dark:border-[#333333] flex flex-col w-full rounded-2xl overflow-hidden shadow-md">
        <div className="p-5 flex items-start gap-4 border-b border-[#E5DFD3]/60 dark:border-[#262626]">
          <div className="w-14 h-14 rounded-xl bg-[#FAF8F5] dark:bg-[#121212] border border-[#E5DFD3] dark:border-[#333333] flex items-center justify-center shrink-0 text-[#C9A55B]">
            <CreditCard className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20 inline-block mb-1">
              Producto de Prueba
            </span>
            <h3 className="font-serif font-bold text-sm sm:text-base text-[#1C1917] dark:text-white truncate">
              {serviceName}
            </h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono text-lg font-bold text-[#806020] dark:text-[#C9A55B]">
                ${testAmount.toFixed(2)} MXN
              </span>
              <span className="text-[11px] text-[#A8A29E]">Modo Prueba</span>
            </div>
          </div>
        </div>

        {/* Amount Selector Pills */}
        <div className="px-5 py-3 bg-[#FAF8F5]/80 dark:bg-[#141414] border-b border-[#E5DFD3]/60 dark:border-[#262626] flex items-center justify-between text-xs">
          <span className="text-[#78716C] dark:text-[#A8A29E] font-medium">Monto de prueba:</span>
          <div className="flex gap-1.5">
            {[20, 50, 150, 1100].map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => setTestAmount(amt)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                  testAmount === amt
                    ? 'bg-[#C9A55B] text-white shadow-xs'
                    : 'bg-white dark:bg-[#202020] text-[#78716C] dark:text-[#A8A29E] border border-[#E5DFD3] dark:border-[#333333] hover:border-[#C9A55B]'
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button Area */}
        <div className="p-5 space-y-3">
          <button
            type="button"
            id="checkout-demo-button"
            disabled={loading}
            onClick={() => handleCreateCheckout()}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#635BFF] via-[#5851EA] to-[#4F46E5] hover:opacity-95 disabled:opacity-50 text-white font-semibold text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-indigo-500/20 active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando sesión en Stripe...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Ejecutar create-stripe-checkout</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
              </>
            )}
          </button>

          {/* Form Fallback */}
          <form action="/create-checkout-session" method="POST" className="m-0">
            <input type="hidden" name="serviceName" value={serviceName} />
            <input type="hidden" name="total" value={testAmount} />
            <input type="hidden" name="redirect" value="true" />
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 border border-[#E5DFD3] dark:border-[#333333] text-[#78716C] dark:text-[#A8A29E] font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Alternativa: Enviar como formulario POST (HTTP 303)</span>
            </button>
          </form>
        </div>
      </section>

      {/* Error Feedback */}
      {error && (
        <div className="w-full mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Error al conectar con Stripe:</p>
            <p className="mt-0.5 font-mono text-[11px] break-all">{error}</p>
          </div>
        </div>
      )}

      {/* Success & Direct Link Box */}
      {sessionResult && (
        <div className="w-full mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
            <span>¡Sesión de Checkout creada con éxito en Stripe TEST!</span>
          </div>

          <div className="bg-white/80 dark:bg-black/40 p-3 rounded-lg border border-emerald-500/20 font-mono text-[11px] space-y-1">
            <div className="truncate">
              <span className="text-[#888888]">Session ID: </span>
              <span className="font-bold text-[#1C1917] dark:text-white">{sessionResult.sessionId}</span>
            </div>
            <div className="truncate">
              <span className="text-[#888888]">Stripe URL: </span>
              <span className="text-indigo-600 dark:text-indigo-400 underline">{sessionResult.url}</span>
            </div>
          </div>

          <a
            href={sessionResult.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm text-center"
          >
            <span>Abrir Checkout en Nueva Pestaña</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Technical Diagnostics Footer */}
      <div className="w-full mt-5 pt-4 border-t border-[#E5DFD3]/60 dark:border-[#262626] text-[11px] text-[#888888] space-y-1 text-center font-mono">
        <div>Endpoint: <span className="text-[#C9A55B]">POST /api/create-stripe-checkout</span></div>
        <div>Modo: <span className="text-emerald-500 font-semibold">Stripe TEST (MXN)</span></div>
      </div>
    </div>
  );
};

export default StripeProductCheckout;
