/* =========================================================
   Barakat Qurtas — the Behance room
   The owner's Behance projects, copied to this site
   (assets/behance/projects.json and its images). The room lists them the way
   a Behance profile does; a project opens in a full-screen viewer, image
   after image, at /behance/<id>-<slug>. Loaded only for this room.
   ========================================================= */
(function behanceRoom() {
  'use strict';
  const room = document.getElementById('behance');
  const viewer = document.getElementById('bhViewer');
  const grid = document.getElementById('behanceGrid');
  if (!room || !viewer || !grid || window.__bqBehanceReady) return;
  window.__bqBehanceReady = true;

  const LANGS = ['ku', 'kmr', 'ar', 'fr', 'tr', 'sv'];
  const $ = (id) => document.getElementById(id);
  const ui = {
    scroll: $('bhvScroll'), images: $('bhvImages'), title: $('bhvTitle'), meta: $('bhvMeta'),
    ext: $('bhvExt'), close: $('bhvClose'), prev: $('bhvPrev'), next: $('bhvNext'),
    infoTitle: $('bhvInfoTitle'), date: $('bhvDate'), about: $('bhvAbout'),
    tools: $('bhvTools'), tags: $('bhvTags'), cta: $('bhvCta'), more: $('bhvMore'), count: $('bhvCount'),
    notice: $('bhvNotice'), noticeCta: $('bhvNoticeCta'),
  };

  /* ---------- language ---------- */
  const lang = () => {
    const l = document.documentElement.dataset.lang || '';
    if (l) return l;
    const first = location.pathname.split('/').filter(Boolean)[0];
    return LANGS.includes(first) ? first : 'en';
  };
  const t = (key, fallback) => (window.BQ_DICT && window.BQ_DICT[key]) || fallback;
  const fill = (text, values) => String(text).replace(/\{(\w+)\}/g, (_, k) => (k in values ? values[k] : ''));
  const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const digits = (n) => {
    const s = String(n);
    return ['ku', 'ar'].includes(lang()) ? s.replace(/\d/g, (d) => ARABIC_DIGITS[d]) : s;
  };
  const MONTHS = {
    ku: ['کانوونی دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران', 'تەممووز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانوونی یەکەم'],
    kmr: ['Çile', 'Sibat', 'Adar', 'Nîsan', 'Gulan', 'Hezîran', 'Tîrmeh', 'Tebax', 'Îlon', 'Cotmeh', 'Mijdar', 'Kanûn'],
  };
  const LOCALES = { en: 'en-GB', ar: 'ar-IQ', fr: 'fr-FR', tr: 'tr-TR', sv: 'sv-SE' };
  const longDate = (iso) => {
    const [y, m, d] = String(iso || '').split('-').map(Number);
    if (!y || !m || !d) return '';
    const l = lang();
    if (MONTHS[l]) return `${digits(d)} ${MONTHS[l][m - 1]} ${digits(y)}`;
    try {
      return new Intl.DateTimeFormat(LOCALES[l] || 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(Date.UTC(y, m - 1, d)));
    } catch (e) {
      return iso;
    }
  };
  const imagesLabel = (n) => {
    if (n === 1) return fill(t('bh.images.one', '{n} image'), { n: digits(n) });
    if (lang() === 'ar' && n > 2 && n < 11) return fill(t('bh.images.few', '{n} صور'), { n: digits(n) });
    return fill(t('bh.images', '{n} images'), { n: digits(n) });
  };

  /* ---------- data ---------- */
  let projects = [];
  let owner = null;
  let loading = null;
  const load = () => {
    if (loading) return loading;
    const src = room.dataset.behanceSrc || 'assets/behance/projects.json';
    loading = fetch(src, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        projects = Array.isArray(data && data.projects) ? data.projects : [];
        owner = data && typeof data.owner === 'object' ? data.owner : null;
        return projects;
      })
      .catch((error) => {
        loading = null;
        throw error;
      });
    return loading;
  };

  const prefix = () => (lang() !== 'en' ? '/' + lang() : '');
  const base = () => prefix() + '/behance';
  const projectPath = (p) => `${base()}/${p.id}-${p.slug}`;
  const idFromPath = (path) => {
    const m = String(path || '').match(/\/behance\/([1-9]\d{5,11})(?:-[^/?#]*)?\/?$/);
    return m ? m[1] : '';
  };
  const indexOfId = (id) => projects.findIndex((p) => p.id === id);
  const year = (p) => digits(String(p.date || '').slice(0, 4));
  /* A project whose pages are not copied here (just published, or listed by
     the feed-only sync) shows its cover and opens on Behance. */
  const coverOnly = (p) => Boolean(p.live) || !(p.images || []).length;

  /* New on Behance: the edge reads Behance's public RSS feed and returns the
     projects that are not copied here yet. They join the grid at once, newest
     first, with their cover; their pages open on Behance until the next copy. */
  const mergeFeed = (fresh) => {
    const known = new Set(projects.map((p) => p.id));
    const added = (Array.isArray(fresh) ? fresh : []).filter((p) => p && /^[1-9]\d{5,11}$/.test(p.id) && !known.has(p.id)
      && p.cover && typeof p.cover.src === 'string' && p.cover.src.startsWith('/api/behance-cover?'));
    if (!added.length) return false;
    added.forEach((p) => { p.live = true; p.images = []; p.about = []; p.tools = []; p.tags = []; });
    projects = [...added, ...projects].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    return true;
  };
  const loadFeed = () => fetch('/api/behance-feed', { credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const openId = isOpen() && projects[current] ? projects[current].id : '';
      if (!data || !mergeFeed(data.projects)) return;
      renderGrid();
      if (openId) {
        current = indexOfId(openId);
        renderProject(projects[current], current);
      }
    })
    .catch(() => {});

  /* ---------- the profile ---------- */
  /* Kurdish and Arabic group thousands with the Arabic separator. */
  const groupDigits = (n) => {
    const grouped = digits(Number(n).toLocaleString('en-US'));
    return ['ku', 'ar'].includes(lang()) ? grouped.replace(/,/g, '\u066C') : grouped;
  };
  const renderProfile = () => {
    if (!owner) return;
    const stats = owner.stats || {};
    room.querySelectorAll('#bhpStats [data-stat]').forEach((node) => {
      const value = stats[node.dataset.stat];
      if (Number.isFinite(value)) node.textContent = groupDigits(value);
    });
    const swap = (img, data) => {
      if (!img || !data || typeof data.src !== 'string' || img.getAttribute('src')?.split('?')[0] === data.src.replace(/^\//, '')) return;
      img.removeAttribute('srcset');
      img.src = data.src;
    };
    swap(room.querySelector('.bhp-banner img'), owner.banner);
    swap(room.querySelector('.bhp-avatar'), owner.avatar);
    const since = $('bhpSince');
    const y = String(owner.since || '').slice(0, 4);
    if (since) {
      since.hidden = !y;
      if (y) since.textContent = fill(t('bh.since', 'Member since {year}'), { year: digits(y) });
    }
  };

  /* ---------- the profile grid ---------- */
  const cover = (p, sizes) => {
    const img = document.createElement('img');
    img.src = p.cover.small || p.cover.src;
    if (p.cover.small) img.srcset = `${p.cover.small} 404w, ${p.cover.src} 808w`;
    img.sizes = sizes;
    img.width = p.cover.w || 808;
    img.height = p.cover.h || 632;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  };
  const card = (p, index, sizes, tag) => {
    const item = document.createElement(tag);
    item.className = 'bh-card';
    const link = document.createElement('a');
    link.className = 'bh-card-link';
    link.href = p.live ? p.url : projectPath(p);
    link.dataset.id = p.id;
    const frame = document.createElement('span');
    frame.className = 'bh-card-cover';
    frame.appendChild(cover(p, sizes));
    const text = document.createElement('span');
    text.className = 'bh-card-text';
    const title = document.createElement('strong');
    title.className = 'bh-card-title';
    title.lang = 'en';
    title.dir = 'auto';
    title.textContent = p.title;
    const meta = document.createElement('span');
    meta.className = 'bh-card-meta mono';
    meta.textContent = coverOnly(p) ? `${year(p)} · Behance` : `${year(p)} · ${imagesLabel((p.images || []).length)}`;
    if (p.live) {
      const mark = document.createElement('span');
      mark.className = 'bh-card-new';
      mark.textContent = t('bh.new', 'New');
      meta.appendChild(mark);
    }
    text.append(title, meta);
    link.append(frame, text);
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      open(indexOfId(p.id), { trigger: link });
    });
    item.appendChild(link);
    return item;
  };
  const renderGrid = () => {
    const sizes = '(max-width: 560px) 92vw, (max-width: 1100px) 46vw, 30vw';
    grid.replaceChildren(...projects.map((p, i) => card(p, i, sizes, 'li')));
    grid.removeAttribute('aria-busy');
    room.dataset.behanceCount = String(projects.length);
    const count = $('behanceCount');
    if (count) count.textContent = digits(projects.length);
    renderProfile();
    /* The grid changed the sheet's height: let the paper deck measure again. */
    window.dispatchEvent(new Event('resize'));
  };

  /* ---------- the viewer ---------- */
  let current = -1;
  let lastTrigger = null;
  let pushed = false;
  const isOpen = () => viewer.classList.contains('is-open');

  const paragraph = (text) => {
    const p = document.createElement('p');
    p.dir = 'auto';
    p.textContent = text;
    return p;
  };
  const chips = (list, node) => {
    node.replaceChildren(...list.map((label) => {
      const li = document.createElement('li');
      li.textContent = label;
      return li;
    }));
    const row = node.closest('.bhv-fact');
    if (row) row.hidden = !list.length;
  };
  const renderProject = (p, index) => {
    /* A project not copied yet shows its cover and sends the reader on. */
    const pictures = coverOnly(p) ? [{ src: p.cover.src, w: p.cover.w || 808, h: p.cover.h || 632 }] : p.images;
    const total = pictures.length;
    ui.title.textContent = p.title;
    ui.infoTitle.textContent = p.title;
    ui.meta.textContent = coverOnly(p) ? `${year(p)} · Behance` : `${year(p)} · ${imagesLabel(total)}`;
    if (ui.notice) ui.notice.hidden = !coverOnly(p);
    if (ui.noticeCta) ui.noticeCta.href = p.url;
    ui.date.textContent = fill(t('bh.published', 'Published {date}'), { date: longDate(p.date) });
    ui.ext.href = p.url;
    ui.cta.href = p.url;
    ui.cta.hidden = coverOnly(p);
    ui.count.textContent = `${digits(String(index + 1).padStart(2, '0'))} / ${digits(String(projects.length).padStart(2, '0'))}`;
    const altText = t('bh.alt', '{title}, image {i} of {n}');
    ui.images.replaceChildren(...pictures.map((image, i) => {
      const figure = document.createElement('figure');
      figure.className = 'bhv-image';
      const img = document.createElement('img');
      img.src = image.src;
      img.width = image.w;
      img.height = image.h;
      img.alt = fill(altText, { title: p.title, i: digits(i + 1), n: digits(total) });
      img.decoding = 'async';
      img.loading = i < 2 ? 'eager' : 'lazy';
      if (i === 0) img.fetchPriority = 'high';
      figure.appendChild(img);
      if (image.caption) {
        const caption = document.createElement('figcaption');
        caption.dir = 'auto';
        caption.textContent = image.caption;
        figure.appendChild(caption);
      }
      return figure;
    }));
    ui.about.replaceChildren(...(p.about || []).map(paragraph));
    ui.about.hidden = !(p.about || []).length;
    chips(p.tools || [], ui.tools);
    chips(p.tags || [], ui.tags);
    const facts = ui.tools.closest('.bhv-facts');
    if (facts) facts.hidden = !((p.tools || []).length || (p.tags || []).length);
    const sizes = '(max-width: 560px) 46vw, 18vw';
    ui.more.replaceChildren(...projects
      .map((other, i) => ({ other, i }))
      .filter(({ i }) => i !== index)
      .map(({ other, i }) => card(other, i, sizes, 'li')));
    ui.prev.disabled = projects.length < 2;
    ui.next.disabled = projects.length < 2;
  };

  const roomTitle = () => t('meta.title.behance', 'Behance — Barakat Qurtas');
  /* Projects that already carry the owner's name keep their own title. */
  const projectTitle = (p) => {
    const name = t('name.full', 'Barakat Qurtas');
    return /Barakat Qurtas/i.test(p.title) || p.title.includes(name) ? p.title : `${p.title} — ${name}`;
  };
  const open = (index, { trigger = null, fromPop = false, replace = false } = {}) => {
    const p = projects[index];
    if (!p) return;
    const wasOpen = isOpen();
    if (!wasOpen) lastTrigger = trigger || document.activeElement;
    current = index;
    renderProject(p, index);
    viewer.hidden = false;
    viewer.removeAttribute('aria-hidden');
    viewer.classList.add('is-open');
    document.documentElement.classList.add('bh-viewer-open');
    ui.scroll.scrollTop = 0;
    document.title = projectTitle(p);
    /* A project just arrived from the feed has no page on this site yet, so
       the address stays on the room. */
    const path = p.live ? base() : projectPath(p);
    if (!fromPop) {
      if (replace || wasOpen) {
        if (location.pathname !== path) history.replaceState({ bhProject: p.id, bhPushed: pushed }, '', path + location.search);
      } else {
        // Its own entry even on the room's address, so Back closes the viewer.
        history.pushState({ bhProject: p.id, bhPushed: true }, '', path + location.search);
        pushed = true;
      }
    }
    /* Focus the scrolling page, so Space, Page Down and the arrows read it;
       also when the link that opened it was replaced by the new project. */
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (!wasOpen || !active || !active.isConnected || !viewer.contains(active)) ui.scroll.focus({ preventScroll: true });
    });
  };

  /* Hides the viewer without touching history: used by the room router and
     the idle reset, which set their own address. */
  const hide = () => {
    if (!isOpen()) return;
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    viewer.hidden = true;
    document.documentElement.classList.remove('bh-viewer-open');
    ui.images.replaceChildren();
    ui.more.replaceChildren();
    current = -1;
    pushed = false;
    document.title = roomTitle();
    let target = lastTrigger;
    lastTrigger = null;
    if (target && !target.isConnected && target.dataset && target.dataset.id) {
      target = grid.querySelector(`.bh-card-link[data-id="${target.dataset.id}"]`);
    }
    if (target && target.isConnected && typeof target.focus === 'function') {
      try { target.focus({ preventScroll: true }); } catch (e) {}
    }
  };
  const close = () => {
    if (!isOpen()) return;
    if (history.state && history.state.bhPushed) {
      history.back();
      return;
    }
    hide();
    if (idFromPath(location.pathname)) history.replaceState(null, '', base() + location.search);
  };
  const step = (delta) => {
    if (!isOpen() || projects.length < 2) return;
    open((current + delta + projects.length) % projects.length);
  };

  ui.close.addEventListener('click', close);
  ui.prev.addEventListener('click', () => step(-1));
  ui.next.addEventListener('click', () => step(1));
  /* Listened on the document (capture), so the keys still work after a click
     inside the viewer moved focus to the page, and nothing behind it reacts. */
  document.addEventListener('keydown', (event) => {
    if (!isOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    const field = event.target && event.target.closest && event.target.closest('input, textarea, select');
    if (!field && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      const rtl = document.documentElement.dir === 'rtl';
      const forward = event.key === 'ArrowRight' ? !rtl : rtl;
      event.preventDefault();
      event.stopPropagation();
      step(forward ? 1 : -1);
      return;
    }
    if (event.key === 'Tab') {
      const focusable = [...viewer.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!viewer.contains(active)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && (active === first || active === ui.scroll)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    }
  }, true);
  const syncWithAddress = (fromPop) => {
    const id = idFromPath(location.pathname);
    if (id) {
      const index = indexOfId(id);
      if (index > -1) {
        pushed = Boolean(history.state && history.state.bhPushed);
        open(index, { fromPop: true });
        const canonical = projectPath(projects[index]);
        if (location.pathname !== canonical) history.replaceState(history.state, '', canonical + location.search);
      } else if (isOpen()) hide();
    } else if (isOpen()) {
      hide();
    }
    if (fromPop && !id) pushed = false;
  };
  window.addEventListener('popstate', () => {
    if (!projects.length) return;
    if ((document.body.dataset.room || '') !== 'behance' && !idFromPath(location.pathname)) {
      hide();
      return;
    }
    syncWithAddress(true);
  });

  /* Language: labels written from data follow the visitor's language. */
  document.addEventListener('bq:language', () => {
    if (!projects.length) return;
    renderGrid();
    if (isOpen()) {
      renderProject(projects[current], current);
      document.title = projectTitle(projects[current]);
      const p = projects[current];
      const path = p.live ? base() : projectPath(p);
      if (location.pathname !== path) history.replaceState(history.state, '', path + location.search);
    }
  });
  document.addEventListener('bq:route', (event) => {
    if (event.detail && event.detail.room !== 'behance') hide();
  });

  window.__bqCloseBehance = hide;
  window.__bqOpenBehance = (id) => {
    const index = indexOfId(String(id));
    if (index > -1) open(index);
  };

  load()
    .then(() => {
      renderGrid();
      if (idFromPath(location.pathname)) syncWithAddress(false);
      loadFeed();
    })
    .catch(() => {
      grid.removeAttribute('aria-busy');
      room.dataset.behanceState = 'error';
    });
})();
