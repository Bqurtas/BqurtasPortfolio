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
      if (toTop) toTop.classList.toggle('is-shown', h.scrollTop > 600);
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

    let hideT;
    const show = (link) => {
      const r = ROOMS[link.dataset.route];
      if (!r) return;
      clearTimeout(hideT);
      $('#rcN', card).textContent = r.n;
      $('#rcTag', card).textContent = r.tag;
      $('#rcTitle', card).textContent = r.name;
      $('#rcDesc', card).textContent = r.desc;
      $('#rcCount', card).textContent = r.count;
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
    const buildMarquee = () => {
      if (!track || !wrap) return;
      const unit = DISC_ORDER.map(d =>
        `<span class="hero-disc" data-disc="${d}"><i class="fa-solid ${ICONS[d]}"></i> ${d}</span><span class="hero-sep">✦</span>`
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
    let rb; window.addEventListener('resize', () => { clearTimeout(rb); rb = setTimeout(buildMarquee, 250); });

    /* delegated discipline hover (survives marquee rebuild) */
    let curDisc = null;
    const showAlbum = (item) => {
      const info = DISC[item.dataset.disc];
      if (!info) return;
      curDisc = item;
      info.imgs.forEach((src, i) => { if (album[i]) album[i].src = src; });
      hfTitle.textContent = item.dataset.disc;
      hfSub.textContent = `${info.count} works · click to open`;
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
        hfSub.textContent = 'Designer · Hewlêr';
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
      business: { tag: 'Stationery',              desc: 'Business cards and personal & client stationery.' },
      invoices: { tag: 'Stationery',              desc: 'Letterhead, invoice, and receipt systems.' },
      video:    { tag: 'Motion',                  desc: 'Documentary edits, motion reels, and media coverage.' },
      other:    { tag: 'Miscellany',              desc: 'Flex banners, type experiments, and the small things.' },
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

    let hideT;
    const show = (tab) => {
      const f = tab.dataset.filter;
      const info = INFO[f]; if (!info) return;
      clearTimeout(hideT);
      const name = (tab.querySelector('.tab-label')?.textContent || f).trim();
      const count = countFor(f);
      $('#tcTag', card).textContent = info.tag;
      $('#tcTitle', card).textContent = name;
      $('#tcDesc', card).textContent = info.desc;
      $('#tcN', card).textContent = count || '';
      $('#tcCount', card).innerHTML = `<i class="fa-solid fa-layer-group"></i> ${count} works · click to filter`;

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

    const reply = (msg) => {
      const m = msg.toLowerCase();
      let best = null, score = 0;
      KB.forEach(item => {
        const s = item.k.reduce((acc, kw) => acc + (m.includes(kw) ? kw.length : 0), 0);
        if (s > score) { score = s; best = item; }
      });
      return best ? best.a : FALLBACK;
    };

    const add = (who, html) => {
      const el = document.createElement('div');
      el.className = `chat-msg chat-msg--${who}`;
      el.innerHTML = html;
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
      return el;
    };
    const typing = () => {
      const el = add('bot', '<span class="chat-typing"><i></i><i></i><i></i></span>');
      el.classList.add('is-typing');
      return el;
    };
    const botReply = (msg) => {
      const t = typing();
      setTimeout(() => {
        t.classList.remove('is-typing');
        t.innerHTML = reply(msg);
        body.scrollTop = body.scrollHeight;
      }, 550 + Math.random() * 400);
    };

    const QUICK = ['Services', 'Pricing', 'Timeline', 'Contact'];
    const buildQuick = () => {
      quick.innerHTML = '';
      QUICK.forEach(q => {
        const b = document.createElement('button');
        b.className = 'chat-chip'; b.textContent = q;
        b.addEventListener('click', () => send(q));
        quick.appendChild(b);
      });
    };

    const send = (text) => {
      add('me', text.replace(/</g, '&lt;'));
      botReply(text);
    };

    let greeted = false;
    const open = () => {
      panel.classList.add('is-open');
      triggers.forEach(t => t.classList.add('is-active'));
      panel.setAttribute('aria-hidden', 'false');
      if (!greeted) {
        greeted = true;
        setTimeout(() => add('bot', "Hi! 👋 I'm the studio assistant. How can I help — <b>services</b>, <b>pricing</b>, or starting a <b>project</b>?"), 250);
        buildQuick();
      }
      setTimeout(() => input.focus(), 300);
    };
    const close = () => {
      panel.classList.remove('is-open');
      triggers.forEach(t => t.classList.remove('is-active'));
      panel.setAttribute('aria-hidden', 'true');
    };
    triggers.forEach(t => t.addEventListener('click', () => panel.classList.contains('is-open') ? close() : open()));
    min && min.addEventListener('click', close);
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
  (function dashboard() {
    const dash = $('#dash');
    if (!dash) return;
    const KEY = 'bqurtas-studio';           // access key
    const gate = $('#dashGate'), main = $('#dashMain'), view = $('#dashView');
    const hint = $('#dashHint');
    let unlocked = sessionStorage.getItem('bq_dash_ok') === '1';

    const openDash = () => {
      dash.classList.add('is-open');
      dash.setAttribute('aria-hidden', 'false');
      if (unlocked) showConsole(); else { gate.hidden = false; main.hidden = true; setTimeout(() => $('#dashKey')?.focus(), 200); }
    };
    const closeDash = () => { dash.classList.remove('is-open'); dash.setAttribute('aria-hidden', 'true'); };

    /* triggers: URL hash #studio, or Ctrl/Cmd+Shift+B, or 5 quick clicks on rail logo */
    if (location.hash === '#studio') openDash();
    window.addEventListener('hashchange', () => { if (location.hash === '#studio') openDash(); });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'b') { e.preventDefault(); openDash(); }
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

    $('#dashLoginForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = $('#dashKey').value.trim();
      if (val === KEY) {
        unlocked = true; sessionStorage.setItem('bq_dash_ok', '1');
        showConsole();
      } else {
        hint.textContent = '✗ Wrong key. (hint: bqurtas-studio)';
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
          <div class="dash-card"><span class="dash-card-n">${total}</span><span class="mono">Total works</span></div>
          <div class="dash-card"><span class="dash-card-n">${cats}</span><span class="mono">Collections</span></div>
          <div class="dash-card"><span class="dash-card-n">${leads.length}</span><span class="mono">Leads stored</span></div>
          <div class="dash-card"><span class="dash-card-n">5</span><span class="mono">Languages</span></div>
        </div>
        <p class="dash-note mono">Welcome back, Barakat. Studio console is private to you — data lives in this browser.</p>`;
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
      if (!leads.length) { view.innerHTML = `<p class="dash-empty mono"><i class="fa-solid fa-inbox"></i><br>No leads yet. Pitches from the Contact form appear here.</p>`; return; }
      view.innerHTML = `<div class="dash-leads">` + leads.slice().reverse().map(l =>
        `<div class="dash-lead">
           <div class="dash-lead-top"><strong>${esc(l.name)}</strong><span class="mono">${l.type || ''}</span></div>
           <span class="mono dash-lead-mail">${esc(l.email)}</span>
           <p>${esc(l.message || '')}</p>
           <span class="mono dash-lead-meta">${l.budget || '—'} · ${l.timeline || '—'} · ${new Date(l.at).toLocaleDateString()}</span>
         </div>`).join('') + `</div>
         <button class="dash-btn dash-btn--danger" id="dashClearLeads"><i class="fa-solid fa-trash"></i> Clear all leads</button>`;
      $('#dashClearLeads')?.addEventListener('click', () => {
        if (confirm('Delete all stored leads?')) { localStorage.removeItem('bq_pitches'); renderLeads(); }
      });
    };
    const renderSettings = () => {
      view.innerHTML = `
        <div class="dash-set">
          <label class="dash-row"><span>Show intro splash on load</span>
            <input type="checkbox" id="setSplash" ${localStorage.getItem('bq_splash') === 'off' ? '' : 'checked'}></label>
          <label class="dash-row"><span>Theme</span>
            <select id="setTheme"><option value="light">Light</option><option value="dark">Dark</option></select></label>
          <button class="dash-btn" id="setReset"><i class="fa-solid fa-rotate"></i> Reset saved preferences</button>
        </div>
        <p class="dash-note mono">Access key: <b>${KEY}</b> · Open anytime with Ctrl/⌘ + Shift + B, or 5× click the Bq logo.</p>`;
      $('#setSplash').addEventListener('change', (e) => localStorage.setItem('bq_splash', e.target.checked ? 'on' : 'off'));
      const themeSel = $('#setTheme'); themeSel.value = document.documentElement.dataset.theme || 'light';
      themeSel.addEventListener('change', (e) => { document.documentElement.dataset.theme = e.target.value; try { localStorage.setItem('bq_theme', e.target.value); } catch (x) {} });
      $('#setReset').addEventListener('click', () => { if (confirm('Reset saved preferences?')) { ['bq_theme','bq_lang','bq_splash'].forEach(k => localStorage.removeItem(k)); alert('Done.'); } });
    };
    const esc = (s) => String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

    const VIEWS = { overview: renderOverview, works: renderWorks, leads: renderLeads, settings: renderSettings };
    const showConsole = () => {
      gate.hidden = true; main.hidden = false;
      renderOverview();
    };
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
    const POSTS = [
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
    const pageCount = Math.ceil(POSTS.length / PAGE_SIZE);
    let page = 1;

    /* ----- rich preview ----- */
    const els = {
      ghost: $('#blogGhost'), card: $('#blogCard'),
      img: $('#bcImg'), tag: $('#bcTag'), title: $('#bcTitle'),
      sub: $('#bcSub'), meta: $('#bcMeta'), read: $('#bcRead'),
    };
    let curPost = null;
    const preview = (p) => {
      if (!p) return;
      curPost = p;
      els.card.classList.add('swapping');
      if (els.ghost) els.ghost.textContent = p.num;
      if (p.accent) els.card.style.background = p.accent;
      setTimeout(() => {
        if (els.img)  els.img.src = p.img;
        if (els.tag)  els.tag.textContent = p.tag;
        if (els.title) els.title.innerHTML = hl(p.title);
        if (els.sub)  els.sub.textContent = p.sub;
        if (els.meta) els.meta.textContent = `${p.tag.toUpperCase()} · ${p.date.toUpperCase()}`;
        if (els.read) els.read.textContent = `${p.read} MIN`;
        els.card.classList.remove('swapping');
      }, 160);
    };

    /* ----- render the current page of rows ----- */
    const renderPage = () => {
      list.querySelectorAll('.index-row').forEach(r => r.remove());
      const start = (page - 1) * PAGE_SIZE;
      const slice = POSTS.slice(start, start + PAGE_SIZE);
      slice.forEach((p, i) => {
        const a = document.createElement('a');
        a.href = '#'; a.className = 'index-row' + (i === 0 ? ' is-active' : '');
        a.innerHTML =
          `<span class="mono index-row-num">${p.num} / ${String(POSTS.length).padStart(2,'0')}</span>
           <span class="index-row-title">${p.title}</span>
           <span class="mono index-row-tag">${p.tag}</span>`;
        a.addEventListener('mouseenter', () => { setActive(a); preview(p); });
        a.addEventListener('click', (e) => { e.preventDefault(); openReader(p); });
        list.appendChild(a);
      });
      preview(slice[0]);
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
    };
    let curNum = null;
    const lkKey = (n) => `bq_blog_like_${n}`;
    const cmKey = (n) => `bq_blog_cmts_${n}`;
    const baseLikes = (n) => 11 + (parseInt(n, 10) * 7) % 30;
    const getComments = (n) => { try { return JSON.parse(localStorage.getItem(cmKey(n)) || '[]'); } catch (e) { return []; } };
    const esc = (s) => String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const renderLike = () => {
      const liked = localStorage.getItem(lkKey(curNum)) === '1';
      if (rd.likeCount) rd.likeCount.textContent = baseLikes(curNum) + (liked ? 1 : 0);
      rd.like.classList.toggle('is-liked', liked);
      rd.like.setAttribute('aria-pressed', liked ? 'true' : 'false');
    };
    const renderComments = () => {
      const l = getComments(curNum);
      rd.commentCount.textContent = `${l.length} comment${l.length === 1 ? '' : 's'}`;
      rd.comments.innerHTML = l.length ? l.slice().reverse().map(c =>
        `<div class="reader-comment"><div class="reader-comment-head"><strong>${esc(c.name)}</strong><span class="mono">${new Date(c.at).toLocaleDateString()}</span></div><p>${esc(c.text)}</p></div>`).join('')
        : `<p class="reader-comment-empty">No comments yet — be the first to write one.</p>`;
    };
    const openReader = (p) => {
      curNum = p.num;
      if (rd.img) { rd.img.src = p.img; rd.img.alt = p.title; }
      if (rd.tag) rd.tag.textContent = p.tag;
      if (rd.title) rd.title.innerHTML = p.title;
      if (rd.date) rd.date.textContent = (p.date || '').toUpperCase();
      if (rd.read) rd.read.textContent = `${p.read} MIN READ`;
      if (rd.text) rd.text.innerHTML = p.body.map(x => `<p>${x}</p>`).join('');
      renderLike(); renderComments();
      reader.classList.add('is-open'); reader.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden'; reader.scrollTop = 0;
    };
    const closeReader = () => { reader.classList.remove('is-open'); reader.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
    $('#readerClose')?.addEventListener('click', closeReader);
    reader?.addEventListener('click', (e) => { if (e.target === reader) closeReader(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && reader.classList.contains('is-open')) closeReader(); });
    rd.like?.addEventListener('click', () => {
      const liked = localStorage.getItem(lkKey(curNum)) === '1';
      if (liked) localStorage.removeItem(lkKey(curNum)); else localStorage.setItem(lkKey(curNum), '1');
      renderLike();
    });
    rd.cForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (rd.cName.value || '').trim() || 'Anonymous';
      const text = (rd.cText.value || '').trim();
      if (!text) { rd.cText.focus(); return; }
      const l = getComments(curNum); l.push({ name, text, at: Date.now() });
      try { localStorage.setItem(cmKey(curNum), JSON.stringify(l)); } catch (x) {}
      rd.cText.value = ''; renderComments();
    });

    renderPage();
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
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        status.style.color = 'var(--ember)';
        status.textContent = '✗ Please enter a valid email.';
        return;
      }
      let subs = [];
      try { subs = JSON.parse(localStorage.getItem('bq_subscribers') || '[]'); } catch (x) {}
      if (subs.includes(v)) {
        status.style.color = 'var(--gold)';
        status.textContent = '✓ You are already subscribed — thank you.';
      } else {
        subs.push(v);
        try { localStorage.setItem('bq_subscribers', JSON.stringify(subs)); } catch (x) {}
        status.style.color = 'var(--gold)';
        status.textContent = '✓ Subscribed. Welcome to the journal.';
      }
      email.value = '';
    });
  })();

})();
