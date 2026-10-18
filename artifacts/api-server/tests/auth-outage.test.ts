import test from "node:test";
import assert from "node:assert/strict";
import { identity, PlatformError, checkAuthAvailability, platformOrigin } from "../src/lib/platform-session";
import app from "../src/app";
import { once } from "node:events";

test("a transient identity-provider outage returns 503 without deleting the customer's session", async () => {
  const original = globalThis.fetch; let cleared = 0;
  globalThis.fetch = async (input) => new Response(JSON.stringify({
    message: "Synthetic provider failure", code: "unexpected_failure",
  }), { status: String(input).includes("/user") ? 503 : 400, headers: { "Content-Type": "application/json" } });
  const response = { clearCookie: () => { cleared++; }, cookie: () => {} };
  try {
    await assert.rejects(identity({ cookies: { "geit-access": "synthetic-access", "geit-refresh": "synthetic-refresh" } } as never, response as never),
      (error: unknown) => error instanceof PlatformError && error.status === 503);
    assert.equal(cleared, 0);
  } finally { globalThis.fetch = original; }
});

test("provider failures are temporary errors, not failed credentials", () => {
  assert.throws(() => checkAuthAvailability({ status: 503 }), (e: unknown) => e instanceof PlatformError && e.status === 503);
  assert.throws(() => checkAuthAvailability({ name: "AuthRetryableFetchError" }), /temporarily unavailable/);
  assert.doesNotThrow(() => checkAuthAvailability({ status: 400 }));
  assert.doesNotThrow(() => checkAuthAvailability(null));
});

test("sign-in returns 503 for an upstream outage and 401 for invalid credentials without exposing provider details", async () => {
  const original = globalThis.fetch; let status = 503;
  globalThis.fetch = async () => new Response(JSON.stringify({ message: "PRIVATE_PROVIDER_SENTINEL", error_code: "invalid_credentials" }),
    { status, headers: { "Content-Type": "application/json" } });
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/platform/auth/signin`;
  try {
    for (const [provider, expected] of [[503, 503], [400, 401]]) {
      status = provider;
      const response = await original(url, { method: "POST",
        headers: { Origin: platformOrigin(), "X-GEIT-Request": "1", "Content-Type": "application/json" },
        body: JSON.stringify({ email: "synthetic@geit-test.invalid", password: "synthetic-password-only" }) });
      assert.equal(response.status, expected);
      assert.doesNotMatch(await response.text(), /PRIVATE_PROVIDER_SENTINEL/);
      assert.equal(response.headers.get("Set-Cookie"), null);
    }
  } finally { globalThis.fetch = original; await new Promise<void>((resolve) => server.close(() => resolve())); }
});
