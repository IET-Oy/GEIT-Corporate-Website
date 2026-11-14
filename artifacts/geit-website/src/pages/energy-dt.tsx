import { ArrowRight, ArrowUpRight, BarChart3, BatteryCharging, Building2, Cpu, Database, Factory, FileText, Gauge, Landmark, Leaf, LineChart, Lock, PlugZap, ShieldCheck, Store, Sun, Users, Zap } from "lucide-react";
import type { LucideIcon, LucideProps } from "lucide-react";
import { Link } from "wouter";
import { PageMetadata } from "@/components/page-metadata";
import { useLanguage } from "@/lib/language-context";
import { ENERGY_DT_URL, energyDtLink } from "@/config/energy-dt";

type Capability = { id: string; icon: LucideIcon; title: string; summary: string; points: string[] };

/** Capabilities describe what the Energy DT application does today, not promised outcomes. */
export const capabilities: Capability[] = [
  { id: "energy-management", icon: Gauge, title: "Energy Management",
    summary: "One structured register of sites, buildings, assets and meters, with interval data turned into consumption, demand and cost insight.",
    points: ["Site, building, asset and meter registry", "Validated CSV and Excel interval-data import", "Consumption, peak demand and tariff-based cost analysis", "Threshold alert rules"] },
  { id: "renewable-energy", icon: Sun, title: "Renewable Energy Management",
    summary: "Screen and track solar PV using your own irradiation, demand and tariff assumptions.",
    points: ["Monthly generation, specific yield and self-consumption", "Grid import and export with import/export rates", "Capital cost and lifetime screening"] },
  { id: "battery-flexibility", icon: BatteryCharging, title: "Battery Storage and Flexibility",
    summary: "Explore battery sizing and dispatch for peak shaving and load shifting against your demand profile, solar and tariff.",
    points: ["Capacity, power, state-of-charge and efficiency limits", "Interval dispatch simulation", "Grid import, export and cost comparison"] },
  { id: "energy-efficiency", icon: Zap, title: "Energy Efficiency and Optimization",
    summary: "Compare baselines with proposed measures and keep every revision of an audit or consulting case on record.",
    points: ["Audit measures with baseline and proposed power and hours", "Energy, cost and discounted-value comparison", "Revision history that preserves earlier results"] },
  { id: "carbon", icon: Leaf, title: "Carbon Footprint Monitoring",
    summary: "Screen operational emissions with versioned emission factors, so every figure can be traced to its source.",
    points: ["Scope-based screening from energy and fuel inputs", "Versioned emission-factor records", "Baseline, proposed and reduction comparison"] },
  { id: "ev-charging", icon: PlugZap, title: "EV Charging Management",
    summary: "Analyse charging sessions alongside site load to understand peak demand and the effect of managed charging.",
    points: ["Charger count, rated power and session records", "Measured versus managed-schedule site peak", "Utilisation, solar contribution and optional battery support"] },
  { id: "ai-analytics", icon: Cpu, title: "AI-Powered Energy Insights and Analytics",
    summary: "A building digital twin combining measured history with simulation, adding forecasts and anomaly signals when the data supports them.",
    points: ["Digital twin of building load, solar and grid flows", "Forecasting and anomaly detection from sufficient history", "Optional AI-assisted explanations grounded in saved evidence"] },
];

const problems = [
  { title: "Scattered data", text: "Bills, meter exports and spreadsheets sit in different places and are hard to compare across sites." },
  { title: "Unclear costs and peaks", text: "Without interval analysis it is difficult to see when energy is used, what drives demand charges and where money is lost." },
  { title: "Hard-to-compare options", text: "Solar, storage, efficiency and EV charging decisions are often assessed separately, with inconsistent assumptions." },
  { title: "Weak evidence for decisions", text: "Results that cannot be traced to their inputs are difficult to defend to management, finance or sustainability teams." },
];

const customers: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Store, title: "SMEs", text: "Understand energy costs and test practical savings, solar and storage options without a dedicated energy team." },
  { icon: Building2, title: "Commercial buildings", text: "See consumption, peaks and cost by site and building, and compare improvement measures." },
  { icon: Users, title: "Organisations with multiple sites", text: "Keep one structured, role-controlled record of assets, data and analyses across the portfolio." },
  { icon: Factory, title: "Industrial facilities", text: "Analyse demand peaks, tariffs and flexibility options for energy-intensive operations." },
  { icon: Landmark, title: "Public institutions", text: "Build a documented evidence base for energy and carbon decisions." },
  { icon: Zap, title: "Energy and infrastructure companies", text: "Evaluate renewable, storage and EV charging options consistently for clients and assets." },
];

const steps: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Database, title: "Connect your data", text: "Register sites, buildings, assets and meters, then import interval readings from CSV or Excel templates." },
  { icon: Cpu, title: "Model the system", text: "Build a digital twin and scenarios for renewables, storage, efficiency, EV charging and carbon." },
  { icon: LineChart, title: "Analyse and compare", text: "Review consumption, demand, cost and emissions, and compare baselines with proposed options." },
  { icon: FileText, title: "Decide and report", text: "Save verifiable results and export CSV and PDF reports for your organisation." },
];

const benefits = [
  "One organisation-wide record of energy assets and data.",
  "Consistent, documented methods instead of disconnected spreadsheets.",
  "Every saved result linked to its inputs, so figures can be checked and repeated.",
  "Faster screening of options before investing in detailed engineering.",
  "A shared evidence base for management, finance and sustainability teams.",
];

const foundations: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Lock, title: "Organisation-level separation", text: "Each organisation’s records are kept separate, with database row-level security on tenant data." },
  { icon: Users, title: "Role-based access", text: "Owner, administrator, editor, analyst and reader roles control who can view and change records." },
  { icon: ShieldCheck, title: "Verifiable results", text: "Saved analyses are signed together with their inputs and checked before display or export." },
  { icon: BarChart3, title: "Honest outputs", text: "Measured, simulated and estimated values are labelled; forecasts are withheld when history is insufficient." },
];

const availability: { area: string; status: "Available" | "Planned" | "Requires configuration"; note: string }[] = [
  { area: "Accounts, sign-in and organisation management", status: "Available", note: "Email-based accounts with organisation roles." },
  { area: "Energy, engineering, carbon and digital-twin modules", status: "Available", note: "Results are calculated only from data you enter or import." },
  { area: "Projects and reports with CSV/PDF exports", status: "Available", note: "Saved analyses and scenarios across modules." },
  { area: "AI-assisted explanations", status: "Requires configuration", note: "Enabled once an AI provider is configured for the platform." },
  { area: "Live meter, BMS, SCADA or IoT data feeds", status: "Planned", note: "Data currently enters through validated file imports." },
  { area: "Dedicated recommendations workflow", status: "Planned", note: "Scenario comparisons are available today." },
];

const tone = { Available: "border-[#b9d8cd] bg-[#e8f2ef] text-[#0f5e49]", Planned: "border-[#d5dfe4] bg-[#f2f5f7] text-[#4a5d69]", "Requires configuration": "border-[#ecd49a] bg-[#fff6e0] text-[#6b4f12]" } as const;
const label = "geit-section-label mb-5 flex items-center gap-3 text-[11px] font-bold tracking-[.19em] text-[#168568]";
const h2 = "text-3xl font-bold leading-tight text-[#10243a]";
const card = "border border-[#dce3e8] bg-white geit-glass";
const Bar = () => <span className="h-[2px] w-7 bg-[#e8b64b]" />;
const ExternalIcon = (p: LucideProps) => <ArrowUpRight {...p} aria-hidden="true" />;

/** The primary call to action: opens the separately deployed Energy DT application. */
function LaunchButton({ secondary = false }: { secondary?: boolean }) {
  const cls = `inline-flex min-h-12 items-center gap-3 px-6 py-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b64b] ${secondary ? "bg-[#e8b64b] text-[#10243a] hover:bg-[#f0c766]" : "bg-[#168568] text-white hover:bg-[#116d55]"}`;
  if (!ENERGY_DT_URL) return <Link href="/contact" className={cls} data-testid="link-launch-energy-dt">Request access to Energy DT <ArrowRight size={17} aria-hidden="true" /></Link>;
  return <a href={energyDtLink("/app")} className={cls} data-testid="link-launch-energy-dt" rel="noopener">Launch Energy DT <ExternalIcon size={17} /></a>;
}

export function EnergyDtPage() {
  const { language } = useLanguage();
  return (
    <div lang="en" data-testid="energy-dt-info">
      <PageMetadata title="Energy DT — AI-Powered Energy Digital Twin" path="/energy-dt" untranslated
        description="Energy DT by GEIT Ltd is an AI-powered energy digital twin platform for energy management, renewables, battery storage, efficiency, carbon footprint and EV charging analysis." />

      <section className="bg-[#10243a] text-white">
        <div className="mx-auto max-w-[1320px] px-5 py-16 lg:px-10 lg:py-20">
          <p className={label}><Bar />ENERGY DT · A GEIT TECHNOLOGY SOLUTION</p>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">The AI-Powered Energy Digital Twin.</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/70">Energy DT brings an organisation’s sites, assets, meters and energy data into one secure platform, models how its energy system behaves, and helps teams compare options for efficiency, renewables, storage, EV charging and carbon reduction.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <LaunchButton />
            {ENERGY_DT_URL && <a href={energyDtLink("/app/register")} className="inline-flex min-h-12 items-center border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10" data-testid="link-energy-dt-register">Create an account</a>}
            <Link href="/contact" className="inline-flex min-h-12 items-center px-3 py-3 text-sm font-semibold text-white underline underline-offset-4" data-testid="link-energy-dt-contact">Request a demonstration</Link>
          </div>
        </div>
      </section>

      <section className="bg-[#f2f5f7]">
        <div className="mx-auto max-w-[1320px] space-y-20 px-5 py-14 lg:px-10 lg:py-16">
          {language !== "en" && <p className="text-xs text-[#62737e]" data-testid="energy-dt-english-only">This page is currently available in English.</p>}

          <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr]" id="what-is-energy-dt">
            <div><p className={label}><Bar />WHAT ENERGY DT IS</p><h2 className={h2}>A digital representation of your energy system.</h2></div>
            <div className="space-y-4 text-sm leading-7 text-[#62737e]">
              <p>Energy DT is GEIT’s software platform for energy intelligence. It holds a structured, organisation-wide record of what is installed, what it consumes, what it costs and what it emits, and lets teams test improvement options against that record.</p>
              <p>It is a separate application operated by GEIT. Organisations sign in to their own secure workspace; this page explains what the platform offers.</p>
            </div>
          </div>

          <div id="problems">
            <p className={label}><Bar />THE PROBLEMS IT ADDRESSES</p>
            <h2 className={h2}>Energy decisions without reliable evidence.</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {problems.map((p) => <article key={p.title} className={`${card} p-6`}><h3 className="font-bold text-[#10243a]">{p.title}</h3><p className="mt-2 text-sm leading-6 text-[#667782]">{p.text}</p></article>)}
            </div>
          </div>

          <div id="capabilities">
            <p className={label}><Bar />CAPABILITIES AND SERVICES</p>
            <h2 className={h2}>Seven capabilities in one connected platform.</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="energy-dt-capabilities">
              {capabilities.map(({ id, icon: Icon, title, summary, points }) => (
                <article key={id} id={id} className={`${card} flex flex-col p-6`} data-testid={`energy-dt-capability-${id}`}>
                  <Icon size={24} className="text-[#168568]" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-bold text-[#10243a]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#667782]">{summary}</p>
                  <ul className="mt-4 space-y-2 text-sm text-[#62737e]">{points.map((pt) => <li key={pt} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#168568]" aria-hidden="true" />{pt}</li>)}</ul>
                </article>
              ))}
            </div>
          </div>

          <div id="customers">
            <p className={label}><Bar />WHO IT IS FOR</p>
            <h2 className={h2}>Built for SMEs, commercial buildings and organisations.</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {customers.map(({ icon: Icon, title, text }) => <li key={title} className={`${card} flex gap-4 p-5`}><Icon size={22} className="mt-0.5 shrink-0 text-[#168568]" aria-hidden="true" /><span><strong className="block text-[#10243a]">{title}</strong><span className="mt-1 block text-sm leading-6 text-[#667782]">{text}</span></span></li>)}
            </ul>
          </div>

          <div id="how-it-works">
            <p className={label}><Bar />HOW IT WORKS</p>
            <h2 className={h2}>From data to decision.</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {steps.map(({ icon: Icon, title, text }, i) => <li key={title} className={`${card} p-5`}><span className="flex items-center gap-3"><span className="font-mono text-sm text-[#168568]">0{i + 1}</span><Icon size={18} className="text-[#168568]" aria-hidden="true" /></span><strong className="mt-3 block text-[#10243a]">{title}</strong><p className="mt-2 text-sm leading-6 text-[#667782]">{text}</p></li>)}
            </ol>
          </div>

          <div className="grid gap-10 lg:grid-cols-2" id="benefits">
            <div>
              <p className={label}><Bar />BUSINESS BENEFITS</p>
              <h2 className={h2}>Better evidence for every energy investment.</h2>
              <ul className="mt-6 space-y-3 text-sm leading-6 text-[#62737e]">{benefits.map((b) => <li key={b} className="flex gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#168568]" aria-hidden="true" />{b}</li>)}</ul>
              <p className="mt-5 text-xs leading-5 text-[#6b7b87]">Energy DT supports analysis and decision-making. It does not guarantee savings, returns or emissions reductions; outcomes depend on data quality, assumptions and implementation.</p>
            </div>
            <div>
              <p className={label}><Bar />TRUST AND SECURITY</p>
              <h2 className={h2}>Designed for shared, trustworthy use.</h2>
              <ul className="mt-6 grid gap-3">{foundations.map(({ icon: Icon, title, text }) => <li key={title} className={`${card} flex gap-4 p-4`}><Icon size={20} className="mt-0.5 shrink-0 text-[#168568]" aria-hidden="true" /><span><strong className="block text-sm text-[#10243a]">{title}</strong><span className="text-sm leading-6 text-[#667782]">{text}</span></span></li>)}</ul>
            </div>
          </div>

          <div id="availability" data-testid="energy-dt-availability">
            <p className={label}><Bar />CURRENT AVAILABILITY</p>
            <h2 className={h2}>What is available today.</h2>
            <div className="geit-readable-glass mt-6 overflow-x-auto border border-[#dce3e8] bg-white">
              <table className="w-full min-w-[560px] text-left text-sm">
                <caption className="sr-only">Energy DT feature availability</caption>
                <thead><tr className="border-b border-[#dce3e8] text-xs tracking-[.08em]"><th scope="col" className="p-4"><span>CAPABILITY</span></th><th scope="col" className="p-4"><span>STATUS</span></th><th scope="col" className="p-4"><span>NOTES</span></th></tr></thead>
                <tbody>{availability.map((r) => <tr key={r.area} className="border-b border-[#edf0f2] last:border-0"><th scope="row" className="p-4 font-semibold"><span>{r.area}</span></th><td className="p-4"><span className={`inline-block whitespace-nowrap border px-2 py-0.5 text-xs font-bold ${tone[r.status]}`}>{r.status}</span></td><td className="p-4"><span>{r.note}</span></td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#168568] text-white" aria-labelledby="energy-dt-cta">
        <div className="mx-auto flex max-w-[1320px] flex-col justify-between gap-7 px-5 py-14 sm:flex-row sm:items-center lg:px-10">
          <div>
            <p className="text-xs font-bold tracking-[.16em] text-white/70">ACCESS ENERGY DT</p>
            <h2 id="energy-dt-cta" className="mt-3 text-2xl font-bold">{ENERGY_DT_URL ? "Ready to work with your own data?" : "Interested in Energy DT for your organisation?"}</h2>
            <p className="mt-2 text-sm text-white/80">{ENERGY_DT_URL ? "Sign in to your organisation’s workspace, or create an account to get started." : "Contact GEIT to arrange access, onboarding and a demonstration."}</p>
          </div>
          <LaunchButton secondary />
        </div>
      </section>
    </div>
  );
}
