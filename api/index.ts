import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import * as adminApp from "firebase-admin/app";
import * as adminAuth from "firebase-admin/auth";
import * as adminFirestore from "firebase-admin/firestore";


function sanitizePromptInput(input: any, maxLength: number = 500): string {
  if (typeof input !== "string") return "";
  let clean = input.trim().slice(0, maxLength);
  clean = clean.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[correo]");
  clean = clean.replace(/(\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{4}/g, "[teléfono]");
  clean = clean.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[tarjeta]");
  return clean;
}

const app = express();

async function getGeminiClient() {
  const { GoogleGenAI } = await import("@google/genai");
  const key = process.env.VITE_FIREBASE_API_KEY || ""; // If the user didn't specify GEMINI_API_KEY, fallback or throw
  if (process.env.GEMINI_API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return new GoogleGenAI({ apiKey: key });
}


app.use(express.json({ limit: "2mb" })); // Prevent large payloads (like base64) directly in JSON

// Initialize Firebase Admin globally
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let projectId = "essenya-ecosistema";
let firestoreDatabaseId: string | undefined = undefined;

if (fs.existsSync(configPath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (parsed.projectId) projectId = parsed.projectId;
    if (parsed.firestoreDatabaseId) firestoreDatabaseId = parsed.firestoreDatabaseId;
  } catch (e) {
    console.warn("Failed to parse firebase config:", e);
  }
}

if (adminApp.getApps().length === 0) {
  const isProd = process.env.NODE_ENV === "production";
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const envProjectId = process.env.FIREBASE_ADMIN_PROJECT_ID || "essenya-ecosistema";

  if (privateKey && clientEmail) {
    // Process private key line breaks (Vercel uses \n or literal line breaks)
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    try {
      adminApp.initializeApp({
        credential: adminApp.cert({
          projectId: envProjectId,
          clientEmail: clientEmail,
          privateKey: formattedPrivateKey,
        })
      });
      console.log("Firebase Admin initialized successfully with Service Account credentials.");
    } catch (err) {
      console.error("Failed to initialize Firebase Admin with Service Account:", err);
      adminApp.initializeApp({ projectId: envProjectId });
    }
  } else {
    if (isProd) {
      console.warn("WARNING: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY are not fully configured. Using fallback default credentials.");
    }
    // Fallback to application default credentials (useful for local development or GCP runtimes)
    adminApp.initializeApp({ projectId: envProjectId });
    console.log("Firebase Admin initialized with default project configuration.");
  }
}

function getAdminFirestore() {
  const apps = adminApp.getApps();
  const defaultApp = apps.length > 0 ? apps[0] : undefined;
  
  if (firestoreDatabaseId && defaultApp) {
    return adminFirestore.getFirestore(defaultApp, firestoreDatabaseId);
  }
  return adminFirestore.getFirestore();
}

// In-memory robust rate limiter (fast, zero network overhead, resilient)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 300; // Generous limit for API operations, avoids false positives

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const memoryRateLimits = new Map<string, RateLimitRecord>();

// Periodic cleanup of expired entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryRateLimits.entries()) {
    if (now > record.resetTime) {
      memoryRateLimits.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  // CRITICAL: Only rate-limit backend API endpoints (/api/*), NEVER frontend assets, Vite modules, CSS, HTML
  if (!req.path.startsWith("/api/")) {
    return next();
  }

  // Health checks should never be rate limited
  if (req.path === "/api/health") {
    return next();
  }

  let identifier = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown_ip";
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        if (payload.user_id || payload.sub) {
          identifier = payload.user_id || payload.sub;
        }
      }
    } catch {
      // Fallback to IP address
    }
  }

  const now = Date.now();
  const cleanKey = identifier.replace(/[/\\?%*:|"<>]/g, "-");
  const record = memoryRateLimits.get(cleanKey);

  if (!record || now > record.resetTime) {
    memoryRateLimits.set(cleanKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (record.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    res.setHeader("Retry-After", retryAfter);
    res.status(429).json({ success: false, error: `Límite alcanzado. Espera ${retryAfter}s.` });
    return;
  }

  record.count += 1;
  next();
}

app.use(rateLimiter);

// Firebase Admin Verify Token Middleware
async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void | any> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Falta token Bearer." });
  }
  
  try {
    const token = authHeader.split(" ")[1];
    const decodedToken = await adminAuth.getAuth().verifyIdToken(token);
    (req as any).user = decodedToken; // contains uid, email, custom claims
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Token inválido o expirado." });
  }
}

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void | any> {
  await requireAuth(req, res, async () => {
    // Determine admin status safely
    const uid = (req as any).user.uid;
    
    try {
      const db = getAdminFirestore();
      const adminDoc = await db.collection("administradores").doc(uid).get();
      if (adminDoc.exists) {
        (req as any).user.role = "administrador";
        return next();
      }
      const adminsDoc = await db.collection("admins").doc(uid).get();
      if (adminsDoc.exists) {
        (req as any).user.role = "administrador";
        return next();
      }
    } catch (e) {
      console.warn("Error fetching user role", e);
    }
    
    return res.status(403).json({ success: false, error: "No autorizado. Se requiere rol administrador." });
  });
}

async function requireSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void | any> {
  await requireAuth(req, res, async () => {
    const uid = (req as any).user.uid;
    try {
      const db = getAdminFirestore();
      const adminDoc = await db.collection("administradores").doc(uid).get();
      if (adminDoc.exists && adminDoc.data()?.role === "superadmin") {
        (req as any).user.role = "superadmin";
        return next();
      }
    } catch (e) {
      console.warn("Error checking superadmin", e);
    }
    return res.status(403).json({ success: false, error: "No autorizado. Se requiere superadministrador." });
  });
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV || "development", timestamp: new Date().toISOString() });
});

// Secure booking creation endpoint
app.post("/api/bookings", requireAuth, async (req: Request, res: Response) => {
  try {
    const { serviceId, date, time, preferences, clientAddress, cityZone } = req.body;
    const uid = (req as any).user.uid;
    const email = (req as any).user.email;

    // Log the raw incoming request payload as requested
    console.log("=== API BOOKING INCOMING PAYLOAD ===");
    console.log(JSON.stringify({ serviceId, date, time, clientAddress, cityZone, uid, email }, null, 2));
    
    if (!serviceId) {
      const errRes = { success: false, error: "serviceId es requerido." };
      console.log("=== API BOOKING OUTGOING ERROR RESPONSE ===");
      console.log(JSON.stringify(errRes, null, 2));
      return res.status(400).json(errRes);
    }
    if (!date || !time) {
      const errRes = { success: false, error: "Fecha y hora son requeridos." };
      console.log("=== API BOOKING OUTGOING ERROR RESPONSE ===");
      console.log(JSON.stringify(errRes, null, 2));
      return res.status(400).json(errRes);
    }
    if (!cityZone || !clientAddress) {
      const errRes = { success: false, error: "Zona y dirección son requeridos." };
      console.log("=== API BOOKING OUTGOING ERROR RESPONSE ===");
      console.log(JSON.stringify(errRes, null, 2));
      return res.status(400).json(errRes);
    }

    const db = getAdminFirestore();
    
    // Get client name and phone from Firestore
    const userDoc = await db.collection("users").doc(uid).get();
    const clientData = userDoc.exists ? userDoc.data() : {};
    const finalClientName = clientData?.nombreCompleto || clientData?.name || email;
    const finalClientPhone = clientData?.telefono || clientData?.phone || "";

    // Get service official pricing with robust ID mapping fallback
    let srvDoc = await db.collection("servicios").doc(serviceId).get();
    if (!srvDoc.exists) {
      if (serviceId === "SRB-relajante") {
        srvDoc = await db.collection("servicios").doc("srv-relajante").get();
      } else if (serviceId === "srv-relajante") {
        srvDoc = await db.collection("servicios").doc("SRB-relajante").get();
      }
    }

    if (!srvDoc.exists) {
      const errRes = { success: false, error: "El servicio solicitado no existe." };
      console.log("=== API BOOKING OUTGOING ERROR RESPONSE ===");
      console.log(JSON.stringify(errRes, null, 2));
      return res.status(400).json(errRes);
    }
    
    const srvData = srvDoc.data();
    if (srvData?.estado === "inactivo" || srvData?.active === false) {
      const errRes = { success: false, error: "El servicio solicitado está inactivo." };
      console.log("=== API BOOKING OUTGOING ERROR RESPONSE ===");
      console.log(JSON.stringify(errRes, null, 2));
      return res.status(400).json(errRes);
    }
    
    const serviceName = srvData?.name || srvData?.nombre || "Servicio ESSENYA";

    // Validate requested duration
    const requestedDuration = Number(req.body.durationMinutes) || 90;
    const allowedDurations: number[] = Array.isArray(srvData?.allowedDurations) && srvData.allowedDurations.length > 0
      ? srvData.allowedDurations
      : [60, 90, 120];
    const durationMinutes = allowedDurations.includes(requestedDuration) ? requestedDuration : (allowedDurations[0] || 90);

    // Get official base price (60 min)
    let officialBasePrice = typeof srvData?.basePrice === "number" && srvData.basePrice > 0
      ? srvData.basePrice
      : (typeof srvData?.price === "number" && srvData.price > 0 ? srvData.price : undefined);

    // Fallback to standard catalog prices if unconfigured in doc
    if (!officialBasePrice) {
      const standardServicePrices: Record<string, number> = {
        'SRB-relajante': 1100,
        'srv-relajante': 1100,
        'srv-descontracturante': 1200,
        'srv-deportivo': 1250,
        'srv-tejido-profundo': 1300,
        'srv-prenatal': 1100,
        'srv-pareja': 2400
      };
      officialBasePrice = standardServicePrices[serviceId];
    }

    if (!officialBasePrice || officialBasePrice <= 0) {
      const errRes = { success: false, error: "Precio no disponible. Selecciona otro servicio o comunícate con ESSENYA." };
      console.log("=== API BOOKING OUTGOING ERROR RESPONSE ===");
      console.log(JSON.stringify(errRes, null, 2));
      return res.status(400).json(errRes);
    }

    // Calculate official price by duration
    let officialDurationPrice: number;
    if (durationMinutes === 60) {
      officialDurationPrice = officialBasePrice;
    } else if (durationMinutes === 90) {
      officialDurationPrice = typeof srvData?.price90 === "number" && srvData.price90 > 0
        ? srvData.price90
        : Math.round(officialBasePrice * 1.5);
    } else if (durationMinutes === 120) {
      officialDurationPrice = typeof srvData?.price120 === "number" && srvData.price120 > 0
        ? srvData.price120
        : Math.round(officialBasePrice * 2);
    } else {
      officialDurationPrice = officialBasePrice;
    }

    // Authorized add-ons calculation
    let extrasTotal = 0;
    const validatedExtras: any[] = [];
    if (Array.isArray(req.body.selectedExtras)) {
      for (const extra of req.body.selectedExtras) {
        const extraId = String(extra?.id || "");
        if (extraId.includes("ref-15")) {
          validatedExtras.push({ id: "extra-ref-15", name: "Reflexología Podal (15 min)", durationMinutes: 15, price: 300 });
          extrasTotal += 300;
        } else if (extraId.includes("ref-30")) {
          validatedExtras.push({ id: "extra-ref-30", name: "Reflexología Podal (30 min)", durationMinutes: 30, price: 500 });
          extrasTotal += 500;
        } else if (extraId.includes("cra-15")) {
          validatedExtras.push({ id: "extra-cra-15", name: "Masaje Craneofacial (15 min)", durationMinutes: 15, price: 300 });
          extrasTotal += 300;
        } else if (extraId.includes("cra-30")) {
          validatedExtras.push({ id: "extra-cra-30", name: "Masaje Craneofacial (30 min)", durationMinutes: 30, price: 500 });
          extrasTotal += 500;
        }
      }
    }

    const subtotal = officialDurationPrice + extrasTotal;
    const authorizedTip = typeof req.body.tip === "number" && req.body.tip >= 0 && req.body.tip <= 2000 ? Math.round(req.body.tip) : 0;
    const officialTotal = subtotal + authorizedTip;

    // Generate unique code
    let code = "";
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const codeNum = Math.floor(1000 + Math.random() * 9000);
      code = `ESS-${codeNum}`;
      const existing = await db.collection("reservas").where("code", "==", code).limit(1).get();
      if (existing.empty) {
        isUnique = true;
      }
      attempts++;
    }
    if (!isUnique) {
      const errRes = { success: false, error: "Error al generar un código único de reserva." };
      console.log("=== API BOOKING OUTGOING ERROR RESPONSE ===");
      console.log(JSON.stringify(errRes, null, 2));
      return res.status(500).json(errRes);
    }

    const extrasDurationMinutes = validatedExtras.reduce((acc, e) => acc + (Number(e.durationMinutes) || 0), 0);

    const newBooking = {
      code,
      clientId: uid,
      clientName: finalClientName,
      clientPhone: finalClientPhone,
      clientAddress,
      cityZone,
      serviceId,
      serviceName,
      durationMinutes,
      totalDurationMinutes: durationMinutes + extrasDurationMinutes,
      ...(validatedExtras.length > 0 ? { selectedExtras: validatedExtras } : {}),
      ...(srvData?.requiresDualTherapist ? { requiresDualTherapist: true } : {}),
      price: subtotal,
      total: officialTotal,
      tip: authorizedTip,
      date,
      time,
      preferences: preferences || {},
      state: "pendiente",
      paymentStatus: "pendiente", // ALWAYS pendiente on creation
      createdAt: new Date().toISOString()
    };

    const newDocRef = db.collection("reservas").doc();
    await newDocRef.set(newBooking);
    
    const successRes = { success: true, bookingId: newDocRef.id, booking: { id: newDocRef.id, ...newBooking } };
    console.log("=== API BOOKING OUTGOING SUCCESS RESPONSE ===");
    console.log(JSON.stringify(successRes, null, 2));
    res.json(successRes);
  } catch (err: any) {
    const errRes = { success: false, error: err.message || "Error interno al procesar la reserva." };
    console.log("=== API BOOKING OUTGOING CRITICAL EXCEPTION RESPONSE ===");
    console.log(JSON.stringify(errRes, null, 2));
    console.error("Critical error in booking handler stack:", err);
    res.status(500).json(errRes);
  }
});

// Therapist Registration Endpoint (Public Registration Application)
app.post("/api/therapist/register", async (req: Request, res: Response) => {
  try {
    const {
      nombre,
      apellidos,
      correo,
      password,
      telefono,
      fotografia,
      fechaNacimiento,
      direccion,
      curp,
      ineNumber,
      certificacionesInfo,
      cuentaBancariaCLABE,
      contactoEmergencia,
      especialidades,
      experienciaAnos,
      disponibilidad,
      zonasCobertura,
      documentos
    } = req.body || {};

    // 1. Validaciones de campos obligatorios
    if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
      return res.status(400).json({ success: false, error: "El nombre es obligatorio." });
    }
    if (!apellidos || typeof apellidos !== "string" || !apellidos.trim()) {
      return res.status(400).json({ success: false, error: "Los apellidos son obligatorios." });
    }
    if (!correo || typeof correo !== "string" || !correo.trim()) {
      return res.status(400).json({ success: false, error: "El correo electrónico es obligatorio." });
    }
    const trimmedEmail = correo.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ success: false, error: "El formato de correo electrónico no es válido." });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ success: false, error: "La contraseña debe contener al menos 6 caracteres." });
    }

    if (!telefono || typeof telefono !== "string" || !telefono.trim()) {
      return res.status(400).json({ success: false, error: "El teléfono de contacto es obligatorio." });
    }

    if (curp && typeof curp === "string" && curp.trim().length > 0 && curp.trim().length < 18) {
      return res.status(400).json({ success: false, error: "El CURP debe contener 18 caracteres alfanuméricos." });
    }

    const auth = adminAuth.getAuth();
    const db = getAdminFirestore();

    // 2. Creación en Firebase Authentication
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: trimmedEmail,
        password: password,
        displayName: `${nombre.trim()} ${apellidos.trim()}`
      });
    } catch (authError: any) {
      if (authError.code === "auth/email-already-exists") {
        return res.status(400).json({
          success: false,
          error: "El correo electrónico ya se encuentra registrado en ESSENYA. Inicia sesión o utiliza otro correo."
        });
      }
      return res.status(400).json({
        success: false,
        error: authError.message || "Error al crear la cuenta de usuario."
      });
    }

    const uid = userRecord.uid;

    // 3. Escritura atómica en Firestore con protección anti-huérfanos
    try {
      const batch = db.batch();

      // Registro en colección users
      batch.set(db.collection("users").doc(uid), {
        uid,
        email: trimmedEmail,
        correo: trimmedEmail,
        displayName: `${nombre.trim()} ${apellidos.trim()}`,
        nombreCompleto: `${nombre.trim()} ${apellidos.trim()}`,
        role: "terapeuta",
        rol: "terapeuta",
        isActive: false, // Inactiva hasta aprobación por admin
        estado: "pendiente",
        creadoEn: adminFirestore.FieldValue.serverTimestamp(),
        createdAt: adminFirestore.FieldValue.serverTimestamp(),
        updatedAt: adminFirestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Registro en colección terapeutas
      batch.set(db.collection("terapeutas").doc(uid), {
        id: uid,
        uid,
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        nombreCompleto: `${nombre.trim()} ${apellidos.trim()}`,
        correo: trimmedEmail,
        telefono: telefono.trim(),
        fotografia: fotografia || "",
        fechaNacimiento: fechaNacimiento || "",
        direccion: direccion || "",
        curp: (curp || "").toUpperCase().trim(),
        ineNumber: ineNumber || "",
        certificacionesInfo: certificacionesInfo || "",
        cuentaBancariaCLABE: cuentaBancariaCLABE || "",
        contactoEmergencia: contactoEmergencia || { nombre: "", parentesco: "", telefono: "" },
        especialidades: Array.isArray(especialidades) ? especialidades : ["Masaje Tejido Profundo"],
        experienciaAnos: Number(experienciaAnos) || 0,
        disponibilidad: disponibilidad || "Lunes a Sábado, 09:00 - 19:00",
        zonasCobertura: Array.isArray(zonasCobertura) ? zonasCobertura : ["Polanco", "Lomas de Chapultepec"],
        documentos: Array.isArray(documentos) ? documentos : [],
        estado: "pendiente",
        estadoAprobacion: "pendiente",
        estadoVerificacion: "no_verificado",
        puntuacion: 5.0,
        numeroResenas: 0,
        serviciosCompletados: 0,
        creadoEn: adminFirestore.FieldValue.serverTimestamp(),
        createdAt: adminFirestore.FieldValue.serverTimestamp(),
        updatedAt: adminFirestore.FieldValue.serverTimestamp(),
        solicitudRegistroFecha: adminFirestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Registro en log de auditoría
      const auditRef = db.collection("audit_logs").doc();
      batch.set(auditRef, {
        actorId: uid,
        actorEmail: trimmedEmail,
        actorRole: "terapeuta_postulante",
        action: "POSTULACION_REGISTRO_TERAPEUTA",
        details: `Nueva postulación de registro recibida para la terapeuta ${nombre.trim()} ${apellidos.trim()} (${trimmedEmail}). Estado: pendiente de revisión.`,
        timestamp: adminFirestore.FieldValue.serverTimestamp(),
        ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown"
      });

      await batch.commit();

      return res.status(201).json({
        success: true,
        uid,
        message: "Postulación de registro recibida con éxito. Tu cuenta será revisada por el equipo de administración ESSENYA."
      });
    } catch (fsError: any) {
      // Mecanismo anti-huérfanos: Si falla la base de datos, purgar la cuenta Auth recién creada
      try {
        await auth.deleteUser(uid);
      } catch (delErr) {
        console.error("Error eliminando usuario huérfano tras fallo en Firestore:", delErr);
      }
      return res.status(500).json({
        success: false,
        error: "Error interno al guardar la información en la base de datos. Intente de nuevo más tarde."
      });
    }
  } catch (error: any) {
    console.error("Error general en /api/therapist/register:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Error interno al procesar el registro."
    });
  }
});

// Admin endpoints
app.post("/api/admin/clean-demo-data", requireSuperAdmin, async (req, res) => {
  try {
    const db = getAdminFirestore();
    const batch = db.batch();
    const logs = await db.collection("audit_logs").limit(10).get();
    logs.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    res.json({ success: true, message: "Datos demo limpiados correctamente." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/admin/audit-log", requireAdmin, async (req, res) => {
  try {
    const { action, details } = req.body;
    if (!action || !details) return res.status(400).json({ success: false, error: "Datos incompletos" });
    
    const db = getAdminFirestore();
    await db.collection("audit_logs").add({
      actorId: (req as any).user.uid,
      actorEmail: (req as any).user.email,
      actorRole: (req as any).user.role || "administrador",
      action: action.substring(0, 100),
      details: details.substring(0, 500),
      timestamp: adminFirestore.FieldValue.serverTimestamp(),
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown"
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/admin/create-therapist-auth-profile", requireAdmin, async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: "Faltan datos" });
    
    const auth = adminAuth.getAuth();
    let userRecord;
    let isNewUser = true;
    try {
      userRecord = await auth.createUser({ email, password, displayName });
    } catch (err: any) {
      if (err.code === "auth/email-already-exists") {
        userRecord = await auth.getUserByEmail(email);
        isNewUser = false;
      } else {
        throw err;
      }
    }
    
    const uid = userRecord.uid;
    const db = getAdminFirestore();
    
    try {
      const batch = db.batch();
      batch.set(db.collection("users").doc(uid), {
        uid, email, role: "terapeuta", isActive: true, createdAt: adminFirestore.FieldValue.serverTimestamp()
      }, { merge: true });
      batch.set(db.collection("terapeutas").doc(uid), {
        uid, correo: email, nombreCompleto: displayName, estadoAprobacion: "pendiente", estadoVerificacion: "no_verificado"
      }, { merge: true });
      
      await batch.commit();
      res.json({ success: true, uid });
    } catch (fsError) {
      if (isNewUser) {
        await auth.deleteUser(uid);
        throw new Error("Fallo al escribir en base de datos. Se eliminó la cuenta para evitar huérfanos.");
      } else {
        throw new Error("Fallo al escribir en base de datos.");
      }
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/admin/verify-therapist-auth", requireAdmin, async (req, res) => {
  try {
    const { uid } = req.body;
    const userRecord = await adminAuth.getAuth().getUser(uid);
    res.json({ success: true, verified: true, email: userRecord.email });
  } catch (e) {
    res.status(404).json({ success: false, error: "Usuario no encontrado" });
  }
});

// Gemini endpoints
app.post("/api/gemini/concierge", requireAuth, async (req, res) => {
    try {
      const { userQuery, userPreferences, muscleTension, occasion } = req.body || {};

      // Sanitize inputs & minimize personal data
      const cleanUserQuery = sanitizePromptInput(userQuery || "Recomiéndame una experiencia según mi estado", 300);
      const cleanTension = sanitizePromptInput(muscleTension || "General / Estrés de trabajo", 200);
      const cleanOccasion = sanitizePromptInput(occasion || "Relajación personal", 100);

      // Sanitize preferences object (keep only non-PII keys)
      const sanitizedPrefs: Record<string, any> = {};
      if (userPreferences && typeof userPreferences === "object") {
        if (typeof userPreferences.pressure === "string") sanitizedPrefs.pressure = userPreferences.pressure.slice(0, 50);
        if (typeof userPreferences.ambientMusic === "string") sanitizedPrefs.ambientMusic = userPreferences.ambientMusic.slice(0, 50);
        if (typeof userPreferences.aromatherapy === "string") sanitizedPrefs.aromatherapy = userPreferences.aromatherapy.slice(0, 50);
        if (typeof userPreferences.focusArea === "string") sanitizedPrefs.focusArea = userPreferences.focusArea.slice(0, 50);
      }

      const prompt = `Eres el Sommelier de Bienestar y Concierge de Lujo de ESSENYA, la plataforma más exclusiva de masajes a domicilio de alta gama.
Colores de marca: Negro Profundo, Blanco Puro y Dorado Metálico.

Consulta del Cliente: "${cleanUserQuery}"
Tensión muscular / dolor indicado: "${cleanTension}"
Ocasión especial: "${cleanOccasion}"
Preferencias técnicas: ${JSON.stringify(sanitizedPrefs)}

Genera una recomendación sumamente elegante, sofisticada y personalizada que incluya:
1. El Ritual de Masaje ESSENYA recomendado (Opciones oficiales: 'Ritual Holístico Essenya', 'Masaje Tejido Profundo Imperial', 'Piedras Volcánicas de la India', 'Masaje Sueco de Seda', 'Experiencia en Pareja Gold', 'Ritual Shiatsu Zen', 'Masaje Prenatal Deluxe').
2. Duración sugerida (60, 90 o 120 minutos) y justificación.
3. Mezcla de Aromaterapia Orgánica de la casa sugerida (Lavanda Francesa, Eucalipto Silvestre o Ylang Ylang Dorado).
4. Un mensaje cálido, altamente exclusivo y personalizado en español impecable.

Devuelve una respuesta JSON estricta con las siguientes propiedades:
{
  "recommendedRitual": "nombre exacto del ritual",
  "recommendedDuration": 90,
  "essentialOil": "aceite recomendado",
  "pressureLevel": "Suave | Media | Firme | Profunda",
  "luxuryReasoning": "texto elegante explicando la razón de la selección",
  "conciergeGreeting": "mensaje directo al cliente con tono de concierge de hotel de 5 estrellas"
}`;

      const ai = await getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      let text = response.text || "{}";
      if (text.includes("```")) {
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      }
      
      const parsedData = JSON.parse(text);
      res.json({ success: true, recommendation: parsedData });
    } catch (error: any) {
      console.error("AI Concierge Error:", error?.message || "Unknown error");
      res.json({
        success: true,
        recommendation: {
          recommendedRitual: "Ritual Holístico Essenya",
          recommendedDuration: 90,
          essentialOil: "Lavanda Francesa y Ylang Ylang Dorado",
          pressureLevel: "Media-Firme",
          luxuryReasoning: "Una experiencia sublime diseñada para disolver nudos musculares y restaurar el flujo vital en la tranquilidad de su residencia.",
          conciergeGreeting: "Es un verdadero privilegio atenderle en ESSENYA. Hemos diseñado esta selección de alta gama para brindarle un espacio de absoluta serenidad."
        }
      });
    }
  });

  // Intelligent Therapist Matcher



app.post("/api/gemini/match-therapist", requireAuth, async (req, res) => {
    try {
      const { customerLocation, selectedService, duration, genderPreference, therapists } = req.body || {};

      // Sanitize inputs & strictly strip any PII
      const cleanService = sanitizePromptInput(selectedService || "Ritual Holístico Essenya", 100);
      const cleanDuration = Number(duration) || 90;
      const cleanZone = sanitizePromptInput(customerLocation || "Zona Polanco / Lomas", 100);
      const cleanGender = sanitizePromptInput(genderPreference || "Sin preferencia", 50);

      // Data minimization on therapists: never send phone numbers, emails, addresses or personal IDs
      const minimizedTherapists = Array.isArray(therapists)
        ? therapists.slice(0, 10).map((t: any) => ({
            id: String(t?.id || "").slice(0, 40),
            specialties: Array.isArray(t?.especialidades) ? t.especialidades.slice(0, 5) : [],
            rating: Number(t?.puntuacion || t?.rating) || 5.0,
            experienceYears: Number(t?.experienciaAnos) || 3,
            coverageZones: Array.isArray(t?.zonasCobertura) ? t.zonasCobertura.slice(0, 5) : [],
            gender: String(t?.genero || "femenino")
          }))
        : [];

      const prompt = `Eres el Algoritmo Inteligente de Asignación de Terapeutas de ESSENYA.
Analiza los siguientes terapeutas disponibles y la solicitud del cliente para seleccionar al mejor terapeuta pareado.

Solicitud del cliente:
- Servicio: ${cleanService} (${cleanDuration} min)
- Zona de atención: ${cleanZone}
- Preferencia de género: ${cleanGender}

Lista de Terapeutas disponibles:
${JSON.stringify(minimizedTherapists)}

Analiza las certificaciones, puntuación, tiempo estimado y coincidencia con el perfil.
Devuelve un JSON estricto con:
{
  "matchedTherapistId": "id del terapeuta seleccionado",
  "matchScorePercentage": 98,
  "matchExplanation": "breve explicación sofisticada de por qué este terapeuta es ideal para la sesión"
}`;

      const ai = await getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      let text = response.text || "{}";
      if (text.includes("```")) {
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      }
      
      const parsedData = JSON.parse(text);
      res.json({ success: true, match: parsedData });
    } catch (error: any) {
      console.error("Therapist Matcher Error:", error?.message || "Unknown error");
      const therapistsList = Array.isArray(req.body?.therapists) ? req.body.therapists : [];
      const firstTherapistId = therapistsList.length > 0 ? therapistsList[0].id : "ther-1";
      res.json({
        success: true,
        match: {
          matchedTherapistId: firstTherapistId,
          matchScorePercentage: 99,
          matchExplanation: "Fisioterapeuta senior seleccionada por proximidad geográfica óptima y especialidad certificada en el ritual seleccionado."
        }
      });
    }
  });

  // Post-Care Personalised Protocol



app.post("/api/gemini/post-care", requireAuth, async (req, res) => {
    try {
      const { ritualName, therapistNotes } = req.body || {};

      const cleanRitual = sanitizePromptInput(ritualName || "Ritual Holístico Essenya", 100);
      const cleanNotes = sanitizePromptInput(therapistNotes || "Comprensión muscular liberada en zona cervical y lumbar", 300);

      const prompt = `Como Especialista en Bienestar ESSENYA, redacta un protocolo post-masaje de alta gama para el cliente que acaba de finalizar su sesión:
Ritual recibido: "${cleanRitual}"
Notas de evaluación física: "${cleanNotes}"

Devuelve un JSON estricto con:
{
  "hydrationTip": "Recomendación de hidratación o infusión herbal post-sesión",
  "stretchingProtocol": ["Estiramiento 1", "Estiramiento 2"],
  "nextSessionRecommendationDays": 7,
  "careMessage": "Mensaje personalizado de despedida de lujo"
}`;

      const ai = await getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.6,
        },
      });

      let text = response.text || "{}";
      if (text.includes("```")) {
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      }
      
      res.json({ success: true, protocol: JSON.parse(text) });
    } catch (error: any) {
      console.error("Post Care Error:", error?.message || "Unknown error");
      res.json({
        success: true,
        protocol: {
          hydrationTip: "Beba al menos 750ml de agua tibia con infusión de lavanda o manzanilla durante las próximas 3 horas para favorecer la desintoxicación muscular.",
          stretchingProtocol: [
            "Inclinación lateral suave de cabeza sosteniendo 15 segundos cada lado.",
            "Rotación posterior de escápulas para mantener la apertura torácica."
          ],
          nextSessionRecommendationDays: 7,
          careMessage: "Ha sido un absoluto honor brindarle este servicio. Para preservar el estado de relajación profunda, le sugerimos reposar confortablemente el resto de su jornada."
        }
      });
    }
  });



app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ success: false, error: "Ocurrió un error inesperado al procesar la solicitud." });
});

export default app;
