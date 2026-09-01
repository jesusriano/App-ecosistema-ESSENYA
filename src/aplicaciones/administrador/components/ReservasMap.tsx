import React, { useEffect, useState, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Navigation, MapPin, ShieldCheck, Car, Clock, Lock } from 'lucide-react';

interface ReservasMapProps {
  clientAddress: string;
  cityZone: string;
  therapistName?: string;
  therapistPhoto?: string;
  bookingState: string;
}

const getEffectiveApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('essenya_gmaps_key');
    if (localKey && localKey.trim().length > 10) {
      return localKey.trim();
    }

    // Use environment variable if available
    const envKey = (process.env as any).GOOGLE_MAPS_PLATFORM_KEY;
    if (envKey && envKey.trim().length > 10) {
      return envKey.trim();
    }
  }
  return '';
};

// Elegant Dark Gold Theme Map Styles
const darkGoldMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#181818" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#181818" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8c8c8c" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#c9a55b" }]
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6e6e6e" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#282828" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3a311d" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f1722" }]
  }
];

function MapContent({
  clientAddress,
  cityZone,
  therapistName,
  therapistPhoto,
  bookingState,
  onDirectionsError,
}: ReservasMapProps & { onDirectionsError: () => void }) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const geocodingLib = useMapsLibrary('geocoding');

  const [therapistPos, setTherapistPos] = useState({ lat: 19.4326, lng: -99.1900 });
  const [clientPos, setClientPos] = useState({ lat: 19.3620, lng: -99.2650 });

  useEffect(() => {
    if (!geocodingLib || !clientAddress) return;
    const geocoder = new geocodingLib.Geocoder();
    const query = `${clientAddress}, ${cityZone || 'Ciudad de México'}, México`;

    try {
      geocoder.geocode({ address: query }, (results, status) => {
        if (status === 'OK' && results && results[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          const newClientPos = { lat: loc.lat(), lng: loc.lng() };
          setClientPos(newClientPos);

          let offsetLat = 0.012;
          let offsetLng = 0.008;
          if (bookingState === 'llegue' || bookingState === 'servicio_iniciado') {
            offsetLat = 0.0002;
            offsetLng = 0.0002;
          }

          setTherapistPos({
            lat: newClientPos.lat + offsetLat,
            lng: newClientPos.lng + offsetLng
          });
        } else {
          onDirectionsError();
        }
      });
    } catch (err) {
      onDirectionsError();
    }
  }, [geocodingLib, clientAddress, cityZone, bookingState, onDirectionsError]);

  useEffect(() => {
    if (!routesLib || !map || !therapistPos || !clientPos) return;

    try {
      const directionsService = new routesLib.DirectionsService();
      const directionsRenderer = new routesLib.DirectionsRenderer({
        map,
        suppressMarkers: true,
        preserveViewport: false,
        polylineOptions: {
          strokeColor: '#C9A55B',
          strokeOpacity: 0.85,
          strokeWeight: 4,
        }
      });

      directionsService.route(
        {
          origin: therapistPos,
          destination: clientPos,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK' && result) {
            directionsRenderer.setDirections(result);
          } else {
            onDirectionsError();
          }
        }
      );
    } catch (err) {
      onDirectionsError();
    }
  }, [routesLib, map, therapistPos, clientPos, onDirectionsError]);

  return (
    <>
      <AdvancedMarker position={clientPos}>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-xs shadow-lg">
            🏡
          </div>
          <span className="text-[10px] font-bold text-white bg-black/90 px-2 py-0.5 rounded border border-[#333333] mt-0.5">
            Cliente ({cityZone})
          </span>
        </div>
      </AdvancedMarker>

      {(bookingState === 'en_camino' || bookingState === 'llegue' || bookingState === 'servicio_iniciado') && (
        <AdvancedMarker position={therapistPos}>
          <div className="flex flex-col items-center animate-bounce">
            <img
              src={therapistPhoto || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'}
              alt={therapistName || 'Terapeuta'}
              className="w-9 h-9 rounded-full border-2 border-[#C9A55B] object-cover shadow-xl"
            />
            <span className="text-[10px] font-bold text-[#C9A55B] bg-black/90 px-2 py-0.5 rounded border border-[#C9A55B]/40 mt-0.5 whitespace-nowrap">
              🚗 {therapistName || 'Terapeuta'} ({bookingState === 'llegue' ? 'Llegó' : 'En Camino'})
            </span>
          </div>
        </AdvancedMarker>
      )}
    </>
  );
}

export const ReservasMap: React.FC<ReservasMapProps> = ({
  clientAddress,
  cityZone,
  therapistName,
  therapistPhoto,
  bookingState,
}) => {
  const [apiKey] = useState<string>(() => getEffectiveApiKey());
  const [mapError, setMapError] = useState<boolean>(false);

  useEffect(() => {
    const prevAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      setMapError(true);
      if (typeof prevAuthFailure === 'function') prevAuthFailure();
    };

    const handleRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason ? String(e.reason) : '';
      if (reason.includes('Google Maps') || reason.includes('Billing') || reason.includes('DIRECTIONS') || reason.includes('LegacyApi') || reason.includes('REQUEST_DENIED')) {
        setMapError(true);
        e.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      (window as any).gm_authFailure = prevAuthFailure;
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const isActiveTracking = bookingState === 'en_camino' || bookingState === 'llegue' || bookingState === 'servicio_iniciado';

  return (
    <div 
      id="admin-reservas-map-container"
      className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-[#262626] bg-[#141414]"
    >
      {!isActiveTracking ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0D0D0D] text-[#888888] space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] border border-[#333333] flex items-center justify-center text-[#C9A55B]">
            <Lock className="w-6 h-6" />
          </div>
          <h4 className="font-serif font-bold text-sm text-white">
            Monitoreo GPS en Modo Vista (Solo Lectura)
          </h4>
          <p className="text-xs max-w-sm">
            El mapa de ubicación de la terapeuta hacia el domicilio del cliente se activa automáticamente cuando el servicio pasa a estado <strong className="text-[#C9A55B]">"En Camino"</strong> o <strong className="text-[#C9A55B]">"Llegó"</strong>.
          </p>
        </div>
      ) : apiKey && !mapError ? (
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={{ lat: 19.4326, lng: -99.1900 }}
            defaultZoom={13}
            gestureHandling="none"
            disableDefaultUI={true}
            zoomControl={false}
            styles={darkGoldMapStyle}
            mapId="essenya_admin_reservas_map"
            className="w-full h-full"
          >
            <MapContent
              clientAddress={clientAddress}
              cityZone={cityZone}
              therapistName={therapistName}
              therapistPhoto={therapistPhoto}
              bookingState={bookingState}
              onDirectionsError={() => setMapError(true)}
            />
          </Map>
        </APIProvider>
      ) : (
        /* Vector fallback telemetry map */
        <div className="relative w-full h-full bg-[#0B0B0B] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
          
          <div className="absolute top-4 left-4 bg-black/80 border border-[#333333] px-3 py-1 rounded-xl text-[10px] text-[#C9A55B] font-mono flex items-center gap-1.5 z-10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>TELEMETRÍA GPS ACTIVA (VISTA ADMINISTRADOR)</span>
          </div>

          <div className="space-y-4 text-center z-10 max-w-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#1A1A1A] border border-[#C9A55B]/40 flex items-center justify-center text-[#C9A55B] shadow-lg">
              <Car className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-white text-base">
                {therapistName || 'Terapeuta'} ({bookingState === 'llegue' ? 'En Domicilio' : 'En Camino'})
              </h4>
              <p className="text-xs text-[#AAAAAA] mt-1">
                Destino: {clientAddress} ({cityZone})
              </p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#262626] p-3 rounded-xl text-xs text-[#888888]">
              🔒 Vista protegida y bloqueada para modificaciones (Solo lectura administrativa).
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
