import { useQueryClient } from "@tanstack/react-query";
import { getGetEnergyWorkspaceQueryKey, useAcknowledgeEnergyAlert, type EnergyWorkspace } from "@workspace/api-client-react";
import { Alert, WRITE, apiMessage } from "../common";
import { Btn, DemoBadge, Empty, Panel, StateBadge, fmtDate, type Perm } from "./ui";

export function AlertsPanel({ orgId, ws, perm, demo, onOpen }: { orgId: string; ws: EnergyWorkspace; perm: Perm; demo: boolean; onOpen: (analysisId: string) => void }) {
  const qc = useQueryClient();
  const ack = useAcknowledgeEnergyAlert(WRITE);
  const alerts = ws.alerts.filter((a) => a.is_demo === demo).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <Panel id="h-alerts" title="Alerts">
      <p className="mb-4 text-sm leading-6 text-[#5d707c]">Alerts are evaluated when an analysis is saved against your alert rules. There is no live monitoring and no email or SMS notification.</p>
      {ack.isError && <div className="mb-4"><Alert testId="error-ack">{apiMessage(ack.error)}</Alert></div>}
      {alerts.length === 0 ? <Empty title="No alerts">Add a rule on the Records tab, then run an analysis. Alerts appear here when a threshold is exceeded.</Empty> : (
        <ul className="divide-y divide-[#edf0f2]" data-testid="list-alerts">
          {alerts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid={`row-alert-${a.id}`}>
              <div><p className="text-sm font-semibold text-[#10243a]">{a.message}</p><p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6b7b87]">{fmtDate(a.created_at)} <StateBadge tone={a.acknowledged ? "good" : "warn"}>{a.acknowledged ? "ACKNOWLEDGED" : "OPEN"}</StateBadge>{a.is_demo && <DemoBadge />}</p></div>
              <div className="flex gap-2">
                <Btn testId={`button-open-alert-${a.id}`} onClick={() => onOpen(a.analysis_id)}>View analysis</Btn>
                {perm.work && !a.acknowledged && <Btn tone="primary" testId={`button-ack-${a.id}`} disabled={ack.isPending} onClick={() => ack.mutate({ orgId, id: a.id, data: {} }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetEnergyWorkspaceQueryKey(orgId) }) })}>Acknowledge</Btn>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
