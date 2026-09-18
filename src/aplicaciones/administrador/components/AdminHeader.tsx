import React from 'react';
import { EssenyaLogo } from '../../../shared/components/EssenyaLogo';
import { ShieldAlert, Activity, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';

export const AdminHeader: React.FC = () => {
  const { logout, getUser } = useAuth();
  const adminUser = getUser('administrador');

  return (
    <div className="bg-[var(--bg-card)] border-b border-[var(--border-color)] px-4 sm:px-6 py-3 flex justify-between items-center text-[var(--text-primary)] relative z-10">
      <div className="flex items-center space-x-3">
        <EssenyaLogo size="xs" showText={true} align="left" />
        <span className="bg-[#C9A55B]/20 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest hidden sm:inline-block">
          SISTEMA CENTRAL DE OPERACIONES ESSENYA
        </span>
      </div>

      <div className="flex items-center space-x-3 text-xs">
        {adminUser && (
          <span className="hidden md:inline font-mono text-[#C9A55B] text-[11px] bg-[var(--bg-subcard)] border border-[var(--border-color)] px-2.5 py-1 rounded-xl">
            {adminUser.nombre} ({adminUser.correo})
          </span>
        )}

        <div className="flex items-center space-x-2 bg-[var(--bg-subcard)] border border-[var(--border-color)] px-3 py-1.5 rounded-xl">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="font-mono text-emerald-400 font-bold">RADAR ACTIVO 100%</span>
        </div>

        <button
          onClick={() => logout('administrador')}
          title="Cerrar Sesión de Administrador"
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--bg-subcard)] hover:bg-red-500/20 border border-[var(--border-color)] hover:border-red-500/40 text-[var(--text-primary)] hover:text-red-400 font-semibold rounded-xl transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </div>
  );
};
