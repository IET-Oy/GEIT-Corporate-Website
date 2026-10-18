import { type EngineeringModule, type EngineeringScenario } from "@workspace/api-client-react";
import { Alert } from "../common";
import { Panel, StateBadge, fmtDate } from "../energy/ui";
import { ReportDownloads } from "./report-downloads";


export function fmtVal(v: number | string | null | undefined, unit = ""): string {
  if (v === null || v === undefined) return "Unavailable";
  if (typeof v === "string") return v;
  if (!Number.isFinite(v)) return "Unavailable";
  const s = v.toLocaleString("en-GB", { maximumFractionDigits: 2 });
  return unit ? `${s} ${unit}` : s;
}

export function ResultView({ org, module, sc }: { org: string; module: EngineeringModule; sc: EngineeringScenario }) {
  const r = sc.result; const p = sc.projectSnapshot;
  return (
    <div className="min-w-0 space-y-6" data-testid="result-view">
      <Panel id="res-h" title={`Results: ${sc.name}`} action={<StateBadge tone="good">SAVED {fmtDate(sc.created_at).toUpperCase()}</StateBadge>}>
        <dl className="grid gap-px bg-[#d0dce1] sm:grid-cols-2 xl:grid-cols-3" data-testid="list-metrics">
          {r.metrics.map((m) => (
            <div key={m.key} className="min-w-0 bg-white p-4" data-testid={`metric-${m.key}`}>
              <dt className="text-[10px] font-bold tracking-[.12em] text-[#6b7b87]">{m.label.toUpperCase()}</dt>
              <dd className="mt-2 break-words text-2xl font-extrabold text-[#10243a]">{m.value === null ? <span className="text-base text-[#6b7b87]">Unavailable</span> : <>{fmtVal(m.value)} <span className="text-sm font-semibold text-[#168568]">{m.unit}</span></>}</dd>
              <p className="mt-1 text-xs leading-5 text-[#5d707c]">{m.description}</p>
            </div>))}
        </dl>
        {r.warnings.length > 0 && <div className="mt-5 space-y-2" data-testid="list-warnings">{r.warnings.map((w, i) => <div key={i} className="border-l-4 border-[#e8b64b] bg-[#fdf4dc] px-4 py-2 text-sm text-[#5c4410]">{w}</div>)}</div>}
        <ReportDownloads key={`${org}:${module}:${sc.id}`} org={org} module={module} id={sc.id} />
      </Panel>
      {r.tables.map((t, ti) => (
        <section key={ti} className="min-w-0 border border-[#dce3e8] bg-white" data-testid={`table-result-${ti}`}>
          <h3 className="border-b border-[#edf0f2] px-5 py-3 font-bold text-[#10243a]">{t.title}</h3>
          <div className="max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label={`${t.title} table, scrollable`}>
            <table className="w-full min-w-[480px] text-sm">
              <thead><tr className="bg-[#f2f5f7] text-left text-[11px] font-bold text-[#34495a]">{t.columns.map((c) => <th key={c.key} scope="col" className="px-4 py-2 whitespace-nowrap">{c.label}{c.unit ? ` (${c.unit})` : ""}</th>)}</tr></thead>
              <tbody>{t.rows.map((row, ri) => <tr key={ri} className="border-t border-[#edf0f2]">{t.columns.map((c, ci) => { const x = row[c.key]; return ci === 0 ? <th key={c.key} scope="row" className="px-4 py-2 text-left font-semibold">{fmtVal(x)}</th> : <td key={c.key} className="px-4 py-2 text-right tabular-nums whitespace-nowrap">{fmtVal(x)}</td>; })}</tr>)}</tbody>
            </table></div>
        </section>))}
      <Panel id="trans-h" title="Transparency">
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <div><h3 className="text-sm font-bold text-[#10243a]">Formulas</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm break-words text-[#34495a]" data-testid="list-formulas">{r.formulas.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          <div><h3 className="text-sm font-bold text-[#10243a]">Assumptions</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm break-words text-[#34495a]" data-testid="list-assumptions">{r.assumptions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
        </div>
        <dl className="mt-6 grid min-w-0 gap-3 text-xs sm:grid-cols-2">
          <div className="min-w-0"><dt className="font-bold text-[#6b7b87]">ENGINE VERSION</dt><dd data-testid="text-version">{r.version}</dd></div>
          <div className="min-w-0"><dt className="font-bold text-[#6b7b87]">INPUT HASH</dt><dd className="break-all font-mono" data-testid="text-input-hash">{sc.inputHash}</dd></div>
          <div className="min-w-0 sm:col-span-2"><dt className="font-bold text-[#6b7b87]">PROJECT AT SAVE TIME</dt><dd className="break-words" data-testid="text-snapshot">{p.name}, {p.facility}, {p.currency}, {p.status}{p.archived ? ", archived" : ""}. {p.brief}</dd></div>
          <div className="min-w-0 sm:col-span-2"><dt className="font-bold text-[#6b7b87]">DATA PROVENANCE (SOURCE NOTES)</dt><dd className="whitespace-pre-wrap break-words" data-testid="text-source-notes">{sc.inputs.sourceNotes}</dd></div>
        </dl>
        {r.provenance && <details className="mt-5 border border-[#dce3e8]" data-testid="details-provenance"><summary className="cursor-pointer px-4 py-2 text-sm font-bold text-[#10243a]">Provenance snapshot (read only)</summary>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words bg-[#f8fafb] p-4 text-xs" tabIndex={0}>{JSON.stringify(r.provenance, null, 2)}</pre></details>}
        <details className="mt-5 border border-[#dce3e8]" data-testid="details-inputs"><summary className="cursor-pointer px-4 py-2 text-sm font-bold text-[#10243a]">Saved inputs (read only)</summary>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words bg-[#f8fafb] p-4 text-xs" tabIndex={0}>{JSON.stringify(sc.inputs, null, 2)}</pre></details>
      </Panel>
    </div>
  );
}

export function CompareView({ a, b }: { a: EngineeringScenario; b: EngineeringScenario }) {
  const keys = Array.from(new Set([...a.result.metrics, ...b.result.metrics].map((m) => m.key)));
  const find = (s: EngineeringScenario, k: string) => s.result.metrics.find((m) => m.key === k);
  return (
    <Panel id="cmp-h" title="Compare saved scenarios">
      {a.projectSnapshot.currency !== b.projectSnapshot.currency && <div className="mb-3"><Alert tone="info">These scenarios were saved in different currencies; monetary values are not directly comparable.</Alert></div>}
      <div className="max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label="Comparison table, scrollable"><table className="w-full min-w-[520px] text-sm" data-testid="table-compare">
        <thead><tr className="bg-[#f2f5f7] text-left text-[11px] font-bold"><th scope="col" className="px-3 py-2">METRIC</th><th scope="col" className="px-3 py-2">{a.name}</th><th scope="col" className="px-3 py-2">{b.name}</th></tr></thead>
        <tbody>{keys.map((k) => { const x = find(a, k), y = find(b, k); return <tr key={k} className="border-t border-[#edf0f2]"><th scope="row" className="px-3 py-2 text-left font-semibold">{(x ?? y)!.label}</th><td className="px-3 py-2 tabular-nums">{x ? fmtVal(x.value, x.unit) : "Unavailable"}</td><td className="px-3 py-2 tabular-nums">{y ? fmtVal(y.value, y.unit) : "Unavailable"}</td></tr>; })}</tbody></table></div>
    </Panel>
  );
}
