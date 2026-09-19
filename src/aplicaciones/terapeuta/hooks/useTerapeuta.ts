import { useState, useEffect } from 'react';
import { useEcosystem } from '../../../shared/context/EcosystemContext';
import { Therapist, Booking } from '../../../shared/types';

const DEFAULT_THERAPIST: Therapist = {
  id: 'ther-default',
  name: 'Terapeuta ESSENYA',
  email: 'terapeuta@essenya.mx',
  phone: '+52 55 0000 0000',
  photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
  specialties: ['Masaje Holístico', 'Relajante', 'Tejido Profundo'],
  rating: 5.0,
  reviewCount: 0,
  totalServices: 10,
  gender: 'femenino',
  bio: 'Terapeuta profesional certificada ESSENYA.',
  certifications: ['Certificación Profesional ESSENYA'],
  status: 'disponible',
  currentZone: 'Ciudad de México',
  coverageZones: ['Ciudad de México'],
  vehicleType: 'Auto Ejecutivo',
  lat: 19.4326,
  lng: -99.1332
};

export const useTerapeuta = () => {
  const ecosystem = useEcosystem();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const therapist = ecosystem.activeTherapist || DEFAULT_THERAPIST;

  const sanitizedBookings: Booking[] = (ecosystem.bookings || []).map(b => ({
    ...b,
    preferences: {
      genderPreference: b.preferences?.genderPreference || 'sin_preferencia',
      pressureLevel: b.preferences?.pressureLevel || 'Media',
      essentialOil: b.preferences?.essentialOil || 'Lavanda Francesa',
      musicStyle: b.preferences?.musicStyle || 'Acoustic Zen',
      painPoints: b.preferences?.painPoints || b.painPoints || '',
      specialInstructions: b.preferences?.specialInstructions || ''
    }
  }));

  return {
    isLoading: isLoading || (ecosystem as any).isInitializing,
    therapist,
    bookings: sanitizedBookings,
    services: ecosystem.services,
    handleUpdateBookingState: ecosystem.handleUpdateBookingState,
    handleAcceptBooking: ecosystem.handleAcceptBooking,
    handleRejectBooking: ecosystem.handleRejectBooking,
    handleUpdateLiveLocation: ecosystem.handleUpdateLiveLocation,
  };
};
