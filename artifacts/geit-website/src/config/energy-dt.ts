/**
 * Energy DT is a separate application (repository IET-Oy/IET-Oy-Energy-DT, not yet deployed).
 * The corporate site only links to it. Set VITE_ENERGY_DT_URL at build time to its HTTPS
 * origin, e.g. https://energy-dt.vercel.app or https://app.geit.rw (no path).
 */
const raw = String((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_ENERGY_DT_URL ?? "").trim().replace(/\/+$/, "");

export function normaliseEnergyDtUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.pathname === "/" || url.pathname === "") && !url.search && !url.hash && !url.username ? url.origin : "";
  } catch { return ""; }
}

export const ENERGY_DT_URL = normaliseEnergyDtUrl(raw);

/** A link into the Energy DT application, or the contact page while no application URL is configured. */
export function energyDtLink(path = "/app", base = ENERGY_DT_URL) {
  return base ? `${base}${path}` : "/contact";
}
