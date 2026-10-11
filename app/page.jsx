import Link from 'next/link';
import { AIRPORTS, MODES, arrivalPath } from '../lib/airports.mjs';
import Footer from '../components/footer';
export const metadata = { alternates: { canonical: '/' }, openGraph: { title: '空港到着便情報 | 新千歳・羽田・小松', description: '国内線・国際線の到着予定、遅延情報、残り便数を確認。', url: '/', locale: 'ja_JP', type: 'website' } };
export default function Home() {
  return <div className="container"><header className="site-header"><p className="eyebrow">AIRPORT ARRIVALS</p><h1>到着便を、ひと目で。</h1><p className="home-intro">新千歳・羽田・小松空港の到着予定と遅延情報。<br />空港と路線を選んで、今日の到着便を確認しましょう。</p></header>
    <main><div className="airport-directory">{Object.entries(AIRPORTS).map(([key, info]) => <section className="flight-card" key={key}><p className="eyebrow">{info.code} / {info.english}</p><h2>{info.name}</h2><p className="home-intro">{info.area}</p><nav className="mode-switcher" aria-label={`${info.name}の路線`}>{Object.entries(MODES).map(([mode, label]) => <Link key={mode} className="mode-link" href={arrivalPath(key, mode)}>{label} →</Link>)}</nav></section>)}</div></main><Footer /></div>;
}
