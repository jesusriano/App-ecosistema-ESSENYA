const fs = require('fs');
let code = fs.readFileSync('run-phase-2-6-tests.ts', 'utf8');

code = code.replace(/"essenya222@gmail.com"/g, `"admin.test.phase1@essenya.com"`);
fs.writeFileSync('run-phase-2-6-tests.ts', code);
