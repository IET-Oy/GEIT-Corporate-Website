import { performance } from "node:perf_hooks";
import { calculateEnergy, normalizeReading } from "../src/lib/energy-calculations";
import { parseEnergyImport } from "../src/lib/energy-import";

// Synthetic CPU/memory measurements only. No network, database, storage or
// provider calls; not a capacity certification or a distributed load test.
const results: Record<string, unknown>[] = [];
for (const days of [30, 365]) {
  const rows = Array.from({ length: days }, (_, i) => normalizeReading(
    new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    new Date(Date.UTC(2026, 0, 2 + i)).toISOString(), 24, "kWh"));
  const started = performance.now();
  const timer = new Promise<number>((resolve) => setTimeout(() => resolve(performance.now() - started), 0));
  const output = calculateEnergy(rows, rows[0].start, rows.at(-1)!.end, "UTC", null);
  results.push({ case: `${days}-day calculation`, rows: rows.length, kwh: output.kwh,
    durationMs: Math.round(performance.now() - started), eventLoopDelayMs: Math.round(await timer) });
}
const lines = ["interval_start,interval_end,value,unit", ...Array.from({ length: 5000 }, (_, i) => {
  const s = Date.UTC(2026, 0, 1) + i * 3600000;
  return `${new Date(s).toISOString()},${new Date(s + 3600000).toISOString()},1,kWh`;
})];
const encoded = Buffer.from(lines.join("\n")).toString("base64");
const started = performance.now();
const previews = await Promise.all(Array.from({ length: 8 }, () => parseEnergyImport("synthetic.csv", encoded)));
results.push({ case: "8 concurrent 5,000-row CSV parser calls", durationMs: Math.round(performance.now() - started),
  totalValidRows: previews.reduce((sum, p) => sum + p.validCount, 0) });
console.log(JSON.stringify({ results, peakRssMiB: Math.round(process.resourceUsage().maxRSS / 1024),
  limitation: "Single local process; no authenticated HTTP load, real customers, database or provider capacity measured." }, null, 2));
