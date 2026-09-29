import React from 'react';
import { motion } from 'motion/react';
import { PortalType } from '../types';
import { User, Shield, Globe, Sparkles, Activity, Award, Sun, Moon, Laptop, ExternalLink } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { EssenyaLogo } from './EssenyaLogo';
import { TechSupportWhatsAppButton } from './TechSupportWhatsAppButton';
import { PWAInstallButton } from './PWAInstallButton';
import { PushSubscriptionButton } from './PushSubscriptionButton';

interface HeaderProps {
  currentPortal: PortalType;
  onSelectPortal: (portal: PortalType) => void;
  activeBookingCount: number;
  onOpenNotificationCenter?: () => void;
  unreadNotificationCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentPortal,
  onSelectPortal,
  activeBookingCount,
  onOpenNotificationCenter,
  unreadNotificationCount = 0,
}) => {
  const { themeMode, setThemeMode } = useTheme();
  const { sessions } = useAuth();
  const isAdminSession = !!sessions.administrador;

  const portalTitle = currentPortal === 'admin'
    ? 'Panel de Administración'
    : currentPortal === 'therapist'
    ? 'Portal de Terapeutas Acreditados'
    : 'Aplicación de Clientes VIP';

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#0D0D0D]/90 backdrop-blur-2xl border-b border-[#E5DFD3]/80 dark:border-[#262626] transition-all shadow-xs">
      {/* Top Banner Bar */}
      <div className="bg-[#FAF8F5] dark:bg-[#141414] px-2.5 sm:px-4 py-1.5 border-b border-[#E5DFD3]/60 dark:border-[#262626] text-xs text-[#806020] dark:text-[#C9A55B] flex flex-wrap justify-between items-center gap-1.5 transition-colors overflow-hidden">
        <div className="flex items-center space-x-2 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold tracking-wider uppercase text-[10px] text-emerald-700 dark:text-emerald-400">
            ESSENYA Secure Cloud
          </span>
          <span className="text-[#D8D2C6] dark:text-[#333333] hidden sm:inline">|</span>
          <span className="text-[#6B655F] dark:text-white/70 hidden md:inline text-[11px]">
            CDMX & Zona Metropolitana • Soporte 24/7
          </span>
        </div>

        {/* Theme & Support Bar */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 ml-auto sm:ml-0">
          <div className="flex items-center space-x-0.5 sm:space-x-1 bg-white dark:bg-[#1A1A1A] border border-[#E5DFD3] dark:border-[#2A2A2A] p-0.5 rounded-xl text-[10px] sm:text-[11px] shadow-xs">
            <button
              onClick={() => setThemeMode('light')}
              title="Modo Claro"
              className={`flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 rounded-lg font-medium transition-all ${
                themeMode === 'light'
                  ? 'bg-[#C9A55B] text-white font-bold shadow-xs'
                  : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
              }`}
            >
              <Sun className="w-3 h-3" />
              <span className="hidden sm:inline">Claro</span>
            </button>

            <button
              onClick={() => setThemeMode('dark')}
              title="Modo Oscuro"
              className={`flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 rounded-lg font-medium transition-all ${
                themeMode === 'dark'
                  ? 'bg-[#C9A55B] text-white font-bold shadow-xs'
                  : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
              }`}
            >
              <Moon className="w-3 h-3" />
              <span className="hidden sm:inline">Oscuro</span>
            </button>

            <button
              onClick={() => setThemeMode('system')}
              title="Tema Automático"
              className={`flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 rounded-lg font-medium transition-all ${
                themeMode === 'system'
                  ? 'bg-[#C9A55B] text-white font-bold shadow-xs'
                  : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
              }`}
            >
              <Laptop className="w-3 h-3" />
              <span className="hidden sm:inline">Auto</span>
            </button>
          </div>

          <span className="text-[#D8D2C6] dark:text-[#333333] hidden sm:inline">|</span>

          {/* Botón directo de Soporte Técnico Oficial */}
          <TechSupportWhatsAppButton 
            role={currentPortal === 'therapist' ? 'terapeuta' : currentPortal === 'admin' ? 'general' : 'cliente'} 
            variant="compact" 
            label="Soporte Técnico"
          />

          <a
            href="https://essenyamexico.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Sitio Oficial essenyamexico.com"
            className="hidden xl:flex items-center space-x-1.5 text-[11px] font-semibold text-[#806020] dark:text-[#C9A55B] bg-[#C9A55B]/10 hover:bg-[#C9A55B]/20 border border-[#C9A55B]/30 px-2.5 py-1 rounded-xl transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-[#C9A55B]" />
            <span>essenyamexico.com</span>
          </a>
        </div>
      </div>

      {/* Main Navigation Bar (Separate Panel Header) */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-3 w-full overflow-hidden">
        {/* Brand Logo & Current Separate Panel Title */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <EssenyaLogo size="xs" showText={false} align="left" className="block sm:hidden" />
          <EssenyaLogo size="sm" showText={true} align="left" className="hidden sm:block" />
          
          <div className="flex flex-col justify-center border-l border-[#E5DFD3] dark:border-[#333333] pl-2 sm:pl-3 py-0.5 min-w-0">
            <span className="text-[8px] sm:text-[9px] bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/30 px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-widest font-bold self-start truncate">
              {currentPortal === 'admin' ? 'Administración' : currentPortal === 'therapist' ? 'Terapeuta' : 'Cliente VIP'}
            </span>
            <h1 className="text-[10px] sm:text-xs md:text-sm font-bold text-[var(--text-primary)] truncate mt-0.5 leading-tight">
              <span className="block sm:hidden">
                {currentPortal === 'admin' ? 'Admin' : currentPortal === 'therapist' ? 'Terapeutas' : 'Clientes VIP'}
              </span>
              <span className="hidden sm:block">
                {portalTitle}
              </span>
            </h1>
          </div>
        </div>

        {/* Panel Actions / Website Link & Status */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          <PWAInstallButton dismissible={true} />
          <PushSubscriptionButton variant="minimal" className="inline-flex" />

          <a
            href="https://essenyamexico.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-[#1A1A1A] hover:bg-[#F2ECE1] dark:hover:bg-[#222222] border border-[#E5DFD3] dark:border-[#2A2A2A] text-xs font-semibold text-[#806020] dark:text-[#C9A55B] transition-all cursor-pointer"
            title="Ir a la página web oficial essenyamexico.com"
          >
            <Globe className="w-3.5 h-3.5 text-[#C9A55B]" />
            <span className="hidden sm:inline">Web</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>

          <div className="hidden lg:flex items-center space-x-2.5 bg-[#FAF8F5] dark:bg-[#141414] px-3 py-1.5 rounded-xl border border-[#E5DFD3] dark:border-[#262626] shadow-xs">
            <Activity className="w-3.5 h-3.5 text-[#C9A55B]" />
            <span className="text-[11px] text-[var(--text-primary)] font-bold">Activo</span>
          </div>
        </div>
      </div>
    </header>
  );
};
