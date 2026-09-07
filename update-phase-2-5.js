const fs = require('fs');
let code = fs.readFileSync('run-phase-2-5.ts', 'utf8');
// We will replace the main test logic with the new tests A to L.
// Find where tests start.
const startToken = "console.log(\"\\n==========================================\");\n  console.log(\"PRUEBA 1 — ACEPTACIÓN REAL\");";
const idx = code.indexOf(startToken);
if(idx > -1) {
    let before = code.substring(0, idx);
    let after = `
  const therapistEmail = \`therapist-e2e-\${Date.now()}@essenya.com\`;
  const therapistPassword = "TestPassword123!";
  const therapistUid = await getAuthenticatedUser(therapistEmail, therapistPassword);
  console.log(\`Therapist authenticated. Email: \${therapistEmail}, UID: \${therapistUid}\`);

  const otherTherapistEmail = \`other-therapist-\${Date.now()}@essenya.com\`;
  const otherTherapistUid = await getAuthenticatedUser(otherTherapistEmail, therapistPassword);
  console.log(\`Other Therapist authenticated. UID: \${otherTherapistUid}\`);

  // Register clients and therapists in their respective collections
  await signInWithEmailAndPassword(auth, activeAdminEmail, activeAdminPassword);
  await setDoc(doc(db, 'clientes', clientUid), { id: clientUid, name: 'Client Test', email: clientEmail });
  await setDoc(doc(db, 'terapeutas', therapistUid), { id: therapistUid, name: 'Therapist Test', email: therapistEmail });
  await setDoc(doc(db, 'terapeutas', otherTherapistUid), { id: otherTherapistUid, name: 'Other Therapist Test', email: otherTherapistEmail });
  
  const report: any = {};
  
  console.log("\\n==========================================");
  console.log("PRUEBAS DE SEGURIDAD 2.5");
  console.log("==========================================");

  // Setup booking
  await signInWithEmailAndPassword(auth, clientEmail, clientPassword);
  const bId = \`booking-sec-\${Date.now()}\`;
  const bookingRef = doc(db, 'reservas', bId);
  const bCode = generateBookingCode();
  const initBooking = createMockBooking(bId, bCode, clientUid);
  await setDoc(bookingRef, initBooking);
  console.log(\`1. Client created booking \${bCode} (ID: \${bId})\`);

  // PRUEBA A: Cliente intenta cambiar estado: pendiente -> aceptada
  try {
    await updateDoc(bookingRef, { state: 'aceptada' });
    console.log("❌ PRUEBA A FAILED: Client was allowed to change state to aceptada");
    report['pruebaA'] = "FALLÓ";
  } catch(e:any) {
    console.log("✅ PRUEBA A PASSED: Client blocked from changing state to aceptada.");
    report['pruebaA'] = "BLOQUEADO";
  }

  // PRUEBA B: Cliente intenta asignarse therapistId
  try {
    await updateDoc(bookingRef, { therapistId: 'some-id' });
    console.log("❌ PRUEBA B FAILED: Client allowed to assign therapist");
    report['pruebaB'] = "FALLÓ";
  } catch(e:any) {
    console.log("✅ PRUEBA B PASSED: Client blocked from assigning therapist.");
    report['pruebaB'] = "BLOQUEADO";
  }

  // PRUEBA C: Cliente intenta cambiar precio
  try {
    await updateDoc(bookingRef, { price: 1000 });
    console.log("❌ PRUEBA C FAILED: Client allowed to change price");
    report['pruebaC'] = "FALLÓ";
  } catch(e:any) {
    console.log("✅ PRUEBA C PASSED: Client blocked from changing price.");
    report['pruebaC'] = "BLOQUEADO";
  }

  // PRUEBA D: Cliente intenta modificar paymentStatus
  try {
    await updateDoc(bookingRef, { paymentStatus: 'pagado' });
    console.log("❌ PRUEBA D FAILED: Client allowed to change payment status");
    report['pruebaD'] = "FALLÓ";
  } catch(e:any) {
    console.log("✅ PRUEBA D PASSED: Client blocked from changing payment status.");
    report['pruebaD'] = "BLOQUEADO";
  }

  // PRUEBA E: Cliente intenta modificar motivoRechazo
  try {
    await updateDoc(bookingRef, { motivoRechazo: 'none' });
    console.log("❌ PRUEBA E FAILED: Client allowed to change motivoRechazo");
    report['pruebaE'] = "FALLÓ";
  } catch(e:any) {
    console.log("✅ PRUEBA E PASSED: Client blocked from changing motivoRechazo.");
    report['pruebaE'] = "BLOQUEADO";
  }

  // PRUEBA F: Cliente intenta modificar reserva de otro
  const otherClientEmail = \`client2-\${Date.now()}@essenya.com\`;
  const otherClientUid = await getAuthenticatedUser(otherClientEmail, clientPassword);
  await signInWithEmailAndPassword(auth, activeAdminEmail, activeAdminPassword);
  const bId2 = \`booking-sec-other-\${Date.now()}\`;
  const bookingRef2 = doc(db, 'reservas', bId2);
  await setDoc(bookingRef2, createMockBooking(bId2, generateBookingCode(), otherClientUid));
  
  await signInWithEmailAndPassword(auth, clientEmail, clientPassword);
  try {
    await updateDoc(bookingRef2, { reviewComment: 'good' });
    console.log("❌ PRUEBA F FAILED: Client allowed to modify another user's booking");
    report['pruebaF'] = "FALLÓ";
  } catch(e:any) {
    console.log("✅ PRUEBA F PASSED: Client blocked from modifying another user's booking.");
    report['pruebaF'] = "BLOQUEADO";
  }

  // PRUEBA G: Terapeuta intenta modificar reserva que NO le corresponde (assign themselves directly when it's pending is allowed by UNASSIGNED THERAPIST DISPATCH RULES, but changing reviewComment is not)
  await signInWithEmailAndPassword(auth, therapistEmail, therapistPassword);
  try {
    await updateDoc(bookingRef, { reviewComment: 'test' });
    console.log("❌ PRUEBA G FAILED: Therapist allowed to modify reviewComment");
    report['pruebaG'] = "FALLÓ";
  } catch(e:any) {
    console.log("✅ PRUEBA G PASSED: Therapist blocked from modifying unauthorized fields.");
    report['pruebaG'] = "BLOQUEADO";
  }

  // PRUEBA H: Terapeuta intenta modificar precio
  try {
    await updateDoc(bookingRef, { price: 999 });
    console.log("❌ PRUEBA H FAILED: Therapist allowed to modify price");
    report['pruebaH'] = "FALLÓ";
  } catch(e:any) {
    console.log("✅ PRUEBA H PASSED: Therapist blocked from modifying price.");
    report['pruebaH'] = "BLOQUEADO";
  }

  // Admin accepts the booking first so we can assign a therapist for next tests
  await signInWithEmailAndPassword(auth, activeAdminEmail, activeAdminPassword);
  await updateDoc(bookingRef, { state: 'aceptada' });
  console.log("✅ PRUEBA J PASSED: Admin accepts booking.");
  report['pruebaJ'] = "PERMITIDO";
  
  // Admin assigns therapist
  await updateDoc(bookingRef, { therapistId: therapistUid, therapistName: 'Therapist Test' });
  console.log("✅ PRUEBA L PASSED: Admin assigns therapist.");
  report['pruebaL'] = "PERMITIDO";

  // PRUEBA I: Another Therapist attempts to change assignment
  await signInWithEmailAndPassword(auth, otherTherapistEmail, therapistPassword);
  try {
    await updateDoc(bookingRef, { therapistId: otherTherapistUid });
    console.log("❌ PRUEBA I FAILED: Other Therapist allowed to reassign.");
    report['pruebaI'] = "FALLÓ";
  } catch(e:any) {
    console.log("✅ PRUEBA I PASSED: Other Therapist blocked from changing assignment.");
    report['pruebaI'] = "BLOQUEADO";
  }

  // Admin rejects another booking
  await signInWithEmailAndPassword(auth, activeAdminEmail, activeAdminPassword);
  const bId3 = \`booking-sec-reject-\${Date.now()}\`;
  const bookingRef3 = doc(db, 'reservas', bId3);
  await setDoc(bookingRef3, createMockBooking(bId3, generateBookingCode(), clientUid));
  await updateDoc(bookingRef3, { state: 'rechazada', motivoRechazo: 'Test Reject' });
  console.log("✅ PRUEBA K PASSED: Admin rejects booking.");
  report['pruebaK'] = "PERMITIDO";

  fs.writeFileSync('e2e-2-5-report.json', JSON.stringify(report, null, 2));
  console.log("Report saved to e2e-2-5-report.json");
  process.exit(0);
}

runTests().catch(e => { console.error(e); process.exit(1); });
`;
    code = before + after;
    fs.writeFileSync('run-phase-2-5.ts', code);
    console.log('Script updated.');
} else {
    console.log('Could not find injection point');
}
