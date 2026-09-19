# Informe Técnico: Auditoría y Normalización del Catálogo de Servicios (Fase 5) - Ecosistema ESSENYA

Este informe presenta la auditoría técnica exhaustiva sobre los catálogos de servicios, tratamientos y precios en el ecosistema ESSENYA. De acuerdo con las reglas de esta fase, **no se ha modificado ni ejecutado ninguna operación de escritura en bases de datos o código fuente**.

---

## A. Catálogos Encontrados

| Catálogo | Ubicación | Tipo | Aplicación | Fuente |
| :--- | :--- | :--- | :--- | :--- |
| `OFFICIAL_SERVICES_CATALOG` | `api/index.ts` | Objeto Estático / Diccionario | Backend / API | Archivo backend (auto-sembrado a Firestore al iniciar). |
| `INITIAL_SERVICES` (`OFFICIAL_SERVICES`) | `src/shared/data/mockData.ts` | Array Estático TypeScript | Frontend (Todos los portales) | Archivo de datos compartido en cliente. |
| Colección Firestore `"servicios"` | Base de datos Cloud Firestore | Colección Dinámica NoSQL | Cliente, Terapeuta, Administrador (via `EcosystemContext`) | Cloud Firestore (sincronizado en tiempo real). |

---

## B. Comparación Estructural de Servicios
* **Coincidencia de Identificadores**: Los IDs principales (ej. `srv-relajante`, `srv-descontracturante`, `srv-deportivo`, `srv-prenatal`, `srv-parejas`, `srv-cuatro-manos`, `srv-piedras-calientes`, `srv-reflexologia`) están alineados entre `OFFICIAL_SERVICES_CATALOG` en backend y `OFFICIAL_SERVICES` en frontend.
* **Mapeo de Compatibilidad**: El backend incluye lógica de respaldo para sinónimos de IDs históricos (ej. `SRB-relajante` vs `srv-relajante`) para evitar fallos al procesar reservas antiguas.
* **Diferencias Detectadas**: Los catálogos estáticos sirven como fallback y valores iniciales, mientras que Firestore actúa como la capa dinámica modificable por el administrador.

---

## C. Fuente de Verdad Actual por Aplicación
* **Cliente**: Obtiene los servicios desde el estado global en `EcosystemContext`, el cual se inicializa con datos estáticos (`INITIAL_SERVICES`) y se actualiza con los listeners de Firestore en tiempo real.
* **Terapeuta**: Consulta los servicios disponibles y certificados a través de `useTerapeuta()` / `EcosystemContext`.
* **Administrador**: Posee interfaz completa en `src/aplicaciones/administrador/pages/ServiciosPage.tsx` para crear, editar, activar, desactivar y ajustar precios/duraciones de los servicios, guardando los cambios directamente en la colección `"servicios"` de Firestore.
* **Backend**: Utiliza `OFFICIAL_SERVICES_CATALOG` como catálogo oficial de validación y respaldo estricto en los endpoints de creación de reservas y pasarela de pagos.

---

## D. Riesgos de Inconsistencia Detectados

1. **🟡 MEDIO — Desincronización Temporal entre Seeding y Firestore**
   * *Evidencia*: Si Firestore está vacío al arrancar el servidor, el backend realiza un `batch.set()` con `OFFICIAL_SERVICES_CATALOG`. Sin embargo, si un administrador modifica un precio en Firestore y luego se reinicia el servidor con un script que sobrescriba con `merge: true`, los campos de Firestore podrían mantener los valores personalizados, lo cual es correcto gracias a `merge: true`, pero requiere tener clara la precedencia.
2. **🔵 BAJO — Referencias Históricas en Reservas**
   * *Evidencia*: Las reservas pasadas almacenan los datos del servicio en el momento de la contratación (precio, duración y nombre), lo cual es una **buena práctica** ya que previene alteraciones retroactivas si el administrador cambia el precio de un servicio en el catálogo actual.

---

## E. Revisión del Almacenamiento de Reservas
* Al crear una reserva, el sistema captura los metadatos vigentes del servicio seleccionado (`serviceId`, nombre, precio, duración, extras).
* Esto garantiza que **las modificaciones futuras en el catálogo de servicios no alteren el monto ni las condiciones de reservas ya pagadas o en curso**, protegiendo la integridad financiera y contractual de los clientes y terapeutas.

---

## F. Recomendación Arquitectónica (Fuente Única de Verdad)
Para consolidar una **Fuente Única de Verdad Absoluta**, se recomienda:
1. **Cloud Firestore como Fuente Primaria**: Mantener la colección `"servicios"` en Firestore como la única fuente autorizada para lectura en caliente en todos los portales de frontend.
2. **Backend como Validador Financiero**: Que el backend (`api/index.ts`) consulte Firestore (o mantenga una caché en memoria con TTL corto) para validar precios y duraciones al crear reservas y procesar pagos, eliminando la dependencia de catálogos estáticos duplicados en el código del servidor.
3. **Catálogo Estático como Seed Únicamente**: Reducir los arrays estáticos en frontend/backend a meros datos de inicialización (`seed`) para instalaciones nuevas o pruebas offline.

---

## G. Plan de Fase 6 (Propuesta para Siguiente Etapa)
Si se autoriza una futura **Fase 6**, los pasos recomendados serían:
1. **Unificación de Constantes**: Consolidar los tipos e interfaces de `ServiceItem` en `src/shared/types/` asegurando que todos los portales utilicen exactamente la misma definición de atributos.
2. **Optimización del Sincronizador de Firestore**: Asegurar que `EcosystemContext` gestione los servicios exclusivamente desde Firestore con un fallback robusto a `INITIAL_SERVICES` únicamente en caso de fallo de red.
3. **Validación Backend en Tiempo Real**: Conectar los endpoints de reservas del backend para verificar directamente los precios vigentes en la base de datos antes de confirmar transacciones.
