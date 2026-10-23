import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { platformRuntime } from "./helpers/platform-runtime.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const org = { id: "00000000-0000-4000-8000-000000000001", name: "Synthetic Organisation", role: "reader", timezone: "UTC" };
const user = { id: "00000000-0000-4000-8000-000000000010", email: "synthetic@example.invalid", fullName: "Synthetic User" };
const privateCacheKey = ["/api/platform/energy/previous-tenant"];

test("real authentication components and generated client preserve account boundaries (synthetic responses, no provider calls)", async t => {
  const r = await platformRuntime(root);
  async function scenario(fn) {
    r.cleanup(); r.client.clear(); r.requests.length = 0;
    r.navigate("/app/sign-in");
    try { await fn(); } finally { r.cleanup(); r.client.clear(); }
  }
  try {
    await t.test("invalid sign-in is accessible and sends no request", () => scenario(async () => {
      r.mount(r.SignInPage);
      await r.user.click(r.screen.getByTestId("button-signin"));
      assert.equal(r.requests.length, 0);
      assert.equal(document.activeElement, r.screen.getByTestId("input-email"));
      assert.equal(r.screen.getByTestId("input-email").getAttribute("aria-invalid"), "true");
      assert.ok(r.screen.getByText("Enter your password."));
    }));
    await t.test("failed sign-in displays the API error without falsely navigating or discarding cached state", () => scenario(async () => {
      r.respond(() => r.json({ error: "Service temporarily unavailable." }, 503));
      r.client.setQueryData(privateCacheKey, { synthetic: true });
      r.mount(r.SignInPage);
      await r.user.type(r.screen.getByTestId("input-email"), user.email);
      await r.user.type(r.screen.getByTestId("input-password"), "synthetic-password");
      await r.user.click(r.screen.getByTestId("button-signin"));
      await r.screen.findByText("Service temporarily unavailable.");
      assert.equal(location.pathname, "/app/sign-in");
      assert.deepEqual(r.client.getQueryData(privateCacheKey), { synthetic: true });
    }));
    await t.test("successful sign-in sends same-origin CSRF header, clears previous-account queries and opens the workspace", () => scenario(async () => {
      r.respond(() => r.json({ message: "Signed in." }));
      r.client.setQueryData(privateCacheKey, { synthetic: true });
      r.mount(r.SignInPage);
      await r.user.type(r.screen.getByTestId("input-email"), user.email);
      await r.user.type(r.screen.getByTestId("input-password"), "synthetic-password");
      await r.user.click(r.screen.getByTestId("button-signin"));
      await r.waitFor(() => assert.equal(location.pathname, "/app"));
      assert.equal(r.requests[0].path, "/api/platform/auth/signin");
      assert.equal(new Headers(r.requests[0].init.headers).get("X-GEIT-Request"), "1");
      assert.equal(r.client.getQueryData(privateCacheKey), undefined);
      assert.equal(window.localStorage.length, 0);
    }));
    await t.test("signed-out and foreign-organisation gates never mount private workspace children", () => scenario(async () => {
      let mounted = 0;
      r.respond(() => r.json({ user: null, organisations: [] }));
      r.navigate(`/app?org=${org.id}`);
      r.mount(r.Workspace, { title: "Overview", path: "/app", children: () => { mounted++; return "PRIVATE"; } });
      await r.screen.findByTestId("state-signed-out");
      assert.equal(mounted, 0);
      r.cleanup(); r.client.clear();
      r.respond(() => r.json({ user, organisations: [org] }));
      r.navigate("/app?org=00000000-0000-4000-8000-000000000099");
      r.mount(r.Workspace, { title: "Overview", path: "/app", children: () => { mounted++; return "PRIVATE"; } });
      await r.screen.findByText("That organisation was not found in your account. Choose one below.");
      assert.equal(mounted, 0);
    }));
    await t.test("session-service outage offers retry rather than sign-out or private content", () => scenario(async () => {
      let restored = false, mounted = 0;
      r.respond(() => restored ? r.json({ user, organisations: [org] }) : r.json({ error: "Session check unavailable." }, 503));
      r.navigate(`/app?org=${org.id}`);
      r.mount(r.Workspace, { title: "Overview", path: "/app", children: () => { mounted++; return "PRIVATE"; } });
      await r.screen.findByText("Session check unavailable.");
      assert.equal(mounted, 0);
      restored = true;
      await r.user.click(r.screen.getByTestId("button-retry"));
      await r.screen.findByText("PRIVATE");
      assert.ok(mounted > 0);
    }));
    await t.test("successful logout clears private queries and returns to sign-in", () => scenario(async () => {
      let signedOut = false;
      r.respond(url => {
        if (url.pathname.endsWith("/signout")) signedOut = true;
        return r.json(url.pathname.endsWith("/session")
          ? signedOut ? { user: null, organisations: [] } : { user, organisations: [org] }
          : { message: "Signed out." });
      });
      r.client.setQueryData(privateCacheKey, { synthetic: true });
      r.navigate(`/app?org=${org.id}`);
      r.mount(r.Workspace, { title: "Overview", path: "/app", children: () => "PRIVATE" });
      await r.screen.findByText("PRIVATE");
      await r.user.click(r.screen.getByTestId("button-signout"));
      await r.waitFor(() => assert.equal(location.pathname, "/app/sign-in"));
      assert.equal(r.client.getQueryData(privateCacheKey), undefined);
      assert.ok(r.requests.some(q => q.path === "/api/platform/auth/signout"));
    }));
    await t.test("recovery validates locally and uses the real generated recovery endpoint without claiming delivery", () => scenario(async () => {
      r.respond(() => r.json({ message: "If the account can be recovered, a link will be sent." }));
      r.mount(r.ForgotPasswordPage);
      await r.user.click(r.screen.getByTestId("button-recovery"));
      assert.equal(r.requests.length, 0);
      await r.user.type(r.screen.getByTestId("input-email"), user.email);
      await r.user.click(r.screen.getByTestId("button-recovery"));
      await r.screen.findByTestId("status-recovery");
      assert.equal(r.requests[0].path, "/api/platform/auth/recovery");
    }));
    await t.test("registration enforces password length and surfaces provider failure without false success", () => scenario(async () => {
      r.respond(() => r.json({ error: "Registration temporarily unavailable." }, 503));
      r.mount(r.RegisterPage);
      await r.user.type(r.screen.getByTestId("input-fullname"), user.fullName);
      await r.user.type(r.screen.getByTestId("input-email"), user.email);
      await r.user.type(r.screen.getByTestId("input-password"), "short");
      await r.user.click(r.screen.getByTestId("button-register"));
      assert.equal(r.requests.length, 0);
      assert.ok(r.screen.getByText("Use at least 12 characters."));
      await r.user.clear(r.screen.getByTestId("input-password"));
      await r.user.type(r.screen.getByTestId("input-password"), "synthetic-password");
      await r.user.click(r.screen.getByTestId("button-register"));
      await r.screen.findByText("Registration temporarily unavailable.");
      assert.equal(r.screen.queryByTestId("status-registered"), null);
      assert.equal(r.requests[0].path, "/api/platform/auth/signup");
    }));
    await t.test("callback rejects missing codes; successful synthetic recovery callback clears old account data and scrubs the URL", () => scenario(async () => {
      r.navigate("/app/auth/callback");
      r.mount(r.CallbackPage);
      await r.screen.findByText("No sign-in code was found in this link.");
      assert.equal(r.requests.length, 0);
      r.cleanup();
      r.respond(() => r.json({ message: "Synthetic callback accepted." }));
      r.client.setQueryData(privateCacheKey, { synthetic: true });
      r.navigate("/app/auth/callback?code=synthetic-once-only&flow=recovery");
      r.mount(r.CallbackPage);
      await r.waitFor(() => assert.equal(location.pathname, "/app/reset-password"));
      assert.equal(location.search, "");
      assert.equal(r.client.getQueryData(privateCacheKey), undefined);
      assert.equal(r.requests[0].path, "/api/platform/auth/callback");
    }));
    await t.test("password update blocks mismatches and reports an expired recovery session without success", () => scenario(async () => {
      r.respond(() => r.json({ error: "Recovery authorization required." }, 401));
      r.mount(r.ResetPasswordPage);
      await r.user.type(r.screen.getByTestId("input-password"), "synthetic-password");
      await r.user.type(r.screen.getByTestId("input-confirm"), "different-password");
      await r.user.click(r.screen.getByTestId("button-password"));
      assert.ok(r.screen.getByText("Passwords do not match."));
      assert.equal(r.requests.length, 0);
      await r.user.clear(r.screen.getByTestId("input-confirm"));
      await r.user.type(r.screen.getByTestId("input-confirm"), "synthetic-password");
      await r.user.click(r.screen.getByTestId("button-password"));
      await r.screen.findByTestId("error-password");
      assert.match(r.screen.getByTestId("error-password").textContent, /recovery session has expired/i);
      assert.equal(r.screen.queryByTestId("status-password"), null);
      assert.equal(r.requests[0].path, "/api/platform/auth/password");
    }));
  } finally { await r.close(); }
});
