import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

export async function verifyEnergyBoundary({ clients, orgIds, accountId, passed }) {
  for (const table of ["sites", "meters", "tariffs", "rules", "imports", "readings", "analyses", "alerts"]) {
    const own = await clients[0].from(`geit_energy_${table}`).select("id").eq("organisation_id", orgIds[0]);
    assert.equal(own.error, null); assert.ok(own.data.length > 0, `No positive-control ${table} data`);
    const foreign = await clients[1].from(`geit_energy_${table}`).select("id").eq("organisation_id", orgIds[0]);
    assert.equal(foreign.error, null); assert.equal(foreign.data.length, 0, `Leaked ${table}`);
  }
  passed("All eight populated energy tables have own-tenant positive controls and foreign-tenant denial");
  const existing = await clients[0].from("geit_energy_readings").select("meter_id,start_at,end_at").eq("organisation_id", orgIds[0]).eq("is_demo", false).order("start_at").limit(1).single();
  assert.equal(existing.error, null);
  const newStart = "2099-01-01T00:00:00Z", newEnd = "2099-01-01T01:00:00Z";
  // Bypass the server preview deliberately: model a concurrent, formerly clean
  // preview with a new row followed by an overlapping row. DB must roll back both.
  const preview = await clients[0].from("geit_energy_imports").insert({
    organisation_id: orgIds[0], meter_id: existing.data.meter_id, filename: "ATOMICITY-TEST.csv",
    row_count: 2, valid_count: 2, errors: [], created_by: accountId, is_demo: false,
    normalized_rows: [
      { start: newStart, end: newEnd, value: 1, unit: "kWh" },
      { start: existing.data.start_at, end: existing.data.end_at, value: 1, unit: "kWh" },
    ],
  }).select("id").single();
  assert.equal(preview.error, null);
  const commit = await clients[0].rpc("geit_energy_commit_import", { p_org: orgIds[0], p_import: preview.data.id });
  assert.ok(["23P01", "23505"].includes(commit.error?.code), "Database must reject overlapping data, not rely on server preview");
  const rows = await clients[0].from("geit_energy_readings").select("id").eq("meter_id", existing.data.meter_id).eq("start_at", newStart);
  assert.equal(rows.error, null); assert.equal(rows.data.length, 0);
  const state = await clients[0].from("geit_energy_imports").select("status").eq("id", preview.data.id).single();
  assert.equal(state.data.status, "preview");
  passed("Database overlap constraint rejects stale/forged clean preview and rolls back earlier inserted rows");
  const foreign = await clients[1].rpc("geit_energy_commit_import", { p_org: orgIds[1], p_import: preview.data.id });
  assert.equal(foreign.error?.code, "22023");
  passed("An own-tenant RPC call with another tenant's import ID cannot access the import");
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.NODE_ENV === "production") throw new Error("Development-only verification.");
  const fixtures = JSON.parse(await readFile("/tmp/geit-platform-test-fixtures.json", "utf8"));
  const clients = [];
  for (const account of fixtures.accounts.slice(0, 2)) {
    const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const signed = await client.auth.signInWithPassword({ email: account.email, password: account.password });
    assert.equal(signed.error, null); clients.push(client);
  }
  try { await verifyEnergyBoundary({ clients, orgIds: fixtures.orgIds, accountId: fixtures.accounts[0].id, passed: (name) => console.log("PASS:", name) }); }
  finally { await Promise.all(clients.map((c) => c.auth.signOut({ scope: "local" }))); }
}
