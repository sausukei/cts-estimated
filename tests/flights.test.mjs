import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchFlights, isRemaining, delayInfo, arrivalTime, japanDayRange, matchesFlight, formatTime } from '../lib/flights.mjs';
import { routes, legacyPath } from '../lib/airports.mjs';
import worker from '../worker/index.mjs';
const day = new Date('2026-01-03T00:00:00+09:00');
const start = day.getTime() / 1000;
const at = hour => start + hour * 3600;
const flight = (number, scheduled, estimated, real, origin = 'ICN', status = '') => ({ flight: { identification: { number: { default: number } }, airport: { origin: { code: { iata: origin } } }, status: { text: status }, time: { scheduled: { arrival: scheduled }, estimated: { arrival: estimated }, real: { arrival: real } } } });
function api(items, requests = []) {
  return async url => {
    const p = new URL(url).searchParams; requests.push(p);
    const data = p.get('page') === '1' ? items.filter(item => item.flight.time.scheduled.arrival >= Number(p.get('plugin-setting[schedule][timestamp]'))) : [];
    return { ok: true, json: async () => ({ result: { response: { airport: { pluginData: { schedule: { arrivals: { data } } } } } } }) };
  };
}
test('delayed arrivals survive refresh after scheduled and estimated times', async () => {
  const items = [flight('DELAYED', at(18), at(19)), flight('NO_ESTIMATE', at(18))];
  const requests = [];
  for (const hour of [17, 20]) assert.equal((await fetchFlights('CTS', 'international', { now: new Date(at(hour) * 1000), fetcher: api(items, requests) })).length, 2);
  assert.equal(requests.length, 4);
  assert.ok(requests.every(p => Number(p.get('plugin-setting[schedule][timestamp]')) === start));
});
test('overnight delays and landed flights remain; domestic and future flights are excluded', async () => {
  const items = [flight('OVERNIGHT', at(23), at(25)), flight('LANDED', at(10), at(11), at(11)), flight('DOMESTIC', at(18), null, null, 'HND'), flight('TOMORROW', at(26))];
  const result = await fetchFlights('CTS', 'international', { now: day, fetcher: api(items) });
  assert.deepEqual(result.map(item => item.flight.identification.number.default), ['OVERNIGHT', 'LANDED']);
  assert.equal(arrivalTime(result[1]), at(11));
});
test('remaining count excludes actual arrivals, landed status and cancellations across pages', () => {
  const items = Array.from({ length: 21 }, (_, i) => flight(String(i), at(18)));
  items[0].flight.time.real.arrival = at(19);
  for (const [i, text] of ['Landed 19:00', 'Arrived', 'Cancelled', 'Canceled'].entries()) items[i + 1].flight.status.text = text;
  assert.equal(items.filter(isRemaining).length, 16);
  items[5].flight.time.real.arrival = at(21);
  assert.equal(items.filter(isRemaining).length, 15);
});
for (const { airport, mode } of routes) test(`${airport}/${mode} fetches correct airport and mode`, async () => {
  const requests = [];
  const items = [flight('INT', at(18)), flight('DOM', at(18), at(19), null, 'ITM'), flight('UNKNOWN', at(18), null, null, '')];
  const result = await fetchFlights(airport.toUpperCase(), mode, { now: day, fetcher: api(items, requests) });
  assert.ok(requests.every(p => p.get('code') === airport.toUpperCase()));
  assert.deepEqual(result.map(item => item.flight.identification.number.default), [mode === 'domestic' ? 'DOM' : 'INT']);
});
test('empty, failed and malformed API responses stay distinct', async () => {
  assert.deepEqual(await fetchFlights('CTS', 'international', { now: day, fetcher: api([]) }), []);
  await assert.rejects(fetchFlights('CTS', 'international', { fetcher: async () => ({ ok: false, status: 503 }) }), /503/);
  await assert.rejects(fetchFlights('CTS', 'international', { fetcher: async () => ({ ok: true, json: async () => ({}) }) }), /Invalid/);
});
test('delay indicators apply only to active flights', () => {
  assert.deepEqual(delayInfo(flight('A', at(18), at(19))), { active: true, minutes: 60 });
  assert.equal(delayInfo(flight('A', at(18), at(19), at(19))).active, false);
  assert.equal(delayInfo(flight('A', at(18), at(19), null, 'ICN', 'Cancelled')).active, false);
  assert.equal(delayInfo(flight('A', at(18), null, null, 'ICN', 'Delayed')).active, true);
});
test('legacy URLs get same-origin permanent redirects preserving airport and mode', async () => {
  for (const { airport, mode } of routes) {
    const search = `?airport=${airport.toUpperCase()}&mode=${mode}`;
    assert.equal(legacyPath(search), `/${airport}/${mode}/`);
    const response = await worker.fetch(new Request(`https://example.com/${search}`), {});
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), `https://example.com/${airport}/${mode}/`);
  }
  assert.equal(legacyPath('?airport=__proto__&mode=bogus'), '/cts/international/');
  assert.equal(await (await worker.fetch(new Request('https://example.com/'), { ASSETS: { fetch: () => new Response('home') } })).text(), 'home');
});

function pagedApi(pages, metadata = true) {
  return async url => {
    const page = Number(new URL(url).searchParams.get('page'));
    return { ok: true, json: async () => ({ result: { response: { airport: { pluginData: { schedule: {
      arrivals: { data: pages[page - 1] || [], ...(metadata ? { page: { current: page, total: pages.length } } : {}) },
    } } } } } }) };
  };
}
test('reads beyond five pages and counts duplicate records once', async () => {
  const pages = Array.from({ length: 6 }, (_, index) => [flight(`FLIGHT${index}`, at(18))]);
  pages[5].push(pages[0][0]);
  const result = await fetchFlights('CTS', 'international', { now: day, fetcher: pagedApi(pages) });
  assert.equal(result.length, 6);
  assert.ok(result.some(item => item.flight.identification.number.default === 'FLIGHT5'));
});
test('deduplicates shared flight IDs but preserves separate operations of the same number', async () => {
  const first = flight('A', at(18)); first.flight.identification.id = 'same-operation';
  const alias = flight('B', at(18)); alias.flight.identification.id = 'same-operation';
  const later = flight('A', at(21));
  assert.equal((await fetchFlights('CTS', 'international', { now: day, fetcher: pagedApi([[first, alias, later]]) })).length, 2);
});
test('destination and scheduled date prevent another airport or yesterday’s late flight entering today’s count', () => {
  const wrongAirport = flight('A', at(18));
  wrongAirport.flight.airport.destination = { code: { iata: 'KMQ' } };
  assert.equal(matchesFlight(wrongAirport, 'international', start, at(24) - 1, 'HND'), false);
  assert.equal(matchesFlight(flight('YESTERDAY', at(-1), at(1)), 'international', start, at(24) - 1, 'CTS'), false);
  assert.equal(matchesFlight(flight('OVERNIGHT', at(23), at(25)), 'international', start, at(24) - 1, 'CTS'), true);
});
test('Japanese day and displayed time are independent of the viewer timezone', () => {
  assert.equal(japanDayRange(new Date('2026-01-02T15:00:00Z')).start, start);
  assert.equal(japanDayRange(new Date('2026-01-03T14:59:59Z')).end, at(24) - 1);
  assert.equal(formatTime(start), '00:00');
});
test('repeated pages and failures after page five never return a misleading partial total', async () => {
  const same = [flight('A', at(18))];
  await assert.rejects(fetchFlights('CTS', 'international', { now: day, fetcher: pagedApi([same, same]) }), /Repeated/);
  const fetcher = pagedApi(Array.from({ length: 6 }, (_, i) => [flight(`A${i}`, at(18))]));
  await assert.rejects(fetchFlights('CTS', 'international', { now: day, fetcher: url => {
    if (new URL(url).searchParams.get('page') === '6') throw new Error('network failed');
    return fetcher(url);
  } }), /network failed/);
});
test('sequential airport queries cannot reuse another airport’s total', async () => {
  for (const [code, count] of [['CTS', 3], ['HND', 7], ['KMQ', 1], ['CTS', 3]]) {
    const result = await fetchFlights(code, 'domestic', { now: day, fetcher: api(Array.from({ length: count }, (_, i) => flight(`${code}${i}`, at(18), null, null, 'ITM'))) });
    assert.equal(result.length, count);
  }
});

test('old production hostname redirects all paths and queries without redirecting the new domain', async () => {
  const worker = (await import('../worker/index.mjs')).default;
  for (const path of ['/', '/hnd/domestic/?utm_source=bookmark', '/?airport=KMQ&mode=domestic', '/_next/static/test.js', '/api/cts-gates']) {
    const response = await worker.fetch(new Request(`https://cts-estimated.ikenosousuke.workers.dev${path}`), {});
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('Location'), `https://flight.sausukei.com${path}`);
  }
  const response = await worker.fetch(new Request('https://flight.sausukei.com/cts/international/'), {
    ASSETS: { fetch: () => new Response('site') },
  });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'site');
});
