import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const configuredBase = process.env.VITE_PUBLIC_SITE_URL?.trim();
const outputDirectory = new URL("../dist/", import.meta.url);
const sitemapPath = join(outputDirectory.pathname, "sitemap.xml");
const robotsPath = join(outputDirectory.pathname, "robots.txt");

const routes = [
  "/",
  "/about",
  "/services",
  "/services/energy-management",
  "/services/energy-consulting",
  "/services/energy-project-development",
  "/services/energy-market-research",
  "/services/energy-technology-solutions",
  "/services/renewable-energy-advisory",
  "/services/energy-efficiency-auditing",
  "/services/battery-energy-storage-flexibility",
  "/services/ev-charging-infrastructure",
  "/services/ai-energy-analytics-digital-solutions",
  "/services/carbon-footprint-services",
  "/carbon-footprint-services",
  "/industries",
  "/digital-energy-solutions",
  "/insights",
  "/contact",
  "/privacy-policy",
  "/terms-of-use",
];

if (!configuredBase) {
  console.warn("VITE_PUBLIC_SITE_URL is not set; sitemap generation is skipped until GEIT's public domain is confirmed.");
  await writeFile(robotsPath, "User-agent: *\nAllow: /\n", "utf8");
  process.exit(0);
}

let publicBase;
try {
  const parsedBase = new URL(configuredBase);
  if (parsedBase.protocol !== "https:" && parsedBase.protocol !== "http:") {
    throw new Error("The public website URL must use http or https.");
  }
  publicBase = parsedBase.toString().replace(/\/+$/, "");
} catch (error) {
  throw new Error(`Invalid VITE_PUBLIC_SITE_URL: ${error instanceof Error ? error.message : "expected an absolute URL"}`);
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.map((route) => `  <url><loc>${publicBase}${route}</loc></url>`),
  "</urlset>",
  "",
].join("\n");

await writeFile(sitemapPath, sitemap, "utf8");
await writeFile(robotsPath, `User-agent: *\nAllow: /\nSitemap: ${publicBase}/sitemap.xml\n`, "utf8");
console.log(`Generated sitemap for ${publicBase}.`);
