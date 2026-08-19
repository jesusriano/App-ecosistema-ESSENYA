import { useEcosystem } from '../../../shared/context/EcosystemContext';

export const useCliente = () => {
  const ecosystem = useEcosystem();

  return {
    client: ecosystem.client,
    services: ecosystem.services,
    therapists: ecosystem.therapists,
    bookings: ecosystem.bookings,
    invoices: ecosystem.invoices,
    activeBooking: ecosystem.bookings.find(b => b.state !== 'servicio_finalizado' && b.state !== 'cancelado') || ecosystem.bookings[0],
    handleNewBooking: ecosystem.handleNewBooking,
    handleUpdateBookingState: ecosystem.handleUpdateBookingState,
    handleViewInvoice: ecosystem.handleViewInvoice,
    handleSendMessage: ecosystem.handleSendMessage,
    handleRateBooking: ecosystem.handleRateBooking,
  };
};
