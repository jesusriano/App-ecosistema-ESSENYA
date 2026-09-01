import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TherapistLayout } from './components/TherapistLayout';
import { TherapistRoutes } from './routes';
import { TherapistRoutePath } from './components/TherapistNavigation';
import { useTerapeuta } from './hooks/useTerapeuta';

export const TerapeutaAppModule: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive sub-route from URL path (e.g. /terapeuta/ganancias -> /ganancias)
  const currentRoute: TherapistRoutePath = useMemo(() => {
    const path = location.pathname.replace(/^\/terapeuta/, '') || '/agenda';
    if (path === '/' || path === '') return '/agenda';
    const validRoutes: TherapistRoutePath[] = ['/agenda', '/servicios', '/ganancias', '/calificaciones', '/perfil'];
    const matched = validRoutes.find(r => path.startsWith(r));
    return matched || '/agenda';
  }, [location.pathname]);

  const handleNavigate = (route: TherapistRoutePath) => {
    navigate(`/terapeuta${route}`);
  };

  const { therapist } = useTerapeuta();

  return (
    <TherapistLayout
      therapist={therapist}
      currentRoute={currentRoute}
      onNavigate={handleNavigate}
    >
      <TherapistRoutes currentRoute={currentRoute} />
    </TherapistLayout>
  );
};

export default TerapeutaAppModule;

