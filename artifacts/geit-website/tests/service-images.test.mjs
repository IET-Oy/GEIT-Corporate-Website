import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('all eleven services have distinct local WebP artwork', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const data = app.slice(app.indexOf('const services = ['), app.indexOf('const industries ='));
  const slugs = [...data.matchAll(/slug:'([^']+)'/g)].map((match) => match[1]);
  assert.equal(slugs.length, 11);
  assert.equal(new Set(slugs).size, 11);
  const images = slugs.map((slug) => {
    const image = readFileSync(new URL(`../public/images/services/${slug}.webp`, import.meta.url));
    assert.equal(image.subarray(0, 4).toString(), 'RIFF', slug);
    assert.equal(image.subarray(8, 12).toString(), 'WEBP', slug);
    assert.ok(image.length > 1000 && image.length < 160000, `${slug}: image size budget`);
    return image.toString('base64');
  });
  assert.equal(new Set(images).size, 11);
});

test('service cards and details share accessible, responsive, full-frame images instead of service icons', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const image = readFileSync(new URL('../src/components/service-image.tsx', import.meta.url), 'utf8');
  assert.equal((app.match(/<ServiceImage slug=\{service.slug\} title=\{service.title\}/g) ?? []).length, 2);
  assert.ok(!app.includes('const Icon=service.icon') && !app.includes('const Icon = service.icon'));
  assert.match(image, /import.meta.env.BASE_URL/);
  assert.match(image, /alt=\{c\(title\)\}/);
  assert.match(image, /loading="lazy"/);
  assert.match(image, /decoding="async"/);
  assert.match(image, /width=\{768\}/);
  assert.match(image, /height=\{480\}/);
  assert.match(image, /object-cover/);
  assert.doesNotMatch(image, /object-contain|bg-\[#e9eff1\]/);
  assert.ok(app.includes('services.slice(0,6).map') && app.includes('services.map'));
  assert.ok(app.includes('href={`/services/${service.slug}`}'));
});
