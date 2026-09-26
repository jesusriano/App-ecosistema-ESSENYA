import React from 'react';
import { EssenyaLogo } from '../../../shared/components/EssenyaLogo';
import { Activity, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';

interface AdminHeaderProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen,
}) => {
  const { logout, getUser } = useAuth();
  const adminUser = getUser('administrador');

  return (
    <header className="bg-[var(--bg-card)] border-b border-[var(--border-color)] px-3 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center text-[var(--text-primary)] sticky top-0 z-30 transition-colors shadow-xs">
      <div className="flex items-center space-x-2 sm:space-x-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            aria-label="Abrir menú de navegación"
            className="md:hidden p-1.5 -ml-1 rounded-xl bg-[var(--bg-subcard)] border border-[var(--border-color)] text-[#C9A55B] hover:text-[var(--text-primary)] hover:bg-[var(--bg-active)] cursor-pointer transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
        <EssenyaLogo size="xs" showText={true} align="left" />
        <span className="bg-[#C9A55B]/20 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest hidden xl:inline-block">
          SISTEMA CENTRAL DE OPERACIONES ESSENYA
        </span>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
        {adminUser && (
          <span className="hidden md:inline font-mono text-[#C9A55B] text-[11px] bg-[var(--bg-subcard)] border border-[var(--border-color)] px-2.5 py-1 rounded-xl truncate max-w-[200px]">
            {adminUser.nombre}
          </span>
        )}

        <div className="flex items-center space-x-1.5 sm:space-x-2 bg-[var(--bg-subcard)] border border-[var(--border-color)] px-2 sm:px-3 py-1.5 rounded-xl shrink-0">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
          <span className="font-mono text-emerald-400 font-bold text-[10px] sm:text-xs">
            <span className="hidden sm:inline">RADAR ACTIVO 100%</span>
            <span className="sm:hidden">RADAR 100%</span>
          </span>
        </div>

        <button
          onClick={() => logout('administrador')}
          title="Cerrar Sesión de Administrador"
          className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 bg-[var(--bg-subcard)] hover:bg-red-500/20 border border-[var(--border-color)] hover:border-red-500/40 text-[var(--text-primary)] hover:text-red-400 font-semibold rounded-xl transition-all cursor-pointer shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
};
