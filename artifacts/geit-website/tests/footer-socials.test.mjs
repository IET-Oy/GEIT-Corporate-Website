import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { companyContact } from '../src/config/company-contact.ts';

test('footer config contains exactly the three approved official social URLs', () => {
  const profiles = companyContact.socialProfiles;
  assert.equal(profiles.facebook, 'https://www.facebook.com/profile.php?id=61595860880036');
  assert.equal(profiles.linkedin, 'https://www.linkedin.com/company/geit-ltd/');
  assert.equal(profiles.x, 'https://x.com/GeitLtd1');
  assert.equal(profiles.instagram, null);
  assert.equal(profiles.youtube, null);
  assert.equal(Object.values(profiles).filter(Boolean).length, 3);
  for (const url of Object.values(profiles).filter(Boolean)) {
    const parsed = new URL(url);
    assert.equal(parsed.protocol, 'https:');
    assert.equal(parsed.username, '');
    assert.equal(parsed.password, '');
  }
});

test('shared public footer renders safe, labelled links with responsive targets and recognisable icons', () => {
  const footer = readFileSync(new URL('../src/components/site-footer.tsx', import.meta.url), 'utf8');
  assert.match(footer, /companyContact.socialProfiles\[key\]/);
  assert.match(footer, /target="_blank"/);
  assert.match(footer, /rel="noopener noreferrer"/);
  assert.match(footer, /aria-label=\{c\("GEIT on \{name\}", \{ name \}\)\}/);
  assert.match(footer, /aria-labelledby="footer-follow-heading"/);
  assert.match(footer, /t\("footerFollow"\)/);
  assert.match(footer, /<Icon size=\{16\} aria-hidden="true"/);
  assert.match(footer, /name: "Facebook", Icon: Facebook/);
  assert.match(footer, /name: "LinkedIn", Icon: Linkedin/);
  assert.match(footer, /name: "X", Icon: XBrand/);
  assert.match(footer, /function XBrand/);
  assert.match(footer, /flex flex-wrap gap-3/);
  assert.match(footer, /h-11 w-11/);
  assert.match(footer, /hover:bg-white\/10/);
  assert.match(footer, /focus-visible:outline-offset-4/);
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /function Shell[\s\S]*?<main>\{children\}<\/main><SiteFooter\/>/);
  assert.match(app, /<Shell><Switch>/);
});
