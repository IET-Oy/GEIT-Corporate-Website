import test from "node:test";
import assert from "node:assert/strict";
import { calculateEngineering } from "../src/lib/engineering";
import { engineeringCases } from "../scripts/engineering-fixtures.mjs";
import { inputHash, signScenario, verifyScenario } from "../src/lib/engineering/integrity";

const cases = engineeringCases;
function calc(module: keyof ReturnType<typeof cases>, input?: unknown) { return calculateEngineering(module, input ?? cases()[module], "USD").result; }
function value(result: ReturnType<typeof calc>, key: string) { const m = result.metrics.find((m) => m.key === key); assert.ok(m, key); return m.value!; }
const near = (a: number, b: number, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
test("consulting normalises MWh and calculates positive/negative cash flow transparently", () => {
  const result = calc("energy-consulting");
  near(value(result, "energySavedKwh"), 20000); near(value(result, "annualNetBenefit"), 3500);
  near(value(result, "npv"), 7500); near(value(result, "simplePayback"), 10000 / 3500);
  const input = cases()["energy-consulting"]; input.proposedEnergy = 110;
  const negative = calc("energy-consulting", input);
  assert.ok(value(negative, "npv") < 0); assert.equal(value(negative, "simplePayback"), null);
});
test("discounted NPV uses year-zero capex and end-year benefits", () => {
  const input = cases()["energy-consulting"]; input.discountRatePercent = 10;
  near(value(calc("energy-consulting", input), "npv"), -10000 + Array.from({ length: 5 }, (_, n) => 3500 / 1.1 ** (n + 1)).reduce((a, b) => a + b));
});
test("consulting GJ normalisation and zero baseline have defined output", () => {
  const input = cases()["energy-consulting"]; input.energyUnit = "GJ"; input.baselineEnergy = 3.6; input.proposedEnergy = 0;
  near(value(calc("energy-consulting", input), "baselineKwh"), 1000);
  input.baselineEnergy = 0; assert.equal(value(calc("energy-consulting", input), "energyReductionPercent"), null);
});
test("audit equipment W/kW conversions, annual hours and whole-measure costs", () => {
  const result = calc("energy-auditing");
  near(value(result, "baselineKwh"), 20000); near(value(result, "energySavedKwh"), 10000);
  near(value(result, "annualNetBenefit"), 1800); near(value(result, "npv"), 4000);
  const input = cases()["energy-auditing"]; input.measures[0].powerUnit = "kW"; input.measures[0].baselinePower = 0.1; input.measures[0].proposedPower = 0.05;
  near(value(calc("energy-auditing", input), "energySavedKwh"), 10000);
});
test("audit rejects duplicate end-use names, excess annual hours and excessive baseline", () => {
  const input = cases()["energy-auditing"];
  input.measures.push({ ...input.measures[0] }); assert.throws(() => calc("energy-auditing", input), /distinct/);
  input.measures.pop(); input.measures[0].hoursPerYear = 9000; assert.throws(() => calc("energy-auditing", input));
  input.measures[0].hoursPerYear = 2000; input.facilityBaselineKwh = 10000; assert.throws(() => calc("energy-auditing", input), /exceeds/);
});
test("baseline solar yield matches hand-calculated annual yield and economics", () => {
  const result = calc("renewable-energy");
  near(value(result, "generationKwh"), 9600); near(value(result, "selfConsumedKwh"), 7200);
  near(value(result, "gridImportKwh"), 4800); near(value(result, "gridExportKwh"), 2400);
  near(value(result, "annualNetBenefit"), 1460); near(value(result, "npv"), 4600);
});
test("solar monthly energy balances conserve energy without fabricating hourly matching", () => {
  const result = calc("renewable-energy");
  for (const r of result.tables[0].rows) {
    near(Number(r.generation), Number(r.selfConsumed) + Number(r.gridExport));
    near(Number(r.demand), Number(r.selfConsumed) + Number(r.gridImport));
  }
  assert.ok(result.warnings.some((w) => w.includes("Monthly energy")));
});
test("solar requires twelve unique months, correct irradiation unit and bounded PR/coincidence", () => {
  for (const mutate of [
    (i: any) => { i.months[1].month = 1; }, (i: any) => { i.months.pop(); },
    (i: any) => { i.irradiationUnit = "GHI"; }, (i: any) => { i.performanceRatio = 1.1; },
    (i: any) => { i.coincidenceFactor = -0.1; },
  ]) { const input = cases()["renewable-energy"]; mutate(input); assert.throws(() => calc("renewable-energy", input)); }
});
test("zero solar irradiation and demand do not cause division by zero", () => {
  const input = cases()["renewable-energy"]; input.months.forEach((m: any) => { m.irradiationKwhM2 = 0; m.demandKwh = 0; });
  const result = calc("renewable-energy", input); near(value(result, "generationKwh"), 0);
  assert.equal(value(result, "selfConsumptionPercent"), null); assert.equal(value(result, "solarCoveragePercent"), null);
});
test("baseline battery greedy dispatch matches hand-calculated energy and tariffs", () => {
  const result = calc("battery-flexibility");
  near(value(result, "chargedKwh"), 5); near(value(result, "dischargedKwh"), 9);
  near(value(result, "gridImportKwh"), 3); near(value(result, "gridExportKwh"), 5);
  near(value(result, "finalStoredKwh"), 1); near(value(result, "gridCost"), 0.35);
  near(value(result, "gridCostDifference"), 1.55);
  assert.ok(result.warnings.some((w) => w.includes("Initial and final")));
});
test("battery one-way efficiencies conserve stored energy and account for losses", () => {
  const input = cases()["battery-flexibility"];
  Object.assign(input, { initialSocPercent: 0, maxChargeKw: 10, maxDischargeKw: 10, chargeEfficiency: 0.9, dischargeEfficiency: 0.8 });
  input.intervals = input.intervals.slice(0, 2); input.intervals[1].loadKwh = 10;
  const result = calc("battery-flexibility", input);
  near(value(result, "dischargedKwh"), 7.2); near(value(result, "gridImportKwh"), 2.8);
  near(value(result, "batteryLossKwh"), 2.8); near(value(result, "finalStoredKwh"), 0);
  near(value(result, "initialStoredKwh") + value(result, "chargedKwh") - value(result, "dischargedKwh") - value(result, "batteryLossKwh"), value(result, "finalStoredKwh"));
});
test("battery power limits scale with actual interval duration", () => {
  const input = cases()["battery-flexibility"]; input.intervals = input.intervals.slice(0, 1);
  input.intervals[0].end = "2026-01-01T00:30:00Z";
  near(value(calc("battery-flexibility", input), "chargedKwh"), 2.5);
});
test("battery reserve is never discharged and excess solar can be exported", () => {
  const input = cases()["battery-flexibility"]; input.minSocPercent = 50; input.intervals = input.intervals.slice(1);
  near(value(calc("battery-flexibility", input), "dischargedKwh"), 0);
});
test("peak-shaving reports an infeasible target rather than fabricating success", () => {
  const input = cases()["battery-flexibility"];
  Object.assign(input, { dispatchMode: "peak_shaving", gridTargetKw: 4, initialSocPercent: 100, maxDischargeKw: 3 });
  input.intervals = input.intervals.slice(1, 2); input.intervals[0].loadKwh = 10;
  const result = calc("battery-flexibility", input);
  near(value(result, "peakKw"), 7); near(value(result, "gridTargetExcessKw"), 3);
  assert.ok(result.warnings.some((w) => w.includes("could not be maintained")));
});
test("battery rejects missing target, invalid SOC and efficiencies, wrong units and negative load", () => {
  for (const mutate of [
    (i: any) => { i.dispatchMode = "peak_shaving"; }, (i: any) => { i.minSocPercent = 60; },
    (i: any) => { i.chargeEfficiency = 0; }, (i: any) => { i.dischargeEfficiency = 1.1; },
    (i: any) => { i.energyUnit = "MWh"; }, (i: any) => { i.intervals[0].loadKwh = -1; },
  ]) { const input = cases()["battery-flexibility"]; mutate(input); assert.throws(() => calc("battery-flexibility", input)); }
});
test("battery rejects unordered, overlapping, gapped or offset-free intervals", () => {
  for (const start of ["2026-01-01T00:30:00Z", "2026-01-01T02:00:00Z", "2026-01-01T01:00:00"]) {
    const input = cases()["battery-flexibility"]; input.intervals[1].start = start;
    assert.throws(() => calc("battery-flexibility", input));
  }
});
test("battery dispatch has no simultaneous charge/discharge and conserves AC balance across 48 varied intervals", () => {
  const input = cases()["battery-flexibility"];
  Object.assign(input, { chargeEfficiency: 0.93, dischargeEfficiency: 0.89, minSocPercent: 10 });
  input.intervals = Array.from({ length: 48 }, (_, hour) => ({
    start: new Date(Date.UTC(2026, 0, 1, hour)).toISOString(), end: new Date(Date.UTC(2026, 0, 1, hour + 1)).toISOString(),
    loadKwh: hour % 7, solarKwh: hour % 5, importRatePerKwh: 0.2, exportRatePerKwh: 0.05,
  }));
  const result = calc("battery-flexibility", input);
  for (const r of result.tables[0].rows) {
    assert.ok(Number(r.charge) === 0 || Number(r.discharge) === 0);
    near(Number(r.load) + Number(r.charge) + Number(r.gridExport), Number(r.solar) + Number(r.discharge) + Number(r.gridImport));
    assert.ok(Number(r.socKwh) >= 1 - 1e-8 && Number(r.socKwh) <= 10 + 1e-8);
  }
});
test("model/module mismatch, blank provenance and nonfinite values fail closed", () => {
  assert.throws(() => calculateEngineering("renewable-energy", cases()["energy-consulting"], "USD"));
  const input = cases()["energy-consulting"]; input.sourceNotes = "                 "; assert.throws(() => calc("energy-consulting", input));
  input.sourceNotes = "Manual source documented."; input.capex = Infinity; assert.throws(() => calc("energy-consulting", input));
});
test("identical baseline inputs reproduce identical versioned results", () => {
  for (const module of Object.keys(cases()) as (keyof ReturnType<typeof cases>)[]) {
    assert.deepEqual(calc(module), calc(module)); assert.match(calc(module).version, /^geit-.*-v1$/);
  }
});
test("snapshot integrity survives JSON key reordering and rejects result or tenant tampering", () => {
  const original = { org: "synthetic-a", result: { cost: 12.5, source: "manual" }, inputs: { b: 2, a: 1 } };
  const reordered = { inputs: { a: 1, b: 2 }, result: { source: "manual", cost: 12.5 }, org: "synthetic-a" };
  const signature = signScenario(original);
  assert.equal(verifyScenario(reordered, signature), true);
  assert.equal(inputHash(original), inputHash(reordered));
  assert.equal(verifyScenario({ ...original, org: "synthetic-b" }, signature), false);
  assert.equal(verifyScenario({ ...original, result: { cost: 0 } }, signature), false);
});
