import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Wallet, X, ChevronRight, Scale } from 'lucide-react';
import { LuxuryButton } from './ui/LuxuryButton';
import { ClientPoliciesModal } from './ClientPoliciesModal';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface ClientPoliciesGateProps {
  clientId?: string;
  clientEmail?: string;
  children: React.ReactNode;
}

export const ClientPoliciesGate: React.FC<ClientPoliciesGateProps> = ({
  clientId = 'guest',
  clientEmail,
  children
}) => {
  const storageKey = `essenya_client_policies_accepted_${clientId || 'guest'}`;
  
  const [hasAccepted, setHasAccepted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'true') return true;
      if (localStorage.getItem('essenya_client_policies_accepted_guest') === 'true') return true;
    }
    return false;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync if clientId changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'true') {
        setHasAccepted(true);
      }
    }
  }, [storageKey]);

  const handleAcceptPolicies = async () => {
    setIsSaving(true);
    const nowIso = new Date().toISOString();

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, 'true');
        localStorage.setItem('essenya_client_policies_accepted_guest', 'true');
        localStorage.setItem('essenya_client_policies_accepted_at', nowIso);
      }

      if (clientId && clientId !== 'guest') {
        const clientRef = doc(db, 'clientes', clientId);
        await setDoc(clientRef, {
          politicasAceptadas: true,
          politicasAceptadasAt: nowIso,
          terminosCancelacionAceptados: true,
          avisoPrivacidadAceptado: true
        }, { merge: true }).catch(err => {
          console.warn('[PoliciesGate] Could not sync acceptance to Firestore:', err);
        });
      }

      setHasAccepted(true);
    } catch (e) {
      console.error('[PoliciesGate] Error accepting policies:', e);
      setHasAccepted(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* El portal de clientes carga normalmente en pantalla completa */}
      {children}

      {/* Algo pequeñito que aparece en la parte de abajo */}
      <AnimatePresence>
        {!hasAccepted && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-3 sm:bottom-5 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-xl z-50 pointer-events-auto"
          >
            <div className="bg-white/95 dark:bg-[#141414]/95 backdrop-blur-xl border border-[#C9A55B]/40 rounded-2xl p-3.5 sm:p-4 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs relative overflow-hidden">
              {/* Barra dorada superior sutil */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D8B76C] via-[#C9A55B] to-[#806020]" />

              {/* Botón cerrar discreto en esquina móvil */}
              <button
                type="button"
                onClick={handleAcceptPolicies}
                className="sm:hidden absolute top-2 right-2 p-1 text-[#888888] hover:text-[#1C1917] dark:hover:text-white cursor-pointer"
                title="Cerrar aviso"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Contenido descriptivo compacto */}
              <div className="flex items-start gap-2.5 sm:gap-3 pr-5 sm:pr-0">
                <div className="w-8 h-8 rounded-xl bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-left">
                  <p className="text-[#1C1917] dark:text-white leading-snug">
                    <strong className="text-[#806020] dark:text-[#C9A55B]">Políticas de Cancelación y Privacidad:</strong>{' '}
                    En cancelaciones no se devuelve dinero en efectivo; tu saldo se abona íntegro a tu{' '}
                    <strong className="font-semibold text-[#806020] dark:text-[#C9A55B]">Billetera Virtual</strong> o puedes{' '}
                    <strong className="font-semibold">reagendar tu cita</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="text-[11px] text-[#806020] dark:text-[#C9A55B] font-bold underline hover:text-[#1C1917] dark:hover:text-white transition-colors cursor-pointer inline-flex items-center gap-0.5 pt-0.5"
                  >
                    <span>Ver políticas completas</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Botón de aceptación compacto */}
              <div className="flex items-center justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#E5DFD3]/60 dark:border-[#262626]">
                <LuxuryButton
                  type="button"
                  variant="gold"
                  size="sm"
                  loading={isSaving}
                  onClick={handleAcceptPolicies}
                  className="w-full sm:w-auto px-4 py-1.5 text-xs font-bold shadow-md"
                >
                  Aceptar
                </LuxuryButton>

                <button
                  type="button"
                  onClick={handleAcceptPolicies}
                  className="hidden sm:inline-flex p-1.5 text-[#888888] hover:text-[#1C1917] dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-[#FAF8F5] dark:hover:bg-[#202020]"
                  title="Cerrar aviso"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal detallado desplegable al hacer clic en 'Ver políticas completas' */}
      <ClientPoliciesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
