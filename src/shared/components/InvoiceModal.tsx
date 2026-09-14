import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Invoice } from '../types';
import { Download, Printer, ShieldCheck, X } from 'lucide-react';
import { EssenyaLogo } from './EssenyaLogo';
import { useToast } from '../context/ToastContext';

interface InvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, onClose }) => {
  const { showToast } = useToast();

  const handleDownloadPdf = () => {
    if (!invoice) return;
    showToast('Recibo Descargado', `Comprobante de pago ${invoice.invoiceNumber} guardado.`, 'gold');
  };

  return (
    <AnimatePresence>
      {invoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xl flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] rounded-3xl max-w-lg w-full p-6 space-y-6 relative shadow-2xl text-[#1C1917] dark:text-white transition-colors"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#888888] hover:text-[#1C1917] dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#222222] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-[#E5DFD3] dark:border-[#262626] pb-4">
              <div>
                <EssenyaLogo size="xs" showText={true} align="left" />
                <p className="text-[10px] text-[#6B655F] dark:text-[#888888] mt-1">Recibo y Comprobante de Servicio</p>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-[#806020] dark:text-[#C9A55B]">{invoice.invoiceNumber}</span>
                <span className="text-[10px] text-[#6B655F] dark:text-[#888888] block">Fecha: {invoice.date}</span>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-[#FAF8F5] dark:bg-[#1A1A1A] p-4 rounded-2xl border border-[#E5DFD3] dark:border-[#262626] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#6B655F] dark:text-[#888888]">Nombre del Cliente:</span>
                <span className="font-bold text-[#1C1917] dark:text-white">{invoice.businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B655F] dark:text-[#888888]">Estado del Comprobante:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 mr-0.5" />
                  <span>Pago Confirmado y Registrado</span>
                </span>
              </div>
            </div>

            {/* Invoice Amounts */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[#6B655F] dark:text-[#AAAAAA]">
                <span>Subtotal (Servicio de Masaje VIP):</span>
                <span>${invoice.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
              </div>
              <div className="flex justify-between text-[#6B655F] dark:text-[#AAAAAA]">
                <span>IVA (16%):</span>
                <span>${invoice.tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#1C1917] dark:text-white pt-2 border-t border-[#E5DFD3] dark:border-[#262626]">
                <span>Total Pagado:</span>
                <span className="text-lg font-bold text-[#806020] dark:text-[#C9A55B]">${invoice.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownloadPdf}
                className="flex-1 py-3 bg-gradient-to-r from-[#D8B76C] via-[#C9A55B] to-[#9A7B38] text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PDF Oficial</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.print()}
                className="px-4 py-3 bg-[#F5F1EA] dark:bg-[#222222] border border-[#E5DFD3] dark:border-[#333333] text-[#1C1917] dark:text-white font-semibold text-xs rounded-2xl hover:border-[#C9A55B] transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
