import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("approved founder identities, titles and supplied portraits render across all languages", async () => {
  const server = await createServer({
    root, configFile: false, appType: "custom", logLevel: "error",
    resolve: { alias: { "@": path.join(root, "src") }, dedupe: ["react", "react-dom"] },
    esbuild: { jsx: "automatic" },
    server: { middlewareMode: true, watch: null, hmr: false },
    optimizeDeps: { noDiscovery: true },
  });
  try {
    const { founders } = await server.ssrLoadModule("/src/config/founders.ts");
    const { FoundersLeadership } = await server.ssrLoadModule("/src/components/founders-leadership.tsx");
    const { LanguageProvider } = await server.ssrLoadModule("/src/lib/language-context.tsx");
    assert.deepEqual(founders.map(({ fullName, officialTitle }) => [fullName, officialTitle]), [
      ["Dr. Hyacinthe M. Nshuti", "Founder/CEO"],
      ["Mr. Noel Dushimiyimana", "Co-founder/General manager"],
    ]);
    for (const founder of founders) {
      assert.equal(founder.email, "info.services@geit.rw");
      assert.equal(founder.telephone, null, "No personal telephone number was supplied");
      const asset = path.join(root, "public", founder.portraitSrc.replace(/^\//, ""));
      const bytes = readFileSync(asset);
      assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
      assert.ok(statSync(asset).size < 70000, "Portrait should be optimised for the website");
      assert.ok(founder.biography.includes("2026"));
    }
    assert.ok(founders[0].portraitSrc.includes("hyacinthe-nshuti"));
    assert.ok(founders[1].portraitSrc.includes("noel-dushimiyimana"));
    for (const language of ["en", "fr", "rw", "sw"]) {
      const html = renderToStaticMarkup(createElement(LanguageProvider, { initialLanguage: language },
        createElement(FoundersLeadership)));
      assert.equal((html.match(/data-testid="card-founder-/g) ?? []).length, 2);
      assert.equal((html.match(/mailto:info.services@geit.rw/g) ?? []).length, 2);
      assert.ok(html.includes('alt="Dr. Hyacinthe M. Nshuti"'));
      assert.ok(html.includes('alt="Mr. Noel Dushimiyimana"'));
      assert.ok(html.includes("Founder/CEO"));
      assert.ok(html.includes("Co-founder/General manager"));
      assert.ok(!html.includes("translation missing"));
      assert.ok(!html.includes("PORTRAIT TO BE ADDED"));
    }
  } finally {
    await server.close();
  }
});
