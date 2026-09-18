import React, { Suspense, lazy } from 'react';
import { AdminRoutePath } from './components/AdminSidebar';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ReservasPage = lazy(() => import('./pages/ReservasPage').then(m => ({ default: m.ReservasPage })));
const TerapeutasPage = lazy(() => import('./pages/TerapeutasPage').then(m => ({ default: m.TerapeutasPage })));
const ClientesPage = lazy(() => import('./pages/ClientesPage').then(m => ({ default: m.ClientesPage })));
const ServiciosPage = lazy(() => import('./pages/ServiciosPage').then(m => ({ default: m.ServiciosPage })));
const PagosPage = lazy(() => import('./pages/PagosPage').then(m => ({ default: m.PagosPage })));
const FinanzasDashboard = lazy(() => import('./components/finanzas/FinanzasDashboard').then(m => ({ default: m.FinanzasDashboard })));
const ReportesPage = lazy(() => import('./pages/ReportesPage').then(m => ({ default: m.ReportesPage })));
const ConfiguracionPage = lazy(() => import('./pages/ConfiguracionPage').then(m => ({ default: m.ConfiguracionPage })));
const DeveloperPage = lazy(() => import('./pages/DeveloperPage').then(m => ({ default: m.DeveloperPage })));

interface AdminRoutesProps {
  currentRoute: AdminRoutePath | string;
}

const PageFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center space-y-3">
      <div className="w-8 h-8 rounded-full border-2 border-[#C9A55B] border-t-transparent animate-spin" />
      <span className="text-[11px] uppercase tracking-widest text-[#806020] dark:text-[#C9A55B] font-semibold">
        Cargando vista...
      </span>
    </div>
  </div>
);

export const AdminRoutes: React.FC<AdminRoutesProps> = ({ currentRoute }) => {
  const normalizedRoute = (currentRoute || '').replace(/^\/admin/, '') || '/dashboard';

  return (
    <Suspense fallback={<PageFallback />}>
      {(() => {
        switch (normalizedRoute) {
          case '/dashboard':
            return <DashboardPage />;
          case '/reservas':
            return <ReservasPage />;
          case '/terapeutas':
            return <TerapeutasPage />;
          case '/clientes':
            return <ClientesPage />;
          case '/servicios':
            return <ServiciosPage />;
          case '/pagos':
            return <PagosPage />;
          case '/finanzas':
            return <FinanzasDashboard />;
          case '/reportes':
            return <ReportesPage />;
          case '/configuracion':
            return <ConfiguracionPage />;
          case '/developer':
            return <DeveloperPage />;
          default:
            return <DashboardPage />;
        }
      })()}
    </Suspense>
  );
};
