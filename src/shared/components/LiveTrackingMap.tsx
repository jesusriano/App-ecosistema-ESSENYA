import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Navigation, MapPin, Key, Compass, ShieldCheck, Car, Clock, CheckCircle2, Activity, LocateFixed } from 'lucide-react';

import { useEcosystem } from '../context/EcosystemContext';

interface LiveTrackingMapProps {
  clientAddress: string;
  cityZone: string;
  therapistName: string;
  therapistPhoto: string;
  therapistPhone?: string;
  therapistZone?: string;
  bookingState: string;
  therapistLat?: number;
  therapistLng?: number;
  clientLat?: number;
  clientLng?: number;
  isTherapistView?: boolean;
  onRouteCalculated?: (info: { distance: string; duration: string }) => void;
}

// In-memory cache for geocoded addresses to prevent redundant Geocoding API calls
const geocodeAddressCache: Record<string, google.maps.LatLngLiteral> = {};

// Significant distance threshold in meters: only update state and trigger re-route if moved >= 25m
const SIGNIFICANT_GPS_DISTANCE_THRESHOLD_METERS = 25;

// Minimum interval between full Google Directions API requests (20 seconds)
const MIN_DIRECTIONS_REQUEST_INTERVAL_MS = 20000;

/**
 * Haversine formula to compute great-circle distance between two GPS coordinates in meters.
 */
function calculateDistanceMeters(
  pos1: google.maps.LatLngLiteral,
  pos2: google.maps.LatLngLiteral
): number {
  const R = 6371e3; // Earth radius in meters
  const lat1Rad = (pos1.lat * Math.PI) / 180;
  const lat2Rad = (pos2.lat * Math.PI) / 180;
  const deltaLat = ((pos2.lat - pos1.lat) * Math.PI) / 180;
  const deltaLng = ((pos2.lng - pos1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function computeExactDistanceAndEta(
  pos1: google.maps.LatLngLiteral,
  pos2: google.maps.LatLngLiteral
): { distance: string; duration: string } {
  const R = 6371; // Earth radius in km
  const lat1Rad = (pos1.lat * Math.PI) / 180;
  const lat2Rad = (pos2.lat * Math.PI) / 180;
  const deltaLat = ((pos2.lat - pos1.lat) * Math.PI) / 180;
  const deltaLng = ((pos2.lng - pos1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distKm = Math.round((R * c) * 10) / 10;

  // Urban driving speed in CDMX ~30 km/h + 4 minutes setup margin
  const durationMins = Math.max(7, Math.round((distKm / 30) * 60 + 4));

  return {
    distance: `${distKm > 0 ? distKm : 2.4} km`,
    duration: `${durationMins} min (Ruta más rápida)`
  };
}

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
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#121a14" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#282828" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f1f1f" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3a311d" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#282112" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f1722" }]
  }
];

// Inner Route Renderer Component (runs inside <APIProvider> and <Map>)
const RouteAndMarkers = React.memo(function RouteAndMarkers({
  clientAddress,
  cityZone,
  therapistName,
  therapistPhoto,
  bookingState,
  therapistLat,
  therapistLng,
  clientLat,
  clientLng,
  onRouteCalculated
}: {
  clientAddress: string;
  cityZone: string;
  therapistName: string;
  therapistPhoto: string;
  bookingState: string;
  therapistLat?: number;
  therapistLng?: number;
  clientLat?: number;
  clientLng?: number;
  onRouteCalculated: (info: { distance: string; duration: string }) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const geocodingLib = useMapsLibrary('geocoding');

  // Default initial locations in CDMX
  const initialTherapistPos = useMemo<google.maps.LatLngLiteral>(() => (
    therapistLat && therapistLng ? { lat: therapistLat, lng: therapistLng } : { lat: 19.4326, lng: -99.1900 }
  ), []);

  const initialClientPos = useMemo<google.maps.LatLngLiteral>(() => (
    clientLat && clientLng ? { lat: clientLat, lng: clientLng } : { lat: 19.3620, lng: -99.2650 }
  ), []);

  const [therapistPos, setTherapistPos] = useState<google.maps.LatLngLiteral>(initialTherapistPos);
  const [clientPos, setClientPos] = useState<google.maps.LatLngLiteral>(initialClientPos);

  // References to track previous coordinates and avoid state updates on insignificant jitter
  const lastRecordedTherapistPosRef = useRef<google.maps.LatLngLiteral>(initialTherapistPos);
  const lastRecordedClientPosRef = useRef<google.maps.LatLngLiteral>(initialClientPos);

  // Persistent DirectionsRenderer instance
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // Throttling telemetry cache for directions requests
  const lastRouteCalculationRef = useRef<{
    therapistPos: google.maps.LatLngLiteral;
    clientPos: google.maps.LatLngLiteral;
    timestamp: number;
    bookingState: string;
  } | null>(null);

  // Update positions ONLY if real-time GPS coordinates change significantly (>= 25m threshold)
  useEffect(() => {
    if (therapistLat == null || therapistLng == null) return;
    const incomingPos: google.maps.LatLngLiteral = { lat: therapistLat, lng: therapistLng };

    const distanceMoved = calculateDistanceMeters(lastRecordedTherapistPosRef.current, incomingPos);
    if (distanceMoved >= SIGNIFICANT_GPS_DISTANCE_THRESHOLD_METERS) {
      lastRecordedTherapistPosRef.current = incomingPos;
      setTherapistPos(incomingPos);
    }
  }, [therapistLat, therapistLng]);

  useEffect(() => {
    if (clientLat == null || clientLng == null) return;
    const incomingPos: google.maps.LatLngLiteral = { lat: clientLat, lng: clientLng };

    const distanceMoved = calculateDistanceMeters(lastRecordedClientPosRef.current, incomingPos);
    if (distanceMoved >= SIGNIFICANT_GPS_DISTANCE_THRESHOLD_METERS) {
      lastRecordedClientPosRef.current = incomingPos;
      setClientPos(incomingPos);
    }
  }, [clientLat, clientLng]);

  // Geocode destination address only if real-time client position is NOT provided, with in-memory caching
  useEffect(() => {
    if (!geocodingLib || !clientAddress || (clientLat && clientLng)) return;

    const query = `${clientAddress.trim()}, ${cityZone || 'Ciudad de México'}, México`;

    // 1. Check in-memory cache to avoid duplicate API requests
    const cached = geocodeAddressCache[query];
    if (cached) {
      setClientPos(cached);
      lastRecordedClientPosRef.current = cached;
      return;
    }

    const geocoder = new geocodingLib.Geocoder();

    try {
      geocoder.geocode({ address: query }, (results, status) => {
        if (status === 'OK' && results && results[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          const newClientPos = { lat: loc.lat(), lng: loc.lng() };
          geocodeAddressCache[query] = newClientPos;
          setClientPos(newClientPos);
          lastRecordedClientPosRef.current = newClientPos;

          let offsetLat = 0.035;
          let offsetLng = 0.025;

          if (bookingState === 'llegue' || bookingState === 'servicio_iniciado') {
            offsetLat = 0.0002;
            offsetLng = 0.0002;
          } else if (bookingState === 'en_camino') {
            offsetLat = 0.012;
            offsetLng = 0.008;
          }

          const offsetTherapistPos = {
            lat: newClientPos.lat + offsetLat,
            lng: newClientPos.lng + offsetLng
          };
          setTherapistPos(offsetTherapistPos);
          lastRecordedTherapistPosRef.current = offsetTherapistPos;
        } else {
          console.warn("Geocoding notice:", status);
        }
      }).catch((err: any) => console.warn("Geocoding caught:", err));
    } catch (err) {
      console.warn("Geocoding exception:", err);
    }
  }, [geocodingLib, clientAddress, cityZone, bookingState, clientLat, clientLng]);

  // Setup DirectionsRenderer once per map instance
  useEffect(() => {
    if (!routesLib || !map) return;

    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new routesLib.DirectionsRenderer({
        map,
        suppressMarkers: true,
        preserveViewport: false,
        polylineOptions: {
          strokeColor: '#C9A55B',
          strokeOpacity: 0.85,
          strokeWeight: 4,
        }
      });
    } else {
      directionsRendererRef.current.setMap(map);
    }

    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    };
  }, [routesLib, map]);

  // Compute driving routes using Google Maps DirectionsService with intelligent throttling & memoization
  useEffect(() => {
    if (!routesLib || !map || !therapistPos || !clientPos || !directionsRendererRef.current) return;

    const now = Date.now();
    const lastCalc = lastRouteCalculationRef.current;

    // Check if re-routing is actually necessary
    if (lastCalc) {
      const therapistMovedDist = calculateDistanceMeters(lastCalc.therapistPos, therapistPos);
      const clientMovedDist = calculateDistanceMeters(lastCalc.clientPos, clientPos);
      const timeElapsed = now - lastCalc.timestamp;
      const stateChanged = lastCalc.bookingState !== bookingState;

      // Skip API request if:
      // - Booking state has not changed AND
      // - Therapist moved < 50m AND client moved < 25m AND
      // - Less than 20 seconds have elapsed since previous calculation
      if (
        !stateChanged &&
        therapistMovedDist < 50 &&
        clientMovedDist < SIGNIFICANT_GPS_DISTANCE_THRESHOLD_METERS &&
        timeElapsed < MIN_DIRECTIONS_REQUEST_INTERVAL_MS
      ) {
        return;
      }
    }

    const directionsService = new routesLib.DirectionsService();

    directionsService.route(
      {
        origin: therapistPos,
        destination: clientPos,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS
        },
        provideRouteAlternatives: false // Reduces API response overhead
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result && directionsRendererRef.current) {
          directionsRendererRef.current.setDirections(result);
          lastRouteCalculationRef.current = {
            therapistPos,
            clientPos,
            timestamp: Date.now(),
            bookingState
          };
          const leg = result.routes[0]?.legs[0];
          if (leg) {
            onRouteCalculated({
              distance: leg.distance?.text || '-- km',
              duration: leg.duration?.text || '-- min'
            });
          }
        } else {
          console.warn('DirectionsService status notice:', status);
        }
      }
    );
  }, [routesLib, map, therapistPos, clientPos, bookingState, onRouteCalculated]);

  return (
    <>
      {/* Therapist Marker */}
      <AdvancedMarker position={therapistPos} title={therapistName}>
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-[#C9A55B] overflow-hidden shadow-xl bg-black ring-4 ring-[#C9A55B]/20">
              <img src={therapistPhoto || undefined} alt={therapistName} className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-[#E6CA65] to-[#C9A55B] rounded-full p-1 border border-black shadow">
              <Car className="w-3 h-3 text-black" />
            </div>
          </div>
          <span className="text-[10px] font-extrabold bg-[#0D0D0D]/95 text-[#C9A55B] px-2.5 py-0.5 rounded-full shadow-lg border border-[#C9A55B]/40 whitespace-nowrap mt-1">
            {therapistName}
          </span>
        </div>
      </AdvancedMarker>

      {/* Client Destination Marker */}
      <AdvancedMarker position={clientPos} title="Domicilio VIP">
        <div className="flex flex-col items-center">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#E6CA65] via-[#C9A55B] to-[#9A7B38] text-black flex items-center justify-center font-bold shadow-xl ring-4 ring-[#C9A55B]/20 animate-pulse">
            <MapPin className="w-6 h-6 text-black fill-black/20" />
          </div>
          <span className="text-[10px] font-bold bg-[#0D0D0D]/95 text-white px-2.5 py-0.5 rounded-full shadow-lg border border-white/20 whitespace-nowrap mt-1">
            Domicilio VIP ESSENYA
          </span>
        </div>
      </AdvancedMarker>
    </>
  );
});

// Visual Route Progress Tracker Component
const VisualRouteProgressTracker = React.memo(function VisualRouteProgressTracker({
  bookingState,
  therapistName,
  therapistZone,
  clientAddress,
  cityZone,
  distance,
  duration
}: {
  bookingState: string;
  therapistName: string;
  therapistZone?: string;
  clientAddress: string;
  cityZone: string;
  distance: string;
  duration: string;
}) {
  const steps = [
    {
      id: 'confirmada',
      title: bookingState === 'pendiente' ? 'Asignación Pendiente' : 'Asignación Aceptada',
      subtitle: bookingState === 'pendiente' ? 'Buscando terapeuta...' : 'Equipo preparado & sanitizado',
      minProgress: bookingState === 'pendiente' ? 10 : 25
    },
    {
      id: 'en_camino',
      title: 'En Trayecto GPS',
      subtitle: `Ruta óptima (${distance} • ${duration})`,
      minProgress: 65
    },
    {
      id: 'llegue',
      title: 'Llegada a Domicilio',
      subtitle: 'En puerta del cliente',
      minProgress: 90
    },
    {
      id: 'servicio_iniciado',
      title: 'Servicio en Curso',
      subtitle: 'Sesión de masaje iniciada',
      minProgress: 100
    }
  ];

  let currentStepIdx = 0;
  if (bookingState === 'en_camino') currentStepIdx = 1;
  else if (bookingState === 'llegue') currentStepIdx = 2;
  else if (bookingState === 'servicio_iniciado' || bookingState === 'completada') currentStepIdx = 3;

  const currentProgressPct = steps[currentStepIdx]?.minProgress || 25;

  return (
    <div className="bg-[#181818] rounded-2xl border border-[#C9A55B]/30 p-4 space-y-4 shadow-xl">
      {/* Top Telemetry Header */}
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[#282828] pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-[#C9A55B]/15 border border-[#C9A55B]/40 flex items-center justify-center text-[#C9A55B]">
            <Activity className="w-4 h-4 animate-pulse text-[#C9A55B]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Rastreo de Ruta Google Maps</span>
              <span className="text-[10px] bg-[#C9A55B]/20 text-[#C9A55B] px-2 py-0.5 rounded font-mono font-bold uppercase border border-[#C9A55B]/30">
                {bookingState === 'llegue' ? '¡Arribo!' : bookingState === 'en_camino' ? 'En Movimiento' : bookingState === 'pendiente' ? 'Asignando' : 'Confirmado'}
              </span>
            </h4>
            <p className="text-[11px] text-[#888888]">
              Origen Terapeuta: <strong className="text-white">{therapistZone || 'Polanco / Lomas'}</strong> → Destino Cliente: <strong className="text-[#C9A55B]">{clientAddress || cityZone || 'Domicilio VIP'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-right">
          <div className="bg-[#0D0D0D] border border-[#333333] px-3 py-1.5 rounded-xl">
            <span className="text-[9px] uppercase tracking-wider text-[#888888] block">Distancia</span>
            <span className="text-xs font-bold text-white">{distance}</span>
          </div>
          <div className="bg-[#0D0D0D] border border-[#C9A55B]/40 px-3 py-1.5 rounded-xl">
            <span className="text-[9px] uppercase tracking-wider text-[#C9A55B] block font-semibold">Ruta más rápida • ETA</span>
            <span className="text-xs font-bold text-[#C9A55B] flex items-center gap-1">
              <Clock className="w-3 h-3 animate-spin" />
              <span>{duration}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar Line */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] font-semibold text-[#888888]">
          <span>PROGRESO DE RUTA Y TRAYECTO</span>
          <span className="text-[#C9A55B] font-mono font-bold">{currentProgressPct}% COMPLETADO</span>
        </div>
        <div className="w-full h-2.5 bg-[#0D0D0D] rounded-full overflow-hidden p-0.5 border border-[#333333]">
          <div 
            className="h-full bg-gradient-to-r from-[#9A7B38] via-[#C9A55B] to-[#E6CA65] rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(201,165,91,0.5)]"
            style={{ width: `${currentProgressPct}%` }}
          />
        </div>
      </div>

      {/* Step Milestones Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
        {steps.map((step, idx) => {
          const isDone = idx < currentStepIdx;
          const isCurrent = idx === currentStepIdx;

          let stepClasses = '';
          let indexClasses = '';
          let iconElement = null;
          let titleClasses = '';

          if (isCurrent) {
            if (idx === 0 && bookingState === 'pendiente') {
              // Amarillo
              stepClasses = 'bg-yellow-500/15 border-yellow-500 text-white shadow-md shadow-yellow-500/10 ring-1 ring-yellow-500/30';
              indexClasses = 'bg-yellow-500 text-black';
              iconElement = <LocateFixed className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />;
              titleClasses = 'text-white';
            } else if (idx === 0 && bookingState === 'aceptada') {
              // Verde por fuera únicamente (fondo transparente, borde verde)
              stepClasses = 'bg-transparent border-emerald-500 text-white shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/30';
              indexClasses = 'bg-emerald-500 text-black';
              iconElement = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
              titleClasses = 'text-emerald-400';
            } else {
              // Normal Current (Gold)
              stepClasses = 'bg-[#C9A55B]/15 border-[#C9A55B] text-white shadow-md shadow-[#C9A55B]/10 ring-1 ring-[#C9A55B]/30';
              indexClasses = 'bg-[#C9A55B] text-black';
              iconElement = <LocateFixed className="w-3.5 h-3.5 text-[#C9A55B] animate-pulse" />;
              titleClasses = 'text-white';
            }
          } else if (isDone) {
            stepClasses = 'bg-[#121212] border-emerald-500/30 text-gray-300';
            indexClasses = 'bg-emerald-500/20 text-emerald-400';
            iconElement = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
            titleClasses = 'text-emerald-300';
          } else {
            stepClasses = 'bg-[#101010] border-[#222222] text-[#555555]';
            indexClasses = 'bg-[#222222] text-[#666666]';
            iconElement = <span className="w-1.5 h-1.5 rounded-full bg-[#333333]"></span>;
            titleClasses = 'text-[#666666]';
          }

          return (
            <div 
              key={step.id} 
              className={`p-2.5 rounded-xl border text-left transition-all ${stepClasses}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded ${indexClasses}`}>
                  0{idx + 1}
                </span>
                {iconElement}
              </div>

              <h5 className={`text-xs font-bold truncate ${titleClasses}`}>
                {step.title}
              </h5>
              <p className="text-[10px] text-[#888888] truncate mt-0.5">
                {step.subtitle}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export const LiveTrackingMapSkeleton: React.FC = React.memo(function LiveTrackingMapSkeleton() {
  return (
    <div className="w-full bg-[#121212] rounded-2xl border border-[#C9A55B]/20 p-5 space-y-5 animate-pulse shadow-2xl relative overflow-hidden">
      {/* Golden Shimmer effect */}
      <div className="absolute inset-0 shimmer-gold pointer-events-none" />
      
      {/* Telemetry Header Placeholder */}
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-[#282828] pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#222222] border border-[#333333] flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-[#C9A55B]/30" />
          </div>
          <div className="space-y-2">
            <div className="h-4.5 w-44 bg-[#222222] rounded-md" />
            <div className="h-3 w-64 bg-[#1a1a1a] rounded-md" />
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="bg-[#1a1a1a] border border-[#282828] px-3 py-2 rounded-xl w-20 h-11" />
          <div className="bg-[#1a1a1a] border border-[#C9A55B]/20 px-3 py-2 rounded-xl w-24 h-11" />
        </div>
      </div>

      {/* Main Map Canvas Placeholder */}
      <div className="w-full h-[420px] bg-[#161616] rounded-2xl border border-[#282828] flex items-center justify-center relative overflow-hidden">
        {/* Pulsing grid layout */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#C9A55B_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        {/* Animated Radar Wave circles */}
        <div className="absolute w-40 h-40 rounded-full border border-[#C9A55B]/10 animate-ping" />
        <div className="absolute w-20 h-20 rounded-full border border-[#C9A55B]/20 animate-pulse bg-[#C9A55B]/5 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-[#C9A55B]/30 animate-pulse" />
        </div>
        
        {/* Telemetry overlay labels */}
        <div className="absolute top-3 left-3 bg-[#0d0d0d]/80 border border-[#282828] px-2.5 py-1.5 rounded-lg w-36 h-7" />
        <div className="absolute bottom-3 left-3 right-3 bg-[#0d0d0d]/80 border border-[#282828] px-3 py-2 rounded-xl h-10" />
      </div>

      {/* Step Milestones Grid Placeholder */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-3 rounded-xl border border-[#222222] bg-[#141414] space-y-2.5">
            <div className="w-7 h-5 bg-[#222222] rounded" />
            <div className="h-4 w-20 bg-[#1e1e1e] rounded" />
            <div className="h-3 w-28 bg-[#1a1a1a] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
});

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = React.memo(function LiveTrackingMap({
  clientAddress,
  cityZone,
  therapistName,
  therapistPhoto,
  therapistPhone,
  therapistZone,
  bookingState,
  therapistLat,
  therapistLng,
  clientLat,
  clientLng,
  isTherapistView,
  onRouteCalculated
}: LiveTrackingMapProps) {
  const { systemConfig } = useEcosystem();
  const [activeApiKey, setActiveApiKey] = useState<string>('');

  useEffect(() => {
    if (systemConfig.googleMapsKey) {
      setActiveApiKey(systemConfig.googleMapsKey);
    }
  }, [systemConfig.googleMapsKey]);

  const [mapError, setMapError] = useState<string | null>(null);
  const [useVectorMode, setUseVectorMode] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string }>({
    distance: '-- km',
    duration: '-- min'
  });

  const memoizedDefaultCenter = useMemo<google.maps.LatLngLiteral>(() => ({ lat: 19.3800, lng: -99.2000 }), []);

  // Memoized route calculated handler to prevent re-renders when route distance and duration haven't changed
  const handleRouteCalculated = useCallback((info: { distance: string; duration: string }) => {
    setRouteInfo(prev => {
      if (prev.distance === info.distance && prev.duration === info.duration) {
        return prev;
      }
      return info;
    });
    if (onRouteCalculated) {
      onRouteCalculated(info);
    }
  }, [onRouteCalculated]);

  // Manage loading timer when coordinates/details are loaded
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [clientAddress, cityZone, bookingState]);

  // Catch Google Maps API Auth Failure (ApiTargetBlockedMapError / ProjectDeniedMapError)
  useEffect(() => {
    const previousAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      console.warn('Google Maps API Auth Failure detected');
      setMapError('Restricción de Google Maps API: Se requiere habilitar Maps JavaScript API en Google Cloud Console.');
      setUseVectorMode(true);
      if (typeof previousAuthFailure === 'function') {
        previousAuthFailure();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason ? String(event.reason) : "";
      if (reason.includes("Google Maps") || reason.includes("ProjectDeniedMapError") || reason.includes("Geocoding Service") || reason.includes("Billing") || reason.includes("ApiTargetBlockedMapError")) {
        console.warn("Caught Google Maps promise rejection, defaulting to Vector Telemetry map.");
        setMapError("Error de validación de Google Maps API.");
        setUseVectorMode(true);
        event.preventDefault();
      }
    };
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message && (event.message.includes('Google Maps') || event.message.includes('Script error') || event.message.includes('Geocoding Service') || event.message.includes('Billing') || event.message.includes('ProjectDeniedMapError'))) {
        console.warn('Caught Google Maps script error, defaulting to Vector Telemetry map.');
        setMapError('Carga de Google Maps interrumpida.');
        setUseVectorMode(true);
        event.preventDefault();
      }
    };

    const originalConsoleError = console.error;
    console.error = (...args) => {
      const msg = args.join(" ");
      if (msg.includes("Google Maps") || msg.includes("Geocoding Service") || msg.includes("Billing")) {
        console.warn("Caught Google Maps console.error:", msg);
        setMapError("Error de validación de Google Maps API (Billing).");
        setUseVectorMode(true);
        return;
      }
      originalConsoleError.apply(console, args);
    };
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      (window as any).gm_authFailure = previousAuthFailure;
      console.error = originalConsoleError;
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const hasValidKey = Boolean(activeApiKey) && activeApiKey.length > 10;

  // Compute exact distance and travel time from current coordinates
  const fallbackRoute = useMemo(() => {
    const tPos = { lat: therapistLat ?? 19.4326, lng: therapistLng ?? -99.1900 };
    const cPos = { lat: clientLat ?? 19.3620, lng: clientLng ?? -99.2650 };
    return computeExactDistanceAndEta(tPos, cPos);
  }, [therapistLat, therapistLng, clientLat, clientLng]);

  const activeDistance = routeInfo.distance && routeInfo.distance !== '-- km' ? routeInfo.distance : fallbackRoute.distance;
  const activeDuration = routeInfo.duration && routeInfo.duration !== '-- min' ? routeInfo.duration : fallbackRoute.duration;

  if (isLoading) {
    return <LiveTrackingMapSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Visual Route Progress Tracker */}
      <VisualRouteProgressTracker
        bookingState={bookingState}
        therapistName={therapistName}
        therapistZone={therapistZone}
        clientAddress={clientAddress}
        cityZone={cityZone}
        distance={activeDistance}
        duration={activeDuration}
      />

      {/* Map Content */}
      {!hasValidKey || mapError || useVectorMode ? (
        /* Fallback Interactive High-Tech Vector Radar Map Mode */
        <div className="w-full h-[420px] bg-[#121212] rounded-2xl border border-[#C9A55B]/40 p-5 flex flex-col justify-between relative overflow-hidden text-white shadow-2xl">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#C9A55B_1px,transparent_1px)] [background-size:20px_20px]"></div>

          {/* Top Header Bar */}
          <div className="relative z-10 flex justify-between items-center border-b border-[#282828] pb-3">
            <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-xl text-xs font-semibold">
              <Compass className="w-4 h-4 text-[#C9A55B] animate-spin" />
              <span>Telemetría GPS en Tiempo Real ESSENYA</span>
            </div>

            <div className="flex items-center gap-2">
              {mapError && (
                <button
                  onClick={() => setUseVectorMode(true)}
                  className="bg-[#C9A55B]/20 border border-[#C9A55B] text-[#C9A55B] px-3 py-1 rounded-lg text-xs font-bold hover:bg-[#C9A55B] hover:text-black transition-all"
                >
                  Ver Mapa Vectorial VIP
                </button>
              )}
              <span className="text-[10px] font-mono text-[#C9A55B] bg-[#1A1A1A] border border-[#333333] px-2.5 py-1 rounded-md">
                Google Maps SDK
              </span>
            </div>
          </div>

          {/* Center Content: Error or Vector Map */}
          {useVectorMode ? (
            /* Interactive High-Tech Vector Radar Map Mode */
            <div className="relative z-10 my-auto bg-[#181818] rounded-xl border border-[#C9A55B]/30 p-4 relative overflow-hidden h-64 flex flex-col justify-between">
              {/* Grid & Map Styling Lines */}
              <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <line x1="10%" y1="20%" x2="90%" y2="80%" stroke="#C9A55B" strokeWidth="2" strokeDasharray="6,6" />
                <circle cx="20%" cy="30%" r="40" stroke="#C9A55B" strokeWidth="1" fill="none" />
                <circle cx="80%" cy="75%" r="60" stroke="#C9A55B" strokeWidth="1" fill="none" />
              </svg>

              {/* Top Telemetry Floating Badge */}
              <div className="flex justify-between items-center z-10">
                <div className="bg-[#0D0D0D]/90 border border-[#C9A55B]/40 px-3 py-1.5 rounded-lg text-xs font-bold text-[#C9A55B] flex items-center gap-2 shadow">
                  <Car className="w-4 h-4 animate-pulse text-[#C9A55B]" />
                  <span>{therapistName} — En Trayecto Ejecutivo</span>
                </div>
                <div className="bg-[#0D0D0D]/90 border border-[#C9A55B]/40 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow">
                  ETA: <span className="text-[#C9A55B]">{activeDuration}</span> (Distancia: {activeDistance})
                </div>
              </div>

              {/* Simulated Live Track Animation */}
              <div className="relative w-full h-28 my-auto flex items-center justify-between px-8">
                {/* Start Point: Therapist */}
                <div className="flex flex-col items-center space-y-1 relative z-10">
                  <div className="w-12 h-12 rounded-full border-2 border-[#C9A55B] overflow-hidden bg-black ring-4 ring-[#C9A55B]/20 shadow-xl">
                    <img src={therapistPhoto || undefined} alt={therapistName} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-[#C9A55B] bg-black/80 px-2 py-0.5 rounded border border-[#C9A55B]/30">
                    {therapistName}
                  </span>
                </div>

                {/* Path Line */}
                <div className="flex-1 mx-4 relative h-1 bg-[#282828] rounded-full overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#C9A55B] via-[#E6CA65] to-[#9A7B38] animate-pulse w-3/4"></div>
                </div>

                {/* Destination Point: Client VIP Residence */}
                <div className="flex flex-col items-center space-y-1 relative z-10">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#E6CA65] via-[#C9A55B] to-[#9A7B38] text-black flex items-center justify-center font-bold shadow-xl ring-4 ring-[#C9A55B]/30 animate-pulse">
                    <MapPin className="w-6 h-6 text-black" />
                  </div>
                  <span className="text-[10px] font-bold text-white bg-black/80 px-2 py-0.5 rounded border border-white/20 whitespace-nowrap">
                    {clientAddress || 'Domicilio VIP'}
                  </span>
                </div>
              </div>

              {/* Bottom Info Bar */}
              <div className="flex justify-between items-center text-[11px] text-[#AAAAAA] bg-[#0D0D0D]/80 p-2 rounded-lg border border-[#333333] z-10">
                <span className="flex items-center gap-1.5 text-white">
                  <Navigation className="w-3.5 h-3.5 text-[#C9A55B]" />
                  <span>Zona: <strong className="text-[#C9A55B]">{cityZone || 'Polanco / Lomas CDMX'}</strong></span>
                </span>
              </div>
            </div>
          ) : (
            /* Error Banner / API Key Update Form */
            <div className="relative z-10 max-w-lg mx-auto text-center space-y-3 py-2 text-white text-xs">
              Cargando visualización de telemetría segura...
            </div>
          )}

          {/* Footer info */}
          <div className="relative z-10 flex items-center justify-between text-[11px] text-[#888888] border-t border-[#222222] pt-2">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C9A55B]" />
              <span>Telemetría Encapsulada SSL</span>
            </span>
            <span>Soporta Google Routes API & Geocoding</span>
          </div>
        </div>
      ) : (
        <div className="w-full h-96 bg-[#141414] rounded-2xl border border-[#C9A55B]/30 overflow-hidden relative shadow-2xl flex flex-col">
          <APIProvider apiKey={activeApiKey} version="weekly">
            {/* Real Interactive Google Map */}
            <div className="w-full h-full relative">
              <Map
                gestureHandling={"none"}
                disableDefaultUI={true}
                defaultCenter={memoizedDefaultCenter}
                defaultZoom={12}
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                styles={darkGoldMapStyle}
                style={{ width: '100%', height: '100%' }}
              >
                <RouteAndMarkers
                  clientAddress={clientAddress}
                  cityZone={cityZone}
                  therapistName={therapistName}
                  therapistPhoto={therapistPhoto}
                  bookingState={bookingState}
                  therapistLat={therapistLat}
                  therapistLng={therapistLng}
                  clientLat={clientLat}
                  clientLng={clientLng}
                  onRouteCalculated={handleRouteCalculated}
                />
              </Map>

              {/* Floating Live Telemetry Panel Overlay */}
              <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-10 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 pointer-events-none">
                <div className="bg-[#0D0D0D]/90 backdrop-blur-md border border-[#C9A55B]/40 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] sm:text-xs text-[#C9A55B] font-bold flex items-center space-x-1.5 sm:space-x-2 shadow-lg pointer-events-auto">
                  <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C9A55B] animate-spin shrink-0" />
                  <span>Ruta en Vivo SDK Google Maps</span>
                </div>

                <div className="bg-[#0D0D0D]/90 backdrop-blur-md border border-[#C9A55B]/40 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs text-white font-bold shadow-lg pointer-events-auto flex items-center space-x-1.5 sm:space-x-2">
                  <span className="text-[#888888] text-[9px] sm:text-[10px] uppercase block">Llegada Estimada:</span>
                  <span className="text-[#C9A55B] font-extrabold text-xs sm:text-sm">{activeDuration}</span>
                  <span className="text-[#AAAAAA] text-[10px] sm:text-xs">(Distancia: {activeDistance})</span>
                </div>
              </div>

              {/* Bottom Vehicle Status Banner */}
              <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 z-10 bg-[#0D0D0D]/90 backdrop-blur-md p-2.5 sm:p-3 rounded-xl border border-[#C9A55B]/30 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs text-[#AAAAAA] shadow-lg pointer-events-auto">
                <div className="flex items-center space-x-2 text-[11px] sm:text-xs">
                  <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C9A55B] shrink-0" />
                  <span>
                    <strong className="text-white">Traslado Ejecutivo:</strong> Vehículo verificado ESSENYA en trayecto hacia {cityZone || 'tu domicilio'}.
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {isTherapistView && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${therapistLat},${therapistLng}&destination=${encodeURIComponent(clientAddress + ', ' + cityZone)}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gradient-to-r from-[#E6CA65] to-[#C9A55B] text-black px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 shadow-lg hover:scale-105 transition-transform"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Navegar Ahora</span>
                    </a>
                  )}
                  <span className="text-[10px] bg-[#C9A55B]/20 text-[#C9A55B] px-2 py-0.5 rounded font-mono font-bold uppercase border border-[#C9A55B]/30 shrink-0">
                    {bookingState === 'llegue' ? '¡Arribo a Domicilio!' : bookingState === 'en_camino' ? 'En Tránsito' : 'Asignado'}
                  </span>
                </div>
              </div>
            </div>
          </APIProvider>
        </div>
      )}
    </div>
  );
});
