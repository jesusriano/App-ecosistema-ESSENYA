import http from 'http';
import express from 'express';
import apiApp from '../api/index.js';

async function runAuthAndBookingTests() {
  const app = express();
  app.use(apiApp);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(3002, resolve));

  console.log("=== INICIANDO PRUEBAS DE AUTENTICACIÓN Y RESERVAS ===");
  let passed = true;

  // Test 1: Booking endpoint without auth token returns 401 (Unauthorized) instead of crashing
  try {
    const res = await fetch("http://localhost:3002/api/bookings/atomic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: "SRB-relajante",
        durationMinutes: 60,
        date: "2026-10-01",
        time: "10:00",
        clientAddress: "Insurgentes Sur 123",
        cityZone: "Polanco / Reforma"
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      console.log("✅ Prueba 1 [Seguridad de Reservas]: Acceso sin token bloqueado correctamente con 401 (No autorizado).");
    } else {
      console.error(`❌ Prueba 1 fallida, se esperaba 401 pero obtuvo status ${res.status}:`, data);
      passed = false;
    }
  } catch (e) {
    console.error("❌ Prueba 1 error de red:", e);
    passed = false;
  }

  // Test 2: Cancel booking without auth returns 401
  try {
    const res = await fetch("http://localhost:3002/api/bookings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: "test-booking-id", reason: "Prueba" })
    });
    if (res.status === 401) {
      console.log("✅ Prueba 2 [Cancelación de Reservas]: Solicitud sin token rechazada correctamente con 401.");
    } else {
      console.error(`❌ Prueba 2 fallida, obtuvo status ${res.status}`);
      passed = false;
    }
  } catch (e) {
    console.error("❌ Prueba 2 error:", e);
    passed = false;
  }

  // Test 3: Therapist registration validation (Missing fields return 400)
  try {
    const res = await fetch("http://localhost:3002/api/therapist/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: "Test",
        apellidos: "Terapeuta",
        correo: "invalido",
        password: "123"
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 400 && data.success === false) {
      console.log("✅ Prueba 3 [Registro de Terapeutas]: Validación de campos y contraseñas rechazadas correctamente con 400:", data.error);
    } else {
      console.error(`❌ Prueba 3 fallida, obtuvo status ${res.status}:`, data);
      passed = false;
    }
  } catch (e) {
    console.error("❌ Prueba 3 error:", e);
    passed = false;
  }

  server.close();
  if (passed) {
    console.log("🎉 TODAS LAS PRUEBAS DE AUTENTICACIÓN Y RESERVAS PASARON EXITOSAMENTE.");
    process.exit(0);
  } else {
    console.error("⚠️ ALGUNAS PRUEBAS FALLARON.");
    process.exit(1);
  }
}

runAuthAndBookingTests().catch(err => {
  console.error("Error crítico ejecutando pruebas:", err);
  process.exit(1);
});
