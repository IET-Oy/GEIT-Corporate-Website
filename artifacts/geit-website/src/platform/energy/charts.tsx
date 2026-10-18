import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EnergyPoint } from "@workspace/api-client-react";
import { fmt } from "./ui";

function Table({ caption, pts, label, powerLabel = "Average kW" }: { caption: string; pts: EnergyPoint[]; label: string; powerLabel?: string }) {
  return (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer font-bold text-[#168568]">View as table</summary>
      <div className="mt-2 max-h-56 overflow-auto border border-[#edf0f2]">
        <table className="w-full text-left"><caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-[#f2f5f7]"><tr><th scope="col" className="px-3 py-2">{label}</th><th scope="col" className="px-3 py-2">kWh</th><th scope="col" className="px-3 py-2">{powerLabel}</th></tr></thead>
          <tbody>{pts.map((p) => <tr key={p.label} className="border-t border-[#edf0f2]"><th scope="row" className="px-3 py-1.5 font-mono font-normal">{p.label}</th><td className="px-3 py-1.5">{fmt(p.kwh, 2)}</td><td className="px-3 py-1.5">{fmt(p.kw, 2)}</td></tr>)}</tbody>
        </table>
      </div>
    </details>
  );
}
const axis = { fontSize: 11, fill: "#566b77" };

export function DailyChart({ pts, tz }: { pts: EnergyPoint[]; tz: string }) {
  return (
    <figure className="min-w-0 max-w-full" data-testid="chart-daily">
      <figcaption className="text-sm font-bold text-[#10243a]">Daily energy (kWh per local day, {tz})</figcaption>
      {pts.length === 0 ? <p className="mt-3 text-sm text-[#6b7b87]">No daily data in this period.</p> : <>
        <div className="mt-3 h-64" role="img" aria-label={`Column chart of daily energy in kWh across ${pts.length} days`}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={pts.map((p) => ({ ...p, time: Date.parse(`${p.label}T00:00:00Z`) }))} margin={{ left: 4, right: 8, top: 6 }}>
            <CartesianGrid stroke="#edf0f2" vertical={false} /><XAxis type="number" scale="time" dataKey="time" domain={[(v: number) => v - 43200000, (v: number) => v + 43200000]} tick={axis} minTickGap={24} tickFormatter={(v: number) => new Date(v).toISOString().slice(5, 10)} /><YAxis domain={[0, "auto"]} tick={axis} width={52} label={{ value: "kWh", angle: -90, position: "insideLeft", style: axis }} />
            <Tooltip formatter={(v: number) => [`${fmt(v, 2)} kWh`, "Energy"]} labelFormatter={(l) => `Day ${new Date(Number(l)).toISOString().slice(0, 10)}`} /><Bar dataKey="kwh" maxBarSize={48} fill="#168568" isAnimationActive={false} />
          </BarChart></ResponsiveContainer></div>
        <Table caption="Daily energy" pts={pts} label="Day" powerLabel="Peak interval-average kW" /></>}
    </figure>
  );
}
export function ProfileChart({ pts, tz }: { pts: EnergyPoint[]; tz: string }) {
  return (
    <figure className="min-w-0 max-w-full" data-testid="chart-profile">
      <figcaption className="text-sm font-bold text-[#10243a]">Load profile (average kW by local hour, {tz})</figcaption>
      {pts.length === 0 ? <p className="mt-3 text-sm text-[#6b7b87]">No load profile data in this period.</p> : <>
        <div className="mt-3 h-64" role="img" aria-label="Line chart of average power in kW by hour of day">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={pts} margin={{ left: 4, right: 8, top: 6 }}>
            <CartesianGrid stroke="#edf0f2" vertical={false} /><XAxis dataKey="label" tick={axis} label={{ value: "Hour", position: "insideBottomRight", offset: -2, style: axis }} /><YAxis domain={[0, "auto"]} tick={axis} width={52} label={{ value: "kW", angle: -90, position: "insideLeft", style: axis }} />
            <Tooltip formatter={(v: number) => [`${fmt(v, 2)} kW`, "Average power"]} labelFormatter={(l) => `Hour ${l}`} /><Line type="monotone" dataKey="kw" stroke="#10243a" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
          </LineChart></ResponsiveContainer></div>
        <Table caption="Load profile" pts={pts} label="Hour" /></>}
    </figure>
  );
}
