import React, { useState } from 'react';
import { AdminLayout } from './components/AdminLayout';
import { AdminRoutes } from './routes';
import { AdminRoutePath } from './components/AdminSidebar';

export const AdminAppModule: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AdminRoutePath>('/dashboard');

  return (
    <AdminLayout
      currentRoute={currentRoute}
      onNavigate={setCurrentRoute}
    >
      <AdminRoutes currentRoute={currentRoute} />
    </AdminLayout>
  );
};

export default AdminAppModule;
