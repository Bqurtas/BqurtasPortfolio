/* v2 — the light-default migration now runs inline in index.html before first
   paint (bq_light_v1). This file stays as a no-op so cached HTML that still
   references it keeps loading without a 404 or a forced theme. */
(function () {}());
