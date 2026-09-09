import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import fs from 'fs';

async function main() {
  const testEnv = await initializeTestEnvironment({
    projectId: 'essenya-ecosistema-test',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') }
  });

  console.log("--- STARTING FIRESTORE RULES TESTS ---");

  // TEST: Private data inaccessible
  const unauthDb = testEnv.unauthenticatedContext().firestore();
  try {
    await assertFails(unauthDb.collection('clientes').doc('cliente123').get());
    console.log("✅ TEST: Unauthenticated user cannot read client data");
  } catch (e) {
    console.log("❌ TEST FAILED: Unauth can read client data", e);
  }

  // TEST: Therapist pending can read/write their own documents
  const pendingTherapist = testEnv.authenticatedContext('therapist123', {
    email: 'therapist@test.com'
  });
  const tDb = pendingTherapist.firestore();
  
  // Setup therapist doc as pending
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('terapeutas').doc('therapist123').set({
      estado: 'pendiente',
      rol: 'terapeuta',
      documentos: []
    });
  });

  try {
    await assertSucceeds(tDb.collection('terapeutas').doc('therapist123').update({
      documentos: [{ id: '1', url: 'test.pdf' }]
    }));
    console.log("✅ TEST: Pending therapist can update their own documents");
  } catch (e) {
    console.log("❌ TEST FAILED: Pending therapist cannot update documents", e);
  }

  // TEST: Client rating reservation
  const clientCtx = testEnv.authenticatedContext('client123', { email: 'client@test.com' });
  const cDb = clientCtx.firestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('reservas').doc('reserva123').set({
      clientId: 'client123',
      therapistId: 'therapist456',
      state: 'servicio_finalizado'
    });
  });

  try {
    await assertSucceeds(cDb.collection('reservas').doc('reserva123').update({
      rating: 5,
      reviewComment: 'Excellent'
    }));
    console.log("✅ TEST: Client can rate their completed reservation");
  } catch (e) {
    console.log("❌ TEST FAILED: Client cannot rate reservation", e);
  }

  try {
    await assertFails(tDb.collection('reservas').doc('reserva123').update({
      rating: 5
    }));
    console.log("✅ TEST: Unauthorized user (therapist) cannot rate client's reservation");
  } catch (e) {
    console.log("❌ TEST FAILED: Unauthorized user rated reservation", e);
  }

  // TEST: Admin Log spoofing
  try {
    await assertFails(tDb.collection('audit_logs').doc('log1').set({
      actorId: 'admin999',
      action: 'delete'
    }));
    console.log("✅ TEST: Non-admin cannot spoof actorId in audit_logs");
  } catch (e) {
    console.log("❌ TEST FAILED: Non-admin spoofed actorId", e);
  }
  
  try {
    await assertSucceeds(tDb.collection('audit_logs').doc('log2').set({
      actorId: 'therapist123',
      action: 'update_profile'
    }));
    console.log("✅ TEST: User can write audit_log with their own actorId");
  } catch (e) {
    console.log("❌ TEST FAILED: User could not write own audit_log", e);
  }


  await testEnv.cleanup();
}

main().catch(console.error);
