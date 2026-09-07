const fs = require('fs');
let code = fs.readFileSync('run-phase-2-6-tests.ts', 'utf8');

code = code.replace(/const cred = await createUserWithEmailAndPassword\(adminAuth, "admin.test.phase1@essenya.com", "AdminPassword123!"\);/g, `throw e;`);
fs.writeFileSync('run-phase-2-6-tests.ts', code);
