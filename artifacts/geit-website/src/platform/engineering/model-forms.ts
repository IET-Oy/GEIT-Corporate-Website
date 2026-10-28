import type { EngineeringInputs } from "@workspace/api-client-react";

export type EngModule = "energy-consulting" | "energy-auditing" | "renewable-energy" | "battery-flexibility" | "ev-charging";
export type Model = "consulting" | "auditing" | "solar" | "battery" | "ev-charging";
export const MODULE_MODEL: Record<EngModule, Model> = { "energy-consulting": "consulting", "energy-auditing": "auditing", "renewable-energy": "solar", "battery-flexibility": "battery", "ev-charging": "ev-charging" };
export const MODULE_PATH: Record<EngModule, string> = { "energy-consulting": "/app/energy-consulting", "energy-auditing": "/app/energy-auditing", "renewable-energy": "/app/renewable-energy", "battery-flexibility": "/app/battery-flexibility", "ev-charging": "/app/ev-charging" };

export type Spec = { key: string; label: string; unit: string; min?: number; max?: number; exMin?: boolean; int?: boolean; optional?: boolean; hint?: string };
export type FormState = { v: Record<string, string>; measures: Record<string, string>[]; months: Record<string, string>[]; sessions: Record<string, string>[]; csv: string };
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
  "ev-charging": [
    { key: "chargerCount", label: "Number of chargers", unit: "chargers", min: 1, max: 500, int: true },
    { key: "chargerPowerKw", label: "Rated power per charger", unit: "kW", exMin: true, min: 0, max: 10000 },
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
export const EV_CSV_HEADER = "start,end,siteLoadKwh,solarKwh,importRatePerKwh,exportRatePerKwh";

export const blankMeasure = (): Record<string, string> => ({ name: "", powerUnit: "kW", quantity: "", baselinePower: "", proposedPower: "", hoursPerYear: "", capex: "", annualOpexDelta: "" });
export const blankSession = (): Record<string, string> => ({ sessionId: "", chargerId: "", availableFrom: "", departureAt: "", actualStart: "", actualEnd: "", energyKwh: "" });

export function initialState(model: Model): FormState {
  const v: Record<string, string> = { sourceNotes: "" };
  if (model === "consulting") Object.assign(v, { energyUnit: "kWh", discountRatePercent: "8", years: "10" });
  if (model === "auditing") Object.assign(v, { discountRatePercent: "8", years: "10" });
  if (model === "solar") Object.assign(v, { performanceRatio: "0.75", discountRatePercent: "8", years: "20" });
  if (model === "battery") Object.assign(v, { chargeEfficiency: "0.95", dischargeEfficiency: "0.95", dispatchMode: "self_consumption", gridTargetKw: "" });
  if (model === "ev-charging") Object.assign(v, {
    includeBattery: "false",
    batteryCapacityKwh: "", batteryMinSocPercent: "0", batteryMaxSocPercent: "100", batteryInitialSocPercent: "50",
    batteryMaxChargeKw: "", batteryMaxDischargeKw: "", batteryChargeEfficiency: "0.95", batteryDischargeEfficiency: "0.95",
  });
  return { v, measures: [blankMeasure()], months: MONTHS.map((_, i) => ({ month: String(i + 1), irradiationKwhM2: "", demandKwh: "" })), sessions: [blankSession()], csv: "" };
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
  if (i.model === "ev-charging") {
    st.sessions = i.sessions.map((session) => Object.fromEntries(Object.entries(session).map(([k, x]) => [k, s(x)])));
    st.csv = [EV_CSV_HEADER, ...i.intervals.map((r) => [r.start, r.end, r.siteLoadKwh, r.solarKwh, r.importRatePerKwh, r.exportRatePerKwh].join(","))].join("\n");
    if (i.battery) Object.assign(st.v, {
      includeBattery: "true",
      batteryCapacityKwh: s(i.battery.capacityKwh), batteryMinSocPercent: s(i.battery.minSocPercent),
      batteryMaxSocPercent: s(i.battery.maxSocPercent), batteryInitialSocPercent: s(i.battery.initialSocPercent),
      batteryMaxChargeKw: s(i.battery.maxChargeKw), batteryMaxDischargeKw: s(i.battery.maxDischargeKw),
      batteryChargeEfficiency: s(i.battery.chargeEfficiency), batteryDischargeEfficiency: s(i.battery.dischargeEfficiency),
    });
  }
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
function parseIntervalCsv(text: string, header: string): ParsedCsv {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const errors: string[] = []; const rows: ParsedCsv["rows"] = [];
  if (!lines.length) return { rows, errors };
  if (lines[0].replace(/\s/g, "") !== header) errors.push(`Line 1: header must be exactly ${header}`);
  const body = lines.slice(1);
  if (body.length > 1000) errors.push("At most 1000 intervals are allowed.");
  body.forEach((l, idx) => {
    const ln = idx + 2; const c = l.split(",").map((x) => x.trim());
    if (c.length !== 6) { errors.push(`Line ${ln}: expected 6 columns, found ${c.length}. Quoted values are not supported.`); return; }
    if (!ISO.test(c[0]) || !ISO.test(c[1])) { errors.push(`Line ${ln}: start and end need ISO 8601 with Z or an offset, e.g. 2025-01-01T00:00:00Z.`); return; }
    const nums = c.slice(2).map((x) => (x === "" ? NaN : Number(x)));
    const names = header.split(",").slice(2);
    const bad = nums.findIndex((n, k) => !Number.isFinite(n) || n < 0 || n > (k < 2 ? 1e9 : 1e6));
    if (bad >= 0) { errors.push(`Line ${ln}: ${names[bad]} must be a number of 0 or more within range.`); return; }
    rows.push({ start: c[0], end: c[1], ...Object.fromEntries(names.map((name, index) => [name, nums[index]])) });
  });
  if (lines.length && body.length === 0 && !errors.length) errors.push("Add at least one interval row under the header.");
  return { rows, errors };
}
export const parseCsv = (text: string): ParsedCsv => parseIntervalCsv(text, CSV_HEADER);
export const parseEvCsv = (text: string): ParsedCsv => parseIntervalCsv(text, EV_CSV_HEADER);

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
  if (model === "ev-charging") {
    out.energyUnit = "kWh";
    out.powerUnit = "kW";
    const parsed = parseEvCsv(st.csv);
    if (!st.csv.trim()) errors.csv = "Paste or upload site interval data. No default dataset is supplied.";
    else if (parsed.errors.length) errors.csv = parsed.errors[0];
    out.intervals = parsed.rows;

    const sessions = st.sessions.map((session, index) => {
      const sessionId = (session.sessionId ?? "").trim();
      const chargerId = (session.chargerId ?? "").trim();
      if (sessionId.length < 2 || sessionId.length > 80) errors[`s.${index}.sessionId`] = "Session ID must be 2 to 80 characters.";
      if (chargerId.length < 2 || chargerId.length > 80) errors[`s.${index}.chargerId`] = "Charger ID must be 2 to 80 characters.";
      const row: Record<string, string | number> = { sessionId, chargerId };
      for (const key of ["availableFrom", "departureAt", "actualStart", "actualEnd"] as const) {
        const value = (session[key] ?? "").trim();
        if (!ISO.test(value) || !Number.isFinite(Date.parse(value))) errors[`s.${index}.${key}`] = "Use ISO 8601 with Z or a UTC offset.";
        row[key] = value;
      }
      const energy = num(session.energyKwh, { key: "energyKwh", label: "Session energy", unit: "kWh", exMin: true, min: 0, max: 1e6 }, errors, `s.${index}.energyKwh`);
      if (energy !== null) row.energyKwh = energy;
      const a = Date.parse(session.availableFrom ?? ""), d = Date.parse(session.departureAt ?? "");
      const chargeStart = Date.parse(session.actualStart ?? ""), chargeEnd = Date.parse(session.actualEnd ?? "");
      if ([a, d, chargeStart, chargeEnd].every(Number.isFinite) && !(a < d && a <= chargeStart && chargeStart < chargeEnd && chargeEnd <= d)) {
        errors[`s.${index}.actualEnd`] = "Require arrival ≤ actual charge start < actual charge end ≤ departure.";
      }
      return row;
    });
    if (!sessions.length || sessions.length > 1000) errors.sessions = "Between 1 and 1000 sessions are required.";
    if (new Set(sessions.map((session) => session.sessionId)).size !== sessions.length) errors.sessions = "Session IDs must be unique.";
    out.sessions = sessions;

    if (v.includeBattery === "true") {
      const fields = {
        capacityKwh: { key: "batteryCapacityKwh", label: "Battery capacity", unit: "kWh", exMin: true, min: 0, max: 1e7 },
        minSocPercent: { key: "batteryMinSocPercent", label: "Minimum state of charge", unit: "%", min: 0, max: 100 },
        maxSocPercent: { key: "batteryMaxSocPercent", label: "Maximum state of charge", unit: "%", min: 0, max: 100 },
        initialSocPercent: { key: "batteryInitialSocPercent", label: "Initial state of charge", unit: "%", min: 0, max: 100 },
        maxChargeKw: { key: "batteryMaxChargeKw", label: "Maximum charge power", unit: "kW", exMin: true, min: 0, max: 1e7 },
        maxDischargeKw: { key: "batteryMaxDischargeKw", label: "Maximum discharge power", unit: "kW", exMin: true, min: 0, max: 1e7 },
        chargeEfficiency: { key: "batteryChargeEfficiency", label: "Charge efficiency", unit: "fraction", min: 0.01, max: 1 },
        dischargeEfficiency: { key: "batteryDischargeEfficiency", label: "Discharge efficiency", unit: "fraction", min: 0.01, max: 1 },
      } as const;
      const batteryInputs = Object.fromEntries(Object.entries(fields).map(([key, spec]) => [
        key, num(v[spec.key], spec, errors, spec.key),
      ]));
      const minimum = batteryInputs.minSocPercent, maximum = batteryInputs.maxSocPercent, initial = batteryInputs.initialSocPercent;
      if (minimum !== null && maximum !== null && minimum >= maximum) errors.batteryMaxSocPercent = "Maximum must be greater than the minimum.";
      if (minimum !== null && maximum !== null && initial !== null && (initial < minimum || initial > maximum)) {
        errors.batteryInitialSocPercent = "Initial state of charge must lie within the minimum and maximum.";
      }
      out.battery = batteryInputs;
    }
  }
  return Object.keys(errors).length ? { errors } : { inputs: out as unknown as EngineeringInputs, errors };
}
