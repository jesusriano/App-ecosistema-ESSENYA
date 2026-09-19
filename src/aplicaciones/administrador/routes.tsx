import React, { Suspense, lazy, useEffect } from 'react';
import { AdminRoutePath } from './components/AdminSidebar';
import { ErrorBoundary } from '../../shared/components/ErrorBoundary';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ReservasPage = lazy(() => import('./pages/ReservasPage').then(m => ({ default: m.ReservasPage })));
const TerapeutasPage = lazy(() => import('./pages/TerapeutasPage').then(m => ({ default: m.TerapeutasPage })));
const ClientesPage = lazy(() => import('./pages/ClientesPage').then(m => ({ default: m.ClientesPage })));
const ServiciosPage = lazy(() => import('./pages/ServiciosPage').then(m => ({ default: m.ServiciosPage })));
const PagosPage = lazy(() => import('./pages/PagosPage').then(m => ({ default: m.PagosPage })));
const FinanzasDashboard = lazy(() => import('./components/finanzas/FinanzasDashboard').then(m => ({ default: m.FinanzasDashboard })));
const ReportesPage = lazy(() => import('./pages/ReportesPage').then(m => ({ default: m.ReportesPage })));
const ConfiguracionPage = lazy(() => import('./pages/ConfiguracionPage').then(m => ({ default: m.ConfiguracionPage })));
const DeveloperPage = lazy(() => import('./pages/DeveloperPage').then(m => ({ default: m.DeveloperPage })));

interface AdminRoutesProps {
  currentRoute: AdminRoutePath | string;
}

const PageFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center space-y-3">
      <div className="w-8 h-8 rounded-full border-2 border-[#C9A55B] border-t-transparent animate-spin" />
      <span className="text-[11px] uppercase tracking-widest text-[#806020] dark:text-[#C9A55B] font-semibold">
        Cargando vista...
      </span>
    </div>
  </div>
);

export const AdminRoutes: React.FC<AdminRoutesProps> = ({ currentRoute }) => {
  const normalizedRoute = (currentRoute || '').replace(/^\/admin/, '') || '/dashboard';

  useEffect(() => {
    console.log(`[AdminRoutes Debug] Active route changed to: ${normalizedRoute}`);
  }, [normalizedRoute]);

  return (
    <Suspense fallback={<PageFallback />}>
      {(() => {
        switch (normalizedRoute) {
          case '/dashboard':
            return (
              <ErrorBoundary fallbackTitle="Error en Dashboard Administrativo" onReset={() => console.log('[ErrorBoundary] Reset Dashboard')}>
                <DashboardPage />
              </ErrorBoundary>
            );
          case '/reservas':
            return (
              <ErrorBoundary fallbackTitle="Error en Módulo de Reservas" onReset={() => console.log('[ErrorBoundary] Reset Reservas')}>
                <ReservasPage />
              </ErrorBoundary>
            );
          case '/terapeutas':
            return (
              <ErrorBoundary fallbackTitle="Error en Módulo de Terapeutas" onReset={() => console.log('[ErrorBoundary] Reset Terapeutas')}>
                <TerapeutasPage />
              </ErrorBoundary>
            );
          case '/clientes':
            return (
              <ErrorBoundary fallbackTitle="Error en Módulo de Clientes" onReset={() => console.log('[ErrorBoundary] Reset Clientes')}>
                <ClientesPage />
              </ErrorBoundary>
            );
          case '/servicios':
            return (
              <ErrorBoundary fallbackTitle="Error en Módulo de Servicios" onReset={() => console.log('[ErrorBoundary] Reset Servicios')}>
                <ServiciosPage />
              </ErrorBoundary>
            );
          case '/pagos':
            return (
              <ErrorBoundary fallbackTitle="Error en Módulo de Pagos" onReset={() => console.log('[ErrorBoundary] Reset Pagos')}>
                <PagosPage />
              </ErrorBoundary>
            );
          case '/finanzas':
            return (
              <ErrorBoundary fallbackTitle="Error en Módulo de Finanzas" onReset={() => console.log('[ErrorBoundary] Reset Finanzas')}>
                <FinanzasDashboard />
              </ErrorBoundary>
            );
          case '/reportes':
            return (
              <ErrorBoundary fallbackTitle="Error en Módulo de Reportes" onReset={() => console.log('[ErrorBoundary] Reset Reportes')}>
                <ReportesPage />
              </ErrorBoundary>
            );
          case '/configuracion':
            return (
              <ErrorBoundary fallbackTitle="Error en Módulo de Configuración" onReset={() => console.log('[ErrorBoundary] Reset Configuracion')}>
                <ConfiguracionPage />
              </ErrorBoundary>
            );
          case '/developer':
            return (
              <ErrorBoundary fallbackTitle="Error en Developer Dashboard" onReset={() => console.log('[ErrorBoundary] Reset Developer')}>
                <DeveloperPage />
              </ErrorBoundary>
            );
          default:
            return (
              <ErrorBoundary fallbackTitle="Error en Dashboard Administrativo" onReset={() => console.log('[ErrorBoundary] Reset Default')}>
                <DashboardPage />
              </ErrorBoundary>
            );
        }
      })()}
    </Suspense>
  );
};
