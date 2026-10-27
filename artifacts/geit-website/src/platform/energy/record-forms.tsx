import { useState, type FormEvent } from "react";
import type { EnergyAsset, EnergyBuilding, EnergyMeter, EnergyRule, EnergySite, EnergyTariff, EnergyRecordInput } from "@workspace/api-client-react";
import { Alert, Field, SubmitButton, apiMessage } from "../common";
import { Btn, UNITS } from "./ui";

export type Kind = "site" | "building" | "asset" | "meter" | "tariff" | "rule";
export type Existing = EnergySite | EnergyBuilding | EnergyAsset | EnergyMeter | EnergyTariff | EnergyRule;
type Ctx = { sites: EnergySite[]; meters: EnergyMeter[]; buildings: EnergyBuilding[]; zones: string[] };

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

export function RecordForm({ kind, item, ctx, pending, error, onCancel, onSave }: {
  kind: Kind; item: Existing | null; ctx: Ctx; pending: boolean; error: unknown; onCancel: () => void; onSave: (v: EnergyRecordInput) => void;
}) {
  const s = item as Partial<EnergySite & EnergyBuilding & EnergyAsset & EnergyMeter & EnergyTariff & EnergyRule> | null;
  const [name, setName] = useState(s?.name ?? "");
  const [tz, setTz] = useState(s?.timezone ?? "Africa/Kigali");
  const [area, setArea] = useState(s?.area_m2 != null ? String(s.area_m2) : "");
  const [siteId, setSiteId] = useState(s?.site_id ?? ctx.sites[0]?.id ?? "");
  const [buildingId, setBuildingId] = useState(s?.building_id ?? ctx.buildings.find((b) => b.site_id === siteId && !b.archived)?.id ?? "");
  const [buildingType, setBuildingType] = useState(s?.building_type ?? "");
  const [address, setAddress] = useState(s?.address ?? "");
  const [latitude, setLatitude] = useState(s?.latitude != null ? String(s.latitude) : "");
  const [longitude, setLongitude] = useState(s?.longitude != null ? String(s.longitude) : "");
  const [floorArea, setFloorArea] = useState(s?.floor_area != null ? String(s.floor_area) : "");
  const [areaUnit, setAreaUnit] = useState<"m2" | "ft2">(s?.area_unit ?? "m2");
  const [description, setDescription] = useState(s?.description ?? "");
  const [assetType, setAssetType] = useState(s?.asset_type ?? "");
  const [identifier, setIdentifier] = useState(s?.identifier ?? "");
  const [manufacturer, setManufacturer] = useState(s?.manufacturer ?? "");
  const [model, setModel] = useState(s?.model ?? "");
  const [serialNumber, setSerialNumber] = useState(s?.serial_number ?? "");
  const [commissioningDate, setCommissioningDate] = useState(s?.commissioning_date ?? "");
  const [status, setStatus] = useState<NonNullable<EnergyRecordInput["status"]>>(s?.status ?? "planned");
  const [capacity, setCapacity] = useState(s?.capacity != null ? String(s.capacity) : "");
  const [capacityUnit, setCapacityUnit] = useState(s?.capacity_unit ?? "");
  const [metadataText, setMetadataText] = useState(JSON.stringify(s?.metadata ?? {}, null, 2));
  const [unit, setUnit] = useState<string>(s?.unit ?? "kWh");
  const [cur, setCur] = useState(s?.currency ?? "RWF");
  const [er, setEr] = useState(s?.energy_rate != null ? String(s.energy_rate) : "");
  const [dc, setDc] = useState(s?.daily_charge != null ? String(s.daily_charge) : "0");
  const [dr, setDr] = useState(s?.demand_rate != null ? String(s.demand_rate) : "0");
  const [meterId, setMeterId] = useState(s?.meter_id ?? ctx.meters[0]?.id ?? "");
  const [metric, setMetric] = useState<string>(s?.metric ?? "daily_kwh");
  const [thr, setThr] = useState(s?.threshold != null ? String(s.threshold) : "");
  const [errs, setErrs] = useState<Record<string, string>>({});

  function submit(e: FormEvent) {
    e.preventDefault();
    const x: Record<string, string> = {};
    const n = name.trim();
    if (n.length < 2 || n.length > 120) x.name = "Name must be 2 to 120 characters.";
    const base = { kind, name: n, ...(item ? { id: item.id } : {}), archived: !!item?.archived } as EnergyRecordInput;
    let out: EnergyRecordInput = base;
    if (kind === "site") {
      if (!tz.trim() || tz.length > 80) x.tz = "Enter an IANA time zone, for example Africa/Kigali.";
      const a = num(area);
      if (area.trim() && !(a > 0 && a <= 1e9)) x.area = "Area must be a positive number up to 1,000,000,000.";
      out = { ...base, timezone: tz.trim(), areaM2: area.trim() ? a : null };
    } else if (kind === "building") {
      if (!siteId) x.site = "Choose a site.";
      if (buildingType.trim().length < 2 || buildingType.trim().length > 80) x.buildingType = "Building type must be 2 to 80 characters.";
      if (!tz.trim() || tz.length > 80) x.tz = "Enter a valid IANA time zone.";
      try { new Intl.DateTimeFormat("en", { timeZone: tz }).format(); } catch { x.tz = "Enter a valid IANA time zone."; }
      if (address.trim().length > 400) x.address = "Address must be 400 characters or fewer.";
      const lat = latitude.trim() ? num(latitude) : null, lon = longitude.trim() ? num(longitude) : null;
      if ((lat === null) !== (lon === null)) x.coordinates = "Enter both coordinates or leave both blank.";
      if (lat !== null && !(Number.isFinite(lat) && lat >= -90 && lat <= 90)) x.latitude = "Latitude must be from -90 to 90.";
      if (lon !== null && !(Number.isFinite(lon) && lon >= -180 && lon <= 180)) x.longitude = "Longitude must be from -180 to 180.";
      const a = num(floorArea);
      if (floorArea.trim() && !(a > 0 && a <= 1e9)) x.floorArea = "Floor area must be positive and no more than 1,000,000,000.";
      if (description.length > 2000) x.description = "Description must be 2,000 characters or fewer.";
      const metadata = parseMetadata(metadataText, x);
      out = { ...base, siteId, buildingType: buildingType.trim(), address: address.trim() || null, latitude: lat, longitude: lon, timezone: tz.trim(), floorArea: floorArea.trim() ? a : null, areaUnit, description: description.trim() || null, metadata };
    } else if (kind === "asset") {
      if (!siteId) x.site = "Choose a site.";
      if (assetType.trim().length < 2 || assetType.trim().length > 80) x.assetType = "Asset type must be 2 to 80 characters.";
      if (identifier.trim().length > 120) x.identifier = "Identifier must be 120 characters or fewer.";
      if (description.length > 2000) x.description = "Description must be 2,000 characters or fewer.";
      if (manufacturer.trim().length > 120) x.manufacturer = "Manufacturer must be 120 characters or fewer.";
      if (model.trim().length > 120) x.model = "Model must be 120 characters or fewer.";
      if (serialNumber.trim().length > 120) x.serialNumber = "Serial number must be 120 characters or fewer.";
      if (commissioningDate && (!/^\d{4}-\d{2}-\d{2}$/.test(commissioningDate) || !validDate(commissioningDate))) x.commissioningDate = "Enter a valid commissioning date.";
      const c = num(capacity);
      if (capacity.trim() && !(c > 0 && c <= 1e12)) x.capacity = "Capacity must be positive and no more than 1,000,000,000,000.";
      if (capacity.trim() && !capacityUnit.trim()) x.capacityUnit = "Enter the capacity unit.";
      if (!capacity.trim() && capacityUnit.trim()) x.capacity = "Enter a capacity value or leave the unit blank.";
      if (capacityUnit.trim().length > 32) x.capacityUnit = "Capacity unit must be 32 characters or fewer.";
      const metadata = parseMetadata(metadataText, x);
      out = {
        ...base, siteId, ...(buildingId ? { buildingId } : {}), assetType: assetType.trim(),
        identifier: identifier.trim() || null, description: description.trim() || null,
        manufacturer: manufacturer.trim() || null, model: model.trim() || null,
        serialNumber: serialNumber.trim() || null, commissioningDate: commissioningDate || null,
        status, capacity: capacity.trim() ? c : null, capacityUnit: capacity.trim() ? capacityUnit.trim() : null, metadata,
      };
    } else if (kind === "meter") {
      if (!siteId) x.site = "Choose a site. Create a site first if none exists.";
      out = { ...base, siteId, unit: unit as EnergyRecordInput["unit"] };
    } else if (kind === "tariff") {
      if (!/^[A-Z]{3}$/.test(cur)) x.cur = "Use a three-letter ISO code in capitals, such as RWF.";
      const vals = { er: num(er), dc: num(dc), dr: num(dr) };
      for (const [k, v] of Object.entries(vals)) if (!(v >= 0 && v <= 1e6)) x[k] = "Enter a number from 0 to 1,000,000.";
      out = { ...base, currency: cur, energyRate: vals.er, dailyCharge: vals.dc, demandRate: vals.dr };
    } else {
      if (!meterId) x.meter = "Choose a meter.";
      const t = num(thr);
      if (!(t > 0 && t <= 1e12)) x.thr = "Threshold must be greater than zero.";
      out = { ...base, meterId, metric: metric as EnergyRecordInput["metric"], threshold: t };
    }
    setErrs(x);
    if (Object.keys(x).length === 0) onSave(out);
  }
  function parseMetadata(text: string, errors: Record<string, string>) {
    try {
      const parsed = JSON.parse(text || "{}") as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      const entries = Object.entries(parsed as Record<string, unknown>);
      if (entries.length > 30 || entries.some(([key, value]) => key.length > 60 ||
        !(value === null || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)) ||
          (typeof value === "string" && value.length <= 250)))) throw new Error();
      return parsed as NonNullable<EnergyRecordInput["metadata"]>;
    } catch {
      errors.metadata = "Use a JSON object with at most 30 short keys and simple values.";
      return {};
    }
  }
  const sel = "form-input";
  return (
    <form onSubmit={submit} noValidate aria-label={`${item ? "Edit" : "Add"} ${kind}`} className="space-y-4 border border-[#168568]/40 bg-[#f8fbfa] p-5" data-testid={`form-${kind}`}>
      <h3 className="font-bold text-[#10243a]">{item ? `Edit ${kind}` : `Add ${kind}`}</h3>
      {!!error && <Alert testId={`error-save-${kind}`}>{apiMessage(error)}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="NAME" error={errs.name}>{(p) => <input id={p.id} className="form-input" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid={`input-${kind}-name`} />}</Field>
        {kind === "site" && <>
          <Field label="TIME ZONE" error={errs.tz}>{(p) => <><input id={p.id} list="tz-list" className="form-input" value={tz} onChange={(e) => setTz(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-site-timezone" /><datalist id="tz-list">{ctx.zones.map((z) => <option key={z} value={z} />)}</datalist></>}</Field>
          <Field label="FLOOR AREA (M2), OPTIONAL" hint="Enables energy intensity in analyses." error={errs.area}>{(p) => <input id={p.id} inputMode="decimal" className="form-input" value={area} onChange={(e) => setArea(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-site-area" />}</Field>
        </>}
        {kind === "building" && <>
          <Field label="SITE" error={errs.site}>{(p) => <select id={p.id} className={sel} value={siteId} onChange={(e) => setSiteId(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="select-building-site">{ctx.sites.map((x) => <option key={x.id} value={x.id}>{x.name}{x.archived ? " (archived)" : ""}</option>)}</select>}</Field>
          <Field label="BUILDING TYPE" error={errs.buildingType}>{(p) => <input id={p.id} className={sel} value={buildingType} onChange={(e) => setBuildingType(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} placeholder="Office, warehouse, school..." data-testid="input-building-type" />}</Field>
          <Field label="TIME ZONE" error={errs.tz}>{(p) => <><input id={p.id} list="building-tz-list" className={sel} value={tz} onChange={(e) => setTz(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-building-timezone" /><datalist id="building-tz-list">{ctx.zones.map((z) => <option key={z} value={z} />)}</datalist></>}</Field>
          <Field label="ADDRESS" error={errs.address}>{(p) => <input id={p.id} className={sel} value={address} onChange={(e) => setAddress(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-building-address" />}</Field>
          <Field label="LATITUDE" error={errs.latitude}>{(p) => <input id={p.id} inputMode="decimal" className={sel} value={latitude} onChange={(e) => setLatitude(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-building-latitude" />}</Field>
          <Field label="LONGITUDE" error={errs.longitude ?? errs.coordinates}>{(p) => <input id={p.id} inputMode="decimal" className={sel} value={longitude} onChange={(e) => setLongitude(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-building-longitude" />}</Field>
          <Field label="FLOOR AREA" error={errs.floorArea}>{(p) => <input id={p.id} inputMode="decimal" className={sel} value={floorArea} onChange={(e) => setFloorArea(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-building-floor-area" />}</Field>
          <Field label="AREA UNIT">{(p) => <select id={p.id} className={sel} value={areaUnit} onChange={(e) => setAreaUnit(e.target.value as "m2" | "ft2")} data-testid="select-building-area-unit"><option value="m2">m²</option><option value="ft2">ft²</option></select>}</Field>
          <Field label="DESCRIPTION" error={errs.description}>{(p) => <textarea id={p.id} rows={3} className={sel} value={description} onChange={(e) => setDescription(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-building-description" />}</Field>
          <Field label="METADATA (JSON)" error={errs.metadata} hint="Optional flat key/value fields.">{(p) => <textarea id={p.id} rows={3} className={sel} value={metadataText} onChange={(e) => setMetadataText(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-building-metadata" />}</Field>
        </>}
        {kind === "asset" && <>
          <Field label="SITE" error={errs.site}>{(p) => <select id={p.id} className={sel} value={siteId} onChange={(e) => { setSiteId(e.target.value); setBuildingId(""); }} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="select-asset-site">{ctx.sites.map((x) => <option key={x.id} value={x.id}>{x.name}{x.archived ? " (archived)" : ""}</option>)}</select>}</Field>
          <Field label="BUILDING, OPTIONAL">{(p) => <select id={p.id} className={sel} value={buildingId} onChange={(e) => setBuildingId(e.target.value)} data-testid="select-asset-building"><option value="">Site-level asset</option>{ctx.buildings.filter((b) => b.site_id === siteId).map((x) => <option key={x.id} value={x.id}>{x.name}{x.archived ? " (archived)" : ""}</option>)}</select>}</Field>
          <Field label="ASSET TYPE" error={errs.assetType}>{(p) => <input id={p.id} className={sel} value={assetType} onChange={(e) => setAssetType(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} placeholder="HVAC, solar inverter, pump..." data-testid="input-asset-type" />}</Field>
          <Field label="IDENTIFIER / TAG" error={errs.identifier}>{(p) => <input id={p.id} className={sel} value={identifier} onChange={(e) => setIdentifier(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-asset-identifier" />}</Field>
          <Field label="STATUS">{(p) => <select id={p.id} className={sel} value={status} onChange={(e) => setStatus(e.target.value as NonNullable<EnergyRecordInput["status"]>)} data-testid="select-asset-status"><option value="planned">Planned</option><option value="operational">Operational</option><option value="maintenance">Maintenance</option><option value="retired">Retired</option></select>}</Field>
          <Field label="MANUFACTURER" error={errs.manufacturer}>{(p) => <input id={p.id} className={sel} value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-asset-manufacturer" />}</Field>
          <Field label="MODEL" error={errs.model}>{(p) => <input id={p.id} className={sel} value={model} onChange={(e) => setModel(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-asset-model" />}</Field>
          <Field label="SERIAL NUMBER" error={errs.serialNumber}>{(p) => <input id={p.id} className={sel} value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-asset-serial" />}</Field>
          <Field label="COMMISSIONING DATE" error={errs.commissioningDate}>{(p) => <input id={p.id} type="date" className={sel} value={commissioningDate} onChange={(e) => setCommissioningDate(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-asset-commissioning-date" />}</Field>
          <Field label="CAPACITY" error={errs.capacity}>{(p) => <input id={p.id} inputMode="decimal" className={sel} value={capacity} onChange={(e) => setCapacity(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-asset-capacity" />}</Field>
          <Field label="CAPACITY UNIT" error={errs.capacityUnit}>{(p) => <input id={p.id} className={sel} value={capacityUnit} onChange={(e) => setCapacityUnit(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} placeholder="kW, kWh, tonnes/hour..." data-testid="input-asset-capacity-unit" />}</Field>
          <Field label="DESCRIPTION" error={errs.description}>{(p) => <textarea id={p.id} rows={3} className={sel} value={description} onChange={(e) => setDescription(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-asset-description" />}</Field>
          <Field label="METADATA (JSON)" error={errs.metadata} hint="Optional flat key/value fields.">{(p) => <textarea id={p.id} rows={3} className={sel} value={metadataText} onChange={(e) => setMetadataText(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-asset-metadata" />}</Field>
        </>}
        {kind === "meter" && <>
          <Field label="SITE" error={errs.site}>{(p) => <select id={p.id} className={sel} value={siteId} onChange={(e) => setSiteId(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="select-meter-site">{ctx.sites.map((x) => <option key={x.id} value={x.id}>{x.name}{x.archived ? " (archived)" : ""}</option>)}</select>}</Field>
          <Field label="DEFAULT UNIT" hint="Used when an import row has no unit.">{(p) => <select id={p.id} className={sel} value={unit} onChange={(e) => setUnit(e.target.value)} data-testid="select-meter-unit">{UNITS.map((u) => <option key={u}>{u}</option>)}</select>}</Field>
        </>}
        {kind === "tariff" && <>
          <Field label="CURRENCY (ISO)" error={errs.cur}>{(p) => <input id={p.id} maxLength={3} className="form-input" value={cur} onChange={(e) => setCur(e.target.value.toUpperCase())} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-tariff-currency" />}</Field>
          <Field label="ENERGY RATE PER KWH" hint="Flat rate; not time-of-use." error={errs.er}>{(p) => <input id={p.id} inputMode="decimal" className="form-input" value={er} onChange={(e) => setEr(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-tariff-energy" />}</Field>
          <Field label="STANDING CHARGE PER DAY" hint="Applied per day that has data." error={errs.dc}>{(p) => <input id={p.id} inputMode="decimal" className="form-input" value={dc} onChange={(e) => setDc(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-tariff-daily" />}</Field>
          <Field label="DEMAND CHARGE PER KW" hint="Applied to each local month's peak kW." error={errs.dr}>{(p) => <input id={p.id} inputMode="decimal" className="form-input" value={dr} onChange={(e) => setDr(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-tariff-demand" />}</Field>
        </>}
        {kind === "rule" && <>
          <Field label="LINKED METER" error={errs.meter}>{(p) => <select id={p.id} className={sel} value={meterId} onChange={(e) => setMeterId(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="select-rule-meter">{ctx.meters.map((x) => <option key={x.id} value={x.id}>{x.name}{x.archived ? " (archived)" : ""}</option>)}</select>}</Field>
          <Field label="METRIC">{(p) => <select id={p.id} className={sel} value={metric} onChange={(e) => setMetric(e.target.value)} data-testid="select-rule-metric"><option value="daily_kwh">Daily energy (kWh)</option><option value="peak_kw">Peak demand (kW)</option></select>}</Field>
          <Field label={`THRESHOLD (${metric === "peak_kw" ? "KW" : "KWH PER DAY"})`} hint="An alert is raised when a saved analysis exceeds it." error={errs.thr}>{(p) => <input id={p.id} inputMode="decimal" className="form-input" value={thr} onChange={(e) => setThr(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-rule-threshold" />}</Field>
        </>}
      </div>
      <div className="flex flex-wrap gap-3"><SubmitButton pending={pending} testId={`button-save-${kind}`}>Save {kind}</SubmitButton><Btn onClick={onCancel} testId={`button-cancel-${kind}`}>Cancel</Btn></div>
    </form>
  );
}

function validDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
