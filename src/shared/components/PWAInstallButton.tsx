import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as installed PWA, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-[#C9A55B] px-3.5 py-2 text-xs font-semibold text-[#1C1917] shadow-md hover:bg-[#b89348] transition"
        title="Instalar App ESSENYA"
      >
        <Download className="w-4 h-4" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow (provides step-by-step instructions specifically designed for iOS Safari users)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-xl border border-[#C9A55B]/40 bg-[#C9A55B]/10 px-3.5 py-2 text-xs font-semibold text-[#C9A55B] hover:bg-[#C9A55B]/20 transition"
          title="Instalar en iPhone / iPad (Safari)"
        >
          <Smartphone className="w-4 h-4" />
          <span>Instalar App iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#1C1917] border border-[#C9A55B]/30 p-6 text-[#FAF8F5] shadow-2xl relative animate-in fade-in zoom-in-95">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#C9A55B]/20 flex items-center justify-center text-[#C9A55B]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#FAF8F5]">Instalar ESSENYA en iPhone</h3>
                  <p className="text-xs text-zinc-400">Acceso rápido desde tu pantalla de inicio</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-zinc-300 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#C9A55B] text-[#1C1917] font-bold text-xs flex items-center justify-center">1</span>
                  <p>Toca el botón <strong>Compartir</strong> <span className="inline-block px-1">⎋</span> en la barra inferior de Safari.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#C9A55B] text-[#1C1917] font-bold text-xs flex items-center justify-center">2</span>
                  <p>Desplázate hacia abajo y selecciona <strong>«Agregar al inicio»</strong> (+).</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#C9A55B] py-2.5 text-xs font-semibold text-[#1C1917] hover:bg-[#b89348] transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback button for mobile users where prompt is not auto-triggered yet
  return (
    <button
      onClick={() => alert('Para instalar ESSENYA como aplicación nativa, abre este sitio en Chrome (Android) o Safari (iOS y pulsa Compartir > Agregar al inicio).')}
      className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/60 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 transition"
      title="Instalar App"
    >
      <Download className="w-4 h-4 text-[#C9A55B]" />
      <span>Instalar App</span>
    </button>
  );
};
