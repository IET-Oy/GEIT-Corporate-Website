import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetEnergyAnalysisQueryKey, getGetEnergyWorkspaceQueryKey, useCreateEnergyAnalysis, type EnergyAnalysis, type EnergyWorkspace } from "@workspace/api-client-react";
import { Alert, Field, SubmitButton, WRITE, apiMessage } from "../common";
import { Empty } from "./ui";

export function AnalysisForm({ orgId, ws, demo, onCreated }: { orgId: string; ws: EnergyWorkspace; demo: boolean; onCreated: (a: EnergyAnalysis) => void }) {
  const qc = useQueryClient();
  const create = useCreateEnergyAnalysis(WRITE);
  const meters = ws.meters.filter((m) => m.is_demo === demo && !m.archived && !ws.sites.find((s) => s.id === m.site_id)?.archived);
  const tariffs = ws.tariffs.filter((t) => t.is_demo === demo && !t.archived);
  const [name, setName] = useState(""); const [meterId, setMeterId] = useState(""); const [tariffId, setTariffId] = useState("");
  const [start, setStart] = useState(""); const [end, setEnd] = useState(""); const [base, setBase] = useState(""); const [target, setTarget] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const mid = meterId || meters[0]?.id || "";

  if (meters.length === 0) return <Empty title="No active meter to analyse">{demo ? "Create the synthetic demo first." : "Add a meter and import readings. Archived sites and meters are excluded until restored."}</Empty>;

  function submit(e: FormEvent) {
    e.preventDefault();
    const x: Record<string, string> = {};
    if (name.trim().length < 2 || name.trim().length > 120) x.name = "Name must be 2 to 120 characters.";
    const s = new Date(start); const en = new Date(end);
    if (!start || Number.isNaN(s.getTime())) x.start = "Choose a start date and time.";
    if (!end || Number.isNaN(en.getTime())) x.end = "Choose an end date and time.";
    if (!x.start && !x.end && en <= s) x.end = "End must be after start.";
    const b = base.trim() ? Number(base) : null; const t = target.trim() ? Number(target) : null;
    if (b !== null && !(b > 0)) x.base = "Baseline must be greater than zero.";
    if (t !== null && !(t >= 0)) x.target = "Target cannot be negative.";
    setErrs(x);
    if (Object.keys(x).length) return;
    create.mutate({ orgId, data: { name: name.trim(), meterId: mid, tariffId: tariffId || null, start: s.toISOString(), end: en.toISOString(), baselineKwh: b, targetKwh: t } }, {
      onSuccess: async (a) => {
        qc.setQueryData(getGetEnergyAnalysisQueryKey(orgId, a.id), a);
        await qc.invalidateQueries({ queryKey: getGetEnergyWorkspaceQueryKey(orgId) });
        onCreated(a);
      },
    });
  }
  return (
    <form onSubmit={submit} noValidate aria-label="Run an analysis" className="space-y-4" data-testid="form-analysis">
      {create.isError && <Alert testId="error-analysis">{apiMessage(create.error)}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ANALYSIS NAME" error={errs.name}>{(p) => <input id={p.id} className="form-input" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-analysis-name" />}</Field>
        <Field label="METER">{(p) => <select id={p.id} className="form-input" value={mid} onChange={(e) => setMeterId(e.target.value)} data-testid="select-analysis-meter">{meters.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}</Field>
        <Field label="PERIOD START" hint="Your browser's local time; sent with an explicit offset." error={errs.start}>{(p) => <input id={p.id} type="datetime-local" className="form-input" value={start} onChange={(e) => setStart(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-analysis-start" />}</Field>
        <Field label="PERIOD END" error={errs.end}>{(p) => <input id={p.id} type="datetime-local" className="form-input" value={end} onChange={(e) => setEnd(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-analysis-end" />}</Field>
        <Field label="TARIFF, OPTIONAL" hint="Without a tariff, cost is shown as unavailable.">{(p) => <select id={p.id} className="form-input" value={tariffId} onChange={(e) => setTariffId(e.target.value)} data-testid="select-analysis-tariff"><option value="">No tariff</option>{tariffs.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.currency})</option>)}</select>}</Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="BASELINE KWH" error={errs.base}>{(p) => <input id={p.id} inputMode="decimal" className="form-input" value={base} onChange={(e) => setBase(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-analysis-baseline" />}</Field>
          <Field label="TARGET KWH" error={errs.target}>{(p) => <input id={p.id} inputMode="decimal" className="form-input" value={target} onChange={(e) => setTarget(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-analysis-target" />}</Field>
        </div>
      </div>
      <SubmitButton pending={create.isPending} testId="button-run-analysis">Run and save analysis</SubmitButton>
    </form>
  );
}
