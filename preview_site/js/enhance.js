/* =========================================================
   Barakat Qurtas — enhance.js
   Splash · scroll-progress · go-to-top · rail room cards ·
   hero discipline cards · name portrait · logo hovers ·
   chatbot · secret studio dashboard
   ========================================================= */
(function () {
  'use strict';
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const CDN = (window.BQ_GALLERY && window.BQ_GALLERY.CDN_BASE) || '';

  /* Language-change dispatcher — modules push callbacks to re-render
     their JS-generated content (marquee, blog, chatbot) on language switch. */
  window.__bqLangCb = window.__bqLangCb || [];
  window.__bqOnLang = function (lang, dict) {
    window.__bqLangCb.forEach(function (fn) { try { fn(lang, dict); } catch (e) {} });
  };

  /* =======================================================
     1 · SPLASH
     ======================================================= */
  (function splash() {
    const splash = $('#splash');
    if (!splash) return;
    const fill = $('#splashFill');
    const pct  = $('#splashPct');
    const start = performance.now();
    const DUR = 900;

    const tick = (now) => {
      const t = Math.min((now - start) / DUR, 1);
      const eased = 1 - Math.pow(1 - t, 2);
      const v = Math.round(eased * 100);
      if (fill) fill.style.width = v + '%';
      if (pct)  pct.textContent = String(v).padStart(2, '0');
      if (t < 1) requestAnimationFrame(tick);
      else finish();
    };
    const finish = () => {
      splash.classList.add('is-done');
      setTimeout(() => { splash.style.display = 'none'; }, 1100);
    };
    requestAnimationFrame(tick);
    splash.addEventListener('click', () => { splash.classList.add('is-done'); setTimeout(() => splash.style.display = 'none', 900); });
  })();

  /* =======================================================
     2 · SCROLL PROGRESS + GO TO TOP
     ======================================================= */
  (function scrollProgress() {
    const railFill = $('#railProgress');
    const toTop    = $('#toTop');
    const ring     = $('#toTopProg');
    const C = 2 * Math.PI * 20;            // circumference of r=20
    if (ring) { ring.style.strokeDasharray = C; ring.style.strokeDashoffset = C; }

    const onScroll = () => {
      const h = document.documentElement;
      const max = (h.scrollHeight - h.clientHeight) || 1;
      const p = Math.min(Math.max(h.scrollTop / max, 0), 1);
      if (railFill) railFill.style.height = (p * 100) + '%';
      if (ring) ring.style.strokeDashoffset = C * (1 - p);
      /* hidden at the very top of the page; shown once you've scrolled down
         (and it STAYS shown until you go back up) — in every room. */
      if (toTop) toTop.classList.toggle('is-shown', h.scrollTop > 200);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    toTop && toTop.addEventListener('click', () =>
      window.scrollTo({ top: 0, behavior: 'smooth' }));
  })();

  /* =======================================================
     3 · RAIL ROOM HOVER CARDS
     ======================================================= */
  (function railCards() {
    const rail = $('.rail');
    if (!rail) return;
    const ROOMS = {
      design:  { n: '01', name: 'Design', tag: 'Portfolio', count: '700+ works',
                 desc: 'A living catalogue — official editorial, books, logos, posters, photography & video.',
                 icon: 'fa-compass-drafting' },
      blog:    { n: '02', name: 'Blog', tag: 'Journal', count: '6 essays',
                 desc: 'Short notes from the desk on typography, place, and the slow craft of design.',
                 icon: 'fa-feather-pointed' },
      bio:     { n: '03', name: 'Biography', tag: 'About', count: '2014 — now',
                 desc: 'A decade of practice in Hewlêr — experience, education, awards & languages.',
                 icon: 'fa-user-pen' },
      contact: { n: '04', name: 'Contact', tag: 'Enquiries', count: 'Replies in 48h',
                 desc: 'Pitch a project in one careful letter. Available for select commissions.',
                 icon: 'fa-paper-plane' },
    };

    const card = document.createElement('div');
    card.className = 'rail-card';
    card.innerHTML = `
      <span class="rail-card-n" id="rcN"></span>
      <div class="rail-card-body">
        <span class="mono rail-card-tag" id="rcTag"></span>
        <h4 class="rail-card-title" id="rcTitle"></h4>
        <p class="rail-card-desc" id="rcDesc"></p>
        <span class="mono rail-card-count" id="rcCount"></span>
      </div>
      <i class="fa-solid rail-card-icon" id="rcIcon" aria-hidden="true"></i>`;
    document.body.appendChild(card);

    const rcLang = () => document.documentElement.dataset.lang || 'en';
    const trFor  = (route) => (window.ROOMCARD_I18N && window.ROOMCARD_I18N[rcLang()] && window.ROOMCARD_I18N[rcLang()][route]) || null;
    let hideT;
    const show = (link) => {
      const route = link.dataset.route;
      const r = ROOMS[route];
      if (!r) return;
      clearTimeout(hideT);
      const tr = trFor(route);
      const nm = (window.BQ_DICT && window.BQ_DICT['nav.' + route]) || r.name;
      $('#rcN', card).textContent = r.n;
      $('#rcTag', card).textContent = (tr && tr.tag) || r.tag;
      $('#rcTitle', card).textContent = nm;
      $('#rcDesc', card).textContent = (tr && tr.desc) || r.desc;
      $('#rcCount', card).textContent = (tr && tr.count) || r.count;
      $('#rcIcon', card).className = `fa-solid ${r.icon} rail-card-icon`;
      const b = link.getBoundingClientRect();
      card.style.top = Math.max(16, Math.min(b.top + b.height / 2, window.innerHeight - 120)) + 'px';
      card.classList.add('is-shown');
    };
    const hide = () => { hideT = setTimeout(() => card.classList.remove('is-shown'), 120); };

    $$('.rail-link').forEach(link => {
      if (!link.dataset.route) return;
      link.addEventListener('mouseenter', () => show(link));
      link.addEventListener('mouseleave', hide);
    });
    card.addEventListener('mouseenter', () => clearTimeout(hideT));
    card.addEventListener('mouseleave', hide);
  })();

  /* Pencemor "View the work" → jump to the gallery */
  $('#pencemorViewWork')?.addEventListener('click', () => {
    const head = document.querySelector('#design .section.work .section-head') || document.getElementById('grid');
    head?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* =======================================================
     3a · PROFILE CARD — hover the Bq logo
     ======================================================= */
  (function profileCard() {
    const logo = $('#railLogo'), card = $('#profileCard');
    if (!logo || !card) return;
    let t;
    const show = () => { clearTimeout(t); card.classList.add('is-shown'); card.setAttribute('aria-hidden', 'false'); };
    const hide = () => { clearTimeout(t); t = setTimeout(() => { card.classList.remove('is-shown'); card.setAttribute('aria-hidden', 'true'); }, 260); };
    logo.addEventListener('mouseenter', show);
    logo.addEventListener('mouseleave', hide);
    card.addEventListener('mouseenter', show);
    card.addEventListener('mouseleave', hide);
  })();

  /* =======================================================
     4 · HERO — discipline cards + name portrait
     ======================================================= */
  (function heroInteract() {
    const COL = (window.BQ_GALLERY && window.BQ_GALLERY.COLLECTIONS) || {};
    const cnt = (k) => (COL[k] && COL[k].count) || 0;

    /* cursor-following preview — supports an album (3 photos) or a round portrait */
    const float = document.createElement('div');
    float.className = 'hero-float';
    float.innerHTML = `
      <div class="hf-album">
        <img class="hf-a hf-a3" alt=""><img class="hf-a hf-a2" alt=""><img class="hf-a hf-a1" alt="">
      </div>
      <div class="hf-portrait"><img alt="Barakat Qurtas"/><span class="hf-portrait-ring"></span></div>
      <div class="hf-meta">
        <span class="hf-title"></span>
        <span class="hf-sub mono"></span>
        <span class="hf-go mono">View section <i class="fa-solid fa-arrow-right"></i></span>
      </div>`;
    document.body.appendChild(float);
    const album = $$('.hf-a', float);
    const portraitImg = $('.hf-portrait img', float);
    const hfTitle = $('.hf-title', float), hfSub = $('.hf-sub', float);

    let raf;
    const move = (e) => {
      cancelAnimationFrame(raf);
      const x = e.clientX, y = e.clientY;
      raf = requestAnimationFrame(() => { float.style.left = x + 'px'; float.style.top = y + 'px'; });
    };

    /* discipline → tab + 3-image album + meta */
    const DISC = {
      'Brand Identity': { tab: 'logo',     count: cnt('logo') + cnt('tickerlogo'),
        imgs: [`${CDN}/LogoDesign/Logo3.webp`, `${CDN}/LogoDesign/Logo14.webp`, `${CDN}/LogoDesign/Logo19.webp`] },
      'Editorial':      { tab: 'official',  count: cnt('official'),
        imgs: [`${CDN}/Official/Official7.webp`, `${CDN}/Official/Official94.webp`, `${CDN}/Official/Official132.webp`] },
      'Posters':        { tab: 'posters',   count: cnt('posters'),
        imgs: [`${CDN}/Poster/Poster6.webp`, `${CDN}/Poster/Poster14.webp`, `${CDN}/Poster/Poster7.webp`] },
      'Book Design':    { tab: 'book',      count: cnt('book'),
        imgs: [`${CDN}/Book/BookCover1.webp`, `${CDN}/Book/BookCover28.webp`, `${CDN}/Book/BookCover45.webp`] },
      'Video':          { tab: 'video',     count: cnt('video'),
        imgs: [`${CDN}/GeneralDesign/GDesign1.webp`, `${CDN}/GeneralDesign/GDesign17.webp`, `${CDN}/GeneralDesign/GDesign40.webp`] },
    };

    const goToSection = (tab) => {
      const t = document.querySelector(`.tab[data-filter="${tab}"]`);
      if (!t) return;
      t.click();
      /* scroll so the section header (title + info) is visible, not just images */
      const head = document.getElementById('tabHeader') || document.getElementById('grid');
      head?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    /* ---- Build a truly seamless marquee ----
       Each of the two halves is filled with enough repeats of the 5
       disciplines to exceed the container width, so translateX(-50%)
       always lands on identical content — no stop, no gap, no jump. */
    const track = $('.hero-marquee-track');
    const wrap  = $('.hero-marquee');
    const DISC_ORDER = ['Brand Identity', 'Editorial', 'Posters', 'Book Design', 'Video'];
    const ICONS = { 'Brand Identity': 'fa-pen-nib', 'Editorial': 'fa-newspaper', 'Posters': 'fa-image', 'Book Design': 'fa-book', 'Video': 'fa-video' };
    const DISC_KEY = { 'Brand Identity':'disc.brand','Editorial':'disc.editorial','Posters':'disc.posters','Book Design':'disc.book','Video':'disc.video' };
    const discLabel = (d) => (window.BQ_DICT && window.BQ_DICT[DISC_KEY[d]]) || d;
    const buildMarquee = () => {
      if (!track || !wrap) return;
      const unit = DISC_ORDER.map(d =>
        `<span class="hero-disc" data-disc="${d}"><i class="fa-solid ${ICONS[d]}"></i> ${discLabel(d)}</span><span class="hero-sep">✦</span>`
      ).join('');
      track.innerHTML = unit;                              // measure one set
      const setW = track.scrollWidth || 900;
      const reps = Math.max(2, Math.ceil((wrap.clientWidth * 1.25) / setW));
      const half = unit.repeat(reps);
      track.innerHTML = half + half;                       // two identical halves
      /* constant speed (~55px/s) no matter how many copies */
      const halfW = track.scrollWidth / 2;
      track.style.animationDuration = Math.max(18, halfW / 55).toFixed(1) + 's';
    };
    buildMarquee();
    window.__bqLangCb.push(() => buildMarquee());
    let rb; window.addEventListener('resize', () => { clearTimeout(rb); rb = setTimeout(buildMarquee, 250); });

    /* delegated discipline hover (survives marquee rebuild) */
    let curDisc = null;
    const showAlbum = (item) => {
      const info = DISC[item.dataset.disc];
      if (!info) return;
      curDisc = item;
      info.imgs.forEach((src, i) => { if (album[i]) album[i].src = src; });
      hfTitle.textContent = discLabel(item.dataset.disc);
      const albumT = (window.BQ_DICT && window.BQ_DICT['float.album']) || '{n} works · click to open';
      hfSub.textContent = albumT.replace('{n}', info.count);
      float.classList.remove('is-portrait');
      float.classList.add('is-shown', 'is-album');
    };
    if (track) {
      track.addEventListener('mouseover', (e) => {
        const item = e.target.closest('[data-disc]');
        if (item && item !== curDisc) showAlbum(item);
      });
      track.addEventListener('mousemove', move);
      track.addEventListener('mouseout', (e) => {
        if (!e.relatedTarget || !track.contains(e.relatedTarget)) {
          curDisc = null; float.classList.remove('is-shown', 'is-album');
        }
      });
      track.addEventListener('click', (e) => {
        const item = e.target.closest('[data-disc]');
        if (item) goToSection(DISC[item.dataset.disc].tab);
      });
    }

    /* name → round portrait — only over the actual letters */
    $$('.hero-name').forEach(name => {
      name.addEventListener('mouseenter', () => {
        portraitImg.src = 'assets/portrait.webp';
        hfTitle.textContent = 'Barakat Qurtas';
        hfSub.textContent = (window.BQ_DICT && window.BQ_DICT['float.designer']) || 'Designer · Hewlêr';
        float.classList.remove('is-album');
        float.classList.add('is-shown', 'is-portrait');
      });
      name.addEventListener('mousemove', move);
      name.addEventListener('mouseleave', () => float.classList.remove('is-shown', 'is-portrait'));
    });
  })();

  /* =======================================================
     5 · LOGO SECTIONS — grow on hover
     ======================================================= */
  (function logoHovers() {
    /* Worked-with marquee: enlarge the hovered logo, scale toward cursor */
    const track = $('.logo-marquee-track');
    if (track) {
      track.addEventListener('mousemove', (e) => {
        const chip = e.target.closest('.logo-chip--img');
        if (!chip) return;
        const r = chip.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        chip.style.setProperty('--tilt', `${(-dy * 6).toFixed(2)}deg ${(dx * 6).toFixed(2)}deg`);
      });
    }
    /* Designed-by-hand: clicking a logo jumps to the Logo tab */
    const grid = $('.logos-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        if (!e.target.closest('.logo-mark')) return;
        const t = document.querySelector('.tab[data-filter="logo"]');
        if (t) { t.click(); document.getElementById('grid')?.scrollIntoView({ behavior: 'smooth' }); }
      });
    }
  })();

  /* =======================================================
     5b · FLYOUT INTENT — keep language/social menus open
     for a grace period after the mouse leaves
     ======================================================= */
  (function flyoutIntent() {
    const GRACE = 420; // ms — just enough to move the cursor across the gap
    $$('.lang-hover, .social-hover').forEach(wrap => {
      let t;
      const openIt  = () => { clearTimeout(t); wrap.classList.add('is-hovering'); };
      const closeIt = () => { clearTimeout(t); t = setTimeout(() => wrap.classList.remove('is-hovering'), GRACE); };
      wrap.addEventListener('mouseenter', openIt);
      wrap.addEventListener('mouseleave', closeIt);
      wrap.addEventListener('focusin', openIt);
      wrap.addEventListener('focusout', closeIt);
    });
  })();

  /* =======================================================
     5c · TAB HOVER CARDS — info card per portfolio tab (no image)
     ======================================================= */
  (function tabCards() {
    const tabs = $$('.tab');
    if (!tabs.length) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;  // hover only

    const INFO = {
      all:      { tag: 'Full catalogue',         desc: 'Every discipline gathered in one place — the complete body of work.' },
      official: { tag: 'Government · Editorial',  desc: 'Editorial design for the Kurdistan Region Presidency & Media Affairs.' },
      book:     { tag: 'Print · Covers',          desc: 'Book covers — typography, illustration, and print composition.' },
      image:    { tag: 'Photography',             desc: 'Photo editing, composites, and editorial retouching.' },
      logo:     { tag: 'Brand identity',          desc: 'Logos, wordmarks, and visual identities drawn by hand.' },
      posters:  { tag: 'Print',                   desc: 'Cultural, political, and typographic poster series.' },
      social:   { tag: 'Digital',                 desc: 'Social campaigns, grids, and digital storytelling.' },
      events:   { tag: 'Identity',                desc: 'Ceremony materials, banners, and event identity design.' },
      stationery: { tag: 'Stationery',            desc: 'Business cards, letterheads, invoices & receipts — the quiet system behind a brand.' },
      video:    { tag: 'Motion',                  desc: 'Documentary edits, motion reels, and media coverage.' },
      other:    { tag: 'Miscellany',              desc: 'Flex banners, type experiments, and the small things.' },
      ai:       { tag: 'AI · Experiments',        desc: 'AI-assisted posters, video, and visual experiments. Coming soon.' },
    };

    /* work counts per category from the gallery config */
    const COLL = (window.BQ_GALLERY && window.BQ_GALLERY.COLLECTIONS) || {};
    const catCount = {};
    Object.values(COLL).forEach(c => { const k = c.cat || ''; catCount[k] = (catCount[k] || 0) + (c.count || 0); });
    const total = Object.values(catCount).reduce((a, b) => a + b, 0);
    const countFor = (f) => f === 'all' ? total : (catCount[f] || 0);

    const card = document.createElement('div');
    card.className = 'tab-card';
    card.innerHTML = `
      <span class="tab-card-n" id="tcN"></span>
      <span class="mono tab-card-tag" id="tcTag"></span>
      <h4 class="tab-card-title" id="tcTitle"></h4>
      <p class="tab-card-desc" id="tcDesc"></p>
      <span class="mono tab-card-count" id="tcCount"></span>`;
    document.body.appendChild(card);

    const tcLang = () => document.documentElement.dataset.lang || 'en';
    const infoFor = (f) => (window.TABCARD_I18N && window.TABCARD_I18N[tcLang()] && window.TABCARD_I18N[tcLang()][f]) || INFO[f];

    let hideT;
    const show = (tab) => {
      const f = tab.dataset.filter;
      const info = infoFor(f); if (!info) return;
      clearTimeout(hideT);
      const name = (tab.querySelector('.tab-label')?.textContent || f).trim();
      const count = countFor(f);
      const worksT = (window.BQ_DICT && window.BQ_DICT['tab.works']) || '{n} works · click to filter';
      $('#tcTag', card).textContent = info.tag;
      $('#tcTitle', card).textContent = name;
      $('#tcDesc', card).textContent = info.desc;
      $('#tcN', card).textContent = count || '';
      $('#tcCount', card).innerHTML = `<i class="fa-solid fa-layer-group"></i> ${worksT.replace('{n}', count)}`;

      /* position below the tab, clamped to the viewport, flip up if needed */
      card.style.visibility = 'hidden'; card.classList.add('is-shown');
      const cw = card.offsetWidth, ch = card.offsetHeight;
      const b = tab.getBoundingClientRect();
      let left = b.left + b.width / 2 - cw / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - cw - 12));
      let top = b.bottom + 12;
      if (top + ch > window.innerHeight - 12) top = b.top - ch - 12;
      card.style.left = left + 'px';
      card.style.top = top + 'px';
      card.style.visibility = '';
    };
    const hide = () => { hideT = setTimeout(() => card.classList.remove('is-shown'), 100); };

    tabs.forEach(tab => {
      tab.addEventListener('mouseenter', () => show(tab));
      tab.addEventListener('mouseleave', hide);
      tab.addEventListener('click', () => card.classList.remove('is-shown'));
    });
    card.addEventListener('mouseenter', () => clearTimeout(hideT));
    card.addEventListener('mouseleave', hide);
  })();

  /* =======================================================
     6 · CHATBOT
     ======================================================= */
  (function chatbot() {
    const triggers = [$('#railChat'), $('#railChatM')].filter(Boolean);
    const panel = $('#chat'), body = $('#chatBody');
    const form = $('#chatForm'), input = $('#chatText'), quick = $('#chatQuick'), min = $('#chatMin');
    if (!triggers.length || !panel) return;

    const KB = [
      { k: ['service','services','what do you do','offer','do you'],
        a: "I offer <b>brand identity & logo design</b>, <b>editorial & book covers</b>, <b>posters</b>, <b>social media</b>, <b>print & invoices</b>, and <b>video editing</b>. Want to see a category? Try the tabs in the Design room." },
      { k: ['price','pricing','cost','how much','budget','rate'],
        a: "Pricing depends on scope. Rough starting points:<br>• <b>Logo / mark</b> — from $300<br>• <b>Brand identity</b> — from $900<br>• <b>Book cover</b> — from $250<br>• <b>Poster</b> — from $150<br>For an exact quote, send a brief via the Contact room." },
      { k: ['time','timeline','how long','deadline','fast','urgent'],
        a: "Typical timelines: a logo in <b>1–2 weeks</b>, a full identity in <b>3–5 weeks</b>, a book cover in <b>1 week</b>. Rush work is possible — tell me your deadline." },
      { k: ['contact','reach','email','phone','whatsapp','hire','start'],
        a: "Easiest ways to reach Barakat:<br>• ✉️ <a href='mailto:info@bqurtas.com'>info@bqurtas.com</a><br>• 📱 <a href='https://wa.me/9647517884985' target='_blank' rel='noopener'>WhatsApp +964 751 788 4985</a><br>Or open the <b>Contact</b> room and send a pitch." },
      { k: ['who','about','experience','barakat','you'],
        a: "Barakat Qurtas is an independent graphic designer in <b>Erbil, Kurdistan</b>, working since <b>2014</b> — currently with the Directorate of Media Affairs at the Office of the President. 1000+ works across print & digital." },
      { k: ['language','languages','speak'],
        a: "Barakat works in <b>Kurdish (Sorani & Kurmancî)</b>, <b>Arabic</b>, <b>English</b>, and some <b>French</b>." },
      { k: ['book','cover'], a: "Book covers are a specialty — 99 covers and counting. Open the <b>Book</b> tab in the Design room to browse them." },
      { k: ['logo','brand','identity'], a: "Logos & identities are my favourite work. See the <b>Logo</b> tab, or the “Designed by hand” marks on the home page." },
      { k: ['official','government','presidency'], a: "I create official editorial for the Kurdistan Region Presidency — see the <b>Official</b> tab (168 works)." },
      { k: ['hi','hello','hey','salam','silav','سڵاو','hái'], a: "Hello! 👋 I'm Barakat's studio assistant. Ask me about services, pricing, timelines, or how to start a project." },
      { k: ['thanks','thank you','thx','سوپاس'], a: "You're welcome! Anything else you'd like to know? 🙂" },
    ];
    const FALLBACK = "I'm not sure about that one — but Barakat can help directly. Try the <b>Contact</b> room, or ask me about <i>services, pricing, timelines, or languages</i>.";

    /* language-aware knowledge base */
    const chatTr = () => (window.CHAT_I18N && window.CHAT_I18N[document.documentElement.dataset.lang || 'en']) || null;
    const getKB = () => { const t = chatTr(); return (t && t.kb) || KB; };
    const getFallback = () => { const t = chatTr(); return (t && t.fallback) || FALLBACK; };
    const getGreet = () => { const t = chatTr(); return (t && t.greet) || "Hi! 👋 I'm the studio assistant. How can I help — <b>services</b>, <b>pricing</b>, or starting a <b>project</b>?"; };
    const reply = (msg) => {
      const m = msg.toLowerCase();
      let best = null, score = 0;
      // Search EVERY language's KB (current UI language first) so a question
      // asked in any language is answered, whatever language the site is in.
      const C = window.CHAT_I18N || {};
      const cur = document.documentElement.dataset.lang || 'en';
      const langs = [cur].concat(Object.keys(C).filter(l => l !== cur));
      const kbs = langs.map(l => C[l] && C[l].kb).filter(Boolean);
      (kbs.length ? kbs : [getKB()]).forEach(kb => kb.forEach(item => {
        const s = item.k.reduce((acc, kw) => acc + (m.includes(kw.toLowerCase()) ? kw.length : 0), 0);
        if (s > score) { score = s; best = item; }
      }));
      return best ? best.a : getFallback();
    };

    /* conversation is archived on the device (and follows the user to desktop) */
    const HKEY = 'bq_chat_history';
    const persist = () => {
      try {
        const msgs = Array.from(body.querySelectorAll('.chat-msg:not(.is-typing)'))
          .map(el => ({ who: el.classList.contains('chat-msg--me') ? 'me' : 'bot', html: el.innerHTML }));
        localStorage.setItem(HKEY, JSON.stringify(msgs.slice(-100)));
      } catch (e) {}
    };
    const add = (who, html, noPersist) => {
      const el = document.createElement('div');
      el.className = `chat-msg chat-msg--${who}`;
      el.innerHTML = html;
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
      if (!noPersist) persist();
      return el;
    };
    const restore = () => {
      let msgs = [];
      try { msgs = JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch (e) {}
      msgs.forEach(m => add(m.who, m.html, true));
      return msgs.length > 0;
    };
    const typing = () => {
      const el = add('bot', '<span class="chat-typing"><i></i><i></i><i></i></span>', true);
      el.classList.add('is-typing');
      return el;
    };
    const botReply = (msg) => {
      const t = typing();
      setTimeout(() => {
        t.classList.remove('is-typing');
        t.innerHTML = reply(msg);
        body.scrollTop = body.scrollHeight;
        persist();
      }, 550 + Math.random() * 400);
    };

    const QUICK = [
      { label: 'Services', q: 'services' }, { label: 'Pricing', q: 'pricing' },
      { label: 'Timeline', q: 'timeline' }, { label: 'Contact', q: 'contact' }
    ];
    const getQuick = () => { const t = chatTr(); return (t && t.quick) || QUICK; };
    const buildQuick = () => {
      quick.innerHTML = '';
      getQuick().forEach(item => {
        const b = document.createElement('button');
        b.className = 'chat-chip'; b.textContent = item.label;
        b.addEventListener('click', () => send(item.q || item.label, item.label));
        quick.appendChild(b);
      });
    };

    const send = (text, display) => {
      add('me', (display || text).replace(/</g, '&lt;'));
      botReply(text);
    };

    let greeted = false;
    const backdrop = $('#chatBackdrop');
    const open = () => {
      panel.classList.add('is-open');
      backdrop && backdrop.classList.add('is-open');
      triggers.forEach(t => t.classList.add('is-active'));
      panel.setAttribute('aria-hidden', 'false');
      if (!greeted) {
        greeted = true;
        const hadHistory = restore();
        if (!hadHistory) setTimeout(() => add('bot', getGreet()), 250);
        buildQuick();
      }
      setTimeout(() => input.focus(), 300);
    };
    const close = () => {
      panel.classList.remove('is-open');
      backdrop && backdrop.classList.remove('is-open');
      triggers.forEach(t => t.classList.remove('is-active'));
      panel.setAttribute('aria-hidden', 'true');
    };
    triggers.forEach(t => t.addEventListener('click', () => panel.classList.contains('is-open') ? close() : open()));
    min && min.addEventListener('click', close);
    backdrop && backdrop.addEventListener('click', close);

    /* mobile: drag the header downward to dismiss the sheet */
    const cHead = panel.querySelector('.chat-head');
    if (cHead) {
      const isMobile = () => window.matchMedia('(max-width: 820px)').matches;
      let sy = null, dy = 0, drag = false;
      const down = (y) => { if (!isMobile()) return; sy = y; dy = 0; drag = true; panel.style.transition = 'none'; };
      const move = (y) => { if (!drag) return; dy = y - sy; if (dy < 0) dy = 0; panel.style.transform = `translateY(${dy}px)`; };
      const up = () => { if (!drag) return; drag = false; sy = null; panel.style.transition = ''; panel.style.transform = ''; if (dy > 80) close(); };
      cHead.addEventListener('touchstart', (e) => down(e.touches[0].clientY), { passive: true });
      cHead.addEventListener('touchmove', (e) => move(e.touches[0].clientY), { passive: true });
      cHead.addEventListener('touchend', up);
      cHead.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') down(e.clientY); });
      window.addEventListener('pointermove', (e) => { if (drag && e.pointerType !== 'touch') move(e.clientY); });
      window.addEventListener('pointerup', () => { if (drag) up(); });
    }
    /* rebuild quick chips in the new language (once) */
    window.__bqLangCb.push(() => { if (greeted) buildQuick(); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (!v) return;
      send(v); input.value = '';
    });
  })();

  /* =======================================================
     7 · SECRET STUDIO DASHBOARD
     ======================================================= */
  /* ---- First-party analytics beacon → /api/hit (cookieless) ---- */
  (function analytics() {
    let first = true;
    function hit() {
      try {
        const data = JSON.stringify({ p: location.pathname, r: first ? document.referrer : '', l: document.documentElement.lang || 'en' });
        first = false;
        if (navigator.sendBeacon) navigator.sendBeacon('/api/hit', data);
        else fetch('/api/hit', { method: 'POST', body: data, keepalive: true }).catch(() => {});
      } catch (e) {}
    }
    hit();
    try {
      const _push = history.pushState;
      history.pushState = function () { const r = _push.apply(this, arguments); setTimeout(hit, 80); return r; };
      window.addEventListener('popstate', () => setTimeout(hit, 80));
    } catch (e) {}
  })();

  (function dashboard() {
    const dash = $('#dash');
    if (!dash) return;
    const KEY = '107502';                   // access code
    const gate = $('#dashGate'), main = $('#dashMain'), view = $('#dashView');
    const hint = $('#dashHint');
    let unlocked = sessionStorage.getItem('bq_dash_ok') === '1';

    /* ---- Dashboard translations (follows the site language) ---- */
    const DASH_I18N = {
      en: { overview:'Overview', visitors:'Visitors', works:'Works', latest:'Latest', leads:'Leads', profile:'Profile', settings:'Settings', content:'Content', assistant:'Assistant',
        gateTitle:'Enter access code', gatePrivate:'This console is private.', gatePh:'Access code', unlock:'Unlock', wrong:'✗ Wrong access code.', twoTitle:'Enter the SMS code', twoNote:'We texted a 6-digit code to your phone.', twoPh:'6-digit code', twoWrong:'✗ Wrong or expired code.', twoSending:'Sending code…', twoSetupBtn:'Set up 2FA (authenticator)', twoSetup1:'1) In Cloudflare set TOTP_SECRET to this (then Retry deployment):', twoSetup2:'2) Add the same key to Google Authenticator (manual entry: "Pencemor Studio"). Tap the key to copy.', twoSetupLink:'open in app',
        oTotal:'Total works', oColl:'Collections', oLeads:'Leads stored', oLangs:'Languages', oWelcome:'Welcome back — your studio console is private to you; data lives in this browser.',
        lEmpty:'No leads yet. Pitches from the Contact form appear here.', lClear:'Clear all leads', lConfirm:'Delete all stored leads?',
        pName:'Name', pTitle:'Title / role', pAvatar:'Avatar URL', pSave:'Save profile', pSaved:'✓ Saved', pNote:'Adding more admins needs a backend login system — that arrives with the content manager. For now this profile is yours, kept privately in this browser.',
        sSplash:'Show intro splash on load', sTheme:'Theme', sLight:'Light', sDark:'Dark', sReset:'Reset saved preferences', sResetConfirm:'Reset saved preferences?', sDone:'Done.', sNote:'Open anytime with ⌘ / Ctrl + B, or 5× click the Bq logo.',
        vConnect:'Connect your analytics', vEnter:'Enter the STATS_TOKEN you set in Cloudflare.', vTokenPh:'Stats token', vConnectBtn:'Connect', vLoading:'Loading visitor data…',
        tAi:'AI', tLang:'Language', tTheme:'Theme', tAddAdmin:'Add admin', tLogout:'Log out', tClose:'Close',
        admYou:'Owner', admName:'Name', admEmail:'Email', admRole:'Role', admAdd:'Add admin', admEmpty:'No additional admins yet.', admRemove:'Remove', admNote:'Shared login across devices needs the backend login system; for now these admins are saved privately in this browser.', logoutAsk:'Log out of the console?' },
      ku: { overview:'گشتی', visitors:'سەردانکەران', works:'کارەکان', latest:'نوێترین', leads:'داواکارییەکان', profile:'پرۆفایل', settings:'ڕێکخستن', content:'ناوەڕۆک', assistant:'یاریدەدەر',
        gateTitle:'کۆدی چوونەژوورەوە بنووسە', gatePrivate:'ئەم کۆنسۆڵە تایبەتە.', gatePh:'کۆدی چوونەژوورەوە', unlock:'کردنەوە', wrong:'✗ کۆدەکە هەڵەیە.', twoTitle:'کۆدی SMS بنووسە', twoNote:'کۆدێکی ٦ ژمارەیی نێردرا بۆ مۆبایلەکەت.', twoPh:'کۆدی ٦ ژمارەیی', twoWrong:'✗ کۆد هەڵەیە یان بەسەرچووە.', twoSending:'ناردنی کۆد…', twoSetupBtn:'ڕێکخستنی 2FA (ئەپی ئۆتێنتیکەیتەر)', twoSetup1:'١) لە Cloudflare، TOTP_SECRET بکە بەمە (پاشان Retry deployment):', twoSetup2:'٢) هەمان کلیل بخە ناو Google Authenticator (داخڵکردنی دەستی: «Pencemor Studio»). کلیک لە کلیلەکە بکە بۆ کۆپی.', twoSetupLink:'لە ئەپ بیکەرەوە',
        oTotal:'کۆی کارەکان', oColl:'کۆکراوەکان', oLeads:'داواکاری هەڵگیراو', oLangs:'زمانەکان', oWelcome:'بەخێربێیتەوە — کۆنسۆڵی ستۆدیۆ تەنها بۆ تۆیە؛ زانیارییەکان لەم وێبگەڕەدا دەمێننەوە.',
        lEmpty:'هێشتا داواکاری نییە. پرۆژەکانی فۆڕمی پەیوەندی لێرە دەردەکەون.', lClear:'سڕینەوەی هەموو داواکارییەکان', lConfirm:'هەموو داواکارییە هەڵگیراوەکان بسڕێتەوە؟',
        pName:'ناو', pTitle:'پلە / ڕۆڵ', pAvatar:'بەستەری وێنە', pSave:'پاشەکەوتکردنی پرۆفایل', pSaved:'✓ پاشەکەوتکرا', pNote:'زیادکردنی ئەدمینی زیاتر پێویستی بە سیستەمی چوونەژوورەوەی سێرڤەر هەیە — لەگەڵ بەڕێوەبەری ناوەڕۆکدا دێت. ئێستا ئەم پرۆفایلە هی تۆیە، بە تایبەتی لەم وێبگەڕەدا پارێزراوە.',
        sSplash:'پیشاندانی سپلاشی دەستپێک', sTheme:'ڕووکار', sLight:'ڕووناک', sDark:'تاریک', sReset:'ڕێکخستنە پاشەکەوتکراوەکان بسڕەوە', sResetConfirm:'ڕێکخستنە پاشەکەوتکراوەکان بسڕێتەوە؟', sDone:'تەواوبوو.', sNote:'هەر کاتێک بە ⌘ / Ctrl + B بیکەرەوە، یان ٥ جار کلیک لە لۆگۆی Bq بکە.',
        vConnect:'ئامارەکانت ببەستەوە', vEnter:'ئەو STATS_TOKENـەی لە Cloudflare دانراوە بنووسە.', vTokenPh:'تۆکنی ئامار', vConnectBtn:'بەستنەوە', vLoading:'بارکردنی زانیاری سەردانکەران…',
        tAi:'AI', tLang:'زمان', tTheme:'ڕووکار', tAddAdmin:'زیادکردنی ئەدمین', tLogout:'چوونەدەرەوە', tClose:'داخستن',
        admYou:'خاوەن', admName:'ناو', admEmail:'ئیمەیل', admRole:'ڕۆڵ', admAdd:'زیادکردنی ئەدمین', admEmpty:'هێشتا ئەدمینی زیاتر نییە.', admRemove:'لابردن', admNote:'چوونەژوورەوەی هاوبەش لەنێوان ئامێرەکان پێویستی بە سیستەمی سێرڤەرە؛ ئێستا ئەم ئەدمینانە بە تایبەتی لەم وێبگەڕەدا هەڵگیراون.', logoutAsk:'لە کۆنسۆڵ بچیتە دەرەوە؟' },
      ar: { overview:'نظرة عامة', visitors:'الزوار', works:'الأعمال', leads:'الطلبات', profile:'الملف', settings:'الإعدادات', content:'المحتوى', assistant:'المساعد',
        gateTitle:'أدخل رمز الدخول', gatePrivate:'هذه اللوحة خاصة.', gatePh:'رمز الدخول', unlock:'فتح', wrong:'✗ رمز خاطئ.', twoTitle:'أدخل رمز الرسالة', twoNote:'أرسلنا رمزاً من ٦ أرقام إلى هاتفك.', twoPh:'رمز من ٦ أرقام', twoWrong:'✗ رمز خاطئ أو منتهٍ.', twoSending:'جار إرسال الرمز…', twoSetupBtn:'إعداد 2FA (تطبيق المصادقة)', twoSetup1:'١) في Cloudflare اضبط TOTP_SECRET على هذا (ثم Retry deployment):', twoSetup2:'٢) أضف نفس المفتاح إلى Google Authenticator (إدخال يدوي: «Pencemor Studio»). انقر المفتاح للنسخ.', twoSetupLink:'افتح في التطبيق',
        oTotal:'إجمالي الأعمال', oColl:'المجموعات', oLeads:'الطلبات المحفوظة', oLangs:'اللغات', oWelcome:'أهلاً بعودتك — لوحة الاستوديو خاصة بك؛ البيانات تبقى في هذا المتصفح.',
        lEmpty:'لا طلبات بعد. تظهر هنا مشاريع نموذج التواصل.', lClear:'مسح كل الطلبات', lConfirm:'حذف كل الطلبات المحفوظة؟',
        pName:'الاسم', pTitle:'اللقب / الدور', pAvatar:'رابط الصورة', pSave:'حفظ الملف', pSaved:'✓ تم الحفظ', pNote:'إضافة مزيد من المشرفين تتطلب نظام تسجيل دخول خلفي — يأتي مع مدير المحتوى. حالياً هذا الملف خاص بك، محفوظ في هذا المتصفح.',
        sSplash:'إظهار شاشة البداية', sTheme:'المظهر', sLight:'فاتح', sDark:'داكن', sReset:'إعادة تعيين التفضيلات', sResetConfirm:'إعادة تعيين التفضيلات المحفوظة؟', sDone:'تم.', sNote:'افتحها في أي وقت بـ ⌘ / Ctrl + B، أو انقر شعار Bq خمس مرات.',
        vConnect:'اربط تحليلاتك', vEnter:'أدخل STATS_TOKEN الذي ضبطته في Cloudflare.', vTokenPh:'رمز الإحصاءات', vConnectBtn:'اتصال', vLoading:'تحميل بيانات الزوار…',
        tAi:'AI', tLang:'اللغة', tTheme:'المظهر', tAddAdmin:'إضافة مشرف', tLogout:'تسجيل الخروج', tClose:'إغلاق',
        admYou:'المالك', admName:'الاسم', admEmail:'البريد', admRole:'الدور', admAdd:'إضافة مشرف', admEmpty:'لا مشرفين إضافيين بعد.', admRemove:'إزالة', admNote:'تسجيل الدخول المشترك بين الأجهزة يحتاج نظام الخادم؛ حالياً هؤلاء المشرفون محفوظون في هذا المتصفح فقط.', logoutAsk:'تسجيل الخروج من اللوحة؟' },
      kmr: { overview:'Giştî', visitors:'Mêvan', works:'Kar', leads:'Daxwaz', profile:'Profîl', settings:'Mîheng', content:'Naverok', assistant:'Alîkar',
        gateTitle:'Koda gihiştinê binivîse', gatePrivate:'Ev konsol taybet e.', gatePh:'Koda gihiştinê', unlock:'Veke', wrong:'✗ Koda çewt.', twoTitle:'Koda SMSê binivîse', twoNote:'Me koda 6-hejmarî şand telefona te.', twoPh:'Koda 6-hejmarî', twoWrong:'✗ Koda çewt an qediyayî.', twoSending:'Kod tê şandin…', twoSetupBtn:'Sazkirina 2FA (sepana erêkirinê)', twoSetup1:'1) Li Cloudflare TOTP_SECRET wiha saz bike (paşê Retry deployment):', twoSetup2:'2) Heman mifte têxe Google Authenticator (têketina destî: "Pencemor Studio"). Li mifte bitikîne ji bo kopî.', twoSetupLink:'di sepanê de veke',
        oTotal:'Tevahiya karan', oColl:'Berhevok', oLeads:'Daxwazên tomarkirî', oLangs:'Ziman', oWelcome:'Bi xêr hatî — konsola studyoyê taybet e ji te re; dane di vê gerokê de dimînin.',
        lEmpty:'Hêj daxwaz tune. Pêşniyarên forma têkiliyê li vir xuya dibin.', lClear:'Hemû daxwazan paqij bike', lConfirm:'Hemû daxwazên tomarkirî werin jêbirin?',
        pName:'Nav', pTitle:'Sernav / rol', pAvatar:'Girêdana wêneyê', pSave:'Profîlê tomar bike', pSaved:'✓ Tomar bû', pNote:'Zêdekirina admînên din pêdivî bi sîstema têketinê ya backend heye — ew bi rêveberê naverokê re tê. Niha ev profîl ya te ye, bi taybetî di vê gerokê de tê parastin.',
        sSplash:'Dîmena destpêkê nîşan bide', sTheme:'Tema', sLight:'Ronî', sDark:'Tarî', sReset:'Vebijarkên tomarkirî jê bibe', sResetConfirm:'Vebijarkên tomarkirî werin jêbirin?', sDone:'Qediya.', sNote:'Her dem bi ⌘ / Ctrl + B veke, an 5 caran li logoya Bq bitikîne.',
        vConnect:'Analîtîkên xwe girêde', vEnter:'STATS_TOKEN ya ku te di Cloudflare de danî binivîse.', vTokenPh:'Tokena statîstîkê', vConnectBtn:'Girêde', vLoading:'Daneyên mêvanan tê barkirin…',
        tAi:'AI', tLang:'Ziman', tTheme:'Tema', tAddAdmin:'Admîn zêde bike', tLogout:'Derkeve', tClose:'Bigire',
        admYou:'Xwedî', admName:'Nav', admEmail:'E-name', admRole:'Rol', admAdd:'Admîn zêde bike', admEmpty:'Hêj admînên din tune.', admRemove:'Rake', admNote:'Têketina hevpar a di navbera amûran de pêdivî bi sîstema backend heye; niha ev admîn bi taybetî di vê gerokê de tên parastin.', logoutAsk:'Ji konsolê derkevî?' },
      fr: { overview:'Aperçu', visitors:'Visiteurs', works:'Travaux', leads:'Demandes', profile:'Profil', settings:'Réglages', content:'Contenu', assistant:'Assistant',
        gateTitle:"Entrez le code d'accès", gatePrivate:'Cette console est privée.', gatePh:"Code d'accès", unlock:'Déverrouiller', wrong:'✗ Code incorrect.', twoTitle:'Entrez le code SMS', twoNote:'Un code à 6 chiffres a été envoyé à votre téléphone.', twoPh:'Code à 6 chiffres', twoWrong:'✗ Code incorrect ou expiré.', twoSending:'Envoi du code…', twoSetupBtn:'Configurer la 2FA (authentification)', twoSetup1:'1) Dans Cloudflare, définissez TOTP_SECRET sur ceci (puis Retry deployment) :', twoSetup2:'2) Ajoutez la même clé à Google Authenticator (saisie manuelle : « Pencemor Studio »). Cliquez la clé pour copier.', twoSetupLink:'ouvrir dans l’app',
        oTotal:'Total des travaux', oColl:'Collections', oLeads:'Demandes enregistrées', oLangs:'Langues', oWelcome:'Bon retour — votre console studio est privée ; les données restent dans ce navigateur.',
        lEmpty:'Aucune demande pour l’instant. Les projets du formulaire de contact apparaissent ici.', lClear:'Effacer toutes les demandes', lConfirm:'Supprimer toutes les demandes enregistrées ?',
        pName:'Nom', pTitle:'Titre / rôle', pAvatar:"URL de l'avatar", pSave:'Enregistrer le profil', pSaved:'✓ Enregistré', pNote:'Ajouter d’autres admins nécessite un système de connexion backend — il arrive avec le gestionnaire de contenu. Pour l’instant ce profil est le vôtre, gardé dans ce navigateur.',
        sSplash:"Afficher l'intro au chargement", sTheme:'Thème', sLight:'Clair', sDark:'Sombre', sReset:'Réinitialiser les préférences', sResetConfirm:'Réinitialiser les préférences enregistrées ?', sDone:'Terminé.', sNote:'Ouvrez à tout moment avec ⌘ / Ctrl + B, ou cliquez 5× sur le logo Bq.',
        vConnect:'Connectez vos analyses', vEnter:'Saisissez le STATS_TOKEN défini dans Cloudflare.', vTokenPh:'Jeton de stats', vConnectBtn:'Connecter', vLoading:'Chargement des données visiteurs…',
        tAi:'IA', tLang:'Langue', tTheme:'Thème', tAddAdmin:'Ajouter admin', tLogout:'Déconnexion', tClose:'Fermer',
        admYou:'Propriétaire', admName:'Nom', admEmail:'E-mail', admRole:'Rôle', admAdd:'Ajouter admin', admEmpty:'Aucun admin supplémentaire.', admRemove:'Retirer', admNote:'Une connexion partagée entre appareils nécessite le système backend ; pour l’instant ces admins sont enregistrés dans ce navigateur.', logoutAsk:'Se déconnecter de la console ?' }
    };
    const curLang = () => { const l = document.documentElement.getAttribute('lang') || document.documentElement.dataset.lang || 'en'; return DASH_I18N[l] ? l : 'en'; };
    const DT = (k) => (DASH_I18N[curLang()][k] ?? DASH_I18N.en[k] ?? k);
    const LANG_LABELS = { en: 'English', ku: 'کوردیی سۆرانی', kmr: 'Kurmancî', ar: 'العربية', fr: 'Français', tr: 'Türkçe', sv: 'Svenska' };
    const curSiteLang = () => document.documentElement.getAttribute('lang') || document.documentElement.dataset.lang || 'en';
    const localizeChrome = () => {
      $$('.dash-tab').forEach(t => { const ic = t.querySelector('i'); t.innerHTML = (ic ? ic.outerHTML + ' ' : '') + DT(t.dataset.dash); });
      const g = $('#dashGate'); if (g) {
        const h = g.querySelector('h3'); if (h) h.textContent = DT('gateTitle');
        const p = g.querySelector('p.mono'); if (p) p.textContent = DT('gatePrivate');
        const k = $('#dashKey'); if (k) k.placeholder = DT('gatePh');
        const b = g.querySelector('button[type="submit"]'); if (b) b.innerHTML = DT('unlock') + ' <i class="fa-solid fa-arrow-right"></i>';
      }
      // sidebar tool labels + language indicator
      const tl = (id, k) => { const b = $(id); const s = b && b.querySelector('span'); if (s) s.textContent = DT(k); };
      tl('#dashAi', 'tAi'); tl('#dashTheme', 'tTheme'); tl('#dashAddAdmin', 'tAddAdmin'); tl('#dashLogout', 'tLogout'); tl('#dashClose', 'tClose');
      const ln = $('#dashLangNow'); if (ln) ln.textContent = LANG_LABELS[curSiteLang()] || 'English';
      $$('#dashLangPop [data-lang]').forEach(b => b.classList.toggle('is-active', b.dataset.lang === curSiteLang()));
    };

    const openDash = () => {
      dash.classList.add('is-open');
      dash.setAttribute('aria-hidden', 'false');
      localizeChrome();
      if (unlocked) showConsole(); else { dash.classList.remove('is-full'); gate.hidden = false; main.hidden = true; setTimeout(() => $('#dashKey')?.focus(), 200); }
    };
    const closeDash = () => { dash.classList.remove('is-open'); dash.setAttribute('aria-hidden', 'true'); };

    /* triggers: URL hash #studio, or Ctrl/Cmd+Shift+B, or 5 quick clicks on rail logo */
    if (location.hash === '#studio') setTimeout(openDash, 0);   // defer: showConsole is defined later in this IIFE
    window.addEventListener('hashchange', () => { if (location.hash === '#studio') openDash(); });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); openDash(); }   // ⌘ / Ctrl + B
      if (e.key === 'Escape') closeDash();
    });
    let clicks = 0, clickT;
    $('.rail-logo')?.addEventListener('click', (e) => {
      clicks++; clearTimeout(clickT);
      clickT = setTimeout(() => clicks = 0, 600);
      if (clicks >= 5) { e.preventDefault(); clicks = 0; openDash(); }
    });
    $('#dashClose')?.addEventListener('click', closeDash);
    dash.addEventListener('click', (e) => { if (e.target === dash) closeDash(); });

    let twoFAId = null;
    const doUnlock = () => { unlocked = true; sessionStorage.setItem('bq_dash_ok', '1'); twoFAId = null; showConsole(); };
    const enter2FA = () => {
      const g = $('#dashGate'); if (!g) return;
      const h = g.querySelector('h3'); if (h) h.textContent = DT('twoTitle');
      const p = g.querySelector('p.mono'); if (p) p.textContent = DT('twoNote');
      const k = $('#dashKey'); if (k) { k.value = ''; k.placeholder = DT('twoPh'); setTimeout(() => k.focus(), 50); }
      hint.textContent = '';
    };
    $('#dashLoginForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = $('#dashKey').value.trim();
      // step 2 — verifying the SMS code
      if (twoFAId) {
        fetch('/api/2fa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: KEY, action: 'verify', id: twoFAId, code: val }) })
          .then(r => r.json()).then(d => { if (d.ok) doUnlock(); else { hint.textContent = DT('twoWrong'); $('#dashKey').value = ''; } })
          .catch(() => { hint.textContent = DT('twoWrong'); });
        return;
      }
      // step 1 — the access code
      if (val === KEY) {
        hint.textContent = DT('twoSending');
        fetch('/api/2fa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: val, action: 'send' }) })
          .then(r => r.json()).then(d => { if (d.ok && d.id) { twoFAId = d.id; enter2FA(); } else { doUnlock(); } })  // not-configured / offline → PIN-only
          .catch(() => doUnlock());
      } else {
        hint.textContent = DT('wrong');
        $('#dashKey').value = '';
      }
    });

    const getLeads = () => { try { return JSON.parse(localStorage.getItem('bq_pitches') || '[]'); } catch (e) { return []; } };
    const collections = () => (window.BQ_GALLERY && window.BQ_GALLERY.COLLECTIONS) || {};

    const renderOverview = () => {
      const colls = collections();
      const total = Object.values(colls).reduce((a, c) => a + (c.count || 0), 0);
      const leads = getLeads();
      const cats = Object.keys(colls).length;
      view.innerHTML = `
        <div class="dash-cards">
          <div class="dash-card"><span class="dash-card-n">${total}</span><span class="mono">${DT('oTotal')}</span></div>
          <div class="dash-card"><span class="dash-card-n">${cats}</span><span class="mono">${DT('oColl')}</span></div>
          <div class="dash-card"><span class="dash-card-n">${leads.length}</span><span class="mono">${DT('oLeads')}</span></div>
          <div class="dash-card"><span class="dash-card-n">7</span><span class="mono">${DT('oLangs')}</span></div>
        </div>
        <p class="dash-note mono">${DT('oWelcome')}</p>`;
    };
    const renderWorks = () => {
      const colls = collections();
      const max = Math.max(...Object.values(colls).map(c => c.count || 0), 1);
      view.innerHTML = `<div class="dash-bars">` + Object.entries(colls).map(([k, c]) =>
        `<div class="dash-bar-row">
           <span class="dash-bar-label">${c.tag || k}</span>
           <span class="dash-bar"><span class="dash-bar-fill" style="width:${(c.count / max * 100).toFixed(1)}%"></span></span>
           <span class="dash-bar-n mono">${c.count}</span>
         </div>`).join('') + `</div>`;
    };
    const renderLeads = () => {
      const leads = getLeads();
      if (!leads.length) { view.innerHTML = `<p class="dash-empty mono"><i class="fa-solid fa-inbox"></i><br>${DT('lEmpty')}</p>`; return; }
      view.innerHTML = `<div class="dash-leads">` + leads.slice().reverse().map(l =>
        `<div class="dash-lead">
           <div class="dash-lead-top"><strong>${esc(l.name)}</strong><span class="mono">${l.type || ''}</span></div>
           <span class="mono dash-lead-mail">${esc(l.email)}</span>
           <p>${esc(l.message || '')}</p>
           <span class="mono dash-lead-meta">${l.budget || '—'} · ${l.timeline || '—'} · ${new Date(l.at).toLocaleDateString()}</span>
         </div>`).join('') + `</div>
         <button class="dash-btn dash-btn--danger" id="dashClearLeads"><i class="fa-solid fa-trash"></i> ${DT('lClear')}</button>`;
      $('#dashClearLeads')?.addEventListener('click', () => {
        if (confirm(DT('lConfirm'))) { localStorage.removeItem('bq_pitches'); renderLeads(); }
      });
    };
    const renderSettings = () => {
      view.innerHTML = `
        <div class="dash-set">
          <label class="dash-row"><span>${DT('sSplash')}</span>
            <input type="checkbox" id="setSplash" ${localStorage.getItem('bq_splash') === 'off' ? '' : 'checked'}></label>
          <label class="dash-row"><span>${DT('sTheme')}</span>
            <select id="setTheme"><option value="light">${DT('sLight')}</option><option value="dark">${DT('sDark')}</option></select></label>
          <button class="dash-btn" id="setReset"><i class="fa-solid fa-rotate"></i> ${DT('sReset')}</button>
        </div>
        <p class="dash-note mono">${DT('sNote')}</p>
        <div class="dash-2fa">
          <button class="dash-btn" id="gen2fa"><i class="fa-solid fa-shield-halved"></i> ${DT('twoSetupBtn')}</button>
          <div id="twofaOut" hidden></div>
        </div>`;
      $('#setSplash').addEventListener('change', (e) => localStorage.setItem('bq_splash', e.target.checked ? 'on' : 'off'));
      const themeSel = $('#setTheme'); themeSel.value = document.documentElement.dataset.theme || 'light';
      themeSel.addEventListener('change', (e) => { document.documentElement.dataset.theme = e.target.value; try { localStorage.setItem('bq_theme', e.target.value); } catch (x) {} });
      $('#setReset').addEventListener('click', () => { if (confirm(DT('sResetConfirm'))) { ['bq_theme','bq_lang','bq_splash'].forEach(k => localStorage.removeItem(k)); alert(DT('sDone')); } });
      $('#gen2fa').addEventListener('click', () => {
        const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        const r = crypto.getRandomValues(new Uint8Array(32));
        let sec = ''; for (const b of r) sec += A[b % 32];
        const uri = `otpauth://totp/Pencemor%20Studio?secret=${sec}&issuer=Pencemor`;
        const out = $('#twofaOut'); out.hidden = false;
        out.innerHTML = `<p class="dash-note mono">${DT('twoSetup1')}</p><code class="dash-secret" id="twoSec">${sec}</code>
          <p class="dash-note mono">${DT('twoSetup2')}</p><a class="dash-note mono" href="${uri}">otpauth://… (${DT('twoSetupLink')})</a>`;
        const c = $('#twoSec'); c.addEventListener('click', () => { try { navigator.clipboard.writeText(sec); c.classList.add('copied'); } catch (e) {} });
      });
    };
    const esc = (s) => String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

    /* ---- Owner profile (stored privately in this browser) ---- */
    const PROFILE_DEFAULT = { name: 'Barakat Qurtas', title: 'Founder · Studio Pencemor', avatar: '/assets/avatar.webp' };
    const profile = () => { try { return Object.assign({}, PROFILE_DEFAULT, JSON.parse(localStorage.getItem('bq_profile') || '{}')); } catch (e) { return Object.assign({}, PROFILE_DEFAULT); } };
    const syncHeaderProfile = () => {
      const p = profile();
      const nm = $('#dashSideName'); if (nm) nm.textContent = p.name;
      const sub = $('#dashHeadSub'); if (sub) sub.textContent = p.title || 'Studio Console';
      const av = $('#dashSideAv');
      if (av) {
        if (p.avatar) { av.style.backgroundImage = `url("${p.avatar}")`; av.classList.add('has-av'); av.textContent = ''; }
        else { av.style.backgroundImage = ''; av.classList.remove('has-av'); av.textContent = 'Bq'; }
      }
    };
    const renderProfile = () => {
      const p = profile();
      view.innerHTML = `
        <div class="dash-prof-card">
          <span class="dash-prof-av" style="background-image:url('${esc(p.avatar)}')"></span>
          <div><strong>${esc(p.name)}</strong><span class="mono">${esc(p.title)}</span></div>
        </div>
        <div class="dash-set">
          <label class="dash-field"><span class="mono">${DT('pName')}</span><input id="prfName" type="text" value="${esc(p.name)}"></label>
          <label class="dash-field"><span class="mono">${DT('pTitle')}</span><input id="prfTitle" type="text" value="${esc(p.title)}"></label>
          <label class="dash-field"><span class="mono">${DT('pAvatar')}</span><input id="prfAvatar" type="text" value="${esc(p.avatar)}"></label>
          <button class="dash-btn" id="prfSave"><i class="fa-solid fa-floppy-disk"></i> ${DT('pSave')}</button>
          <span class="mono dash-prof-saved" id="prfSaved" hidden>${DT('pSaved')}</span>
        </div>
        <p class="dash-note mono">${DT('pNote')}</p>`;
      $('#prfSave')?.addEventListener('click', () => {
        const np = { name: $('#prfName').value.trim() || PROFILE_DEFAULT.name, title: $('#prfTitle').value.trim(), avatar: $('#prfAvatar').value.trim() };
        try { localStorage.setItem('bq_profile', JSON.stringify(np)); } catch (e) {}
        syncHeaderProfile();
        const s = $('#prfSaved'); if (s) { s.hidden = false; setTimeout(() => { s.hidden = true; }, 1800); }
        renderProfile();
      });
    };

    /* ---- Team & admins (saved privately in this browser until the backend login lands) ---- */
    const getAdmins = () => { try { return JSON.parse(localStorage.getItem('bq_admins') || '[]'); } catch (e) { return []; } };
    const setAdmins = (a) => { try { localStorage.setItem('bq_admins', JSON.stringify(a)); } catch (e) {} };
    const renderAdmins = () => {
      const p = profile(); const admins = getAdmins();
      view.innerHTML = `
        <div class="dash-prof-card">
          <span class="dash-prof-av" style="background-image:url('${esc(p.avatar)}')"></span>
          <div><strong>${esc(p.name)}</strong><span class="mono">${DT('admYou')} · ${esc(p.title)}</span></div>
        </div>
        <div class="dash-admin-list" id="admList">${admins.length ? admins.map((a, i) => `
          <div class="dash-admin-row"><div><strong>${esc(a.name)}</strong><span class="mono">${esc(a.role || '')}${a.email ? ' · ' + esc(a.email) : ''}</span></div><button class="dash-btn dash-btn--danger" data-rm="${i}"><i class="fa-solid fa-xmark"></i> ${DT('admRemove')}</button></div>`).join('') : `<p class="dash-note mono">${DT('admEmpty')}</p>`}</div>
        <form class="dash-set" id="admForm">
          <label class="dash-field"><span class="mono">${DT('admName')}</span><input id="admName" type="text"></label>
          <label class="dash-field"><span class="mono">${DT('admEmail')}</span><input id="admEmail" type="email"></label>
          <label class="dash-field"><span class="mono">${DT('admRole')}</span><input id="admRole" type="text"></label>
          <button class="dash-btn" type="submit"><i class="fa-solid fa-user-plus"></i> ${DT('admAdd')}</button>
        </form>
        <p class="dash-note mono">${DT('admNote')}</p>`;
      $('#admForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('#admName').value.trim(); if (!name) return;
        const a = getAdmins(); a.push({ name: name, email: $('#admEmail').value.trim(), role: $('#admRole').value.trim() }); setAdmins(a);
        renderAdmins();
      });
      $$('#admList [data-rm]').forEach(b => b.addEventListener('click', () => { const a = getAdmins(); a.splice(+b.dataset.rm, 1); setAdmins(a); renderAdmins(); }));
    };

    /* ---- Blog manager — posts live in Supabase (free; edit in its studio) ---- */
    const SB_STUDIO = 'https://supabase.com/dashboard/project/dcnkhzrishphpismmxuu/editor';
        const CT_I18N = {
      en: { gate:'Publish to your blog', note:'Enter your edit token to write, edit and publish posts.', tokPh:'Edit token', conn:'Connect', newBtn:'Write new post', editBtn:'Edit', delBtn:'Delete', delAsk:'Delete this post permanently?', fTitle:'Title', fSub:'Subtitle', fTag:'Label', fCover:'Cover image link', fCoverPh:'https://…  paste any image link', fAccent:'Accent', fMin:'Read (min)', fBody:'Body', fBodyPh:'Write your post here…  Leave one empty line between paragraphs.', fPub:'Published — visible on the site', save:'Publish', saving:'Publishing…', savedMsg:"Saved — it's on your blog now.", cancel:'Cancel', back:'All posts', loading:'Loading your posts…', empty:'No posts yet — write your first one.', err:'Could not reach the blog service (works on the live site).', needTitle:'Please add a title.', posts:'posts', draft:'draft', studio:'Advanced (raw database)' },
      ku: { gate:'بڵاوکردنەوە بۆ بلۆگەکەت', note:'تۆکنی دەستکاریت بنووسە بۆ نووسین، دەستکاری و بڵاوکردنەوەی بابەت.', tokPh:'تۆکنی دەستکاری', conn:'بەستنەوە', newBtn:'نووسینی بابەتی نوێ', editBtn:'دەستکاری', delBtn:'سڕینەوە', delAsk:'ئەم بابەتە بە تەواوی بسڕێتەوە؟', fTitle:'سەردێڕ', fSub:'ژێر-سەردێڕ', fTag:'لەیبڵ', fCover:'بەستەری وێنەی سەرەکی', fCoverPh:'https://…  هەر بەستەرێکی وێنە', fAccent:'ڕەنگ', fMin:'خوێندنەوە (خ)', fBody:'دەق', fBodyPh:'لێرە بابەتەکەت بنووسە…  دێڕێکی بەتاڵ لە نێوان پەرەگرافەکان بهێڵە.', fPub:'بڵاوکراوە — لەسەر سایت دیارە', save:'بڵاوکردنەوە', saving:'بڵاودەکرێتەوە…', savedMsg:'پاشەکەوتکرا — ئێستا لەسەر بلۆگەکەتە.', cancel:'هەڵوەشاندنەوە', back:'هەموو بابەتەکان', loading:'بارکردنی بابەتەکانت…', empty:'هێشتا بابەت نییە — یەکەمیان بنووسە.', err:'نەگەیشتە خزمەتگوزاری بلۆگ (لەسەر سایتە زیندووەکە کاردەکات).', needTitle:'تکایە سەردێڕێک زیاد بکە.', posts:'بابەت', draft:'ڕەشنووس', studio:'پێشکەوتوو (داتابەیس)' },
      ar: { gate:'انشر في مدونتك', note:'أدخل رمز التحرير للكتابة والتعديل والنشر.', tokPh:'رمز التحرير', conn:'اتصال', newBtn:'كتابة مقال جديد', editBtn:'تعديل', delBtn:'حذف', delAsk:'حذف هذا المقال نهائياً؟', fTitle:'العنوان', fSub:'العنوان الفرعي', fTag:'التصنيف', fCover:'رابط صورة الغلاف', fCoverPh:'https://…  ألصق أي رابط صورة', fAccent:'اللون', fMin:'القراءة (د)', fBody:'النص', fBodyPh:'اكتب مقالك هنا…  اترك سطراً فارغاً بين الفقرات.', fPub:'منشور — ظاهر على الموقع', save:'نشر', saving:'جارٍ النشر…', savedMsg:'تم الحفظ — إنه الآن على مدونتك.', cancel:'إلغاء', back:'كل المقالات', loading:'جارٍ تحميل مقالاتك…', empty:'لا مقالات بعد — اكتب أول واحد.', err:'تعذّر الوصول إلى خدمة المدونة (تعمل على الموقع المباشر).', needTitle:'الرجاء إضافة عنوان.', posts:'مقالات', draft:'مسودة', studio:'متقدم (قاعدة البيانات)' },
      kmr: { gate:'Li blogê biweşîne', note:'Ji bo nivîsîn, guhertin û weşandinê tokena xwe binivîse.', tokPh:'Tokena guhertinê', conn:'Girêde', newBtn:'Nivîsa nû binivîse', editBtn:'Biguhere', delBtn:'Jê bibe', delAsk:'Ev nivîs bi temamî were jêbirin?', fTitle:'Sernav', fSub:'Bin-sernav', fTag:'Etîket', fCover:'Girêdana wêneyê', fCoverPh:'https://…  her girêdana wêneyê', fAccent:'Reng', fMin:'Xwendin (deq)', fBody:'Nivîs', fBodyPh:'Nivîsa xwe li vir binivîse…  Rêzeke vala di navbera paragrafan de bihêle.', fPub:'Weşandî — li ser malperê xuya ye', save:'Biweşîne', saving:'Tê weşandin…', savedMsg:'Hat tomarkirin — niha li ser blogê ye.', cancel:'Betal', back:'Hemû nivîs', loading:'Nivîsên te tên barkirin…', empty:'Hêj nivîs tune — ya yekem binivîse.', err:'Negihîşt xizmeta blogê (li ser malpera zindî dixebite).', needTitle:'Ji kerema xwe sernavekê zêde bike.', posts:'nivîs', draft:'reşnivîs', studio:'Pêşketî (database)' },
      fr: { gate:'Publier sur votre blog', note:"Saisissez votre jeton d'édition pour écrire, modifier et publier.", tokPh:"Jeton d'édition", conn:'Connecter', newBtn:'Écrire un article', editBtn:'Modifier', delBtn:'Supprimer', delAsk:'Supprimer définitivement cet article ?', fTitle:'Titre', fSub:'Sous-titre', fTag:'Étiquette', fCover:"Lien de l'image", fCoverPh:"https://…  collez un lien d'image", fAccent:'Couleur', fMin:'Lecture (min)', fBody:'Texte', fBodyPh:'Écrivez votre article ici…  Laissez une ligne vide entre les paragraphes.', fPub:'Publié — visible sur le site', save:'Publier', saving:'Publication…', savedMsg:"Enregistré — c'est sur votre blog.", cancel:'Annuler', back:'Tous les articles', loading:'Chargement de vos articles…', empty:'Aucun article — écrivez le premier.', err:'Service du blog inaccessible (fonctionne sur le site en ligne).', needTitle:'Veuillez ajouter un titre.', posts:'articles', draft:'brouillon', studio:'Avancé (base de données)' }
    };
    const editToken = () => { try { return localStorage.getItem('bq_edit_token') || ''; } catch (e) { return ''; } };
        const cmsApi = (payload) => {
      const SB = window.BQ_SUPA || {};
      return fetch(SB.url + '/functions/v1/blog-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SB.key, Authorization: 'Bearer ' + SB.key, 'x-edit-token': editToken() },
        body: JSON.stringify(payload)
      }).then(r => r.json().catch(() => ({ error: 'bad_response' })));
    };
    let CMS_POSTS = [];
    const CT_X = {
      en:  { fTag:'Category', fCover:'Cover image', uploading:'Uploading…', uploaded:'Uploaded ✓', fCoverHint:'Choose an image — it uploads automatically.' },
      ku:  { fTag:'کەتەگۆری', fCover:'وێنەی سەرەکی', uploading:'بارکردن…', uploaded:'بارکرا ✓', fCoverHint:'وێنەیەک هەڵبژێرە — خۆکارانە بار دەبێت.' },
      ar:  { fTag:'التصنيف', fCover:'صورة الغلاف', uploading:'جارٍ الرفع…', uploaded:'تم الرفع ✓', fCoverHint:'اختر صورة — تُرفع تلقائياً.' },
      kmr: { fTag:'Kategorî', fCover:'Wêneyê bergê', uploading:'Tê barkirin…', uploaded:'Hat barkirin ✓', fCoverHint:'Wêneyek hilbijêre — bixweber tê barkirin.' },
      fr:  { fTag:'Catégorie', fCover:'Image de couverture', uploading:'Téléversement…', uploaded:'Téléversé ✓', fCoverHint:'Choisissez une image — téléversée automatiquement.' }
    };
    const cmsResize = (file, maxW, q) => new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => {
        const scale = Math.min(1, maxW / (im.width || maxW));
        const w = Math.max(1, Math.round(im.width * scale)), h = Math.max(1, Math.round(im.height * scale));
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(im, 0, 0, w, h);
        URL.revokeObjectURL(im.src);
        try { resolve(cv.toDataURL('image/webp', q).split(',')[1]); } catch (e) { reject(e); }
      };
      im.onerror = () => reject('image_error');
      im.src = URL.createObjectURL(file);
    });
    const cmsGate = () => {
      const t = CT_I18N[curLang()] || CT_I18N.en;
      view.innerHTML = `<div class="dash-gate-inline">
        <i class="fa-solid fa-feather-pointed dash-gate-icon"></i>
        <h3>${t.gate}</h3><p class="mono">${t.note}</p>
        <form id="ctTokForm" class="dash-login"><input type="password" id="ctTok" placeholder="${t.tokPh}" autocomplete="off"><button type="submit">${t.conn} <i class="fa-solid fa-arrow-right"></i></button></form></div>`;
      $('#ctTokForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#ctTok').value.trim(); if (!v) return; try { localStorage.setItem('bq_edit_token', v); } catch (x) {} renderContent(); });
    };
    const cmsList = () => {
      const t = CT_I18N[curLang()] || CT_I18N.en;
      view.innerHTML = `<p class="dash-empty mono"><i class="fa-solid fa-spinner fa-spin"></i><br>${t.loading}</p>`;
      cmsApi({ action: 'list' }).then(d => {
        if (d && d.error === 'unauthorized') { try { localStorage.removeItem('bq_edit_token'); } catch (x) {} renderContent(); return; }
        if (!d || !d.ok) { view.innerHTML = `<p class="dash-empty mono"><i class="fa-solid fa-plug-circle-xmark"></i><br>${t.err}</p><button class="dash-btn" id="ctRetry"><i class="fa-solid fa-rotate"></i> ${t.conn}</button>`; const rb = $('#ctRetry'); if (rb) rb.addEventListener('click', cmsList); return; }
        CMS_POSTS = Array.isArray(d.posts) ? d.posts : [];
        const rows = CMS_POSTS.length ? CMS_POSTS.map((p) => {
          const dd = p.date || (p.created_at ? new Date(p.created_at).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : '');
          return `<div class="cms-row" data-id="${p.id}">
            <span class="cms-row-t"><strong>${esc(p.title || '')}</strong><span class="mono">${esc(p.tag || 'Note')} · ${esc(dd)}${p.published === false ? ' · ' + t.draft : ''}</span></span>
            <span class="cms-row-act">
              <button class="cms-mini" data-act="edit" data-id="${p.id}" title="${t.editBtn}"><i class="fa-solid fa-pen"></i></button>
              <button class="cms-mini cms-mini--del" data-act="del" data-id="${p.id}" title="${t.delBtn}"><i class="fa-solid fa-trash-can"></i></button>
            </span></div>`;
        }).join('') : `<p class="dash-dim mono">${t.empty}</p>`;
        view.innerHTML = `
          <div class="cms-head">
            <button class="dash-btn dash-btn--go" id="ctNew"><i class="fa-solid fa-feather-pointed"></i> ${t.newBtn}</button>
            <span class="mono cms-status">${CMS_POSTS.length} ${t.posts}</span>
          </div>
          <div class="cms-list">${rows}</div>`;
        $('#ctNew').addEventListener('click', () => cmsEdit(null));
        view.querySelectorAll('.cms-mini').forEach((b) => b.addEventListener('click', () => {
          const id = b.getAttribute('data-id'), act = b.getAttribute('data-act');
          if (act === 'edit') cmsEdit(CMS_POSTS.find((p) => String(p.id) === String(id)));
          else cmsDel(id);
        }));
      }).catch(() => { view.innerHTML = `<p class="dash-empty mono"><i class="fa-solid fa-plug-circle-xmark"></i><br>${t.err}</p>`; });
    };
    const cmsDel = (id) => {
      const t = CT_I18N[curLang()] || CT_I18N.en;
      if (!window.confirm(t.delAsk)) return;
      cmsApi({ action: 'delete', id: Number(id) }).then((d) => {
        if (d && d.error === 'unauthorized') { try { localStorage.removeItem('bq_edit_token'); } catch (x) {} renderContent(); return; }
        try { if (window.__bqReloadBlog) window.__bqReloadBlog(); } catch (x) {}
        cmsList();
      });
    };
    const cmsEdit = (post) => {
      const t = Object.assign({}, CT_I18N.en, CT_I18N[curLang()] || {}, CT_X.en, CT_X[curLang()] || {});
      const p = post || {};
      const accent = p.accent || '#1a2740';
      view.innerHTML = `
        <div class="cms-head"><button class="dash-btn" id="ctBack"><i class="fa-solid fa-arrow-left"></i> ${t.back}</button>
          <span class="mono cms-status">${p.id ? t.editBtn : t.newBtn}</span></div>
        <form id="ctForm" class="cms-form">
          <label class="cms-field"><span>${t.fTitle}</span><input id="cf_title" type="text" value="${esc(p.title || '')}" required></label>
          <label class="cms-field"><span>${t.fSub}</span><input id="cf_sub" type="text" value="${esc(p.subtitle || '')}"></label>
          <div class="cms-field"><span>${t.fTag}</span>
            <div class="cms-cats" id="cf_cats"></div>
            <input id="cf_tag" type="hidden" value="${esc(p.tag || 'Design')}">
          </div>
          <div class="cms-row2">
            <label class="cms-field"><span>${t.fMin}</span><input id="cf_min" type="number" min="1" max="60" value="${esc(String(p.read_minutes || 4))}"></label>
            <label class="cms-field cms-field--color"><span>${t.fAccent}</span><input id="cf_accent" type="color" value="${esc(accent)}"></label>
          </div>
          <label class="cms-field"><span>${t.fCover}</span>
            <input id="cf_coverfile" type="file" accept="image/*" class="cms-file">
            <input id="cf_cover" type="hidden" value="${esc(p.cover || '')}">
            <span class="cms-uphint" id="cf_upmsg">${p.cover ? '' : t.fCoverHint}</span></label>
          <div class="cms-cover-prev" id="cf_prev"${p.cover ? '' : ' hidden'}><img src="${esc(p.cover || '')}" alt=""></div>
          <label class="cms-field"><span>${t.fBody}</span><textarea id="cf_body" rows="12" placeholder="${esc(t.fBodyPh)}">${esc(p.body || '')}</textarea></label>
          <label class="cms-check"><input type="checkbox" id="cf_pub" ${p.published === false ? '' : 'checked'}> <span>${t.fPub}</span></label>
          <div class="cms-actions">
            <button type="submit" class="dash-btn dash-btn--go" id="ctSave"><i class="fa-solid fa-paper-plane"></i> ${t.save}</button>
            <button type="button" class="dash-btn" id="ctCancel">${t.cancel}</button>
            <span class="mono cms-savemsg" id="ctMsg"></span>
          </div>
        </form>`;
      $('#ctBack').addEventListener('click', cmsList);
      $('#ctCancel').addEventListener('click', cmsList);
      // category chips — click to pick (value kept in the hidden #cf_tag)
      (() => {
        const PRESETS = ['Design', 'Logo', 'AI', 'Live', 'Branding', 'Print', 'Photography', 'Note'];
        const wrap = $('#cf_cats'), hid = $('#cf_tag');
        const cur = (p.tag || 'Design');
        const list2 = PRESETS.slice();
        if (cur && !PRESETS.some(c => c.toLowerCase() === cur.toLowerCase())) list2.unshift(cur);
        const draw = () => { wrap.innerHTML = list2.map(c => `<button type="button" class="cms-cat${c.toLowerCase() === (hid.value || '').toLowerCase() ? ' is-active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join(''); };
        draw();
        wrap.addEventListener('click', (e) => { const b = e.target.closest('.cms-cat'); if (!b) return; hid.value = b.getAttribute('data-cat'); draw(); });
      })();
      const coverHidden = $('#cf_cover'), prev = $('#cf_prev'), upmsg = $('#cf_upmsg');
      $('#cf_coverfile').addEventListener('change', async (ev) => {
        const file = ev.target.files && ev.target.files[0]; if (!file) return;
        upmsg.textContent = t.uploading;
        try {
          const b64 = await cmsResize(file, 1600, 0.82);
          const d = await cmsApi({ action: 'upload', filename: file.name, contentType: 'image/webp', dataB64: b64 });
          if (d && d.ok && d.url) { coverHidden.value = d.url; prev.hidden = false; prev.querySelector('img').src = d.url; upmsg.textContent = t.uploaded; }
          else if (d && d.error === 'unauthorized') { try { localStorage.removeItem('bq_edit_token'); } catch (x) {} renderContent(); }
          else { upmsg.textContent = '✗ ' + ((d && d.error) || ''); }
        } catch (err) { upmsg.textContent = '✗ ' + err; }
      });
      $('#ctForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = $('#cf_title').value.trim();
        const msg = $('#ctMsg');
        if (!title) { msg.textContent = t.needTitle; return; }
        const payload = { action: 'upsert', post: {
          id: p.id || undefined, title,
          subtitle: $('#cf_sub').value, tag: $('#cf_tag').value.trim() || 'Design',
          read_minutes: Number($('#cf_min').value) || 4, accent: $('#cf_accent').value,
          cover: $('#cf_cover').value.trim(), body: $('#cf_body').value, published: $('#cf_pub').checked
        } };
        const btn = $('#ctSave'); btn.disabled = true; msg.textContent = t.saving;
        cmsApi(payload).then((d) => {
          btn.disabled = false;
          if (d && d.error === 'unauthorized') { try { localStorage.removeItem('bq_edit_token'); } catch (x) {} renderContent(); return; }
          if (!d || !d.ok) { msg.textContent = '✗ ' + ((d && d.error) || ''); return; }
          msg.textContent = t.savedMsg;
          try { if (window.__bqReloadBlog) window.__bqReloadBlog(); } catch (x) {}
          setTimeout(cmsList, 800);
        }).catch(() => { btn.disabled = false; msg.textContent = t.err; });
      });
    };
    const renderContent = () => {
      if (!editToken()) { cmsGate(); return; }
      cmsList();
    };

    /* ---- AI assistant (private; proxied via /api/assistant) ---- */
    const AT_I18N = {
      en: { gate:'Connect the assistant', note:'Enter your EDIT_TOKEN (same as the content editor).', tokPh:'Edit token', conn:'Connect', ph:'Ask about clients, pricing, briefs, ideas…', send:'Send', intro:'Hello Barakat — I can help with client replies, quotes, briefs, ideas, captions and translation. Ask in any language.', clear:'Clear', thinking:'Thinking…', errKey:'Enable Workers AI in Cloudflare (free) to turn this on.', err:'Assistant works on the live site only.' },
      ku: { gate:'بەستنەوەی یاریدەدەر', note:'EDIT_TOKENـەکەت بنووسە (هەمان تۆکنی ناوەڕۆک).', tokPh:'تۆکنی دەستکاری', conn:'بەستنەوە', ph:'دەربارەی کڕیار، نرخ، پلان، بیرۆکە بپرسە…', send:'ناردن', intro:'سڵاو بەرەکات — دەتوانم یارمەتیت بدەم لە وەڵامی کڕیار، نرخ، پلانی پڕۆژە، بیرۆکە، کاپشن و وەرگێڕان. بە هەر زمانێک بپرسە.', clear:'پاککردنەوە', thinking:'بیردەکاتەوە…', errKey:'Workers AI لە Cloudflare چالاک بکە (بەخۆڕایی) بۆ کارکردنی.', err:'یاریدەدەر تەنها لەسەر سایتە زیندووەکە کاردەکات.' },
      ar: { gate:'ربط المساعد', note:'أدخل EDIT_TOKEN (نفس رمز محرر المحتوى).', tokPh:'رمز التحرير', conn:'اتصال', ph:'اسأل عن العملاء، التسعير، الخطط، الأفكار…', send:'إرسال', intro:'مرحباً بركات — أساعدك في ردود العملاء، عروض الأسعار، الخطط، الأفكار، التعليقات والترجمة. اسأل بأي لغة.', clear:'مسح', thinking:'يفكر…', errKey:'فعّل Workers AI في Cloudflare (مجاناً) لتشغيله.', err:'المساعد يعمل على الموقع المباشر فقط.' },
      kmr: { gate:'Alîkar girêde', note:'EDIT_TOKEN ya xwe binivîse (heman tokena edîtorê).', tokPh:'Tokena guhertinê', conn:'Girêde', ph:'Li ser kirîar, biha, plan, fikiran bipirse…', send:'Bişîne', intro:'Slav Barakat — ez dikarim di bersivên kirîaran, bihayan, planan, fikiran, sernivîs û wergerê de alîkar bim. Bi her zimanî bipirse.', clear:'Paqij bike', thinking:'Difikire…', errKey:'Workers AI li Cloudflare çalak bike (belaş) ji bo vê.', err:'Alîkar tenê li ser malpera zindî dixebite.' },
      fr: { gate:"Connecter l'assistant", note:'Saisissez votre EDIT_TOKEN (le même que l’éditeur).', tokPh:"Jeton d'édition", conn:'Connecter', ph:'Clients, tarifs, briefs, idées…', send:'Envoyer', intro:'Bonjour Barakat — je peux aider pour les réponses clients, devis, briefs, idées, légendes et traduction. Demandez dans n’importe quelle langue.', clear:'Effacer', thinking:'Réflexion…', errKey:'Activez Workers AI dans Cloudflare (gratuit) pour l’activer.', err:"L'assistant fonctionne sur le site en ligne uniquement." }
    };
    const renderAssistant = () => {
      const t = AT_I18N[curLang()] || AT_I18N.en;
      const token = editToken();
      if (!token) {
        view.innerHTML = `<div class="dash-gate-inline">
          <i class="fa-solid fa-robot dash-gate-icon"></i>
          <h3>${t.gate}</h3><p class="mono">${t.note}</p>
          <form id="asTokForm" class="dash-login"><input type="password" id="asTok" placeholder="${t.tokPh}" autocomplete="off"><button type="submit">${t.conn} <i class="fa-solid fa-arrow-right"></i></button></form></div>`;
        $('#asTokForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#asTok').value.trim(); if (!v) return; try { localStorage.setItem('bq_edit_token', v); } catch (x) {} renderAssistant(); });
        return;
      }
      let hist = []; try { hist = JSON.parse(localStorage.getItem('bq_assist') || '[]'); } catch (e) {}
      const save = () => { try { localStorage.setItem('bq_assist', JSON.stringify(hist.slice(-40))); } catch (e) {} };
      view.innerHTML = `
        <div class="asst">
          <div class="asst-bar"><button class="dash-btn" id="asstClear"><i class="fa-solid fa-eraser"></i> ${t.clear}</button></div>
          <div class="asst-msgs" id="asstMsgs"></div>
          <form class="asst-form" id="asstForm"><input id="asstInput" type="text" placeholder="${t.ph}" autocomplete="off"><button type="submit" aria-label="${t.send}"><i class="fa-solid fa-paper-plane"></i></button></form>
        </div>`;
      const msgs = $('#asstMsgs');
      const paint = () => {
        msgs.innerHTML = `<div class="asst-msg asst-bot">${esc(t.intro)}</div>` +
          hist.map(m => `<div class="asst-msg asst-${m.role === 'user' ? 'me' : 'bot'}">${esc(m.content).replace(/\n/g, '<br>')}</div>`).join('');
        msgs.scrollTop = msgs.scrollHeight;
      };
      paint();
      $('#asstClear').addEventListener('click', () => { hist = []; save(); paint(); });
      $('#asstForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const v = $('#asstInput').value.trim(); if (!v) return;
        hist.push({ role: 'user', content: v }); save(); $('#asstInput').value = ''; paint();
        const typing = document.createElement('div'); typing.className = 'asst-msg asst-bot asst-typing'; typing.textContent = t.thinking;
        msgs.appendChild(typing); msgs.scrollTop = msgs.scrollHeight;
        fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-edit-token': token }, body: JSON.stringify({ messages: hist.map(m => ({ role: m.role, content: m.content })) }) })
          .then(r => r.json()).then(d => {
            if (d.ok) { hist.push({ role: 'assistant', content: d.text }); save(); paint(); }
            else if (d.error === 'unauthorized') { try { localStorage.removeItem('bq_edit_token'); } catch (x) {} renderAssistant(); }
            else { typing.classList.remove('asst-typing'); typing.textContent = (d.error === 'no-key' || d.error === 'no-ai') ? t.errKey : ('✗ ' + (d.error || '')); }
          }).catch(() => { typing.classList.remove('asst-typing'); typing.textContent = t.err; });
      });
    };

    const flag = (cc) => (cc && cc.length === 2)
      ? cc.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0))) : '🌐';
    const ago = (ts) => { const s = (Date.now() - ts) / 1000;
      if (s < 60) return 'just now';
      if (s < 3600) return Math.floor(s / 60) + 'm ago';
      if (s < 86400) return Math.floor(s / 3600) + 'h ago';
      return Math.floor(s / 86400) + 'd ago'; };
    const bars = (rows, fmt) => {
      if (!rows || !rows.length) return `<p class="dash-dim mono">No data yet</p>`;
      const max = Math.max(...rows.map(x => x.c), 1);
      return rows.map(r => `<div class="dash-bar-row"><span class="dash-bar-label">${fmt(r)}</span><span class="dash-bar"><span class="dash-bar-fill" style="width:${(r.c / max * 100).toFixed(0)}%"></span></span><span class="dash-bar-n mono">${r.c}</span></div>`).join('');
    };

    const renderVisitors = async () => {
      let token = '';
      try { token = localStorage.getItem('bq_stats_token') || ''; } catch (e) {}
      if (!token) {
        view.innerHTML = `<div class="dash-gate-inline">
          <i class="fa-solid fa-chart-line dash-gate-icon"></i>
          <h3>${DT('vConnect')}</h3>
          <p class="mono">${DT('vEnter')}</p>
          <form id="stTokForm" class="dash-login"><input type="password" id="stTok" placeholder="${DT('vTokenPh')}" autocomplete="off"><button type="submit">${DT('vConnectBtn')} <i class="fa-solid fa-arrow-right"></i></button></form></div>`;
        $('#stTokForm').addEventListener('submit', (e) => { e.preventDefault();
          const v = $('#stTok').value.trim(); if (!v) return;
          try { localStorage.setItem('bq_stats_token', v); } catch (x) {} renderVisitors(); });
        return;
      }
      view.innerHTML = `<p class="dash-empty mono"><i class="fa-solid fa-spinner fa-spin"></i><br>${DT('vLoading')}</p>`;
      let d;
      try { d = await (await fetch('/api/stats?token=' + encodeURIComponent(token))).json(); }
      catch (e) { view.innerHTML = `<p class="dash-empty mono"><i class="fa-solid fa-plug-circle-xmark"></i><br>Can't reach analytics — this works on the live site only, not local preview.</p>`; return; }

      if (!d.ok) {
        if (d.error === 'unauthorized') { try { localStorage.removeItem('bq_stats_token'); } catch (x) {}
          view.innerHTML = `<p class="dash-empty mono">Wrong token.</p><button class="dash-btn" id="stRetry">Try again</button>`;
          $('#stRetry').addEventListener('click', renderVisitors); return; }
        if (d.error === 'no-db') { view.innerHTML = `<p class="dash-empty mono"><i class="fa-solid fa-database"></i><br>Analytics database not connected yet.<br><small>Create a Cloudflare D1 database and bind it as <b>DB</b>.</small></p>`; return; }
        view.innerHTML = `<p class="dash-empty mono">Analytics error: ${esc(d.error || '')}</p>`; return;
      }

      const sMax = Math.max(...(d.series || []).map(s => s.c), 1);
      const chart = (d.series || []).map(s =>
        `<span class="viz-day" title="${s.d} · ${s.c} views"><span class="viz-day-fill" style="height:${Math.max(8, (s.c / sMax * 100)).toFixed(0)}%"></span></span>`).join('');

      view.innerHTML = `
        <div class="dash-cards">
          <div class="dash-card"><span class="dash-card-n">${d.views}</span><span class="mono">Page views</span></div>
          <div class="dash-card"><span class="dash-card-n">${d.visitors}</span><span class="mono">Visitors</span></div>
          <div class="dash-card"><span class="dash-card-n">${d.viewsToday}</span><span class="mono">Views today</span></div>
          <div class="dash-card"><span class="dash-card-n">${d.visitorsToday}</span><span class="mono">Visitors today</span></div>
        </div>
        ${chart ? `<div class="viz-wrap"><span class="dash-dim mono">Last 14 days</span><div class="viz-chart">${chart}</div></div>` : ''}
        <div class="dash-grid2">
          <div><h4 class="dash-h mono">Top pages</h4>${bars(d.paths, r => esc(r.path))}</div>
          <div><h4 class="dash-h mono">Countries</h4>${bars(d.countries, r => flag(r.country) + ' ' + esc(r.country || '—'))}</div>
          <div><h4 class="dash-h mono">Referrers</h4>${bars(d.referrers, r => esc(r.ref))}</div>
          <div><h4 class="dash-h mono">Devices</h4>${bars(d.devices, r => esc(r.device || '—'))}</div>
        </div>
        <h4 class="dash-h mono">Recent visits</h4>
        <div class="dash-recent">${(d.recent || []).length ? d.recent.map(r =>
          `<div class="dash-recent-row mono"><span class="dash-recent-flag">${flag(r.country)}</span><span class="dash-recent-path">${esc(r.path)}</span><span class="dash-dim">${esc(r.device)}</span><span class="dash-dim">${ago(r.ts)}</span></div>`).join('')
          : '<p class="dash-dim mono">No visits yet</p>'}</div>
        <button class="dash-btn" id="stRefresh"><i class="fa-solid fa-rotate"></i> Refresh</button>`;
      $('#stRefresh')?.addEventListener('click', renderVisitors);
    };

    /* ---- Latest: hand-pin an important work to the homepage bell for a week ---- */
    const latestApi = (payload) => {
      const SB = window.BQ_SUPA || {};
      return fetch(SB.url + '/functions/v1/latest-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SB.key, Authorization: 'Bearer ' + SB.key, 'x-edit-token': editToken() },
        body: JSON.stringify(payload)
      }).then(r => r.json().catch(() => ({ error: 'bad_response' })));
    };
    const LATEST_TABS = [['logo','Logos'],['book','Book Covers'],['image','Photography'],['posters','Posters'],['social','Social'],['events','Events'],['stationery','Stationery'],['official','Official'],['video','Video'],['ai','AI'],['other','Other'],['','Design room (all)']];
    const renderLatest = () => {
      const opts = LATEST_TABS.map(([v,l]) => `<option value="${v}">${l}</option>`).join('');
      view.innerHTML = `
        <p class="dash-note mono">Pin an important work to the homepage “Latest” bell. It shows for 7 days, then drops off on its own — alongside the new works the bell already finds automatically.</p>
        <div class="dash-latest-form">
          <label class="dash-field"><span class="mono">Headline</span><input id="laTitle" type="text" placeholder="e.g. New identity for Rwanga"></label>
          <label class="dash-field"><span class="mono">Opens tab</span><select id="laLink">${opts}</select></label>
          <label class="dash-field"><span class="mono">Image — choose a file (optional)</span>
            <input id="laImageFile" type="file" accept="image/*" class="cms-file">
            <input id="laImage" type="hidden">
            <span class="dash-note mono" id="laUp"></span></label>
          <div class="dash-latest-prev" id="laPrev" hidden><img src="" alt=""></div>
          <button class="dash-btn" id="laAdd"><i class="fa-solid fa-bell"></i> Pin to Latest</button>
          <span class="dash-note mono" id="laMsg"></span>
        </div>
        <div class="dash-latest-list" id="laList"><p class="dash-empty mono"><i class="fa-solid fa-spinner fa-spin"></i></p></div>`;
      const msg = $('#laMsg'), upmsg = $('#laUp'), prev = $('#laPrev');
      $('#laImageFile').addEventListener('change', async (ev) => {
        const file = ev.target.files && ev.target.files[0]; if (!file) return;
        upmsg.textContent = 'Uploading…';
        try {
          const b64 = await cmsResize(file, 1200, 0.82);
          const d = await cmsApi({ action: 'upload', filename: file.name, contentType: 'image/webp', dataB64: b64 });
          if (d && d.ok && d.url) { $('#laImage').value = d.url; prev.hidden = false; prev.querySelector('img').src = d.url; upmsg.textContent = 'Uploaded ✓'; }
          else { upmsg.textContent = (d && (d.error === 'missing_token' || d.error === 'unauthorized')) ? 'Connect the editor first (Content tab).' : '✗ ' + ((d && d.error) || 'upload failed'); }
        } catch (err) { upmsg.textContent = '✗ ' + err; }
      });
      const loadList = () => {
        latestApi({ action: 'list' }).then(d => {
          const list = $('#laList'); if (!list) return;
          if (!d || !d.ok) {
            const needTok = d && (d.error === 'missing_token' || d.error === 'unauthorized');
            list.innerHTML = `<p class="dash-empty mono"><i class="fa-solid fa-plug-circle-xmark"></i><br>${needTok ? 'Connect the editor first — open Content and enter your edit token.' : 'Reachable on the live site only.'}</p>`;
            return;
          }
          const items = d.items || [];
          if (!items.length) { list.innerHTML = `<p class="dash-empty mono">Nothing pinned right now.</p>`; return; }
          list.innerHTML = items.map(it => {
            const left = Math.max(0, 7 - Math.floor((Date.now() - new Date(it.created_at).getTime()) / 86400000));
            return `<div class="dash-latest-row"><span class="dash-latest-tag mono">${esc(it.tag||'Featured')}</span><strong>${esc(it.title)}</strong><span class="mono dash-latest-left">${left}d</span><button class="dash-latest-del" data-id="${it.id}" aria-label="Remove"><i class="fa-solid fa-xmark"></i></button></div>`;
          }).join('');
          list.querySelectorAll('.dash-latest-del').forEach(b => b.addEventListener('click', () => { latestApi({ action: 'delete', id: Number(b.dataset.id) }).then(() => { loadList(); if (window.__bqReloadLatest) window.__bqReloadLatest(); }); }));
        }).catch(() => {});
      };
      $('#laAdd').addEventListener('click', () => {
        const title = $('#laTitle').value.trim();
        if (!title) { msg.textContent = 'Add a headline.'; return; }
        const sel = $('#laLink'), link = sel.value, tag = sel.options[sel.selectedIndex].text;
        const image = $('#laImage').value.trim();
        msg.textContent = 'Saving…';
        latestApi({ action: 'add', item: { title, link, tag, image } }).then(d => {
          if (d && d.ok) { $('#laTitle').value = ''; $('#laImage').value = ''; $('#laImageFile').value = ''; prev.hidden = true; upmsg.textContent = ''; msg.textContent = 'Pinned ✓'; loadList(); if (window.__bqReloadLatest) window.__bqReloadLatest(); }
          else { msg.textContent = (d && (d.error === 'missing_token' || d.error === 'unauthorized')) ? 'Connect the editor first (Content tab).' : 'Could not save (live site only).'; }
        }).catch(() => { msg.textContent = 'Could not save.'; });
      });
      loadList();
    };

    const VIEWS = { overview: renderOverview, visitors: renderVisitors, works: renderWorks, content: renderContent, latest: renderLatest, assistant: renderAssistant, admins: renderAdmins, leads: renderLeads, profile: renderProfile, settings: renderSettings };
    const showConsole = () => {
      gate.hidden = true; main.hidden = false;
      dash.classList.add('is-full');           // console takes the full screen
      syncHeaderProfile();
      localizeChrome();
      renderOverview();
    };
    /* open a non-tab view (AI, admins) from a sidebar tool — clear the nav highlight */
    const openTool = (fn) => { $$('.dash-tab').forEach(x => x.classList.remove('is-active')); (fn || renderOverview)(); };

    // dark / light toggle
    $('#dashTheme')?.addEventListener('click', () => {
      const next = (document.documentElement.dataset.theme === 'dark') ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('bq_theme', next); } catch (e) {}
    });
    // AI + Add-admin sidebar tools
    $('#dashAi')?.addEventListener('click', () => openTool(renderAssistant));
    $('#dashAddAdmin')?.addEventListener('click', () => openTool(renderAdmins));
    // Log out — lock the console again
    $('#dashLogout')?.addEventListener('click', () => {
      if (!confirm(DT('logoutAsk'))) return;
      unlocked = false;
      try { sessionStorage.removeItem('bq_dash_ok'); } catch (e) {}
      dash.classList.remove('is-full'); main.hidden = true; gate.hidden = false;
      closeDash();
    });
    // Language picker (popover above the button)
    const langPop = $('#dashLangPop');
    $('#dashLang')?.addEventListener('click', (e) => { e.stopPropagation(); if (langPop) langPop.hidden = !langPop.hidden; });
    langPop?.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
      if (window.applyLang) window.applyLang(b.dataset.lang);
      if (langPop) langPop.hidden = true;
      localizeChrome();
      const active = $('.dash-tab.is-active');
      ((active && VIEWS[active.dataset.dash]) || renderOverview)();
    }));
    document.addEventListener('click', () => { if (langPop && !langPop.hidden) langPop.hidden = true; });
    // Gate close — the login screen no longer has a top bar
    $('#dashGateClose')?.addEventListener('click', closeDash);

    $$('.dash-tab').forEach(t => t.addEventListener('click', () => {
      $$('.dash-tab').forEach(x => x.classList.remove('is-active'));
      t.classList.add('is-active');
      (VIEWS[t.dataset.dash] || renderOverview)();
    }));
  })();

  /* =======================================================
     8 · BLOG — data, pagination, rich hover preview, reader
     ======================================================= */
  (function blog() {
    const layout = $('#blogIndex');
    const list   = $('#blogList');
    const reader = $('#reader');
    if (!layout || !list) return;
    const IMG = (p) => CDN ? `${CDN}/${p}` : '';
    const AUTHOR = 'Barakat Qurtas';
    const hl = window.__bqHighlightTitle || ((s) => s);

    /* every note. Add more here and pagination grows automatically. */
    const P = (num, tag, date, read, accent, img, title, sub, body) =>
      ({ num, tag, date, read, accent, img: IMG(img), title, sub, body });
    let POSTS = [
      P('01','Editorial','May 2026',6,'#1a2740','Official/Official7.webp','On the architecture of meaning','Typography is not decoration — it is the floorplan of the page.',
        ["Typography is not decoration. It is the floorplan of the page — the place where a reader pauses, breathes, and finds their footing.","When I set a page I am choosing a pace, not just a typeface. A wide margin is a held breath; a tight column an urgent whisper.","Get the architecture right and the content feels inevitable — as if it could not have been arranged any other way."]),
      P('02','Place','Apr 2026',4,'#5a1a1a','GeneralDesign/GDesign1.webp',"A printer's room in Hewlêr","The old quarter, third floor, north-facing light. A notebook, a small press.",
        ["The old quarter, third floor, north-facing light. A notebook, a small press, and a slow habit of asking why.","Work made here carries the place inside it — the smell of ink not yet dry, the weight of paper waiting.","I keep this room deliberately small. Constraints are the first and most honest collaborator."]),
      P('03','Type','Mar 2026',8,'#2a1a0e','LogoDesign/Logo3.webp','Two scripts, one wordmark','Designing for Kurdish and Latin in one logo is not translation — it is duet.',
        ["Designing for Kurdish and Latin in the same logo is not translation — it is a duet. Two scripts, each with its own rhythm.","The Kurdish letterforms want to flow; the Latin wants to stand. The work is to find the posture where neither feels a guest.","When it works, a reader of either script feels at home — and never notices the quiet diplomacy it took."]),
      P('04','Craft','Feb 2026',5,'#0e1a26','Book/BookCover1.webp','Why I still print proofs','The screen lies, gently. Paper tells you the truth about colour and weight.',
        ["The screen lies, gently. Paper tells you the truth about colour, weight, and the unsaid air between letters.","A margin that looked generous on a monitor can feel mean in the palm; a grey that seemed soft can turn cold under lamplight.","Proofing is not a final check. It is a conversation with the object the work will become."]),
      P('05','Practice','Jan 2026',7,'#3a2616','GeneralDesign/GDesign17.webp','On choosing clients carefully','Two projects a quarter. Always independent publishers, always close readers.',
        ["Two projects a quarter. Always independent publishers, always someone who reads the small text.","Choosing clients carefully is not arrogance — it is the only way I know to keep the work honest.","The projects I am proudest of all began the same way: a long conversation, no rush."]),
      P('06','Colour','Dec 2025',3,'#a8862f','Poster/Poster6.webp','The year, in three colours','Burnt gold, warm ink, cream. A palette that refused to leave the studio.',
        ["Burnt gold, warm ink, cream. A short reflection on a palette that refused to leave the studio.","Some years arrive with a colour already attached. This one came in three.","I did not choose them so much as notice them — and once noticed, they organised everything else."]),
      P('07','Process','Nov 2025',5,'#243018','LogoDesign/Logo14.webp','The first ten thumbnails','Every good mark begins as a bad sketch — ten of them, usually.',
        ["Every good mark begins as a bad sketch. Ten of them, usually, before anything worth keeping appears.","The thumbnails are not the work; they are permission to be wrong quickly, on cheap paper, where it costs nothing.","Speed early buys patience later. I draw badly so I can decide well."]),
      P('08','Place','Oct 2025',6,'#1a2740','GeneralDesign/GDesign40.webp','Soran, where it started','A boy, a mountain, and a borrowed pencil.',
        ["I was born in Soran, between the stillness of the mountains and the noise of a growing town.","My first tools were borrowed and my first audience was patient. Both taught me to make do — and then to make better.","Erbil gave me the city; Soran gave me the eye. I carry both into every page."]),
      P('09','Tools','Sep 2025',4,'#5a1a1a','Official/Official94.webp','In praise of the grid','Freedom, it turns out, loves a constraint.',
        ["A grid is not a cage. It is a handrail in the dark — something to trust when taste runs out.","Freedom, it turns out, loves a constraint. The blank page is not liberating; it is paralysing.","I build the grid first so the ideas have somewhere to stand."]),
      P('10','Type','Aug 2025',7,'#2a1a0e','Book/BookCover28.webp','Kerning is a kind of listening','The space between letters is where the music lives.',
        ["Kerning is a kind of listening. You are not moving letters; you are tuning the silence between them.","Most readers will never see it. They will only feel that a word sits right — calm, even, unhurried.","The invisible work is the work. That is the whole craft, really."]),
      P('11','Print','Jul 2025',5,'#3a2616','Poster/Poster14.webp','The smell of fresh ink','Some things a PDF will never give you.',
        ["There is a moment when a press first kisses paper that no screen will ever reproduce.","Print is stubborn, expensive, and final — and that is exactly why it makes you careful.","A file can be undone forever. A printed sheet asks you to mean it."]),
      P('12','Practice','Jun 2025',6,'#0e1a26','GeneralDesign/GDesign56.webp','Saying no, kindly','A clear no protects a generous yes.',
        ["Most of design is deciding what not to do. Most of a career is deciding whom not to work with.","A clear no, said early and kindly, protects the generous yes you give to the right project.","Scarcity is not strategy. But honesty about time is a form of respect."]),
      P('13','Colour','May 2025',4,'#a8862f','Official/Official132.webp','Gold is a verb','Used sparingly, it does the most work.',
        ["Gold is not a colour you add; it is an emphasis you earn. A whole page of it says nothing.","Used sparingly — a rule, a full stop, a single letter — it does the most work for the least noise.","Restraint is the luxury. The gold just points at it."]),
      P('14','Craft','Apr 2025',8,'#1a2740','Book/BookCover45.webp','Designing the invisible','The best protocol design is never noticed.',
        ["Working with state protocol taught me that the best design here is the design no one notices.","Clarity under pressure, dignity without drama, the same calm on the worst day as the best.","Invisible is not lazy. Invisible is the hardest thing to do on purpose."]),
      P('15','Story','Mar 2025',5,'#5a1a1a','LogoDesign/Logo19.webp','The fingerprint and the brand','Why Pencemor carries a print, not a polish.',
        ["I named the studio Pencemor — a fingerprint — because a mark of ownership matters more than a mark of shine.","A fingerprint cannot be faked or borrowed. It says: this passed through a real pair of hands.","While our fingerprint stays on top, the worry is mine to carry, not yours."]),
      P('16','Notes','Feb 2025',3,'#243018','GeneralDesign/GDesign83.webp','Three things on my desk','A pen, a proof, and a patient cup of tea.',
        ["A pen that never quite runs dry, a proof with red all over it, and a cup of tea going slowly cold.","These three keep me honest: ink to commit, marks to correct, and a pause to think again.","Tools are small confessions of how you like to work. Mine say: slowly, by hand, with patience."]),
    ];

    const PAGE_SIZE = 4;
    const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60) || 'note';
    POSTS.forEach((p) => { if (!p.slug) p.slug = String(p.num || slugify(p.title)); });   // built-ins: numeric link
    let pageCount = Math.ceil(POSTS.length / PAGE_SIZE);
    let page = 1;

    /* ----- rich preview ----- */
    const els = {
      ghost: $('#blogGhost'), card: $('#blogCard'),
      img: $('#bcImg'), tag: $('#bcTag'), title: $('#bcTitle'),
      sub: $('#bcSub'), meta: $('#bcMeta'), read: $('#bcRead'),
    };
    let curPost = null;
    /* translate a post into the active language (falls back to English) */
    const blogLang = () => (document.documentElement.dataset.lang || 'en');
    const L = (p) => {
      const cm = p._i18n && p._i18n[blogLang()];
      if (cm && (cm.title || cm.body)) {
        return { num: p.num, accent: p.accent, img: p.img, read: p.read, tag: p.tag, date: p.date,
                 title: cm.title || p.title, sub: cm.subtitle || p.sub,
                 body: cm.body ? String(cm.body).split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean) : p.body };
      }
      const t = window.BLOG_I18N && window.BLOG_I18N[blogLang()] && window.BLOG_I18N[blogLang()][p.num];
      if (!t) return p;
      return { num: p.num, accent: p.accent, img: p.img, read: p.read,
               tag: t.tag || p.tag, title: t.title || p.title, sub: t.sub || p.sub,
               date: t.date || p.date, body: t.body || p.body };
    };
    const dT = (k, fb) => (window.BQ_DICT && window.BQ_DICT[k]) || fb;
    const preview = (p) => {
      if (!p) return;
      curPost = p;
      const q = L(p);
      els.card.classList.add('swapping');
      if (els.ghost) els.ghost.textContent = p.num;
      if (p.accent) els.card.style.background = p.accent;
      setTimeout(() => {
        if (els.img)  els.img.src = q.img;
        if (els.tag)  els.tag.textContent = q.tag;
        if (els.title) els.title.innerHTML = hl(q.title);
        if (els.sub)  els.sub.textContent = q.sub;
        if (els.meta) els.meta.textContent = `${q.tag.toUpperCase()} · ${q.date.toUpperCase()}`;
        if (els.read) els.read.textContent = dT('blog.min', '{n} MIN').replace('{n}', p.read);
        els.card.classList.remove('swapping');
      }, 160);
    };

    /* ----- render the current page of rows ----- */
    let curCat = 'all';
    const catNorm = (s) => String(s || '').trim().toLowerCase();
    const viewPosts = () => curCat === 'all' ? POSTS : POSTS.filter(p => catNorm(L(p).tag) === curCat);
    const renderFilters = () => {
      const anchor = layout || list;
      if (!anchor || !anchor.parentNode) return;
      let bar = anchor.parentNode.querySelector('.blog-filters');
      if (!bar) { bar = document.createElement('div'); bar.className = 'blog-filters'; anchor.parentNode.insertBefore(bar, anchor); }
      const cats = []; const seen = {};
      POSTS.forEach(p => { const c = (L(p).tag || '').trim(); const k = catNorm(c); if (c && !seen[k]) { seen[k] = 1; cats.push(c); } });
      const allLabel = (window.BQ_DICT && window.BQ_DICT['blog.all']) || 'All';
      const chip = (label, val, active) => `<button class="blog-filter${active ? ' is-active' : ''}" data-cat="${catNorm(val)}">${label}</button>`;
      bar.innerHTML = chip(allLabel, 'all', curCat === 'all') + cats.map(c => chip(c, c, catNorm(c) === curCat)).join('');
      bar.querySelectorAll('.blog-filter').forEach(b => b.addEventListener('click', () => {
        curCat = b.getAttribute('data-cat'); page = 1; renderPage();
      }));
    };
    const renderPage = () => {
      renderFilters();
      list.querySelectorAll('.index-row').forEach(r => r.remove());
      const FP = viewPosts();
      pageCount = Math.max(1, Math.ceil(FP.length / PAGE_SIZE));
      if (page > pageCount) page = 1;
      const start = (page - 1) * PAGE_SIZE;
      const slice = FP.slice(start, start + PAGE_SIZE);
      slice.forEach((p, i) => {
        const q = L(p);
        const a = document.createElement('a');
        a.href = '#'; a.className = 'index-row' + (i === 0 ? ' is-active' : '');
        a.innerHTML =
          `<span class="mono index-row-num">${p.num} / ${String(FP.length).padStart(2,'0')}</span>
           <span class="index-row-title">${q.title}</span>
           <span class="mono index-row-tag">${q.tag}</span>`;
        a.addEventListener('mouseenter', () => { setActive(a); preview(p); });
        a.addEventListener('click', (e) => { e.preventDefault(); openReader(p); });
        list.appendChild(a);
      });
      if (slice[0]) preview(slice[0]);
      renderPager();
    };
    const setActive = (row) => { list.querySelectorAll('.index-row').forEach(r => r.classList.remove('is-active')); row.classList.add('is-active'); };

    /* ----- pager ----- */
    const pagesWrap = $('#blogPages');
    const goTo = (n) => { page = Math.min(Math.max(1, n), pageCount); renderPage(); layout.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    const renderPager = () => {
      if (!pagesWrap) return;
      pagesWrap.innerHTML = '';
      for (let n = 1; n <= pageCount; n++) {
        const b = document.createElement('button');
        b.className = 'blog-page' + (n === page ? ' is-active' : '');
        b.textContent = String(n).padStart(2, '0');
        b.addEventListener('click', () => goTo(n));
        pagesWrap.appendChild(b);
      }
      const prev = $('#blogPrev'), next = $('#blogNext');
      if (prev) prev.disabled = page === 1;
      if (next) next.disabled = page === pageCount;
    };
    $('#blogPrev')?.addEventListener('click', () => goTo(page - 1));
    $('#blogNext')?.addEventListener('click', () => goTo(page + 1));
    $('#blogGoForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const n = parseInt($('#blogGoInput').value, 10);
      if (n >= 1 && n <= pageCount) { goTo(n); $('#blogGoInput').value = ''; }
      else { const i = $('#blogGoInput'); i.value = ''; i.placeholder = `1–${pageCount}`; }
    });

    /* ----- reader (image, author, date, body, like, comments) ----- */
    const rd = {
      img: $('#rdImg'), tag: $('#rdTag'), title: $('#rdTitle'), date: $('#rdDate'),
      read: $('#rdRead'), text: $('#rdText'), like: $('#rdLike'), likeCount: $('#rdLikeCount'),
      commentCount: $('#rdCommentCount'), comments: $('#rdComments'),
      cForm: $('#rdCommentForm'), cName: $('#rdCommentName'), cText: $('#rdCommentText'),
      highlight: $('#rdHighlight'), prev: $('#rdPrev'), next: $('#rdNext'),
      scroll: $('#rdScroll'), top: $('#rdTop'), moreGrid: $('#rdMoreGrid'),
    };
    let curNum = null;
    let curPostObj = null;
    const lkKey = (n) => `bq_blog_like_${n}`;
    const cmKey = (n) => `bq_blog_cmts_${n}`;
    const baseLikes = (n) => 11 + (parseInt(n, 10) * 7) % 30;
    const getComments = (n) => { try { return JSON.parse(localStorage.getItem(cmKey(n)) || '[]'); } catch (e) { return []; } };
    const esc = (s) => String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    /* real, shared likes + comments on published posts (Supabase); built-in demo notes stay on localStorage */
    const SBE = () => window.BQ_SUPA || {};
    const sbHeaders = () => ({ apikey: SBE().key, Authorization: 'Bearer ' + SBE().key, 'Content-Type': 'application/json' });
    const profile = () => { try { return JSON.parse(localStorage.getItem('bq_blog_profile') || '{}'); } catch (e) { return {}; } };
    const saveProfile = (pp) => { try { localStorage.setItem('bq_blog_profile', JSON.stringify(pp)); } catch (e) {} };
    const myToken = () => { const pp = profile(); if (!pp.token) { pp.token = 'bq' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); saveProfile(pp); } return pp.token; };
    let curLikes = 0, curLiked = false;
    const renderLike = () => {
      if (rd.likeCount) rd.likeCount.textContent = curLikes;
      rd.like.classList.toggle('is-liked', curLiked);
      rd.like.setAttribute('aria-pressed', curLiked ? 'true' : 'false');
    };
    const renderCommentList = (l) => {
      const cTpl = (window.BQ_DICT && window.BQ_DICT['blog.comments']) || '{n} comments';
      rd.commentCount.textContent = cTpl.replace('{n}', l.length);
      const empty = (window.BQ_DICT && window.BQ_DICT['blog.noComments']) || 'No comments yet — be the first to write one.';
      rd.comments.innerHTML = l.length ? l.map(c =>
        `<div class="reader-comment"><div class="reader-comment-head"><strong>${esc(c.name)}</strong><span class="mono">${new Date(c.at).toLocaleDateString()}</span></div><p>${esc(c.text)}</p></div>`).join('')
        : `<p class="reader-comment-empty">${empty}</p>`;
    };
    const loadEngagement = (p) => {
      if (p && p.id != null && SBE().url) {
        curLikes = 0; curLiked = false; renderLike(); renderCommentList([]);
        fetch(SBE().url + '/rest/v1/post_likes?post_id=eq.' + p.id + '&select=token', { headers: sbHeaders(), cache: 'no-store' })
          .then((r) => r.ok ? r.json() : []).then((rows) => { if (curPostObj !== p) return; const tok = myToken(); curLikes = rows.length; curLiked = rows.some((x) => x.token === tok); renderLike(); }).catch(() => {});
        fetch(SBE().url + '/rest/v1/comments?post_id=eq.' + p.id + '&select=name,body,created_at&order=created_at.desc', { headers: sbHeaders(), cache: 'no-store' })
          .then((r) => r.ok ? r.json() : []).then((rows) => { if (curPostObj !== p) return; renderCommentList(rows.map((c) => ({ name: c.name, text: c.body, at: c.created_at }))); }).catch(() => {});
      } else {
        const liked = localStorage.getItem(lkKey(p.num)) === '1';
        curLiked = liked; curLikes = baseLikes(p.num) + (liked ? 1 : 0); renderLike();
        renderCommentList(getComments(p.num).slice().reverse());
      }
    };
    const blogBase = () => { const lang = document.documentElement.dataset.lang || 'en'; return (lang && lang !== 'en' ? '/' + lang : '') + '/blog'; };
    let curSlug = null, pendingSlug = null;
    const findPostBySlug = (slug) => { const id = parseInt(slug, 10); return POSTS.find((p) => p.slug === slug || (p.id != null && p.id === id) || String(p.num) === slug) || null; };
    const openReader = (p, fromPop) => {
      curNum = p.num;
      curPostObj = p;
      curSlug = p.slug || slugify(p.title);
      const q = L(p);
      if (rd.img) { rd.img.src = q.img; rd.img.alt = q.title; }
      if (rd.tag) rd.tag.textContent = q.tag;
      if (rd.title) rd.title.innerHTML = q.title;
      if (rd.date) rd.date.textContent = (q.date || '').toUpperCase();
      if (rd.read) rd.read.textContent = dT('blog.minRead', '{n} MIN READ').replace('{n}', p.read);
      if (rd.highlight) rd.highlight.textContent = q.sub || p.sub || '';
      if (rd.text) rd.text.innerHTML = q.body.map(x => `<p>${x}</p>`).join('');
      if (rd.cName && !rd.cName.value) { const pn = profile().name; if (pn) rd.cName.value = pn; }   // prefill from the saved profile
      loadEngagement(p);
      renderMore(p);
      reader.classList.add('is-open'); reader.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (rd.scroll) rd.scroll.scrollTop = 0;
      if (rd.top) rd.top.classList.remove('is-shown');
      try { document.title = String(q.title || '').replace(/<[^>]+>/g, '') + ' — Barakat Qurtas'; } catch (e) {}
      try { if (window.fbq) fbq('track', 'ViewContent', { content_type: 'article', content_name: String(q.title || '').replace(/<[^>]+>/g, '') }); } catch (e) {}
      if (!fromPop) { try { history.pushState({ bqPost: curSlug }, '', blogBase() + '/' + curSlug); } catch (e) {} }
    };
    /* "More from the journal" grid + prev/next post navigation */
    let curPrev = null, curNext = null;
    const renderMore = (p) => {
      const idx = POSTS.indexOf(p);
      curPrev = idx > 0 ? POSTS[idx - 1] : null;
      curNext = (idx > -1 && idx < POSTS.length - 1) ? POSTS[idx + 1] : null;
      if (rd.prev) rd.prev.disabled = !curPrev;
      if (rd.next) rd.next.disabled = !curNext;
      const rel = [];
      for (let i = 1; rel.length < 4 && i < POSTS.length; i++) { const q = POSTS[(Math.max(0, idx) + i) % POSTS.length]; if (q !== p && rel.indexOf(q) < 0) rel.push(q); }
      if (rd.moreGrid) {
        rd.moreGrid.innerHTML = rel.map(q => { const lq = L(q); return `<button class="reader-more-card" data-slug="${esc(q.slug || q.num)}"><span class="rm-img"><img src="${esc(lq.img)}" alt="" loading="lazy"></span><span class="rm-t"><span class="rm-tag">${esc(lq.tag || '')}</span><span class="rm-title">${esc(String(lq.title || '').replace(/<[^>]+>/g, ''))}</span></span></button>`; }).join('');
        rd.moreGrid.querySelectorAll('.reader-more-card').forEach(b => b.addEventListener('click', () => { const q = findPostBySlug(b.getAttribute('data-slug')); if (q) { if (rd.scroll) rd.scroll.scrollTop = 0; openReader(q); } }));
      }
    };
    const closeReaderDom = () => { reader.classList.remove('is-open'); reader.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
    const closeReader = () => {   // the × exits straight to the blog list
      closeReaderDom();
      if (/\/blog\/[^/]+/.test(location.pathname)) { try { history.replaceState(null, '', blogBase()); } catch (e) {} }
    };
    $('#readerClose')?.addEventListener('click', closeReader);
    $('#readerBack')?.addEventListener('click', () => { if (history.state && history.state.bqPost && history.length > 1) history.back(); else closeReader(); });
    reader?.addEventListener('click', (e) => { if (e.target === reader) closeReader(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && reader.classList.contains('is-open')) closeReader(); });
    rd.prev?.addEventListener('click', () => { if (curPrev) { if (rd.scroll) rd.scroll.scrollTop = 0; openReader(curPrev); } });
    rd.next?.addEventListener('click', () => { if (curNext) { if (rd.scroll) rd.scroll.scrollTop = 0; openReader(curNext); } });
    rd.top?.addEventListener('click', () => { if (rd.scroll) rd.scroll.scrollTo({ top: 0, behavior: 'smooth' }); });
    rd.scroll?.addEventListener('scroll', () => { if (rd.top) rd.top.classList.toggle('is-shown', rd.scroll.scrollTop > 420); }, { passive: true });
    rd.like?.addEventListener('click', () => {
      const p = curPostObj; if (!p) return;
      if (p.id != null && SBE().url) {
        const tok = myToken();
        if (!curLiked) {
          curLiked = true; curLikes++; renderLike();
          fetch(SBE().url + '/rest/v1/post_likes', { method: 'POST', headers: Object.assign(sbHeaders(), { Prefer: 'resolution=ignore-duplicates' }), body: JSON.stringify({ post_id: p.id, token: tok }) }).catch(() => {});
        } else {
          curLiked = false; curLikes = Math.max(0, curLikes - 1); renderLike();
          fetch(SBE().url + '/rest/v1/post_likes?post_id=eq.' + p.id + '&token=eq.' + encodeURIComponent(tok), { method: 'DELETE', headers: sbHeaders() }).catch(() => {});
        }
      } else {
        const liked = localStorage.getItem(lkKey(p.num)) === '1';
        if (liked) localStorage.removeItem(lkKey(p.num)); else localStorage.setItem(lkKey(p.num), '1');
        curLiked = !liked; curLikes = baseLikes(p.num) + (curLiked ? 1 : 0); renderLike();
      }
    });
    rd.cForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const p = curPostObj; if (!p) return;
      const name = (rd.cName.value || '').trim() || dT('blog.anon', 'Anonymous');
      const text = (rd.cText.value || '').trim();
      if (!text) { rd.cText.focus(); return; }
      const pp = profile(); pp.name = name; saveProfile(pp);   // remember the visitor for next time (lightweight profile)
      if (p.id != null && SBE().url) {
        const btn = rd.cForm.querySelector('button[type="submit"], button:not([type])'); if (btn) btn.disabled = true;
        fetch(SBE().url + '/rest/v1/comments', { method: 'POST', headers: Object.assign(sbHeaders(), { Prefer: 'return=minimal' }), body: JSON.stringify({ post_id: p.id, name: name, body: text }) })
          .then(() => { rd.cText.value = ''; loadEngagement(p); }).catch(() => {}).then(() => { if (btn) btn.disabled = false; });
      } else {
        const l = getComments(p.num); l.push({ name, text, at: Date.now() });
        try { localStorage.setItem(cmKey(p.num), JSON.stringify(l)); } catch (x) {}
        rd.cText.value = ''; renderCommentList(getComments(p.num).slice().reverse());
      }
    });
    /* share — open the native share sheet or copy the link; the shared link
       carries the post's own cover (rewritten by the Pages Function). */
    $('#rdShare')?.addEventListener('click', async () => {
      const url = location.origin + blogBase() + '/' + (curSlug || '');
      const title = String((curPostObj && L(curPostObj).title) || 'Barakat Qurtas').replace(/<[^>]+>/g, '');
      if (navigator.share) { try { await navigator.share({ title, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
      try { await navigator.clipboard.writeText(url); const b = $('#rdShare'); if (b) { b.classList.add('is-copied'); setTimeout(() => b.classList.remove('is-copied'), 1600); } } catch (e) {}
    });
    /* deep-link + back/forward: keep the reader in sync with /blog/<slug> */
    window.__bqOpenPostSlug = (slug) => { if (!slug) return; const p = findPostBySlug(slug); if (p) openReader(p, true); else pendingSlug = slug; };
    window.__bqCloseReader = () => { if (reader.classList.contains('is-open')) closeReaderDom(); };
    window.addEventListener('popstate', () => {
      const m = location.pathname.match(/\/blog\/([^\/?#]+)/);
      if (m) { const slug = decodeURIComponent(m[1]); if (!(curSlug === slug && reader.classList.contains('is-open'))) window.__bqOpenPostSlug(slug); }
      else if (reader.classList.contains('is-open')) closeReaderDom();
    });
    /* opened straight at /blog/<slug> (deep link / refresh) — built-ins open now, DB posts after they load */
    (function () { const m = location.pathname.match(/\/blog\/([^\/?#]+)/); if (m) { const slug = decodeURIComponent(m[1]); const p = findPostBySlug(slug); if (p) openReader(p, true); else pendingSlug = slug; } })();

    renderPage();
        /* studio-managed posts from Supabase, merged ahead of the built-in notes.
       Rebuilt from the built-ins on each call (idempotent), so publishing from
       the dashboard can refresh the live blog instantly via window.__bqReloadBlog.
       The publishable key is public/safe; row-level security keeps the table
       read-only for visitors, while writes go through the secure Edge Function. */
    /* homepage "Latest from the blog" — auto-fills with the newest posts (DB first), updates on publish */
    const renderLatest = () => {
      const grid = document.querySelector('.latest-blog-grid');
      if (!grid) return;
      const latest = POSTS.slice(0, 3);
      if (!latest.length) return;
      grid.innerHTML = latest.map((p) => {
        const q = L(p);
        const title = String(q.title || '').replace(/<[^>]+>/g, '');
        return `<article class="blog-card" data-slug="${esc(p.slug || p.num)}" tabindex="0" role="button">
          <span class="mono blog-meta"><i class="fa-solid fa-calendar"></i> ${esc(q.date || '')} · <i class="fa-solid fa-clock"></i> ${esc(String(p.read || 4))} min</span>
          <h3>${esc(title)}</h3>
          <p>${esc(q.sub || '')}</p>
          <span class="blog-more"><span>${dT('blog.more', 'Read the essay')}</span> <i class="fa-solid fa-arrow-right"></i></span>
        </article>`;
      }).join('');
      grid.querySelectorAll('.blog-card').forEach((c) => {
        c.addEventListener('click', (e) => { e.preventDefault(); const p = findPostBySlug(c.getAttribute('data-slug')); if (p) openReader(p); });
      });
    };

    const BUILTIN_POSTS = POSTS.slice();
    const loadCmsPosts = () => {
      const SB = window.BQ_SUPA || {};
      if (!SB.url || !SB.key) return;
      fetch(SB.url + '/rest/v1/posts?select=*&published=eq.true&order=created_at.desc', { headers: { apikey: SB.key }, cache: 'no-store' })
        .then((r) => r.json()).then((rows) => {
          const cms = (Array.isArray(rows) ? rows : []).map((p) => ({
            num: String(p.num || p.id || ''),
            id: p.id,
            slug: String(p.id),
            tag: p.tag || 'Note',
            date: p.date || (p.created_at ? new Date(p.created_at).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : ''),
            read: p.read_minutes || 4,
            accent: p.accent || '#1a2740',
            img: p.cover || '',
            title: p.title || '',
            sub: p.subtitle || '',
            body: String(p.body || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean),
            _i18n: p.i18n || null
          }));
          POSTS = cms.length ? cms : BUILTIN_POSTS;   // DB is the source of truth; built-ins only fall back if the DB is empty/unreachable
          pageCount = Math.ceil(POSTS.length / PAGE_SIZE);
          if (page > pageCount) page = 1;
          renderPage();
          renderLatest();
          if (pendingSlug) { const s = pendingSlug; pendingSlug = null; const p = findPostBySlug(s); if (p) openReader(p, true); }
        }).catch(() => {});
    };
    loadCmsPosts();
    window.__bqReloadBlog = loadCmsPosts;
    window.__bqLangCb.push(() => {
      curCat = 'all';
      renderPage();
      renderLatest();
      if (reader && reader.classList.contains('is-open') && curPostObj) {
        const q = L(curPostObj);
        if (rd.tag) rd.tag.textContent = q.tag;
        if (rd.title) rd.title.innerHTML = q.title;
        if (rd.date) rd.date.textContent = (q.date || '').toUpperCase();
        if (rd.read) rd.read.textContent = dT('blog.minRead', '{n} MIN READ').replace('{n}', curPostObj.read);
        if (rd.text) rd.text.innerHTML = q.body.map(x => `<p>${x}</p>`).join('');
        if (rd.img) rd.img.alt = q.title;
        loadEngagement(curPostObj);
      }
    });
  })();

  /* =======================================================
     9 · SUBSCRIBE
     ======================================================= */
  (function subscribe() {
    const form = $('#subscribeForm');
    if (!form) return;
    const email = $('#subEmail'), status = $('#subStatus');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = (email.value || '').trim();
      const D = window.BQ_DICT || {};
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        status.style.color = 'var(--ink-soft)';
        status.textContent = D['sub.bad'] || '✗ Please enter a valid email.';
        return;
      }
      const SB = window.BQ_SUPA || {};
      const okMsg = D['sub.ok'] || '✓ Subscribed. Welcome to the journal.';
      const dupMsg = D['sub.dup'] || '✓ You are already subscribed — thank you.';
      const errMsg = D['sub.fail'] || '✗ Could not subscribe — please try again.';
      status.style.color = 'var(--ink-muted)';
      status.textContent = '…';
      if (!SB.url || !SB.key) { status.style.color = 'var(--ink)'; status.textContent = okMsg; email.value = ''; return; }
      fetch(SB.url + '/rest/v1/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SB.key, Authorization: 'Bearer ' + SB.key, Prefer: 'return=minimal' },
        body: JSON.stringify({ email: v, lang: (document.documentElement.dataset.lang || 'en') })
      }).then(r => {
        if (r.ok) { status.style.color = 'var(--ink)'; status.textContent = okMsg; email.value = ''; }
        else if (r.status === 409) { status.style.color = 'var(--ink)'; status.textContent = dupMsg; email.value = ''; }
        else { status.style.color = 'var(--ink-soft)'; status.textContent = errMsg; }
      }).catch(() => { status.style.color = 'var(--ink-soft)'; status.textContent = errMsg; });
    });
  })();

})();


/* ---- CMS editor styles (injected here so no separate CSS file edit is needed) ---- */
(function cmsStyles(){
  if (document.getElementById('bq-cms-style')) return;
  var el = document.createElement('style'); el.id = 'bq-cms-style';
  el.textContent = `.cms-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;flex-wrap:wrap}
.cms-status{opacity:.6;font-size:12px}
.cms-list{display:flex;flex-direction:column}
.cms-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 4px;border-bottom:1px solid rgba(128,128,128,.18)}
.cms-row-t{display:flex;flex-direction:column;gap:3px;min-width:0}
.cms-row-t strong{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cms-row-t .mono{opacity:.55;font-size:11px}
.cms-row-act{display:flex;gap:6px;flex-shrink:0}
.cms-mini{width:34px;height:34px;border-radius:9px;border:1px solid rgba(128,128,128,.25);background:transparent;color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s,border-color .15s}
.cms-mini:hover{background:rgba(128,128,128,.14)}
.cms-mini--del:hover{background:rgba(200,60,50,.16);color:#e2554a;border-color:rgba(200,60,50,.4)}
.cms-studio{display:inline-flex;align-items:center;gap:7px;margin-top:16px;font-size:11px;opacity:.5;text-decoration:none;color:inherit}
.cms-studio:hover{opacity:.85}
.cms-form{display:flex;flex-direction:column;gap:14px;max-width:680px}
.cms-field{display:flex;flex-direction:column;gap:6px}
.cms-field>span{font-size:11px;letter-spacing:.04em;text-transform:uppercase;opacity:.6}
.cms-field input,.cms-field textarea{width:100%;padding:11px 13px;border-radius:10px;border:1px solid rgba(128,128,128,.28);background:rgba(128,128,128,.06);color:inherit;font:inherit;font-size:14px;outline:none;transition:border-color .15s,background .15s}
.cms-field input:focus,.cms-field textarea:focus{border-color:currentColor;background:rgba(128,128,128,.1)}
.cms-field textarea{resize:vertical;line-height:1.65;min-height:170px}
.cms-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;align-items:end}
.cms-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:end}
.cms-cats{display:flex;flex-wrap:wrap;gap:7px}
.cms-cat{font:inherit;font-size:12px;padding:7px 15px;border-radius:999px;border:1px solid rgba(128,128,128,.32);background:transparent;color:inherit;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
.cms-cat:hover{border-color:currentColor}
.cms-cat.is-active{background:#bd9a4e;border-color:#bd9a4e;color:#17120a;font-weight:600}
.cms-field--color input[type=color]{height:44px;padding:4px;cursor:pointer;border-radius:10px}
.cms-check{display:flex;align-items:center;gap:9px;cursor:pointer;font-size:14px;user-select:none}
.cms-check input{width:18px;height:18px;cursor:pointer;accent-color:#bd9a4e}
.cms-cover-prev{border-radius:10px;overflow:hidden;border:1px solid rgba(128,128,128,.22);max-height:210px}
.cms-cover-prev img{display:block;width:100%;height:auto;max-height:210px;object-fit:cover}
.cms-cover-prev[hidden]{display:none}
.cms-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:4px}
.cms-savemsg{opacity:.75;font-size:12px}
.cms-file{font:inherit;font-size:13px;color:inherit;cursor:pointer;padding:8px 0}
.cms-uphint{display:block;font-size:11px;opacity:.6;margin-top:4px}
.dash-btn--go{background:#bd9a4e;border-color:#bd9a4e;color:#17120a;font-weight:600}
.dash-btn--go:hover{background:#ccab5f;border-color:#ccab5f}
@media(max-width:560px){.cms-row3{grid-template-columns:1fr 1fr}.cms-form{max-width:none}}`;
  document.head.appendChild(el);
})();

/* =======================================================
   LATEST UPDATES — notification bell (rail + dock)
   Shows posts added in the last 7 days; badge while any are fresh.
   ======================================================= */
(function latest() {
  const $ = (s) => document.querySelector(s);
  const SB = window.BQ_SUPA || {};
  const panel = $('#latestPanel'), backdrop = $('#latestBackdrop'), list = $('#latestList');
  if (!panel || !list) return;
  const bell = $('#railLatest'), bellM = $('#railLatestM');
  const badge = $('#railLatestBadge'), badgeM = $('#railLatestBadgeM');
  const esc = (s) => String(s || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  // launch baseline — Latest only surfaces blogs/works added from here on, so the
  // migrated/built-in posts don't show. After a week the rolling 7-day window takes over.
  const LATEST_SINCE = Date.parse('2026-06-09T00:00:00Z');
  const sinceStamp = () => new Date(Math.max(Date.now() - WEEK, LATEST_SINCE)).toISOString();
  const dict = () => window.BQ_DICT || {};
  const lang = () => document.documentElement.dataset.lang || 'en';
  let items = [], workItems = [], pinItems = [];
  const GH = 'https://api.github.com/repos/Bqurtas/BqurtasPortfolio';
  const CDN = (window.BQ_GALLERY && window.BQ_GALLERY.CDN_BASE) || '';

  const open = () => { panel.classList.add('is-open'); panel.setAttribute('aria-hidden', 'false'); backdrop && backdrop.classList.add('is-open'); };
  const close = () => { panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true'); backdrop && backdrop.classList.remove('is-open'); };
  const toggle = () => (panel.classList.contains('is-open') ? close() : open());
  const setBadge = () => { const on = (items.length + workItems.length + pinItems.length) > 0; if (badge) badge.hidden = !on; if (badgeM) badgeM.hidden = !on; };

  const render = () => {
    const L = lang();
    const newWord = dict()['latest.new'] || 'new';
    const pinHtml = pinItems.map((p) => {
      const img = p.image ? `<img class="latest-item-img" src="${esc(p.image)}" alt="" loading="lazy">` : `<span class="latest-item-img latest-item-img--pin"><i class="fa-solid fa-star"></i></span>`;
      return `<button class="latest-item latest-item--pin" data-kind="pin" data-link="${esc(p.link || '')}">${img}<span class="latest-item-body"><span class="latest-item-tag"><span class="latest-item-new"></span>${esc(p.tag || 'Featured')}</span><span class="latest-item-title">${esc(String(p.title || ''))}</span></span></button>`;
    }).join('');
    const workHtml = workItems.map((w) => {
      const name = dict()['tab.' + w.cat] || w.cat;
      return `<button class="latest-item" data-kind="work" data-cat="${esc(w.cat)}">${w.thumb ? `<img class="latest-item-img" src="${esc(w.thumb)}" alt="" loading="lazy">` : ''}<span class="latest-item-body"><span class="latest-item-tag"><span class="latest-item-new"></span>${esc(name)}</span><span class="latest-item-title">${w.count} ${esc(newWord)}</span></span></button>`;
    }).join('');
    const blogHtml = items.map((p) => {
      const tr = (p.i18n && p.i18n[L]) || {};
      const title = esc(String(tr.title || p.title || '').replace(/<[^>]+>/g, ''));
      const isNew = (Date.now() - new Date(p.created_at).getTime()) < WEEK;
      return `<button class="latest-item" data-kind="post" data-id="${esc(String(p.id))}">${p.cover ? `<img class="latest-item-img" src="${esc(p.cover)}" alt="" loading="lazy">` : ''}<span class="latest-item-body"><span class="latest-item-tag">${isNew ? '<span class="latest-item-new"></span>' : ''}${esc(p.tag || 'Note')}</span><span class="latest-item-title">${title}</span></span></button>`;
    }).join('');
    if (!pinHtml && !workHtml && !blogHtml) { list.innerHTML = `<p class="latest-empty">${esc(dict()['latest.empty'] || 'No new updates this week.')}</p>`; return; }
    list.innerHTML = pinHtml + workHtml + blogHtml;
    list.querySelectorAll('.latest-item').forEach((b) => b.addEventListener('click', () => {
      close();
      const kind = b.getAttribute('data-kind');
      const goTab = (cat) => { if (window.__bqShowRoom) window.__bqShowRoom('design'); setTimeout(() => { const tb = document.querySelector('.tab[data-filter="' + cat + '"]'); if (tb) tb.click(); const w = document.querySelector('.section.work'); if (w) w.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 130); };
      if (kind === 'work') {
        goTab(b.getAttribute('data-cat'));
      } else if (kind === 'pin') {
        const link = b.getAttribute('data-link') || '';
        if (/^https?:\/\//.test(link)) { window.open(link, '_blank', 'noopener'); }
        else if (link) { goTab(link); }
        else if (window.__bqShowRoom) { window.__bqShowRoom('design'); }
      } else {
        const id = b.getAttribute('data-id');
        if (window.__bqShowRoom && document.body.dataset.room !== 'blog') window.__bqShowRoom('blog');
        setTimeout(() => { if (window.__bqOpenPostSlug) window.__bqOpenPostSlug(id); }, 80);
      }
    }));
  };

  const load = () => {
    if (!SB.url) return;
    const since = sinceStamp();
    fetch(SB.url + '/rest/v1/posts?select=id,title,tag,cover,i18n,created_at&published=eq.true&created_at=gte.' + since + '&order=created_at.desc&limit=8', { headers: { apikey: SB.key }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : [])).then((rows) => { items = Array.isArray(rows) ? rows : []; setBadge(); render(); }).catch(() => {});
  };

  /* hand-pinned items the studio added from the dashboard — show for a week */
  const loadPins = () => {
    if (!SB.url) return;
    const since = new Date(Date.now() - WEEK).toISOString();
    fetch(SB.url + '/rest/v1/latest_items?select=id,title,tag,link,image,created_at&active=eq.true&created_at=gte.' + since + '&order=created_at.desc&limit=6', { headers: { apikey: SB.key }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : [])).then((rows) => { pinItems = Array.isArray(rows) ? rows : []; setBadge(); render(); }).catch(() => {});
  };

  /* works added to the repo in the last 7 days, grouped by tab — 2 GitHub calls, cached 30 min */
  const loadWorks = async () => {
    try {
      const CK = 'bq_latest_works';
      const cached = sessionStorage.getItem(CK);
      if (cached) { const o = JSON.parse(cached); if (Date.now() - o.t < 1800000) { workItems = o.w || []; setBadge(); render(); return; } }
      const fc = {}, cols = (window.BQ_GALLERY && window.BQ_GALLERY.COLLECTIONS) || {};
      Object.keys(cols).forEach((k) => { fc[cols[k].folder] = cols[k].cat; });
      const sinceISO = sinceStamp();
      const cr = await fetch(GH + '/commits?sha=main&until=' + sinceISO + '&per_page=1');
      if (!cr.ok) return;
      const cj = await cr.json();
      const base = (Array.isArray(cj) && cj[0]) ? cj[0].sha : null;
      if (!base) return;
      const dr = await fetch(GH + '/compare/' + base + '...main');
      if (!dr.ok) return;
      const dj = await dr.json();
      const IMG = /\.(webp|jpe?g|png|gif|avif|mp4|webm)$/i, byCat = {};
      (dj.files || []).forEach((f) => {
        if (f.status !== 'added' || !IMG.test(f.filename || '')) return;
        const cat = fc[String(f.filename).split('/')[0]];
        if (!cat) return;
        if (!byCat[cat]) byCat[cat] = { count: 0, thumb: CDN + '/' + f.filename };
        byCat[cat].count++;
      });
      workItems = Object.keys(byCat).map((cat) => ({ cat, count: byCat[cat].count, thumb: byCat[cat].thumb }));
      sessionStorage.setItem(CK, JSON.stringify({ t: Date.now(), w: workItems }));
      setBadge(); render();
    } catch (e) {}
  };

  bell && bell.addEventListener('click', toggle);
  bellM && bellM.addEventListener('click', toggle);
  $('#latestClose') && $('#latestClose').addEventListener('click', close);
  backdrop && backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('is-open')) close(); });
  if (window.__bqLangCb) window.__bqLangCb.push(render);
  load(); loadWorks(); loadPins();
  window.__bqReloadLatest = () => { load(); loadPins(); try { sessionStorage.removeItem('bq_latest_works'); } catch (e) {} loadWorks(); };
})();
