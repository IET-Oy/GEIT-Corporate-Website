import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { getGetEnergyWorkspaceQueryKey, useCreateEnergyDemo, useGetEnergyWorkspace, type PlatformOrganisation } from "@workspace/api-client-react";
import { Alert, Skeleton, WRITE, apiMessage, apiStatus } from "../common";
import { Workspace } from "../workspace";
import { AlertsPanel } from "./alerts-panel";
import { AnalysisPanel } from "./analysis-panel";
import { ImportsPanel } from "./imports-panel";
import { RecordsPanel } from "./records-panel";
import { Btn, DemoBadge, permsFor } from "./ui";

const TABS = [{ id: "analysis", label: "Analysis" }, { id: "imports", label: "Readings" }, { id: "records", label: "Records" }, { id: "alerts", label: "Alerts" }] as const;
type Tab = (typeof TABS)[number]["id"];

export function EnergyPage() {
  return <Workspace title="Energy Management" path="/app/energy-management">{({ org }) => <EnergyBody key={org.id} org={org} />}</Workspace>;
}

function EnergyBody({ org }: { org: PlatformOrganisation }) {
  const qc = useQueryClient();
  const [loc, navigate] = useLocation(); const search = useSearch();
  const demo = new URLSearchParams(search).get("data") === "demo";
  const [tab, setTab] = useState<Tab>("analysis");
  const q = useGetEnergyWorkspace(org.id, { query: { retry: false, queryKey: getGetEnergyWorkspaceQueryKey(org.id) } });
  const seed = useCreateEnergyDemo(WRITE);
  const perm = permsFor(org.role);
  const ws = q.data;
  const setDemo = (d: boolean) => { const p = new URLSearchParams(search); if (d) p.set("data", "demo"); else p.delete("data"); p.delete("analysis"); navigate(`${loc}?${p.toString()}`); };
  const hasDemo = !!ws && (ws.sites.some((s) => s.is_demo) || ws.meters.some((s) => s.is_demo));

  return (
    <div className="page-reveal space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11px] font-bold tracking-[.19em] text-[#168568]">ENERGY MANAGEMENT</p>
          <h1 className="mt-3 text-3xl font-extrabold text-[#10243a]">Meter data to modelled cost</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#5d707c]">Import interval readings, run saved analyses and review threshold alerts for {org.name}.</p>
        </div>
        <div role="group" aria-label="Data set" className="inline-flex border border-[#10243a]">
          {[false, true].map((d) => <button key={String(d)} type="button" aria-pressed={demo === d} data-testid={d ? "toggle-demo" : "toggle-customer"} onClick={() => setDemo(d)} className={`min-h-[42px] px-4 text-xs font-bold ${demo === d ? "bg-[#10243a] text-white" : "text-[#10243a] hover:bg-[#e8f2ef]"}`}>{d ? "Synthetic demo" : "Customer data"}</button>)}
        </div>
      </header>

      {demo && (
        <div className="flex flex-wrap items-center justify-between gap-4 border border-[#b8c9d3] bg-[#eaf1f5] px-5 py-4" data-testid="banner-demo">
          <div><DemoBadge /><p className="mt-2 text-sm leading-6 text-[#2b4a60]">Everything shown is synthetic and kept apart from your customer data. It illustrates the workflow only.</p></div>
          {perm.manage && !hasDemo && <Btn tone="primary" testId="button-create-demo" disabled={seed.isPending} onClick={() => seed.mutate({ orgId: org.id, data: {} }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetEnergyWorkspaceQueryKey(org.id) }) })}>{seed.isPending ? "Creating demo" : "Create synthetic demo"}</Btn>}
          {!perm.manage && !hasDemo && <p className="text-xs text-[#2b4a60]">An owner, administrator or editor can create the demo.</p>}
        </div>
      )}
      {seed.isError && <Alert testId="error-demo">{apiMessage(seed.error)}</Alert>}
      {!perm.work && <Alert tone="info">Your role is read-only in this module.</Alert>}

      {q.isLoading && <Skeleton label="Loading energy data" />}
      {q.isError && <Alert testId="error-energy">{apiStatus(q.error) === 401 ? "Your session has expired. Sign in again." : apiMessage(q.error, "Energy data could not be loaded.")} <button type="button" className="font-bold underline" onClick={() => q.refetch()} data-testid="button-retry-energy">Retry</button></Alert>}
      {ws && (<>
        <div role="tablist" aria-label="Energy sections" className="flex gap-1 overflow-x-auto border-b border-[#dce3e8]"
          onKeyDown={(e) => { const i = TABS.findIndex((t) => t.id === tab); const n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null; if (n !== null) { const t = TABS[(n + TABS.length) % TABS.length]; setTab(t.id); document.getElementById(`tab-${t.id}`)?.focus(); } }}>
          {TABS.map((t) => <button key={t.id} id={`tab-${t.id}`} role="tab" type="button" aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} tabIndex={tab === t.id ? 0 : -1} data-testid={`tab-${t.id}`} onClick={() => setTab(t.id)} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-bold ${tab === t.id ? "border-[#e8b64b] text-[#10243a]" : "border-transparent text-[#566b77] hover:text-[#168568]"}`}>{t.label}</button>)}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === "analysis" && <AnalysisPanel orgId={org.id} ws={ws} perm={perm} demo={demo} />}
          {tab === "imports" && <ImportsPanel orgId={org.id} ws={ws} perm={perm} demo={demo} />}
          {tab === "records" && <RecordsPanel orgId={org.id} ws={ws} perm={perm} demo={demo} />}
          {tab === "alerts" && <AlertsPanel orgId={org.id} ws={ws} perm={perm} demo={demo} onOpen={(id) => { const p = new URLSearchParams(search); p.set("analysis", id); navigate(`${loc}?${p.toString()}`, { replace: true }); setTab("analysis"); }} />}
        </div>
      </>)}
    </div>
  );
}
