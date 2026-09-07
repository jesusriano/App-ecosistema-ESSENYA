const fs = require('fs');
let code = fs.readFileSync('run-phase-2-6-tests.ts', 'utf8');

code = code.replace(/await setDoc\(doc\(adminDb, 'users', activeTUid/g, `console.log("Setting activeTUid user...");\n  await setDoc(doc(adminDb, 'users', activeTUid`);
code = code.replace(/await setDoc\(doc\(adminDb, 'terapeutas', activeTUid/g, `console.log("Setting activeTUid terapeuta...");\n  await setDoc(doc(adminDb, 'terapeutas', activeTUid`);
code = code.replace(/await setDoc\(doc\(adminDb, 'users', pendingTUid/g, `console.log("Setting pendingTUid user...");\n  await setDoc(doc(adminDb, 'users', pendingTUid`);
code = code.replace(/await setDoc\(doc\(adminDb, 'administradores', adminUid\), \{ test: true \};/g, `console.log("Setting adminUid...");\n    await setDoc(doc(adminDb, 'administradores', adminUid), { test: true });`);
fs.writeFileSync('run-phase-2-6-tests.ts', code);
