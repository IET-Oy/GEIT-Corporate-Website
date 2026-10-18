import type { EngineeringMetric, EngineeringResult, EngineeringTable } from "@workspace/api-zod";
export type { EngineeringMetric, EngineeringResult, EngineeringTable };
export const metric = (key: string, label: string, value: number | null, unit: string, description = ""): EngineeringMetric =>
  ({ key, label, value, unit, description });
export function table(title: string, columns: [string, string, string][], rows: EngineeringTable["rows"]): EngineeringTable {
  return { title, columns: columns.map(([key, label, unit]) => ({ key, label, unit })), rows };
}
export function finance(capex: number, annualNet: number, years: number, discountPercent: number, currency: string) {
  let npv = -capex, cumulative = -capex, discountedCumulative = -capex;
  let discountedPayback: number | null = capex === 0 && annualNet > 0 ? 0 : null;
  const rows = [{ year: 0, cash: -capex, discounted: -capex, cumulative: -capex, discountedCumulative: -capex }];
  for (let year = 1; year <= years; year++) {
    const discounted = annualNet / (1 + discountPercent / 100) ** year;
    if (discountedPayback === null && discountedCumulative < 0 && discounted > 0 && discountedCumulative + discounted >= 0) {
      discountedPayback = year - 1 + (-discountedCumulative / discounted);
    }
    npv += discounted; cumulative += annualNet; discountedCumulative += discounted;
    rows.push({ year, cash: annualNet, discounted, cumulative, discountedCumulative });
  }
  return {
    metrics: [
      metric("capex", "Capital cost", capex, currency, "Total project investment at year zero."),
      metric("annualNetBenefit", "Annual net benefit", annualNet, `${currency}/year`, "Gross energy benefit less incremental annual operating cost."),
      metric("npv", "Net present value", npv, currency, `${years} end-of-year cash flows, discounted at ${discountPercent}% annually.`),
      metric("simplePayback", "Simple payback", annualNet > 0 ? capex / annualNet : null, "years", "Not available for zero or negative annual benefit; may exceed the model horizon."),
      metric("discountedPayback", "Discounted payback", discountedPayback, "years", "Linear interpolation within the recovery year; unavailable if not recovered within the horizon."),
    ],
    table: table("Discounted cash flow", [
      ["year", "Year", "year"], ["cash", "Net cash flow", currency], ["discounted", "Discounted cash flow", currency],
      ["cumulative", "Cumulative cash", currency], ["discountedCumulative", "Discounted cumulative cash", currency],
    ], rows),
    warnings: annualNet <= 0 ? ["The scenario has no positive annual net benefit; no positive simple payback is reported."] : [],
  };
}
export const FINANCE_ASSUMPTIONS = [
  "Constant annual benefit and end-of-year cash flows. Capex is paid at year zero.",
  "No tax, financing, inflation, tariff escalation, equipment degradation, replacement, incentive or residual-value model.",
  "Financial results are screening estimates, not investment advice or guaranteed savings.",
];
export function ensureFinite(result: EngineeringResult): EngineeringResult {
  function walk(value: unknown): void {
    if (typeof value === "number" && (!Number.isFinite(value) || Math.abs(value) > 1e30)) throw new Error("Result exceeds supported numeric bounds. Check units and input magnitudes.");
    if (value && typeof value === "object") for (const child of Object.values(value)) walk(child);
  }
  walk(result); return result;
}
