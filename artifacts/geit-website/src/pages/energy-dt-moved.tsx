import { useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { PageMetadata } from "@/components/page-metadata";
import { ENERGY_DT_URL, energyDtLink } from "@/config/energy-dt";

/**
 * The Energy DT application used to live under /app on this site. Old bookmarks and
 * earlier account emails are forwarded to the same path on the standalone application.
 */
export function EnergyDtMovedPage() {
  const [path] = useLocation();
  const search = useSearch();
  const target = ENERGY_DT_URL ? energyDtLink(`${path}${search ? `?${search}` : ""}`) : "";
  useEffect(() => { if (target) window.location.replace(target); }, [target]);
  return (
    <section lang="en" className="bg-[#f2f5f7]" data-testid="energy-dt-moved">
      <PageMetadata title="Energy DT has moved" description="The Energy DT application is now a separate GEIT platform." path={path} noIndex untranslated />
      <div className="mx-auto max-w-3xl px-5 py-20 lg:px-10">
        <div className="border border-[#dce3e8] bg-white geit-glass p-8">
          <h1 className="text-3xl font-extrabold text-[#10243a]">Energy DT has moved</h1>
          <p className="mt-4 text-sm leading-7 text-[#62737e]">The Energy DT application now runs as its own GEIT platform.{target ? " You are being redirected." : ""}</p>
          <div className="mt-6 flex flex-wrap gap-5 text-sm font-bold">
            {target && <a href={target} className="text-[#168568] underline underline-offset-4" data-testid="link-energy-dt-moved-target">Continue to Energy DT</a>}
            <Link href="/energy-dt" className="text-[#168568] underline underline-offset-4">About Energy DT</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
