import Link from 'next/link';
export default function NotFound() { return <main className="container empty-state"><h1>ページが見つかりません</h1><p>空港一覧から到着便をお探しください。</p><Link className="button" href="/">空港を選ぶ</Link></main>; }
