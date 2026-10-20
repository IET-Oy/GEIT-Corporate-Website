import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import app from "../src/app";
import { platformOrigin } from "../src/lib/platform-session";

// A real Express HTTP server with a synthetic provider adapter. No remote
// account, database or storage writes. This verifies server checks, NOT DB RLS.
test("HTTP tenant and role boundaries fail closed with a synthetic provider", async (t) => {
  const nativeFetch = globalThis.fetch;
  const previous = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_PUBLISHABLE_KEY };
  process.env.SUPABASE_URL = "https://synthetic.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "synthetic-test-key";
  const org = "00000000-0000-4000-8000-000000000001";
  const foreign = "00000000-0000-4000-8000-000000000002";
  let role: string | null = "reader";
  const reads: URL[] = [], writes: URL[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://synthetic.supabase.co", "No unexpected external request allowed");
    let data: unknown;
    if (url.pathname === "/auth/v1/user") {
      data = { id: org, email: "synthetic@example.invalid", email_confirmed_at: "2026-01-01T00:00:00Z", user_metadata: {} };
    } else if (url.pathname === "/rest/v1/rpc/geit_role") {
      data = JSON.parse(String(init?.body)).org === org ? role : null;
    } else if (url.pathname.startsWith("/rest/v1/geit_")) {
      if ((init?.method || "GET") !== "GET") writes.push(url);
      else reads.push(url);
      data = url.searchParams.has("id") ? null : [];
    } else throw new Error(`Unexpected synthetic provider endpoint: ${url.pathname}`);
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  };
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/platform`;
  const headers = { Origin: platformOrigin(), "X-GEIT-Request": "1", "Content-Type": "application/json",
    Cookie: "geit-access=synthetic-access; geit-refresh=synthetic-refresh" };
  async function call(path: string, method = "GET", body?: unknown) {
    return nativeFetch(`${base}${path}`, { method, headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000) });
  }
  try {
    await t.test("foreign organisations and reader mutations are rejected before data access", async () => {
      for (const path of [`/energy/${foreign}`, `/engineering/${foreign}/carbon-footprint`]) {
        assert.equal((await call(path)).status, 403);
      }
      for (const path of [`/energy/${org}/imports`, `/engineering/${org}/carbon-footprint/projects`]) {
        assert.equal((await call(path, "POST", {})).status, 403);
      }
      assert.equal(reads.length, 0); assert.equal(writes.length, 0);
    });
    await t.test("concurrent own-tenant reads retain tenant filters on every table", async () => {
      const responses = await Promise.all(Array.from({ length: 12 }, () => call(`/energy/${org}`)));
      for (const response of responses) {
        assert.equal(response.status, 200);
        assert.deepEqual(Object.values(await response.json()).flat(), []);
      }
      assert.equal(reads.length, 12 * 7);
      for (const url of reads) assert.equal(url.searchParams.get("organisation_id"), `eq.${org}`);
    });
    await t.test("foreign IDs cannot download a report even inside an authorised organisation", async () => {
      assert.equal((await call(`/energy/${org}/analyses/${foreign}/export/csv`)).status, 404);
      assert.equal((await call(`/engineering/${org}/carbon-footprint/scenarios/${foreign}`)).status, 404);
      for (const url of reads.filter((u) => u.searchParams.has("id"))) {
        assert.equal(url.searchParams.get("organisation_id"), `eq.${org}`);
      }
    });
    await t.test("forged ownership, invalid references and injection-shaped identifiers never write", async () => {
      role = "owner";
      assert.equal((await call(`/energy/${org}/records`, "POST", {
        kind: "site", name: "Synthetic", timezone: "UTC", organisation_id: foreign,
      })).status, 400);
      assert.equal((await call(`/energy/${encodeURIComponent("' OR 1=1--")}`)).status, 400);
      assert.equal((await call(`/energy/${org}/analyses/not-a-uuid/export/pdf`)).status, 400);
      assert.equal(writes.length, 0);
    });
  } finally {
    globalThis.fetch = nativeFetch;
    for (const [key, value] of [["SUPABASE_URL", previous.url], ["SUPABASE_PUBLISHABLE_KEY", previous.key]]) {
      if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
