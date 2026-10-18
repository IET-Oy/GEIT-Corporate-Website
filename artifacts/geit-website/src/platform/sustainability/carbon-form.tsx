import { useState } from "react";
import { getGetEmissionFactorsQueryKey, useGetEmissionFactors, type CarbonActivity, type CarbonInputs, type CarbonReduction, type EngineeringInputs } from "@workspace/api-client-react";
import { Alert, Field, Skeleton, apiMessage } from "../common";
import { Btn } from "../energy/ui";
import { CATEGORIES, ENERGY_UNITS, INPUT, SCOPES, SCOPE_LABEL, UNITS, catLabel, isDate, parseNum, type Builder, type Errors } from "./utils";

type Row = { name: string; factorId: string; quantity: string; unit: string; geography: string; scope: string; category: string; reduction: string; label: string };
const blankRow = (): Row => ({ name: "", factorId: "", quantity: "", unit: "", geography: "", scope: "", category: "", reduction: "", label: "" });

function seedRows(i: EngineeringInputs | null): { notes: string; boundary: string; start: string; end: string; method: string; rows: Row[] } {
  if (!i || i.model !== "carbon") return { notes: "", boundary: "", start: "", end: "", method: "", rows: [blankRow()] };
  return { notes: i.sourceNotes, boundary: i.boundary, start: i.periodStart, end: i.periodEnd, method: i.scope2Method, rows: i.activities.map((a, idx) => {
    const r = i.reductions.find((x) => x.activityIndex === idx);
    return { name: a.name, factorId: a.factorId, quantity: String(a.quantity), unit: a.unit, geography: a.geography, scope: a.scope, category: a.category, reduction: r ? String(r.reductionPercent) : "", label: r?.label ?? "" };
  }) };
}

export function CarbonForm({ orgId, seed, disabled, builder }: { orgId: string; seed: EngineeringInputs | null; disabled: boolean; builder: Builder }) {
  const q = useGetEmissionFactors(orgId, { query: { retry: false, queryKey: getGetEmissionFactorsQueryKey(orgId) } });
  const init = seedRows(seed);
  const [notes, setNotes] = useState(init.notes); const [boundary, setBoundary] = useState(init.boundary);
  const [start, setStart] = useState(init.start); const [end, setEnd] = useState(init.end);
  const [method, setMethod] = useState(init.method); const [rows, setRows] = useState<Row[]>(init.rows);
  const [errs, setErrs] = useState<Errors>({});
  const factors = q.data ?? [];
  const upd = (i: number, p: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));

  builder.current = () => {
    const e: Errors = {};
    if (notes.trim().length < 10 || notes.trim().length > 2000) e.notes = "Describe where the activity data came from (10 to 2000 characters).";
    if (boundary.trim().length < 10 || boundary.trim().length > 2000) e.boundary = "Describe the organisational and operational boundary (10 to 2000 characters).";
    if (!isDate(start)) e.start = "Enter a valid start date (YYYY-MM-DD).";
    if (!isDate(end)) e.end = "Enter a valid end date (YYYY-MM-DD).";
    if (!e.start && !e.end && end <= start) e.end = "The end date is exclusive and must be after the start date.";
    if (!method) e.method = "Choose one Scope 2 method. The two methods are never combined.";
    if (rows.length < 1 || rows.length > 100) e.rows = "Provide 1 to 100 activities.";
    const acts: CarbonActivity[] = []; const reds: CarbonReduction[] = [];
    rows.forEach((r, i) => {
      const k = `a${i}`; const f = factors.find((x) => x.id === r.factorId);
      if (r.name.trim().length < 2 || r.name.trim().length > 160) e[`${k}.name`] = "Name must be 2 to 160 characters.";
      if (!f) e[`${k}.factorId`] = "Select a factor."; 
      const qn = parseNum(r.quantity);
      if (qn === null) e[`${k}.quantity`] = "Required."; else if (Number.isNaN(qn) || qn < 0 || qn > 1e12) e[`${k}.quantity`] = "Enter a number from 0 to 1e12.";
      if (r.geography.trim().length < 2 || r.geography.trim().length > 120) e[`${k}.geography`] = "Geography must be 2 to 120 characters.";
      if (!r.scope) e[`${k}.scope`] = "Choose a scope."; else if (!CATEGORIES[r.scope].includes(r.category)) e[`${k}.category`] = "Choose a category for the scope.";
      if (!r.unit) e[`${k}.unit`] = "Choose a unit.";
      if (f) {
        if (r.scope && r.scope !== f.scope) e[`${k}.scope`] = `Factor is ${f.scope}.`;
        if (r.category && r.category !== f.category) e[`${k}.category`] = `Factor category is ${catLabel(f.category)}.`;
        if (r.unit && r.unit !== f.activityUnit && !(ENERGY_UNITS.includes(r.unit) && ENERGY_UNITS.includes(f.activityUnit))) e[`${k}.unit`] = `Factor is per ${f.activityUnit}; only kWh, MWh and GJ convert.`;
        const g = r.geography.trim().toLowerCase();
        if (g && g !== f.geography.toLowerCase() && f.geography.toUpperCase() !== "GLOBAL") e[`${k}.geography`] = `Factor geography is ${f.geography}.`;
        if (!e.start && !e.end && (start < f.validFrom || end > f.validUntil)) e[`${k}.factorId`] = `Period must fit factor validity ${f.validFrom} to ${f.validUntil} (until is exclusive).`;
        if (f.scope === "scope2" && method && f.scope2Method !== method) e[`${k}.factorId`] = `Factor is ${f.scope2Method?.replace("_", "-")}, but ${method.replace("_", "-")} is selected.`;
      }
      const rd = parseNum(r.reduction);
      if (Number.isNaN(rd)) e[`${k}.reduction`] = "Enter a number from 0 to 100, or leave blank.";
      else if (rd !== null && (rd < 0 || rd > 100)) e[`${k}.reduction`] = "Enter a number from 0 to 100.";
      else if (rd !== null && rd > 0) {
        if (r.label.trim().length < 2 || r.label.trim().length > 160) e[`${k}.label`] = "Describe the reduction (2 to 160 characters).";
        else reds.push({ activityIndex: i, label: r.label.trim(), reductionPercent: rd });
      }
      if (qn !== null && !Number.isNaN(qn)) acts.push({ name: r.name.trim(), factorId: r.factorId, quantity: qn, unit: r.unit as CarbonActivity["unit"], geography: r.geography.trim(), scope: r.scope as CarbonActivity["scope"], category: r.category as CarbonActivity["category"] });
    });
    setErrs(e); if (Object.keys(e).length) return null;
    const out: CarbonInputs = { model: "carbon", sourceNotes: notes.trim(), periodStart: start, periodEnd: end, boundary: boundary.trim(), scope2Method: method as CarbonInputs["scope2Method"], activities: acts, reductions: reds };
    return out;
  };

  if (q.isLoading) return <Skeleton label="Loading emission factors" />;
  if (q.isError) return <Alert testId="error-form-factors">{apiMessage(q.error, "Could not load emission factors.")} <button type="button" className="font-bold underline" onClick={() => q.refetch()}>Retry</button></Alert>;
  if (factors.length === 0) return <div data-testid="cta-create-factor"><Alert tone="info">This organisation has no emission factors. Every activity needs a factor with a source and validity period, and none are pre-loaded. <a href="#factors-h" className="font-bold text-[#168568] underline">Create a factor first</a>.</Alert></div>;

  return (
    <div className="min-w-0 space-y-6">
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field label="REPORTING PERIOD START (INCLUSIVE)" hint="YYYY-MM-DD" error={errs.start}>{(p) => <input id={p.id} className={INPUT} value={start} disabled={disabled} onChange={(e) => setStart(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-period-start" />}</Field>
        <Field label="REPORTING PERIOD END (EXCLUSIVE)" hint="YYYY-MM-DD, the first day after the period." error={errs.end}>{(p) => <input id={p.id} className={INPUT} value={end} disabled={disabled} onChange={(e) => setEnd(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-period-end" />}</Field>
      </div>
      <Field label="BOUNDARY" hint="Entities, sites and operations included and excluded." error={errs.boundary}>{(p) => <textarea id={p.id} rows={2} className={INPUT} value={boundary} onChange={(e) => setBoundary(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-boundary" />}</Field>
      <Field label="SCOPE 2 METHOD" hint="Only the chosen method is reported. Location-based and market-based results are not combined." error={errs.method}>{(p) => <select id={p.id} className={INPUT} value={method} onChange={(e) => setMethod(e.target.value)} data-testid="select-scope2-method"><option value="">Select a method</option><option value="location_based">Location-based</option><option value="market_based">Market-based</option></select>}</Field>
      <Field label="SOURCE NOTES" hint="Where the quantities came from (bills, meters, logs)." error={errs.notes}>{(p) => <textarea id={p.id} rows={2} className={INPUT} value={notes} onChange={(e) => setNotes(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-source-notes" />}</Field>

      <div className="space-y-4" data-testid="list-activities">
        <h3 className="font-bold text-[#10243a]">Activities ({rows.length} of 100)</h3>
        {errs.rows && <Alert>{errs.rows}</Alert>}
        {rows.map((r, i) => {
          const k = `a${i}`; const f = factors.find((x) => x.id === r.factorId);
          const unitOpts = f ? (ENERGY_UNITS.includes(f.activityUnit) ? ENERGY_UNITS : [f.activityUnit]) : [...UNITS];
          return (
            <fieldset key={i} className="min-w-0 space-y-4 border border-[#dce3e8] bg-[#f8fafb] p-4" data-testid={`row-activity-${i}`}>
              <legend className="px-2 text-xs font-bold text-[#34495a]">ACTIVITY {i + 1}</legend>
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <Field label="NAME" error={errs[`${k}.name`]}>{(p) => <input id={p.id} className={INPUT} value={r.name} onChange={(e) => upd(i, { name: e.target.value })} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid={`input-activity-name-${i}`} />}</Field>
                <Field label="EMISSION FACTOR" error={errs[`${k}.factorId`]}>{(p) => (
                  <select id={p.id} className={INPUT} value={r.factorId} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid={`select-activity-factor-${i}`}
                    onChange={(e) => { const nf = factors.find((x) => x.id === e.target.value); upd(i, nf ? { factorId: nf.id, unit: nf.activityUnit, geography: nf.geography, scope: nf.scope, category: nf.category } : { factorId: "" }); }}>
                    <option value="">Select a factor</option>
                    {factors.map((x) => <option key={x.id} value={x.id}>{x.code} v{x.version}: {x.name} ({x.value} {x.emissionUnit}/{x.activityUnit})</option>)}
                  </select>)}</Field>
              </div>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="QUANTITY" error={errs[`${k}.quantity`]}>{(p) => <input id={p.id} inputMode="decimal" className={INPUT} value={r.quantity} onChange={(e) => upd(i, { quantity: e.target.value })} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid={`input-activity-quantity-${i}`} />}</Field>
                <Field label="UNIT" error={errs[`${k}.unit`]}>{(p) => <select id={p.id} className={INPUT} value={r.unit} onChange={(e) => upd(i, { unit: e.target.value })} data-testid={`select-activity-unit-${i}`}><option value="">Select</option>{unitOpts.map((u) => <option key={u}>{u}</option>)}</select>}</Field>
                <Field label="GEOGRAPHY" error={errs[`${k}.geography`]}>{(p) => <input id={p.id} className={INPUT} value={r.geography} onChange={(e) => upd(i, { geography: e.target.value })} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid={`input-activity-geography-${i}`} />}</Field>
                <Field label="REDUCTION % (OPTIONAL)" hint="Blank means no reduction." error={errs[`${k}.reduction`]}>{(p) => <input id={p.id} inputMode="decimal" className={INPUT} value={r.reduction} onChange={(e) => upd(i, { reduction: e.target.value })} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid={`input-activity-reduction-${i}`} />}</Field>
              </div>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <Field label="SCOPE" error={errs[`${k}.scope`]}>{(p) => <select id={p.id} className={INPUT} value={r.scope} onChange={(e) => upd(i, { scope: e.target.value, category: "" })} data-testid={`select-activity-scope-${i}`}><option value="">Select</option>{SCOPES.map((s) => <option key={s} value={s}>{SCOPE_LABEL[s]}</option>)}</select>}</Field>
                <Field label="CATEGORY" error={errs[`${k}.category`]}>{(p) => <select id={p.id} className={INPUT} value={r.category} disabled={!r.scope} onChange={(e) => upd(i, { category: e.target.value })} data-testid={`select-activity-category-${i}`}><option value="">Select</option>{(CATEGORIES[r.scope] ?? []).map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}</select>}</Field>
              </div>
              {(parseNum(r.reduction) ?? 0) > 0 && <Field label="REDUCTION LABEL" hint="What action produces this reduction?" error={errs[`${k}.label`]}>{(p) => <input id={p.id} className={INPUT} value={r.label} onChange={(e) => upd(i, { label: e.target.value })} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid={`input-activity-label-${i}`} />}</Field>}
              {rows.length > 1 && <Btn tone="danger" testId={`button-remove-activity-${i}`} onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>Remove activity</Btn>}
            </fieldset>);
        })}
        <Btn testId="button-add-activity" disabled={rows.length >= 100} onClick={() => setRows((x) => [...x, blankRow()])}>Add activity</Btn>
      </div>
    </div>
  );
}
