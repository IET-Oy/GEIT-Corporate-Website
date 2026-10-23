import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  getEngineeringWorkspace, getGetEngineeringWorkspaceQueryKey, getGetEnergyWorkspaceQueryKey, useGetEnergyWorkspace,
  type EngineeringModule, type EngineeringWorkspace,
} from "@workspace/api-client-react";
import { Alert, Skeleton, apiMessage } from "../common";
import { Btn, DemoBadge, Empty, Panel, fmtDate } from "../energy/ui";
import { Workspace } from "../workspace";
import { REPORT_MODULES, filterReports, reportEntries } from "./report-index";

export function ReportsPage() {
  return <Workspace title="Projects and Reports" path="/app/projects-reports">
    {({ org }) => <ReportsBody key={org.id} orgId={org.id} />}
  </Workspace>;
}

export function ReportsBody({ orgId }: { orgId: string }) {
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");
  const [includeDemo, setIncludeDemo] = useState(false);
  const energy = useGetEnergyWorkspace(orgId, { query: { queryKey: getGetEnergyWorkspaceQueryKey(orgId), retry: false } });
  const engineering = useQueries({ queries: REPORT_MODULES.map((item) => ({
    queryKey: getGetEngineeringWorkspaceQueryKey(orgId, item.id),
    queryFn: ({ signal }: { signal: AbortSignal }) => getEngineeringWorkspace(orgId, item.id, { signal }),
    retry: false,
  })) });
  const workspaces: Partial<Record<EngineeringModule, EngineeringWorkspace>> = {};
  engineering.forEach((query, index) => {
    if (query.data) workspaces[REPORT_MODULES[index].id] = query.data;
  });
  const rows = filterReports(reportEntries(orgId, energy.data, workspaces), search, module, includeDemo);
  const loading = energy.isLoading || engineering.some((query) => query.isLoading);
  const failed = energy.isError || engineering.some((query) => query.isError);

  return <div className="min-w-0 space-y-6" data-testid="reports-index">
    <Alert tone="info">Browse saved work from this organisation. Open a report to verify its saved calculation and download the available formats. This index does not recalculate or certify results. Lists retain each module’s existing record limits.</Alert>
    <Panel title="Find saved reports" id="report-filter-heading">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-[#10243a]">Search reports
          <input className="form-input mt-2" value={search} maxLength={200} type="search"
            onChange={(event) => setSearch(event.target.value)} placeholder="Report, project or meter name" />
        </label>
        <label className="min-w-0 text-sm font-semibold text-[#10243a]">Module
          <select className="form-input mt-2 max-w-full" value={module} onChange={(event) => setModule(event.target.value)}>
            <option value="">All modules</option><option value="energy-management">Energy Management</option>
            {REPORT_MODULES.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm text-[#10243a]">
        <input type="checkbox" checked={includeDemo} onChange={(event) => setIncludeDemo(event.target.checked)} />
        Include synthetic Energy Management demo analyses
      </label>
    </Panel>
    {energy.isError && <Alert>{apiMessage(energy.error, "Energy reports could not be loaded.")} <Btn testId="retry-reports-energy" onClick={() => energy.refetch()}>Retry Energy Management</Btn></Alert>}
    {engineering.map((query, index) => query.isError ? <Alert key={REPORT_MODULES[index].id}>
      {REPORT_MODULES[index].title}: {apiMessage(query.error)} <Btn testId={`retry-reports-${REPORT_MODULES[index].id}`} onClick={() => query.refetch()}>Retry {REPORT_MODULES[index].title}</Btn>
    </Alert> : null)}
    {loading && <Skeleton label="Loading saved reports" />}
    <Panel title="Saved analyses and scenarios" id="saved-report-heading">
      <p role="status" className="mb-4 text-sm text-[#5d707c]">{rows.length} matching {rows.length === 1 ? "report" : "reports"}{failed ? " from the modules that loaded; the list is incomplete." : loading ? " loaded so far." : "."}</p>
      {!rows.length && !loading && <Empty title={failed ? "Some report lists are unavailable" : "No matching reports"}>
        {failed ? "Retry the failed modules above. An unavailable module is not an empty workspace." : "Save an analysis or scenario in a module, or adjust the filters. Customer reports are not pre-filled."}
      </Empty>}
      <ul className="divide-y divide-[#dce3e8]" aria-label="Saved reports">
        {rows.map((row) => <li key={`${row.module}:${row.id}`} className="flex min-w-0 flex-wrap items-center justify-between gap-4 py-4">
          <div className="min-w-0 flex-1 break-words">
            <strong className="block text-[#10243a]">{row.name}</strong>
            <p className="text-sm text-[#5d707c]">{row.moduleTitle} · {row.project} · {fmtDate(row.createdAt)}</p>
            {row.demo && <DemoBadge />}{row.archived && <span className="text-xs text-[#5d707c]">Archived project</span>}
          </div>
          <Link href={row.href} className="text-sm font-bold text-[#116149] underline underline-offset-4">Open report<span className="sr-only">: {row.name}</span></Link>
        </li>)}
      </ul>
    </Panel>
    <Panel title="Projects" id="report-project-heading">
      <ul className="grid gap-3 sm:grid-cols-2" aria-label="Engineering projects">
        {REPORT_MODULES.flatMap((item) => (workspaces[item.id]?.projects ?? []).filter((project) => project.module === item.id).map((project) =>
          <li key={`${item.id}:${project.id}`} className="min-w-0 break-words border border-[#dce3e8] p-4">
            <Link className="font-semibold text-[#116149] underline" href={`${item.path}?${new URLSearchParams({ org: orgId, project: project.id })}`}>{project.name}</Link>
            <p className="mt-1 text-sm text-[#5d707c]">{item.title}{project.archived ? " · Archived" : ""}</p>
          </li>))}
      </ul>
      {!engineering.some((query) => query.data?.projects.length) && !loading && <p className="text-sm text-[#5d707c]">{failed ? "Project lists are incomplete. Retry the failed modules above." : "No saved engineering projects in this organisation."}</p>}
    </Panel>
  </div>;
}
