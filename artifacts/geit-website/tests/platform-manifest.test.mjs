import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { platformModules, serviceModuleMap } from "../src/config/platform-modules.ts";

test("the platform route contract preserves existing sections and planned Recommendations", () => {
  assert.deepEqual(platformModules.map(module => module.title), [
    "Overview", "Energy Management", "Energy Consulting", "Renewable Energy Advisory",
    "Energy Efficiency & Auditing", "Battery Storage & Flexibility",
    "AI & Digital Energy Solutions", "Carbon Footprint", "Projects and Reports",
    "Recommendations", "Organisation Settings",
  ]);
  assert.equal(new Set(platformModules.map(module => module.id)).size, 11);
  assert.equal(new Set(platformModules.map(module => module.path)).size, 11);
});

test("available and planned routes preserve corporate routes without claiming production readiness", () => {
  for (const module of platformModules) {
    assert.match(module.path, /^\/app(?:\/[a-z-]+)?$/);
    assert.equal(module.readiness, module.id === "recommendations" ? "planned" : "available");
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
