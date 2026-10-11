const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(require.resolve('../script.js'), 'utf8');
const day = new Date(2026, 0, 3);
const start = day.getTime() / 1000;
const at = (hour) => start + hour * 3600;

function flight(number, scheduled, estimated, real, origin = 'ICN') {
  return { flight: {
    identification: { number: { default: number } },
    airport: { origin: { code: { iata: origin } } },
    time: {
      scheduled: { arrival: scheduled },
      estimated: { arrival: estimated },
      real: { arrival: real },
    },
  } };
}

function setup(flights) {
  let now = at(17);
  const elements = new Map();
  const requests = [];
  const context = vm.createContext({
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : [now * 1000])); }
      static now() { return now * 1000; }
    },
    console: { log() {}, error(error) { throw error; } },
    document: {
      addEventListener() {},
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, {
          style: {}, innerHTML: '', appendChild() {},
        });
        return elements.get(id);
      },
      createElement() { return { classList: { add() {} } }; },
    },
    async fetch(url) {
      const params = new URL(url).searchParams;
      requests.push(params);
      // Model a schedule API that pages forward from the requested timestamp.
      const data = params.get('page') === '1'
        ? flights.filter(item => item.flight.time.scheduled.arrival >=
          Number(params.get('plugin-setting[schedule][timestamp]')))
        : [];
      return { ok: true, async json() {
        return { result: { response: { airport: { pluginData: {
          schedule: { arrivals: { data } },
        } } } } };
      } };
    },
  });
  vm.runInContext(source, context);
  return {
    requests,
    elements,
    async load(hour) {
      now = at(hour);
      await vm.runInContext('loadFlightData()', context);
      return Array.from(vm.runInContext(
        'allFlights.map(item => item.flight.identification.number.default)', context,
      ));
    },
  };
}

test('refresh retains delayed arrivals after both scheduled and estimated times', async () => {
  const app = setup([
    flight('DELAYED', at(18), at(19)),
    flight('NO_ESTIMATE', at(18)),
  ]);
  assert.deepEqual((await app.load(17)).sort(), ['DELAYED', 'NO_ESTIMATE']);
  assert.deepEqual((await app.load(20)).sort(), ['DELAYED', 'NO_ESTIMATE']);
  assert.equal(app.requests.length, 10);
  for (const params of app.requests) {
    assert.equal(Number(params.get('plugin-setting[schedule][timestamp]')), start);
  }
});

test('summary counts all pages and retains overdue flights until arrival or cancellation', async () => {
  const flights = Array.from({ length: 21 }, (_, i) => flight(`FLIGHT${i}`, at(18)));
  flights[0].flight.time.real.arrival = at(19);
  flights[1].flight.status = { text: 'Landed 19:00' };
  flights[2].flight.status = { text: 'Arrived' };
  flights[3].flight.status = { text: 'Cancelled' };
  flights[4].flight.status = { text: 'Canceled' };
  flights[5].flight.status = { text: 'Delayed' };
  const app = setup(flights);
  await app.load(20);
  assert.equal(app.elements.get('totalFlights').textContent, '21');
  assert.equal(app.elements.get('remainingFlights').textContent, '16');
  flights[5].flight.time.real.arrival = at(21);
  await app.load(22);
  assert.equal(app.elements.get('remainingFlights').textContent, '15');
});

test('summary shows zero when no flights match', async () => {
  const app = setup([]);
  await app.load(20);
  assert.equal(app.elements.get('totalFlights').textContent, '0');
  assert.equal(app.elements.get('remainingFlights').textContent, '0');
});

test('keeps today’s overnight delays and landed flights while excluding domestic and future flights', async () => {
  const app = setup([
    flight('OVERNIGHT', at(23), at(25)),
    flight('LANDED', at(10), at(11), at(11)),
    flight('DOMESTIC', at(18), undefined, undefined, 'HND'),
    flight('TOMORROW', at(26)),
  ]);
  assert.deepEqual(await app.load(20), ['LANDED', 'OVERNIGHT']);
});
