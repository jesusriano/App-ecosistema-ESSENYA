# Corrección de Terapeutas en Pruebas Reales

Este documento detalla el diagnóstico y las soluciones implementadas para el flujo de Terapeutas en el Ecosistema **ESSENYA** para garantizar un entorno estable y robusto durante la fase de **Pruebas Reales Controladas**.

---

## 1. Carga Real de Documentos de Terapeuta
* **Implementación**: Se integró completamente la carga física a Firebase Storage utilizando la API `uploadBytesResumable` y `getDownloadURL` dentro de `DocumentVerificationSection.tsx`.
* **Formatos Soportados**: PDF, JPG, JPEG, PNG.
* **Límite de Tamaño**: Se configuró y validó un límite estricto de **15 MB** por archivo.
* **Metadatos en Firestore**: Al subir documentos, se guardan en el arreglo de documentos de la terapeuta en Firestore con los campos solicitados:
  * `id` (autogenerado con timestamp de subida).
  * `tipo` (tipo de documento: ine, licencia, certificado, etc.).
  * `nombreArchivo` (nombre sanitizado del archivo).
  * `fileUrl` (URL pública de descarga definitiva de Firebase Storage).
  * `storagePath` (ruta del objeto en el bucket: `terapeutas/{uid}/documentos/{timestamp}-{filename}`).
  * `mimeType` (detectado o inferido automáticamente).
  * `fechaCarga` (fecha y hora ISO actual).
  * `estadoRevision` / `estado` (inicializado como `"pendiente"`).

---

## 2. Carga Real de Fotografía de Perfil
* **Ruta de Almacenamiento**: `terapeutas/{uid}/perfil/foto-perfil.{ext}`
* **Persistencia**: Se reemplazó el almacenamiento local temporal en Base64 por una carga física a Firebase Storage en tiempo real. 
* **Sincronización Inmediata**: Al subir la foto de perfil en el portal, la URL de descarga definitiva y el path de almacenamiento se actualizan inmediatamente en:
  1. Colección `terapeutas/{uid}` (documento maestro).
  2. Colección `users/{uid}` (perfil global de autenticación).
  3. Colección `terapeutas_publicos/{uid}` (catálogo público dinámico, si el documento ya fue creado).

---

## 3. Diagnóstico y Solución de `auth/user-not-found`
### Diagnóstico:
El error `Firebase: Error (auth/user-not-found)` ocurría debido a que se intentaban realizar operaciones de autenticación (como enviar un enlace de restablecimiento o cambiar la contraseña) en cuentas creadas manualmente en Firestore que **no tenían una cuenta real en Firebase Authentication**, o bien porque el administrador aprobaba una solicitud sin haber comprobado antes si existía el usuario en Firebase Auth.

### Solución:
1. **Aislamiento de Catálogos**: Al auto-registrarse una terapeuta, ya **no se crea un registro ficticio o activo en `terapeutas_publicos`** de forma prematura. Permanece únicamente en estado `pendiente` dentro de las colecciones internas hasta que se apruebe.
2. **Validación Segura antes de Aprobar**: Al presionar "Aprobar Solicitud", el frontend realiza una petición segura a un nuevo endpoint del servidor: `/api/admin/verify-therapist-auth`. 
3. **Comportamiento Seguro de Aprobación**:
   * Si la cuenta **SÍ existe** en Firebase Auth, se conserva y se actualiza el estado de la terapeuta a `"activo"`.
   * Si la cuenta **NO existe** y es de **auto-registro**, el sistema deniega la aprobación, arrojando un error administrativo de integridad para evitar fingir un éxito falso.
   * Si la cuenta **NO existe** y es creada desde el panel de administración, el backend la aprovisiona de inmediato de forma segura en Firebase Authentication utilizando el Firebase Admin SDK, genera una contraseña temporal y sincroniza los documentos de Firestore migrando cualquier UID local temporal al UID definitivo devuelto por Firebase Auth.

---

## 4. Pruebas de Integridad y Validación
* **Linter**: La ejecución de `npm run lint` arrojó `0` errores de tipos y sintaxis.
* **Build**: La compilación de producción con `npm run build` se completó con éxito (Exit Code 0).
* **Despliegue**: El servidor backend se reinició correctamente y está listo para recibir peticiones reales.
