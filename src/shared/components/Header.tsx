import React from 'react';
import { motion } from 'motion/react';
import { PortalType } from '../types';
import { User, Shield, Globe, Sparkles, Activity, Award, Sun, Moon, Laptop, ExternalLink } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { EssenyaLogo } from './EssenyaLogo';

interface HeaderProps {
  currentPortal: PortalType;
  onSelectPortal: (portal: PortalType) => void;
  activeBookingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentPortal,
  onSelectPortal,
  activeBookingCount,
}) => {
  const { themeMode, setThemeMode } = useTheme();
  const { sessions } = useAuth();
  const isAdminSession = !!sessions.administrador;

  const portals = [
    { id: 'client' as PortalType, label: 'App Clientes', icon: User, badge: activeBookingCount > 0 },
    { id: 'therapist' as PortalType, label: 'App Terapeutas', icon: Sparkles },
    // Only show admin if already in admin portal or if specifically logged in as admin
    ...(isAdminSession || currentPortal === 'admin' ? [{ id: 'admin' as PortalType, label: 'Panel Admin', icon: Shield }] : []),
    { id: 'website' as PortalType, label: 'essenyamexico.com', icon: Globe },
  ];


  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#0D0D0D]/90 backdrop-blur-2xl border-b border-[#E5DFD3]/80 dark:border-[#262626] transition-all shadow-xs">
      {/* Top Banner Bar */}
      <div className="bg-[#FAF8F5] dark:bg-[#141414] px-2.5 sm:px-4 py-1 border-b border-[#E5DFD3]/60 dark:border-[#262626] text-xs text-[#806020] dark:text-[#C9A55B] flex flex-wrap justify-between items-center gap-1.5 transition-colors overflow-hidden">
        <div className="flex items-center space-x-2 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold tracking-wider uppercase text-[10px] text-emerald-700 dark:text-emerald-400">
            Ecosistema ESSENYA Conectado
          </span>
          <span className="text-[#D8D2C6] dark:text-[#333333] hidden sm:inline">|</span>
          <span className="text-[#6B655F] dark:text-white/70 hidden md:inline text-[11px]">
            CDMX & Zona Metropolitana • Atento 24/7
          </span>
        </div>

        {/* Theme & Luxury Club Bar */}
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

          <a
            href="https://essenyamexico.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Visitar sitio oficial essenyamexico.com"
            className="hidden xl:flex items-center space-x-1.5 text-[11px] font-semibold text-[#806020] dark:text-[#C9A55B] bg-[#C9A55B]/10 hover:bg-[#C9A55B]/20 border border-[#C9A55B]/30 px-2.5 py-1 rounded-xl transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-[#C9A55B]" />
            <span>essenyamexico.com</span>
          </a>

          <div className="hidden sm:flex items-center space-x-1.5 bg-[#FAF8F5] dark:bg-[#1A1A1A] px-2.5 py-1 rounded-xl border border-[#E5DFD3] dark:border-[#2A2A2A]">
            <Award className="w-3.5 h-3.5 text-[#C9A55B]" />
            <span className="font-bold text-[11px] text-[#806020] dark:text-[#C9A55B]">Club Black</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-2 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 w-full overflow-hidden">
        {/* Brand Logo & Tagline */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onSelectPortal('website')}
          className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group py-0.5 shrink-0"
          title="ESSENYA Haute Massage & Wellness"
        >
          <EssenyaLogo size="sm" showText={true} align="left" />
          
          <div className="hidden md:flex flex-col justify-center border-l border-[#E5DFD3] dark:border-[#333333] pl-3 py-0.5">
            <span className="text-[9px] bg-[#C9A55B]/15 text-[#806020] dark:text-[#C9A55B] border border-[#C9A55B]/30 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold self-start">
              Haute Massage
            </span>
            <p className="text-[10px] text-[#6B655F] dark:text-[#888888] tracking-wider uppercase font-medium mt-0.5">
              Ecosistema Integral de Bienestar
            </p>
          </div>
        </motion.div>

        {/* Portal Switcher Tabs with Animated Layout Sliding Pill */}
        <nav id="website-navigation-container" className="flex items-center justify-start sm:justify-center bg-[#F5F1EA]/80 dark:bg-[#141414] p-1 sm:p-1.5 rounded-2xl border border-[#E5DFD3] dark:border-[#262626] shadow-xs overflow-x-auto no-scrollbar max-w-full w-full sm:w-auto transition-colors">
          {portals.map((portal) => {
            const Icon = portal.icon;
            const isActive = currentPortal === portal.id;
            const isWebsite = portal.id === 'website';
            return (
              <button
                key={portal.id}
                id={isWebsite ? 'website-direct-link-button' : undefined}
                onClick={() => {
                  onSelectPortal(portal.id);
                  if (isWebsite) {
                    window.open('https://essenyamexico.com/', '_blank', 'noopener,noreferrer');
                  }
                }}
                className={`relative flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'text-white dark:text-black font-bold'
                    : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activePortalTab"
                    className="absolute inset-0 bg-gradient-to-r from-[#D8B76C] via-[#C9A55B] to-[#9A7B38] rounded-xl shadow-md shadow-[#C9A55B]/25"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center space-x-1.5">
                  <Icon className="w-4 h-4" />
                  <span>{portal.label}</span>
                  {isWebsite && <ExternalLink className="w-3 h-3 opacity-70 ml-0.5 shrink-0" />}
                  {portal.badge && !isActive && (
                    <span className="w-2 h-2 rounded-full bg-[#C9A55B] animate-pulse" />
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Live System Indicator & Notifications */}
        <div className="hidden lg:flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-2.5 bg-white dark:bg-[#141414] px-3.5 py-1.5 rounded-2xl border border-[#E5DFD3] dark:border-[#262626] shadow-xs">
            <Activity className="w-4 h-4 text-[#C9A55B]" />
            <div className="text-right">
              <p className="text-[9px] text-[#6B655F] dark:text-[#888888] uppercase tracking-wider font-semibold">Estado Servidor</p>
              <p className="text-[11px] text-[#1C1917] dark:text-white font-bold">Cloud Latency: 12ms</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
