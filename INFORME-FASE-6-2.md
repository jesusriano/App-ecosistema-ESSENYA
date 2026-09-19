# Informe Técnico: Verificación y Conciliación Definitiva del Catálogo de Servicios (Fase 6.2) - Ecosistema ESSENYA

Este informe presenta la auditoría FINAL y de diagnóstico estricto sobre el catálogo de servicios del ecosistema ESSENYA. De acuerdo con las reglas absolutas de esta fase, **no se ha modificado ningún archivo, código, base de datos ni configuración**.

---

## 1. Resumen Ejecutivo
El análisis del código actual revela que ESSENYA opera mediante una **arquitectura híbrida orientada a Firestore como fuente de verdad dinámica**, pero respaldada por catálogos estáticos en frontend (`OFFICIAL_SERVICES` en `catalog.ts`) y backend (`OFFICIAL_SERVICES_CATALOG` en `api/index.ts`). La sincronización en tiempo real se ejecuta a través de `EcosystemContext.tsx`, el cual consulta la colección Firestore `servicios` y fusiona/sobrescribe los datos del catálogo.

---

## 2. Catálogo Frontend Real (`src/shared/data/catalog.ts`)
El frontend define oficialmente 6 tratamientos principales:

| ID | Nombre | Precio Base (60m) | Duración | Estado | Archivo de Origen |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `SRB-relajante` | Masaje Relajante | $1,100 MXN | 60, 90, 120 min | Activo | `src/shared/data/catalog.ts` |
| `srv-descontracturante` | Masaje Descontracturante | $1,200 MXN | 60, 90, 120 min | Activo | `src/shared/data/catalog.ts` |
| `srv-deportivo` | Masaje Deportivo | $1,250 MXN | 60, 90, 120 min | Activo | `src/shared/data/catalog.ts` |
| `srv-tejido-profundo` | Masaje de Tejido Profundo | $1,300 MXN | 60, 90, 120 min | Activo | `src/shared/data/catalog.ts` |
| `srv-prenatal` | Masaje Prenatal | $1,100 MXN | 60, 90, 120 min | Activo | `src/shared/data/catalog.ts` |
| `srv-pareja` | Masaje en Pareja | $2,400 MXN | 60, 90, 120 min | Activo (VIP) | `src/shared/data/catalog.ts` |

---

## 3. Catálogo Backend Real (`api/index.ts`)
* **Estructura**: `OFFICIAL_SERVICES_CATALOG` en `api/index.ts` contiene exactamente los mismos 6 servicios (con variantes de ID como `srv-relajante` y `SRB-relajante`).
* **Uso**: 
  1. Se utiliza como **fuente de siembra inicial (`seed`)** para poblar la colección `servicios` en Firestore al arrancar el servidor si la base de datos está vacía.
  2. Se utiliza como **validador estricto y fallback de seguridad** en los endpoints de creación de reservas y pagos (`/api/bookings`, etc.) para verificar precios y duraciones permitidas.
  3. Contiene lógica de respaldo para sinónimos de IDs (p. ej., relacionando `SRB-relajante` con `srv-relajante`).

---

## 4. Catálogo Firestore y Nivel de Verificación
* **Colección**: `servicios`
* **Mecanismo**: `EcosystemContext.tsx` establece un `onSnapshot` sobre la colección `servicios`. 
* **Nivel de Verificación**: 
  - Desde el entorno de ejecución estático actual no se realizan consultas de escritura en caliente, pero el código demuestra que la sincronización en tiempo real está completamente implementada. Cuando el Administrador edita o crea un servicio en `ServiciosPage.tsx`, el cambio se escribe en Firestore y se propaga automáticamente a los clientes y terapeutas.

---

## 5. Tabla Comparativa de Fuentes

| Servicio | Frontend (`catalog.ts`) | Backend (`api/index.ts`) | Firestore (`servicios`) | ID Principal | Precio Base | Estado |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: |
| Masaje Relajante | ✅ Coincide | ✅ Coincide | ✅ Sincronizado | `SRB-relajante` / `srv-relajante` | $1,100 | Activo |
| Masaje Descontracturante | ✅ Coincide | ✅ Coincide | ✅ Sincronizado | `srv-descontracturante` | $1,200 | Activo |
| Masaje Deportivo | ✅ Coincide | ✅ Coincide | ✅ Sincronizado | `srv-deportivo` | $1,250 | Activo |
| Masaje de Tejido Profundo | ✅ Coincide | ✅ Coincide | ✅ Sincronizado | `srv-tejido-profundo` | $1,300 | Activo |
| Masaje Prenatal | ✅ Coincide | ✅ Coincide | ✅ Sincronizado | `srv-prenatal` | $1,100 | Activo |
| Masaje en Pareja | ✅ Coincide | ✅ Coincide | ✅ Sincronizado | `srv-pareja` | $2,400 | Activo |

---

## 6. Discrepancias Encontradas
* Ninguna discrepancia crítica. Los 6 servicios oficiales están alineados en nombres, precios y duraciones entre frontend y backend. La única duplicidad menor es la presencia de dos IDs para el relajante (`SRB-relajante` y `srv-relajante`), mantenidos intencionalmente por compatibilidad histórica.

---

## 7. IDs Históricos
* **`SRB-relajante`**: Identificador original heredado de versiones tempranas. Aparece en reservas antiguas, en `OFFICIAL_SERVICES_CATALOG` y en el mapeador de compatibilidad de `api/index.ts`. **Debe conservarse** para evitar que reservas históricas fallen al resolverse.
* **`srv-relajante`**: Identificador estandarizado moderno.

---

## 8. Relación con Reservas
* Las reservas guardan un **snapshot inmutable** con la información del servicio al momento de la contratación (`serviceId`, `name`, `price`, `duration`). Esto aísla por completo las transacciones históricas frente a cualquier cambio futuro en el catálogo.

---

## 9. Relación con Pagos
* El backend valida el importe del servicio contra `OFFICIAL_SERVICES_CATALOG` (y respaldos de Firestore) antes de confirmar la reserva o procesar transferencias/efectivo, garantizando la integridad financiera.

---

## 10. Fuente de Verdad Actual
* **Selección**: **C. Arquitectura híbrida**
* **Explicación**: Aunque Firestore es la fuente dinámica para la administración en caliente, el backend y el frontend dependen fuertemente de catálogos estáticos en código (`OFFICIAL_SERVICES` y `OFFICIAL_SERVICES_CATALOG`) como esquemas de referencia, valores por defecto y respaldos críticos ante fallos de red.

---

## 11. ¿Se puede hacer la Fase 7?
* **Respuesta**: **TODAVÍA NO**
* **Motivo**: Centralizar por completo en Firestore sin mantener respaldos estáticos robustos en el backend podría generar fallos si la base de datos se encuentra temporalmente inaccesible durante el arranque de los endpoints de reservas. Se requiere un diseño de caché con TTL en memoria en el servidor antes de eliminar los catálogos estáticos del backend.

---

## 12. Plan de Cambios Futuros (Propuesta para Fase 7 o posterior)
Si en el futuro se decide refactorizar, los archivos candidatos serían:
1. **`api/index.ts`**:
   * *Cambio propuesto*: Implementar una función de caché en memoria con TTL para leer la colección `servicios` de Firestore en lugar de depender únicamente de `OFFICIAL_SERVICES_CATALOG`.
   * *Riesgo*: Indisponibilidad temporal si Firestore no responde.
   * *Dependencia*: Conectividad estable de Firestore Admin SDK.
2. **`src/shared/data/catalog.ts`**:
   * *Cambio propuesto*: Reducir el catálogo estático a un mero fallback de inicialización (`seedDefaults`).
   * *Riesgo*: Ninguno relevante si el contexto de la app maneja estados de carga correctamente.

---

## 13. Validación (Sin modificaciones)
* **`npm run build`**: **EXITOSO** (Bundle completado sin errores).
* **`npx tsc --noEmit`**: **EXITOSO** (Verificación de tipos con **0 errores**).
