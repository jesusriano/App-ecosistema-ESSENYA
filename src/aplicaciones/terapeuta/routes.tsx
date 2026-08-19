import React from 'react';
import { TherapistRoutePath } from './components/TherapistNavigation';
import { AgendaPage } from './pages/AgendaPage';
import { ServiciosPage } from './pages/ServiciosPage';
import { GananciasPage } from './pages/GananciasPage';
import { CalificacionesPage } from './pages/CalificacionesPage';
import { PerfilPage } from './pages/PerfilPage';

interface TherapistRoutesProps {
  currentRoute: TherapistRoutePath;
}

export const TherapistRoutes: React.FC<TherapistRoutesProps> = ({ currentRoute }) => {
  switch (currentRoute) {
    case '/agenda':
      return <AgendaPage />;
    case '/servicios':
      return <ServiciosPage />;
    case '/ganancias':
      return <GananciasPage />;
    case '/calificaciones':
      return <CalificacionesPage />;
    case '/perfil':
      return <PerfilPage />;
    default:
      return <AgendaPage />;
  }
};
