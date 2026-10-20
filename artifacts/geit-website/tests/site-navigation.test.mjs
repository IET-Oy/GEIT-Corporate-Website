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
  assert.ok(readFileSync(new URL("../src/components/hero-headline.tsx", import.meta.url), "utf8").includes('c("Make smarter energy decisions.")') && app.includes("<HeroHeadline/>") && !app.includes("Build a more efficient, resilient and low-carbon future."));
  assert.ok(app.includes("Integrated consulting, project development, digital energy and carbon services—grounded in data, rigorous analysis and sound economics."));
});

test("upper-bar links remain visible in compact desktop previews with a phone-only menu", () => {
  const header = readFileSync(new URL("../src/components/site-header.tsx", import.meta.url), "utf8");
  assert.match(header, /<nav ref=\{primaryNav\} className="[^"]*\bmd:flex\b/);
  assert.match(header, /<button type="button" className="[^"]*\bmd:hidden\b/);
  assert.match(header, /<nav id="mobile-navigation" className="[^"]*\bmd:hidden\b/);
});

test("homepage preserves the animated hero and displays the supplied photo as separate content", () => {
  const sections = readFileSync(new URL("../src/components/home-sections.tsx", import.meta.url), "utf8");
  const hero = sections.slice(sections.indexOf("export function HeroOrb()"), sections.indexOf("export function HomepageImage()"));
  assert.ok(hero.includes("<HeroLightField/>"));
  assert.ok(!hero.includes("<img"));
  const photo = sections.slice(sections.indexOf("export function HomepageImage()"), sections.indexOf("const does ="));
  assert.ok(photo.includes("images/homepage-background.webp"));
  assert.ok(photo.includes("<figure"));
  assert.ok(photo.includes('alt="Solar energy infrastructure'));
  assert.ok(photo.includes("h-auto w-full"));
  assert.ok(!photo.includes('aria-hidden="true"'));
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /<HomepageImage\/>\s*<WhatGeitDoes\/>/);
  const image = readFileSync(new URL("../public/images/homepage-background.webp", import.meta.url));
  assert.equal(image.subarray(0, 4).toString(), "RIFF");
  assert.equal(image.subarray(8, 12).toString(), "WEBP");
});
