const fs = require('fs');

function replaceInFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/'aceptado'/g, "'aceptada'");
  fs.writeFileSync(file, content);
}

const files = [
  'src/aplicaciones/cliente/app/Aplicacion.tsx',
  'src/aplicaciones/administrador/pages/ReservasPage.tsx',
  'src/aplicaciones/administrador/pages/DashboardPage.tsx',
  'src/shared/context/EcosystemContext.tsx',
  'src/shared/components/LiveTrackingMap.tsx',
  'src/shared/types/index.ts',
  'src/components/TherapistApp.tsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    replaceInFile(f);
    console.log("Updated " + f);
  }
});
