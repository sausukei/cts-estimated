import Link from 'next/link';
import { AIRPORTS, MODES, arrivalPath } from '../lib/airports.mjs';
export default function AirportHeader({ airport, mode }) {
  const info = AIRPORTS[airport];
  return <>
    <div className="brand">
      <details className="airport-picker">
        <summary className="airport-mark" aria-label="空港を切り替える"><span>{info.code}</span><span className="picker-chevron" aria-hidden="true">⌄</span></summary>
        <nav className="airport-switcher" aria-label="空港を選択">
          {Object.entries(AIRPORTS).map(([key, value]) => <Link prefetch={false} className="airport-link" key={key} href={arrivalPath(key, mode)} aria-current={key === airport ? 'page' : undefined}>{value.name}<span>{value.code}</span></Link>)}
        </nav>
      </details>
      <span><span>{info.english}</span><small>{info.name}</small></span><span className="terminal-label">{MODES[mode]}</span>
    </div>
    <nav className="airport-tabs" aria-label="表示する空港">
      {Object.entries(AIRPORTS).map(([key, value]) => <Link prefetch={false} key={key} href={arrivalPath(key, mode)} aria-current={key === airport ? 'page' : undefined}>{value.name.replace('空港', '')}<small>{value.code}</small></Link>)}
    </nav>
    <div className="heading-row"><div><p className="eyebrow">{mode.toUpperCase()} ARRIVALS</p><h1>{info.name}<br />{MODES[mode]}の到着便</h1></div></div>
    <nav className="mode-switcher" aria-label="路線を選択">
      {Object.entries(MODES).map(([key, label]) => <Link prefetch={false} key={key} className="mode-link" href={arrivalPath(airport, key)} aria-current={key === mode ? 'page' : undefined}>{label}</Link>)}
    </nav>
  </>;
}
