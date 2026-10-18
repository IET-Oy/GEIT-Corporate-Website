import assert from "node:assert/strict";
import { setTimeout as pause } from "node:timers/promises";
import ExcelJS from "exceljs";
import { engineeringCases } from "./engineering-fixtures.mjs";

export async function runEngineeringIntegration({ request, jars, orgIds, clients, passed, origin }) {
  const cases = engineeringCases(), modules = Object.keys(cases);
  const records = {};
  async function call(path, method = "GET", data, user = 0) {
    let r = await request(path, method, data, jars[user]);
    if (r.status === 429) {
      console.log("Respecting the configured API write rate-limit window.");
      await pause(Number(r.headers.get("Retry-After") || 60) * 1000);
      r = await request(path, method, data, jars[user]);
    }
    return r;
  }
  async function post(path, data, user = 0, expected = 200) {
    const r = await call(path, "POST", data, user); assert.equal(r.status, expected, JSON.stringify(r.body)); return r.body;
  }
  async function binary(path, user = 0) {
    return fetch(`${origin}/api/platform${path}`, { headers: { Cookie: [...jars[user]].map(([k, v]) => `${k}=${v}`).join("; ") }, signal: AbortSignal.timeout(25000) });
  }
  for (const module of modules) {
    const root = `/engineering/${orgIds[0]}/${module}`, other = `/engineering/${orgIds[1]}/${module}`;
    const data = { name: `Synthetic ${module}`, facility: "Synthetic engineering facility",
      brief: "Problem: test a documented boundary. Scope: baseline engineering screening only.", currency: "USD", status: "active" };
    const a = await post(`${root}/projects`, data);
    const b = await post(`${other}/projects`, { ...data, name: `Other tenant ${module}` }, 1);
    const edited = await post(`${root}/projects`, { ...data, id: a.id, facility: "Edited synthetic facility" });
    assert.equal(edited.facility, "Edited synthetic facility");
    const workspace = await call(root); assert.equal(workspace.body.externalDataStatus, "not_configured");
    assert.ok(workspace.body.projects.some((p) => p.id === a.id));
    passed(`${module}: persistent project creation/edit and honest manual-data status`);
    const scenario = await post(`${root}/scenarios`, { projectId: a.id, name: `Baseline ${module}`, inputs: cases[module] }, 0, 201);
    const otherScenario = await post(`${other}/scenarios`, { projectId: b.id, name: "Foreign baseline", inputs: cases[module] }, 1, 201);
    const metric = (key) => scenario.result.metrics.find((m) => m.key === key).value;
    if (module === "energy-consulting") { assert.equal(metric("energySavedKwh"), 20000); assert.equal(metric("npv"), 7500); }
    if (module === "energy-auditing") { assert.equal(metric("energySavedKwh"), 10000); assert.equal(metric("npv"), 4000); }
    if (module === "renewable-energy") { assert.equal(metric("generationKwh"), 9600); assert.equal(metric("annualNetBenefit"), 1460); }
    if (module === "battery-flexibility") { assert.equal(metric("gridImportKwh"), 3); assert.ok(Math.abs(metric("gridCost") - 0.35) < 1e-7); }
    const loaded = await call(`${root}/scenarios/${scenario.id}`);
    assert.equal(loaded.status, 200); assert.deepEqual(loaded.body.result, scenario.result); assert.deepEqual(loaded.body.inputs, cases[module]);
    assert.equal(loaded.body.projectSnapshot.facility, edited.facility);
    assert.match(loaded.body.inputHash, /^[a-f0-9]{64}$/);
    assert.equal("signature" in loaded.body, false);
    passed(`${module}: real calculation matches known results and immutable signed inputs reload`);
    for (const format of ["csv", "xlsx", "pdf", "json"]) {
      const r = await binary(`${root}/scenarios/${scenario.id}/export/${format}`);
      assert.equal(r.status, 200); assert.match(r.headers.get("content-disposition"), /attachment/);
      const bytes = Buffer.from(await r.arrayBuffer()); assert.ok(bytes.length > 200);
      if (format === "csv") { assert.match(bytes.toString(), /Input SHA-256/); assert.ok(bytes.toString().includes(scenario.result.version)); }
      if (format === "xlsx") { const book = new ExcelJS.Workbook(); await book.xlsx.load(bytes); assert.ok(book.worksheets.length >= 3); }
      if (format === "pdf") assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
      if (format === "json") assert.deepEqual(JSON.parse(bytes.toString()).result, scenario.result);
      assert.equal((await binary(`${root}/scenarios/${scenario.id}/export/${format}`, 1)).status, 403);
    }
    passed(`${module}: CSV/Excel/PDF/JSON report exports contain the saved result and deny foreign tenants`);
    for (const [clientIndex, foreignOrg] of [[0, 1], [1, 0]]) {
      for (const table of ["projects", "scenarios"]) {
        const own = await clients[clientIndex].from(`geit_engineering_${table}`).select("id").eq("organisation_id", orgIds[clientIndex]).eq("module", module);
        assert.equal(own.error, null); assert.ok(own.data.length > 0);
        const foreign = await clients[clientIndex].from(`geit_engineering_${table}`).select("id").eq("organisation_id", orgIds[foreignOrg]).eq("module", module);
        assert.equal(foreign.error, null); assert.equal(foreign.data.length, 0);
      }
    }
    assert.equal((await call(root, "GET", undefined, 1)).status, 403);
    assert.equal((await call(`${other}/scenarios/${scenario.id}`, "GET", undefined, 1)).status, 404);
    assert.equal((await call(`${root}/scenarios/${otherScenario.id}`)).status, 404);
    assert.equal((await call(`${root}/projects`, "POST", { ...data, id: b.id })).status, 404);
    passed(`${module}: populated project/scenario RLS and direct ID tampering are isolated in both directions`);
    const bad = structuredClone(cases[module]); bad.sourceNotes = "                    ";
    assert.equal((await call(`${root}/scenarios`, "POST", { projectId: a.id, name: "Bad source", inputs: bad })).status, 400);
    assert.equal((await call(root, "GET", undefined, 2)).status, 200);
    assert.equal((await call(`${root}/projects`, "POST", data, 2)).status, 403);
    assert.equal((await call(`${root}/scenarios`, "POST", { projectId: a.id, name: "Reader write", inputs: cases[module] }, 2)).status, 403);
    const rpc = await clients[2].rpc("geit_engineering_save_project", { p_org: orgIds[0], p_module: module, p_payload: data });
    assert.equal(rpc.error?.code, "42501");
    const direct = await clients[0].from("geit_engineering_scenarios").insert({ organisation_id: orgIds[0] }); assert.ok(direct.error);
    passed(`${module}: invalid provenance, reader writes and direct scenario insertion are rejected`);
    const revisionInputs = structuredClone(cases[module]);
    if (module === "battery-flexibility") revisionInputs.capacityKwh += 1; else if (module === "energy-auditing") revisionInputs.measures[0].capex += 1; else revisionInputs.capex += 1;
    const revision = await post(`${root}/scenarios`, { projectId: a.id, name: "Revision", inputs: revisionInputs }, 0, 201);
    assert.notEqual(revision.id, scenario.id);
    assert.deepEqual((await call(`${root}/scenarios/${scenario.id}`)).body.result, scenario.result);
    assert.equal((await call(`${root}/projects`, "POST", { ...data, id: a.id, currency: "EUR" })).status, 400);
    await post(`${root}/projects`, { ...data, id: a.id, facility: edited.facility, archived: true });
    assert.equal((await call(`${root}/scenarios`, "POST", { projectId: a.id, name: "Archived write", inputs: cases[module] })).status, 400);
    assert.equal((await call(`${root}/scenarios/${scenario.id}`)).status, 200);
    await post(`${root}/projects`, { id: a.id, ...data, facility: edited.facility, archived: false });
    passed(`${module}: revisions preserve old results; currency locks and archive/restore keep reports accessible`);
    records[module] = { a: edited, b, scenario, otherScenario };
  }
  const from = records["energy-consulting"], root = `/engineering/${orgIds[0]}/renewable-energy`;
  assert.equal((await call(`${root}/scenarios`, "POST", { projectId: from.a.id, name: "Cross module", inputs: cases["renewable-energy"] })).status, 404);
  assert.equal((await clients[1].rpc("geit_engineering_save_project", { p_org: orgIds[0], p_module: "energy-consulting", p_payload: {} })).error?.code, "42501");
  const b = records["battery-flexibility"].b;
  const forged = await clients[1].rpc("geit_engineering_save_scenario", {
    p_org: orgIds[1], p_module: "battery-flexibility", p_project: b.id, p_payload: {
      name: "Deliberately invalid integrity fixture", inputs: cases["battery-flexibility"],
      result: { version: "untrusted" }, project_snapshot: b, input_hash: "0".repeat(64), signature: "0".repeat(64),
    },
  });
  assert.equal(forged.error, null);
  assert.equal((await call(`/engineering/${orgIds[1]}/battery-flexibility/scenarios/${forged.data}`, "GET", undefined, 1)).status, 409);
  assert.equal((await binary(`/engineering/${orgIds[1]}/battery-flexibility/scenarios/${forged.data}/export/pdf`, 1)).status, 409);
  passed("Cross-module project IDs, foreign RPC writes and untrusted forged calculation reports fail closed");
}
