export const primaryNavigation = [
  { key: "navHome", href: "/" },
  { key: "navAbout", href: "/about" },
  { key: "navServices", href: "/services" },
  { key: "navInsights", href: "/insights" },
] as const;

export const secondaryNavigation = [
  { key: "navIndustries", href: "/industries" },
  { key: "navDigital", href: "/digital-energy-solutions" },
  { key: null, href: "/energy-saas", label: "Energy SaaS" },
  { key: "navContact", href: "/contact" },
] as const;
