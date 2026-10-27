import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router } from "wouter";
import { createServer } from "vite";
import { secondaryNavigation } from "../src/config/site-navigation.ts";

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("Energy DT navigation opens the existing protected workspace routes", () => {
  const product = secondaryNavigation.find((item) => item.href === "/energy-saas");
  assert.equal(product.label, "Energy DT");
  const navigation = source("platform/app-nav.tsx");
  assert.match(navigation, /geit-silver-link/);
  assert.match(navigation, /link-energy-saas/);
  assert.match(navigation, /href=\{link\.href\}/);
  assert.doesNotMatch(navigation, /preventDefault|setComingSoon|energy-dt-coming-soon/);
  const routes = source("App.tsx");
  assert.match(routes, /location === "\/energy-saas"[\s\S]*<Redirect to="\/energy-dt" \/>/);
  assert.match(routes, /location === "\/energy-dt" \|\| location\.startsWith\("\/energy-dt\/"\)/);
  assert.match(routes, /location === "\/app" \|\| location\.startsWith\("\/app\/"\)[\s\S]*<AppRoutes \/>/);
  const appRoutes = source("platform/app-routes.tsx");
  assert.match(appRoutes, /<Route path="\/app\/sign-in" component=\{SignInPage\} \/>/);
  assert.match(appRoutes, /<Route path="\/app" component=\{OverviewPage\} \/>/);
  assert.match(source("platform/workspace.tsx"), /data-testid="state-signed-out"/);
});

test("Energy DT has a distinct overview, honest status and usable workspace destinations", () => {
  const overview = source("platform/energy-dt-overview.tsx");
  for (const label of [
    "Dashboard", "Organisations & Sites", "Assets & Meters",
    "Digital Twin, Forecasting & Anomaly Detection", "Engineering & Simulations",
    "Tariffs, Costs & Savings", "Carbon Footprint", "Reports & Documents",
    "Projects & Recommendations", "Settings & Organisation Management",
  ]) assert.ok(overview.includes(label), `missing destination: ${label}`);
  assert.match(overview, /not verify live sign-in,[\s\S]*Row-Level Security against a dedicated staging project/);
  assert.match(overview, /href="\/app\/sign-in"/);
  assert.match(overview, /href="\/app\/register"/);
  assert.match(overview, /href="\/privacy-policy"/);
  assert.match(overview, /href="\/terms-of-use"/);
  assert.match(source("platform/app-routes.tsx"), /path="\/app\/recommendations"><PlannedPage moduleId="recommendations"/);
  assert.match(source("config/platform-modules.ts"), /id: "recommendations"[\s\S]*readiness: "planned"/);
});

test("silver-fluid control supports touch, focus, pressed and reduced-motion modes", () => {
  const css = source("index.css");
  const silver = css.slice(css.indexOf("/* ---- Energy DT silver-fluid"));
  assert.match(silver, /min-height:44px/);
  assert.match(silver, /min-width:44px/);
  assert.match(silver, /border-radius:2px/);
  assert.match(silver, /linear-gradient/);
  assert.match(silver, /\.geit-silver-link:focus-visible/);
  assert.match(silver, /\.geit-silver-link:active/);
  assert.match(silver, /@media \(hover:hover\) and \(pointer:fine\)/);
  assert.match(silver, /prefers-reduced-motion:reduce/);
});

test("corporate and application refinements have separate route scopes", () => {
  const corporate = source("App.tsx");
  assert.match(corporate, /geit-corp/);
  assert.match(source("platform/app-routes.tsx"), /geit-app/);
  const css = source("index.css");
  assert.match(css, /\.geit-corp/);
  assert.match(css, /\.geit-app/);
  assert.match(css, /#123B2A/i);
  assert.ok(css.includes(".geit-corp main a.text-\\[\\#116d55\\]"), "industry service-chip text gets dark green without changing its background");
  assert.ok(css.includes(".geit-corp main a span.text-\\[\\#168568\\]"), "nested link labels get dark green without changing decorative icons");
});

test("public product descriptions and multilingual support use the Energy DT name", () => {
  for (const path of ["data/saas-faq.ts", "lib/translations/support.ts", "lib/translations/faq-fr.ts", "lib/translations/faq-rw.ts", "lib/translations/faq-sw.ts"]) {
    const contents = source(path);
    assert.match(contents, /Energy DT/);
    assert.doesNotMatch(contents, /Energy SaaS|ENERGY SAAS/);
  }
  assert.match(source("platform/common.tsx"), /ENERGY DT/);
});

test("corporate navigation glass is paint-only and text recolouring excludes the hero and SVGs", () => {
  const css = source("index.css");
  const glass = css.slice(css.indexOf("/* Corporate glass across Home"));
  for (const marker of [".geit-public>header", '.geit-public>[data-testid="nav-application"]', ".geit-public>footer"]) {
    assert.ok(glass.includes(marker), marker);
  }
  assert.match(glass, /backdrop-filter:blur/);
  assert.match(glass, /box-shadow:/);
  assert.match(glass, /:not\(svg\):not\(svg \*\):not\(\[data-testid="home-hero"\] \*\)/);
  assert.match(glass, /color:#123B2A!important/);
  assert.doesNotMatch(glass, /(?:^|[;{])\s*(?:padding|margin|position|top|left|height|display|grid-template-columns)\s*:/m);
  assert.match(glass, /prefers-reduced-motion:reduce/);
});

test("corporate glass uses neutral dark surfaces rather than white or navy slabs", () => {
  const glass = source("corporate-glass.css");
  assert.match(glass, /--corporate-glass: rgba\(0, 0, 0, \.38\)/);
  assert.match(glass, /\.geit-public > header,/);
  assert.match(glass, /background: var\(--corporate-glass\)/);
  assert.match(glass, /background-color: rgba\(0, 0, 0, \.12\)/);
  assert.match(glass, /backdrop-filter: blur\(8px\)/);
  assert.match(glass, /color: #fff/);
  assert.match(glass, /color: #123B2A !important/);
  assert.match(source("index.css"), /\[data-testid="home-hero"\] \.geit-headline\{color:#fff;background:rgba\(0,0,0,\.38\)/);
});

test("a decorative viewport image backs corporate pages without changing the app or animation loops", () => {
  const css = source("corporate-glass.css");
  assert.match(css, /\.corporate-backdrop \{\s*position: fixed/);
  assert.match(css, /pointer-events: none/);
  assert.match(css, /object-fit: cover/);
  assert.doesNotMatch(css, /\.geit-app\b|animation:|background-attachment:/);
  const shell = source("App.tsx").split("function Shell(")[1].split("function Eyebrow(")[0];
  assert.match(shell, /aria-hidden="true" data-testid="corporate-backdrop"/);
  assert.ok(shell.includes('${import.meta.env.BASE_URL}images/homepage-background.webp'));
  assert.match(shell, /alt="" width="1024" height="558"/);
  assert.ok(source("main.tsx").indexOf("import './corporate-glass.css'") > source("main.tsx").indexOf("import './index.css'"));
});

test("small actions and section labels share hero glass while pale panels use navy copy", () => {
  const css = source("corporate-glass.css");
  assert.match(css, /main a:is\(\.inline-flex,\.font-bold\)\[href\]:not\(nav a\):not\(\.underline\)/);
  assert.match(css, /main p\.geit-section-label\[class\]:not\(\[data-testid="home-hero"\] \*\)/);
  assert.match(css, /border-radius: 6px/);
  assert.match(css, /padding: \.65rem \.9rem/);
  assert.match(css, /color: #10243a !important/);
  assert.match(css, /\[role="alert"\].*[\s\S]*color: #7a2a1d/);
  assert.match(source("components/contact-form.tsx"), /geit-readable-glass/);
  assert.match(source("App.tsx"), /geit-readable-glass[^"]*" id="low-carbon-transition"/);
});

test("upper navigation uses a gold underline without a filled active badge, and mission matches vision", () => {
  const header = source("components/site-header.tsx");
  const css = source("corporate-glass.css");
  const app = source("App.tsx");
  assert.match(header, /border-b-2 border-\[#e8b64b\] font-bold/);
  assert.doesNotMatch(header, /!text-\[#123B2A\]/);
  assert.match(css, /\.geit-public > header \.navlink:is\(\[aria-current="page"\],:hover,:focus-visible\) \{\s*color: #fff !important;\s*background: transparent;\s*box-shadow: none;/);
  const mission = app.match(/<span className="([^"]*)">\{c\("OUR MISSION"\)\}/)?.[1];
  const vision = app.match(/<span className="([^"]*)">\{c\("OUR VISION"\)\}/)?.[1];
  assert.ok(mission);
  assert.equal(mission, vision);
});

test("homepage sector numbers, sector links and FAQ label reuse glass while answers use readable navy surfaces", () => {
  const sectors = source("components/industries-section.tsx").split("export function IndustriesPreview()")[1];
  const faq = source("components/saas-faq-section.tsx");
  const css = source("corporate-glass.css");
  assert.equal((sectors.match(/<span className="geit-section-label/g) ?? []).length, 2);
  assert.ok(sectors.includes('href={`/industries#${s.id}`}'));
  assert.match(css, /\.geit-public main span\.geit-section-label\[class\],/);
  assert.match(faq, /<p className="geit-section-label[^"]*">[\s\S]*?\{copy\.eyebrow\}/);
  assert.match(faq, /role="region"[^>]*hidden=\{!isOpen\} className="geit-readable-glass/);
  assert.match(css, /main :is\(\.geit-readable-glass[\s\S]*?color: #10243a !important/);
  assert.match(faq, /aria-expanded=\{isOpen\}/);
});

test("all corporate pages share glass styling while retaining inner-page scope and the existing hero", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const server = await createServer({
    root, configFile: false, appType: "custom", logLevel: "error",
    resolve: { alias: { "@": path.join(root, "src") }, dedupe: ["react", "react-dom"] },
    esbuild: { jsx: "automatic" },
    server: { middlewareMode: true, watch: null, hmr: false },
    optimizeDeps: { noDiscovery: true },
  });
  try {
    const { SiteRoutes } = await server.ssrLoadModule("/src/App.tsx");
    const { LanguageProvider } = await server.ssrLoadModule("/src/lib/language-context.tsx");
    for (const route of ["/", "/about", "/services", "/industries", "/digital-energy-solutions", "/insights", "/contact", "/energy-dt", "/app", "/app/sign-in", "/app/recommendations"]) {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const html = renderToStaticMarkup(createElement(LanguageProvider, { initialLanguage: "en" },
        createElement(QueryClientProvider, { client: queryClient },
          createElement(Router, { ssrPath: route }, createElement(SiteRoutes)))));
      const appRoute = route === "/energy-dt" || route.startsWith("/energy-dt/") || route === "/app" || route.startsWith("/app/");
      assert.equal(/class="grain min-h-\[100dvh\] geit-public/.test(html), !appRoute, route);
      if (!appRoute) assert.equal(/class="grain min-h-\[100dvh\] geit-public geit-corp"/.test(html), route !== "/", route);
      assert.match(html, /geit-silver-link/);
      assert.match(html, /href="\/energy-saas"/);
      if (appRoute) {
        assert.match(html, /class="geit-app min-h-\[100dvh\] bg-\[#f2f5f7\]"/);
        assert.match(html, /data-testid="nav-application"/);
        assert.doesNotMatch(html, /Energy DT is coming soon/);
        if (route === "/app/sign-in") assert.match(html, /Sign in to your workspace/);
        if (route === "/energy-dt") assert.match(html, /data-testid="energy-dt-overview"/);
      } else {
        assert.match(html, /data-testid="corporate-backdrop"/);
      }
      if (route !== "/" && !appRoute) assert.match(html, /geit-glass/, `${route}: floating glass content`);
      if (route === "/") {
        assert.match(html, /data-testid="home-hero"/);
        assert.match(html, /homepage-background\.webp/);
        assert.match(html, /Make smarter energy decisions\./);
      }
    }
    const { TwinCharts } = await server.ssrLoadModule("/src/platform/sustainability/twin-charts.tsx");
    assert.equal(renderToStaticMarkup(createElement(TwinCharts, { result: { tables: [] } })), "");
    const html = renderToStaticMarkup(createElement(TwinCharts, { result: { tables: [{
      title: "Historical building series", rows: [{
        start: "2026-01-01T00:00:00Z", end: "2026-01-01T01:00:00Z",
        loadKwh: 5, solarKwh: 2, gridImportKwh: 3,
      }],
    }] } }));
    assert.match(html, /Measured:/);
    assert.match(html, /imported building load and solar readings/);
    assert.match(html, /Simulated:/);
    assert.match(html, /grid flows and battery dispatch, where configured/);
    assert.doesNotMatch(html, /Estimated \/ forecast:/);
  } finally {
    await server.close();
  }
});
