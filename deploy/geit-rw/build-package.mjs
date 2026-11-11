// Builds an upload-ready bundle for geit.rw:  node deploy/geit-rw/build-package.mjs
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const site = process.env.GEIT_PUBLIC_URL || "https://geit.rw";
const out = path.join(root, "deploy", "out", "geit-rw-node");
const run = (args, env = {}) => execFileSync("pnpm", args, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });

run(["--filter", "@workspace/geit-website", "run", "build"], { NODE_ENV: "production", PORT: "3000", BASE_PATH: "/", VITE_PUBLIC_SITE_URL: site });
run(["--filter", "@workspace/api-server", "run", "build"], { NODE_ENV: "production" });

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(path.join(root, "artifacts/api-server/dist"), path.join(out, "dist"), { recursive: true, filter: (f) => !f.endsWith(".map") });
cpSync(path.join(root, "artifacts/geit-website/dist/public"), path.join(out, "public"), { recursive: true });
for (const f of ["app.cjs", "env.example", "static-only.htaccess", "README.md"]) cpSync(path.join(here, f), path.join(out, f));

// Packages that esbuild leaves external because they read their own files at runtime.
const version = (name) => {
  const pkg = path.join(root, "artifacts/api-server/node_modules", name, "package.json");
  return JSON.parse(readFileSync(pkg, "utf8")).version;
};
writeFileSync(path.join(out, "package.json"), JSON.stringify({
  name: "geit-website-energy-dt", private: true, main: "app.cjs",
  scripts: { start: "node app.cjs" },
  engines: { node: ">=20.12" },
  dependencies: Object.fromEntries(["pdfkit", "exceljs", "unzipper"].map((n) => [n, version(n)])),
}, null, 2) + "\n");

const zip = path.join(root, "deploy", "out", "geit-rw-node.zip");
rmSync(zip, { force: true });
try {
  execFileSync("zip", ["-qr", zip, "."], { cwd: out });
  console.log(`\nPackage ready: ${path.relative(root, zip)}`);
} catch {
  console.log(`\nPackage folder ready (zip tool not found): ${path.relative(root, out)}`);
}
if (!existsSync(path.join(out, "public", "sitemap.xml"))) console.warn("Warning: sitemap.xml was not generated.");
