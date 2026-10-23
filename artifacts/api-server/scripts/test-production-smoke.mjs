import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import { setTimeout as pause } from "node:timers/promises";

const reserve = net.createServer();
await new Promise((resolve) => reserve.listen(0, "127.0.0.1", resolve));
const port = reserve.address().port;
await new Promise((resolve) => reserve.close(resolve));
const origin = "https://geit-audit.invalid";
const child = spawn(process.execPath, ["dist/index.mjs"], {
  cwd: new URL("../", import.meta.url), stdio: ["ignore", "ignore", "ignore"],
  env: { ...process.env, NODE_ENV: "production", PORT: String(port), PLATFORM_ORIGIN: origin },
});
const base = `http://127.0.0.1:${port}`;
try {
  let healthy = false;
  for (let i = 0; i < 60 && child.exitCode === null; i++) {
    try { healthy = (await fetch(`${base}/api/healthz`)).status === 200; } catch {}
    if (healthy) break;
    await pause(200);
  }
  assert.ok(healthy, "Compiled production server must start with the existing required configuration.");
  let checks = 1;
  for (const [path, options, status] of [
    ["/api/route-that-does-not-exist", {}, 404],
    ["/api/platform/auth/signin", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }, 400],
    ["/api/platform/auth/signin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: "x".repeat(40000) }) }, 413],
    ["/api/platform/auth/signin", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://foreign.invalid", "X-GEIT-Request": "1" }, body: "{}" }, 403],
    ["/api/platform/energy/00000000-0000-4000-8000-000000000000", {}, 401],
  ]) {
    const response = await fetch(`${base}${path}`, options);
    assert.equal(response.status, status);
    assert.match(response.headers.get("Content-Type"), /application\/json/);
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(response.headers.get("X-Powered-By"), null);
    assert.doesNotMatch(await response.text(), /<html|SyntaxError|node_modules|SUPABASE_DB_URL/);
    checks++;
  }
  const session = await fetch(`${base}/api/platform/session`, { headers: { Origin: "https://foreign.invalid" } });
  assert.equal(session.headers.get("Access-Control-Allow-Origin"), null); checks++;
  for (let i = 0; i < 21; i++) {
    const response = await fetch(`${base}/api/platform/auth/signin`, {
      method: "POST", headers: { Origin: origin, "X-GEIT-Request": "1", "Content-Type": "application/json" }, body: "{}",
    });
    assert.equal(response.status, i < 20 ? 400 : 429);
    if (i === 20) assert.equal(response.headers.get("Retry-After"), "60");
  }
  checks++;
  const missing = spawn(process.execPath, ["dist/index.mjs"], {
    cwd: new URL("../", import.meta.url), stdio: ["ignore", "ignore", "pipe"],
    env: { ...process.env, NODE_ENV: "production", PORT: String(port), PLATFORM_ORIGIN: "" },
  });
  let missingOriginError = "";
  missing.stderr.on("data", chunk => { missingOriginError = (missingOriginError + chunk.toString()).slice(0, 8192); });
  const exit = await new Promise((resolve) => missing.on("exit", resolve));
  assert.notEqual(exit, 0);
  assert.match(missingOriginError, /Set PLATFORM_ORIGIN to the HTTPS origin/); checks++;
  const fixturesEnabled = spawn(process.execPath, ["dist/index.mjs"], {
    cwd: new URL("../", import.meta.url), stdio: ["ignore", "ignore", "pipe"],
    env: { ...process.env, NODE_ENV: "production", PORT: String(port), PLATFORM_ORIGIN: origin, GEIT_ALLOW_TEST_FIXTURE_WRITES: "yes" },
  });
  let fixtureError = "";
  fixturesEnabled.stderr.on("data", chunk => { fixtureError = (fixtureError + chunk.toString()).slice(0, 8192); });
  const fixtureExit = await new Promise((resolve) => fixturesEnabled.on("exit", resolve));
  assert.notEqual(fixtureExit, 0);
  assert.match(fixtureError, /Test fixture writes must remain disabled in the production API process/); checks++;
  console.log(`${checks} compiled-production smoke checks passed (local only; not a published-domain test).`);
} finally { child.kill("SIGTERM"); }
