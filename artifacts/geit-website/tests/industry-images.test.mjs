import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('every industry has its own optimized local picture', () => {
  const data = readFileSync(new URL('../src/data/industries.ts', import.meta.url), 'utf8');
  const ids = [...data.matchAll(/\{ id: '([^']+)'/g)].map((match) => match[1]);
  assert.equal(ids.length, 8);
  const images = ids.map((id) => {
    const bytes = readFileSync(new URL(`../public/images/industries/${id}.webp`, import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', id);
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', id);
    assert.ok(bytes.length > 1000 && bytes.length < 160000, `${id}: image size budget`);
    return bytes.toString('base64');
  });
  assert.equal(new Set(images).size, 8);
});

test('homepage previews and industry sections share responsive pictures and retain their links', () => {
  const view = readFileSync(new URL('../src/components/industries-section.tsx', import.meta.url), 'utf8');
  assert.equal((view.match(/<SectorArt sector=\{s\}\/>/g) ?? []).length, 2);
  assert.ok(!view.includes('<svg') && !view.includes('function Art('));
  assert.match(view, /import.meta.env.BASE_URL/);
  assert.match(view, /images\/industries\/\$\{sector.id\}\.webp/);
  assert.match(view, /alt=\{c\(sector.name\)\}/);
  assert.match(view, /width=\{768\}/);
  assert.match(view, /height=\{403\}/);
  assert.match(view, /loading="lazy"/);
  assert.match(view, /decoding="async"/);
  assert.match(view, /object-contain/);
  assert.ok(view.includes('href={`/industries#${s.id}`}'));
  assert.ok(view.includes('id={s.id}'));
  assert.ok(view.includes('href={v.href}') && view.includes('href="/contact"'));
});
