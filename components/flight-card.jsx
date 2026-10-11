import { delayInfo, statusClass, formatTime, arrivalTime } from '../lib/flights.mjs';
export default function FlightCard({ item, code, now, highlighted, cardRef }) {
  const flight = item.flight || {};
  const time = flight.time || {};
  const status = flight.status?.text || 'Scheduled';
  const delay = delayInfo(item);
  const origin = flight.airport?.origin || {};
  const near = now && Math.abs(arrivalTime(item) - now / 1000) <= 1800;
  return <article ref={cardRef} className={`flight-card ${delay.active ? 'flight-delayed' : ''} ${near ? 'near-current-time' : ''} ${highlighted ? 'highlight' : ''}`}>
    <div className="flight-header"><div><h3 className="flight-number">{flight.identification?.number?.default || 'N/A'}</h3><p className="airline-name">{flight.airline?.name || 'Unknown Airline'}</p></div><span className={`status-badge ${statusClass(status)}`}>{status}</span></div>
    <div className="flight-route"><span className="origin">{origin.code?.iata || 'N/A'}</span><span className="route-line" aria-label="から">⟶</span><span className="destination">{code}</span></div>
    <p className="origin-name">{origin.name || 'Unknown'} 発</p>
    {delay.active && <p className="delay-notice">遅延 · {delay.minutes ? `予定より${delay.minutes}分遅れの見込み` : '到着情報をご確認ください'}</p>}
    <div className="time-section">
      <div className="time-item"><div className="time-label">到着予定</div><div className="time-value time-scheduled">{formatTime(time.scheduled?.arrival)}</div></div>
      <div className="time-item"><div className="time-label">到着見込み</div><div className={`time-value time-estimated ${delay.active ? 'time-delayed' : ''}`}>{formatTime(time.estimated?.arrival)}</div></div>
      <div className="time-item"><div className="time-label">実際の到着</div><div className="time-value time-actual">{formatTime(time.real?.arrival)}</div></div>
    </div>
    <div className="aircraft-info"><span>機種 {flight.aircraft?.model?.text || 'N/A'}</span><span>登録 {flight.aircraft?.registration || 'N/A'}</span></div>
  </article>;
}
