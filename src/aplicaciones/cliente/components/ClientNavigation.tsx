import React from 'react';
import { motion } from 'motion/react';
import { Home, Calendar, Wallet, FileText, Gift, User } from 'lucide-react';

export type ClientRoutePath = '/inicio' | '/reservas' | '/billetera' | '/facturas' | '/promociones' | '/perfil';

interface ClientNavigationProps {
  currentRoute: ClientRoutePath;
  onNavigate: (route: ClientRoutePath) => void;
  activeBookingBadge?: boolean;
}

export const ClientNavigation: React.FC<ClientNavigationProps> = ({
  currentRoute,
  onNavigate,
  activeBookingBadge = false,
}) => {
  const navItems = [
    { path: '/inicio' as ClientRoutePath, label: 'Inicio', icon: Home },
    { path: '/reservas' as ClientRoutePath, label: 'Reservar Masaje', icon: Calendar, badge: activeBookingBadge },
    { path: '/billetera' as ClientRoutePath, label: 'Billetera', icon: Wallet },
    { path: '/facturas' as ClientRoutePath, label: 'Recibos', icon: FileText },
    { path: '/promociones' as ClientRoutePath, label: 'Promociones VIP', icon: Gift },
    { path: '/perfil' as ClientRoutePath, label: 'Mi Perfil', icon: User },
  ];

  return (
    <nav className="bg-white dark:bg-[#141414] border-b border-[#E5DFD3] dark:border-[#262626] px-4 py-2 sticky top-[57px] z-20 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.path;

          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'text-[#806020] dark:text-[#C9A55B] font-bold bg-[#C9A55B]/10 border border-[#C9A55B]/30'
                  : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] dark:hover:text-white hover:bg-[#FAF8F5] dark:hover:bg-[#1A1A1A]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#C9A55B]' : ''}`} />
              <span>{item.label}</span>
              {item.badge && !isActive && (
                <span className="w-2 h-2 rounded-full bg-[#C9A55B] animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
