import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClientLayout } from '../layouts/ClientLayout';
import { ClientRoutes } from '../routes/index';
import { ClientRoutePath } from '../components/ClientNavigation';
import { useCliente } from '../hooks/useCliente';
import { ImmediateRatingModal } from '../components/ImmediateRatingModal';
import { ClientPoliciesGate } from '../../../shared/components/ClientPoliciesGate';

export const ClienteAppModule: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive current sub-route directly from URL path (e.g. /cliente/reservas -> /reservas)
  const currentRoute: ClientRoutePath = useMemo(() => {
    const path = location.pathname.replace(/^\/cliente/, '') || '/inicio';
    if (path === '/' || path === '') return '/inicio';
    const validRoutes: ClientRoutePath[] = ['/inicio', '/reservas', '/billetera', '/facturas', '/promociones', '/perfil'];
    const matched = validRoutes.find(r => path.startsWith(r));
    return matched || '/inicio';
  }, [location.pathname]);

  const handleNavigate = (route: ClientRoutePath) => {
    navigate(`/cliente${route}`);
  };

  const { client, bookings, activeBooking, handleRateBooking } = useCliente();
  const [dismissedBookingIds, setDismissedBookingIds] = useState<string[]>([]);
  const [activeRateBookingId, setActiveRateBookingId] = useState<string | null>(null);

  // Detect whenever a booking becomes 'servicio_finalizado' and has not been rated yet
  const unratedFinishedBooking = bookings.find(
    b => b.state === 'servicio_finalizado' && !b.rating && !dismissedBookingIds.includes(b.id)
  );

  useEffect(() => {
    if (unratedFinishedBooking) {
      setActiveRateBookingId(unratedFinishedBooking.id);
    }
  }, [unratedFinishedBooking?.id]);

  const targetBookingToRate = bookings.find(b => b.id === activeRateBookingId) || null;

  const handleCloseModal = () => {
    if (activeRateBookingId) {
      setDismissedBookingIds(prev => [...prev, activeRateBookingId]);
    }
    setActiveRateBookingId(null);
  };

  return (
    <ClientPoliciesGate
      clientId={client?.id}
      clientEmail={client?.email}
    >
      <ClientLayout
        client={client}
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        hasActiveBooking={Boolean(activeBooking)}
      >
        <ClientRoutes
          currentRoute={currentRoute}
          onNavigate={handleNavigate}
        />

        {/* Immediate Rating Prompt Modal when masseuse finishes massage */}
        <ImmediateRatingModal
          booking={targetBookingToRate}
          isOpen={Boolean(targetBookingToRate && !targetBookingToRate.rating)}
          onClose={handleCloseModal}
          onRate={(id, rating, comment) => {
            handleRateBooking(id, rating, comment);
          }}
        />
      </ClientLayout>
    </ClientPoliciesGate>
  );
};

export default ClienteAppModule;

