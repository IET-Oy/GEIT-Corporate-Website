// Startup file for cPanel "Setup Node.js App" (Phusion Passenger) or any Node 20+ host.
// It serves the GEIT website and the Energy DT API from one process at https://geit.rw.
const path = require("node:path");

// Optional local .env next to this file (cPanel environment variables take precedence).
try { process.loadEnvFile(path.join(__dirname, ".env")); } catch { /* no .env file */ }

process.env.NODE_ENV ||= "production";
process.env.STATIC_SITE_DIR ||= path.join(__dirname, "public");
// Passenger intercepts listen(); a port is still required by the server's startup check.
process.env.PORT ||= "3000";

import(path.join(__dirname, "dist", "index.mjs")).catch((error) => {
  console.error("GEIT server failed to start:", error && error.message ? error.message : error);
  process.exit(1);
});
