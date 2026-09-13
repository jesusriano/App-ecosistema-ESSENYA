import React from 'react';
import { useCliente } from '../hooks/useCliente';
import ClientApp from '../app/Aplicacion';

export const ReservasPage: React.FC = () => {
  const {
    client,
    services,
    therapists,
    bookings,
    invoices,
    handleNewBooking,
    handleUpdateBookingState,
    handleRescheduleBooking,
    handleCancelBooking,
    handleViewInvoice,
    handleSendMessage,
    handleRateBooking,
  } = useCliente();

  return (
    <ClientApp
      client={client}
      services={services}
      therapists={therapists}
      bookings={bookings}
      invoices={invoices}
      onNewBooking={handleNewBooking}
      onUpdateBookingState={handleUpdateBookingState}
      onRescheduleBooking={handleRescheduleBooking}
      onCancelBooking={handleCancelBooking}
      onViewInvoice={handleViewInvoice}
      onSendMessage={handleSendMessage}
      onRateBooking={handleRateBooking}
    />
  );
};
