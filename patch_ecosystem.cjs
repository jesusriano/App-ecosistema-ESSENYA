const fs = require('fs');
let content = fs.readFileSync('src/shared/context/EcosystemContext.tsx', 'utf8');

content = content.replace(
  /const response = await fetch\('\/api\/bookings', {/,
  "const response = await fetch('/api/bookings/atomic', {"
);

fs.writeFileSync('src/shared/context/EcosystemContext.tsx', content);
console.log("Patched EcosystemContext.tsx");
