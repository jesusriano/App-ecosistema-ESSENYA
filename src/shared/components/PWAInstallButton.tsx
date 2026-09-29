import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export interface PWAInstallButtonProps {
  dismissible?: boolean;
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  dismissible = false, 
  className = '' 
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Sync with sessionStorage on load to respect previous dismissals in the active session
  useEffect(() => {
    try {
      const value = sessionStorage.getItem('essenya_pwa_btn_dismissed');
      if (value === 'true') {
        setIsDismissed(true);
      }
    } catch {
      // Storage access could fail in highly restrictive or iframe contexts
    }
  }, []);

  // If already running as installed PWA or manually dismissed, return null
  if (isInstalled || (dismissible && isDismissed)) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDismissed(true);
    try {
      sessionStorage.setItem('essenya_pwa_btn_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  // Helper function to render the dismiss button
  const renderDismissButton = () => {
    if (!dismissible) return null;
    return (
      <button
        onClick={handleDismiss}
        className="p-1 text-[#1C1917]/70 hover:text-[#1C1917] dark:text-zinc-400 dark:hover:text-zinc-100 transition border-l border-[#1C1917]/20 dark:border-zinc-700/30 pl-1.5 ml-1 shrink-0"
        title="Ocultar acceso directo de instalación"
        aria-label="Cerrar aviso de instalación"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    );
  };

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <div className={`inline-flex items-center bg-[#C9A55B] rounded-xl pr-1.5 shadow-md shrink-0 ${className}`}>
        <button
          onClick={install}
          className="flex items-center gap-1.5 rounded-l-xl bg-[#C9A55B] px-3.5 py-1.5 text-xs font-bold text-[#1C1917] hover:brightness-105 transition"
          title="Instalar App ESSENYA"
        >
          <Download className="w-4 h-4 text-[#1C1917]" />
          <span className="hidden sm:inline">Instalar App</span>
        </button>
        {renderDismissButton()}
      </div>
    );
  }

  // iOS Safari flow (provides step-by-step instructions specifically designed for iOS Safari users)
  if (isIOS) {
    return (
      <>
        <div className={`inline-flex items-center bg-[#C9A55B]/10 border border-[#C9A55B]/40 rounded-xl pr-1.5 shrink-0 ${className}`}>
          <button
            onClick={() => setShowIOSGuide(true)}
            className="flex items-center gap-1.5 rounded-l-xl px-3 py-1.5 text-xs font-bold text-[#C9A55B] hover:bg-[#C9A55B]/10 transition"
            title="Instalar en iPhone / iPad (Safari)"
          >
            <Smartphone className="w-4 h-4 text-[#C9A55B]" />
            <span className="hidden sm:inline">Instalar App iOS</span>
          </button>
          {renderDismissButton()}
        </div>

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

  // Fallback button for users where prompt is not auto-triggered yet
  return (
    <>
      <div className={`inline-flex items-center border border-zinc-700 bg-zinc-800/60 rounded-xl pr-1.5 transition shrink-0 ${className}`}>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-l-xl px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-zinc-800/80 transition"
          title="Instalar App"
        >
          <Download className="w-4 h-4 text-[#C9A55B]" />
          <span className="hidden sm:inline">Instalar App</span>
        </button>
        {renderDismissButton()}
      </div>

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
                <h3 className="text-base font-serif font-bold text-[#FAF8F5]">Instalar ESSENYA</h3>
                <p className="text-xs text-zinc-400">Acceso rápido desde tu pantalla de inicio</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-zinc-300 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#C9A55B] text-[#1C1917] font-bold text-xs flex items-center justify-center">1</span>
                <p>En Safari (iOS): Toca <strong>Compartir</strong> ⎋ y luego <strong>«Agregar al inicio»</strong>.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#C9A55B] text-[#1C1917] font-bold text-xs flex items-center justify-center">2</span>
                <p>En Chrome/Edge: Abre el menú de tres puntos (⋮) y selecciona <strong>«Instalar aplicación»</strong>.</p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-[#C9A55B] py-2.5 text-xs font-semibold text-[#1C1917] hover:bg-[#b89348] transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
