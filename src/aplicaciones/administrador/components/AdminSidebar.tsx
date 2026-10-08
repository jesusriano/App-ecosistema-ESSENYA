import React from 'react';
import { 
  LayoutDashboard, Calendar, UserCheck, Users, 
  Sparkles, CreditCard, BarChart2, Settings, FileCheck,
  Code, DollarSign, ShieldAlert
} from 'lucide-react';
import { useTherapistContext } from '../../../shared/context/TherapistContext';

export type AdminRoutePath = 
  | '/dashboard' 
  | '/reservas' 
  | '/terapeutas' 
  | '/clientes' 
  | '/servicios' 
  | '/pagos' 
  | '/finanzas'
  | '/reportes' 
  | '/monitoreo'
  | '/configuracion'
  | '/developer';

interface AdminSidebarProps {
  currentRoute: AdminRoutePath;
  onNavigate: (route: AdminRoutePath) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentRoute, onNavigate }) => {
  const { therapists } = useTherapistContext();
  const pendingCount = (therapists || []).filter(t => t && t.estado === 'pendiente').length;

  const isDevMode = import.meta.env.VITE_DEVELOPER_MODE === 'true';

  const menuItems = [
    { path: '/dashboard' as AdminRoutePath, label: 'Dashboard Live', icon: LayoutDashboard },
    { path: '/reservas' as AdminRoutePath, label: 'Reservas & IA', icon: Calendar },
    { path: '/terapeutas' as AdminRoutePath, label: 'Red de Terapeutas & Solicitudes', icon: UserCheck, badge: pendingCount },
    { path: '/clientes' as AdminRoutePath, label: 'Socios VIP', icon: Users },
    { path: '/servicios' as AdminRoutePath, label: 'Servicios & Tarifas', icon: Sparkles },
    { path: '/pagos' as AdminRoutePath, label: 'Pagos & Comprobantes', icon: CreditCard },
    { path: '/finanzas' as AdminRoutePath, label: 'Finanzas', icon: DollarSign },
    { path: '/reportes' as AdminRoutePath, label: 'Reportes & Métricas', icon: BarChart2 },
    { path: '/monitoreo' as AdminRoutePath, label: 'Monitoreo & Alertas', icon: ShieldAlert },
    { path: '/configuracion' as AdminRoutePath, label: 'Zonas & Seguridad', icon: Settings },
  ];

  if (isDevMode) {
    menuItems.push({ path: '/developer' as AdminRoutePath, label: 'Developer Portal', icon: Code });
  }

  return (
    <aside className="w-full h-full p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
      <div className="flex flex-col space-y-1.5 w-full">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.path;

          return (
            <button
              key={item.path}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`[AdminSidebar Click] Navigating to: ${item.path}`);
                onNavigate(item.path);
              }}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer w-full text-left relative z-10 ${
                isActive
                  ? 'bg-[#C9A55B]/15 text-[#C9A55B] font-bold border border-[#C9A55B]/40 shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subcard)]'
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C9A55B]' : 'text-[#666666]'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-[#C9A55B] text-black text-[10px] font-extrabold px-1.5 py-0.2 rounded-full shrink-0 ml-1">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
