import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { calculateEnergy, normalizeReading, instant } from "../src/lib/energy-calculations";
import { parseEnergyImport } from "../src/lib/energy-import";
import { csvCell } from "../src/lib/energy-reports";

const start = "2026-01-01T00:00:00Z", end = "2026-01-01T01:00:00Z";
const row = (value = 10) => normalizeReading(start, end, value, "kWh");
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
test("energy units normalise to kWh", () => {
  for (const [value, unit] of [[1000, "Wh"], [1, "kWh"], [0.001, "MWh"], [3.6, "MJ"], [0.0036, "GJ"]] as const) near(normalizeReading(start, end, value, unit).kwh, 1);
});
test("power integrates over actual fractional interval duration", () => {
  near(normalizeReading(start, "2026-01-01T00:30:00Z", 4, "kW").kwh, 2);
  near(normalizeReading(start, end, 1000, "W").kwh, 1);
  near(normalizeReading(start, end, 0.001, "MW").kwh, 1);
});
test("DST offsets use elapsed UTC hours", () => {
  near(normalizeReading("2026-03-29T02:00:00+02:00", "2026-03-29T04:00:00+03:00", 5, "kW").kwh, 5);
  near(normalizeReading("2026-10-25T02:00:00+03:00", "2026-10-25T04:00:00+02:00", 5, "kW").kwh, 15);
});
test("invalid date, missing offset and reversed intervals fail", () => {
  for (const bad of ["2026-02-30T00:00:00Z", "2026-01-01T00:00:00", "garbage"]) assert.throws(() => instant(bad));
  assert.throws(() => normalizeReading(end, start, 1, "kWh"));
  assert.throws(() => normalizeReading(start, "2026-01-03T00:00:00Z", 1, "kWh"));
});
test("negative, nonfinite and unsupported quantities fail", () => {
  for (const value of [-1, NaN, Infinity]) assert.throws(() => normalizeReading(start, end, value, "kWh"));
  assert.throws(() => normalizeReading(start, end, 1, "cumulative-kWh"));
  assert.throws(() => normalizeReading(start, "2026-01-02T00:00:00Z", 1e11, "MW"));
});
test("known consumption, coverage, load factor, intensity and costs", () => {
  const r = calculateEnergy([row(10), normalizeReading(end, "2026-01-01T02:00:00Z", 20, "kWh")], start, "2026-01-01T02:00:00Z", "UTC",
    { currency: "USD", energy_rate: 0.2, daily_charge: 2, demand_rate: 3 }, 10, 40, 25);
  assert.equal(r.kwh, 30); assert.equal(r.peakKw, 20); assert.equal(r.averageKw, 15);
  assert.equal(r.loadFactorPercent, 75); assert.equal(r.coveragePercent, 100);
  assert.equal(r.cost, 68); assert.equal(r.intensityKwhM2, 3);
  assert.equal(r.baselineChangePercent, -25); assert.equal(r.targetDifferenceKwh, 5);
});
test("missing tariff is unavailable, not zero", () => {
  const r = calculateEnergy([row()], start, end, "UTC", null);
  assert.equal(r.cost, null); assert.equal(r.currency, null);
});
test("zero consumption has no undefined load factor", () => {
  const r = calculateEnergy([row(0)], start, end, "UTC", null);
  assert.equal(r.loadFactorPercent, null); assert.equal(r.kwh, 0);
});
test("missing intervals reduce coverage and are not extrapolated", () => {
  const r = calculateEnergy([row()], start, "2026-01-01T02:00:00Z", "UTC", null);
  assert.equal(r.coveragePercent, 50); assert.equal(r.kwh, 10); assert.equal(r.averageKw, 10);
});
test("daily and hourly profile conserve energy across local midnight", () => {
  const a = normalizeReading("2026-01-01T22:30:00Z", "2026-01-01T23:30:00Z", 10, "kWh");
  const r = calculateEnergy([a], a.start, a.end, "Europe/Helsinki", null);
  near(r.daily.reduce((s, d) => s + d.kwh, 0), 10);
  near(r.loadProfile.reduce((s, d) => s + d.kwh, 0), 10);
  assert.equal(r.daily[0].label, "2026-01-02");
});
test("monthly demand charge uses separate local-month peaks", () => {
  const a = normalizeReading("2026-01-31T23:00:00Z", "2026-02-01T01:00:00Z", 20, "kWh");
  const r = calculateEnergy([a], a.start, a.end, "UTC", { currency: "USD", energy_rate: 0, daily_charge: 1, demand_rate: 2 });
  assert.equal(r.demandCost, 40); assert.equal(r.standingCost, 2); assert.equal(r.cost, 42);
});
test("empty, overlapping and invalid comparisons fail", () => {
  assert.throws(() => calculateEnergy([], start, end, "UTC", null));
  assert.throws(() => calculateEnergy([row(), row()], start, end, "UTC", null));
  assert.throws(() => calculateEnergy([row()], start, end, "UTC", null, null, 0));
  assert.throws(() => calculateEnergy([row()], start, end, "UTC", null, 1e-320));
});
const csv = (body: string) => Buffer.from(`interval_start,interval_end,value,unit\n${body}`).toString("base64");
test("CSV parser validates mixed units and row errors", async () => {
  const valid = await parseEnergyImport("data.csv", csv(`${start},${end},1000,Wh`));
  assert.equal(valid.validCount, 1); assert.equal(valid.errors.length, 0); assert.equal(valid.rows[0].kwh, 1);
  const bad = await parseEnergyImport("data.csv", csv(`${start},${end},=1+1,kWh`));
  assert.equal(bad.errors[0].row, 2); assert.equal(bad.validCount, 0);
});
test("CSV duplicate rows are retained as an invalid preview, not silently discarded", async () => {
  const result = await parseEnergyImport("data.csv", csv(`${start},${end},1,kWh\n${start},${end},2,kWh`));
  assert.ok(result.errors.some((e) => e.message.includes("overlapping")));
});
test("Excel parser reads actual workbooks and rejects formulas", async () => {
  const book = new ExcelJS.Workbook(), sheet = book.addWorksheet("Readings");
  sheet.addRow(["interval_start", "interval_end", "value", "unit"]); sheet.addRow([start, end, 4, "kWh"]);
  let result = await parseEnergyImport("data.xlsx", Buffer.from(await book.xlsx.writeBuffer()).toString("base64"));
  assert.equal(result.validCount, 1); assert.equal(result.rows[0].kwh, 4);
  sheet.getCell("C2").value = { formula: "2+2", result: 4 };
  result = await parseEnergyImport("data.xlsx", Buffer.from(await book.xlsx.writeBuffer()).toString("base64"));
  assert.equal(result.validCount, 0);
});
test("malformed headers and file types fail explicitly", async () => {
  await assert.rejects(parseEnergyImport("data.xls", csv(`${start},${end},1,kWh`)));
  await assert.rejects(parseEnergyImport("data.csv", Buffer.from("wrong,header\n1,2").toString("base64")));
});
test("CSV export neutralises spreadsheet formula prefixes", () => {
  assert.match(csvCell("=SUM(A1)"), /^"'/); assert.match(csvCell("@formula"), /^"'/);
  assert.equal(csvCell('name "quoted"'), '"name ""quoted"""');
});
