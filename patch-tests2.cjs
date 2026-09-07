const fs = require('fs');
let code = fs.readFileSync('run-phase-2-6-tests.ts', 'utf8');

code = code.replace(/const cred = await createUserWithEmailAndPassword\(adminAuth, "admin@essenya.com", "AdminPassword123!"\);/g, `const cred = await createUserWithEmailAndPassword(adminAuth, "essenya222@gmail.com", "AdminPassword123!");`);
fs.writeFileSync('run-phase-2-6-tests.ts', code);
