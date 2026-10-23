import assert from "node:assert/strict";
import test from "node:test";
import { calculateEnergy, normalizeReading } from "../src/lib/energy-calculations";

test("UTC grouping conserves partial hours, midnight and month-boundary tariff charges", () => {
  const row = normalizeReading("2026-01-31T23:30:00Z", "2026-02-01T01:15:00Z", 17.5, "kWh");
  const result = calculateEnergy([row], row.start, row.end, "UTC",
    { currency: "USD", energy_rate: 0.2, daily_charge: 1, demand_rate: 3 });
  assert.equal(result.kwh, 17.5);
  assert.equal(result.peakKw, 10);
  assert.deepEqual(result.daily, [
    { label: "2026-01-31", kwh: 5, kw: 10 },
    { label: "2026-02-01", kwh: 12.5, kw: 10 },
  ]);
  assert.deepEqual(result.loadProfile, [
    { label: "00", kwh: 10, kw: 10 },
    { label: "01", kwh: 2.5, kw: 10 },
    { label: "23", kwh: 5, kw: 10 },
  ]);
  assert.equal(result.standingCost, 2);
  assert.equal(result.demandCost, 60);
  assert.equal(result.cost, 65.5);
});

test("UTC optimized grouping matches the unchanged minute-partition path in a zero-offset zone", () => {
  const rows = Array.from({ length: 35 }, (_, i) => {
    const start = Date.UTC(2026, 0, 1) + i * 65 * 60000 + 1234;
    return normalizeReading(new Date(start).toISOString(), new Date(start + 53 * 60000 + 123).toISOString(), 7 + i / 3, "kWh");
  });
  const utc = calculateEnergy(rows, rows[0].start, rows.at(-1)!.end, "UTC", null);
  // Abidjan is zero offset throughout the supported period, but is not
  // canonical UTC, so this exercises the original minute-based implementation.
  const reference = calculateEnergy(rows, rows[0].start, rows.at(-1)!.end, "Africa/Abidjan", null);
  assert.deepEqual({ ...utc, timezone: reference.timezone }, reference);
});
