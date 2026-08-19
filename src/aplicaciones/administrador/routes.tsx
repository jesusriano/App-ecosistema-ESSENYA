import React from 'react';
import { AdminRoutePath } from './components/AdminSidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ReservasPage } from './pages/ReservasPage';
import { TerapeutasPage } from './pages/TerapeutasPage';
import { ClientesPage } from './pages/ClientesPage';
import { ServiciosPage } from './pages/ServiciosPage';
import { PagosPage } from './pages/PagosPage';
import { ReportesPage } from './pages/ReportesPage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';

interface AdminRoutesProps {
  currentRoute: AdminRoutePath;
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
    case '/reportes':
      return <ReportesPage />;
    case '/configuracion':
      return <ConfiguracionPage />;
    default:
      return <DashboardPage />;
  }
};
