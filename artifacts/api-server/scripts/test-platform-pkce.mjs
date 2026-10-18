import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { supabase } from "../src/lib/platform-session.ts";

test("PKCE verifier crosses requests in an HttpOnly cookie, not session storage", async () => {
  const original = globalThis.fetch;
  const cookies = {};
  const cookieOptions = {};
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ path: new URL(url).pathname, body: JSON.parse(init.body || "{}") });
    if (String(url).includes("/signup")) return new Response(JSON.stringify({
      id: randomUUID(), aud: "authenticated", email: "fixture@example.invalid",
      user_metadata: {}, app_metadata: {}, created_at: new Date().toISOString(),
    }), { status: 200, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ msg: "Invalid fixture code" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  };
  const response = {
    cookie: (key, value, opts) => { cookies[key] = value; cookieOptions[key] = opts; },
    clearCookie: () => {},
  };
  try {
    const first = supabase({ cookies: {} }, response);
    await first.auth.signUp({
      email: "fixture@example.invalid", password: "synthetic-test-password",
      options: { emailRedirectTo: "https://example.invalid/app/auth/callback" },
    });
    assert.ok(cookies["geit-pkce"], "The verifier must be available to the callback request");
    assert.equal(cookieOptions["geit-pkce"].httpOnly, true);
    assert.equal(cookieOptions["geit-pkce"].sameSite, "lax");
    assert.equal(cookieOptions["geit-pkce"].maxAge, 600000);
    assert.deepEqual(Object.keys(cookies), ["geit-pkce"], "SDK session tokens must not be persisted by this storage adapter");
    const second = supabase({ cookies }, response);
    await second.auth.exchangeCodeForSession("synthetic-invalid-code");
    const exchange = calls.find((c) => c.path.endsWith("/token"));
    assert.ok(exchange?.body.code_verifier?.length >= 43, "A fresh request must read the saved PKCE verifier");
    assert.ok(calls.find((c) => c.path.endsWith("/signup"))?.body.code_challenge, "Signup must send a PKCE challenge");
  } finally { globalThis.fetch = original; }
});
