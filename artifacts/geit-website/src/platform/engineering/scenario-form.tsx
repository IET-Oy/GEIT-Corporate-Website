import { useState, type ChangeEvent } from "react";
import { Plus, Trash2, Download, Upload } from "lucide-react";
import { Field } from "../common";
import { Btn } from "../energy/ui";
import { CSV_HEADER, MEASURE_SPECS, MONTHS, SCALARS, blankMeasure, cu, parseCsv, type Errors, type FormState, type Model, type Spec } from "./model-forms";

const inp = "form-input min-w-0";
type Setter = (f: (s: FormState) => FormState) => void;

function Num({ sp, value, onChange, error, cur, testId, disabled, label }: { sp: Spec; value: string; onChange: (v: string) => void; error?: string; cur: string; testId: string; disabled: boolean; label?: string }) {
  const unit = cu(sp.unit, cur);
  return (
    <Field label={`${label ?? sp.label} (${unit})`.toUpperCase()} hint={sp.hint} error={error}>
      {(p) => <input id={p.id} type="text" inputMode="decimal" autoComplete="off" className={inp} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid={testId} />}
    </Field>
  );
}

export function ScenarioForm({ model, st, setSt, errors, cur, disabled }: { model: Model; st: FormState; setSt: Setter; errors: Errors; cur: string; disabled: boolean }) {
  const setV = (k: string, val: string) => setSt((s) => ({ ...s, v: { ...s.v, [k]: val } }));
  const specs = SCALARS[model].map((sp) => sp.key === "baselineEnergy" || sp.key === "proposedEnergy" ? { ...sp, unit: st.v.energyUnit || "kWh" } : sp);
  const [csvNote, setCsvNote] = useState<string | null>(null);
  const parsed = model === "battery" ? parseCsv(st.csv) : null;

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 2_000_000) { setCsvNote("File is larger than 2 MB."); return; }
    const text = await f.text(); setSt((s) => ({ ...s, csv: text })); setCsvNote(`Loaded ${f.name}.`); e.target.value = "";
  }
  function template() {
    const url = URL.createObjectURL(new Blob([CSV_HEADER + "\n"], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "battery-intervals-template.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="min-w-0 space-y-6">
      {model === "consulting" && (
        <Field label="ENERGY UNIT" hint="Applies to baseline and proposed annual energy.">{(p) => (
          <select id={p.id} className={inp} value={st.v.energyUnit} disabled={disabled} onChange={(e) => setV("energyUnit", e.target.value)} data-testid="select-energy-unit">{["kWh", "MWh", "GJ"].map((u) => <option key={u}>{u}</option>)}</select>)}</Field>
      )}
      {model === "battery" && (
        <p className="border-l-2 border-[#e8b64b] pl-3 text-xs text-[#5d707c]">Units are fixed: energy in kWh, power in kW.</p>
      )}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        {specs.map((sp) => <Num key={sp.key} sp={sp} value={st.v[sp.key] ?? ""} onChange={(x) => setV(sp.key, x)} error={errors[sp.key]} cur={cur} disabled={disabled} testId={`input-${sp.key}`} />)}
      </div>

      {model === "battery" && (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Field label="DISPATCH MODE" hint="Greedy rule, solar-only charging. No grid charging and no optimiser.">{(p) => (
            <select id={p.id} className={inp} value={st.v.dispatchMode} disabled={disabled} onChange={(e) => setV("dispatchMode", e.target.value)} data-testid="select-dispatch-mode">
              <option value="self_consumption">Self consumption</option><option value="peak_shaving">Peak shaving</option></select>)}</Field>
          {st.v.dispatchMode === "peak_shaving" && <Num sp={{ key: "gridTargetKw", label: "Grid import target", unit: "kW", hint: "Required for peak shaving." }} value={st.v.gridTargetKw ?? ""} onChange={(x) => setV("gridTargetKw", x)} error={errors.gridTargetKw} cur={cur} disabled={disabled} testId="input-gridTargetKw" />}
        </div>
      )}

      {model === "auditing" && (
        <fieldset className="min-w-0 space-y-4" aria-describedby="measures-note">
          <legend className="text-sm font-bold text-[#10243a]">Measures ({st.measures.length} of 30)</legend>
          <p id="measures-note" className="text-xs text-[#6b7b87]">One row per equipment group. Power is per unit; annual energy = quantity x power x hours.</p>
          {errors.measures && <p className="text-xs font-semibold text-[#9b2c1b]">{errors.measures}</p>}
          {st.measures.map((m, i) => {
            const set = (k: string, val: string) => setSt((s) => ({ ...s, measures: s.measures.map((x, j) => (j === i ? { ...x, [k]: val } : x)) }));
            return (
              <div key={i} className="min-w-0 border border-[#dce3e8] bg-[#f8fafb] p-4" data-testid={`row-measure-${i}`}>
                <div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold text-[#34495a]">MEASURE {i + 1}</span>
                  <Btn tone="danger" testId={`button-remove-measure-${i}`} disabled={disabled || st.measures.length <= 1} onClick={() => setSt((s) => ({ ...s, measures: s.measures.filter((_, j) => j !== i) }))}><Trash2 size={13} aria-hidden="true" />Remove</Btn></div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="NAME" error={errors[`m.${i}.name`]}>{(p) => <input id={p.id} className={inp} value={m.name} disabled={disabled} onChange={(e) => set("name", e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid={`input-measure-${i}-name`} />}</Field>
                  <Field label="POWER UNIT">{(p) => <select id={p.id} className={inp} value={m.powerUnit} disabled={disabled} onChange={(e) => set("powerUnit", e.target.value)} data-testid={`select-measure-${i}-powerUnit`}><option>W</option><option>kW</option></select>}</Field>
                  {MEASURE_SPECS.map((sp) => <Num key={sp.key} sp={{ ...sp, unit: sp.unit === "power unit" ? m.powerUnit : sp.unit }} value={m[sp.key] ?? ""} onChange={(x) => set(sp.key, x)} error={errors[`m.${i}.${sp.key}`]} cur={cur} disabled={disabled} testId={`input-measure-${i}-${sp.key}`} />)}
                </div>
              </div>
            );
          })}
          <Btn testId="button-add-measure" disabled={disabled || st.measures.length >= 30} onClick={() => setSt((s) => ({ ...s, measures: [...s.measures, blankMeasure()] }))}><Plus size={14} aria-hidden="true" />Add measure</Btn>
        </fieldset>
      )}

      {model === "solar" && (
        <fieldset className="min-w-0 space-y-3">
          <legend className="text-sm font-bold text-[#10243a]">Monthly data</legend>
          <p className="text-xs leading-5 text-[#6b7b87]">Irradiation must be monthly plane-of-array (tilted array plane) irradiation in kWh/m2/month, not horizontal GHI. Demand is monthly site consumption in kWh.</p>
          <div className="min-w-0 overflow-x-auto"><table className="w-full min-w-[520px] text-sm">
            <thead><tr className="text-left text-[11px] font-bold text-[#6b7b87]"><th scope="col" className="py-2 pr-3">MONTH</th><th scope="col" className="pr-3">PLANE-OF-ARRAY IRRADIATION (kWh/m2/month)</th><th scope="col">DEMAND (kWh)</th></tr></thead>
            <tbody>{st.months.map((m, i) => {
              const set = (k: string, val: string) => setSt((s) => ({ ...s, months: s.months.map((x, j) => (j === i ? { ...x, [k]: val } : x)) }));
              return (<tr key={i} className="align-top border-t border-[#edf0f2]"><th scope="row" className="py-2 pr-3 text-left font-semibold">{MONTHS[i]}</th>
                {(["irradiationKwhM2", "demandKwh"] as const).map((k) => (<td key={k} className="py-1.5 pr-3">
                  <input aria-label={`${MONTHS[i]} ${k === "demandKwh" ? "demand in kWh" : "plane-of-array irradiation in kWh per square metre"}`} inputMode="decimal" className={inp} value={m[k]} disabled={disabled} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[`mo.${i}.${k}`]} data-testid={`input-month-${i + 1}-${k}`} />
                  {errors[`mo.${i}.${k}`] && <p className="mt-1 text-xs font-semibold text-[#9b2c1b]">{errors[`mo.${i}.${k}`]}</p>}</td>))}</tr>);
            })}</tbody></table></div>
        </fieldset>
      )}

      {model === "battery" && parsed && (
        <fieldset className="min-w-0 space-y-3">
          <legend className="text-sm font-bold text-[#10243a]">Interval data (1 to 1000 rows)</legend>
          <p className="text-xs leading-5 text-[#6b7b87]">Plain comma-separated text, no quotes, one header line exactly: <code className="break-all bg-[#edf0f2] px-1">{CSV_HEADER}</code>. start and end are ISO 8601 with Z or an offset; energies are kWh per interval; rates are {cur}/kWh. Intervals must be contiguous, in order and at most 24 hours in total; the server checks this on save.</p>
          <div className="flex flex-wrap gap-3">
            <Btn testId="button-download-template" onClick={template}><Download size={14} aria-hidden="true" />Blank template</Btn>
            <label className={`inline-flex min-h-[38px] cursor-pointer items-center gap-2 border border-[#10243a] px-4 text-xs font-bold text-[#10243a] hover:bg-[#10243a] hover:text-white ${disabled ? "pointer-events-none opacity-50" : ""}`}><Upload size={14} aria-hidden="true" />Upload CSV
              <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={upload} disabled={disabled} data-testid="input-csv-file" /></label>
          </div>
          {csvNote && <p role="status" className="text-xs text-[#1c5946]">{csvNote}</p>}
          <Field label="PASTE INTERVAL CSV" error={errors.csv}>{(p) => <textarea id={p.id} rows={8} spellCheck={false} className={`${inp} font-mono text-xs`} wrap="off" value={st.csv} disabled={disabled} onChange={(e) => setSt((s) => ({ ...s, csv: e.target.value }))} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-intervals-csv" />}</Field>
          {st.csv.trim() && (
            <div className="min-w-0" data-testid="preview-intervals">
              <p className="text-xs font-bold text-[#34495a]">{parsed.rows.length} valid row{parsed.rows.length === 1 ? "" : "s"}{parsed.errors.length ? `, ${parsed.errors.length} problem${parsed.errors.length === 1 ? "" : "s"}` : ""}</p>
              {parsed.errors.length > 0 && <ul className="mt-1 list-disc pl-5 text-xs text-[#9b2c1b]" data-testid="list-csv-errors">{parsed.errors.slice(0, 8).map((x, i) => <li key={i}>{x}</li>)}{parsed.errors.length > 8 && <li>and {parsed.errors.length - 8} more</li>}</ul>}
              {parsed.rows.length > 0 && <div className="mt-2 max-h-56 overflow-auto border border-[#dce3e8]"><table className="w-full min-w-[560px] text-xs"><caption className="sr-only">First rows of parsed intervals</caption>
                <thead className="sticky top-0 bg-[#f2f5f7]"><tr>{CSV_HEADER.split(",").map((h) => <th key={h} scope="col" className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
                <tbody>{parsed.rows.slice(0, 10).map((r, i) => <tr key={i} className="border-t border-[#edf0f2]">{Object.values(r).map((c, j) => <td key={j} className="px-2 py-1 whitespace-nowrap">{String(c)}</td>)}</tr>)}</tbody></table></div>}
            </div>)}
        </fieldset>
      )}

      <Field label="SOURCE NOTES (REQUIRED)" hint="Where did these figures come from: meter, audit report, quote, design file, assumption. At least 10 characters. Not filled in for you." error={errors.sourceNotes}>
        {(p) => <textarea id={p.id} rows={3} maxLength={2000} className={inp} value={st.v.sourceNotes} disabled={disabled} onChange={(e) => setV("sourceNotes", e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-source-notes" />}</Field>
    </div>
  );
}
