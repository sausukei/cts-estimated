import { SITE_URL } from '../lib/airports.mjs';
export const dynamic = 'force-static';
export default function robots() { return { rules: { userAgent: '*', allow: '/' }, sitemap: SITE_URL + '/sitemap.xml' }; }
