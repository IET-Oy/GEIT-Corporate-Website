import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { PageMetadata } from "@/components/page-metadata";
import "./energy-dt-glass.css";

const destinations = [
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Open the protected workspace overview and choose an organisation.",
    href: "/app",
    status: "Existing workspace",
  },
  {
    id: "organisations-sites",
    title: "Organisations & Sites",
    description: "Choose or create an organisation. Site records are available through Energy Management.",
    href: "/app?choose=1",
    status: "Existing workspace",
  },
  {
    id: "assets-meters",
    title: "Sites, Buildings & Assets",
    description: "Register sites, buildings, meters and equipment assets in the Energy Management workspace.",
    href: "/app/energy-management",
    status: "Existing workspace",
  },
  {
    id: "digital-twin",
    title: "Digital Twin, Forecasting & Anomaly Detection",
    description: "Open Digital Energy. Forecasts and anomaly signals depend on sufficient imported history.",
    href: "/app/digital-energy",
    status: "Existing workspace",
  },
  {
    id: "engineering",
    title: "Engineering & Simulations",
    description: "Open the existing engineering and scenario workflows in the protected workspace.",
    href: "/app/energy-consulting",
    status: "Existing workspace",
  },
  {
    id: "tariffs-costs",
    title: "Tariffs, Costs & Savings",
    description: "Start with Energy Management analysis. A separate tariff and savings workflow is not verified here.",
    href: "/app/energy-management",
    status: "Existing workspace",
  },
  {
    id: "carbon",
    title: "Carbon Footprint",
    description: "Open the existing carbon workflow. Factor coverage and calculation inputs depend on configured records.",
    href: "/app/carbon-footprint",
    status: "Existing workspace",
  },
  {
    id: "reports",
    title: "Reports & Documents",
    description: "Find the existing saved-project and report index. Outputs depend on saved analyses.",
    href: "/app/projects-reports",
    status: "Existing workspace",
  },
  {
    id: "recommendations",
    title: "Projects & Recommendations",
    description: "Projects and reports are available. A dedicated recommendations workflow is planned, not operational.",
    href: "/app/recommendations",
    status: "Recommendations planned",
  },
  {
    id: "settings",
    title: "Settings & Organisation Management",
    description: "Open organisation details and membership settings.",
    href: "/app/organisation-settings",
    status: "Existing workspace",
  },
];

export function EnergyDtOverviewPage() {
  return (
    <div className="energy-dt-glass-page energy-dt-glass-content mx-auto max-w-[1320px] px-5 py-10 lg:px-10 lg:py-14" data-testid="energy-dt-overview">
      <PageMetadata
        title="Energy DT — Energy Digital Twin"
        description="An overview of the existing Energy DT workspace, its routes and current development status."
        path="/energy-dt"
      />

      <header className="page-reveal max-w-4xl">
        <p className="text-[11px] font-bold tracking-[.19em] text-[#168568]">ENERGY DT · ENERGY DIGITAL TWIN</p>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight text-[#10243a] sm:text-5xl">
          A clearer view of your energy system.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[#5d707c]">
          Explore the existing workspace for energy data, engineering scenarios, carbon analysis and reports.
          Sign in to reach organisation-specific records.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/app/sign-in"
            className="inline-flex min-h-11 items-center gap-3 bg-[#123b2a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f3022] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b64b]"
            data-testid="link-energy-dt-signin"
          >
            Sign in <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link
            href="/app/register"
            className="inline-flex min-h-11 items-center border border-[#cbd6d2] px-5 py-3 text-sm font-bold text-[#123b2a] transition hover:bg-[#edf3f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b64b]"
            data-testid="link-energy-dt-register"
          >
            Create an account
          </Link>
          <Link
            href="/app/forgot-password"
            className="inline-flex min-h-11 items-center px-3 py-3 text-sm font-semibold text-[#123b2a] underline underline-offset-4 hover:text-[#0f3022]"
            data-testid="link-energy-dt-recovery"
          >
            Recover password
          </Link>
        </div>
      </header>

      <aside
        className="mt-10 border border-[#d7c48f] bg-[#fff9e9] p-5 text-sm leading-6 text-[#4d4a3e]"
        role="note"
        data-testid="status-energy-dt-phase1"
      >
        <h2 className="font-bold text-[#10243a]">Development status</h2>
        <p className="mt-2">
          Energy DT is part of this GEIT application. This overview does not verify live sign-in, tenant isolation,
          database persistence, private-file permissions or Row-Level Security. Those workflows still require
          verification against an approved non-production test environment; this page is not a security or
          production sign-off.
        </p>
      </aside>

      <section className="mt-12" aria-labelledby="energy-dt-destinations-heading">
        <div className="max-w-3xl">
          <p className="text-[11px] font-bold tracking-[.19em] text-[#168568]">WORKSPACE DESTINATIONS</p>
          <h2 id="energy-dt-destinations-heading" className="mt-3 text-2xl font-bold text-[#10243a] sm:text-3xl">
            Start with the part of the system you need.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#5d707c]">
            Workspace pages require sign-in. Feature availability depends on the existing API configuration and
            the organisation’s records; this overview does not display sample results.
          </p>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {destinations.map((destination) => (
            <Link
              key={destination.id}
              href={destination.href}
              className="group flex min-h-[160px] flex-col border border-[#dce3e8] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#123b2a]/45 hover:shadow-[0_16px_35px_-28px_rgba(16,36,58,.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b64b]"
              data-testid={`link-energy-dt-${destination.id}`}
            >
              <span className="text-[10px] font-bold tracking-[.12em] text-[#6b7b87]">{destination.status}</span>
              <span className="mt-3 text-lg font-bold leading-snug text-[#10243a]">{destination.title}</span>
              <span className="mt-2 text-sm leading-6 text-[#5d707c]">{destination.description}</span>
              <span className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-bold text-[#123b2a]">
                Open destination <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <nav aria-label="Energy DT legal information" className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#dce3e8] pt-5 text-sm">
        <Link href="/privacy-policy" className="font-semibold text-[#123b2a] underline underline-offset-4" data-testid="link-energy-dt-privacy">Privacy Policy</Link>
        <Link href="/terms-of-use" className="font-semibold text-[#123b2a] underline underline-offset-4" data-testid="link-energy-dt-terms">Terms of Use</Link>
      </nav>
    </div>
  );
}
