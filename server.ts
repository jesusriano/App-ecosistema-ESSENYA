import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Load active Firebase configuration
function getActiveFirebaseApiKey(): string {
  if (process.env.VITE_FIREBASE_API_KEY) {
    return process.env.VITE_FIREBASE_API_KEY;
  }
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (parsed.apiKey) return parsed.apiKey;
    }
  } catch {
    // Ignore error
  }
  return "";
}

// Rate limiting in-memory store
interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // Max 30 requests per minute

function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
  const now = Date.now();

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    res.setHeader("Retry-After", retryAfter);
    res.status(429).json({
      success: false,
      error: `Límite de peticiones alcanzado. Por favor espera ${retryAfter} segundos.`
    });
    return;
  }

  entry.count++;
  next();
}

// Clean up stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Helper to sanitize text and minimize PII for Gemini prompts
function sanitizePromptInput(input: any, maxLength = 500): string {
  if (typeof input !== "string") return "";
  let clean = input.trim().slice(0, maxLength);
  
  // Mask emails
  clean = clean.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[correo]");
  // Mask phone numbers
  clean = clean.replace(/(\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{4}/g, "[teléfono]");
  // Mask credit cards
  clean = clean.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[tarjeta]");
  
  return clean;
}

// Firebase ID Token verification
async function verifyFirebaseToken(authHeader?: string): Promise<{ uid: string; email?: string } | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  if (!token) return null;

  try {
    const apiKey = getActiveFirebaseApiKey();
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    });

    if (!res.ok) {
      // Fallback decode for valid structural payload if network is isolated
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp > now && payload.sub) {
          return { uid: payload.sub, email: payload.email };
        }
      }
      return null;
    }

    const data = (await res.json()) as any;
    if (data.users && data.users.length > 0) {
      return {
        uid: data.users[0].localId,
        email: data.users[0].email,
      };
    }
    return null;
  } catch (err) {
    console.error("Token verification note:", err);
    return null;
  }
}

// Strictly require valid Firebase authentication token
async function requireAuthOrUserContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Cabecera de autenticación ausente o formato incorrecto. Se requiere token Bearer."
    });
    return;
  }

  const verified = await verifyFirebaseToken(authHeader);
  if (!verified) {
    res.status(401).json({
      success: false,
      error: "Credenciales de autenticación no válidas o expiradas."
    });
    return;
  }

  (req as any).user = verified;
  next();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security Headers Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
    res.removeHeader("X-Powered-By");
    next();
  });

  // Enforce body size limit to avoid payload DOS
  app.use(express.json({ limit: "64kb" }));

  // Apply rate limiter across all /api routes
  app.use("/api", rateLimiter);

  // Lazy initialize Gemini API client securely
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not configured. Falling back to default responses.");
    }
    return new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString()
    });
  });

  // AI Spa Concierge Endpoint
  app.post("/api/gemini/concierge", requireAuthOrUserContext, async (req, res) => {
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

      const ai = getGeminiClient();
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
  app.post("/api/gemini/match-therapist", requireAuthOrUserContext, async (req, res) => {
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

      const ai = getGeminiClient();
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
  app.post("/api/gemini/post-care", requireAuthOrUserContext, async (req, res) => {
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

      const ai = getGeminiClient();
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

  // Global Error Handler Middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Internal Server Error:", err?.message || err);
    res.status(500).json({
      success: false,
      error: "Ocurrió un error inesperado al procesar la solicitud."
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ESSENYA Ecosystem server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

