import React from 'react';
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
    { path: '/inicio' as ClientRoutePath, label: 'Inicio', shortLabel: 'Inicio', icon: Home },
    { path: '/reservas' as ClientRoutePath, label: 'Reservar Masaje', shortLabel: 'Reservar', icon: Calendar, badge: activeBookingBadge },
    { path: '/billetera' as ClientRoutePath, label: 'Mi Billetera', shortLabel: 'Billetera', icon: Wallet },
    { path: '/facturas' as ClientRoutePath, label: 'Recibos & Facturas', shortLabel: 'Recibos', icon: FileText },
    { path: '/promociones' as ClientRoutePath, label: 'Promociones VIP', shortLabel: 'Promos', icon: Gift },
    { path: '/perfil' as ClientRoutePath, label: 'Mi Perfil', shortLabel: 'Perfil', icon: User },
  ];

  return (
    <>
      {/* Desktop / Tablet Horizontal Header Bar */}
      <nav className="bg-white/95 dark:bg-[#141414]/95 backdrop-blur-sm border-b border-[#E5DFD3] dark:border-[#262626] px-4 py-2 sticky top-[57px] z-20 shadow-xs transition-colors hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.path;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => onNavigate(item.path)}
                className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'text-[#806020] dark:text-[#C9A55B] font-bold bg-[#C9A55B]/10 border border-[#C9A55B]/30 shadow-xs'
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

      {/* Mobile Top Minimal Breadcrumb Bar */}
      <div className="md:hidden bg-white/90 dark:bg-[#141414]/90 backdrop-blur-md border-b border-[#E5DFD3] dark:border-[#262626] px-3 py-1.5 sticky top-[53px] z-20 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5 text-[#806020] dark:text-[#C9A55B] font-bold">
          {(() => {
            const currentItem = navItems.find(i => i.path === currentRoute) || navItems[0];
            const CurrentIcon = currentItem.icon;
            return (
              <>
                <CurrentIcon className="w-3.5 h-3.5" />
                <span className="text-xs uppercase tracking-wider">{currentItem.label}</span>
              </>
            );
          })()}
        </div>
        <span className="text-[10px] text-[#6B655F] dark:text-[#888888] font-medium">ESSENYA Concierge</span>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (Native App Style) */}
      <nav 
        aria-label="Navegación móvil inferior"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-xl border-t border-[#E5DFD3] dark:border-[#262626] px-1 py-1 shadow-lg transition-colors"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)' }}
      >
        <div className="grid grid-cols-6 gap-0.5 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.path;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  onNavigate(item.path);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`relative flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer min-h-[48px] ${
                  isActive
                    ? 'text-[#806020] dark:text-[#C9A55B] font-bold bg-[#C9A55B]/10'
                    : 'text-[#6B655F] dark:text-[#AAAAAA] hover:text-[#1C1917] active:scale-95'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-[#C9A55B]' : ''}`} />
                  {item.badge && !isActive && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#C9A55B] animate-pulse" />
                  )}
                </div>
                <span className="text-[9.5px] leading-tight truncate max-w-full">
                  {item.shortLabel}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-[#C9A55B] mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
