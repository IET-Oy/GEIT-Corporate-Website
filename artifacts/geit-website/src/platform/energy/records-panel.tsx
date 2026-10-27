import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetEnergyWorkspaceQueryKey, useSaveEnergyRecord, type EnergyRecordInput, type EnergyWorkspace } from "@workspace/api-client-react";
import { Plus } from "lucide-react";
import { Alert, WRITE } from "../common";
import { RecordForm, type Existing, type Kind } from "./record-forms";
import { Btn, Empty, Panel, StateBadge, fmt, type Perm } from "./ui";

const zonesList = (): string[] => { try { return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone"); } catch { return ["Africa/Kigali", "UTC"]; } };
const PAGE_SIZE = 12;

const KINDS: { kind: Kind; title: string; plural: string }[] = [
  { kind: "site", title: "Sites", plural: "sites" },
  { kind: "building", title: "Buildings", plural: "buildings" },
  { kind: "meter", title: "Meters", plural: "meters" },
  { kind: "asset", title: "Assets", plural: "assets" },
  { kind: "tariff", title: "Tariffs", plural: "tariffs" },
  { kind: "rule", title: "Alert rules", plural: "rules" },
];

function toInput(kind: Kind, r: Existing, archived: boolean): EnergyRecordInput {
  const a = r as unknown as Record<string, unknown>;
  const base = { kind, id: r.id, name: r.name, archived } as EnergyRecordInput;
  if (kind === "site") return { ...base, timezone: a.timezone as string, areaM2: (a.area_m2 as number | null) ?? null };
  if (kind === "building") return {
    ...base,
    siteId: a.site_id as string,
    buildingType: a.building_type as string,
    address: (a.address as string | null) ?? null,
    latitude: (a.latitude as number | null) ?? null,
    longitude: (a.longitude as number | null) ?? null,
    timezone: a.timezone as string,
    floorArea: (a.floor_area as number | null) ?? null,
    areaUnit: a.area_unit as EnergyRecordInput["areaUnit"],
    description: (a.description as string | null) ?? null,
    metadata: a.metadata as EnergyRecordInput["metadata"],
  };
  if (kind === "asset") return {
    ...base,
    siteId: a.site_id as string,
    buildingId: (a.building_id as string | null) ?? undefined,
    assetType: a.asset_type as string,
    identifier: (a.identifier as string | null) ?? null,
    description: (a.description as string | null) ?? null,
    manufacturer: (a.manufacturer as string | null) ?? null,
    model: (a.model as string | null) ?? null,
    serialNumber: (a.serial_number as string | null) ?? null,
    commissioningDate: (a.commissioning_date as string | null) ?? null,
    status: a.status as EnergyRecordInput["status"],
    capacity: (a.capacity as number | null) ?? null,
    capacityUnit: (a.capacity_unit as string | null) ?? null,
    metadata: a.metadata as EnergyRecordInput["metadata"],
  };
  if (kind === "meter") return { ...base, siteId: a.site_id as string, unit: a.unit as EnergyRecordInput["unit"] };
  if (kind === "tariff") return { ...base, currency: a.currency as string, energyRate: a.energy_rate as number, dailyCharge: a.daily_charge as number, demandRate: a.demand_rate as number };
  return { ...base, meterId: a.meter_id as string, metric: a.metric as EnergyRecordInput["metric"], threshold: a.threshold as number };
}

export function RecordsPanel({ orgId, ws, perm, demo }: { orgId: string; ws: EnergyWorkspace; perm: Perm; demo: boolean }) {
  const qc = useQueryClient();
  const save = useSaveEnergyRecord(WRITE);
  const [editing, setEditing] = useState<{ kind: Kind; item: Existing | null } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState<Record<Kind, number>>({ site: 0, building: 0, asset: 0, meter: 0, tariff: 0, rule: 0 });
  const zones = useMemo(zonesList, []);
  const sites = ws.sites.filter((x) => x.is_demo === demo);
  const meters = ws.meters.filter((x) => x.is_demo === demo);
  const buildings = ws.buildings.filter((x) => x.is_demo === demo);
  const assets = ws.assets.filter((x) => x.is_demo === demo);
  const lists: Record<Kind, Existing[]> = {
    site: sites,
    building: buildings,
    meter: meters,
    asset: assets,
    tariff: ws.tariffs.filter((x) => x.is_demo === demo),
    rule: ws.rules.filter((x) => x.is_demo === demo),
  };
  const canEdit = perm.manage && !demo;
  const siteName = (id: string) => ws.sites.find((s) => s.id === id)?.name ?? "Unknown site";
  const meterName = (id: string) => ws.meters.find((s) => s.id === id)?.name ?? "Unknown meter";
  const buildingName = (id: string | null) => id ? ws.buildings.find((b) => b.id === id)?.name ?? "Unknown building" : "Site-level asset";

  function run(data: EnergyRecordInput, done?: () => void) {
    setNotice(null);
    save.mutate({ orgId, data }, { onSuccess: async (r) => { setNotice(r.message); done?.(); await qc.invalidateQueries({ queryKey: getGetEnergyWorkspaceQueryKey(orgId) }); } });
  }
  function detail(kind: Kind, r: Existing): string {
    const a = r as unknown as Record<string, unknown>;
    if (kind === "site") return `${a.timezone}${a.area_m2 ? ` · ${fmt(a.area_m2 as number, 1)} m2` : " · no area set"}`;
    if (kind === "building") return `${siteName(a.site_id as string)} · ${a.building_type} · ${a.timezone}${a.floor_area ? ` · ${fmt(a.floor_area as number, 1)} ${a.area_unit}` : ""}`;
    if (kind === "asset") return `${siteName(a.site_id as string)} · ${buildingName((a.building_id as string | null) ?? null)} · ${a.asset_type} · ${a.status}${a.identifier ? ` · ${a.identifier}` : ""}`;
    if (kind === "meter") return `${siteName(a.site_id as string)} · default unit ${a.unit}`;
    if (kind === "tariff") return `${a.currency} ${a.energy_rate}/kWh · ${a.daily_charge}/day · ${a.demand_rate}/kW monthly peak`;
    return `${meterName(a.meter_id as string)} · ${a.metric === "peak_kw" ? "peak kW" : "daily kWh"} above ${fmt(a.threshold as number, 2)}`;
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-[#536779]">Organise sites, buildings, meters and equipment assets for this organisation.</p>
        <label className="sr-only" htmlFor="energy-record-search">Search sites, buildings and assets</label>
        <input id="energy-record-search" className="form-input w-full sm:max-w-xs" type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPages({ site: 0, building: 0, asset: 0, meter: 0, tariff: 0, rule: 0 }); }} placeholder="Search sites, buildings or assets" />
      </div>
      {demo && <Alert tone="info">Synthetic demo records are read-only. Switch to customer data to create or change your own records.</Alert>}
      {!perm.manage && !demo && <Alert tone="info">Your role can view records but not change them. Owners, administrators and editors manage sites, buildings, meters, assets, tariffs and rules.</Alert>}
      {notice && <Alert tone="success" testId="status-record">{notice}</Alert>}
      {KINDS.map(({ kind, title, plural }) => {
        const q = search.trim().toLowerCase();
        const filteredItems = lists[kind].filter((r) => {
          if (!q) return true;
          const a = r as unknown as Record<string, unknown>;
          const searchable = [r.name, a.identifier, a.asset_type, a.building_type, a.address, siteName(String(a.site_id ?? ""))].filter(Boolean).join(" ").toLowerCase();
          return searchable.includes(q);
        });
        const lastPage = Math.max(0, Math.ceil(filteredItems.length / PAGE_SIZE) - 1);
        const page = Math.min(pages[kind], lastPage);
        const items = filteredItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
        const associatedAssets = kind === "building" ? assets.filter((a) => items.some((item) => item.id === a.building_id)) : [];
        const needs = ["meter", "building", "asset"].includes(kind) && sites.length === 0 ? "Add a site first." : kind === "rule" && meters.length === 0 ? "Add a meter first." : null;
        return (
          <Panel key={kind} id={`h-${kind}`} title={title} action={canEdit && <Btn tone="primary" testId={`button-add-${kind}`} disabled={!!needs} onClick={() => { save.reset(); setEditing({ kind, item: null }); }}><Plus size={14} aria-hidden="true" />Add {kind}</Btn>}>
            {needs && canEdit && <p className="mb-3 text-xs text-[#6b7b87]">{needs}</p>}
            {editing?.kind === kind && <div className="mb-5"><RecordForm key={editing.item?.id ?? "new"} kind={kind} item={editing.item} ctx={{ sites: ws.sites.filter((s) => s.is_demo === demo && (!s.archived || editing.item?.id)), meters: ws.meters.filter((m) => m.is_demo === demo && (!m.archived || editing.item?.id)), buildings: ws.buildings.filter((b) => b.is_demo === demo && (!b.archived || editing.item?.id)), zones }} pending={save.isPending} error={save.error} onCancel={() => setEditing(null)} onSave={(v) => run(v, () => setEditing(null))} /></div>}
            {filteredItems.length === 0 ? <Empty title={q ? `No matching ${plural}` : `No ${plural} yet`}>{q ? "Try another search term." : demo ? "Create the synthetic demo from the banner above to see sample records." : canEdit ? `Add your first ${kind} to get started.` : "Nothing has been added for this organisation."}</Empty> : (
              <ul className="divide-y divide-[#edf0f2]" data-testid={`list-${plural}`}>
                {items.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid={`row-${kind}-${r.id}`}>
                    <div className="min-w-0"><p className="font-semibold text-[#10243a]">{r.name} {r.archived && <StateBadge tone="warn">ARCHIVED</StateBadge>}</p><p className="text-xs text-[#6b7b87]">{detail(kind, r)}</p></div>
                     {kind === "building" && <div className="w-full pl-3 text-xs text-[#536779]">
                       <span className="font-semibold">Associated assets:</span>
                       {associatedAssets.filter((a) => a.building_id === r.id).length === 0 ? <span> None yet</span> : (
                         <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                           {associatedAssets.filter((a) => a.building_id === r.id).slice(0, 5).map((a) => <li key={a.id}>{a.name} · {a.asset_type} · {a.status}</li>)}
                           {associatedAssets.filter((a) => a.building_id === r.id).length > 5 && <li>and {associatedAssets.filter((a) => a.building_id === r.id).length - 5} more in Assets</li>}
                         </ul>
                       )}
                     </div>}
                    {canEdit && <div className="flex gap-2">
                      <Btn testId={`button-edit-${kind}-${r.id}`} onClick={() => { save.reset(); setEditing({ kind, item: r }); }}>Edit</Btn>
                      <Btn tone={r.archived ? "quiet" : "danger"} disabled={save.isPending} testId={`button-archive-${kind}-${r.id}`} onClick={() => run(toInput(kind, r, !r.archived))}>{r.archived ? "Restore" : "Archive"}</Btn>
                    </div>}
                  </li>
                ))}
              </ul>
            )}
            {filteredItems.length > PAGE_SIZE && <nav className="flex items-center justify-between gap-3 pt-3 text-xs text-[#536779]" aria-label={`${title} pagination`}>
              <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredItems.length)} of {filteredItems.length}</span>
              <div className="flex gap-2">
                <Btn disabled={page === 0} testId={`button-${kind}-previous`} onClick={() => setPages((old) => ({ ...old, [kind]: Math.max(0, old[kind] - 1) }))}>Previous</Btn>
                <Btn disabled={page >= lastPage} testId={`button-${kind}-next`} onClick={() => setPages((old) => ({ ...old, [kind]: Math.min(lastPage, old[kind] + 1) }))}>Next</Btn>
              </div>
            </nav>}
          </Panel>
        );
      })}
      {save.isError && !editing && <Alert testId="error-record">{(save.error as { data?: { error?: string } })?.data?.error ?? "The change could not be saved."}</Alert>}
    </div>
  );
}
