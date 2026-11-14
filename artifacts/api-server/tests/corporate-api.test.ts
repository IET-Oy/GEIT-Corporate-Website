import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";

test("corporate API keeps health and the optional legacy enquiry endpoint, and no Energy DT routes", async () => {
  delete process.env.DATABASE_URL;
  const { default: app } = await import("../src/app");
  const server = app.listen(0); await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    assert.deepEqual(await (await fetch(`${base}/api/healthz`)).json(), { status: "ok" });
    const invalid = await fetch(`${base}/api/enquiries`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    assert.equal(invalid.status, 400);
    const valid = await fetch(`${base}/api/enquiries`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      fullName: "Synthetic Person", organization: "Synthetic Org", businessEmail: "synthetic@example.invalid", country: "Rwanda",
      serviceOfInterest: "Energy Management", projectDescription: "Synthetic test description long enough to pass validation.", privacyConsent: true,
    }) });
    assert.ok([400, 503].includes(valid.status), `legacy enquiries without DATABASE_URL: ${valid.status}`);
    for (const path of ["/api/platform/session", "/api/platform/energy/x"]) {
      const r = await fetch(base + path);
      assert.equal(r.status, 404, path);
      assert.deepEqual(await r.json(), { error: "API route not found." });
    }
  } finally { server.close(); }
});
