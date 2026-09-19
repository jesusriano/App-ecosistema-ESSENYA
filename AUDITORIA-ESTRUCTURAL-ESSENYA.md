# Informe de Auditoría Estructural - ESSENYA Ecosistema

Este informe presenta una auditoría estructural exhaustiva del proyecto **ESSENYA Ecosistema**, realizada con el fin de diagnosticar la arquitectura, identificar duplicidades, código legacy, responsabilidades mezcladas y riesgos, sin alterar ni eliminar ningún archivo durante esta fase.

---

## 1. Arquitectura Actual
El proyecto está estructurado como una aplicación **Full-Stack híbrida SPA (React + Vite) + Backend Monolítico (Express)**:
* **Frontend SPA**: Utiliza React 19, React Router v7 con lazy-loading por módulos, Tailwind CSS v4, y está dividido en tres portales funcionales independientes bajo rutas dedicadas:
  1. **Portal Clientes**: (`/cliente/*`) - Aplicación para reservas, servicios, perfil, wallet y seguimiento.
  2. **Portal Terapeutas**: (`/terapeuta/*`) - Aplicación para gestión de citas asignadas, ingresos, disponibilidad y alertas SOS.
  3. **Portal Administrador**: (`/admin/*`) - Panel de control integral para supervisión en vivo, finanzas, terapeutas, clientes, reportes y configuración.
* **Backend**: Desarrollado en Node.js con Express (`server.ts` y el monolito `api/index.ts`), integrando Firebase Admin SDK y `@google/genai`.
* **Persistencia**: Cloud Firestore como base de datos NoSQL principal y Firebase Authentication.

---

## 2. Punto de Entrada
* **Punto de Entrada del Runtime Frontend**: `/src/main.tsx`
  * Monta el componente raíz `App` envuelto en `StrictMode`.
* **Componente Raíz de la Aplicación**: `/src/App.tsx`
  * Configura el árbol de proveedores globales en orden jerárquico: `ErrorBoundary`, `ConfigValidator`, `ThemeProvider`, `ToastProvider`, `AuthProvider`, `TherapistProvider`, `EcosystemProvider`, `BrowserRouter` y `MainAppContent`.
* **Punto de Entrada del Backend (Desarrollo y Producción)**: `server.ts` y `api/index.ts`.

---

## 3. Árbol de Carpetas Relevante
```text
/
├── api/
│   ├── index.ts          # Backend monolítico Express (2272+ líneas)
│   └── index.ts.bak      # Respaldo de API
├── src/
│   ├── App.tsx           # Enrutador principal de portales y providers
│   ├── main.tsx          # Punto de entrada DOM
│   ├── aplicaciones/     # Arquitectura modular actual
│   │   ├── administrador/# Módulo Admin (pages, components, services, hooks, App.tsx, routes.tsx)
│   │   ├── cliente/      # Módulo Cliente (app, components, pages, routes, etc.)
│   │   └── terapeuta/    # Módulo Terapeuta (pages, components, App.tsx, routes.tsx)
│   ├── apps/             # Arquitectura wrapper anterior (duplicados de entrada)
│   │   ├── admin/
│   │   ├── client/
│   │   └── therapist/
│   ├── backend/
│   │   └── index.ts      # Enlace secundario de backend
│   ├── components/       # Componentes globales antiguos (ej. InvoiceModal)
│   ├── context/          # Contextos globales antiguos (ThemeContext, ToastContext)
│   ├── contexto/         # Carpeta de contexto vacía/legacy (index.ts)
│   ├── data/             # Datos estáticos globales (mockData.ts)
│   ├── shared/           # Componentes, servicios, contextos, hooks y tipos compartidos
│   └── types.ts          # Tipos globales
├── server.ts             # Servidor Express principal
└── package.json          # Manifiesto de dependencias y scripts
```

---

## 4. Dependencias Principales
* **Framework & UI**: `react` (19.3.0), `react-dom` (19.3.0), `react-router-dom` (^7.18.0), `tailwindcss` (^4.1.14), `lucide-react`, `motion`.
* **Backend & Firebase**: `express` (^4.21.2), `firebase` (^12.16.0), `firebase-admin` (^14.3.0), `@google/genai` (^2.4.0).
* **Utilidades**: `recharts`, `qs`, `dotenv`.

---

## 5. Archivos Duplicados
1. **Estructuras de Aplicaciones (Doble Ruta de Entrada)**:
   * `/src/aplicaciones/cliente/`, `/src/aplicaciones/terapeuta/`, `/src/aplicaciones/administrador/` (Arquitectura activa utilizada por `src/App.tsx`).
   * `/src/apps/client/ClientApp.tsx`, `/src/apps/admin/AdminApp.tsx`, `/src/apps/therapist/TherapistApp.tsx` (Estructura wrapper antigua que apunta a `/src/aplicaciones/`).
2. **Contextos Globales**:
   * `/src/context/ThemeContext.tsx` & `ToastContext.tsx` vs `/src/shared/context/`.
   * `/src/contexto/index.ts` (carpeta legacy casi vacía).
3. **Catálogos y Datos**:
   * Catálogos de servicios duplicados entre `api/index.ts` (`OFFICIAL_SERVICES_CATALOG`), `src/data/mockData.ts`, y los estados iniciales en `EcosystemContext.tsx`.

---

## 6. Código Legacy
* **Wrappers en `/src/apps/`**: Capa de abstracción anterior para los portales que ya no es requerida ya que `src/App.tsx` importa directamente desde `/src/aplicaciones/`.
* **Carpeta `/src/contexto/`**: Contiene un único archivo (`index.ts`) sin uso activo en el runtime principal.

---

## 7. Código de Pruebas y Artefactos Externos (Fuera del Runtime)
* **Carpeta `tests/`**: Pruebas de API y scripts de validación.
* **Archivos en Raíz**:
  * `api/index.ts.bak` (Respaldo)
  * `create-booking-endpoint.patch` (Parche git)
  * `essenya-fase2.5r-final.tar.gz` y `essenya_proyecto_completo.zip` (Archivos comprimidos de respaldos anteriores)
  * Reportes JSON (`definitive-report.json`, `e2e-2-5-report.json`)
  * Documentación markdown histórica (`CORRECCION-TERAPEUTAS-PRUEBAS-REALES.md`, `FASE-2-CONEXIONES-ECOSISTEMA.md`, `FIX-ADMIN-TERAPEUTAS-RENDER.md`, `GUIA-DESPLIEGUE-PRODUCCION.md`, `INFORME-APROBACION-TERAPEUTAS.md`, `LIMPIEZA-INICIAL-PRUEBAS-REALES.md`, `PRE-PRUEBAS-REALES-ESSENYA.md`).

---

## 8. Archivos Candidatos a Eliminación (Clasificación)

| Archivo / Carpeta | Clasificación | Justificación / Criterio de Verificación |
| :--- | :---: | :--- |
| `api/index.ts.bak` | **A** | Archivo de respaldo obsoleto. Sin referencias en compilación ni scripts. |
| `create-booking-endpoint.patch` | **A** | Parche temporal aplicado. No requerido en runtime. |
| `essenya-fase2.5r-final.tar.gz` | **A** | Archivo comprimido histórico en la raíz del proyecto. |
| `essenya_proyecto_completo.zip` | **A** | Archivo comprimido histórico en la raíz del proyecto. |
| `/src/apps/` (carpeta completa) | **B** | Wrappers antiguos. Verificar si algún script externo o documentación hace referencia directa antes de eliminar. |
| `/src/contexto/` (carpeta completa) | **A** | Carpeta vacía/legacy sin referencias activas. |
| Reportes JSON sueltos (`*.json` en raíz) | **B** | Reportes de ejecución previa. Útiles para auditoría pero ajenos al código fuente. |

---

## 9. Dependencias Circulares
* No se detectan dependencias circulares críticas a nivel de módulos de React Router (`/cliente`, `/terapeuta`, `/admin`), ya que operan de forma aislada mediante code-splitting (`React.lazy`).
* Sin embargo, existe un acoplamiento fuerte entre `EcosystemContext.tsx` y los contextos hijos debido a la sincronización bidireccional del estado de reservas y alertas SOS.

---

## 10. Responsabilidades Mezcladas en el Backend (`api/index.ts`)
* El archivo `api/index.ts` actúa como un **monolito excesivo** (más de 2,200 líneas) que concentra:
  1. Inicialización de Firebase Admin SDK.
  2. Catálogos estáticos de servicios y precios.
  3. Lógica de pasarelas de pago y generación de facturas.
  4. Endpoints de integración con la API de Google Gemini (`@google/genai`).
  5. Endpoints de webhooks, gestión de terapeutas, asignaciones automáticas, reportes y control de pánico SOS.
* **Riesgo**: Dificultad extrema para depurar errores de API, alto riesgo de conflictos en control de versiones y acoplamiento innecesario de lógica de negocio en el servidor Express.

---

## 11. Fuentes Duplicadas de Datos y Precios
* **Catálogos de Servicios**: Definidos en `api/index.ts` (`OFFICIAL_SERVICES_CATALOG`), duplicados estáticamente en `src/data/mockData.ts`, y sobreescritos dinámicamente mediante Firestore en `EcosystemContext.tsx`.
* **Riesgo**: Desalineación de precios base (ej. 60 min, 90 min, 120 min) si se actualizan en una fuente y no en las demás.

---

## 12. Riesgos de Refactorización
1. **Ruptura de Endpoints de API**: Mover o dividir `api/index.ts` sin actualizar las rutas de llamadas fetch desde el frontend romperá la comunicación con Firestore y Gemini.
2. **Eliminación Premisa de Wrappers**: Eliminar `/src/apps/` podría afectar si algún script de prueba heredado importa desde ahí.
3. **Pérdida de Sincronización en Tiempo Real**: Modificar `EcosystemContext.tsx` sin preservar los listeners de Firestore romperá el panel en vivo del administrador y las notificaciones de los terapeutas.

---

## 13. Plan de Limpieza Recomendado (Para Fases Posteriores)
1. **Fase 1 (Segura)**: Eliminar artefactos temporales de raíz (`.bak`, `.patch`, `.tar.gz`, `.zip`, reportes JSON obsoletos).
2. **Fase 2 (Revisión de Wrappers)**: Confirmar la no-existencia de referencias a `/src/apps/` y proceder a su unificación con `/src/aplicaciones/`.
3. **Fase 3 (Desacoplamiento Backend)**: Modularizar `api/index.ts` separando rutas de API en controladores independientes (`/api/routes/`, `/api/controllers/`, `/api/services/`).
4. **Fase 4 (Unificación de Catálogos)**: Establecer una única fuente de verdad para precios y servicios conectada directamente a Firestore con respaldo en un archivo único centralizado.
