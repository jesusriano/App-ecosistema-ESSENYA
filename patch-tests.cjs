const fs = require('fs');
let code = fs.readFileSync('run-phase-2-6-tests.ts', 'utf8');

const regex = /const cred = await signInWithEmailAndPassword\(adminAuth, "admin@essenya\.com", "AdminPassword123!"\);/g;
code = code.replace(regex, `const cred = await signInWithEmailAndPassword(adminAuth, "essenya222@gmail.com", "AdminPassword123!");`);
fs.writeFileSync('run-phase-2-6-tests.ts', code);
