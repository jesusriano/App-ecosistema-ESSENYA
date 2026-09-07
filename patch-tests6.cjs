const fs = require('fs');
let code = fs.readFileSync('run-phase-2-6-tests.ts', 'utf8');
code = code.replace(/await setDoc/g, `console.log("doing setDoc..."); await setDoc`);
fs.writeFileSync('run-phase-2-6-tests.ts', code);
