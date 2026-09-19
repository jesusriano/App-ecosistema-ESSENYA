import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { AdminRoutes } from './routes';
import { AdminRoutePath } from './components/AdminSidebar';

export const AdminAppModule: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  console.log('[AdminAppModule Render] pathname:', location.pathname);

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
    const resolved = matched || '/dashboard';
    console.log('[AdminAppModule useMemo] rawPath:', rawPath, '-> resolved route:', resolved);
    return resolved;
  }, [location.pathname]);

  const handleNavigate = (route: AdminRoutePath) => {
    console.log('[AdminAppModule handleNavigate] requested route:', route);
    const cleanRoute = route.startsWith('/') ? route : `/${route}`;
    const targetUrl = `/admin${cleanRoute === '/dashboard' ? '' : cleanRoute}`;
    console.log('[AdminAppModule handleNavigate] navigating via navigate to:', targetUrl);
    navigate(targetUrl);
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

