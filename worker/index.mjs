import { legacyPath } from '../lib/airports.mjs';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/' && (url.searchParams.has('airport') || url.searchParams.has('mode'))) {
      return Response.redirect(new URL(legacyPath(url.search), url.origin), 308);
    }
    return env.ASSETS.fetch(request);
  },
};
