import { legacyPath, SITE_URL } from '../lib/airports.mjs';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'cts-estimated.ikenosousuke.workers.dev') {
      const destination = new URL(SITE_URL);
      destination.pathname = url.pathname;
      destination.search = url.search;
      return Response.redirect(destination, 301);
    }
    if (url.pathname === '/api/cts-gates') {
      if (request.method !== 'GET') return new Response(null, { status: 405 });
      try {
        const data = await Promise.all(['domestic', 'international'].map(async mode => {
          const response = await fetch(`https://www.hokkaido-airports.com/api/v1/new-chitose/static/fis/${mode}/today.json`, {
            signal: AbortSignal.timeout(10000), cf: { cacheTtl: 120, cacheEverything: true },
          });
          if (!response.ok) throw new Error('Upstream unavailable');
          const json = await response.json();
          if (json.status !== 'success' || !Array.isArray(json.items) || !json.updated ||
              Math.abs(Date.now() - Date.parse(json.updated)) > 30 * 60000 || !Number.isFinite(Date.parse(json.updated))) throw new Error('Stale or invalid gates');
          return json;
        }));
        return Response.json({ items: data.flatMap(d => d.items.filter(r => r.DA === 'D')),
          updated: data.map(d => d.updated).sort()[0] }, { headers: { 'Cache-Control': 'public, max-age=120' } });
      } catch {
        return Response.json({ error: 'Gates unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
      }
    }
    if (url.pathname === '/' && (url.searchParams.has('airport') || url.searchParams.has('mode'))) {
      return Response.redirect(new URL(legacyPath(url.search), url.origin), 308);
    }
    return env.ASSETS.fetch(request);
  },
};
