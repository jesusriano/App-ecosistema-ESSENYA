# Guía Definitiva de Checklist para Despliegue a Producción - Plataforma ESSENYA

Esta guía detalla los pasos esenciales y el checklist técnico para desplegar la plataforma **ESSENYA Haute Massage & Wellness** en un entorno de producción real utilizando Firebase Hosting, Cloud Run / Node.js Backend, Firestore Security Rules y optimización de assets.

---

## FASE 1: Verificación de Código y Compilación Local
- [x] **Compilación de TypeScript:** Ejecutar `npm run build` para asegurar que el empaquetador (`vite build` + `esbuild`) genere correctamente los bundles de producción sin errores de tipado.
- [x] **Pruebas de Linter:** Ejecutar `npm run lint` para verificar la conformidad con TypeScript y ESLint.
- [x] **Paneles Independientes:** Comprobar que las rutas `/cliente`, `/terapeuta` y `/admin` operan de forma autónoma con sus respectivos headers específicos.
- [x] **Soporte Técnico Responsivo:** Validar el botón flotante y modal de WhatsApp con portal global (`z-[99999]`) en dispositivos móviles y de escritorio.

---

## FASE 2: Configuración de Variables de Entorno (Producción)
En tu plataforma de alojamiento (Cloud Run / Vercel / Firebase Hosting), asegúrate de definir las siguientes variables de entorno secretas y públicas (tomadas de `.env.example`):

```env
# Servidor y API (Backend Express)
NODE_ENV=production
PORT=3000

# Credenciales de Firebase (Cliente y Servidor)
VITE_FIREBASE_API_KEY=tu_api_key_de_produccion
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ai-studio-essenya-4bebd9eb-3f06-4b4e-a5fc-4349bc9b5cc8
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id

# Configuración de Soporte Técnico y Ecosistema
VITE_WHATSAPP_SUPPORT=525512345678
```

> **Precaución de Seguridad:** Nunca expongas llaves privadas de administrador o secretos de pasarelas de pago en variables con prefijo `VITE_`. Las credenciales con `VITE_` son públicas en el navegador.

---

## FASE 3: Reglas de Seguridad de Firestore (`firestore.rules`)
Asegúrate de que el archivo `firestore.rules` esté actualizado y desplegado para proteger los datos de clientes, terapeutas y reservas:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Función auxiliar para verificar autenticación
    function isAuthenticated() {
      return request.auth !=. null;
    }

    // Reglas para la colección de Clientes
    match /clients/{clientId} {
      allow read, write: if isAuthenticated();
    }

    // Reglas para la colección de Terapeutas
    match /therapists/{therapistId} {
      allow read, write: if isAuthenticated();
    }

    // Reglas para Reservas y Servicios
    match /bookings/{bookingId} {
      allow read, write: if isAuthenticated();
    }

    // Reglas para Transacciones y Billetera
    match /transactions/{txId} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

Para desplegar las reglas a tu proyecto de Firebase, ejecuta:
```bash
firebase deploy --only firestore:rules
```

---

## FASE 4: Configuración de Firebase Hosting (`firebase.json`)
Asegúrate de que `firebase.json` esté configurado para enrutar adecuadamente las solicitudes de la Single Page Application (SPA):

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

---

## FASE 5: Optimización de Assets y Rendimiento
- [x] **Compresión Gzip / Brotli:** Habilitada automáticamente en Cloud Run y Firebase Hosting para reducir el peso de transferencia de los archivos JS y CSS.
- [x] **Lazy Loading de Rutas:** Las aplicaciones de Clientes, Terapeutas y Administrador se cargan mediante importaciones dinámicas y `React.Suspense` para minimizar el bundle inicial.
- [x] **Optimización de Imágenes:** Todas las fotografías de masajes y recursos visuales en `/src/assets/images/` están optimizadas y se sirven con políticas de caché eficientes.

---

## FASE 6: Despliegue Final y Validación Post-Lanzamiento
1. **Ejecutar despliegue:**
   ```bash
   npm run build
   firebase deploy
   ```
2. **Pruebas en Producción:**
   - Verificar inicio de sesión como Cliente, Terapeuta y Administrador.
   - Probar el flujo completo de creación de reservas y pagos.
   - Hacer clic en el botón flotante de Soporte Técnico vía WhatsApp y comprobar que abre correctamente el chat con la plantilla prellenada.
   - Verificar la consola del navegador para asegurar ausencia de errores CORS o fallos de red.
