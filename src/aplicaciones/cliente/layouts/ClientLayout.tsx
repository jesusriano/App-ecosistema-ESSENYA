import React, { useState } from 'react';
import { ClientHeader } from '../components/ClientHeader';
import { ClientNavigation, ClientRoutePath } from '../components/ClientNavigation';
import { ClientUser } from '../../../shared/types/index';
import { PanicModal } from '../../../shared/components/PanicModal';

interface ClientLayoutProps {
  children: React.ReactNode;
  client: ClientUser;
  currentRoute: ClientRoutePath;
  onNavigate: (route: ClientRoutePath) => void;
  hasActiveBooking?: boolean;
}

export const ClientLayout: React.FC<ClientLayoutProps> = ({
  children,
  client,
  currentRoute,
  onNavigate,
  hasActiveBooking = false,
}) => {
  const [showPanicModal, setShowPanicModal] = useState<boolean>(false);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#FAF8F5] dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white flex flex-col font-sans transition-colors duration-300">
      {/* Header específico de la aplicación Cliente */}
      <ClientHeader 
        client={client} 
        onOpenPanicModal={() => setShowPanicModal(true)} 
        onNavigate={onNavigate}
      />

      {/* Navegación y Rutas independientes de Cliente */}
      <ClientNavigation 
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        activeBookingBadge={hasActiveBooking}
      />

      {/* Contenido dinámico de las páginas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 min-w-0">
        {children}
      </main>

      {/* Botón de Pánico / SOS Modal */}
      <PanicModal 
        isOpen={showPanicModal}
        onClose={() => setShowPanicModal(false)}
        userType="cliente"
        userId={client?.userId || client?.id}
        userName={client?.name || 'Cliente VIP'}
        userLocation={client?.address || 'Polanco VIP, Ciudad de México'}
      />
    </div>
  );
};
