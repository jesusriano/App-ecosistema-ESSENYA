import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, X, Sparkles } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'gold';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
}

interface ToastContextType {
  showToast: (title: string, description?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = React.useCallback((title: string, description?: string, type: ToastType = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-3), { id, title, description, type }]); // Keep max 4

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  React.useEffect(() => {
    const handleCustomToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ title: string; description?: string; type?: ToastType }>;
      if (customEvent.detail?.title) {
        showToast(
          customEvent.detail.title,
          customEvent.detail.description,
          customEvent.detail.type || 'info'
        );
      }
    };

    window.addEventListener('essenya-toast', handleCustomToast);
    return () => {
      window.removeEventListener('essenya-toast', handleCustomToast);
    };
  }, [showToast]);

  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value = React.useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Floating Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col space-y-3 pointer-events-none max-w-sm w-full px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-start space-x-3.5 transition-all ${
                toast.type === 'gold' || toast.type === 'success'
                  ? 'bg-white/95 dark:bg-[#141414]/95 border-[#C9A55B]/40 text-[#1C1917] dark:text-white shadow-[#C9A55B]/10'
                  : toast.type === 'error'
                  ? 'bg-red-50/95 dark:bg-red-950/90 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100 shadow-red-500/10'
                  : 'bg-white/95 dark:bg-[#141414]/95 border-[#E5DFD3] dark:border-[#333333] text-[#1C1917] dark:text-white'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'gold' && <Sparkles className="w-5 h-5 text-[#C9A55B] animate-pulse" />}
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-[#806020] dark:text-[#C9A55B]" />}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#806020] dark:text-[#C9A55B] flex items-center gap-1.5">
                  {toast.title}
                </h4>
                {toast.description && (
                  <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA] mt-1 leading-relaxed">
                    {toast.description}
                  </p>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
