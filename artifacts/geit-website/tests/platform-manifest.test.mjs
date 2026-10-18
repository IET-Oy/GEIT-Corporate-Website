import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { platformModules, serviceModuleMap } from "../src/config/platform-modules.ts";

test("the platform route contract preserves the ten requested sections in order", () => {
  assert.deepEqual(platformModules.map(module => module.title), [
    "Overview", "Energy Management", "Energy Consulting", "Renewable Energy Advisory",
    "Energy Efficiency & Auditing", "Battery Storage & Flexibility",
    "AI & Digital Energy Solutions", "Carbon Footprint", "Projects and Reports",
    "Organisation Settings",
  ]);
  assert.equal(new Set(platformModules.map(module => module.id)).size, 10);
  assert.equal(new Set(platformModules.map(module => module.path)).size, 10);
});

test("application routes (9 available, 1 planned) do not replace corporate routes or claim readiness", () => {
  for (const module of platformModules) {
    assert.match(module.path, /^\/app(?:\/[a-z-]+)?$/);
    assert.equal(module.readiness, ["overview", "energy-management", "energy-consulting", "renewable-energy", "energy-auditing", "battery-flexibility", "digital-energy", "carbon-footprint", "organisation-settings"].includes(module.id) ? "available" : "planned");
  }
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  for (const route of ["/", "/about", "/services", "/industries", "/digital-energy-solutions", "/insights", "/contact"]) {
    assert.ok(source.includes(`<Route path="${route}"`), `Preserve corporate route ${route}`);
  }
});

test("every existing service maps to a defined future workspace without changing its public URL", () => {
  const source = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const serviceSlugs = [...source.matchAll(/slug:'([^']+)'/g)].map(match => match[1]);
  assert.equal(serviceSlugs.length, 11);
  assert.deepEqual(Object.keys(serviceModuleMap).sort(), [...serviceSlugs].sort());
  const ids = new Set(platformModules.map(module => module.id));
  for (const id of Object.values(serviceModuleMap)) assert.ok(ids.has(id));
});
