import { arrivalTime, fetchFlights } from './flights.mjs';

const registration = item => (item.flight?.aircraft?.registration || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const number = value => (value || '').toUpperCase().replace(/\s/g, '').replace(/^([A-Z0-9]{2})0+(\d)/, '$1$2');
const departureTime = item => item.flight?.time?.real?.departure || item.flight?.time?.estimated?.departure || item.flight?.time?.scheduled?.departure || 0;
const cancelled = item => /cancelled|canceled|diverted/i.test(item.flight?.status?.text || '');

export function matchTurnarounds(arrivals, departures, official) {
  return arrivals.map(item => {
    const reg = registration(item), at = arrivalTime(item);
    if (reg.length < 5 || ['UNKNOWN', 'UNAVAILABLE'].includes(reg) || !at || cancelled(item)) return item;
    const candidates = departures.filter(d => registration(d) === reg &&
      d.flight?.airport?.origin?.code?.iata === 'CTS' && !cancelled(d) &&
      departureTime(d) > at && departureTime(d) - at <= 12 * 3600)
      .sort((a, b) => departureTime(a) - departureTime(b));
    const next = candidates[0];
    if (!next || (candidates[1] && departureTime(next) === departureTime(candidates[1]))) return item;
    // A later arrival of this aircraft would own this departure instead.
    if (arrivals.some(a => a !== item && registration(a) === reg && arrivalTime(a) > at && arrivalTime(a) < departureTime(next))) return item;
    const f = next.flight;
    const scheduled = f.time?.scheduled?.departure;
    const matches = official.items.filter(row => row.DA === 'D' && row.GateNo &&
      Date.parse(`${row.SYMD}T${row.ST}:00+09:00`) / 1000 === scheduled &&
      row.Airline?.some(a => number(a.Flight) === number(f.identification?.number?.default) &&
        (a.TransitCode || a.AreaCode) === f.airport?.destination?.code?.iata));
    if (matches.length !== 1) return item;
    return { ...item, turnaround: { gate: matches[0].GateNo,
      flight: f.identification.number.default, updated: official.updated } };
  });
}

export async function enrichTurnarounds(arrivals, { signal, fetcher = fetch } = {}) {
  const [departures, response] = await Promise.all([
    fetchFlights('CTS', null, { direction: 'departures', signal, fetcher }),
    fetcher('/api/cts-gates', { signal }),
  ]);
  if (!response.ok) throw new Error('Official gates unavailable');
  const official = await response.json();
  if (!Array.isArray(official.items)) throw new Error('Invalid gates');
  return matchTurnarounds(arrivals, departures, official);
}
