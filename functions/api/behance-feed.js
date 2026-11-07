/* GET /api/behance-feed — projects published on Behance after the room's
   copy was made (see ./_behance-feed.js). Public and cached; a failure only
   means the room shows its copy, never an error page. X-Behance-Feed says
   how the last answer went ("ok", or why Behance's feed was not usable). */
import { loadBehanceCatalogue } from '../_behance-catalog.js';
import { feedProblem, freshBehanceProjects } from './_behance-feed.js';

const reply = (body, maxAge, state) => new Response(JSON.stringify(body), {
  status: 200,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': `public, max-age=${maxAge}`,
    'CDN-Cache-Control': `public, max-age=${maxAge}`,
    'X-Content-Type-Options': 'nosniff',
    'X-Behance-Feed': state,
  },
});

export async function onRequestGet({ request, env }) {
  let catalogue;
  try {
    catalogue = await loadBehanceCatalogue(env, new URL(request.url).origin);
  } catch (e) {
    // Without the copy every project would look new; show the copy alone.
    return reply({ projects: [] }, 60, 'copy unavailable');
  }
  try {
    const projects = await freshBehanceProjects(new Set(catalogue.byId.keys()));
    return reply({ projects }, 600, 'ok');
  } catch (e) {
    return reply({ projects: [] }, 120, feedProblem(e));
  }
}

export function onRequest({ request }) {
  return new Response(null, { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store' } });
}
