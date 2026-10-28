import type { BatteryInputs, EvChargingInputs, EngineeringResult } from "@workspace/api-zod";
import { instant } from "../energy-calculations";
import { battery } from "./battery";
import { metric, table } from "./common";

type Interval = EvChargingInputs["intervals"][number];
type Session = EvChargingInputs["sessions"][number];

const HOUR_MS = 3_600_000;
const MAX_HORIZON_HOURS = 31 * 24;
const EPSILON = 1e-8;

function resultValue(result: EngineeringResult, key: string): number | null {
  return result.metrics.find((item) => item.key === key)?.value ?? null;
}

function gridSummary(intervals: Interval[], evKwh: number[]) {
  let importKwh = 0;
  let exportKwh = 0;
  let cost = 0;
  let peakKw = 0;
  let solarToEvKwh = 0;
  const rows = intervals.map((interval, index) => {
    const start = instant(interval.start);
    const end = instant(interval.end);
    const hours = (end - start) / HOUR_MS;
    const siteKwh = interval.siteLoadKwh + evKwh[index];
    const imported = Math.max(0, siteKwh - interval.solarKwh);
    const exported = Math.max(0, interval.solarKwh - siteKwh);
    const solarToEv = Math.min(evKwh[index], Math.max(0, interval.solarKwh - interval.siteLoadKwh));
    const intervalCost = imported * interval.importRatePerKwh - exported * interval.exportRatePerKwh;
    importKwh += imported;
    exportKwh += exported;
    cost += intervalCost;
    peakKw = Math.max(peakKw, imported / hours);
    solarToEvKwh += solarToEv;
    return {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      hours,
      siteLoadKwh: interval.siteLoadKwh,
      solarKwh: interval.solarKwh,
      evKwh: evKwh[index],
      gridImportKwh: imported,
      gridExportKwh: exported,
      gridImportKw: imported / hours,
      importRatePerKwh: interval.importRatePerKwh,
      exportRatePerKwh: interval.exportRatePerKwh,
      gridCost: intervalCost,
      solarToEvKwh: solarToEv,
    };
  });
  return { importKwh, exportKwh, cost, peakKw, solarToEvKwh, rows };
}

function managedSchedule(i: EvChargingInputs, intervals: Interval[]): number[] {
  const intervalBounds = intervals.map((interval) => ({
    start: instant(interval.start),
    end: instant(interval.end),
    hours: (instant(interval.end) - instant(interval.start)) / HOUR_MS,
  }));
  const remainingFleetKwh = intervalBounds.map(({ hours }) => i.chargerCount * i.chargerPowerKw * hours);
  const scheduled = intervals.map(() => 0);
  const sessions = [...i.sessions].sort((a, b) =>
    instant(a.departureAt) - instant(b.departureAt) || instant(a.availableFrom) - instant(b.availableFrom) || a.sessionId.localeCompare(b.sessionId));

  for (const session of sessions) {
    const arrival = instant(session.availableFrom);
    const departure = instant(session.departureAt);
    const candidates = intervals.map((interval, index) => ({ interval, index, time: intervalBounds[index] }))
      .filter(({ time }) => time.start >= arrival && time.end <= departure)
      .sort((a, b) => {
        const aSurplus = Math.max(0, a.interval.solarKwh - a.interval.siteLoadKwh);
        const bSurplus = Math.max(0, b.interval.solarKwh - b.interval.siteLoadKwh);
        const aMarginalRate = aSurplus > EPSILON ? Math.min(a.interval.importRatePerKwh, a.interval.exportRatePerKwh) : a.interval.importRatePerKwh;
        const bMarginalRate = bSurplus > EPSILON ? Math.min(b.interval.importRatePerKwh, b.interval.exportRatePerKwh) : b.interval.importRatePerKwh;
        return aMarginalRate - bMarginalRate || bSurplus - aSurplus || a.time.start - b.time.start;
      });
    let unallocated = session.energyKwh;
    for (const candidate of candidates) {
      if (unallocated <= EPSILON) break;
      const perChargerLimit = i.chargerPowerKw * candidate.time.hours;
      const allocation = Math.min(unallocated, perChargerLimit, remainingFleetKwh[candidate.index]);
      if (allocation <= EPSILON) continue;
      scheduled[candidate.index] += allocation;
      remainingFleetKwh[candidate.index] -= allocation;
      unallocated -= allocation;
    }
  }
  return scheduled;
}

function validateInputs(i: EvChargingInputs): { starts: number[]; ends: number[]; totalHours: number } {
  if (!Number.isInteger(i.chargerCount) || i.chargerCount < 1 || i.chargerCount > 500 || !(i.chargerPowerKw > 0)) {
    throw new Error("Charger count and rated charger power must be positive and within supported bounds.");
  }
  if (!i.intervals.length || i.intervals.length > 1000) throw new Error("Enter between 1 and 1000 site intervals.");
  if (!i.sessions.length || i.sessions.length > 1000) throw new Error("Enter between 1 and 1000 charging sessions.");

  const starts: number[] = [];
  const ends: number[] = [];
  let totalHours = 0;
  for (let index = 0; index < i.intervals.length; index++) {
    const interval = i.intervals[index];
    const start = instant(interval.start);
    const end = instant(interval.end);
    const hours = (end - start) / HOUR_MS;
    if (!(hours > 0 && hours <= 24)) throw new Error(`Site interval ${index + 1}: duration must be positive and at most 24 hours.`);
    if (index && start !== ends[index - 1]) throw new Error(`Site interval ${index + 1}: intervals must be ordered and contiguous.`);
    starts.push(start);
    ends.push(end);
    totalHours += hours;
  }
  if (totalHours > MAX_HORIZON_HOURS) throw new Error("The EV analysis period must not exceed 31 days.");

  const boundaries = new Set([...starts, ends.at(-1)!]);
  const chargerIds = new Set<string>();
  const sessionIds = new Set<string>();
  const byCharger = new Map<string, Array<{ start: number; end: number }>>();
  const horizonStart = starts[0];
  const horizonEnd = ends.at(-1)!;

  for (const [index, session] of i.sessions.entries()) {
    if (sessionIds.has(session.sessionId)) throw new Error(`Session ${index + 1}: session IDs must be unique.`);
    sessionIds.add(session.sessionId);
    chargerIds.add(session.chargerId);
    const availableFrom = instant(session.availableFrom);
    const departureAt = instant(session.departureAt);
    const actualStart = instant(session.actualStart);
    const actualEnd = instant(session.actualEnd);
    if (!(availableFrom < departureAt && availableFrom <= actualStart && actualStart < actualEnd && actualEnd <= departureAt)) {
      throw new Error(`Session ${index + 1}: require arrival ≤ actual charge start < actual charge end ≤ departure.`);
    }
    if (availableFrom < horizonStart || departureAt > horizonEnd) {
      throw new Error(`Session ${index + 1}: availability must be inside the site interval analysis period.`);
    }
    if (!boundaries.has(availableFrom) || !boundaries.has(departureAt)) {
      throw new Error(`Session ${index + 1}: arrival and departure must align with site interval boundaries for schedule screening.`);
    }
    const actualHours = (actualEnd - actualStart) / HOUR_MS;
    if (session.energyKwh > i.chargerPowerKw * actualHours + EPSILON) {
      throw new Error(`Session ${index + 1}: delivered energy exceeds rated charger power over the recorded charging duration.`);
    }
    const periods = byCharger.get(session.chargerId) ?? [];
    periods.push({ start: actualStart, end: actualEnd });
    byCharger.set(session.chargerId, periods);
  }
  if (chargerIds.size > i.chargerCount) throw new Error("The sessions reference more distinct chargers than the configured charger count.");
  for (const [chargerId, periods] of byCharger) {
    periods.sort((a, b) => a.start - b.start);
    for (let index = 1; index < periods.length; index++) {
      if (periods[index].start < periods[index - 1].end) throw new Error(`Recorded sessions overlap on charger ${chargerId}.`);
    }
  }
  return { starts, ends, totalHours };
}

function batteryInputs(i: EvChargingInputs, evKwh: number[]): BatteryInputs {
  if (!i.battery) throw new Error("Battery settings are required for this comparison.");
  return {
    model: "battery",
    sourceNotes: i.sourceNotes,
    energyUnit: "kWh",
    powerUnit: "kW",
    capacityKwh: i.battery.capacityKwh,
    minSocPercent: i.battery.minSocPercent,
    maxSocPercent: i.battery.maxSocPercent,
    initialSocPercent: i.battery.initialSocPercent,
    maxChargeKw: i.battery.maxChargeKw,
    maxDischargeKw: i.battery.maxDischargeKw,
    chargeEfficiency: i.battery.chargeEfficiency,
    dischargeEfficiency: i.battery.dischargeEfficiency,
    dispatchMode: "self_consumption",
    gridTargetKw: null,
    intervals: i.intervals.map((interval, index) => ({
      start: interval.start,
      end: interval.end,
      loadKwh: interval.siteLoadKwh + evKwh[index],
      solarKwh: interval.solarKwh,
      importRatePerKwh: interval.importRatePerKwh,
      exportRatePerKwh: interval.exportRatePerKwh,
    })),
  };
}

export function evCharging(i: EvChargingInputs, currency: string): EngineeringResult {
  validateInputs(i);
  const intervals = i.intervals;
  const baselineEv = intervals.map(() => 0);
  for (const session of i.sessions) {
    const actualStart = instant(session.actualStart);
    const actualEnd = instant(session.actualEnd);
    const duration = actualEnd - actualStart;
    for (const [index, interval] of intervals.entries()) {
      const overlap = Math.max(0, Math.min(actualEnd, instant(interval.end)) - Math.max(actualStart, instant(interval.start)));
      if (overlap) baselineEv[index] += session.energyKwh * overlap / duration;
    }
  }

  const scheduledEv = managedSchedule(i, intervals);
  const baseline = gridSummary(intervals, baselineEv);
  const managed = gridSummary(intervals, scheduledEv);
  const totalEvKwh = i.sessions.reduce((sum, session) => sum + session.energyKwh, 0);
  const totalChargeHours = i.sessions.reduce((sum, session) => sum + (instant(session.actualEnd) - instant(session.actualStart)) / HOUR_MS, 0);
  const periodHours = (instant(intervals.at(-1)!.end) - instant(intervals[0].start)) / HOUR_MS;
  const utilization = totalEvKwh / (i.chargerCount * i.chargerPowerKw * periodHours) * 100;
  const unmetKwh = Math.max(0, totalEvKwh - scheduledEv.reduce((sum, value) => sum + value, 0));

  const baselineStorage = i.battery ? battery(batteryInputs(i, baselineEv), currency) : null;
  const managedStorage = i.battery ? battery(batteryInputs(i, scheduledEv), currency) : null;
  const storageWarnings = [
    ...(baselineStorage?.warnings.map((warning) => `Measured-session battery case: ${warning}`) ?? []),
    ...(managedStorage?.warnings.map((warning) => `Managed-schedule battery case: ${warning}`) ?? []),
  ];
  const rows = intervals.map((interval, index) => {
    const start = instant(interval.start), end = instant(interval.end), hours = (end - start) / HOUR_MS;
    const baselineBatteryRow = baselineStorage?.tables[0].rows[index];
    const managedBatteryRow = managedStorage?.tables[0].rows[index];
    return {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      hours,
      siteLoadKwh: interval.siteLoadKwh,
      solarKwh: interval.solarKwh,
      measuredEvKwh: baselineEv[index],
      managedEvKwh: scheduledEv[index],
      measuredGridImportKwh: baseline.rows[index].gridImportKwh,
      managedGridImportKwh: managed.rows[index].gridImportKwh,
      measuredGridExportKwh: baseline.rows[index].gridExportKwh,
      managedGridExportKwh: managed.rows[index].gridExportKwh,
      measuredGridImportKw: baseline.rows[index].gridImportKw,
      managedGridImportKw: managed.rows[index].gridImportKw,
      measuredGridCost: baseline.rows[index].gridCost,
      managedGridCost: managed.rows[index].gridCost,
      solarToMeasuredEvKwh: baseline.rows[index].solarToEvKwh,
      solarToManagedEvKwh: managed.rows[index].solarToEvKwh,
      measuredBatteryImportKwh: baselineBatteryRow ? Number(baselineBatteryRow.gridImport) : null,
      managedBatteryImportKwh: managedBatteryRow ? Number(managedBatteryRow.gridImport) : null,
      measuredBatteryDischargeKwh: baselineBatteryRow ? Number(baselineBatteryRow.discharge) : null,
      managedBatteryDischargeKwh: managedBatteryRow ? Number(managedBatteryRow.discharge) : null,
      measuredBatterySocKwh: baselineBatteryRow ? Number(baselineBatteryRow.socKwh) : null,
      managedBatterySocKwh: managedBatteryRow ? Number(managedBatteryRow.socKwh) : null,
    };
  });

  return {
    version: "geit-ev-charging-screen-v1",
    metrics: [
      metric("sessionCount", "Charging sessions", i.sessions.length, "sessions"),
      metric("chargingEnergyKwh", "Measured charging energy", totalEvKwh, "kWh"),
      metric("averageSessionKwh", "Average energy per session", totalEvKwh / i.sessions.length, "kWh/session"),
      metric("chargingHours", "Recorded charging duration", totalChargeHours, "h", "Sum of recorded charging durations; not plugged-in dwell time."),
      metric("chargerEnergyUtilizationPercent", "Rated charger energy utilization", utilization, "%", "Measured session energy divided by chargerCount × rated kW × the full analysis horizon."),
      metric("measuredPeakGridKw", "Measured-schedule site peak import", baseline.peakKw, "kW", "Interval-average grid import including entered site load and measured EV sessions."),
      metric("managedPeakGridKw", "Managed-schedule site peak import", managed.peakKw, "kW", "Interval-average grid import under the rule-based screening schedule."),
      metric("measuredGridImportKwh", "Measured-schedule grid import", baseline.importKwh, "kWh"),
      metric("managedGridImportKwh", "Managed-schedule grid import", managed.importKwh, "kWh"),
      metric("measuredGridCost", "Measured-schedule site grid cost", baseline.cost, currency, "Includes entered site load, EV charging, solar generation and interval import/export rates."),
      metric("managedGridCost", "Managed-schedule site grid cost", managed.cost, currency, "Horizon bill estimate only; not savings or a tariff settlement."),
      metric("solarToMeasuredEvKwh", "Solar energy available to measured EV load", baseline.solarToEvKwh, "kWh", "Solar remaining after the entered non-EV site load; interval-level allocation."),
      metric("solarToManagedEvKwh", "Solar energy available to managed EV load", managed.solarToEvKwh, "kWh", "Solar remaining after the entered non-EV site load; interval-level allocation."),
      metric("unservedManagedKwh", "Unscheduled charging energy", unmetKwh, "kWh", "Energy that the screening schedule could not place within the entered windows and charger limits."),
      metric("measuredPeakWithBatteryKw", "Measured-schedule peak with battery", baselineStorage ? resultValue(baselineStorage, "peakKw") : null, "kW"),
      metric("managedPeakWithBatteryKw", "Managed-schedule peak with battery", managedStorage ? resultValue(managedStorage, "peakKw") : null, "kW"),
      metric("measuredGridCostWithBattery", "Measured-schedule site grid cost with battery", baselineStorage ? resultValue(baselineStorage, "gridCost") : null, currency),
      metric("managedGridCostWithBattery", "Managed-schedule site grid cost with battery", managedStorage ? resultValue(managedStorage, "gridCost") : null, currency),
    ],
    tables: [table("EV charging and site interval comparison", [
      ["start", "Start UTC", ""], ["end", "End UTC", ""], ["hours", "Duration", "h"],
      ["siteLoadKwh", "Non-EV site load", "kWh"], ["solarKwh", "Solar generation", "kWh"],
      ["measuredEvKwh", "Measured EV energy", "kWh"], ["managedEvKwh", "Managed EV energy", "kWh"],
      ["measuredGridImportKwh", "Measured grid import", "kWh"], ["managedGridImportKwh", "Managed grid import", "kWh"],
      ["measuredGridExportKwh", "Measured grid export", "kWh"], ["managedGridExportKwh", "Managed grid export", "kWh"],
      ["measuredGridImportKw", "Measured interval-average import", "kW"], ["managedGridImportKw", "Managed interval-average import", "kW"],
      ["measuredGridCost", "Measured-schedule site cost", currency], ["managedGridCost", "Managed-schedule site cost", currency],
      ["solarToMeasuredEvKwh", "Solar available to measured EV load", "kWh"], ["solarToManagedEvKwh", "Solar available to managed EV load", "kWh"],
      ["measuredBatteryImportKwh", "Measured battery-case import", "kWh"], ["managedBatteryImportKwh", "Managed battery-case import", "kWh"],
      ["measuredBatteryDischargeKwh", "Measured battery discharge", "kWh"], ["managedBatteryDischargeKwh", "Managed battery discharge", "kWh"],
      ["measuredBatterySocKwh", "Measured battery stored energy", "kWh"], ["managedBatterySocKwh", "Managed battery stored energy", "kWh"],
    ], rows)],
    assumptions: [
      "User-entered site intervals represent non-EV site load, measured solar generation, and import/export prices; timestamps require explicit offsets.",
      "Recorded session energy is distributed uniformly over actualStart–actualEnd for the measured schedule. This is an interval-level estimate, not charger telemetry.",
      "The managed schedule is a deadline-ordered greedy screen. It prioritises lower marginal tariff cost and available solar, subject to entered arrival/departure windows and charger power; it is not an optimiser.",
      "Managed charging is time-shareable within a measurement interval. Arrival and departure must align with interval boundaries. Battery dispatch reuses the existing solar-self-consumption model with the same initial SOC for both cases.",
      "The module does not connect to chargers, send control commands, validate equipment compatibility, enforce a site grid-import limit, or qualify flexibility services.",
      ...(i.battery ? [] : ["No battery was included. To evaluate storage coordination, enter battery limits and compare the two dispatch cases."]),
      "No taxes, fixed charges, demand charges, degradation, charging losses outside the entered session energy, or billing settlement rules are modelled.",
    ],
    warnings: [
      ...(unmetKwh > EPSILON ? ["Some session energy could not be scheduled within the entered connection windows and charger limits. Inspect the unscheduled-energy metric; no complete schedule is claimed."] : []),
      ...storageWarnings,
      "Measured and managed energy schedules are analysis outputs only. No charger or battery control action is issued.",
      "Solar-to-EV allocation uses interval totals after non-EV site load; it cannot establish which electrons served a vehicle.",
    ],
    formulas: [
      "Measured EV energy per site interval = session energy × overlap duration / recorded charging duration.",
      "Managed charge per session and interval ≤ rated charger kW × interval hours; aggregate interval energy ≤ charger count × rated charger kW × interval hours.",
      "Managed intervals are ordered by min(import rate, export opportunity cost when solar surplus exists), then available solar surplus, then time.",
      "Site grid import = max(0, non-EV site load + EV load − solar generation); export = max(0, solar generation − total site load).",
      "Site grid cost = interval grid import × import rate − interval grid export × export rate.",
    ],
  };
}
