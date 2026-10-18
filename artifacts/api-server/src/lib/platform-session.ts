import { createClient, type Session, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Request, Response } from "express";
import { resolvePlatformOrigin } from "./production-config";

export class PlatformError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export function checkAuthAvailability(error: { status?: number; name?: string } | null) {
  if (error && (error.name === "AuthRetryableFetchError" || error.status === 0 || (error.status ?? 0) >= 500)) {
    throw new PlatformError(503, "Account services are temporarily unavailable. Your session has not been cleared. Please try again.");
  }
}
export function platformOrigin() {
  try { return resolvePlatformOrigin(process.env); }
  catch { throw new PlatformError(503, "The application origin is not configured correctly."); }
}
export function cookieOptions() {
  return {
    httpOnly: true,
    secure: platformOrigin().startsWith("https:"),
    sameSite: "lax" as const, path: "/api/platform",
  };
}
export function clearPlatformSession(res: Response) {
  for (const name of ["geit-access", "geit-refresh", "geit-pkce"]) {
    res.clearCookie(name, cookieOptions());
  }
}
export function savePlatformSession(res: Response, session: Session) {
  res.cookie("geit-access", session.access_token, {
    ...cookieOptions(), maxAge: 60 * 60 * 1000,
  });
  res.cookie("geit-refresh", session.refresh_token, {
    ...cookieOptions(), maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}
export function supabase(req?: Request, res?: Response, token?: string) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new PlatformError(503, "Account services are not configured.");
  const memory = new Map<string, string>();
  return createClient(url, key, {
    global: {
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
    },
    auth: {
      // The SDK ignores custom storage when persistSession=false. Persist only
      // the PKCE verifier in an HttpOnly cookie; session storage stays request-local.
      flowType: "pkce", autoRefreshToken: false, persistSession: true,
      detectSessionInUrl: false, storageKey: "geit-auth",
      storage: {
        getItem: (key) => key.endsWith("-code-verifier") ? memory.get(key) ?? req?.cookies?.["geit-pkce"] ?? null : memory.get(key) ?? null,
        setItem: (key, value) => {
          memory.set(key, value);
          if (key.endsWith("-code-verifier") && res) {
            res.cookie("geit-pkce", value, { ...cookieOptions(), maxAge: 10 * 60 * 1000 });
          }
        },
        removeItem: (key) => {
          memory.delete(key);
          if (key.endsWith("-code-verifier") && res) res.clearCookie("geit-pkce", cookieOptions());
        },
      },
    },
  });
}
export type Identity = { user: User; client: SupabaseClient; token: string; refresh: string };
export async function identity(req: Request, res: Response): Promise<Identity> {
  let token: string | undefined = req.cookies?.["geit-access"];
  let refresh: string | undefined = req.cookies?.["geit-refresh"];
  const auth = supabase(req, res);
  const lookup = token ? await auth.auth.getUser(token) : null;
  checkAuthAvailability(lookup?.error ?? null);
  let user = lookup?.data.user ?? null;
  if (!user && refresh) {
    const result = await auth.auth.refreshSession({ refresh_token: refresh });
    checkAuthAvailability(result.error);
    if (result.data.session) {
      token = result.data.session.access_token; refresh = result.data.session.refresh_token;
      savePlatformSession(res, result.data.session);
      const verified = await auth.auth.getUser(token);
      checkAuthAvailability(verified.error);
      user = verified.data.user;
    }
  }
  if (!user || !token || !refresh || !user.email_confirmed_at) {
    clearPlatformSession(res);
    throw new PlatformError(401, "Please sign in with a verified email address.");
  }
  return { user, token, refresh, client: supabase(undefined, undefined, token) };
}
