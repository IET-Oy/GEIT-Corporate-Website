import { Router, type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import {
  PlatformAuthBody, PlatformAuthParams, CreatePlatformOrganisationBody,
  UpdatePlatformOrganisationBody, UpdatePlatformOrganisationParams,
  GetPlatformMembersParams, AddPlatformMemberBody, RemovePlatformMemberParams,
} from "@workspace/api-zod";
import {
  identity, supabase, platformOrigin, savePlatformSession, clearPlatformSession, PlatformError, checkAuthAvailability,
} from "../lib/platform-session";
import { logger } from "../lib/logger";
import energyRouter from "./energy";
import engineeringRouter from "./engineering";

const router = Router();
router.use(cookieParser());
const attempts = new Map<string, { count: number; until: number }>();
router.use((req, res, next) => {
  res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  if (req.method === "GET") return next();
  try {
    if (req.get("Origin") !== platformOrigin() || req.get("X-GEIT-Request") !== "1") {
      throw new PlatformError(403, "This request must originate from the GEIT application.");
    }
    if (["POST", "PATCH", "PUT"].includes(req.method) && !req.is("application/json")) {
      throw new PlatformError(415, "Use a JSON request.");
    }
    const now = Date.now();
    if (attempts.size > 5000) for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
    if (attempts.size > 10000) throw new PlatformError(429, "Please try again later.");
    const key = `${req.ip}:${req.path.startsWith("/auth/") ? "auth" : "write"}`;
    const current = attempts.get(key);
    const value = current && current.until > now ? current : { count: 0, until: now + 60000 };
    attempts.set(key, value);
    if (++value.count > (key.endsWith(":auth") ? 20 : 60)) {
      res.set("Retry-After", "60");
      throw new PlatformError(429, "Too many requests. Please wait a minute and try again.");
    }
    next();
  } catch (error) { next(error); }
});
router.use("/energy/:orgId", energyRouter);
router.use("/engineering/:orgId/:module", engineeringRouter);

function checkDatabase(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === "42501") throw new PlatformError(403, "You do not have permission for this action.");
  if (error.code === "22023") {
    const allowed = ["Invalid time zone", "Invalid role", "An organisation must retain at least one owner",
      "Account unavailable. Ask the person to register and verify their email first."];
    throw new PlatformError(400, allowed.includes(error.message || "") ? error.message! : "Invalid request.");
  }
  if (error.code === "23514") throw new PlatformError(400, "Please check the field lengths and values.");
  throw new PlatformError(503, "Organisation services are temporarily unavailable.");
}
async function organisations(client: ReturnType<typeof supabase>, userId: string) {
  const result = await client.from("geit_memberships")
    .select("role,geit_organisations(id,name,timezone)").eq("user_id", userId);
  checkDatabase(result.error);
  return (result.data || []).map((row) => ({ ...(row.geit_organisations as unknown as {
    id: string; name: string; timezone: string;
  }), role: row.role }));
}
function parse<T>(schema: { safeParse: (body: unknown) => { success: boolean; data?: T } }, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new PlatformError(400, "Check the required fields, email format and password length (12–128 characters).");
  return result.data!;
}
router.get("/session", async (req, res) => {
  try {
    const { user, client } = await identity(req, res);
    const result = await client.rpc("geit_sync_profile");
    checkDatabase(result.error);
    return res.json({
      user: { id: user.id, email: user.email || "", fullName: user.user_metadata.full_name || "GEIT member" },
      organisations: await organisations(client, user.id),
    });
  } catch (error) {
    if (error instanceof PlatformError && error.status === 401) return res.json({ user: null, organisations: [] });
    throw error;
  }
});
router.post("/auth/:action", async (req, res) => {
  const { action } = parse(PlatformAuthParams, req.params);
  const data = parse(PlatformAuthBody.strict(), req.body);
  const auth = supabase(req, res);
  const origin = platformOrigin();
  if (action === "signup") {
    if (!data.email || !data.password || !data.fullName?.trim()) throw new PlatformError(400, "Name, email and password are required.");
    const result = await auth.auth.signUp({
      email: data.email, password: data.password,
      options: { data: { full_name: data.fullName.trim() }, emailRedirectTo: `${origin}/app/auth/callback` },
    });
    checkAuthAvailability(result.error);
    if (result.error) {
      if (result.error.status === 429) throw new PlatformError(429, "Email rate limit reached. Please try again later.");
      throw new PlatformError(400, "Registration could not be completed. Check your details or try signing in.");
    }
    if (result.data.session) savePlatformSession(res, result.data.session);
    return res.json({ message: "If registration is available for this address, check your email to verify your account before signing in." });
  }
  if (action === "signin") {
    if (!data.email || !data.password) throw new PlatformError(400, "Email and password are required.");
    const result = await auth.auth.signInWithPassword({ email: data.email, password: data.password });
    checkAuthAvailability(result.error);
    if (result.error || !result.data.session || !result.data.user?.email_confirmed_at) {
      throw new PlatformError(401, "Sign-in failed. Check your credentials and verify your email.");
    }
    savePlatformSession(res, result.data.session);
    return res.json({ message: "You are signed in." });
  }
  if (action === "recovery") {
    if (!data.email) throw new PlatformError(400, "A valid email address is required.");
    const result = await auth.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${origin}/app/auth/callback?flow=recovery`,
    });
    if (result.error) throw new PlatformError(503, "A recovery email could not be requested. Please try again later.");
    return res.json({ message: "If an account exists for this address, check your email for the recovery link. Open it in this browser." });
  }
  if (action === "callback") {
    if (!data.code) throw new PlatformError(400, "The verification link is incomplete. Request a new link in this browser.");
    const result = await auth.auth.exchangeCodeForSession(data.code);
    checkAuthAvailability(result.error);
    if (result.error || !result.data.session) throw new PlatformError(400, "This link has expired or belongs to another browser. Request a new link.");
    const verified = await auth.auth.getUser(result.data.session.access_token);
    checkAuthAvailability(verified.error);
    if (!verified.data.user?.email_confirmed_at) throw new PlatformError(401, "Email verification is required.");
    savePlatformSession(res, result.data.session);
    return res.json({ message: "Your account link has been verified." });
  }
  if (action === "signout") {
    try {
      const current = await identity(req, res);
      const signed = await auth.auth.setSession({ access_token: current.token, refresh_token: current.refresh });
      if (signed.error) throw new PlatformError(503, "Sign-out could not be confirmed. Please try again.");
      const result = await auth.auth.signOut({ scope: "local" });
      if (result.error) throw new PlatformError(503, "Sign-out could not be confirmed. Please try again.");
    } catch (error) {
      if (!(error instanceof PlatformError && error.status === 401)) throw error;
    }
    clearPlatformSession(res);
    return res.json({ message: "You are signed out." });
  }
  const current = await identity(req, res);
  if (!data.password) throw new PlatformError(400, "Enter a new password of at least 12 characters.");
  const signed = await auth.auth.setSession({ access_token: current.token, refresh_token: current.refresh });
  if (signed.error) throw new PlatformError(401, "Please request a new recovery link.");
  const result = await auth.auth.updateUser({ password: data.password });
  if (result.error) throw new PlatformError(400, "Password could not be updated. Choose a different strong password.");
  const session = (await auth.auth.getSession()).data.session;
  if (session) savePlatformSession(res, session);
  return res.json({ message: "Your password has been updated." });
});
router.post("/organisations", async (req, res) => {
  const { client, user } = await identity(req, res);
  const data = parse(CreatePlatformOrganisationBody.strict(), req.body);
  const result = await client.rpc("geit_create_organisation", { org_name: data.name, org_timezone: data.timezone });
  checkDatabase(result.error);
  const orgs = await organisations(client, user.id);
  res.status(201).json(orgs.find((org) => org.id === result.data));
});
router.patch("/organisations/:id", async (req, res) => {
  const { client, user } = await identity(req, res);
  const { id } = parse(UpdatePlatformOrganisationParams, req.params);
  const data = parse(UpdatePlatformOrganisationBody.strict(), req.body);
  const result = await client.rpc("geit_update_organisation", { org: id, org_name: data.name, org_timezone: data.timezone });
  checkDatabase(result.error);
  res.json((await organisations(client, user.id)).find((org) => org.id === id));
});
router.get("/organisations/:id/members", async (req, res) => {
  const { client } = await identity(req, res);
  const { id } = parse(GetPlatformMembersParams, req.params);
  const result = await client.from("geit_memberships").select("user_id,role").eq("organisation_id", id);
  checkDatabase(result.error);
  if (!result.data?.length) throw new PlatformError(403, "This organisation is not available to your account.");
  const profiles = await client.from("geit_profiles").select("user_id,full_name").in("user_id", result.data.map((m) => m.user_id));
  checkDatabase(profiles.error);
  res.json(result.data.map((member) => ({
    userId: member.user_id, role: member.role,
    fullName: profiles.data?.find((p) => p.user_id === member.user_id)?.full_name || "GEIT member",
  })));
});
router.post("/organisations/:id/members", async (req, res) => {
  const { client } = await identity(req, res);
  const { id } = parse(GetPlatformMembersParams, req.params);
  const data = parse(AddPlatformMemberBody.strict(), req.body);
  const result = await client.rpc("geit_set_member", { org: id, member_email: data.email, member_role: data.role });
  checkDatabase(result.error);
  res.json({ message: "Membership saved." });
});
router.delete("/organisations/:id/members/:userId", async (req, res) => {
  const { client } = await identity(req, res);
  const { id, userId } = parse(RemovePlatformMemberParams, req.params);
  const result = await client.rpc("geit_remove_member", { org: id, member_id: userId });
  checkDatabase(result.error);
  res.json({ message: "Membership removed." });
});
router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof PlatformError) return res.status(error.status).json({ error: error.message });
  // Do not log provider errors, request bodies, URLs with codes, or credentials.
  logger.error({ category: "platform_request_failed" }, "Platform request failed");
  return res.status(503).json({ error: "The account service is temporarily unavailable. Please try again." });
});
export default router;
