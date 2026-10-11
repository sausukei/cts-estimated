import Link from 'next/link';
export default function Footer() {
  return <footer><Link href="/">空港到着便情報</Link><p>時刻は閲覧端末のタイムゾーンで表示されます。</p><a href="https://www.flightradar24.com/">Data by Flightradar24 ↗</a><a href="https://github.com/sausukei/cts-estimated">GitHub ↗</a></footer>;
}
