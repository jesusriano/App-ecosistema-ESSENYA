# Solución: Corrección de Renderizado en Módulo Terapeutas / Solicitudes (Administración)

## 1. Diagnóstico del Error (Pantalla Blanca / Negra)

Al acceder al módulo de **Administración → Terapeutas → Solicitudes / Expedientes** o al pulsar **"Revisar Documentos & Certificados"**, la pantalla quedaba en blanco o negro debido a varias causas concurrentes:

1. **Datos incompletos o ausentes en documentos de Firestore:**
   - Registros de terapeutas nuevos o postulados desde el formulario público no contenían de forma obligatoria los arreglos `documentos`, `especialidades` o `zonasCobertura`.
   - En el renderizado del listado (`TerapeutasPage.tsx`) y especialmente dentro del modal de evaluación (`showDocModal`), se invocaban métodos como `.map()` o accesos a `.length` sobre propiedades `undefined` (ej. `t.documentos.map` o `showDocModal.documentos.length`), arrojando un `TypeError: Cannot read properties of undefined` no atrapado por React, provocando el desmontaje completo del árbol de componentes.

2. **Incompatibilidad de estados legados:**
   - Ciertas terapeutas en Firestore contaban con estados como `'aprobada'`, `'activa'`, `'activos'`, `'en_revision'`, etc. que no encajaban en los tipos estrictos del sistema (`'activo' | 'pendiente' | 'inactivo' | 'bloqueado' | 'rechazado'`), desestabilizando los filtros y estilos dinámicos.

3. **Valores nulos / indefinidos en `fotografia` y fechas:**
   - La propiedad `fotografia` con valores `null`, `undefined` o cadenas vacías rompía la imagen o no aplicaba fallback.
   - `new Date(fechaSubida).toLocaleDateString()` provocaba errores o renderizados rotos cuando la fecha era una cadena inválida o nula.

4. **Errores de Firestore / Permisos (`permission-denied`):**
   - El listener `onSnapshot` no contaba con un manejo resiliente para fallos por reglas de seguridad o desconexión temporal, arrojando excepciones no capturadas al inicio del ciclo de vida del contexto.

---

## 2. Acciones y Correcciones Implementadas

### A. Capa de Datos y Normalización (`TherapistContext.tsx`)
- **Sanitización estricta (`sanitizeTherapist`):**
  - Garantiza que `documentos`, `especialidades`, `zonasCobertura`, `contactoEmergencia` y `serviciosActivos` siempre sean arreglos u objetos válidos (`[]` o estructura por defecto).
  - Normaliza estados equivalentes:
    - `'aprobada'`, `'aprobado'`, `'activo'`, `'activa'` → `'activo'`
    - `'pendiente'`, `'en_revision'`, `'solicitud'` → `'pendiente'`
    - `'suspendida'`, `'bloqueada'`, `'bloqueado'` → `'bloqueado'`
  - Asigna `DEFAULT_AVATAR` cuando `fotografia` es nula, vacía o inválida.
  - Asegura valores numéricos seguros para `puntuacion`, `resenasCount` y `serviciosCompletados`.
- **Limpieza para Firestore (`cleanForFirestore`):**
  - Remueve campos `undefined` recursivamente antes de enviar mutaciones a Firestore (`setDoc`, `updateDoc`).
- **Resiliencia en Firestore Listener (`onSnapshot`):**
  - Captura controlada de errores como `permission-denied`.
  - En caso de error o restricción, se almacena un mensaje en el estado `firestoreError` y se respalda la sesión con datos locales/iniciales sin provocar la caída de la aplicación.

### B. Capa de Visualización y Experiencia de Usuario (`TerapeutasPage.tsx`)
- **Mantenimiento estricto del diseño original:**
  - Se conservó intacta la estructura, paleta de colores (oro ESSENYA, fondos oscuros/claros, tipografía de lujo), botones, modales y textos.
- **Renderizado defensivo en listado y filtros:**
  - Los filtros (`todos`, `pendiente`, `activo`, `inactivo`, `bloqueado`, `rechazado`) ahora filtran terapeutas sanitizadas.
  - Enlaces de documentos y avatares cuentan con fallback inmediato y manejador `onError` en `<img>`.
  - Inclusión de función auxiliar `formatSafeDate` que previene excepciones por `Invalid Date`.
- **Blindaje del Modal de Evaluación (`showDocModal`):**
  - Envuelto en una instancia local de `ErrorBoundary` para aislar cualquier anomalía en el expediente sin afectar la vista principal.
  - El expediente se sanitiza antes de renderizarse.
  - Si un documento no tiene `fileUrl`, se informa con un toast amigable en lugar de fallar silenciosamente o causar un crash.
- **Aviso de Sincronización:**
  - Si Firestore reporta alguna advertencia o restricción de permisos, se despliega un banner informativo elegante en la cabecera del módulo, garantizando continuidad operativa.

---

## 3. Verificación de Compilación y Calidad

- **TypeScript / Linter:**
  - `npm run lint` (`tsc --noEmit`) finalizó exitosamente con **Código de Salida 0**.
- **Build de Producción:**
  - `compile_applet` (`npm run build`) completó satisfactoriamente la compilación de todos los módulos sin errores ni advertencias bloqueantes.
