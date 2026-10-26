import { Link, useLocation } from "wouter";
import { useLanguage } from "@/lib/language-context";
import { secondaryNavigation } from "@/config/site-navigation";

export function AppNav() {
  const [path] = useLocation();
  const { t } = useLanguage();
  return (
    <div className="border-b border-[#dce3e8] bg-[#10243a] text-white" data-testid="nav-application">
      <nav aria-label="Secondary navigation" className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-end gap-x-4 gap-y-2 px-3 py-3 text-[14px] leading-4 font-semibold sm:gap-x-6 sm:px-5 xl:px-8" data-testid="nav-secondary">
        {secondaryNavigation.map((link) => {
          const platform = link.href === "/energy-saas";
          const active = platform ? path === "/energy-saas" || path === "/app" || path.startsWith("/app/") : path === link.href || path.startsWith(link.href + "/");
          return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}
            data-secondary-start={link.href === "/industries" ? "" : undefined}
            data-testid={platform ? "link-energy-saas" : undefined}
            className={`inline-flex min-h-10 items-center whitespace-nowrap ${platform
              ? "geit-silver-link"
              : "py-2 transition hover:text-[#e8b64b]"} ${active ? "underline decoration-[#e8b64b] decoration-2 underline-offset-4" : ""}`}>
            {link.key ? t(link.key) : link.label}
          </Link>;
        })}
      </nav>
    </div>
  );
}
