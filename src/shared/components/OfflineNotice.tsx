import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

export const OfflineNotice: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showNotification, setShowNotification] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      const timer = setTimeout(() => setShowNotification(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showNotification) {
    return null;
  }

  if (isOnline && showNotification) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-emerald-900/90 border border-emerald-500/40 px-4 py-3 text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <p className="text-xs font-bold">Conexión restablecida</p>
          <p className="text-[11px] text-emerald-200">Sincronizando datos con ESSENYA Cloud...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md rounded-3xl bg-[#1C1917] border border-[#C9A55B]/40 p-8 text-[#FAF8F5] shadow-2xl relative text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-[#C9A55B]/20 border border-[#C9A55B]/40 flex items-center justify-center text-[#C9A55B] mb-6 shadow-inner">
          <WifiOff className="w-8 h-8 animate-pulse" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase tracking-widest mb-3">
          Sin Conexión a Internet
        </span>

        <h2 className="text-xl font-serif font-bold text-[#FAF8F5] mb-2">
          Estás usando el Modo Offline
        </h2>

        <p className="text-xs text-zinc-400 leading-relaxed mb-6">
          ESSENYA ha detectado la pérdida de conexión a la red. Puedes seguir consultando información almacenada en caché local (como tu perfil y citas recientes). Vuelve a conectarte para sincronizar pagos y nuevas reservas.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#C9A55B] py-3 text-xs font-semibold text-[#1C1917] hover:bg-[#b89348] transition shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar Conexión</span>
          </button>

          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-left flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-[#C9A55B] shrink-0 mt-0.5" />
            <div className="text-[11px] text-zinc-400">
              <span className="font-semibold text-zinc-200">Consejo PWA:</span> Si instalaste ESSENYA en tu pantalla de inicio, tus datos locales seguros permanecen protegidos hasta recuperar la señal.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
