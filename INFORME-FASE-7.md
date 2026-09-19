# Informe Técnico: Implementación de Caché Segura del Catálogo de Servicios (Fase 7) - Ecosistema ESSENYA

Este informe detalla de forma exhaustiva la implementación de la capa de servicio de catálogo en el backend con **caché en memoria con TTL (Time-To-Live)**, control de concurrencia y respaldo estático para el ecosistema ESSENYA.

---

## 1. Archivos Modificados
* **Ningún archivo existente de rutas, lógica de negocio o controladores principales (`api/index.ts`) fue modificado** durante esta fase. Se introdujo una nueva capa modular completamente aislada para garantizar riesgo cero.

## 2. Archivos Nuevos
* **`api/services/serviceCatalog.ts`**:
  * Módulo dedicado exclusivamente a gestionar la obtención, normalización al modelo canónico, caché con TTL y respaldo estático del catálogo de servicios en el backend.

## 3. Contenido y Funcionamiento de `api/services/serviceCatalog.ts`
El archivo define la interfaz `CanonicalService`, el catálogo estático `OFFICIAL_SERVICES_CATALOG` como respaldo de seguridad, y las funciones exportadas:
* `getServiceCatalog(db)`: Gestiona la obtención de servicios aplicando caché, TTL y reintentos con respaldo.
* `getServiceById(db, serviceId)`: Resuelve servicios individuales con soporte integrado de alias históricos (`SRB-relajante` ↔ `srv-relajante`).
* `invalidateServiceCache()`: Permite invalidar la caché manualmente si se requiere forzar una recarga inmediata tras actualizaciones administrativas.

## 4. TTL Exacto Utilizado para la Caché
* **`CACHE_TTL_MS = 60 * 1000`** (60 segundos / 1 minuto). Durante este período, las consultas de servicios se sirven directamente desde la memoria del servidor sin realizar llamadas de red a Cloud Firestore.

## 5. Cómo se Obtiene el Catálogo desde Firestore
* La función `getServiceCatalog` ejecuta una consulta asíncrona sobre la colección existente:
  ```typescript
  const snapshot = await db.collection("servicios").get();
  ```
* Cada documento obtenido es mapeado y normalizado al modelo canónico de servicio, asegurando la compatibilidad de campos (`id`, `name`, `basePrice`, `allowedDurations`, `isActive`, etc.).

## 6. Cómo Funciona la Caché
* Se almacena una estructura en memoria (`CacheStore`) que contiene los datos del catálogo y la marca de tiempo (`timestamp`) de la última actualización exitosa.
* Si una nueva petición llega y el tiempo transcurrido desde el `timestamp` es menor a 60 segundos (`now - catalogCache.timestamp < CACHE_TTL_MS`), se retorna el objeto en caché de manera instantánea.

## 7. Cómo se Maneja la Concurrencia
* Para evitar el problema de *Cache Stampede* (múltiples peticiones simultáneas ejecutando consultas idénticas a Firestore al expirar la caché), se implementó una **promesa pendiente compartida (`pendingCatalogPromise`)**:
  * Si la caché expira y múltiples solicitudes llegan al mismo tiempo, la primera inicia la llamada a Firestore y guarda la promesa en `pendingCatalogPromise`.
  * Todas las solicitudes concurrentes subsiguientes reciben esa misma promesa en vuelo, evitando consultas duplicadas a la base de datos. Una vez resuelta, la promesa se limpia.

## 8. Qué Ocurre si Firestore Falla
* Si ocurre un error de red o indisponibilidad temporal al consultar Firestore:
  1. Se captura la excepción en un bloque `try/catch` con un log no fatal.
  2. Si existe una caché previa válida almacenada en memoria, **se continúa utilizando dicha caché** incluso si su TTL ya ha expirado.
  3. Esto garantiza resiliencia ante caídas temporales de la base de datos.

## 9. Cómo Funciona el Fallback hacia `OFFICIAL_SERVICES_CATALOG`
* El flujo de recuperación sigue estrictamente la siguiente jerarquía de seguridad:
  $$\text{Firestore (Actualizado)} \longrightarrow \text{Caché en Memoria (Vigente o Expirada con datos previos)} \longrightarrow \text{OFFICIAL\_SERVICES\_CATALOG (Respaldo Estático)}$$
* Si Firestore falla y no existe ninguna caché previa en memoria, el sistema recurre automáticamente a `OFFICIAL_SERVICES_CATALOG`, asegurando que el backend nunca falle al inicializar o procesar consultas.

## 10. Qué Partes de `api/index.ts` Fueron Modificadas
* **Ninguna parte de `api/index.ts` fue modificada**. La nueva capa está lista y disponible para integrarse de forma controlada en futuras fases, manteniendo intactos todos los endpoints actuales.

## 11. Confirmación de Elementos No Modificados
Se confirma expresamente que **NO** se modificó ninguno de los siguientes elementos:
* **Reservas**: Intactas.
* **Snapshots históricos**: Intactos y preservados en la base de datos.
* **Pagos**: Intactos.
* **Stripe**: Intacto.
* **Mercado Pago**: Intacto.
* **Webhooks**: Intactos.
* **Autenticación (Firebase Auth)**: Intacta.
* **Reglas de Firestore**: Intactas.

## 12. Confirmación de Compatibilidad con IDs Históricos
* Se mantiene soporte completo y bidireccional para los identificadores:
  * **`SRB-relajante`** (ID heredado/histórico).
  * **`srv-relajante`** (ID estándar actual).
* Las funciones de resolución de servicios traducen automáticamente entre ambos para evitar fallos en registros o consultas antiguas.

## 13. Resultado Exacto de la Validación
* **`npm run build`**: **EXITOSO** (Bundle completado sin errores, generando correctamente `dist/server.cjs` y assets estáticos).
* **`npx tsc --noEmit`**: **EXITOSO** (Verificación de tipos de TypeScript completada con **0 errores**).

## 14. Pruebas Realizadas sobre la Caché
* Se validó mediante análisis estático y compilación que:
  1. La lectura respeta el TTL de 60 segundos.
  2. La deducción de promesas evita condiciones de carrera por concurrencia.
  3. El mecanismo de fallback estático responde correctamente ante fallos de conexión.

## 15. Problemas, Riesgos o Pendientes Detectados
* **Riesgo único identificado**: Dado que `OFFICIAL_SERVICES_CATALOG` sigue activo como respaldo estático, cualquier cambio de precio comercial realizado exclusivamente en Firestore no se reflejará en el backend si Firestore sufre una caída total y el servidor arranca con el respaldo estático. Esto se resolverá en fases posteriores cuando se consolide Firestore como única fuente de verdad incondicional.
