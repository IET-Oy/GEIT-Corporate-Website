import type { Identity } from "../platform-session";
import { PlatformError } from "../platform-session";
import { instant } from "../energy-calculations";
import { carbon } from "./carbon";
import { twin, type TwinReading } from "./twin";
import type { CarbonInputs, EmissionFactor, TwinInputs } from "@workspace/api-zod";
type Client = Identity["client"];
export const FACTOR_FIELDS = "id,version,definition,created_at";
export const factorEntity = (row: Record<string, any>): EmissionFactor => ({ ...row.definition, id: row.id, version: row.version, created_at: row.created_at });
function check(error: unknown) { if (error) throw new PlatformError(503, "Source records are temporarily unavailable."); }
export async function resolveCarbon(client: Client, org: string, i: CarbonInputs) {
  const ids = [...new Set(i.activities.map((a) => a.factorId))];
  const selected = await client.from("geit_emission_factors").select(FACTOR_FIELDS).eq("organisation_id", org).in("id", ids);
  check(selected.error);
  if (selected.data?.length !== ids.length) throw new PlatformError(404, "One or more factor versions are not available in this organisation.");
  return carbon(i, selected.data.map(factorEntity));
}
export async function resolveTwin(client: Client, org: string, i: TwinInputs) {
  const start = instant(i.start), end = instant(i.end);
  if (!(end > start && end - start <= 366 * 86400000)) throw new PlatformError(400, "Choose a positive window no longer than 366 days.");
  const ids = [i.buildingMeterId, ...(i.solarMeterId ? [i.solarMeterId] : [])];
  const selected = await client.from("geit_energy_meters").select("*").eq("organisation_id", org).eq("is_demo", false).eq("archived", false).in("id", ids);
  check(selected.error);
  if (selected.data?.length !== ids.length) throw new PlatformError(404, "Selected non-demo meters are not available in this organisation.");
  if (new Set(selected.data.map((m) => m.site_id)).size !== 1) throw new PlatformError(400, "Building and solar meters must belong to the same site.");
  const readings = async (meter: string) => {
    const rows: TwinReading[] = [];
    for (let offset = 0; offset <= 5000; offset += 500) {
      const page = await client.from("geit_energy_readings").select("id,meter_id,import_id,start_at,end_at,quantity,unit,kwh")
        .eq("organisation_id", org).eq("meter_id", meter).eq("is_demo", false).lt("start_at", new Date(end).toISOString()).gt("end_at", new Date(start).toISOString())
        .order("start_at").range(offset, offset + 499);
      check(page.error);
      rows.push(...(page.data || []).map((r) => ({ ...r, kwh: Number(r.kwh), quantity: Number(r.quantity) })));
      if (rows.length > 5000) throw new PlatformError(400, "Limit each source to 5,000 readings per saved twin. Choose a smaller historical window.");
      if ((page.data?.length || 0) < 500) break;
    }
    return rows;
  };
  const [load, pv] = await Promise.all([readings(i.buildingMeterId), i.solarMeterId ? readings(i.solarMeterId) : Promise.resolve([])]);
  return twin(i, load, pv, selected.data.sort((a, b) => a.id.localeCompare(b.id)));
}
