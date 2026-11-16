/* A handful of real works, briefly laid down along the visitor's gesture.
   Decorative prints never intercept links, scrolling, or the hero's copy. */
(function heroWorkTrail() {
  'use strict';
  const hero = document.querySelector('#design > .hero');
  const paper = hero?.querySelector(':scope > .paper-scroll');
  if (!hero || !paper || hero.dataset.workTrailReady) return;

  const COPY = {
    en: { based: 'Based in Erbil', since: 'Established 2014', mouse: 'Move to discover', touch: 'Hold to discover', preview: 'Preview a work', note: 'A glimpse of the practice', case: 'Case study', video: 'Film' },
    ku: { based: 'بنکە لە هەولێر', since: 'دامەزراو لە 2014', mouse: 'ماوس بجوڵێنە، کارەکان ببینە', touch: 'پەنجەت ڕابگرە، کارەکان ببینە', preview: 'پێشبینیی کارێک', note: 'نیگایەک بۆ کارەکان', case: 'کەیس ستەدی', video: 'ڤیدیۆ' },
    kmr: { based: 'Li Hewlêrê', since: 'Ji 2014an ve', mouse: 'Bilivîne, karan bibîne', touch: 'Bipêçîne, karan bibîne', preview: 'Pêşdîtina karekî', note: 'Nêrînek li karan', case: 'Lêkolîna projeyê', video: 'Fîlm' },
    ar: { based: 'مقرّه أربيل', since: 'تأسس عام 2014', mouse: 'حرّك المؤشر واكتشف الأعمال', touch: 'اضغط مطولاً واكتشف الأعمال', preview: 'معاينة عمل', note: 'لمحة عن الأعمال', case: 'دراسة حالة', video: 'فيلم' },
    fr: { based: 'Basé à Erbil', since: 'Depuis 2014', mouse: 'Bougez pour découvrir', touch: 'Maintenez pour découvrir', preview: 'Aperçu d’un projet', note: 'Un aperçu de la pratique', case: 'Étude de cas', video: 'Film' },
    tr: { based: 'Erbil merkezli', since: '2014’ten beri', mouse: 'Hareket ettir, keşfet', touch: 'Basılı tut, keşfet', preview: 'Bir çalışmayı önizle', note: 'Çalışmalara kısa bir bakış', case: 'Vaka çalışması', video: 'Film' },
    sv: { based: 'Baserad i Erbil', since: 'Sedan 2014', mouse: 'Rör pekaren och upptäck', touch: 'Håll för att upptäcka', preview: 'Förhandsvisa ett verk', note: 'En glimt av arbetet', case: 'Fallstudie', video: 'Film' },
  };
  const FOLDERS = {
    Book: ['book', 'Book cover'], Official: ['official', 'Official'], Poster: ['posters', 'Poster'],
    SocialMedia: ['social', 'Social'], LogoDesign: ['logo', 'Identity'], EventandCon: ['events', 'Event'],
    Businesscard: ['business', 'Stationery'], Invoice: ['invoices', 'Stationery'], Photos: ['image', 'Photography'],
    Other: ['other', 'Design'], Flex: ['flex', 'Design'], GeneralDesign: ['general', 'Design'], Videos: ['video', 'Film'],
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(hover: none), (pointer: coarse)');
  const lang = () => document.documentElement.dataset.lang || document.documentElement.lang || 'en';
  const copy = () => COPY[lang()] || COPY.en;
  const stage = document.createElement('div');
  stage.className = 'hero-work-trail';
  stage.setAttribute('aria-hidden', 'true');
  const control = document.createElement('button');
  control.type = 'button';
  control.className = 'hero-work-discover';
  control.innerHTML = '<span class="hero-work-discover-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="hero-work-discover-copy"></span>';
  const folio = document.createElement('div');
  folio.className = 'hero-work-folio';
  folio.setAttribute('aria-hidden', 'true');
  const folioCopy = document.createElement('span');
  const counter = document.createElement('span');
  counter.className = 'hero-work-folio-counter';
  counter.dir = 'ltr';
  counter.textContent = '00';
  folio.append(folioCopy, counter);
  // The two facts a title page carries in its top corners.
  const based = document.createElement('span');
  based.className = 'hero-work-mark hero-work-mark--based';
  const since = document.createElement('span');
  since.className = 'hero-work-mark hero-work-mark--since';
  paper.append(stage, control, folio, based, since);
  hero.dataset.workTrailReady = 'true';

  let pool = [], position = 0, shown = 0, visible = true, loading = null;
  let lastPoint = null, lastAt = 0, pendingPoint = null, followPoint = null, followAt = 0, followBudget = 0, frame = 0, quietTimer = 0, restTimer = 0;
  let touch = null, holdTimer = 0, holdInterval = 0;
  const prints = [];
  const forbidden = target => target?.closest?.('a, button, input, textarea, select, [contenteditable="true"], [role="button"]');
  const active = () => visible && !document.hidden && !hero.closest('.is-hidden')
    && !document.body.classList.contains('menu-open') && !document.body.classList.contains('menu-revealed')
    && !document.querySelector('#dash.is-open, #chat.is-open, #latestPanel.is-open');
  const updateLanguage = () => {
    control.querySelector('.hero-work-discover-copy').textContent = reduced.matches ? copy().preview : coarse.matches ? copy().touch : copy().mouse;
    control.setAttribute('aria-label', copy().preview);
    folioCopy.textContent = copy().note;
    based.textContent = copy().based;
    since.textContent = copy().since;
  };
  updateLanguage();
  document.addEventListener('bq:language', updateLanguage);
  coarse.addEventListener?.('change', updateLanguage);

  const dispose = entry => {
    clearTimeout(entry.timer);
    clearTimeout(entry.retireTimer);
    clearTimeout(entry.restTimer);
    entry.animation?.cancel();
    entry.retirement?.cancel();
    entry.node.remove();
    const index = prints.indexOf(entry);
    if (index >= 0) prints.splice(index, 1);
  };
  const retire = entry => {
    if (!entry || entry.retiring) return;
    entry.retiring = true;
    // Retain the original transform animation. A second, opacity-only layer
    // lets a busy trail make room gently without snapping an old print away.
    if (!reduced.matches && entry.node.animate) {
      const opacity = typeof getComputedStyle === 'function' ? parseFloat(getComputedStyle(entry.node).opacity) : 1;
      entry.retirement = entry.node.animate([{ opacity: Number.isFinite(opacity) ? opacity : 1 }, { opacity: 0 }], {
        duration: 420, easing: 'cubic-bezier(.33, 0, .67, 1)', fill: 'forwards',
      });
      entry.retirement.onfinish = () => dispose(entry);
      entry.retireTimer = setTimeout(() => dispose(entry), 420);
    } else dispose(entry);
  };
  // When the hand rests, the trail does not linger: the prints it laid down
  // leave one after another, oldest first. Previews asked for by the button
  // or a touch hold keep their own time.
  const rest = () => {
    clearTimeout(restTimer);
    restTimer = setTimeout(() => {
      prints.filter(entry => entry.trail && !entry.retiring).forEach((entry, index) => {
        entry.restTimer = setTimeout(() => retire(entry), index * 55);
      });
    }, 170);
  };
  const stopFollowing = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    pendingPoint = null;
    followPoint = null;
    followAt = 0;
    followBudget = 0;
  };
  const stopTouch = () => {
    clearTimeout(holdTimer);
    clearInterval(holdInterval);
    touch = null;
    hero.classList.remove('is-work-holding');
  };
  const clear = () => {
    stopTouch();
    stopFollowing();
    lastPoint = null;
    clearTimeout(quietTimer);
    clearTimeout(restTimer);
    [...prints].forEach(dispose);
    hero.classList.remove('is-work-discovering');
  };
  const mediaLabel = item => item.kind === 'case' ? copy().case : item.kind === 'video' ? copy().video
    : window.GAL_I18N?.[lang()]?.[item.coll]?.title || item.label;

  const drop = (clientX, clientY, manual = false, trail = false) => {
    if (!pool.length || !active()) return;
    const bounds = stage.getBoundingClientRect();
    if (bounds.width < 1 || bounds.height < 1) return;
    if (!reduced.matches && prints.length >= 8) return;
    if (!reduced.matches && prints.length >= 7) retire(prints[0]);
    const item = pool[position++ % pool.length];
    const scaleX = stage.clientWidth / bounds.width, scaleY = stage.clientHeight / bounds.height;
    const localX = (clientX - bounds.left) * scaleX, localY = (clientY - bounds.top) * scaleY;
    const base = Math.min(stage.clientWidth * (coarse.matches ? .3 : .17), stage.clientHeight * .27, 210);
    const ratio = item.width / item.height;
    const width = Math.max(76, ratio >= 1 ? base : base * Math.max(.58, ratio));
    const height = Math.min(base * 1.25, width / ratio);
    const margin = 18;
    const x = Math.min(Math.max(localX, width / 2 + margin), stage.clientWidth - width / 2 - margin);
    const y = Math.min(Math.max(localY, height / 2 + margin), stage.clientHeight - height / 2 - 52);
    // Each print lands with its own loose tilt, like cards dealt on a table.
    const tilt = Math.sin(shown * 12.9898 + 4.1) * 43758.5453;
    const rotation = ((tilt - Math.floor(tilt)) * 2 - 1) * 15;
    if (reduced.matches) [...prints].forEach(dispose);

    const node = document.createElement('figure');
    node.className = 'hero-work-print';
    node.style.setProperty('--work-x', `${x.toFixed(1)}px`);
    node.style.setProperty('--work-y', `${y.toFixed(1)}px`);
    node.style.setProperty('--work-width', `${width.toFixed(1)}px`);
    node.style.setProperty('--work-height', `${height.toFixed(1)}px`);
    node.style.setProperty('--work-rotation', `${rotation.toFixed(1)}deg`);
    node.style.zIndex = String(shown % 1000 + 1);
    const image = document.createElement('img');
    image.alt = '';
    image.width = item.width;
    image.height = item.height;
    image.decoding = 'async';
    image.draggable = false;
    const caption = document.createElement('figcaption');
    const label = document.createElement('span');
    label.textContent = mediaLabel(item);
    const number = document.createElement('span');
    number.textContent = `${String(++shown).padStart(2, '0')} ${item.kind === 'video' ? '▷' : '↗'}`;
    number.dir = 'ltr';
    caption.append(label, number);
    node.append(image, caption);
    const entry = { node, animation: null, timer: 0, retirement: null, retireTimer: 0, restTimer: 0, retiring: false, trail: false };
    entry.trail = trail;
    prints.push(entry);
    stage.append(node);
    const reveal = () => {
      if (!node.isConnected || node.classList.contains('is-loaded')) return;
      node.classList.add('is-loaded');
      const lifetime = manual ? 4200 : 1650;
      if (!reduced.matches && node.animate) {
        // It grows out of the pointer, rests for a breath, then shrinks back
        // into the same point. Size and opacity keep separate clocks: the
        // print is fully there long before it has finished growing, and it
        // only fades at the very end of shrinking.
        const pose = scale => `translate(-50%, -50%) rotate(${rotation.toFixed(2)}deg) scale(${scale})`;
        const grown = 900 / lifetime, leaving = 1 - 720 / lifetime;
        entry.animation = node.animate([
          { offset: 0, opacity: 0, transform: pose(0), easing: 'cubic-bezier(0, .2, .2, 1)' },
          { offset: 280 / lifetime, opacity: 1 },
          { offset: grown, transform: pose(1), easing: 'linear' },
          { offset: leaving, transform: pose(1), easing: 'cubic-bezier(.25, 1, .5, 1)' },
          { offset: 1 - 300 / lifetime, opacity: 1, easing: 'cubic-bezier(.33, 1, .68, 1)' },
          { offset: 1, opacity: 0, transform: pose(0) },
        ], { duration: lifetime, easing: 'linear', fill: 'both' });
        entry.animation.onfinish = () => dispose(entry);
      }
      clearTimeout(entry.timer);
      entry.timer = setTimeout(() => dispose(entry), lifetime);
    };
    image.addEventListener('load', reveal, { once: true });
    image.addEventListener('error', () => dispose(entry), { once: true });
    entry.timer = setTimeout(() => dispose(entry), 6500);
    image.src = item.src;
    if (image.complete && image.naturalWidth) reveal();
    counter.textContent = String(shown).padStart(2, '0');
    hero.classList.add('is-work-discovering');
    clearTimeout(quietTimer);
    quietTimer = setTimeout(() => hero.classList.remove('is-work-discovering'), manual ? 4200 : 1650);
    lastPoint = { x: localX, y: localY };
    lastAt = performance.now();
  };

  // Round-robin among media families: fifty book covers cannot erase films,
  // photography or case studies from the small gesture-driven selection.
  const makePool = (manifest, behance) => {
    const buckets = new Map(), hashes = new Set();
    const add = item => {
      const bucket = buckets.get(item.coll) || [];
      bucket.push(item);
      buckets.set(item.coll, bucket);
    };
    for (const project of behance?.projects || []) {
      const src = project?.cover?.small || project?.cover?.src;
      if (!/^\/assets\/behance\/[\w/.-]+(?:\?v=[\w.-]+)?$/.test(src || '')) continue;
      add({ coll: 'case', kind: 'case', src, width: project.cover.w || 808, height: project.cover.h || 632,
        label: 'Case study', date: Date.parse(project.date) || 0 });
    }
    const records = [...(manifest?.images || []), ...(manifest?.videos || [])]
      .filter(record => record && FOLDERS[String(record.path).split('/')[0]])
      .sort((a, b) => {
        // A specific collection owns a byte-identical catch-all copy.
        const general = path => String(path).startsWith('GeneralDesign/') ? 1 : 0;
        return general(a.path) - general(b.path) || (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0);
      });
    for (const record of records) {
      if (!(record.width > 0 && record.height > 0) || !/^[A-Za-z0-9]+\/[^/\\]+\.(?:webp|png|jpe?g|avif|mp4|webm|mov)$/i.test(record.path)) continue;
      if (record.hash && hashes.has(record.hash)) continue;
      if (record.hash) hashes.add(record.hash);
      const [coll, label] = FOLDERS[record.path.split('/')[0]];
      const video = /\.(mp4|webm|mov)$/i.test(record.path);
      const src = video ? record.poster : `/assets/thumbs/${record.path}`;
      if (!src || !src.startsWith('/assets/thumbs/')) continue;
      add({ coll, kind: video ? 'video' : 'image', src, width: record.width, height: record.height,
        label, date: Date.parse(record.date) || 0 });
    }
    buckets.forEach(bucket => bucket.sort((a, b) => b.date - a.date));
    const order = ['case', 'video', 'posters', 'book', 'logo', 'official', 'social', 'image', 'events', 'business', 'other', 'invoices', 'flex', 'general'];
    const result = [];
    for (let round = 0; round < 6; round++) {
      for (const key of order) {
        const bucket = buckets.get(key);
        if (!bucket?.length) continue;
        // New publications lead each family; later glimpses sample the archive.
        const sample = round < 2 ? round : Math.floor((bucket.length - 1) * (round - 1) / 5);
        const item = bucket[sample];
        if (item && !result.some(existing => existing.src === item.src)) result.push(item);
      }
    }
    return result;
  };
  const loadSources = () => {
    if (loading) return loading;
    const read = url => fetch(url, { credentials: 'same-origin', cache: 'no-cache', signal: AbortSignal.timeout(10000) })
      .then(response => response.ok ? response.json() : null).catch(() => null);
    const behanceSrc = document.getElementById('behance')?.dataset.behanceSrc || '/assets/behance/projects.json';
    loading = Promise.all([read('/assets/gallery-manifest.json'), read(behanceSrc)]).then(([manifest, behance]) => {
      const next = makePool(manifest, behance);
      if (next.length) pool = next;
      hero.classList.toggle('has-work-trail', pool.length > 0);
      // Warm only the first four small thumbnails, not the complete archive.
      pool.slice(0, 4).forEach(item => { const image = new Image(); image.src = item.src; });
    }).finally(() => { loading = null; });
    return loading;
  };

  hero.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') {
      if (!touch || event.pointerId !== touch.id) return;
      const dx = event.clientX - touch.startX, dy = event.clientY - touch.startY;
      if ((!touch.holding && Math.hypot(dx, dy) > 10) || (Math.abs(dy) > 18 && Math.abs(dy) > Math.abs(dx))) {
        stopTouch();
        return;
      }
      touch.x = event.clientX;
      touch.y = event.clientY;
      return;
    }
    if (reduced.matches || forbidden(event.target) || !active()) {
      stopFollowing();
      return;
    }
    pendingPoint = { x: event.clientX, y: event.clientY };
    rest();
    if (!followPoint) followPoint = { ...pendingPoint };
    followBudget = 18;
    if (frame) return;
    const follow = () => {
      frame = 0;
      if (!pendingPoint || !active()) return stopFollowing();
      const deltaX = pendingPoint.x - followPoint.x, deltaY = pendingPoint.y - followPoint.y;
      // Time-based easing: the trail keeps the same soft lag on a 60 Hz and a
      // 120 Hz screen, and a dropped frame does not make it jump.
      const now = performance.now();
      const ease = 1 - Math.exp(-Math.min(48, Math.max(8, now - (followAt || now - 16))) / 26);
      followAt = now;
      followPoint.x += deltaX * ease;
      followPoint.y += deltaY * ease;
      const bounds = stage.getBoundingClientRect();
      const x = (followPoint.x - bounds.left) * stage.clientWidth / bounds.width;
      const y = (followPoint.y - bounds.top) * stage.clientHeight / bounds.height;
      const distance = lastPoint ? Math.hypot(x - lastPoint.x, y - lastPoint.y) : Infinity;
      const spacing = coarse.matches ? 66 : 110;
      if (distance >= spacing && now - lastAt >= 70) drop(followPoint.x, followPoint.y, false, true);
      // A short, finite settling tail gives the gesture inertia. It stops as
      // soon as the target settles; there is no idle animation-frame loop.
      if (--followBudget > 0 && Math.hypot(deltaX, deltaY) > .7) frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
  }, { passive: true });
  hero.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || forbidden(event.target) || !active() || reduced.matches) return;
    stopTouch();
    touch = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, holding: false, count: 0 };
    holdTimer = setTimeout(() => {
      if (!touch || !active()) return;
      touch.holding = true;
      hero.classList.add('is-work-holding');
      drop(touch.x, touch.y);
      holdInterval = setInterval(() => {
        if (!touch || !active()) return stopTouch();
        const angle = ++touch.count * .95;
        const radius = Math.min(stage.clientWidth * .1, 52);
        drop(touch.x + Math.cos(angle) * radius, touch.y + Math.sin(angle) * radius * .55);
      }, 560);
    }, 360);
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { lastPoint = null; stopTouch(); stopFollowing(); rest(); }, { passive: true });
  window.addEventListener('pointerup', stopTouch, { passive: true });
  window.addEventListener('pointercancel', stopTouch, { passive: true });
  hero.addEventListener('contextmenu', event => { if (touch?.holding && !forbidden(event.target)) event.preventDefault(); });
  control.addEventListener('click', () => {
    const bounds = stage.getBoundingClientRect();
    const spots = [[.23, .35], [.77, .45], [.2, .6], [.78, .25]];
    const [x, y] = spots[position % spots.length];
    drop(bounds.left + bounds.width * x, bounds.top + bounds.height * y, true);
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > .25);
      if (!visible) clear();
    }, { threshold: [0, .25] });
    observer.observe(hero);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  document.addEventListener('bq:route', clear);
  reduced.addEventListener?.('change', () => { clear(); updateLanguage(); });
  window.__bqHeroWorkTrail = { refresh: loadSources, clear };
  loadSources();
}());
