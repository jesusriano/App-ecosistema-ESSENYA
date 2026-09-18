import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, Calendar, UserCheck, Users, 
  Sparkles, CreditCard, DollarSign, BarChart2, Settings, Code 
} from 'lucide-react';
import { AdminRoutePath } from './AdminSidebar';
import { useTherapistContext } from '../../../shared/context/TherapistContext';

interface AdminNavigationProps {
  currentRoute: AdminRoutePath;
  onNavigate: (route: AdminRoutePath) => void;
}

export const AdminNavigation: React.FC<AdminNavigationProps> = ({
  currentRoute,
  onNavigate,
}) => {
  const { therapists } = useTherapistContext();
  const pendingCount = (therapists || []).filter(t => t && t.estado === 'pendiente').length;
  const isDevMode = import.meta.env.VITE_DEVELOPER_MODE === 'true';

  const navItems = [
    { path: '/dashboard' as AdminRoutePath, label: 'Dashboard', icon: LayoutDashboard },
    { path: '/reservas' as AdminRoutePath, label: 'Reservas', icon: Calendar },
    { path: '/terapeutas' as AdminRoutePath, label: 'Terapeutas', icon: UserCheck, badge: pendingCount },
    { path: '/clientes' as AdminRoutePath, label: 'Socios VIP', icon: Users },
    { path: '/servicios' as AdminRoutePath, label: 'Servicios', icon: Sparkles },
    { path: '/pagos' as AdminRoutePath, label: 'Pagos', icon: CreditCard },
    { path: '/finanzas' as AdminRoutePath, label: 'Finanzas', icon: DollarSign },
    { path: '/reportes' as AdminRoutePath, label: 'Reportes', icon: BarChart2 },
    { path: '/configuracion' as AdminRoutePath, label: 'Configuración', icon: Settings },
  ];

  if (isDevMode) {
    navItems.push({ path: '/developer' as AdminRoutePath, label: 'Developer', icon: Code, badge: 0 });
  }

  return (
    <nav className="bg-[var(--bg-card)] border-b border-[var(--border-color)] px-3 sm:px-4 py-2 sticky top-[75px] sm:top-[85px] z-20 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.path;

          return (
            <button
              key={item.path}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNavigate(item.path);
              }}
              className={`relative flex items-center space-x-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'text-[#806020] dark:text-[#C9A55B] font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subcard)]'
              }`}
            >
              {/* Active Tab Animated Background Pill */}
              {isActive && (
                <motion.div
                  layoutId="activeAdminNavTab"
                  className="absolute inset-0 bg-[#C9A55B]/15 border border-[#C9A55B]/40 rounded-xl shadow-xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <Icon className={`w-4 h-4 relative z-10 transition-colors ${isActive ? 'text-[#C9A55B]' : ''}`} />
              <span className="relative z-10">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="relative z-10 bg-[#C9A55B] text-black text-[10px] font-black px-1.5 py-0.2 rounded-full shrink-0 animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
