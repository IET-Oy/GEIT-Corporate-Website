import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { primaryNavigation, secondaryNavigation } from "../src/config/site-navigation.ts";

test("approved navigation has four primary and four secondary links in exact order", () => {
  assert.deepEqual(primaryNavigation.map((link) => link.href), ["/", "/about", "/services", "/insights"]);
  assert.deepEqual(secondaryNavigation.map((link) => link.href), ["/industries", "/digital-energy-solutions", "/energy-saas", "/contact"]);
  const all = [...primaryNavigation, ...secondaryNavigation];
  assert.equal(new Set(all.map((link) => link.href)).size, 8);
  assert.equal(secondaryNavigation[2].label, "Energy SaaS");
});

test("language selector keeps its header slot and platform entry opens the existing application", () => {
  const header = readFileSync(new URL("../src/components/site-header.tsx", import.meta.url), "utf8");
  assert.equal((header.match(/<LanguageSelector \/>/g) ?? []).length, 1);
  assert.match(header, /<\/nav>\s*<LanguageSelector \/>\s*<button/);
  const workspace = readFileSync(new URL("../src/platform/app-routes.tsx", import.meta.url), "utf8");
  assert.match(workspace, /<SiteHeader \/>\s*<AppNav \/>/);
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.ok(app.includes("if(location==='/energy-saas')return <Redirect to=\"/app\"/>"));
  assert.ok(app.includes("Make smarter energy decisions. Build a more efficient, resilient and low-carbon future."));
  assert.ok(app.includes("Integrated consulting, project development, digital energy and carbon services—grounded in data, rigorous analysis and sound economics."));
});
