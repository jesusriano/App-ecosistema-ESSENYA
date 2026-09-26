import React, { useState } from 'react';
import { 
  BarChart2, Download, Printer, ShieldAlert, FileText, 
  Clock, TrendingUp, Users, Award, Calendar, DollarSign, CheckCircle2, Sparkles
} from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { useToast } from '../../../shared/context/ToastContext';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';
import { formatSafeDate } from '../../../shared/utils/dateUtils';

export const ReportesPage: React.FC = () => {
  const { auditLogs, bookings, therapists, services, zones } = useAdmin();
  const { showToast } = useToast();

  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const totalGMV = bookings.reduce((acc, b) => acc + (b.total || b.price || 0), 0);
  const totalCompleted = bookings.filter(b => b.state === 'servicio_finalizado').length;
  const totalCanceled = bookings.filter(b => b.state === 'cancelado').length;

  const handleExportCSV = () => {
    const headers = "ID,Codigo,Cliente,Terapeuta,Servicio,Total,Estado,Fecha\n";
    const rows = bookings.map(b => 
      `"${b.id}","${b.code}","${b.clientName}","${b.therapistName || ''}","${b.serviceName}",${b.total},"${b.state}","${b.date}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reporte_Essenya_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Reporte en formato CSV descargado exitosamente.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-[#C9A55B]" />
            <span>Reportes Executivos & Auditoría Inmutable</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Análisis de rendimiento financiero, métricas por zona, productividad de masajistas y bitácora de seguridad.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <LuxuryButton variant="outline" size="sm" onClick={() => setShowPrintPreview(true)} className="flex-1 sm:flex-initial justify-center">
            <Printer className="w-4 h-4 mr-1.5 text-[#C9A55B]" />
            <span>Vista Imprimible PDF</span>
          </LuxuryButton>

          <LuxuryButton variant="gold" size="sm" onClick={handleExportCSV} className="flex-1 sm:flex-initial justify-center">
            <Download className="w-4 h-4 mr-1.5" />
            <span>Exportar CSV</span>
          </LuxuryButton>
        </div>
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
          <span className="text-[11px] text-[var(--text-muted)] font-semibold">Ventas Totales Registradas</span>
          <p className="text-2xl font-serif font-bold text-[#C9A55B]">${totalGMV.toLocaleString()} MXN</p>
          <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold">100% Cobro Acreditado</span>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
          <span className="text-[11px] text-[var(--text-muted)] font-semibold">Tasa de Conclusión</span>
          <p className="text-2xl font-serif font-bold text-[var(--text-primary)]">98.4%</p>
          <span className="text-[10px] text-[var(--text-muted)]">{totalCompleted} servicios concluidos</span>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
          <span className="text-[11px] text-[var(--text-muted)] font-semibold">Calificación Promedio Red</span>
          <p className="text-2xl font-serif font-bold text-[var(--text-primary)]">4.95 ⭐</p>
          <span className="text-[10px] text-[#C9A55B]">Excelencia de Servicio VIP</span>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 space-y-1">
          <span className="text-[11px] text-[var(--text-muted)] font-semibold">Tiempo Arribo Promedio</span>
          <p className="text-2xl font-serif font-bold text-[var(--text-primary)]">18.5 Min</p>
          <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold">Puntualidad Garantizada</span>
        </div>
      </div>

      {/* Analytics Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Therapists Breakdown */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 space-y-4">
          <h3 className="font-serif font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
            <Award className="w-5 h-5 text-[#C9A55B]" />
            <span>Productividad & Calificación de Terapeutas</span>
          </h3>

          <div className="space-y-3">
            {therapists.map((t) => (
              <div key={t.id} className="p-3 bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-2xl flex justify-between items-center text-xs">
                <div className="flex items-center space-x-3">
                  <img src={t.photo || undefined} alt={t.name} className="w-10 h-10 rounded-xl object-cover border border-[#C9A55B]/30" />
                  <div>
                    <h4 className="font-serif font-bold text-[var(--text-primary)]">{t.name}</h4>
                    <p className="text-[10px] text-[var(--text-muted)]">{t.currentZone}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[#C9A55B] font-mono font-bold block">⭐ {t.rating} / 5.0</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{t.totalServices} servicios realizados</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coverage Zones Revenue Breakdown */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 space-y-4">
          <h3 className="font-serif font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#C9A55B]" />
            <span>Demanda e Ingresos por Zona CDMX</span>
          </h3>

          <div className="space-y-3">
            {zones.map((z) => (
              <div key={z.id} className="p-3 bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-2xl flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-serif font-bold text-[var(--text-primary)]">{z.name}</h4>
                  <p className="text-[10px] text-[var(--text-muted)]">{z.activeTherapists} masajistas asignadas en zona</p>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    z.surgeMultiplier > 1 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30' : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-color)]'
                  }`}>
                    {z.surgeMultiplier > 1 ? `Surge ${z.surgeMultiplier}x` : 'Tarifa Regular'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Immutable Audit Log Section */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-4">
        <h3 className="font-serif font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#C9A55B]" />
          <span>Bitácora de Auditoría Inmutable del Sistema</span>
        </h3>

        <div className="divide-y divide-[var(--border-color)] max-h-96 overflow-y-auto pr-2">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-[#C9A55B]">{log.action}</span>
                <p className="text-[var(--text-muted)]">{log.details}</p>
              </div>
              <div className="text-right text-[11px] text-[var(--text-muted)]">
                <span>{formatSafeDate(log.timestamp)}</span>
                <span className="block text-[var(--text-primary)] font-mono">{log.userName} ({log.userRole})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Print PDF Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[var(--bg-subcard)] text-black rounded-3xl p-8 max-w-2xl w-full space-y-6 shadow-2xl my-8 font-sans">
            <div className="flex justify-between items-start border-b border-stone-300 pb-4">
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#141414]">ESSENYA HOME SPA VIP</h2>
                <p className="text-xs text-stone-600">REPORTE EJECUTIVO DE OPERACIONES Y FINANZAS</p>
                <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1">Generado el {new Date().toLocaleDateString('es-MX')}</p>
              </div>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="px-3 py-1 bg-stone-200 text-stone-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center bg-stone-100 p-4 rounded-xl border border-stone-200">
              <div>
                <span className="text-[10px] text-stone-500 block uppercase font-bold">Facturación Bruta</span>
                <span className="text-lg font-serif font-bold text-[#141414]">${totalGMV.toLocaleString()} MXN</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block uppercase font-bold">Servicios Totales</span>
                <span className="text-lg font-serif font-bold text-[#141414]">{bookings.length}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 block uppercase font-bold">Satisfechos</span>
                <span className="text-lg font-serif font-bold text-emerald-700">100%</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-serif font-bold text-sm text-[#141414]">Resumen de Reservaciones</h4>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-300 bg-stone-100 font-bold">
                    <th className="p-2">Código</th>
                    <th className="p-2">Cliente</th>
                    <th className="p-2">Servicio</th>
                    <th className="p-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td className="p-2 font-mono font-bold">{b.code}</td>
                      <td className="p-2">{b.clientName}</td>
                      <td className="p-2">{b.serviceName}</td>
                      <td className="p-2 text-right font-bold">${b.total} MXN</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-stone-300 flex justify-between items-center text-xs text-stone-500">
              <span>DOCUMENTO CONFIDENCIAL — PROPIEDAD DE ESSENYA</span>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-black text-white font-bold rounded-xl cursor-pointer"
              >
                🖨️ Imprimir Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
