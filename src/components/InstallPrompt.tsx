import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  Smartphone, 
  X, 
  Sparkles, 
  CheckCircle2, 
  Share, 
  PlusSquare, 
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface InstallPromptProps {
  /** Callback invoked when the user successfully installs the PWA */
  onInstalled?: () => void;
  /** Callback invoked when the user dismisses the install prompt */
  onDismiss?: () => void;
  /** Whether to force displaying the prompt for testing / demo purposes */
  forceVisible?: boolean;
  /** Delay in milliseconds before automatically showing the prompt once available */
  autoShowDelayMs?: number;
  /** Custom additional CSS classes */
  className?: string;
}

/**
 * Checks whether the application is already running in standalone (installed) mode.
 */
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
  const isNavigatorStandalone = (window.navigator as unknown as { standalone?: boolean })?.standalone === true;
  const isAndroidIntent = document.referrer?.startsWith('android-app://');

  return Boolean(isStandaloneMatch || isNavigatorStandalone || isAndroidIntent);
}

/**
 * Custom hook to monitor PWA installation status and listen for 'beforeinstallprompt'.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check if already installed
    if (isPWAInstalled()) {
      setIsInstalled(true);
      return;
    }

    // 2. Detect iOS WebKit
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    // 3. Listen for 'beforeinstallprompt'
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 4. Listen for 'appinstalled'
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    // 5. Media query listener for display-mode change
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = (evt: MediaQueryListEvent) => {
      if (evt.matches) {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery.addEventListener?.('change', handleDisplayChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener?.('change', handleDisplayChange);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unsupported'> => {
    if (!deferredPrompt) {
      return 'unsupported';
    }

    try {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
      return choice.outcome;
    } catch (err) {
      console.warn('[InstallPrompt] Prompt execution encountered an issue:', err);
      return 'dismissed';
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt]);

  return {
    deferredPrompt,
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isInstalling,
    triggerInstall,
  };
}

/**
 * InstallPrompt Component
 *
 * Listens for the 'beforeinstallprompt' event and prompts the user to install
 * the ESSENYA PWA if it's not already installed.
 */
export const InstallPrompt: React.FC<InstallPromptProps> = ({
  onInstalled,
  onDismiss,
  forceVisible = false,
  autoShowDelayMs = 1200,
  className = '',
}) => {
  const {
    deferredPrompt,
    isInstallable,
    isInstalled,
    isIOS,
    isInstalling,
    triggerInstall,
  } = useInstallPrompt();

  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Check dismissal state in session storage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('essenya_install_prompt_dismissed');
      if (stored === 'true') {
        setIsDismissed(true);
      }
    } catch {
      // Storage access could fail in restricted iframe / private browsing
    }
  }, []);

  // Determine visibility when installable or iOS detected and not already installed
  useEffect(() => {
    if (isInstalled && !forceVisible) {
      setIsVisible(false);
      return;
    }

    if (forceVisible) {
      setIsVisible(true);
      return;
    }

    if ((isInstallable || isIOS) && !isDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, autoShowDelayMs);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, isIOS, isDismissed, forceVisible, autoShowDelayMs]);

  // Handle native install click
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      const outcome = await triggerInstall();
      if (outcome === 'accepted') {
        setIsVisible(false);
        onInstalled?.();
      } else if (outcome === 'dismissed') {
        // User pressed "Cancel" in browser dialog
        handleDismiss();
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  // Handle user dismissal
  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    try {
      sessionStorage.setItem('essenya_install_prompt_dismissed', 'true');
    } catch {
      // ignore storage errors
    }
    onDismiss?.();
  };

  // If already installed and not forced, render nothing
  if (isInstalled && !forceVisible) {
    return null;
  }

  // If neither installable nor iOS nor forced, render nothing
  if (!isInstallable && !isIOS && !forceVisible) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <div className={`install-prompt-container fixed bottom-24 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 z-[9999] max-w-sm w-[calc(100vw-2rem)] sm:w-96 select-none ${className}`}>
            {!isMinimized ? (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                role="region"
                aria-label="Invitación para instalar la App ESSENYA"
                className="relative overflow-hidden rounded-2xl bg-white/95 dark:bg-[#1C1917]/95 backdrop-blur-xl border border-[#C9A55B]/40 shadow-2xl p-5 text-[#1C1917] dark:text-[#FAF8F5]"
              >
                {/* Decorative golden ambient glow */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#C9A55B]/15 rounded-full blur-2xl pointer-events-none" />

                {/* Header with App Brand, Badge, and Close Button */}
                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1C1917] to-[#2B2620] border border-[#C9A55B]/50 flex items-center justify-center shadow-md p-1.5 shrink-0">
                      <img 
                        src="/icons/icon-192.png" 
                        alt="Logo ESSENYA" 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Fallback icon if image path is unavailable
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }} 
                      />
                      <Sparkles className="w-6 h-6 text-[#C9A55B] hidden fallback-icon" />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/30 px-2 py-0.5 rounded-full">
                          App Oficial
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium">PWA</span>
                      </div>
                      <h3 className="text-sm font-bold font-serif text-[#1C1917] dark:text-[#FAF8F5] leading-tight mt-0.5">
                        Instalar ESSENYA
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => setIsMinimized(true)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
                      title="Minimizar notificación"
                      aria-label="Minimizar aviso de instalación"
                    >
                      <span className="text-xs font-semibold px-0.5">_</span>
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
                      title="Cerrar"
                      aria-label="Cerrar aviso de instalación"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Perks description */}
                <div className="mt-3.5 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300 relative z-10">
                  <p className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
                    Disfruta de la experiencia completa en tu pantalla de inicio:
                  </p>
                  <ul className="space-y-1 pt-1">
                    <li className="flex items-center space-x-2">
                      <Zap className="w-3.5 h-3.5 text-[#C9A55B] shrink-0" />
                      <span>Acceso directo sin barra del navegador</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#C9A55B] shrink-0" />
                      <span>Alertas push en tiempo real de tus reservas</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#C9A55B] shrink-0" />
                      <span>Mayor fluidez y navegación instantánea</span>
                    </li>
                  </ul>
                </div>

                {/* Primary & Secondary Action Buttons */}
                <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-2 relative z-10">
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
                  >
                    Quizás después
                  </button>

                  <button
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="flex-1 max-w-[200px] flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-[#C9A55B] via-[#D4B36A] to-[#B89348] px-4 py-2.5 text-xs font-bold text-[#1C1917] shadow-md hover:brightness-105 active:scale-98 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isInstalling ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full border-2 border-[#1C1917] border-t-transparent animate-spin" />
                        Instalando...
                      </span>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-[#1C1917]" />
                        <span>{isIOS ? 'Instalar en iOS' : 'Instalar App'}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#1C1917]" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Minimized Floating Badge */
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setIsMinimized(false)}
                className="flex items-center gap-2.5 rounded-full bg-white/95 dark:bg-[#1C1917]/95 border border-[#C9A55B] px-4 py-2 shadow-xl hover:shadow-2xl transition-all cursor-pointer backdrop-blur-md ml-auto"
                title="Abrir invitación de instalación"
              >
                <div className="w-6 h-6 rounded-full bg-[#C9A55B]/20 flex items-center justify-center text-[#C9A55B]">
                  <Download className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-[#1C1917] dark:text-[#FAF8F5]">
                  Instalar ESSENYA
                </span>
              </motion.button>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Guided Step-by-Step Instructions Modal for iOS Safari Users */}
      <AnimatePresence>
        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm rounded-2xl bg-[#1C1917] border border-[#C9A55B]/40 p-6 text-[#FAF8F5] shadow-2xl relative"
            >
              <button
                onClick={() => setShowIOSModal(false)}
                className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition"
                aria-label="Cerrar guía iOS"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-[#C9A55B]/20 border border-[#C9A55B]/40 flex items-center justify-center text-[#C9A55B] shrink-0">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[#FAF8F5]">
                    Instalar en iPhone / iPad
                  </h3>
                  <p className="text-xs text-zinc-400">Guía paso a paso de Safari</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-zinc-300 bg-zinc-900/90 p-4 rounded-xl border border-zinc-800">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#C9A55B] text-[#1C1917] font-bold text-xs flex items-center justify-center shadow-xs">
                    1
                  </span>
                  <div className="pt-0.5">
                    <p>
                      Pulsa el botón <strong className="text-white">Compartir</strong>{' '}
                      <Share className="inline w-3.5 h-3.5 text-[#C9A55B] mx-0.5 align-text-bottom" /> en la barra inferior de Safari.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#C9A55B] text-[#1C1917] font-bold text-xs flex items-center justify-center shadow-xs">
                    2
                  </span>
                  <div className="pt-0.5">
                    <p>
                      Desplázate por el menú y selecciona{' '}
                      <strong className="text-white">«Agregar al inicio»</strong>{' '}
                      <PlusSquare className="inline w-3.5 h-3.5 text-[#C9A55B] mx-0.5 align-text-bottom" />.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#C9A55B] text-[#1C1917] font-bold text-xs flex items-center justify-center shadow-xs">
                    3
                  </span>
                  <div className="pt-0.5">
                    <p>
                      Toca <strong className="text-white">Agregar</strong> en la esquina superior derecha.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowIOSModal(false);
                  handleDismiss();
                }}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#C9A55B] to-[#B89348] py-2.5 text-xs font-bold text-[#1C1917] hover:brightness-105 transition shadow-md cursor-pointer"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InstallPrompt;
