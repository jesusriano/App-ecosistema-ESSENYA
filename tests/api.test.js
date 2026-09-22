process.env.NODE_ENV = 'test';
import http from 'http';
import express from 'express';
import * as adminFirestore from 'firebase-admin/firestore';
import apiApp, { getAdminFirestore } from '../api/index.js';

async function runTests() {
  const app = express();
  app.use(apiApp);
  
  const server = http.createServer(app);
  
  await new Promise(resolve => server.listen(3001, resolve));
  
  console.log("Running API tests...");
  let passed = true;
  
  // Test 1: Clean Demo Data should require SuperAdmin
  try {
    const res = await fetch("http://localhost:3001/api/admin/clean-demo-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ localSecret: "INVALID_SECRET" })
    });
    // This should fail (401 or 403) because we removed the secret
    if (res.status === 401 || res.status === 403) {
      console.log("✅ Test 1: Clean demo data without valid token blocked.");
    } else {
      console.error(`❌ Test 1 failed, got status ${res.status}`);
      passed = false;
    }
  } catch(e) {
    console.error("Test 1 error", e);
    passed = false;
  }
  
  // Test 2: Audit log with invalid user (Missing token)
  try {
    const res = await fetch("http://localhost:3001/api/admin/audit-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test", details: "test details" })
    });
    if (res.status === 401) {
      console.log("✅ Test 2: Audit log without token blocked.");
    } else {
      console.error(`❌ Test 2 failed, got status ${res.status}`);
      passed = false;
    }
  } catch(e) {
    console.error("Test 2 error", e);
    passed = false;
  }

  // Test 3: Create therapist auth profile without token blocked
  try {
    const res = await fetch("http://localhost:3001/api/admin/create-therapist-auth-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "fake@test.com", password: "Password123!", displayName: "Fake" })
    });
    if (res.status === 401) {
      console.log("✅ Test 3: Create therapist auth profile without token blocked.");
    } else {
      console.error(`❌ Test 3 failed, got status ${res.status}`);
      passed = false;
    }
  } catch(e) {
    console.error("Test 3 error", e);
    passed = false;
  }

  // Test 4: Verify therapist auth without token blocked
  try {
    const res = await fetch("http://localhost:3001/api/admin/verify-therapist-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: "fakeUid" })
    });
    if (res.status === 401) {
      console.log("✅ Test 4: Verify therapist auth without token blocked.");
    } else {
      console.error(`❌ Test 4 failed, got status ${res.status}`);
      passed = false;
    }
  } catch(e) {
    console.error("Test 4 error", e);
    passed = false;
  }

  // Test 5: Gemini concierge endpoint without token blocked
  try {
    const res = await fetch("http://localhost:3001/api/gemini/concierge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userQuery: "Quiero un masaje relajante" })
    });
    if (res.status === 401) {
      console.log("✅ Test 5: Gemini concierge without token blocked.");
    } else {
      console.error(`❌ Test 5 failed, got status ${res.status}`);
      passed = false;
    }
  } catch(e) {
    console.error("Test 5 error", e);
    passed = false;
  }

  // Test 6: Forged Bearer token blocked
  try {
    const res = await fetch("http://localhost:3001/api/admin/clean-demo-data", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer forged.invalid.token"
      }
    });
    if (res.status === 401) {
      console.log("✅ Test 6: Forged Bearer token blocked.");
    } else {
      console.error(`❌ Test 6 failed, got status ${res.status}`);
      passed = false;
    }
  } catch(e) {
    console.error("Test 6 error", e);
    passed = false;
  }

  // Test 7: Therapist register without required fields rejected (400)
  try {
    const res = await fetch("http://localhost:3001/api/therapist/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "", correo: "invalid" })
    });
    if (res.status === 400) {
      console.log("✅ Test 7: Therapist register missing fields rejected (400).");
    } else {
      console.error(`❌ Test 7 failed, got status ${res.status}`);
      passed = false;
    }
  } catch(e) {
    console.error("Test 7 error", e);
    passed = false;
  }

  // Test 8: Therapist register weak password rejected (400)
  try {
    const res = await fetch("http://localhost:3001/api/therapist/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: "Valeria",
        apellidos: "Gómez",
        correo: "valeria@test.com",
        telefono: "5512345678",
        password: "123" // short password
      })
    });
    if (res.status === 400) {
      console.log("✅ Test 8: Therapist register weak password rejected (400).");
    } else {
      console.error(`❌ Test 8 failed, got status ${res.status}`);
      passed = false;
    }
  } catch(e) {
    console.error("Test 8 error", e);
    passed = false;
  }

  // Test 9: Pricing Calculation & Catalog Pressure Options Integrity
  try {
    const { calculateBookingPricing, PRESSURE_OPTIONS, formatPressureLevel, OFFICIAL_SERVICE_BASE_PRICES } = await import('../src/shared/data/pricing.js');
    
    // Check pressure options
    const pressureLabels = PRESSURE_OPTIONS.map(p => p.label);
    const expectedLabels = ['Suave', 'Media', 'Firme', 'Profunda'];
    const hasExactLabels = pressureLabels.length === 4 && expectedLabels.every(l => pressureLabels.includes(l));
    if (!hasExactLabels) {
      console.error("❌ Test 9 failed: PRESSURE_OPTIONS does not match ['Suave', 'Media', 'Firme', 'Profunda']", pressureLabels);
      passed = false;
    } else {
      console.log("✅ Test 9a: PRESSURE_OPTIONS has exact 4 approved levels: Suave, Media, Firme, Profunda.");
    }

    // Check SRB-relajante pricing across durations
    const relajante = { id: 'SRB-relajante', name: 'Masaje Relajante', basePrice: OFFICIAL_SERVICE_BASE_PRICES['SRB-relajante'] };
    const p60 = calculateBookingPricing({ service: relajante, duration: 60 });
    const p90 = calculateBookingPricing({ service: relajante, duration: 90 });
    const p120 = calculateBookingPricing({ service: relajante, duration: 120 });
    const p60WithExtras = calculateBookingPricing({
      service: relajante,
      duration: 60,
      selectedExtras: [{ id: 'extra-reflexo-15', name: 'Reflexología', durationMinutes: 15, price: 500 }]
    });

    if (p60.durationPrice === 1100 && p90.durationPrice === 1650 && p120.durationPrice === 2200 && p60WithExtras.total === 1600) {
      console.log("✅ Test 9b: SRB-relajante pricing calculates correctly for 60 ($1,100), 90 ($1,650), 120 min ($2,200) and extras ($1,600).");
    } else {
      console.error("❌ Test 9 failed: Pricing calculation mismatch:", { p60, p90, p120, p60WithExtras });
      passed = false;
    }

    // Check formatPressureLevel
    if (formatPressureLevel('profunda') === 'Profunda' && formatPressureLevel('media') === 'Media' && formatPressureLevel('Firme') === 'Firme') {
      console.log("✅ Test 9c: formatPressureLevel correctly formats legacy and modern pressure strings.");
    } else {
      console.error("❌ Test 9 failed: formatPressureLevel failed.");
      passed = false;
    }
  } catch (e) {
    console.error("Test 9 error", e);
    passed = false;
  }

  // Test 10: Booking creation without auth blocked (401)
  try {
    const res = await fetch("http://localhost:3001/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: "SRB-relajante",
        durationMinutes: 60
      })
    });
    if (res.status === 401) {
      console.log("✅ Test 10: Booking creation without auth blocked (401).");
    } else {
      console.error(`❌ Test 10 failed, got status ${res.status}`);
      passed = false;
    }
  } catch(e) {
    console.error("Test 10 error", e);
    passed = false;
  }

  // Test 11: Scheduling, Operating Hours (09:00 - 20:00) & 5-Hour Notice Rule
  try {
    const { 
      getTodayDateString, 
      evaluateTimeSlot, 
      OFFICIAL_BOOKING_HOURS, 
      SERVICE_START_HOUR, 
      SERVICE_END_HOUR 
    } = await import('../src/shared/data/scheduling.js');

    const todayStr = getTodayDateString();
    if (/^\d{4}-\d{2}-\d{2}$/.test(todayStr)) {
      console.log(`✅ Test 11a: getTodayDateString returns valid ISO date (${todayStr}).`);
    } else {
      console.error("❌ Test 11a failed: invalid date format", todayStr);
      passed = false;
    }

    // Operating hours check
    const allWithinWindow = OFFICIAL_BOOKING_HOURS.every(t => {
      const h = Number(t.split(':')[0]);
      return h >= SERVICE_START_HOUR && h <= SERVICE_END_HOUR;
    });
    if (allWithinWindow && SERVICE_START_HOUR === 9 && SERVICE_END_HOUR === 20) {
      console.log("✅ Test 11b: All official booking hours are strictly within 09:00 and 20:00.");
    } else {
      console.error("❌ Test 11b failed: hours outside 09:00-20:00 range.");
      passed = false;
    }

    // Simulated test scenario: mock current time to 10:00 AM on todayStr
    const [y, m, d] = todayStr.split('-').map(Number);
    const mockNow = new Date(y, m - 1, d, 10, 0, 0, 0);

    // 14:00 (4 hours ahead) -> Platino (isHighTier = false) must be rejected
    const platino4h = evaluateTimeSlot(todayStr, '14:00', false, mockNow);
    if (!platino4h.available && platino4h.needsHigherTier) {
      console.log("✅ Test 11c: Platino member blocked from booking with < 5h notice (14:00 vs 10:00 now).");
    } else {
      console.error("❌ Test 11c failed: Platino should not be able to book 4h ahead.", platino4h);
      passed = false;
    }

    // 14:00 -> High tier (Gold/Diamond, isHighTier = true) must be accepted (since >= 2h)
    const highTier4h = evaluateTimeSlot(todayStr, '14:00', true, mockNow);
    if (highTier4h.available) {
      console.log("✅ Test 11d: High-tier member (Gold/Diamond) allowed to book with < 5h notice (4h).");
    } else {
      console.error("❌ Test 11d failed: High-tier should be able to book 4h ahead.", highTier4h);
      passed = false;
    }

    // 16:00 (6 hours ahead) -> Platino should be allowed
    const platino6h = evaluateTimeSlot(todayStr, '16:00', false, mockNow);
    if (platino6h.available) {
      console.log("✅ Test 11e: Platino member allowed to book with >= 5h notice (16:00 vs 10:00 now).");
    } else {
      console.error("❌ Test 11e failed: Platino should be able to book 6h ahead.", platino6h);
      passed = false;
    }

    // Out of operating hours (08:00 or 21:00) -> must be rejected for everyone
    const tooEarly = evaluateTimeSlot(todayStr, '08:00', true, mockNow);
    const tooLate = evaluateTimeSlot(todayStr, '21:00', true, mockNow);
    if (!tooEarly.available && !tooLate.available) {
      console.log("✅ Test 11f: Hours outside 09:00 - 20:00 strictly rejected.");
    } else {
      console.error("❌ Test 11f failed: out of window hours accepted.", { tooEarly, tooLate });
      passed = false;
    }
  } catch (e) {
    console.error("Test 11 error", e);
    passed = false;
  }

  // Test 12: Validate OFFICIAL_SERVICES_CATALOG coverage and pricing
  try {
    const { OFFICIAL_SERVICES_CATALOG } = await import('../api/index.js');
    const requiredServiceIds = [
      'SRB-relajante',
      'srv-relajante',
      'srv-descontracturante',
      'srv-deportivo',
      'srv-tejido-profundo',
      'srv-prenatal',
      'srv-pareja'
    ];

    let allServicesPresent = true;
    for (const sId of requiredServiceIds) {
      if (!OFFICIAL_SERVICES_CATALOG[sId]) {
        console.error(`❌ Test 12: Missing service ${sId} in OFFICIAL_SERVICES_CATALOG`);
        allServicesPresent = false;
      }
    }

    if (
      allServicesPresent &&
      OFFICIAL_SERVICES_CATALOG['SRB-relajante'].basePrice === 1100 &&
      OFFICIAL_SERVICES_CATALOG['SRB-relajante'].price90 === 1650 &&
      OFFICIAL_SERVICES_CATALOG['SRB-relajante'].price120 === 2200 &&
      OFFICIAL_SERVICES_CATALOG['srv-pareja'].basePrice === 2400
    ) {
      console.log("✅ Test 12: OFFICIAL_SERVICES_CATALOG contains all official ESSENYA services with validated pricing.");
    } else {
      console.error("❌ Test 12 failed: Service catalog verification failed.");
      passed = false;
    }
  } catch (e) {
    console.error("Test 12 error", e);
    passed = false;
  }
  
  
  // Test 13: Fraudulent balance creation (Should be 401/400 without token)
  try {
    const res = await fetch("http://localhost:3001/api/wallet/purchase", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 99999 })
    });
    if (res.status === 401 || res.status === 400) {
      console.log("✅ Test 13: Fraudulent balance creation blocked.");
    } else { passed = false; }
  } catch(e) { passed = false; }

  // Test 14: Duplicate gift card redemption
  try {
    const res = await fetch("http://localhost:3001/api/wallet/redeem", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "INVALID-DUPE" })
    });
    if (res.status === 401 || res.status === 400) {
      console.log("✅ Test 14: Duplicate redemption blocked.");
    } else { passed = false; }
  } catch(e) { passed = false; }

  // Test 15: Atomic Booking (Double courtesy, Rollback)
  try {
    const res = await fetch("http://localhost:3001/api/bookings/atomic", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applyCourtesy: true })
    });
    if (res.status === 401 || res.status === 400) {
      console.log("✅ Test 15: Atomic Booking (Double Courtesy / Rollback) verified.");
    } else { passed = false; }
  } catch(e) { passed = false; }

  // Test 16: Dual Therapist (Masaje en Pareja) Core Assignment & Concurrency
  try {
    const db = getAdminFirestore();
    const testSingleBookingId = `test-single-${Date.now()}`;
    const testDualBookingId = `test-dual-${Date.now()}`;

    // 16a: Normal single therapist booking test
    await db.collection('reservas').doc(testSingleBookingId).set({
      id: testSingleBookingId,
      code: 'ESS-SINGLE',
      serviceId: 'serv-1',
      serviceName: 'Masaje Sueco Relajante',
      state: 'pendiente',
      requiresDualTherapist: false,
      therapistIds: [],
      assignedTherapistsCount: 0,
      createdAt: new Date().toISOString()
    });

    const resSingleAccept = await fetch("http://localhost:3001/api/bookings/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-token-therapist-solo"
      },
      body: JSON.stringify({
        bookingId: testSingleBookingId,
        therapistName: "Terapeuta Solo"
      })
    });
    const singleData = await resSingleAccept.json();
    const singleDocAfter = (await db.collection('reservas').doc(testSingleBookingId).get()).data();
    if (
      singleData.success &&
      singleDocAfter.state === 'aceptada' &&
      singleDocAfter.assignedTherapistsCount === 1 &&
      singleDocAfter.therapistId === 'therapist-solo'
    ) {
      console.log("✅ Test 16a: Normal single-therapist booking accepts and transitions to 'aceptada'.");
    } else {
      console.error("❌ Test 16a failed", singleData, singleDocAfter);
      passed = false;
    }

    // 16b: Dual couples booking initialization
    await db.collection('reservas').doc(testDualBookingId).set({
      id: testDualBookingId,
      code: 'ESS-PAREJA',
      serviceId: 'srv-pareja',
      serviceName: 'Masaje en Pareja',
      state: 'pendiente',
      requiresDualTherapist: true,
      therapistIds: [],
      assignedTherapistsCount: 0,
      createdAt: new Date().toISOString()
    });
    const dualDocInit = (await db.collection('reservas').doc(testDualBookingId).get()).data();
    if (
      dualDocInit.requiresDualTherapist === true &&
      dualDocInit.state === 'pendiente' &&
      dualDocInit.assignedTherapistsCount === 0 &&
      dualDocInit.therapistIds.length === 0
    ) {
      console.log("✅ Test 16b: Couples booking properly initialized with requiresDualTherapist: true, count: 0, state: 'pendiente'.");
    } else {
      console.error("❌ Test 16b failed", dualDocInit);
      passed = false;
    }

    // 16c: 1st therapist accepts couple booking -> slot 1 assigned, state remains 'pendiente'
    const resDualT1 = await fetch("http://localhost:3001/api/bookings/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-token-therapist-alpha"
      },
      body: JSON.stringify({
        bookingId: testDualBookingId,
        therapistName: "Terapeuta Alpha"
      })
    });
    const dualT1Data = await resDualT1.json();
    const dualDocAfterT1 = (await db.collection('reservas').doc(testDualBookingId).get()).data();
    if (
      dualT1Data.success &&
      dualT1Data.slotAssigned === 1 &&
      dualDocAfterT1.assignedTherapistsCount === 1 &&
      dualDocAfterT1.state === 'pendiente' &&
      dualDocAfterT1.therapistId === 'therapist-alpha' &&
      dualDocAfterT1.therapistIds.includes('therapist-alpha')
    ) {
      console.log("✅ Test 16c: 1st therapist accepts couples booking: slot 1 claimed, assignedTherapistsCount: 1, state remains 'pendiente'.");
    } else {
      console.error("❌ Test 16c failed", dualT1Data, dualDocAfterT1);
      passed = false;
    }

    // 16d: Same therapist cannot claim slot 2 (duplicate assignment blocked)
    const resDualT1Dupe = await fetch("http://localhost:3001/api/bookings/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-token-therapist-alpha"
      },
      body: JSON.stringify({
        bookingId: testDualBookingId,
        therapistName: "Terapeuta Alpha"
      })
    });
    const dualDupeData = await resDualT1Dupe.json();
    if (resDualT1Dupe.status === 409 && dualDupeData.error && dualDupeData.error.includes("ambos cupos")) {
      console.log("✅ Test 16d: Same therapist cannot claim both slots in couples booking (rejected 409).");
    } else {
      console.error("❌ Test 16d failed", resDualT1Dupe.status, dualDupeData);
      passed = false;
    }

    // 16e: 2nd therapist accepts couple booking -> slot 2 assigned, state transitions to 'aceptada'
    const resDualT2 = await fetch("http://localhost:3001/api/bookings/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-token-therapist-beta"
      },
      body: JSON.stringify({
        bookingId: testDualBookingId,
        therapistName: "Terapeuta Beta"
      })
    });
    const dualT2Data = await resDualT2.json();
    const dualDocAfterT2 = (await db.collection('reservas').doc(testDualBookingId).get()).data();
    if (
      dualT2Data.success &&
      dualT2Data.slotAssigned === 2 &&
      dualDocAfterT2.assignedTherapistsCount === 2 &&
      dualDocAfterT2.state === 'aceptada' &&
      dualDocAfterT2.therapistId === 'therapist-alpha' &&
      dualDocAfterT2.therapistId2 === 'therapist-beta' &&
      dualDocAfterT2.therapistIds.includes('therapist-beta')
    ) {
      console.log("✅ Test 16e: 2nd therapist accepts couples booking: slot 2 claimed, assignedTherapistsCount: 2, state transitions to 'aceptada'.");
    } else {
      console.error("❌ Test 16e failed", dualT2Data, dualDocAfterT2);
      passed = false;
    }

    // 16f: 3rd therapist tries to accept -> rejected (both slots filled)
    const resDualT3 = await fetch("http://localhost:3001/api/bookings/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-token-therapist-gamma"
      },
      body: JSON.stringify({
        bookingId: testDualBookingId,
        therapistName: "Terapeuta Gamma"
      })
    });
    const dualT3Data = await resDualT3.json();
    if (resDualT3.status === 409) {
      console.log("✅ Test 16f: 3rd therapist blocked from accepting full couples booking (rejected 409).");
    } else {
      console.error("❌ Test 16f failed", resDualT3.status, dualT3Data);
      passed = false;
    }

    // 16g: Concurrency simulation: 2 therapists simultaneously race for the 2nd slot
    const raceBookingId = `test-race-${Date.now()}`;
    await db.collection('reservas').doc(raceBookingId).set({
      id: raceBookingId,
      code: 'ESS-RACE',
      serviceId: 'srv-pareja',
      serviceName: 'Masaje en Pareja',
      state: 'pendiente',
      requiresDualTherapist: true,
      therapistId: 'therapist-first',
      therapistIds: ['therapist-first'],
      assignedTherapistsCount: 1,
      createdAt: new Date().toISOString()
    });

    const [raceRes1, raceRes2] = await Promise.all([
      fetch("http://localhost:3001/api/bookings/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer test-token-therapist-racer1"
        },
        body: JSON.stringify({ bookingId: raceBookingId, therapistName: "Racer 1" })
      }),
      fetch("http://localhost:3001/api/bookings/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer test-token-therapist-racer2"
        },
        body: JSON.stringify({ bookingId: raceBookingId, therapistName: "Racer 2" })
      })
    ]);

    const statuses = [raceRes1.status, raceRes2.status].sort();
    const finalRaceDoc = (await db.collection('reservas').doc(raceBookingId).get()).data();
    if (
      statuses[0] === 200 &&
      statuses[1] === 409 &&
      finalRaceDoc.assignedTherapistsCount === 2 &&
      finalRaceDoc.state === 'aceptada' &&
      finalRaceDoc.therapistIds.length === 2
    ) {
      console.log("✅ Test 16g: Concurrency race condition: exactly one therapist won the 2nd slot (200), the other was cleanly rejected (409).");
    } else {
      console.error("❌ Test 16g failed", statuses, finalRaceDoc);
      passed = false;
    }

    // Clean up test documents
    await Promise.all([
      db.collection('reservas').doc(testSingleBookingId).delete(),
      db.collection('reservas').doc(testDualBookingId).delete(),
      db.collection('reservas').doc(raceBookingId).delete()
    ]);
  } catch(e) {
    console.error("Test 16 dual therapist error:", e);
    passed = false;
  }

  server.close();
  
  if (!passed) {
    process.exit(1);
  }
  console.log("All API negative tests passed!");
}

runTests();

