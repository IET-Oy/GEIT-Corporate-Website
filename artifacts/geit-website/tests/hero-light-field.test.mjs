import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { heroRuntime } from "./helpers/hero-runtime.mjs";

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

test("30 Hz pacing does not accelerate the cycle on 60/90/120 Hz displays", () => {
  for (const hz of [60, 90, 120]) {
    const h = heroRuntime(); h.mount();
    const initial = h.frames.length;
    h.advance(0, 26000, hz);
    const count = h.frames.length - initial;
    assert.ok(count >= 778 && count <= 781, `${hz} Hz: ${count} draws in one 26-second cycle`);
    assert.ok(h.frames.every(f => f.particles === 900));
    h.unmount();
  }
});

test("adaptive budget responds to sustained cost and stalls, with bounded slow recovery", () => {
  const { HeroFrameBudget } = heroRuntime().exports;
  const b = new HeroFrameBudget();
  for (let i = 0; i < 300; i++) b.observe(12, 33.33);
  assert.equal(b.particles, 450);
  for (let i = 0; i < 149; i++) b.observe(2, 33.33);
  assert.equal(b.particles, 450);
  b.observe(2, 33.33);
  assert.equal(b.particles, 540);
  for (let i = 0; i < 3000; i++) b.observe(2, 33.33);
  assert.equal(b.particles, 900);
  b.observe(100, 100); // isolated spike is not enough to lower quality
  for (let i = 0; i < 29; i++) b.observe(2, 33.33);
  assert.equal(b.particles, 900);
  for (let i = 0; i < 30; i++) b.observe(2, 60);
  assert.equal(b.particles, 720, "missed deadlines count even if canvas submission is cheap");
  b.resize(1200);
  assert.equal(b.maxParticles, 1900);
  assert.equal(b.particles, 1520, "resize preserves the measured quality ratio");
  b.resize(360);
  assert.equal(b.particles, 720);
});

test("renderer consumes adaptive budgets while preserving all target distributions", () => {
  const h = heroRuntime(); h.mount(); h.setDrawCost(20);
  h.advance(0, 12000);
  assert.equal(h.frames.at(-1).particles, 450);
  assert.ok(h.frames.at(-1).points.every(p => p.every(Number.isFinite)));
  // Check shape statistics at the minimum retained prefix, not only at full quality.
  const { orb, gal, br } = h.exports.buildHeroTargets(450);
  const span = (points, axis) => {
    const values = Array.from(points).filter((_, i) => i % 3 === axis);
    return Math.max(...values) - Math.min(...values);
  };
  assert.ok(span(orb, 0) > 1.5 && span(orb, 1) > 1.5);
  assert.ok(span(gal, 1) < span(gal, 0) * .2);
  assert.ok(span(br, 2) < span(br, 0) * .6);
  assert.ok(span(br, 1) > 1.4, "brain retains cortex and stem");
  h.unmount();
});

test("visibility/intersection pause rendering and resume without catch-up bursts", () => {
  const h = heroRuntime(); h.mount(); h.advance(0, 1000);
  const io = h.observers[0];
  h.document.hidden = true; h.document.emit("visibilitychange");
  const count = h.frames.length;
  assert.equal(h.rafs.size, 0);
  h.el.clientWidth = 400; h.observers[1].emit();
  h.advance(1000, 2000);
  assert.equal(h.frames.length, count, "hidden resize must not render");
  io.emit({ isIntersecting: false, intersectionRatio: 0 });
  h.document.hidden = false; h.document.emit("visibilitychange");
  assert.equal(h.rafs.size, 0, "visible tab still waits for intersection");
  io.emit({ isIntersecting: true, intersectionRatio: .01 });
  assert.equal(h.rafs.size, 0, "tiny intersection remains paused");
  io.emit({ isIntersecting: true, intersectionRatio: 1 });
  h.advance(3000, 1000);
  assert.ok(h.frames.length - count >= 29 && h.frames.length - count <= 31);
  assert.equal(h.rafs.size, 1, "only one loop after multiple resume events");
  h.unmount();
});

test("resize updates density and responsive budget without extra loops", () => {
  const h = heroRuntime(); h.mount();
  assert.equal(h.canvas.width, 540, "mobile density capped at 1.5");
  h.el.clientWidth = 1200;
  h.observers[1].emit();
  assert.equal(h.canvas.width, 2400, "desktop density capped at 2");
  assert.equal(h.frames.at(-1).particles, 1900);
  const count = h.frames.length;
  h.window.emit("resize");
  assert.equal(h.frames.length, count, "unchanged dimensions do not redraw");
  h.el.clientWidth = 360; h.window.emit("resize");
  assert.equal(h.frames.at(-1).particles, 900);
  h.window.devicePixelRatio = 1; h.window.emit("resize");
  assert.equal(h.canvas.width, 360, "density-only changes are handled");
  assert.equal(h.rafs.size, 1);
  h.unmount();
});

test("live reduced motion, pointer/touch response and unmount release resources", () => {
  const h = heroRuntime({ reduced: true }); h.mount();
  const control = heroRuntime({ reduced: true }); control.mount();
  assert.equal(h.frames.length, 1);
  assert.equal(h.rafs.size, 0);
  h.media.matches = false; h.media.emit("change");
  control.media.matches = false; control.media.emit("change");
  h.advance(0, 1000);
  control.advance(0, 1000);
  assert.deepEqual(h.frames.at(-1).points, control.frames.at(-1).points);
  h.window.emit("pointerdown", { clientX: 230, clientY: 400, pointerType: "touch" });
  assert.equal(h.timers.size, 1);
  h.advance(1000, 1000);
  control.advance(1000, 1000);
  assert.notDeepEqual(h.frames.at(-1).points, control.frames.at(-1).points, "touch changes the actual projection");
  h.window.emit("pointermove", { clientX: 240, clientY: 410, pointerType: "touch" });
  assert.equal(h.timers.size, 1, "touch timer is replaced, not accumulated");
  h.media.matches = true; h.media.emit("change");
  assert.equal(h.rafs.size, 0);
  const count = h.frames.length;
  h.window.emit("pointermove", { clientX: 100, clientY: 200, pointerType: "mouse" });
  h.advance(2000, 1000);
  assert.equal(h.frames.length, count, "reduced motion remains static");
  h.unmount();
  assert.equal(h.rafs.size, 0);
  assert.equal(h.timers.size, 0);
  assert.equal(h.listenerCount(), 0);
  assert.ok(h.observers.every(o => o.disconnected));
  control.unmount();
});

test("initially hidden mount does no drawing and active unmount cancels the loop", () => {
  const h = heroRuntime({ hidden: true }); h.mount();
  assert.equal(h.frames.length, 0);
  assert.equal(h.rafs.size, 0);
  h.document.hidden = false; h.document.emit("visibilitychange");
  h.advance(0, 1000);
  assert.ok(h.frames.length > 0);
  h.unmount();
  const count = h.frames.length;
  h.advance(1000, 1000);
  assert.equal(h.frames.length, count);
  assert.equal(h.listenerCount(), 0);
});
