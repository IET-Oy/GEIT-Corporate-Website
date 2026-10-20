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

test("homepage hero combines the supplied photo with the light-field animation", () => {
  const sections = readFileSync(new URL("../src/components/home-sections.tsx", import.meta.url), "utf8");
  assert.ok(!sections.includes("HomepageImage"));
  const hero = sections.slice(sections.indexOf("export function HeroOrb()"), sections.indexOf("const does ="));
  assert.ok(hero.includes("images/homepage-background.webp"));
  assert.ok(hero.includes("<HeroLightField/>"));
  assert.ok(hero.indexOf("<img") < hero.indexOf("<HeroLightField/>"));
  assert.ok(!hero.includes("bg-[#0a1424]"));
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.ok(!app.includes("HomepageImage"));
  assert.ok(!app.includes("rgba(16,36,58,.95)"));
  assert.ok(!app.includes('bg-[#10243a]/90'));
  assert.ok(app.includes("<WhatGeitDoes/>"));
  const image = readFileSync(new URL("../public/images/homepage-background.webp", import.meta.url));
  assert.equal(image.subarray(0, 4).toString(), "RIFF");
  assert.equal(image.subarray(8, 12).toString(), "WEBP");
});

test("hero aligns positioning labels at the top, anchors the headline below and moves actions and summary outside", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const hero = app.slice(app.indexOf('<section className=', app.indexOf("function HomePage()")), app.indexOf("</section>", app.indexOf("function HomePage()")));
  const top = hero.indexOf('data-testid="hero-top-content"');
  const bottom = hero.indexOf('data-testid="hero-bottom-content"');
  assert.ok(top > 0 && bottom > top);
  assert.ok(hero.indexOf("<HeroHeadline/>") > bottom);
  assert.ok(hero.indexOf("GLOBAL ENERGY &amp; TECHNOLOGY") < bottom);
  assert.ok(hero.indexOf('data-testid="hero-outlook"') < bottom);
  assert.ok(hero.indexOf("GLOBAL OUTLOOK") > top && hero.indexOf("GLOBAL OUTLOOK") < bottom);
  assert.match(hero, /grid-cols-2 items-start.*sm:justify-between/);
  assert.ok(!hero.includes('data-testid="hero-actions"'));
  assert.ok(!hero.includes('data-testid="hero-summary-box"'));
  const introduction = app.slice(app.indexOf('data-testid="home-introduction"'), app.indexOf("</section>", app.indexOf('data-testid="home-introduction"')));
  assert.ok(introduction.includes('href="/contact"') && introduction.includes('href="/services"'));
  assert.ok(introduction.includes('data-testid="hero-summary-box"'));
  assert.match(hero, /self-center text-center[^"]*" data-testid="hero-bottom-content"/);
  assert.ok(introduction.indexOf('href="/services"') > introduction.indexOf('data-testid="hero-summary-box"'));
  assert.match(introduction, /justify-self-end">\s*<ButtonLink href="\/services"/);
  assert.ok(app.includes("lg:grid-cols-[auto_minmax(0,1fr)_auto]"));
  assert.match(hero, /flex-col justify-between/);
  assert.ok(!hero.includes("hero-veil") && !hero.includes("bg-white"));
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
  assert.ok(!css.includes(".hero-veil"));
  assert.match(css, /background:rgba\(0,0,0,\.38\).*backdrop-filter:blur\(8px\)/);
});
