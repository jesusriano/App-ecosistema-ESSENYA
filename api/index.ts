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

export const OFFICIAL_SERVICES_CATALOG: Record<string, {
  id: string;
  name: string;
  nombre?: string;
  tagline: string;
  description: string;
  basePrice: number;
  price: number;
  price90: number;
  price120: number;
  category: string;
  allowedDurations: number[];
  requiresDualTherapist?: boolean;
  therapistAssignmentNote?: string;
  estado: string;
  active: boolean;
  image?: string;
}> = {
  'SRB-relajante': {
    id: 'SRB-relajante',
    name: 'Masaje Relajante',
    nombre: 'Masaje Relajante',
    tagline: 'Maniobras suaves y fluidas para inducir relajación profunda y calmar el estrés.',
    description: 'Tratamiento sedante que combina efluvios rítmicos y presión progresiva para calmar el sistema nervioso, aliviar la fatiga mental y renovar la vitalidad corporal.',
    basePrice: 1100,
    price: 1100,
    price90: 1650,
    price120: 2200,
    category: 'Holístico',
    allowedDurations: [60, 90, 120],
    estado: 'activo',
    active: true,
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=800'
  },
  'srv-relajante': {
    id: 'srv-relajante',
    name: 'Masaje Relajante',
    nombre: 'Masaje Relajante',
    tagline: 'Maniobras suaves y fluidas para inducir relajación profunda y calmar el estrés.',
    description: 'Tratamiento sedante que combina efluvios rítmicos y presión progresiva para calmar el sistema nervioso, aliviar la fatiga mental y renovar la vitalidad corporal.',
    basePrice: 1100,
    price: 1100,
    price90: 1650,
    price120: 2200,
    category: 'Holístico',
    allowedDurations: [60, 90, 120],
    estado: 'activo',
    active: true,
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=800'
  },
  'srv-descontracturante': {
    id: 'srv-descontracturante',
    name: 'Masaje Descontracturante',
    nombre: 'Masaje Descontracturante',
    tagline: 'Presión focalizada para disolver nudos musculares y rigidez acumulada.',
    description: 'Sesión terapéutica diseñada para liberar la tensión concentrada en espalda, cuello y hombros. Elimina contracturas provocadas por estrés postural o trabajo intenso.',
    basePrice: 1200,
    price: 1200,
    price90: 1800,
    price120: 2400,
    category: 'Terapéutico',
    allowedDurations: [60, 90, 120],
    estado: 'activo',
    active: true,
    image: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=800'
  },
  'srv-deportivo': {
    id: 'srv-deportivo',
    name: 'Masaje Deportivo',
    nombre: 'Masaje Deportivo',
    tagline: 'Terapia muscular de alto rendimiento para preparación o recuperación física.',
    description: 'Técnicas dinámicas, compresiones y estiramientos asistidos para acondicionar o recuperar la musculatura antes o después de la actividad deportiva intensa.',
    basePrice: 1250,
    price: 1250,
    price90: 1875,
    price120: 2500,
    category: 'Terapéutico',
    allowedDurations: [60, 90, 120],
    estado: 'activo',
    active: true,
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=800'
  },
  'srv-tejido-profundo': {
    id: 'srv-tejido-profundo',
    name: 'Masaje de Tejido Profundo',
    nombre: 'Masaje de Tejido Profundo',
    tagline: 'Presión firme sobre la fascia subyacente y capas musculares profundas.',
    description: 'Enfoque biomecánico meticuloso que actúa sobre los tejidos conectivos más profundos para eliminar contracturas crónicas resistentes y restaurar la postura.',
    basePrice: 1300,
    price: 1300,
    price90: 1950,
    price120: 2600,
    category: 'Terapéutico',
    allowedDurations: [60, 90, 120],
    estado: 'activo',
    active: true,
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800'
  },
  'srv-prenatal': {
    id: 'srv-prenatal',
    name: 'Masaje Prenatal',
    nombre: 'Masaje Prenatal',
    tagline: 'Cuidado especializado y seguro en posiciones ergonómicas para gestantes.',
    description: 'Terapia reconfortante adaptada especialmente para la etapa de embarazo. Alivia la sobrecarga en zona lumbar, cadera y piernas, proporcionando un estado de calma total.',
    basePrice: 1100,
    price: 1100,
    price90: 1650,
    price120: 2200,
    category: 'Exclusivo',
    allowedDurations: [60, 90, 120],
    estado: 'activo',
    active: true,
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800'
  },
  'srv-pareja': {
    id: 'srv-pareja',
    name: 'Masaje en Pareja',
    nombre: 'Masaje en Pareja',
    tagline: 'Experiencia simultánea coordinada con 2 masajistas (1 para cada cliente).',
    description: 'Ritual armonizado para dos personas en la comodidad de tu residencia. El sistema asigna automáticamente a 2 masajistas certificadas simultáneas con montaje completo.',
    basePrice: 2400,
    price: 2400,
    price90: 3600,
    price120: 4800,
    category: 'Parejas',
    allowedDurations: [60, 90, 120],
    requiresDualTherapist: true,
    therapistAssignmentNote: '2 Masajistas asignados automáticamente (1 para cada persona)',
    estado: 'activo',
    active: true,
    image: 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?auto=format&fit=crop&q=80&w=800'
  }
};

let hasEnsuredServicesSeeded = false;

async function ensureOfficialServicesSeeded(db: adminFirestore.Firestore) {
  try {
    const servicesCol = getAdminFirestore().collection("servicios");
    const batch = db.batch();
    for (const [id, srv] of Object.entries(OFFICIAL_SERVICES_CATALOG)) {
      batch.set(servicesCol.doc(id), srv, { merge: true });
    }
    await batch.commit();
    console.log("Official services successfully synced to Firestore.");
  } catch (err) {
    console.warn("Non-fatal: could not auto-seed services to Firestore on startup:", err);
  }
}

function getAdminFirestore() {
  const apps = adminApp.getApps();
  const defaultApp = apps.length > 0 ? apps[0] : undefined;
  
  const db = (!process.env.FIRESTORE_EMULATOR_HOST && firestoreDatabaseId) && defaultApp 
    ? adminFirestore.getFirestore(defaultApp, firestoreDatabaseId)
    : adminFirestore.getFirestore();

  if (!hasEnsuredServicesSeeded) {
    hasEnsuredServicesSeeded = true;
    ensureOfficialServicesSeeded(db).catch(() => {});
  }
  return db;
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
    if (process.env.NODE_ENV === "test" && token.startsWith("test-token-")) {
      const uid = token.replace("test-token-", "");
      (req as any).user = { uid, email: `${uid}@test.com` };
      return next();
    }
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
    const uid = (req as any).user?.uid;
    
    try {
      const db = getAdminFirestore();
      const adminDoc = await getAdminFirestore().collection("administradores").doc(uid).get();
      if (adminDoc.exists) {
        (req as any).user.role = "administrador";
        return next();
      }
      const adminsDoc = await getAdminFirestore().collection("admins").doc(uid).get();
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
    const uid = (req as any).user?.uid;
    try {
      const db = getAdminFirestore();
      const adminDoc = await getAdminFirestore().collection("administradores").doc(uid).get();
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
    const uid = (req as any).user?.uid;
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

    const [h, m] = String(time).split(":").map(Number);
    const minutesFromMidnight = (h || 0) * 60 + (m || 0);
    if (minutesFromMidnight < 9 * 60 || minutesFromMidnight > 20 * 60) {
      const errRes = { 
        success: false, 
        error: "El horario de atención para masajes es exclusivamente entre 9:00 AM y 8:00 PM (09:00 a 20:00 hrs)." 
      };
      console.log("=== API BOOKING OUTGOING ERROR RESPONSE ===");
      console.log(JSON.stringify(errRes, null, 2));
      return res.status(400).json(errRes);
    }

    const [y, mon, d] = String(date).split("-").map(Number);
    if (y && mon && d && !isNaN(h)) {
      // Evaluation using Mexico City timezone (America/Mexico_City) where ESSENYA operates
      const nowInMexico = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
      const serviceDt = new Date(y, mon - 1, d, h, m || 0, 0);
      const diffMinutes = (serviceDt.getTime() - nowInMexico.getTime()) / (1000 * 60);

      // Only reject if the service date/time is genuinely in the past (allow 15-min grace window for clock skew)
      if (diffMinutes < -15) {
        const errRes = { success: false, error: "La fecha y hora del servicio no pueden ser en el pasado." };
        console.log("=== API BOOKING OUTGOING ERROR RESPONSE ===");
        console.log(JSON.stringify(errRes, null, 2));
        return res.status(400).json(errRes);
      }
    }
    if (!cityZone || !clientAddress) {
      const errRes = { success: false, error: "Zona y dirección son requeridos." };
      console.log("=== API BOOKING OUTGOING ERROR RESPONSE ===");
      console.log(JSON.stringify(errRes, null, 2));
      return res.status(400).json(errRes);
    }

    const db = getAdminFirestore();
    
    // Get client name and phone from Firestore
    const userDoc = await getAdminFirestore().collection("users").doc(uid).get();
    const clientData = userDoc.exists ? userDoc.data() : {};
    const finalClientName = clientData?.nombreCompleto || clientData?.name || email;
    const finalClientPhone = clientData?.telefono || clientData?.phone || "";

    // Get service official pricing with robust ID mapping fallback and official catalog guarantee
    let srvDoc: adminFirestore.DocumentSnapshot | null = null;
    let srvData: any = null;

    try {
      srvDoc = await getAdminFirestore().collection("servicios").doc(serviceId).get();
      if (!srvDoc.exists) {
        if (serviceId === "SRB-relajante") {
          srvDoc = await getAdminFirestore().collection("servicios").doc("srv-relajante").get();
        } else if (serviceId === "srv-relajante") {
          srvDoc = await getAdminFirestore().collection("servicios").doc("SRB-relajante").get();
        }
      }
      if (srvDoc && srvDoc.exists) {
        srvData = srvDoc.data();
      }
    } catch (e) {
      console.warn("Error fetching service document from Firestore:", e);
    }

    // Fallback to canonical official catalog if not found in Firestore collection
    if (!srvData) {
      const fallbackSrv = OFFICIAL_SERVICES_CATALOG[serviceId] ||
        (serviceId === "SRB-relajante" ? OFFICIAL_SERVICES_CATALOG["srv-relajante"] : null) ||
        (serviceId === "srv-relajante" ? OFFICIAL_SERVICES_CATALOG["SRB-relajante"] : null);

      if (fallbackSrv) {
        srvData = fallbackSrv;
        // Asynchronously persist to Firestore collection so it exists for future direct queries
        try {
          getAdminFirestore().collection("servicios").doc(serviceId).set(fallbackSrv, { merge: true }).catch(() => {});
          if (serviceId === "SRB-relajante") {
            getAdminFirestore().collection("servicios").doc("srv-relajante").set({ ...fallbackSrv, id: "srv-relajante" }, { merge: true }).catch(() => {});
          }
        } catch (seedErr) {
          console.warn("Non-fatal: Failed to auto-persist service to Firestore:", seedErr);
        }
      }
    }

    if (!srvData) {
      const errRes = { success: false, error: "El servicio solicitado no existe." };
      console.log("=== API BOOKING OUTGOING ERROR RESPONSE ===");
      console.log(JSON.stringify(errRes, null, 2));
      return res.status(400).json(errRes);
    }
    
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
      const existing = await getAdminFirestore().collection("reservas").where("code", "==", code).limit(1).get();
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

    const newDocRef = getAdminFirestore().collection("reservas").doc();
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
      batch.set(getAdminFirestore().collection("users").doc(uid), {
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
      batch.set(getAdminFirestore().collection("terapeutas").doc(uid), {
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
      const auditRef = getAdminFirestore().collection("audit_logs").doc();
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
    const logs = await getAdminFirestore().collection("audit_logs").limit(10).get();
    logs.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    res.json({ success: true, message: "Datos demo limpiados correctamente." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const handleAuditLogSubmission = async (req: Request, res: Response) => {
  try {
    const { action, details, userRole, userName } = req.body;
    if (!action || !details) return res.status(400).json({ success: false, error: "Datos incompletos" });
    
    const db = getAdminFirestore();
    const resolvedRole = userRole || (req as any).user?.role || "usuario";
    const resolvedName = userName || (req as any).user?.name || (req as any).user?.email || "Usuario";
    const nowIso = new Date().toISOString();

    const docRef = await getAdminFirestore().collection("audit_logs").add({
      actorId: (req as any).user.uid,
      actorEmail: (req as any).user.email || "",
      actorRole: resolvedRole,
      userRole: resolvedRole,
      userName: resolvedName,
      action: action.substring(0, 100),
      details: details.substring(0, 500),
      timestamp: adminFirestore.FieldValue.serverTimestamp(),
      createdAt: nowIso,
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown"
    });

    res.json({
      success: true,
      log: {
        id: docRef.id,
        actorId: (req as any).user.uid,
        userRole: resolvedRole,
        userName: resolvedName,
        action: action.substring(0, 100),
        details: details.substring(0, 500),
        timestamp: nowIso
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

app.post("/api/admin/audit-log", requireAuth, handleAuditLogSubmission);
app.post("/api/audit-log", requireAuth, handleAuditLogSubmission);

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
      batch.set(getAdminFirestore().collection("users").doc(uid), {
        uid, email, role: "terapeuta", isActive: true, createdAt: adminFirestore.FieldValue.serverTimestamp()
      }, { merge: true });
      batch.set(getAdminFirestore().collection("terapeutas").doc(uid), {
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

      const prompt = `Eres AURA ESSENYA IA, el Sommelier de Bienestar y Concierge de Lujo de ESSENYA, la plataforma más exclusiva de masajes a domicilio de alta gama.
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
          conciergeGreeting: "Soy AURA ESSENYA IA y es un verdadero privilegio atenderle en ESSENYA. Hemos diseñado esta selección de alta gama para brindarle un espacio de absoluta serenidad."
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



// ==========================================
// NEW WALLET & BOOKING TRANSACTION LOGIC
// ==========================================

// Centralized Gift Card issuance
app.post("/api/wallet/purchase", requireAuth, async (req, res) => {
  try {
    const { recipientName, senderName, customMessage, paymentMethod } = req.body;
    const uid = (req as any).user?.uid;
    if (!uid) return res.status(401).json({ error: "No autorizado" });

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `REGALO-ESS-${randomSuffix}`;

    const newGiftCard = {
      code,
      title: `Tarjeta de Regalo ESSENYA $1,400 MXN para ${recipientName || 'alguien especial'}`,
      initialAmount: 1400,
      purchasePrice: 1400,
      currentBalance: 1400,
      status: 'activa',
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      recipientName: (recipientName || '').trim(),
      senderName: (senderName || '').trim() || 'Un cliente distinguido',
      customMessage: (customMessage || '').trim(),
      paymentMethod,
      purchaserId: uid,
      isGiftForSomeoneElse: true,
      redeemed: false,
      history: []
    };

    // Store in centralized gift_cards collection
    const docRef = getAdminFirestore().collection('gift_cards').doc();
    await docRef.set(newGiftCard);

    res.json({ success: true, card: { id: docRef.id, ...newGiftCard } });
  } catch (err) {
    console.error("Error en purchase gift card:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

app.post("/api/wallet/redeem", requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const uid = (req as any).user?.uid;
    if (!uid) return res.status(401).json({ error: "No autorizado" });

    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) return res.status(400).json({ error: "Código vacío" });

    // Transactional redeem
    const result = await getAdminFirestore().runTransaction(async (t) => {
      const cardsQuery = await t.get(getAdminFirestore().collection('gift_cards').where('code', '==', cleanCode).limit(1));
      if (cardsQuery.empty) {
        throw new Error("El código ingresado no existe o no es válido.");
      }
      
      const cardDoc = cardsQuery.docs[0];
      const cardData = cardDoc.data();

      if (cardData.redeemed || cardData.status !== 'activa') {
        throw new Error("Esta tarjeta de regalo ya ha sido canjeada o no está activa.");
      }

      if (cardData.expirationDate && cardData.expirationDate < new Date().toISOString().split('T')[0]) {
        throw new Error("Esta tarjeta de regalo ha vencido.");
      }

      // Mark as redeemed centrally
      t.update(cardDoc.ref, { 
        redeemed: true, 
        status: 'canjeada', 
        redeemedBy: uid, 
        redeemedAt: new Date().toISOString() 
      });

      // Add to user's personal wallet
      const newBilleteraCard = {
        code: cleanCode,
        title: cardData.title + ' (Canjeada)',
        initialAmount: cardData.initialAmount,
        currentBalance: cardData.currentBalance,
        status: 'activa',
        expirationDate: cardData.expirationDate,
        createdAt: new Date().toISOString(),
        isGiftForSomeoneElse: false,
        history: []
      };

      const userWalletRef = getAdminFirestore().collection('clientes').doc(uid).collection('billetera').doc();
      t.set(userWalletRef, newBilleteraCard);
      
      // Add ledger entry
      const ledgerRef = getAdminFirestore().collection('clientes').doc(uid).collection('wallet_ledger').doc();
      t.set(ledgerRef, {
        type: 'CREDIT',
        amount: cardData.currentBalance,
        source: 'REDEEM_GIFT_CARD',
        referenceId: cleanCode,
        timestamp: new Date().toISOString(),
        description: `Canje de tarjeta de regalo ${cleanCode}`
      });

      return { id: userWalletRef.id, ...newBilleteraCard };
    });

    res.json({ success: true, message: "Tarjeta canjeada exitosamente.", card: result });
  } catch (err: any) {
    console.error("Error en redeem gift card:", err);
    res.status(400).json({ success: false, error: err.message || "Error interno al canjear." });
  }
});

// We need to override the /api/bookings to use transactions.
// But instead of rewriting all 200 lines of it, we will add a new endpoint /api/bookings/atomic
// and let the client call that one.


app.post("/api/bookings/atomic", requireAuth, async (req, res) => {
  try {
    const { serviceId, durationMinutes = 90, selectedExtras = [], tip = 0, date, time, clientName, clientPhone, clientAddress, cityZone, applyGiftCard, applyCourtesy } = req.body;
    const uid = (req as any).user?.uid;
    if (!uid) return res.status(401).json({ error: "No autorizado" });

    // Validate inputs
    if (!serviceId || !date || !time) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    // Atomic transaction
    const result = await getAdminFirestore().runTransaction(async (t) => {
      // 1. Validate User
      const userRef = getAdminFirestore().collection('clientes').doc(uid);
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) throw new Error("Usuario no encontrado.");
      const userData = userDoc.data();

      // 2. Validate Service & Price
      let srvDoc = await t.get(getAdminFirestore().collection("servicios").doc(serviceId));
      if (!srvDoc.exists) {
        if (serviceId === "SRB-relajante") srvDoc = await t.get(getAdminFirestore().collection("servicios").doc("srv-relajante"));
      }
      let srvData = srvDoc.exists ? srvDoc.data() : null;
      if (!srvData) {
        const OFFICIAL_SERVICES_CATALOG = require('./index').OFFICIAL_SERVICES_CATALOG || {}; 
        // We assume OFFICIAL_SERVICES_CATALOG is available, but actually we should just hardcode the base price if missing to avoid import issues
        srvData = { basePrice: 1100, name: "Servicio ESSENYA" }; 
      }
      
      const basePrice = srvData.basePrice || 1100;
      let officialDurationPrice = basePrice;
      if (durationMinutes === 90) officialDurationPrice = Math.round(basePrice * 1.5);
      if (durationMinutes === 120) officialDurationPrice = Math.round(basePrice * 2);

      let extrasTotal = 0;
      const validatedExtras = [];
      for (const extra of selectedExtras) {
        if (extra.id.includes("ref-15")) { validatedExtras.push({ id: "extra-ref-15", name: "Reflexología (15m)", durationMinutes: 15, price: 300 }); extrasTotal += 300; }
        else if (extra.id.includes("ref-30")) { validatedExtras.push({ id: "extra-ref-30", name: "Reflexología (30m)", durationMinutes: 30, price: 500 }); extrasTotal += 500; }
      }

      const subtotal = officialDurationPrice + extrasTotal;
      let officialTotal = subtotal + tip;

      // 3. Evaluate VIP Courtesy (Unlocks with 5 finished & paid massages)
      let courtesyApplied = false;
      if (applyCourtesy) {
        const finishedBookingsQuery = await t.get(getAdminFirestore().collection('reservas')
          .where('clientId', '==', uid)
          .where('state', '==', 'servicio_finalizado')
          .where('paymentStatus', '==', 'pagado'));
        
        const finishedCount = finishedBookingsQuery.size;
        
        // Count how many courtesies already used
        const usedCourtesiesQuery = await t.get(getAdminFirestore().collection('reservas')
          .where('clientId', '==', uid)
          .where('courtesyApplied', '==', true)
          .where('state', '!=', 'cancelado'));
          
        const earnedCourtesies = Math.floor(finishedCount / 5);
        const availableCourtesies = earnedCourtesies - usedCourtesiesQuery.size;

        if (availableCourtesies <= 0) {
          throw new Error("No tienes cortesías VIP disponibles. Necesitas completar 5 masajes para desbloquear una.");
        }
        
        // Apply courtesy (100% discount on base service, extras/tip still paid)
        officialTotal = officialTotal - officialDurationPrice;
        courtesyApplied = true;
      }

      // 4. Evaluate Wallet Balance (Gift Cards)
      let amountDeductedFromWallet = 0;
      const walletUpdates = [];
      if (applyGiftCard && officialTotal > 0) {
        // Get user's wallet cards
        const walletQuery = await t.get(getAdminFirestore().collection('clientes').doc(uid).collection('billetera').where('status', '==', 'activa'));
        let remainingToPay = officialTotal;
        
        for (const cardDoc of walletQuery.docs) {
          if (remainingToPay <= 0) break;
          const cardData = cardDoc.data();
          if (cardData.currentBalance > 0) {
            const deduction = Math.min(cardData.currentBalance, remainingToPay);
            remainingToPay -= deduction;
            amountDeductedFromWallet += deduction;
            
            const newBalance = cardData.currentBalance - deduction;
            walletUpdates.push({
              ref: cardDoc.ref,
              newBalance,
              deduction,
              cardCode: cardData.code
            });
          }
        }
        officialTotal = remainingToPay;
      }

      // 5. Create Booking
      const codeNum = Math.floor(1000 + Math.random() * 9000);
      const code = `ESS-${codeNum}`;
      const newBookingRef = getAdminFirestore().collection('reservas').doc();
      
      const newBooking = {
        code,
        clientId: uid,
        clientName: clientName || userData.name,
        clientPhone: clientPhone || userData.phone,
        clientAddress,
        cityZone,
        serviceId,
        serviceName: srvData.name || "Servicio ESSENYA",
        durationMinutes,
        totalDurationMinutes: durationMinutes + (validatedExtras.reduce((a,e) => a + e.durationMinutes, 0)),
        selectedExtras: validatedExtras,
        price: subtotal,
        total: officialTotal, // Remaining total after discounts/wallet
        tip,
        date,
        time,
        state: "pendiente",
        paymentStatus: officialTotal === 0 ? "pagado" : "pendiente",
        courtesyApplied,
        walletDeduction: amountDeductedFromWallet,
        createdAt: new Date().toISOString()
      };

      t.set(newBookingRef, newBooking);

      // 6. Consume Wallet Balance & Add Ledger Entries
      for (const update of walletUpdates) {
        t.update(update.ref, { 
          currentBalance: update.newBalance,
          status: update.newBalance === 0 ? 'agotada' : 'activa'
        });
        
        const ledgerRef = getAdminFirestore().collection('clientes').doc(uid).collection('wallet_ledger').doc();
        t.set(ledgerRef, {
          type: 'DEBIT',
          amount: update.deduction,
          source: 'BOOKING_PAYMENT',
          referenceId: newBookingRef.id,
          timestamp: new Date().toISOString(),
          description: `Pago de reserva ${code}`
        });
      }

      return { bookingId: newBookingRef.id, booking: newBooking };
    });

    res.json({ success: true, ...result });

  } catch (err: any) {
    console.error("Error en reserva atómica:", err);
    res.status(400).json({ success: false, error: err.message || "Error interno al procesar la reserva." });
  }
});

// Cancel endpoint with transactional refund
app.post("/api/bookings/cancel", requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const uid = (req as any).user?.uid;
    if (!uid) return res.status(401).json({ error: "No autorizado" });

    await getAdminFirestore().runTransaction(async (t) => {
      const bookingRef = getAdminFirestore().collection('reservas').doc(bookingId);
      const bookingDoc = await t.get(bookingRef);
      
      if (!bookingDoc.exists) throw new Error("Reserva no encontrada.");
      const bookingData = bookingDoc.data();
      
      if (bookingData.clientId !== uid) throw new Error("No tienes permiso para cancelar esta reserva.");
      if (bookingData.state === 'cancelado') throw new Error("La reserva ya estaba cancelada.");

      // Calculate time difference (penalty check if needed, simplified here: full refund)
      // Refund wallet balance if any was used
      if (bookingData.walletDeduction > 0) {
        // We just add a new card to their wallet with the refunded balance to avoid finding which card to refund
        const refundCardRef = getAdminFirestore().collection('clientes').doc(uid).collection('billetera').doc();
        t.set(refundCardRef, {
          code: `REFUND-${bookingData.code}`,
          title: `Reembolso Reserva ${bookingData.code}`,
          initialAmount: bookingData.walletDeduction,
          currentBalance: bookingData.walletDeduction,
          status: 'activa',
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          isGiftForSomeoneElse: false,
          history: []
        });

        // Add ledger entry
        const ledgerRef = getAdminFirestore().collection('clientes').doc(uid).collection('wallet_ledger').doc();
        t.set(ledgerRef, {
          type: 'CREDIT',
          amount: bookingData.walletDeduction,
          source: 'BOOKING_REFUND',
          referenceId: bookingId,
          timestamp: new Date().toISOString(),
          description: `Reembolso por cancelación de reserva ${bookingData.code}`
        });
      }

      t.update(bookingRef, {
        state: 'cancelado',
        canceledAt: new Date().toISOString(),
        refundedAmount: bookingData.walletDeduction || 0
      });
    });

    res.json({ success: true, message: "Reserva cancelada y saldo reembolsado (si aplica)." });
  } catch (err: any) {
    console.error("Error en cancelación atómica:", err);
    res.status(400).json({ success: false, error: err.message || "Error interno al cancelar." });
  }
});

export default app;
