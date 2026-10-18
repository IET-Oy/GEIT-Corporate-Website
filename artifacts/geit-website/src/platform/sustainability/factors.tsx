import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetEmissionFactorsQueryKey, useCreateEmissionFactor, useGetEmissionFactors, type EmissionFactor, type EmissionFactorInput } from "@workspace/api-client-react";
import { Alert, Field, Skeleton, SubmitButton, WRITE, apiMessage } from "../common";
import { Btn, Empty, Panel, StateBadge } from "../energy/ui";
import { CATEGORIES, SCOPES, SCOPE_LABEL, UNITS, catLabel, isDate, parseNum, INPUT, type Errors } from "./utils";

function safeHttps(u: string): string | null { try { const x = new URL(u); return x.protocol === "https:" ? x.href : null; } catch { return null; } }

type F = { code: string; name: string; source: string; sourceUrl: string; geography: string; activityUnit: string; emissionUnit: string; value: string; validFrom: string; validUntil: string; scope: string; category: string; scope2Method: string; gwpBasis: string };
const blank: F = { code: "", name: "", source: "", sourceUrl: "https://", geography: "", activityUnit: "", emissionUnit: "", value: "", validFrom: "", validUntil: "", scope: "", category: "", scope2Method: "", gwpBasis: "" };
const fromFactor = (f: EmissionFactor): F => ({ code: f.code, name: f.name, source: f.source, sourceUrl: f.sourceUrl, geography: f.geography, activityUnit: f.activityUnit, emissionUnit: f.emissionUnit, value: String(f.value), validFrom: f.validFrom, validUntil: f.validUntil, scope: f.scope, category: f.category, scope2Method: f.scope2Method ?? "", gwpBasis: f.gwpBasis });

export function FactorsPanel({ orgId, canWrite }: { orgId: string; canWrite: boolean }) {
  const q = useGetEmissionFactors(orgId, { query: { retry: false, queryKey: getGetEmissionFactorsQueryKey(orgId) } });
  const [open, setOpen] = useState<{ seed: F; from: string | null } | null>(null);
  const factors = [...(q.data ?? [])].sort((a, b) => a.code.localeCompare(b.code) || b.version - a.version);
  return (
    <Panel id="factors-h" title="Emission factors" action={canWrite ? <Btn tone="primary" testId="button-new-factor" onClick={() => setOpen({ seed: blank, from: null })}>Add factor</Btn> : undefined}>
      <p className="mb-4 max-w-3xl text-xs leading-5 text-[#5d707c]">Factors are references you supply, with their source and validity period. They are <strong>user-supplied references, not independently verified</strong> by GEIT. Each version is immutable; to revise a factor, start a new version with the same code and the server numbers it.</p>
      {q.isLoading && <Skeleton label="Loading emission factors" />}
      {q.isError && <div data-testid="error-factors"><Alert>{apiMessage(q.error, "Could not load emission factors.")} <button type="button" className="font-bold underline" onClick={() => q.refetch()}>Retry</button></Alert></div>}
      {open && canWrite && <div className="mb-5 border-b border-[#edf0f2] pb-5"><FactorForm key={open.from ?? "new"} orgId={orgId} seed={open.seed} from={open.from} onDone={() => setOpen(null)} /></div>}
      {q.data && factors.length === 0 && !open && <Empty title="No emission factors yet">{canWrite ? "Add a factor with its source, geography, units and validity period before building a footprint. No factors are pre-loaded." : "An administrator or analyst must add factors before a footprint can be calculated."}</Empty>}
      {factors.length > 0 && (
        <div className="max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label="Emission factors, scrollable">
          <table className="w-full min-w-[860px] text-sm" data-testid="table-factors">
            <thead><tr className="bg-[#f2f5f7] text-left text-[11px] font-bold text-[#34495a]">{["CODE / VERSION", "NAME", "SCOPE / CATEGORY", "FACTOR", "GEOGRAPHY", "VALID (from incl., until excl.)", "SOURCE", ""].map((h) => <th key={h} scope="col" className="px-3 py-2 whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>{factors.map((f) => (
              <tr key={f.id} className="border-t border-[#edf0f2] align-top" data-testid={`row-factor-${f.id}`}>
                <th scope="row" className="px-3 py-2 text-left font-mono text-xs">{f.code} <StateBadge>V{f.version}</StateBadge></th>
                <td className="px-3 py-2">{f.name}<div className="mt-1"><StateBadge tone="warn">USER-SUPPLIED, UNVERIFIED</StateBadge></div></td>
                <td className="px-3 py-2">{SCOPE_LABEL[f.scope]}<div className="text-xs text-[#6b7b87]">{catLabel(f.category)}{f.scope2Method ? `, ${f.scope2Method.replace("_", "-")}` : ""}</div></td>
                <td className="px-3 py-2 tabular-nums whitespace-nowrap">{f.value.toLocaleString("en-GB", { maximumFractionDigits: 6 })} {f.emissionUnit} per {f.activityUnit}<div className="text-xs text-[#6b7b87]">{f.gwpBasis}</div></td>
                <td className="px-3 py-2">{f.geography}</td>
                <td className="px-3 py-2 whitespace-nowrap">{f.validFrom} to {f.validUntil}</td>
                <td className="max-w-[260px] px-3 py-2 break-words text-xs">{f.source}<br />{safeHttps(f.sourceUrl) ? <a href={safeHttps(f.sourceUrl)!} target="_blank" rel="noopener noreferrer" className="font-bold text-[#168568] underline">Source link</a> : <span className="text-[#9b2c1b]">Source link withheld (not a valid HTTPS URL)</span>}</td>
                <td className="px-3 py-2">{canWrite && <Btn testId={`button-new-version-${f.id}`} onClick={() => setOpen({ seed: fromFactor(f), from: f.id })}>New version</Btn>}</td>
              </tr>))}</tbody>
          </table>
        </div>)}
    </Panel>
  );
}

function FactorForm({ orgId, seed, from, onDone }: { orgId: string; seed: F; from: string | null; onDone: () => void }) {
  const qc = useQueryClient(); const create = useCreateEmissionFactor(WRITE);
  const [f, setF] = useState<F>(seed); const [errs, setErrs] = useState<Errors>({});
  const set = (k: keyof F, v: string) => setF((p) => ({ ...p, [k]: v }));
  function submit(e: FormEvent) {
    e.preventDefault(); const x: Errors = {};
    const code = f.code.trim();
    if (!/^[A-Z0-9_-]{2,64}$/.test(code)) x.code = "Use 2 to 64 characters: capital letters, digits, underscore or hyphen.";
    if (f.name.trim().length < 2 || f.name.trim().length > 160) x.name = "Name must be 2 to 160 characters.";
    if (f.source.trim().length < 10 || f.source.trim().length > 1000) x.source = "Describe the source in 10 to 1000 characters.";
    if (!/^https:\/\//.test(f.sourceUrl.trim()) || f.sourceUrl.trim().length > 1000) x.sourceUrl = "Enter an https:// link to the source.";
    if (f.geography.trim().length < 2 || f.geography.trim().length > 120) x.geography = "Geography must be 2 to 120 characters (use GLOBAL if worldwide).";
    if (!f.activityUnit) x.activityUnit = "Choose the activity unit.";
    if (!f.emissionUnit) x.emissionUnit = "Choose the emission unit.";
    const v = parseNum(f.value);
    if (v === null) x.value = "Required."; else if (Number.isNaN(v) || v < 0 || v > 1e9) x.value = "Enter a number from 0 to 1,000,000,000.";
    if (!isDate(f.validFrom)) x.validFrom = "Enter a valid date (YYYY-MM-DD).";
    if (!isDate(f.validUntil)) x.validUntil = "Enter a valid date (YYYY-MM-DD).";
    if (!x.validFrom && !x.validUntil && f.validUntil <= f.validFrom) x.validUntil = "Must be after the valid-from date.";
    if (!f.scope) x.scope = "Choose a scope.";
    if (f.scope && !CATEGORIES[f.scope].includes(f.category)) x.category = "Choose a category for this scope.";
    if (f.scope === "scope2" && !f.scope2Method) x.scope2Method = "Scope 2 factors must state location-based or market-based.";
    if (f.gwpBasis.trim().length < 5 || f.gwpBasis.trim().length > 160) x.gwpBasis = "State the GWP basis (5 to 160 characters), e.g. the assessment report used.";
    setErrs(x); if (Object.keys(x).length) return;
    const data: EmissionFactorInput = { code, name: f.name.trim(), source: f.source.trim(), sourceUrl: f.sourceUrl.trim(), geography: f.geography.trim(), activityUnit: f.activityUnit as EmissionFactorInput["activityUnit"], emissionUnit: f.emissionUnit as EmissionFactorInput["emissionUnit"], value: v as number, validFrom: f.validFrom, validUntil: f.validUntil, scope: f.scope as EmissionFactorInput["scope"], category: f.category as EmissionFactorInput["category"], scope2Method: f.scope === "scope2" ? (f.scope2Method as "location_based" | "market_based") : null, gwpBasis: f.gwpBasis.trim() };
    create.mutate({ orgId, data }, { onSuccess: async () => { await qc.invalidateQueries({ queryKey: getGetEmissionFactorsQueryKey(orgId) }); onDone(); } });
  }
  const T = (k: keyof F, label: string, hint?: string, ph?: string) => <Field label={label} hint={hint} error={errs[k]}>{(p) => <input id={p.id} className={INPUT} value={f[k]} placeholder={ph} onChange={(e) => set(k, e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid={`input-factor-${k}`} />}</Field>;
  return (
    <form onSubmit={submit} noValidate aria-label="Emission factor" className="min-w-0 space-y-4" data-testid="form-factor">
      <h3 className="font-bold text-[#10243a]">{from ? "New version (copied fields; the server assigns the version number)" : "New emission factor"}</h3>
      {create.isError && <Alert testId="error-factor-save">{apiMessage(create.error)}</Alert>}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">{T("code", "CODE", "Same code means a new version of the same factor.", "GRID_EXAMPLE_2024")}{T("name", "NAME")}</div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">{T("source", "SOURCE (CITATION)", "Publisher, document and year.")}{T("sourceUrl", "SOURCE URL (HTTPS)")}</div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-3">
        {T("geography", "GEOGRAPHY", "Use GLOBAL for worldwide factors.")}
        <Field label="ACTIVITY UNIT" error={errs.activityUnit}>{(p) => <select id={p.id} className={INPUT} value={f.activityUnit} onChange={(e) => set("activityUnit", e.target.value)} data-testid="select-factor-activityUnit"><option value="">Select</option>{UNITS.map((u) => <option key={u}>{u}</option>)}</select>}</Field>
        <Field label="EMISSION UNIT" error={errs.emissionUnit}>{(p) => <select id={p.id} className={INPUT} value={f.emissionUnit} onChange={(e) => set("emissionUnit", e.target.value)} data-testid="select-factor-emissionUnit"><option value="">Select</option><option>kgCO2e</option><option>tCO2e</option></select>}</Field>
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-3">
        {T("value", "FACTOR VALUE", "Emission unit per one activity unit.")}
        {T("validFrom", "VALID FROM (INCLUSIVE)", "YYYY-MM-DD", "2024-01-01")}
        {T("validUntil", "VALID UNTIL (EXCLUSIVE)", "YYYY-MM-DD", "2025-01-01")}
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-3">
        <Field label="SCOPE" error={errs.scope}>{(p) => <select id={p.id} className={INPUT} value={f.scope} onChange={(e) => setF((s) => ({ ...s, scope: e.target.value, category: "", scope2Method: e.target.value === "scope2" ? s.scope2Method : "" }))} data-testid="select-factor-scope"><option value="">Select</option>{SCOPES.map((s) => <option key={s} value={s}>{SCOPE_LABEL[s]}</option>)}</select>}</Field>
        <Field label="CATEGORY" error={errs.category}>{(p) => <select id={p.id} className={INPUT} value={f.category} disabled={!f.scope} onChange={(e) => set("category", e.target.value)} data-testid="select-factor-category"><option value="">Select</option>{(CATEGORIES[f.scope] ?? []).map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}</select>}</Field>
        {f.scope === "scope2" && <Field label="SCOPE 2 METHOD" error={errs.scope2Method}>{(p) => <select id={p.id} className={INPUT} value={f.scope2Method} onChange={(e) => set("scope2Method", e.target.value)} data-testid="select-factor-scope2Method"><option value="">Select</option><option value="location_based">Location-based</option><option value="market_based">Market-based</option></select>}</Field>}
      </div>
      {T("gwpBasis", "GWP BASIS", "For example the IPCC assessment report and time horizon.")}
      <div className="flex flex-wrap gap-3"><SubmitButton pending={create.isPending} testId="button-save-factor">Save factor version</SubmitButton><Btn testId="button-cancel-factor" onClick={onDone}>Cancel</Btn></div>
    </form>
  );
}
