import type { TwinInputs } from "@workspace/api-zod";
import { instant } from "../energy-calculations";
import { battery } from "../engineering/battery";
import { ensureFinite, metric, table, type EngineeringResult } from "../engineering/common";
import { inputHash } from "../engineering/integrity";
export type TwinReading = { id: string; meter_id: string; import_id: string; start_at: string; end_at: string; quantity: number; unit: string; kwh: number };
type Hour = { start: string; energyKwh: number | null; complete: string; expectedKwh: number | null; anomaly: string };
const HOUR = 3600000;
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return (s[Math.floor((s.length - 1) / 2)] + s[Math.floor(s.length / 2)]) / 2; };
export function twin(i: TwinInputs, load: TwinReading[], solar: TwinReading[], meters: unknown[]): EngineeringResult {
  const start = instant(i.start), end = instant(i.end), windowHours = (end - start) / HOUR;
  if (!(windowHours > 0 && windowHours <= 366 * 24)) throw new Error("Choose a positive historical window no longer than 366 days.");
  if (!load.length) throw new Error("No imported building readings exist in this window.");
  if (i.solarMeterId === i.buildingMeterId) throw new Error("Building load and solar must use different meters.");
  if (i.battery && !i.solarMeterId) throw new Error("Solar-plus-battery replay requires a real measured solar series.");
  const check = (rows: TwinReading[]) => {
    let previous = -Infinity;
    for (const row of rows) {
      const s = instant(row.start_at), e = instant(row.end_at);
      if (s < start || e > end || e <= s || s < previous || !Number.isFinite(row.kwh) || row.kwh < 0) throw new Error("Reading boundaries, chronology or energy are invalid; use whole, non-overlapping imported intervals.");
      previous = e;
    }
  };
  check(load); check(solar);
  const pairKey = (r: TwinReading) => `${instant(r.start_at)}:${instant(r.end_at)}`;
  const solarMap = new Map(solar.map((r) => [pairKey(r), r.kwh]));
  if (i.solarMeterId && (solar.length !== load.length || load.some((r) => !solarMap.has(pairKey(r))))) throw new Error("Building and solar series must have exactly aligned measured intervals; no missing PV readings are filled with zero.");
  let total = 0, covered = 0, peak = 0;
  const bins = new Map<number, { energy: number; covered: number }>();
  for (const r of load) {
    const s = instant(r.start_at), e = instant(r.end_at), hours = (e - s) / HOUR;
    total += r.kwh; covered += hours; peak = Math.max(peak, r.kwh / hours);
    for (let t = Math.floor(s / HOUR) * HOUR; t < e; t += HOUR) {
      const overlap = (Math.min(e, t + HOUR) - Math.max(s, t)) / HOUR;
      const current = bins.get(t) || { energy: 0, covered: 0 };
      current.energy += r.kwh * overlap / hours; current.covered += overlap; bins.set(t, current);
    }
  }
  const hourly: Hour[] = [];
  for (let t = Math.floor(start / HOUR) * HOUR; t < end; t += HOUR) {
    const b = bins.get(t), complete = !!b && Math.abs(b.covered - 1) < 1e-7;
    hourly.push({ start: new Date(t).toISOString(), energyKwh: complete ? b.energy : null, complete: complete ? "yes" : "no", expectedKwh: null, anomaly: "not_assessed" });
  }
  const fine = load.every((r) => instant(r.end_at) - instant(r.start_at) <= HOUR);
  let assessed = 0, anomalies = 0;
  const weekly = (index: number) => [1, 2, 3, 4].map((week) => hourly[index - 168 * week]?.energyKwh);
  if (fine) hourly.forEach((h, index) => {
    const history = weekly(index);
    if (h.energyKwh === null || history.some((x) => x === null || x === undefined)) return;
    const numbers = history as number[], baseline = median(numbers), mad = median(numbers.map((n) => Math.abs(n - baseline)));
    const threshold = Math.max(i.anomalyThreshold * 1.4826 * mad, Math.abs(baseline) * 0.2, 0.1);
    h.expectedKwh = baseline; assessed++;
    h.anomaly = Math.abs(h.energyKwh - baseline) > threshold ? h.energyKwh > baseline ? "high" : "low" : "normal";
    if (h.anomaly !== "normal") anomalies++;
  });
  const adequate = fine && hourly.length >= 840 && hourly.slice(-840).every((h) => h.energyKwh !== null) && instant(hourly.at(-1)!.start) + HOUR === end;
  const forecastRows: { start: string; forecastKwh: number; lowerKwh: number; upperKwh: number }[] = [];
  let mae: number | null = null, wape: number | null = null, rmse: number | null = null;
  if (adequate) {
    const errors: number[] = [], actual: number[] = [];
    for (let index = hourly.length - 168; index < hourly.length; index++) {
      const predicted = (weekly(index) as number[]).reduce((a, b) => a + b, 0) / 4;
      errors.push(hourly[index].energyKwh! - predicted); actual.push(hourly[index].energyKwh!);
    }
    mae = errors.reduce((s, v) => s + Math.abs(v), 0) / errors.length;
    rmse = Math.sqrt(errors.reduce((s, v) => s + v * v, 0) / errors.length);
    const demand = actual.reduce((a, b) => a + b, 0);
    wape = demand > 0 ? errors.reduce((s, v) => s + Math.abs(v), 0) / demand * 100 : null;
    const sorted = errors.map(Math.abs).sort((a, b) => a - b), band = sorted[Math.ceil(0.95 * sorted.length) - 1];
    for (let step = 0; step < i.forecastHorizonHours; step++) {
      const predicted = (weekly(hourly.length + step) as number[]).reduce((a, b) => a + b, 0) / 4;
      forecastRows.push({ start: new Date(end + step * HOUR).toISOString(), forecastKwh: predicted, lowerKwh: Math.max(0, predicted - band), upperKwh: predicted + band });
    }
  }
  let replay: ReturnType<typeof battery> | null = null;
  if (i.battery) replay = battery({
    ...i.battery, model: "battery", sourceNotes: i.sourceNotes, energyUnit: "kWh", powerUnit: "kW",
    intervals: load.map((r) => ({ start: r.start_at, end: r.end_at, loadKwh: r.kwh, solarKwh: solarMap.get(pairKey(r))!, importRatePerKwh: 0, exportRatePerKwh: 0 })),
  }, "XXX");
  const historical = load.map((r, index) => {
    const pv = i.solarMeterId ? solarMap.get(pairKey(r))! : null, dispatch = replay?.tables[0].rows[index];
    return { start: new Date(instant(r.start_at)).toISOString(), end: new Date(instant(r.end_at)).toISOString(), loadKwh: r.kwh, solarKwh: pv,
      gridImportKwh: dispatch ? Number(dispatch.gridImport) : pv === null ? null : Math.max(0, r.kwh - pv),
      gridExportKwh: dispatch ? Number(dispatch.gridExport) : pv === null ? null : Math.max(0, pv - r.kwh),
      chargeKwh: dispatch ? Number(dispatch.charge) : null, dischargeKwh: dispatch ? Number(dispatch.discharge) : null, socKwh: dispatch ? Number(dispatch.socKwh) : null };
  });
  const source = structuredClone({ meters, buildingReadings: load, solarReadings: solar });
  return ensureFinite({
    version: "geit-building-solar-battery-twin-v1",
    metrics: [
      metric("consumptionKwh", "Measured building energy", total, "kWh"),
      metric("coveragePercent", "Measured window coverage", covered / windowHours * 100, "%"),
      metric("peakKw", "Measured interval-average peak", peak, "kW"),
      metric("averageKw", "Observed average load", total / covered, "kW"),
      metric("loadFactorPercent", "Observed load factor", peak > 0 ? total / covered / peak * 100 : null, "%"),
      metric("anomalies", "Flagged historical anomalies", assessed ? anomalies : null, "intervals", "Unavailable until four prior weekly hourly observations exist."),
      metric("assessedHours", "Hours assessed for anomalies", assessed, "hours"),
      metric("forecastKwh", "Forecast horizon demand", adequate ? forecastRows.reduce((s, r) => s + r.forecastKwh, 0) : null, "kWh"),
      metric("backtestMaeKwh", "Seven-day holdout MAE", mae, "kWh/hour"),
      metric("backtestRmseKwh", "Seven-day holdout RMSE", rmse, "kWh/hour"),
      metric("backtestWapePercent", "Seven-day holdout WAPE", wape, "%"),
      ...(replay?.metrics.filter((m) => ["gridImportKwh", "gridExportKwh", "chargedKwh", "dischargedKwh", "batteryLossKwh", "initialStoredKwh", "finalStoredKwh", "terminalEnergyDeltaKwh", "gridTargetExcessKw", "oneHourFlexKw"].includes(m.key)) || []),
    ],
    tables: [
      table("Historical building series", [["start", "Start UTC", ""], ["end", "End UTC", ""], ["loadKwh", "Measured load", "kWh"], ["solarKwh", "Measured solar", "kWh"],
        ["gridImportKwh", "Modelled grid import", "kWh"], ["gridExportKwh", "Modelled grid export", "kWh"], ["chargeKwh", "Modelled AC charge", "kWh"],
        ["dischargeKwh", "Modelled AC discharge", "kWh"], ["socKwh", "Modelled stored energy", "kWh"]], historical),
      table("Hourly building history", [["start", "Start UTC", ""], ["energyKwh", "Measured hourly energy", "kWh"], ["complete", "Complete hour", ""],
        ["expectedKwh", "Trailing weekly median", "kWh"], ["anomaly", "Anomaly assessment", ""]], hourly),
      table("Load forecast", [["start", "Start UTC", ""], ["forecastKwh", "Four-week seasonal mean", "kWh"], ["lowerKwh", "Empirical lower band", "kWh"], ["upperKwh", "Empirical upper band", "kWh"]], forecastRows),
    ],
    assumptions: [
      "Historical load and solar are authorised, non-demo imported meter records. Building meter must measure gross AC demand, not net grid imports.",
      "This is an energy-balance/data twin, not a calibrated thermal/BIM model or live control system. Solar-plus-battery is a counterfactual replay, not measured battery performance.",
      "Native intervals are preserved. Hourly aggregation apportions energy uniformly within each native interval; incomplete hours remain null. Coarser-than-hourly data disables forecasting/anomaly assessment.",
      "Anomaly baseline: median of the four previous same-UTC-hour-of-week values. Threshold = max(user multiplier × 1.4826 × MAD, 20% of baseline, 0.1 kWh).",
      "Forecast requires 35 complete consecutive days at hourly or finer resolution. Four previous same-UTC-hour-of-week values are averaged, with no recursive synthetic input.",
      "Last seven days are held out for backtesting using only earlier data. The band is the holdout 95th percentile absolute error, not a guaranteed or formally calibrated confidence interval.",
      "All periodicity is UTC; no weather, occupancy, equipment metadata, tariff, holiday or connected provider data is inferred.",
      "No currency, savings or investment return is inferred for the twin; any battery replay is physical dispatch only.",
    ],
    warnings: [
      ...(!adequate ? ["Forecast withheld: supply at least 35 consecutive complete days, hourly or finer, ending on a UTC hour boundary."] : []),
      ...(!assessed ? ["Anomaly detection withheld: four earlier complete weekly observations per hour are required."] : []),
      ...(wape !== null && wape > 30 ? ["Holdout WAPE exceeds 30%; forecast accuracy is weak for this dataset."] : []),
      ...(covered / windowHours < 0.999999 ? ["Historical coverage is incomplete. Missing energy is not extrapolated or replaced with zero."] : []),
      ...(replay?.warnings || []),
    ],
    formulas: ["Measured interval kW = stored kWh / elapsed UTC hours. Observed average kW = total measured kWh / covered hours.",
      "Coverage = measured interval hours / requested window hours. Load factor = observed average kW / measured peak kW.",
      "Forecast hourly kWh = mean(four prior weekly same-hour kWh). MAE = mean absolute error; WAPE = sum absolute error / sum actual × 100.",
      ...(replay?.formulas.filter((f) => !f.includes("Grid cost")) || [])],
    provenance: { kind: "imported_energy_records", datasetHash: inputHash(source), ...source, forecastStatus: adequate ? "available" : "withheld", forecastTrainingHours: adequate ? 672 : null, holdoutHours: adequate ? 168 : null },
  });
}
