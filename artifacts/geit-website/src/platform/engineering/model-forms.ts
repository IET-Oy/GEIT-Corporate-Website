import type { EngineeringInputs } from "@workspace/api-client-react";

export type EngModule = "energy-consulting" | "energy-auditing" | "renewable-energy" | "battery-flexibility";
export type Model = "consulting" | "auditing" | "solar" | "battery";
export const MODULE_MODEL: Record<EngModule, Model> = { "energy-consulting": "consulting", "energy-auditing": "auditing", "renewable-energy": "solar", "battery-flexibility": "battery" };
export const MODULE_PATH: Record<EngModule, string> = { "energy-consulting": "/app/energy-consulting", "energy-auditing": "/app/energy-auditing", "renewable-energy": "/app/renewable-energy", "battery-flexibility": "/app/battery-flexibility" };

export type Spec = { key: string; label: string; unit: string; min?: number; max?: number; exMin?: boolean; int?: boolean; optional?: boolean; hint?: string };
export type FormState = { v: Record<string, string>; measures: Record<string, string>[]; months: Record<string, string>[]; csv: string };
export type Errors = Record<string, string>;
export const CUR = "{cur}";
export const cu = (u: string, cur: string) => u.replace(CUR, cur);

export const SCALARS: Record<Model, Spec[]> = {
  consulting: [
    { key: "baselineEnergy", label: "Baseline annual energy", unit: "energy unit", min: 0, max: 1e9 },
    { key: "proposedEnergy", label: "Proposed annual energy", unit: "energy unit", min: 0, max: 1e9 },
    { key: "tariffPerKwh", label: "Tariff", unit: `${CUR}/kWh`, min: 0, max: 1e6, hint: "Applied to energy converted to kWh." },
    { key: "capex", label: "Capital cost", unit: CUR, min: 0, max: 1e12 },
    { key: "annualOpexDelta", label: "Annual operating cost change", unit: `${CUR}/year`, min: -1e9, max: 1e9, hint: "Negative means operating cost falls." },
    { key: "discountRatePercent", label: "Discount rate", unit: "%", min: 0, max: 100, hint: "Editable default, not a market figure." },
    { key: "years", label: "Evaluation horizon", unit: "years", min: 1, max: 50, int: true, hint: "Editable default." },
  ],
  auditing: [
    { key: "tariffPerKwh", label: "Tariff", unit: `${CUR}/kWh`, min: 0, max: 1e6 },
    { key: "discountRatePercent", label: "Discount rate", unit: "%", min: 0, max: 100, hint: "Editable default, not a market figure." },
    { key: "years", label: "Evaluation horizon", unit: "years", min: 1, max: 50, int: true, hint: "Editable default." },
    { key: "facilityBaselineKwh", label: "Facility baseline (optional)", unit: "kWh/year", exMin: true, min: 0, max: 1e12, optional: true, hint: "Leave blank if not measured." },
  ],
  solar: [
    { key: "capacityKwp", label: "Array capacity", unit: "kWp", exMin: true, min: 0, max: 1e6 },
    { key: "performanceRatio", label: "Performance ratio", unit: "fraction 0 to 1", exMin: true, min: 0, max: 1, hint: "Editable default; replace with your design value." },
    { key: "coincidenceFactor", label: "Coincidence factor", unit: "fraction 0 to 1", min: 0, max: 1, hint: "Share of generation assumed to coincide with demand." },
    { key: "importRatePerKwh", label: "Import rate", unit: `${CUR}/kWh`, min: 0, max: 1e6 },
    { key: "exportRatePerKwh", label: "Export rate", unit: `${CUR}/kWh`, min: 0, max: 1e6 },
    { key: "capex", label: "Capital cost", unit: CUR, min: 0, max: 1e12 },
    { key: "annualOpex", label: "Annual operating cost", unit: `${CUR}/year`, min: 0, max: 1e9 },
    { key: "discountRatePercent", label: "Discount rate", unit: "%", min: 0, max: 100, hint: "Editable default." },
    { key: "years", label: "Evaluation horizon", unit: "years", min: 1, max: 50, int: true, hint: "Editable default." },
  ],
  battery: [
    { key: "capacityKwh", label: "Usable nameplate capacity", unit: "kWh", exMin: true, min: 0, max: 1e7 },
    { key: "minSocPercent", label: "Minimum state of charge", unit: "%", min: 0, max: 100 },
    { key: "maxSocPercent", label: "Maximum state of charge", unit: "%", min: 0, max: 100 },
    { key: "initialSocPercent", label: "Initial state of charge", unit: "%", min: 0, max: 100 },
    { key: "maxChargeKw", label: "Maximum charge power", unit: "kW", exMin: true, min: 0, max: 1e7 },
    { key: "maxDischargeKw", label: "Maximum discharge power", unit: "kW", exMin: true, min: 0, max: 1e7 },
    { key: "chargeEfficiency", label: "Charge efficiency (one way)", unit: "fraction 0.01 to 1", min: 0.01, max: 1, hint: "Editable default. Not a round-trip percentage." },
    { key: "dischargeEfficiency", label: "Discharge efficiency (one way)", unit: "fraction 0.01 to 1", min: 0.01, max: 1, hint: "Editable default. Not a round-trip percentage." },
  ],
};
export const MEASURE_SPECS: Spec[] = [
  { key: "quantity", label: "Quantity", unit: "units", min: 1, max: 1e6, int: true },
  { key: "baselinePower", label: "Baseline power per unit", unit: "power unit", min: 0, max: 1e6 },
  { key: "proposedPower", label: "Proposed power per unit", unit: "power unit", min: 0, max: 1e6 },
  { key: "hoursPerYear", label: "Operating hours", unit: "h/year", min: 0, max: 8784 },
  { key: "capex", label: "Capital cost", unit: CUR, min: 0, max: 1e12 },
  { key: "annualOpexDelta", label: "Annual operating cost change", unit: `${CUR}/year`, min: -1e9, max: 1e9 },
];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const CSV_HEADER = "start,end,loadKwh,solarKwh,importRatePerKwh,exportRatePerKwh";

export const blankMeasure = (): Record<string, string> => ({ name: "", powerUnit: "kW", quantity: "", baselinePower: "", proposedPower: "", hoursPerYear: "", capex: "", annualOpexDelta: "" });

export function initialState(model: Model): FormState {
  const v: Record<string, string> = { sourceNotes: "" };
  if (model === "consulting") Object.assign(v, { energyUnit: "kWh", discountRatePercent: "8", years: "10" });
  if (model === "auditing") Object.assign(v, { discountRatePercent: "8", years: "10" });
  if (model === "solar") Object.assign(v, { performanceRatio: "0.75", discountRatePercent: "8", years: "20" });
  if (model === "battery") Object.assign(v, { chargeEfficiency: "0.95", dischargeEfficiency: "0.95", dispatchMode: "self_consumption", gridTargetKw: "" });
  return { v, measures: [blankMeasure()], months: MONTHS.map((_, i) => ({ month: String(i + 1), irradiationKwhM2: "", demandKwh: "" })), csv: "" };
}

export function stateFromInputs(i: EngineeringInputs): FormState {
  const s = (x: unknown) => (x === null || x === undefined ? "" : String(x));
  if (i.model === "carbon" || i.model === "twin") return initialState("consulting");
  const base = initialState(i.model);
  const v: Record<string, string> = {};
  for (const [k, val] of Object.entries(i)) if (!Array.isArray(val) && k !== "model") v[k] = s(val);
  const st: FormState = { ...base, v };
  if (i.model === "auditing") st.measures = i.measures.map((m) => Object.fromEntries(Object.entries(m).map(([k, x]) => [k, s(x)])));
  if (i.model === "solar") st.months = i.months.map((m) => ({ month: s(m.month), irradiationKwhM2: s(m.irradiationKwhM2), demandKwh: s(m.demandKwh) }));
  if (i.model === "battery") st.csv = [CSV_HEADER, ...i.intervals.map((r) => [r.start, r.end, r.loadKwh, r.solarKwh, r.importRatePerKwh, r.exportRatePerKwh].join(","))].join("\n");
  return st;
}

function num(raw: string | undefined, sp: Spec, errs: Errors, ek: string): number | null {
  const t = (raw ?? "").trim();
  if (!t) { if (!sp.optional) errs[ek] = "Required. Enter a value in " + sp.unit.replace(CUR, "currency") + "."; return null; }
  const n = Number(t);
  if (!Number.isFinite(n)) { errs[ek] = "Enter a plain number."; return null; }
  if (sp.int && !Number.isInteger(n)) { errs[ek] = "Enter a whole number."; return null; }
  if (sp.min !== undefined && (sp.exMin ? n <= sp.min : n < sp.min)) { errs[ek] = `Must be ${sp.exMin ? "greater than" : "at least"} ${sp.min}.`; return null; }
  if (sp.max !== undefined && n > sp.max) { errs[ek] = `Must be at most ${sp.max}.`; return null; }
  return n;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
export type ParsedCsv = { rows: Record<string, string | number>[]; errors: string[] };
export function parseCsv(text: string): ParsedCsv {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const errors: string[] = []; const rows: ParsedCsv["rows"] = [];
  if (!lines.length) return { rows, errors };
  if (lines[0].replace(/\s/g, "") !== CSV_HEADER) errors.push(`Line 1: header must be exactly ${CSV_HEADER}`);
  const body = lines.slice(1);
  if (body.length > 1000) errors.push("At most 1000 intervals are allowed.");
  body.forEach((l, idx) => {
    const ln = idx + 2; const c = l.split(",").map((x) => x.trim());
    if (c.length !== 6) { errors.push(`Line ${ln}: expected 6 columns, found ${c.length}. Quoted values are not supported.`); return; }
    if (!ISO.test(c[0]) || !ISO.test(c[1])) { errors.push(`Line ${ln}: start and end need ISO 8601 with Z or an offset, e.g. 2025-01-01T00:00:00Z.`); return; }
    const nums = c.slice(2).map((x) => (x === "" ? NaN : Number(x)));
    const names = ["loadKwh", "solarKwh", "importRatePerKwh", "exportRatePerKwh"];
    const bad = nums.findIndex((n, k) => !Number.isFinite(n) || n < 0 || n > (k < 2 ? 1e9 : 1e6));
    if (bad >= 0) { errors.push(`Line ${ln}: ${names[bad]} must be a number of 0 or more within range.`); return; }
    rows.push({ start: c[0], end: c[1], loadKwh: nums[0], solarKwh: nums[1], importRatePerKwh: nums[2], exportRatePerKwh: nums[3] });
  });
  if (lines.length && body.length === 0 && !errors.length) errors.push("Add at least one interval row under the header.");
  return { rows, errors };
}

export function buildInputs(model: Model, st: FormState): { inputs?: EngineeringInputs; errors: Errors } {
  const errors: Errors = {}; const v = st.v;
  const notes = (v.sourceNotes ?? "").trim();
  if (notes.length < 10) errors.sourceNotes = "Describe where these figures came from (at least 10 characters).";
  else if (notes.length > 2000) errors.sourceNotes = "At most 2000 characters.";
  const out: Record<string, unknown> = { model, sourceNotes: notes };
  for (const sp of SCALARS[model]) out[sp.key] = num(v[sp.key], sp, errors, sp.key);
  if (model === "consulting") out.energyUnit = v.energyUnit;
  if (model === "auditing") {
    if (out.facilityBaselineKwh === null) out.facilityBaselineKwh = null;
    const ms = st.measures.map((m, i) => {
      const r: Record<string, unknown> = { powerUnit: m.powerUnit };
      const name = (m.name ?? "").trim();
      if (name.length < 2 || name.length > 120) errors[`m.${i}.name`] = "Name must be 2 to 120 characters.";
      r.name = name;
      for (const sp of MEASURE_SPECS) r[sp.key] = num(m[sp.key], sp, errors, `m.${i}.${sp.key}`);
      return r;
    });
    if (!ms.length || ms.length > 30) errors.measures = "Between 1 and 30 measures are required.";
    out.measures = ms;
  }
  if (model === "solar") {
    out.irradiationUnit = "kWh/m2/month";
    out.months = st.months.map((m, i) => ({
      month: i + 1,
      irradiationKwhM2: num(m.irradiationKwhM2, { key: "i", label: "", unit: "kWh/m2/month", min: 0, max: 500 }, errors, `mo.${i}.irradiationKwhM2`),
      demandKwh: num(m.demandKwh, { key: "d", label: "", unit: "kWh", min: 0, max: 1e9 }, errors, `mo.${i}.demandKwh`),
    }));
  }
  if (model === "battery") {
    out.energyUnit = "kWh"; out.powerUnit = "kW"; out.dispatchMode = v.dispatchMode;
    const a = out.minSocPercent as number | null, b = out.maxSocPercent as number | null, c = out.initialSocPercent as number | null;
    if (a !== null && b !== null && a > b) errors.maxSocPercent = "Maximum must be at least the minimum.";
    if (a !== null && b !== null && c !== null && (c < a || c > b)) errors.initialSocPercent = "Initial must lie between minimum and maximum.";
    if (v.dispatchMode === "peak_shaving") out.gridTargetKw = num(v.gridTargetKw, { key: "g", label: "", unit: "kW", min: 0, max: 1e7 }, errors, "gridTargetKw");
    else out.gridTargetKw = null;
    const p = parseCsv(st.csv);
    if (!st.csv.trim()) errors.csv = "Paste or upload interval data. No default dataset is supplied.";
    else if (p.errors.length) errors.csv = p.errors[0];
    out.intervals = p.rows;
  }
  return Object.keys(errors).length ? { errors } : { inputs: out as unknown as EngineeringInputs, errors };
}
