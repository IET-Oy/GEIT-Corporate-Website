import { ArrowRight, BarChart3, BatteryCharging, Building2, Cpu, Database, Factory, FileText, Gauge, Landmark, Leaf, LineChart, Lock, PlugZap, ShieldCheck, Sun, Users, Wind, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { PageMetadata } from "@/components/page-metadata";
import "./energy-dt-glass.css";

type ServiceArea = { id: string; icon: LucideIcon; title: string; summary: string; capabilities: string[]; module: string; moduleLabel: string };

/** Each service area links to a workspace module that exists today. Descriptions are capabilities, not outcomes. */
export const serviceAreas: ServiceArea[] = [
  {
    id: "energy-management", icon: Gauge, title: "Energy Management",
    summary: "A structured register of sites, buildings, assets and meters, with interval data turned into consumption, demand and cost insight.",
    capabilities: ["Site, building, asset and meter registry", "CSV and Excel interval-data import with row-level validation", "Consumption, peak and average demand, and tariff-based cost analysis", "Threshold alert rules and acknowledgement"],
    module: "/app/energy-management", moduleLabel: "Energy Management workspace",
  },
  {
    id: "renewable-energy", icon: Sun, title: "Renewable Energy",
    summary: "Screen solar PV opportunities using your own monthly irradiation, demand and tariff assumptions before committing to detailed design.",
    capabilities: ["Monthly generation, specific yield and self-consumption", "Grid import and export with import/export rates", "Capital cost, discount rate and lifetime screening"],
    module: "/app/renewable-energy", moduleLabel: "Renewable Energy Advisory module",
  },
  {
    id: "energy-efficiency", icon: Zap, title: "Energy Efficiency",
    summary: "Compare baselines with proposed measures and keep every revision of an audit or consulting case on record.",
    capabilities: ["Audit measures with baseline and proposed power and hours", "Baseline versus proposed energy, cost and discounted value", "Revision history that preserves earlier results"],
    module: "/app/energy-auditing", moduleLabel: "Energy Efficiency & Auditing module",
  },
  {
    id: "battery-flexibility", icon: BatteryCharging, title: "Battery Storage & Energy Flexibility",
    summary: "Explore battery sizing and dispatch for peak shaving and load shifting, based on your demand profile, solar and tariff.",
    capabilities: ["Capacity, power, state-of-charge and efficiency limits", "Interval dispatch simulation against entered load and solar", "Grid import, export and cost comparison"],
    module: "/app/battery-flexibility", moduleLabel: "Battery Storage & Flexibility module",
  },
  {
    id: "carbon", icon: Leaf, title: "Carbon Footprint Services",
    summary: "Screen operational emissions with versioned emission factors so that every figure can be traced back to its source.",
    capabilities: ["Scope-based screening from energy and fuel inputs", "Versioned emission-factor records", "Baseline, proposed and reduction comparison"],
    module: "/app/carbon-footprint", moduleLabel: "Carbon Footprint module",
  },
  {
    id: "ev-charging", icon: PlugZap, title: "EV Charging Infrastructure",
    summary: "Analyse charging sessions alongside site load to understand peak demand and the effect of managed charging before expanding infrastructure.",
    capabilities: ["Charger count, rated power and session records", "Measured versus managed-schedule site peak import", "Charger utilisation, solar contribution and optional battery support"],
    module: "/app/ev-charging", moduleLabel: "EV Charging Infrastructure module",
  },
  {
    id: "ai-analytics", icon: Cpu, title: "AI-Powered Energy Analytics",
    summary: "A building digital twin that combines measured history with simulation, adding forecasts and anomaly signals when the data supports them.",
    capabilities: ["Digital twin of building load, solar and grid flows", "Demand forecasting and anomaly detection from sufficient history", "Optional AI-assisted explanations grounded in saved evidence"],
    module: "/app/digital-energy", moduleLabel: "Digital Twin module",
  },
];

const audiences: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Zap, title: "Energy companies", text: "Organise customer and asset data and evaluate efficiency, storage and renewable options consistently." },
  { icon: Building2, title: "Commercial buildings", text: "Understand consumption and cost by site and building, and test improvement measures." },
  { icon: Factory, title: "Industrial facilities", text: "Analyse demand peaks, tariffs and flexibility options for energy-intensive operations." },
  { icon: Wind, title: "Renewable energy operators", text: "Model generation, self-consumption and storage alongside measured demand." },
  { icon: Landmark, title: "Infrastructure owners", text: "Plan EV charging, storage and capacity across portfolios of sites." },
  { icon: Users, title: "Public institutions", text: "Build a documented evidence base for energy and carbon decisions." },
];

const steps = [
  { icon: Database, title: "Connect your data", text: "Register sites, buildings, assets and meters, then import interval readings from CSV or Excel using the provided templates." },
  { icon: Cpu, title: "Model the system", text: "Build a digital twin and scenario models for renewables, storage, efficiency, EV charging and carbon." },
  { icon: LineChart, title: "Analyse and compare", text: "Review consumption, demand, cost and emissions, and compare baselines against proposed options." },
  { icon: FileText, title: "Decide and report", text: "Save signed results, export CSV and PDF reports, and share findings within your organisation." },
];

const value = [
  "One structured, organisation-wide record of energy assets and data.",
  "Consistent, documented methods instead of disconnected spreadsheets.",
  "Every saved result linked to its inputs, so figures can be checked and repeated.",
  "Faster screening of options before investing in detailed engineering.",
  "A shared evidence base for management, finance and sustainability teams.",
];

const foundations: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Lock, title: "Organisation-level separation", text: "Each organisation’s records are kept separate, with database row-level security policies on tenant tables." },
  { icon: Users, title: "Role-based access", text: "Owner, administrator, editor, analyst and reader roles control who can view, change and manage records." },
  { icon: ShieldCheck, title: "Verifiable results", text: "Saved analyses are signed together with their inputs and checked before they are displayed or exported." },
  { icon: BarChart3, title: "Honest outputs", text: "Measured, simulated and estimated values are labelled. Forecasts are withheld when history is insufficient." },
];

const availability: { area: string; status: "Available" | "Planned" | "Requires configuration"; note: string }[] = [
  { area: "Account registration, sign-in and organisation management", status: "Available", note: "Email-based accounts with organisation roles." },
  { area: "Energy Management, engineering, carbon and digital-twin modules", status: "Available", note: "Results are calculated only from data you enter or import." },
  { area: "Projects and Reports index with CSV/PDF exports", status: "Available", note: "Lists saved analyses and scenarios across modules." },
  { area: "AI-assisted explanations", status: "Requires configuration", note: "Disabled until an AI provider key and model are configured for the deployment." },
  { area: "Live meter, BMS, SCADA or IoT data feeds", status: "Planned", note: "Data currently enters through validated file imports." },
  { area: "Dedicated Recommendations workflow", status: "Planned", note: "Not yet operational; scenario comparisons are available today." },
];

const destinations = [
  { id: "dashboard", title: "Dashboard", description: "Open the protected workspace overview and choose an organisation.", href: "/app" },
  { id: "organisations-sites", title: "Organisations & Sites", description: "Choose or create an organisation. Site records are managed in Energy Management.", href: "/app?choose=1" },
  { id: "assets-meters", title: "Assets & Meters", description: "Register sites, buildings, meters and equipment assets.", href: "/app/energy-management" },
  { id: "digital-twin", title: "Digital Twin, Forecasting & Anomaly Detection", description: "Forecasts and anomaly signals depend on sufficient imported history.", href: "/app/digital-energy" },
  { id: "engineering", title: "Engineering & Simulations", description: "Consulting, auditing, renewable, battery and EV charging scenarios.", href: "/app/energy-consulting" },
  { id: "tariffs-costs", title: "Tariffs, Costs & Savings", description: "Tariffs and cost analysis are part of Energy Management.", href: "/app/energy-management" },
  { id: "carbon", title: "Carbon Footprint", description: "Factor coverage and results depend on configured records.", href: "/app/carbon-footprint" },
  { id: "reports", title: "Reports & Documents", description: "The saved-project and report index. Outputs depend on saved analyses.", href: "/app/projects-reports" },
  { id: "recommendations", title: "Projects & Recommendations", description: "Projects and reports are available. A dedicated recommendations workflow is planned.", href: "/app/recommendations" },
  { id: "settings", title: "Settings & Organisation Management", description: "Organisation details and membership settings.", href: "/app/organisation-settings" },
];

const eyebrow = "text-[11px] font-bold tracking-[.19em] text-[#168568]";
const h2 = "mt-3 text-2xl font-bold text-[#10243a] sm:text-3xl";
const statusTone = { Available: "bg-[#e8f2ef] text-[#0f5e49] border-[#b9d8cd]", Planned: "bg-[#f2f5f7] text-[#4a5d69] border-[#d5dfe4]", "Requires configuration": "bg-[#fff6e0] text-[#6b4f12] border-[#ecd49a]" } as const;

export function EnergyDtOverviewPage() {
  return (
    <div className="energy-dt-glass-page energy-dt-glass-content mx-auto max-w-[1320px] px-5 py-10 lg:px-10 lg:py-14" data-testid="energy-dt-overview">
      <PageMetadata
        title="Energy DT — AI-Powered Energy Digital Twin"
        description="Energy DT by GEIT Ltd is an AI-powered energy digital twin platform for energy management, renewables, efficiency, battery storage, carbon footprint and EV charging analysis."
        path="/energy-dt"
      />

      <header className="page-reveal grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end">
        <div>
          <p className={eyebrow}>ENERGY DT · A GEIT TECHNOLOGY PRODUCT</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-[#10243a] sm:text-5xl">
            The AI-Powered Energy Digital Twin platform.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[#4d606c]">
            Energy DT brings your sites, assets, meters and energy data into one workspace, models how your energy
            system behaves, and helps your team compare options for efficiency, renewables, storage, EV charging and
            carbon reduction — with every result traceable to its inputs.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/app/sign-in" className="inline-flex min-h-11 items-center gap-3 bg-[#10243a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1a3956] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b64b]" data-testid="link-energy-dt-signin">
              Sign in <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link href="/app/register" className="inline-flex min-h-11 items-center bg-[#168568] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#116d55] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b64b]" data-testid="link-energy-dt-register">
              Create an account
            </Link>
            <Link href="/contact" className="inline-flex min-h-11 items-center border border-[#10243a]/40 px-5 py-3 text-sm font-bold text-[#10243a] transition hover:bg-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b64b]" data-testid="link-energy-dt-contact">
              Request a demonstration
            </Link>
            <Link href="/app/forgot-password" className="inline-flex min-h-11 items-center px-3 py-3 text-sm font-semibold text-[#10243a] underline underline-offset-4" data-testid="link-energy-dt-recovery">
              Recover password
            </Link>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm" aria-label="Energy DT at a glance">
          {[["7", "service areas in one workspace"], ["5", "access roles per organisation"], ["CSV · XLSX", "validated data import"], ["CSV · PDF", "report exports"]].map(([k, v]) => (
            <div key={v} className="border border-[#dce3e8] bg-white p-4">
              <dt className="sr-only">{v}</dt>
              <dd className="text-2xl font-extrabold text-[#10243a]">{k}</dd>
              <dd className="mt-1 text-xs leading-5 text-[#5d707c]">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section className="mt-16" aria-labelledby="edt-purpose">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <p className={eyebrow}>WHY ENERGY DT</p>
            <h2 id="edt-purpose" className={h2}>From scattered data to confident energy decisions.</h2>
          </div>
          <div className="space-y-4 text-sm leading-7 text-[#4d606c]">
            <p>Energy decisions are often made from incomplete spreadsheets, one-off studies and data that is hard to compare across sites. Energy DT gives organisations a single, structured digital representation of their energy system — what is installed, what it consumes, what it costs and what it emits.</p>
            <p>On top of that foundation, GEIT’s engineering and analytics modules let teams test options, quantify trade-offs and keep a documented record of how each conclusion was reached.</p>
          </div>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="edt-services">
        <p className={eyebrow}>SERVICE AREAS</p>
        <h2 id="edt-services" className={h2}>Seven capabilities, one connected platform.</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="energy-dt-service-areas">
          {serviceAreas.map(({ id, icon: Icon, title, summary, capabilities, module, moduleLabel }) => (
            <article key={id} id={id} className="flex flex-col border border-[#dce3e8] bg-white p-6" data-testid={`energy-dt-area-${id}`}>
              <span className="grid h-10 w-10 place-items-center rounded-md bg-[#10243a] text-[#e8b64b]"><Icon size={20} aria-hidden="true" /></span>
              <h3 className="mt-4 text-lg font-bold text-[#10243a]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#4d606c]">{summary}</p>
              <ul className="mt-4 space-y-2 text-sm text-[#34495a]">
                {capabilities.map((cap) => <li key={cap} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#168568]" aria-hidden="true" />{cap}</li>)}
              </ul>
              <Link href={module} className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-[#0f5e49] underline-offset-4 hover:underline">
                Open the {moduleLabel} <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16" aria-labelledby="edt-audiences">
        <p className={eyebrow}>WHO IT IS FOR</p>
        <h2 id="edt-audiences" className={h2}>Built for organisations that own, operate or advise on energy.</h2>
        <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4 border border-[#dce3e8] bg-white p-5">
              <Icon size={22} className="mt-0.5 shrink-0 text-[#168568]" aria-hidden="true" />
              <span><strong className="block text-[#10243a]">{title}</strong><span className="mt-1 block text-sm leading-6 text-[#4d606c]">{text}</span></span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16" aria-labelledby="edt-how">
        <p className={eyebrow}>HOW IT WORKS</p>
        <h2 id="edt-how" className={h2}>A clear path from data to decision.</h2>
        <ol className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="border border-[#dce3e8] bg-white p-5">
              <span className="flex items-center gap-3"><span className="text-xs font-bold tracking-[.12em] text-[#6b7b87]">STEP {i + 1}</span><Icon size={18} className="text-[#168568]" aria-hidden="true" /></span>
              <strong className="mt-3 block text-[#10243a]">{title}</strong>
              <p className="mt-2 text-sm leading-6 text-[#4d606c]">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 grid gap-8 lg:grid-cols-2" aria-labelledby="edt-value">
        <div>
          <p className={eyebrow}>BUSINESS VALUE</p>
          <h2 id="edt-value" className={h2}>Better evidence for every energy investment.</h2>
          <ul className="mt-6 space-y-3 text-sm leading-6 text-[#34495a]">
            {value.map((v) => <li key={v} className="flex gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#168568]" aria-hidden="true" />{v}</li>)}
          </ul>
          <p className="mt-5 text-xs leading-5 text-[#6b7b87]">Energy DT supports analysis and decision-making. It does not guarantee savings, returns or emissions reductions; outcomes depend on data quality, assumptions and implementation.</p>
        </div>
        <div>
          <p className={eyebrow}>PLATFORM FOUNDATIONS</p>
          <h2 className={h2}>Designed for trustworthy, shared use.</h2>
          <ul className="mt-6 grid gap-3">
            {foundations.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4 border border-[#dce3e8] bg-white p-4">
                <Icon size={20} className="mt-0.5 shrink-0 text-[#10243a]" aria-hidden="true" />
                <span><strong className="block text-sm text-[#10243a]">{title}</strong><span className="text-sm leading-6 text-[#4d606c]">{text}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="edt-status" data-testid="status-energy-dt-phase1">
        <p className={eyebrow}>CURRENT AVAILABILITY</p>
        <h2 id="edt-status" className={h2}>What is available today.</h2>
        <div className="mt-6 overflow-x-auto border border-[#dce3e8] bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Energy DT feature availability</caption>
            <thead><tr className="border-b border-[#dce3e8] text-xs tracking-[.08em] text-[#5d707c]"><th scope="col" className="p-4">CAPABILITY</th><th scope="col" className="p-4">STATUS</th><th scope="col" className="p-4">NOTES</th></tr></thead>
            <tbody>
              {availability.map((row) => (
                <tr key={row.area} className="border-b border-[#edf0f2] last:border-0">
                  <th scope="row" className="p-4 font-semibold text-[#10243a]">{row.area}</th>
                  <td className="p-4"><span className={`inline-block whitespace-nowrap border px-2 py-0.5 text-xs font-bold ${statusTone[row.status]}`}>{row.status}</span></td>
                  <td className="p-4 text-[#4d606c]">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs leading-5 text-[#6b7b87]">
          Energy DT is under active development. This page does not verify live sign-in, tenant isolation, database persistence,
          private-file permissions or Row-Level Security against a dedicated staging project, and is not a security or production sign-off.
        </p>
      </section>

      <section className="mt-16" aria-labelledby="energy-dt-destinations-heading">
        <p className={eyebrow}>WORKSPACE DESTINATIONS</p>
        <h2 id="energy-dt-destinations-heading" className={h2}>Already a member? Go straight to your work.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5d707c]">Workspace pages require sign-in. This overview does not display sample results.</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {destinations.map((d) => (
            <Link key={d.id} href={d.href} className="group flex flex-col border border-[#dce3e8] bg-white p-4 transition hover:border-[#10243a]/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b64b]" data-testid={`link-energy-dt-${d.id}`}>
              <span className="font-bold leading-snug text-[#10243a]">{d.title}</span>
              <span className="mt-1 text-xs leading-5 text-[#5d707c]">{d.description}</span>
              <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-bold text-[#0f5e49]">Open <ArrowRight size={13} aria-hidden="true" className="transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="edt-cta mt-16 flex flex-col items-start justify-between gap-5 p-7 text-white sm:flex-row sm:items-center sm:p-9" style={{ backgroundColor: "#10243a" }} aria-labelledby="edt-cta">
        <div>
          <h2 id="edt-cta" className="text-2xl font-bold">See Energy DT with your own data.</h2>
          <p className="mt-2 text-sm text-white/80">Talk to GEIT about onboarding your organisation, data templates and the modules that fit your goals.</p>
        </div>
        <Link href="/contact" className="inline-flex min-h-11 shrink-0 items-center gap-2 bg-[#e8b64b] px-5 py-3 text-sm font-bold text-[#10243a] transition hover:bg-[#f0c766] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
          Contact GEIT <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>

      <nav aria-label="Energy DT legal information" className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#dce3e8] pt-5 text-sm">
        <Link href="/privacy-policy" className="font-semibold text-[#10243a] underline underline-offset-4" data-testid="link-energy-dt-privacy">Privacy Policy</Link>
        <Link href="/terms-of-use" className="font-semibold text-[#10243a] underline underline-offset-4" data-testid="link-energy-dt-terms">Terms of Use</Link>
      </nav>
    </div>
  );
}
