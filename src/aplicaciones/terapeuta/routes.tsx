import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  const renderPage = () => {
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

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentRoute}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full"
      >
        {renderPage()}
      </motion.div>
    </AnimatePresence>
  );
};
