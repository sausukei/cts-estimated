import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchTurnarounds } from '../lib/turnaround.mjs';
const at = Date.parse('2026-10-12T12:00:00+09:00') / 1000;
const arrival = { flight: { aircraft: { registration: 'JA-123A' }, time: { scheduled: { arrival: at } } } };
const departure = { flight: { aircraft: { registration: 'JA123A' }, identification: { number: { default: 'JL0500' } }, airport: { origin: { code: { iata: 'CTS' } }, destination: { code: { iata: 'HND' } } }, time: { scheduled: { departure: at + 3600 } } } };
const row = { DA: 'D', SYMD: '2026-10-12', ST: '13:00', GateNo: '65', Airline: [{ Flight: 'JL500', AreaCode: 'HND' }] };
const official = { updated: '2026-10-12T12:00:00+0900', items: [row] };
test('same aircraft and exact official departure match gives gate', () => {
 assert.equal(matchTurnarounds([arrival], [departure], official)[0].turnaround.gate, '65');
});
test('missing registration, ambiguous matches, wrong date and empty gate stay hidden', () => {
 for (const rows of [[{ ...row, SYMD: '2026-10-11' }], [{ ...row, GateNo: null }], [row, row]]) {
  assert.equal(matchTurnarounds([arrival], [departure], { ...official, items: rows })[0].turnaround, undefined);
 }
 assert.equal(matchTurnarounds([{ flight: {} }], [departure], official)[0].turnaround, undefined);
});
test('later arrival of same aircraft owns the departure', () => {
 const later = { flight: { ...arrival.flight, time: { scheduled: { arrival: at + 1800 } } } };
 const result = matchTurnarounds([arrival, later], [departure], official);
 assert.equal(result[0].turnaround, undefined);
 assert.equal(result[1].turnaround.gate, '65');
});
test('do not skip the next departure just because its official gate is missing', () => {
 const earlier = structuredClone(departure);
 earlier.flight.time.scheduled.departure = at + 600;
 assert.equal(matchTurnarounds([arrival], [earlier, departure], official)[0].turnaround, undefined);
});
test('departure requests use departure schedule and retain domestic connections', async () => {
 const { fetchFlights } = await import('../lib/flights.mjs');
 const result = await fetchFlights('CTS', null, { now: new Date('2026-10-12T12:00:00+09:00'), direction: 'departures', fetcher: async url => {
  assert.equal(new URL(url).searchParams.get('plugin-setting[schedule][mode]'), 'departures');
  return Response.json({ result: { response: { airport: { pluginData: { schedule: { departures: { data: [departure], page: { total: 1 } } } } } } } });
 } });
 assert.equal(result.length, 1);
});
test('official endpoint rejects stale data without caching the error', async () => {
 const worker = (await import('../worker/index.mjs')).default;
 const original = globalThis.fetch;
 globalThis.fetch = async () => Response.json({ status: 'success', items: [row], updated: '2020-01-01T00:00:00+0900' });
 try {
  const response = await worker.fetch(new Request('https://example.com/api/cts-gates'), {});
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
 } finally { globalThis.fetch = original; }
});
