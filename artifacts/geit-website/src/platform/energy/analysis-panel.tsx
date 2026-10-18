import { useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { getGetEnergyAnalysisQueryKey, useGetEnergyAnalysis, type EnergyWorkspace } from "@workspace/api-client-react";
import { Alert, Skeleton, apiMessage } from "../common";
import { AnalysisForm } from "./analysis-form";
import { AnalysisResult } from "./analysis-result";
import { DemoBadge, Empty, Panel, fmtDate, type Perm } from "./ui";

export function AnalysisPanel({ orgId, ws, perm, demo }: { orgId: string; ws: EnergyWorkspace; perm: Perm; demo: boolean }) {
  const search = useSearch(); const [loc, navigate] = useLocation();
  const list = useMemo(() => ws.analyses.filter((a) => a.is_demo === demo).slice().sort((a, b) => b.created_at.localeCompare(a.created_at)), [ws.analyses, demo]);
  const param = new URLSearchParams(search).get("analysis");
  const selectedId = list.find((a) => a.id === param)?.id ?? list[0]?.id ?? "";
  const detail = useGetEnergyAnalysis(orgId, selectedId, { query: { enabled: !!selectedId, retry: false, queryKey: getGetEnergyAnalysisQueryKey(orgId, selectedId) } });
  const select = (id: string) => { const p = new URLSearchParams(search); p.set("analysis", id); navigate(`${loc}?${p.toString()}`, { replace: true }); };
  const meterName = (id: string) => ws.meters.find((m) => m.id === id)?.name ?? "Unknown meter";

  return (
    <div className="space-y-6">
      <Panel id="h-run" title="Run an analysis">
        {perm.work ? <AnalysisForm orgId={orgId} ws={ws} demo={demo} onCreated={(a) => select(a.id)} /> : <Alert tone="info">Your role can read saved analyses but cannot run new ones.</Alert>}
      </Panel>
      <Panel id="h-saved" title="Saved analyses">
        {list.length === 0 ? <Empty title="No saved analyses">{perm.work ? "Run an analysis above. It is saved and listed here, and survives reloads." : "None have been saved for this organisation."}</Empty> : (
          <div className="space-y-6">
            <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Saved analyses" data-testid="list-analyses">
              {list.map((a) => (
                <li key={a.id} className="shrink-0"><button type="button" onClick={() => select(a.id)} aria-pressed={a.id === selectedId} data-testid={`button-analysis-${a.id}`} className={`block border px-4 py-2 text-left text-xs ${a.id === selectedId ? "border-[#168568] bg-[#e8f2ef]" : "border-[#dce3e8] hover:bg-[#f2f5f7]"}`}>
                  <span className="block font-bold text-[#10243a]">{a.name}</span><span className="text-[#6b7b87]">{meterName(a.meter_id)} · {fmtDate(a.created_at)}</span>{a.is_demo && <span className="mt-1 block"><DemoBadge /></span>}
                </button></li>
              ))}
            </ul>
            {detail.isLoading && <Skeleton label="Loading analysis" />}
            {detail.isError && <Alert testId="error-analysis-detail">{apiMessage(detail.error, "The analysis could not be loaded.")} <button type="button" className="font-bold underline" onClick={() => detail.refetch()} data-testid="button-retry-analysis">Retry</button></Alert>}
            {detail.data && <AnalysisResult orgId={orgId} a={detail.data} />}
          </div>
        )}
      </Panel>
    </div>
  );
}
