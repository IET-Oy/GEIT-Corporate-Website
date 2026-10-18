import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import LanguageSelector from "@/components/language-selector";
import { useLanguage } from "@/lib/language-context";
import type { MessageKey } from "@/lib/i18n";
import { translationReview } from "@/lib/page-copy";
import { primaryNavigation } from "@/config/site-navigation";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [path] = useLocation();
  const { c, t, language } = useLanguage();
  const primaryNav = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const nav = primaryNav.current;
    const secondaryStart = document.querySelector<HTMLElement>("[data-secondary-start]");
    if (!nav || !secondaryStart) return;
    let active = true;
    const align = () => {
      if (!active || getComputedStyle(nav).display === "none") return;
      // Grow only the links' box to the left. Its right edge and the following
      // language selector stay fixed; translated labels need no pixel offsets.
      const brand = nav.closest("header")?.querySelector<HTMLElement>("[data-testid='link-home-brand']");
      const start = Math.max(secondaryStart.getBoundingClientRect().left, (brand?.getBoundingClientRect().right ?? 0) + 12);
      const width = nav.getBoundingClientRect().right - start;
      if (width > 0) nav.style.width = `${width}px`;
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(document.documentElement);
    observer.observe(secondaryStart);
    void document.fonts.ready.then(align);
    return () => { active = false; observer.disconnect(); };
  }, [language]);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  const isActive = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
  const cls = (href: string, extra = "") =>
    `navlink whitespace-nowrap leading-4 lg:!text-[14px] ${extra} ${isActive(href) ? "!text-[#168568] border-b-2 border-[#e8b64b] font-bold" : ""}`;
  const item = (l: { key: MessageKey; href: string }, extra = "") => (
    <Link key={l.href} href={l.href} className={cls(l.href, extra)} aria-current={isActive(l.href) ? "page" : undefined}>
      {t(l.key)}
    </Link>
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#dce3e8] bg-[#f2f5f7]/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[74px] max-w-[1320px] flex-nowrap items-center gap-3 px-3 sm:min-h-[84px] sm:px-5 xl:px-8">
          <Link href="/" className="flex min-w-0 shrink-0 items-center" aria-label={c("GEIT Ltd. — Global Energy Innovation Technologies, home")} data-testid="link-home-brand">
            <span className="shrink-0 bg-white p-1">
              <img src="/images/geit-logo.jpg" alt={c("GEIT Ltd. — Global Energy Innovation Technologies")} className="h-[50px] w-[120px] object-contain sm:h-[60px] sm:w-[144px] lg:h-[50px] lg:w-[120px] xl:h-[60px] xl:w-[144px]" width="373" height="157" />
            </span>
          </Link>
          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <nav ref={primaryNav} className="hidden shrink-0 flex-nowrap items-center gap-2.5 py-1 lg:flex xl:gap-5" aria-label={t("mainNavigation")}>
              {primaryNavigation.map((link) => item(link))}
            </nav>
            <LanguageSelector />
            <button type="button" className="grid h-10 w-10 place-items-center rounded-md text-[#10243a] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168568] lg:hidden" onClick={() => setOpen((v) => !v)} aria-label={open ? t("menuClose") : t("menuOpen")} aria-expanded={open} aria-controls="mobile-navigation" data-testid="button-mobile-menu">
              {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="mobile-navigation" className="border-t border-[#dce3e8] bg-white px-5 py-3 lg:hidden" aria-label={t("mainNavigation")}>
            {primaryNavigation.map((l) => (
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
  const { language, setLanguage, t } = useLanguage();
  if (translationReview[language].status !== "awaiting-human-review") return null;
  return (
    <div
      className="border-b border-[#d6e5df] bg-[#e8f2ef] px-4 py-2 text-center text-xs leading-5 text-[#285b4d]"
      role="note"
      aria-live="polite"
      data-testid="language-coverage-notice"
    >
      {t("contentLanguageNotice")}
      {" "}
      <button type="button" onClick={() => setLanguage("en")} className="font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2" lang="en">
        Read in English
      </button>
    </div>
  );
}
