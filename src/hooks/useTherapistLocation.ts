import { useEffect } from 'react';
import { Booking, BookingState, Therapist } from '../types';

interface UseTherapistLocationOptions {
  activeTherapist: Therapist;
  currentBooking: Booking | null;
  onUpdateLiveLocation?: (bookingId: string, lat: number, lng: number) => Promise<void>;
}

export function useTherapistLocation({
  activeTherapist,
  currentBooking,
  onUpdateLiveLocation
}: UseTherapistLocationOptions) {
  // Periodically report live GPS to server so dispatch engine recognizes location as fresh
  useEffect(() => {
    if (!navigator.geolocation) return;
    const reportLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetch('/api/therapist/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              status: activeTherapist.status || 'disponible'
            })
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    };
    reportLocation();
    const interval = setInterval(reportLocation, 60000);
    return () => clearInterval(interval);
  }, [activeTherapist.id, activeTherapist.status]);

  // Watch position and update Firestore for active bookings
  useEffect(() => {
    if (!currentBooking || !onUpdateLiveLocation) return;
    
    // Only track if moving towards or at client
    const statesToTrack: BookingState[] = ['en_camino', 'llegue', 'servicio_iniciado'];
    if (!statesToTrack.includes(currentBooking.state)) return;

    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onUpdateLiveLocation(currentBooking.id, latitude, longitude);
      },
      (error) => {
        console.warn('Geolocation error in tracking:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [currentBooking?.id, currentBooking?.state, onUpdateLiveLocation]);
}
