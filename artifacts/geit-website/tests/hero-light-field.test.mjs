import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("homepage light field cycles through distinct decorative shapes", async () => {
  const server = await createServer({
    root, configFile: false, logLevel: "error", appType: "custom",
    resolve: { alias: { "@": path.join(root, "src") }, dedupe: ["react", "react-dom"] },
    esbuild: { jsx: "automatic" },
    server: { middlewareMode: true, watch: null, hmr: false },
    optimizeDeps: { noDiscovery: true },
  });
  try {
    const { heroPhaseWeights, buildHeroTargets, HeroLightField } =
      await server.ssrLoadModule("/src/components/hero-light-field.tsx");
    assert.deepEqual(heroPhaseWeights(0), [1, 0, 0]);
    assert.deepEqual(heroPhaseWeights(10), [0, 1, 0]);
    assert.deepEqual(heroPhaseWeights(17), [0, 0, 1]);
    assert.deepEqual(heroPhaseWeights(26), heroPhaseWeights(0));
    for (let t = 0; t <= 52; t += 0.1) {
      const w = heroPhaseWeights(t);
      assert.ok(w.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
      assert.ok(Math.abs(w.reduce((a, b) => a + b) - 1) < 1e-8);
      assert.ok(w.every((value, i) => Math.abs(value - heroPhaseWeights(t + 0.001)[i]) < 0.002));
    }
    const { orb, gal, br, at } = buildHeroTargets(900);
    for (const points of [orb, gal, br]) {
      assert.equal(points.length, 2700);
      assert.ok(points.every(value => Number.isFinite(value) && Math.abs(value) < 2));
    }
    assert.equal(at.length, 1800);
    assert.notDeepEqual(orb, gal);
    assert.notDeepEqual(gal, br);
    const axisRange = (points, axis) => {
      const values = Array.from(points).filter((_, i) => i % 3 === axis);
      return Math.max(...values) - Math.min(...values);
    };
    assert.ok(axisRange(gal, 1) < axisRange(orb, 1) * 0.2, "galaxy is a thin disc");
    assert.ok(axisRange(br, 2) < axisRange(br, 0) * 0.6, "brain keeps its side profile");
    const html = renderToStaticMarkup(createElement(HeroLightField));
    assert.ok(html.includes('aria-hidden="true"'));
    assert.ok(html.includes("<canvas"));
    assert.ok(html.includes("<svg"), "canvas-unavailable static artwork");
    assert.doesNotMatch(html, /<button|tabindex|<text/i, "background has no visible labels or focus targets");
  } finally {
    await server.close();
  }
});
