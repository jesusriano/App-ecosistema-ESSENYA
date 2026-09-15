import React from 'react';
import { Code, AlertTriangle } from 'lucide-react';
import { DeveloperDashboard } from '../components/DeveloperDashboard';

export const DeveloperPage: React.FC = () => {
  const isDevMode = import.meta.env.VITE_DEVELOPER_MODE === 'true';

  if (!isDevMode) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-xl font-serif font-bold text-[var(--text-primary)]">Acceso Restringido</h2>
        <p className="text-sm text-[var(--text-muted)] text-center max-w-md">
          El Portal de Desarrollador solo está disponible cuando VITE_DEVELOPER_MODE está habilitado en el entorno.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-[var(--border-color)] pb-4">
        <h1 className="text-2xl font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Code className="w-6 h-6 text-[#C9A55B]" />
          <span>Developer Portal</span>
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Infraestructura y herramientas de depuración de ESSENYA IA.
        </p>
      </div>

      <DeveloperDashboard />
    </div>
  );
};
