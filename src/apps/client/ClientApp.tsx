import React from 'react';
import ClienteAppModule from '../../aplicaciones/cliente/App';
import { PortalAuthGuard } from '../../shared/components/auth/PortalAuthGuard';

export const ClientApp: React.FC = () => {
  return (
    <PortalAuthGuard role="cliente">
      <ClienteAppModule />
    </PortalAuthGuard>
  );
};

export default ClientApp;
