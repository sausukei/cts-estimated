import { notFound } from 'next/navigation';
import { AIRPORTS, MODES, SITE_URL, routes, arrivalPath } from '../../../lib/airports.mjs';
import AirportHeader from '../../../components/airport-header';
import FlightBoard from '../../../components/flight-board';
import Footer from '../../../components/footer';
export const dynamicParams = false;
export function generateStaticParams() { return routes; }
export async function generateMetadata({ params }) {
  const { airport, mode } = await params;
  if (!Object.hasOwn(AIRPORTS, airport) || !Object.hasOwn(MODES, mode)) return {};
  const title = `${AIRPORTS[airport].name} ${MODES[mode]}の到着便・遅延情報`;
  const description = `${AIRPORTS[airport].name}（${AIRPORTS[airport].code}）の${MODES[mode]}到着便一覧。便名、到着予定時刻、到着見込み、運航状況と本日の残り便数を確認。5分ごとに情報を更新します。`;
  return { title, description, alternates: { canonical: arrivalPath(airport, mode) },
    openGraph: { title, description, url: arrivalPath(airport, mode), siteName: '空港到着便情報', locale: 'ja_JP', type: 'website' },
    twitter: { card: 'summary', title, description } };
}
export default async function Page({ params }) {
  const { airport, mode } = await params;
  if (!Object.hasOwn(AIRPORTS, airport) || !Object.hasOwn(MODES, mode)) notFound();
  const info = AIRPORTS[airport];
  const schema = { '@context': 'https://schema.org', '@type': 'WebPage',
    name: `${info.name} ${MODES[mode]}の到着便`, url: SITE_URL + arrivalPath(airport, mode), inLanguage: 'ja',
    about: { '@type': 'Airport', name: info.name, iataCode: info.code } };
  return <>
    <a className="skip-link" href="#arrivals">到着便一覧へ</a>
    <div className="container">
      <header className="site-header"><AirportHeader key={`${airport}-${mode}`} airport={airport} mode={mode} /></header>
      <FlightBoard key={`${airport}-${mode}`} airport={airport} mode={mode} />
      <section className="about-arrivals" aria-label="到着便情報について">
        <h2>{info.name}の{MODES[mode]}を確認する</h2>
        <p>{info.area}へのお迎えや到着状況の確認に。便名・到着予定・到着見込みと運航状況を一覧で確認できます。</p>
        <h3>遅延している便も表示されますか？</h3><p>予定時刻を過ぎても未到着の便は表示に残り、残り便数に含まれます。当日到着予定の便は、到着見込みが翌日になっても当日の一覧に含みます。</p>
        <h3>便数はどのように集計されますか？</h3><p>取得できた{MODES[mode]}の全ページを集計します。残り便数からは到着済み・欠航便を除きます。日本時間の予定到着日を基準に、重複を除いて集計します。情報には更新の遅れや取得元での欠落が生じる場合があります。最新の運航情報は航空会社でもご確認ください。</p>
      </section>
      <Footer />
    </div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
  </>;
}
