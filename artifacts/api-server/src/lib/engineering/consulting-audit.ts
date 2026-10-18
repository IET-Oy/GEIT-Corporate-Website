import type { ConsultingInputs, AuditingInputs } from "@workspace/api-zod";
import { finance, metric, table, FINANCE_ASSUMPTIONS, type EngineeringResult } from "./common";

export function consulting(i: ConsultingInputs, currency: string): EngineeringResult {
  const factor = { kWh: 1, MWh: 1000, GJ: 1 / 0.0036 }[i.energyUnit];
  const baseline = i.baselineEnergy * factor, proposed = i.proposedEnergy * factor, saved = baseline - proposed;
  const gross = saved * i.tariffPerKwh, f = finance(i.capex, gross - i.annualOpexDelta, i.years, i.discountRatePercent, currency);
  return {
    version: "geit-consulting-baseline-v1",
    metrics: [
      metric("baselineKwh", "Baseline annual energy", baseline, "kWh/year"),
      metric("proposedKwh", "Proposed annual energy", proposed, "kWh/year"),
      metric("energySavedKwh", "Annual energy reduction", saved, "kWh/year"),
      metric("energyReductionPercent", "Energy reduction", baseline > 0 ? saved / baseline * 100 : null, "%"),
      metric("grossEnergyBenefit", "Gross annual energy benefit", gross, `${currency}/year`),
      ...f.metrics,
    ],
    tables: [table("Annual energy and cost comparison", [
      ["case", "Case", ""], ["energy", "Annual energy", "kWh/year"], ["cost", "Energy cost", `${currency}/year`],
    ], [{ case: "Baseline", energy: baseline, cost: baseline * i.tariffPerKwh }, { case: "Proposed", energy: proposed, cost: proposed * i.tariffPerKwh }]), f.table],
    assumptions: ["User-entered baseline/proposed energy describe the same annual boundary and operating conditions.",
      "The flat tariff applies to all normalised kWh. Incremental Opex is total annual project cost, not a per-unit equipment cost.", ...FINANCE_ASSUMPTIONS],
    warnings: [...f.warnings, ...(saved < 0 ? ["Proposed consumption exceeds baseline; the calculated energy reduction is negative."] : [])],
    formulas: ["1 MWh = 1,000 kWh; 1 GJ = 277.777777… kWh.",
      "Annual net benefit = (baseline kWh − proposed kWh) × tariff per kWh − incremental annual Opex.",
      "NPV = −capex + Σ annual net benefit / (1 + discount rate)^year."],
  };
}

export function auditing(i: AuditingInputs, currency: string): EngineeringResult {
  const names = i.measures.map((m) => m.name.trim().toLowerCase());
  if (new Set(names).size !== names.length || names.some((n) => n.length < 2)) throw new Error("Each measure needs a distinct, non-blank name.");
  let baseline = 0, proposed = 0, capex = 0, opex = 0;
  const rows = i.measures.map((m) => {
    const scale = m.powerUnit === "W" ? 0.001 : 1;
    const before = m.quantity * m.baselinePower * scale * m.hoursPerYear;
    const after = m.quantity * m.proposedPower * scale * m.hoursPerYear;
    const saving = before - after, net = saving * i.tariffPerKwh - m.annualOpexDelta;
    baseline += before; proposed += after; capex += m.capex; opex += m.annualOpexDelta;
    return { measure: m.name, quantity: m.quantity, baselineKwh: before, proposedKwh: after, savedKwh: saving, netAnnual: net, capex: m.capex, payback: net > 0 ? m.capex / net : null };
  });
  if (i.facilityBaselineKwh != null && baseline > i.facilityBaselineKwh + 1e-6) {
    throw new Error("Combined measure baseline exceeds the facility baseline. Check overlapping equipment, units and operating hours.");
  }
  const saved = baseline - proposed, f = finance(capex, saved * i.tariffPerKwh - opex, i.years, i.discountRatePercent, currency);
  return {
    version: "geit-auditing-engineering-v1",
    metrics: [
      metric("measureCount", "Measures assessed", i.measures.length, "measures"),
      metric("baselineKwh", "Measure baseline energy", baseline, "kWh/year"),
      metric("proposedKwh", "Measure proposed energy", proposed, "kWh/year"),
      metric("energySavedKwh", "Annual energy reduction", saved, "kWh/year"),
      metric("facilityProposedKwh", "Proposed facility energy", i.facilityBaselineKwh == null ? null : i.facilityBaselineKwh - saved, "kWh/year", "Available only when an annual facility baseline is supplied."),
      ...f.metrics,
    ],
    tables: [table("Efficiency measures", [
      ["measure", "Measure", ""], ["quantity", "Quantity", "items"], ["baselineKwh", "Baseline", "kWh/year"],
      ["proposedKwh", "Proposed", "kWh/year"], ["savedKwh", "Reduction", "kWh/year"], ["netAnnual", "Net benefit", `${currency}/year`],
      ["capex", "Capital cost", currency], ["payback", "Simple payback", "years"],
    ], rows), f.table],
    assumptions: ["Energy = equipment quantity × input power in kW × annual operating hours.",
      "Capex and incremental annual Opex are totals for each measure, not per-item amounts.",
      "Measures describe disjoint end uses. No interaction, rebound, weather normalisation, load variability or measured verification is modelled.",
      "This is an engineering screening worksheet, not a certified on-site energy audit.", ...FINANCE_ASSUMPTIONS],
    warnings: [...f.warnings, "Confirm that measures do not count the same equipment or savings twice; unique names alone cannot establish independence.",
      ...(saved < 0 ? ["The proposed measure portfolio increases annual consumption."] : [])],
    formulas: ["Power W ÷ 1,000 = kW. Annual energy = quantity × kW × hours/year.",
      "Portfolio energy reduction = Σ (measure baseline energy − measure proposed energy).",
      "Annual net benefit = portfolio reduction × tariff − Σ incremental annual Opex.",
      "NPV = −Σ capex + Σ annual net benefit / (1 + discount rate)^year."],
  };
}
