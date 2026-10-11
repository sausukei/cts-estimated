import { SITE_URL, routes, arrivalPath } from '../lib/airports.mjs';
export const dynamic = 'force-static';
export default function sitemap() { return [{ url: SITE_URL + '/' }, ...routes.map(({ airport, mode }) => ({ url: SITE_URL + arrivalPath(airport, mode) }))]; }
