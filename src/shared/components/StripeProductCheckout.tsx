import React, { useState } from 'react';
import { 
  CreditCard, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Terminal,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'REQUEST' | 'RESPONSE_SUCCESS' | 'ERROR' | 'REDIRECT' | 'INFO';
  title: string;
  details?: Record<string, any> | string;
}

export const StripeProductCheckout: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionResult, setSessionResult] = useState<{ sessionId: string; url: string } | null>(null);
  const [testAmount, setTestAmount] = useState<number>(20);
  const [serviceName, setServiceName] = useState<string>('Masaje Relajante VIP — Prueba Stripe TEST');
  const [copiedLog, setCopiedLog] = useState(false);
  const [copiedSessionId, setCopiedSessionId] = useState(false);
  const [logsExpanded, setLogsExpanded] = useState(true);

  // Initial welcome log
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString('es-MX', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'INFO',
      title: 'Panel de monitoreo inicializado para Stripe TEST',
      details: {
        targetEndpoint: '/api/create-stripe-checkout',
        mode: 'TEST (sk_test_...)',
        currency: 'mxn'
      }
    }
  ]);

  const addLog = (type: LogEntry['type'], title: string, details?: Record<string, any> | string) => {
    const newEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('es-MX', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      title,
      details
    };
    setLogs(prev => [newEntry, ...prev]);
  };

  const handleCreateCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setSessionResult(null);

    const bookingId = `TEST-DEMO-${Date.now()}`;
    const startTime = performance.now();

    const requestPayload = {
      bookingId,
      serviceName,
      total: testAmount,
      customerEmail: 'prueba.cliente@essenyamexico.com',
      successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}&bookingId=${bookingId}`,
      cancelUrl: `${window.location.origin}/checkout-demo?status=cancelled`
    };

    addLog('REQUEST', `POST /api/create-stripe-checkout [${serviceName}]`, {
      ...requestPayload,
      amountCents: testAmount * 100
    });

    try {
      const response = await fetch('/api/create-stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      const latencyMs = Math.round(performance.now() - startTime);
      const data = await response.json().catch(() => null);

      if (!response.ok || !data || !data.success || !data.url) {
        const errorMsg = data?.error || `Error del servidor HTTP ${response.status} (${response.statusText})`;
        
        addLog('ERROR', `Fallo en respuesta (${response.status}) en ${latencyMs}ms`, {
          status: response.status,
          statusText: response.statusText,
          error: errorMsg,
          rawResponse: data
        });

        throw new Error(errorMsg);
      }

      // Success
      addLog('RESPONSE_SUCCESS', `Sesión creada exitosamente en ${latencyMs}ms (HTTP 200)`, {
        sessionId: data.sessionId,
        url: data.url,
        latencyMs,
        bookingId
      });

      setSessionResult({
        sessionId: data.sessionId,
        url: data.url
      });

      // Manejo de redirección o iframe
      const isInIframe = window.self !== window.top;
      if (isInIframe) {
        addLog('REDIRECT', 'Entorno iframe detectado: intentando abrir Checkout en pestaña externa');
        const opened = window.open(data.url, '_blank');
        if (!opened) {
          addLog('INFO', 'Ventana emergente interceptada por el navegador. Usa el botón "Abrir Checkout" directamente.');
        } else {
          addLog('REDIRECT', 'Pestaña externa de Stripe Checkout abierta con éxito.');
        }
      } else {
        addLog('REDIRECT', 'Redirigiendo navegador a pasarela segura de Stripe Checkout...');
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('[Stripe Demo] Error al crear sesión de checkout:', err);
      const msg = err.message || 'No se pudo comunicar con el endpoint /api/create-stripe-checkout';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLogs = () => {
    const textToCopy = logs
      .map(l => `[${l.timestamp}] [${l.type}] ${l.title}\n${l.details ? JSON.stringify(l.details, null, 2) : ''}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(textToCopy);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const handleCopySessionId = (sid: string) => {
    navigator.clipboard.writeText(sid);
    setCopiedSessionId(true);
    setTimeout(() => setCopiedSessionId(false), 2000);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-[#FAF8F5] dark:bg-[#0D0D0D] rounded-3xl border border-[#E5DFD3] dark:border-[#262626] shadow-2xl max-w-2xl w-full mx-auto my-6 space-y-6">
      {/* Header Badge */}
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A55B]/10 border border-[#C9A55B]/30 text-[#806020] dark:text-[#C9A55B] text-[11px] font-mono uppercase tracking-widest font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Stripe TEST Environment Monitor</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1C1917] dark:text-white">
          Verificación de Checkout Stripe TEST
        </h2>
        <p className="text-xs text-[#78716C] dark:text-[#A8A29E] mt-1.5 max-w-md mx-auto">
          Prueba en tiempo real de la clave secreta con captura y diagnóstico de logs de <code className="font-mono text-[#806020] dark:text-[#C9A55B]">/api/create-stripe-checkout</code>.
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
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
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
        <div className="w-full p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Error al conectar con Stripe:</p>
            <p className="mt-0.5 font-mono text-[11px] break-all">{error}</p>
          </div>
        </div>
      )}

      {/* Success & Direct Link Box */}
      {sessionResult && (
        <div className="w-full p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              <span>¡Sesión de Checkout creada con éxito en Stripe TEST!</span>
            </div>
            <button
              onClick={() => handleCopySessionId(sessionResult.sessionId)}
              className="flex items-center gap-1 text-[10px] font-mono bg-emerald-600/20 hover:bg-emerald-600/30 px-2 py-1 rounded-md transition-colors cursor-pointer"
              title="Copiar Session ID"
            >
              {copiedSessionId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSessionId ? 'Copiado' : 'Copiar ID'}</span>
            </button>
          </div>

          <div className="bg-white/80 dark:bg-black/40 p-3 rounded-lg border border-emerald-500/20 font-mono text-[11px] space-y-1">
            <div className="truncate">
              <span className="text-[#888888]">Session ID: </span>
              <span className="font-bold text-[#1C1917] dark:text-white select-all">{sessionResult.sessionId}</span>
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
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm text-center cursor-pointer"
          >
            <span>Abrir Checkout en Nueva Pestaña</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* ======================================================== */}
      {/* REAL-TIME LOGS PANEL FOR STRIPE CHECKOUT DIAGNOSTICS */}
      {/* ======================================================== */}
      <section className="w-full bg-[#121214] dark:bg-[#080808] border border-[#2B2B30] rounded-2xl overflow-hidden shadow-2xl text-left">
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-[#1A1A1E] dark:bg-[#101012] border-b border-[#2B2B30] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div className="h-4 w-[1px] bg-[#2B2B30] mx-1" />
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200">
              <Terminal className="w-3.5 h-3.5 text-[#C9A55B]" />
              <span>Stripe Checkout Event Logs</span>
            </div>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#2B2B30] text-slate-400">
              {logs.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {logs.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="px-2 py-1 rounded-md text-[11px] font-mono text-slate-300 hover:text-white bg-[#25252A] hover:bg-[#303038] transition-colors flex items-center gap-1 cursor-pointer"
                  title="Copiar todos los logs al portapapeles"
                >
                  {copiedLog ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLog ? 'Copiados' : 'Copiar'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-400 bg-[#25252A] hover:bg-[#303038] transition-colors cursor-pointer"
                  title="Limpiar logs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setLogsExpanded(!logsExpanded)}
              className="p-1 rounded-md text-slate-400 hover:text-white bg-[#25252A] hover:bg-[#303038] transition-colors cursor-pointer"
              title={logsExpanded ? "Colapsar logs" : "Expandir logs"}
            >
              {logsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        {logsExpanded && (
          <div className="p-4 max-h-72 overflow-y-auto font-mono text-xs space-y-3 select-text divide-y divide-[#1F1F24]">
            {logs.length === 0 ? (
              <div className="text-slate-500 text-center py-6 text-xs italic">
                No hay eventos registrados aún. Haz clic en "Ejecutar create-stripe-checkout" para capturar la petición.
              </div>
            ) : (
              logs.map((log) => {
                const badgeColor = 
                  log.type === 'REQUEST' ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' :
                  log.type === 'RESPONSE_SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                  log.type === 'ERROR' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                  log.type === 'REDIRECT' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                  'bg-amber-500/10 text-amber-400 border-amber-500/30';

                return (
                  <div key={log.id} className="pt-2.5 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold tracking-wider ${badgeColor}`}>
                          {log.type}
                        </span>
                        <span className="text-slate-400">{log.timestamp}</span>
                      </div>
                    </div>

                    <div className="text-slate-200 font-semibold text-[11px]">
                      {log.title}
                    </div>

                    {log.details && (
                      <pre className="p-2.5 rounded-lg bg-[#0A0A0C] border border-[#222227] text-slate-300 text-[10px] overflow-x-auto leading-relaxed max-h-48 overflow-y-auto">
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Terminal Status Bar */}
        <div className="px-4 py-2 bg-[#0E0E10] border-t border-[#222227] flex items-center justify-between text-[10px] font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Stripe SDK v17 (Node.js API)</span>
          </div>
          <div className="truncate max-w-[200px] text-slate-400">
            API: /api/create-stripe-checkout
          </div>
        </div>
      </section>

      {/* Technical Diagnostics Footer */}
      <div className="w-full pt-2 text-[11px] text-[#888888] space-y-1 text-center font-mono">
        <div>Clave activa: <span className="text-[#C9A55B]">sk_test_51UJJ...CxOck</span></div>
        <div>Moneda: <span className="text-emerald-500 font-semibold">MXN ($)</span></div>
      </div>
    </div>
  );
};

export default StripeProductCheckout;
