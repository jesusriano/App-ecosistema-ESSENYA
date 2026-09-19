import React from 'react';
import { useTerapeuta } from '../hooks/useTerapeuta';
import { TherapistApp } from '../../../components/TherapistApp';

export const AgendaPage: React.FC = () => {
  const { 
    isLoading,
    therapist, 
    bookings, 
    handleUpdateBookingState,
    handleAcceptBooking,
    handleRejectBooking,
    handleUpdateLiveLocation
  } = useTerapeuta();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#FAF8F5] dark:bg-[#0D0D0D]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#C9A55B] border-t-transparent animate-spin" />
          <span className="text-xs uppercase font-semibold tracking-widest text-[#806020] dark:text-[#C9A55B]">
            Cargando Panel de Terapeuta...
          </span>
        </div>
      </div>
    );
  }

  return (
    <TherapistApp
      therapist={therapist}
      bookings={bookings}
      onUpdateBookingState={handleUpdateBookingState}
      onAcceptBooking={handleAcceptBooking}
      onRejectBooking={handleRejectBooking}
      onUpdateLiveLocation={handleUpdateLiveLocation}
    />
  );
};
