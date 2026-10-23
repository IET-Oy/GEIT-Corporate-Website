import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { signEnergyAnalysis, verifyEnergyAnalysis } from "../src/lib/energy-integrity";
import { checkProductionConfiguration, resolvePlatformOrigin } from "../src/lib/production-config";
import { httpErrors } from "../src/lib/http-errors";

test("production origin cannot fall back to a development domain or contain credentials/paths", () => {
  assert.equal(resolvePlatformOrigin({ REPLIT_DEV_DOMAIN: "preview.example" }), "https://preview.example");
  for (const origin of [undefined, "http://example.com", "https://user:password@example.com", "https://example.com/app", "invalid"]) {
    assert.throws(() => resolvePlatformOrigin({ NODE_ENV: "production", REPLIT_DEV_DOMAIN: "preview.example", PLATFORM_ORIGIN: origin }));
  }
  assert.equal(resolvePlatformOrigin({ NODE_ENV: "production", PLATFORM_ORIGIN: "https://geit.example" }), "https://geit.example");
});
test("production requires account configuration and a sufficiently long signing secret", () => {
  const valid = { NODE_ENV: "production", PLATFORM_ORIGIN: "https://geit.example",
    SUPABASE_URL: "https://project.supabase.co", SUPABASE_PUBLISHABLE_KEY: "synthetic-public-key",
    SESSION_SECRET: "synthetic-test-signing-key-not-for-production" };
  assert.doesNotThrow(() => checkProductionConfiguration(valid));
  for (const field of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SESSION_SECRET"]) {
    assert.throws(() => checkProductionConfiguration({ ...valid, [field]: "" }));
  }
  assert.throws(() => checkProductionConfiguration({ ...valid, SESSION_SECRET: "short" }));
  assert.throws(() => checkProductionConfiguration({ ...valid, SUPABASE_URL: "http://project.supabase.co" }));
});
test("production refuses fixture-write flags, including a compiled staging API; only the test process may opt in", () => {
  const valid = { NODE_ENV: "production", PLATFORM_ORIGIN: "https://geit.example",
    SUPABASE_URL: "https://project.supabase.co", SUPABASE_PUBLISHABLE_KEY: "synthetic-public-key",
    SESSION_SECRET: "synthetic-test-signing-key-not-for-production" };
  for (const flag of ["yes", "true", "1", "YES"]) {
    assert.throws(() => checkProductionConfiguration({ ...valid, GEIT_ALLOW_TEST_FIXTURE_WRITES: flag }), /fixture writes must remain disabled/);
    assert.throws(() => checkProductionConfiguration({ ...valid, GEIT_ENVIRONMENT: "staging", GEIT_ALLOW_TEST_FIXTURE_WRITES: flag }));
  }
  assert.doesNotThrow(() => checkProductionConfiguration({ ...valid, GEIT_ALLOW_TEST_FIXTURE_WRITES: "no" }));
});
test("production rejects malformed Supabase origins without echoing configuration contents", () => {
  const valid = { NODE_ENV: "production", PLATFORM_ORIGIN: "https://geit.example",
    SUPABASE_PUBLISHABLE_KEY: "synthetic-public-key", SESSION_SECRET: "synthetic-test-signing-key-not-for-production" };
  for (const value of ["invalid-config-marker", "https://user:private-marker@project.supabase.co",
    "https://project.supabase.co/rest/v1", "https://project.supabase.co?token=private-marker", "https://project.supabase.co/#private-marker"]) {
    assert.throws(() => checkProductionConfiguration({ ...valid, SUPABASE_URL: value }), (error: Error) =>
      error.message === "SUPABASE_URL must be a credential-free HTTPS origin without a path, query or fragment.");
  }
});
test("energy authenticity binds the tenant, metadata, numerical outputs and complete source snapshot", () => {
  process.env.SESSION_SECRET ||= "synthetic-unit-test-signing-key-32-characters";
  const record = { organisation_id: "tenant-a", meter_id: "meter-a", tariff_id: null, name: "Saved",
    result: { totalKwh: 60 }, snapshot: { inputs: { start: "2026-01-01T00:00:00Z" }, readings: [1, 2] } };
  const signed = { ...record, snapshot: { ...record.snapshot, authenticity: signEnergyAnalysis(record) } };
  assert.doesNotThrow(() => verifyEnergyAnalysis(signed));
  for (const patch of [{ organisation_id: "tenant-b" }, { name: "Changed" }, { result: { totalKwh: 999 } },
    { snapshot: { ...signed.snapshot, readings: [100] } }]) {
    assert.throws(() => verifyEnergyAnalysis({ ...signed, ...patch }), /cannot be verified/);
  }
  assert.throws(() => verifyEnergyAnalysis(record), /cannot be verified/);
});
test("HTTP parser and unexpected errors are JSON, bounded and do not disclose internal details", async () => {
  const app = express(); app.use(express.json({ limit: "32b" }));
  app.post("/", (_req, res) => res.json({ ok: true }));
  app.get("/failure", () => { throw new Error("PRIVATE_INTERNAL_SENTINEL"); });
  app.use(httpErrors);
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    for (const [body, status] of [["{", 400], [JSON.stringify({ data: "a".repeat(100) }), 413]] as const) {
      const response = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      assert.equal(response.status, status); assert.match(response.headers.get("Content-Type")!, /application\/json/);
      assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
      assert.doesNotMatch(await response.text(), /SyntaxError|node_modules|<html|PRIVATE_INTERNAL/);
    }
    const failure = await fetch(`${base}/failure`); assert.equal(failure.status, 500);
    assert.doesNotMatch(await failure.text(), /PRIVATE_INTERNAL|stack|node_modules/);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});
