# Informe Técnico: Normalización de Tipos e Interfaces de Servicios (Fase 6) - Ecosistema ESSENYA

Este informe presenta la auditoría técnica y el diseño de normalización para los servicios, tratamientos y precios en el ecosistema ESSENYA. De acuerdo con las reglas estrictas de esta fase, **no se ha modificado, eliminado ni alterado ningún archivo de código, base de datos, reserva o API**.

---

## A. Modelos Encontrados

| Modelo | Archivo | Campos Principales | Uso |
| :--- | :--- | :--- | :--- |
| `ServiceItem` | `src/shared/types/index.ts` | `id`, `name`, `tagline`, `description`, `basePrice`, `price90`, `price120`, `category`, `image`, `benefits`, `isActive`, `isVipFeatured` | Tipado principal para el frontend (Cliente, Terapeuta, Administrador). |
| `OFFICIAL_SERVICES_CATALOG` (Estructura interna) | `api/index.ts` | `id`, `name`, `nombre`, `tagline`, `description`, `basePrice`, `price`, `price90`, `price120`, `category`, `allowedDurations`, `estado`, `active` | Catálogo maestro y de respaldo en el backend Express. |
| Documentos en Colección `"servicios"` | Cloud Firestore | `id`, `name`, `nombre`, `description`, `basePrice`, `price90`, `price120`, `category`, `image`, `isActive`, etc. | Fuente dinámica gestionada por el Administrador y consumida por los portales. |

---

## B. Diferencias Estructurales

| Campo | `ServiceItem` (Frontend Types) | `OFFICIAL_SERVICES_CATALOG` (Backend) | Firestore (`servicios`) |
| :--- | :--- | :--- | :--- |
| Identificador | `id: string` | `id: string` (keys en Record) | Document ID + campo `id` |
| Nombre | `name: string` | `name` y `nombre` (duplicado para compatibilidad) | `name` / `nombre` |
| Precio | `basePrice`, `price90`, `price120` (Numéricos) | `basePrice`, `price`, `price90`, `price120` | `basePrice`, `price`, `price90`, `price120` |
| Duraciones | `allowedDurations?: number[]` | `allowedDurations: number[]` | `allowedDurations` (opcional o array) |
| Estado activo | `isActive?: boolean` | `estado: string`, `active: boolean` | `isActive` / `active` / `estado` |

---

## C. Modelo Canónico Proyectado (`Service`)

Para unificar futuras versiones del sistema, se propone el siguiente modelo canónico unificado:

```typescript
export interface CanonicalService {
  id: string;                      // Identificador único (ej. 'srv-relajante')
  name: string;                    // Nombre oficial del ritual o masaje
  tagline: string;                 // Subtítulo descriptivo corto
  description: string;             // Descripción detallada del tratamiento
  pricing: {
    basePrice: number;             // Precio base para 60 min (en moneda local, ej. MXN/USD)
    price90: number;               // Precio para 90 min
    price120: number;              // Precio para 120 min
  };
  category: 'Holístico' | 'Terapéutico' | 'Exclusivo' | 'Parejas';
  allowedDurations: number[];      // Duraciones permitidas [60, 90, 120]
  image: string;                   // URL o ruta del recurso visual
  iconName: string;                // Nombre del icono (Lucide icons)
  benefits: string[];              // Lista de beneficios terapéuticos
  recommendedFor: string;          // Indicación clínica/bienestar
  isActive: boolean;               // Estado operacional (true = disponible, false = oculto)
  requiresDualTherapist?: boolean; // Si requiere dos terapeutas (ej. 4 manos)
  isVipFeatured?: boolean;         // Destacado en portales VIP
}
```

---

## D. Estrategia de Identificadores
* **Estrategia Recomendada**: Utilizar siempre el formato estándar en minúsculas con prefijo (`srv-<nombre>`), asegurando que Firestore utilice exactamente ese mismo string como ID de documento (p. ej., documento `srv-relajante`).
* **Compatibilidad Histórica**: Mantener un mapa de remapeo en la capa de servicios (p. ej., `SRB-relajante` → `srv-relajante`) para evitar romper reservas antiguas que referencien identificadores legados.

---

## E. Precios y Moneda
* **Representación Actual**: Números enteros en moneda local (ej. `1100` para $1,100).
* **Recomendación Canónica**: Mantener valores numéricos puros (sin formatear a string con signos `$`), delegando el formateo visual a un helper de UI (`formatCurrency(amount)`). Esto asegura que cálculos de impuestos, extras y subtotales en pasarelas de pago no sufran errores de parseo.

---

## F. Duraciones
* **Representación Actual**: Valores numéricos en minutos (`60`, `90`, `120`).
* **Recomendación Canónica**: Mantener estrictamente números enteros en minutos.

---

## G. Estructura en Firestore
* La colección `"servicios"` debe almacenar documentos cuyo ID coincida con el `id` del servicio.
* Se deben unificar los campos de estado en un único booleano `isActive: boolean` (eliminando redundancias con strings como `estado: "activo"`).

---

## H. Integridad de Reservas (Snapshot Histórico)
* Al momento de crear una reserva, el sistema captura una copia inmutable (`snapshot`) de los datos del servicio seleccionado (`serviceId`, `name`, `price`, `duration`, `extras`).
* **Garantía**: Cualquier modificación futura de precios o nombres en el catálogo no afectará las reservas pasadas ni en curso, preservando la seguridad jurídica y contable.

---

## I. Análisis del Backend (`api/index.ts`) y MockData
* `OFFICIAL_SERVICES_CATALOG` en el backend sirve como validador de seguridad en endpoints críticos de reservas y pasarela de pagos, además de actuar como fuente de siembra inicial (`seed`) para Firestore.
* `INITIAL_SERVICES` en `mockData.ts` actúa como respaldo en memoria y datos iniciales para el estado del cliente.

---

## J. Riesgos de Migración Futura
* **🔴 CRÍTICO**: Alterar los IDs de los servicios en Firestore rompería las consultas de reservas históricas que dependan del `serviceId`. (Mitigación: Mantener IDs estables y usar mapeos de compatibilidad).
* **🟠 ALTO**: Desalineación entre los precios validados en el backend y los mostrados en el frontend. (Mitigación: Hacer que el backend consulte directamente Firestore o mantenga sincronizado el catálogo oficial).

---

## K. Plan de Migración Futura (Propuesta)
1. Consolidar el tipo `CanonicalService` en `src/shared/types/index.ts`.
2. Actualizar el backend para que valide contra Firestore o un catálogo tipado idéntico.
3. Migrar gradualmente los componentes de UI para utilizar la estructura de precios anidada (`pricing.basePrice`) mediante adaptadores compatibles.
4. Validar integridad con emuladores de Firestore y pruebas automatizadas (`npm run build`).
