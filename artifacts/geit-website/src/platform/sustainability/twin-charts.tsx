import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EngineeringResult } from "@workspace/api-client-react";
import { Panel } from "../energy/ui";

type Row = Record<string, string | number | null>;
const MAX = 10000;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
/** Native rows omit missing periods; insert an all-null point where a gap exists so lines break. */
function withGaps(rows: Row[], valueKeys: string[]): Row[] {
  const out: Row[] = [];
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    if (prev && typeof prev.end === "string" && typeof r.start === "string" && Date.parse(r.start) > Date.parse(prev.end)) {
      out.push({ start: prev.end, end: r.start, ...Object.fromEntries(valueKeys.map((k) => [k, null])) });
    }
    out.push(r);
  });
  return out;
}
const isGap = (r: Row, keys: string[]) => keys.every((k) => r[k] === null || r[k] === undefined);
/** Downsampling never drops gap points or flagged anomalies. */
function sample(rows: Row[], keys: string[], keep?: (r: Row) => boolean) {
  if (rows.length <= MAX) return { rows, step: 1 };
  const step = Math.ceil(rows.length / MAX);
  return { rows: rows.filter((r, i) => i % step === 0 || isGap(r, keys) || (keep?.(r) ?? false)), step };
}
const tick = (s: unknown) => String(s).slice(5, 16).replace("T", " ");
type S = { key: string; name: string; color: string; dash?: string; dots?: boolean };

function Chart({ id, title, note, data, series, total, step }: { id: string; title: string; note: string; data: Row[]; series: S[]; total: number; step: number }) {
  const live = series.filter((s) => data.some((r) => num(r[s.key]) !== null));
  if (!live.length) return null;
  return (
    <div className="min-w-0" data-testid={`chart-${id}`}>
      <h3 className="text-sm font-bold text-[#10243a]">{title}</h3>
      <p className="mb-2 text-xs text-[#6b7b87]">{note} Energy in kWh per interval; times in UTC as recorded in the result.{step > 1 && ` Display sampled: every ${step}th of ${total.toLocaleString("en-GB")} rows is drawn; the tables and exports keep every row.`}</p>
      <div role="img" aria-label={`${title}. ${live.map((s) => s.name).join(", ")}.`} className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="#e3e9ed" strokeDasharray="3 3" />
            <XAxis dataKey="start" tickFormatter={tick} minTickGap={48} tick={{ fontSize: 11, fill: "#566b77" }} />
            <YAxis tick={{ fontSize: 11, fill: "#566b77" }} width={64} label={{ value: "kWh", angle: -90, position: "insideLeft", fontSize: 11, fill: "#566b77" }} />
            <Tooltip formatter={(v) => (typeof v === "number" ? `${v.toLocaleString("en-GB", { maximumFractionDigits: 2 })} kWh` : "n/a")} labelFormatter={(l) => `${l}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {live.map((s) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.dots ? "transparent" : s.color} strokeDasharray={s.dash} strokeWidth={s.dots ? 0 : 1.6} dot={s.dots ? { r: 4, fill: s.color, stroke: s.color } : false} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TwinCharts({ result }: { result: EngineeringResult }) {
  const find = (t: string) => result.tables.find((x) => x.title.toLowerCase().startsWith(t));
  const hist = find("historical building series"); const hourly = find("hourly building history"); const fc = find("load forecast");
  const HK = ["loadKwh", "solarKwh", "chargeKwh", "dischargeKwh", "gridImportKwh", "gridExportKwh", "socKwh"];
  const h = hist && hist.rows.length ? sample(withGaps(hist.rows, HK), HK) : null;
  const hh = hourly && hourly.rows.length ? sample(hourly.rows.map((r) => ({ ...r, anomalyPoint: r.anomaly === "high" || r.anomaly === "low" ? num(r.energyKwh) : null })), ["energyKwh"], (r) => r.anomalyPoint !== null) : null;
  const f = fc && fc.rows.length ? sample(fc.rows, []) : null;
  if (!h && !hh && !f) return null;
  return (
    <Panel id="charts-h" title="Charts from the saved result">
      <ul className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#34495a]" aria-label="Value types legend" data-testid="legend-value-types">
        {(h || hh) && <li><strong className="text-[#10243a]">Measured:</strong> imported building load and solar readings, where supplied</li>}
        {f && <li><strong className="text-[#10243a]">Estimated / forecast:</strong> model output, not actual readings</li>}
        {h && <li><strong className="text-[#10243a]">Simulated:</strong> grid flows and battery dispatch, where configured; not measured operation</li>}
      </ul>
      <div className="space-y-8">
        {h && hist && <Chart id="history" title="Historical load, solar and battery" note="Measured and simulated series from the saved table; gaps stay as gaps." data={h.rows} step={h.step} total={hist.rows.length} series={[{ key: "loadKwh", name: "Building load", color: "#10243a" }, { key: "solarKwh", name: "Solar", color: "#c98f12" }, { key: "chargeKwh", name: "Battery charge", color: "#168568" }, { key: "dischargeKwh", name: "Battery discharge", color: "#7a3b8f", dash: "5 3" }]} />}
        {hh && hourly && <Chart id="hourly" title="Hourly load with assessed anomalies" note="Dots mark only hours the server assessed as high or low; hours not assessed are never flagged." data={hh.rows} step={hh.step} total={hourly.rows.length} series={[{ key: "energyKwh", name: "Measured hourly energy", color: "#10243a" }, { key: "expectedKwh", name: "Expected (trailing four weeks)", color: "#168568", dash: "4 3" }, { key: "anomalyPoint", name: "Flagged anomaly", color: "#b3361f", dots: true }]} />}
        {f && fc && <Chart id="forecast" title="Modelled load forecast (not measured)" note="A modelled four-week same-hour-of-week average with a range; these are not actual readings." data={f.rows} step={f.step} total={fc.rows.length} series={[{ key: "forecastKwh", name: "Forecast (model)", color: "#168568" }, { key: "lowerKwh", name: "Lower bound", color: "#8aa3b0", dash: "4 3" }, { key: "upperKwh", name: "Upper bound", color: "#8aa3b0", dash: "4 3" }]} />}
      </div>
    </Panel>
  );
}
