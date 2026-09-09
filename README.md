# ESSENYA Ecosistema - Fase 2.5-R Corrección

## Comandos Principales

### Instalar dependencias
npm install

### Compilar Proyecto (Vite + Serverless)
npm run build

### Iniciar Servidor Local (Desarrollo)
npm run dev

### Iniciar Servidor (Producción)
npm start

### Despliegue en Vercel
Vercel Serverless Function configurada en `api/index.ts`. No requiere comandos adicionales, simplemente despliega en Vercel con el preset de Node.js o Vite (Vercel Node.js Builder).

### Reglas Firebase
- Storage: `storage.rules` (Restricciones MIME y Tamaño).
- Firestore: `firestore.rules` (Auditoría segura y reservas).
