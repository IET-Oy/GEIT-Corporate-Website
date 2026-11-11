import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { mountStaticSite } from "../src/lib/static-site";

test("single-process hosting serves the site, SPA routes and hashed assets without shadowing the API", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "geit-site-"));
  mkdirSync(path.join(dir, "assets"));
  writeFileSync(path.join(dir, "index.html"), "<!doctype html><div id=root>GEIT</div>");
  writeFileSync(path.join(dir, "assets", "app-abc123.js"), "console.log(1)");
  writeFileSync(path.join(dir, "robots.txt"), "User-agent: *");
  writeFileSync(path.join(dir, ".env"), "SECRET=1");
  const app = express();
  app.get("/api/healthz", (_req, res) => { res.json({ status: "ok" }); });
  app.use("/api", (_req, res) => { res.status(404).json({ error: "API route not found." }); });
  assert.equal(mountStaticSite(app, dir), true);
  const server = app.listen(0); await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    for (const route of ["/", "/energy-dt", "/app/energy-management", "/services/energy-management"]) {
      const r = await fetch(base + route);
      assert.equal(r.status, 200, route);
      assert.match(await r.text(), /GEIT/);
      assert.equal(r.headers.get("cache-control"), "no-cache");
      assert.equal(r.headers.get("x-frame-options"), "SAMEORIGIN");
    }
    const asset = await fetch(`${base}/assets/app-abc123.js`);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get("cache-control") ?? "", /immutable/);
    assert.equal((await fetch(`${base}/robots.txt`)).headers.get("cache-control"), "no-cache");
    assert.equal((await fetch(`${base}/assets/missing.js`)).status, 404);
    assert.equal((await fetch(`${base}/.env`)).status, 404);
    assert.deepEqual(await (await fetch(`${base}/api/healthz`)).json(), { status: "ok" });
    const unknownApi = await fetch(`${base}/api/unknown`);
    assert.equal(unknownApi.status, 404);
    assert.match(unknownApi.headers.get("content-type") ?? "", /json/);
    assert.equal((await fetch(`${base}/contact`, { method: "POST" })).status, 404);
  } finally {
    server.close(); rmSync(dir, { recursive: true, force: true });
  }
});

test("static hosting stays off unless configured and fails loudly on an empty directory", () => {
  assert.equal(mountStaticSite(express(), undefined), false);
  const dir = mkdtempSync(path.join(tmpdir(), "geit-empty-"));
  try { assert.throws(() => mountStaticSite(express(), dir), /index\.html not found/); }
  finally { rmSync(dir, { recursive: true, force: true }); }
});
