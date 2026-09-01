import { useState, useCallback } from 'react';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: false,
  });

  const getPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'La geolocalización no está soportada por tu navegador.' }));
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        let errorMsg = 'Error al obtener la ubicación.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'El usuario denegó la solicitud de geolocalización.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'La información de ubicación no está disponible.';
            break;
          case error.TIMEOUT:
            errorMsg = 'La solicitud para obtener la ubicación caducó.';
            break;
        }
        setState({
          lat: null,
          lng: null,
          error: errorMsg,
          loading: false,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, []);

  return { ...state, getPosition };
};
