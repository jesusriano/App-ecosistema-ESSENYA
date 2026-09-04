import React, { useEffect, useState } from 'react';
import appletConfig from '../../../firebase-applet-config.json';
import { AlertCircle, Key, Settings, Loader2 } from 'lucide-react';

interface ConfigValidatorProps {
  children: React.ReactNode;
}

export const ConfigValidator: React.FC<ConfigValidatorProps> = ({ children }) => {
  const [errors, setErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const validateConfig = async () => {
      const newErrors: string[] = [];

      // 1. Firebase API Key Validation
      // Use import.meta.env but fallback gracefully
      const envFirebaseKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_API_KEY : undefined;
      const firebaseKey = envFirebaseKey || appletConfig.apiKey;
      
      if (!firebaseKey) {
        newErrors.push("Falta la API Key de Firebase (VITE_FIREBASE_API_KEY en Secrets).");
      } else if (typeof firebaseKey !== 'string' || !firebaseKey.startsWith("AIza")) {
        newErrors.push(`La API Key de Firebase tiene un formato inválido (debe comenzar con 'AIza'). Valor actual: ${firebaseKey ? firebaseKey.substring(0, 10) + '...' : 'vacío'}`);
      } else {
        // Firebase API Ping via Identity Toolkit
        try {
          const fbRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: "dummy_ping_token" })
          });
          const fbData = await fbRes.json();
          if (fbData.error && fbData.error.message === 'API_KEY_INVALID') {
            newErrors.push("La API Key de Firebase fue rechazada por el servidor (API_KEY_INVALID). Verifica que esté copiada correctamente.");
          } else if (fbData.error && fbData.error.message === 'API_KEY_EXPIRED') {
            newErrors.push("La API Key de Firebase ha expirado.");
          }
        } catch (e) {
          console.warn("No se pudo hacer ping a Firebase (podría ser un problema de red temporal):", e);
        }
      }

      // 2. Google Maps API Key Validation
      let mapsKey = "";
      try {
        // Vite injects this at build time via define
        mapsKey = (process.env as any).GOOGLE_MAPS_PLATFORM_KEY || "";
      } catch (e) {
        mapsKey = "";
      }

      // Fallback check for maps key in case it's exposed via Vite env
      if (!mapsKey && typeof import.meta !== 'undefined' && import.meta.env) {
        mapsKey = (import.meta.env as any).VITE_GOOGLE_MAPS_PLATFORM_KEY || "";
      }

      if (!mapsKey) {
        newErrors.push("Falta la API Key de Google Maps (GOOGLE_MAPS_PLATFORM_KEY en Secrets).");
      } else if (typeof mapsKey !== 'string' || !mapsKey.startsWith("AIza")) {
        newErrors.push(`La API Key de Google Maps tiene un formato inválido (debe comenzar con 'AIza'). Valor actual: ${mapsKey ? mapsKey.substring(0, 10) + '...' : 'vacío'}`);
      } else {
        // Google Maps API Ping via Geocoding API
        try {
          const mapsRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=0,0&key=${mapsKey}`);
          const mapsData = await mapsRes.json();
          if (mapsData.status === 'REQUEST_DENIED') {
            const errMsg = mapsData.error_message || '';
            if (errMsg.includes('invalid') || errMsg.includes('not valid') || errMsg.includes('expired')) {
              newErrors.push(`La API Key de Google Maps es inválida o fue rechazada: ${errMsg}`);
            } else {
              console.warn("Google Maps ping alert (might just be missing Geocoding API enablement, but key is valid format):", errMsg);
            }
          }
        } catch (e) {
          console.warn("No se pudo hacer ping a Google Maps:", e);
        }
      }

      if (isMounted) {
        setErrors(newErrors);
        setIsValidating(false);
      }
    };

    validateConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isValidating) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 text-[#C9A55B] animate-spin" />
      </div>
    );
  }

  if (errors.length > 0) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-6 font-sans">
        <div className="max-w-2xl w-full bg-[#141414] border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-red-500/10 border-b border-red-500/20 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Error de Configuración del Entorno</h1>
              <p className="text-sm text-red-400 mt-1">
                La aplicación no puede iniciar porque faltan variables de entorno o son inválidas.
              </p>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[#AAAAAA] uppercase tracking-wider">Problemas Detectados</h2>
              <ul className="space-y-2">
                {errors.map((err, i) => (
                  <li key={i} className="flex items-start gap-3 bg-red-500/5 border border-red-500/10 p-3 rounded-lg">
                    <Key className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-200">{err}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#1C1917] p-5 rounded-xl border border-[#333333]">
              <h3 className="text-white font-semibold flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-[#C9A55B]" />
                ¿Cómo solucionarlo?
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-400">
                <li>Abre el menú de <strong className="text-gray-200">Settings</strong> (Ajustes ⚙️) en AI Studio.</li>
                <li>Ve a la sección <strong className="text-gray-200">Secrets</strong> (Secretos).</li>
                <li>Verifica o añade las variables mencionadas arriba con sus valores correctos obtenidos desde Google Cloud / Firebase.</li>
                <li>Asegúrate de no haber borrado o restringido incorrectamente la clave principal de Firebase.</li>
                <li>Una vez guardadas, el servidor se reiniciará automáticamente.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
