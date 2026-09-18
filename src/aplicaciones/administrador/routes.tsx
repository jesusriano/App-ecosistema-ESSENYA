import React from 'react';
import { AdminRoutePath } from './components/AdminSidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ReservasPage } from './pages/ReservasPage';
import { TerapeutasPage } from './pages/TerapeutasPage';
import { ClientesPage } from './pages/ClientesPage';
import { ServiciosPage } from './pages/ServiciosPage';
import { PagosPage } from './pages/PagosPage';
import { FinanzasPage } from './pages/FinanzasPage';
import { FinanzasDashboard } from './components/finanzas/FinanzasDashboard';
import { ReportesPage } from './pages/ReportesPage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';
import { DeveloperPage } from './pages/DeveloperPage';

interface AdminRoutesProps {
  currentRoute: AdminRoutePath | string;
}

export const AdminRoutes: React.FC<AdminRoutesProps> = ({ currentRoute }) => {
  switch (currentRoute) {
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
    case '/admin/finanzas':
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
};
