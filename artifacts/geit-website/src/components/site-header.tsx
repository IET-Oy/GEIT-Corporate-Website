import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import LanguageSelector from "@/components/language-selector";
import { useLanguage } from "@/lib/language-context";

const serviceMenu = [
  { title: "Energy Management", slug: "energy-management" },
  { title: "Energy Consulting", slug: "energy-consulting" },
  { title: "Energy Project Development", slug: "energy-project-development" },
  { title: "Energy Market Research", slug: "energy-market-research" },
  { title: "Renewable Energy Advisory", slug: "renewable-energy-advisory" },
  { title: "Carbon Footprint Services", slug: "carbon-footprint-services" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [path] = useLocation();
  const { t } = useLanguage();

  useEffect(() => setOpen(false), [path]);

  const mobileLinks = [
    { label: t("navHome"), href: "/" },
    { label: t("navAbout"), href: "/about" },
    { label: t("navServices"), href: "/services" },
    { label: t("navIndustries"), href: "/industries" },
    { label: t("navDigital"), href: "/digital-energy-solutions" },
    { label: t("navInsights"), href: "/insights" },
    { label: t("navContact"), href: "/contact" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#dce3e8] bg-[#f2f5f7]/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[74px] max-w-[1320px] items-center gap-3 px-3 sm:min-h-[84px] sm:px-5 lg:px-10">
          <Link
            href="/"
            className="group flex min-w-0 shrink-0 items-center gap-2"
            aria-label="GEIT Ltd. — Global Energy Innovation Technologies, home"
            data-testid="link-home-brand"
          >
            <span className="shrink-0 bg-white p-1">
              <img
                src="/images/geit-logo.jpg"
                alt="GEIT Ltd. — Global Energy Innovation Technologies"
                className="h-[34px] w-[82px] object-contain sm:h-[48px] sm:w-[116px]"
                width="373"
                height="157"
              />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block whitespace-nowrap text-sm font-bold text-[#10243a] sm:text-base">
                GEIT Ltd.
              </span>
              <span className="mt-1 hidden max-w-[180px] text-[9px] font-semibold leading-tight text-[#60717e] sm:block">
                Global Energy Innovation Technologies
              </span>
            </span>
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <nav
              className="hidden items-center gap-4 xl:flex"
              aria-label={t("mainNavigation")}
            >
              <Link className="navlink" href="/">{t("navHome")}</Link>
              <Link className="navlink" href="/about">{t("navAbout")}</Link>
              <div className="group relative">
                <Link className="navlink inline-flex items-center gap-1" href="/services">
                  {t("navServices")} <ChevronDown size={14} aria-hidden="true" />
                </Link>
                <div className="invisible absolute left-0 top-full z-50 mt-0 w-[340px] border border-[#dce3e8] bg-white p-3 opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  {serviceMenu.map((service) => (
                    <Link
                      key={service.slug}
                      href={`/services/${service.slug}`}
                      className="block px-3 py-2.5 text-sm text-[#35495b] hover:bg-[#f2f5f7] hover:text-[#168568] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#168568]"
                    >
                      {service.title}
                    </Link>
                  ))}
                  <Link
                    href="/services"
                    className="mt-2 block border-t px-3 pt-3 text-sm font-bold text-[#168568] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#168568]"
                  >
                    {t("exploreAllServices")} →
                  </Link>
                </div>
              </div>
              <Link className="navlink whitespace-nowrap" href="/industries">{t("navIndustries")}</Link>
              <Link className="navlink whitespace-nowrap" href="/digital-energy-solutions">{t("navDigital")}</Link>
              <Link className="navlink" href="/insights">{t("navInsights")}</Link>
              <Link className="navlink" href="/contact">{t("navContact")}</Link>
            </nav>

            <LanguageSelector />
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-md text-[#10243a] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168568] xl:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? t("menuClose") : t("menuOpen")}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              data-testid="button-mobile-menu"
            >
              {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>

        {open && (
          <nav
            id="mobile-navigation"
            className="border-t border-[#dce3e8] bg-white px-5 py-3 xl:hidden"
            aria-label={t("mainNavigation")}
          >
            {mobileLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block border-b border-[#edf0f2] py-3 text-sm font-semibold text-[#10243a] hover:text-[#168568] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#168568]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <LanguageNotice />
    </>
  );
}

function LanguageNotice() {
  const { language, t } = useLanguage();
  if (language === "en") return null;
  return (
    <div
      className="border-b border-[#d6e5df] bg-[#e8f2ef] px-4 py-2 text-center text-xs leading-5 text-[#285b4d]"
      role="note"
      aria-live="polite"
      data-testid="language-coverage-notice"
    >
      {t("contentLanguageNotice")}
    </div>
  );
}
