export const DOMESTIC_AIRPORTS = [
  "HND",
  "NRT",
  "KIX",
  "FUK",
  "CTS",
  "ITM",
  "NGO",
  "KOJ",
  "OKA",
  "UKB",
  "KMQ",
  "SDJ",
  "TTJ",
  "KCZ",
  "TAK",
  "FSZ",
  "AOJ",
  "OKI",
  "NGS",
  "KUH",
  "IBR",
  "HNA",
  "NTQ",
  "MBE",
  "YGJ",
  "TNE",
  "WKJ",
  "AXT",
  "FUJ",
  "FKS",
  "IWJ",
  "KMJ",
  "OKE",
  "MMJ",
  "MYJ",
  "AKJ",
  "ISG",
  "KIJ",
  "TKS",
  "TKN",
  "SYO",
  "HIJ",
  "OBO",
  "IWK",
  "OKJ",
  "GAJ",
  "UBJ",
  "KUM",
  "NKM",
  "TSJ",
  "TOY",
  "KMI",
  "MMY",
  "MMB",
  "OIR",
  "ASJ",
  "AXJ",
  "ONJ",
  "OIT",
  "TRA",
  "IKI",
  "KKX",
  "SHM",
  "MMD",
  "KTD",
  "KKJ",
  "RIS",
  "HKD",
  "IZO",
  "HAC",
  "HSG",
  "TJH",
  "UEO",
  "SHB",
  "OKD",
  "OGN",
  "RNJ",
  "SHI",
  "MSJ",
  "AGJ",
  "FKJ",
  "RBJ",
  "HTR",
  "KJP",
  "HIW",
  "OIM",
  "SDS",
  "IEJ",
  "MYE",
  "OSA",
  "BPU",
  "QGU",
  "HHE",
  "IWO",
  "DNA",
  "KUJ",
  "MUS",
  "IHA",
  "IIN",
  "QUT",
];

export const arrivalTime = item => {
  const time = item.flight?.time || {};
  return time.real?.arrival || time.estimated?.arrival || time.scheduled?.arrival || 0;
};
export const JAPAN_TIME_ZONE = 'Asia/Tokyo';
export function japanDayRange(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: JAPAN_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = type => parts.find(part => part.type === type).value;
  const start = Date.parse(`${value('year')}-${value('month')}-${value('day')}T00:00:00+09:00`) / 1000;
  return { start, end: start + 86400 - 1 };
}
export function matchesFlight(item, mode, start, end, destination) {
  const flight = item.flight || {};
  const origin = flight.airport?.origin;
  const code = origin?.code?.iata;
  const arrivalCode = flight.airport?.destination?.code?.iata;
  if (destination && arrivalCode && arrivalCode !== destination) return false;
  if (!code) return false;
  const country = origin?.position?.country?.code;
  const domestic = country ? country.toUpperCase() === 'JP' : DOMESTIC_AIRPORTS.includes(code);
  if (domestic !== (mode === 'domestic')) return false;
  // Count by the scheduled arrival date, even if the flight is delayed overnight.
  const scheduled = flight.time?.scheduled?.arrival || arrivalTime(item);
  return scheduled >= start && scheduled <= end;
}
export function flightKey(item) {
  const flight = item.flight || {};
  const scheduled = flight.time?.scheduled?.arrival || arrivalTime(item);
  const id = flight.identification?.id;
  if (id) return `id:${id}:${scheduled}`;
  const number = flight.identification?.number?.default;
  if (!number) return null;
  return JSON.stringify([number, flight.airport?.origin?.code?.iata,
    flight.airport?.destination?.code?.iata, scheduled]);
}
export function isRemaining(item) {
  const flight = item.flight || {};
  return !flight.time?.real?.arrival &&
    !/\b(landed|arrived|cancelled|canceled)\b/i.test(flight.status?.text || '');
}
export function delayInfo(item) {
  const flight = item.flight || {};
  const { scheduled, estimated, real } = flight.time || {};
  const minutes = scheduled?.arrival && estimated?.arrival
    ? Math.max(0, Math.ceil((estimated.arrival - scheduled.arrival) / 60)) : 0;
  const status = flight.status?.text || '';
  return { minutes, active: !real?.arrival &&
    !/landed|arrived|cancelled|canceled|diverted/i.test(status) &&
    (minutes > 0 || /delayed/i.test(status)) };
}
export function statusClass(text = '') {
  if (/landed|arrived/i.test(text)) return 'status-landed';
  if (/cancelled|canceled/i.test(text)) return 'status-cancelled';
  if (/delayed|diverted/i.test(text)) return 'status-delayed';
  if (/en route|airborne/i.test(text)) return 'status-enroute';
  return 'status-scheduled';
}
export const formatTime = timestamp => timestamp
  ? new Date(timestamp * 1000).toLocaleTimeString('ja-JP', { timeZone: JAPAN_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false }) : '—';

// Follow pagination instead of silently counting only the first 500 records.
export async function fetchFlights(code, mode, { now = new Date(), fetcher = fetch, signal, direction = 'arrivals' } = {}) {
  const { start, end } = japanDayRange(now);
  const flights = new Map();
  const pageSignatures = new Set();
  let anonymous = 0;
  for (let page = 1; page <= 100; page++) {
    const params = new URLSearchParams({ code, 'plugin[]': 'schedule',
      'plugin-setting[schedule][mode]': direction,
      'plugin-setting[schedule][timestamp]': String(start), limit: '100', page: String(page) });
    const response = await fetcher(`https://api.flightradar24.com/common/v1/airport.json?${params}`, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const schedule = data.result?.response?.airport?.pluginData?.schedule?.[direction];
    const arrivals = schedule?.data;
    if (!Array.isArray(arrivals)) throw new Error('Invalid arrivals response');
    if (arrivals.length === 0) {
      if (Number(schedule.page?.total) > page) throw new Error('Incomplete arrivals response');
      return [...flights.values()];
    }
    const signature = JSON.stringify(arrivals.map(item => flightKey(item) || item));
    if (pageSignatures.has(signature)) throw new Error('Repeated arrivals page');
    pageSignatures.add(signature);
    for (const item of arrivals) {
      if (direction === 'departures') {
        const f = item.flight;
        const departure = f?.time?.scheduled?.departure;
        if (f?.airport?.origin?.code?.iata !== code || departure < start || departure > end || !departure) continue;
      } else if (!matchesFlight(item, mode, start, end, code)) continue;
      const key = flightKey(item) || `anonymous:${anonymous++}`;
      // Keep the first occurrence so overlapping pages cannot duplicate a flight.
      if (!flights.has(key)) flights.set(key, item);
    }
    const total = Number(schedule.page?.total);
    if (Number.isInteger(total) && total > 0 && page >= total) return [...flights.values()];
  }
  // An incomplete list must not be presented as a reliable daily total.
  throw new Error('Arrival pagination limit exceeded');
}
