export const ENERGY_VERSION = "geit-interval-v1";
export const ENERGY_UNITS = ["Wh", "kWh", "MWh", "MJ", "GJ", "W", "kW", "MW"] as const;
export type Reading = { start: string; end: string; value: number; unit: string; kwh: number };
export type Tariff = { currency: string; energy_rate: number; daily_charge: number; demand_rate: number };

export function instant(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  const timestamp = Date.parse(value);
  if (!match || !Number.isFinite(timestamp)) throw new Error("Use an ISO timestamp with Z or an explicit UTC offset.");
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 ||
      day > new Date(Date.UTC(year, month, 0)).getUTCDate()) throw new Error("Invalid date (supported years 2000–2100).");
  return timestamp;
}
export function normalizeReading(start: string, end: string, value: number, unit: string): Reading {
  const s = instant(start), e = instant(end), hours = (e - s) / 3600000;
  if (!(hours > 0 && hours <= 24)) throw new Error("An interval must be longer than zero and no longer than 24 hours.");
  if (!Number.isFinite(value) || value < 0 || value >= 1e12) throw new Error("Value must be finite, non-negative and below 1 trillion.");
  const factors: Record<string, number> = { Wh: 0.001, kWh: 1, MWh: 1000, MJ: 1 / 3.6, GJ: 1 / 0.0036 };
  let kwh: number;
  if (Object.hasOwn(factors, unit)) kwh = value * factors[unit];
  else if (["W", "kW", "MW"].includes(unit)) kwh = value * ({ W: 0.001, kW: 1, MW: 1000 }[unit]!) * hours;
  else throw new Error("Unsupported unit. Use Wh, kWh, MWh, MJ, GJ, W, kW or MW.");
  if (!Number.isFinite(kwh) || kwh >= 1e15) throw new Error("Interval energy exceeds the supported database range (below 1 quadrillion kWh).");
  return { start: new Date(s).toISOString(), end: new Date(e).toISOString(), value, unit, kwh };
}
export function calculateEnergy(
  input: Reading[], start: string, end: string, timezone: string, tariff: Tariff | null,
  areaM2: number | null = null, baselineKwh: number | null = null, targetKwh: number | null = null,
) {
  const from = instant(start), to = instant(end);
  if (to <= from || to - from > 366 * 86400000) throw new Error("Choose a positive analysis period of at most 366 days.");
  if (!input.length || input.length > 10000) throw new Error("Analysis requires 1–10,000 complete intervals.");
  if (areaM2 !== null && !(Number.isFinite(areaM2) && areaM2 > 0)) throw new Error("Site area must be positive.");
  if (baselineKwh !== null && !(Number.isFinite(baselineKwh) && baselineKwh > 0)) throw new Error("Baseline must be positive.");
  if (targetKwh !== null && !(Number.isFinite(targetKwh) && targetKwh >= 0)) throw new Error("Target must be non-negative.");
  if (tariff && (!/^[A-Z]{3}$/.test(tariff.currency) ||
    [tariff.energy_rate, tariff.daily_charge, tariff.demand_rate].some((v) => !Number.isFinite(v) || v < 0))) throw new Error("Invalid tariff.");
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  const days = new Map<string, { kwh: number; hours: number; peak: number }>();
  const hours = new Map<string, { kwh: number; hours: number }>();
  const months = new Map<string, number>();
  let kwh = 0, coveredHours = 0, peakKw = 0, previousEnd = -Infinity;
  for (const raw of [...input].sort((a, b) => instant(a.start) - instant(b.start))) {
    const reading = normalizeReading(raw.start, raw.end, raw.value, raw.unit);
    const s = instant(reading.start), e = instant(reading.end);
    if (s < from || e > to || s < previousEnd) throw new Error("Intervals must be complete, within the period and non-overlapping.");
    previousEnd = e;
    const duration = (e - s) / 3600000, kw = reading.kwh / duration;
    kwh += reading.kwh; coveredHours += duration; peakKw = Math.max(peakKw, kw);
    // Partition at minute boundaries, using actual UTC durations. This handles
    // midnight, fractional-offset time zones and DST skipped/repeated hours.
    for (let t = s; t < e;) {
      const next = Math.min(e, (Math.floor(t / 60000) + 1) * 60000);
      const parts = Object.fromEntries(format.formatToParts(t).map((p) => [p.type, p.value]));
      const date = `${parts.year}-${parts.month}-${parts.day}`, hour = parts.hour;
      const h = (next - t) / 3600000, energy = kw * h;
      const d = days.get(date) || { kwh: 0, hours: 0, peak: 0 };
      d.kwh += energy; d.hours += h; d.peak = Math.max(d.peak, kw); days.set(date, d);
      const p = hours.get(hour) || { kwh: 0, hours: 0 };
      p.kwh += energy; p.hours += h; hours.set(hour, p);
      const month = date.slice(0, 7); months.set(month, Math.max(months.get(month) || 0, kw));
      t = next;
    }
  }
  const round = (v: number) => {
    if (!Number.isFinite(v) || !Number.isFinite(v * 1e8)) throw new Error("Calculation exceeds the supported numeric range. Check area, baseline and reading values.");
    return Math.round((v + Number.EPSILON) * 1e8) / 1e8;
  };
  const energyCost = tariff ? kwh * tariff.energy_rate : null;
  const standingCost = tariff ? days.size * tariff.daily_charge : null;
  const demandCost = tariff ? [...months.values()].reduce((sum, peak) => sum + peak * tariff.demand_rate, 0) : null;
  const coveragePercent = coveredHours / ((to - from) / 3600000) * 100;
  return {
    version: ENERGY_VERSION, timezone, kwh: round(kwh), peakKw: round(peakKw), averageKw: round(kwh / coveredHours),
    loadFactorPercent: peakKw > 0 ? round(kwh / coveredHours / peakKw * 100) : null,
    coveragePercent: round(coveragePercent), coveredHours: round(coveredHours), readingCount: input.length,
    cost: tariff ? round(energyCost! + standingCost! + demandCost!) : null,
    currency: tariff?.currency ?? null, energyCost, standingCost, demandCost,
    intensityKwhM2: areaM2 ? round(kwh / areaM2) : null,
    baselineChangePercent: baselineKwh ? round((kwh - baselineKwh) / baselineKwh * 100) : null,
    targetDifferenceKwh: targetKwh !== null ? round(kwh - targetKwh) : null,
    daily: [...days].sort().map(([label, d]) => ({ label, kwh: round(d.kwh), kw: round(d.peak) })),
    loadProfile: [...hours].sort().map(([label, h]) => ({ label, kwh: round(h.kwh), kw: round(h.kwh / h.hours) })),
    notes: [
      "Interval energy is allocated uniformly within each interval for local-day and hour-of-day grouping.",
      "Power values are interval-average power, not instantaneous or utility demand-window measurements.",
      "Only complete intervals within the selected period are included; gaps are not filled or extrapolated.",
      "Average power and load factor use observed hours, not missing periods. Separate meters are not summed to avoid submeter double counting.",
      tariff ? "Modelled cost, not an invoice: flat energy rate; standing charge for local days with data; demand charge for each local month's observed peak. No tax, TOU, tiers or proration."
        : "No tariff selected. Cost is unavailable, not zero.",
      ...(coveragePercent < 99.999 ? ["Incomplete coverage: cost and KPI results describe available readings only."] : []),
    ],
  };
}
