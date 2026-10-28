import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CreateEngineeringScenarioBody, type EvChargingInputs } from "@workspace/api-zod";
import { calculateEngineering } from "../src/lib/engineering";

const start = (hour: number) => `2026-01-01T${String(hour).padStart(2, "0")}:00:00Z`;
const base = (): EvChargingInputs => ({
  model: "ev-charging",
  sourceNotes: "Synthetic meter and session records for deterministic tests.",
  energyUnit: "kWh",
  powerUnit: "kW",
  chargerCount: 1,
  chargerPowerKw: 7.2,
  sessions: [{
    sessionId: "SESSION-01",
    chargerId: "CHARGER-01",
    availableFrom: start(0),
    departureAt: start(4),
    actualStart: start(0),
    actualEnd: start(1),
    energyKwh: 5,
  }],
  intervals: [
    { start: start(0), end: start(1), siteLoadKwh: 5, solarKwh: 0, importRatePerKwh: 0.2, exportRatePerKwh: 0.05 },
    { start: start(1), end: start(2), siteLoadKwh: 5, solarKwh: 10, importRatePerKwh: 0.5, exportRatePerKwh: 0.05 },
    { start: start(2), end: start(3), siteLoadKwh: 5, solarKwh: 0, importRatePerKwh: 0.1, exportRatePerKwh: 0.05 },
    { start: start(3), end: start(4), siteLoadKwh: 5, solarKwh: 0, importRatePerKwh: 0.4, exportRatePerKwh: 0.05 },
  ],
});
const calculate = (input = base()) => calculateEngineering("ev-charging", input, "USD").result;
const value = (result: ReturnType<typeof calculate>, key: string) => {
  const found = result.metrics.find((item) => item.key === key);
  assert.ok(found, `missing metric ${key}`);
  return found.value;
};
const near = (actual: number | null, expected: number, tolerance = 1e-7) =>
  assert.ok(actual !== null && Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test("EV charging validates with the shared persisted engineering scenario contract", () => {
  assert.equal(CreateEngineeringScenarioBody.shape.inputs.safeParse(base()).success, true);
  const invalid = base();
  invalid.sessions[0].energyKwh = 0;
  assert.equal(CreateEngineeringScenarioBody.shape.inputs.safeParse(invalid).success, false);
});

test("measured charging and solar/tariff-aware schedule conserve EV energy and calculate site impacts", () => {
  const result = calculate();
  near(value(result, "chargingEnergyKwh"), 5);
  near(value(result, "measuredPeakGridKw"), 10);
  near(value(result, "managedPeakGridKw"), 5);
  near(value(result, "measuredGridCost"), 4.25);
  near(value(result, "managedGridCost"), 3.5);
  near(value(result, "solarToMeasuredEvKwh"), 0);
  near(value(result, "solarToManagedEvKwh"), 5);
  near(value(result, "unservedManagedKwh"), 0);
  assert.equal(result.version, "geit-ev-charging-screen-v1");
  assert.match(result.assumptions.join(" "), /not an optimiser/i);
  const rows = result.tables[0].rows;
  near(rows.reduce((sum, row) => sum + Number(row.measuredEvKwh), 0), 5);
  near(rows.reduce((sum, row) => sum + Number(row.managedEvKwh), 0), 5);
});

test("EV schedule reports infeasible energy rather than claiming full delivery", () => {
  const input = base();
  input.chargerCount = 1;
  input.sessions[0].availableFrom = start(0);
  input.sessions[0].departureAt = start(2);
  input.sessions.push({
    ...input.sessions[0],
    sessionId: "SESSION-02",
    availableFrom: start(1),
    departureAt: start(2),
    actualStart: start(1),
    actualEnd: start(2),
  });
  const result = calculate(input);
  near(value(result, "unservedManagedKwh"), 2.8);
  assert.ok(result.warnings.some((warning) => /could not be scheduled/i.test(warning)));
});

test("EV engine rejects invalid charger power, bad chronology, overlaps and excessive session energy", () => {
  const invalidPower = base();
  invalidPower.chargerPowerKw = 0;
  assert.throws(() => calculate(invalidPower), /greater than 0/);

  const invalidChronology = base();
  invalidChronology.sessions[0].actualEnd = start(0);
  assert.throws(() => calculate(invalidChronology), /arrival ≤ actual charge start/);

  const overlap = base();
  overlap.sessions.push({
    ...overlap.sessions[0],
    sessionId: "SESSION-02",
    actualStart: start(0),
    actualEnd: start(1),
  });
  assert.throws(() => calculate(overlap), /overlap on charger/);

  const excessiveEnergy = base();
  excessiveEnergy.sessions[0].energyKwh = 8;
  assert.throws(() => calculate(excessiveEnergy), /exceeds rated charger power/);
});

test("EV module rejects gapped or non-boundary connection windows", () => {
  const gap = base();
  gap.intervals[2].start = "2026-01-01T02:30:00Z";
  assert.throws(() => calculate(gap), /ordered and contiguous/);

  const window = base();
  window.sessions[0].availableFrom = "2026-01-01T00:30:00Z";
  window.sessions[0].actualStart = "2026-01-01T00:30:00Z";
  window.sessions[0].actualEnd = start(1);
  window.sessions[0].energyKwh = 3.6;
  assert.throws(() => calculate(window), /align with site interval boundaries/);
});

test("optional battery coordination reports dispatch outputs using the existing battery model", () => {
  const input = base();
  input.battery = {
    capacityKwh: 10,
    minSocPercent: 0,
    maxSocPercent: 100,
    initialSocPercent: 50,
    maxChargeKw: 5,
    maxDischargeKw: 5,
    chargeEfficiency: 0.95,
    dischargeEfficiency: 0.95,
  };
  const result = calculate(input);
  assert.ok(value(result, "measuredGridCostWithBattery") !== null);
  assert.ok(value(result, "managedPeakWithBatteryKw") !== null);
  assert.ok(result.tables[0].rows.some((row) => row.measuredBatterySocKwh !== null));
});

test("EV migration extends the shared project registry constraint without applying it", async () => {
  const sql = await readFile(new URL("../migrations/009_ev_charging.sql", import.meta.url), "utf8");
  assert.match(sql, /drop constraint geit_engineering_projects_module_check/i);
  assert.match(sql, /'ev-charging'/);
  assert.match(sql, /geit_engineering_projects_module_check/);
});
