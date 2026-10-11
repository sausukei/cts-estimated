export const SITE_URL = 'https://cts-estimated.ikenosousuke.workers.dev';
export const AIRPORTS = {
  cts: { code: 'CTS', name: '新千歳空港', english: 'NEW CHITOSE AIRPORT', area: '北海道・札幌方面' },
  hnd: { code: 'HND', name: '羽田空港', english: 'HANEDA AIRPORT', area: '東京方面' },
  kmq: { code: 'KMQ', name: '小松空港', english: 'KOMATSU AIRPORT', area: '石川・北陸方面' },
};
export const MODES = { international: '国際線', domestic: '国内線' };
export const arrivalPath = (airport, mode) => `/${airport}/${mode}/`;
export const routes = Object.keys(AIRPORTS).flatMap(airport =>
  Object.keys(MODES).map(mode => ({ airport, mode })));
export function legacyPath(search) {
  const params = new URLSearchParams(search);
  const code = params.get('airport')?.toLowerCase();
  return arrivalPath(Object.hasOwn(AIRPORTS, code) ? code : 'cts',
    params.get('mode') === 'domestic' ? 'domestic' : 'international');
}
