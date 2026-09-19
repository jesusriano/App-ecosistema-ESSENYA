# Plan de Limpieza Seguro - ESSENYA Ecosistema

Este documento establece el **Plan de Limpieza Seguro** para el proyecto ESSENYA Ecosistema. Su propósito es guiar una reducción controlada de la duplicación de código, artefactos temporales y componentes legacy, **sin alterar la funcionalidad, la lógica de negocio, las reglas de seguridad, la autenticación ni la infraestructura de Firebase**.

---

## 1. Resumen Ejecutivo
El proyecto ESSENYA se encuentra en una etapa madura de consolidación. La auditoría estructural reveló que la aplicación utiliza una arquitectura moderna basada en **React Router con lazy-loading por módulos dedicados (`/src/aplicaciones/`)**, mientras que carpetas anteriores como `/src/apps/` y diversos respaldos o parches en la raíz han quedado obsoletos. 

Este plan detalla las acciones específicas (conservar, migrar, eliminar tras validación, mover a scripts/tests, revisar o no tocar) para cada componente identificado, asegurando cero interrupciones en producción.

---

## 2. Arquitectura Activa Confirmada
Mediante la inspección directa de `src/main.tsx`, `src/App.tsx` y el sistema de rutas (`/src/aplicaciones/*`), se confirma fehacientemente la siguiente estructura activa:

* **Punto de Entrada DOM**: `src/main.tsx` monta `src/App.tsx`.
* **Enrutamiento Principal y Proveedores**: `src/App.tsx` define el proveedor global (`EcosystemProvider`, `AuthProvider`, `TherapistProvider`, etc.) y el sistema de carga diferida (`React.lazy`) para los tres portales:
  1. **Portal Clientes**: `src/aplicaciones/cliente/App.tsx` (Montado en `/cliente/*`)
  2. **Portal Terapeutas**: `src/aplicaciones/terapeuta/App.tsx` (Montado en `/terapeuta/*`)
  3. **Portal Administrador**: `src/aplicaciones/administrador/App.tsx` (Montado en `/admin/*`)
* **Componentes y Servicios Compartidos**: `/src/shared/` (incluyendo `shared/context/`, `shared/components/`, `shared/services/`, `shared/types/`).

**Estructuras Legacy / Wrapper**:
* La carpeta `/src/apps/` (`ClientApp.tsx`, `AdminApp.tsx`, `TherapistApp.tsx`) es una capa intermedia antigua que ya no es referenciada por `src/App.tsx` ni `src/main.tsx`.

---

## 3. Matriz de Clasificación de Archivos y Acciones de Limpieza

| Ruta del Archivo / Carpeta | Tipo | Función Aparente | Quién lo Importa | Quién lo Utiliza | Ref. Dinámicas | Participa en Rutas | Participa en Build | Participa en Tests | Lógica de Negocio | Riesgo de Eliminar | Acción Recomendada |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `api/index.ts.bak` | Respaldo | Respaldo histórico de backend | Ninguno | Ninguno | No | No | No | No | No | Nulo | **ELIMINAR DESPUÉS DE VALIDACIÓN** |
| `create-booking-endpoint.patch` | Parche | Parche de git temporal | Ninguno | Ninguno | No | No | No | No | No | Nulo | **ELIMINAR DESPUÉS DE VALIDACIÓN** |
| `essenya-fase2.5r-final.tar.gz` | Archivo Comprimido | Respaldo de versión | Ninguno | Ninguno | No | No | No | No | No | Nulo | **ELIMINAR DESPUÉS DE VALIDACIÓN** |
| `essenya_proyecto_completo.zip` | Archivo Comprimido | Respaldo de versión | Ninguno | Ninguno | No | No | No | No | No | Nulo | **ELIMINAR DESPUÉS DE VALIDACIÓN** |
| `src/apps/` | Carpeta Legacy | Wrappers antiguos de portales | Ninguno activo | Ninguno | No | No | No | No | No | Bajo | **MIGRAR Y DESPUÉS ELIMINAR** (verificar scripts externos) |
| `src/contexto/` | Carpeta Legacy | Contexto vacío | Ninguno | Ninguno | No | No | No | No | No | Nulo | **ELIMINAR DESPUÉS DE VALIDACIÓN** |
| `*.json` (en raíz, ej. `definitive-report.json`) | Reportes | Reportes de auditoría previa | Ninguno | Ninguno | No | No | No | No | No | Nulo | **MOVER A SCRIPTS/TESTS** o conservar en docs |
| `api/index.ts` | Backend | Servidor Express y monolito API | `server.ts` | Servidor Principal | Sí (Endpoints) | Sí (Backend) | Sí | Sí | **Sí** | **CRÍTICO** | **NO TOCAR** (Requiere refactorización por fases) |
| `src/shared/context/EcosystemContext.tsx` | Contexto Global | Estado centralizado del ecosistema | Múltiples páginas | App y Portales | Sí | No | Sí | Sí | **Sí** | **CRÍTICO** | **NO TOCAR** |
| `firestore.rules` & `storage.rules` | Seguridad | Reglas de control de acceso | Firebase Config | Firebase Cloud | Sí | No | No | No | **Sí (Seguridad)** | **CRÍTICO** | **NO TOCAR** |

---

## 4. Archivos que Deben Conservarse (Core Activo)
* **Punto de Entrada y Rutas**: `src/main.tsx`, `src/App.tsx`, `server.ts`.
* **Portal Clientes**: Todo el contenido de `src/aplicaciones/cliente/`.
* **Portal Terapeutas**: Todo el contenido de `src/aplicaciones/terapeuta/`.
* **Portal Administrador**: Todo el contenido de `src/aplicaciones/administrador/`.
* **Módulo Compartido**: Todo el contenido de `src/shared/` (`AuthContext`, `TherapistContext`, `EcosystemContext`, componentes base, hooks, servicios).
* **Configuración Base**: `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.*`, `metadata.json`, `.env.example`.

---

## 5. Archivos que Deben Migrarse Antes de Eliminar
* **Carpeta `/src/apps/`**: 
  * *Motivo*: Contiene `client/ClientApp.tsx`, `admin/AdminApp.tsx`, `therapist/TherapistApp.tsx`.
  * *Acción*: Revisar si algún script de automatización (`scripts/` o raíz) apunta a estos archivos. Si no existen referencias, proceder a su eliminación. Si existieran referencias, actualizar los scripts hacia `/src/aplicaciones/` antes de eliminar `/src/apps/`.

---

## 6. Archivos de Pruebas y Documentación
* **Documentación Histórica en Raíz**: `CORRECCION-TERAPEUTAS-PRUEBAS-REALES.md`, `FASE-2-CONEXIONES-ECOSISTEMA.md`, `FIX-ADMIN-TERAPEUTAS-RENDER.md`, `INFORME-APROBACION-TERAPEUTAS.md`, `LIMPIEZA-INICIAL-PRUEBAS-REALES.md`, `PRE-PRUEBAS-REALES-ESSENYA.md`.
  * *Acción*: **Clasificación B (Conservar como documentación o mover a carpeta `/docs/`)**.
* **Reportes JSON y Parches**: `*.json`, `*.patch`.
  * *Acción*: **Clasificación A (Mover a `/tests/reports/` o eliminar según necesidad de espacio)**.

---

## 7. Dependencias Nuevas → Legacy
* Se ha verificado que los módulos nuevos (`/src/aplicaciones/terapeuta/`, `/src/aplicaciones/cliente/`, `/src/aplicaciones/administrador/`) **no dependen** de carpetas legacy como `/src/apps/` ni `/src/contexto/`.
* Dependen exclusivamente de `/src/shared/` y sus propios componentes internos. Por lo tanto, no hay acoplamiento hacia atrás que ponga en riesgo la eliminación de código legacy secundario.

---

## 8. Fuentes Duplicadas de Datos y Precios
Se identificaron tres fuentes donde se definen catálogos, servicios y precios:
1. **Backend (`api/index.ts`)**: `OFFICIAL_SERVICES_CATALOG` (fuente principal para validación de pasarelas de pago y creación de reservas en servidor).
2. **Datos Estáticos (`src/data/mockData.ts`)**: Respaldo inicial para pruebas offline.
3. **Firestore (`configuraciones/global` o colecciones de servicios)**: Fuente de verdad dinámica consultada por `EcosystemContext.tsx`.

* *Recomendación*: En esta fase **NO se unificarán**. Se documenta como riesgo latente de desincronización de precios que deberá abordarse en una fase posterior de refactorización de datos.

---

## 9. Archivos Grandes y Plan de Refactorización Futura

| Archivo | Líneas Aprox. | Responsabilidades Actuales | Riesgo de Refactorizar | Orden Recomendado |
| :--- | :--- | :--- | :--- | :--- |
| `api/index.ts` | 2,272+ | Servidor Express, Gemini API, pasarela de pago, Webhooks, gestión de reservas, terapeutas, pánico SOS. | **Muy Alto** (Rompería la API si se separa incorrectamente) | **Fase Final** (Dividir en controladores: `/api/controllers/`, `/api/routes/`) |
| `src/shared/context/EcosystemContext.tsx` | ~1,800 | Gestión de reservas, chat, alertas SOS, notificaciones, sincronización con Firestore. | **Alto** (Afecta el estado global de todos los portales) | **Fase 3** (Extraer lógica de chat y SOS a hooks independientes) |
| `src/aplicaciones/administrador/pages/DashboardPage.tsx` | ~643 | Métricas, panel en vivo, gestión de alertas SOS, mapa de reservas, control de terapeutas. | **Medio** (Afecta sólo al panel admin) | **Fase 2** (Extraer sub-componentes de widgets) |

---

## 10. Riesgos Principales
1. **Ruptura de Enlaces API**: Modificar `api/index.ts` prematuramente sin un mapeo estricto de rutas Express.
2. **Pérdida de Sincronización en Tiempo Real**: Alterar `EcosystemContext.tsx` puede deshabilitar los listeners de Firestore en vivo para los portales de admin y terapeuta.
3. **Referencias Ocultas en Scripts**: Eliminar archivos en `/src/apps/` sin revisar scripts en la carpeta `scripts/` o en `package.json`.

---

## 11. Orden Exacto de Intervención (Para Futuras Autorizaciones)
* **Paso 1**: Depuración de artefactos de raíz (`.bak`, `.patch`, `.tar.gz`, `.zip`).
* **Paso 2**: Reubicación de documentación markdown a `/docs/` y reportes JSON a `/tests/reports/`.
* **Paso 3**: Eliminación de carpeta vacía `/src/contexto/`.
* **Paso 4**: Verificación y posterior eliminación de la carpeta `/src/apps/` (previa comprobación de que ningún script la referencie).
* **Paso 5**: Mantenimiento estricto y **NO TOCAR** para `api/index.ts`, `EcosystemContext.tsx`, `firestore.rules` y pasarelas de pago.

---

## 12. Validaciones Necesarias Después de Cada Cambio
Después de cualquier intervención futura autorizada, se deben ejecutar obligatoriamente las siguientes verificaciones:
1. `npm run lint` (Validación estricta de TypeScript `tsc --noEmit`).
2. `npm run build` o compilación mediante `compile_applet`.
3. Prueba manual de navegación en los tres portales (`/cliente`, `/terapeuta`, `/admin`).
4. Verificación de conectividad con Firestore y autenticación.
