import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import {
  getGetEngineeringScenarioQueryKey, getGetEngineeringWorkspaceQueryKey, useCreateEngineeringScenario, useGetEngineeringScenario,
  useGetEngineeringWorkspace, useSaveEngineeringProject, type EngineeringProject,
} from "@workspace/api-client-react";
import { platformModules } from "@/config/platform-modules";
import { Alert, Field, Skeleton, SubmitButton, WRITE, apiMessage, apiStatus } from "../common";
import { Btn, Empty, Panel, StateBadge, fmtDate, permsFor } from "../energy/ui";
import { Workspace } from "../workspace";
import { MODULE_MODEL, MODULE_PATH, buildInputs, initialState, stateFromInputs, type EngModule, type Errors, type FormState } from "./model-forms";
import { ProjectForm, splitBrief } from "./project-form";
import { ScenarioForm } from "./scenario-form";
import { CompareView, ResultView } from "./results";

const BRIEFS: Record<EngModule, string> = {
  "energy-consulting": "Compare a baseline and a proposed annual energy use against capital cost, operating change and a discount rate. Every figure is yours; results appear only after you save.",
  "energy-auditing": "Record audit measures such as lighting or motors. Each row converts quantity, power and hours into annual energy and cost effects. Nothing is pre-filled.",
  "renewable-energy": "Screening model: monthly generation = capacity x plane-of-array irradiation x performance ratio. Self-use proxy = min(generation, demand) x coincidence factor. This is not an hourly simulation.",
  "battery-flexibility": "Interval dispatch with a greedy rule: the battery charges from solar surplus only (no grid charging) and discharges by the chosen mode. It is not an optimiser.",
};

export function EngineeringPage({ moduleId }: { moduleId: EngModule }) {
  const mod = platformModules.find((m) => m.id === moduleId)!;
  return <Workspace title={mod.title} path={MODULE_PATH[moduleId]}>{({ org }) => <Body key={`${org.id}:${moduleId}`} orgId={org.id} role={org.role} module={moduleId} title={mod.title} />}</Workspace>;
}

function Body({ orgId, role, module, title }: { orgId: string; role: string; module: EngModule; title: string }) {
  const qc = useQueryClient(); const search = useSearch(); const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const projectId = params.get("project"); const scenarioId = params.get("scenario"); const compareId = params.get("compare");
  const path = MODULE_PATH[module]; const model = MODULE_MODEL[module];
  const canWrite = permsFor(role).work;
  const setParams = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(search); p.set("org", orgId);
    for (const [k, v] of Object.entries(patch)) { if (v) p.set(k, v); else p.delete(k); }
    navigate(`${path}?${p.toString()}`, { replace: true });
  };

  const wsKey = getGetEngineeringWorkspaceQueryKey(orgId, module);
  const ws = useGetEngineeringWorkspace(orgId, module, { query: { retry: false, queryKey: wsKey } });
  const saveProject = useSaveEngineeringProject(WRITE);
  const createScenario = useCreateEngineeringScenario(WRITE);
  const [mode, setMode] = useState<"none" | "new" | "edit">("none");
  const [showArchived, setShowArchived] = useState(false);
  const [st, setSt] = useState<FormState>(() => initialState(model));
  const [errors, setErrors] = useState<Errors>({});
  const [name, setName] = useState(""); const [nameErr, setNameErr] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);

  const projects = ws.data?.projects ?? [];
  const visible = projects.filter((p) => showArchived || !p.archived || p.id === projectId);
  const project = projects.find((p) => p.id === projectId) ?? null;
  const scenarios = (ws.data?.scenarios ?? []).filter((s) => s.project_id === projectId);
  const locked = scenarios.length > 0;

  const detail = useGetEngineeringScenario(orgId, module, scenarioId ?? "", { query: { enabled: !!scenarioId, retry: false, queryKey: getGetEngineeringScenarioQueryKey(orgId, module, scenarioId ?? "") } });
  const cmp = useGetEngineeringScenario(orgId, module, compareId ?? "", { query: { enabled: !!compareId, retry: false, queryKey: getGetEngineeringScenarioQueryKey(orgId, module, compareId ?? "") } });

  const refresh = () => qc.invalidateQueries({ queryKey: wsKey });
  function persist(d: Parameters<typeof saveProject.mutate>[0]["data"], done?: (p: EngineeringProject) => void) {
    saveProject.mutate({ orgId, module, data: d }, { onSuccess: async (p) => { await refresh(); setMode("none"); done?.(p); } });
  }
  const full = (p: EngineeringProject, archived: boolean) => ({ id: p.id, name: p.name, facility: p.facility, brief: p.brief, currency: p.currency, status: p.status, archived });

  function saveScenario(e: React.FormEvent) {
    e.preventDefault(); if (!project) return; setNotice(null);
    const n = name.trim(); setNameErr(n.length < 2 || n.length > 120 ? "Scenario name must be 2 to 120 characters." : undefined);
    const b = buildInputs(model, st); setErrors(b.errors);
    if (n.length < 2 || n.length > 120 || !b.inputs) return;
    createScenario.mutate({ orgId, module, data: { projectId: project.id, name: n, inputs: b.inputs } }, {
      onSuccess: async (sc) => {
        qc.setQueryData(getGetEngineeringScenarioQueryKey(orgId, module, sc.id), sc);
        await refresh(); await qc.invalidateQueries({ queryKey: getGetEngineeringScenarioQueryKey(orgId, module, sc.id) });
        setNotice(`Saved "${sc.name}". The scenario is immutable; change inputs and save again to create a revision.`); setName(""); setParams({ scenario: sc.id });
      },
    });
  }
  function loadAsNew() {
    if (!detail.data) return;
    setSt(stateFromInputs(detail.data.inputs)); setName(`${detail.data.name} revision`); setErrors({}); setNotice("Inputs loaded from the saved scenario. Saving creates a new scenario; the original is never changed.");
    document.getElementById("scenario-form-h")?.scrollIntoView({ behavior: "smooth" });
  }

  if (ws.isLoading) return <Skeleton label={`Loading ${title}`} />;
  if (ws.isError) return <div className="max-w-xl space-y-4" data-testid="error-workspace"><Alert>{apiStatus(ws.error) === 403 ? "Your role cannot open this module." : apiMessage(ws.error, "We could not load this module.")}</Alert><Btn testId="button-retry" onClick={() => ws.refetch()}>Try again</Btn></div>;

  const archived = !!project?.archived;
  const split = project ? splitBrief(project.brief) : null;
  return (
    <div className="page-reveal min-w-0 space-y-8" data-testid={`engineering-${module}`}>
      <header className="min-w-0">
        <p className="text-[11px] font-bold tracking-[.19em] text-[#168568]">{title.toUpperCase()}</p>
        <h1 className="mt-3 text-3xl font-extrabold text-[#10243a]">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5d707c]" data-testid="text-module-brief">{BRIEFS[module]}</p>
      </header>
      <Alert tone="info" testId="notice-external-data">Manual data only. No external data provider is configured (status: {ws.data?.externalDataStatus.replace("_", " ")}). Nothing is fetched automatically; every figure comes from your inputs and is shown only after an actual save.</Alert>
      {!canWrite && <Alert tone="info" testId="notice-readonly">Your role is read only. You can view projects and saved results but not create or change them.</Alert>}

      <Panel id="projects-h" title="Projects" action={canWrite ? <Btn tone="primary" testId="button-new-project" onClick={() => { saveProject.reset(); setMode("new"); }}>New project</Btn> : undefined}>
        <div className="grid min-w-0 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="PROJECT">{(p) => (
            <select id={p.id} className="form-input min-w-0" value={projectId ?? ""} data-testid="select-project" onChange={(e) => { setMode("none"); setNotice(null); setParams({ project: e.target.value || null, scenario: null, compare: null }); }}>
              <option value="">{visible.length ? "Select a project" : "No projects yet"}</option>
              {visible.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.currency}){x.archived ? " - archived" : ""}</option>)}
            </select>)}</Field>
          <label className="flex min-h-[46px] items-center gap-2 text-xs font-semibold text-[#34495a]"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} data-testid="check-show-archived" />Show archived</label>
        </div>
        {mode === "new" && canWrite && <div className="mt-5 border-t border-[#edf0f2] pt-5"><ProjectForm locked={false} pending={saveProject.isPending} error={saveProject.error} onCancel={() => setMode("none")} onSubmit={(d) => persist(d, (p) => setParams({ project: p.id, scenario: null, compare: null }))} /></div>}
        {project && mode !== "new" && (
          <div className="mt-5 min-w-0 border-t border-[#edf0f2] pt-5" data-testid="card-project">
            <div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-bold text-[#10243a]" data-testid="text-project-name">{project.name}</h3><StateBadge>{project.status.toUpperCase()}</StateBadge>{archived && <StateBadge tone="warn">ARCHIVED</StateBadge>}<StateBadge tone="good">CURRENCY {project.currency}</StateBadge></div>
            <p className="mt-1 text-sm text-[#5d707c]">{project.facility}</p>
            <dl className="mt-3 grid min-w-0 gap-3 text-sm sm:grid-cols-2"><div className="min-w-0"><dt className="text-[10px] font-bold tracking-[.12em] text-[#6b7b87]">PROBLEM</dt><dd className="break-words">{split?.problem}</dd></div><div className="min-w-0"><dt className="text-[10px] font-bold tracking-[.12em] text-[#6b7b87]">SCOPE</dt><dd className="break-words">{split?.scope || "Not recorded"}</dd></div></dl>
            {locked && <p className="mt-3 text-xs text-[#7a5a10]" data-testid="notice-currency-locked">Currency cannot change because this project has saved scenarios.</p>}
            {canWrite && mode === "none" && <div className="mt-4 flex flex-wrap gap-3">
              <Btn testId="button-edit-project" onClick={() => { saveProject.reset(); setMode("edit"); }}>Edit project</Btn>
              {archived ? <Btn testId="button-restore-project" disabled={saveProject.isPending} onClick={() => persist(full(project, false))}>Restore project</Btn> : <Btn tone="danger" testId="button-archive-project" disabled={saveProject.isPending} onClick={() => persist(full(project, true))}>Archive project</Btn>}</div>}
            {saveProject.isError && mode === "none" && <div className="mt-3"><Alert testId="error-project-action">{apiMessage(saveProject.error)}</Alert></div>}
            {mode === "edit" && canWrite && <div className="mt-4"><ProjectForm key={project.id} project={project} locked={locked} pending={saveProject.isPending} error={saveProject.error} onCancel={() => setMode("none")} onSubmit={(d) => persist(d)} /></div>}
          </div>)}
        {!project && mode === "none" && <div className="mt-5"><Empty title={projects.length ? "Select a project" : "No projects yet"}>{canWrite ? "Create a project to hold scenarios for one facility." : "An administrator or analyst can create a project."}</Empty></div>}
      </Panel>

      {project && (
        <Panel id="scenarios-h" title="Saved scenarios">
          {scenarios.length === 0 ? <Empty title="No saved scenarios">{archived ? "This archived project has none." : "Enter inputs below and save to see results."}</Empty> : (
            <ul className="divide-y divide-[#edf0f2]" data-testid="list-scenarios">{scenarios.map((s) => (
              <li key={s.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-2" data-testid={`row-scenario-${s.id}`}>
                <span className="min-w-0 break-words"><strong className="text-[#10243a]">{s.name}</strong> <span className="text-xs text-[#6b7b87]">{fmtDate(s.created_at)}</span></span>
                <span className="flex gap-2"><Btn testId={`button-open-scenario-${s.id}`} onClick={() => setParams({ scenario: s.id })}>{s.id === scenarioId ? "Viewing" : "Open"}</Btn>
                  {scenarioId && s.id !== scenarioId && <Btn testId={`button-compare-${s.id}`} onClick={() => setParams({ compare: s.id === compareId ? null : s.id })}>{s.id === compareId ? "Stop comparing" : "Compare"}</Btn>}</span></li>))}</ul>)}
        </Panel>)}

      {scenarioId && project && (
        <div className="min-w-0 space-y-6">
          {detail.isLoading && <Skeleton label="Loading scenario" />}
          {detail.isError && <div data-testid="error-scenario"><Alert>{apiMessage(detail.error, "Could not load this scenario.")} <button type="button" className="font-bold underline" onClick={() => detail.refetch()}>Retry</button></Alert></div>}
          {detail.data && <>
            <ResultView org={orgId} module={module} sc={detail.data} />
            {canWrite && !archived && <Btn tone="primary" testId="button-load-inputs" onClick={loadAsNew}>Load inputs as new scenario</Btn>}
            {compareId && cmp.data && <CompareView a={detail.data} b={cmp.data} />}
            {compareId && cmp.isError && <Alert testId="error-compare">{apiMessage(cmp.error, "Could not load the comparison scenario.")}</Alert>}
          </>}
        </div>)}

      {project && canWrite && (archived
        ? <Alert tone="info" testId="notice-archived">This project is archived. Restore it to save new scenarios; existing reports stay visible.</Alert>
        : (
          <section aria-labelledby="scenario-form-h" className="min-w-0 border border-[#dce3e8] bg-white p-5">
            <h2 id="scenario-form-h" className="text-lg font-bold text-[#10243a]">New scenario inputs</h2>
            <p className="mt-1 mb-5 text-xs text-[#6b7b87]">Currency for money fields: <strong>{project.currency}</strong> (set by the project). Fields marked as editable defaults are starting points you should confirm. Measured data is left blank.</p>
            <form onSubmit={saveScenario} noValidate aria-label="Save scenario" className="min-w-0 space-y-6" data-testid="form-scenario">
              {createScenario.isError && <Alert testId="error-scenario-save">{apiMessage(createScenario.error)}</Alert>}
              {notice && <Alert tone="success" testId="status-scenario-saved">{notice}</Alert>}
              <Field label="SCENARIO NAME" error={nameErr}>{(p) => <input id={p.id} className="form-input min-w-0" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-scenario-name" />}</Field>
              <ScenarioForm model={model} st={st} setSt={setSt} errors={errors} cur={project.currency} disabled={createScenario.isPending} />
              {Object.keys(errors).length > 0 && <Alert testId="error-form-summary">Fix the highlighted fields before saving.</Alert>}
              <SubmitButton pending={createScenario.isPending} testId="button-save-scenario">Save scenario and calculate</SubmitButton>
            </form>
          </section>))}
    </div>
  );
}
