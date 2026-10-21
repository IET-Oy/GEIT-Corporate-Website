import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { createServer } from "vite";
import { secondaryNavigation } from "../src/config/site-navigation.ts";

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("Energy DT keeps the established destination and technical navigation identifier", () => {
  const product = secondaryNavigation.find((item) => item.href === "/energy-saas");
  assert.equal(product.label, "Energy DT");
  const navigation = source("platform/app-nav.tsx");
  assert.match(navigation, /geit-silver-link/);
  assert.match(navigation, /link-energy-saas/);
  const routes = source("App.tsx");
  assert.ok(routes.includes("if(location==='/energy-saas')return <Redirect to=\"/app\"/>"));
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

test("light glass panels and navigation have no white fill, retaining blur and dark surfaces", () => {
  const css = source("index.css");
  const glass = css.slice(css.indexOf("/* Corporate glass across Home"));
  assert.match(glass, /\.geit-public>header,\s*\.geit-app>header\{\s*background:transparent;/);
  assert.match(glass, /#mobile-navigation[^{]*\{\s*background:transparent;/);
  assert.match(glass, /:not\(\[data-testid="home-hero"\] \*\)\{\s*background-color:transparent;/);
  assert.match(glass, /form\.geit-glass\{background-color:transparent\}/);
  assert.match(glass, /backdrop-filter:blur\(14px\)/);
  assert.match(glass, /background:rgba\(16,36,58,\.86\)/);
  assert.match(css, /\[data-testid="home-hero"\] \.geit-headline\{color:#fff;background:rgba\(0,0,0,\.38\)/);
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
    for (const route of ["/", "/about", "/services", "/industries", "/digital-energy-solutions", "/insights", "/contact"]) {
      const html = renderToStaticMarkup(createElement(LanguageProvider, { initialLanguage: "en" },
        createElement(Router, { ssrPath: route }, createElement(SiteRoutes))));
      assert.match(html, /class="grain min-h-\[100dvh\] geit-public/);
      assert.equal(/class="grain min-h-\[100dvh\] geit-public geit-corp"/.test(html), route !== "/", route);
      assert.match(html, /geit-silver-link/);
      assert.match(html, /href="\/energy-saas"/);
      if (route !== "/") assert.match(html, /geit-glass/, `${route}: floating glass content`);
      else {
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
