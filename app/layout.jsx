import './globals.css';
import Analytics from '../components/analytics';
import { SITE_URL } from '../lib/airports.mjs';
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: '空港到着便情報 | 新千歳・羽田・小松', template: '%s | 空港到着便情報' },
  description: '新千歳・羽田・小松空港の国内線・国際線到着便。到着予定、到着見込み、遅延状況、本日の残り便数を確認できます。',
  robots: { index: true, follow: true },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#f4f6f8' };
export default function Layout({ children }) {
  return <html lang="ja"><body>{children}<Analytics /></body></html>;
}
