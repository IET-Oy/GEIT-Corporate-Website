import assert from "node:assert/strict";
import { setTimeout as pause } from "node:timers/promises";
import { writeFile } from "node:fs/promises";
import { factorFixtures, carbonFixture, historicalFixtures, twinFixture } from "./sustainability-fixtures.mjs";
export async function runSustainabilityIntegration({ request, jars, orgIds, clients, passed, origin }) {
  async function call(path, method = "GET", data, user = 0) {
    let r = await request(path, method, data, jars[user]);
    if (r.status === 429) { console.log("Respecting normal write rate-limit window."); await pause(Number(r.headers.get("Retry-After") || 60) * 1000); r = await request(path, method, data, jars[user]); }
    return r;
  }
  async function post(path, data, user = 0, expected = 200) {
    const r = await call(path, "POST", data, user); assert.equal(r.status, expected, JSON.stringify(r.body)); return r.body;
  }
  const carbonRoot = `/engineering/${orgIds[0]}/carbon-footprint`, twinRoot = `/engineering/${orgIds[0]}/digital-energy`;
  const definitions = factorFixtures(), a = [], b = [];
  for (const definition of definitions) {
    a.push(await post(`${carbonRoot}/factors`, definition, 0, 201));
    b.push(await post(`/engineering/${orgIds[1]}/carbon-footprint/factors`, definition, 1, 201));
  }
  assert.ok(a.every((f) => f.version === 1 && f.source && f.validFrom && f.gwpBasis));
  const v2 = await post(`${carbonRoot}/factors`, { ...definitions[1], value: 0.5 }, 0, 201);
  assert.equal(v2.version, 2); assert.notEqual(v2.id, a[1].id);
  const malformedRpc = await clients[0].rpc("geit_create_emission_factor", { p_org: orgIds[0], p_definition: { code: "MALFORMED" } });
  assert.ok(malformedRpc.error, "Missing factor metadata must fail at the database boundary");
  passed("Factor versions persist complete metadata and reject malformed direct-RPC definitions");
  for (const [user, foreign] of [[0, 1], [1, 0]]) {
    const own = await clients[user].from("geit_emission_factors").select("id").eq("organisation_id", orgIds[user]);
    const denied = await clients[user].from("geit_emission_factors").select("id").eq("organisation_id", orgIds[foreign]);
    assert.equal(own.error, null); assert.ok(own.data.length >= 3); assert.equal(denied.error, null); assert.equal(denied.data.length, 0);
  }
  assert.equal((await call(`${carbonRoot}/factors`, "GET", undefined, 1)).status, 403);
  assert.equal((await call(`${carbonRoot}/factors`, "POST", definitions[0], 2)).status, 403);
  assert.equal((await clients[2].rpc("geit_create_emission_factor", { p_org: orgIds[0], p_definition: definitions[0] })).error?.code, "42501");
  assert.ok((await clients[0].from("geit_emission_factors").update({ definition: definitions[1] }).eq("id", a[0].id)).error);
  assert.ok((await clients[0].from("geit_emission_factors").delete().eq("id", a[0].id)).error);
  passed("Factor RLS has populated positive controls, foreign denial, immutable versions and reader write protection");
  const projectData = { name: "Synthetic sustainability assessment", facility: "Synthetic test facility", brief: "Problem: verify accounting and time-series workflows. Scope: synthetic isolated records only.", currency: "USD", status: "active" };
  const cp = await post(`${carbonRoot}/projects`, projectData);
  const carbonInputs = carbonFixture(a.map((f) => f.id));
  const cs = await post(`${carbonRoot}/scenarios`, { projectId: cp.id, name: "Synthetic baseline and reduction", inputs: carbonInputs }, 0, 201);
  assert.equal(cs.result.metrics.find((m) => m.key === "baselineKgCo2e").value, 718);
  assert.equal(cs.result.metrics.find((m) => m.key === "proposedKgCo2e").value, 618);
  assert.equal(cs.result.provenance.factors.find((f) => f.code === "TEST_GRID").version, 1);
  assert.deepEqual((await call(`${carbonRoot}/scenarios/${cs.id}`)).body.result, cs.result);
  const revision = await post(`${carbonRoot}/scenarios`, { projectId: cp.id, name: "Synthetic factor version revision", inputs: { ...carbonInputs, activities: carbonInputs.activities.map((line, index) => index === 1 ? { ...line, factorId: v2.id } : line) } }, 0, 201);
  assert.equal(revision.result.metrics.find((m) => m.key === "baselineKgCo2e").value, 818);
  assert.equal((await call(`${carbonRoot}/scenarios/${cs.id}`)).body.result.metrics.find((m) => m.key === "baselineKgCo2e").value, 718);
  passed("Scope 1/2/3 and reduction results persist, match hand calculations and retain the original factor version after revision");
  for (const inputs of [
    { ...carbonInputs, periodEnd: "2027-01-02" },
    { ...carbonInputs, scope2Method: "market_based" },
    { ...carbonInputs, activities: [{ ...carbonInputs.activities[0], unit: "kg" }] },
    { ...carbonInputs, activities: [{ ...carbonInputs.activities[0], factorId: b[0].id }] },
  ]) assert.ok([400, 404].includes((await call(`${carbonRoot}/scenarios`, "POST", { projectId: cp.id, name: "Invalid input", inputs })).status));
  passed("Expired factors, mixed Scope 2 methods, incompatible units and foreign factor IDs fail before scenario creation");
  const energyRoot = `/energy/${orgIds[0]}`;
  await post(`${energyRoot}/records`, { kind: "site", name: "Synthetic twin source facility", timezone: "UTC" });
  const energy = (await call(energyRoot)).body, site = energy.sites.find((s) => s.name === "Synthetic twin source facility");
  for (const name of ["Synthetic gross building load", "Synthetic measured solar"]) await post(`${energyRoot}/records`, { kind: "meter", name, siteId: site.id, unit: "kWh" });
  const meters = (await call(energyRoot)).body.meters;
  const loadId = meters.find((m) => m.name === "Synthetic gross building load").id, solarId = meters.find((m) => m.name === "Synthetic measured solar").id;
  const history = historicalFixtures();
  for (const [meterId, key] of [[loadId, "load"], [solarId, "solar"]]) {
    const csv = "interval_start,interval_end,value,unit\n" + history.map((r) => `${r.start},${r.end},${r[key]},kWh`).join("\n");
    const preview = await post(`${energyRoot}/imports`, { meterId, filename: `synthetic-${key}.csv`, fileBase64: Buffer.from(csv).toString("base64") });
    assert.equal(preview.errors.length, 0); assert.equal(preview.valid_count, 840);
    await post(`${energyRoot}/imports/${preview.id}/commit`, {});
  }
  const sources = (await call(`${twinRoot}/sources`)).body;
  assert.ok(sources.meters.some((m) => m.id === loadId)); assert.ok(sources.meters.every((m) => !m.is_demo));
  assert.equal(sources.connectedProviderStatus, "not_configured");
  passed("Building and solar historical series are imported and committed through the real Energy Management workflow");
  const tp = await post(`${twinRoot}/projects`, { ...projectData, name: "Synthetic digital twin assessment" });
  const twinInputs = twinFixture(loadId, solarId);
  const ts = await post(`${twinRoot}/scenarios`, { projectId: tp.id, name: "Synthetic measured-series replay", inputs: twinInputs }, 0, 201);
  const getMetric = (key) => ts.result.metrics.find((m) => m.key === key).value;
  assert.equal(getMetric("consumptionKwh"), 2380); assert.equal(getMetric("forecastKwh"), 68); assert.equal(getMetric("backtestMaeKwh"), 0);
  assert.equal(ts.result.provenance.buildingReadings.length, 840);
  assert.equal(ts.result.provenance.solarReadings.length, 840);
  assert.match(ts.result.provenance.datasetHash, /^[a-f0-9]{64}$/);
  assert.deepEqual((await call(`${twinRoot}/scenarios/${ts.id}`)).body.result, ts.result);
  passed("Saved real-record twin reproduces building analytics, solar+battery dispatch, seasonal forecast and backtest");
  const short = await post(`${twinRoot}/scenarios`, { projectId: tp.id, name: "Synthetic insufficient-history case", inputs: { ...twinInputs, end: history[2].end, solarMeterId: null, battery: null } }, 0, 201);
  assert.equal(short.result.metrics.find((m) => m.key === "forecastKwh").value, null);
  assert.equal(short.result.tables.find((t) => t.title === "Load forecast").rows.length, 0);
  passed("Insufficient history persists an honest withheld forecast, not placeholder predictions");
  const foreignSources = (await call(`/engineering/${orgIds[1]}/digital-energy/sources`, "GET", undefined, 1)).body;
  let foreignMeter = foreignSources.meters[0];
  if (!foreignMeter) {
    const otherEnergy = `/energy/${orgIds[1]}`;
    await post(`${otherEnergy}/records`, { kind: "site", name: "Foreign synthetic source", timezone: "UTC" }, 1);
    const otherSite = (await call(otherEnergy, "GET", undefined, 1)).body.sites.find((s) => s.name === "Foreign synthetic source");
    await post(`${otherEnergy}/records`, { kind: "meter", name: "Foreign synthetic meter", siteId: otherSite.id, unit: "kWh" }, 1);
    foreignMeter = (await call(`/engineering/${orgIds[1]}/digital-energy/sources`, "GET", undefined, 1)).body.meters[0];
  }
  assert.ok(foreignMeter, "Cross-tenant meter test requires an actual foreign meter");
  assert.ok([400, 404].includes((await call(`${twinRoot}/scenarios`, "POST", { projectId: tp.id, name: "Foreign meter injection", inputs: { ...twinInputs, buildingMeterId: foreignMeter.id } })).status));
  assert.equal((await call(`${twinRoot}/sources`, "GET", undefined, 1)).status, 403);
  for (const [root, scenario] of [[carbonRoot, cs], [twinRoot, ts]]) {
    assert.equal((await call(`${root}/scenarios/${scenario.id}`, "GET", undefined, 1)).status, 403);
    assert.equal((await call(`${root}/scenarios/${scenario.id}`, "GET", undefined, 2)).status, 200);
    assert.equal((await call(`${root}/scenarios`, "POST", { projectId: scenario.project_id, name: "Reader forbidden", inputs: scenario.inputs }, 2)).status, 403);
    const deniedAI = await call(`${root}/scenarios/${scenario.id}/ai`, "POST", { question: "Explain verified results", consent: true }, 1);
    assert.equal(deniedAI.status, 403);
    assert.equal((await call(`${root}/scenarios/${scenario.id}/ai`, "POST", { question: "Explain verified results", consent: false })).status, 400);
    const workspace = (await call(root)).body; assert.equal(workspace.aiStatus, "disabled");
    assert.equal((await call(`${root}/scenarios/${scenario.id}/ai`, "POST", { question: "Explain verified results", consent: true })).status, 503);
    assert.equal((await call(`${root}/scenarios/${scenario.id}/ai`, "POST", { question: "Explain verified results", consent: true }, 2)).status, 503);
    for (const format of ["json", "csv", "xlsx", "pdf"]) {
      const r = await fetch(`${origin}/api/platform${root}/scenarios/${scenario.id}/export/${format}`, {
        headers: { Cookie: [...jars[0]].map(([k, v]) => `${k}=${v}`).join("; ") }, signal: AbortSignal.timeout(40000),
      });
      assert.equal(r.status, 200); const bytes = Buffer.from(await r.arrayBuffer()); assert.ok(bytes.length > 200);
      if (format === "pdf") assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
      if (format === "json") assert.deepEqual(JSON.parse(bytes.toString()).result.provenance, scenario.result.provenance);
      if (format === "csv") assert.ok(bytes.toString().includes("Provenance"));
    }
  }
  passed("Both modules protect reports and optional AI by tenant/role, require AI consent, remain usable with AI disabled, and export all four formats");
  await writeFile("/tmp/geit-sustainability-cases.json", JSON.stringify({
    orgId: orgIds[0], factors: a, newFactorVersion: v2, carbonProjectId: cp.id, carbonScenarioId: cs.id, carbonInputs,
    twinProjectId: tp.id, twinScenarioId: ts.id, twinInputs, loadId, solarId, shortScenarioId: short.id,
  }), { mode: 0o600 });
}
