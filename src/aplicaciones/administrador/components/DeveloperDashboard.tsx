import React, { useState, useEffect } from 'react';
import { 
  Terminal, Shield, Database, RefreshCw, 
  Trash2, Monitor, Code, CheckCircle2, Activity
} from 'lucide-react';
import { useEcosystem } from '../../../shared/context/EcosystemContext';
import { useToast } from '../../../shared/context/ToastContext';
import { LuxuryButton } from '../../../shared/components/ui/LuxuryButton';

export const DeveloperDashboard: React.FC = () => {
  const { auditLogs, handleDataCleanup } = useEcosystem();
  const { showToast } = useToast();
  
  const [dbStatus] = useState<'connected' | 'reconnecting' | 'error'>('connected');
  const [lastSync, setLastSync] = useState<string>(new Date().toLocaleTimeString());

  // App Monitoring Data (Simulated)
  const appStatus = [
    { name: 'Portal Cliente', status: 'online', latency: '42ms', storage: '1.2MB' },
    { name: 'Portal Terapeuta', status: 'online', latency: '68ms', storage: '0.8MB' },
    { name: 'Panel Administrador', status: 'online', latency: '24ms', storage: '2.5MB' }
  ];

  const clearAppCache = (appName: string) => {
    const prefixes: Record<string, string[]> = {
      'Portal Cliente': ['essenya_auth_cliente', 'essenya_bookings_cache', 'essenya_client_photo'],
      'Portal Terapeuta': ['essenya_auth_terapeuta', 'essenya_sync_queue', 'essenya_therapist_audit_logs'],
      'Panel Administrador': ['essenya_auth_administrador', 'essenya_auto_cleanup_done']
    };

    const keys = prefixes[appName] || [];
    keys.forEach(k => localStorage.removeItem(k));
    showToast(`Caché de ${appName} limpiado correctamente.`);
  };

  return (
    <div className="space-y-6">
      {/* Header with Connection Status */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#C9A55B]" />
          <span>System Vital Signs</span>
        </h2>
        <div className={`px-3 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
          dbStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'
        }`}>
          <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          {dbStatus === 'connected' ? 'FIRESTORE ONLINE' : 'CONNECTION ERROR'}
        </div>
      </div>

      {/* Monitoring Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {appStatus.map((app) => (
          <div key={app.name} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#C9A55B]" />
                <span className="text-sm font-bold text-[var(--text-primary)]">{app.name}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {app.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 py-2">
              <div className="bg-[var(--bg-subcard)] p-2 rounded-xl text-center border border-[var(--border-color)]">
                <span className="text-[9px] text-[var(--text-muted)] block uppercase">Latencia</span>
                <span className="text-xs font-mono font-bold text-[var(--text-primary)]">{app.latency}</span>
              </div>
              <div className="bg-[var(--bg-subcard)] p-2 rounded-xl text-center border border-[var(--border-color)]">
                <span className="text-[9px] text-[var(--text-muted)] block uppercase">Storage</span>
                <span className="text-xs font-mono font-bold text-[var(--text-primary)]">{app.storage}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button 
                onClick={() => clearAppCache(app.name)}
                className="flex-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3 h-3" /> Purge
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Firebase Audit Logs */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-subcard)]/50">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#C9A55B]" />
              <span className="text-sm font-bold text-[var(--text-primary)] tracking-tight">System Logs</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-[var(--text-muted)] font-mono">{lastSync}</span>
              <button 
                onClick={() => setLastSync(new Date().toLocaleTimeString())}
                className="p-1.5 hover:bg-[var(--bg-card)] rounded-lg transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] space-y-1 bg-black/5 dark:bg-black/20">
            {auditLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[var(--text-muted)] italic">
                Awaiting logs...
              </div>
            ) : (
              [...auditLogs].reverse().map((log, i) => (
                <div key={log.id || i} className="p-2 border-b border-[var(--border-color)]/50 hover:bg-white/5 transition-all flex gap-3 items-start">
                  <span className="text-emerald-500/70 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className={`px-1.5 py-0.5 rounded uppercase font-bold text-[8px] shrink-0 ${
                    log.userRole === 'administrador' ? 'bg-[#C9A55B]/20 text-[#C9A55B]' : 'bg-blue-500/20 text-blue-500'
                  }`}>
                    {log.userRole || 'INFO'}
                  </span>
                  <div className="space-y-1">
                    <p className="text-[var(--text-primary)] leading-relaxed">
                      <span className="text-blue-400">{log.actorId ? `ID_${log.actorId.slice(0,5)}` : 'SYS'}</span>: {log.action}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tools */}
        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#C9A55B]" />
              <span className="text-sm font-bold text-[var(--text-primary)]">Infrastructure</span>
            </div>
            
            <div className="space-y-2">
              <LuxuryButton
                variant="outline"
                size="sm"
                fullWidth
                onClick={async () => {
                  if (confirm('¿Resetear Firestore?')) {
                    await handleDataCleanup();
                    showToast('Base de datos reseteada.');
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Reset Firestore
              </LuxuryButton>

              <LuxuryButton
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => {
                  localStorage.clear();
                  showToast('LocalStorage Limpio.');
                  window.location.reload();
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Reset App State
              </LuxuryButton>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#C9A55B]" />
              <span className="text-sm font-bold text-[var(--text-primary)]">Dev Environment</span>
            </div>
            
            <div className="space-y-2 text-[10px]">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">Mode</span>
                <span className="text-[#C9A55B] font-bold">VITE_DEVELOPER_MODE</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">Database</span>
                <span className="text-emerald-500 font-bold">Firestore</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
