import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { InvoiceModal } from './shared/components/InvoiceModal';
import { ThemeProvider } from './shared/context/ThemeContext';
import { ToastProvider } from './shared/context/ToastContext';
import { EcosystemProvider, useEcosystem } from './shared/context/EcosystemContext';
import { AuthProvider, useAuth } from './shared/context/AuthContext';
import { TherapistProvider } from './shared/context/TherapistContext';
import { PushProvider, usePush } from './shared/context/PushContext';
import { NotificationCenterModal } from './shared/components/NotificationCenterModal';
import { PortalAuthGuard } from './shared/components/auth/PortalAuthGuard';
import { ThemeToggle } from './shared/components/ThemeToggle';
import { Header } from './shared/components/Header';
import { PortalType } from './shared/types';
import { Capacitor } from '@capacitor/core';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { subscribeToPushNotifications, isPushSupported } from './shared/services/pushService';

import { ConfigValidator } from './shared/components/ConfigValidator';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { OfflineNotice } from './shared/components/OfflineNotice';
import { InstallPrompt } from './components/InstallPrompt';
import { initGA, trackPageView } from './shared/utils/analytics';
import { StripeProductCheckout } from './shared/components/StripeProductCheckout';
import { PaymentSuccessOrder } from './shared/components/PaymentSuccessOrder';

// Code-splitting via React.lazy for instant portal load performance
const ClienteAppModule = React.lazy(() => import('./aplicaciones/cliente/App'));
const TerapeutaAppModule = React.lazy(() => import('./aplicaciones/terapeuta/App'));
const AdminAppModule = React.lazy(() => import('./aplicaciones/administrador/App'));

const LoadingFallback: React.FC<{ moduleName: string }> = ({ moduleName }) => (
  <div className="flex items-center justify-center min-h-screen bg-[#FAF8F5] dark:bg-[#0D0D0D] p-8">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-12 h-12 rounded-full border-2 border-[#C9A55B] border-t-transparent animate-spin" />
      <span className="text-xs uppercase font-semibold tracking-widest text-[#806020] dark:text-[#C9A55B]">
        Cargando {moduleName}...
      </span>
    </div>
  </div>
);

function MainAppContent() {
  const {
    activeInvoice,
    setActiveInvoice,
    bookings,
    currentPortal: ecosystemPortal,
    setCurrentPortal,
  } = useEcosystem();

  const { firebaseUser, getUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize Google Analytics 4
  React.useEffect(() => {
    initGA();
  }, []);

  // Track SPA page views on route changes
  React.useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  const { unreadCount, handleIncomingPush } = usePush();
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = React.useState(false);

  const activeProfile = getUser('cliente') || getUser('terapeuta') || getUser('administrador');

  // Initialize Capacitor Native Push Notifications via nativePushService
  React.useEffect(() => {
    if (!Capacitor.isNativePlatform() || !firebaseUser?.uid) return;

    import('./shared/services/nativePushService').then(({ registerNativePushToken }) => {
      registerNativePushToken(firebaseUser.uid, activeProfile?.rol || 'cliente', {
        onNotificationReceived: (notification) => {
          console.log('[App] Push nativo recibido:', notification);
          handleIncomingPush(notification);
        },
        onActionPerformed: (action) => {
          console.log('[App] Acción de push realizada:', action);
          const bookingId = action.notification?.data?.bookingId;
          if (bookingId) {
            navigate(`/terapeuta/servicios?bookingId=${bookingId}`);
          }
        }
      });
    });

    return () => {
      import('./shared/services/nativePushService').then(({ removeNativePushListeners }) => {
        removeNativePushListeners().catch(() => {});
      });
    };
  }, [firebaseUser?.uid, activeProfile?.rol, handleIncomingPush, navigate]);

  // Web Push Notifications: Inicialización automática de Service Worker, permiso y suscripción con clave VAPID
  React.useEffect(() => {
    const initWebPush = async () => {
      if (typeof window === 'undefined' || !isPushSupported()) return;

      try {
        const isIframe = window.self !== window.top;
        const uid = firebaseUser?.uid || 'anonymous';

        // Si el permiso ya está concedido, asegurar Service Worker y suscripción VAPID activa
        if (Notification.permission === 'granted') {
          await subscribeToPushNotifications(uid);
          console.log('[WebPush] Notificaciones push activas y vinculadas para:', uid);
        } else if (Notification.permission === 'default' && !isIframe) {
          // Solicitar permiso en la carga inicial cuando se ejecute en pestaña directa
          try {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
              await subscribeToPushNotifications(uid);
              console.log('[WebPush] Permiso concedido y suscripción push completada para:', uid);
            }
          } catch (permErr) {
            console.info('[WebPush] Solicitud de permiso diferida:', permErr);
          }
        }
      } catch (err) {
        console.info('[WebPush] Inicialización push diferida:', err);
      }
    };

    initWebPush();
  }, [firebaseUser?.uid]);

  const currentPortal: PortalType = location.pathname.startsWith('/admin')
    ? 'admin'
    : location.pathname.startsWith('/terapeuta')
    ? 'therapist'
    : 'client';

  React.useEffect(() => {
    if (ecosystemPortal !== currentPortal) {
      setCurrentPortal(currentPortal);
    }
  }, [currentPortal, ecosystemPortal, setCurrentPortal]);

  const handleSelectPortal = (portal: PortalType) => {
    if (portal === 'admin') navigate('/admin');
    else if (portal === 'therapist') navigate('/terapeuta');
    else if (portal === 'client') navigate('/cliente');
  };

  const activeBookingCount = bookings.filter(b => b.state === 'pendiente' || b.state === 'aceptada' || b.state === 'en_camino' || b.state === 'llegue' || b.state === 'servicio_iniciado').length;

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white flex flex-col font-sans transition-colors duration-300 selection:bg-[#C9A55B] selection:text-black">
      {/* Ecosystem Unified Portal Navigation Header */}
      <Header 
        currentPortal={currentPortal}
        onSelectPortal={handleSelectPortal}
        activeBookingCount={activeBookingCount}
        onOpenNotificationCenter={() => setIsNotificationCenterOpen(true)}
        unreadNotificationCount={unreadCount}
      />

      {/* Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />

      {/* Independent Application Modules on dedicated URLs */}
      <div className="flex-1">
        <Routes>
          {/* 1. App de Clientes (URL dedicada: /cliente) */}
          <Route 
            path="/cliente/*" 
            element={
              <React.Suspense fallback={<LoadingFallback moduleName="App Clientes ESSENYA" />}>
                <PortalAuthGuard role="cliente">
                  <ClienteAppModule />
                </PortalAuthGuard>
              </React.Suspense>
            } 
          />
          <Route path="/clientes/*" element={<Navigate to="/cliente" replace />} />
          <Route path="/reservar/*" element={<Navigate to="/cliente" replace />} />
          <Route path="/app-cliente/*" element={<Navigate to="/cliente" replace />} />

          {/* 2. App de Terapeutas (URL dedicada: /terapeuta) */}
          <Route 
            path="/terapeuta/*" 
            element={
              <React.Suspense fallback={<LoadingFallback moduleName="App Terapeutas ESSENYA" />}>
                <PortalAuthGuard role="terapeuta">
                  <TerapeutaAppModule />
                </PortalAuthGuard>
              </React.Suspense>
            } 
          />
          <Route path="/terapeutas/*" element={<Navigate to="/terapeuta" replace />} />
          <Route path="/app-terapeuta/*" element={<Navigate to="/terapeuta" replace />} />

          {/* 3. App de Administración (URL dedicada: /admin) */}
          <Route 
            path="/admin/*" 
            element={
              <React.Suspense fallback={<LoadingFallback moduleName="Panel Administrador ESSENYA" />}>
                <PortalAuthGuard role="administrador">
                  <AdminAppModule />
                </PortalAuthGuard>
              </React.Suspense>
            } 
          />
          <Route path="/administrador/*" element={<Navigate to="/admin" replace />} />
          <Route path="/administracion/*" element={<Navigate to="/admin" replace />} />
          <Route path="/panel-admin/*" element={<Navigate to="/admin" replace />} />

          {/* 4. Demo Stripe Product Checkout (/checkout-demo, /producto) */}
          <Route 
            path="/checkout-demo" 
            element={
              <div className="min-h-[85vh] flex items-center justify-center p-4">
                <StripeProductCheckout />
              </div>
            } 
          />
          <Route 
            path="/producto" 
            element={
              <div className="min-h-[85vh] flex items-center justify-center p-4">
                <StripeProductCheckout />
              </div>
            } 
          />

          {/* 5. Confirmation and Thanks for your order page (/success, /order/success) */}
          <Route path="/success" element={<PaymentSuccessOrder />} />
          <Route path="/order/success" element={<PaymentSuccessOrder />} />
          <Route path="/pago-exitoso" element={<PaymentSuccessOrder />} />

          {/* Entrada principal por defecto -> /cliente */}
          <Route path="/" element={<Navigate to="/cliente" replace />} />
          <Route path="*" element={<Navigate to="/cliente" replace />} />
        </Routes>
      </div>

      {/* Shared Invoice Viewer Modal (triggered when viewing invoices across ecosystems) */}
      <InvoiceModal 
        invoice={activeInvoice}
        onClose={() => setActiveInvoice(null)}
      />

      {/* Global Theme Toggle Button */}
      <ThemeToggle />

      {/* Custom Offline Detection & Notice Modal */}
      <OfflineNotice />

      {/* PWA In-App Install Prompt Banner/Modal */}
      <InstallPrompt />
    </div>
  );
}

function AuthenticatedPushWrapper({ children }: { children: React.ReactNode }) {
  const { firebaseUser } = useAuth() || {};
  return (
    <PushProvider userId={firebaseUser?.uid}>
      {children}
    </PushProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Error al inicializar la plataforma ESSENYA">
      <ConfigValidator>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <TherapistProvider>
                <EcosystemProvider>
                  <AuthenticatedPushWrapper>
                    <BrowserRouter>
                      <MainAppContent />
                    </BrowserRouter>
                  </AuthenticatedPushWrapper>
                </EcosystemProvider>
              </TherapistProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </ConfigValidator>
    </ErrorBoundary>
  );
}
