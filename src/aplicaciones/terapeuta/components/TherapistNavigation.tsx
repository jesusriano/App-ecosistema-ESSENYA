import React from 'react';
import { motion } from 'motion/react';
import { Calendar, Layers, DollarSign, Star, User } from 'lucide-react';

export type TherapistRoutePath = '/agenda' | '/servicios' | '/ganancias' | '/calificaciones' | '/perfil';

interface TherapistNavigationProps {
  currentRoute: TherapistRoutePath;
  onNavigate: (route: TherapistRoutePath) => void;
}

export const TherapistNavigation: React.FC<TherapistNavigationProps> = ({
  currentRoute,
  onNavigate,
}) => {
  const navItems = [
    { path: '/agenda' as TherapistRoutePath, label: 'Mi Agenda & Live', icon: Calendar },
    { path: '/servicios' as TherapistRoutePath, label: 'Servicios Asignados', icon: Layers },
    { path: '/ganancias' as TherapistRoutePath, label: 'Ganancias & Mínimos', icon: DollarSign },
    { path: '/calificaciones' as TherapistRoutePath, label: 'Calificaciones VIP', icon: Star },
    { path: '/perfil' as TherapistRoutePath, label: 'Mi Expediente', icon: User },
  ];

  return (
    <nav className="bg-white dark:bg-[#141414] border-b border-[#E5DFD3] dark:border-[#262626] px-4 py-2 sticky top-[57px] z-20 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.path;

          return (
            <motion.button
              key={item.path}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate(item.path)}
              className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'text-[#806020] dark:text-[#C9A55B] font-bold'
                  : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white hover:bg-[#FAF8F5] dark:hover:bg-[#1A1A1A]'
              }`}
            >
              {/* Active Tab Animated Background Pill */}
              {isActive && (
                <motion.div
                  layoutId="activeTherapistNavTab"
                  className="absolute inset-0 bg-[#C9A55B]/15 border border-[#C9A55B]/40 rounded-xl shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <Icon className={`w-4 h-4 relative z-10 transition-colors ${isActive ? 'text-[#C9A55B]' : ''}`} />
              <span className="relative z-10">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
