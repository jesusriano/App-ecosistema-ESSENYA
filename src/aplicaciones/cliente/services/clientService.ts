import { Booking, MassageService } from '../types';

/**
 * Servicio de Cliente para abstraer la interacción con datos y lógica del cliente
 */
export const clientService = {
  calculateBookingTotal: (service: MassageService, duration: number, extrasTotal: number = 0, tip: number = 0): number => {
    let basePrice = service.basePrice || 1850;
    if (duration === 90) basePrice = service.price90 || 2450;
    if (duration === 120) basePrice = service.price120 || 3150;
    return basePrice + extrasTotal + tip;
  },

  filterActiveBookings: (bookings: Booking[]): Booking[] => {
    return bookings.filter(b => b.state !== 'servicio_finalizado' && b.state !== 'cancelado');
  },

  filterCompletedBookings: (bookings: Booking[]): Booking[] => {
    return bookings.filter(b => b.state === 'servicio_finalizado');
  }
};
