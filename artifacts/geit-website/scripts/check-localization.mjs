import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = name => JSON.parse(fs.readFileSync(path.join(root, "src/lib/translations", name + ".json"), "utf8"));
const sources = readJson("source");
const catalogs = Object.fromEntries(["fr", "rw", "sw"].map(locale => [locale, readJson(locale)]));
assert.equal(new Set(sources).size, sources.length, "Source strings must be unique");
const tokens = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
for (const [locale, catalog] of Object.entries(catalogs)) {
  assert.deepEqual(Object.keys(catalog).sort(), [...sources].sort(), `${locale}: catalog must cover the complete source`);
  for (const source of sources) {
    assert.ok(catalog[source]?.trim(), `${locale}: empty translation for ${source}`);
    assert.deepEqual(tokens(catalog[source]), tokens(source), `${locale}: interpolation tokens changed: ${source}`);
    if (source.includes("50%")) assert.match(catalog[source], /(?:50\s*%|asilimia 50)/, `${locale}: ownership percentage changed`);
    for (const value of source.match(/(?:157099400|GEIT)/g) ?? []) {
      assert.ok(catalog[source].includes(value), `${locale}: approved fact ${value} lost: ${source}`);
    }
  }
}

// Render the real pages (not copied fixtures) at every route and locale without
// a GPU, network calls, a database or a browser automation run.
const server = await createServer({
  root,
  configFile: false,
  logLevel: "error",
  appType: "custom",
  base: "/",
  resolve: { alias: { "@": path.join(root, "src") }, dedupe: ["react", "react-dom"] },
  esbuild: { jsx: "automatic" },
  server: { middlewareMode: true, watch: null },
  optimizeDeps: { noDiscovery: true },
});

try {
  const { SiteRoutes } = await server.ssrLoadModule("/src/App.tsx");
  const { LanguageProvider } = await server.ssrLoadModule("/src/lib/language-context.tsx");
  const { translatePageCopy, translationReview } = await server.ssrLoadModule("/src/lib/page-copy.ts");
  const { translate } = await server.ssrLoadModule("/src/lib/i18n.ts");
  const { DefaultFallback } = await server.ssrLoadModule("/src/components/error-boundary.tsx");
  assert.doesNotThrow(() => renderToStaticMarkup(createElement(DefaultFallback, {
    error: new Error("Expected test error"), resetError() {},
  })), "The root error fallback must work outside the language provider");
  const { contactServiceOptions, createContactFormSchema, contactFormDefaultValues } =
    await server.ssrLoadModule("/src/lib/contact-form-schema.ts");
  const slugs = [...fs.readFileSync(path.join(root, "src/App.tsx"), "utf8").matchAll(/slug:'([^']+)'/g)].map(match => match[1]);
  assert.equal(slugs.length, 11, "All eleven services must remain available");
  const routes = [
    "/", "/about", "/services", ...slugs.map(slug => "/services/" + slug),
    "/industries", "/digital-energy-solutions", "/carbon-footprint-services",
    "/insights", "/contact", "/privacy-policy", "/terms-of-use", "/not-a-geit-page",
  ];
  const escape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
  for (const locale of ["en", "fr", "rw", "sw"]) {
    const fallback = renderToStaticMarkup(createElement(LanguageProvider, { initialLanguage: locale },
      createElement(DefaultFallback, { error: new Error("Expected test error"), resetError() {} })));
    assert.ok(fallback.includes(escape(translatePageCopy(locale, "Something went wrong"))), `${locale}: localized error fallback`);
    assert.equal(translatePageCopy(locale, "GEIT on {name}", { name: "LinkedIn" }).includes("{name}"), false);
    assert.equal(translationReview[locale].status, locale === "en" ? "source" : "awaiting-human-review");
    for (const route of routes) {
      const html = renderToStaticMarkup(createElement(LanguageProvider, { initialLanguage: locale },
        createElement(Router, { ssrPath: route }, createElement(SiteRoutes))));
      const visibleText = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ");
      const missingCopy = [...html.matchAll(/\[English — translation missing\] ([^<]+)/g)].map(match => match[1]);
      assert.equal(missingCopy.length, 0, `${locale} ${route}: missing copy: ${missingCopy.join("; ")}`);
      assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${locale} ${route}: page not rendered correctly`);
      assert.equal(html.includes('data-testid="language-coverage-notice"'), locale !== "en", `${locale} ${route}: review disclosure`);
      if (locale !== "en") {
        for (const source of sources) {
          if (catalogs[locale][source] !== source && source.length > 20) {
            assert.ok(!html.includes(">" + escape(source) + "<"), `${locale} ${route}: untranslated text: ${source}`);
          }
        }
      }
      if (route === "/contact" || route === "/") {
        assert.ok(html.includes(escape(translate(locale, "formUnavailableCopy"))), `${locale}: no-send/no-storage disclosure lost`);
        for (const option of contactServiceOptions) {
          assert.ok(html.includes(`value="${escape(option)}"`), `${locale}: form enum changed`);
          assert.ok(html.includes(">" + escape(translatePageCopy(locale, option)) + "</option>"), `${locale}: option not localized`);
        }
      }
      if (route === "/privacy-policy" || route === "/terms-of-use") {
        assert.ok(html.includes("157099400"), `${locale}: company registration changed`);
      }
      if (route === "/about") {
        assert.match(visibleText, /\b2026\b/, `${locale}: founding year missing`);
        assert.equal((html.match(/data-testid="card-founder-/g) ?? []).length, 2, `${locale}: two founder profile cards required`);
        assert.doesNotMatch(visibleText, /(?:50\s*%|asilimia 50)/, `${locale}: superseded founder text remains`);
        for (const fact of ["Dr. Hyacinthe M. Nshuti", "Mr. Noel Dushimiyimana"]) {
          assert.ok(html.includes(fact), `${locale}: founder facts changed`);
        }
      }
      if (route === "/") {
        assert.doesNotMatch(visibleText, /\b(?:Rwanda|Kigali)\b/i, `${locale}: location-specific homepage content remains`);
      }
      if (route !== "/") {
        assert.ok(html.includes("Kigali, Rwanda"), `${locale} ${route}: shared footer address must remain unchanged outside Home`);
      }
    }
    const validation = createContactFormSchema(locale).safeParse(contactFormDefaultValues);
    assert.equal(validation.success, false);
    assert.ok(validation.error.issues.some(issue => issue.message === translate(locale, "emailRequired")));
    console.log(`${locale}: ${routes.length} routes, form enums, disclosures and validation passed`);
  }
  assert.match(translatePageCopy("fr", "Uncatalogued source copy"), /translation missing/);
  console.log(`${sources.length} source entries: complete catalogs, placeholders and approved facts passed`);
} finally {
  await server.close();
}
