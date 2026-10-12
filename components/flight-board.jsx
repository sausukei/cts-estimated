'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AIRPORTS, MODES } from '../lib/airports.mjs';
import { fetchFlights, arrivalTime, isRemaining, JAPAN_TIME_ZONE } from '../lib/flights.mjs';
import FlightCard from './flight-card';
import { trackEvent } from '../lib/analytics.mjs';
import { enrichTurnarounds } from '../lib/turnaround.mjs';

export default function FlightBoard({ airport, mode }) {
  const [flights, setFlights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updated, setUpdated] = useState(null);
  const [date, setDate] = useState(null);
  const [page, setPage] = useState(1);
  const [descending, setDescending] = useState(false);
  const [target, setTarget] = useState(null);
  const abortRef = useRef(null);
  const highlightRef = useRef(null);
  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setError(false); setDate(new Date()); setTarget(null);
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const data = await fetchFlights(AIRPORTS[airport].code, mode, { signal: controller.signal });
      if (abortRef.current !== controller || controller.signal.aborted) return null;
      setFlights(data); setUpdated(Date.now());
      if (airport === 'cts') {
        const gateTimeout = setTimeout(() => controller.abort(), 30000);
        enrichTurnarounds(data, { signal: controller.signal }).then(enriched => {
          if (abortRef.current === controller && !controller.signal.aborted) setFlights(enriched);
        }).catch(() => {
          // Optional gate data must not prevent arrival information from displaying.
        }).finally(() => clearTimeout(gateTimeout));
      }
      trackEvent('flight_load_success', { airport, mode, flight_count: data.length, remaining_count: data.filter(isRemaining).length });
      setPage(value => Math.min(value, Math.max(1, Math.ceil(data.length / 20))));
      return data;
    } catch {
      if (abortRef.current === controller) {
        setError(true); setFlights(null);
        trackEvent('flight_load_error', { airport, mode, reason: controller.signal.aborted ? 'timeout' : 'fetch_failed' });
      }
      return null;
    } finally {
      clearTimeout(timeout);
      if (abortRef.current === controller) setLoading(false);
    }
  }, [airport, mode]);
  useEffect(() => {
    load();
    const timer = setInterval(load, 300000);
    return () => { clearInterval(timer); const active = abortRef.current; abortRef.current = null; active?.abort(); };
  }, [load]);
  const sorted = useMemo(() => [...(flights || [])].sort((a, b) =>
    (arrivalTime(a) - arrivalTime(b)) * (descending ? -1 : 1)), [flights, descending]);
  useEffect(() => {
    if (target === null) return;
    highlightRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    const timer = setTimeout(() => setTarget(null), 2000);
    return () => clearTimeout(timer);
  }, [target, page]);
  async function jump() {
    const data = await load();
    if (!data?.length) return;
    const ordered = [...data].sort((a, b) => (arrivalTime(a) - arrivalTime(b)) * (descending ? -1 : 1));
    const now = Date.now() / 1000;
    let index = 0;
    ordered.forEach((item, i) => { if (Math.abs(arrivalTime(item) - now) < Math.abs(arrivalTime(ordered[index]) - now)) index = i; });
    setPage(Math.floor(index / 20) + 1); setTarget(index);
  }
  function changePage(value) {
    setPage(value); setTarget(null);
    document.getElementById('arrivals')?.scrollIntoView({ block: 'start' });
  }
  const available = !loading && !error && flights !== null;
  const maxPage = Math.max(1, Math.ceil(sorted.length / 20));
  return <>
    <p className="current-date board-date">{date ? date.toLocaleDateString('ja-JP', { timeZone: JAPAN_TIME_ZONE, year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) : '本日の到着便'}</p>
    <div className="flight-summary" aria-live="polite">
      <div className="summary-total"><span>本日の総便数</span><strong><span>{available ? flights.length : '—'}</span><small>便</small></strong><span className="summary-caption">{AIRPORTS[airport].name} · {MODES[mode]}</span></div>
      <div className="summary-remaining"><span><i className="status-dot" aria-hidden="true" />本日の残り</span><strong><span>{available ? flights.filter(isRemaining).length : '—'}</span><small>便</small></strong><span className="summary-caption">到着待ち・遅延便を含む</span></div>
    </div>
    <p className="flight-summary-note">日本時間の本日到着予定便を集計。残り便数は到着済み・欠航便を除きます。</p>
    <main id="arrivals" tabIndex={-1}>
      <div className="list-heading"><h2>到着便一覧</h2><span className="auto-update">5分ごとに自動更新</span></div>
      <div className="controls">
        <button className="button button-primary" disabled={loading} onClick={jump}>現在時刻の便へ <span aria-hidden="true">↗</span></button>
        <button className="button" disabled={loading} onClick={() => { setDescending(value => !value); setPage(1); setTarget(null); }}>時間順 {descending ? '↓' : '↑'}</button>
        <button className="button refresh-btn" disabled={loading} onClick={() => { setPage(1); load(); }}><span aria-hidden="true">↻</span> 更新</button>
      </div>
      <p className="last-update" aria-live="polite">最終更新: {updated ? new Date(updated).toLocaleString('ja-JP', { timeZone: JAPAN_TIME_ZONE }) : '未取得'}</p>
      {loading && <div className="empty-state" role="status"><div className="spinner" aria-hidden="true" /><h3>到着便を確認しています</h3><p>最新のフライト情報を取得中です。</p></div>}
      {!loading && error && <div className="empty-state error" role="alert"><h3>データを取得できませんでした</h3><p>全便の取得を完了できませんでした。少し待ってから再度お試しください。</p><button className="button" onClick={load}>もう一度読み込む</button></div>}
      {available && <div className="flight-list">{sorted.slice((page - 1) * 20, page * 20).map((item, i) => {
        const index = (page - 1) * 20 + i;
        return <FlightCard key={index} item={item} code={AIRPORTS[airport].code} now={updated} highlighted={target === index} cardRef={target === index ? highlightRef : undefined} />;
      })}</div>}
      {available && !flights.length && <div className="empty-state" role="status"><h3>表示できる到着便はありません</h3><p>本日の{MODES[mode]}到着便が見つかりませんでした。</p></div>}
      <nav className="pagination" aria-label="到着便のページ切り替え"><button className="button" disabled={!available || page <= 1} onClick={() => changePage(page - 1)}>← 前へ</button><span className="page-info" aria-live="polite">{page} / {maxPage}</span><button className="button" disabled={!available || page >= maxPage} onClick={() => changePage(page + 1)}>次へ →</button></nav>
      <noscript><p className="empty-state">フライト情報の取得にはJavaScriptを有効にしてください。</p></noscript>
    </main>
  </>;
}
