/* =====================================================================
   Selected Work — brand-identity case studies (room #work).
   Reads the Supabase `projects` table (public read), renders an editorial
   index, and opens each project as an immersive, bilingual case study.
   Mirrors the blog's data flow + the site language.
   ===================================================================== */
(function () {
  const room = document.getElementById('work');
  if (!room) return;
  const indexEl = document.getElementById('workIndex');
  const viewEl  = document.getElementById('workView');
  if (!indexEl || !viewEl) return;

  const SB = () => window.BQ_SUPA || { url:'https://dcnkhzrishphpismmxuu.supabase.co', key:'sb_publishable_FrR6Ur2yy-rOCgKk5D326w_j5rfBgV3' };
  const lang = () => document.documentElement.getAttribute('lang') || document.documentElement.dataset.lang || 'en';
  const dT = (k, fb) => (window.BQ_DICT && window.BQ_DICT[k]) || fb;
  const esc = (s) => String(s == null ? '' : s).replace(/[<>&"]/g, (c) => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;' }[c]));
  const has = (v) => v && String(v).trim();
  let PROJECTS = [];
  let current = null;

  const L = (p) => {
    const t = (p.i18n && p.i18n[lang()]) || {};
    return {
      title:   has(t.title)   ? t.title   : p.title,
      client:  has(t.client)  ? t.client  : p.client,
      role:    has(t.role)    ? t.role    : p.role,
      tag:     has(t.tag)     ? t.tag     : p.tag,
      summary: has(t.summary) ? t.summary : p.summary,
      body:    has(t.body)    ? t.body    : p.body,
      year: p.year, accent: p.accent || '#bd4a2c', cover: p.cover,
      palette: Array.isArray(p.palette) ? p.palette : [],
      gallery: Array.isArray(p.gallery) ? p.gallery : []
    };
  };

  function renderIndex() {
    if (!PROJECTS.length) {
      indexEl.innerHTML = '<p class="work-empty mono">' + esc(dT('work.empty', 'Case studies are on their way.')) + '</p>';
      return;
    }
    indexEl.innerHTML = PROJECTS.map((p) => {
      const q = L(p);
      const cover = q.cover
        ? '<img class="work-card-img" src="' + esc(q.cover) + '" alt="" loading="lazy">'
        : '<span class="work-card-mark">' + esc((String(q.title || '').trim()[0]) || '·') + '</span>';
      return '<a class="work-card" href="' + esc(workBase() + '/' + (p.slug || p.id)) + '" data-id="' + esc(p.id) + '" data-css="--accent:' + esc(q.accent) + '">'
        + '<span class="work-card-cover">' + cover + '</span>'
        + '<span class="work-card-meta">'
        +   '<span class="mono work-card-tag">' + esc(q.tag || '') + '</span>'
        +   '<span class="work-card-title">' + esc(q.title) + '</span>'
        +   '<span class="mono work-card-sub">' + esc([q.client, p.year].filter(Boolean).join(' · ')) + '</span>'
        + '</span></a>';
    }).join('');
    indexEl.querySelectorAll('.work-card').forEach((c) => c.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      openCase(PROJECTS.find((x) => String(x.id) === c.getAttribute('data-id')));
    }));
  }

  const workBase = () => { const l = lang(); return (l && l !== 'en' ? '/' + l : '') + '/work'; };

  function paras(body) {
    return String(body || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  }

  function openCase(p) {
    if (!p) return;
    current = p;
    const q = L(p);
    const next = PROJECTS[(PROJECTS.indexOf(p) + 1) % PROJECTS.length];
    const nq = next ? L(next) : null;
    const swatches = q.palette.map((s) =>
      '<div class="wc-sw"><b data-css="background:' + esc(s.hex) + '"></b><span class="mono">' + esc(s.name || '') + ' · ' + esc(String(s.hex || '').toUpperCase()) + '</span></div>').join('');
    const apps = (q.gallery.length ? q.gallery : [null, null, null]).slice(0, 6).map((g, i) => {
      if (g && g.url) return '<figure class="wc-shot"><img src="' + esc(g.url) + '" alt="" loading="lazy">' + (g.caption ? '<figcaption class="mono">' + esc(g.caption) + '</figcaption>' : '') + '</figure>';
      const variants = ['wc-shot--ink', 'wc-shot--accent', 'wc-shot--paper'];
      const letter = (String(q.title || '').trim()[0]) || '·';
      return '<figure class="wc-shot wc-shot--mock ' + variants[i % 3] + '"><span>' + esc(i % 3 === 2 ? letter : (q.client || q.title || '')) + '</span></figure>';
    }).join('');

    viewEl.innerHTML =
      '<button class="wc-back mono" id="wcBack"><i class="fa-solid fa-arrow-left-long"></i> ' + esc(dT('work.back', 'All work')) + '</button>'
      + '<header class="wc-hero" data-css="--accent:' + esc(q.accent) + '">'
      +   (q.cover ? '<img class="wc-hero-img" src="' + esc(q.cover) + '" alt="">' : '')
      +   '<div class="wc-hero-inner">'
      +     '<span class="mono wc-hero-tag">' + esc(q.tag || '') + ' · ' + esc(p.year || '') + '</span>'
      +     '<h2 class="wc-hero-title">' + esc(q.title) + '</h2>'
      +     '<span class="mono wc-hero-meta">' + esc([q.client ? (dT('work.client', 'Client') + ': ' + q.client) : '', q.role].filter(Boolean).join('  ·  ')) + '</span>'
      +   '</div>'
      + '</header>'
      + (has(q.summary) ? '<section class="wc-brief"><span class="mono wc-rh">01 — ' + esc(dT('work.brief', 'The brief')) + '</span><p>' + esc(q.summary) + '</p></section>' : '')
      + (q.palette.length ? '<section class="wc-block"><span class="mono wc-rh">02 — ' + esc(dT('work.palette', 'Palette')) + '</span><div class="wc-swatches">' + swatches + '</div></section>' : '')
      + (has(q.body) ? '<section class="wc-block wc-story"><span class="mono wc-rh">03 — ' + esc(dT('work.story', 'The work')) + '</span><div class="wc-body">' + paras(q.body).map((t) => '<p>' + esc(t) + '</p>').join('') + '</div></section>' : '')
      + '<section class="wc-block"><span class="mono wc-rh">04 — ' + esc(dT('work.inuse', 'In use')) + '</span><div class="wc-shots">' + apps + '</div></section>'
      + (nq ? '<a class="wc-next" href="' + esc(workBase() + '/' + (next.slug || next.id)) + '" data-id="' + esc(next.id) + '" data-css="--accent:' + esc(nq.accent) + '"><span class="mono">' + esc(dT('work.next', 'Next project')) + '</span><span class="wc-next-title">' + esc(nq.title) + ' <i class="fa-solid fa-arrow-right"></i></span></a>' : '');

    indexEl.hidden = true;
    viewEl.hidden = false;
    $('#wcBack', viewEl).addEventListener('click', closeCase);
    const nx = viewEl.querySelector('.wc-next');
    if (nx) nx.addEventListener('click', (e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; e.preventDefault(); openCase(PROJECTS.find((x) => String(x.id) === nx.getAttribute('data-id'))); });
    const head = room.querySelector('.section-head');
    if (head) head.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeCase() {
    current = null;
    viewEl.hidden = true;
    indexEl.hidden = false;
    const head = room.querySelector('.section-head');
    if (head) head.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);

  // a /work/<slug> URL deep-links straight into that case study
  const slugFromUrl = () => {
    const m = location.pathname.replace(/^\/+|\/+$/g, '').split('/');
    const i = m.indexOf('work');
    return (i >= 0 && m[i + 1]) ? decodeURIComponent(m[i + 1]) : '';
  };

  function load() {
    const sb = SB();
    fetch(sb.url + '/rest/v1/projects?select=*&published=eq.true&order=pos.asc,created_at.desc', { headers: { apikey: sb.key }, cache: 'no-store' })
      .then((r) => r.json())
      .then((rows) => {
        PROJECTS = Array.isArray(rows) ? rows : [];
        if (current) { openCase(PROJECTS.find((x) => x.id === current.id) || null); return; }
        const slug = slugFromUrl();
        const deep = slug && PROJECTS.find((x) => String(x.slug || x.id) === slug);
        if (deep) openCase(deep); else renderIndex();
      })
      .catch(() => { renderIndex(); });
  }
  load();
  window.__bqReloadWork = load;

  new MutationObserver(() => { if (current) openCase(current); else renderIndex(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-lang'] });
})();
