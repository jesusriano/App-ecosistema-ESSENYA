import fs from 'fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

async function main() {
  let testEnv;
  try {
    testEnv = await initializeTestEnvironment({
      projectId: 'essenya-ecosistema-test',
      firestore: { 
        rules: fs.readFileSync('firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: 8081
      }
    });
  } catch (err) {
    if (err.message && (err.message.includes('java') || err.message.includes('emulator must be specified'))) {
      console.log('❌ TEST ENVIRONMENT: Emulator or Java is missing. Tests MUST fail (exit 1).');
      console.log('Error details:', err.message);
      process.exit(1);
    }
    console.error(err);
    process.exit(1);
  }
  
  console.log("--- STARTING FIRESTORE RULES TESTS ---");
  let passed = true;

  // 1. Cliente intentando convertirse en administrador
  const clientAuth = { uid: 'cliente123', token: { email: 'client@test.com' } };
  const clientDb = testEnv.authenticatedContext('cliente123', { email: 'client@test.com' }).firestore();
  
  try {
    await assertFails(clientDb.collection('users').doc('cliente123').set({ uid: 'cliente123', rol: 'cliente', role: 'administrador' }));
    await assertFails(clientDb.collection('users').doc('cliente123').update({ role: 'administrador' }));
    console.log("✅ TEST: Cliente intentando convertirse en administrador (Blocked)");
  } catch (e) {
    console.error("❌ TEST FAILED: Cliente se convirtió en administrador", e); passed = false;
  }
  
  try {
    await assertFails(clientDb.collection('users').doc('cliente123').update({ role: 'admin' }));
    await assertFails(clientDb.collection('users').doc('cliente123').update({ admin: true }));
    await assertFails(clientDb.collection('users').doc('cliente123').update({ nivelAcceso: 'superadmin' }));
    console.log("✅ TEST: Cliente intentando escalación con variantes admin (Blocked)");
  } catch (e) {
    console.error("❌ TEST FAILED: Cliente logró escalación administrativa", e); passed = false;
  }

  // 2. Cliente modificando precio
  // 3. Cliente modificando estado de pago
  // 4. Cliente asignándose una terapeuta
  const reservaId = 'reserva123';
  await testEnv.withSecurityRulesDisabled(async context => {
    await context.firestore().collection('reservas').doc(reservaId).set({
      clientId: 'cliente123', therapistId: 'terapeuta123', state: 'pendiente', price: 100, paymentStatus: 'pendiente'
    });
  });

  try {
    await assertFails(clientDb.collection('reservas').doc(reservaId).update({ price: 10 }));
    console.log("✅ TEST: Cliente modificando precio (Blocked)");
  } catch(e) { console.error("❌ TEST FAILED", e); passed = false; }

  try {
    await assertFails(clientDb.collection('reservas').doc(reservaId).update({ paymentStatus: 'pagado' }));
    console.log("✅ TEST: Cliente modificando estado de pago (Blocked)");
  } catch(e) { console.error("❌ TEST FAILED", e); passed = false; }

  try {
    await assertFails(clientDb.collection('reservas').doc(reservaId).update({ therapistId: 'terapeuta999' }));
    console.log("✅ TEST: Cliente asignándose una terapeuta (Blocked)");
  } catch(e) { console.error("❌ TEST FAILED", e); passed = false; }

  // 6. Terapeuta pendiente intentando aceptar una reserva
  // 7. Terapeuta leyendo un cliente no asignado
  // 8. Terapeuta modificando su aprobación
  // 9. Terapeuta modificando su puntuación
  // 10. Terapeuta modificando sus servicios completados
  await testEnv.withSecurityRulesDisabled(async context => {
    await context.firestore().collection('users').doc('terapeuta_pend').set({ uid: 'terapeuta_pend', rol: 'terapeuta' });
    await context.firestore().collection('terapeutas').doc('terapeuta_pend').set({ uid: 'terapeuta_pend', estado: 'pendiente' });
    await context.firestore().collection('clientes').doc('cliente999').set({ uid: 'cliente999', name: 'Other client' });
  });

  const pendingTherapistDb = testEnv.authenticatedContext('terapeuta_pend', { email: 'therapist@test.com' }).firestore();

  try {
    await assertFails(pendingTherapistDb.collection('reservas').doc(reservaId).update({ state: 'aceptada', therapistId: 'terapeuta_pend' }));
    console.log("✅ TEST: Terapeuta pendiente intentando aceptar una reserva (Blocked)");
  } catch(e) { console.error("❌ TEST FAILED", e); passed = false; }

  try {
    await assertFails(pendingTherapistDb.collection('clientes').doc('cliente999').get());
    console.log("✅ TEST: Terapeuta leyendo un cliente no asignado (Blocked)");
  } catch(e) { console.error("❌ TEST FAILED", e); passed = false; }

  try {
    await assertFails(pendingTherapistDb.collection('terapeutas').doc('terapeuta_pend').update({ estadoAprobacion: 'aprobado' }));
    console.log("✅ TEST: Terapeuta modificando su aprobación (Blocked)");
  } catch(e) { console.error("❌ TEST FAILED", e); passed = false; }

  try {
    await assertFails(pendingTherapistDb.collection('terapeutas').doc('terapeuta_pend').update({ puntuacion: 5.0 }));
    console.log("✅ TEST: Terapeuta modificando su puntuación (Blocked)");
  } catch(e) { console.error("❌ TEST FAILED", e); passed = false; }

  try {
    await assertFails(pendingTherapistDb.collection('terapeutas').doc('terapeuta_pend').update({ serviciosCompletados: 100 }));
    console.log("✅ TEST: Terapeuta modificando sus servicios completados (Blocked)");
  } catch(e) { console.error("❌ TEST FAILED", e); passed = false; }

  // 11. Creación de reserva por un cliente (Blocked)
  await testEnv.withSecurityRulesDisabled(async context => {
    await context.firestore().collection('users').doc('cliente123').set({ uid: 'cliente123', rol: 'cliente' });
  });

  try {
    await assertFails(clientDb.collection('reservas').doc('nueva_reserva_valida').set({
      clientId: 'cliente123',
      state: 'pendiente',
      price: 350,
      total: 350,
      paymentStatus: 'pendiente',
      createdAt: new Date().toISOString()
    }));
    console.log("✅ TEST: Creación directa de reserva por cliente (Blocked as expected)");
  } catch(e) { console.error("❌ TEST FAILED: Cliente pudo crear reserva o error inesperado", e); passed = false; }

  // 12. Transición válida de estado: Terapeuta activo acepta reserva pendiente (Allowed)
  await testEnv.withSecurityRulesDisabled(async context => {
    await context.firestore().collection('users').doc('terapeuta_act').set({ uid: 'terapeuta_act', rol: 'terapeuta' });
    await context.firestore().collection('terapeutas').doc('terapeuta_act').set({ uid: 'terapeuta_act', estado: 'activo' });
    await context.firestore().collection('reservas').doc('reserva_para_aceptar').set({
      clientId: 'cliente123',
      state: 'pendiente',
      price: 350,
      total: 350,
      paymentStatus: 'pendiente'
    });
  });

  const activeTherapistDb = testEnv.authenticatedContext('terapeuta_act', { email: 'therapist_act@test.com' }).firestore();
  try {
    await assertSucceeds(activeTherapistDb.collection('reservas').doc('reserva_para_aceptar').update({
      state: 'aceptada',
      therapistId: 'terapeuta_act',
      therapistName: 'Valeria Mendoza',
      therapistPhone: '5512345678',
      therapistPhoto: 'url',
      updatedAt: new Date().toISOString()
    }));
    console.log("✅ TEST: Transición de estado válida: Terapeuta activo acepta reserva pendiente (Allowed)");
  } catch(e) { console.error("❌ TEST FAILED: Terapeuta activo no pudo aceptar una reserva válida", e); passed = false; }

  // 13. Attack Tests
  const attackDb = clientDb;
  const attackReserva = 'reserva_attack';
  
  await testEnv.withSecurityRulesDisabled(async context => {
    await context.firestore().collection('reservas').doc(attackReserva).set({
      clientId: 'cliente123',
      state: 'pendiente',
      price: 1800,
      total: 1800,
      paymentStatus: 'pendiente'
    });
  });

  try {
    await assertFails(attackDb.collection('reservas').doc('new_attack').set({ clientId: 'cliente123', state: 'pendiente', total: 0 }));
    console.log("✅ ATTACK TEST: Reserva creada directo por cliente bloqueada (create general)");
  } catch(e) { console.error("❌ ATTACK TEST FAILED: Cliente pudo crear reserva", e); passed = false; }

  try {
    await assertFails(attackDb.collection('reservas').doc(attackReserva).update({ price: 500 }));
    console.log("✅ ATTACK TEST: Precio modificado por cliente (Blocked)");
  } catch(e) { console.error("❌ ATTACK TEST FAILED: Cliente modificó precio", e); passed = false; }

  try {
    await assertFails(attackDb.collection('reservas').doc(attackReserva).update({ paymentStatus: 'pagado' }));
    console.log("✅ ATTACK TEST: paymentStatus=pagado por cliente (Blocked)");
  } catch(e) { console.error("❌ ATTACK TEST FAILED: Cliente modificó pago", e); passed = false; }

  try {
    await assertFails(attackDb.collection('reservas').doc(attackReserva).update({ discount: 500 }));
    console.log("✅ ATTACK TEST: descuento inventado por cliente (Blocked)");
  } catch(e) { console.error("❌ ATTACK TEST FAILED: Cliente aplicó descuento falso", e); passed = false; }

  try {
    await assertFails(attackDb.collection('reservas').doc(attackReserva).update({ couponCode: 'FAKE100' }));
    console.log("✅ ATTACK TEST: cupón falso por cliente (Blocked)");
  } catch(e) { console.error("❌ ATTACK TEST FAILED: Cliente usó cupón falso", e); passed = false; }

  try {
    await assertFails(attackDb.collection('reservas').doc(attackReserva).update({ therapistId: 'terapeutaX' }));
    console.log("✅ ATTACK TEST: terapeuta asignada por cliente (Blocked)");
  } catch(e) { console.error("❌ ATTACK TEST FAILED: Cliente asignó terapeuta", e); passed = false; }

  try {
    await assertFails(attackDb.collection('reservas').doc(attackReserva).update({ state: 'completada' }));
    console.log("✅ ATTACK TEST: salto directo de estados por cliente (Blocked)");
  } catch(e) { console.error("❌ ATTACK TEST FAILED: Cliente alteró estado del servicio", e); passed = false; }

  try {
    await assertFails(attackDb.collection('users').doc('cliente123').update({ saldo: 99999 }));
    console.log("✅ ATTACK TEST: cliente modificando saldo (Blocked)");
  } catch(e) { console.error("❌ ATTACK TEST FAILED: Cliente modificó saldo", e); passed = false; }

  // 14. Invalid state transitions (Therapist State Machine)
  await testEnv.withSecurityRulesDisabled(async context => {
    await context.firestore().collection('reservas').doc('reserva_state_test').set({
      clientId: 'cliente123',
      therapistId: 'terapeuta_act',
      state: 'aceptada',
      price: 350,
      total: 350,
      paymentStatus: 'pendiente'
    });
  });

  try {
    // Jump from aceptada to servicio_finalizado
    await assertFails(activeTherapistDb.collection('reservas').doc('reserva_state_test').update({
      state: 'servicio_finalizado',
      updatedAt: new Date().toISOString()
    }));
    // Backwards jump
    await assertFails(activeTherapistDb.collection('reservas').doc('reserva_state_test').update({
      state: 'pendiente',
      updatedAt: new Date().toISOString()
    }));
    console.log("✅ ATTACK TEST: Terapeuta realizando saltos inválidos de estado (Blocked)");
  } catch(e) { console.error("❌ ATTACK TEST FAILED: Terapeuta burló la máquina de estados", e); passed = false; }

  // Test admin de prueba "admin@essenya.com" now that it is removed from firestore rules? Wait, we removed it from api/index.ts. 
  // Let's remove it from firestore.rules too!
  
  if (!passed) process.exit(1);
  console.log("✅ All Firestore rules tests passed successfully!");
  process.exit(0);
}

main();
