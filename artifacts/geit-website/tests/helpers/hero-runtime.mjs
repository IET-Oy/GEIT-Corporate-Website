import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../../src/components/hero-light-field.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText.replaceAll("import.meta.env.DEV", "false");

/** Runs the real effect with deterministic DOM/clock doubles, not a duplicate renderer. */
export function heroRuntime({ width = 360, hidden = false, reduced = false } = {}) {
  const listeners = new Map(), rafs = new Map(), timers = new Map(), observers = [];
  let now = 0, nextId = 0, ref = 0, effect, cleanup, drawCost = 0;
  const frames = [];
  const eventTarget = () => ({
    addEventListener(type, fn) { listeners.set(this, [...(listeners.get(this) ?? []), { type, fn }]); },
    removeEventListener(type, fn) { listeners.set(this, (listeners.get(this) ?? []).filter(e => e.type !== type || e.fn !== fn)); },
    emit(type, event = {}) { for (const e of listeners.get(this) ?? []) if (e.type === type) e.fn(event); },
  });
  const gradient = { addColorStop() {} };
  const ctx = {
    setTransform() { frames.push({ at: now, particles: 0, points: [] }); },
    clearRect() {}, createRadialGradient: () => gradient, fillRect() {},
    drawImage(_sprite, x, y) {
      const frame = frames.at(-1);
      frame.particles++; now += drawCost / 900;
      if (frame.points.length < 10) frame.points.push([x, y]);
    },
  };
  const canvas = { width: 0, height: 0, style: {}, getContext: () => ctx };
  const el = { clientWidth: width, clientHeight: 800, getBoundingClientRect() {
    return { left: 0, top: 0, right: this.clientWidth, bottom: this.clientHeight, width: this.clientWidth, height: this.clientHeight };
  } };
  const fallback = { style: {} };
  const media = { ...eventTarget(), matches: reduced };
  const window = {
    ...eventTarget(), innerWidth: width, devicePixelRatio: 3, location: { search: "" }, matchMedia: () => media,
    setTimeout(fn) { const id = ++nextId; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const document = {
    ...eventTarget(), hidden,
    createElement: () => ({ getContext: () => ({ createRadialGradient: () => gradient, fillRect() {} }) }),
  };
  class Observer {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
    emit(value) { this.callback([value]); }
  }
  const exports = {};
  vm.runInNewContext(code, {
    exports, window, document, URLSearchParams,
    performance: { now: () => now },
    requestAnimationFrame(fn) { const id = ++nextId; rafs.set(id, fn); return id; },
    cancelAnimationFrame(id) { rafs.delete(id); },
    IntersectionObserver: Observer, ResizeObserver: Observer,
    require: name => name === "react" ? {
      useRef: () => ({ current: [el, canvas, fallback][ref++] }),
      useEffect: fn => { effect = fn; }, useId: () => "test",
    } : { jsx() {}, jsxs() {} },
  });
  return {
    exports, frames, canvas, el, window, document, media, rafs, timers, observers,
    mount() { exports.HeroLightField({}); cleanup = effect(); },
    unmount() { cleanup(); },
    setDrawCost(ms) { drawCost = ms; },
    tick(time) {
      now = time;
      const callbacks = [...rafs.values()]; rafs.clear();
      for (const fn of callbacks) fn(time);
    },
    advance(start, duration, hz = 60) {
      for (let t = start; t < start + duration; t += 1000 / hz) this.tick(t);
    },
    listenerCount() { return [...listeners.values()].reduce((sum, list) => sum + list.length, 0); },
  };
}
