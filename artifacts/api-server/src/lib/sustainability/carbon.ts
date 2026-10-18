import type { CarbonInputs, CarbonCategory, EmissionFactor, EmissionFactorInput } from "@workspace/api-zod";
import { metric, table, ensureFinite, type EngineeringResult } from "../engineering/common";
import { inputHash } from "../engineering/integrity";
import { CreateEmissionFactorBody } from "@workspace/api-zod";
export const CATEGORIES = {
  scope1: ["stationary_combustion", "mobile_combustion", "fugitive", "process"],
  scope2: ["purchased_electricity", "purchased_heat"],
  scope3: ["purchased_goods", "upstream_fuel_energy", "waste", "business_travel", "employee_commuting", "upstream_transport", "downstream_transport"],
};
export function date(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error("Use a real calendar date in YYYY-MM-DD format.");
  return value;
}
export function validateFactor(f: EmissionFactorInput) {
  if (!CreateEmissionFactorBody.safeParse(f).success) throw new Error("Factor metadata, units or value are invalid.");
  if (date(f.validUntil) <= date(f.validFrom)) throw new Error("Factor validity end must follow its start (end date is exclusive).");
  if (!CATEGORIES[f.scope].includes(f.category)) throw new Error("Factor category does not belong to the selected scope.");
  if ((f.scope === "scope2" && !f.scope2Method) || (f.scope !== "scope2" && f.scope2Method !== null)) throw new Error("Only Scope 2 factors require a location-based or market-based method.");
  if (f.category === "purchased_electricity" && !["kWh", "MWh", "GJ"].includes(f.activityUnit)) throw new Error("Electricity factors require an energy denominator.");
  const url = new URL(f.sourceUrl);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Provide a source HTTPS URL without credentials.");
  for (const key of ["name", "source", "geography", "gwpBasis"] as const) if (f[key].trim().length < (key === "source" ? 10 : key === "gwpBasis" ? 5 : 2)) throw new Error("Factor source, geography, name and GWP basis must be meaningful non-blank text.");
}
function convert(quantity: number, from: string, to: string) {
  if (from === to) return quantity;
  const energy: Record<string, number> = { kWh: 1, MWh: 1000, GJ: 1 / 0.0036 };
  if (energy[from] && energy[to]) return quantity * energy[from] / energy[to];
  throw new Error(`Incompatible units: ${from} cannot be used with a factor per ${to}. Non-energy units must match exactly.`);
}
export function carbon(i: CarbonInputs, factors: EmissionFactor[]): EngineeringResult {
  if (date(i.periodEnd) <= date(i.periodStart)) throw new Error("Inventory end must follow its start (end date is exclusive).");
  if (i.boundary.trim().length < 10 || i.sourceNotes.trim().length < 10) throw new Error("Document the inventory boundary and activity-data sources.");
  const map = new Map(factors.map((f) => [f.id, f]));
  const reductionMap = new Map<number, number>();
  for (const r of i.reductions) {
    if (r.activityIndex >= i.activities.length || reductionMap.has(r.activityIndex)) throw new Error("Each reduction must reference one existing activity, at most once.");
    reductionMap.set(r.activityIndex, r.reductionPercent);
  }
  const scopes = { scope1: 0, scope2: 0, scope3: 0 }, present = new Set<string>(), used = new Map<string, EmissionFactor>();
  const categories = new Map<CarbonCategory, { baseline: number; proposed: number }>();
  let baseline = 0, proposed = 0;
  const rows = i.activities.map((a, index) => {
    const f = map.get(a.factorId);
    if (!f) throw new Error(`Activity ${index + 1}: factor is not available in this organisation.`);
    validateFactor(f);
    if (a.scope !== f.scope || a.category !== f.category) throw new Error(`Activity ${index + 1}: scope/category must match the referenced factor.`);
    if (f.scope === "scope2" && f.scope2Method !== i.scope2Method) throw new Error("Do not mix market-based and location-based Scope 2 factors in one inventory.");
    if (i.periodStart < f.validFrom || i.periodEnd > f.validUntil) throw new Error(`Activity ${index + 1}: factor validity must cover the complete inventory period.`);
    if (f.geography.trim().toUpperCase() !== "GLOBAL" && a.geography.trim().toUpperCase() !== f.geography.trim().toUpperCase()) throw new Error(`Activity ${index + 1}: factor geography does not match the activity.`);
    const amount = convert(a.quantity, a.unit, f.activityUnit);
    const kg = amount * f.value * (f.emissionUnit === "tCO2e" ? 1000 : 1), percent = reductionMap.get(index) || 0;
    const after = kg * (1 - percent / 100);
    baseline += kg; proposed += after; scopes[a.scope] += kg; present.add(a.scope); used.set(f.id, f);
    const category = categories.get(a.category) || { baseline: 0, proposed: 0 };
    category.baseline += kg; category.proposed += after; categories.set(a.category, category);
    return { activity: a.name, scope: a.scope, category: a.category, geography: a.geography, quantity: a.quantity, unit: a.unit,
      factorQuantity: amount, factorUnit: f.activityUnit, factor: f.code, version: f.version, factorValue: f.value,
      emissionUnit: f.emissionUnit, baselineKgCo2e: kg, reductionPercent: percent, proposedKgCo2e: after, source: f.source, sourceUrl: f.sourceUrl };
  });
  const snapshot = structuredClone([...used.values()].sort((a, b) => a.id.localeCompare(b.id)));
  return ensureFinite({
    version: "geit-carbon-inventory-v1",
    metrics: [
      metric("baselineKgCo2e", "Included baseline emissions", baseline, "kgCO2e", "Only the activities explicitly entered in this boundary."),
      metric("proposedKgCo2e", "Reduction-scenario emissions", proposed, "kgCO2e"),
      metric("reductionKgCo2e", "Modelled reduction", baseline - proposed, "kgCO2e", "Prospective activity reductions, not verified achieved reductions."),
      metric("reductionPercent", "Modelled reduction", baseline > 0 ? (baseline - proposed) / baseline * 100 : null, "%"),
      ...(["scope1", "scope2", "scope3"] as const).map((scope) => metric(`${scope}KgCo2e`, `${scope.replace("scope", "Scope ")} included baseline`, present.has(scope) ? scopes[scope] : null, "kgCO2e", "Unavailable means no activity in this scope, not zero emissions.")),
    ],
    tables: [
      table("Activity emissions and factor provenance", [
        ["activity", "Activity", ""], ["scope", "Scope", ""], ["category", "Category", ""], ["geography", "Geography", ""],
        ["quantity", "Input activity", ""], ["unit", "Input unit", ""], ["factorQuantity", "Normalised activity", ""], ["factorUnit", "Factor denominator", ""],
        ["factor", "Factor code", ""], ["version", "Version", ""], ["factorValue", "Factor value", ""], ["emissionUnit", "Factor numerator", ""],
        ["baselineKgCo2e", "Baseline", "kgCO2e"], ["reductionPercent", "Activity reduction", "%"], ["proposedKgCo2e", "Proposed", "kgCO2e"], ["source", "Source", ""], ["sourceUrl", "Reference URL", ""],
      ], rows),
      table("Included categories", [["category", "Category", ""], ["baseline", "Baseline", "kgCO2e"], ["proposed", "Proposed", "kgCO2e"]], [...categories].map(([category, values]) => ({ category, ...values }))),
    ],
    assumptions: [
      `Boundary: ${i.boundary}`, `Reporting interval [${i.periodStart}, ${i.periodEnd}); end date exclusive. Scope 2 method: ${i.scope2Method}.`,
      "Activity-based accounting with user-supplied aggregate CO2-equivalent factors; each factor's source, geography, validity and GWP basis are frozen.",
      "Energy units convert through kWh (1 MWh = 1,000 kWh; 1 GJ = 277.777777… kWh). Other activity units must match exactly; no density, spend-based or distance-occupancy assumption is inferred.",
      "Reduction scenarios change the entered activity quantity proportionally and hold factor versions constant. They are not verified achieved reductions.",
      "No offsets, removals, avoided emissions or exported-electricity credits are subtracted from the gross inventory.",
    ],
    warnings: [
      "This is a partial inventory of entered activities, not a claim of complete GHG Protocol coverage or independent assurance.",
      "Scope 3 supports only the categories listed above; exclusions and upstream/downstream double counting require professional review.",
      "Source references and factor suitability are user-supplied and not independently verified by GEIT.",
      ...(new Set(snapshot.map((f) => f.gwpBasis.trim().toUpperCase())).size > 1 ? ["Mixed GWP bases are present. Harmonise them before interpreting the aggregate as a comparable inventory."] : []),
    ],
    formulas: ["Baseline kgCO2e = activity converted to factor denominator × factor value × (1,000 if numerator is tCO2e, otherwise 1).",
      "Proposed kgCO2e = baseline kgCO2e × (1 − activity reduction percent / 100).",
      "Scope/category totals are sums of the included activities; missing scopes are unavailable, not assumed zero."],
    provenance: { kind: "immutable_factor_versions", factorDatasetHash: inputHash(snapshot), factors: snapshot, periodStart: i.periodStart, periodEnd: i.periodEnd, scope2Method: i.scope2Method },
  });
}
