import http from 'http';
import express from 'express';
import apiApp from '../api/index.js';

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
  
  server.close();
  
  if (!passed) {
    process.exit(1);
  }
  console.log("All API negative tests passed!");
}

runTests();
