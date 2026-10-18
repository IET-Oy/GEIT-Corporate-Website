import { useState, type FormEvent } from "react";
import type { EnergyMeter, EnergyRule, EnergySite, EnergyTariff, EnergyRecordInput } from "@workspace/api-client-react";
import { Alert, Field, SubmitButton, apiMessage } from "../common";
import { Btn, UNITS } from "./ui";

export type Kind = "site" | "meter" | "tariff" | "rule";
export type Existing = EnergySite | EnergyMeter | EnergyTariff | EnergyRule;
type Ctx = { sites: EnergySite[]; meters: EnergyMeter[]; zones: string[] };

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

export function RecordForm({ kind, item, ctx, pending, error, onCancel, onSave }: {
  kind: Kind; item: Existing | null; ctx: Ctx; pending: boolean; error: unknown; onCancel: () => void; onSave: (v: EnergyRecordInput) => void;
}) {
  const s = item as Partial<EnergySite & EnergyMeter & EnergyTariff & EnergyRule> | null;
  const [name, setName] = useState(s?.name ?? "");
  const [tz, setTz] = useState(s?.timezone ?? "Africa/Kigali");
  const [area, setArea] = useState(s?.area_m2 != null ? String(s.area_m2) : "");
  const [siteId, setSiteId] = useState(s?.site_id ?? ctx.sites[0]?.id ?? "");
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
