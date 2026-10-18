import type { BatteryInputs } from "@workspace/api-zod";
import { instant } from "../energy-calculations";
import { metric, table, type EngineeringResult } from "./common";
export function battery(i: BatteryInputs, currency: string): EngineeringResult {
  if (!(i.minSocPercent < i.maxSocPercent) || i.initialSocPercent < i.minSocPercent || i.initialSocPercent > i.maxSocPercent) {
    throw new Error("SOC minimum must be below maximum; initial SOC must lie inside that range.");
  }
  if (i.dispatchMode === "peak_shaving" && i.gridTargetKw == null) throw new Error("Peak-shaving mode requires a non-negative grid target in kW.");
  const minimum = i.capacityKwh * i.minSocPercent / 100, maximum = i.capacityKwh * i.maxSocPercent / 100;
  const initial = i.capacityKwh * i.initialSocPercent / 100;
  let soc = initial, chargeTotal = 0, dischargeTotal = 0, importTotal = 0, exportTotal = 0, lossTotal = 0;
  let baselineCost = 0, cost = 0, baselinePeak = 0, peak = 0, targetExcess = 0, previousEnd: number | null = null;
  const rows = i.intervals.map((s, index) => {
    const start = instant(s.start), end = instant(s.end), hours = (end - start) / 3600000;
    if (!(hours > 0 && hours <= 24)) throw new Error(`Interval ${index + 1}: duration must be positive and at most 24 hours.`);
    if (previousEnd !== null && start !== previousEnd) throw new Error(`Interval ${index + 1}: intervals must be ordered and contiguous, without overlap or missing periods.`);
    previousEnd = end;
    const direct = Math.min(s.loadKwh, s.solarKwh), surplus = s.solarKwh - direct, deficit = s.loadKwh - direct;
    const charge = Math.max(0, Math.min(surplus, i.maxChargeKw * hours, (maximum - soc) / i.chargeEfficiency));
    soc += charge * i.chargeEfficiency;
    const requested = i.dispatchMode === "peak_shaving" ? Math.max(0, deficit - i.gridTargetKw! * hours) : deficit;
    const discharge = Math.max(0, Math.min(requested, i.maxDischargeKw * hours, (soc - minimum) * i.dischargeEfficiency));
    soc -= discharge / i.dischargeEfficiency;
    soc = Math.max(minimum, Math.min(maximum, soc));
    const imported = deficit - discharge, exported = surplus - charge;
    const loss = charge * (1 - i.chargeEfficiency) + discharge * (1 / i.dischargeEfficiency - 1);
    const base = deficit * s.importRatePerKwh - surplus * s.exportRatePerKwh;
    const netCost = imported * s.importRatePerKwh - exported * s.exportRatePerKwh;
    chargeTotal += charge; dischargeTotal += discharge; importTotal += imported; exportTotal += exported;
    lossTotal += loss; baselineCost += base; cost += netCost;
    baselinePeak = Math.max(baselinePeak, deficit / hours); peak = Math.max(peak, imported / hours);
    targetExcess = Math.max(targetExcess, i.dispatchMode === "peak_shaving" ? Math.max(0, imported / hours - i.gridTargetKw!) : 0);
    return { start: new Date(start).toISOString(), end: new Date(end).toISOString(), hours, load: s.loadKwh, solar: s.solarKwh,
      direct, charge, discharge, gridImport: imported, gridExport: exported, socKwh: soc, socPercent: soc / i.capacityKwh * 100, losses: loss, baselineCost: base, cost: netCost };
  });
  return {
    version: "geit-battery-dispatch-baseline-v1",
    metrics: [
      metric("gridImportKwh", "Grid import", importTotal, "kWh"), metric("gridExportKwh", "Grid export", exportTotal, "kWh"),
      metric("chargedKwh", "AC charging energy", chargeTotal, "kWh"), metric("dischargedKwh", "AC delivered energy", dischargeTotal, "kWh"),
      metric("batteryLossKwh", "Conversion losses", lossTotal, "kWh"),
      metric("initialStoredKwh", "Initial stored energy", initial, "kWh"), metric("finalStoredKwh", "Final stored energy", soc, "kWh"),
      metric("terminalEnergyDeltaKwh", "Stored-energy change", soc - initial, "kWh"),
      metric("baselinePeakKw", "Solar-only grid peak", baselinePeak, "kW"), metric("peakKw", "Battery grid peak", peak, "kW"),
      metric("peakReductionKw", "Grid peak reduction", baselinePeak - peak, "kW", "Interval-average peaks, not a utility demand-window prediction."),
      metric("gridTargetExcessKw", "Grid target exceedance", i.dispatchMode === "peak_shaving" ? targetExcess : null, "kW"),
      metric("oneHourFlexKw", "End-of-horizon one-hour headroom", Math.min(i.maxDischargeKw, (soc - minimum) * i.dischargeEfficiency), "kW", "Standalone energy/power potential for one hour; no availability, network, market or service eligibility guarantee."),
      metric("baselineGridCost", "Solar-only grid cost", baselineCost, currency),
      metric("gridCost", "Battery grid cost", cost, currency),
      metric("gridCostDifference", "Grid-cost difference", baselineCost - cost, currency, "Not net economic savings; excludes capital cost, battery wear and stored-energy valuation."),
    ],
    tables: [table("Chronological battery dispatch", [
      ["start", "Start UTC", ""], ["end", "End UTC", ""], ["hours", "Duration", "h"],
      ["load", "Load", "kWh"], ["solar", "Solar AC", "kWh"], ["direct", "Direct solar", "kWh"],
      ["charge", "AC charge", "kWh"], ["discharge", "AC discharge", "kWh"], ["gridImport", "Grid import", "kWh"],
      ["gridExport", "Grid export", "kWh"], ["socKwh", "Stored energy", "kWh"], ["socPercent", "SOC", "%"],
      ["losses", "Conversion loss", "kWh"], ["baselineCost", "Solar-only cost", currency], ["cost", "Battery cost", currency],
    ], rows)],
    assumptions: [
      "User-entered contiguous AC energy intervals, explicit timestamp offsets, separate one-way charge/discharge efficiencies.",
      "Greedy dispatch only: direct solar serves load first; solar surplus charges within power/SOC bounds; no grid charging or battery-to-grid exports.",
      i.dispatchMode === "peak_shaving" ? "Peak-shaving discharges only residual demand above the grid target. It may fail the target when power or stored energy is insufficient."
        : "Self-consumption discharges to residual demand whenever power and stored energy allow.",
      "Rates apply to each interval's grid energy. No demand charges, taxes, grid-service revenue, arbitrage optimiser or demand forecast.",
      "No self-discharge, degradation, thermal limits, inverter standby, phase/network constraint or sub-interval load variations.",
      "Results apply only to the entered horizon. They are not annualised and are not a bankable battery feasibility study.",
    ],
    warnings: [
      ...(Math.abs(soc - initial) > 1e-7 ? ["Initial and final stored energy differ. Grid-cost difference includes a change in inventory: do not present it as net savings without a justified terminal-energy valuation or cyclic horizon."] : []),
      ...(targetExcess > 1e-7 ? ["The grid target could not be maintained in every interval; inspect power limits and SOC reserve."] : []),
      "Flexibility headroom is a physical screening value, not contracted or qualified grid-service capacity.",
    ],
    formulas: [
      "AC charge = min(solar surplus, max charge kW × elapsed h, remaining stored-energy capacity / charge efficiency).",
      "AC discharge = min(requested load, max discharge kW × elapsed h, stored energy above reserve × discharge efficiency).",
      "Final stored energy = previous stored energy + AC charge × charge efficiency − AC discharge / discharge efficiency.",
      "Load + AC charge + grid export = solar AC + AC discharge + grid import (each interval).",
      "Grid cost = grid import × import rate − grid export × export rate. Baseline is the same load and solar without storage.",
    ],
  };
}
