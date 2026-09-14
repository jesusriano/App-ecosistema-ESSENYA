import React from 'react';
import { FileText, Download, ShieldCheck, ExternalLink, Building2 } from 'lucide-react';
import { useCliente } from '../hooks/useCliente';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { useEcosystem } from '../../../shared/context/EcosystemContext';

export const FacturasPage: React.FC = () => {
  const { invoices, client } = useCliente();
  const { setActiveInvoice } = useEcosystem();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-[#E5DFD3] dark:border-[#262626] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#C9A55B]" />
            <span>Recibos y Comprobantes de Servicio</span>
          </h1>
          <p className="text-xs text-[#6B655F] dark:text-[#888888] mt-1">
            Comprobantes y recibos de tus servicios de masaje terapéutico ESSENYA.
          </p>
        </div>
      </div>

      {/* Information Summary Box */}
      <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-2xl p-5 space-y-3">
        <div className="flex justify-between items-center border-b border-[#E5DFD3] dark:border-[#262626] pb-3">
          <span className="text-xs font-bold text-[#806020] dark:text-[#C9A55B] uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4" />
            <span>Información del Cliente</span>
          </span>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Pago Registrado</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[#6B655F] dark:text-[#888888] block text-[11px]">Cliente:</span>
            <span className="font-bold text-[#1C1917] dark:text-white">{client?.name || 'Cliente VIP'}</span>
          </div>
          <div>
            <span className="text-[#6B655F] dark:text-[#888888] block text-[11px]">Membresía:</span>
            <span className="font-bold text-[#806020] dark:text-[#C9A55B]">{client?.membershipTier || 'Platino'}</span>
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E5DFD3] dark:border-[#262626] bg-[#FAF8F5] dark:bg-[#1A1A1A]">
          <h3 className="font-serif font-bold text-sm text-[#1C1917] dark:text-white">
            Historial de Recibos Emitidos
          </h3>
        </div>

        <div className="divide-y divide-[#E5DFD3] dark:divide-[#262626]">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#888888]">
              No tienes recibos emitidos por el momento.
            </div>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF8F5] dark:hover:bg-[#181818] transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs text-[#806020] dark:text-[#C9A55B]">{inv.invoiceNumber}</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-md border border-emerald-500/20">
                      Pago Registrado
                    </span>
                  </div>
                  <p className="text-xs text-[#6B655F] dark:text-[#AAAAAA]">
                    Fecha: {inv.date} • {inv.businessName}
                  </p>
                </div>

                <div className="flex items-center space-x-3 justify-between sm:justify-end">
                  <span className="text-sm font-bold text-[#1C1917] dark:text-white">${(inv?.total ?? 0).toLocaleString()} MXN</span>
                  <LuxuryButton variant="outline" size="sm" onClick={() => setActiveInvoice(inv)}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    <span>Ver Recibo</span>
                  </LuxuryButton>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
