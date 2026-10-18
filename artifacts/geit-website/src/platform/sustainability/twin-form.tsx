import { useState } from "react";
import { Link } from "wouter";
import { getGetDigitalTwinSourcesQueryKey, useGetDigitalTwinSources, type EngineeringInputs, type TwinBattery, type TwinInputs } from "@workspace/api-client-react";
import { Alert, Field, Skeleton, apiMessage, withOrg } from "../common";
import { INPUT, parseNum, type Builder, type Errors } from "./utils";

type B = { capacityKwh: string; minSocPercent: string; maxSocPercent: string; initialSocPercent: string; maxChargeKw: string; maxDischargeKw: string; chargeEfficiency: string; dischargeEfficiency: string; dispatchMode: string; gridTargetKw: string };
const blankB: B = { capacityKwh: "", minSocPercent: "", maxSocPercent: "", initialSocPercent: "", maxChargeKw: "", maxDischargeKw: "", chargeEfficiency: "", dischargeEfficiency: "", dispatchMode: "self_consumption", gridTargetKw: "" };
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const BFIELDS: [keyof B, string, string][] = [["capacityKwh", "CAPACITY", "kWh"], ["minSocPercent", "MIN STATE OF CHARGE", "%"], ["maxSocPercent", "MAX STATE OF CHARGE", "%"], ["initialSocPercent", "INITIAL STATE OF CHARGE", "%"], ["maxChargeKw", "MAX CHARGE POWER", "kW"], ["maxDischargeKw", "MAX DISCHARGE POWER", "kW"], ["chargeEfficiency", "ONE-WAY CHARGE EFFICIENCY", "0.01 to 1"], ["dischargeEfficiency", "ONE-WAY DISCHARGE EFFICIENCY", "0.01 to 1"]];

export function TwinForm({ orgId, seed, disabled, builder }: { orgId: string; seed: EngineeringInputs | null; disabled: boolean; builder: Builder }) {
  const q = useGetDigitalTwinSources(orgId, { query: { retry: false, queryKey: getGetDigitalTwinSourcesQueryKey(orgId) } });
  const s: TwinInputs | null = seed && seed.model === "twin" ? seed : null;
  const [notes, setNotes] = useState(s?.sourceNotes ?? ""); const [bm, setBm] = useState(s?.buildingMeterId ?? ""); const [sm, setSm] = useState(s?.solarMeterId ?? "");
  const [start, setStart] = useState(s?.start ?? ""); const [end, setEnd] = useState(s?.end ?? "");
  const [gross, setGross] = useState(false);
  const [useBat, setUseBat] = useState(!!s?.battery);
  const [bat, setBat] = useState<B>(s?.battery ? Object.fromEntries(Object.entries({ ...blankB, ...s.battery }).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)])) as B : blankB);
  const [hz, setHz] = useState(s ? String(s.forecastHorizonHours) : "24"); const [th, setTh] = useState(s ? String(s.anomalyThreshold) : "3");
  const [errs, setErrs] = useState<Errors>({});
  const meters = (q.data?.meters ?? []).filter((m) => !m.is_demo && !m.archived);
  const site = (id: string) => q.data?.sites.find((x) => x.id === meters.find((m) => m.id === id)?.site_id);
  const sb = (k: keyof B, v: string) => setBat((p) => ({ ...p, [k]: v }));

  builder.current = () => {
    const e: Errors = {};
    if (notes.trim().length < 10 || notes.trim().length > 2000) e.notes = "Describe the data source (10 to 2000 characters).";
    if (!bm) e.bm = "Select the building meter.";
    if (sm && sm === bm) e.sm = "The solar meter must differ from the building meter.";
    if (useBat && !sm) e.battery = "A battery needs a solar (PV) meter with a real series.";
    if (useBat && sm && bm && meters.find((m) => m.id === sm)?.site_id !== meters.find((m) => m.id === bm)?.site_id) e.sm = "Building and solar meters must belong to the same site.";
    if (!ISO.test(start.trim()) || Number.isNaN(Date.parse(start.trim()))) e.start = "Use ISO 8601 with an offset, e.g. 2025-01-01T00:00:00Z or +02:00.";
    if (!ISO.test(end.trim()) || Number.isNaN(Date.parse(end.trim()))) e.end = "Use ISO 8601 with an offset, e.g. 2025-03-01T00:00:00Z.";
    if (!e.start && !e.end && Date.parse(end.trim()) <= Date.parse(start.trim())) e.end = "End must be after start.";
    if (!gross) e.gross = "Confirm the building meter is gross AC load.";
    let battery: TwinBattery | null = null;
    if (useBat) {
      const n: Record<string, number> = {};
      for (const [k, , u] of BFIELDS) {
        const v = parseNum(bat[k]);
        if (v === null) e[k] = "Required."; else if (Number.isNaN(v)) e[k] = "Enter a number.";
        else if (k === "capacityKwh" || k === "maxChargeKw" || k === "maxDischargeKw") { if (v <= 0) e[k] = "Must be greater than 0."; else n[k] = v; }
        else if (u === "%") { if (v < 0 || v > 100) e[k] = "Enter 0 to 100."; else n[k] = v; }
        else if (v < 0.01 || v > 1) e[k] = "Enter 0.01 to 1."; else n[k] = v;
      }
      let g: number | null = null;
      if (bat.gridTargetKw.trim()) { const v = parseNum(bat.gridTargetKw); if (v === null || Number.isNaN(v) || v < 0) e.gridTargetKw = "Enter 0 or more, or leave blank."; else g = v; }
      if (!e.minSocPercent && !e.maxSocPercent && n.minSocPercent > n.maxSocPercent) e.maxSocPercent = "Max must be at least min.";
      if (!e.initialSocPercent && !e.minSocPercent && !e.maxSocPercent && (n.initialSocPercent < n.minSocPercent || n.initialSocPercent > n.maxSocPercent)) e.initialSocPercent = "Initial must be between min and max.";
      if (!Object.keys(e).some((k) => k in bat)) battery = { capacityKwh: n.capacityKwh, minSocPercent: n.minSocPercent, maxSocPercent: n.maxSocPercent, initialSocPercent: n.initialSocPercent, maxChargeKw: n.maxChargeKw, maxDischargeKw: n.maxDischargeKw, chargeEfficiency: n.chargeEfficiency, dischargeEfficiency: n.dischargeEfficiency, dispatchMode: bat.dispatchMode as TwinBattery["dispatchMode"], gridTargetKw: g };
    }
    const h = parseNum(hz); if (h === null) e.hz = "Required."; else if (Number.isNaN(h) || !Number.isInteger(h) || h < 1 || h > 168) e.hz = "Whole hours from 1 to 168.";
    const t = parseNum(th); if (t === null) e.th = "Required."; else if (Number.isNaN(t) || t < 2 || t > 10) e.th = "Enter 2 to 10.";
    setErrs(e); if (Object.keys(e).length) return null;
    const out: TwinInputs = { model: "twin", sourceNotes: notes.trim(), buildingMeterId: bm, solarMeterId: sm || null, start: start.trim(), end: end.trim(), loadBasis: "gross_building_load", battery, forecastHorizonHours: h as number, anomalyThreshold: t as number };
    return out;
  };

  if (q.isLoading) return <Skeleton label="Loading meters" />;
  if (q.isError) return <Alert testId="error-sources">{apiMessage(q.error, "Could not load meters.")} <button type="button" className="font-bold underline" onClick={() => q.refetch()}>Retry</button></Alert>;
  if (meters.length === 0) return <div data-testid="cta-no-meters"><Alert tone="info">No non-demo meters with readings are available. Create a site and meter and import CSV or Excel readings in <Link href={withOrg("/app/energy-management", orgId)} className="font-bold text-[#168568] underline">Energy Management</Link>. Synthetic demo meters are never used here.</Alert></div>;

  const opt = (m: (typeof meters)[number]) => <option key={m.id} value={m.id}>{m.name} ({site(m.id)?.name ?? "site"}, {m.unit})</option>;
  return (
    <div className="min-w-0 space-y-6">
      <Alert tone="info">Connected providers: {q.data?.connectedProviderStatus.replace("_", " ")}. Only readings imported into Energy Management are used; at most {q.data?.readingLimit.toLocaleString("en-GB")} readings per analysis combined ({((q.data?.readingLimit ?? 0) / 2).toLocaleString("en-GB")} per stream, building and solar).</Alert>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field label="BUILDING METER" error={errs.bm}>{(p) => <select id={p.id} className={INPUT} value={bm} disabled={disabled} onChange={(e) => setBm(e.target.value)} data-testid="select-building-meter"><option value="">Select a meter</option>{meters.map(opt)}</select>}</Field>
        <Field label="SOLAR METER (OPTIONAL)" hint="Needed for solar series and any battery." error={errs.sm}>{(p) => <select id={p.id} className={INPUT} value={sm} onChange={(e) => setSm(e.target.value)} data-testid="select-solar-meter"><option value="">None</option>{meters.filter((m) => m.id !== bm).map(opt)}</select>}</Field>
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field label="ANALYSIS START" hint="ISO 8601 with offset, e.g. 2025-01-01T00:00:00Z" error={errs.start}>{(p) => <input id={p.id} className={INPUT} value={start} onChange={(e) => setStart(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-twin-start" />}</Field>
        <Field label="ANALYSIS END (EXCLUSIVE)" hint="Forecasts need 35 or more continuous days of complete hourly data." error={errs.end}>{(p) => <input id={p.id} className={INPUT} value={end} onChange={(e) => setEnd(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-twin-end" />}</Field>
      </div>
      <div>
        <label className="flex items-start gap-3 text-sm text-[#34495a]"><input type="checkbox" className="mt-1" checked={gross} onChange={(e) => setGross(e.target.checked)} data-testid="check-gross-load" />I confirm the building meter records gross AC building load, not net grid import.</label>
        {errs.gross && <p className="mt-1.5 text-xs font-semibold text-[#9b2c1b]">{errs.gross}</p>}
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field label="FORECAST HORIZON (HOURS)" hint="1 to 168. Editable default." error={errs.hz}>{(p) => <input id={p.id} inputMode="numeric" className={INPUT} value={hz} onChange={(e) => setHz(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-horizon" />}</Field>
        <Field label="ANOMALY THRESHOLD" hint="2 to 10. Editable default." error={errs.th}>{(p) => <input id={p.id} inputMode="decimal" className={INPUT} value={th} onChange={(e) => setTh(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-threshold" />}</Field>
      </div>
      <div className="min-w-0 border border-[#dce3e8] bg-[#f8fafb] p-4">
        <label className="flex items-center gap-3 text-sm font-bold text-[#10243a]"><input type="checkbox" checked={useBat} onChange={(e) => setUseBat(e.target.checked)} data-testid="check-battery" />Add a battery dispatch simulation</label>
        <p className="mt-1 text-xs text-[#6b7b87]">Physical dispatch only. No tariff cost, savings or ROI is inferred. Requires a solar meter on the same site with exactly aligned intervals.</p>
        {errs.battery && <p className="mt-2 text-xs font-semibold text-[#9b2c1b]">{errs.battery}</p>}
        {useBat && (
          <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BFIELDS.map(([k, l, u]) => <Field key={k} label={`${l} (${u})`} error={errs[k]}>{(p) => <input id={p.id} inputMode="decimal" className={INPUT} value={bat[k]} onChange={(e) => sb(k, e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid={`input-battery-${k}`} />}</Field>)}
            <Field label="DISPATCH MODE">{(p) => <select id={p.id} className={INPUT} value={bat.dispatchMode} onChange={(e) => sb("dispatchMode", e.target.value)} data-testid="select-battery-mode"><option value="self_consumption">Self-consumption</option><option value="peak_shaving">Peak shaving</option></select>}</Field>
            <Field label="GRID TARGET (kW, OPTIONAL)" error={errs.gridTargetKw}>{(p) => <input id={p.id} inputMode="decimal" className={INPUT} value={bat.gridTargetKw} onChange={(e) => sb("gridTargetKw", e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-battery-gridTargetKw" />}</Field>
          </div>)}
      </div>
      <Field label="SOURCE NOTES" hint="Meter provenance, installation and data quality." error={errs.notes}>{(p) => <textarea id={p.id} rows={2} className={INPUT} value={notes} onChange={(e) => setNotes(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-twin-notes" />}</Field>
    </div>
  );
}
