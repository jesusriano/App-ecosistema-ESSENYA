import React, { useState } from 'react';
import { 
  CreditCard, DollarSign, ShieldCheck, FileText, CheckCircle2, 
  XCircle, Clock, ExternalLink, Download, AlertTriangle, Eye, Check
} from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { useToast } from '../../../shared/context/ToastContext';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { Booking } from '../../../shared/types';

export const PagosPage: React.FC = () => {
  const { bookings, invoices, handleConfirmPayment, handleRejectPayment, setActiveInvoice } = useAdmin();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'todos' | 'pendientes' | 'pagados'>('todos');
  const [rejectModalBooking, setRejectModalBooking] = useState<Booking | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [viewProofBooking, setViewProofBooking] = useState<Booking | null>(null);

  const totalGMV = bookings.reduce((acc, b) => acc + (b.total || b.price || 0), 0);
  const totalCommission = totalGMV * 0.30;
  const totalDispersions = totalGMV * 0.70;

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'pendientes') return b.paymentStatus === 'pendiente';
    if (activeTab === 'pagados') return b.paymentStatus === 'pagado';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] pb-4">
        <h1 className="text-2xl font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-[#C9A55B]" />
          <span>Módulo de Finanzas & Validación SPEI</span>
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Verificación manual de comprobantes recibidos en cuenta de <strong>Elizabeth Lopez</strong> (Bancomer).
        </p>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 space-y-2">
          <span className="text-[var(--text-muted)] text-xs font-semibold block">Cobranza Bruta (GMV Total)</span>
          <p className="text-3xl font-serif font-bold text-[#C9A55B]">${totalGMV.toLocaleString()} MXN</p>
          <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Transacciones Seguras
          </span>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 space-y-2">
          <span className="text-[var(--text-muted)] text-xs font-semibold block">Cuenta Elizabeth Lopez</span>
          <p className="text-[10px] font-mono text-[var(--text-primary)] leading-relaxed">
            BANCOMER • CLABE: 012 180 01569427152 0<br />
            CUENTA: 156 942 7152
          </p>
          <span className="text-[10px] text-[var(--text-muted)]">Referencia bancaria oficial</span>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 space-y-2">
          <span className="text-[var(--text-muted)] text-xs font-semibold block">Dispersión Terapeutas (70%)</span>
          <p className="text-3xl font-serif font-bold text-[var(--text-primary)]">${totalDispersions.toLocaleString()} MXN</p>
          <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold">Depósitos SPEI Pendientes</span>
        </div>
      </div>

      {/* Tab Controls */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('todos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'todos' ? 'bg-[#C9A55B] text-black' : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Todas ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('pendientes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pendientes' ? 'bg-amber-500 text-white' : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Por Validar ({bookings.filter(b => b.paymentStatus === 'pendiente').length})
          </button>
          <button
            onClick={() => setActiveTab('pagados')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pagados' ? 'bg-emerald-500 text-white' : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Acreditados ({bookings.filter(b => b.paymentStatus === 'pagado').length})
          </button>
        </div>

        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-xl">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Validación Manual Requerida</span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl overflow-hidden">
        <div className="divide-y divide-[var(--border-color)]">
          {filteredBookings.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-20" />
              <p className="text-sm text-[var(--text-muted)]">No hay transacciones que mostrar en este rango.</p>
            </div>
          ) : (
            filteredBookings.map((b) => {
              const invoice = invoices.find(inv => inv.bookingId === b.id);
              const hasProof = !!b.paymentProofUrl;

              return (
                <div key={b.id} className="p-5 hover:bg-[var(--bg-subcard)]/50 transition-all flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#C9A55B] font-bold bg-[#C9A55B]/10 px-2 py-0.5 rounded-lg border border-[#C9A55B]/30">
                        {b.code}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        b.paymentStatus === 'pagado'
                          ? 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border-emerald-500/30'
                          : b.paymentStatus === 'rechazado'
                          ? 'bg-red-500/20 text-red-500 border-red-500/30'
                          : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      }`}>
                        {b.paymentStatus === 'pagado' ? 'PAGO ACREDITADO' : b.paymentStatus === 'rechazado' ? 'PAGO RECHAZADO' : 'PENDIENTE VERIFICACIÓN'}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase bg-[var(--bg-subcard)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                        {b.paymentMethod?.split('(')[0] || b.paymentMethod}
                      </span>
                    </div>

                    <h3 className="font-serif font-bold text-base text-[var(--text-primary)]">
                      {b.serviceName} — <span className="text-[#C9A55B]">${b.total} MXN</span>
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                      <p>Socio: <strong className="text-[var(--text-primary)]">{b.clientName}</strong></p>
                      <span className="opacity-30">•</span>
                      <p>Terapeuta: <strong className="text-[#C9A55B]">{b.therapistName || 'Sin asignar'}</strong></p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {hasProof && (
                      <button
                        onClick={() => setViewProofBooking(b)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-500 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Comprobante</span>
                      </button>
                    )}

                    {b.paymentStatus === 'pendiente' && (
                      <>
                        <LuxuryButton
                          variant="gold"
                          size="sm"
                          onClick={() => {
                            handleConfirmPayment(b.id);
                            showToast(`Pago de la reserva ${b.code} confirmado. El cliente ha sido notificado.`);
                          }}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          <span>Validar SPEI</span>
                        </LuxuryButton>

                        <button
                          onClick={() => setRejectModalBooking(b)}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                        >
                          Rechazar
                        </button>
                      </>
                    )}

                    {invoice && (
                      <button
                        onClick={() => setActiveInvoice(invoice)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-subcard)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold rounded-xl transition-all cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#C9A55B]" />
                        <span>Recibo</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* View Proof Modal */}
      {viewProofBooking && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 max-w-2xl w-full space-y-4 relative">
            <button 
              onClick={() => setViewProofBooking(null)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <XCircle className="w-6 h-6" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="font-serif font-bold text-xl text-[var(--text-primary)]">Comprobante de Transferencia</h3>
              <p className="text-xs text-[var(--text-muted)]">Reserva {viewProofBooking.code} • ${viewProofBooking.total} MXN</p>
            </div>

            <div className="bg-black rounded-2xl overflow-hidden border border-[var(--border-color)] aspect-video flex items-center justify-center">
              <img 
                src={viewProofBooking.paymentProofUrl} 
                alt="Comprobante de pago" 
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/1a1a1a/c9a55b?text=Error+al+cargar+comprobante';
                }}
              />
            </div>

            <div className="flex justify-between items-center bg-[var(--bg-subcard)] p-4 rounded-2xl border border-[var(--border-color)]">
              <div className="text-left">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold tracking-wider">Titular de Cuenta</span>
                <span className="text-sm font-serif font-bold text-[var(--text-primary)]">Elizabeth Lopez</span>
              </div>
              <div className="flex gap-2">
                <LuxuryButton
                  variant="gold"
                  size="sm"
                  onClick={() => {
                    handleConfirmPayment(viewProofBooking.id);
                    showToast(`Pago de ${viewProofBooking.code} acreditado correctamente.`);
                    setViewProofBooking(null);
                  }}
                >
                  Confirmar Ahora
                </LuxuryButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Payment Modal */}
      {rejectModalBooking && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-red-500/40 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-serif font-bold text-lg text-red-500 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Rechazar Comprobante SPEI</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Reserva <strong className="text-[var(--text-primary)]">{rejectModalBooking.code}</strong>. Explica al cliente el motivo por el cual no se pudo acreditar la transferencia.
            </p>

            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">Observaciones para el cliente</label>
              <textarea
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder="ej. La clave de rastreo SPEI no coincide o el monto recibido es menor al total..."
                rows={3}
                className="w-full bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[var(--text-primary)] p-3 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setRejectModalBooking(null)}
                className="px-4 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleRejectPayment(rejectModalBooking.id, rejectReasonInput || 'Comprobante no válido');
                  showToast(`Comprobante de ${rejectModalBooking.code} rechazado.`);
                  setRejectModalBooking(null);
                  setRejectReasonInput('');
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
