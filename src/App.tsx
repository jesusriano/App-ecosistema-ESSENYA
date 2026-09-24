import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { InvoiceModal } from './shared/components/InvoiceModal';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { EcosystemProvider, useEcosystem } from './shared/context/EcosystemContext';
import { AuthProvider, useAuth } from './shared/context/AuthContext';
import { TherapistProvider } from './shared/context/TherapistContext';
import { PushProvider, usePush } from './shared/context/PushContext';
import { NotificationCenterModal } from './shared/components/NotificationCenterModal';
import { PortalAuthGuard } from './shared/components/auth/PortalAuthGuard';
import { ThemeToggle } from './shared/components/ThemeToggle';
import { Header } from './shared/components/Header';
import { PortalType } from './shared/types';
import { PushNotifications } from '@capacitor/push-notifications';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

import { ConfigValidator } from './shared/components/ConfigValidator';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { OfflineNotice } from './shared/components/OfflineNotice';
import { initGA, trackPageView } from './shared/utils/analytics';

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

  const { firebaseUser } = useAuth();
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

  // Initialize Capacitor Push Notifications and save device push token to Firestore
  React.useEffect(() => {
    const initPushNotifications = async () => {
      try {
        const permStatus = await PushNotifications.requestPermissions();
        if (permStatus.receive === 'granted') {
          await PushNotifications.register();
        }

        PushNotifications.addListener('registration', async (token) => {
          console.log('[PushNotifications] Registration success, device token:', token.value);
          if (firebaseUser?.uid) {
            try {
              // Save push token in terapeutas collection and users collection for personalized service request notifications
              const therapistRef = doc(db, 'terapeutas', firebaseUser.uid);
              await setDoc(therapistRef, {
                pushToken: token.value,
                fcmToken: token.value,
                fechaActualizacion: new Date().toISOString()
              }, { merge: true });

              const userRef = doc(db, 'users', firebaseUser.uid);
              await setDoc(userRef, {
                pushToken: token.value,
                fcmToken: token.value,
                fechaActualizacion: new Date().toISOString()
              }, { merge: true });

              console.log('[PushNotifications] Push token successfully saved to Firestore for user/therapist:', firebaseUser.uid);
            } catch (firestoreErr) {
              console.error('[PushNotifications] Error saving push token to Firestore:', firestoreErr);
            }
          }
        });

        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('[PushNotifications] Error on registration: ', error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('[PushNotifications] Push notification received (incoming service request): ', notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('[PushNotifications] Push action performed: ', notification);
        });
      } catch (e) {
        console.warn('[PushNotifications] Push notifications not supported in current browser environment:', e);
      }
    };

    initPushNotifications();
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
  const { unreadCount } = usePush();
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = React.useState(false);

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
