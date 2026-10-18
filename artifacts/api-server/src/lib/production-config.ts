export function resolvePlatformOrigin(env: Record<string, string | undefined>) {
  const raw = env.PLATFORM_ORIGIN || (env.NODE_ENV !== "production" && env.REPLIT_DEV_DOMAIN ? `https://${env.REPLIT_DEV_DOMAIN}` : "");
  try {
    if (!raw) throw new Error();
    const url = new URL(raw);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && !(env.NODE_ENV !== "production" && url.protocol === "http:" && url.hostname === "localhost"))) throw new Error();
    return url.origin;
  } catch { throw new Error("Set PLATFORM_ORIGIN to the HTTPS origin of the published website, without a path or credentials."); }
}
export function checkProductionConfiguration(env: Record<string, string | undefined>) {
  if (env.NODE_ENV !== "production") return;
  resolvePlatformOrigin(env);
  for (const name of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SESSION_SECRET"]) {
    if (!env[name]) throw new Error(`Required production configuration is missing: ${name}`);
  }
  const url = new URL(env.SUPABASE_URL!);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("SUPABASE_URL must be a credential-free HTTPS URL.");
  if (env.SESSION_SECRET!.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters and must be securely generated.");
}
