import React, { useState } from 'react';
import { PortalType } from './types';
import { Header } from './components/Header';
import { CorporateWebsite } from './components/CorporateWebsite';
import { InvoiceModal } from './components/InvoiceModal';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { EcosystemProvider, useEcosystem } from './shared/context/EcosystemContext';
import { AuthProvider } from './shared/context/AuthContext';
import { TherapistProvider } from './shared/context/TherapistContext';

// Lazy loading the three independent application modules
const ClientApp = React.lazy(() => import('./apps/client/ClientApp'));
const TherapistApp = React.lazy(() => import('./apps/therapist/TherapistApp'));
const AdminApp = React.lazy(() => import('./apps/admin/AdminApp'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh] p-8">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-12 h-12 rounded-full border-2 border-[#C9A55B] border-t-transparent animate-spin" />
      <span className="text-xs uppercase font-semibold tracking-widest text-[#806020] dark:text-[#C9A55B]">
        Cargando Módulo ESSENYA...
      </span>
    </div>
  </div>
);

function MainAppContent() {
  const [currentPortal, setCurrentPortal] = useState<PortalType>('website');
  const {
    services,
    bookings,
    activeInvoice,
    setActiveInvoice,
  } = useEcosystem();

  const activeBookingCount = bookings.filter(b => b.state !== 'servicio_finalizado' && b.state !== 'cancelado').length;

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white flex flex-col font-sans transition-colors duration-300 selection:bg-[#C9A55B] selection:text-black">
      {/* Header & Portal Switcher */}
      <Header 
        currentPortal={currentPortal} 
        onSelectPortal={setCurrentPortal}
        activeBookingCount={activeBookingCount}
      />

      {/* Main Portal View with Lazy Loading */}
      <div className="flex-1">
        <React.Suspense fallback={<LoadingFallback />}>
          {currentPortal === 'website' && (
            <CorporateWebsite 
              services={services}
              onStartBooking={() => setCurrentPortal('client')}
              onSelectPortal={setCurrentPortal}
            />
          )}

          {currentPortal === 'client' && <ClientApp />}

          {currentPortal === 'therapist' && <TherapistApp />}

          {currentPortal === 'admin' && <AdminApp />}
        </React.Suspense>
      </div>

      {/* Invoice Viewer Modal */}
      <InvoiceModal 
        invoice={activeInvoice}
        onClose={() => setActiveInvoice(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <TherapistProvider>
            <EcosystemProvider>
              <MainAppContent />
            </EcosystemProvider>
          </TherapistProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
