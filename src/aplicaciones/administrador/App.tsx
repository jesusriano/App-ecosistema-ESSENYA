import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { AdminRoutes } from './routes';
import { AdminRoutePath } from './components/AdminSidebar';

export const AdminAppModule: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive sub-route from URL path (e.g. /admin/terapeutas or /admin -> /dashboard)
  const currentRoute: AdminRoutePath = useMemo(() => {
    const rawPath = location.pathname;
    // Strip leading /admin if present
    const path = rawPath.replace(/^\/admin(\/|$)/, '/');
    if (!path || path === '/' || path === '') return '/dashboard';

    const validRoutes: AdminRoutePath[] = [
      '/dashboard',
      '/reservas',
      '/terapeutas',
      '/clientes',
      '/servicios',
      '/pagos',
      '/finanzas',
      '/reportes',
      '/configuracion',
      '/developer'
    ];

    const matched = validRoutes.find(r => path === r || path.startsWith(r + '/'));
    return matched || '/dashboard';
  }, [location.pathname]);

  const handleNavigate = (route: AdminRoutePath) => {
    const cleanRoute = route.startsWith('/') ? route : `/${route}`;
    navigate(`/admin${cleanRoute === '/dashboard' ? '' : cleanRoute}`);
  };

  return (
    <AdminLayout
      currentRoute={currentRoute}
      onNavigate={handleNavigate}
    >
      <AdminRoutes currentRoute={currentRoute} />
    </AdminLayout>
  );
};

export default AdminAppModule;

