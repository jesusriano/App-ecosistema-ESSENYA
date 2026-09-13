import { useEcosystem } from '../../../shared/context/EcosystemContext';

export const useTerapeuta = () => {
  const ecosystem = useEcosystem();

  return {
    therapist: ecosystem.activeTherapist,
    bookings: ecosystem.bookings,
    services: ecosystem.services,
    handleUpdateBookingState: ecosystem.handleUpdateBookingState,
    handleAcceptBooking: ecosystem.handleAcceptBooking,
    handleRejectBooking: ecosystem.handleRejectBooking,
  };
};
