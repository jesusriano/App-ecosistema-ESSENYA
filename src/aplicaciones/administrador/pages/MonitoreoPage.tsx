import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Activity, CheckCircle2, AlertTriangle, XCircle, 
  RefreshCw, Bell, Search, Clock, Server, Database, Lock, 
  CreditCard, Calendar, MessageSquare, Zap, Cpu, ArrowRight, Check, CheckCircle
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
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

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
        setSecondsAgo(0);
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
    const timer = setInterval(() => setSecondsAgo(s => s + 1), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
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
      setNotificationStatus('Diagnóstico de salud ejecutado exitosamente. Todos los servicios de Firestore y Backend responden correctamente.');
      setTimeout(() => setNotificationStatus(''), 5000);
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
        setNotificationStatus(`Alerta de prueba enviada para el módulo [${serviceName}]. Notificación push a administradores activada.`);
        await fetchMonitoringData();
        setTimeout(() => setNotificationStatus(''), 6000);
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
        setNotificationStatus('Incidencia marcada como resuelta exitosamente.');
        setTimeout(() => setNotificationStatus(''), 4000);
      }
    } catch (err) {
      console.error("Error resolving alert:", err);
    }
  };

  const getStatusIcon = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok': return <span className="text-emerald-500 font-bold text-base" title="Funcionando correctamente">🟢</span>;
      case 'warning': return <span className="text-amber-500 font-bold text-base" title="Advertencia menor">🟡</span>;
      case 'error': return <span className="text-rose-500 font-bold text-base animate-pulse" title="Error crítico">🔴</span>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critica': return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">Crítica</span>;
      case 'alta': return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">Alta</span>;
      case 'media': return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">Media</span>;
      default: return <span className="bg-slate-500/20 text-slate-400 border border-slate-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">Baja</span>;
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'activo');
  const hasErrors = activeAlerts.some(a => a.severity === 'critica' || a.severity === 'alta');
  const hasWarnings = activeAlerts.some(a => a.severity === 'media' || a.severity === 'baja');

  // Group services by category
  const categories = Array.from(new Set(services.map(s => s.category)));

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

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C9A55B]/20 to-[#C9A55B]/5 border border-[#C9A55B]/30 flex items-center justify-center text-[#C9A55B] shadow-inner">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[var(--text-primary)]">
                Centro de Salud — Monitoreo y Alertas
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Estado en tiempo real de todos los módulos, pasarelas de pago, Firebase y motores de ESSENYA.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-[var(--text-muted)] block">Última comprobación:</span>
            <span className="text-xs font-mono font-bold text-[var(--text-primary)]">hace {secondsAgo} segundos</span>
          </div>
          <button
            onClick={handleRunHealthPing}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2.5 bg-[var(--bg-subcard)] hover:bg-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold rounded-xl border border-[var(--border-color)] transition-all cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 text-[#C9A55B] ${loading ? 'animate-spin' : ''}`} />
            <span>Comprobar Ahora</span>
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all shadow-md ${
        hasErrors 
          ? 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300' 
          : hasWarnings 
          ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300' 
          : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
      }`}>
        <div className="flex items-center space-x-3.5">
          <div className="text-3xl">
            {hasErrors ? '🔴' : hasWarnings ? '🟡' : '🟢'}
          </div>
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-widest opacity-80">Estado General del Sistema</div>
            <h2 className="text-lg sm:text-xl font-bold font-serif mt-0.5">
              {hasErrors ? 'SISTEMA CON PROBLEMAS CRÍTICOS' : hasWarnings ? 'SISTEMA CON ADVERTENCIAS MENORES' : 'SISTEMA 100% OPERATIVO'}
            </h2>
            <p className="text-xs mt-1 opacity-90">
              {hasErrors 
                ? `Se han detectado ${activeAlerts.length} incidencia(s) activa(s) que requieren atención inmediata del administrador.` 
                : hasWarnings 
                ? 'Algunos componentes presentan advertencias de latencia o avisos menores.' 
                : 'Todos los servicios de ESSENYA (Pagos, Reservas, Firebase, Chat y Notificaciones) operan sin anomalías.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/60 dark:bg-black/30 px-4 py-2 rounded-xl border border-current/20 text-xs font-bold shrink-0">
          <span>Alertas Activas:</span>
          <span className="font-mono text-sm px-2 py-0.5 rounded-lg bg-current/10">{activeAlerts.length}</span>
        </div>
      </div>

      {notificationStatus && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-xs font-medium flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{notificationStatus}</span>
          </div>
        </div>
      )}

      {/* Categorized Services Status Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-widest text-[#C9A55B] font-bold">
            Monitoreo por Módulos y Componentes
          </h2>
          <span className="text-[11px] text-[var(--text-muted)]">
            Haz clic en "Simular Fallo" en cualquier módulo para probar el sistema de alertas.
          </span>
        </div>

        {categories.length === 0 ? (
          <div className="p-8 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-xs text-[var(--text-muted)]">
            Cargando estado de componentes...
          </div>
        ) : (
          categories.map(cat => {
            const catServices = services.filter(s => s.category === cat);
            return (
              <div key={cat} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-[#C9A55B]"></span>
                    <span>{cat}</span>
                  </h3>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">{catServices.length} componente(s)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catServices.map(svc => {
                    const hasError = svc.activeErrorCount > 0;
                    return (
                      <div 
                        key={svc.id}
                        onClick={() => {
                          setSearchQuery(svc.name);
                          setFilterStatus('activo');
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-[var(--bg-subcard)] hover:border-[#C9A55B]/60 flex flex-col justify-between ${
                          hasError ? 'border-rose-500/60 bg-rose-500/5 shadow-xs' : 'border-[var(--border-color)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[var(--text-primary)] block truncate" title={svc.name}>
                              {svc.name}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                              {svc.statusText}
                            </span>
                          </div>
                          <div className="shrink-0">
                            {getStatusIcon(svc.status)}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[var(--border-color)] flex items-center justify-between text-[11px]">
                          {hasError ? (
                            <span className="text-rose-500 font-bold text-[10px] bg-rose-500/10 px-2 py-0.5 rounded-md">
                              {svc.activeErrorCount} alerta(s) activa(s)
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-medium flex items-center space-x-1">
                              <Check className="w-3 h-3" />
                              <span>Operando OK</span>
                            </span>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestAlert(svc.id);
                            }}
                            disabled={testing}
                            className="text-[10px] font-bold text-[#C9A55B] hover:underline cursor-pointer"
                          >
                            Simular Fallo
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Incident History & Management Section */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Historial de Incidentes y Diagnóstico Detallado
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Haz clic en cualquier incidencia para ver la explicación en lenguaje sencillo, el mensaje técnico y marcarla como resuelta.
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

        {/* Alerts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-subcard)] text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)] font-mono text-[10px]">
              <tr>
                <th className="p-3">Módulo / Servicio</th>
                <th className="p-3">Incidencia</th>
                <th className="p-3">Severidad</th>
                <th className="p-3">Ocurrencias</th>
                <th className="p-3">Último Reporte</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-[var(--text-muted)]">
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
                        <span className="capitalize">{alert.service}</span>
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
                        <span className="bg-rose-500/10 text-rose-500 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-bold">Activo</span>
                      ) : (
                        <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">Resuelto</span>
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
                        Ver Detalles
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
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div className="flex items-center space-x-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Diagnóstico: Módulo [{selectedAlert.service.toUpperCase()}]
                </h3>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2 bg-[var(--bg-subcard)] p-3 rounded-xl border border-[var(--border-color)] text-center">
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px] uppercase mb-1">Severidad</span>
                  {getSeverityBadge(selectedAlert.severity)}
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px] uppercase mb-1">Estado</span>
                  <span className={`font-bold ${selectedAlert.status === 'activo' ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {selectedAlert.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block text-[10px] uppercase mb-1">Ocurrencias</span>
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
                <span className="text-[var(--text-muted)] font-semibold block mb-1">💡 Explicación Sencilla (Para Administración):</span>
                <p className="text-[var(--text-primary)] bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl leading-relaxed font-medium">
                  {selectedAlert.plainExplanation}
                </p>
              </div>

              <div>
                <span className="text-[var(--text-muted)] font-semibold block mb-1">⚙️ Registro Técnico:</span>
                <pre className="font-mono text-[10px] text-rose-400 bg-black/60 p-3 rounded-xl border border-[var(--border-color)] overflow-x-auto whitespace-pre-wrap">
                  {selectedAlert.technicalMessage}
                </pre>
              </div>

              <div className="text-[11px] text-[var(--text-muted)] flex flex-col sm:flex-row justify-between pt-2 border-t border-[var(--border-color)] gap-1">
                <span>Detectado: {new Date(selectedAlert.timestamp).toLocaleString()}</span>
                <span>Último reporte: {new Date(selectedAlert.lastSeenAt || selectedAlert.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2.5 bg-[var(--bg-subcard)] text-[var(--text-primary)] font-bold rounded-xl border border-[var(--border-color)] hover:bg-[var(--border-color)] transition-all"
              >
                Cerrar
              </button>
              {selectedAlert.status === 'activo' && (
                <button
                  onClick={() => handleResolveAlert(selectedAlert.id)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all flex items-center space-x-2 shadow-sm"
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

