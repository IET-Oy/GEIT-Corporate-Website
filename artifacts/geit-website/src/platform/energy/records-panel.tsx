import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetEnergyWorkspaceQueryKey, useSaveEnergyRecord, type EnergyRecordInput, type EnergyWorkspace } from "@workspace/api-client-react";
import { Plus } from "lucide-react";
import { Alert, WRITE } from "../common";
import { RecordForm, type Existing, type Kind } from "./record-forms";
import { Btn, Empty, Panel, StateBadge, fmt, type Perm } from "./ui";

const zonesList = (): string[] => { try { return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone"); } catch { return ["Africa/Kigali", "UTC"]; } };

const KINDS: { kind: Kind; title: string; plural: string }[] = [
  { kind: "site", title: "Sites", plural: "sites" },
  { kind: "meter", title: "Meters", plural: "meters" },
  { kind: "tariff", title: "Tariffs", plural: "tariffs" },
  { kind: "rule", title: "Alert rules", plural: "rules" },
];

function toInput(kind: Kind, r: Existing, archived: boolean): EnergyRecordInput {
  const a = r as unknown as Record<string, unknown>;
  const base = { kind, id: r.id, name: r.name, archived } as EnergyRecordInput;
  if (kind === "site") return { ...base, timezone: a.timezone as string, areaM2: (a.area_m2 as number | null) ?? null };
  if (kind === "meter") return { ...base, siteId: a.site_id as string, unit: a.unit as EnergyRecordInput["unit"] };
  if (kind === "tariff") return { ...base, currency: a.currency as string, energyRate: a.energy_rate as number, dailyCharge: a.daily_charge as number, demandRate: a.demand_rate as number };
  return { ...base, meterId: a.meter_id as string, metric: a.metric as EnergyRecordInput["metric"], threshold: a.threshold as number };
}

export function RecordsPanel({ orgId, ws, perm, demo }: { orgId: string; ws: EnergyWorkspace; perm: Perm; demo: boolean }) {
  const qc = useQueryClient();
  const save = useSaveEnergyRecord(WRITE);
  const [editing, setEditing] = useState<{ kind: Kind; item: Existing | null } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const zones = useMemo(zonesList, []);
  const sites = ws.sites.filter((x) => x.is_demo === demo);
  const meters = ws.meters.filter((x) => x.is_demo === demo);
  const lists: Record<Kind, Existing[]> = { site: sites, meter: meters, tariff: ws.tariffs.filter((x) => x.is_demo === demo), rule: ws.rules.filter((x) => x.is_demo === demo) };
  const canEdit = perm.manage && !demo;
  const siteName = (id: string) => ws.sites.find((s) => s.id === id)?.name ?? "Unknown site";
  const meterName = (id: string) => ws.meters.find((s) => s.id === id)?.name ?? "Unknown meter";

  function run(data: EnergyRecordInput, done?: () => void) {
    setNotice(null);
    save.mutate({ orgId, data }, { onSuccess: async (r) => { setNotice(r.message); done?.(); await qc.invalidateQueries({ queryKey: getGetEnergyWorkspaceQueryKey(orgId) }); } });
  }
  function detail(kind: Kind, r: Existing): string {
    const a = r as unknown as Record<string, unknown>;
    if (kind === "site") return `${a.timezone}${a.area_m2 ? ` · ${fmt(a.area_m2 as number, 1)} m2` : " · no area set"}`;
    if (kind === "meter") return `${siteName(a.site_id as string)} · default unit ${a.unit}`;
    if (kind === "tariff") return `${a.currency} ${a.energy_rate}/kWh · ${a.daily_charge}/day · ${a.demand_rate}/kW monthly peak`;
    return `${meterName(a.meter_id as string)} · ${a.metric === "peak_kw" ? "peak kW" : "daily kWh"} above ${fmt(a.threshold as number, 2)}`;
  }
  return (
    <div className="space-y-6">
      {demo && <Alert tone="info">Synthetic demo records are read-only. Switch to customer data to create or change your own records.</Alert>}
      {!perm.manage && !demo && <Alert tone="info">Your role can view records but not change them. Owners, administrators and editors manage sites, meters, tariffs and rules.</Alert>}
      {notice && <Alert tone="success" testId="status-record">{notice}</Alert>}
      {KINDS.map(({ kind, title, plural }) => {
        const items = lists[kind];
        const needs = kind === "meter" && sites.length === 0 ? "Add a site first." : kind === "rule" && meters.length === 0 ? "Add a meter first." : null;
        return (
          <Panel key={kind} id={`h-${kind}`} title={title} action={canEdit && <Btn tone="primary" testId={`button-add-${kind}`} disabled={!!needs} onClick={() => { save.reset(); setEditing({ kind, item: null }); }}><Plus size={14} aria-hidden="true" />Add {kind}</Btn>}>
            {needs && canEdit && <p className="mb-3 text-xs text-[#6b7b87]">{needs}</p>}
            {editing?.kind === kind && <div className="mb-5"><RecordForm key={editing.item?.id ?? "new"} kind={kind} item={editing.item} ctx={{ sites: ws.sites.filter((s) => s.is_demo === demo && (!s.archived || editing.item?.id)), meters: ws.meters.filter((m) => m.is_demo === demo && (!m.archived || editing.item?.id)), zones }} pending={save.isPending} error={save.error} onCancel={() => setEditing(null)} onSave={(v) => run(v, () => setEditing(null))} /></div>}
            {items.length === 0 ? <Empty title={`No ${plural} yet`}>{demo ? "Create the synthetic demo from the banner above to see sample records." : canEdit ? `Add your first ${kind} to get started.` : "Nothing has been added for this organisation."}</Empty> : (
              <ul className="divide-y divide-[#edf0f2]" data-testid={`list-${plural}`}>
                {items.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid={`row-${kind}-${r.id}`}>
                    <div className="min-w-0"><p className="font-semibold text-[#10243a]">{r.name} {r.archived && <StateBadge tone="warn">ARCHIVED</StateBadge>}</p><p className="text-xs text-[#6b7b87]">{detail(kind, r)}</p></div>
                    {canEdit && <div className="flex gap-2">
                      <Btn testId={`button-edit-${kind}-${r.id}`} onClick={() => { save.reset(); setEditing({ kind, item: r }); }}>Edit</Btn>
                      <Btn tone={r.archived ? "quiet" : "danger"} disabled={save.isPending} testId={`button-archive-${kind}-${r.id}`} onClick={() => run(toInput(kind, r, !r.archived))}>{r.archived ? "Restore" : "Archive"}</Btn>
                    </div>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        );
      })}
      {save.isError && !editing && <Alert testId="error-record">{(save.error as { data?: { error?: string } })?.data?.error ?? "The change could not be saved."}</Alert>}
    </div>
  );
}
