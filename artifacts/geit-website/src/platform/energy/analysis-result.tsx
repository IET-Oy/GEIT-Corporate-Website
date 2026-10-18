import { Download } from "lucide-react";
import type { EnergyAnalysis } from "@workspace/api-client-react";
import { DailyChart, ProfileChart } from "./charts";
import { DemoBadge, Stat, fmt, fmtDate } from "./ui";

export function AnalysisResult({ orgId, a }: { orgId: string; a: EnergyAnalysis }) {
  const r = a.result; const cur = r.currency ?? "";
  const money = (v: number | null) => (v === null ? "Unavailable" : `${cur} ${fmt(v, 2)}`.trim());
  const noTariff = r.cost === null;
  const base = `/api/platform/energy/${encodeURIComponent(orgId)}/analyses/${encodeURIComponent(a.id)}/export`;
  return (
    <article className="space-y-6" aria-labelledby="result-h" data-testid="analysis-result">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 id="result-h" className="text-xl font-extrabold text-[#10243a]">{a.name} {a.is_demo && <DemoBadge />}</h3>
          <p className="mt-1 text-xs text-[#6b7b87]">Saved {fmtDate(a.created_at)} · model {r.version} · time zone {r.timezone}</p>
        </div>
        <div className="flex flex-wrap gap-2">{["csv", "xlsx", "pdf"].map((f) => <a key={f} href={`${base}/${f}`} download data-testid={`link-export-${f}`} className="inline-flex min-h-[38px] items-center gap-2 border border-[#10243a] px-4 text-xs font-bold uppercase text-[#10243a] hover:bg-[#10243a] hover:text-white"><Download size={14} aria-hidden="true" />{f}</a>)}</div>
      </header>
      {a.is_demo && <p className="border-l-4 border-[#2b4a60] bg-[#eaf1f5] px-4 py-2 text-sm text-[#2b4a60]">This result is calculated from synthetic demonstration readings, not from a real facility.</p>}
      <dl className="grid gap-px bg-[#dce3e8] sm:grid-cols-2 lg:grid-cols-4" aria-label="Key figures">
        <Stat testId="kpi-kwh" label="ENERGY" value={fmt(r.kwh, 1, " kWh")} />
        <Stat testId="kpi-peak" label="PEAK DEMAND" value={fmt(r.peakKw, 1, " kW")} />
        <Stat testId="kpi-average" label="AVERAGE POWER" value={fmt(r.averageKw, 1, " kW")} />
        <Stat testId="kpi-load-factor" label="LOAD FACTOR" value={fmt(r.loadFactorPercent, 1, "%")} />
        <Stat testId="kpi-coverage" label="DATA COVERAGE" value={fmt(r.coveragePercent, 1, "%")} note={`${fmt(r.coveredHours, 1)} h covered, ${r.readingCount.toLocaleString("en-GB")} readings`} />
        <Stat testId="kpi-cost" label="MODELLED COST" value={noTariff ? "Unavailable" : money(r.cost)} note={noTariff ? "No tariff selected" : "Estimate, not an invoice"} />
        <Stat testId="kpi-intensity" label="ENERGY INTENSITY" value={fmt(r.intensityKwhM2, 2, " kWh/m2")} note={r.intensityKwhM2 === null ? "Needs site floor area" : undefined} />
        <Stat testId="kpi-baseline" label="CHANGE VS BASELINE" value={fmt(r.baselineChangePercent, 1, "%")} note={r.baselineChangePercent === null ? "No baseline supplied" : undefined} />
        <Stat testId="kpi-target" label="DIFFERENCE TO TARGET" value={fmt(r.targetDifferenceKwh, 1, " kWh")} note={r.targetDifferenceKwh === null ? "No target supplied" : "Positive means above target"} />
        <Stat testId="kpi-energy-cost" label="ENERGY CHARGE" value={money(r.energyCost)} />
        <Stat testId="kpi-standing-cost" label="STANDING CHARGE" value={money(r.standingCost)} />
        <Stat testId="kpi-demand-cost" label="DEMAND CHARGE" value={money(r.demandCost)} />
      </dl>
      <p className="text-xs leading-5 text-[#6b7b87]">Costs use a flat energy rate, a standing charge per day with data, and a demand charge on each local month's peak kW. Rates are not time-of-use. Figures are modelled estimates, not invoices.</p>
      {r.coveragePercent < 100 && <p role="status" className="border-l-4 border-[#e8b64b] bg-[#fdf4dc] px-4 py-2 text-sm text-[#7a5a10]" data-testid="warn-coverage">Readings cover {fmt(r.coveragePercent, 1)}% of the requested period. Totals reflect covered intervals only and are not extrapolated.</p>}
      <div className="grid gap-8 xl:grid-cols-2"><DailyChart pts={r.daily} tz={r.timezone} /><ProfileChart pts={r.loadProfile} tz={r.timezone} /></div>
      {r.notes.length > 0 && <section aria-labelledby="notes-h"><h4 id="notes-h" className="font-bold text-[#10243a]">Notes and data gaps</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#34495a]" data-testid="list-notes">{r.notes.map((n, i) => <li key={i}>{n}</li>)}</ul></section>}
    </article>
  );
}
