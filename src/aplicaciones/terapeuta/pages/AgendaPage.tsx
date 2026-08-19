import React from 'react';
import { useTerapeuta } from '../hooks/useTerapeuta';
import { TherapistApp } from '../../../components/TherapistApp';

export const AgendaPage: React.FC = () => {
  const { 
    therapist, 
    bookings, 
    handleUpdateBookingState,
    handleAcceptBooking,
    handleRejectBooking 
  } = useTerapeuta();

  return (
    <TherapistApp
      therapist={therapist}
      bookings={bookings}
      onUpdateBookingState={handleUpdateBookingState}
      onAcceptBooking={handleAcceptBooking}
      onRejectBooking={handleRejectBooking}
    />
  );
};
