import React from 'react';
import { Wallet, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';

interface BilleteraPageProps {
  onGoToReservas?: () => void;
}

export const BilleteraPage: React.FC<BilleteraPageProps> = ({ onGoToReservas }) => {
  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-color)] pb-5">
        <div>
          <div className="inline-flex items-center space-x-2 bg-[#C9A55B]/15 border border-[#C9A55B]/30 px-3 py-1 rounded-full text-xs font-semibold text-[#806020] dark:text-[#C9A55B] mb-2">
            <Wallet className="w-3.5 h-3.5" />
            <span>Mi Billetera ESSENYA</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text-primary)]">
            Billetera Virtual
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xl">
            Aquí puedes consultar el saldo disponible en tu cuenta para ser utilizado en futuras reservas.
          </p>
        </div>
        
        {onGoToReservas && (
          <div className="flex flex-wrap items-center gap-2.5">
            <LuxuryButton variant="outline" size="sm" onClick={onGoToReservas}>
              <Calendar className="w-4 h-4 mr-1.5" />
              <span>Reservar Cita</span>
            </LuxuryButton>
          </div>
        )}
      </div>

      <div className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
        <div className="flex flex-col items-center justify-center text-center space-y-4 py-12">
          <div className="w-20 h-20 bg-[#FAF8F5] dark:bg-[#1A1A1A] rounded-full border border-[#E5DFD3] dark:border-[#333333] flex items-center justify-center">
            <Wallet className="w-10 h-10 text-[#C9A55B]" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest">Saldo Disponible</p>
            <h2 className="text-5xl font-black font-serif text-[var(--text-primary)]">$0 <span className="text-2xl text-[var(--text-muted)]">MXN</span></h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto pt-4">
            Actualmente no cuentas con saldo a favor o monedero electrónico activo. Las cancelaciones con reembolso se reflejarán aquí automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
};
