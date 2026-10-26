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
    const { LanguageProvider } = await server.ssrLoadModule("/src/lib/language-context.tsx");
    const { supportCopy, supportReview } = await server.ssrLoadModule("/src/lib/translations/support.ts");
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
      assert.equal(faq.humanContact().email, "info.services@geit.rw");
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
      const wrap = (component) => renderToStaticMarkup(createElement(LanguageProvider, { initialLanguage: "en" },
        createElement(Router, { ssrPath: "/" }, createElement(component))));
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
    await t.test("consultation form states submissions are disabled and provides the approved email alternative", async () => {
      const { default: ContactForm } = await server.ssrLoadModule("/src/components/contact-form.tsx");
      const html = renderToStaticMarkup(createElement(LanguageProvider, { initialLanguage: "en" },
        createElement(Router, { ssrPath: "/contact" }, createElement(ContactForm))));
      assert.match(html, /Enquiry submission is not configured/);
      assert.match(html, /Details entered here are not sent to GEIT or stored by this site/);
      assert.match(html, /href="mailto:info\.services@geit\.rw"/);
      assert.match(html, /info\.services@geit\.rw/);
    });
    await t.test("all locales share facts, route targets and complete translated copy", async () => {
      const { SaasFaqSection } = await server.ssrLoadModule("/src/components/saas-faq-section.tsx");
      const { SupportWidget } = await server.ssrLoadModule("/src/components/support-widget.tsx");
      for (const language of ["en", "fr", "rw", "sw"]) {
        const items = faq.getSaasFaq(language);
        const copy = supportCopy[language];
        assert.equal(items.length, 12);
        assert.equal(supportReview[language].status, language === "en" ? "source" : "human-review-approved");
        assert.equal(supportReview[language].reviewer, null);
        if (language !== "en") assert.equal(supportReview[language].confirmation, "project-owner");
        assert.deepEqual(Object.keys(copy).sort(), Object.keys(supportCopy.en).sort());
        for (const value of Object.values(copy)) assert.ok(value.trim());
        for (const [index, item] of items.entries()) {
          const source = faq.saasFaq[index];
          assert.equal(item.id, source.id);
          assert.equal(item.status, source.status);
          assert.equal(item.humanHelp, source.humanHelp);
          assert.deepEqual(item.links.map(link => link.href), source.links.map(link => link.href));
          if (language !== "en") {
            for (const field of ["question", "answer", "statusNote"]) assert.notEqual(item[field], source[field]);
            item.links.forEach((link, i) => assert.notEqual(link.label, source.links[i].label));
          }
          const answer = faq.answerFromFaq(item.question, items, language);
          assert.equal(answer.text, item.answer);
          assert.equal(answer.status, source.status);
          assert.deepEqual(answer.links, item.links);
        }
        for (const question of faq.getSuggestedQuestions(language)) {
          assert.ok(items.some(item => item.question === question));
          const answer = await faq.answerQuestion(question, undefined, undefined, language);
          assert.ok(items.some(item => item.answer === answer.text));
        }
        assert.equal(faq.answerFromFaq("zzzyyyxxxx", items, language).text, copy.unknown);
        assert.ok(items.find(item => item.id === "data").answer.includes("2 MiB"));
        assert.match(items.find(item => item.id === "data").answer, /5[ ,]?000/);
        assert.ok(items.find(item => item.id === "inefficiencies").answer.includes("35"));
        const render = component => renderToStaticMarkup(createElement(LanguageProvider, { initialLanguage: language },
          createElement(Router, { ssrPath: "/" }, createElement(component))));
        const section = render(SaasFaqSection);
        assert.ok(section.includes(`lang="${language}"`));
        assert.ok(section.includes(copy.heading));
        assert.equal((section.match(/aria-expanded="false"/g) ?? []).length, 12);
        assert.ok(render(SupportWidget).includes(copy.launcher));
        assert.equal(section.includes(supportCopy.en.intro), language === "en");
        assert.equal(section.includes(copy.english), language !== "en");
      }
    });
    await t.test("local questions, accents, apostrophes and human requests resolve in the selected language", () => {
      const queries = {
        fr: { alerts: "Comment fonctionnent les alertes ?", data: "Quelles données puis-je importer ?", "solar-battery": "batterie solaire", inefficiencies: "efficacite", human: "Je veux parler à une personne de mon compte" },
        rw: { alerts: "imenyesha", data: "kwinjiza amakuru", "solar-battery": "bateri izuba", inefficiencies: "gupfa ubusa", human: "Ndashaka umuntu kuri konti yanjye" },
        sw: { alerts: "arifa", data: "kuingiza data", "solar-battery": "betri jua", inefficiencies: "ufanisi", human: "Nataka mtu kuhusu akaunti yangu" },
      };
      for (const [language, cases] of Object.entries(queries)) {
        const items = faq.getSaasFaq(language);
        for (const [id, question] of Object.entries(cases)) {
          const answer = faq.answerFromFaq(question, items, language);
          if (id === "human") {
            assert.equal(answer.kind, "human");
            assert.equal(answer.text, supportCopy[language].human);
            assert.equal(answer.links[0].href, "/contact");
          } else {
            assert.equal(answer.text, items.find(item => item.id === id).answer, `${language}: ${question}`);
            assert.ok(faq.searchFaq(question, items).some(item => item.id === id));
          }
        }
        const item = items[0];
        const asciiQuestion = item.question.normalize("NFD").replace(/\p{M}/gu, "").replace(/[’]/g, "'");
        assert.equal(faq.answerFromFaq(asciiQuestion, items, language).text, item.answer);
      }
    });
  } finally {
    await server.close();
  }
});
