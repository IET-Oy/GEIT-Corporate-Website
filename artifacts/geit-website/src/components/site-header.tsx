import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import LanguageSelector from "@/components/language-selector";
import { useLanguage } from "@/lib/language-context";
import type { MessageKey } from "@/lib/i18n";

const primary = [
  { key: "navHome", href: "/" },
  { key: "navAbout", href: "/about" },
  { key: "navServices", href: "/services" },
  { key: "navContact", href: "/contact" },
] as const;
const secondary = [
  { key: "navIndustries", href: "/industries" },
  { key: "navDigital", href: "/digital-energy-solutions" },
  { key: "navInsights", href: "/insights" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [path] = useLocation();
  const { t } = useLanguage();

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  const isActive = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
  const cls = (href: string, extra = "") =>
    `navlink whitespace-nowrap ${extra} ${isActive(href) ? "!text-[#168568] border-b-2 border-[#e8b64b] font-bold" : ""}`;
  const item = (l: { key: MessageKey; href: string }, extra = "") => (
    <Link key={l.href} href={l.href} className={cls(l.href, extra)} aria-current={isActive(l.href) ? "page" : undefined}>
      {t(l.key)}
    </Link>
  );
  const mobile = [primary[0], primary[1], primary[2], ...secondary, primary[3]];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#dce3e8] bg-[#f2f5f7]/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[74px] max-w-[1320px] items-center gap-3 px-3 sm:min-h-[84px] sm:px-5 lg:px-8">
          <Link href="/" className="flex min-w-0 shrink-0 items-center" aria-label="GEIT Ltd. — Global Energy Innovation Technologies, home" data-testid="link-home-brand">
            <span className="shrink-0 bg-white p-1">
              <img src="/images/geit-logo.jpg" alt="GEIT Ltd. — Global Energy Innovation Technologies" className="h-[50px] w-[120px] object-contain sm:h-[60px] sm:w-[144px]" width="373" height="157" />
            </span>
          </Link>
          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <nav className="hidden items-center gap-5 py-1 lg:flex xl:gap-6" aria-label={t("mainNavigation")}>
              {primary.slice(0, 3).map((l) => item(l))}
              {secondary.map((l) => item(l, "hidden xl:inline-block"))}
              {item(primary[3])}
            </nav>
            <LanguageSelector />
            <button type="button" className="grid h-10 w-10 place-items-center rounded-md text-[#10243a] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168568] lg:hidden" onClick={() => setOpen((v) => !v)} aria-label={open ? t("menuClose") : t("menuOpen")} aria-expanded={open} aria-controls="mobile-navigation" data-testid="button-mobile-menu">
              {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>
        <nav className="hidden items-center justify-end gap-6 border-t border-[#e3e9ed] px-8 py-2 text-sm lg:flex xl:hidden" aria-label="Secondary">
          {secondary.map((l) => item(l))}
        </nav>
        {open && (
          <nav id="mobile-navigation" className="border-t border-[#dce3e8] bg-white px-5 py-3 lg:hidden" aria-label={t("mainNavigation")}>
            {mobile.map((l) => (
              <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? "page" : undefined} className={`block border-b border-[#edf0f2] py-3 text-sm font-semibold hover:text-[#168568] ${isActive(l.href) ? "text-[#168568]" : "text-[#10243a]"}`}>
                {t(l.key)}
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
