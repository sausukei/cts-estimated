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
export function matchesFlight(item, mode, start, end) {
  const code = item.flight?.airport?.origin?.code?.iata;
  if (!code) return false;
  if (DOMESTIC_AIRPORTS.includes(code) !== (mode === 'domestic')) return false;
  return [item.flight?.time?.scheduled?.arrival, arrivalTime(item)]
    .some(time => time >= start && time <= end);
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
  ? new Date(timestamp * 1000).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';

// Keep the current API window: five pages of up to 100 arrivals.
export async function fetchFlights(code, mode, { now = new Date(), fetcher = fetch, signal } = {}) {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  const start = day.getTime() / 1000;
  day.setDate(day.getDate() + 1);
  const end = day.getTime() / 1000 - 1;
  const flights = [];
  for (let page = 1; page <= 5; page++) {
    const params = new URLSearchParams({ code, 'plugin[]': 'schedule',
      'plugin-setting[schedule][mode]': 'arrivals',
      'plugin-setting[schedule][timestamp]': String(start), limit: '100', page: String(page) });
    const response = await fetcher(`https://api.flightradar24.com/common/v1/airport.json?${params}`, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const arrivals = data.result?.response?.airport?.pluginData?.schedule?.arrivals?.data;
    if (!Array.isArray(arrivals)) throw new Error('Invalid arrivals response');
    flights.push(...arrivals.filter(item => matchesFlight(item, mode, start, end)));
  }
  return flights;
}
