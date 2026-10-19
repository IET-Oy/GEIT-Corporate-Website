import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("public FAQ answers, fallbacks and rendered accessibility contracts", async (t) => {
  const server = await createServer({
    root, configFile: false, appType: "custom", logLevel: "error",
    resolve: { alias: { "@": path.join(root, "src") }, dedupe: ["react", "react-dom"] },
    esbuild: { jsx: "automatic" },
    server: { middlewareMode: true, watch: null, hmr: false },
    optimizeDeps: { noDiscovery: true },
  });
  try {
    const faq = await server.ssrLoadModule("/src/data/saas-faq.ts");
    await t.test("every suggested and exact FAQ question resolves to supported copy", () => {
      assert.equal(faq.saasFaq.length, 12);
      assert.equal(new Set(faq.saasFaq.map((item) => item.id)).size, 12);
      for (const item of faq.saasFaq) {
        const answer = faq.answerFromFaq(item.question);
        assert.equal(answer.text, item.answer);
        assert.notEqual(answer.kind, "provider");
        assert.ok(answer.links.length);
      }
      for (const question of faq.suggestedQuestions) {
        assert.ok(faq.saasFaq.some((item) => item.answer === faq.answerFromFaq(question).text));
      }
    });
    await t.test("manual import, alert and unavailable submission limits are explicit", () => {
      assert.match(faq.answerFromFaq("CSV import").text, /does not provide live monitoring/i);
      assert.match(faq.answerFromFaq("notifications").text, /no scheduler/i);
      assert.match(faq.answerFromFaq("notifications").text, /email, SMS or push delivery/);
      assert.match(faq.answerFromFaq("demonstration").text, /does not send or store enquiries/i);
      assert.match(faq.answerFromFaq("dashboards").text, /report hub is planned/i);
      assert.match(faq.answerFromFaq("energy consulting services").text, /consulting/i);
    });
    await t.test("unknown questions and human escalation return approved contact routes", () => {
      for (const question of ["zzzyyyxxxx", "Please let me speak to a human", "Delete my account"]) {
        const answer = faq.answerFromFaq(question);
        assert.equal(answer.kind, "human");
        assert.ok(answer.links.some((link) => link.href === "/contact"));
      }
      assert.equal(faq.humanContact().email, "dntechnologies.info@gmail.com");
    });
    await t.test("no provider is configured and failed future adapters fall back honestly", async () => {
      assert.equal(faq.configuredProvider, null);
      const fallback = await faq.answerQuestion("notifications");
      assert.equal(fallback.kind, "faq");
      const failed = await faq.answerQuestion("notifications", {
        id: "deliberately-failing-test-adapter",
        answer: async () => { throw new Error("Controlled test outage"); },
      });
      assert.equal(failed.kind, "faq");
      assert.equal(failed.text, fallback.text);
    });
    await t.test("search has filtered and no-match states; links use existing routes", () => {
      assert.equal(faq.searchFaq("").length, 12);
      assert.equal(faq.searchFaq("zzzyyyxxxx").length, 0);
      assert.ok(faq.searchFaq("solar").some((item) => item.id === "solar-battery"));
      const app = readFileSync(path.join(root, "src/App.tsx"), "utf8");
      const slugs = [...app.matchAll(/slug:'([^']+)'/g)].map((match) => `/services/${match[1]}`);
      const routes = new Set(["/services", "/contact", "/app", "/app/sign-in", "/app/forgot-password",
        "/privacy-policy", "/digital-energy-solutions", ...slugs]);
      for (const item of faq.saasFaq) {
        for (const link of item.links) assert.ok(routes.has(link.href), `Unknown FAQ link: ${link.href}`);
      }
    });
    await t.test("accordion and launcher render accessible names and states", async () => {
      const { SaasFaqSection } = await server.ssrLoadModule("/src/components/saas-faq-section.tsx");
      const { SupportWidget } = await server.ssrLoadModule("/src/components/support-widget.tsx");
      const wrap = (component) => renderToStaticMarkup(createElement(Router, { ssrPath: "/" }, createElement(component)));
      const section = wrap(SaasFaqSection);
      assert.equal((section.match(/aria-expanded="false"/g) ?? []).length, 12);
      assert.equal((section.match(/role="region"/g) ?? []).length, 12);
      assert.ok(section.includes('type="search"'));
      assert.ok(section.includes('lang="en"'));
      assert.ok(section.includes('id="saas-faq"'));
      assert.match(wrap(SupportWidget), /aria-haspopup="dialog"/);
      const widget = readFileSync(path.join(root, "src/components/support-widget.tsx"), "utf8");
      assert.doesNotMatch(widget, /localStorage|sessionStorage|console\.|fetch\(/);
      assert.match(widget, /e\.key === "Escape"/);
      const css = readFileSync(path.join(root, "src/index.css"), "utf8");
      assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*geit-headline-type/);
    });
  } finally {
    await server.close();
  }
});
