import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiApp from "./api/index.js";

async function startLocalServer() {
  const PORT = 3000;
  
  // Use the API app for routes
  const app = express();
  app.use(apiApp);

  // Catch unhandled /api routes and return JSON 404 (preventing Vite SPA HTML fallback)
  app.all("/api/*", (req, res) => {
    res.status(404).json({ success: false, error: `Ruta API no encontrada: ${req.method} ${req.path}` });
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

startLocalServer();
