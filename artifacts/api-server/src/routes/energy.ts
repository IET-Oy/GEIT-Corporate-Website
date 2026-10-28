import { Router } from "express";
import { createHash } from "node:crypto";
import {
  SaveEnergyRecordBody, PreviewEnergyImportBody, CreateEnergyAnalysisBody,
} from "@workspace/api-zod";
import { identity, PlatformError, type Identity } from "../lib/platform-session";
import { calculateEnergy, instant, type Reading, type Tariff } from "../lib/energy-calculations";
import { parseEnergyImport } from "../lib/energy-import";
import { energyReport, energyTemplate } from "../lib/energy-reports";
import { signEnergyAnalysis, verifyEnergyAnalysis } from "../lib/energy-integrity";

const router = Router({ mergeParams: true });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUILDING_SELECT = "id,site_id,name,building_type,address,latitude,longitude,timezone,floor_area,area_unit,description,metadata,is_demo,archived,created_by,created_at,updated_at";
const ASSET_SELECT = "id,site_id,building_id,name,asset_type,identifier,description,manufacturer,model,serial_number,commissioning_date,status,capacity,capacity_unit,metadata,is_demo,archived,created_by,created_at,updated_at";
function failure(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "42501") throw new PlatformError(403, "Your role cannot perform this action.");
  if (["23503", "23505", "23514", "23P01", "22023", "22007", "22008"].includes(error.code || "")) {
    throw new PlatformError(400, "Invalid reference, archived record, duplicate or overlapping data. No partial import was saved.");
  }
  throw new PlatformError(503, "Energy data is temporarily unavailable.");
}
function parsed<T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new PlatformError(400, "Check the required fields, numeric ranges and date formats.");
  return result.data!;
}
function numeric(value: unknown) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new PlatformError(400, "A finite numeric value is required.");
  return n;
}
function zone(value: string) {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return value; }
  catch { throw new PlatformError(400, "Choose a valid IANA time zone, for example Europe/Helsinki."); }
}
function required(value: string | undefined) {
  if (!value) throw new PlatformError(400, "Complete every required field.");
  return value;
}
router.use(async (req, res, next) => {
  const org = String(req.params.orgId || "");
  if (!UUID.test(org)) throw new PlatformError(400, "Invalid organisation ID.");
  const current = await identity(req, res);
  const role = await current.client.rpc("geit_role", { org });
  failure(role.error);
  if (!role.data) throw new PlatformError(403, "This organisation is not available to your account.");
  res.locals.energy = { ...current, org, role: role.data };
  if (req.method !== "GET" && role.data === "reader") throw new PlatformError(403, "Readers cannot change energy data.");
  if ((req.path === "/records" || req.path === "/demo" || /^\/(?:buildings|assets)(?:\/|$)/.test(req.path))
      && !["owner", "admin", "editor"].includes(role.data)) {
    throw new PlatformError(403, "Only owners, administrators and editors can manage these records.");
  }
  next();
});
type Context = Identity & { org: string; role: string };
async function entity(c: Context, table: string, id: string) {
  if (!UUID.test(id)) throw new PlatformError(400, "Invalid record ID.");
  const result = await c.client.from(`geit_energy_${table}`).select("*").eq("organisation_id", c.org).eq("id", id).maybeSingle();
  failure(result.error);
  if (!result.data) throw new PlatformError(404, "Record not found in this organisation.");
  return result.data;
}
async function activeMeter(c: Context, id: string) {
  const meter = await entity(c, "meters", id), site = await entity(c, "sites", meter.site_id);
  if (meter.archived || site.archived) throw new PlatformError(400, "Restore this meter and its site before importing or analysing.");
  return { meter, site };
}
router.get("/", async (_req, res) => {
  const c: Context = res.locals.energy;
  const selects: Record<string, string> = {
    sites: "id,name,timezone,area_m2,is_demo,archived",
    buildings: BUILDING_SELECT,
    assets: ASSET_SELECT,
    meters: "id,name,site_id,unit,is_demo,archived",
    tariffs: "id,name,currency,energy_rate,daily_charge,demand_rate,is_demo,archived",
    rules: "id,name,meter_id,metric,threshold,is_demo,archived",
    imports: "id,meter_id,filename,status,row_count,valid_count,errors,created_at,is_demo",
    analyses: "id,name,meter_id,is_demo,created_at",
    alerts: "id,analysis_id,message,acknowledged,created_at,is_demo",
  };
  const rows = await Promise.all(Object.entries(selects).map(async ([table, select]) => {
    let query = c.client.from(`geit_energy_${table}`).select(select).eq("organisation_id", c.org);
    query = query.order(["imports", "analyses", "alerts"].includes(table) ? "created_at" : "name", { ascending: false });
    const result = await query.limit(251); failure(result.error);
    if ((result.data?.length || 0) > 250) throw new PlatformError(400, "This workspace exceeds the current 250-record-per-list limit. Contact GEIT before adding further records.");
    return [table, result.data || []];
  }));
  res.json(Object.fromEntries(rows));
});
type EnergyRecordInput = ReturnType<typeof SaveEnergyRecordBody.parse>;

async function saveRecord(c: Context, input: EnergyRecordInput) {
  const table = { site: "sites", building: "buildings", asset: "assets", meter: "meters", tariff: "tariffs", rule: "rules" }[input.kind];
  const existing = input.id ? await entity(c, table, input.id) : null;
  const name = input.name.trim();
  if (name.length < 2) throw new PlatformError(400, "Use a name of at least two characters.");
  const data: Record<string, unknown> = { organisation_id: c.org, name, archived: input.archived ?? existing?.archived ?? false };
  if (input.kind === "site") Object.assign(data, { timezone: zone(required(input.timezone)), area_m2: input.areaM2 ?? null });
  if (input.kind === "building") {
    const site = await entity(c, "sites", required(input.siteId));
    if (site.is_demo) throw new PlatformError(400, "Building records are not available in the synthetic demo dataset.");
    if (existing && existing.site_id !== site.id) throw new PlatformError(400, "A building cannot be moved between sites.");
    if (site.archived && !(existing && data.archived)) throw new PlatformError(400, "Restore the site before adding or restoring a building.");
    const buildingType = required(input.buildingType).trim();
    if (buildingType.length < 2) throw new PlatformError(400, "Choose a building type.");
    if ((input.latitude == null) !== (input.longitude == null)) {
      throw new PlatformError(400, "Enter both latitude and longitude, or leave both blank.");
    }
    Object.assign(data, {
      site_id: site.id,
      building_type: buildingType,
      address: input.address?.trim() || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      timezone: zone(input.timezone?.trim() || String(site.timezone)),
      floor_area: input.floorArea ?? null,
      area_unit: input.areaUnit ?? existing?.area_unit ?? "m2",
      description: input.description?.trim() || null,
      metadata: input.metadata ?? existing?.metadata ?? {},
      is_demo: false,
      ...(existing ? {} : { created_by: c.user.id }),
    });
  }
  if (input.kind === "asset") {
    const site = await entity(c, "sites", required(input.siteId));
    if (site.is_demo) throw new PlatformError(400, "Asset records are not available in the synthetic demo dataset.");
    const building = input.buildingId ? await entity(c, "buildings", input.buildingId) : null;
    if (building && building.site_id !== site.id) throw new PlatformError(400, "Choose a building that belongs to the selected site.");
    if (site.archived && !(existing && data.archived)) throw new PlatformError(400, "Restore the site before adding or restoring an asset.");
    if (building?.archived && !(existing && data.archived)) throw new PlatformError(400, "Restore the building before adding or restoring an asset.");
    const assetType = required(input.assetType).trim();
    if (assetType.length < 2) throw new PlatformError(400, "Choose an asset type.");
    if (input.capacity != null && !input.capacityUnit?.trim()) {
      throw new PlatformError(400, "Add a capacity unit when entering capacity.");
    }
    if (input.capacity == null && input.capacityUnit?.trim()) {
      throw new PlatformError(400, "Add a capacity value when entering a capacity unit.");
    }
    let commissioningDate: Date | null = input.commissioningDate ?? null;
    if (commissioningDate) {
      if (!Number.isFinite(commissioningDate.getTime())) {
        throw new PlatformError(400, "Enter a valid commissioning date.");
      }
    }
    Object.assign(data, {
      site_id: site.id,
      building_id: building?.id ?? null,
      asset_type: assetType,
      identifier: input.identifier?.trim() || null,
      description: input.description?.trim() || null,
      manufacturer: input.manufacturer?.trim() || null,
      model: input.model?.trim() || null,
      serial_number: input.serialNumber?.trim() || null,
      commissioning_date: commissioningDate?.toISOString().slice(0, 10) ?? null,
      status: input.status ?? existing?.status ?? "planned",
      capacity: input.capacity ?? null,
      capacity_unit: input.capacityUnit?.trim() || null,
      metadata: input.metadata ?? existing?.metadata ?? {},
      is_demo: false,
      ...(existing ? {} : { created_by: c.user.id }),
    });
  }
  if (input.kind === "meter") {
    const site = await entity(c, "sites", required(input.siteId));
    if (site.archived && (!existing || !data.archived)) throw new PlatformError(400, "Restore the site first.");
    if (existing && existing.site_id !== site.id) throw new PlatformError(400, "A meter cannot be moved between sites; archive it and create another.");
    Object.assign(data, { site_id: site.id, unit: required(input.unit), is_demo: site.is_demo });
  }
  if (input.kind === "tariff") {
    if (input.energyRate === undefined) throw new PlatformError(400, "An energy rate is required.");
    Object.assign(data, { currency: required(input.currency), energy_rate: input.energyRate, daily_charge: input.dailyCharge ?? 0, demand_rate: input.demandRate ?? 0 });
  }
  if (input.kind === "rule") {
    const meter = await entity(c, "meters", required(input.meterId));
    if (input.threshold === undefined) throw new PlatformError(400, "A threshold is required.");
    Object.assign(data, { meter_id: meter.id, metric: required(input.metric), threshold: input.threshold, is_demo: meter.is_demo });
  }
  if (input.kind === "building" && existing && !existing.archived && data.archived) {
    const activeAssets = await c.client.from("geit_energy_assets").select("id")
      .eq("organisation_id", c.org).eq("building_id", existing.id).eq("archived", false).limit(1);
    failure(activeAssets.error);
    if (activeAssets.data?.length) throw new PlatformError(409, "Archive the building's active assets before archiving the building.");
  }
  const result = existing
    ? await c.client.from(`geit_energy_${table}`).update(data).eq("organisation_id", c.org).eq("id", existing.id).select("id")
    : await c.client.from(`geit_energy_${table}`).insert(data).select("id");
  if (result.error?.code === "23505") throw new PlatformError(409, "An active building name or asset identifier is already in use.");
  if (result.error?.code === "23503") throw new PlatformError(400, "Choose a site and building that belong to this organisation.");
  failure(result.error);
  if (!result.data?.length) throw new PlatformError(403, "Record was not saved.");
  return `${input.kind === "building" ? "Building" : input.kind === "asset" ? "Asset" : "Energy record"} saved.`;
}

function resourceInput(kind: "building" | "asset", body: unknown, id?: string): EnergyRecordInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new PlatformError(400, "Provide a JSON object.");
  }
  const values = body as Record<string, unknown>;
  if (values.kind && values.kind !== kind) throw new PlatformError(400, "The request resource does not match its body.");
  if (!id && values.id) throw new PlatformError(400, "Do not include a record ID when creating a resource.");
  if (id && values.id && values.id !== id) throw new PlatformError(400, "The record ID does not match the request path.");
  return parsed(SaveEnergyRecordBody.strict(), { ...values, kind, ...(id ? { id } : {}) });
}

function pageOptions(req: { query: unknown }) {
  const query = req.query && typeof req.query === "object" && !Array.isArray(req.query)
    ? req.query as Record<string, unknown> : {};
  const rawLimit = query.limit === undefined ? 50 : Number(query.limit);
  const rawOffset = query.offset === undefined ? 0 : Number(query.offset);
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100 ||
      !Number.isInteger(rawOffset) || rawOffset < 0 || rawOffset > 100000) {
    throw new PlatformError(400, "Use a limit from 1 to 100 and an offset from 0 to 100,000.");
  }
  const search = query.search === undefined ? "" : String(query.search).trim();
  if (search.length > 120) throw new PlatformError(400, "Search text must be 120 characters or fewer.");
  return { limit: rawLimit, offset: rawOffset, search };
}

function escapedLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function rowInput(kind: "building" | "asset", row: Record<string, unknown>, archived = Boolean(row.archived)): EnergyRecordInput {
  if (kind === "building") {
    return {
      kind, id: String(row.id), name: String(row.name), siteId: String(row.site_id), buildingType: String(row.building_type),
      address: row.address as string | null, latitude: row.latitude == null ? null : Number(row.latitude),
      longitude: row.longitude == null ? null : Number(row.longitude), timezone: String(row.timezone),
      floorArea: row.floor_area == null ? null : Number(row.floor_area), areaUnit: row.area_unit as "m2" | "ft2",
      description: row.description as string | null,
      metadata: row.metadata as EnergyRecordInput["metadata"], archived,
    };
  }
  return {
    kind, id: String(row.id), name: String(row.name), siteId: String(row.site_id),
    buildingId: row.building_id == null ? undefined : String(row.building_id),
    assetType: String(row.asset_type), identifier: row.identifier as string | null,
    description: row.description as string | null, manufacturer: row.manufacturer as string | null,
    model: row.model as string | null, serialNumber: row.serial_number as string | null,
    commissioningDate: row.commissioning_date == null ? null : new Date(`${String(row.commissioning_date).slice(0, 10)}T00:00:00.000Z`), status: row.status as EnergyRecordInput["status"],
    capacity: row.capacity == null ? null : Number(row.capacity),
    capacityUnit: row.capacity_unit as string | null, metadata: row.metadata as EnergyRecordInput["metadata"], archived,
  };
}

router.post("/records", async (req, res) => {
  const c: Context = res.locals.energy, input = parsed(SaveEnergyRecordBody.strict(), req.body);
  res.json({ message: await saveRecord(c, input) });
});

router.get("/buildings", async (req, res) => {
  const c: Context = res.locals.energy, { limit, offset, search } = pageOptions(req);
  let query = c.client.from("geit_energy_buildings").select(BUILDING_SELECT, { count: "exact" }).eq("organisation_id", c.org);
  if (req.query.siteId !== undefined) {
    const site = await entity(c, "sites", String(req.query.siteId));
    query = query.eq("site_id", site.id);
  }
  if (search) query = query.ilike("name", `%${escapedLike(search)}%`);
  const result = await query.order("name").range(offset, offset + limit - 1);
  failure(result.error);
  res.json({ items: result.data || [], count: result.count ?? 0, limit, offset });
});

router.get("/buildings/:id", async (req, res) => {
  const c: Context = res.locals.energy;
  const building = await entity(c, "buildings", String(req.params.id));
  const buildingResult = await c.client.from("geit_energy_buildings").select(BUILDING_SELECT)
    .eq("organisation_id", c.org).eq("id", building.id).single();
  failure(buildingResult.error);
  const assets = await c.client.from("geit_energy_assets").select(ASSET_SELECT)
    .eq("organisation_id", c.org).eq("building_id", building.id).order("name").limit(251);
  failure(assets.error);
  if ((assets.data?.length || 0) > 250) throw new PlatformError(400, "This building has more than 250 assets; use the paginated asset list.");
  res.json({ building: buildingResult.data, assets: assets.data || [] });
});

router.get("/assets", async (req, res) => {
  const c: Context = res.locals.energy, { limit, offset, search } = pageOptions(req);
  let query = c.client.from("geit_energy_assets").select(ASSET_SELECT, { count: "exact" }).eq("organisation_id", c.org);
  if (req.query.siteId !== undefined) {
    const site = await entity(c, "sites", String(req.query.siteId));
    query = query.eq("site_id", site.id);
  }
  if (req.query.buildingId !== undefined) {
    const building = await entity(c, "buildings", String(req.query.buildingId));
    query = query.eq("building_id", building.id);
  }
  if (req.query.status !== undefined) {
    const status = String(req.query.status);
    if (!["planned", "operational", "maintenance", "retired"].includes(status)) throw new PlatformError(400, "Choose a valid asset status.");
    query = query.eq("status", status);
  }
  if (search) query = query.ilike("name", `%${escapedLike(search)}%`);
  const result = await query.order("name").range(offset, offset + limit - 1);
  failure(result.error);
  res.json({ items: result.data || [], count: result.count ?? 0, limit, offset });
});

router.get("/assets/:id", async (req, res) => {
  const c: Context = res.locals.energy, record = await entity(c, "assets", String(req.params.id));
  const result = await c.client.from("geit_energy_assets").select(ASSET_SELECT)
    .eq("organisation_id", c.org).eq("id", record.id).single();
  failure(result.error);
  res.json(result.data);
});

router.post("/buildings", async (req, res) => {
  const input = resourceInput("building", req.body);
  res.status(201).json({ message: await saveRecord(res.locals.energy, input) });
});
router.patch("/buildings/:id", async (req, res) => {
  const c: Context = res.locals.energy, existing = await entity(c, "buildings", String(req.params.id));
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) throw new PlatformError(400, "Provide a JSON object.");
  const input = resourceInput("building", { ...rowInput("building", existing), ...req.body }, existing.id);
  res.json({ message: await saveRecord(c, input) });
});
router.delete("/buildings/:id", async (req, res) => {
  const c: Context = res.locals.energy, existing = await entity(c, "buildings", String(req.params.id));
  res.json({ message: await saveRecord(c, rowInput("building", existing, true)) });
});
router.post("/assets", async (req, res) => {
  const input = resourceInput("asset", req.body);
  res.status(201).json({ message: await saveRecord(res.locals.energy, input) });
});
router.patch("/assets/:id", async (req, res) => {
  const c: Context = res.locals.energy, existing = await entity(c, "assets", String(req.params.id));
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) throw new PlatformError(400, "Provide a JSON object.");
  const input = resourceInput("asset", { ...rowInput("asset", existing), ...req.body }, existing.id);
  res.json({ message: await saveRecord(c, input) });
});
router.delete("/assets/:id", async (req, res) => {
  const c: Context = res.locals.energy, existing = await entity(c, "assets", String(req.params.id));
  res.json({ message: await saveRecord(c, rowInput("asset", existing, true)) });
});
async function readingRows(c: Context, meter: string, start: string, end: string, overlap = false) {
  const rows: Record<string, unknown>[] = [];
  for (let page = 0; ; page++) {
    let query = c.client.from("geit_energy_readings").select("id,start_at,end_at,quantity,unit,kwh")
      .eq("organisation_id", c.org).eq("meter_id", meter);
    query = overlap ? query.lt("start_at", end).gt("end_at", start) : query.gte("start_at", start).lte("end_at", end);
    const result = await query.order("start_at").range(page * 1000, page * 1000 + 999);
    failure(result.error); rows.push(...result.data || []);
    if (rows.length > 10000) throw new PlatformError(400, "More than 10,000 intervals match. Choose a shorter period.");
    if ((result.data?.length || 0) < 1000) break;
  }
  return rows;
}
router.post("/imports", async (req, res) => {
  const c: Context = res.locals.energy, input = parsed(PreviewEnergyImportBody.strict(), req.body);
  const { meter } = await activeMeter(c, input.meterId);
  let preview;
  try { preview = await parseEnergyImport(input.filename, input.fileBase64); }
  catch (error) { throw new PlatformError(400, error instanceof Error ? `Import not accepted: ${error.message.slice(0, 250)}` : "File could not be parsed."); }
  if (preview.rows.length) {
    const min = preview.rows.reduce((a, r) => r.start < a ? r.start : a, preview.rows[0].start);
    const max = preview.rows.reduce((a, r) => r.end > a ? r.end : a, preview.rows[0].end);
    const existing = await readingRows(c, meter.id, min, max, true);
    const old = existing.map((r) => ({ s: Date.parse(String(r.start_at)), e: Date.parse(String(r.end_at)) }));
    const incoming = preview.rows.map((r) => ({ s: instant(r.start), e: instant(r.end) })).sort((a, b) => a.s - b.s);
    let index = 0;
    const overlaps = incoming.some((r) => {
      while (index < old.length && old[index].e <= r.s) index++;
      return index < old.length && old[index].s < r.e && old[index].e > r.s;
    });
    if (overlaps) {
      preview.errors.push({ row: 0, message: "This file overlaps readings already stored for the selected meter. Correct the file; existing readings are never overwritten." });
    }
  }
  const result = await c.client.from("geit_energy_imports").insert({
    organisation_id: c.org, meter_id: meter.id, filename: input.filename.replace(/[/\\\x00-\x1f]/g, "_"),
    row_count: preview.rowCount, valid_count: preview.validCount, errors: preview.errors,
    normalized_rows: preview.rows, created_by: c.user.id, is_demo: meter.is_demo,
  }).select("id,meter_id,filename,status,row_count,valid_count,errors,created_at,is_demo").single();
  failure(result.error); res.json(result.data);
});
router.post("/imports/:id/commit", async (req, res) => {
  const c: Context = res.locals.energy;
  await entity(c, "imports", String(req.params.id));
  const result = await c.client.rpc("geit_energy_commit_import", { p_org: c.org, p_import: req.params.id });
  failure(result.error); res.json({ message: `${result.data} intervals committed. Existing readings were not overwritten.` });
});
router.post("/analyses", async (req, res) => {
  const c: Context = res.locals.energy, input = parsed(CreateEnergyAnalysisBody.strict(), req.body);
  const { meter, site } = await activeMeter(c, input.meterId);
  const tariff = input.tariffId ? await entity(c, "tariffs", input.tariffId) : null;
  if (tariff && (tariff.archived || tariff.is_demo !== meter.is_demo)) throw new PlatformError(400, "Choose an active tariff from the same customer/demo dataset.");
  try { instant(req.body.start); instant(req.body.end); } catch { throw new PlatformError(400, "Analysis timestamps require ISO dates with offsets."); }
  const start = input.start.toISOString(), end = input.end.toISOString();
  const stored = await readingRows(c, meter.id, start, end);
  const readings: Reading[] = stored.map((r) => ({ start: String(r.start_at), end: String(r.end_at), value: Number(r.quantity), unit: String(r.unit), kwh: Number(r.kwh) }));
  let result;
  try {
    result = calculateEnergy(readings, start, end, site.timezone, tariff ? {
      currency: tariff.currency, energy_rate: Number(tariff.energy_rate), daily_charge: Number(tariff.daily_charge), demand_rate: Number(tariff.demand_rate),
    } as Tariff : null, numeric(site.area_m2), input.baselineKwh ?? null, input.targetKwh ?? null);
  } catch (error) { throw new PlatformError(400, error instanceof Error ? error.message : "Analysis input is invalid."); }
  const hash = createHash("sha256").update(JSON.stringify(readings)).digest("hex");
  // Sign the JSON representation actually persisted by PostgREST (including ISO Dates).
  const snapshot = JSON.parse(JSON.stringify({ inputs: input, meter, site, tariff, readings, readingHash: hash }));
  const payload = { meter_id: meter.id, tariff_id: tariff?.id ?? null, name: input.name.trim(), result, snapshot };
  const authenticity = signEnergyAnalysis({ organisation_id: c.org, ...payload });
  const saved = await c.client.rpc("geit_energy_save_analysis", {
    p_org: c.org, p_payload: { ...payload, snapshot: { ...snapshot, authenticity } },
  });
  failure(saved.error);
  res.status(201).json(await analysis(c, saved.data));
});
async function analysis(c: Context, id: string) {
  const record = verifyEnergyAnalysis(await entity(c, "analyses", id));
  return { id: record.id, name: record.name, meter_id: record.meter_id, is_demo: record.is_demo, created_at: record.created_at, result: record.result };
}
router.get("/analyses/:id", async (req, res) => {
  res.json(await analysis(res.locals.energy, String(req.params.id)));
});
router.post("/alerts/:id/acknowledge", async (req, res) => {
  const c: Context = res.locals.energy;
  await entity(c, "alerts", String(req.params.id));
  const result = await c.client.from("geit_energy_alerts").update({ acknowledged: true }).eq("organisation_id", c.org).eq("id", req.params.id);
  failure(result.error); res.json({ message: "Alert acknowledged." });
});
router.post("/demo", async (_req, res) => {
  const c: Context = res.locals.energy;
  const result = await c.client.rpc("geit_energy_seed_demo", { p_org: c.org });
  failure(result.error); res.json({ message: "Separate synthetic demo data is available. It is not customer data or a GEIT project result." });
});
router.get("/template/:format", async (req, res) => {
  await energyTemplate(String(req.params.format), res);
});
router.get("/analyses/:id/export/:format", async (req, res) => {
  const record = verifyEnergyAnalysis(await entity(res.locals.energy, "analyses", String(req.params.id)));
  await energyReport(record, String(req.params.format), res);
});
export default router;
