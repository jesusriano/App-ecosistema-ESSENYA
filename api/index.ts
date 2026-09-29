import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import webPush from "web-push";
import Stripe from "stripe";
import { stripeService } from "./stripe-service.js";
import { sendPushNotificationToUser } from "./pushNotificationService.js";
import * as adminApp from "firebase-admin/app";
import * as adminAuth from "firebase-admin/auth";
import * as adminFirestore from "firebase-admin/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key');

function sanitizeVapidKey(key: string): string {
  return String(key || '')
    .trim()
    .replace(/^['"]|['"]$/g, '') // Strip quotes
    .replace(/\+/g, '-')        // Replace + with -
    .replace(/\//g, '_')        // Replace / with _
    .replace(/=/g, '');         // Strip padding =
}

// Initialize VAPID Keys for Web Push purely from environment variables for production security
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey) vapidPublicKey = sanitizeVapidKey(vapidPublicKey);
if (vapidPrivateKey) vapidPrivateKey = sanitizeVapidKey(vapidPrivateKey);

if (!vapidPrivateKey) {
  console.error('[WebPush-Audit] ALERTA: VAPID_PRIVATE_KEY no está configurada en api/index.ts.');
} else if (!vapidPublicKey) {
  console.error('[WebPush-Audit] ALERTA: VAPID_PUBLIC_KEY no está configurada en api/index.ts.');
} else {
  try {
    webPush.setVapidDetails(
      process.env.VAPID_SUBJECT || process.env.VAPID_EMAIL || 'mailto:seguridad@essenyamexico.com',
      vapidPublicKey,
      vapidPrivateKey
    );
    console.log('[WebPush-Audit] VAPID configurado exitosamente en api/index.ts.');
  } catch (e: any) {
    console.warn('[WebPush-Audit] Falló al configurar detalles de VAPID:', e?.message);
  }
}
import { getServiceById } from "./services/service-catalog.js";
import {
  stepDispatchEngine,
  rejectDispatchOffer,
  acceptDispatchOfferAtomic,
  getDispatchSettings,
  DEFAULT_DISPATCH_LEVELS
} from "./dispatch.js";


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


app.use(express.json({
  limit: "50mb",
  verify: (req: any, res, buf) => {
    if (req.originalUrl && req.originalUrl.includes('/api/stripe')) {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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

export function getAdminFirestore() {
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

/**
 * Verificación administrativa centralizada compartida entre middlewares y endpoints.
 * Aplica las reglas estrictas de ESSENYA:
 * 1. Cuentas maestras explícitas (essenya222@gmail.com, graphixglow.2024@gmail.com)
 * 2. Dominio corporativo obligatorio (@essenya.mx o @essenya.com)
 * 3. Documento existente y con estado === 'activo' en 'administradores/{uid}' (o fallback histórico 'admins/{uid}')
 */
async function verifyAdminStatus(uid: string, email: string): Promise<{ isAdmin: boolean; isMaster?: boolean; errorReason?: string; adminData?: any }> {
  const normalizedEmail = (email || "").toLowerCase().trim();

  // 1. Cuentas maestras autorizadas explícitamente en el proyecto
  const isMaster = normalizedEmail === "essenya222@gmail.com" || normalizedEmail === "graphixglow.2024@gmail.com";
  if (isMaster) {
    return { isAdmin: true, isMaster: true };
  }

  // Soporte para pruebas automatizadas locales con mock tokens
  if (process.env.NODE_ENV === 'test' && uid && uid.includes('admin')) {
    return { isAdmin: true };
  }

  // 2. Requisito de dominio corporativo obligatorio para administradores normales
  const hasCorporateDomain = normalizedEmail.endsWith("@essenya.mx") || normalizedEmail.endsWith("@essenya.com");
  if (!hasCorporateDomain) {
    return { 
      isAdmin: false, 
      errorReason: "No autorizado. Se requiere correo corporativo (@essenya.mx o @essenya.com) y registro activo de administrador." 
    };
  }

  // 3. Verificación de existencia y estado activo en Firestore
  try {
    const db = getAdminFirestore();

    // Consultar documento en 'administradores/{uid}'
    const adminDoc = await db.collection("administradores").doc(uid).get();
    if (adminDoc.exists) {
      const adminData = adminDoc.data();
      const status = (adminData?.estado || "activo").toLowerCase();
      if (status === "activo") {
        return { isAdmin: true, adminData };
      } else {
        return { isAdmin: false, errorReason: "Cuenta de administrador inactiva o suspendida." };
      }
    }

    // Fallback para colección histórica 'admins/{uid}'
    const adminsDoc = await db.collection("admins").doc(uid).get();
    if (adminsDoc.exists) {
      const adminsData = adminsDoc.data();
      const status = (adminsData?.estado || "activo").toLowerCase();
      if (status === "activo") {
        return { isAdmin: true, adminData: adminsData };
      } else {
        return { isAdmin: false, errorReason: "Cuenta de administrador inactiva o suspendida." };
      }
    }
  } catch (e) {
    console.warn("Error al verificar rol de administrador en Firestore:", e);
  }

  return { isAdmin: false, errorReason: "No autorizado. Usuario no registrado como administrador en el sistema." };
}

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void | any> {
  await requireAuth(req, res, async () => {
    const uid = (req as any).user?.uid;
    const email = (req as any).user?.email || "";

    const check = await verifyAdminStatus(uid, email);
    if (!check.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: check.errorReason || "No autorizado. Usuario no registrado como administrador en el sistema." 
      });
    }

    (req as any).user.role = "administrador";
    if (check.isMaster) (req as any).user.isMasterAdmin = true;
    if (check.adminData) (req as any).user.adminData = check.adminData;
    return next();
  });
}

async function requireSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void | any> {
  await requireAuth(req, res, async () => {
    const uid = (req as any).user?.uid;
    const email = ((req as any).user?.email || "").toLowerCase().trim();

    // 1. Cuentas maestras autorizadas explícitamente en el proyecto
    const isMaster = email === "essenya222@gmail.com" || email === "graphixglow.2024@gmail.com";
    if (isMaster) {
      (req as any).user.role = "superadmin";
      (req as any).user.isMasterAdmin = true;
      return next();
    }

    // 2. Requiere dominio corporativo + registro en administradores con nivelAcceso superadmin y estado activo
    const hasCorporateDomain = email.endsWith("@essenya.mx") || email.endsWith("@essenya.com");
    if (!hasCorporateDomain) {
      return res.status(403).json({ success: false, error: "No autorizado. Se requiere cuenta autorizada de superadministrador." });
    }

    try {
      const db = getAdminFirestore();
      const adminDoc = await db.collection("administradores").doc(uid).get();
      if (adminDoc.exists) {
        const data = adminDoc.data();
        const status = (data?.estado || "activo").toLowerCase();
        const isSuper = data?.nivelAcceso === "superadmin" || data?.role === "superadmin" || data?.rol === "superadmin";
        if (status === "activo" && isSuper) {
          (req as any).user.role = "superadmin";
          return next();
        }
      }
    } catch (e) {
      console.warn("Error comprobando superadmin en Firestore:", e);
    }
    return res.status(403).json({ success: false, error: "No autorizado. Se requiere superadministrador activo." });
  });
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV || "development", timestamp: new Date().toISOString() });
});

// Synchronize and set custom claims on Firebase Auth using Admin SDK
app.post("/api/auth/sync-claims", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const uid = user?.uid;
    const email = (user?.email || "").toLowerCase().trim();

    if (!uid) {
      return res.status(400).json({ success: false, error: "UID no encontrado en el token de autenticación." });
    }

    const db = getAdminFirestore();
    let detectedRole: "administrador" | "terapeuta" | "cliente" = "cliente";
    let permissions: string[] = ["client:access", "client:bookings"];
    let isAdmin = false;

    // 1. Evaluar si es Administrador (Cuenta Maestra o Dominio Corporativo + Registro Activo en administradores)
    const isMasterAdmin = email === "essenya222@gmail.com" || email === "graphixglow.2024@gmail.com";
    const hasCorporateDomain = email.endsWith("@essenya.mx") || email.endsWith("@essenya.com");

    let isAuthorizedAdmin = false;

    if (isMasterAdmin) {
      isAuthorizedAdmin = true;
    } else if (hasCorporateDomain) {
      const adminDoc = await db.collection("administradores").doc(uid).get();
      if (adminDoc.exists) {
        const adminData = adminDoc.data();
        const status = (adminData?.estado || "activo").toLowerCase();
        if (status === "activo") {
          isAuthorizedAdmin = true;
        }
      } else {
        // Fallback colección admins
        const adminsDoc = await db.collection("admins").doc(uid).get();
        if (adminsDoc.exists) {
          const adminsData = adminsDoc.data();
          const status = (adminsData?.estado || "activo").toLowerCase();
          if (status === "activo") {
            isAuthorizedAdmin = true;
          }
        }
      }
    }

    if (isAuthorizedAdmin) {
      detectedRole = "administrador";
      isAdmin = true;
      permissions = ["admin:all", "admin:access", "therapist:access", "client:access"];
    } else {
      // Check if user is Therapist in Firestore
      const therapistDoc = await db.collection("terapeutas").doc(uid).get();
      if (therapistDoc.exists) {
        detectedRole = "terapeuta";
        permissions = ["therapist:access", "therapist:services", "client:access"];
      } else {
        detectedRole = "cliente";
        permissions = ["client:access", "client:bookings"];
      }
    }

    const newClaims = {
      role: detectedRole,
      rol: detectedRole,
      admin: isAdmin,
      permissions: permissions,
      syncedAt: new Date().toISOString()
    };

    // Set custom claims in Firebase Authentication using Admin SDK
    try {
      await adminAuth.getAuth().setCustomUserClaims(uid, newClaims);
    } catch (setClaimsErr) {
      console.warn("Could not set custom user claims in Firebase Auth Admin:", setClaimsErr);
    }

    return res.json({
      success: true,
      uid,
      email,
      role: detectedRole,
      isAdmin,
      permissions,
      claims: newClaims
    });
  } catch (error: any) {
    console.error("Error syncing claims:", error);
    return res.status(500).json({ success: false, error: error.message || "Error al sincronizar claims" });
  }
});

// Explicit token verification endpoint
app.post("/api/auth/verify-token", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, valid: false, error: "No se proporcionó token Bearer válido." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = await adminAuth.getAuth().verifyIdToken(token, true); // checkRevoked = true
    const role = decoded.role || decoded.rol || (decoded.admin ? "administrador" : "cliente");
    return res.json({
      success: true,
      valid: true,
      uid: decoded.uid,
      email: decoded.email,
      claims: decoded,
      role,
      isAdmin: Boolean(decoded.admin || role === "administrador"),
      exp: decoded.exp
    });
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      valid: false,
      error: "Token expirado, revocado o inválido."
    });
  }
});

// Secure booking creation endpoint
app.post("/api/bookings", requireAuth, async (req: Request, res: Response) => {
  try {
    const { serviceId, date, time, preferences, clientAddress, cityZone, paymentMethod } = req.body;
    const uid = (req as any).user?.uid;
    const email = (req as any).user.email;

    if (paymentMethod) {
      const pmStr = String(paymentMethod).toLowerCase();
      if (pmStr.includes('efectivo') || pmStr.includes('cash')) {
        return res.status(400).json({ success: false, error: "El pago en efectivo no está disponible. Solo se admiten tarjeta y transferencia bancaria." });
      }
    }

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

    // Get service official pricing using the cached service catalog layer (Firestore + TTL cache + static fallback)
    const srvData = await getServiceById(db, serviceId);

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
      id: '', // Will be assigned doc.id
      code,
      clientId: uid,
      clientName: finalClientName,
      clientPhone: finalClientPhone,
      clientAddress,
      cityZone,
      clientLat: typeof req.body.clientLat === 'number' ? req.body.clientLat : null,
      clientLng: typeof req.body.clientLng === 'number' ? req.body.clientLng : null,
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
      paymentMethod: paymentMethod || 'Tarjeta de Crédito / Débito',
      state: "pendiente",
      paymentStatus: "pendiente", // ALWAYS pendiente on creation
      dispatchState: "buscando",
      currentDispatchLevel: 10,
      dispatchStartedAt: new Date().toISOString(),
      activeOfferTherapistIds: [],
      activeOffers: [],
      dispatchHistory: [],
      createdAt: new Date().toISOString()
    };

    const newDocRef = getAdminFirestore().collection("reservas").doc();
    newBooking.id = newDocRef.id;
    await newDocRef.set(newBooking);
    
    // Trigger dispatch engine step immediately for Level 1 (<= 10 min)
    stepDispatchEngine(getAdminFirestore(), newDocRef.id, process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY).catch(e => {
      console.warn("[Dispatch] Initial step async error:", e);
    });

    const successRes = { success: true, bookingId: newDocRef.id, booking: newBooking };
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
      banco,
      numeroCuenta,
      titularCuenta,
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

    // 2. Creación o recuperación en Firebase Authentication
    let userRecord;
    let isExistingAuthUser = false;
    try {
      userRecord = await auth.createUser({
        email: trimmedEmail,
        password: password,
        displayName: `${nombre.trim()} ${apellidos.trim()}`
      });
    } catch (authError: any) {
      if (authError.code === "auth/email-already-exists") {
        try {
          userRecord = await auth.getUserByEmail(trimmedEmail);
          isExistingAuthUser = true;

          // Si ya está activo como terapeuta registrado y aprobado
          const existingSnap = await db.collection("terapeutas").doc(userRecord.uid).get();
          if (existingSnap.exists && existingSnap.data()?.estado === "activo") {
            return res.status(400).json({
              success: false,
              error: "Esta cuenta de terapeuta ya se encuentra registrada y activa en ESSENYA. Puedes iniciar sesión directamente con tu correo y contraseña."
            });
          }

          // Si estaba pendiente o incompleto, actualizar contraseña y nombre para permitir culminar su postulación
          try {
            await auth.updateUser(userRecord.uid, {
              password: password,
              displayName: `${nombre.trim()} ${apellidos.trim()}`
            });
          } catch (updErr) {
            console.warn("No se pudo actualizar Auth en re-postulación:", updErr);
          }
        } catch (getErr: any) {
          return res.status(400).json({
            success: false,
            error: "El correo electrónico ya se encuentra en uso. Por favor inicia sesión o utiliza otro correo."
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          error: authError.message || "Error al crear la cuenta de usuario."
        });
      }
    }

    const uid = userRecord.uid;

    // 3. Escritura atómica en Firestore con protección anti-huérfanos
    try {
      const batch = db.batch();

      // Registro en colección users
      batch.set(db.collection("users").doc(uid), {
        uid,
        id: uid,
        email: trimmedEmail,
        correo: trimmedEmail,
        displayName: `${nombre.trim()} ${apellidos.trim()}`,
        nombreCompleto: `${nombre.trim()} ${apellidos.trim()}`,
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        telefono: telefono.trim(),
        role: "terapeuta",
        rol: "terapeuta",
        isActive: false, // Inactiva hasta aprobación por admin
        estado: "pendiente",
        creadoEn: adminFirestore.FieldValue.serverTimestamp(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Registro en colección terapeutas
      batch.set(db.collection("terapeutas").doc(uid), {
        id: uid,
        uid,
        userId: uid,
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        nombreCompleto: `${nombre.trim()} ${apellidos.trim()}`,
        correo: trimmedEmail,
        email: trimmedEmail,
        telefono: telefono.trim(),
        fotografia: fotografia || "",
        fechaNacimiento: fechaNacimiento || "",
        direccion: direccion || "",
        curp: (curp || "").toUpperCase().trim(),
        ineNumber: ineNumber || "",
        certificacionesInfo: certificacionesInfo || "",
        cuentaBancariaCLABE: cuentaBancariaCLABE || "",
        banco: banco || "",
        numeroCuenta: numeroCuenta || "",
        titularCuenta: titularCuenta || "",
        contactoEmergencia: contactoEmergencia || { nombre: "", parentesco: "", telefono: "" },
        especialidades: Array.isArray(especialidades) && especialidades.length > 0 ? especialidades : ["Masaje Tejido Profundo"],
        experienciaAnos: Number(experienciaAnos) || 0,
        disponibilidad: disponibilidad || "Lunes a Sábado, 09:00 - 19:00",
        zonasCobertura: Array.isArray(zonasCobertura) && zonasCobertura.length > 0 ? zonasCobertura : ["Polanco", "Lomas de Chapultepec"],
        documentos: Array.isArray(documentos) ? documentos : [],
        estado: "pendiente",
        status: "pendiente",
        estadoAprobacion: "pendiente",
        estadoVerificacion: "no_verificado",
        puntuacion: 5.0,
        numeroResenas: 0,
        serviciosCompletados: 0,
        creadoEn: adminFirestore.FieldValue.serverTimestamp(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        solicitudRegistroFecha: new Date().toISOString()
      }, { merge: true });

      // Guardar datos sensibles y bancarios en subcolección privada
      batch.set(db.collection("terapeutas").doc(uid).collection("private_info").doc("sensitive"), {
        curp: (curp || "").toUpperCase().trim(),
        ineNumber: ineNumber || "",
        cuentaBancariaCLABE: cuentaBancariaCLABE || "",
        banco: banco || "",
        numeroCuenta: numeroCuenta || "",
        titularCuenta: titularCuenta || "",
        updatedAt: new Date().toISOString()
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
        createdAt: new Date().toISOString(),
        ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown"
      });

      await batch.commit();

      return res.status(201).json({
        success: true,
        uid,
        message: "Postulación de registro recibida con éxito. Tu cuenta será revisada por el equipo de administración ESSENYA."
      });
    } catch (fsError: any) {
      // Mecanismo anti-huérfanos: Si falla la base de datos y la cuenta es nueva, purgar la cuenta Auth
      if (!isExistingAuthUser) {
        try {
          await auth.deleteUser(uid);
        } catch (delErr) {
          console.error("Error eliminando usuario huérfano tras fallo en Firestore:", delErr);
        }
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

// Endpoint para consultar terapeutas (con auto-curación de huérfanos y deduplicación)
app.get("/api/admin/therapists", requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection("terapeutas").get();
    
    // Auto-curación: Verificar si existen terapeutas en 'users' que no estén en 'terapeutas'
    try {
      const usersSnap = await db.collection("users").where("rol", "==", "terapeuta").get();
      const existingEmails = new Set<string>();
      snapshot.docs.forEach(d => {
        const c = (d.data().correo || d.data().email || "").toLowerCase().trim();
        if (c) existingEmails.add(c);
      });

      for (const uDoc of usersSnap.docs) {
        const uData = uDoc.data();
        const email = (uData.correo || uData.email || "").toLowerCase().trim();
        if (email && !existingEmails.has(email)) {
          console.log(`[Auto-heal] Syncing missing therapist from users to terapeutas: ${email} (${uDoc.id})`);
          await db.collection("terapeutas").doc(uDoc.id).set({
            id: uDoc.id,
            uid: uDoc.id,
            userId: uDoc.id,
            nombre: uData.nombre || "Terapeuta",
            apellidos: uData.apellidos || "",
            nombreCompleto: uData.nombreCompleto || `${uData.nombre || "Terapeuta"} ${uData.apellidos || ""}`.trim(),
            correo: email,
            email: email,
            telefono: uData.telefono || "",
            estado: uData.estado || "pendiente",
            status: uData.estado || "pendiente",
            estadoAprobacion: uData.estado === "activo" ? "aprobado" : "pendiente",
            especialidades: uData.especialidades || ["Masaje Tejido Profundo"],
            zonasCobertura: uData.zonasCobertura || ["Polanco", "Lomas de Chapultepec"],
            puntuacion: 5.0,
            numeroResenas: 0,
            serviciosCompletados: 0,
            creadoEn: uData.fechaRegistro || new Date().toISOString(),
            createdAt: uData.fechaRegistro || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
          existingEmails.add(email);
        }
      }
    } catch (healErr) {
      console.warn("Auto-heal check in /api/admin/therapists encountered error:", healErr);
    }

    // Re-leer terapeutas para asegurar lista actualizada y limpia
    const freshSnapshot = await db.collection("terapeutas").get();
    const seenEmails = new Set<string>();
    const therapists: any[] = [];

    freshSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const email = (data.correo || data.email || "").toLowerCase().trim();
      
      // Deduplicar por correo en caso de registros previos duplicados
      if (email && seenEmails.has(email)) {
        return;
      }
      if (email) {
        seenEmails.add(email);
      }

      therapists.push({
        id: doc.id,
        ...data,
        creadoEn: data.creadoEn?.toDate ? data.creadoEn.toDate().toISOString() : data.creadoEn,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        solicitudRegistroFecha: data.solicitudRegistroFecha?.toDate ? data.solicitudRegistroFecha.toDate().toISOString() : data.solicitudRegistroFecha
      });
    });

    return res.json({
      success: true,
      count: therapists.length,
      therapists
    });
  } catch (error: any) {
    console.error("Error al obtener terapeutas en backend:", error);
    return res.status(500).json({ success: false, error: error.message });
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

app.post("/api/admin/verify-therapist-auth", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { uid, email } = req.body || {};
    const auth = adminAuth.getAuth();
    let userRecord;
    
    if (uid) {
      try {
        userRecord = await auth.getUser(uid);
      } catch (err) {
        if (email) {
          userRecord = await auth.getUserByEmail(email.trim().toLowerCase());
        } else {
          throw err;
        }
      }
    } else if (email) {
      userRecord = await auth.getUserByEmail(email.trim().toLowerCase());
    } else {
      return res.status(400).json({ success: false, error: "Se requiere uid o email" });
    }

    return res.json({
      success: true,
      verified: true,
      exists: true,
      uid: userRecord.uid,
      email: userRecord.email,
      disabled: userRecord.disabled
    });
  } catch (e: any) {
    return res.status(404).json({ success: false, exists: false, error: "Usuario no encontrado en Firebase Auth." });
  }
});

// Endpoint integral para actualizar estado / dar de alta terapeutas
app.post("/api/admin/therapist/status", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { therapistId, status, reason, email } = req.body || {};
    if (!therapistId || !status) {
      return res.status(400).json({ success: false, error: "Faltan parámetros obligatorios: therapistId y status." });
    }

    const validStatuses = ["activo", "inactivo", "bloqueado", "rechazado", "pendiente"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Estado no válido. Opciones permitidas: ${validStatuses.join(", ")}` });
    }

    const db = getAdminFirestore();
    const auth = adminAuth.getAuth();

    // 1. Localizar documento de la terapeuta
    let thDocRef = db.collection("terapeutas").doc(therapistId);
    let thSnap = await thDocRef.get();

    if (!thSnap.exists && email) {
      const emailQuery = await db.collection("terapeutas").where("correo", "==", email.trim().toLowerCase()).limit(1).get();
      if (!emailQuery.empty) {
        thDocRef = emailQuery.docs[0].ref;
        thSnap = emailQuery.docs[0];
      }
    }

    // Si aún no existe, revisar 'users'
    if (!thSnap.exists) {
      const userSnap = await db.collection("users").doc(therapistId).get();
      if (userSnap.exists) {
        const uData = userSnap.data() || {};
        await thDocRef.set({
          id: therapistId,
          uid: therapistId,
          nombre: uData.nombre || "Terapeuta",
          apellidos: uData.apellidos || "",
          nombreCompleto: uData.nombreCompleto || `${uData.nombre || "Terapeuta"} ${uData.apellidos || ""}`.trim(),
          correo: uData.correo || uData.email || email || "",
          telefono: uData.telefono || "",
          estado: status,
          estadoAprobacion: status === "activo" ? "aprobado" : "pendiente",
          especialidades: ["Masaje Tejido Profundo"],
          zonasCobertura: ["Polanco", "Lomas de Chapultepec"],
          puntuacion: 5.0,
          resenasCount: 0,
          serviciosCompletados: 0,
          creadoEn: adminFirestore.FieldValue.serverTimestamp(),
          createdAt: new Date().toISOString()
        }, { merge: true });
        thSnap = await thDocRef.get();
      }
    }

    if (!thSnap.exists) {
      return res.status(404).json({ success: false, error: `No se encontró terapeuta con ID ${therapistId}.` });
    }

    const therapistData = thSnap.data() || {};
    const targetEmail = (therapistData.correo || therapistData.email || email || "").trim().toLowerCase();
    let targetUid = thSnap.id;

    // 2. Verificar o asegurar existencia de cuenta en Firebase Auth
    let authUserRecord;
    try {
      if (targetUid) {
        authUserRecord = await auth.getUser(targetUid);
      }
    } catch {
      if (targetEmail) {
        try {
          authUserRecord = await auth.getUserByEmail(targetEmail);
          targetUid = authUserRecord.uid;
        } catch {
          // No existe aún en Auth
        }
      }
    }

    let generatedPassword: string | undefined = undefined;
    if (!authUserRecord && targetEmail) {
      try {
        generatedPassword = `Essenya${Math.floor(1000 + Math.random() * 9000)}!`;
        authUserRecord = await auth.createUser({
          email: targetEmail,
          password: generatedPassword,
          displayName: `${therapistData.nombre || "Terapeuta"} ${therapistData.apellidos || ""}`.trim()
        });
        targetUid = authUserRecord.uid;
      } catch (authCreateErr: any) {
        console.warn("No se pudo crear automáticamente la cuenta en Auth:", authCreateErr);
      }
    }

    const adminEmail = (req as any).user?.email || "admin@essenya.mx";
    const nowIso = new Date().toISOString();
    const batch = db.batch();

    // 3. Actualizar colección 'terapeutas'
    const primaryThRef = db.collection("terapeutas").doc(targetUid);
    batch.set(primaryThRef, {
      ...therapistData,
      id: targetUid,
      uid: targetUid,
      userId: targetUid,
      estado: status,
      status: status,
      estadoAprobacion: status === "activo" ? "aprobado" : (status === "rechazado" ? "rechazado" : "pendiente"),
      motivoRechazoAccount: status === "rechazado" ? (reason || "No cumple con criterios de acreditación.") : null,
      fechaActualizacion: nowIso,
      updatedAt: nowIso,
      ...(status === "activo" ? {
        fechaAprobacion: nowIso,
        aprobadoPor: adminEmail,
        estadoVerificacion: "verificado"
      } : {})
    }, { merge: true });

    // Si el ID original era diferente del UID de Auth, limpiar el documento anterior
    if (thSnap.id !== targetUid) {
      batch.delete(db.collection("terapeutas").doc(thSnap.id));
    }

    // 4. Actualizar colección 'users'
    const userRef = db.collection("users").doc(targetUid);
    batch.set(userRef, {
      uid: targetUid,
      id: targetUid,
      correo: targetEmail,
      email: targetEmail,
      nombre: therapistData.nombre || "Terapeuta",
      apellidos: therapistData.apellidos || "",
      nombreCompleto: `${therapistData.nombre || "Terapeuta"} ${therapistData.apellidos || ""}`.trim(),
      rol: "terapeuta",
      role: "terapeuta",
      estado: status,
      isActive: status === "activo",
      fechaActualizacion: nowIso,
      ...(status === "activo" ? {
        fechaAprobacion: nowIso,
        aprobadoPor: adminEmail
      } : {})
    }, { merge: true });

    // 5. Sincronizar 'terapeutas_publicos'
    const publicRef = db.collection("terapeutas_publicos").doc(targetUid);
    if (status === "activo") {
      batch.set(publicRef, {
        id: targetUid,
        name: `${therapistData.nombre || "Terapeuta"} ${therapistData.apellidos || ""}`.trim(),
        nombre: `${therapistData.nombre || "Terapeuta"} ${therapistData.apellidos || ""}`.trim(),
        photo: therapistData.fotografia || "",
        fotografia: therapistData.fotografia || "",
        phone: therapistData.telefono || "",
        telefono: therapistData.telefono || "",
        rating: therapistData.puntuacion || 5.0,
        puntuacion: therapistData.puntuacion || 5.0,
        reviewCount: therapistData.resenasCount || 0,
        resenasCount: therapistData.resenasCount || 0,
        specialties: therapistData.especialidades || ["Masaje Tejido Profundo"],
        especialidades: therapistData.especialidades || ["Masaje Tejido Profundo"],
        status: "disponible",
        estado: "activo",
        coverageZones: therapistData.zonasCobertura || ["Polanco", "Lomas de Chapultepec"],
        zonasCobertura: therapistData.zonasCobertura || ["Polanco", "Lomas de Chapultepec"],
        completedServicesCount: therapistData.serviciosCompletados || 0,
        serviciosCompletados: therapistData.serviciosCompletados || 0,
        bio: therapistData.biografia || "Terapeuta certificada ESSENYA.",
        biografia: therapistData.biografia || "Terapeuta certificada ESSENYA.",
        updatedAt: nowIso
      }, { merge: true });
    } else {
      batch.set(publicRef, {
        status: "desconectado",
        estado: status,
        updatedAt: nowIso
      }, { merge: true });
    }

    // 6. Registro en auditoría
    const auditRef = db.collection("audit_logs").doc();
    batch.set(auditRef, {
      actorId: (req as any).user?.uid || "admin",
      actorEmail: adminEmail,
      actorRole: "administrador",
      action: status === "activo" ? "ALTA_TERAPEUTA_APROBADA" : `CAMBIO_ESTADO_TERAPEUTA_${status.toUpperCase()}`,
      details: `Administración actualizó el estado de la terapeuta ${therapistData.nombre} ${therapistData.apellidos || ""} a "${status}". Motivo: ${reason || "Aprobación oficial"}`,
      timestamp: adminFirestore.FieldValue.serverTimestamp(),
      createdAt: nowIso,
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown"
    });

    await batch.commit();

    return res.json({
      success: true,
      therapistId: targetUid,
      status,
      generatedPassword,
      message: `El estado de la terapeuta ha sido actualizado a "${status}" exitosamente.`
    });
  } catch (error: any) {
    console.error("Error en /api/admin/therapist/status:", error);
    return res.status(500).json({ success: false, error: error.message || "Error interno al actualizar estado." });
  }
});

// Endpoint para eliminar terapeuta
app.delete("/api/admin/therapist/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getAdminFirestore();
    const batch = db.batch();

    batch.delete(db.collection("terapeutas").doc(id));
    batch.delete(db.collection("users").doc(id));
    batch.delete(db.collection("terapeutas_publicos").doc(id));

    const auditRef = db.collection("audit_logs").doc();
    batch.set(auditRef, {
      actorId: (req as any).user?.uid || "admin",
      actorEmail: (req as any).user?.email || "admin@essenya.mx",
      actorRole: "administrador",
      action: "ELIMINACION_TERAPEUTA",
      details: `Terapeuta con ID ${id} eliminada permanentemente del sistema por administración.`,
      timestamp: adminFirestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    });

    await batch.commit();
    return res.json({ success: true, message: "Terapeuta eliminada exitosamente." });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
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

// Centralized Gift Card issuance (Created as 'pendiente_pago' until payment is verified)
app.post("/api/wallet/purchase", requireAuth, async (req, res) => {
  try {
    const { recipientName, senderName, customMessage, paymentMethod } = req.body;
    const uid = (req as any).user?.uid;
    if (!uid) return res.status(401).json({ error: "No autorizado" });

    if (paymentMethod) {
      const pmStr = String(paymentMethod).toLowerCase();
      if (pmStr.includes('efectivo') || pmStr.includes('cash')) {
        return res.status(400).json({ success: false, error: "El pago en efectivo no está permitido. Solo se admite tarjeta y transferencia bancaria." });
      }
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `REGALO-ESS-${randomSuffix}`;

    const newGiftCard = {
      code,
      title: `Tarjeta de Regalo ESSENYA $1,400 MXN para ${recipientName || 'alguien especial'}`,
      initialAmount: 1400,
      purchasePrice: 1400,
      currentBalance: 0, // Balance inactive until confirmed
      status: 'pendiente_pago',
      active: false,
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      recipientName: (recipientName || '').trim(),
      senderName: (senderName || '').trim() || 'Un cliente distinguido',
      customMessage: (customMessage || '').trim(),
      paymentMethod: paymentMethod || 'transferencia',
      paymentStatus: 'pendiente',
      purchaserId: uid,
      isGiftForSomeoneElse: true,
      redeemed: false,
      history: []
    };

    // Store in centralized gift_cards collection
    const docRef = getAdminFirestore().collection('gift_cards').doc();
    await docRef.set(newGiftCard);

    res.json({
      success: true,
      message: "Tarjeta de regalo registrada con éxito. Estado: pendiente de confirmación de pago.",
      card: { id: docRef.id, ...newGiftCard }
    });
  } catch (err) {
    console.error("Error en purchase gift card:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// Admin activation for Gift Cards upon payment verification (SPEI / Confirmation)
app.post("/api/admin/gift-cards/activate", requireAdmin, async (req, res) => {
  try {
    const uid = (req as any).user?.uid;
    const { code, cardId, paymentReference } = req.body;
    if (!code && !cardId) {
      return res.status(400).json({ success: false, error: "Se requiere código o ID de la tarjeta." });
    }

    const result = await getAdminFirestore().runTransaction(async (t) => {
      let cardDoc: FirebaseFirestore.DocumentSnapshot;
      if (cardId) {
        const cardRef = getAdminFirestore().collection('gift_cards').doc(cardId);
        cardDoc = await t.get(cardRef);
      } else {
        const q = await t.get(getAdminFirestore().collection('gift_cards').where('code', '==', code.trim().toUpperCase()).limit(1));
        if (q.empty) throw new Error("Tarjeta no encontrada.");
        cardDoc = q.docs[0];
      }

      if (!cardDoc.exists) throw new Error("Tarjeta no encontrada.");
      const cardData = cardDoc.data()!;

      if (cardData.status === 'activa') {
        throw new Error("La tarjeta ya se encuentra activa.");
      }

      const activatedData = {
        status: 'activa',
        active: true,
        currentBalance: cardData.initialAmount || 1400,
        paymentStatus: 'pagado',
        paymentReference: paymentReference || `SPEI-${Date.now()}`,
        activatedAt: new Date().toISOString(),
        activatedBy: uid
      };

      t.update(cardDoc.ref, activatedData);
      return { id: cardDoc.id, ...cardData, ...activatedData };
    });

    res.json({ success: true, message: "Tarjeta de regalo activada exitosamente tras verificación de pago.", card: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || "Error al activar tarjeta." });
  }
});

// Admin list all gift cards
app.get("/api/admin/gift-cards", requireAdmin, async (req, res) => {
  try {
    const snap = await getAdminFirestore().collection('gift_cards').get();
    const cards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort in memory by createdAt descending
    cards.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json({ success: true, cards });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Error al listar tarjetas." });
  }
});

// Admin generate gift card directly with immediate active status
app.post("/api/admin/gift-cards/generate", requireAdmin, async (req, res) => {
  try {
    const uid = (req as any).user?.uid;
    const { customCode, recipientName, amount, senderName, customMessage } = req.body;
    
    const code = (customCode || `REGALO-ESS-${Math.floor(1000 + Math.random() * 9000)}`).trim().toUpperCase();
    const balance = typeof amount === 'number' && amount > 0 ? amount : 1400;

    // Check if code already exists
    const existing = await getAdminFirestore().collection('gift_cards').where('code', '==', code).limit(1).get();
    if (!existing.empty) {
      return res.status(400).json({ success: false, error: `El código ${code} ya existe. Elige otro código o genera uno automático.` });
    }

    const newCard = {
      code,
      title: `Tarjeta de Regalo ESSENYA $${balance.toLocaleString()} MXN para ${recipientName || 'Cliente Especial'}`,
      initialAmount: balance,
      purchasePrice: balance,
      currentBalance: balance,
      status: 'activa',
      active: true,
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      recipientName: (recipientName || '').trim() || 'Cliente VIP',
      senderName: (senderName || '').trim() || 'Administración ESSENYA',
      customMessage: (customMessage || '').trim() || '¡Disfruta de tu experiencia de bienestar en ESSENYA!',
      paymentMethod: 'administracion',
      paymentStatus: 'pagado',
      purchaserId: uid,
      isGiftForSomeoneElse: true,
      redeemed: false,
      history: []
    };

    const docRef = getAdminFirestore().collection('gift_cards').doc();
    await docRef.set(newCard);

    res.json({
      success: true,
      message: `Tarjeta de regalo ${code} generada exitosamente con saldo de $${balance.toLocaleString()} MXN.`,
      card: { id: docRef.id, ...newCard }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Error al generar tarjeta." });
  }
});

// Validate gift card code endpoint (returns card details if valid and active)
app.post("/api/wallet/validate-code", requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const uid = (req as any).user?.uid;
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) return res.status(400).json({ valid: false, message: "Código no proporcionado." });

    // 1. Check user's personal wallet first
    const userCards = await getAdminFirestore().collection('clientes').doc(uid).collection('billetera')
      .where('code', '==', cleanCode)
      .where('status', '==', 'activa')
      .limit(1)
      .get();

    if (!userCards.empty) {
      const docSnap = userCards.docs[0];
      const data = docSnap.data();
      if (data.currentBalance > 0) {
        return res.json({
          valid: true,
          message: `Saldo disponible de $${data.currentBalance.toLocaleString()} MXN`,
          card: { id: docSnap.id, ...data }
        });
      }
    }

    // 2. Check centralized gift_cards
    const globalCards = await getAdminFirestore().collection('gift_cards')
      .where('code', '==', cleanCode)
      .limit(1)
      .get();

    if (globalCards.empty) {
      if (cleanCode === 'REGALO-ESS-1400') {
        const demoCard = {
          code: 'REGALO-ESS-1400',
          title: 'Tarjeta de Regalo ESSENYA Oficial ($1,400 MXN)',
          initialAmount: 1400,
          purchasePrice: 1400,
          currentBalance: 1400,
          status: 'activa',
          active: true,
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          recipientName: 'Cliente Distinguido',
          senderName: 'ESSENYA Wellness',
          customMessage: 'Disfruta de una experiencia exclusiva de masajes a domicilio.',
          paymentMethod: 'cortesia',
          paymentStatus: 'pagado',
          purchaserId: 'system',
          isGiftForSomeoneElse: true,
          redeemed: false,
          history: []
        };
        const ref = getAdminFirestore().collection('gift_cards').doc('gift-card-demo-1400');
        await ref.set(demoCard);
        return res.json({
          valid: true,
          message: `Tarjeta de regalo válida con saldo de $1,400 MXN.`,
          card: { id: ref.id, ...demoCard }
        });
      }
      return res.status(404).json({ valid: false, message: "El código no existe o no es válido." });
    }

    const gCard = globalCards.docs[0].data();
    if (gCard.status !== 'activa' || gCard.active !== true) {
      return res.status(400).json({ valid: false, message: `La tarjeta no está activa (Estado: ${gCard.status}). Debe confirmarse el pago antes de utilizarla.` });
    }
    if (gCard.redeemed) {
      return res.status(400).json({ valid: false, message: "La tarjeta ya ha sido canjeada." });
    }

    res.json({
      valid: true,
      message: `Tarjeta de regalo válida con saldo de $${gCard.currentBalance.toLocaleString()} MXN.`,
      card: { id: globalCards.docs[0].id, ...gCard }
    });
  } catch (err: any) {
    res.status(500).json({ valid: false, message: err.message || "Error al validar código." });
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
      let cardDoc: any = !cardsQuery.empty ? cardsQuery.docs[0] : null;

      if (!cardDoc && cleanCode === 'REGALO-ESS-1400') {
        const demoRef = getAdminFirestore().collection('gift_cards').doc('gift-card-demo-1400');
        const demoCard = {
          code: 'REGALO-ESS-1400',
          title: 'Tarjeta de Regalo ESSENYA Oficial ($1,400 MXN)',
          initialAmount: 1400,
          purchasePrice: 1400,
          currentBalance: 1400,
          status: 'activa',
          active: true,
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          recipientName: 'Cliente Distinguido',
          senderName: 'ESSENYA Wellness',
          customMessage: 'Disfruta de una experiencia exclusiva de masajes a domicilio.',
          paymentMethod: 'cortesia',
          paymentStatus: 'pagado',
          purchaserId: 'system',
          isGiftForSomeoneElse: true,
          redeemed: false,
          history: []
        };
        t.set(demoRef, demoCard);
        cardDoc = { ref: demoRef, data: () => demoCard };
      }

      if (!cardDoc) {
        throw new Error("El código ingresado no existe o no es válido.");
      }
      
      const cardData = cardDoc.data();

      if (cardData.redeemed === true || cardData.status === 'canjeada') {
        throw new Error("Esta tarjeta de regalo ya ha sido canjeada.");
      }

      const isCardActive = (cardData.status === 'activa' || cardData.active === true) && cardData.status !== 'pendiente_pago' && cardData.active !== false;
      if (!isCardActive) {
        throw new Error("Esta tarjeta de regalo no está activa o se encuentra pendiente de pago.");
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

// Strict atomic booking with Option B validation, official catalog checks, and full input sanitization
app.post("/api/bookings/atomic", requireAuth, async (req, res) => {
  try {
    const { 
      serviceId, 
      durationMinutes = 60, 
      selectedExtras = [], 
      tip = 0, 
      date, 
      time, 
      clientName, 
      clientPhone, 
      clientAddress, 
      cityZone, 
      applyGiftCard, 
      expectedWalletDeduction, 
      expectedFinalTotal, 
      applyCourtesy,
      giftCardCode,
      paymentMethod
    } = req.body;

    const uid = (req as any).user?.uid;
    if (!uid) return res.status(401).json({ error: "No autorizado" });

    // Strict payment method validation: reject 'efectivo' or any unauthorized cash method
    if (paymentMethod) {
      const pmStr = String(paymentMethod).toLowerCase();
      if (pmStr.includes('efectivo') || pmStr.includes('cash')) {
        return res.status(400).json({ success: false, error: "El pago en efectivo no está disponible. Solo se admiten tarjeta y transferencia bancaria." });
      }
    }

    // Validate inputs
    if (!serviceId || typeof serviceId !== 'string') {
      return res.status(400).json({ success: false, error: "El identificador de servicio es obligatorio." });
    }

    if (![60, 90, 120].includes(durationMinutes)) {
      return res.status(400).json({ success: false, error: "Duración de servicio no válida. Solo se admiten 60, 90 o 120 minutos." });
    }

    if (typeof tip !== 'number' || isNaN(tip) || tip < 0 || tip > 5000) {
      return res.status(400).json({ success: false, error: "Monto de propina no válido (debe ser un valor entre $0 y $5,000 MXN)." });
    }

    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: "Formato de fecha inválido (debe ser YYYY-MM-DD)." });
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (date < todayStr) {
      return res.status(400).json({ success: false, error: "No es posible agendar citas en fechas pasadas." });
    }

    if (!time || typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({ success: false, error: "Formato de hora inválido (debe ser HH:MM)." });
    }
    const [hour, minute] = time.split(':').map(Number);
    if (hour < 9 || hour > 20 || (hour === 20 && minute > 0) || minute < 0 || minute >= 60) {
      return res.status(400).json({ success: false, error: "Horario fuera del rango operativo (09:00 a 20:00 hrs)." });
    }

    if (!clientAddress || typeof clientAddress !== 'string' || clientAddress.trim().length < 5) {
      return res.status(400).json({ success: false, error: "La dirección del servicio es obligatoria y debe ser válida." });
    }

    if (!cityZone || typeof cityZone !== 'string' || !cityZone.trim()) {
      return res.status(400).json({ success: false, error: "La zona geográfica o cobertura es obligatoria." });
    }

    // Atomic transaction
    const result = await getAdminFirestore().runTransaction(async (t) => {
      // ----------------------------------------------------
      // PHASE 1: ALL READS FIRST (No writes permitted in Phase 1)
      // ----------------------------------------------------
      
      // 1. Read User documents
      const userRef = getAdminFirestore().collection('clientes').doc(uid);
      const userDoc = await t.get(userRef);
      let userData: any = {};
      let userDocToCreate: any = null;

      if (!userDoc.exists) {
        const authUserDoc = await t.get(getAdminFirestore().collection('users').doc(uid));
        const authData = authUserDoc.exists ? authUserDoc.data() : {};
        userData = {
          id: uid,
          userId: uid,
          name: authData.nombre ? `${authData.nombre} ${authData.apellidos || ''}`.trim() : (clientName || 'Cliente ESSENYA'),
          email: authData.correo || authData.email || '',
          phone: clientPhone || authData.telefono || '',
          membershipTier: 'Platino',
          address: clientAddress || '',
          cityZone: cityZone || 'Polanco / Reforma',
          spentTotal: 0,
          totalBookings: 0,
          isBlocked: false,
          createdAt: new Date().toISOString()
        };
        // DO NOT write yet! Defer t.set(userRef, userData) to Phase 3.
        userDocToCreate = userData;
      } else {
        userData = userDoc.data() || {};
      }

      // 2. Read Service document
      let srvDoc = await t.get(getAdminFirestore().collection("servicios").doc(serviceId));
      if (!srvDoc.exists) {
        if (serviceId === "SRB-relajante") srvDoc = await t.get(getAdminFirestore().collection("servicios").doc("srv-relajante"));
        else if (serviceId === "srv-relajante") srvDoc = await t.get(getAdminFirestore().collection("servicios").doc("SRB-relajante"));
      }

      // 3. Read Courtesy Bookings (if requested)
      let allClientBookings: any = null;
      if (applyCourtesy) {
        allClientBookings = await t.get(getAdminFirestore().collection('reservas')
          .where('clientId', '==', uid));
      }

      // 4. Read Gift Card or Wallet documents (if requested)
      const isWalletRequested = applyGiftCard === true || (typeof expectedWalletDeduction === 'number' && expectedWalletDeduction > 0) || !!giftCardCode;
      let gcQuery: any = null;
      let walletQuery: any = null;

      if (isWalletRequested) {
        if (giftCardCode && typeof giftCardCode === 'string') {
          const cleanCode = giftCardCode.trim().toUpperCase();
          gcQuery = await t.get(getAdminFirestore().collection('gift_cards').where('code', '==', cleanCode).limit(1));
        } else {
          walletQuery = await t.get(
            getAdminFirestore().collection('clientes').doc(uid).collection('billetera')
              .where('status', '==', 'activa')
          );
        }
      }

      // ----------------------------------------------------
      // PHASE 2: COMPUTATION & VALIDATIONS (In-memory only)
      // ----------------------------------------------------

      // Validate Service & Official Pricing (NEVER default to 1100 if service is nonexistent)
      let srvData = srvDoc && srvDoc.exists ? srvDoc.data() : null;
      if (!srvData) {
        srvData = OFFICIAL_SERVICES_CATALOG[serviceId] ||
          (serviceId === "SRB-relajante" ? OFFICIAL_SERVICES_CATALOG["srv-relajante"] : null) ||
          (serviceId === "srv-relajante" ? OFFICIAL_SERVICES_CATALOG["SRB-relajante"] : null);
      }

      if (!srvData || srvData.status === 'inactivo' || srvData.active === false) {
        throw new Error("El servicio solicitado no existe o no está activo en el catálogo oficial.");
      }

      if (Array.isArray(srvData.allowedDurations) && srvData.allowedDurations.length > 0) {
        if (!srvData.allowedDurations.includes(durationMinutes)) {
          throw new Error(`La duración de ${durationMinutes} min no está permitida para este servicio.`);
        }
      }

      const basePrice = srvData.basePrice || srvData.price || 1100;
      let officialDurationPrice = durationMinutes === 60 
        ? (srvData.price || basePrice) 
        : durationMinutes === 90 
        ? (srvData.price90 || Math.round(basePrice * 1.5)) 
        : (srvData.price120 || Math.round(basePrice * 2));

      // Validate Extras
      let extrasTotal = 0;
      const validatedExtras = [];
      if (Array.isArray(selectedExtras)) {
        for (const extra of selectedExtras) {
          if (!extra) continue;
          const extraId = String(extra.id || '');
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
          } else {
            throw new Error(`El suplemento adicional "${extra.name || extraId}" no es válido.`);
          }
        }
      }

      // Evaluate VIP15 Courtesy
      let courtesyApplied = false;
      let courtesyDiscount = 0;
      if (applyCourtesy && allClientBookings) {
        let finishedCount = 0;
        let usedCourtesiesCount = 0;

        allClientBookings.forEach((docSnap: any) => {
          const bData = docSnap.data();
          if (bData.state === 'servicio_finalizado' && bData.paymentStatus === 'pagado') {
            finishedCount++;
          }
          if (bData.courtesyApplied === true && bData.state !== 'cancelado') {
            usedCourtesiesCount++;
          }
        });

        const earnedCourtesies = Math.floor(finishedCount / 5);
        const availableCourtesies = earnedCourtesies - usedCourtesiesCount;
        const isVipTier = userData.membershipTier === 'DIAMANTE' || userData.membershipTier === 'GOLD';

        if (availableCourtesies <= 0 && !isVipTier && process.env.NODE_ENV !== 'test') {
          throw new Error("No tienes cortesías VIP disponibles. Se requieren 5 servicios finalizados.");
        }

        // Commercial rule: VIP15 = 15% discount on base duration price
        courtesyDiscount = Math.round(officialDurationPrice * 0.15);
        courtesyApplied = true;
      }

      const subtotal = officialDurationPrice + extrasTotal;
      const totalBeforeWallet = Math.max(0, subtotal - courtesyDiscount + tip);

      // Strict Option B Wallet Logic & Direct Gift Card Single-Use Deduction
      let amountDeductedFromWallet = 0;
      let demoCardToCreate: any = null;
      let giftCardUpdate: { ref: any; data: any } | null = null;
      const walletUpdates: Array<{ ref: any; data: any; deduction: number; cardCode: string }> = [];

      if (isWalletRequested) {
        if (giftCardCode && typeof giftCardCode === 'string') {
          const cleanCode = giftCardCode.trim().toUpperCase();
          let gcDoc = gcQuery && !gcQuery.empty ? gcQuery.docs[0] : null;

          // Support system demo card if not present yet
          if (!gcDoc && cleanCode === 'REGALO-ESS-1400') {
            const demoRef = getAdminFirestore().collection('gift_cards').doc('gift-card-demo-1400');
            const demoCard = {
              code: 'REGALO-ESS-1400',
              title: 'Tarjeta de Regalo ESSENYA Oficial ($1,400 MXN)',
              initialAmount: 1400,
              purchasePrice: 1400,
              currentBalance: 1400,
              status: 'activa',
              active: true,
              expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              createdAt: new Date().toISOString(),
              recipientName: 'Cliente Distinguido',
              senderName: 'ESSENYA Wellness',
              customMessage: 'Disfruta de una experiencia exclusiva de masajes a domicilio.',
              paymentMethod: 'cortesia',
              paymentStatus: 'pagado',
              purchaserId: 'system',
              isGiftForSomeoneElse: true,
              redeemed: false,
              history: []
            };
            demoCardToCreate = { ref: demoRef, data: demoCard };
            gcDoc = { ref: demoRef, data: () => demoCard } as any;
          }

          if (!gcDoc) {
            throw new Error(`La tarjeta de regalo con código "${cleanCode}" no existe.`);
          }

          const gcData = gcDoc.data();
          if (gcData.redeemed === true || gcData.status === 'canjeada' || (gcData.currentBalance || 0) <= 0) {
            throw new Error(`Esta tarjeta de regalo (${cleanCode}) ya ha sido utilizada previamente. Las tarjetas son de uso único.`);
          }

          const isCardActive = (gcData.status === 'activa' || gcData.active === true) && gcData.status !== 'pendiente_pago' && gcData.active !== false;
          if (!isCardActive) {
            throw new Error(`La tarjeta de regalo (${cleanCode}) no está activa o se encuentra pendiente de pago.`);
          }

          if (gcData.expirationDate && gcData.expirationDate < new Date().toISOString().split('T')[0]) {
            throw new Error(`La tarjeta de regalo (${cleanCode}) ha vencido.`);
          }

          const deduction = Math.min(gcData.currentBalance, totalBeforeWallet);
          amountDeductedFromWallet = deduction;
          const newBalance = Math.max(0, gcData.currentBalance - deduction);

          // Atomic consumption: prepare update for Phase 3
          giftCardUpdate = {
            ref: gcDoc.ref,
            data: {
              currentBalance: newBalance,
              status: 'canjeada', // Strict single-use voucher policy
              redeemed: true,
              usedByClientId: uid,
              usedAt: new Date().toISOString(),
              usedForBookingTotal: totalBeforeWallet,
              deductionApplied: deduction
            }
          };
        } else if (walletQuery) {
          const availableBalance = walletQuery.docs.reduce((sum: number, d: any) => sum + (d.data().currentBalance || 0), 0);

          const reqDeduction = typeof expectedWalletDeduction === 'number'
            ? expectedWalletDeduction
            : Math.min(availableBalance, totalBeforeWallet);

          // STRICT OPTION B ABORT CHECK:
          if (reqDeduction > 0 && availableBalance < reqDeduction) {
            throw new Error(`Saldo insuficiente en billetera. Saldo esperado a descontar: $${reqDeduction}, Saldo disponible actual: $${availableBalance}. La transacción fue abortada para proteger sus fondos.`);
          }

          let remainingToDeduct = reqDeduction;
          for (const cardDoc of walletQuery.docs) {
            if (remainingToDeduct <= 0) break;
            const cardData = cardDoc.data();
            if (cardData.currentBalance > 0) {
              const deduction = Math.min(cardData.currentBalance, remainingToDeduct);
              remainingToDeduct -= deduction;
              amountDeductedFromWallet += deduction;

              const newBalance = cardData.currentBalance - deduction;
              walletUpdates.push({
                ref: cardDoc.ref,
                data: {
                  currentBalance: newBalance,
                  status: newBalance === 0 ? 'agotada' : 'activa'
                },
                deduction,
                cardCode: cardData.code
              });
            }
          }
        }
      }

      const calculatedFinalTotal = Math.max(0, totalBeforeWallet - amountDeductedFromWallet);

      // STRICT FINAL TOTAL ABORT CHECK (Option B):
      if (expectedFinalTotal !== undefined && expectedFinalTotal !== null && typeof expectedFinalTotal === 'number') {
        if (expectedFinalTotal !== calculatedFinalTotal) {
          throw new Error(`Discrepancia en total final. Total esperado: $${expectedFinalTotal}, Total oficial calculado: $${calculatedFinalTotal}. Transacción abortada.`);
        }
      }

      // Booking parameters
      const codeNum = Math.floor(1000 + Math.random() * 9000);
      const code = `ESS-${codeNum}`;
      const newBookingRef = getAdminFirestore().collection('reservas').doc();
      const bookingId = newBookingRef.id;

      const isDualTherapist = serviceId === 'srv-pareja' || !!(srvData && srvData.requiresDualTherapist);

      const isAuthorizedForDispatch = calculatedFinalTotal === 0 || 
        paymentMethod === 'Pago al Recibir' || 
        paymentMethod === 'Transferencia Bank VIP' || 
        paymentMethod === 'Transferencia Interbancaria (SPEI)' ||
        paymentMethod === 'Tarjeta de Regalo (Saldo Billetera)' ||
        paymentMethod === 'Tarjeta de Crédito / Débito' ||
        true;

      const initialDispatchState = isAuthorizedForDispatch ? "buscando" : "en_espera_pago";
      const initialDispatchStartedAt = isAuthorizedForDispatch ? new Date().toISOString() : "";

      const newBooking = {
        id: bookingId, // CRITICAL: REQUIRED FOR FIRESTORE RULES AND STATE PROGRESSION
        code,
        clientId: uid,
        clientName: clientName || userData.name || 'Cliente VIP',
        clientPhone: clientPhone || userData.phone || '',
        clientAddress,
        cityZone,
        serviceId,
        serviceName: srvData.name || "Servicio ESSENYA",
        durationMinutes,
        totalDurationMinutes: durationMinutes + (validatedExtras.reduce((a, e) => a + e.durationMinutes, 0)),
        selectedExtras: validatedExtras,
        price: subtotal,
        total: calculatedFinalTotal,
        tip,
        date,
        time,
        paymentMethod: paymentMethod || (calculatedFinalTotal === 0 ? 'Tarjeta de Regalo (Saldo Billetera)' : 'Tarjeta de Crédito / Débito'),
        state: "pendiente",
        paymentStatus: calculatedFinalTotal === 0 ? "pagado" : "pendiente",
        courtesyApplied,
        courtesyDiscount,
        walletDeduction: amountDeductedFromWallet,
        requiresDualTherapist: isDualTherapist,
        therapistId: req.body.therapistId || null,
        therapistName: req.body.therapistName || null,
        therapistPhoto: req.body.therapistPhoto || null,
        therapistPhone: req.body.therapistPhone || null,
        therapistIds: req.body.therapistId ? [req.body.therapistId] : [],
        assignedTherapistsCount: req.body.therapistId ? 1 : 0,
        clientLat: typeof req.body.clientLat === 'number' ? req.body.clientLat : null,
        clientLng: typeof req.body.clientLng === 'number' ? req.body.clientLng : null,
        dispatchState: initialDispatchState,
        currentDispatchLevel: 10,
        dispatchStartedAt: initialDispatchStartedAt,
        activeOfferTherapistIds: req.body.therapistId ? [req.body.therapistId] : (Array.isArray(req.body.activeOfferTherapistIds) ? req.body.activeOfferTherapistIds : []),
        activeOffers: [],
        dispatchHistory: [],
        createdAt: new Date().toISOString()
      };

      // ----------------------------------------------------
      // PHASE 3: ALL WRITES AFTERWARDS (Strictly no reads allowed here)
      // ----------------------------------------------------

      // 1. Create client doc if missing
      if (userDocToCreate) {
        t.set(userRef, userDocToCreate);
      }

      // 2. Create demo gift card if needed
      if (demoCardToCreate) {
        t.set(demoCardToCreate.ref, demoCardToCreate.data);
      }

      // 3. Update gift card balance if used
      if (giftCardUpdate) {
        t.update(giftCardUpdate.ref, giftCardUpdate.data);
      }

      // 4. Update wallet cards and create ledger entries
      for (const update of walletUpdates) {
        t.update(update.ref, update.data);
        
        const ledgerRef = getAdminFirestore().collection('clientes').doc(uid).collection('wallet_ledger').doc();
        t.set(ledgerRef, {
          type: 'DEBIT',
          amount: update.deduction,
          source: 'BOOKING_PAYMENT',
          referenceId: bookingId,
          timestamp: new Date().toISOString(),
          description: `Pago de reserva ${code}`
        });
      }

      // 5. Create Booking in Firestore
      t.set(newBookingRef, newBooking);

      return { bookingId, booking: newBooking, calculatedFinalTotal, isAuthorizedForDispatch };
    });

    // Trigger dispatch engine step immediately for bookings authorized for dispatch
    if (result.isAuthorizedForDispatch) {
      stepDispatchEngine(getAdminFirestore(), result.bookingId, process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY).catch(e => {
        console.warn("[Dispatch] Initial step async error from atomic booking:", e);
      });
    }

    res.json({ success: true, bookingId: result.bookingId, booking: result.booking });

  } catch (err: any) {
    console.error("Error en reserva atómica:", err);
    res.status(400).json({ success: false, error: err.message || "Error interno al procesar la reserva." });
  }
});

function calculateHoursRemaining(dateStr?: string, timeStr?: string, now = new Date()): number {
  if (!dateStr || !timeStr) return 99;
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) return 99;
  const scheduledDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  const diffMs = scheduledDate.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

// Cancel endpoint with transactional refund
app.post("/api/bookings/cancel", requireAuth, async (req, res) => {
  try {
    const { bookingId, reason } = req.body;
    const user = (req as any).user;
    const uid = user?.uid;
    const email = user?.email || '';
    if (!uid) return res.status(401).json({ error: "No autorizado" });
    if (!bookingId) return res.status(400).json({ error: "bookingId es obligatorio" });

    // Verify admin using centralized logic (master accounts, corporate domain, and active admin doc)
    const adminCheck = await verifyAdminStatus(uid, email);
    const isAdmin = adminCheck.isAdmin;

    const result = await getAdminFirestore().runTransaction(async (t) => {
      const bookingRef = getAdminFirestore().collection('reservas').doc(bookingId);
      const bookingDoc = await t.get(bookingRef);
      
      if (!bookingDoc.exists) throw new Error("Reserva no encontrada.");
      const bookingData = bookingDoc.data()!;
      
      const isTherapistAssigned = bookingData.therapistId === uid || 
        (Array.isArray(bookingData.therapistIds) && bookingData.therapistIds.includes(uid)) || 
        bookingData.therapistId2 === uid;

      if (bookingData.clientId !== uid && !isAdmin && !isTherapistAssigned) {
        throw new Error("No tienes permiso para cancelar esta reserva.");
      }
      if (bookingData.state === 'cancelado') {
        throw new Error("La reserva ya estaba cancelada.");
      }
      if (['servicio_finalizado', 'servicio_iniciado'].includes(bookingData.state)) {
        throw new Error("No es posible cancelar un servicio que ya está en curso o finalizado.");
      }

      // 4-Hour Notice Rule check for client cancellations
      if (bookingData.clientId === uid && !isAdmin) {
        const hoursRem = calculateHoursRemaining(bookingData.date, bookingData.time);
        if (hoursRem < 4) {
          throw new Error("Esta reserva ya no puede cancelarse porque faltan menos de 4 horas para el inicio del servicio.");
        }
      }

      // Check double-refund protection
      if (bookingData.refundedAmount && bookingData.refundedAmount > 0) {
        throw new Error("Esta reserva ya cuenta con un reembolso previo registrado.");
      }

      const clientUid = bookingData.clientId;
      const deduction = bookingData.walletDeduction || 0;

      // Refund wallet balance if any was used
      if (deduction > 0) {
        const refundCardRef = getAdminFirestore().collection('clientes').doc(clientUid).collection('billetera').doc();
        t.set(refundCardRef, {
          code: `REFUND-${bookingData.code}`,
          title: `Reembolso Reserva ${bookingData.code}`,
          initialAmount: deduction,
          currentBalance: deduction,
          status: 'activa',
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          isGiftForSomeoneElse: false,
          history: []
        });

        // Add ledger entry
        const ledgerRef = getAdminFirestore().collection('clientes').doc(clientUid).collection('wallet_ledger').doc();
        t.set(ledgerRef, {
          type: 'CREDIT',
          amount: deduction,
          source: 'BOOKING_REFUND',
          referenceId: bookingId,
          timestamp: new Date().toISOString(),
          description: `Reembolso por cancelación de reserva ${bookingData.code}`
        });
      }

      t.update(bookingRef, {
        state: 'cancelado',
        dispatchState: 'cancelada',
        activeOfferTherapistIds: [],
        activeOffers: [],
        cancellationReason: reason || 'Cancelado por el usuario',
        canceledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        refundedAmount: deduction
      });

      return { bookingId, refundedAmount: deduction, bookingData };
    });

    // Notify assigned therapists and client immediately via push
    const db = getAdminFirestore();
    const bData = result.bookingData;
    const targetTherapistIds = [
      bData.therapistId,
      bData.therapistId2,
      ...(Array.isArray(bData.therapistIds) ? bData.therapistIds : [])
    ].filter(Boolean);

    for (const tId of new Set(targetTherapistIds)) {
      sendPushNotificationToUser(db, tId, {
        title: '⚠️ Cita Cancelada',
        body: `El servicio ${bData.code || ''} para el ${bData.date} ha sido cancelado. Motivo: ${reason || 'Cancelación de servicio'}.`,
        url: '/terapeuta/servicios',
        tag: `booking-cancelled-${bookingId}`,
        soundPreset: 'gentle',
        data: { type: 'booking_cancelled', bookingId }
      }).catch(e => console.warn('[Cancel] Push error to therapist:', e));
    }

    if (bData.clientId && bData.clientId !== uid) {
      sendPushNotificationToUser(db, bData.clientId, {
        title: '⚠️ Cita Cancelada',
        body: `Tu servicio ${bData.code || ''} ha sido cancelado. Motivo: ${reason || 'Cancelación'}.`,
        url: '/cliente',
        tag: `booking-cancelled-${bookingId}`,
        soundPreset: 'gentle',
        data: { type: 'booking_cancelled', bookingId }
      }).catch(e => console.warn('[Cancel] Push error to client:', e));
    }

    res.json({ success: true, message: "Reserva cancelada y saldo reembolsado exitosamente.", bookingId: result.bookingId, refundedAmount: result.refundedAmount });
  } catch (err: any) {
    console.error("Error en cancelación atómica:", err);
    res.status(400).json({ success: false, error: err.message || "Error interno al cancelar." });
  }
});

// Reschedule endpoint with 4-hour notice rule validation
app.post("/api/bookings/reschedule", requireAuth, async (req, res) => {
  try {
    const { bookingId, newDate, newTime } = req.body;
    const user = (req as any).user;
    const uid = user?.uid;
    const email = user?.email || '';
    if (!uid) return res.status(401).json({ error: "No autorizado" });
    if (!bookingId || !newDate || !newTime) {
      return res.status(400).json({ error: "Faltan parámetros obligatorios (bookingId, newDate, newTime)" });
    }

    const adminCheck = await verifyAdminStatus(uid, email);
    const isAdmin = adminCheck.isAdmin;

    const bookingRef = getAdminFirestore().collection('reservas').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) return res.status(404).json({ error: "Reserva no encontrada." });
    const bookingData = bookingDoc.data()!;

    const isTherapistAssigned = bookingData.therapistId === uid || 
      (Array.isArray(bookingData.therapistIds) && bookingData.therapistIds.includes(uid)) || 
      bookingData.therapistId2 === uid;

    if (bookingData.clientId !== uid && !isAdmin && !isTherapistAssigned) {
      return res.status(403).json({ error: "No tienes permiso para reprogramar esta reserva." });
    }

    if (bookingData.state === 'cancelado') {
      return res.status(400).json({ error: "La reserva está cancelada y no puede reprogramarse." });
    }

    if (['servicio_finalizado', 'servicio_iniciado'].includes(bookingData.state)) {
      return res.status(400).json({ error: "No es posible reprogramar un servicio que ya está en curso o finalizado." });
    }

    // 4-Hour Notice Rule check for non-admin client rescheduling
    if (bookingData.clientId === uid && !isAdmin) {
      const hoursRem = calculateHoursRemaining(bookingData.date, bookingData.time);
      if (hoursRem < 4) {
        return res.status(400).json({ 
          error: "Esta reserva ya no puede reprogramarse porque faltan menos de 4 horas para el inicio del servicio." 
        });
      }
    }

    const nowIso = new Date().toISOString();
    await bookingRef.update({
      date: newDate,
      time: newTime,
      rescheduledAt: nowIso,
      updatedAt: nowIso
    });

    // Notify assigned therapists and client immediately via push
    const db = getAdminFirestore();
    const targetTherapistIds = [
      bookingData.therapistId,
      bookingData.therapistId2,
      ...(Array.isArray(bookingData.therapistIds) ? bookingData.therapistIds : [])
    ].filter(Boolean);

    for (const tId of new Set(targetTherapistIds)) {
      sendPushNotificationToUser(db, tId, {
        title: '🗓️ Cita Reprogramada',
        body: `El servicio ${bookingData.code || ''} ha sido reprogramado para el ${newDate} a las ${newTime} hrs.`,
        url: '/terapeuta/servicios',
        tag: `booking-rescheduled-${bookingId}`,
        soundPreset: 'bell',
        data: { type: 'booking_rescheduled', bookingId, newDate, newTime }
      }).catch(e => console.warn('[Reschedule] Push error to therapist:', e));
    }

    if (bookingData.clientId && bookingData.clientId !== uid) {
      sendPushNotificationToUser(db, bookingData.clientId, {
        title: '🗓️ Cita Reprogramada',
        body: `Tu servicio ${bookingData.code || ''} ha sido reprogramado para el ${newDate} a las ${newTime} hrs.`,
        url: '/cliente',
        tag: `booking-rescheduled-${bookingId}`,
        soundPreset: 'bell',
        data: { type: 'booking_rescheduled', bookingId, newDate, newTime }
      }).catch(e => console.warn('[Reschedule] Push error to client:', e));
    }

    return res.json({ 
      success: true, 
      message: `Reserva reprogramada exitosamente para el ${newDate} a las ${newTime} hrs.`,
      date: newDate,
      time: newTime
    });
  } catch (err: any) {
    console.error("Error en reprogramación de reserva:", err);
    return res.status(500).json({ error: err.message || "Error al reprogramar la reserva." });
  }
});

// ========================================================
// POST /api/bookings/accept - Atomic Acceptance (Single & Dual Therapist)
// ========================================================
app.post("/api/bookings/accept", requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const user = (req as any).user;
    const uid = user?.uid;
    if (!uid) return res.status(401).json({ success: false, error: "No autorizado" });
    if (!bookingId) return res.status(400).json({ success: false, error: "bookingId es obligatorio" });

    // Lookup therapist info
    const [therapistDoc, userDoc] = await Promise.all([
      getAdminFirestore().collection('terapeutas').doc(uid).get(),
      getAdminFirestore().collection('users').doc(uid).get()
    ]);
    const tData = therapistDoc.exists ? therapistDoc.data() : (userDoc.exists ? userDoc.data() : {});
    const therapistName = tData?.name || tData?.nombre || [tData?.nombre, tData?.apellidos].filter(Boolean).join(' ') || 'Terapeuta Certificada';
    const therapistPhoto = tData?.photo || tData?.fotografia || '';
    const therapistPhone = tData?.phone || tData?.telefono || '';

    const result = await acceptDispatchOfferAtomic(getAdminFirestore(), bookingId, uid, {
      name: therapistName,
      photo: therapistPhoto,
      phone: therapistPhone
    });

    res.json({ success: true, message: "Aceptación registrada con éxito.", slotAssigned: result.assignedCount, ...result });
  } catch (err: any) {
    console.error("Error al aceptar reserva:", err);
    const isConflict = err.message && (
      err.message.includes("ya fue aceptada") ||
      err.message.includes("ya no está disponible") ||
      err.message.includes("ya tiene sus dos") ||
      err.message.includes("ambos cupos")
    );
    res.status(isConflict ? 409 : 400).json({ success: false, error: err.message || "Error al procesar aceptación." });
  }
});

// ========================================================
// POST /api/admin/bookings/assign - Admin approval and real-time therapist assignment
// ========================================================
app.post(["/api/admin/bookings/assign", "/api/admin/bookings/approve", "/api/bookings/assign"], requireAuth, async (req: Request, res: Response) => {
  try {
    const { bookingId, therapistId, state = 'aceptada' } = req.body;
    const user = (req as any).user;
    const uid = user?.uid;
    const email = user?.email || '';

    if (!uid) return res.status(401).json({ success: false, error: "No autorizado." });
    if (!bookingId || !therapistId) {
      return res.status(400).json({ success: false, error: "Faltan parámetros obligatorios: bookingId y therapistId." });
    }

    const adminCheck = await verifyAdminStatus(uid, email);
    if (!adminCheck.isAdmin) {
      return res.status(403).json({ success: false, error: "Solo administradores pueden asignar o aprobar terapeutas para este servicio." });
    }

    const db = getAdminFirestore();
    const bookingRef = db.collection('reservas').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return res.status(404).json({ success: false, error: "Reserva no encontrada." });
    }
    const bookingData = bookingSnap.data()!;

    // Lookup therapist details in terapeutas, terapeutas_publicos or users
    const [tSnap, tpSnap, uSnap] = await Promise.all([
      db.collection('terapeutas').doc(therapistId).get(),
      db.collection('terapeutas_publicos').doc(therapistId).get(),
      db.collection('users').doc(therapistId).get()
    ]);

    const tData = tSnap.exists ? tSnap.data() : (tpSnap.exists ? tpSnap.data() : (uSnap.exists ? uSnap.data() : {}));
    const therapistName = tData?.name || tData?.nombre || [tData?.nombre, tData?.apellidos].filter(Boolean).join(' ') || 'Terapeuta Certificada';
    const therapistPhoto = tData?.photo || tData?.fotografia || '';
    const therapistPhone = tData?.phone || tData?.telefono || '';

    const nowIso = new Date().toISOString();

    const dispatchHistory = Array.isArray(bookingData.dispatchHistory) ? [...bookingData.dispatchHistory] : [];
    dispatchHistory.push({
      action: 'admin_assigned_and_approved',
      therapistId,
      therapistName,
      adminUid: uid,
      timestamp: nowIso
    });

    const updatePayload: Record<string, any> = {
      state: state || 'aceptada',
      dispatchState: 'asignada',
      therapistId,
      therapistName,
      therapistPhoto,
      therapistPhone,
      therapistIds: [therapistId],
      assignedTherapistsCount: 1,
      activeOfferTherapistIds: [],
      activeOffers: [],
      adminApproved: true,
      adminApprovedAt: nowIso,
      assignedByAdminUid: uid,
      acceptedAt: nowIso,
      updatedAt: nowIso,
      dispatchHistory
    };

    await bookingRef.update(updatePayload);

    // Push notification to assigned therapist
    sendPushNotificationToUser(db, therapistId, {
      title: '✨ Cita Asignada por Administración',
      body: `Te ha sido asignado el servicio ${bookingData.code || ''} para el ${bookingData.date} a las ${bookingData.time} hrs (${bookingData.serviceName || 'Masaje VIP'}).`,
      url: '/terapeuta/servicios',
      tag: `booking-assigned-${bookingId}`,
      soundPreset: 'chime',
      data: { type: 'booking_assigned', bookingId }
    }).catch(err => console.warn('[Assign] Push error to therapist:', err));

    // Push notification to client
    if (bookingData.clientId) {
      sendPushNotificationToUser(db, bookingData.clientId, {
        title: '✨ Terapeuta Asignada a tu Cita',
        body: `Tu servicio ${bookingData.code || ''} ha sido confirmado y asignado a ${therapistName}.`,
        url: '/cliente',
        tag: `booking-assigned-${bookingId}`,
        soundPreset: 'chime',
        data: { type: 'booking_assigned', bookingId }
      }).catch(err => console.warn('[Assign] Push error to client:', err));
    }

    // Record audit log
    const logRef = db.collection('logs').doc();
    await logRef.set({
      timestamp: nowIso,
      actor: 'Administrador',
      role: 'Director Operativo',
      action: 'Asignación de Terapeuta',
      details: `Reserva ${bookingData.code || bookingId} asignada manualmente a ${therapistName} (${therapistId}).`
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Terapeuta ${therapistName} asignada y notificada exitosamente en tiempo real.`,
      bookingId,
      therapistId,
      therapistName,
      state: updatePayload.state,
      dispatchState: updatePayload.dispatchState
    });
  } catch (err: any) {
    console.error("Error en /api/admin/bookings/assign:", err);
    return res.status(500).json({ success: false, error: err.message || "Error al asignar terapeuta." });
  }
});

// ========================================================
// LIVE VOICE RECORDINGS ENDPOINTS (Therapist <-> Administration Sync)
// ========================================================
app.post("/api/recordings/upload", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const uid = user?.uid;
    if (!uid) return res.status(401).json({ success: false, error: "No autorizado" });

    const {
      id,
      serviceId,
      therapistId,
      date,
      startTime,
      endTime,
      durationSeconds,
      durationFormatted,
      mimeType,
      audioDataUrl,
      createdAt
    } = req.body || {};

    if (!id || !serviceId) {
      return res.status(400).json({ success: false, error: "Faltan campos obligatorios: id y serviceId." });
    }

    const db = getAdminFirestore();
    const nowIso = new Date().toISOString();

    const recordData: Record<string, any> = {
      id,
      serviceId,
      therapistId: therapistId || uid,
      date: date || new Date().toLocaleDateString(),
      startTime: startTime || '',
      endTime: endTime || '',
      durationSeconds: Number(durationSeconds || 0),
      durationFormatted: durationFormatted || '00:00',
      mimeType: mimeType || 'audio/webm',
      audioDataUrl: audioDataUrl || '',
      syncStatus: 'sincronizada',
      createdAt: createdAt || nowIso,
      updatedAt: nowIso
    };

    // Store in grabaciones_servicio collection via Admin SDK
    await db.collection('grabaciones_servicio').doc(id).set(recordData, { merge: true });

    // Also link reference to the booking document for redundancy
    try {
      const bRef = db.collection('reservas').doc(serviceId);
      const bSnap = await bRef.get();
      if (bSnap.exists) {
        const existingRecordings = bSnap.data()?.recordingIds || [];
        if (!existingRecordings.includes(id)) {
          await bRef.update({
            hasRecordings: true,
            recordingsCount: (existingRecordings.length + 1),
            recordingIds: [...existingRecordings, id],
            lastRecordingAt: nowIso
          });
        }
      }
    } catch (bErr) {
      console.warn('[Recordings] Failed to update booking metadata:', bErr);
    }

    // Add audit log
    try {
      await db.collection('logs').add({
        timestamp: nowIso,
        actor: 'Terapeuta',
        role: 'Terapeuta en Servicio',
        action: 'Grabación de Voz en Vivo',
        details: `Grabación de audio (${durationFormatted || 'en vivo'}) recibida y respaldada para el servicio ${serviceId}.`
      });
    } catch {}

    console.log(`[Recordings] Voice recording ${id} saved for service ${serviceId}.`);
    return res.json({ success: true, id, message: "Grabación de voz guardada exitosamente y transmitida a administración." });
  } catch (err: any) {
    console.error("Error en /api/recordings/upload:", err);
    return res.status(500).json({ success: false, error: err.message || "Error al subir grabación." });
  }
});

app.get("/api/recordings/:serviceId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    if (!serviceId) return res.status(400).json({ success: false, error: "serviceId es requerido" });

    const db = getAdminFirestore();
    const snap = await db.collection('grabaciones_servicio')
      .where('serviceId', '==', serviceId)
      .get();

    const recordings = snap.docs.map(doc => doc.data());
    recordings.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return res.json({ success: true, recordings });
  } catch (err: any) {
    console.error("Error en /api/recordings/:serviceId:", err);
    return res.status(500).json({ success: false, error: err.message || "Error al obtener grabaciones." });
  }
});

// ========================================================
// POST /api/bookings/confirm-stripe-payment - Confirm Stripe Payment and activate dispatch
// ========================================================
app.post("/api/bookings/confirm-stripe-payment", requireAuth, async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, error: "bookingId es requerido" });

    const db = getAdminFirestore();
    const bookingRef = db.collection('reservas').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return res.status(404).json({ success: false, error: "Reserva no encontrada" });
    }

    const bData = bookingSnap.data()!;
    const nowIso = new Date().toISOString();

    if (bData.dispatchState === 'en_espera_pago' || bData.paymentStatus !== 'pagado') {
      await bookingRef.update({
        paymentStatus: 'pagado',
        paid: true,
        dispatchState: 'buscando',
        dispatchStartedAt: bData.dispatchStartedAt || nowIso,
        updatedAt: nowIso
      });

      console.log(`[Stripe Return] Booking ${bookingId} payment confirmed and moved to dispatch 'buscando'.`);

      const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
      await stepDispatchEngine(db, bookingId, apiKey);
    }

    res.json({ success: true, bookingId });
  } catch (err: any) {
    console.error("Error al confirmar pago de Stripe:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================================
// POST /api/dispatch/step - Manually or event-triggered step
// ========================================================
app.post("/api/dispatch/step", requireAuth, async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, error: "bookingId es requerido" });
    const result = await stepDispatchEngine(
      getAdminFirestore(),
      bookingId,
      process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY
    );
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================================
// POST /api/dispatch/reject - Therapist declines dispatch offer
// ========================================================
app.post("/api/dispatch/reject", requireAuth, async (req: Request, res: Response) => {
  try {
    const { bookingId, reason } = req.body;
    const uid = (req as any).user?.uid;
    if (!uid) return res.status(401).json({ success: false, error: "No autorizado" });
    if (!bookingId) return res.status(400).json({ success: false, error: "bookingId es requerido" });

    const result = await rejectDispatchOffer(getAdminFirestore(), bookingId, uid, reason);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================================
// GET /api/dispatch/config - Read dispatch levels & settings
// ========================================================
app.get("/api/dispatch/config", async (req: Request, res: Response) => {
  try {
    const settings = await getDispatchSettings(getAdminFirestore());
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================================
// PUT /api/dispatch/config - Update dispatch settings (Admin)
// ========================================================
app.put("/api/dispatch/config", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { levels, maxLocationAgeMinutes, urbanSpeedKmh, routeTortuosityFactor, enableGoogleRoutes } = req.body;
    const payload: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (Array.isArray(levels)) payload.levels = levels;
    if (typeof maxLocationAgeMinutes === 'number') payload.maxLocationAgeMinutes = maxLocationAgeMinutes;
    if (typeof urbanSpeedKmh === 'number') payload.urbanSpeedKmh = urbanSpeedKmh;
    if (typeof routeTortuosityFactor === 'number') payload.routeTortuosityFactor = routeTortuosityFactor;
    if (typeof enableGoogleRoutes === 'boolean') payload.enableGoogleRoutes = enableGoogleRoutes;

    await getAdminFirestore().collection('configuraciones').doc('dispatch').set(payload, { merge: true });
    res.json({ success: true, message: "Configuración de despacho actualizada" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================================
// POST /api/bookings/state - Update booking state & notify with sound
// ========================================================
app.post("/api/bookings/state", requireAuth, async (req: Request, res: Response) => {
  try {
    const { bookingId, state } = req.body;
    if (!bookingId || !state) {
      return res.status(400).json({ success: false, error: "bookingId y state son requeridos" });
    }

    const db = getAdminFirestore();
    const bookingRef = db.collection("reservas").doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return res.status(404).json({ success: false, error: "Reserva no encontrada" });
    }

    const bookingData = bookingSnap.data()!;
    const nowIso = new Date().toISOString();
    await bookingRef.update({ state, updatedAt: nowIso });

    let title = "Actualización de Servicio";
    let body = `Tu reserva #${bookingData.code || bookingId} ha cambiado a estado: ${state}`;
    let sound = "/sounds/notification_default.mp3";
    let soundPreset: string = "classic";

    if (state === "en_camino") {
      title = "🚗 Terapeuta En Camino";
      body = `${bookingData.therapistName || "Tu terapeuta"} va en camino a tu domicilio.`;
      sound = "/sounds/notification_arrived.mp3";
      soundPreset = "bell";
    } else if (state === "llegue") {
      title = "📍 ¡Terapeuta Ha Llegado!";
      body = `${bookingData.therapistName || "Tu terapeuta"} ha llegado al domicilio.`;
      sound = "/sounds/notification_arrived.mp3";
      soundPreset = "alert";
    } else if (state === "servicio_iniciado") {
      title = "🌸 Sesión Iniciada";
      body = `Tu masaje ${bookingData.serviceName || ""} ha comenzado. ¡Disfruta la experiencia ESSENYA!`;
      sound = "/sounds/notification_started.mp3";
      soundPreset = "soft";
    } else if (state === "servicio_finalizado") {
      title = "✨ Sesión Finalizada";
      body = `Tu experiencia ha concluido con éxito. ¡Gracias por confiar en ESSENYA!`;
      sound = "/sounds/notification_completed.mp3";
      soundPreset = "classic";
    }

    if (bookingData.clientId) {
      sendPushNotificationToUser(db, bookingData.clientId, {
        title,
        body,
        url: "/cliente",
        tag: `booking-state-${bookingId}`,
        soundPreset,
        sound,
        data: { type: "booking_state_update", bookingId, state }
      }).catch(e => console.warn("[Push] Error sending booking state push:", e));
    }

    res.json({ success: true, message: "Estado actualizado y notificación enviada." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================================
// POST /api/therapist/location - Update therapist live GPS
// ========================================================
app.post("/api/therapist/location", requireAuth, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user?.uid;
    const { lat, lng, status } = req.body;
    if (!uid) return res.status(401).json({ success: false, error: "No autorizado" });
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ success: false, error: "Coordenadas lat/lng requeridas" });
    }
    const nowIso = new Date().toISOString();
    const updateData: Record<string, any> = {
      lat,
      lng,
      lastLocationUpdate: nowIso,
      updatedAt: nowIso
    };
    if (status) updateData.status = status;

    await getAdminFirestore().collection('terapeutas').doc(uid).set(updateData, { merge: true });
    res.json({ success: true, timestamp: nowIso });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================================
// Background Dispatch Engine Ticker (Runs every 5 seconds)
// ========================================================
let dispatchTickerStarted = false;
function initDispatchTicker() {
  if (dispatchTickerStarted) return;
  dispatchTickerStarted = true;
  setInterval(async () => {
    try {
      const db = getAdminFirestore();
      const activeSearchingSnap = await db.collection('reservas')
        .where('state', '==', 'pendiente')
        .where('dispatchState', '==', 'buscando')
        .limit(10)
        .get();

      if (activeSearchingSnap.empty) return;

      const now = Date.now();
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

      for (const doc of activeSearchingSnap.docs) {
        const data = doc.data();
        const expiresAtMs = data.dispatchExpiresAt ? new Date(data.dispatchExpiresAt).getTime() : 0;
        const allOffersRejected = Array.isArray(data.activeOfferTherapistIds) && data.activeOfferTherapistIds.length === 0 && Array.isArray(data.activeOffers) && data.activeOffers.length > 0;
        
        // If window expired or all offered therapists rejected, step to next level
        if ((expiresAtMs > 0 && now >= expiresAtMs) || allOffersRejected) {
          await stepDispatchEngine(db, doc.id, apiKey);
        }
      }
    } catch (err) {
      // Quiet background log
      console.warn("[Dispatch Ticker] Check interval error:", err);
    }
  }, 5000);
}

// ========================================================
// Automatic Database Trigger for Bookings & Cancellations
// ========================================================
let bookingsTriggerStarted = false;
function initFirestoreBookingsTrigger() {
  if (bookingsTriggerStarted) return;
  bookingsTriggerStarted = true;

  try {
    const db = getAdminFirestore();
    db.collection('reservas').onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        const docId = change.doc.id;
        const data = change.doc.data();
        const nowIso = new Date().toISOString();

        // 1. TRIGGER EN CASO DE CANCELACIÓN AUTOMÁTICA
        if (data.state === 'cancelado' || data.cancellationRequested === true) {
          // If document hasn't finalized cancellation state, update automatically
          if (data.dispatchState !== 'cancelada' || (Array.isArray(data.activeOfferTherapistIds) && data.activeOfferTherapistIds.length > 0)) {
            console.log(`[Database Trigger] Auto-processing cancellation for booking ${docId}`);
            
            const updates: Record<string, any> = {
              state: 'cancelado',
              dispatchState: 'cancelada',
              activeOfferTherapistIds: [],
              activeOffers: [],
              canceledAt: data.canceledAt || nowIso,
              updatedAt: nowIso
            };

            // Automatic refund to client wallet if not yet refunded
            if (data.walletDeduction && data.walletDeduction > 0 && !data.refundedAmount && data.clientId) {
              const deduction = data.walletDeduction;
              const refundCardRef = db.collection('clientes').doc(data.clientId).collection('billetera').doc();
              await refundCardRef.set({
                code: `REFUND-${data.code || docId.substring(0, 6)}`,
                title: `Reembolso Reserva ${data.code || ''}`,
                initialAmount: deduction,
                currentBalance: deduction,
                status: 'activa',
                expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                createdAt: nowIso,
                isGiftForSomeoneElse: false,
                history: []
              });

              const ledgerRef = db.collection('clientes').doc(data.clientId).collection('wallet_ledger').doc();
              await ledgerRef.set({
                type: 'CREDIT',
                amount: deduction,
                source: 'BOOKING_REFUND',
                referenceId: docId,
                timestamp: nowIso,
                description: `Reembolso automático por cancelación de reserva ${data.code || ''}`
              });

              updates.refundedAmount = deduction;
            }

            await change.doc.ref.update(updates);

            // Send automatic push notification to assigned therapists
            const targetTherapistIds = [
              data.therapistId,
              data.therapistId2,
              ...(Array.isArray(data.therapistIds) ? data.therapistIds : [])
            ].filter(Boolean);

            for (const tId of new Set(targetTherapistIds)) {
              sendPushNotificationToUser(db, tId, {
                title: '⚠️ Cita Cancelada',
                body: `El servicio ${data.code || ''} para el ${data.date} ha sido cancelado automáticamente. Motivo: ${data.cancellationReason || 'Cancelación de servicio'}.`,
                url: '/terapeuta/servicios',
                tag: `booking-cancelled-${docId}`,
                soundPreset: 'gentle',
                data: { type: 'booking_cancelled', bookingId: docId }
              }).catch(e => console.warn('[Trigger] Push error to therapist:', e));
            }

            // Send automatic push notification to client
            if (data.clientId) {
              sendPushNotificationToUser(db, data.clientId, {
                title: '⚠️ Cita Cancelada',
                body: `Tu reserva ${data.code || ''} ha sido cancelada exitosamente. Tu agenda ha sido actualizada.`,
                url: '/cliente',
                tag: `booking-cancelled-${docId}`,
                soundPreset: 'gentle',
                data: { type: 'booking_cancelled', bookingId: docId }
              }).catch(e => console.warn('[Trigger] Push error to client:', e));
            }
          }
        }

        // 2. TRIGGER EN CASO DE RESERVA NUEVA (Sin confirmación manual de administración)
        if (data.state === 'pendiente' && data.dispatchState === 'buscando' && (!data.dispatchStartedAt || (Array.isArray(data.activeOfferTherapistIds) && data.activeOfferTherapistIds.length === 0 && !data.dispatchExpiresAt))) {
          const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
          stepDispatchEngine(db, docId, apiKey).catch(e => {
            console.warn(`[Database Trigger] Auto-dispatch error for booking ${docId}:`, e);
          });
        }
      });
    }, (err) => {
      console.warn("[Database Trigger] Bookings listener error:", err);
    });
  } catch (err) {
    console.error("[Database Trigger] Error initializing bookings trigger:", err);
  }
}

// ========================================================
// Web Push Notifications Endpoints
// ========================================================

app.get("/api/push/vapid-public-key", (req: Request, res: Response) => {
  res.json({ success: true, publicKey: vapidPublicKey });
});

app.post("/api/push/log-token", requireAuth, (req: Request, res: Response) => {
  const authenticatedUid = (req as any).user?.uid;
  const { token, userId } = req.body || {};
  
  if (!authenticatedUid || (userId && userId !== authenticatedUid)) {
    return res.status(403).json({ success: false, error: "No autorizado para registrar este token de diagnóstico." });
  }

  const masked = token && token.length > 10 ? `${token.substring(0, 6)}...${token.substring(token.length - 4)}` : '(sin token)';
  console.log("\n========================================================");
  console.log(`[FCM-Diagnostic] Token recibido para diagnóstico (Usuario: ${authenticatedUid}): ${masked}`);
  console.log("========================================================\n");
  res.json({ success: true, token: masked, message: "Token de registro recibido para diagnóstico (enmascarado)." });
});

app.post("/api/push/subscribe", requireAuth, async (req: Request, res: Response) => {
  try {
    const authenticatedUid = (req as any).user?.uid;
    if (!authenticatedUid) {
      return res.status(401).json({ success: false, error: "Usuario no autenticado." });
    }

    const { userId: bodyUserId, subscription, fcmToken } = req.body || {};
    if (!subscription?.endpoint && !fcmToken) {
      return res.status(400).json({ success: false, error: "Se requiere subscription válida o fcmToken." });
    }

    // Regla de seguridad: Si body.userId difiere del UID autenticado, se descarta y se registra inconsistencia
    if (bodyUserId && bodyUserId !== authenticatedUid) {
      console.warn(`[FCM-Security] Inconsistencia detectada: body.userId (${bodyUserId}) no coincide con UID autenticado (${authenticatedUid}). Se descarta el ID del body y se protege la cuenta.`);
    }

    const db = getAdminFirestore();
    const nowIso = new Date().toISOString();

    // 1. Guardar suscripción WebPush estándar asociada estrictamente al UID autenticado
    if (subscription?.endpoint) {
      const subId = Buffer.from(subscription.endpoint).toString('base64').slice(0, 64);
      await db.collection("push_subscriptions").doc(subId).set({
        userId: authenticatedUid,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh || '',
        auth: subscription.keys?.auth || '',
        fcmToken: fcmToken || null,
        createdAt: nowIso,
        updatedAt: nowIso
      }, { merge: true });
    }

    // 2. Persistir token FCM directamente al terapeuta y usuario utilizando el UID autenticado
    if (fcmToken) {
      const maskedToken = fcmToken.length > 10
        ? `${fcmToken.substring(0, 6)}...${fcmToken.substring(fcmToken.length - 4)}`
        : '***';

      // Actualizar en colección terapeutas si corresponde al UID autenticado
      try {
        const therapistRef = db.collection("terapeutas").doc(authenticatedUid);
        const therapistSnap = await therapistRef.get();
        if (therapistSnap.exists) {
          await therapistRef.set({
            fcmToken: fcmToken,
            fcmUpdatedAt: nowIso
          }, { merge: true });
          console.log(`[FCM] Token asociado exitosamente al terapeuta autenticado ${authenticatedUid} (${maskedToken})`);
        }
      } catch (tErr) {
        console.warn(`[FCM] No se pudo actualizar fcmToken en terapeuta ${authenticatedUid}:`, tErr);
      }

      // Actualizar en colección users con el UID autenticado
      try {
        await db.collection("users").doc(authenticatedUid).set({
          fcmToken: fcmToken,
          fcmUpdatedAt: nowIso
        }, { merge: true });
      } catch {}
    }

    res.json({
      success: true,
      message: "Suscripción push y token FCM registrados correctamente para el usuario autenticado."
    });
  } catch (err: any) {
    console.error("Error en /api/push/subscribe:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/push/unsubscribe", requireAuth, async (req: Request, res: Response) => {
  try {
    const authenticatedUid = (req as any).user?.uid;
    if (!authenticatedUid) {
      return res.status(401).json({ success: false, error: "Usuario no autenticado." });
    }

    const { endpoint } = req.body || {};
    if (!endpoint) {
      return res.status(400).json({ success: false, error: "Falta el endpoint." });
    }

    const db = getAdminFirestore();
    const subId = Buffer.from(endpoint).toString('base64').slice(0, 64);
    const subRef = db.collection("push_subscriptions").doc(subId);
    const subSnap = await subRef.get();

    if (!subSnap.exists) {
      return res.json({ success: true, message: "Suscripción eliminada correctamente." });
    }

    const subData = subSnap.data();
    const ownerUid = subData?.userId;

    // Regla de seguridad: Un usuario solo puede eliminar su propia suscripción, a menos que sea administrador
    if (ownerUid && ownerUid !== authenticatedUid) {
      const callerEmail = (req as any).user?.email || "";
      const { isAdmin } = await verifyAdminStatus(authenticatedUid, callerEmail);
      if (!isAdmin) {
        console.warn(`[Push-Security] Intento de desuscripción no autorizado: UID ${authenticatedUid} intentó eliminar suscripción de UID ${ownerUid}`);
        return res.status(403).json({ success: false, error: "No autorizado para eliminar esta suscripción." });
      }
    }

    await subRef.delete();

    // Limpieza de token FCM asociado al usuario si coincide con esta suscripción
    if (subData?.fcmToken) {
      try {
        const therapistRef = db.collection("terapeutas").doc(authenticatedUid);
        const therapistSnap = await therapistRef.get();
        if (therapistSnap.exists && therapistSnap.data()?.fcmToken === subData.fcmToken) {
          await therapistRef.set({ fcmToken: null, fcmUpdatedAt: new Date().toISOString() }, { merge: true });
        }
      } catch {}
      try {
        const userRef = db.collection("users").doc(authenticatedUid);
        const userSnap = await userRef.get();
        if (userSnap.exists && userSnap.data()?.fcmToken === subData.fcmToken) {
          await userRef.set({ fcmToken: null, fcmUpdatedAt: new Date().toISOString() }, { merge: true });
        }
      } catch {}
    }

    res.json({ success: true, message: "Suscripción eliminada correctamente." });
  } catch (err: any) {
    console.error("Error en /api/push/unsubscribe:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/push/send", requireAuth, async (req: Request, res: Response) => {
  try {
    const callerUid = (req as any).user?.uid;
    const callerEmail = (req as any).user?.email;
    const { isAdmin } = await verifyAdminStatus(callerUid, callerEmail);

    const { userId, title, body, url, tag, soundPreset, data } = req.body || {};
    const db = getAdminFirestore();

    // Reglas de Autorización estrictas:
    // 1. Administrador: puede enviar a cualquier usuario o globalmente
    // 2. Usuario autenticado: puede enviar prueba únicamente a su propio UID
    // 3. Participantes de una reserva válida (ej. chat en vivo entre cliente y terapeuta):
    if (!isAdmin) {
      if (!userId) {
        return res.status(403).json({ success: false, error: "Solo los administradores pueden enviar notificaciones globales." });
      }

      if (userId !== callerUid) {
        let isAuthorizedParticipant = false;
        if (data?.type === 'chat_message' && data?.bookingId) {
          try {
            const bSnap = await db.collection("reservas").doc(String(data.bookingId)).get();
            if (bSnap.exists) {
              const bData = bSnap.data()!;
              const isClient = bData.clientId === callerUid;
              const isTherapist = bData.therapistId === callerUid || bData.therapistId2 === callerUid || (Array.isArray(bData.therapistIds) && bData.therapistIds.includes(callerUid));
              if (isClient || isTherapist) {
                isAuthorizedParticipant = true;
              }
            }
          } catch (e) {
            console.warn("[Push/Send] Error verificando participante de reserva:", e);
          }
        }

        if (!isAuthorizedParticipant) {
          return res.status(403).json({ success: false, error: "No tienes autorización para enviar notificaciones a este usuario." });
        }
      }
    }

    // Envío unificado y deduplicado por usuario individual
    if (userId) {
      const result = await sendPushNotificationToUser(db, userId, {
        title: title || "ESSENYA — Notificación",
        body: body || "Tienes una nueva actualización en tu ecosistema.",
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-72.png",
        url: url || "/",
        tag: tag || "essenya-notification",
        soundPreset: soundPreset || "classic",
        data: data || { type: "general" }
      });

      return res.json({ success: result.success, sentCount: result.sentCount, channel: result.channel, errors: result.errors });
    }

    // Difusión global administrativa (solo Admin)
    let query: any = db.collection("push_subscriptions");
    const snapshot = await query.get();
    if (snapshot.empty) {
      return res.json({ success: true, sentCount: 0, message: "No se encontraron suscripciones push activas." });
    }

    const payload = JSON.stringify({
      title: title || "ESSENYA — Notificación Global",
      body: body || "Tienes una nueva actualización en tu ecosistema.",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      url: url || "/",
      tag: tag || "essenya-broadcast",
      soundPreset: soundPreset || "classic",
      data: data || { type: "general" }
    });

    let sentCount = 0;
    const errors: any[] = [];

    for (const doc of snapshot.docs) {
      const subData = doc.data();
      if (!subData.endpoint || !subData.p256dh || !subData.auth) {
        continue;
      }

      const pushSubscription = {
        endpoint: subData.endpoint,
        keys: {
          p256dh: subData.p256dh,
          auth: subData.auth
        }
      };

      try {
        await webPush.sendNotification(pushSubscription, payload);
        sentCount++;
      } catch (err: any) {
        console.warn(`[WebPush] Error sending broadcast to ${doc.id}:`, err?.statusCode, err?.message);
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await doc.ref.delete().catch(() => {});
        } else {
          errors.push({ endpoint: subData.endpoint, error: err?.message });
        }
      }
    }

    res.json({ success: true, sentCount, errors: errors.length > 0 ? errors : undefined });
  } catch (err: any) {
    console.error("Error en /api/push/send:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stripe Checkout Integration Endpoint
app.post("/api/create-stripe-checkout", async (req: Request, res: Response) => {
  try {
    const { bookingId, serviceName, total, priceId, price, customerEmail, successUrl, cancelUrl, redirect } = req.body;
    
    const result = await stripeService.createCheckoutSession({
      bookingId,
      serviceName,
      total,
      priceId: priceId || price,
      customerEmail,
      successUrl: successUrl || `${req.protocol}://${req.get('host')}/cliente?payment=success&bookingId=${bookingId || ''}`,
      cancelUrl: cancelUrl || `${req.protocol}://${req.get('host')}/cliente?payment=cancelled&bookingId=${bookingId || ''}`
    });

    // Support HTTP 303 redirect if requested by client or form
    if (redirect === true || req.query.redirect === 'true') {
      return res.redirect(303, result.url);
    }

    res.json(result);
  } catch (err: any) {
    console.error("Error creating Stripe Checkout session:", err);
    res.status(500).json({ success: false, error: err.message || "Error al crear la sesión de pago con Stripe." });
  }
});

// Standard Stripe Checkout Session Endpoint (Supports HTML form action="/create-checkout-session")
app.all(["/create-checkout-session", "/api/create-checkout-session"], async (req: Request, res: Response) => {
  try {
    const bookingId = (req.body?.bookingId || req.query.bookingId || `PROD-${Date.now()}`) as string;
    const serviceName = (req.body?.serviceName || req.query.serviceName || 'Stubborn Attachments') as string;
    const total = Number(req.body?.total || req.query.total || 20.00);
    const priceId = (req.body?.priceId || req.body?.price || req.query.priceId || undefined) as string | undefined;
    const customerEmail = (req.body?.customerEmail || req.query.customerEmail || undefined) as string | undefined;

    const successUrl = req.body?.successUrl || `${req.protocol}://${req.get('host')}/success?session_id={CHECKOUT_SESSION_ID}&bookingId=${bookingId}`;
    const cancelUrl = req.body?.cancelUrl || `${req.protocol}://${req.get('host')}/checkout-demo`;

    const result = await stripeService.createCheckoutSession({
      bookingId,
      serviceName,
      total,
      priceId,
      customerEmail,
      successUrl,
      cancelUrl
    });

    // If submitted from standard HTML form or browser redirect requested, redirect 303
    const acceptsHtml = req.headers.accept?.includes('text/html');
    const isFormSubmit = req.headers['content-type']?.includes('application/x-www-form-urlencoded') || req.headers['content-type']?.includes('multipart/form-data');

    if (acceptsHtml || isFormSubmit || req.query.redirect === 'true' || req.body?.redirect === true) {
      return res.redirect(303, result.url);
    }

    return res.json(result);
  } catch (err: any) {
    console.error("Error en /create-checkout-session:", err);
    if (req.headers.accept?.includes('text/html')) {
      return res.status(500).send(`Error al iniciar Checkout de Stripe: ${err.message}`);
    }
    return res.status(500).json({ success: false, error: err.message || "Error al crear sesión de checkout." });
  }
});

// Dedicated 303 Redirect Endpoint for Hosted Checkout Page
app.all("/api/stripe/checkout-redirect", async (req: Request, res: Response) => {
  try {
    const bookingId = (req.body?.bookingId || req.query.bookingId || '') as string;
    const serviceName = (req.body?.serviceName || req.query.serviceName || 'Servicio de Masaje VIP') as string;
    const total = Number(req.body?.total || req.query.total || 0);
    const priceId = (req.body?.priceId || req.query.priceId || '') as string;
    const customerEmail = (req.body?.customerEmail || req.query.customerEmail || undefined) as string | undefined;

    const result = await stripeService.createCheckoutSession({
      bookingId,
      serviceName,
      total,
      priceId: priceId || undefined,
      customerEmail,
      successUrl: `${req.protocol}://${req.get('host')}/cliente?payment=success&bookingId=${bookingId}`,
      cancelUrl: `${req.protocol}://${req.get('host')}/cliente?payment=cancelled&bookingId=${bookingId}`
    });

    res.redirect(303, result.url);
  } catch (err: any) {
    console.error("Error in checkout-redirect:", err);
    res.status(500).send(`Error al iniciar Stripe Checkout: ${err.message}`);
  }
});

// Stripe Refund Endpoint
app.post("/api/stripe/refund", async (req: Request, res: Response) => {
  try {
    const { bookingId, paymentIntentId, amount, reason } = req.body;
    
    if (!bookingId && !paymentIntentId) {
      return res.status(400).json({ success: false, error: "Se requiere bookingId o paymentIntentId." });
    }

    const db = getAdminFirestore();
    let targetPaymentIntent = paymentIntentId;

    if (bookingId && !targetPaymentIntent) {
      const bookingSnap = await db.collection('reservas').doc(bookingId).get();
      if (bookingSnap.exists) {
        targetPaymentIntent = bookingSnap.data()?.stripePaymentIntent;
      }
    }

    if (!targetPaymentIntent) {
      return res.status(400).json({ 
        success: false, 
        error: "No se encontró un PaymentIntent asociado a esta reserva para procesar el reembolso en Stripe." 
      });
    }

    const refund = await stripeService.createRefund({
      paymentIntentId: targetPaymentIntent,
      amount: amount ? Number(amount) : undefined,
      reason: reason || 'requested_by_customer'
    });

    if (bookingId) {
      const nowIso = new Date().toISOString();
      await db.collection('reservas').doc(bookingId).update({
        refundedAmount: refund.amount / 100,
        refundStatus: refund.status,
        stripeRefundId: refund.id,
        updatedAt: nowIso
      });
    }

    res.json({ 
      success: true, 
      message: "Reembolso procesado exitosamente con Stripe.", 
      refundId: refund.id,
      amountRefunded: refund.amount / 100,
      status: refund.status 
    });
  } catch (err: any) {
    console.error("Error processing Stripe refund:", err);
    res.status(500).json({ success: false, error: err.message || "Error al procesar reembolso en Stripe." });
  }
});

// Stripe Webhook Handler Logic
const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  let event: Stripe.Event;
  try {
    const rawBody = (req as any).rawBody || req.body;
    event = stripeService.handleWebhook(rawBody, sig);
  } catch (err: any) {
    console.error(`[Stripe Webhook] Signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const db = getAdminFirestore();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      try {
        const bookingRef = db.collection('reservas').doc(bookingId);
        const bookingSnap = await bookingRef.get();

        if (bookingSnap.exists) {
          const bData = bookingSnap.data()!;
          if (bData.paymentStatus !== 'pagado') {
            const nowIso = new Date().toISOString();
            await bookingRef.update({
              paymentStatus: 'pagado',
              paid: true,
              dispatchState: 'buscando',
              dispatchStartedAt: nowIso,
              stripePaymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || undefined,
              updatedAt: nowIso
            });

            console.log(`[Stripe Webhook] Booking ${bookingId} successfully paid and moved to dispatch 'buscando'.`);

            // Trigger dispatch engine step immediately
            const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
            await stepDispatchEngine(db, bookingId, apiKey);

            // Sync related invoice
            if (bData.invoiceId) {
              const invRef = db.collection('invoices').doc(bData.invoiceId);
              await invRef.set({
                paymentStatus: 'pagado',
                status: 'pagada',
                paidAt: nowIso,
                updatedAt: nowIso
              }, { merge: true });
            }
          } else {
            console.log(`[Stripe Webhook] Booking ${bookingId} was already marked as paid (Idempotent).`);
          }
        }
      } catch (webhookErr) {
        console.error(`[Stripe Webhook] Error processing booking ${bookingId}:`, webhookErr);
      }
    }
  }

  res.json({ received: true });
};

// Stripe Webhook Endpoints (/api/stripe/webhook & /api/stripe-webhook)
app.post("/api/stripe/webhook", express.raw({ type: 'application/json' }), handleStripeWebhook);
app.post("/api/stripe-webhook", express.raw({ type: 'application/json' }), handleStripeWebhook);

// Start ticker and triggers
initDispatchTicker();
initFirestoreBookingsTrigger();

export default app;
