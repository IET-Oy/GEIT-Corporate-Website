import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { verifyEnergyBoundary } from "./test-energy-boundary.mjs";
export async function runEnergyIntegration({ request, jars, orgIds, clients, fixtures, passed, origin }) {
  const root = `/energy/${orgIds[0]}`;
  const call = (path, method = "GET", data, user = 0) => request(path, method, data, jars[user]);
  const ok = async (path, data, user = 0, status = 200) => {
    const r = await call(path, "POST", data, user); assert.equal(r.status, status, JSON.stringify(r.body)); return r.body;
  };
  const workspace = async (org = 0, user = org) => {
    const r = await call(`/energy/${orgIds[org]}`, "GET", undefined, user); assert.equal(r.status, 200); return r.body;
  };
  const headers = "interval_start,interval_end,value,unit\n";
  const file = (body, filename = "readings.csv") => ({ filename, fileBase64: Buffer.from(headers + body).toString("base64") });
  await ok(`${root}/records`, { kind: "site", name: "Customer Site A", timezone: "UTC", areaM2: 10 });
  await ok(`/energy/${orgIds[1]}/records`, { kind: "site", name: "Customer Site B", timezone: "UTC" }, 1);
  const siteA = (await workspace()).sites[0], siteB = (await workspace(1)).sites[0];
  for (const [i, site] of [siteA, siteB].entries()) await ok(`/energy/${orgIds[i]}/records`, { kind: "meter", name: `Meter ${i}`, siteId: site.id, unit: "kWh" }, i);
  const meterA = (await workspace()).meters[0], meterB = (await workspace(1)).meters[0];
  await ok(`${root}/records`, { kind: "tariff", name: "Customer flat tariff", currency: "USD", energyRate: 0.2, dailyCharge: 2, demandRate: 3 });
  await ok(`${root}/records`, { kind: "rule", name: "Peak threshold", meterId: meterA.id, metric: "peak_kw", threshold: 15 });
  passed("Energy sites, meters, tariffs and rules persist in the correct organisations");

  for (const [i, other] of [1, 0].entries()) {
    assert.equal((await call(`/energy/${orgIds[other]}`, "GET", undefined, i)).status, 403);
    for (const table of ["sites", "meters", "tariffs", "rules", "imports", "readings", "analyses", "alerts"]) {
      const result = await clients[i].from(`geit_energy_${table}`).select("id").eq("organisation_id", orgIds[other]);
      assert.equal(result.error, null); assert.equal(result.data.length, 0, `foreign ${table} leaked`);
    }
  }
  passed("Both tenants are isolated across all eight energy tables and workspace API");
  assert.equal((await call(`${root}/records`, "POST", { kind: "meter", name: "Foreign parent", siteId: siteB.id, unit: "kWh" })).status, 404);
  const badParent = await clients[0].from("geit_energy_meters").insert({ organisation_id: orgIds[0], site_id: siteB.id, name: "Spoof", unit: "kWh", is_demo: false });
  assert.ok(badParent.error);
  const badOrg = await clients[0].from("geit_energy_sites").insert({ organisation_id: orgIds[1], name: "Forbidden", timezone: "UTC" }); assert.ok(badOrg.error);
  passed("API and composite database foreign keys reject cross-tenant parent injection");

  const bad = await ok(`${root}/imports`, { meterId: meterA.id, ...file("2026-01-01T00:00:00Z,2026-01-01T01:00:00Z,=1+1,kWh") });
  assert.equal(bad.valid_count, 0); assert.ok(bad.errors.length);
  assert.equal((await call(`${root}/imports/${bad.id}/commit`, "POST", {})).status, 400);
  assert.equal((await clients[0].from("geit_energy_readings").select("id")).data.length, 0);
  passed("Invalid import remains a row-error preview and cannot partially commit");
  const preview = await ok(`${root}/imports`, { meterId: meterA.id, ...file("2026-01-01T00:00:00Z,2026-01-01T01:00:00Z,10,kWh\n2026-01-01T01:00:00Z,2026-01-01T02:00:00Z,20,kWh") });
  assert.equal(preview.valid_count, 2); assert.equal(preview.errors.length, 0);
  assert.ok((await workspace()).imports.some((i) => i.id === preview.id && i.status === "preview"));
  await ok(`${root}/imports/${preview.id}/commit`, {});
  await ok(`${root}/imports/${preview.id}/commit`, {});
  assert.equal((await clients[0].from("geit_energy_readings").select("id")).data.length, 2);
  passed("CSV preview survives reload; commit is persistent, atomic and idempotent");

  const duplicate = await ok(`${root}/imports`, { meterId: meterA.id, ...file("2026-01-01T00:00:00Z,2026-01-01T01:00:00Z,99,kWh") });
  assert.ok(duplicate.errors.length);
  assert.equal((await call(`${root}/imports/${duplicate.id}/commit`, "POST", {})).status, 400);
  const forged = await clients[0].from("geit_energy_readings").insert({ organisation_id: orgIds[0], meter_id: meterA.id, import_id: preview.id, start_at: "2026-01-01T02:00:00Z", end_at: "2026-01-01T03:00:00Z", quantity: 100, unit: "kWh", kwh: 100, is_demo: false });
  assert.ok(forged.error);
  passed("Duplicate imports do not overwrite readings; direct reading insertion is denied");

  const book = new ExcelJS.Workbook(), sheet = book.addWorksheet("Readings");
  sheet.addRows([headers.trim().split(","), ["2026-01-01T02:00:00Z", "2026-01-01T03:00:00Z", 30000, "Wh"]]);
  const excel = await ok(`${root}/imports`, { meterId: meterA.id, filename: "meter.xlsx", fileBase64: Buffer.from(await book.xlsx.writeBuffer()).toString("base64") });
  assert.equal(excel.errors.length, 0); await ok(`${root}/imports/${excel.id}/commit`, {});
  const reading = await clients[0].from("geit_energy_readings").select("kwh").eq("import_id", excel.id).single();
  assert.equal(Number(reading.data.kwh), 30);
  passed("Real Excel workbook import normalises Wh and persists time-series readings");

  const ws = await workspace(), tariff = ws.tariffs[0];
  const saved = await ok(`${root}/analyses`, { name: "Known three-hour analysis", meterId: meterA.id, tariffId: tariff.id, start: "2026-01-01T00:00:00Z", end: "2026-01-01T03:00:00Z", baselineKwh: 100, targetKwh: 50 }, 0, 201);
  assert.equal(saved.result.kwh, 60); assert.equal(saved.result.peakKw, 30); assert.equal(saved.result.cost, 104);
  const again = await call(`${root}/analyses/${saved.id}`); assert.deepEqual(again.body.result, saved.result);
  assert.equal((await workspace()).alerts.length, 1);
  const alert = (await workspace()).alerts[0]; await ok(`${root}/alerts/${alert.id}/acknowledge`, {});
  assert.equal((await workspace()).alerts[0].acknowledged, true);
  passed("Saved real-data KPIs and tariff costs match known values; alerts persist and acknowledge");
  for (const path of [`/energy/${orgIds[0]}/analyses/${saved.id}`, `/energy/${orgIds[1]}/analyses/${saved.id}`]) {
    assert.notEqual((await call(path, "GET", undefined, 1)).status, 200);
  }
  assert.equal((await clients[1].rpc("geit_energy_commit_import", { p_org: orgIds[0], p_import: preview.id })).error?.code, "42501");
  assert.equal((await clients[1].rpc("geit_energy_save_analysis", { p_org: orgIds[0], p_payload: {} })).error?.code, "42501");
  passed("Foreign saved-analysis IDs and direct commit/save RPCs remain tenant-protected");
  const original = await clients[0].from("geit_energy_analyses").select("*").eq("id", saved.id).single();
  assert.equal(original.error, null);
  const fabricated = await clients[0].rpc("geit_energy_save_analysis", {
    p_org: orgIds[0], p_payload: { meter_id: meterA.id, tariff_id: tariff.id,
      name: original.data.name, snapshot: original.data.snapshot, result: { ...original.data.result, totalKwh: 999999 } },
  });
  assert.equal(fabricated.error, null, "Direct RPC remains tenant-authorised; output authenticity must be verified separately");
  assert.equal((await call(`${root}/analyses/${fabricated.data}`)).status, 409);
  assert.equal((await call(`${root}/analyses/${fabricated.data}/export/pdf`)).status, 409);
  passed("Forged same-tenant analysis outputs with copied signatures cannot be displayed or exported");

  const binary = async (path, user = 0) => fetch(`${origin}/api/platform${path}`, { headers: { Cookie: [...jars[user]].map(([k, v]) => `${k}=${v}`).join("; ") }, signal: AbortSignal.timeout(25000) });
  for (const format of ["csv", "xlsx", "pdf"]) {
    const r = await binary(`${root}/analyses/${saved.id}/export/${format}`);
    assert.equal(r.status, 200); assert.match(r.headers.get("content-disposition"), /attachment/);
    const bytes = Buffer.from(await r.arrayBuffer()); assert.ok(bytes.length > 100);
    if (format === "pdf") assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
    if (format === "xlsx") { const exported = new ExcelJS.Workbook(); await exported.xlsx.load(bytes); assert.equal(exported.getWorksheet("Readings").rowCount, 4); }
    if (format === "csv") { assert.match(bytes.toString(), /Reading SHA-256/); assert.match(bytes.toString(), /"60"/); }
    assert.equal((await binary(`${root}/analyses/${saved.id}/export/${format}`, 1)).status, 403);
  }
  for (const format of ["csv", "xlsx", "demo-csv"]) assert.equal((await binary(`${root}/template/${format}`)).status, 200);
  passed("CSV, Excel and PDF exports contain real saved inputs; all exports reject foreign tenants; templates download");

  for (const [path, data] of [
    [`${root}/records`, { kind: "site", name: "Reader attempt", timezone: "UTC" }],
    [`${root}/imports`, { meterId: meterA.id, ...file("2026-01-02T00:00:00Z,2026-01-02T01:00:00Z,1,kWh") }],
    [`${root}/imports/${preview.id}/commit`, {}],
    [`${root}/analyses`, { name: "Reader attempt", meterId: meterA.id, start: "2026-01-01T00:00:00Z", end: "2026-01-01T03:00:00Z" }],
    [`${root}/demo`, {}], [`${root}/alerts/${alert.id}/acknowledge`, {}],
  ]) assert.equal((await call(path, "POST", data, 2)).status, 403);
  assert.equal((await clients[2].rpc("geit_energy_commit_import", { p_org: orgIds[0], p_import: preview.id })).error?.code, "42501");
  assert.equal((await clients[2].from("geit_energy_sites").update({ name: "Reader spoof" }).eq("id", siteA.id).select()).data.length, 0);
  assert.ok((await workspace(0, 2)).analyses.some((a) => a.id === saved.id));
  passed("Reader can inspect results but cannot manage records, import, commit, analyse, seed demo or acknowledge");

  await ok(`/organisations/${orgIds[0]}/members`, { email: fixtures.accounts[2].email, role: "analyst" });
  assert.equal((await call(`${root}/records`, "POST", { kind: "site", name: "Analyst attempt", timezone: "UTC" }, 2)).status, 403);
  await ok(`${root}/analyses`, { name: "Analyst saved analysis", meterId: meterA.id, start: "2026-01-01T00:00:00Z", end: "2026-01-01T03:00:00Z" }, 2, 201);
  await ok(`/organisations/${orgIds[0]}/members`, { email: fixtures.accounts[2].email, role: "reader" });
  passed("Analyst may save analysis but cannot administer sites; reader permissions restored");
  await ok(`${root}/records`, { kind: "meter", id: meterA.id, name: meterA.name, siteId: siteA.id, unit: "kWh", archived: true });
  assert.equal((await call(`${root}/imports`, "POST", { meterId: meterA.id, ...file("2026-01-02T00:00:00Z,2026-01-02T01:00:00Z,1,kWh") })).status, 400);
  await ok(`${root}/records`, { kind: "meter", id: meterA.id, name: "Meter edited", siteId: siteA.id, unit: "kWh", archived: false });
  assert.equal((await workspace()).meters[0].name, "Meter edited");
  passed("Meter edits, archive and restore persist; archived meters cannot receive imports");
  await ok(`${root}/demo`, {}); await ok(`${root}/demo`, {});
  const demo = await workspace(); assert.equal(demo.sites.filter((s) => s.is_demo).length, 1);
  assert.equal(demo.meters.filter((s) => s.is_demo).length, 1);
  assert.equal((await clients[0].from("geit_energy_readings").select("id").eq("is_demo", true)).data.length, 168);
  assert.equal((await clients[0].from("geit_energy_readings").select("id").eq("is_demo", false)).data.length, 3);
  assert.equal((await call(`${root}/analyses`, "POST", { name: "Mixed demo", meterId: meterA.id, tariffId: demo.tariffs.find((t) => t.is_demo).id, start: "2026-01-01T00:00:00Z", end: "2026-01-01T03:00:00Z" })).status, 400);
  passed("Demo seeding is isolated and idempotent; customer analyses cannot use demo tariffs");
  await verifyEnergyBoundary({ clients, orgIds, accountId: fixtures.accounts[0].id, passed });
}
