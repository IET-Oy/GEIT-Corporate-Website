import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetEnergyWorkspaceQueryKey, useCommitEnergyImport, usePreviewEnergyImport, type EnergyImport, type EnergyWorkspace } from "@workspace/api-client-react";
import { Download } from "lucide-react";
import { Alert, Field, SubmitButton, WRITE, apiMessage } from "../common";
import { Btn, DemoBadge, Empty, Panel, StateBadge, fmtDate, type Perm } from "./ui";

const MAX = 2 * 1024 * 1024;
function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = () => rej(new Error("The file could not be read."));
    r.readAsDataURL(file);
  });
}

export function ImportsPanel({ orgId, ws, perm, demo }: { orgId: string; ws: EnergyWorkspace; perm: Perm; demo: boolean }) {
  const qc = useQueryClient();
  const preview = usePreviewEnergyImport(WRITE);
  const commit = useCommitEnergyImport(WRITE);
  const meters = ws.meters.filter((m) => m.is_demo === demo);
  const usable = meters.filter((m) => !m.archived && !ws.sites.find((s) => s.id === m.site_id)?.archived);
  const [meterId, setMeterId] = useState("");
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const imports = ws.imports.filter((i) => i.is_demo === demo);
  const base = `/api/platform/energy/${encodeURIComponent(orgId)}`;
  const meterName = (id: string) => ws.meters.find((m) => m.id === id)?.name ?? "Unknown meter";
  const refresh = () => qc.invalidateQueries({ queryKey: getGetEnergyWorkspaceQueryKey(orgId) });
  const canImport = perm.work && !demo;
  const effective = meterId || usable[0]?.id || "";

  async function submit(e: FormEvent) {
    e.preventDefault(); setNotice(null); setFileErr(null);
    const f = fileRef.current?.files?.[0];
    if (!effective) { setFileErr("Choose an active meter."); return; }
    if (!f) { setFileErr("Choose a CSV or .xlsx file."); return; }
    if (!/\.(csv|xlsx)$/i.test(f.name)) { setFileErr("Only .csv and .xlsx files are accepted."); return; }
    if (f.size > MAX) { setFileErr("The file is larger than 2 MiB."); return; }
    setReading(true);
    try {
      const fileBase64 = await toBase64(f);
      preview.mutate({ orgId, data: { meterId: effective, filename: f.name.slice(0, 180), fileBase64 } }, { onSuccess: async (imp) => { setSelected(imp.id); if (fileRef.current) fileRef.current.value = ""; await refresh(); } });
    } catch (x) { setFileErr((x as Error).message); } finally { setReading(false); }
  }
  function doCommit(imp: EnergyImport) {
    setNotice(null);
    commit.mutate({ orgId, id: imp.id, data: {} }, { onSuccess: async (r) => { setNotice(r.message); await refresh(); } });
  }
  const active = imports.find((i) => i.id === selected) ?? imports[0];

  return (
    <div className="space-y-6">
      <Panel id="h-template" title="Templates">
        <p className="text-sm leading-6 text-[#5d707c]">Required headers: <code className="bg-[#f2f5f7] px-1">interval_start</code>, <code className="bg-[#f2f5f7] px-1">interval_end</code>, <code className="bg-[#f2f5f7] px-1">value</code>, <code className="bg-[#f2f5f7] px-1">unit</code>. Timestamps need Z or a UTC offset. Cumulative meter registers are not supported; power values (W, kW, MW) are read as the average over each interval. Maximum 2 MiB and 5,000 rows.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {[["csv", "CSV template"], ["xlsx", "Excel template"], ["demo-csv", "Synthetic demo CSV"]].map(([f, l]) => (
            <a key={f} href={`${base}/template/${f}`} download data-testid={`link-template-${f}`} className="inline-flex min-h-[38px] items-center gap-2 border border-[#10243a] px-4 text-xs font-bold text-[#10243a] hover:bg-[#10243a] hover:text-white"><Download size={14} aria-hidden="true" />{l}</a>
          ))}
        </div>
      </Panel>
      <Panel id="h-upload" title="Upload and validate">
        {!canImport ? <Alert tone="info">{demo ? "Imports are disabled in the synthetic demo view." : "Your role cannot upload readings."}</Alert> : usable.length === 0 ? <Empty title="No active meter to import into">Add a meter (and keep its site active) on the Records tab. Archived sites and meters cannot receive imports until restored.</Empty> : (
          <form onSubmit={submit} noValidate className="space-y-4" aria-label="Upload readings">
            {preview.isError && <Alert testId="error-import">{apiMessage(preview.error)}</Alert>}
            {fileErr && <Alert testId="error-file">{fileErr}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="METER">{(p) => <select id={p.id} className="form-input" value={effective} onChange={(e) => setMeterId(e.target.value)} data-testid="select-import-meter">{usable.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}</Field>
              <Field label="FILE (CSV OR XLSX)">{(p) => <input id={p.id} ref={fileRef} type="file" accept=".csv,.xlsx" className="form-input pt-2.5" data-testid="input-import-file" />}</Field>
            </div>
            <SubmitButton pending={preview.isPending || reading} testId="button-preview-import">Validate file</SubmitButton>
            <p className="text-xs text-[#6b7b87]">Validation stores a preview. Nothing is added to the meter until you commit a preview with no errors.</p>
          </form>
        )}
      </Panel>
      <Panel id="h-history" title="Import history">
        {notice && <div className="mb-4"><Alert tone="success" testId="status-commit">{notice}</Alert></div>}
        {commit.isError && <div className="mb-4"><Alert testId="error-commit">{apiMessage(commit.error)}</Alert></div>}
        {imports.length === 0 ? <Empty title="No imports yet">Validated files and their error messages are kept here, and a clean preview can be committed after a reload.</Empty> : (
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <ul className="divide-y divide-[#edf0f2] border border-[#edf0f2]" data-testid="list-imports">
              {imports.map((i) => (
                <li key={i.id}><button type="button" onClick={() => setSelected(i.id)} aria-pressed={active?.id === i.id} data-testid={`button-import-${i.id}`} className={`block w-full px-4 py-3 text-left hover:bg-[#f2f5f7] ${active?.id === i.id ? "bg-[#e8f2ef]" : ""}`}>
                  <span className="block truncate text-sm font-semibold text-[#10243a]">{i.filename}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6b7b87]">{meterName(i.meter_id)} · {fmtDate(i.created_at)} <StateBadge tone={i.status === "committed" ? "good" : i.errors.length ? "warn" : "neutral"}>{i.status.toUpperCase()}</StateBadge>{i.is_demo && <DemoBadge />}</span>
                </button></li>
              ))}
            </ul>
            {active && (
              <div className="border border-[#edf0f2] p-4" data-testid="detail-import">
                <h3 className="font-bold text-[#10243a]">{active.filename}</h3>
                <dl className="mt-3 grid grid-cols-3 gap-px bg-[#dce3e8] text-center">
                  {[["ROWS", active.row_count], ["VALID", active.valid_count], ["ERRORS", active.errors.length]].map(([l, v]) => <div key={l} className="bg-white p-3"><dt className="text-[10px] font-bold tracking-[.12em] text-[#6b7b87]">{l}</dt><dd className="text-xl font-extrabold text-[#10243a]">{v}</dd></div>)}
                </dl>
                {active.errors.length > 0 ? (
                  <div className="mt-4"><p className="text-sm font-semibold text-[#9b2c1b]">Fix these rows and upload again. A preview with errors cannot be committed.</p>
                    <div className="mt-2 max-h-64 overflow-auto border border-[#edf0f2]"><table className="w-full text-left text-xs"><caption className="sr-only">Import errors</caption><thead className="sticky top-0 bg-[#f2f5f7]"><tr><th scope="col" className="px-3 py-2">Row</th><th scope="col" className="px-3 py-2">Message</th></tr></thead><tbody>{active.errors.map((er, k) => <tr key={k} className="border-t border-[#edf0f2]"><td className="px-3 py-2 font-mono">{er.row}</td><td className="px-3 py-2">{er.message}</td></tr>)}</tbody></table></div></div>
                ) : active.status === "preview" ? <p className="mt-4 text-sm text-[#1c5946]">No errors. Committing adds all {active.valid_count} readings at once; duplicates and overlapping intervals are rejected.</p> : <p className="mt-4 text-sm text-[#1c5946]">These readings are committed.</p>}
                {active.status === "preview" && active.errors.length === 0 && canImport && <div className="mt-4"><Btn tone="primary" testId="button-commit-import" disabled={commit.isPending} onClick={() => doCommit(active)}>{commit.isPending ? "Committing" : "Commit readings"}</Btn></div>}
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
