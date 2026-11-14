import type { MessageKey } from "@/lib/i18n";

/**
 * The single, approved top-level navigation. Every item sits at the same
 * visual level on desktop and appears in the same order in the mobile menu.
 * "Energy DT" is a product name and is intentionally not translated.
 */
export type NavItem =
  | { key: MessageKey; href: string; label?: undefined; product?: undefined }
  | { key: null; href: string; label: string; product: true };

export const mainNavigation: readonly NavItem[] = [
  { key: "navHome", href: "/" },
  { key: "navAbout", href: "/about" },
  { key: "navServices", href: "/services" },
  { key: "navIndustries", href: "/industries" },
  { key: null, href: "/energy-dt", label: "Energy DT", product: true },
  { key: "navInsights", href: "/insights" },
  { key: "navContact", href: "/contact" },
];

/** Energy DT is an information page here; the application itself is a separate deployment. */
export function isNavActive(href: string, path: string) {
  if (href === "/") return path === "/";
  if (href === "/energy-dt") return path === "/energy-dt" || path.startsWith("/energy-dt/");
  if (href === "/industries") return path === "/industries" || path.startsWith("/industries/") || path === "/digital-energy-solutions";
  return path === href || path.startsWith(href + "/");
}
