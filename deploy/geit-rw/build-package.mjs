// Builds an upload-ready static bundle of the corporate website for geit.rw:
//   VITE_ENERGY_DT_URL=https://<energy-dt-domain> node deploy/geit-rw/build-package.mjs
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const site = process.env.GEIT_PUBLIC_URL || "https://geit.rw";
const energyDt = process.env.VITE_ENERGY_DT_URL || "";
const out = path.join(root, "deploy", "out", "geit-rw-static");

if (!energyDt) console.warn("Warning: VITE_ENERGY_DT_URL is not set. 'Launch Energy DT' will fall back to the contact page.");
execFileSync("pnpm", ["--filter", "@workspace/geit-website", "run", "build"], {
  cwd: root, stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production", PORT: "3000", BASE_PATH: "/", VITE_PUBLIC_SITE_URL: site, VITE_ENERGY_DT_URL: energyDt },
});

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(path.join(root, "artifacts/geit-website/dist/public"), out, { recursive: true });
cpSync(path.join(here, "htaccess"), path.join(out, ".htaccess"));

const zip = path.join(root, "deploy", "out", "geit-rw-static.zip");
rmSync(zip, { force: true });
try {
  execFileSync("zip", ["-qr", zip, "."], { cwd: out });
  console.log(`\nPackage ready: ${path.relative(root, zip)} (extract into public_html)`);
} catch {
  console.log(`\nPackage folder ready (zip tool not found): ${path.relative(root, out)}`);
}
if (!existsSync(path.join(out, "sitemap.xml"))) console.warn("Warning: sitemap.xml was not generated.");
