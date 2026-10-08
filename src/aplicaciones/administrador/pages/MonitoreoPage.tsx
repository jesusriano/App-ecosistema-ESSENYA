import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Activity, CheckCircle2, AlertTriangle, XCircle, 
  RefreshCw, Bell, Search, Clock, Server, Database, Lock, 
  CreditCard, Calendar, MessageSquare, Zap, Cpu, ArrowRight, Check
} from 'lucide-react';

interface SystemAlert {
  id: string;
  service: string;
  title: string;
  technicalMessage: string;
  plainExplanation: string;
  severity: 'critica' | 'alta' | 'media' | 'baja';
  status: 'activo' | 'resuelto';
  count: number;
  timestamp: string;
  lastSeenAt: string;
}

interface ServiceStatusItem {
  id: string;
  name: string;
  category: string;
  status: 'ok' | 'warning' | 'error';
  statusText: string;
  lastCheck: string;
  activeErrorCount: number;
}

export const MonitoreoPage: React.FC = () => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [services, setServices] = useState<ServiceStatusItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [testing, setTesting] = useState<boolean>(false);
  const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('activo');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notificationStatus, setNotificationStatus] = useState<string>('');

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/admin/system/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setAlerts(data.alerts || []);
        setServices(data.services || []);
      }
    } catch (err) {
      console.error("Error fetching system monitoring status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, []);

  const handleRunHealthPing = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || '';
      await fetch('/api/admin/system/health-ping', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchMonitoringData();
    } catch (err) {
      console.error("Error running health ping:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAlert = async (serviceName: string) => {
    try {
      setTesting(true);
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/admin/system/test-alert', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ service: serviceName })
      });
      const data = await res.json();
      if (data.success) {
        setNotificationStatus(`Alerta de prueba enviada para ${serviceName}. Notificación push disparada.`);
        await fetchMonitoringData();
        setTimeout(() => setNotificationStatus(''), 5000);
      }
    } catch (err) {
      console.error("Error testing alert:", err);
    } finally {
      setTesting(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/admin/system/resolve-alert', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ alertId })
      });
      const data = await res.json();
      if (data.success) {
        await fetchMonitoringData();
        setSelectedAlert(null);
      }
    } catch (err) {
      console.error("Error resolving alert:", err);
    }
  };

  const getStatusIcon = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok': return <span className="text-emerald-400 text-lg">🟢</span>;
      case 'warning': return <span className="text-amber-400 text-lg">🟡</span>;
      case 'error': return <span className="text-rose-500 text-lg animate-pulse">🔴</span>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critica': return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">Crítica</span>;
      case 'alta': return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">Alta</span>;
      case 'media': return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">Media</span>;
      default: return <span className="bg-slate-500/20 text-slate-400 border border-slate-500/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">Baja</span>;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterSeverity !== 'todos' && alert.severity !== filterSeverity) return false;
    if (filterStatus !== 'todos' && alert.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return alert.service.toLowerCase().includes(query) ||
             alert.title.toLowerCase().includes(query) ||
             alert.plainExplanation.toLowerCase().includes(query) ||
             alert.technicalMessage.toLowerCase().includes(query);
    }
    return true;
  });

  const activeAlertsCount = alerts.filter(a => a.status === 'activo').length;
  const criticalCount = alerts.filter(a => a.status === 'activo' && (a.severity === 'critica' || a.severity === 'alta')).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A55B]/20 to-[#C9A55B]/5 border border-[#C9A55B]/30 flex items-center justify-center text-[#C9A55B]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Monitoreo y Alertas en Tiempo Real
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                Detección inteligente de problemas funcionales, pasarela de pago, Firebase y backend ESSENYA.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunHealthPing}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2.5 bg-[var(--bg-subcard)] hover:bg-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold rounded-xl border border-[var(--border-color)] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-[#C9A55B] ${loading ? 'animate-spin' : ''}`} />
            <span>Ejecutar Diagnóstico</span>
          </button>
          <div className="flex items-center space-x-2 px-4 py-2.5 bg-[#C9A55B]/10 text-[#C9A55B] text-xs font-bold rounded-xl border border-[#C9A55B]/30">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>{activeAlertsCount} Alertas Activas</span>
          </div>
        </div>
      </div>

      {notificationStatus && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notificationStatus}</span>
          </div>
        </div>
      )}

      {/* Services Grid Status */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A55B]">
          Estado de Módulos Críticos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {services.map((svc) => {
            const hasErrors = svc.activeErrorCount > 0;
            return (
              <div 
                key={svc.id}
                onClick={() => {
                  setSearchQuery(svc.name);
                  setFilterStatus('activo');
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer bg-[var(--bg-card)] hover:border-[#C9A55B]/50 ${
                  hasErrors ? 'border-rose-500/50 shadow-xs shadow-rose-500/10' : 'border-[var(--border-color)]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {svc.name}
                  </span>
                  {getStatusIcon(svc.status)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>{svc.statusText}</span>
                  {svc.activeErrorCount > 0 && (
                    <span className="bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-full text-[9px]">
                      {svc.activeErrorCount} activo{svc.activeErrorCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-muted)]">Verificar con prueba:</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestAlert(svc.id);
                    }}
                    disabled={testing}
                    className="text-[10px] font-bold text-[#C9A55B] hover:underline"
                  >
                    Simular Fallo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerts Management Section */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Historial de Problemas y Alertas Detectadas
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Haz clic en cualquier incidencia para ver la explicación en lenguaje sencillo, el mensaje técnico original y las opciones de resolución.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Buscar servicio o error..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#C9A55B] w-48"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#C9A55B]"
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="resuelto">Resueltos</option>
            </select>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-subcard)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#C9A55B]"
            >
              <option value="todos">Todas las severidades</option>
              <option value="critica">Crítica</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
        </div>

        {/* Alerts List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-subcard)] text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]">
              <tr>
                <th className="p-3">Servicio / Módulo</th>
                <th className="p-3">Problema Detectado</th>
                <th className="p-3">Severidad</th>
                <th className="p-3">Ocurrencias</th>
                <th className="p-3">Última Detección</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--text-muted)]">
                    {loading ? 'Cargando registros...' : 'No se encontraron alertas o problemas registrados con los filtros actuales. Todo opera correctamente 🟢'}
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr 
                    key={alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    className="hover:bg-[var(--bg-subcard)] cursor-pointer transition-all"
                  >
                    <td className="p-3 font-bold text-[var(--text-primary)]">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-[#C9A55B]"></span>
                        <span>{alert.service}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-[var(--text-primary)]">{alert.title}</div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate max-w-xs">{alert.plainExplanation}</div>
                    </td>
                    <td className="p-3">{getSeverityBadge(alert.severity)}</td>
                    <td className="p-3 font-mono font-bold text-[var(--text-primary)]">{alert.count}x</td>
                    <td className="p-3 text-[var(--text-muted)]">
                      {new Date(alert.lastSeenAt || alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3">
                      {alert.status === 'activo' ? (
                        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">Activo</span>
                      ) : (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">Resuelto</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAlert(alert);
                        }}
                        className="px-3 py-1 bg-[#C9A55B]/10 hover:bg-[#C9A55B]/20 text-[#C9A55B] font-bold rounded-lg transition-all"
                      >
                        Detalles
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Diagnóstico de Incidencia: {selectedAlert.service}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between bg-[var(--bg-subcard)] p-3 rounded-xl">
                <div>
                  <span className="text-[var(--text-muted)] block mb-0.5">Severidad</span>
                  {getSeverityBadge(selectedAlert.severity)}
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block mb-0.5">Estado Actual</span>
                  <span className={`font-bold ${selectedAlert.status === 'activo' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedAlert.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block mb-0.5">Ocurrencias</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">{selectedAlert.count} veces</span>
                </div>
              </div>

              <div>
                <span className="text-[var(--text-muted)] font-semibold block mb-1">Título del Problema:</span>
                <p className="font-bold text-sm text-[var(--text-primary)] bg-[var(--bg-subcard)] p-3 rounded-xl border border-[var(--border-color)]">
                  {selectedAlert.title}
                </p>
              </div>

              <div>
                <span className="text-[var(--text-muted)] font-semibold block mb-1">💡 Explicación Sencilla (Para ti):</span>
                <p className="text-[var(--text-primary)] bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl leading-relaxed">
                  {selectedAlert.plainExplanation}
                </p>
              </div>

              <div>
                <span className="text-[var(--text-muted)] font-semibold block mb-1">⚙️ Mensaje Técnico Original:</span>
                <pre className="font-mono text-[10px] text-rose-300 bg-black/40 p-3 rounded-xl border border-[var(--border-color)] overflow-x-auto whitespace-pre-wrap">
                  {selectedAlert.technicalMessage}
                </pre>
              </div>

              <div className="text-[11px] text-[var(--text-muted)] flex justify-between pt-2 border-t border-[var(--border-color)]">
                <span>Detectado por primera vez: {new Date(selectedAlert.timestamp).toLocaleString()}</span>
                <span>Último reporte: {new Date(selectedAlert.lastSeenAt || selectedAlert.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 bg-[var(--bg-subcard)] text-[var(--text-primary)] font-bold rounded-xl border border-[var(--border-color)] hover:bg-[var(--border-color)] transition-all"
              >
                Cerrar
              </button>
              {selectedAlert.status === 'activo' && (
                <button
                  onClick={() => handleResolveAlert(selectedAlert.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Marcar como Resuelto</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
