/* film.js — the homepage in the language of "Bqurtas.com — Story Film".
   One sheet, one cut. The hero opens on the brand cut (61.8 %); a pen draws the
   line-art portrait black on paper in the film's own draw order (eyes first); the
   brand's official written-by-hand clip writes the name in the ink field. Headings
   rise from their masks, the Design Room's twelve icons pop, the archive is counted
   from the gallery manifest, and the footer can play the name as music — only when
   tapped. The parts that follow this core (the opening, the evidence sheet, the rooms
   menu, the room switch) each live in their own closure and use window.__bqFilm.
   Strict CSP: no inline style attributes; custom properties go through CSSOM. */
(() => {
  'use strict';
  const doc = document;
  const root = doc.documentElement;
  if (!root.hasAttribute('data-film') || root.dataset.film === 'off') return;

  const reducedQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const still = () => !!(reducedQuery && reducedQuery.matches);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const inOutSine = (u) => -(Math.cos(Math.PI * u) - 1) / 2;
  const outCubic = (u) => 1 - Math.pow(1 - u, 3);
  const inCubic = (u) => u * u * u;
  const outExpo = (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u));
  const raf2 = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));
  root.classList.add('bq-film-js');

  /* ── copy that is new on the page (the rest comes from the site's i18n) ── */
  const COPY = {
    en: { 'ev.title': 'Evidence, <em>not adjectives</em>.', 'ev.t1': 'Practice established', 'ev.langs': 'The site speaks seven languages', 'archive.title': 'The archive, <em>by discipline</em>.', works: 'works', images: 'images', films: 'films', play: 'Hear the name', stop: 'Stop' },
    ku: { 'ev.title': 'بەڵگە، <em>نەک ئاوەڵناو</em>.', 'ev.t1': 'دەستپێکی کار', 'ev.langs': 'سایتەکە بە حەوت زمان دەدوێت', 'archive.title': 'ئەرشیف، <em>بەپێی بوار</em>.', works: 'کار', images: 'وێنە', films: 'فیلم', play: 'گوێ لە ناوەکە بگرە', stop: 'ڕاگرتن' },
    kmr: { 'ev.title': 'Delîl, <em>ne rengdêr</em>.', 'ev.t1': 'Destpêka xebatê', 'ev.langs': 'Malper bi heft zimanan diaxive', 'archive.title': 'Arşîv, <em>li gorî qadê</em>.', works: 'kar', images: 'wêne', films: 'fîlm', play: 'Navê bibihîze', stop: 'Rawestîne' },
    ar: { 'ev.title': 'أدلّة، <em>لا صفات</em>.', 'ev.t1': 'بداية الممارسة', 'ev.langs': 'الموقع يتحدث سبع لغات', 'archive.title': 'الأرشيف، <em>حسب التخصص</em>.', works: 'عملاً', images: 'صورة', films: 'فيلماً', play: 'استمع إلى الاسم', stop: 'إيقاف' },
    fr: { 'ev.title': 'Des preuves, <em>pas des adjectifs</em>.', 'ev.t1': 'Début de la pratique', 'ev.langs': 'Le site parle sept langues', 'archive.title': 'L’archive, <em>par discipline</em>.', works: 'œuvres', images: 'images', films: 'films', play: 'Écouter le nom', stop: 'Arrêter' },
    tr: { 'ev.title': 'Kanıt, <em>sıfat değil</em>.', 'ev.t1': 'Pratiğin başlangıcı', 'ev.langs': 'Site yedi dil konuşuyor', 'archive.title': 'Arşiv, <em>disipline göre</em>.', works: 'iş', images: 'görsel', films: 'film', play: 'İsmi dinle', stop: 'Durdur' },
    sv: { 'ev.title': 'Belägg, <em>inte adjektiv</em>.', 'ev.t1': 'Praktiken grundas', 'ev.langs': 'Sajten talar sju språk', 'archive.title': 'Arkivet, <em>per disciplin</em>.', works: 'verk', images: 'bilder', films: 'filmer', play: 'Lyssna på namnet', stop: 'Stoppa' }
  };
  const lang = () => {
    const l = String(root.dataset.lang || '').toLowerCase();
    if (COPY[l]) return l;
    const seg = location.pathname.split('/')[1];
    return COPY[seg] ? seg : 'en';
  };
  const copy = (key) => (COPY[lang()] && COPY[lang()][key]) || COPY.en[key];

  const onceVisible = (el, fn, threshold = 0.25, margin = '0px 0px -6% 0px') => {
    if (!el) return;
    if (typeof IntersectionObserver !== 'function') { fn(el); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.disconnect();
        fn(el);
        return;
      }
    }, { threshold, rootMargin: margin });
    io.observe(el);
  };

  /* ════════════════ 1. HERO — the cut, the pen, the portrait, the written name ════════════════ */
  const hero = doc.querySelector('#design > .hero');
  const portraitBox = doc.getElementById('heroPortrait');
  const portraitImg = portraitBox && portraitBox.querySelector('img');
  const inkField = hero && hero.querySelector('.film-ink');
  const logo = inkField && inkField.querySelector('video');
  /* The pen only draws the portrait it was recorded on (the approved line-art and its
     renditions). A different published portrait is shown as it is. */
  const OWN = /hero-sketch\.webp|4a2b01f6f4fae90b|3f16d629b3237ae0|5975b2ea9c58c7a2|e6523bea2fa336f4/;
  const ownPortrait = !!portraitImg && (!portraitImg.hasAttribute('data-public-portrait')
    || OWN.test(`${portraitImg.getAttribute('src') || ''} ${portraitImg.getAttribute('srcset') || ''}`));

  const heroVisible = () => {
    if (!hero) return false;
    const r = hero.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
  };
  const playIntro = !!hero && !still() && (window.scrollY || 0) < 40 && heroVisible();
  if (hero) {
    hero.classList.add('film-hero');
    if (playIntro) hero.classList.add('film-intro');
    if (playIntro && logo) logo.removeAttribute('poster');
  }

  async function loadPortrait(url) {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`portrait data ${res.status}`);
    const blob = new Blob([await res.arrayBuffer()], { type: 'image/webp' });
    let bmp;
    try { bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }); }
    catch { bmp = await createImageBitmap(blob); }
    const W = bmp.width, H = bmp.height;
    const scratch = doc.createElement('canvas');
    scratch.width = W; scratch.height = H;
    const sx = scratch.getContext('2d', { willReadFrequently: true });
    sx.drawImage(bmp, 0, 0);
    if (bmp.close) bmp.close();
    const d = sx.getImageData(0, 0, W, H).data;
    /* R = ink alpha, G/B = 10-bit draw time. Counting sort by time → the order the pen lays ink. */
    const N = W * H, hist = new Uint32Array(1025);
    let n = 0;
    for (let i = 0, o = 0; i < N; i++, o += 4) {
      if (!d[o]) continue;
      n++;
      hist[((d[o + 1] << 2) | Math.round(d[o + 2] / 85)) + 1]++;
    }
    for (let q = 1; q < 1025; q++) hist[q] += hist[q - 1];
    const idx = new Uint32Array(n), tq = new Uint16Array(n), al = new Uint8Array(n);
    for (let i = 0, o = 0; i < N; i++, o += 4) {
      const a = d[o];
      if (!a) continue;
      const q = (d[o + 1] << 2) | Math.round(d[o + 2] / 85);
      const k = hist[q]++;
      idx[k] = i; tq[k] = q; al[k] = a;
    }
    return { W, H, n, idx, tq, al };
  }

  /* Paints progress p (0..1) incrementally: only the moving front is recomputed and
     only its bounding box is uploaded. Ink #141414; the wet front shows Graphite. */
  function portraitPainter(data, canvas) {
    const { W, H, n, idx, tq, al } = data;
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    const out = g.createImageData(W, H), o = out.data;
    const SOFT = 0.035, HEAT = SOFT * 3, Q = 1023;
    let done = 0, last = -1;
    const paint = (p) => {
      if (p <= last) return;
      last = p;
      let x0 = W, y0 = H, x1 = -1, y1 = -1, lo = done;
      for (let k = done; k < n; k++) {
        const dt = p - tq[k] / Q;
        if (dt <= 0) break;
        const i = idx[k], m = i << 2;
        const a = dt >= SOFT ? 1 : dt / SOFT;
        const h = dt < HEAT ? 1 - dt / HEAT : 0;
        const c = 20 + 72 * h;
        o[m] = c; o[m + 1] = c; o[m + 2] = c; o[m + 3] = al[k] * a;
        if (h === 0 && k === lo) lo++;
        const x = i % W, y = (i / W) | 0;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      done = lo;
      if (x1 >= 0) g.putImageData(out, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    };
    paint.reset = () => { o.fill(0); g.clearRect(0, 0, W, H); done = 0; last = -1; };
    return paint;
  }

  /* the pen's tip on the artwork at progress p (0..1 artwork coords) and how far it is lifted */
  function penTip(P, p) {
    for (let i = 0; i < P.length; i++) {
      const s = P[i];
      if (p >= s.t0 && p <= s.t1) {
        const k = s.k;
        let j = 1;
        while (j < k.length - 1 && k[j][0] < p) j++;
        const a = k[j - 1], b = k[j], u = clamp((p - a[0]) / Math.max(1e-6, b[0] - a[0]));
        return { x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u), lift: 0 };
      }
      const nx = P[i + 1];
      if (nx && p > s.t1 && p < nx.t0) {
        const a = s.k[s.k.length - 1], b = nx.k[0], u = inOutSine((p - s.t1) / (nx.t0 - s.t1));
        return { x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u), lift: Math.sin(Math.PI * u) };
      }
    }
    const first = P[0].k[0], last = P[P.length - 1].k[P[P.length - 1].k.length - 1];
    return p <= 0 ? { x: first[1], y: first[2], lift: 1 } : { x: last[1], y: last[2], lift: 0 };
  }

  /* a titanium fountain pen (the film's), tip at (0,0), barrel along +x, 540 units long */
  function penPath(c) {
    c.beginPath();
    c.moveTo(0, 0); c.lineTo(58, -10); c.lineTo(74, -12.5); c.lineTo(150, -14.5); c.lineTo(156, -17);
    c.lineTo(505, -17); c.quadraticCurveTo(540, -17, 540, 0); c.quadraticCurveTo(540, 17, 505, 17);
    c.lineTo(156, 17); c.lineTo(150, 14.5); c.lineTo(74, 12.5); c.lineTo(58, 10); c.closePath();
  }
  function drawPen(c, x, y, lift, ang, s, dpr) {
    /* soft shadow on the paper, further away when lifted (drawn off-canvas, shadow offset back) */
    c.save();
    c.translate(x + (14 + lift * 46) * s + 9999, y + (22 + lift * 58) * s);
    c.rotate(ang); c.scale(s, s);
    c.shadowColor = `rgba(0,0,0,${(0.3 - lift * 0.12).toFixed(3)})`;
    c.shadowBlur = (7 + lift * 16) * s * dpr;
    c.shadowOffsetX = -9999 * dpr; c.shadowOffsetY = 0;
    c.fillStyle = '#000'; penPath(c); c.fill();
    c.restore();
    c.save();
    c.translate(x, y - lift * 12 * s);
    c.rotate(ang); c.scale(s, s);
    const g = c.createLinearGradient(0, -17, 0, 17);
    g.addColorStop(0, '#2A2C30'); g.addColorStop(0.18, '#8E9299'); g.addColorStop(0.32, '#3B3E43');
    g.addColorStop(0.75, '#16171A'); g.addColorStop(1, '#0C0D0F');
    c.fillStyle = g; penPath(c); c.fill();
    c.fillStyle = '#C9CCD1'; c.fillRect(150, -16, 7, 32);
    c.fillStyle = 'rgba(255,255,255,0.16)'; c.fillRect(170, -12, 330, 2.2);
    const nib = c.createLinearGradient(0, -12, 0, 12);
    nib.addColorStop(0, '#F1F2F4'); nib.addColorStop(0.45, '#A7ABB2'); nib.addColorStop(1, '#5E6268');
    c.beginPath(); c.moveTo(0, 0); c.lineTo(58, -10); c.lineTo(74, -12.5); c.lineTo(74, 12.5); c.lineTo(58, 10); c.closePath();
    c.fillStyle = nib; c.fill();
    c.strokeStyle = 'rgba(30,30,32,0.75)'; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(2, 0); c.lineTo(46, 0); c.stroke();
    c.beginPath(); c.arc(48, 0, 2.6, 0, Math.PI * 2); c.fillStyle = 'rgba(30,30,32,0.8)'; c.fill();
    c.restore();
  }

  /* The official one-line clip (Brand Kit 06-Motion/One-line, white master over Ink
     #141414, 900 × 200, writing 0.1–3.0 s) is copied frame by frame onto a canvas, so
     the same written name can turn over with the theme. Never retimed or redrawn.
     (LOGO_SPLIT/QURTAS_SHIFT only apply to a two-line lockup; 0 = draw whole.) */
  const LOGO_W = 900, LOGO_H = 200, LOGO_SPLIT = 0, QURTAS_SHIFT = 0;
  let logoCanvas = null, logoCtx = null, logoStill = null, logoFrame = 0;
  /* The hero's own canvas is keyed: the clip's brightness becomes the alpha of the field's
     opposite tone (paper on the ink field, ink on the paper field in dark), so the name
     sits on the field itself — no box, no blend mode, whatever the black. */
  function keyLogo(c) {
    try {
      const frame = c.getImageData(0, 0, LOGO_W, LOGO_H);
      const px = frame.data;
      const tone = root.dataset.theme === 'dark' ? 22 : 243;
      for (let i = 0; i < px.length; i += 4) {
        const a = (px[i] - 20) * 1.085;            // 20 = the clip's ink, 255 = its white
        px[i] = px[i + 1] = px[i + 2] = tone;
        px[i + 3] = a <= 0 ? 0 : a >= 255 ? 255 : a;
      }
      c.putImageData(frame, 0, 0);
    } catch (e) { /* nothing drawn yet */ }
  }
  function drawLogo(src, ctx = logoCtx) {
    if (!ctx) return;
    const c = ctx;
    c.fillStyle = '#141414';
    c.fillRect(0, 0, LOGO_W, LOGO_H);
    if (src) {
      try {
        if (!LOGO_SPLIT) c.drawImage(src, 0, 0, LOGO_W, LOGO_H);
        else {
          c.drawImage(src, 0, 0, LOGO_W, LOGO_SPLIT, 0, 0, LOGO_W, LOGO_SPLIT);
          c.drawImage(src, 0, LOGO_SPLIT, LOGO_W, LOGO_H - LOGO_SPLIT, QURTAS_SHIFT, LOGO_SPLIT, LOGO_W, LOGO_H - LOGO_SPLIT);
        }
      } catch { /* the frame is not decoded yet */ }
    }
    if (c === logoCtx) keyLogo(c);
  }
  function followLogo() {
    cancelAnimationFrame(logoFrame);
    const step = () => {
      drawLogo(logo);
      if (!logo.paused && !logo.ended) logoFrame = requestAnimationFrame(step);
    };
    step();
  }
  function setupLogo(blank) {
    if (!logo || logoCanvas) return;
    logoCanvas = doc.createElement('canvas');
    logoCanvas.className = 'film-logo-canvas';
    logoCanvas.width = LOGO_W;
    logoCanvas.height = LOGO_H;
    logoCanvas.setAttribute('aria-hidden', 'true');
    logoCtx = logoCanvas.getContext('2d', { willReadFrequently: true });
    logo.after(logoCanvas);
    hero.classList.add('film-logo-drawn');
    drawLogo(null);
    logo.addEventListener('playing', followLogo);
    logo.addEventListener('seeked', () => { if (logo.paused) drawLogo(logo); });
    logo.addEventListener('ended', () => drawLogo(logo));
    if (typeof MutationObserver === 'function') {
      new MutationObserver(() => {
        if (!logo.paused && !logo.ended) return;       // the running clip repaints itself
        const shown = (logo.readyState >= 2 && (logo.ended || logo.currentTime > 0)) ? logo
          : (logoStill && logoStill.complete && logoStill.naturalWidth ? logoStill : null);
        if (shown) drawLogo(shown);
      }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    }
    logoStill = new Image();
    logoStill.decoding = 'async';
    logoStill.addEventListener('load', () => { if (!blank && logo.paused) drawLogo(logoStill); }, { once: true });
    logoStill.src = hero.dataset.filmLogoStill || '';
  }
  function playLogo() {
    if (!logo) return;
    hero.classList.add('film-writing');
    try { logo.currentTime = 0; } catch { /* not seekable yet */ }
    const fallback = () => {
      if (logoStill && logoStill.complete) drawLogo(logoStill);
      else if (logo.dataset.filmPoster) logo.setAttribute('poster', logo.dataset.filmPoster);
    };
    const p = logo.play();
    if (p && p.catch) p.catch(fallback);
  }

  function startHero() {
    if (!hero) return;
    const scroller = hero.querySelector(':scope > .paper-scroll') || hero;
    const dataURL = hero.dataset.filmPortrait, penURL = hero.dataset.filmPen;
    if (logo && !logo.dataset.filmPoster) {
      logo.dataset.filmPoster = hero.dataset.filmLogoStill || '';
    }
    setupLogo(playIntro);
    if (!playIntro) {
      hero.classList.add('film-static');
    } else {
      raf2(() => hero.classList.add('film-open'));
      setTimeout(playLogo, 320);          // the name writes itself while the pen draws
    }
    if (!portraitBox || !ownPortrait || !dataURL || typeof createImageBitmap !== 'function') {
      if (playIntro) setTimeout(() => hero.classList.add('film-done'), 3000);
      return;
    }
    const canvas = doc.createElement('canvas');
    canvas.className = 'film-portrait';
    canvas.setAttribute('aria-hidden', 'true');
    const t0 = performance.now();
    Promise.all([
      loadPortrait(dataURL),
      !still() && penURL ? fetch(penURL, { credentials: 'same-origin' }).then((r) => r.json()).catch(() => null) : null
    ]).then(([data, pen]) => {
      const paint = portraitPainter(data, canvas);
      portraitBox.append(canvas);
      portraitBox.classList.add('film-drawn');
      const strokes = pen && Array.isArray(pen.strokes) && pen.strokes.length ? pen.strokes : null;
      heroCtl = { paint, strokes, scroller, canvas, busy: false };
      if (!playIntro || !strokes) {
        paint(1.2);
        scheduleRedraw();
        return;
      }
      heroCtl.busy = true;
      runPen(paint, strokes, scroller, canvas, (performance.now() - t0) / 1000, () => { heroCtl.busy = false; });
      scheduleRedraw();
    }).catch(() => {
      canvas.remove();
      portraitBox.classList.remove('film-drawn');
    });
  }

  /* The film's timing (scenes/s01_line.mjs): the pen flies in, draws 0.22–2.40 s, lifts away. */
  function runPen(paint, strokes, scroller, portraitCanvas, lateBy, onDone) {
    const DRAW0 = 0.22, DRAW1 = 2.4, LIFT = 0.32;
    const shift = Math.max(0, lateBy - 0.1);       // the data arrived late: start the pen from now
    const pc = doc.createElement('canvas');
    pc.className = 'film-pen';
    pc.setAttribute('aria-hidden', 'true');
    scroller.append(pc);
    const pctx = pc.getContext('2d');
    let geo = null;
    const measure = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const or = pc.getBoundingClientRect(), pr = portraitCanvas.getBoundingClientRect();
      const size = Math.min(pr.width, pr.height);
      geo = {
        dpr, w: or.width, h: or.height,
        size, s: size / 900,
        left: pr.left - or.left + (pr.width - size) / 2,
        top: pr.top - or.top + (pr.height - size)
      };
      pc.width = Math.round(or.width * dpr);
      pc.height = Math.round(or.height * dpr);
    };
    measure();
    addEventListener('resize', measure, { passive: true });
    const start = performance.now() - Math.max(0, lateBy - shift) * 1000;
    const drawP = (T) => prog(T, DRAW0 + shift, DRAW1 + shift);
    const art = (q) => ({ x: geo.left + q.x * geo.size, y: geo.top + q.y * geo.size });
    const penAt = (T) => {
      const s = geo.s;
      if (T < DRAW0 + shift) {
        const a = art(penTip(strokes, 0)), u = outCubic(prog(T, 0.06 + shift, DRAW0 + shift));
        return { x: lerp(geo.w + 260 * s, a.x, u), y: lerp(geo.h + 420 * s, a.y, u), lift: 1 - u * 0.9, on: T >= 0.06 + shift };
      }
      if (T <= DRAW1 + shift) {
        const q = penTip(strokes, drawP(T)), a = art(q), hatch = (1 - q.lift) * 5 * s;
        return { x: a.x + Math.sin(T * 57) * hatch, y: a.y + Math.cos(T * 43) * hatch * 0.8, lift: q.lift, on: true };
      }
      const a = art(penTip(strokes, 1)), u = inCubic(prog(T, DRAW1 + shift, DRAW1 + shift + LIFT));
      return { x: lerp(a.x, geo.w + 320 * s, u), y: lerp(a.y, geo.h + 560 * s, u), lift: Math.min(1, u * 2.2), on: u < 1 };
    };
    let finished = false;
    const onHidden = () => { if (doc.hidden) finish(); };
    const finish = () => {
      if (finished) return;
      finished = true;
      removeEventListener('resize', measure);
      doc.removeEventListener('visibilitychange', onHidden);
      paint(1.2);
      pc.remove();
      hero.classList.add('film-done');
      if (onDone) onDone();
    };
    const frame = (now) => {
      const T = (now - start) / 1000;
      paint(drawP(T));
      pctx.setTransform(1, 0, 0, 1, 0, 0);
      pctx.clearRect(0, 0, pc.width, pc.height);
      const p = penAt(T);
      if (p.on) {
        const vx = penAt(T + 0.02).x - p.x;
        const ang = (52 + clamp(vx / (30 * geo.s), -1, 1) * 5 + Math.sin(T * 3.1) * 1.6) * Math.PI / 180;
        pctx.setTransform(geo.dpr, 0, 0, geo.dpr, 0, 0);
        drawPen(pctx, p.x, p.y, clamp(p.lift), ang, geo.s, geo.dpr);
      }
      if (finished) return;
      if (T < DRAW1 + shift + LIFT + 0.05) requestAnimationFrame(frame);
      else finish();
    };
    requestAnimationFrame(frame);
    /* a hidden tab never paints: finish instead of replaying later */
    doc.addEventListener('visibilitychange', onHidden);
  }

  /* Every 30 seconds the sheet is drawn again: the portrait fades back to blank paper,
     the pen redraws it, and the brand's clip writes the name again — only while the
     hero is on screen, the tab is visible and motion is welcome. */
  const REDRAW_MS = 30000;
  let heroCtl = null, redrawTimer = 0, heroInView = true;
  if (hero && typeof IntersectionObserver === 'function') {
    new IntersectionObserver((entries) => {
      for (const e of entries) heroInView = e.isIntersecting && e.intersectionRatio >= 0.6;
    }, { threshold: [0, 0.6] }).observe(hero);
  }
  function scheduleRedraw() {
    clearTimeout(redrawTimer);
    if (!heroCtl || !heroCtl.strokes || still()) return;
    redrawTimer = setTimeout(redraw, REDRAW_MS);
  }
  function redraw() {
    scheduleRedraw();
    if (!heroCtl || heroCtl.busy || doc.hidden || !heroInView || still()) return;
    heroCtl.busy = true;
    portraitBox.classList.add('film-erase');
    hero.classList.add('film-rewrite');
    setTimeout(() => {
      heroCtl.paint.reset();
      portraitBox.classList.remove('film-erase');
      runPen(heroCtl.paint, heroCtl.strokes, heroCtl.scroller, heroCtl.canvas, 0, () => { heroCtl.busy = false; });
      drawLogo(null);
      hero.classList.remove('film-rewrite');
      setTimeout(playLogo, 260);          // pen and name together
    }, 560);
  }

  /* (2. The ink curtains that used to cover an arriving sheet are gone: every card now lands
     directly on the one before it. The "window" opening lives in the splash and the room switch.) */

  /* ════════════════ 3. MASK-RISE — headings rise word by word ════════════════ */
  const LATIN = /^[\u0000-ɏ‘’\s.,!?’'&-]+$/;
  function split(el) {
    let i = 0;
    const unfold = (em) => {
      const text = em.textContent;
      em.textContent = '';
      let j = 0;
      for (const part of text.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { em.append(part); continue; }
        const word = doc.createElement('span');
        word.className = 'film-wd';            // letters unfold, the word never breaks
        for (const ch of part) {
          const s = doc.createElement('span');
          s.className = 'film-ch';
          s.textContent = ch;
          s.style.setProperty('--j', String(j++));
          word.append(s);
        }
        em.append(word);
      }
    };
    const walk = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === 3) {
          if (!child.data.trim()) continue;
          const frag = doc.createDocumentFragment();
          for (const part of child.data.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.append(part); continue; }
            const w = doc.createElement('span');
            w.className = 'film-w';
            const inner = doc.createElement('span');
            inner.textContent = part;
            inner.style.setProperty('--i', String(i++));
            w.append(inner);
            frag.append(w);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && !child.matches('br, img, svg, i, .film-w, .film-ch')) {
          if (child.tagName === 'EM' && el.dataset.filmUnfold === '' && LATIN.test(child.textContent)) unfold(child);
          else walk(child);
        }
      }
    };
    walk(el);
  }
  function rise() {
    if (still()) return;
    const heads = doc.querySelectorAll([
      '#design .section-title', '#design .recent-heading h2', '#archiveChartTitle',
      '.footer.footer-v249 .footer-cta-title'
    ].join(','));
    heads.forEach((el) => {
      if (el.closest('.film-hero')) return;
      if (el.closest('.recent-heading')) el.dataset.filmUnfold = '';
      el.classList.add('film-rise');
      split(el);
      onceVisible(el, () => {
        if (!el.querySelector('.film-w, .film-ch')) split(el);
        raf2(() => el.classList.add('is-in'));
      }, 0.2);
    });
  }

  /* ════════════════ 4. DESIGN ROOM — twelve icons pop onto their grid ════════════════ */
  function tabsPop() {
    const tabs = doc.querySelector('#design .tabs');
    if (!tabs || still()) return;
    tabs.querySelectorAll('.tab').forEach((t, i) => t.style.setProperty('--i', String(i)));
    tabs.classList.add('film-pop');
    onceVisible(tabs, () => raf2(() => tabs.classList.add('is-in')), 0.3);
  }

  /* ════════════════ 5. THE ARCHIVE, BY DISCIPLINE ════════════════ */
  const GROUPS = [
    ['general', ['GeneralDesign']], ['logo', ['LogoDesign', 'TickerLogo']], ['official', ['Official']],
    ['book', ['Book']], ['posters', ['Poster']], ['social', ['SocialMedia']], ['events', ['EventandCon']],
    ['stationery', ['Businesscard', 'Invoice']], ['image', ['Photos']], ['video', ['Videos']],
    ['other', ['Other', 'Flex']], ['certificate', ['Certificate']]
  ];
  const groupLabel = (key) => {
    if (key === 'general') {
      const t = doc.querySelector('.rail-link[data-route="design"] .rail-tip-text');
      return (t && t.textContent.trim()) || 'Design';
    }
    const t = doc.querySelector(`#design .tab[data-filter="${key}"] .tab-label`);
    return (t && t.textContent.trim()) || key;
  };
  const thumbOf = (item) => (item.poster ? item.poster.replace(/^\//, '') : `assets/thumbs/${item.path}`);
  let archive = null;

  function rollNumber(textNode, to, delay = 0, dur = 900) {
    const fmt = (v) => (to >= 1000 ? v.toLocaleString('en-US') : String(v));
    if (still()) { textNode.data = fmt(to); return; }
    const begin = performance.now() + delay;
    const step = (now) => {
      const u = prog(now, begin, begin + dur);
      textNode.data = fmt(Math.round(to * outExpo(u)));
      if (u < 1) requestAnimationFrame(step);
    };
    textNode.data = fmt(0);
    requestAnimationFrame(step);
  }

  function renderSummary() {
    if (!archive) return;
    const { sum, total } = archive.els;
    if (sum) sum.textContent = `${archive.works} ${copy('works')} · ${archive.images} ${copy('images')} · ${archive.videos} ${copy('films')}`;
    if (total && total.firstChild && total.firstChild.data !== String(archive.works) && archive.counted) total.firstChild.data = String(archive.works);
    archive.bars.forEach((b) => { b.name.textContent = groupLabel(b.key); });
  }

  async function buildArchive() {
    const section = doc.getElementById('archiveChart');
    if (!section) return;
    const barsEl = section.querySelector('[data-film-bars]');
    const wall = section.querySelector('[data-film-wall]');
    const els = { sum: section.querySelector('[data-film-sum]'), total: section.querySelector('[data-film-total]') };
    let manifest;
    try { manifest = await getManifest(); } catch { return; }
    const images = Array.isArray(manifest.images) ? manifest.images : [];
    const videos = Array.isArray(manifest.videos) ? manifest.videos : [];
    const byFolder = new Map();
    for (const item of images.concat(videos)) {
      const folder = String(item.path || '').split('/')[0];
      if (!byFolder.has(folder)) byFolder.set(folder, []);
      byFolder.get(folder).push(item);
    }
    const groups = GROUPS.map(([key, folders]) => {
      const items = folders.flatMap((f) => byFolder.get(f) || []);
      return { key, items, count: items.length };
    }).filter((g) => g.count > 0).sort((a, b) => b.count - a.count);
    const max = groups.length ? groups[0].count : 1;
    archive = { works: images.length + videos.length, images: images.length, videos: videos.length, bars: [], els, counted: false };

    barsEl.textContent = '';
    groups.forEach((g, i) => {
      const li = doc.createElement('li');
      li.className = 'film-bar';
      li.style.setProperty('--i', String(i));
      li.style.setProperty('--v', (g.count / max).toFixed(4));
      const name = doc.createElement('span');
      name.className = 'film-bar-name';
      const track = doc.createElement('span');
      track.className = 'film-bar-track';
      track.setAttribute('aria-hidden', 'true');
      const fill = doc.createElement('span');
      fill.className = 'film-bar-fill';
      track.append(fill);
      const pick = g.items[Math.min(2, g.items.length - 1)];
      if (pick) {
        const dot = doc.createElement('img');
        dot.className = 'film-bar-dot';
        dot.alt = '';
        dot.loading = 'lazy';
        dot.decoding = 'async';
        dot.width = 26; dot.height = 26;
        dot.src = thumbOf(pick);
        track.append(dot);
      }
      const num = doc.createElement('span');
      num.className = 'film-bar-num';
      num.append(doc.createTextNode(String(g.count)));
      li.append(name, track, num);
      barsEl.append(li);
      archive.bars.push({ key: g.key, name, num: num.firstChild, count: g.count });
    });
    if (els.total) {
      els.total.textContent = '';
      els.total.append(doc.createTextNode(String(archive.works)));
    }
    renderSummary();

    /* the wall: a few columns of real work that rush past before the data settles */
    if (wall && !still()) {
      const pool = [];
      const lanes = groups.map((g) => g.items.filter((it) => !String(it.path).startsWith('Official/')).slice(0, 8))
        .filter((l) => l.length);
      for (let r = 0; pool.length < 42 && r < 8; r++) lanes.forEach((l) => { if (l[r] && pool.length < 42) pool.push(l[r]); });
      for (let c = 0; c < 6; c++) {
        const col = doc.createElement('div');
        for (let k = c; k < pool.length; k += 6) {
          const it = pool[k];
          const im = doc.createElement('img');
          im.alt = '';
          im.loading = 'lazy';
          im.decoding = 'async';
          im.width = 160;
          im.height = Math.round(160 * ((it.height || 1) / (it.width || 1)));
          im.src = thumbOf(it);
          col.append(im);
        }
        wall.append(col);
      }
    }

    onceVisible(section, () => {
      archive.counted = true;
      raf2(() => section.classList.add('is-in'));
      archive.bars.forEach((b, i) => rollNumber(b.num, b.count, 180 + i * 55, 1000));
      if (els.total && els.total.firstChild) rollNumber(els.total.firstChild, archive.works, 500, 1400);
    }, 0.3);
  }

  /* ════════════════ 5b. RECENT WORK — the folio: cards unfold away one by one ════════════════
     The film's S03. The newest works (Behance case studies + the gallery manifest) stand as
     a stack; every few seconds the front card unfolds from its left edge and goes to the
     back. A card opened grows to fill the screen and lands on that work's tab of the
     portfolio (case studies open the Behance room). The original viewer stays for no-JS. */
  const FOLDER_TAB = { GeneralDesign: 'all', LogoDesign: 'logo', TickerLogo: 'logo', Official: 'official', Book: 'book',
    Poster: 'posters', SocialMedia: 'social', EventandCon: 'events', Businesscard: 'stationery', Invoice: 'stationery',
    Photos: 'image', Videos: 'video', Other: 'other', Flex: 'other', Certificate: 'certificate' };
  const FOLDER_TITLE = { GeneralDesign: 'Design', LogoDesign: 'Logo', TickerLogo: 'Ticker Logo', Official: 'Official',
    Book: 'Book Cover', Poster: 'Poster', SocialMedia: 'Social Media', EventandCon: 'Event', Businesscard: 'Business Card',
    Invoice: 'Invoice', Photos: 'Photo', Videos: 'Video', Other: 'Other', Flex: 'Flex', Certificate: 'Certificate' };
  let manifestPromise = null;
  const getManifest = () => (manifestPromise ||= fetch(
    (doc.getElementById('archiveChart') || {}).dataset?.filmManifest || 'assets/gallery-manifest.json',
    { credentials: 'same-origin' }).then((r) => r.json()));

  async function buildFolio() {
    const section = doc.getElementById('recent-work');
    const holder = section && section.querySelector('.recent-folio');
    if (!holder) return;
    let manifest = null, behance = null;
    try {
      const bsrc = (doc.getElementById('behance') || {}).dataset?.behanceSrc;
      [manifest, behance] = await Promise.all([
        getManifest(),
        bsrc ? fetch(bsrc, { credentials: 'same-origin' }).then((r) => r.json()).catch(() => null) : null
      ]);
    } catch { return; }
    const tabLabel = (tab) => {
      const t = doc.querySelector(`#design .tab[data-filter="${tab}"] .tab-label`);
      return (t && t.textContent.trim()) || tab;
    };
    const caseLabel = () => {
      const t = section.querySelector('[data-recent-copy="caseStudies"]');
      return (t && t.textContent.trim()) || 'Case studies';
    };
    const items = [];
    ((behance && behance.projects) || []).slice(0, 3).forEach((p) => {
      if (!p.cover || !p.cover.src) return;
      items.push({ kind: 'case-study', date: p.date || '', title: p.title, src: p.cover.src, fit: 'wide', tone: p.cover.tone, route: 'behance' });
    });
    const byDate = (a, b) => String(b.date || '').localeCompare(String(a.date || '')) || (b.index || 0) - (a.index || 0);
    (manifest.images || []).filter((it) => !String(it.path).startsWith('Official/')).sort(byDate).slice(0, 9).forEach((it) => {
      const folder = String(it.path).split('/')[0];
      const square = Math.abs((it.width || 1) / (it.height || 1) - 1) < 0.18;
      items.push({ kind: 'image', date: it.date || '', title: `${FOLDER_TITLE[folder] || folder} ${it.index || ''}`.trim(),
        src: `assets/thumbs/${it.path}`, fit: square || folder === 'LogoDesign' ? 'contain' : 'cover', tab: FOLDER_TAB[folder] || 'all' });
    });
    (manifest.videos || []).slice(0, 2).forEach((it, i) => {
      items.push({ kind: 'video', date: it.date || '', title: `${FOLDER_TITLE.Videos} ${i + 1}`,
        src: String(it.poster || '').replace(/^\//, ''), fit: 'cover', tab: 'video',
        dur: it.duration ? `${Math.floor(it.duration / 60)}:${String(Math.round(it.duration % 60)).padStart(2, '0')}` : '' });
    });
    if (items.length < 3) return;
    items.sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const wrap = doc.createElement('div');
    wrap.className = 'film-folio';
    const stage = doc.createElement('div');
    stage.className = 'film-folio-stage';
    const meta = doc.createElement('div');
    meta.className = 'film-folio-meta';
    meta.innerHTML = '<span class="film-folio-index"><b></b><small></small></span>'
      + '<span class="film-folio-title"></span><span class="film-folio-tag mono"></span>'
      + '<span class="film-folio-nav"><button type="button" class="film-folio-btn" data-dir="-1" aria-label="Previous">←</button>'
      + '<button type="button" class="film-folio-btn" data-dir="1" aria-label="Next">→</button></span>';
    const cards = items.map((it) => {
      const a = doc.createElement('a');
      a.className = 'film-card';
      a.href = it.route ? `/${it.route}` : (it.tab === 'all' ? '/design' : `/design/${it.tab}`);
      const tag = it.kind === 'case-study' ? caseLabel() : tabLabel(it.tab);
      a.setAttribute('aria-label', `${it.title} — ${tag}`);
      const im = doc.createElement('img');
      im.alt = '';
      im.loading = 'lazy';
      im.decoding = 'async';
      im.src = it.src;
      if (it.fit === 'contain') a.classList.add('is-contain');
      if (it.fit === 'wide') a.classList.add('is-wide', it.tone === 'light' ? 'is-light' : 'is-dark');
      const chip = doc.createElement('span');
      chip.className = 'film-card-tag mono';
      chip.textContent = it.kind === 'video' && it.dur ? `${tag} · ${it.dur}` : tag;
      a.append(im, chip);
      a.filmItem = { ...it, tag };
      stage.append(a);
      return a;
    });
    wrap.append(stage, meta);
    holder.append(wrap);
    holder.classList.add('film-folio-on');

    let order = cards.slice(), busy = false, timer = 0, hovered = false, inView = false;
    const indexB = meta.querySelector('.film-folio-index b'), indexS = meta.querySelector('.film-folio-index small');
    const titleEl = meta.querySelector('.film-folio-title'), tagEl = meta.querySelector('.film-folio-tag');
    const showMeta = (front) => {
      if (!front) return;
      const k = cards.filter((c) => order.includes(c)).indexOf(front) + 1;
      indexB.textContent = String(k).padStart(2, '0');
      indexS.textContent = ` / ${String(order.length).padStart(2, '0')}`;
      titleEl.textContent = front.filmItem.title;
      tagEl.textContent = front.filmItem.tag;
      meta.classList.remove('is-swap');
      void meta.offsetWidth;                  // restart the caption's rise
      meta.classList.add('is-swap');
    };
    const place = (c, pos) => {
      c.style.setProperty('--pos', String(Math.min(pos, 4)));
      c.classList.toggle('is-deep', pos > 3);
      c.tabIndex = pos === 0 ? 0 : -1;
      c.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
    };
    const layout = () => {
      cards.forEach((c) => { if (!order.includes(c)) c.classList.add('is-out'); });
      order.forEach((c, pos) => { c.classList.remove('is-out'); place(c, pos); });
      showMeta(order[0]);
    };
    const step = (dir = 1) => {
      if (busy || order.length < 2) return;
      if (dir < 0 || still()) {
        order = dir < 0 ? [order[order.length - 1], ...order.slice(0, -1)] : [...order.slice(1), order[0]];
        layout();
        return;
      }
      busy = true;
      /* the front card lifts and turns away like a page; the rest step forward with it,
         and the turned card comes back quietly at the end of the stack */
      const leaving = order[0];
      leaving.classList.add('is-leaving');
      order = [...order.slice(1), leaving];
      order.slice(0, -1).forEach((c, pos) => place(c, pos));
      showMeta(order[0]);
      setTimeout(() => {
        leaving.classList.add('no-anim', 'is-back');
        leaving.classList.remove('is-leaving');
        place(leaving, order.length - 1);
        raf2(() => {
          leaving.classList.remove('no-anim');
          raf2(() => { leaving.classList.remove('is-back'); busy = false; });
        });
      }, 980);
    };
    const schedule = () => {
      clearTimeout(timer);
      if (still()) return;
      timer = setTimeout(() => {
        if (inView && !hovered && !doc.hidden) step(1);
        schedule();
      }, 2600);
    };
    meta.addEventListener('click', (e) => {
      const b = e.target.closest('.film-folio-btn');
      if (!b) return;
      step(Number(b.dataset.dir) || 1);
      schedule();
    });
    wrap.addEventListener('pointerenter', () => { hovered = true; });
    wrap.addEventListener('pointerleave', () => { hovered = false; });
    wrap.addEventListener('focusin', () => { hovered = true; });
    wrap.addEventListener('focusout', () => { hovered = false; });
    if (typeof IntersectionObserver === 'function') {
      new IntersectionObserver((es) => { for (const e of es) inView = e.isIntersecting && e.intersectionRatio >= 0.45; },
        { threshold: [0, 0.45] }).observe(stage);
    } else inView = true;

    /* a card opened: it grows to fill the screen, then the portfolio opens on its tab */
    const land = (item) => {
      if (item.route) {
        const a = doc.querySelector(`.rail-link[data-route="${item.route}"]`) || doc.querySelector(`a[data-route="${item.route}"]`);
        if (a) a.click(); else location.href = `/${item.route}`;
        return;
      }
      const tab = doc.querySelector(`#design .tab[data-filter="${item.tab}"]`);
      if (tab) tab.click();
      const work = doc.querySelector('#design > .section.work');
      if (work) {
        const top = work.getBoundingClientRect().top + window.scrollY;
        try { window.scrollTo({ top, behavior: 'instant' }); } catch { window.scrollTo(0, top); }
      }
    };
    stage.addEventListener('click', (e) => {
      const card = e.target.closest('.film-card');
      if (!card || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (card !== order[0]) {                       // a card behind: bring it forward first
        order = [card, ...order.filter((c) => c !== card)];
        layout();
        return;
      }
      if (still()) { land(card.filmItem); return; }
      const r = card.getBoundingClientRect();
      const zoom = doc.createElement('div');
      zoom.className = 'film-zoom';
      zoom.setAttribute('aria-hidden', 'true');
      const zi = doc.createElement('img');
      zi.alt = '';
      zi.src = card.querySelector('img').currentSrc || card.querySelector('img').src;
      if (card.classList.contains('is-contain')) zoom.classList.add('is-contain');
      if (card.classList.contains('is-wide')) zoom.classList.add('is-wide');
      zoom.append(zi);
      zoom.style.left = `${r.left}px`;
      zoom.style.top = `${r.top}px`;
      zoom.style.width = `${r.width}px`;
      zoom.style.height = `${r.height}px`;
      doc.body.append(zoom);
      raf2(() => zoom.classList.add('is-full'));
      setTimeout(() => {
        land(card.filmItem);
        setTimeout(() => {
          zoom.classList.add('is-gone');
          setTimeout(() => zoom.remove(), 520);
        }, 140);
      }, 640);
    });
    /* the section's own filters choose the cards too */
    section.querySelector('.recent-filters')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-recent-filter]');
      if (!b) return;
      const f = b.dataset.recentFilter;
      const next = cards.filter((c) => f === 'all' || c.filmItem.kind === f);
      if (!next.length) return;
      order = next;
      layout();
      schedule();
    });
    layout();
    schedule();
  }

  /* ════════════════ 6. THE NAME, AS MUSIC — tap to play (never on its own) ════════════════
     Barakat = B♭ A D A D A F, Qurtas = C G D F A E, over B♭ → C → F; one note per letter,
     exactly when the brand's clip writes it (claude-film/audio/src/final_audio.py). */
  const LETTERS = [['B', 0, 0.09], ['a', 0, 0.6], ['r', 0, 0.682], ['a', 0, 0.805], ['k', 0, 0.937], ['a', 0, 1.253],
    ['t', 0, 1.385], ['Q', 1, 1.816], ['u', 1, 2.294], ['r', 1, 2.376], ['t', 1, 2.499], ['a', 1, 2.78], ['s', 1, 2.885]];
  const NOTE = { B: 70, a: 69, r: 74, k: 74, t: 77, Q: 72, u: 79, s: 76 };
  const DONE = 3.0;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function nameScore(ac, base) {
    const master = ac.createGain();
    master.gain.value = 0.55;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3;
    master.connect(comp).connect(ac.destination);
    /* a small hall: decaying noise as the impulse */
    const len = Math.round(ac.sampleRate * 2.6), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const verb = ac.createConvolver();
    verb.buffer = ir;
    const wet = ac.createGain();
    wet.gain.value = 0.32;
    verb.connect(wet).connect(master);
    const bus = (pan = 0) => {
      const g = ac.createGain();
      const p = ac.createStereoPanner ? ac.createStereoPanner() : null;
      if (p) { p.pan.value = pan; g.connect(p); p.connect(master); p.connect(verb); }
      else { g.connect(master); g.connect(verb); }
      return g;
    };
    const env = (g, t, peak, attack, decay, endAt) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, endAt || t + attack + decay);
    };
    const piano = (m, t, vel, pan) => {
      const out = bus(pan), f = hz(m);
      [[1, 'sine', 1], [2, 'triangle', 0.35], [3, 'sine', 0.12], [4.01, 'sine', 0.05]].forEach(([mul, type, amp]) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type; o.frequency.value = f * mul;
        env(g, t, vel * amp, 0.006, 2.6 / mul);
        o.connect(g).connect(out);
        o.start(t); o.stop(t + 3.4);
      });
    };
    const bell = (m, t, vel, pan, decay = 1.3) => {
      const out = bus(pan), f = hz(m);
      const car = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), g = ac.createGain();
      car.frequency.value = f; mod.frequency.value = f * 2;
      mg.gain.setValueAtTime(f * 1.5, t);
      mg.gain.exponentialRampToValueAtTime(f * 0.05, t + decay);
      mod.connect(mg).connect(car.frequency);
      env(g, t, vel, 0.004, decay);
      car.connect(g).connect(out);
      car.start(t); mod.start(t); car.stop(t + decay + 0.2); mod.stop(t + decay + 0.2);
    };
    const pad = (notes, a, b, level = 0.05) => {
      const out = bus(0);
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1700; lp.Q.value = 0.7;
      lp.connect(out);
      notes.forEach((m) => [-6, 6].forEach((cents) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = cents;
        g.gain.setValueAtTime(0.0001, a);
        g.gain.exponentialRampToValueAtTime(level, a + 0.35);
        g.gain.setValueAtTime(level, Math.max(a + 0.36, b));
        g.gain.exponentialRampToValueAtTime(0.0001, b + 1.2);
        o.connect(g).connect(lp);
        o.start(a); o.stop(b + 1.3);
      }));
    };
    const bass = (m, a, b) => {
      const o = ac.createOscillator(), g = ac.createGain(), out = bus(0);
      o.type = 'sine'; o.frequency.value = hz(m);
      g.gain.setValueAtTime(0.0001, a);
      g.gain.exponentialRampToValueAtTime(0.22, a + 0.25);
      g.gain.setValueAtTime(0.22, Math.max(a + 0.26, b));
      g.gain.exponentialRampToValueAtTime(0.0001, b + 0.4);
      o.connect(g).connect(out);
      o.start(a); o.stop(b + 0.5);
    };
    const qt = base + LETTERS[7][2];
    const end = base + DONE;
    pad([46, 62, 65, 69], base - 0.15, qt - 0.05);            // B♭maj7 while "Barakat" is written
    pad([48, 64, 67, 74], qt - 0.05, end);                     // C under "Qurtas"
    pad([41, 57, 60, 67, 69], end, end + 3.2, 0.045);          // F when the name is complete
    bass(34, base - 0.15, qt - 0.05); bass(36, qt - 0.05, end); bass(29, end, end + 3);
    const lines = [LETTERS.filter((l) => l[1] === 0), LETTERS.filter((l) => l[1] === 1)];
    LETTERS.forEach((l) => {
      const [ch, line, onset] = l;
      const m = line === 1 && ch === 'a' ? 81 : NOTE[ch];
      const k = lines[line].indexOf(l), pan = -0.35 + 0.7 * k / Math.max(1, lines[line].length - 1);
      const vel = 'BQ'.includes(ch) ? 0.3 : 0.24;
      piano(m, base + onset, vel, pan);
      bell(m + 12, base + onset, 0.07, pan, 1.4);
    });
    piano(77, end, 0.3, 0);                                   // E5 → F5: the resolution
    [65, 69, 72, 76, 79].forEach((m, k) => bell(m + 12, end + 0.03 * k, 0.05, -0.3 + 0.15 * k, 2.6));
    return { master, length: DONE + 3.6 };
  }

  function nameOutro() {
    const button = doc.querySelector('[data-film-name]');
    const stage = doc.querySelector('[data-film-outro]');
    const video = stage && stage.querySelector('video');
    if (!button || !stage || !video) return;
    const label = button.querySelector('[data-film-name-label]');
    let ac = null, timer = 0, frame = 0;
    /* the same lockup as the hero: the clip copied in two bands, "Qurtas" toward the B */
    const canvas = doc.createElement('canvas');
    canvas.width = LOGO_W;
    canvas.height = LOGO_H;
    canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext('2d');
    stage.append(canvas);
    stage.classList.add('film-outro-drawn');
    drawLogo(null, ctx);
    const follow = () => {
      cancelAnimationFrame(frame);
      const tick = () => {
        drawLogo(video, ctx);
        if (!video.paused && !video.ended) frame = requestAnimationFrame(tick);
      };
      tick();
    };
    video.addEventListener('playing', follow);
    video.addEventListener('ended', () => drawLogo(video, ctx));
    const setLabel = () => { if (label) label.textContent = copy(button.getAttribute('aria-pressed') === 'true' ? 'stop' : 'play'); };
    const stop = () => {
      clearTimeout(timer);
      button.setAttribute('aria-pressed', 'false');
      setLabel();
      try { video.pause(); } catch { /* nothing to pause */ }
      if (ac) { const a = ac; ac = null; a.close().catch(() => {}); }
    };
    button.addEventListener('click', async () => {
      if (button.getAttribute('aria-pressed') === 'true') { stop(); return; }
      button.setAttribute('aria-pressed', 'true');
      setLabel();
      stage.hidden = false;
      raf2(() => stage.classList.add('is-open'));
      const Ctx = window.AudioContext || window.webkitAudioContext;
      try {
        ac = Ctx ? new Ctx() : null;
        if (ac && ac.state === 'suspended') await ac.resume();
      } catch { ac = null; }
      try { video.currentTime = 0; } catch { /* first play */ }
      const started = () => {
        if (!ac) return;
        const base = ac.currentTime - (video.currentTime || 0) + 0.02;
        const { length } = nameScore(ac, base);
        timer = setTimeout(stop, (length + 0.4) * 1000);
      };
      video.addEventListener('playing', started, { once: true });
      const p = video.play();
      if (p && p.catch) p.catch(() => { video.removeEventListener('playing', started); started(); });
    });
    setLabel();
    doc.addEventListener('bq:language', setLabel);
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) stop(); });
  }

  /* ════════════════ language, then everything else ════════════════ */
  function applyCopy() {
    const dict = COPY[lang()] || COPY.en;
    doc.querySelectorAll('[data-film-copy]').forEach((el) => {
      const v = dict[el.dataset.filmCopy] || COPY.en[el.dataset.filmCopy];
      if (typeof v === 'string' && el.innerHTML !== v) {
        el.innerHTML = v;
        if (el.classList.contains('film-rise') && el.classList.contains('is-in')) el.classList.remove('film-rise');
      }
    });
    renderSummary();
  }
  doc.addEventListener('bq:language', applyCopy);
  applyCopy();

  /* The kit the film's parts build on (js/film-parts/*.js, appended to this file by the merge).
     Each part is its own closure, so one part can never break another. */
  let heroBegun = false;
  const beginHero = () => { if (heroBegun) return; heroBegun = true; startHero(); };
  window.__bqFilm = {
    doc, root, still, clamp, lerp, prog, inOutSine, outCubic, inCubic, outExpo, raf2,
    lang, copy, onceVisible, rollNumber, beginHero, hero,
    getManifest, thumbOf, groupLabel, GROUPS,
    /* parts add their own strings: addCopy({ en: { key: '…' }, ku: { … } }) */
    addCopy(table) {
      for (const [code, dict] of Object.entries(table || {})) COPY[code] = Object.assign(COPY[code] || {}, dict);
      applyCopy();
    }
  };

  /* The opening (film-parts/splash) starts the hero as it opens; without an opening the
     hero starts at once. The timer is only a failsafe for an opening that never ran. */
  if (root.classList.contains('film-splashing')) setTimeout(beginHero, 4200);
  else beginHero();
  rise();
  tabsPop();
  buildArchive();
  buildFolio();
  nameOutro();
})();

/* ═════ part: splash ═════ */
/* film part — 0. THE OPENING (#filmSplash, html.film-splashing)
   The handwritten name alone, on the theme's own paper; then the window opens on the hero's cut. */
(() => {
  'use strict';
  const F = window.__bqFilm;
  if (!F) return;
  const { doc, root, raf2 } = F;
  const el = doc.getElementById('filmSplash');
  if (!el || !root.classList.contains('film-splashing')) {
    root.classList.remove('film-splashing');
    if (el) el.remove();
    F.beginHero();
    return;
  }

  /* the shutters part exactly on the hero's own cut line */
  const seam = () => {
    const hero = F.hero;
    if (!hero) return;
    const r = hero.getBoundingClientRect();
    const cut = parseFloat(getComputedStyle(root).getPropertyValue('--film-cut')) || 61.8;
    if (r.height > 0) el.style.setProperty('--film-splash-cut', `${Math.round(r.top + r.height * cut / 100)}px`);
  };
  seam();
  addEventListener('resize', seam);

  let opened = false;
  const open = () => {
    if (opened) return;
    opened = true;
    seam();
    el.classList.add('is-open');
    F.beginHero();                            // the hero starts drawing as the window opens
    removeEventListener('resize', seam);
    setTimeout(() => { root.classList.remove('film-splashing'); el.remove(); }, 760);
  };

  const holder = el.querySelector('.film-splash-name');
  if (holder) {
    const W = 900, H = 200;
    const canvas = doc.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    /* The clip is white on Ink #141414. Each frame is keyed: its brightness becomes the
       alpha of the theme's own ink, so the name sits on the shutters with no box around
       it and needs no blend mode (unreliable on video in Safari). */
    const scratch = doc.createElement('canvas');
    scratch.width = W; scratch.height = H;
    const sx = scratch.getContext('2d', { willReadFrequently: true });
    const dark = root.dataset.theme === 'dark';
    const R = dark ? 243 : 22, G = R, B = R;        // the site's own white (#f3f3f3) and black (#161616)
    const paint = (src) => {
      try {
        sx.drawImage(src, 0, 0, W, H);
        const frame = sx.getImageData(0, 0, W, H);
        const px = frame.data;
        for (let i = 0; i < px.length; i += 4) {
          const a = (px[i] - 20) * 1.085;          // 20 = the clip's ink, 255 = its white
          px[i] = R; px[i + 1] = G; px[i + 2] = B;
          px[i + 3] = a <= 0 ? 0 : a >= 255 ? 255 : a;
        }
        ctx.putImageData(frame, 0, 0);
      } catch (e) { /* the frame is not decoded yet */ }
    };
    const v = doc.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.disablePictureInPicture = true;
    holder.append(canvas, v);
    let frame = 0;
    const draw = () => {
      paint(v);
      if (!v.paused && !v.ended && !opened) frame = requestAnimationFrame(draw);
    };
    const still = () => {                     // autoplay refused or the clip failed: the finished name, wiped in
      if (opened || holder.classList.contains('is-still')) return;
      cancelAnimationFrame(frame);
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { paint(im); holder.classList.add('is-still'); setTimeout(open, 1300); };
      im.src = holder.dataset.still || '';
    };
    v.addEventListener('playing', () => { cancelAnimationFrame(frame); draw(); });
    v.addEventListener('ended', () => { draw(); setTimeout(open, 120); }, { once: true });
    v.addEventListener('timeupdate', () => { if (v.duration && v.currentTime > 3.15) setTimeout(open, 120); });
    v.addEventListener('error', still, { once: true });
    /* the opening is brisk: the clip writes at twice its pace here (the hero keeps the clip's own) */
    const RATE = 2;
    v.defaultPlaybackRate = RATE;
    v.addEventListener('loadedmetadata', () => { v.playbackRate = RATE; });
    v.src = holder.dataset.src || '';
    v.playbackRate = RATE;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(still);
    setTimeout(() => { if (v.paused || v.readyState < 2) still(); }, 800);
  }
  raf2(() => el.classList.add('is-on'));
  el.addEventListener('pointerdown', open, { once: true });
  addEventListener('keydown', open, { once: true });
  setTimeout(open, 3000);                     // never longer than the written name
})();

/* ═════ part: evidence ═════ */
/* film part — 8b. EVIDENCE, NOT ADJECTIVES (the sheet #evidence)
   Four counted figures, each with a strip of REAL work and a link to its place; the
   practice timeline; the seven languages as working buttons. */
(() => {
  'use strict';
  const F = window.__bqFilm;
  if (!F) return;
  const { doc, still, raf2, lang, onceVisible, rollNumber } = F;
  const sec = doc.getElementById('evidence');
  if (!sec) return;

  const viz = (key) => sec.querySelector(`.film-ev-fig[data-ev="${key}"] .film-ev-viz`);
  const fill = (box, n, each) => {
    for (let k = 0; k < n; k++) {
      const el = doc.createElement('i');
      el.style.setProperty('--k', String(k));
      if (each) each(el, k);
      box.append(el);
    }
  };
  /* the abstract marks are only the fallback when the real work cannot be read */
  const abstract = (key, box) => {
    if (key === 'clients') fill(box, 25);
    else if (key === 'logos') fill(box, 20);
    else if (key === 'books') fill(box, 50, (el, k) => el.style.setProperty('--h', `${56 + ((k * 37 + (k % 5) * 23) % 45)}%`));
    else fill(box, 36);
  };
  const tiles = (key, srcs) => {
    const box = viz(key);
    if (!box || box.childElementCount) return;
    if (!srcs.length) { abstract(key, box); return; }
    srcs.forEach((src, k) => {
      const im = doc.createElement('img');
      im.alt = ''; im.decoding = 'async'; im.loading = 'lazy'; im.src = src;
      im.style.setProperty('--k', String(k));
      box.append(im);
    });
  };
  /* real works per discipline, read from the gallery manifest */
  const works = async () => {
    let byFolder = null;
    try {
      const m = await F.getManifest();
      byFolder = new Map();
      for (const item of (Array.isArray(m.images) ? m.images : [])) {
        const folder = String(item.path || '').split('/')[0];
        if (!byFolder.has(folder)) byFolder.set(folder, []);
        byFolder.get(folder).push(item);
      }
    } catch (e) { byFolder = null; }
    const pick = (key, n) => {
      const group = (F.GROUPS || []).find((g) => g[0] === key);
      const items = byFolder && group ? group[1].flatMap((f) => byFolder.get(f) || []) : [];
      return items.slice(0, n).map((it) => `/${String(F.thumbOf(it)).replace(/^\/+/, '')}`);
    };
    const heads = byFolder ? (F.GROUPS || []).map((g) => pick(g[0], 1)[0]).filter(Boolean) : [];
    tiles('designs', heads.slice(0, 12));
    tiles('logos', pick('logo', 8));
    tiles('books', pick('book', 10));
    /* the client marks are the ones the "worked with" sheet shows (it carries their dark variants) */
    const grid = doc.querySelector('#clients .logos-grid--clients');
    const marks = () => (grid ? [...grid.querySelectorAll('img')] : []).map((im) => im.currentSrc || im.src || im.dataset.src || '').filter(Boolean);
    tiles('clients', marks().slice(0, 10));
    if (grid && !marks().length && typeof MutationObserver === 'function') {
      /* the grid is filled a little later: swap the tally for the real marks when it is */
      const mo = new MutationObserver(() => {
        const found = marks();
        if (!found.length) return;
        mo.disconnect();
        const box = viz('clients');
        if (box) { box.textContent = ''; tiles('clients', found.slice(0, 10)); }
      });
      mo.observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    }
  };

  /* a figure opens its place: a portfolio tab, the portfolio itself, or the clients sheet */
  const jump = (el) => {
    if (!el) return false;
    if (typeof window.__bqScrollPaperTarget === 'function') window.__bqScrollPaperTarget(el);
    else el.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'start' });
    return true;
  };
  sec.querySelectorAll('[data-ev-go]').forEach((a) => {
    const key = a.dataset.evGo;
    const tab = key === 'logos' ? 'logo' : key === 'books' ? 'book' : null;
    if (tab) {
      const sync = () => { const l = lang(); a.href = `${l && l !== 'en' ? `/${l}` : ''}/design/${tab}`; };
      sync();
      doc.addEventListener('bq:language', sync);
    }
    a.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (tab) {
        const btn = doc.querySelector(`#design .tab[data-filter="${tab}"]`);
        const sheet = doc.getElementById('design-work');
        if (!btn || !sheet) return;              // let the link navigate
        e.preventDefault();
        btn.click();
        jump(sheet);
      } else if (jump(doc.getElementById(key === 'clients' ? 'clients' : 'design-work'))) {
        e.preventDefault();
      }
    });
  });

  /* the seven languages */
  const pills = [...sec.querySelectorAll('[data-film-lang]')];
  const mark = () => pills.forEach((p) => p.setAttribute('aria-current', String(p.dataset.filmLang === lang())));
  pills.forEach((p) => p.addEventListener('click', () => {
    const opt = doc.querySelector(`.lang-opt[data-lang="${p.dataset.filmLang}"]`);
    if (opt) opt.click();
  }));
  doc.addEventListener('bq:language', mark);
  mark();

  onceVisible(sec, () => {
    works().finally(() => raf2(() => sec.classList.add('is-in')));
    sec.querySelectorAll('[data-ev-to]').forEach((b, i) => {
      if (b.firstChild && b.firstChild.nodeType === 3) rollNumber(b.firstChild, Number(b.dataset.evTo), 200 + i * 140, 1100);
    });
  }, 0.3);
})();

/* ═════ part: menu ═════ */
/* film part — 9. THE FIVE ROOMS (the menu curtain, #mobileMenu) */
(() => {
  'use strict';
  const F = window.__bqFilm;
  if (!F) return;
  const { doc, root, still, raf2, lang, onceVisible } = F;

})();

/* ═════ part: route ═════ */
/* film part — 12. THE ROOM SWITCH (a new room opens like the window)
   The router (main.js showRoom) swaps the room and dispatches "bq:route" in the same task,
   so covering the page here — before the next paint — hides the swap; the shutters then
   part on the new room's cut. Never with reduced motion; never over the opening itself. */
(() => {
  'use strict';
  const F = window.__bqFilm;
  if (!F) return;
  const { doc, root, still } = F;
  let room = root.dataset.room || doc.body.dataset.room || null;
  let node = null, timer = 0;

  /* the cut line of the room's first sheet, in px (the home hero cuts higher on phones) */
  const cutLine = () => {
    const sheet = room && doc.querySelector(`#${room} > .paper-sheet`);
    if (!sheet) return null;
    const r = sheet.getBoundingClientRect();
    if (!(r.height > 0)) return null;
    const pct = room === 'design' ? (parseFloat(getComputedStyle(root).getPropertyValue('--film-cut')) || 61.8) : 61.8;
    return Math.round(r.top + r.height * pct / 100);
  };
  const place = () => {
    const y = cutLine();
    if (node && y !== null) node.style.setProperty('--film-window-cut', `${y}px`);
  };

  doc.addEventListener('bq:route', (e) => {
    const next = e.detail && e.detail.room;
    if (!next) return;
    if (room === null || next === room) { room = next; return; }   // first paint, or a tab change inside a room
    room = next;
    if (still() || root.classList.contains('film-splashing')) return;
    clearTimeout(timer);
    if (node) node.remove();
    const mine = doc.createElement('div');
    mine.className = 'film-window';
    mine.setAttribute('aria-hidden', 'true');
    mine.append(doc.createElement('b'), doc.createElement('b'));
    node = mine;
    place();
    doc.body.append(mine);
    void mine.offsetWidth;                     // commit the closed state before anything is painted
    /* a menu that was open finishes closing under cover */
    const hold = doc.body.matches('.menu-open, .menu-revealed, .menu-closing') ? 560 : 70;
    timer = setTimeout(() => {
      place();
      mine.classList.add('is-open');
      timer = setTimeout(() => { mine.remove(); if (node === mine) node = null; }, 900);
    }, hold);
  });
})();

/* ═════ part: work-head ═════ */
/* film part — the portfolio's tab buttons carry no band; once the gallery has slid under
   them (phones and tablets) the sheet is marked so their labels can step back. */
(() => {
  'use strict';
  const F = window.__bqFilm;
  if (!F) return;
  const track = F.doc.querySelector('#design > .section.work');
  if (!track) return;
  let frame = 0, under = false;
  const check = () => {
    frame = 0;
    const card = track.querySelector(':scope > .paper-scroll');
    if (!card) return;
    /* the pinned card's travel along its tall track = how far the reel has moved */
    const now = card.getBoundingClientRect().top - track.getBoundingClientRect().top > 12;
    if (now !== under) { under = now; track.classList.toggle('film-work-under', now); }
  };
  addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(check); }, { passive: true });
  check();
})();

