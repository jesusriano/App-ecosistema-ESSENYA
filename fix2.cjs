const fs = require('fs');
let code = fs.readFileSync('run-phase-2-5.ts', 'utf8');

const toReplace = `  // Register clients and therapists in their respective collections
  await signInWithEmailAndPassword(auth, activeAdminEmail, activeAdminPassword);
  await setDoc(doc(db, 'clientes', clientUid), { id: clientUid, nombre: 'Client Test', correo: clientEmail, rol: 'cliente' });
  await setDoc(doc(db, 'users', clientUid), { id: clientUid, name: 'Client Test', rol: 'cliente' });
  
  await setDoc(doc(db, 'terapeutas', therapistUid), { id: therapistUid, nombre: 'Therapist Test', correo: therapistEmail, rol: 'terapeuta' });
  await setDoc(doc(db, 'users', therapistUid), { id: therapistUid, name: 'Therapist Test', rol: 'terapeuta' });
  
  await setDoc(doc(db, 'terapeutas', otherTherapistUid), { id: otherTherapistUid, nombre: 'Other Therapist Test', correo: otherTherapistEmail, rol: 'terapeuta' });
  await setDoc(doc(db, 'users', otherTherapistUid), { id: otherTherapistUid, name: 'Other Therapist Test', rol: 'terapeuta' });`;

const replacement = `  // Register clients and therapists in their respective collections
  await signInWithEmailAndPassword(auth, clientEmail, clientPassword);
  await setDoc(doc(db, 'clientes', clientUid), { id: clientUid, nombre: 'Client Test', correo: clientEmail, rol: 'cliente' });
  await setDoc(doc(db, 'users', clientUid), { uid: clientUid, id: clientUid, name: 'Client Test', rol: 'cliente' });
  
  await signInWithEmailAndPassword(auth, therapistEmail, therapistPassword);
  await setDoc(doc(db, 'terapeutas', therapistUid), { id: therapistUid, nombre: 'Therapist Test', correo: therapistEmail, rol: 'terapeuta' });
  await setDoc(doc(db, 'users', therapistUid), { uid: therapistUid, id: therapistUid, name: 'Therapist Test', rol: 'terapeuta' });
  
  await signInWithEmailAndPassword(auth, otherTherapistEmail, therapistPassword);
  await setDoc(doc(db, 'terapeutas', otherTherapistUid), { id: otherTherapistUid, nombre: 'Other Therapist Test', correo: otherTherapistEmail, rol: 'terapeuta' });
  await setDoc(doc(db, 'users', otherTherapistUid), { uid: otherTherapistUid, id: otherTherapistUid, name: 'Other Therapist Test', rol: 'terapeuta' });`;

code = code.replace(toReplace, replacement);
fs.writeFileSync('run-phase-2-5.ts', code);
