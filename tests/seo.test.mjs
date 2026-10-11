import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AIRPORTS, MODES, SITE_URL, routes, arrivalPath } from '../lib/airports.mjs';
for (const { airport, mode } of routes) test(`exported ${airport}/${mode} has indexable HTML and metadata`, () => {
  const html = readFileSync(`out/${airport}/${mode}/index.html`, 'utf8');
  assert.ok(html.includes(`${AIRPORTS[airport].name} ${MODES[mode]}の到着便・遅延情報`));
  assert.ok(html.includes(`<link rel="canonical" href="${SITE_URL}${arrivalPath(airport, mode)}"`));
  for (const text of ['property="og:title"', 'name="twitter:card"', 'application/ld+json', '<h1>', '予定時刻を過ぎても未到着の便']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('name="robots" content="noindex"'));
  for (const other of Object.keys(AIRPORTS)) assert.ok(html.includes(`href="${arrivalPath(other, mode)}"`));
});
test('sitemap, robots and 404 are exported', () => {
  const sitemap = readFileSync('out/sitemap.xml', 'utf8');
  for (const r of routes) assert.ok(sitemap.includes(SITE_URL + arrivalPath(r.airport, r.mode)));
  assert.ok(readFileSync('out/robots.txt', 'utf8').includes(`Sitemap: ${SITE_URL}/sitemap.xml`));
  assert.ok(readFileSync('out/404.html', 'utf8').includes('ページが見つかりません'));
});
