import React, { useState } from 'react';
import { TherapistHeader } from './TherapistHeader';
import { TherapistNavigation, TherapistRoutePath } from './TherapistNavigation';
import { Therapist } from '../../../shared/types/index';
import { PanicModal } from '../../../shared/components/PanicModal';
import { TechSupportWhatsAppButton } from '../../../shared/components/TechSupportWhatsAppButton';

interface TherapistLayoutProps {
  children: React.ReactNode;
  therapist: Therapist;
  currentRoute: TherapistRoutePath;
  onNavigate: (route: TherapistRoutePath) => void;
}

export const TherapistLayout: React.FC<TherapistLayoutProps> = ({
  children,
  therapist,
  currentRoute,
  onNavigate,
}) => {
  const [showPanicModal, setShowPanicModal] = useState<boolean>(false);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#FAF8F5] dark:bg-[#0D0D0D] text-[#1C1917] dark:text-white flex flex-col font-sans transition-colors duration-300">
      {/* Header exclusivo de Terapeuta */}
      <TherapistHeader 
        therapist={therapist} 
        onOpenPanicModal={() => setShowPanicModal(true)} 
      />

      {/* Navegación independiente de Terapeuta */}
      <TherapistNavigation 
        currentRoute={currentRoute}
        onNavigate={onNavigate}
      />

      {/* Vista principal de Terapeuta */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 min-w-0">
        {children}
      </main>

      {/* Panic Modal exclusivo de Terapeuta */}
      <PanicModal 
        isOpen={showPanicModal}
        onClose={() => setShowPanicModal(false)}
        userType="terapeuta"
        userId={therapist?.userId || therapist?.id}
        userName={therapist?.name || 'Elena Rostova'}
        userLocation={therapist?.coverageZones?.[0] || 'Polanco / Lomas CDMX'}
      />

      {/* Botón Flotante de Soporte Técnico Exclusivo vía WhatsApp */}
      <TechSupportWhatsAppButton 
        role="terapeuta" 
        variant="floating" 
        className="bottom-20 right-4 sm:bottom-6 sm:right-6"
      />
    </div>
  );
};
