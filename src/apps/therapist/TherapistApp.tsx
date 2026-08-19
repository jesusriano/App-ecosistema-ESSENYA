import React from 'react';
import TerapeutaAppModule from '../../aplicaciones/terapeuta/App';
import { PortalAuthGuard } from '../../shared/components/auth/PortalAuthGuard';

export const TherapistApp: React.FC = () => {
  return (
    <PortalAuthGuard role="terapeuta">
      <TerapeutaAppModule />
    </PortalAuthGuard>
  );
};

export default TherapistApp;
