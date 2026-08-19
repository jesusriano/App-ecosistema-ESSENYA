import React from 'react';
import { ClientRoutePath } from '../components/ClientNavigation';
import { InicioPage } from '../pages/InicioPage';
import { ReservasPage } from '../pages/ReservasPage';
import { FacturasPage } from '../pages/FacturasPage';
import { PromocionesPage } from '../pages/PromocionesPage';
import { PerfilPage } from '../pages/PerfilPage';

interface ClientRoutesProps {
  currentRoute: ClientRoutePath;
  onNavigate: (route: ClientRoutePath) => void;
}

export const ClientRoutes: React.FC<ClientRoutesProps> = ({ currentRoute, onNavigate }) => {
  switch (currentRoute) {
    case '/inicio':
      return <InicioPage onGoToReservas={() => onNavigate('/reservas')} />;
    case '/reservas':
      return <ReservasPage />;
    case '/facturas':
      return <FacturasPage />;
    case '/promociones':
      return <PromocionesPage onStartBooking={() => onNavigate('/reservas')} />;
    case '/perfil':
      return <PerfilPage />;
    default:
      return <InicioPage onGoToReservas={() => onNavigate('/reservas')} />;
  }
};
