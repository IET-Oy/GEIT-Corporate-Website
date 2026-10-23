import type { EnergyWorkspace, EngineeringModule, EngineeringWorkspace } from "@workspace/api-client-react";

export const REPORT_MODULES = [
  { id: "energy-consulting", title: "Energy Consulting", path: "/app/energy-consulting" },
  { id: "energy-auditing", title: "Energy Efficiency & Auditing", path: "/app/energy-auditing" },
  { id: "renewable-energy", title: "Renewable Energy Advisory", path: "/app/renewable-energy" },
  { id: "battery-flexibility", title: "Battery Storage & Flexibility", path: "/app/battery-flexibility" },
  { id: "carbon-footprint", title: "Carbon Footprint", path: "/app/carbon-footprint" },
  { id: "digital-energy", title: "AI & Digital Energy Solutions", path: "/app/digital-energy" },
] as const satisfies readonly { id: EngineeringModule; title: string; path: string }[];

export type ReportEntry = {
  id: string; name: string; module: string; moduleTitle: string; project: string;
  createdAt: string; href: string; demo: boolean; archived: boolean;
};

// Summaries are navigation only. Existing detail/export APIs still authenticate
// the tenant and verify saved calculation signatures before returning results.
export function reportEntries(
  org: string,
  energy: EnergyWorkspace | undefined,
  workspaces: Partial<Record<EngineeringModule, EngineeringWorkspace>>,
): ReportEntry[] {
  const entries: ReportEntry[] = (energy?.analyses ?? []).map((row) => ({
    id: row.id, name: row.name, module: "energy-management", moduleTitle: "Energy Management",
    project: energy?.meters.find((meter) => meter.id === row.meter_id)?.name ?? "Meter",
    createdAt: row.created_at, demo: row.is_demo, archived: false,
    href: `/app/energy-management?${new URLSearchParams({ org, analysis: row.id, ...(row.is_demo ? { data: "demo" } : {}) })}`,
  }));
  for (const module of REPORT_MODULES) {
    const workspace = workspaces[module.id];
    for (const scenario of workspace?.scenarios ?? []) {
      const project = workspace?.projects.find((item) => item.id === scenario.project_id);
      // Do not turn a malformed or mismatched module response into a foreign link.
      if (scenario.module !== module.id || !project || project.module !== module.id) continue;
      entries.push({
        id: scenario.id, name: scenario.name, module: module.id, moduleTitle: module.title,
        project: project.name, createdAt: scenario.created_at, demo: false, archived: project.archived,
        href: `${module.path}?${new URLSearchParams({ org, project: project.id, scenario: scenario.id })}`,
      });
    }
  }
  return entries.sort((a, b) => {
    const difference = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    return Number.isFinite(difference) && difference !== 0 ? difference : a.id.localeCompare(b.id);
  });
}

export function filterReports(entries: ReportEntry[], query: string, module: string, includeDemo: boolean) {
  const search = query.trim().toLocaleLowerCase();
  return entries.filter((row) => (includeDemo || !row.demo) && (!module || row.module === module)
    && (!search || `${row.name} ${row.project} ${row.moduleTitle}`.toLocaleLowerCase().includes(search)));
}
