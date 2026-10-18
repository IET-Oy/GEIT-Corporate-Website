import type { SolarInputs } from "@workspace/api-zod";
import { finance, metric, table, FINANCE_ASSUMPTIONS, type EngineeringResult } from "./common";
export function solar(i: SolarInputs, currency: string): EngineeringResult {
  if (new Set(i.months.map((m) => m.month)).size !== 12) throw new Error("Supply each calendar month exactly once, from 1 to 12.");
  let generation = 0, demand = 0, self = 0, exported = 0, imported = 0, benefit = 0;
  const rows = [...i.months].sort((a, b) => a.month - b.month).map((m) => {
    const pv = i.capacityKwp * m.irradiationKwhM2 * i.performanceRatio;
    const consumed = Math.min(pv, m.demandKwh) * i.coincidenceFactor;
    const exp = pv - consumed, imp = m.demandKwh - consumed;
    const value = consumed * i.importRatePerKwh + exp * i.exportRatePerKwh;
    generation += pv; demand += m.demandKwh; self += consumed; exported += exp; imported += imp; benefit += value;
    return { month: m.month, irradiation: m.irradiationKwhM2, generation: pv, demand: m.demandKwh, selfConsumed: consumed, gridImport: imp, gridExport: exp, grossBenefit: value };
  });
  const f = finance(i.capex, benefit - i.annualOpex, i.years, i.discountRatePercent, currency);
  return {
    version: "geit-solar-yield-baseline-v1",
    metrics: [
      metric("generationKwh", "Annual solar generation", generation, "kWh/year"),
      metric("specificYield", "Specific yield", generation / i.capacityKwp, "kWh/kWp/year"),
      metric("capacityFactorPercent", "Capacity factor", generation / i.capacityKwp / 8760 * 100, "%", "Typical non-leap year, 8,760 hours."),
      metric("selfConsumedKwh", "Estimated self-consumption", self, "kWh/year"),
      metric("selfConsumptionPercent", "Self-consumption ratio", generation > 0 ? self / generation * 100 : null, "%"),
      metric("solarCoveragePercent", "Demand met by solar", demand > 0 ? self / demand * 100 : null, "%"),
      metric("gridImportKwh", "Annual grid import", imported, "kWh/year"),
      metric("gridExportKwh", "Annual grid export", exported, "kWh/year"),
      ...f.metrics,
    ],
    tables: [table("Monthly solar energy balance", [
      ["month", "Month", "1–12"], ["irradiation", "Plane-of-array irradiation", "kWh/m²/month"], ["generation", "Solar generation", "kWh"],
      ["demand", "Demand", "kWh"], ["selfConsumed", "Self-consumed solar", "kWh"], ["gridImport", "Grid import", "kWh"],
      ["gridExport", "Grid export", "kWh"], ["grossBenefit", "Gross energy benefit", currency],
    ], rows), f.table],
    assumptions: [
      "Monthly plane-of-array irradiation is supplied by the user; no weather, irradiation or tariff provider is configured or queried.",
      "STC reference irradiance = 1 kW/m²; first-year AC yield = DC kWp × plane-of-array irradiation / reference irradiance × performance ratio.",
      "The user-supplied performance ratio includes all intended temperature, inverter, soiling, wiring and availability losses; do not apply them twice.",
      "Self-consumption is a monthly coincidence proxy, not an hourly load match: min(monthly generation, monthly demand) × coincidence factor.",
      "Typical-year monthly inputs repeat unchanged for financial appraisal. No degradation, clipping, shading geometry, orientation optimisation or battery dispatch.",
      ...FINANCE_ASSUMPTIONS,
    ],
    warnings: [...f.warnings,
      "Monthly energy does not establish simultaneous generation and demand. Confirm self-consumption with interval data before design or investment decisions.",
      ...(generation === 0 ? ["All supplied irradiation is zero; estimated generation is zero."] : [])],
    formulas: ["Monthly AC generation (kWh) = capacity (kWp) × irradiation (kWh/m²/month) × performance ratio / 1 kW/m².",
      "Monthly self-consumption = min(generation, demand) × coincidence factor; export = generation − self-consumption; import = demand − self-consumption.",
      "Annual net benefit = self-consumption × import tariff + export × export tariff − annual Opex.",
      "NPV = −capex + Σ constant annual net benefit / (1 + discount rate)^year."],
  };
}
