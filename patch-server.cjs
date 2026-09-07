const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /\/\/\s*Fallback decode for valid structural payload[\s\S]*?return null;\s*\}/g;

code = code.replace(regex, `return null;\n    }`);
fs.writeFileSync('server.ts', code);
console.log("Patched server.ts");
