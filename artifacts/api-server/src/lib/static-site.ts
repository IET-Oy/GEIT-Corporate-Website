import path from "node:path";
import { existsSync } from "node:fs";
import express, { type Express } from "express";

/**
 * Optional single-process hosting (for example cPanel/Passenger on geit.rw).
 * When STATIC_SITE_DIR points at the website build, the API process also serves
 * the public site and falls back to index.html for client-side routes.
 * Replit keeps routing "/" and "/api" to separate artifacts and does not set it.
 */
export function mountStaticSite(app: Express, directory: string | undefined) {
  if (!directory) return false;
  const root = path.resolve(directory);
  const index = path.join(root, "index.html");
  if (!existsSync(index)) throw new Error("STATIC_SITE_DIR must contain the built website (index.html not found).");

  const pageHeaders = {
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "SAMEORIGIN",
  };

  app.use(express.static(root, {
    index: false,
    dotfiles: "ignore",
    setHeaders(res, file) {
      // Vite emits content-hashed files under /assets; everything else may change between releases.
      const hashed = file.startsWith(path.join(root, "assets") + path.sep);
      res.setHeader("Cache-Control", hashed ? "public, max-age=31536000, immutable" : "no-cache");
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }));

  app.use((req, res, next) => {
    if ((req.method !== "GET" && req.method !== "HEAD") || req.path.startsWith("/api")) return next();
    // A missing file (an extension or a dotfile) is a real 404, not an app route.
    if (path.extname(req.path) || path.basename(req.path).startsWith(".")) return res.status(404).set(pageHeaders).type("text/plain").send("Not found");
    res.set(pageHeaders).sendFile(index);
  });
  return true;
}
