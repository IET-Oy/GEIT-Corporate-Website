import { useState, type FormEvent } from "react";
import type { EngineeringProject, EngineeringProjectInput } from "@workspace/api-client-react";
import { Alert, Field, SubmitButton, apiMessage } from "../common";
import { Btn } from "../energy/ui";

export function splitBrief(b: string) {
  const m = b.match(/^Problem: ([\s\S]*)\nScope: ([\s\S]*)$/);
  return m ? { problem: m[1], scope: m[2] } : { problem: b, scope: "" };
}
export const joinBrief = (p: string, s: string) => `Problem: ${p.trim()}\nScope: ${s.trim()}`;

export function ProjectForm({ project, locked, pending, error, onSubmit, onCancel }: { project?: EngineeringProject; locked: boolean; pending: boolean; error: unknown; onSubmit: (d: EngineeringProjectInput) => void; onCancel: () => void }) {
  const init = splitBrief(project?.brief ?? "");
  const [name, setName] = useState(project?.name ?? ""); const [facility, setFacility] = useState(project?.facility ?? "");
  const [problem, setProblem] = useState(init.problem); const [scope, setScope] = useState(init.scope);
  const [currency, setCurrency] = useState(project?.currency ?? ""); const [status, setStatus] = useState<EngineeringProjectInput["status"]>(project?.status ?? "draft");
  const [errs, setErrs] = useState<Record<string, string>>({});
  function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim(), f = facility.trim(), p = problem.trim(), s = scope.trim(), c = currency.trim().toUpperCase();
    const x: Record<string, string> = {};
    if (n.length < 2 || n.length > 120) x.name = "Name must be 2 to 120 characters.";
    if (f.length < 2 || f.length > 160) x.facility = "Facility must be 2 to 160 characters.";
    if (p.length < 3) x.problem = "Describe the problem to solve.";
    if (s.length < 3) x.scope = "Describe what is in scope.";
    if (joinBrief(p, s).length > 4000) x.scope = "Problem and scope together must be under 4000 characters.";
    if (!/^[A-Z]{3}$/.test(c)) x.currency = "Use a three-letter ISO code such as RWF or USD.";
    setErrs(x); if (Object.keys(x).length) return;
    onSubmit({ id: project?.id, name: n, facility: f, brief: joinBrief(p, s), currency: c, status, archived: project?.archived ?? false });
  }
  const I = "form-input min-w-0";
  return (
    <form onSubmit={submit} noValidate aria-label={project ? "Edit project" : "New project"} className="min-w-0 space-y-4" data-testid="form-project">
      {!!error && <Alert testId="error-project">{apiMessage(error)}</Alert>}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field label="PROJECT NAME" error={errs.name}>{(q) => <input id={q.id} className={I} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={q.invalid} aria-describedby={q.describedBy} data-testid="input-project-name" />}</Field>
        <Field label="FACILITY" error={errs.facility}>{(q) => <input id={q.id} className={I} value={facility} onChange={(e) => setFacility(e.target.value)} aria-invalid={q.invalid} aria-describedby={q.describedBy} data-testid="input-project-facility" />}</Field>
      </div>
      <Field label="PROBLEM" hint="What needs to be decided or fixed?" error={errs.problem}>{(q) => <textarea id={q.id} rows={2} className={I} value={problem} onChange={(e) => setProblem(e.target.value)} aria-invalid={q.invalid} aria-describedby={q.describedBy} data-testid="input-project-problem" />}</Field>
      <Field label="SCOPE" hint="What is included and excluded?" error={errs.scope}>{(q) => <textarea id={q.id} rows={2} className={I} value={scope} onChange={(e) => setScope(e.target.value)} aria-invalid={q.invalid} aria-describedby={q.describedBy} data-testid="input-project-scope" />}</Field>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field label="CURRENCY (ISO CODE)" hint={locked ? "Locked: this project already has saved scenarios, so its currency cannot change." : "Part of the project. It cannot be changed once a scenario is saved."} error={errs.currency}>{(q) => <input id={q.id} maxLength={3} className={`${I} uppercase disabled:bg-[#edf0f2]`} value={currency} disabled={locked} onChange={(e) => setCurrency(e.target.value)} aria-invalid={q.invalid} aria-describedby={q.describedBy} data-testid="input-project-currency" />}</Field>
        <Field label="STATUS">{(q) => <select id={q.id} className={I} value={status} onChange={(e) => setStatus(e.target.value as typeof status)} data-testid="select-project-status"><option value="draft">Draft</option><option value="active">Active</option><option value="completed">Completed</option></select>}</Field>
      </div>
      <div className="flex flex-wrap gap-3"><SubmitButton pending={pending} testId="button-save-project">{project ? "Save project" : "Create project"}</SubmitButton><Btn testId="button-cancel-project" onClick={onCancel}>Cancel</Btn></div>
    </form>
  );
}
