import React, { useState } from 'react';
import { TherapistLayout } from './components/TherapistLayout';
import { TherapistRoutes } from './routes';
import { TherapistRoutePath } from './components/TherapistNavigation';
import { useTerapeuta } from './hooks/useTerapeuta';

export const TerapeutaAppModule: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<TherapistRoutePath>('/agenda');
  const { therapist } = useTerapeuta();

  return (
    <TherapistLayout
      therapist={therapist}
      currentRoute={currentRoute}
      onNavigate={setCurrentRoute}
    >
      <TherapistRoutes currentRoute={currentRoute} />
    </TherapistLayout>
  );
};

export default TerapeutaAppModule;
