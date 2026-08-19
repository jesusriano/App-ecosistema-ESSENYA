import React from 'react';
import AdminAppModule from '../../aplicaciones/administrador/App';
import { PortalAuthGuard } from '../../shared/components/auth/PortalAuthGuard';

export const AdminApp: React.FC = () => {
  return (
    <PortalAuthGuard role="administrador">
      <AdminAppModule />
    </PortalAuthGuard>
  );
};

export default AdminApp;
