import assert from "node:assert/strict";
import test from "node:test";
import { REPORT_MODULES, reportEntries, filterReports } from "../src/platform/reports/report-index.ts";

const org = "tenant-a";
const energy = {
  meters: [{ id: "meter", name: "Main meter" }],
  analyses: [
    { id: "analysis&name", name: "Customer demand", meter_id: "meter", created_at: "2026-10-01T00:00:00Z", is_demo: false },
    { id: "demo", name: "Synthetic demo", meter_id: "meter", created_at: "2026-10-03T00:00:00Z", is_demo: true },
  ],
};
const engineering = { "digital-energy": {
  projects: [{ id: "project", name: "Building A", module: "digital-energy", archived: true }],
  scenarios: [
    { id: "scenario", name: "Imported baseline", project_id: "project", module: "digital-energy", created_at: "2026-10-02T00:00:00Z" },
    { id: "foreign", name: "Wrong module", project_id: "project", module: "carbon-footprint", created_at: "2026-10-02T00:00:00Z" },
    { id: "missing", name: "Missing project", project_id: "foreign", module: "digital-energy", created_at: "2026-10-02T00:00:00Z" },
  ],
} };

test("report index uses saved summaries, newest first, without inventing missing work", () => {
  const rows = reportEntries(org, energy, engineering);
  assert.deepEqual(rows.map((row) => row.id), ["demo", "scenario", "analysis&name"]);
  assert.equal(rows[1].archived, true);
  assert.equal(rows[1].project, "Building A");
  assert.deepEqual(reportEntries(org, undefined, {}), []);
  assert.equal(REPORT_MODULES.length, 6);
});
test("report links bind organisation and saved IDs, encode parameters and separate demo navigation", () => {
  for (const row of reportEntries(org, energy, engineering)) {
    const url = new URL(row.href, "https://example.invalid");
    assert.equal(url.searchParams.get("org"), org);
    assert.equal(url.searchParams.get(row.module === "energy-management" ? "analysis" : "scenario"), row.id);
    assert.equal(url.searchParams.get("data") === "demo", row.demo);
    assert.ok(url.pathname.startsWith("/app/"));
  }
});
test("customer view excludes demo analyses; search, module filters and missing data are explicit", () => {
  const rows = reportEntries(org, energy, engineering);
  assert.equal(filterReports(rows, "", "", false).length, 2);
  assert.equal(filterReports(rows, "", "", true).length, 3);
  assert.equal(filterReports(rows, " building A ", "", false)[0].id, "scenario");
  assert.equal(filterReports(rows, "", "energy-management", false)[0].id, "analysis&name");
  assert.deepEqual(filterReports(rows, "no match", "", true), []);
  assert.deepEqual(filterReports(rows, "", "foreign-module", true), []);
});
