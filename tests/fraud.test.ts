import fs from 'fs';
import http from 'http';
import express from 'express';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

// Ensure test environment variables are set before importing api
process.env.NODE_ENV = 'test';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8081';
process.env.GCLOUD_PROJECT = 'essenya-ecosistema';

let server: http.Server;
let testEnv: any;

async function runFraudTestSuite() {
  console.log("==========================================================");
  console.log("🛡️  SUITE DE PRUEBAS DE ROBUSTEZ Y FRAUDE ESSENYA BACKEND");
  console.log("==========================================================\n");

  // 1. Initialize Test Environment with Firestore Rules
  try {
    testEnv = await initializeTestEnvironment({
      projectId: 'essenya-ecosistema',
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8'),
        host: '127.0.0.1',
        port: 8081
      }
    });
  } catch (err: any) {
    console.error("❌ No se pudo conectar al emulador de Firestore:", err.message);
    process.exit(1);
  }

  // 2. Start Express API server for endpoints
  const apiApp = (await import('../api/index.js')).default;
  const app = express();
  app.use(apiApp);
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3002, resolve));
  const BASE_URL = 'http://localhost:3002';

  let allPassed = true;

  try {
    // =========================================================================
    // GRUPO 1: INTENTO DE MODIFICACIÓN DIRECTA DE SALDOS DESDE EL CLIENTE
    // =========================================================================
    console.log("--- 1. VECTOR DE FRAUDE: MODIFICACIÓN DIRECTA DESDE EL CLIENTE ---");

    const maliciousUid = 'client_malicious_1';
    const clientDb = testEnv.authenticatedContext(maliciousUid, { email: 'hacker@test.com' }).firestore();

    // 1a. Intento de crear tarjeta de saldo falso en su propia billetera
    try {
      await assertFails(
        clientDb.collection('clientes').doc(maliciousUid).collection('billetera').doc('tarjeta_falsa').set({
          code: 'HACK-9999',
          title: 'Saldo Ilimitado Falso',
          initialAmount: 999999,
          currentBalance: 999999,
          status: 'activa',
          createdAt: new Date().toISOString()
        })
      );
      console.log("  ✅ 1a. Creación directa de saldo en subcolección 'billetera' BLOQUEADA por Security Rules.");
    } catch (e) {
      console.error("  ❌ 1a FAILED: El cliente pudo crear saldo falso en su billetera.", e);
      allPassed = false;
    }

    // 1b. Intento de inyectar crédito falso directamente en el 'wallet_ledger'
    try {
      await assertFails(
        clientDb.collection('clientes').doc(maliciousUid).collection('wallet_ledger').doc('transaccion_falsa').set({
          type: 'CREDIT',
          amount: 50000,
          source: 'FAKE_INJECTION',
          timestamp: new Date().toISOString(),
          description: 'Fraude de inyección de fondos'
        })
      );
      console.log("  ✅ 1b. Inyección directa de crédito en 'wallet_ledger' BLOQUEADA por Security Rules.");
    } catch (e) {
      console.error("  ❌ 1b FAILED: El cliente pudo inyectar transacciones en el ledger.", e);
      allPassed = false;
    }

    // 1c. Intento de modificar saldo o privilegios en documento de usuario
    try {
      await assertFails(
        clientDb.collection('users').doc(maliciousUid).set({
          uid: maliciousUid,
          email: 'hacker@test.com',
          role: 'cliente',
          saldo: 999999,
          membershipTier: 'DIAMANTE'
        })
      );
      console.log("  ✅ 1c. Alteración de saldo o nivel en 'users' BLOQUEADA por Security Rules.");
    } catch (e) {
      console.error("  ❌ 1c FAILED: El cliente pudo alterar campos restringidos en users.", e);
      allPassed = false;
    }

    // 1d. Intento de crear o alterar tarjetas de regalo globales directamente
    try {
      await assertFails(
        clientDb.collection('gift_cards').doc('fake_global_card').set({
          code: 'REGALO-GRATIS',
          initialAmount: 10000,
          currentBalance: 10000,
          status: 'activa',
          redeemed: false
        })
      );
      console.log("  ✅ 1d. Creación directa en colección global 'gift_cards' BLOQUEADA por Security Rules.");
    } catch (e) {
      console.error("  ❌ 1d FAILED: El cliente pudo crear tarjetas globales.", e);
      allPassed = false;
    }


    // =========================================================================
    // GRUPO 2: INTENTO DE DOBLE CANJE DE TARJETA DE REGALO (CONCURRENTE Y SECUENCIAL)
    // =========================================================================
    console.log("\n--- 2. VECTOR DE FRAUDE: DOBLE CANJE DE TARJETA DE REGALO ---");

    const victimCardCode = 'REGALO-ANTIFRAUD-500';
    const clientVictim = 'client_redeem_victim';

    // Seed tarjeta legítima activa en base de datos usando contexto admin
    await testEnv.withSecurityRulesDisabled(async (context: any) => {
      const db = context.firestore();
      await db.collection('gift_cards').doc('card_antifraud_500').set({
        code: victimCardCode,
        title: 'Certificado de Bienestar $500',
        initialAmount: 500,
        currentBalance: 500,
        status: 'activa',
        redeemed: false,
        expirationDate: '2030-12-31',
        createdAt: new Date().toISOString()
      });

      await db.collection('clientes').doc(clientVictim).set({
        uid: clientVictim,
        name: 'Cliente Prueba Canje',
        phone: '5551234567'
      });
    });

    // Disparar dos solicitudes de canje simultáneas (Race Condition Attack)
    console.log("  -> Disparando 2 solicitudes de canje simultáneas para el mismo código...");
    const [resRedeem1, resRedeem2] = await Promise.all([
      fetch(`${BASE_URL}/api/wallet/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token-${clientVictim}`
        },
        body: JSON.stringify({ code: victimCardCode })
      }),
      fetch(`${BASE_URL}/api/wallet/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token-${clientVictim}`
        },
        body: JSON.stringify({ code: victimCardCode })
      })
    ]);

    const status1 = resRedeem1.status;
    const status2 = resRedeem2.status;
    const data1 = await resRedeem1.json();
    const data2 = await resRedeem2.json();

    const successCount = (status1 === 200 ? 1 : 0) + (status2 === 200 ? 1 : 0);
    const failCount = (status1 === 400 ? 1 : 0) + (status2 === 400 ? 1 : 0);

    if (successCount === 1 && failCount === 1) {
      console.log("  ✅ 2a. Canje concurrente: Exactamente 1 solicitud tuvo éxito (200) y la otra fue rechazada (400).");
      const rejectedMsg = status1 === 400 ? data1.error : data2.error;
      console.log(`     Mensaje de rechazo capturado: "${rejectedMsg}"`);
    } else {
      console.error("  ❌ 2a FAILED: Ambas solicitudes tuvieron éxito o estado inesperado:", { status1, status2, data1, data2 });
      allPassed = false;
    }

    // Verificar en base de datos que solo se acreditó una tarjeta y un ledger
    await testEnv.withSecurityRulesDisabled(async (context: any) => {
      const db = context.firestore();
      const walletSnap = await db.collection('clientes').doc(clientVictim).collection('billetera').get();
      const ledgerSnap = await db.collection('clientes').doc(clientVictim).collection('wallet_ledger').get();
      const cardDoc = await db.collection('gift_cards').doc('card_antifraud_500').get();

      if (walletSnap.size === 1) {
        console.log(`  ✅ 2b. Billetera del cliente contiene exactamente 1 tarjeta acreditada (size = 1).`);
      } else {
        console.error(`  ❌ 2b FAILED: Se encontraron ${walletSnap.size} tarjetas en la billetera (esperado 1).`);
        allPassed = false;
      }

      if (ledgerSnap.size === 1 && ledgerSnap.docs[0].data().type === 'CREDIT' && ledgerSnap.docs[0].data().amount === 500) {
        console.log(`  ✅ 2c. Ledger contiene exactamente 1 asiento contable de CRÉDITO por $500.`);
      } else {
        console.error(`  ❌ 2c FAILED: Ledger no tiene exactamente 1 registro correcto:`, ledgerSnap.docs.map((d: any) => d.data()));
        allPassed = false;
      }

      if (cardDoc.data().redeemed === true && cardDoc.data().status === 'canjeada') {
        console.log(`  ✅ 2d. Documento global de tarjeta marcado como 'canjeada' con 'redeemed: true'.`);
      } else {
        console.error(`  ❌ 2d FAILED: Estado de tarjeta global no es 'canjeada':`, cardDoc.data());
        allPassed = false;
      }
    });

    // 2e. Intento de tercer canje secuencial posterior (debe fallar inmediatamente)
    const resRedeem3 = await fetch(`${BASE_URL}/api/wallet/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token-${clientVictim}`
      },
      body: JSON.stringify({ code: victimCardCode })
    });
    const data3 = await resRedeem3.json();
    if (resRedeem3.status === 400 && data3.error.includes("ya ha sido canjeada")) {
      console.log(`  ✅ 2e. Reintento posterior secuencial rechazado con 400: "${data3.error}".`);
    } else {
      console.error("  ❌ 2e FAILED: Reintento posterior no devolvió 400 esperado:", data3);
      allPassed = false;
    }


    // =========================================================================
    // GRUPO 3: USO SIMULTÁNEO DE BILLETERA / CONDICIÓN DE CARRERA
    // =========================================================================
    console.log("\n--- 3. VECTOR DE FRAUDE: USO SIMULTÁNEO DE BILLETERA (DOUBLE SPENDING) ---");

    const clientRace = 'client_race_condition';

    // Preparar cliente con UNA tarjeta de $1,000 en su billetera
    await testEnv.withSecurityRulesDisabled(async (context: any) => {
      const db = context.firestore();
      await db.collection('clientes').doc(clientRace).set({
        uid: clientRace,
        name: 'Cliente Concurrente',
        phone: '5559876543'
      });

      // Crear servicio oficial para que no falle la validación
      await db.collection('servicios').doc('SRB-relajante').set({
        id: 'SRB-relajante',
        name: 'Masaje Relajante Test',
        basePrice: 1100,
        status: 'activo'
      });

      await db.collection('clientes').doc(clientRace).collection('billetera').doc('card_balance_1000').set({
        code: 'RACE-1000',
        title: 'Saldo Prueba $1,000',
        initialAmount: 1000,
        currentBalance: 1000,
        status: 'activa',
        createdAt: new Date().toISOString()
      });
    });

    // El cliente tiene solo $1,000, pero intenta pagar 2 reservas de $1,100 al mismo tiempo aplicando saldo de billetera
    console.log("  -> Disparando 2 reservas simultáneas aplicando saldo de $1,000...");
    const [resBooking1, resBooking2] = await Promise.all([
      fetch(`${BASE_URL}/api/bookings/atomic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token-${clientRace}`
        },
        body: JSON.stringify({
          serviceId: 'SRB-relajante',
          durationMinutes: 60, // precio base: $1,100
          date: '2026-10-15',
          time: '10:00',
          clientAddress: 'Av. Masaryk 100',
          cityZone: 'Polanco',
          applyGiftCard: true
        })
      }),
      fetch(`${BASE_URL}/api/bookings/atomic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token-${clientRace}`
        },
        body: JSON.stringify({
          serviceId: 'SRB-relajante',
          durationMinutes: 60, // precio base: $1,100
          date: '2026-10-15',
          time: '14:00',
          clientAddress: 'Av. Masaryk 100',
          cityZone: 'Polanco',
          applyGiftCard: true
        })
      })
    ]);

    const bookData1 = await resBooking1.json();
    const bookData2 = await resBooking2.json();

    const deduction1 = bookData1.booking?.walletDeduction || 0;
    const deduction2 = bookData2.booking?.walletDeduction || 0;
    const totalDeducted = deduction1 + deduction2;

    console.log(`     Deducción Reserva 1: $${deduction1} (Total a pagar restante: $${bookData1.booking?.total})`);
    console.log(`     Deducción Reserva 2: $${deduction2} (Total a pagar restante: $${bookData2.booking?.total})`);
    console.log(`     Deducción combinada: $${totalDeducted}`);

    if (totalDeducted === 1000) {
      console.log("  ✅ 3a. Integridad transaccional: La deducción total entre ambas reservas fue de EXACTAMENTE $1,000 (Sin doble gasto).");
    } else {
      console.error(`  ❌ 3a FAILED: Se dedujeron $${totalDeducted}, violando el saldo disponible ($1000).`);
      allPassed = false;
    }

    // Verificar estado de la tarjeta en Firestore
    await testEnv.withSecurityRulesDisabled(async (context: any) => {
      const db = context.firestore();
      const cardSnap = await db.collection('clientes').doc(clientRace).collection('billetera').doc('card_balance_1000').get();
      const cardData = cardSnap.data();

      if (cardData.currentBalance === 0 && cardData.status === 'agotada') {
        console.log(`  ✅ 3b. La tarjeta en la billetera quedó con saldo $0 y status 'agotada' (nunca negativo).`);
      } else {
        console.error(`  ❌ 3b FAILED: El saldo de la tarjeta quedó inconsistente:`, cardData);
        allPassed = false;
      }

      // Verificar total de débitos en el ledger
      const ledgerSnap = await db.collection('clientes').doc(clientRace).collection('wallet_ledger').get();
      const totalDebits = ledgerSnap.docs
        .filter((d: any) => d.data().type === 'DEBIT')
        .reduce((sum: number, d: any) => sum + d.data().amount, 0);

      if (totalDebits === 1000) {
        console.log(`  ✅ 3c. La suma contable de DÉBITOS en 'wallet_ledger' es exactamente $1,000.`);
      } else {
        console.error(`  ❌ 3c FAILED: Suma de débitos en ledger fue $${totalDebits} (esperado $1,000).`);
        allPassed = false;
      }
    });


    // =========================================================================
    // GRUPO 4: REEMBOLSOS DUPLICADOS POR CANCELACIÓN CONCURRENTE
    // =========================================================================
    console.log("\n--- 4. VECTOR DE FRAUDE: REEMBOLSOS DUPLICADOS (CONCURRENT REFUNDS) ---");

    const clientRefund = 'client_refund_dupe';
    const bookingIdToRefund = 'reserva_con_pago_billetera_1';

    // Preparar una reserva que pagó $1,100 con billetera
    await testEnv.withSecurityRulesDisabled(async (context: any) => {
      const db = context.firestore();
      await db.collection('clientes').doc(clientRefund).set({
        uid: clientRefund,
        name: 'Cliente Reembolso Duplicado',
        phone: '5550001122'
      });

      await db.collection('reservas').doc(bookingIdToRefund).set({
        code: 'ESS-REFUND-TEST',
        clientId: clientRefund,
        serviceId: 'SRB-relajante',
        serviceName: 'Masaje Relajante',
        state: 'pendiente',
        paymentStatus: 'pagado',
        walletDeduction: 1100,
        price: 1100,
        total: 0,
        createdAt: new Date().toISOString()
      });
    });

    // Disparar 2 solicitudes de cancelación concurrentes para la misma reserva
    console.log("  -> Disparando 2 solicitudes de cancelación simultáneas para la misma reserva...");
    const [resCancel1, resCancel2] = await Promise.all([
      fetch(`${BASE_URL}/api/bookings/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token-${clientRefund}`
        },
        body: JSON.stringify({ bookingId: bookingIdToRefund })
      }),
      fetch(`${BASE_URL}/api/bookings/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token-${clientRefund}`
        },
        body: JSON.stringify({ bookingId: bookingIdToRefund })
      })
    ]);

    const cancelStatus1 = resCancel1.status;
    const cancelStatus2 = resCancel2.status;
    const cancelData1 = await resCancel1.json();
    const cancelData2 = await resCancel2.json();

    const cancelSuccessCount = (cancelStatus1 === 200 ? 1 : 0) + (cancelStatus2 === 200 ? 1 : 0);
    const cancelFailCount = (cancelStatus1 === 400 ? 1 : 0) + (cancelStatus2 === 400 ? 1 : 0);

    if (cancelSuccessCount === 1 && cancelFailCount === 1) {
      console.log("  ✅ 4a. Cancelación concurrente: Exactamente 1 solicitud tuvo éxito (200) y la otra fue abortada (400).");
      const errReason = cancelStatus1 === 400 ? cancelData1.error : cancelData2.error;
      console.log(`     Motivo de aborto de cancelación duplicada: "${errReason}"`);
    } else {
      console.error("  ❌ 4a FAILED: Cancelaciones concurrentes inesperadas:", { cancelStatus1, cancelStatus2, cancelData1, cancelData2 });
      allPassed = false;
    }

    // Verificar en Firestore que el reembolso no se duplicó
    await testEnv.withSecurityRulesDisabled(async (context: any) => {
      const db = context.firestore();
      
      // 1. Revisar cuántas tarjetas de reembolso se crearon
      const refundCardsSnap = await db.collection('clientes').doc(clientRefund).collection('billetera').get();
      if (refundCardsSnap.size === 1) {
        console.log(`  ✅ 4b. Billetera contiene exactamente 1 tarjeta de reembolso creada (size = 1).`);
      } else {
        console.error(`  ❌ 4b FAILED: Se crearon ${refundCardsSnap.size} tarjetas de reembolso (esperado 1).`);
        allPassed = false;
      }

      // 2. Revisar cuántos créditos de reembolso entraron al ledger
      const refundLedgerSnap = await db.collection('clientes').doc(clientRefund).collection('wallet_ledger').get();
      const refundCredits = refundLedgerSnap.docs.filter((d: any) => d.data().source === 'BOOKING_REFUND');
      const totalRefunded = refundCredits.reduce((sum: number, d: any) => sum + d.data().amount, 0);

      if (refundCredits.length === 1 && totalRefunded === 1100) {
        console.log(`  ✅ 4c. Ledger contiene exactamente 1 crédito 'BOOKING_REFUND' por $1,100 (Total reembolsado: $1,100).`);
      } else {
        console.error(`  ❌ 4c FAILED: Reembolso duplicado en ledger:`, refundCredits.map((d: any) => d.data()));
        allPassed = false;
      }

      // 3. Revisar estado de la reserva
      const bookingSnap = await db.collection('reservas').doc(bookingIdToRefund).get();
      if (bookingSnap.data().state === 'cancelado') {
        console.log(`  ✅ 4d. Documento de reserva marcado como 'cancelado'.`);
      } else {
        console.error(`  ❌ 4d FAILED: Estado de reserva no es 'cancelado':`, bookingSnap.data());
        allPassed = false;
      }
    });

    // 4e. Reintento secuencial de cancelación de reserva ya cancelada
    const resCancel3 = await fetch(`${BASE_URL}/api/bookings/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token-${clientRefund}`
      },
      body: JSON.stringify({ bookingId: bookingIdToRefund })
    });
    const cancelData3 = await resCancel3.json();
    if (resCancel3.status === 400 && cancelData3.error.includes("ya estaba cancelada")) {
      console.log(`  ✅ 4e. Tercer intento de cancelación rechazado: "${cancelData3.error}".`);
    } else {
      console.error("  ❌ 4e FAILED: Tercer intento de cancelación no devolvió 400:", cancelData3);
      allPassed = false;
    }

    // 4f. Intento de cancelación cruzada no autorizada (Cliente B intentando cancelar reserva de Cliente A)
    const resCancelCross = await fetch(`${BASE_URL}/api/bookings/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token-attacker_user_x`
      },
      body: JSON.stringify({ bookingId: bookingIdToRefund })
    });
    const cancelDataCross = await resCancelCross.json();
    if (resCancelCross.status === 400 && cancelDataCross.error.includes("No tienes permiso")) {
      console.log(`  ✅ 4f. Cancelación cruzada por usuario ajeno BLOQUEADA (400): "${cancelDataCross.error}".`);
    } else {
      console.error("  ❌ 4f FAILED: Cancelación cruzada no fue bloqueada:", cancelDataCross);
      allPassed = false;
    }

  } catch (err) {
    console.error("❌ Error inesperado durante la ejecución de las pruebas:", err);
    allPassed = false;
  } finally {
    if (server) {
      server.close();
    }
    if (testEnv) {
      await testEnv.cleanup();
    }
  }

  console.log("\n==========================================================");
  if (allPassed) {
    console.log("🎉 TODAS LAS PRUEBAS DE SEGURIDAD Y PREVENCIÓN DE FRAUDE PASARON SATISFACTORIAMENTE.");
    console.log("==========================================================\n");
    process.exit(0);
  } else {
    console.error("💥 AL MENOS UNA PRUEBA DE SEGURIDAD O FRAUDE FALLÓ.");
    console.log("==========================================================\n");
    process.exit(1);
  }
}

runFraudTestSuite();
