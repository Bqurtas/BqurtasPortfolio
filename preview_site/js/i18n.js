/* =========================================================
   Barakat Qurtas — i18n
   Languages: Sorani Kurdish (ku) · Kurmanci (kmr) · Arabic (ar) · English (en) · Français (fr)
   ========================================================= */

window.I18N = {
  en: {
    dir: 'ltr',
    'lang.select': 'Select your language',
    'blog.all': 'All',
    'hero.ai.future': 'Shaping the future',
    'hero.hello': "Hello, I'm",
    'pj.eyebrow': 'Design Studio',
    'pj.tag': 'While our fingerprint sits your work atop, let your <em>every worry stop</em>.',
    'pj.desc': 'A studio for brand identity, editorial, and print — where every piece carries a real mark of care. Your project, signed by hand.',
    'pj.contact': 'Get in touch', 'pj.work': 'View the work',
    'pj.tl': '№ 02 — The Studio', 'pj.tr': 'Hewlêr · Est. 2014',
    'rh.return': 'Return to start', 'rh.scroll': 'Scroll',
    'rh.blog.num': '№ 04 · The Journal', 'rh.blog.title': 'The <em>Journal</em>',
    'rh.blog.sub': 'Short notes from the desk — on typography, place, and the slow craft of design.',
    'rh.bio.num': '№ 05 · The Designer', 'rh.bio.title': 'The <em>Designer</em>',
    'rh.bio.sub': 'A decade of practice in Hewlêr — the story, the work, and the people behind it.',
    'rh.contact.num': "№ 06 · Let's Talk", 'rh.contact.title': "Let's <em>talk</em>.",
    'rh.contact.sub': 'Pitch a project in one careful letter. I reply to every serious enquiry within 48 hours.',
    'nav.design': 'Design',
    'nav.blog': 'Blog',
    'nav.bio': 'Biography',
    'nav.contact': 'Contact',

    'hero.eyebrow': '— Independent Designer · Available for select commissions',

    'design.label': 'Design Room',
    'design.title': 'A small catalogue of <em>printed</em> & pixel things.',
    'design.lede': 'Filter the work by category — twelve disciplines, one practice.',

    'blog.label': 'Blog Room',
    'blog.title': 'Notes from the <em>desk</em>.',
    'blog.lede': 'Short essays on typography, place, and the slow craft of design.',

    'bio.label': 'Biography Room',
    'bio.title': 'A short, <em>honest</em> biography.',
    'bio.experience': 'Experience',
    'bt.title': 'Tools & Software', 'bt.lede': 'The kit I design, edit and move with every day.', 'bt.video': 'Video & Motion', 'bt.typing': 'Fast, accurate typist — quick keyboarding in Kurdish, Arabic & English.',
    'bio.education': 'Education',
    'bio.honors': 'Honors & Awards',
    'bio.languages': 'Languages',
    'bio.orgs': 'Organizations',
    'bio.services': 'Services Provided',
    'bio.certificates': 'Certificates & Honours',

    'contact.label': 'Contact Room',
    'contact.title': 'Start a <em>conversation</em>.',
    'contact.pitch.title': 'Pitch your project — in one careful letter.',
    'contact.pitch.lede': 'Tell me about you, your project, your timeline, and your budget. I reply to every serious enquiry within 48 hours.',
    'contact.submit': 'Send the pitch',

        'meta.title.design': 'Barakat Qurtas | Design • Printing • Advertising',
    'meta.title.blog': 'The Journal — Barakat Qurtas', 'meta.title.bio': 'Biography — Barakat Qurtas', 'meta.title.contact': 'Contact — Barakat Qurtas',
    'hero.portfolio': 'Portfolio · 2026', 'hero.issue': 'Vol. 04 / Issue 01', 'hero.scroll': 'Scroll', 'krg': 'Hewlêr · KRG',
    'f.cta.eye': 'Have a project in mind?', 'f.cta.title': "Let's make something <em>quietly</em> good together.", 'f.cta.btn': 'Start a conversation',
    'f.lead': 'Independent graphic designer crafting brand identity, editorial, and books from the old quarter of Hewlêr — Kurdistan, since 2014.',
    'f.avail': 'Available for select commissions', 'f.explore': 'Explore', 'f.studio': 'Studio', 'f.connect': 'Connect', 'f.set': 'Set in Fraunces & Manrope',
    'sub.eye': 'The Journal · Newsletter', 'sub.title': 'Subscribe for new <em>notes</em>.', 'sub.btn': 'Subscribe', 'sub.ph': 'you@email.com',
    'sub.desc': "Short essays on typography, place, and the slow craft of design — sent only when there's something worth reading.",
    'c.eye': "— Get in Touch · Let's Collaborate", 'c.submit.eye': 'Submit your project',
    'cf.name': 'Full name', 'cf.name.ph': 'Your name', 'cf.company': 'Company / Organization', 'cf.company.ph': 'Optional',
    'cf.email': 'Email', 'cf.phone': 'Phone (optional)', 'cf.type': 'Project type', 'cf.budget': 'Budget range (USD)',
    'cf.timeline': 'Timeline', 'cf.hear': 'Where did you hear about me?', 'cf.message': 'Tell me about your project',
    'cf.message.ph': 'A short brief — what is the project, who is it for, what does success look like?',
    'cf.nda': 'I need an NDA before sharing details.', 'cf.choose': 'Choose one…',
    'qc.location': 'Location', 'qc.inquiry': 'Inquiry', 'qc.call': 'Call Direct', 'qc.designer': 'Designer', 'f.loc': 'Erbil — Kurdistan, Iraq', 'lm.load': 'Load {n} more', 'lm.info': '{shown} / {total} — {rem} remaining',
    'tab.all': 'General', 'tab.official': 'Official', 'tab.posters': 'Posters', 'tab.social': 'Social M',
    'tab.logo': 'Logo', 'tab.book': 'Book', 'tab.events': 'Events', 'tab.business': 'Business',
    'tab.invoices': 'Invoices', 'tab.image': 'Image', 'tab.video': 'Video', 'tab.other': 'Other',
    'tab.certificate': 'Certificate', 'tab.flex': 'Flex'
  },

};

window.__i18nMoreLoaded = false;
window.__loadI18nMore = function(cb) {
  if (window.__i18nMoreLoaded) { cb && cb(); return; }
  if (window.__i18nMoreLoading) { window.__i18nMoreCbs.push(cb); return; }
  window.__i18nMoreLoading = true; window.__i18nMoreCbs = [cb];
  var sc = document.createElement('script');
  sc.src = 'js/i18n-more.min.js?v=3'; sc.async = false;
  sc.onload = function () { window.__i18nMoreLoaded = true; window.__i18nMoreCbs.forEach(function (f) { f && f(); }); window.__i18nMoreCbs = []; };
  document.head.appendChild(sc);
};
window.applyLang = function(lang) {
  // the non-English dictionaries live in i18n-more.min.js — load on demand, then re-apply
  if (lang && lang !== 'en' && !window.I18N[lang] && !window.__i18nMoreLoaded) {
    window.__loadI18nMore(function () { window.applyLang(lang); });
    lang = 'en';   // paint English immediately; the real language re-applies once loaded
  }
  // merge over English so any untranslated key gracefully falls back to en
  const dict = Object.assign({}, window.I18N.en, window.I18N[lang] || window.I18N.en);
  document.documentElement.lang = lang;
  document.documentElement.dir = dict.dir;
  document.documentElement.dataset.lang = lang;

  /* text content */
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key] !== undefined) el.innerHTML = dict[key];
  });
  /* placeholders */
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    if (dict[key] !== undefined) el.setAttribute('placeholder', dict[key]);
  });
  /* <option> labels */
  document.querySelectorAll('[data-i18n-opt]').forEach(el => {
    const key = el.getAttribute('data-i18n-opt');
    if (dict[key] !== undefined) el.textContent = dict[key];
  });

  /* expose for dynamic strings + let the app re-localise (tab header, title…) */
  window.BQ_DICT = dict;
  if (typeof window.__bqOnLang === 'function') { try { window.__bqOnLang(lang, dict); } catch (e) {} }

  try { localStorage.setItem('bq_lang', lang); } catch(e){}
};


/* ===== Tab header content per language (Design room) ===== */
window.TAB_META_I18N = {
  en: {
    all:      { title: 'All Work',       desc: 'The full catalogue — every discipline, one practice.',                 note: 'By Barakat Qurtas · Hewlêr, Kurdistan' },
    official: { title: 'Official',       desc: 'Editorial design for the Presidency of the Kurdistan Region.',         note: 'Kurdistan Region Presidency · 2021—Present' },
    book:     { title: 'Book Covers',    desc: 'Typography, illustration, and print composition.',                     note: 'Nawroz Press & independent publishers · 2014—Now' },
    image:    { title: 'Photography',    desc: 'Lightroom editing, composites, and editorial retouching.',             note: 'Erbil & Kurdistan Region · 2018—Now' },
    logo:     { title: 'Logos',          desc: 'Marks, wordmarks, and visual identities — a decade of drawn signs.',   note: '2014—2025 · Various clients' },
    posters:  { title: 'Posters',        desc: 'Cultural, political, and typographic poster series.',                  note: 'Series · Erbil & Kurdistan Region' },
    social:   { title: 'Social M',       desc: 'Instagram grids, campaigns, and digital storytelling.',                note: '2023—Now · Various brands' },
    events:   { title: 'Events',         desc: 'Ceremony materials, banners, and event identity design.',              note: 'Conferences & cultural events · KRG' },
    business: { title: 'Business Cards', desc: 'Personal and client stationery — both sides of the conversation.',     note: '2024 · Print-ready' },
    invoices: { title: 'Invoices',       desc: 'Stationery systems — letterhead, invoice, and receipt.',               note: '2024 · Various clients' },
    video:    { title: 'Video',          desc: 'Documentary edits, motion reels, and protocol media coverage.',        note: '2019—Now · KRG official media' },
    other:    { title: 'Other Works',    desc: 'Miscellaneous — flex banners, type experiments, and notes.',           note: 'Always ongoing' }
  },
  ku: {
    all:      { title: 'هەموو کارەکان', desc: 'کاتالۆگی تەواو — هەموو پیشەیەک، یەک پراکتیک.',                 note: 'لەلایەن بەرەکات قورتاس · هەولێر، کوردستان' },
    official: { title: 'فەرمی',          desc: 'دیزاینی ئەدیتۆریاڵ بۆ سەرۆکایەتیی هەرێمی کوردستان.',          note: 'سەرۆکایەتیی هەرێمی کوردستان · ٢٠٢١—ئێستا' },
    book:     { title: 'بەرگی کتێب',     desc: 'تایپۆگرافی، وێنەکێشان، و پێکهاتەی چاپ.',                       note: 'چاپخانەی نەورۆز و بڵاوکەرەوەی سەربەخۆ · ٢٠١٤—ئێستا' },
    image:    { title: 'وێنەگرافی',      desc: 'دەستکاریی Lightroom، کۆمپۆزیت، و ڕیتاچی ئەدیتۆریاڵ.',          note: 'هەولێر و هەرێمی کوردستان · ٢٠١٨—ئێستا' },
    logo:     { title: 'لۆگۆ',           desc: 'مۆر، وشە-مۆر، و ناسنامەی بینراو — دەیەیەک نیشانەی کێشراو.',    note: '٢٠١٤—٢٠٢٥ · کڕیاری جۆراوجۆر' },
    posters:  { title: 'پۆستەر',         desc: 'زنجیرە پۆستەری کلتووری، سیاسی، و تایپۆگرافی.',                 note: 'زنجیرە · هەولێر و هەرێمی کوردستان' },
    social:   { title: 'سۆشیال میدیا',   desc: 'گرێدی ئینستاگرام، کەمپەین، و چیرۆکی دیجیتاڵ.',                 note: '٢٠٢٣—ئێستا · برانی جۆراوجۆر' },
    events:   { title: 'بۆنەکان',        desc: 'کەرەستەی ڕێوڕەسم، بانێر، و دیزاینی ناسنامەی بۆنە.',            note: 'کۆنفرانس و بۆنەی کلتووری · هەرێمی کوردستان' },
    business: { title: 'کارتی بازرگانی', desc: 'کارتی کەسی و کڕیار — هەردوو لای گفتوگۆ.',                       note: '٢٠٢٤ · ئامادە بۆ چاپ' },
    invoices: { title: 'پسووڵە',         desc: 'سیستەمی نووسراو — سەرپەڕە، پسووڵە، و وەسڵ.',                   note: '٢٠٢٤ · کڕیاری جۆراوجۆر' },
    video:    { title: 'ڤیدیۆ',          desc: 'مۆنتاژی دۆکیۆمێنتاری، ڕیلی مۆشن، و پۆشینی پرۆتۆکۆڵ.',          note: '٢٠١٩—ئێستا · میدیای فەرمیی هەرێم' },
    other:    { title: 'کارەکانی تر',    desc: 'جۆراوجۆر — بانێری فلێکس، تاقیکردنەوەی فۆنت، و تێبینی.',         note: 'بەردەوام لە کارکردندایە' }
  },
  kmr: {
    all:      { title: 'Hemû Kar',         desc: 'Kataloga temam — her dîsîplîn, yek pratîk.',                       note: 'Ji Barakat Qurtas · Hewlêr, Kurdistan' },
    official: { title: 'Fermî',            desc: 'Sêwirana edîtoriyal ji bo Serokatiya Herêma Kurdistanê.',          note: 'Serokatiya Herêma Kurdistanê · 2021—Niha' },
    book:     { title: 'Bergên Pirtûkan',  desc: 'Tîpografî, wênesazî û pêkhateya çapê.',                            note: 'Çapxaneya Newroz û weşanxaneyên serbixwe · 2014—Niha' },
    image:    { title: 'Wênekêşî',         desc: 'Sererastkirina Lightroom, kompozît û retûşa edîtoriyal.',          note: 'Hewlêr û Herêma Kurdistanê · 2018—Niha' },
    logo:     { title: 'Logo',             desc: 'Nîşan, peyv-nîşan û nasnameyên dîtbarî — dehsalek nîşanên xêzkirî.', note: '2014—2025 · Mişterîyên cuda' },
    posters:  { title: 'Poster',           desc: 'Rêze posterên çandî, siyasî û tîpografîk.',                        note: 'Rêze · Hewlêr û Herêma Kurdistanê' },
    social:   { title: 'Medya Civakî',     desc: 'Gridên Instagramê, kampanya û çîrokbêjiya dîjîtal.',               note: '2023—Niha · Brandên cuda' },
    events:   { title: 'Bûyer',            desc: 'Materyalên merasîman, banner û sêwirana nasnameya bûyeran.',       note: 'Konferans û bûyerên çandî · HHK' },
    business: { title: 'Kartên Karsaziyê', desc: 'Kartên kesane û mişterî — herdu aliyên axaftinê.',                 note: '2024 · Amade ji bo çapê' },
    invoices: { title: 'Fatûre',           desc: 'Sîstemên nivîsgehê — serkaxez, fatûre û meqbûz.',                  note: '2024 · Mişterîyên cuda' },
    video:    { title: 'Vîdyo',            desc: 'Montaja dokumenter, reelên motion û pêşkêşkirina protokolê.',      note: '2019—Niha · Medyaya fermî ya HHK' },
    other:    { title: 'Karên Din',        desc: 'Cûrbecûr — bannerên flex, ezmûnên tîpê û not.',                   note: 'Herdem berdewam' }
  },
  ar: {
    all:      { title: 'كل الأعمال',     desc: 'الكتالوج الكامل — كل تخصص، ممارسة واحدة.',                 note: 'بقلم بركات قرطاس · أربيل، كردستان' },
    official: { title: 'رسمي',           desc: 'تصميم تحريري لرئاسة إقليم كردستان.',                       note: 'رئاسة إقليم كردستان · ٢٠٢١—الآن' },
    book:     { title: 'أغلفة الكتب',     desc: 'الطباعة والرسم وتركيب الطبع.',                             note: 'مطبعة نوروز وناشرون مستقلون · ٢٠١٤—الآن' },
    image:    { title: 'التصوير',         desc: 'تحرير Lightroom والتركيب والتنقيح التحريري.',              note: 'أربيل وإقليم كردستان · ٢٠١٨—الآن' },
    logo:     { title: 'الشعارات',        desc: 'علامات وكلمات-علامات وهويات بصرية — عقد من العلامات المرسومة.', note: '٢٠١٤—٢٠٢٥ · عملاء متنوعون' },
    posters:  { title: 'الملصقات',        desc: 'سلسلة ملصقات ثقافية وسياسية وطباعية.',                     note: 'سلسلة · أربيل وإقليم كردستان' },
    social:   { title: 'وسائل التواصل',   desc: 'شبكات إنستغرام والحملات والسرد الرقمي.',                   note: '٢٠٢٣—الآن · علامات متنوعة' },
    events:   { title: 'الفعاليات',       desc: 'مواد المراسم واللافتات وتصميم هوية الفعاليات.',            note: 'مؤتمرات وفعاليات ثقافية · حكومة الإقليم' },
    business: { title: 'بطاقات العمل',    desc: 'قرطاسية شخصية وللعملاء — وجها المحادثة.',                  note: '٢٠٢٤ · جاهزة للطباعة' },
    invoices: { title: 'الفواتير',        desc: 'أنظمة قرطاسية — ترويسة وفاتورة وإيصال.',                   note: '٢٠٢٤ · عملاء متنوعون' },
    video:    { title: 'الفيديو',         desc: 'مونتاج وثائقي ومقاطع موشن وتغطية البروتوكول.',             note: '٢٠١٩—الآن · الإعلام الرسمي للإقليم' },
    other:    { title: 'أعمال أخرى',      desc: 'متنوعة — لافتات فليكس وتجارب خطية وملاحظات.',              note: 'مستمرة دائمًا' }
  },
  fr: {
    all:      { title: 'Tous les travaux', desc: 'Le catalogue complet — chaque discipline, une seule pratique.',    note: 'Par Barakat Qurtas · Hewlêr, Kurdistan' },
    official: { title: 'Officiel',         desc: 'Design éditorial pour la Présidence de la Région du Kurdistan.',   note: 'Présidence de la Région du Kurdistan · 2021—Présent' },
    book:     { title: 'Couvertures',      desc: 'Typographie, illustration et composition imprimée.',               note: 'Presses Newroz & éditeurs indépendants · 2014—Auj.' },
    image:    { title: 'Photographie',     desc: 'Retouche Lightroom, montages et retouche éditoriale.',             note: 'Erbil & Région du Kurdistan · 2018—Auj.' },
    logo:     { title: 'Logos',            desc: 'Marques, logotypes et identités visuelles — une décennie de signes dessinés.', note: '2014—2025 · Clients divers' },
    posters:  { title: 'Affiches',         desc: "Séries d'affiches culturelles, politiques et typographiques.",     note: 'Série · Erbil & Région du Kurdistan' },
    social:   { title: 'Réseaux sociaux',  desc: 'Grilles Instagram, campagnes et narration numérique.',             note: '2023—Auj. · Marques diverses' },
    events:   { title: 'Événements',       desc: "Matériel de cérémonie, bannières et identité d'événement.",        note: 'Conférences & événements culturels · GRK' },
    business: { title: 'Cartes de visite', desc: 'Papeterie personnelle et client — les deux côtés de la conversation.', note: '2024 · Prêt à imprimer' },
    invoices: { title: 'Factures',         desc: 'Systèmes de papeterie — en-tête, facture et reçu.',                note: '2024 · Clients divers' },
    video:    { title: 'Vidéo',            desc: 'Montages documentaires, reels motion et couverture protocolaire.', note: '2019—Auj. · Médias officiels du GRK' },
    other:    { title: 'Autres travaux',   desc: 'Divers — bannières flex, expériences typographiques et notes.',    note: 'Toujours en cours' }
  }
};


/* ===== Extended i18n content (rooms, options, bio) ===== */
window.I18N_EXTRA = {
 "en": {
  "d.note": "A short note",
  "d.teaser.title": "Designer of <em>printed matter</em>, working from Hewlêr since 2014.",
  "d.teaser.body": "Independent graphic designer based in Erbil, Kurdistan Region — more than a decade of freelance practice across branding, editorial, posters, advertising, and print.",
  "d.teaser.link": "Read the full biography",
  "st.designs": "Designs",
  "st.clients": "Clients",
  "st.logos": "Logos",
  "st.books": "Books",
  "d.worked.eye": "Worked with",
  "d.worked.title": "Places &amp; people I’ve worked alongside.",
  "d.drawn.eye": "Designed by hand",
  "d.drawn.title": "Selected logos I’ve drawn.",
  "d.latest.eye": "Latest from the blog",
  "d.latest.title": "Recent notes from the desk.",
  "d.latest.all": "All posts",
  "blog.more": "Read the essay",
  "profile.eye": "Independent Designer · Hewlêr",
  "profile.bio": "Designer of printed matter since 2014 — brand identity, editorial, books, and the quiet things in between.",
  "profile.btn": "View biography",
  "disc.brand": "Brand Identity",
  "disc.editorial": "Editorial",
  "disc.posters": "Posters",
  "disc.book": "Book Design",
  "disc.video": "Video",
  "org.presidency": "Presidency of Kurdistan Region",
  "org.pmoffice": "KRG Prime Minister’s Office",
  "org.dma": "Directorate of Media Affairs",
  "org.salahaddin": "Salahaddin University",
  "org.soran": "Soran University",
  "org.nuche": "Nuche Net Agency",
  "org.kdyu": "Kurdistan Democratic Youth Union",
  "org.cno": "CNO Organizations",
  "org.justice": "Justice NGO — Lagan",
  "org.governor": "Governor of Erbil",
  "org.printshops": "Independent Printing Shops",
  "bt1.title": "On the architecture of meaning",
  "bt1.body": "Typography is not decoration. It is the floorplan of the page — the place where readers pause, breathe, and find their footing.",
  "bt2.title": "A printer’s room in Hewlêr",
  "bt2.body": "The old quarter, third floor, north-facing light. A notebook, a small press, and a slow habit of asking why.",
  "bt3.title": "Two scripts, one wordmark",
  "bt3.body": "Designing for Kurdish and Latin in the same logo is not translation — it is duet. Notes from the Khanasin mark.",
  "c.eyebrow": "— Get in Touch · Let’s Collaborate · Digital Landscape",
  "opt.gd": "Graphic Design",
  "opt.ld": "Logo Design",
  "opt.prd": "Print Design",
  "opt.pkg": "Packaging Design",
  "opt.adv": "Advertising",
  "opt.smm": "Social Media Marketing",
  "opt.evt": "Event Production",
  "opt.vid": "Video Editing",
  "opt.cv": "Resume Writing",
  "opt.pm": "Project Management",
  "opt.other": "Other",
  "opt.u500": "Under $500",
  "opt.discuss": "Let’s discuss",
  "opt.asap": "ASAP",
  "opt.24w": "2 — 4 weeks",
  "opt.13m": "1 — 3 months",
  "opt.36m": "3 — 6 months",
  "opt.flex": "Flexible",
  "opt.friend": "A friend",
  "opt.gsearch": "Google search",
  "opt.direct": "Direct"
 },
 "ku": {
  "d.note": "تێبینییەکی کورت",
  "d.teaser.title": "دیزاینەری <em>کاری چاپکراو</em>، لە هەولێرەوە لە ٢٠١٤ـەوە.",
  "d.teaser.body": "دیزاینەری گرافیکی سەربەخۆ لە هەولێر، هەرێمی کوردستان — زیاتر لە دە ساڵ کاری ئازاد لە بەرەندسازی، دیزاینی ئێدیتۆریاڵ، پۆستەر، ڕیکلام و چاپ.",
  "d.teaser.link": "بایۆگرافیی تەواو بخوێنەوە",
  "st.designs": "دیزاین",
  "st.clients": "کڕیار",
  "st.logos": "لۆگۆ",
  "st.books": "کتێب",
  "d.worked.eye": "کارم لەگەڵ کردووە",
  "d.worked.title": "ئەو شوێن و کەسانەی کارم لەگەڵ کردوون.",
  "d.drawn.eye": "بە دەست دیزاینکراو",
  "d.drawn.title": "هەندێک لۆگۆی هەڵبژێردراو کە کێشاومن.",
  "d.latest.eye": "دوایین لە بلۆگەوە",
  "d.latest.title": "تێبینیی نوێ لە مێزی کارەوە.",
  "d.latest.all": "هەموو بابەتەکان",
  "blog.more": "وتارەکە بخوێنەوە",
  "profile.eye": "دیزاینەری سەربەخۆ · هەولێر",
  "profile.bio": "دیزاینەری کاری چاپکراو لە ٢٠١٤ـەوە — ناسنامەی بران، ئەدیتۆریاڵ، کتێب، و ئەو شتە هێمنانەی نێوانیان.",
  "profile.btn": "بینینی بایۆگرافی",
  "disc.brand": "ناسنامەی بران",
  "disc.editorial": "ئەدیتۆریاڵ",
  "disc.posters": "پۆستەر",
  "disc.book": "دیزاینی کتێب",
  "disc.video": "ڤیدیۆ",
  "org.presidency": "سەرۆکایەتیی هەرێمی کوردستان",
  "org.pmoffice": "نووسینگەی سەرۆک‌وەزیرانی هەرێم",
  "org.dma": "بەڕێوەبەرایەتیی کاروباری ڕاگەیاندن",
  "org.salahaddin": "زانکۆی سەلاحەدین",
  "org.soran": "زانکۆی سۆران",
  "org.nuche": "ئاژانسی نووچە نێت",
  "org.kdyu": "یەکێتیی لاوانی دیموکراتی کوردستان",
  "org.cno": "تۆڕی هەماهەنگیی ڕێکخراوەکان",
  "org.justice": "ڕێکخراوی دادپەروەری — لەگەن",
  "org.governor": "پارێزگاری هەولێر",
  "org.printshops": "چاپخانە سەربەخۆکان",
  "bt1.title": "لەسەر تەلارسازیی واتا",
  "bt1.body": "تایپۆگرافی ڕازاندنەوە نییە. پلانی ڕووکاری لاپەڕەیە — ئەو شوێنەی خوێنەر دەوەستێت، هەناسە دەدات، و جێپێی خۆی دەدۆزێتەوە.",
  "bt2.title": "ژوورێکی چاپکار لە هەولێر",
  "bt2.body": "گەڕەکە کۆنەکە، نهۆمی سێیەم، ڕووناکیی ڕووەو باکوور. دەفتەرێک، چاپخانەیەکی بچووک، و خووێکی هێواش بۆ پرسینی بۆچی.",
  "bt3.title": "دوو ڕێنووس، یەک وشە-مۆر",
  "bt3.body": "دیزاینکردن بۆ کوردی و لاتینی لە یەک لۆگۆدا وەرگێڕان نییە — دوەتە. تێبینی لە مۆری خانەسین.",
  "c.eyebrow": "— پەیوەندیمان پێوە بکە · با هاوکاری بکەین · جیهانی دیجیتاڵ",
  "opt.gd": "دیزاینی گرافیک",
  "opt.ld": "دیزاینی لۆگۆ",
  "opt.prd": "دیزاینی چاپ",
  "opt.pkg": "دیزاینی پاکێجینگ",
  "opt.adv": "بانگەشە",
  "opt.smm": "مارکێتینگی سۆشیال میدیا",
  "opt.evt": "بەرهەمهێنانی بۆنە",
  "opt.vid": "مۆنتاژی ڤیدیۆ",
  "opt.cv": "نووسینی سیڤی",
  "opt.pm": "بەڕێوەبردنی پڕۆژە",
  "opt.other": "هیتر",
  "opt.u500": "کەمتر لە ٥٠٠$",
  "opt.discuss": "با گفتوگۆی لەسەر بکەین",
  "opt.asap": "هەرچی زووتر",
  "opt.24w": "٢ — ٤ هەفتە",
  "opt.13m": "١ — ٣ مانگ",
  "opt.36m": "٣ — ٦ مانگ",
  "opt.flex": "نەرم",
  "opt.friend": "هاوڕێیەک",
  "opt.gsearch": "گەڕانی گووگڵ",
  "opt.direct": "ڕاستەوخۆ"
 },
 "kmr": {
  "d.note": "Noteyek kurt",
  "d.teaser.title": "Sêwirmendê <em>karên çapkirî</em>, ji Hewlêr ji 2014.",
  "d.teaser.body": "Sêwirmendê grafîk ê serbixwe li Hewlêr, Herêma Kurdistanê — zêdetirî deh salan ezmûna karê azad di branding, edîtorî, poster, reklam û çapê de.",
  "d.teaser.link": "Jînenîgariya temam bixwîne",
  "st.designs": "Sêwiran",
  "st.clients": "Mişterî",
  "st.logos": "Logo",
  "st.books": "Pirtûk",
  "d.worked.eye": "Bi wan re xebitî",
  "d.worked.title": "Cî û kesên ku ez bi wan re xebitîm.",
  "d.drawn.eye": "Bi dest hatiye sêwirandin",
  "d.drawn.title": "Hin logoyên bijartî ku min xêz kirine.",
  "d.latest.eye": "Yên dawî ji blogê",
  "d.latest.title": "Notên nû ji ser maseyê.",
  "d.latest.all": "Hemû nivîs",
  "blog.more": "Gotarê bixwîne",
  "profile.eye": "Sêwirmendê serbixwe · Hewlêr",
  "profile.bio": "Sêwirmendê karên çapkirî ji 2014 — nasnameya brandê, edîtoriyal, pirtûk û tiştên bêdeng ên navberê.",
  "profile.btn": "Jînenîgariyê bibîne",
  "disc.brand": "Nasnameya Brandê",
  "disc.editorial": "Edîtoriyal",
  "disc.posters": "Poster",
  "disc.book": "Sêwirana Pirtûkan",
  "disc.video": "Vîdyo",
  "org.presidency": "Serokatiya Herêma Kurdistanê",
  "org.pmoffice": "Nivîsgeha Serokwezîrê HHK",
  "org.dma": "Bereyê Karûbarên Medyayê",
  "org.salahaddin": "Zanîngeha Selahedîn",
  "org.soran": "Zanîngeha Soran",
  "org.nuche": "Ajansa Nuche Net",
  "org.kdyu": "Yekîtiya Ciwanên Demokrat ên Kurdistanê",
  "org.cno": "Tora Hevrêziya Rêxistinan",
  "org.justice": "Rêxistina Edaletê — Lagan",
  "org.governor": "Walîtiya Hewlêrê",
  "org.printshops": "Çapxaneyên serbixwe",
  "bt1.title": "Li ser avahîsaziya wateyê",
  "bt1.body": "Tîpografî xemilandin nîne. Ew plana rûyê rûpelê ye — cihê ku xwîner radiweste, bêhna xwe digire û cihê xwe dibîne.",
  "bt2.title": "Odeya çapkerê li Hewlêr",
  "bt2.body": "Taxa kevn, qata sêyem, ronahiya ber bi bakur. Defterek, çapxaneyeke piçûk, û adetekî hêdî yê pirsîna çima.",
  "bt3.title": "Du nivîs, yek peyv-nîşan",
  "bt3.body": "Sêwirandin ji bo Kurdî û Latînî di yek logoyê de ne wergerandin e — duet e. Notên ji nîşana Khanasin.",
  "c.eyebrow": "— Têkilî daîne · Werin em hevkar bin · Cîhana Dîjîtal",
  "opt.gd": "Sêwirana Grafîk",
  "opt.ld": "Sêwirana Logo",
  "opt.prd": "Sêwirana Çapê",
  "opt.pkg": "Sêwirana Pakêtê",
  "opt.adv": "Reklam",
  "opt.smm": "Marketînga Medya Civakî",
  "opt.evt": "Hilberîna Bûyeran",
  "opt.vid": "Montaja Vîdyoyê",
  "opt.cv": "Nivîsîna CV",
  "opt.pm": "Birêvebirina Projeyê",
  "opt.other": "Yên din",
  "opt.u500": "Di bin 500$ de",
  "opt.discuss": "Werin em gotûbêj bikin",
  "opt.asap": "Bi lez",
  "opt.24w": "2 — 4 hefte",
  "opt.13m": "1 — 3 meh",
  "opt.36m": "3 — 6 meh",
  "opt.flex": "Nerm",
  "opt.friend": "Hevalek",
  "opt.gsearch": "Lêgerîna Google",
  "opt.direct": "Rasterast"
 },
 "ar": {
  "d.note": "ملاحظة قصيرة",
  "d.teaser.title": "مصمم <em>المطبوعات</em>، يعمل من أربيل منذ ٢٠١٤.",
  "d.teaser.body": "مصمم جرافيك مستقل في أربيل، إقليم كردستان — أكثر من عقد من العمل الحر في الهوية البصرية والتصميم التحريري والملصقات والإعلان والطباعة.",
  "d.teaser.link": "اقرأ السيرة كاملة",
  "st.designs": "تصاميم",
  "st.clients": "عملاء",
  "st.logos": "شعارات",
  "st.books": "كتب",
  "d.worked.eye": "عملت مع",
  "d.worked.title": "الأماكن والأشخاص الذين عملت معهم.",
  "d.drawn.eye": "مصمَّمة باليد",
  "d.drawn.title": "مجموعة مختارة من الشعارات التي رسمتها.",
  "d.latest.eye": "الأحدث من المدونة",
  "d.latest.title": "ملاحظات حديثة من المكتب.",
  "d.latest.all": "كل المقالات",
  "blog.more": "اقرأ المقالة",
  "profile.eye": "مصمم مستقل · أربيل",
  "profile.bio": "مصمم مطبوعات منذ ٢٠١٤ — هوية بصرية، تصميم تحريري، كتب، والأشياء الهادئة بينها.",
  "profile.btn": "عرض السيرة",
  "disc.brand": "الهوية البصرية",
  "disc.editorial": "تصميم تحريري",
  "disc.posters": "ملصقات",
  "disc.book": "تصميم الكتب",
  "disc.video": "فيديو",
  "org.presidency": "رئاسة إقليم كردستان",
  "org.pmoffice": "مكتب رئيس وزراء الإقليم",
  "org.dma": "مديرية الشؤون الإعلامية",
  "org.salahaddin": "جامعة صلاح الدين",
  "org.soran": "جامعة سوران",
  "org.nuche": "وكالة نوجة نت",
  "org.kdyu": "اتحاد شبيبة كردستان الديمقراطي",
  "org.cno": "شبكة تنسيق المنظمات",
  "org.justice": "منظمة العدالة — لاكان",
  "org.governor": "محافظة أربيل",
  "org.printshops": "مطابع مستقلة",
  "bt1.title": "في معمار المعنى",
  "bt1.body": "الطباعة ليست زخرفة. إنها مخطط الصفحة — حيث يتوقف القارئ ويتنفس ويجد موطئ قدمه.",
  "bt2.title": "غرفة طابع في أربيل",
  "bt2.body": "الحي القديم، الطابق الثالث، ضوء يواجه الشمال. دفتر، مطبعة صغيرة، وعادة بطيئة في سؤال «لماذا».",
  "bt3.title": "خطّان، علامة واحدة",
  "bt3.body": "تصميم الكردية واللاتينية في شعار واحد ليس ترجمة — بل ثنائيًا. ملاحظات من علامة خانسين.",
  "c.eyebrow": "— تواصل معنا · لنتعاون · المشهد الرقمي",
  "opt.gd": "تصميم جرافيك",
  "opt.ld": "تصميم شعار",
  "opt.prd": "تصميم طباعي",
  "opt.pkg": "تصميم التغليف",
  "opt.adv": "إعلانات",
  "opt.smm": "تسويق عبر وسائل التواصل",
  "opt.evt": "إنتاج الفعاليات",
  "opt.vid": "مونتاج فيديو",
  "opt.cv": "كتابة السيرة الذاتية",
  "opt.pm": "إدارة المشاريع",
  "opt.other": "أخرى",
  "opt.u500": "أقل من ٥٠٠$",
  "opt.discuss": "لنناقش",
  "opt.asap": "في أقرب وقت",
  "opt.24w": "٢ — ٤ أسابيع",
  "opt.13m": "١ — ٣ أشهر",
  "opt.36m": "٣ — ٦ أشهر",
  "opt.flex": "مرن",
  "opt.friend": "صديق",
  "opt.gsearch": "بحث جوجل",
  "opt.direct": "مباشرة"
 },
 "fr": {
  "d.note": "Une courte note",
  "d.teaser.title": "Designer de <em>l’imprimé</em>, depuis Hewlêr depuis 2014.",
  "d.teaser.body": "Graphiste indépendant basé à Erbil, Région du Kurdistan — plus d’une décennie de pratique en freelance : identité, éditorial, affiches, publicité et impression.",
  "d.teaser.link": "Lire la biographie complète",
  "st.designs": "Créations",
  "st.clients": "Clients",
  "st.logos": "Logos",
  "st.books": "Livres",
  "d.worked.eye": "A collaboré avec",
  "d.worked.title": "Les lieux et les gens avec qui j’ai travaillé.",
  "d.drawn.eye": "Dessinés à la main",
  "d.drawn.title": "Une sélection de logos que j’ai dessinés.",
  "d.latest.eye": "Derniers articles du blog",
  "d.latest.title": "Notes récentes du bureau.",
  "d.latest.all": "Tous les articles",
  "blog.more": "Lire l’essai",
  "profile.eye": "Designer indépendant · Hewlêr",
  "profile.bio": "Designer de l’imprimé depuis 2014 — identité de marque, édition, livres, et les choses discrètes entre les deux.",
  "profile.btn": "Voir la biographie",
  "disc.brand": "Identité de marque",
  "disc.editorial": "Édition",
  "disc.posters": "Affiches",
  "disc.book": "Design de livres",
  "disc.video": "Vidéo",
  "org.presidency": "Présidence de la Région du Kurdistan",
  "org.pmoffice": "Cabinet du Premier ministre du GRK",
  "org.dma": "Direction des affaires médiatiques",
  "org.salahaddin": "Université Salahaddin",
  "org.soran": "Université de Soran",
  "org.nuche": "Agence Nuche Net",
  "org.kdyu": "Union de la jeunesse démocratique du Kurdistan",
  "org.cno": "Réseau de coordination des organisations",
  "org.justice": "ONG Justice — Lagan",
  "org.governor": "Gouvernorat d’Erbil",
  "org.printshops": "Imprimeries indépendantes",
  "bt1.title": "Sur l’architecture du sens",
  "bt1.body": "La typographie n’est pas une décoration. C’est le plan de la page — là où le lecteur s’arrête, respire et trouve ses repères.",
  "bt2.title": "L’atelier d’un imprimeur à Hewlêr",
  "bt2.body": "Le vieux quartier, troisième étage, lumière au nord. Un carnet, une petite presse, et l’habitude lente de se demander pourquoi.",
  "bt3.title": "Deux écritures, un logotype",
  "bt3.body": "Concevoir le kurde et le latin dans un même logo n’est pas une traduction — c’est un duo. Notes sur la marque Khanasin.",
  "c.eyebrow": "— Prenez contact · Collaborons · Paysage numérique",
  "opt.gd": "Design graphique",
  "opt.ld": "Création de logo",
  "opt.prd": "Design d’impression",
  "opt.pkg": "Design d’emballage",
  "opt.adv": "Publicité",
  "opt.smm": "Marketing des réseaux sociaux",
  "opt.evt": "Production d’événements",
  "opt.vid": "Montage vidéo",
  "opt.cv": "Rédaction de CV",
  "opt.pm": "Gestion de projet",
  "opt.other": "Autre",
  "opt.u500": "Moins de 500 $",
  "opt.discuss": "À discuter",
  "opt.asap": "Dès que possible",
  "opt.24w": "2 — 4 semaines",
  "opt.13m": "1 — 3 mois",
  "opt.36m": "3 — 6 mois",
  "opt.flex": "Flexible",
  "opt.friend": "Un ami",
  "opt.gsearch": "Recherche Google",
  "opt.direct": "Direct"
 }
};
Object.keys(window.I18N_EXTRA).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA[l]); });

/* ===== Extended i18n content — bio room ===== */
window.I18N_EXTRA_B = {
 "en": {
  "bio.lede": "<span class=\"dropcap\">B</span>arakat Qurtas Babakr — independent graphic designer, working between state protocol, editorial design, and quiet personal projects. Based in Erbil, Kurdistan Region of Iraq.",
  "bp.eye": "Discover the story behind the designer",
  "bp.label": "Work <em>Philosophy</em>",
  "bp.quote": "“It doesn’t matter where I work now or where I work in the future, but it is always important to be satisfied with others.”",
  "bp.p1": "I’m Barakat Qurtas, born in Soran and currently based in Erbil — a city that transformed the way I see the world. I grew up between the stillness of the mountains and the rhythm of city life — two contrasts that continue to define my design language. Erbil now offers glowing nights and endless inspiration.",
  "bp.p2": "My passion for design began early. At the age of 12, I started experimenting, and by 17 I was fully immersed in graphic design as a profession. Since then I’ve continued to develop my skills through practice and real-world experience — letting my work speak for itself.",
  "bp.p3": "I work with Adobe Creative Suite and hold several masterclass certificates. I’ve collaborated with the Presidency of the Kurdistan Region and the KRG Protocol. My aim is to expand my creative impact and establish a leading advertising and publishing company.",
  "ex1.title": "Works at Directorate of Media Affairs",
  "ex1.date": "Dec 2021 — Present · 4 yrs 6 mos",
  "ex1.org": "Kurdistan Region Presidency · Part-time",
  "ex1.loc": "Erbil Plains District, Erbil Governorate, Iraq",
  "ex1.desc": "Office of the President of the Kurdistan Region. Author at Presidency of the Kurdistan Region of Iraq —",
  "ex1.skills": "Graphic Design, Adobe Lightroom",
  "ex1.more": "+16 skills",
  "ex2.title": "Former Works at Protocol Media",
  "ex2.date": "Feb 2019 — Dec 2019 · 11 mos",
  "ex2.org": "Kurdistan Regional Government · Part-time",
  "ex2.loc": "Erbil, Erbil Governorate, Iraq",
  "ex2.desc": "Office of the Prime Minister of the Kurdistan Regional Government.",
  "ex2.skills": "Protocol Officer, Video Camera",
  "ex2.more": "+2 skills",
  "ex3.title": "Graphic Designer",
  "ex3.date": "Jan 2014 — Jan 2019 · 5 yrs 1 mo",
  "ex3.org": "Printing Shop · Part-time &amp; Freelance Graphic Designer",
  "ex3.skills": "Graphic Design, Adobe Lightroom",
  "ex3.more": "+25 skills",
  "ed.title": "Salahaddin University — Erbil",
  "ed.sub": "Diploma of Law · 2020 — 2022",
  "ed.grade": "Grade: Graduate",
  "ed.act": "— Activities:",
  "ed.actv": "Law for a safe community",
  "ed.skills": "Law and International Law",
  "h1.t": "Shield of Honor &amp; Certificate",
  "h2.t": "Honorary Gift — Presidency",
  "h3.t": "Shield of Honor — Soran",
  "h4.t": "World Volunteer Day",
  "h5.t": "Respect &amp; Appreciation",
  "lng.ar": "Arabic",
  "lng.en": "English",
  "lng.fr": "French",
  "lng.ir": "Iranian languages",
  "lng.ckb": "Kurdish (Soranî)",
  "lng.kmr": "Kurdish — Kurmancî",
  "lng.tr": "Turkish",
  "lp.full": "Full professional proficiency",
  "lp.elem": "Elementary proficiency",
  "lp.prof": "Professional working proficiency",
  "lp.enNote": "Elementary proficiency · Duolingo Score 10 (May 2026)",
  "bo1.role": "Graphic Designer and Printmaker · Oct 2024 — Aug 2025",
  "bo2.name": "Kurdistan Democratic Youth Union",
  "bo2.role": "Graphic Designer and social media management · Dec 2022 — Sep 2024",
  "bo3.name": "CNO Organizations",
  "bo3.role": "Graphic Designer and Volunteer · Apr 2019 — Jan 2020",
  "bo4.name": "Justice NGO for Lagan Issues",
  "bo4.role": "Graphic Designer and website developer · Feb 2014 — Feb 2017",
  "cert.loading": "Loading…",
  "li.eye": "Connect · Professional Network",
  "li.title": "Barakat on <em>LinkedIn</em>",
  "li.desc": "Experience, recommendations, and the professional record — kept current and open for collaboration.",
  "soc.open": "Open",
  "be.eye": "Portfolio · Creative Network",
  "go.eye": "Search · Knowledge Panel", "go.title": "Barakat on <em>Google</em>", "go.desc": "Find Barakat Qurtas on Google — profile, selected work, and presence across the web.",
  "ck.title": "Cookies", "ck.text": "This site uses cookies to measure traffic and improve your experience.", "ck.accept": "Got it",
  "be.title": "Barakat on <em>Behance</em>",
  "be.desc": "The full creative portfolio — projects, case studies, and work in progress, curated in one place."
 },
 "ku": {
  "bio.lede": "<span class=\"dropcap\">ب</span>ەرکەت قورتاس بابکر — دیزاینەری گرافیکی سەربەخۆ، کار دەکات لە نێوان پرۆتۆکۆڵی دەوڵەتی، دیزاینی ئەدیتۆریاڵ، و پڕۆژەی کەسیی هێمن. نیشتەجێی هەولێر، هەرێمی کوردستانی عێراق.",
  "bp.eye": "چیرۆکی پشت دیزاینەرەکە بدۆزەرەوە",
  "bp.label": "فەلسەفەی <em>کار</em>",
  "bp.quote": "«گرنگ نییە ئێستا لەکوێ کار دەکەم یان لە داهاتوودا لەکوێ کار دەکەم، بەڵام هەمیشە گرنگە ڕەزامەندی لای خەڵک بەدەست بهێنیت.»",
  "bp.p1": "من بەرەکات قورتاسم، لە سۆران لەدایکبووم و ئێستا لە هەولێر نیشتەجێم — شارێک کە شێوازی بینینم بۆ جیهان گۆڕی. لە نێوان بێدەنگیی چیاکان و ڕیتمی ژیانی شار گەورەبووم — دوو دژایەتی کە هەتا ئێستا زمانی دیزاینم دیاری دەکەن. هەولێر ئێستا شەوگاری درەوشاوە و ئیلهامی بێکۆتایی پێشکەش دەکات.",
  "bp.p2": "حەزم بۆ دیزاین زوو دەستی پێکرد. لە تەمەنی ١٢ ساڵییەوە دەستم بە تاقیکردنەوە کرد، و لە ١٧ ساڵیدا بە تەواوی خۆم لە دیزاینی گرافیک ڕۆچوو وەک پیشە. لەو کاتەوە بەردەوام بووم لە پەرەپێدانی لێهاتووییەکانم بە پراکتیک و ئەزموونی ڕاستەقینە — هێشتم کارەکانم بەخۆیان بدوێن.",
  "bp.p3": "بە کۆمەڵە بەرنامەکانی Adobe کار دەکەم و چەند بڕوانامەی ماستەرکلاسم هەیە. لەگەڵ سەرۆکایەتیی هەرێمی کوردستان و پرۆتۆکۆڵی هەرێم کارم کردووە. ئامانجم فراوانکردنی کاریگەریی داهێنەرانەمە و دامەزراندنی کۆمپانیایەکی پێشەنگی بانگەشە و بڵاوکردنەوەیە.",
  "ex1.title": "کار لە بەڕێوەبەرایەتیی کاروباری ڕاگەیاندن",
  "ex1.date": "کانوونی یەکەم ٢٠٢١ — ئێستا · ٤ ساڵ و ٦ مانگ",
  "ex1.org": "سەرۆکایەتیی هەرێمی کوردستان · پارەکات",
  "ex1.loc": "ناحیەی دەشتی هەولێر، پارێزگای هەولێر، عێراق",
  "ex1.desc": "نووسینگەی سەرۆکی هەرێمی کوردستان. نووسەر لە سەرۆکایەتیی هەرێمی کوردستانی عێراق —",
  "ex1.skills": "دیزاینی گرافیک، ئەدۆب لایتروم",
  "ex1.more": "+١٦ لێهاتوویی",
  "ex2.title": "پێشتر کار لە میدیای پرۆتۆکۆڵ",
  "ex2.date": "شوبات ٢٠١٩ — کانوونی یەکەم ٢٠١٩ · ١١ مانگ",
  "ex2.org": "حکوومەتی هەرێمی کوردستان · پارەکات",
  "ex2.loc": "هەولێر، پارێزگای هەولێر، عێراق",
  "ex2.desc": "نووسینگەی سەرۆک‌وەزیرانی حکوومەتی هەرێمی کوردستان.",
  "ex2.skills": "کارمەندی پرۆتۆکۆڵ، کامێرای ڤیدیۆ",
  "ex2.more": "+٢ لێهاتوویی",
  "ex3.title": "دیزاینەری گرافیک",
  "ex3.date": "کانوونی دووەم ٢٠١٤ — کانوونی دووەم ٢٠١٩ · ٥ ساڵ و ١ مانگ",
  "ex3.org": "چاپخانە · پارەکات و دیزاینەری گرافیکی ئازاد",
  "ex3.skills": "دیزاینی گرافیک، ئەدۆب لایتروم",
  "ex3.more": "+٢٥ لێهاتوویی",
  "ed.title": "زانکۆی سەلاحەدین — هەولێر",
  "ed.sub": "دیپلۆمی یاسا · ٢٠٢٠ — ٢٠٢٢",
  "ed.grade": "پلە: دەرچوو",
  "ed.act": "— چالاکییەکان:",
  "ed.actv": "یاسا بۆ کۆمەڵگەیەکی سەلامەت",
  "ed.skills": "یاسا و یاسای نێودەوڵەتی",
  "h1.t": "قەڵغانی ڕێز و بڕوانامە",
  "h2.t": "دیاریی ڕێز — سەرۆکایەتی",
  "h3.t": "قەڵغانی ڕێز — سۆران",
  "h4.t": "ڕۆژی جیهانیی خۆبەخش",
  "h5.t": "ڕێز و پێزانین",
  "lng.ar": "عەرەبی",
  "lng.en": "ئینگلیزی",
  "lng.fr": "فەرەنسی",
  "lng.ir": "زمانە ئێرانییەکان",
  "lng.ckb": "کوردیی سۆرانی",
  "lng.kmr": "کوردی — کرمانجی",
  "lng.tr": "تورکی",
  "lp.full": "شارەزایی پیشەیی تەواو",
  "lp.elem": "شارەزایی سەرەتایی",
  "lp.prof": "شارەزایی پیشەیی کارکردن",
  "lp.enNote": "شارەزایی سەرەتایی · خاڵی Duolingo ١٠ (ئایاری ٢٠٢٦)",
  "bo1.role": "دیزاینەری گرافیک و چاپکار · تشرینی یەکەم ٢٠٢٤ — ئابی ٢٠٢٥",
  "bo2.name": "یەکێتیی لاوانی دیموکراتی کوردستان",
  "bo2.role": "دیزاینەری گرافیک و بەڕێوەبردنی سۆشیال میدیا · کانوونی یەکەم ٢٠٢٢ — ئەیلوولی ٢٠٢٤",
  "bo3.name": "تۆڕی هەماهەنگیی ڕێکخراوەکان",
  "bo3.role": "دیزاینەری گرافیک و خۆبەخش · نیسانی ٢٠١٩ — کانوونی دووەم ٢٠٢٠",
  "bo4.name": "ڕێکخراوی دادپەروەری بۆ کێشەکانی لەگەن",
  "bo4.role": "دیزاینەری گرافیک و گەشەپێدەری وێبسایت · شوبات ٢٠١٤ — شوبات ٢٠١٧",
  "cert.loading": "بارکردن…",
  "li.eye": "پەیوەندی · تۆڕی پیشەیی",
  "li.title": "بەرەکات لە <em>LinkedIn</em>",
  "li.desc": "ئەزموون، پێشنیار، و تۆماری پیشەیی — نوێکراوە و کراوەیە بۆ هاوکاری.",
  "soc.open": "کردنەوە",
  "be.eye": "پۆرتفۆلیۆ · تۆڕی داهێنەران",
  "go.eye": "گەڕان · پانێڵی زانیاری", "go.title": "بەرکەت لە <em>گووگڵ</em>", "go.desc": "بەرکەت قورتاس لە گووگڵ بدۆزەرەوە — پرۆفایل، کارە هەڵبژێردراوەکان و ئامادەیی لەسەر تۆڕ.",
  "ck.title": "کووکی", "ck.text": "ئەم ماڵپەڕە کووکی بەکاردەهێنێت بۆ پێوانەی ڕێبواری و باشترکردنی ئەزموونەکەت.", "ck.accept": "تێگەیشتم",
  "be.title": "بەرەکات لە <em>Behance</em>",
  "be.desc": "پۆرتفۆلیۆی داهێنەرانەی تەواو — پڕۆژە، لێکۆڵینەوەی حاڵەت، و کاری بەردەوام، لە یەک شوێندا کۆکراوەتەوە."
 },
 "kmr": {
  "bio.lede": "<span class=\"dropcap\">B</span>arakat Qurtas Babakr — sêwirmendê grafîk ê serbixwe, di navbera protokola dewletê, sêwirana edîtoriyal û projeyên kesane yên bêdeng de dixebite. Li Hewlêr, Herêma Kurdistanê ya Iraqê.",
  "bp.eye": "Çîroka li paş sêwirmend kifş bike",
  "bp.label": "Felsefeya <em>Kar</em>",
  "bp.quote": "«Ne girîng e ku ez niha li ku dixebitim an di pêşerojê de li ku dixebitim, lê her tim girîng e ku mirov razîbûna kesên din bi dest bixe.»",
  "bp.p1": "Ez Barakat Qurtas im, li Soran ji dayik bûme û niha li Hewlêr dijîm — bajarekî ku awayê dîtina min a cîhanê guhert. Ez di navbera bêdengiya çiyayan û ahenga jiyana bajêr de mezin bûm — du dijberî yên ku hîna jî zimanê min ê sêwirandinê diyar dikin. Hewlêr niha şevên biriqandî û îlhama bêdawî pêşkêş dike.",
  "bp.p2": "Evîna min a sêwirandinê zû dest pê kir. Di 12 saliya xwe de min dest bi ceribandinê kir, û di 17 saliyê de ez bi tevahî di sêwirana grafîk de wek pîşeyek noqî bûm. Ji wê demê ve min berdewam jêhatîbûnên xwe bi pratîk û ezmûna rastîn pêş xist — bihêle ku karên min ji bo xwe biaxivin.",
  "bp.p3": "Ez bi Adobe Creative Suite dixebitim û çend sertîfîkayên masterclass hene. Min bi Serokatiya Herêma Kurdistanê û Protokola HHK re hevkarî kiriye. Armanca min berfirehkirina bandora afirîner û damezrandina pargîdaniyeke pêşeng a reklam û weşanê ye.",
  "ex1.title": "Li Bereyê Karûbarên Medyayê dixebite",
  "ex1.date": "Berfanbar 2021 — Niha · 4 sal 6 meh",
  "ex1.org": "Serokatiya Herêma Kurdistanê · Demkî",
  "ex1.loc": "Navçeya Deşta Hewlêrê, Parêzgeha Hewlêrê, Iraq",
  "ex1.desc": "Nivîsgeha Serokê Herêma Kurdistanê. Nivîskar li Serokatiya Herêma Kurdistanê ya Iraqê —",
  "ex1.skills": "Sêwirana Grafîk, Adobe Lightroom",
  "ex1.more": "+16 jêhatîbûn",
  "ex2.title": "Berê li Medyaya Protokolê",
  "ex2.date": "Sibat 2019 — Berfanbar 2019 · 11 meh",
  "ex2.org": "Hikûmeta Herêma Kurdistanê · Demkî",
  "ex2.loc": "Hewlêr, Parêzgeha Hewlêrê, Iraq",
  "ex2.desc": "Nivîsgeha Serokwezîrê Hikûmeta Herêma Kurdistanê.",
  "ex2.skills": "Karmendê Protokolê, Kamerayê Vîdyoyê",
  "ex2.more": "+2 jêhatîbûn",
  "ex3.title": "Sêwirmendê Grafîk",
  "ex3.date": "Çile 2014 — Çile 2019 · 5 sal 1 meh",
  "ex3.org": "Çapxane · Demkî û Sêwirmendê Grafîk ê Azad",
  "ex3.skills": "Sêwirana Grafîk, Adobe Lightroom",
  "ex3.more": "+25 jêhatîbûn",
  "ed.title": "Zanîngeha Selahedîn — Hewlêr",
  "ed.sub": "Dîploma Hiqûqê · 2020 — 2022",
  "ed.grade": "Pile: Mezûn",
  "ed.act": "— Çalakî:",
  "ed.actv": "Hiqûq ji bo civakeke ewle",
  "ed.skills": "Hiqûq û Hiqûqa Navneteweyî",
  "h1.t": "Mertala Rûmetê û Sertîfîka",
  "h2.t": "Diyariya Rûmetê — Serokatî",
  "h3.t": "Mertala Rûmetê — Soran",
  "h4.t": "Roja Cîhanî ya Dilxwazan",
  "h5.t": "Rêz û Spasdarî",
  "lng.ar": "Erebî",
  "lng.en": "Îngilîzî",
  "lng.fr": "Fransî",
  "lng.ir": "Zimanên Îranî",
  "lng.ckb": "Kurdî (Soranî)",
  "lng.kmr": "Kurdî — Kurmancî",
  "lng.tr": "Tirkî",
  "lp.full": "Şarezayiya pîşeyî ya temam",
  "lp.elem": "Şarezayiya bingehîn",
  "lp.prof": "Şarezayiya kar a pîşeyî",
  "lp.enNote": "Şarezayiya bingehîn · Skora Duolingo 10 (Gulan 2026)",
  "bo1.role": "Sêwirmendê Grafîk û Çapker · Cotmeh 2024 — Tebax 2025",
  "bo2.name": "Yekîtiya Ciwanên Demokrat ên Kurdistanê",
  "bo2.role": "Sêwirmendê Grafîk û birêvebirina medya civakî · Berfanbar 2022 — Îlon 2024",
  "bo3.name": "Tora Hevrêziya Rêxistinan",
  "bo3.role": "Sêwirmendê Grafîk û Dilxwaz · Nîsan 2019 — Çile 2020",
  "bo4.name": "Rêxistina Edaletê ji bo Pirsên Lagan",
  "bo4.role": "Sêwirmendê Grafîk û pêşvebirê malperê · Sibat 2014 — Sibat 2017",
  "cert.loading": "Tê barkirin…",
  "li.eye": "Têkilî · Tora Pîşeyî",
  "li.title": "Barakat li <em>LinkedIn</em>",
  "li.desc": "Ezmûn, pêşniyar û tomara pîşeyî — nûkirî û ji bo hevkariyê vekirî.",
  "soc.open": "Veke",
  "be.eye": "Portfolyo · Tora Afirîner",
  "go.eye": "Lêgerîn · Panela Zanînê", "go.title": "Barakat li <em>Google</em>", "go.desc": "Barakat Qurtas li Google bibîne — profîl, karên bijartî û hebûna li ser torê.",
  "ck.title": "Çerez", "ck.text": "Ev malper çerez bikar tîne da ku trafîkê bipîve û ezmûna te baştir bike.", "ck.accept": "Fêhm kir",
  "be.title": "Barakat li <em>Behance</em>",
  "be.desc": "Portfolyoya afirîner a temam — proje, lêkolînên rewşê, û karê berdewam, li yek cî berhevkirî."
 },
 "ar": {
  "bio.lede": "<span class=\"dropcap\">ب</span>ركات قرطاس بابكر — مصمم جرافيك مستقل، يعمل بين البروتوكول الرسمي والتصميم التحريري والمشاريع الشخصية الهادئة. مقيم في أربيل، إقليم كردستان العراق.",
  "bp.eye": "اكتشف القصة وراء المصمم",
  "bp.label": "فلسفة <em>العمل</em>",
  "bp.quote": "«لا يهم أين أعمل الآن أو في المستقبل، لكن من المهم دائمًا أن أنال رضا الآخرين.»",
  "bp.p1": "أنا بركات قرطاس، وُلدت في سوران وأقيم حاليًا في أربيل — مدينة غيّرت طريقة رؤيتي للعالم. نشأت بين سكون الجبال وإيقاع حياة المدينة — تناقضان ما زالا يحددان لغتي التصميمية. أربيل الآن تمنحني ليالي متوهجة وإلهامًا لا ينتهي.",
  "bp.p2": "بدأ شغفي بالتصميم مبكرًا. في الثانية عشرة بدأت أجرّب، وبحلول السابعة عشرة كنت منغمسًا تمامًا في التصميم الجرافيكي كمهنة. ومنذ ذلك الحين واصلت تطوير مهاراتي بالممارسة والخبرة الواقعية — تاركًا عملي يتحدث عن نفسه.",
  "bp.p3": "أعمل بحزمة Adobe Creative Suite وأحمل عدة شهادات ماستر كلاس. تعاونت مع رئاسة إقليم كردستان وبروتوكول الإقليم. هدفي توسيع أثري الإبداعي وتأسيس شركة رائدة في الإعلان والنشر.",
  "ex1.title": "يعمل في مديرية الشؤون الإعلامية",
  "ex1.date": "كانون الأول ٢٠٢١ — الآن · ٤ سنوات و٦ أشهر",
  "ex1.org": "رئاسة إقليم كردستان · دوام جزئي",
  "ex1.loc": "قضاء سهل أربيل، محافظة أربيل، العراق",
  "ex1.desc": "مكتب رئيس إقليم كردستان. كاتب في رئاسة إقليم كردستان العراق —",
  "ex1.skills": "تصميم جرافيك، أدوبي لايتروم",
  "ex1.more": "+١٦ مهارة",
  "ex2.title": "عمل سابق في إعلام البروتوكول",
  "ex2.date": "شباط ٢٠١٩ — كانون الأول ٢٠١٩ · ١١ شهرًا",
  "ex2.org": "حكومة إقليم كردستان · دوام جزئي",
  "ex2.loc": "أربيل، محافظة أربيل، العراق",
  "ex2.desc": "مكتب رئيس وزراء حكومة إقليم كردستان.",
  "ex2.skills": "موظف بروتوكول، كاميرا فيديو",
  "ex2.more": "+٢ مهارة",
  "ex3.title": "مصمم جرافيك",
  "ex3.date": "كانون الثاني ٢٠١٤ — كانون الثاني ٢٠١٩ · ٥ سنوات وشهر",
  "ex3.org": "مطبعة · دوام جزئي ومصمم جرافيك مستقل",
  "ex3.skills": "تصميم جرافيك، أدوبي لايتروم",
  "ex3.more": "+٢٥ مهارة",
  "ed.title": "جامعة صلاح الدين — أربيل",
  "ed.sub": "دبلوم القانون · ٢٠٢٠ — ٢٠٢٢",
  "ed.grade": "الدرجة: خرّيج",
  "ed.act": "— الأنشطة:",
  "ed.actv": "القانون من أجل مجتمع آمن",
  "ed.skills": "القانون والقانون الدولي",
  "h1.t": "درع التكريم وشهادة",
  "h2.t": "هدية تكريمية — الرئاسة",
  "h3.t": "درع التكريم — سوران",
  "h4.t": "اليوم العالمي للتطوع",
  "h5.t": "احترام وتقدير",
  "lng.ar": "العربية",
  "lng.en": "الإنجليزية",
  "lng.fr": "الفرنسية",
  "lng.ir": "اللغات الإيرانية",
  "lng.ckb": "الكردية (سوراني)",
  "lng.kmr": "الكردية — كرمانجي",
  "lng.tr": "التركية",
  "lp.full": "إتقان مهني كامل",
  "lp.elem": "إتقان أساسي",
  "lp.prof": "إتقان مهني عملي",
  "lp.enNote": "إتقان أساسي · نتيجة Duolingo ١٠ (أيار ٢٠٢٦)",
  "bo1.role": "مصمم جرافيك وطابع · تشرين الأول ٢٠٢٤ — آب ٢٠٢٥",
  "bo2.name": "اتحاد شبيبة كردستان الديمقراطي",
  "bo2.role": "مصمم جرافيك وإدارة وسائل التواصل · كانون الأول ٢٠٢٢ — أيلول ٢٠٢٤",
  "bo3.name": "شبكة تنسيق المنظمات",
  "bo3.role": "مصمم جرافيك ومتطوع · نيسان ٢٠١٩ — كانون الثاني ٢٠٢٠",
  "bo4.name": "منظمة العدالة لقضايا لاكان",
  "bo4.role": "مصمم جرافيك ومطوّر مواقع · شباط ٢٠١٤ — شباط ٢٠١٧",
  "cert.loading": "جارٍ التحميل…",
  "li.eye": "تواصل · شبكة مهنية",
  "li.title": "بركات على <em>LinkedIn</em>",
  "li.desc": "الخبرة والتوصيات والسجل المهني — محدّث ومفتوح للتعاون.",
  "soc.open": "فتح",
  "be.eye": "بورتفوليو · شبكة إبداعية",
  "go.eye": "بحث · لوحة المعرفة", "go.title": "بركات على <em>جوجل</em>", "go.desc": "اعثر على بركات قورتاس في جوجل — الملف الشخصي، أعمال مختارة، وحضوره على الويب.",
  "ck.title": "ملفات الارتباط", "ck.text": "يستخدم هذا الموقع ملفات تعريف الارتباط لقياس الزيارات وتحسين تجربتك.", "ck.accept": "حسناً",
  "be.title": "بركات على <em>Behance</em>",
  "be.desc": "البورتفوليو الإبداعي الكامل — مشاريع ودراسات حالة وأعمال جارية، مجموعة في مكان واحد."
 },
 "fr": {
  "bio.lede": "<span class=\"dropcap\">B</span>arakat Qurtas Babakr — designer graphique indépendant, travaillant entre le protocole d’État, le design éditorial et de discrets projets personnels. Basé à Erbil, Région du Kurdistan d’Irak.",
  "bp.eye": "Découvrez l’histoire derrière le designer",
  "bp.label": "Philosophie de <em>travail</em>",
  "bp.quote": "« Peu importe où je travaille maintenant ou à l’avenir, mais il est toujours important de satisfaire les autres. »",
  "bp.p1": "Je suis Barakat Qurtas, né à Soran et basé aujourd’hui à Erbil — une ville qui a transformé ma façon de voir le monde. J’ai grandi entre le calme des montagnes et le rythme de la ville — deux contrastes qui définissent encore mon langage graphique. Erbil m’offre désormais des nuits lumineuses et une inspiration sans fin.",
  "bp.p2": "Ma passion pour le design a commencé tôt. À 12 ans, j’ai commencé à expérimenter, et à 17 ans j’étais pleinement plongé dans le design graphique comme métier. Depuis, j’ai continué à développer mes compétences par la pratique et l’expérience réelle — en laissant mon travail parler de lui-même.",
  "bp.p3": "Je travaille avec la suite Adobe Creative et détiens plusieurs certificats de masterclass. J’ai collaboré avec la Présidence de la Région du Kurdistan et le Protocole du GRK. Mon but est d’élargir mon impact créatif et de fonder une grande entreprise de publicité et d’édition.",
  "ex1.title": "Travaille à la Direction des affaires médiatiques",
  "ex1.date": "Déc. 2021 — Présent · 4 ans 6 mois",
  "ex1.org": "Présidence de la Région du Kurdistan · Temps partiel",
  "ex1.loc": "District des plaines d’Erbil, Gouvernorat d’Erbil, Irak",
  "ex1.desc": "Cabinet du Président de la Région du Kurdistan. Auteur à la Présidence de la Région du Kurdistan d’Irak —",
  "ex1.skills": "Design graphique, Adobe Lightroom",
  "ex1.more": "+16 compétences",
  "ex2.title": "Anciennement aux Médias du protocole",
  "ex2.date": "Févr. 2019 — Déc. 2019 · 11 mois",
  "ex2.org": "Gouvernement régional du Kurdistan · Temps partiel",
  "ex2.loc": "Erbil, Gouvernorat d’Erbil, Irak",
  "ex2.desc": "Cabinet du Premier ministre du Gouvernement régional du Kurdistan.",
  "ex2.skills": "Agent de protocole, Caméra vidéo",
  "ex2.more": "+2 compétences",
  "ex3.title": "Designer graphique",
  "ex3.date": "Janv. 2014 — Janv. 2019 · 5 ans 1 mois",
  "ex3.org": "Imprimerie · Temps partiel & designer graphique indépendant",
  "ex3.skills": "Design graphique, Adobe Lightroom",
  "ex3.more": "+25 compétences",
  "ed.title": "Université Salahaddin — Erbil",
  "ed.sub": "Diplôme de droit · 2020 — 2022",
  "ed.grade": "Mention : Diplômé",
  "ed.act": "— Activités :",
  "ed.actv": "Le droit pour une communauté sûre",
  "ed.skills": "Droit et droit international",
  "h1.t": "Bouclier d’honneur & certificat",
  "h2.t": "Cadeau honorifique — Présidence",
  "h3.t": "Bouclier d’honneur — Soran",
  "h4.t": "Journée mondiale du bénévolat",
  "h5.t": "Respect & reconnaissance",
  "lng.ar": "Arabe",
  "lng.en": "Anglais",
  "lng.fr": "Français",
  "lng.ir": "Langues iraniennes",
  "lng.ckb": "Kurde (Soranî)",
  "lng.kmr": "Kurde — Kurmancî",
  "lng.tr": "Turc",
  "lp.full": "Maîtrise professionnelle complète",
  "lp.elem": "Niveau élémentaire",
  "lp.prof": "Maîtrise professionnelle",
  "lp.enNote": "Niveau élémentaire · Score Duolingo 10 (mai 2026)",
  "bo1.role": "Designer graphique et imprimeur · oct. 2024 — août 2025",
  "bo2.name": "Union de la jeunesse démocratique du Kurdistan",
  "bo2.role": "Designer graphique et gestion des réseaux sociaux · déc. 2022 — sept. 2024",
  "bo3.name": "Organisations CNO",
  "bo3.role": "Designer graphique et bénévole · avr. 2019 — janv. 2020",
  "bo4.name": "ONG Justice pour les questions de Lagan",
  "bo4.role": "Designer graphique et développeur web · févr. 2014 — févr. 2017",
  "cert.loading": "Chargement…",
  "li.eye": "Connexion · Réseau professionnel",
  "li.title": "Barakat sur <em>LinkedIn</em>",
  "li.desc": "Expérience, recommandations et parcours professionnel — à jour et ouvert à la collaboration.",
  "soc.open": "Ouvrir",
  "be.eye": "Portfolio · Réseau créatif",
  "go.eye": "Recherche · Fiche Google", "go.title": "Barakat sur <em>Google</em>", "go.desc": "Retrouvez Barakat Qurtas sur Google — profil, travaux choisis et présence sur le web.",
  "ck.title": "Cookies", "ck.text": "Ce site utilise des cookies pour mesurer le trafic et améliorer votre expérience.", "ck.accept": "J’ai compris",
  "be.title": "Barakat sur <em>Behance</em>",
  "be.desc": "Le portfolio créatif complet — projets, études de cas et travaux en cours, réunis en un seul endroit."
 }
};
Object.keys(window.I18N_EXTRA_B).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_B[l]); });

/* ===== flat keys: blog/reader/float ===== */
window.I18N_EXTRA_D = {
 "en": {
  "float.designer": "Designer · Hewlêr",
  "float.album": "{n} works · click to open",
  "blog.min": "{n} MIN",
  "blog.minRead": "{n} MIN READ",
  "blog.comments": "{n} comments",
  "blog.noComments": "No comments yet — be the first to write one.",
  "blog.anon": "Anonymous",
  "blog.cta": "Click to read the full note",
  "blog.goto": "Go to",
  "blog.go": "Go",
  "rd.likes": "likes",
  "rd.post": "Post",
  "rd.cmt": "Share a thought…"
 },
 "ku": {
  "float.designer": "دیزاینەر · هەولێر",
  "float.album": "{n} کار · کلیک بکە بۆ کردنەوە",
  "blog.min": "{n} خولەک",
  "blog.minRead": "خوێندنەوە {n} خولەک",
  "blog.comments": "{n} کۆمێنت",
  "blog.noComments": "هێشتا هیچ کۆمێنتێک نییە — یەکەم کەس بە کە دەینووسێت.",
  "blog.anon": "بێ‌ناو",
  "blog.cta": "کلیک بکە بۆ خوێندنەوەی تەواوی تێبینییەکە",
  "blog.goto": "بڕۆ بۆ",
  "blog.go": "بڕۆ",
  "rd.likes": "بەدڵ",
  "rd.post": "بڵاوکردنەوە",
  "rd.cmt": "بیرۆکەیەک بنووسە…"
 },
 "kmr": {
  "float.designer": "Sêwirmend · Hewlêr",
  "float.album": "{n} kar · ji bo vekirinê bitikîne",
  "blog.min": "{n} deqe",
  "blog.minRead": "{n} deqe xwendin",
  "blog.comments": "{n} şîrove",
  "blog.noComments": "Hîna şîrove tune — bibe ya/yê yekem.",
  "blog.anon": "Nenas",
  "blog.cta": "Ji bo xwendina notê ya temam bitikîne",
  "blog.goto": "Biçe",
  "blog.go": "Biçe",
  "rd.likes": "ecibandin",
  "rd.post": "Bişîne",
  "rd.cmt": "Ramanekê parve bike…"
 },
 "ar": {
  "float.designer": "مصمم · أربيل",
  "float.album": "{n} عمل · انقر للفتح",
  "blog.min": "{n} دقيقة",
  "blog.minRead": "قراءة {n} دقيقة",
  "blog.comments": "{n} تعليق",
  "blog.noComments": "لا توجد تعليقات بعد — كن أول من يكتب.",
  "blog.anon": "مجهول",
  "blog.cta": "انقر لقراءة الملاحظة كاملة",
  "blog.goto": "اذهب إلى",
  "blog.go": "اذهب",
  "rd.likes": "إعجاب",
  "rd.post": "نشر",
  "rd.cmt": "شارك فكرة…"
 },
 "fr": {
  "float.designer": "Designer · Hewlêr",
  "float.album": "{n} travaux · cliquez pour ouvrir",
  "blog.min": "{n} MIN",
  "blog.minRead": "LECTURE {n} MIN",
  "blog.comments": "{n} commentaires",
  "blog.noComments": "Pas encore de commentaire — soyez le premier.",
  "blog.anon": "Anonyme",
  "blog.cta": "Cliquez pour lire la note complète",
  "blog.goto": "Aller à",
  "blog.go": "Aller",
  "rd.likes": "j’aime",
  "rd.post": "Publier",
  "rd.cmt": "Partagez une pensée…"
 }
};
Object.keys(window.I18N_EXTRA_D).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_D[l]); });

/* ===== Blog posts — per language (index/preview/reader header) ===== */
window.BLOG_I18N = {"ku": {"01": {"tag": "ئەدیتۆریاڵ", "title": "لەسەر تەلارسازیی واتا", "sub": "تایپۆگرافی ڕازاندنەوە نییە — پلانی ڕووکاری لاپەڕەیە.", "date": "ئایار ٢٠٢٦"}, "02": {"tag": "شوێن", "title": "ژوورێکی چاپکار لە هەولێر", "sub": "گەڕەکە کۆنەکە، نهۆمی سێیەم، ڕووناکیی باکوور. دەفتەرێک، چاپخانەیەکی بچووک.", "date": "نیسان ٢٠٢٦"}, "03": {"tag": "فۆنت", "title": "دوو ڕێنووس، یەک وشە-مۆر", "sub": "دیزاین بۆ کوردی و لاتینی لە یەک لۆگۆدا وەرگێڕان نییە — دوەتە.", "date": "ئازار ٢٠٢٦"}, "04": {"tag": "پیشە", "title": "بۆچی هێشتا پرووف چاپ دەکەم", "sub": "شاشە بە نەرمی درۆ دەکات. کاغەز ڕاستیت پێ دەڵێت لەسەر ڕەنگ و کێش.", "date": "شوبات ٢٠٢٦"}, "05": {"tag": "پراکتیک", "title": "لەسەر هەڵبژاردنی وردی کڕیار", "sub": "دوو پڕۆژە لە چارەکێکدا. هەمیشە بڵاوکەرەوەی سەربەخۆ، هەمیشە خوێنەری وردبین.", "date": "کانوونی دووەم ٢٠٢٦"}, "06": {"tag": "ڕەنگ", "title": "ساڵەکە، بە سێ ڕەنگ", "sub": "زێڕی سووتاو، مەرەکەبی گەرم، کرێم. پاڵێتێک کە نەیویست ستۆدیۆ بەجێبهێڵێت.", "date": "کانوونی یەکەم ٢٠٢٥"}, "07": {"tag": "پرۆسە", "title": "یەکەم دە سکێچی بچووک", "sub": "هەموو مۆرێکی باش بە سکێچێکی خراپ دەستپێدەکات — زۆرجار دەدانە.", "date": "تشرینی دووەم ٢٠٢٥"}, "08": {"tag": "شوێن", "title": "سۆران، لەوێ دەستی پێکرد", "sub": "کوڕێک، چیایەک، و قەڵەمێکی بەردەستکراو.", "date": "تشرینی یەکەم ٢٠٢٥"}, "09": {"tag": "ئامرازەکان", "title": "لە ستایشی گرێد", "sub": "ئازادی، دەرکەوت، حەزی لە سنوور دەکات.", "date": "ئەیلوول ٢٠٢٥"}, "10": {"tag": "فۆنت", "title": "کێرنینگ جۆرێکە لە گوێگرتن", "sub": "بۆشایی نێوان پیتەکان ئەو شوێنەیە کە مۆسیقا تێیدا دەژی.", "date": "ئاب ٢٠٢٥"}, "11": {"tag": "چاپ", "title": "بۆنی مەرەکەبی تازە", "sub": "هەندێک شت کە PDF هەرگیز پێت نادات.", "date": "تەمموز ٢٠٢٥"}, "12": {"tag": "پراکتیک", "title": "نەهێشتن، بە نەرمی", "sub": "نەخێرێکی ڕوون بەڵێیەکی دڵفراوان دەپارێزێت.", "date": "حوزەیران ٢٠٢٥"}, "13": {"tag": "ڕەنگ", "title": "زێڕ کردارە", "sub": "بە کەمی بەکاربهێنرێت، زۆرترین کار دەکات.", "date": "ئایار ٢٠٢٥"}, "14": {"tag": "پیشە", "title": "دیزاینی نەبینراو", "sub": "باشترین دیزاینی پرۆتۆکۆڵ هەرگیز نابینرێت.", "date": "نیسان ٢٠٢٥"}, "15": {"tag": "چیرۆک", "title": "پەنجەمۆر و بران", "sub": "بۆچی پەنجەمۆر مۆرێک هەڵدەگرێت، نەک بریقەیەک.", "date": "ئازار ٢٠٢٥"}, "16": {"tag": "تێبینی", "title": "سێ شت لەسەر مێزەکەم", "sub": "قەڵەمێک، پرووفێک، و چایەکی ئارام.", "date": "شوبات ٢٠٢٥"}}, "kmr": {"01": {"tag": "Edîtoriyal", "title": "Li ser avahîsaziya wateyê", "sub": "Tîpografî xemilandin nîne — ew plana rûyê rûpelê ye.", "date": "Gulan 2026"}, "02": {"tag": "Cî", "title": "Odeya çapkerê li Hewlêr", "sub": "Taxa kevn, qata sêyem, ronahiya bakur. Defterek, çapxaneyeke piçûk.", "date": "Nîsan 2026"}, "03": {"tag": "Tîp", "title": "Du nivîs, yek peyv-nîşan", "sub": "Sêwirandin ji bo Kurdî û Latînî di yek logoyê de ne werger e — duet e.", "date": "Adar 2026"}, "04": {"tag": "Huner", "title": "Çima ez hîn jî provayan çap dikim", "sub": "Ekran bi nermî derew dike. Kaxez rastiyê li ser reng û giraniyê dibêje.", "date": "Sibat 2026"}, "05": {"tag": "Pratîk", "title": "Li ser bijartina mişteriyan bi baldarî", "sub": "Du proje di her çaryekê de. Her tim weşanxaneyên serbixwe, her tim xwînerên hûrbîn.", "date": "Çile 2026"}, "06": {"tag": "Reng", "title": "Sal, bi sê rengan", "sub": "Zêrê şewitî, mereka germ, krem. Paletek ku nexwest studyoyê biterke.", "date": "Berfanbar 2025"}, "07": {"tag": "Pêvajo", "title": "Deh skêçên pêşîn", "sub": "Her nîşaneke baş bi skêçeke xerab dest pê dike — bi gelemperî deh ji wan.", "date": "Mijdar 2025"}, "08": {"tag": "Cî", "title": "Soran, cihê ku dest pê kir", "sub": "Kurek, çiyayek û qelemek deynkirî.", "date": "Cotmeh 2025"}, "09": {"tag": "Amûr", "title": "Di pesnê gridê de", "sub": "Azadî, derket holê, ji sînor hez dike.", "date": "Îlon 2025"}, "10": {"tag": "Tîp", "title": "Kerning cûreyek guhdarî ye", "sub": "Valahiya navbera tîpan cihê ku muzîk lê dijî ye.", "date": "Tebax 2025"}, "11": {"tag": "Çap", "title": "Bêhna mereka taze", "sub": "Hin tişt ku PDF tu carî nade te.", "date": "Tîrmeh 2025"}, "12": {"tag": "Pratîk", "title": "Gotina na, bi dilovanî", "sub": "Na'yeke zelal erêyeke comerd diparêze.", "date": "Hezîran 2025"}, "13": {"tag": "Reng", "title": "Zêr lêker e", "sub": "Bi hindikî tê bikaranîn, herî zêde kar dike.", "date": "Gulan 2025"}, "14": {"tag": "Huner", "title": "Sêwirandina nedîtbar", "sub": "Sêwirana protokolê ya herî baş tu carî nayê dîtin.", "date": "Nîsan 2025"}, "15": {"tag": "Çîrok", "title": "Şopa tilî û brand", "sub": "Çima Pencemor şopekê hildigire, ne biriqînê.", "date": "Adar 2025"}, "16": {"tag": "Not", "title": "Sê tişt li ser maseya min", "sub": "Qelemek, provayek û fîncanek çayê ya bîhnfireh.", "date": "Sibat 2025"}}, "ar": {"01": {"tag": "تحرير", "title": "في معمار المعنى", "sub": "الطباعة ليست زخرفة — إنها مخطط الصفحة.", "date": "مايو ٢٠٢٦"}, "02": {"tag": "مكان", "title": "غرفة طابع في أربيل", "sub": "الحي القديم، الطابق الثالث، ضوء الشمال. دفتر، مطبعة صغيرة.", "date": "أبريل ٢٠٢٦"}, "03": {"tag": "الخط", "title": "خطّان، علامة واحدة", "sub": "تصميم الكردية واللاتينية في شعار واحد ليس ترجمة — بل ثنائي.", "date": "مارس ٢٠٢٦"}, "04": {"tag": "حرفة", "title": "لماذا ما زلت أطبع البروفات", "sub": "الشاشة تكذب بلطف. الورق يخبرك الحقيقة عن اللون والوزن.", "date": "فبراير ٢٠٢٦"}, "05": {"tag": "ممارسة", "title": "في اختيار العملاء بعناية", "sub": "مشروعان كل ربع. دائمًا ناشرون مستقلون، دائمًا قرّاء مدققون.", "date": "يناير ٢٠٢٦"}, "06": {"tag": "لون", "title": "العام، بثلاثة ألوان", "sub": "ذهب محروق، حبر دافئ، كريمي. لوحة رفضت مغادرة الاستوديو.", "date": "ديسمبر ٢٠٢٥"}, "07": {"tag": "عملية", "title": "أول عشرة مخططات", "sub": "كل علامة جيدة تبدأ برسمة سيئة — عشر منها عادة.", "date": "نوفمبر ٢٠٢٥"}, "08": {"tag": "مكان", "title": "سوران، حيث بدأ كل شيء", "sub": "صبي، وجبل، وقلم مُستعار.", "date": "أكتوبر ٢٠٢٥"}, "09": {"tag": "أدوات", "title": "في مديح الشبكة", "sub": "الحرية، كما تبيّن، تحب القيد.", "date": "سبتمبر ٢٠٢٥"}, "10": {"tag": "الخط", "title": "التقنين نوع من الإصغاء", "sub": "المسافة بين الحروف هي حيث تعيش الموسيقى.", "date": "أغسطس ٢٠٢٥"}, "11": {"tag": "طباعة", "title": "رائحة الحبر الطازج", "sub": "أشياء لن يمنحك إياها ملف PDF أبدًا.", "date": "يوليو ٢٠٢٥"}, "12": {"tag": "ممارسة", "title": "قول لا، بلطف", "sub": "لا واضحة تحمي نعم سخية.", "date": "يونيو ٢٠٢٥"}, "13": {"tag": "لون", "title": "الذهب فعل", "sub": "يُستخدم باعتدال، فيؤدي أكبر عمل.", "date": "مايو ٢٠٢٥"}, "14": {"tag": "حرفة", "title": "تصميم اللامرئي", "sub": "أفضل تصميم بروتوكولي لا يُلاحَظ أبدًا.", "date": "أبريل ٢٠٢٥"}, "15": {"tag": "قصة", "title": "البصمة والعلامة", "sub": "لماذا يحمل بنجَمور بصمة لا لمعانًا.", "date": "مارس ٢٠٢٥"}, "16": {"tag": "ملاحظات", "title": "ثلاثة أشياء على مكتبي", "sub": "قلم، وبروفة، وكوب شاي صبور.", "date": "فبراير ٢٠٢٥"}}, "fr": {"01": {"tag": "Édition", "title": "Sur l'architecture du sens", "sub": "La typographie n'est pas une décoration — c'est le plan de la page.", "date": "mai 2026"}, "02": {"tag": "Lieu", "title": "L'atelier d'un imprimeur à Hewlêr", "sub": "Le vieux quartier, troisième étage, lumière du nord. Un carnet, une petite presse.", "date": "avr. 2026"}, "03": {"tag": "Typo", "title": "Deux écritures, un logotype", "sub": "Concevoir le kurde et le latin dans un logo n'est pas une traduction — c'est un duo.", "date": "mars 2026"}, "04": {"tag": "Artisanat", "title": "Pourquoi j'imprime encore des épreuves", "sub": "L'écran ment, doucement. Le papier dit la vérité sur la couleur et le poids.", "date": "févr. 2026"}, "05": {"tag": "Pratique", "title": "Bien choisir ses clients", "sub": "Deux projets par trimestre. Toujours des éditeurs indépendants, toujours des lecteurs attentifs.", "date": "janv. 2026"}, "06": {"tag": "Couleur", "title": "L'année, en trois couleurs", "sub": "Or brûlé, encre chaude, crème. Une palette qui refusait de quitter le studio.", "date": "déc. 2025"}, "07": {"tag": "Processus", "title": "Les dix premières vignettes", "sub": "Toute bonne marque commence par un mauvais croquis — dix, en général.", "date": "nov. 2025"}, "08": {"tag": "Lieu", "title": "Soran, là où tout a commencé", "sub": "Un garçon, une montagne et un crayon emprunté.", "date": "oct. 2025"}, "09": {"tag": "Outils", "title": "Éloge de la grille", "sub": "La liberté, il s'avère, aime la contrainte.", "date": "sept. 2025"}, "10": {"tag": "Typo", "title": "Le crénage est une écoute", "sub": "L'espace entre les lettres est là où vit la musique.", "date": "août 2025"}, "11": {"tag": "Impression", "title": "L'odeur de l'encre fraîche", "sub": "Des choses qu'un PDF ne vous donnera jamais.", "date": "juil. 2025"}, "12": {"tag": "Pratique", "title": "Dire non, avec gentillesse", "sub": "Un non clair protège un oui généreux.", "date": "juin 2025"}, "13": {"tag": "Couleur", "title": "L'or est un verbe", "sub": "Utilisé avec parcimonie, il fait le plus grand travail.", "date": "mai 2025"}, "14": {"tag": "Artisanat", "title": "Concevoir l'invisible", "sub": "Le meilleur design protocolaire ne se remarque jamais.", "date": "avr. 2025"}, "15": {"tag": "Récit", "title": "L'empreinte et la marque", "sub": "Pourquoi Pencemor porte une empreinte, non un vernis.", "date": "mars 2025"}, "16": {"tag": "Notes", "title": "Trois choses sur mon bureau", "sub": "Un stylo, une épreuve et une tasse de thé patiente.", "date": "févr. 2025"}}};

/* ===== Chatbot knowledge base — per language ===== */

/* ===== Honors (bio room preview card) — per language ===== */
window.HONORS_I18N = {"ku": {"01": {"title": "قەڵغانی ڕێز و بڕوانامەی پێزانین", "sub": "بۆ هاوکاری و ڕێکخستنی ئاهەنگی ناساندنی کتێب.", "tag": "ئاژانسی نووچە نێت"}, "02": {"title": "دیاریی ڕێزی نووسینگەی سەرۆک", "sub": "بۆ کاری بەردەوامی لە ڕۆژنامەوانی و دیزاینی ڕۆژنامە — سەرۆکایەتیی هەرێمی کوردستان.", "tag": "نووسینگەی سەرۆک"}, "03": {"title": "قەڵغانی ڕێز", "sub": "بۆ ڕێکخستنی کۆنفرانسی بەشی مێژوو لە زانکۆی سۆران.", "tag": "زانکۆی سۆران"}, "04": {"title": "ڕێز و پێزانین — ڕۆژی جیهانیی خۆبەخش", "sub": "بۆ کاری خۆبەخشیی بەردەوام لەگەڵ تۆڕی هەماهەنگیی ڕێکخراوەکانی پارێزگای هەولێر.", "tag": "پارێزگاری هەولێر"}, "05": {"title": "ڕێز و پێزانین", "sub": "بۆ ڕێکخستنی کۆنفرانسی ڕۆژی جیهانیی لاوان — تۆڕی هەماهەنگیی ڕێکخراوەکان.", "tag": "تۆڕی CNO"}}, "kmr": {"01": {"title": "Mertala Rûmetê û Sertîfîkaya Spasdariyê", "sub": "Ji bo hevkarî û rêxistina merasîma danasîna pirtûkê.", "tag": "Ajansa Nuche Net"}, "02": {"title": "Diyariya Rûmetê ya Nivîsgeha Serok", "sub": "Ji bo karê wî yê berdewam di rojnamegerî û sêwirana rojnameyê de — Serokatiya Herêma Kurdistanê.", "tag": "Nivîsgeha Serok"}, "03": {"title": "Mertala Rûmetê", "sub": "Ji bo rêxistina konferansa Beşa Dîrokê li Zanîngeha Soran.", "tag": "Zanîngeha Soran"}, "04": {"title": "Rûmet û Spasdarî — Roja Cîhanî ya Dilxwazan", "sub": "Ji bo karê dilxwaziyê yê berdewam bi Tora Hevrêziya Rêxistinên Parêzgeha Hewlêrê re.", "tag": "Walîtiya Hewlêrê"}, "05": {"title": "Rêz û Spasdarî", "sub": "Ji bo rêxistina Konferansa Roja Cîhanî ya Ciwanan — Tora Hevrêziya Rêxistinan.", "tag": "Tora CNO"}}, "ar": {"01": {"title": "درع التكريم وشهادة تقدير", "sub": "لتعاونه وتنسيقه في تنظيم حفل إشهار الكتاب.", "tag": "وكالة نوجة نت"}, "02": {"title": "هدية تكريمية من مكتب الرئيس", "sub": "لعمله المستمر في الصحافة وتصميم الصحف — رئاسة إقليم كردستان.", "tag": "مكتب الرئيس"}, "03": {"title": "درع التكريم", "sub": "لتنظيم مؤتمر قسم التاريخ في جامعة سوران.", "tag": "جامعة سوران"}, "04": {"title": "تكريم وتقدير — اليوم العالمي للتطوع", "sub": "للعمل التطوعي المستمر مع شبكة تنسيق منظمات محافظة أربيل.", "tag": "محافظة أربيل"}, "05": {"title": "احترام وتقدير", "sub": "لتنظيم مؤتمر اليوم العالمي للشباب — شبكة تنسيق المنظمات.", "tag": "شبكة CNO"}}, "fr": {"01": {"title": "Bouclier d'honneur et certificat d'appréciation", "sub": "Pour la coopération et la coordination de la cérémonie de lancement du livre.", "tag": "Agence Nuche Net"}, "02": {"title": "Cadeau honorifique du Cabinet du Président", "sub": "Pour son travail continu en journalisme et design de presse — Présidence de la Région du Kurdistan.", "tag": "Cabinet du Président"}, "03": {"title": "Bouclier d'honneur", "sub": "Pour l'organisation de la conférence du département d'histoire à l'Université de Soran.", "tag": "Université de Soran"}, "04": {"title": "Honneur et reconnaissance — Journée mondiale du bénévolat", "sub": "Pour le bénévolat continu avec le Réseau de coordination des organisations de la province d'Erbil.", "tag": "Gouvernorat d'Erbil"}, "05": {"title": "Respect et reconnaissance", "sub": "Pour l'organisation de la Conférence de la Journée mondiale de la jeunesse — Réseau de coordination des organisations.", "tag": "Réseau CNO"}}};
window.I18N_EXTRA_H = {"en": {"hon.vol": "AWARD №{num} · {year}", "hon.issued": "ISSUED BY {tag}"}, "ku": {"hon.vol": "خەڵات №{num} · {year}", "hon.issued": "پێشکەشکراو لەلایەن {tag}"}, "kmr": {"hon.vol": "XELAT №{num} · {year}", "hon.issued": "JI ALIYÊ {tag}"}, "ar": {"hon.vol": "جائزة №{num} · {year}", "hon.issued": "مُقدَّمة من {tag}"}, "fr": {"hon.vol": "PRIX №{num} · {year}", "hon.issued": "DÉCERNÉ PAR {tag}"}};
Object.keys(window.I18N_EXTRA_H).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_H[l]); });

/* ===== Gallery card tag/title — per language ===== */
window.GAL_I18N = {"ku": {"general": {"tag": "دیزاین", "title": "دیزاین"}, "book": {"tag": "کتێب", "title": "بەرگی کتێب"}, "official": {"tag": "فەرمی", "title": "فەرمی"}, "posters": {"tag": "پۆستەر", "title": "پۆستەر"}, "social": {"tag": "سۆشیال", "title": "سۆشیال میدیا"}, "logo": {"tag": "لۆگۆ", "title": "لۆگۆ"}, "tickerlogo": {"tag": "لۆگۆ", "title": "لۆگۆی تیکەر"}, "events": {"tag": "بۆنە", "title": "بۆنە"}, "business": {"tag": "کارتی بازرگانی", "title": "کارتی بازرگانی"}, "invoices": {"tag": "پسووڵە", "title": "پسووڵە"}, "image": {"tag": "وێنە", "title": "وێنە"}, "other": {"tag": "هیتر", "title": "هیتر"}, "certificate": {"tag": "بڕوانامە", "title": "بڕوانامە"}, "flex": {"tag": "هیتر", "title": "فلێکس"}, "video": {"tag": "ڤیدیۆ", "title": "ڤیدیۆ"}}, "kmr": {"general": {"tag": "Sêwiran", "title": "Sêwiran"}, "book": {"tag": "Pirtûk", "title": "Bergê Pirtûkê"}, "official": {"tag": "Fermî", "title": "Fermî"}, "posters": {"tag": "Poster", "title": "Poster"}, "social": {"tag": "Civakî", "title": "Medya Civakî"}, "logo": {"tag": "Logo", "title": "Logo"}, "tickerlogo": {"tag": "Logo", "title": "Logoya Ticker"}, "events": {"tag": "Bûyer", "title": "Bûyer"}, "business": {"tag": "Karta Karsaziyê", "title": "Karta Karsaziyê"}, "invoices": {"tag": "Fatûre", "title": "Fatûre"}, "image": {"tag": "Wêne", "title": "Wêne"}, "other": {"tag": "Yên din", "title": "Yên din"}, "certificate": {"tag": "Sertîfîka", "title": "Sertîfîka"}, "flex": {"tag": "Yên din", "title": "Flex"}, "video": {"tag": "Vîdyo", "title": "Vîdyo"}}, "ar": {"general": {"tag": "تصميم", "title": "تصميم"}, "book": {"tag": "كتاب", "title": "غلاف كتاب"}, "official": {"tag": "رسمي", "title": "رسمي"}, "posters": {"tag": "ملصق", "title": "ملصق"}, "social": {"tag": "تواصل", "title": "وسائل التواصل"}, "logo": {"tag": "شعار", "title": "شعار"}, "tickerlogo": {"tag": "شعار", "title": "شعار تيكر"}, "events": {"tag": "فعاليات", "title": "فعالية"}, "business": {"tag": "بطاقة عمل", "title": "بطاقة عمل"}, "invoices": {"tag": "فاتورة", "title": "فاتورة"}, "image": {"tag": "صورة", "title": "صورة"}, "other": {"tag": "أخرى", "title": "أخرى"}, "certificate": {"tag": "شهادة", "title": "شهادة"}, "flex": {"tag": "أخرى", "title": "فليكس"}, "video": {"tag": "فيديو", "title": "فيديو"}}, "fr": {"general": {"tag": "Design", "title": "Design"}, "book": {"tag": "Livre", "title": "Couverture"}, "official": {"tag": "Officiel", "title": "Officiel"}, "posters": {"tag": "Affiche", "title": "Affiche"}, "social": {"tag": "Social", "title": "Réseaux sociaux"}, "logo": {"tag": "Logo", "title": "Logo"}, "tickerlogo": {"tag": "Logo", "title": "Logo Ticker"}, "events": {"tag": "Événements", "title": "Événement"}, "business": {"tag": "Carte de visite", "title": "Carte de visite"}, "invoices": {"tag": "Facture", "title": "Facture"}, "image": {"tag": "Photo", "title": "Photo"}, "other": {"tag": "Autre", "title": "Autre"}, "certificate": {"tag": "Certificat", "title": "Certificat"}, "flex": {"tag": "Autre", "title": "Flex"}, "video": {"tag": "Vidéo", "title": "Vidéo"}}};

/* ===== blog teaser meta (design room) ===== */
window.I18N_EXTRA_M = {"en": {"bt1.date": "May 2026", "bt2.date": "Apr 2026", "bt3.date": "Mar 2026", "bt1.min": "6 min", "bt2.min": "4 min", "bt3.min": "8 min"}, "ku": {"bt1.date": "ئایار ٢٠٢٦", "bt2.date": "نیسان ٢٠٢٦", "bt3.date": "ئازار ٢٠٢٦", "bt1.min": "٦ خولەک", "bt2.min": "٤ خولەک", "bt3.min": "٨ خولەک"}, "kmr": {"bt1.date": "Gulan 2026", "bt2.date": "Nîsan 2026", "bt3.date": "Adar 2026", "bt1.min": "6 deqe", "bt2.min": "4 deqe", "bt3.min": "8 deqe"}, "ar": {"bt1.date": "مايو ٢٠٢٦", "bt2.date": "أبريل ٢٠٢٦", "bt3.date": "مارس ٢٠٢٦", "bt1.min": "٦ دقائق", "bt2.min": "٤ دقائق", "bt3.min": "٨ دقائق"}, "fr": {"bt1.date": "mai 2026", "bt2.date": "avr. 2026", "bt3.date": "mars 2026", "bt1.min": "6 min", "bt2.min": "4 min", "bt3.min": "8 min"}};
Object.keys(window.I18N_EXTRA_M).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_M[l]); });

/* ===== Blog post bodies — per language ===== */
window.BLOG_BODY_I18N = {"ku": {"01": ["تایپۆگرافی ڕازاندنەوە نییە. پلانی ڕووکاری لاپەڕەیە — ئەو شوێنەی خوێنەر دەوەستێت، هەناسە دەدات، و جێپێی خۆی دەدۆزێتەوە.", "کاتێک لاپەڕەیەک ڕێک دەخەم، خێراییەک هەڵدەبژێرم، نەک تەنها فۆنتێک. بۆشاییەکی فراوان هەناسەیەکی گیراوە؛ ستوونێکی تەسک چرپەیەکی بەپەلە.", "تەلارسازییەکە ڕاست بکە، ناوەڕۆکەکە وەک شتێکی ناچار دەردەکەوێت — وەک نەکراوایە بە هیچ شێوەیەکی تر ڕێکبخرێت."], "02": ["گەڕەکە کۆنەکە، نهۆمی سێیەم، ڕووناکیی ڕووەو باکوور. دەفتەرێک، چاپخانەیەکی بچووک، و خووێکی هێواش بۆ پرسینی بۆچی.", "کارێک کە لێرە دروستدەبێت شوێنەکە لەناوخۆیدا هەڵدەگرێت — بۆنی مەرەکەبی هێشتا وشک‌نەبوو، کێشی کاغەزی چاوەڕوان.", "ئەم ژوورە بە ئەنقەست بچووک دەهێڵمەوە. سنوورەکان یەکەم و دڵسۆزترین هاوکارن."], "03": ["دیزاینکردن بۆ کوردی و لاتینی لە یەک لۆگۆدا وەرگێڕان نییە — دوەتەیە. دوو ڕێنووس، هەرکامیان ڕیتمی خۆی هەیە.", "پیتە کوردییەکان دەیانەوێت بڕۆن؛ لاتینییەکان دەیانەوێت بوەستن. کارەکە دۆزینەوەی ئەو ڕەوشەیە کە هیچیان میوان نەبن.", "کاتێک سەرکەوتوو دەبێت، خوێنەری هەر ڕێنووسێک هەست بە ماڵەوەیی دەکات — و هەرگیز ئەو دیپلۆماسییە هێمنە نابینێت کە پێویست بوو."], "04": ["شاشە بە نەرمی درۆ دەکات. کاغەز ڕاستیت پێ دەڵێت لەسەر ڕەنگ، کێش، و ئەو هەوا نەوتراوەی نێوان پیتەکان.", "بۆشاییەک کە لەسەر شاشە بەخشندە دیار بوو، لەناو لەپدا دەکرێت ڕەق بێت؛ ڕەساسییەک کە نەرم دیار بوو، لەژێر ڕووناکیی چرادا سارد دەبێت.", "پرووفکردن پشکنینی کۆتایی نییە. گفتوگۆیە لەگەڵ ئەو شتەی کارەکە دەبێتە ئەو."], "05": ["دوو پڕۆژە لە چارەکێکدا. هەمیشە بڵاوکەرەوەی سەربەخۆ، هەمیشە کەسێک کە دەقە بچووکەکە دەخوێنێتەوە.", "هەڵبژاردنی وردی کڕیار لووتبەرزی نییە — تەنها ئەو ڕێگایەیە کە دەیزانم بۆ پاراستنی دڵسۆزیی کارەکە.", "ئەو پڕۆژانەی شانازییان پێوە دەکەم هەموویان بە یەک شێوە دەستیان پێکرد: گفتوگۆیەکی درێژ، بێ پەلە."], "06": ["زێڕی سووتاو، مەرەکەبی گەرم، کرێم. وردبینییەکی کورت لەسەر پاڵێتێک کە نەیویست ستۆدیۆ بەجێبهێڵێت.", "هەندێک ساڵ بە ڕەنگێکەوە دێن کە پێشتر هاوبەستراوە. ئەمیان بە سێ ڕەنگەوە هات.", "بەو شێوەیە هەڵمنەبژاردن وەک ئەوەی تێیانبگەم — و کاتێک تێیانگەیشتم، هەموو شتێکی تریان ڕێکخست."], "07": ["هەموو مۆرێکی باش بە سکێچێکی خراپ دەستپێدەکات. زۆرجار دەدانە، پێش ئەوەی شتێکی شایانی پاراستن دەربکەوێت.", "سکێچە بچووکەکان کارەکە نین؛ مۆڵەتن بۆ خراپ‌بوون بە خێرایی، لەسەر کاغەزی هەرزان، لەوێ هیچ تێناچێت.", "خێرایی لە سەرەتا ئارامی لە کۆتایی دەکڕێت. خراپ دەکێشم تا باش بڕیار بدەم."], "08": ["لە سۆران لەدایکبووم، لە نێوان بێدەنگیی چیاکان و ژاوەژاوی شارۆچکەیەکی گەشەسەندوو.", "یەکەم ئامرازەکانم بەردەستکراو بوون و یەکەم بینەرم ئارامبوو. هەردووکیان فێریان کردم بەسەربردن — پاشان باشترکردن.", "هەولێر شارەکەی پێدام؛ سۆران چاوەکەی پێدام. هەردووکیان لە هەموو لاپەڕەیەکدا هەڵدەگرم."], "09": ["گرێد قەفەس نییە. دەستەکێشێکە لە تاریکیدا — شتێک کە متمانەی پێ دەکەیت کاتێک ذەوق کۆتایی دێت.", "ئازادی، دەرکەوت، حەزی لە سنوور دەکات. لاپەڕەی بەتاڵ ئازادکەر نییە؛ ماندووکەرە.", "سەرەتا گرێدەکە دروست دەکەم تا بیرۆکەکان شوێنێکیان هەبێت بۆ وەستان."], "10": ["کێرنینگ جۆرێکە لە گوێگرتن. پیتەکان ناجوڵێنیت؛ بێدەنگیی نێوانیان ئاهەنگ دەکەیت.", "زۆرینەی خوێنەران هەرگیز نایبینن. تەنها هەست دەکەن وشەیەک لە جێی خۆیدایە — ئارام، یەکسان، بێ پەلە.", "کارە نەبینراوەکە خودی کارەکەیە. بەڕاستی، هەموو پیشەکە ئەوەیە."], "11": ["ساتێک هەیە کە چاپخانە بۆ یەکەمجار کاغەز ماچ دەکات، کە هیچ شاشەیەک هەرگیز دووبارەی ناکاتەوە.", "چاپ کەللەڕەقە، گرانە، و کۆتاییە — و هەر لەبەر ئەوەیە کە وریات دەکات.", "فایلێک دەکرێت بۆ هەتاهەتایە هەڵبوەشێنرێتەوە. پەڕەیەکی چاپکراو داوات لێدەکات مەبەستت هەبێت."], "12": ["زۆرینەی دیزاین بڕیاردانە لەسەر ئەوەی چی نەکرێت. زۆرینەی پیشەیەک بڕیاردانە لەسەر ئەوەی لەگەڵ کێ کار نەکرێت.", "نەخێرێکی ڕوون، زوو و بە نەرمی وتراو، ئەو بەڵێ دڵفراوانە دەپارێزێت کە بە پڕۆژەی ڕاست دەیدەیت.", "کەمی ستراتیژی نییە. بەڵام ڕاستگۆیی لەبارەی کاتەوە جۆرێکە لە ڕێز."], "13": ["زێڕ ڕەنگێک نییە کە زیادی دەکەیت؛ جەختکردنەوەیەکە کە بەدەستی دەهێنیت. لاپەڕەیەکی پڕ لێی هیچ ناڵێت.", "بە کەمی بەکاربهێنرێت — یاسایەک، خاڵێک، یەک پیت — زۆرترین کار دەکات بۆ کەمترین ژاوەژاو.", "خۆڕاگری لوکسەکەیە. زێڕەکە تەنها ئاماژەی بۆ دەکات."], "14": ["کارکردن لەگەڵ پرۆتۆکۆڵی دەوڵەتی فێری کردم کە باشترین دیزاین لێرە ئەو دیزاینەیە کە کەس نایبینێت.", "ڕوونی لەژێر فشاردا، شکۆ بێ ڕیایی، هەمان ئارامی لە خراپترین ڕۆژدا وەک باشترین.", "نەبینراو واتە تەمبەڵ نییە. نەبینراو قورسترین شتە بە ئەنقەست بکرێت."], "15": ["ستۆدیۆکەم ناونا پەنجەمۆر — پەنجەمۆرێک — چونکە مۆری خاوەندارێتی گرنگترە لە مۆری بریقە.", "پەنجەمۆر ناتوانرێت ساختە بکرێت یان بەردەست بکرێت. دەڵێت: ئەمە بەناو دەستی ڕاستەقینەدا تێپەڕی.", "تا پەنجەمۆری ئێمە لەسەرەوە بێت، خەمەکە هی منە بۆ هەڵگرتن، نەک هی تۆ."], "16": ["قەڵەمێک کە هەرگیز بە تەواوی وشک نابێت، پرووفێک کە سووری بەسەردا هاتووە، و پەرداخێک چای کە هێواش سارد دەبێت.", "ئەم سێیە ڕاستگۆم دەهێڵنەوە: مەرەکەب بۆ پابەندبوون، نیشانە بۆ ڕاستکردنەوە، و وەستانێک بۆ دووبارە بیرکردنەوە.", "ئامرازەکان دانپێدانانی بچووکن لەسەر ئەوەی چۆن حەز دەکەیت کار بکەیت. هی من دەڵێن: هێواش، بە دەست، بە ئارامی."]}, "kmr": {"01": ["Tîpografî xemilandin nîne. Ew plana rûyê rûpelê ye — cihê ku xwîner radiweste, bêhnê digire û cihê xwe dibîne.", "Dema ez rûpelekê saz dikim, ez lezekê hildibijêrim, ne tenê tîpekê. Valahiyeke fireh bêhneke girtî ye; stûneke teng pistepisteke bilez.", "Avahîsaziyê rast bike, naverok wek tiştekî neçar xuya dike — wek ku nikaribû bi awayekî din were rêzkirin."], "02": ["Taxa kevn, qata sêyem, ronahiya ber bi bakur. Defterek, çapxaneyeke piçûk, û adetekî hêdî yê pirsîna çima.", "Karê ku li vir tê çêkirin cihê di hundirê xwe de hildigire — bêhna mereka hîn neziwa, giraniya kaxezê li bendê.", "Ez vê odeyê bi zanetî piçûk dihêlim. Sînor hevkarê yekem û herî dilsoz in."], "03": ["Sêwirandin ji bo Kurdî û Latînî di yek logoyê de ne werger e — duet e. Du nivîs, her yek bi rîtma xwe.", "Tîpên Kurdî dixwazin biherikin; yên Latînî dixwazin rawestin. Kar ew e ku rewşê bibînî ku tu jê ne mêvan be.", "Dema serketî dibe, xwînerê her du nivîsan xwe li malê hîs dike — û tu carî diplomatiya bêdeng a ku hewce bû nabîne."], "04": ["Ekran bi nermî derew dike. Kaxez rastiyê li ser reng, giranî, û hewaya negotî ya navbera tîpan ji te re dibêje.", "Valahiyek ku li ser ekranê comerd xuya bû, di nav destê de dikare teng be; gewreyek ku nerm xuya bû, di bin ronahiya çirê de sar dibe.", "Prova ne kontrola dawî ye. Ew gotûbêj e bi tiştê ku kar wê bibe."], "05": ["Du proje di her çaryekê de. Her tim weşanxaneyên serbixwe, her tim kesek ku nivîsa biçûk dixwîne.", "Bijartina mişteriyan bi baldarî pozbilindî nîne — ew tenê rê ye ku ez dizanim ji bo parastina dilsoziya karê.", "Projeyên ku ez pê serbilind im hemû bi heman awayî dest pê kirin: gotûbêjeke dirêj, bê lez."], "06": ["Zêrê şewitî, mereka germ, krem. Ramaneke kurt li ser paletek ku nexwest studyoyê biterke.", "Hin sal bi rengekî tê ku jixwe pê ve girêdayî ye. Ev yek bi sê rengan hat.", "Min ew ne hilbijart ewqas ku min ew dîtin — û gava dîtin, wan her tiştê din rêz kir."], "07": ["Her nîşaneke baş bi skêçeke xerab dest pê dike. Bi gelemperî deh ji wan, berî ku tiştekî hêja xuya bibe.", "Skêçên biçûk ne kar in; ew destûr in ji bo xeletbûna bi lez, li ser kaxezê erzan, li cihê ku tiştek namire.", "Lez di destpêkê de bîhnfirehiyê di paşê de dikire. Ez xerab xêz dikim da ku baş biryar bidim."], "08": ["Ez li Soran ji dayik bûme, di navbera bêdengiya çiyayan û dengê bajarokekî mezinbûyî de.", "Amûrên min ên yekem deynkirî bûn û temaşevanê min ê yekem bîhnfireh bû. Herduyan ez fêrî debarê kirim — paşê çêtirkirinê.", "Hewlêr bajar da min; Soran çav da min. Ez herduyan di her rûpelê de hildigirim."], "09": ["Grid ne qefes e. Destgireke di tariyê de ye — tiştek ku tu pê bawer dikî gava tehm diqede.", "Azadî, derket holê, ji sînor hez dike. Rûpela vala ne azadker e; ew felc dike.", "Ez pêşî gridê çêdikim da ku raman cihek hebe ji bo rawestanê."], "10": ["Kerning cûreyek guhdarî ye. Tu tîpan najivînî; tu bêdengiya navbera wan saz dikî.", "Pirraniya xwîneran tu carî wê nabînin. Ew tenê hîs dikin ku peyvek di cihê xwe de ye — aram, wekhev, bê lez.", "Karê nedîtbar bi xwe kar e. Bi rastî, ev hemû huner e."], "11": ["Kêlîkek heye ku çapxane cara yekem kaxezê maç dike, ku tu ekran tu carî dûbare nake.", "Çap hişk e, biha ye, û dawî ye — û tam ji ber wê ye ku te baldar dike.", "Pelek dikare her û her were vekirin. Rûpeleke çapkirî ji te dixwaze ku tu mebesta xwe hebe."], "12": ["Pirraniya sêwirandinê biryardan e li ser tiştê ku neyê kirin. Pirraniya kariyerekê biryardan e li ser kê re neyê xebitîn.", "Na'yeke zelal, zû û bi dilovanî hatî gotin, erêya comerd diparêze ku tu didî projeya rast.", "Kêmî ne stratejî ye. Lê rastgoyî li ser demê cûreyek rêz e."], "13": ["Zêr ne rengek e ku tu lê zêde dikî; girîngiyek e ku tu bi dest dixî. Rûpeleke tijî pê tiştekî nabêje.", "Bi hindikî tê bikaranîn — qaîdeyek, xalek, tîpek tenê — herî zêde kar dike ji bo herî kêm deng.", "Xwegirtin luks e. Zêr tenê ber bi wê ve nîşan dide."], "14": ["Xebata bi protokola dewletê re ez fêr kir ku sêwirana herî baş li vir ew e ku kes nabîne.", "Zelalî di bin zextê de, rûmet bê dramayê, heman aramî di roja herî xerab de wek ya herî baş.", "Nedîtbar ne tiral e. Nedîtbar tiştê herî dijwar e ku bi mebest were kirin."], "15": ["Min navê studyoyê danî Pencemor — şopeke tilî — ji ber ku nîşana xwedaniyê ji nîşana biriqînê girîngtir e.", "Şopa tilî nayê sextekirin an deyn kirin. Ew dibêje: ev di nav cotek destên rastîn re derbas bû.", "Heta şopa me ya tiliyê li jor be, xem ya min e ku hilgirim, ne ya te."], "16": ["Qelemek ku tu carî bi temamî naziwa, provayek ku sor lê belav bûye, û fîncanek çay ku hêdî sar dibe.", "Ev her sê ez rastgo dihêlim: mereka ji bo girêdanê, nîşanên ji bo rastkirinê, û rawestanek ji bo dîsa fikirînê.", "Amûr îtirafên biçûk in li ser çawa tu hez dikî bixebitî. Yên min dibêjin: hêdî, bi dest, bi bîhnfirehî."]}, "ar": {"01": ["الطباعة ليست زخرفة. إنها مخطط الصفحة — حيث يتوقف القارئ ويتنفس ويجد موطئ قدمه.", "حين أصمّم صفحة، أختار إيقاعًا لا مجرد خط. الهامش الواسع نفَسٌ محبوس، والعمود الضيق همسة عاجلة.", "اضبط المعمار يصبح المحتوى حتميًا — كأنه ما كان ليُرتَّب بأي طريقة أخرى."], "02": ["الحي القديم، الطابق الثالث، ضوء يواجه الشمال. دفتر، مطبعة صغيرة، وعادة بطيئة في سؤال «لماذا».", "العمل المصنوع هنا يحمل المكان في داخله — رائحة حبر لم يجف بعد، وثقل ورق ينتظر.", "أبقي هذه الغرفة صغيرة عمدًا. القيود هي أول وأصدق شريك."], "03": ["تصميم الكردية واللاتينية في شعار واحد ليس ترجمة — بل ثنائي. خطّان، لكل منهما إيقاعه.", "الحروف الكردية تريد أن تنساب؛ واللاتينية تريد أن تقف. العمل هو إيجاد الوضع الذي لا يبدو فيه أيٌّ منهما ضيفًا.", "حين ينجح، يشعر قارئ أي الخطين بأنه في بيته — ولا يلاحظ أبدًا الدبلوماسية الهادئة التي تطلّبها."], "04": ["الشاشة تكذب بلطف. الورق يخبرك الحقيقة عن اللون والوزن والهواء غير المنطوق بين الحروف.", "هامش بدا سخيًا على الشاشة قد يبدو ضيقًا في راحة اليد؛ ورمادي بدا ناعمًا قد يبرد تحت ضوء المصباح.", "البروفة ليست فحصًا نهائيًا. إنها حوار مع الشيء الذي سيصبح عليه العمل."], "05": ["مشروعان كل ربع. دائمًا ناشرون مستقلون، دائمًا من يقرأ النص الصغير.", "اختيار العملاء بعناية ليس غرورًا — إنه الطريق الوحيد الذي أعرفه لإبقاء العمل صادقًا.", "المشاريع التي أفخر بها كلها بدأت بالطريقة نفسها: محادثة طويلة، بلا عجلة."], "06": ["ذهب محروق، حبر دافئ، كريمي. تأمّل قصير في لوحة رفضت مغادرة الاستوديو.", "بعض السنوات تأتي ولها لون مرفق سلفًا. هذه أتت بثلاثة.", "لم أخترها بقدر ما لاحظتها — وما إن لاحظتها حتى نظّمت كل شيء آخر."], "07": ["كل علامة جيدة تبدأ برسمة سيئة. عشر منها عادةً قبل أن يظهر شيء يستحق الاحتفاظ.", "المخططات الصغيرة ليست العمل؛ إنها إذن بأن تخطئ بسرعة، على ورق رخيص، حيث لا يكلّف شيئًا.", "السرعة مبكرًا تشتري الصبر لاحقًا. أرسم بسوء كي أقرّر بإحسان."], "08": ["وُلدت في سوران، بين سكون الجبال وضجيج بلدة آخذة في النمو.", "كانت أدواتي الأولى مُستعارة وجمهوري الأول صبورًا. علّمني كلاهما أن أتدبّر — ثم أن أُحسن.", "أربيل أعطتني المدينة؛ وسوران أعطتني العين. أحمل كليهما في كل صفحة."], "09": ["الشبكة ليست قفصًا. إنها درابزين في الظلام — شيء تثق به حين ينفد الذوق.", "الحرية، كما تبيّن، تحب القيد. الصفحة البيضاء ليست محرِّرة؛ إنها مُشِلّة.", "أبني الشبكة أولًا كي يكون للأفكار مكان تقف فيه."], "10": ["التقنين نوع من الإصغاء. أنت لا تحرّك الحروف؛ بل توالف الصمت بينها.", "معظم القرّاء لن يروه أبدًا. سيشعرون فقط أن الكلمة تجلس في مكانها — هادئة، متّزنة، غير متعجّلة.", "العمل غير المرئي هو العمل. هذه هي الحرفة كلها، حقًا."], "11": ["هناك لحظة حين تقبّل المطبعة الورق أول مرة لن تعيد أي شاشة إنتاجها أبدًا.", "الطباعة عنيدة ومكلفة ونهائية — ولهذا بالضبط تجعلك حذرًا.", "الملف يمكن التراجع عنه إلى الأبد. الورقة المطبوعة تطلب منك أن تعنيها."], "12": ["معظم التصميم هو تقرير ما لا يُفعل. ومعظم المسيرة هو تقرير مع من لا يُعمل.", "لا واضحة، تُقال مبكرًا وبلطف، تحمي النعم السخية التي تمنحها للمشروع الصحيح.", "الندرة ليست استراتيجية. لكن الصدق بشأن الوقت شكل من أشكال الاحترام."], "13": ["الذهب ليس لونًا تضيفه؛ بل تأكيد تكسبه. صفحة كاملة منه لا تقول شيئًا.", "يُستخدم باعتدال — مسطرة، نقطة، حرف واحد — فيؤدي أكبر عمل بأقل ضجيج.", "ضبط النفس هو الترف. والذهب مجرد إشارة إليه."], "14": ["العمل مع البروتوكول الرسمي علّمني أن أفضل تصميم هنا هو التصميم الذي لا يلاحظه أحد.", "وضوح تحت الضغط، وقار بلا دراما، الهدوء نفسه في أسوأ يوم كما في أفضله.", "اللامرئي ليس كسلًا. اللامرئي أصعب شيء يُفعل عمدًا."], "15": ["سمّيت الاستوديو بنجَمور — بصمة — لأن علامة الملكية أهم من علامة اللمعان.", "البصمة لا تُزيَّف ولا تُستعار. تقول: هذا مرّ عبر يدين حقيقيتين.", "ما دامت بصمتنا في الأعلى، فالهمّ همّي أحمله، لا همّك."], "16": ["قلم لا يجف تمامًا أبدًا، وبروفة مغطّاة بالأحمر، وكوب شاي يبرد ببطء.", "هذه الثلاثة تبقيني صادقًا: حبر للالتزام، وعلامات للتصحيح، ووقفة لإعادة التفكير.", "الأدوات اعترافات صغيرة عن كيف تحب أن تعمل. أدواتي تقول: ببطء، باليد، بصبر."]}, "fr": {"01": ["La typographie n'est pas une décoration. C'est le plan de la page — là où le lecteur s'arrête, respire et trouve ses repères.", "Quand je compose une page, je choisis un rythme, pas seulement une police. Une marge large est un souffle retenu ; une colonne serrée, un murmure pressé.", "Réussissez l'architecture et le contenu paraît inévitable — comme s'il n'avait pu être disposé autrement."], "02": ["Le vieux quartier, troisième étage, lumière au nord. Un carnet, une petite presse, et l'habitude lente de se demander pourquoi.", "Le travail fait ici porte le lieu en lui — l'odeur de l'encre pas encore sèche, le poids du papier qui attend.", "Je garde cette pièce volontairement petite. Les contraintes sont le premier et le plus honnête des collaborateurs."], "03": ["Concevoir le kurde et le latin dans un même logo n'est pas une traduction — c'est un duo. Deux écritures, chacune avec son rythme.", "Les lettres kurdes veulent fluer ; les latines veulent tenir debout. Le travail est de trouver la posture où aucune ne se sente invitée.", "Quand cela fonctionne, le lecteur de l'une ou l'autre écriture se sent chez lui — et ne remarque jamais la discrète diplomatie qu'il a fallu."], "04": ["L'écran ment, doucement. Le papier dit la vérité sur la couleur, le poids et l'air tu entre les lettres.", "Une marge qui semblait généreuse à l'écran peut paraître mesquine dans la paume ; un gris qui semblait doux peut devenir froid sous la lampe.", "L'épreuve n'est pas une vérification finale. C'est une conversation avec l'objet que deviendra le travail."], "05": ["Deux projets par trimestre. Toujours des éditeurs indépendants, toujours quelqu'un qui lit les petits caractères.", "Bien choisir ses clients n'est pas de l'arrogance — c'est la seule façon que je connaisse de garder le travail honnête.", "Les projets dont je suis le plus fier ont tous commencé de la même manière : une longue conversation, sans hâte."], "06": ["Or brûlé, encre chaude, crème. Une brève réflexion sur une palette qui refusait de quitter le studio.", "Certaines années arrivent avec une couleur déjà attachée. Celle-ci est venue en trois.", "Je ne les ai pas tant choisies que remarquées — et une fois remarquées, elles ont organisé tout le reste."], "07": ["Toute bonne marque commence par un mauvais croquis. Dix, en général, avant que n'apparaisse quelque chose à garder.", "Les vignettes ne sont pas le travail ; elles sont la permission de se tromper vite, sur du papier bon marché, où cela ne coûte rien.", "La vitesse au début achète la patience plus tard. Je dessine mal pour bien décider."], "08": ["Je suis né à Soran, entre le calme des montagnes et le bruit d'une ville en croissance.", "Mes premiers outils étaient empruntés et mon premier public patient. Les deux m'ont appris à faire avec — puis à faire mieux.", "Erbil m'a donné la ville ; Soran m'a donné l'œil. Je porte les deux dans chaque page."], "09": ["Une grille n'est pas une cage. C'est une rampe dans le noir — quelque chose à qui se fier quand le goût manque.", "La liberté, il s'avère, aime la contrainte. La page blanche n'est pas libératrice ; elle est paralysante.", "Je construis d'abord la grille pour que les idées aient où se tenir."], "10": ["Le crénage est une forme d'écoute. Vous ne déplacez pas les lettres ; vous accordez le silence entre elles.", "La plupart des lecteurs ne le verront jamais. Ils sentiront seulement qu'un mot est bien posé — calme, égal, sans hâte.", "Le travail invisible est le travail. C'est tout l'artisanat, vraiment."], "11": ["Il y a un instant où la presse embrasse le papier pour la première fois qu'aucun écran ne reproduira jamais.", "L'impression est têtue, coûteuse et définitive — et c'est précisément pour cela qu'elle vous rend prudent.", "Un fichier peut être défait à l'infini. Une feuille imprimée vous demande d'être sincère."], "12": ["L'essentiel du design est de décider ce qu'on ne fera pas. L'essentiel d'une carrière est de décider avec qui on ne travaillera pas.", "Un non clair, dit tôt et avec gentillesse, protège le oui généreux que vous donnez au bon projet.", "La rareté n'est pas une stratégie. Mais l'honnêteté sur le temps est une forme de respect."], "13": ["L'or n'est pas une couleur qu'on ajoute ; c'est une emphase qu'on mérite. Une page entière d'or ne dit rien.", "Utilisé avec parcimonie — un filet, un point, une seule lettre — il fait le plus de travail pour le moins de bruit.", "La retenue est le luxe. L'or ne fait que le désigner."], "14": ["Travailler avec le protocole d'État m'a appris que le meilleur design ici est celui que personne ne remarque.", "Clarté sous pression, dignité sans drame, le même calme le pire jour que le meilleur.", "Invisible ne veut pas dire paresseux. Invisible est la chose la plus difficile à faire exprès."], "15": ["J'ai nommé le studio Pencemor — une empreinte — car une marque de propriété compte plus qu'une marque d'éclat.", "Une empreinte ne peut être ni falsifiée ni empruntée. Elle dit : ceci est passé entre de vraies mains.", "Tant que notre empreinte reste au sommet, le souci est à moi de le porter, pas à vous."], "16": ["Un stylo qui ne s'assèche jamais tout à fait, une épreuve couverte de rouge, et une tasse de thé qui refroidit lentement.", "Ces trois choses me gardent honnête : l'encre pour s'engager, les marques pour corriger, et une pause pour repenser.", "Les outils sont de petites confessions sur la façon dont on aime travailler. Les miens disent : lentement, à la main, avec patience."]}};
(function(){ if(!window.BLOG_I18N) return; Object.keys(window.BLOG_BODY_I18N).forEach(function(l){ Object.keys(window.BLOG_BODY_I18N[l]).forEach(function(num){ if(window.BLOG_I18N[l] && window.BLOG_I18N[l][num]) window.BLOG_I18N[l][num].body = window.BLOG_BODY_I18N[l][num]; }); }); })();

/* ===== tooltips + tab hover cards ===== */
window.I18N_EXTRA_T = {"en": {"tip.chat": "Assistant", "tip.lang": "Language", "tip.share": "Share", "tip.theme": "Theme", "tab.works": "{n} works · click to filter"}, "ku": {"tip.chat": "یاریدەدەر", "tip.lang": "زمان", "tip.share": "هاوبەشکردن", "tip.theme": "ڕووکار", "tab.works": "{n} کار · کلیک بکە بۆ فلتەر"}, "kmr": {"tip.chat": "Alîkar", "tip.lang": "Ziman", "tip.share": "Parve bike", "tip.theme": "Tema", "tab.works": "{n} kar · ji bo parzûnê bitikîne"}, "ar": {"tip.chat": "المساعد", "tip.lang": "اللغة", "tip.share": "مشاركة", "tip.theme": "المظهر", "tab.works": "{n} عمل · انقر للتصفية"}, "fr": {"tip.chat": "Assistant", "tip.lang": "Langue", "tip.share": "Partager", "tip.theme": "Thème", "tab.works": "{n} travaux · cliquez pour filtrer"}};
Object.keys(window.I18N_EXTRA_T).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_T[l]); });
window.TABCARD_I18N = {"ku": {"all": {"tag": "کاتالۆگی تەواو", "desc": "هەموو پیشەیەک لە یەک شوێندا کۆکراوەتەوە — تەواوی کارەکان."}, "official": {"tag": "فەرمی · ئەدیتۆریاڵ", "desc": "دیزاینی ئەدیتۆریاڵ بۆ سەرۆکایەتیی هەرێمی کوردستان و کاروباری ڕاگەیاندن."}, "book": {"tag": "چاپ · بەرگ", "desc": "بەرگی کتێب — تایپۆگرافی، وێنەکێشان، و پێکهاتەی چاپ."}, "image": {"tag": "وێنەگرافی", "desc": "دەستکاریی وێنە، کۆمپۆزیت، و ڕیتاچی ئەدیتۆریاڵ."}, "logo": {"tag": "ناسنامەی بران", "desc": "لۆگۆ، وشە-مۆر، و ناسنامەی بینراو بە دەست کێشراو."}, "posters": {"tag": "چاپ", "desc": "زنجیرە پۆستەری کلتووری، سیاسی، و تایپۆگرافی."}, "social": {"tag": "دیجیتاڵ", "desc": "کەمپەینی سۆشیال، گرێد، و چیرۆکی دیجیتاڵ."}, "events": {"tag": "ناسنامە", "desc": "کەرەستەی ڕێوڕەسم، بانێر، و دیزاینی ناسنامەی بۆنە."}, "business": {"tag": "کەرەستەی نووسین", "desc": "کارتی بازرگانی و کەرەستەی کەسی و کڕیار."}, "invoices": {"tag": "کەرەستەی نووسین", "desc": "سیستەمی سەرپەڕە، پسووڵە، و وەسڵ."}, "video": {"tag": "مۆشن", "desc": "مۆنتاژی دۆکیۆمێنتاری، ڕیلی مۆشن، و پۆشینی میدیا."}, "other": {"tag": "جۆراوجۆر", "desc": "بانێری فلێکس، تاقیکردنەوەی فۆنت، و شتە بچووکەکان."}}, "kmr": {"all": {"tag": "Kataloga temam", "desc": "Her dîsîplîn li yek cî — koma temam a karan."}, "official": {"tag": "Fermî · Edîtoriyal", "desc": "Sêwirana edîtoriyal ji bo Serokatiya Herêma Kurdistanê û Karûbarên Medyayê."}, "book": {"tag": "Çap · Berg", "desc": "Bergên pirtûkan — tîpografî, wênesazî û pêkhateya çapê."}, "image": {"tag": "Wênekêşî", "desc": "Sererastkirina wêneyan, kompozît û retûşa edîtoriyal."}, "logo": {"tag": "Nasnameya brandê", "desc": "Logo, peyv-nîşan û nasnameyên dîtbarî yên bi dest xêzkirî."}, "posters": {"tag": "Çap", "desc": "Rêze posterên çandî, siyasî û tîpografîk."}, "social": {"tag": "Dîjîtal", "desc": "Kampanyayên civakî, grid û çîrokbêjiya dîjîtal."}, "events": {"tag": "Nasname", "desc": "Materyalên merasîman, banner û sêwirana nasnameya bûyeran."}, "business": {"tag": "Qirtasiye", "desc": "Kartên karsaziyê û qirtasiya kesane û mişterî."}, "invoices": {"tag": "Qirtasiye", "desc": "Sîstemên serkaxez, fatûre û meqbûz."}, "video": {"tag": "Motion", "desc": "Montaja dokumenter, reelên motion û pêşkêşkirina medyayê."}, "other": {"tag": "Cûrbecûr", "desc": "Bannerên flex, ezmûnên tîpê û tiştên biçûk."}}, "ar": {"all": {"tag": "الكتالوج الكامل", "desc": "كل تخصص مجموع في مكان واحد — مجمل الأعمال."}, "official": {"tag": "رسمي · تحرير", "desc": "تصميم تحريري لرئاسة إقليم كردستان والشؤون الإعلامية."}, "book": {"tag": "طباعة · أغلفة", "desc": "أغلفة الكتب — طباعة ورسم وتركيب طباعي."}, "image": {"tag": "تصوير", "desc": "تحرير الصور والتركيب والتنقيح التحريري."}, "logo": {"tag": "الهوية البصرية", "desc": "شعارات وكلمات-علامات وهويات بصرية مرسومة باليد."}, "posters": {"tag": "طباعة", "desc": "سلسلة ملصقات ثقافية وسياسية وطباعية."}, "social": {"tag": "رقمي", "desc": "حملات اجتماعية وشبكات وسرد رقمي."}, "events": {"tag": "الهوية", "desc": "مواد المراسم واللافتات وتصميم هوية الفعاليات."}, "business": {"tag": "القرطاسية", "desc": "بطاقات عمل وقرطاسية شخصية وللعملاء."}, "invoices": {"tag": "القرطاسية", "desc": "أنظمة الترويسة والفاتورة والإيصال."}, "video": {"tag": "موشن", "desc": "مونتاج وثائقي ومقاطع موشن وتغطية إعلامية."}, "other": {"tag": "متنوعات", "desc": "لافتات فليكس وتجارب خطية وأشياء صغيرة."}}, "fr": {"all": {"tag": "Catalogue complet", "desc": "Chaque discipline réunie — l’ensemble du travail."}, "official": {"tag": "Officiel · Édition", "desc": "Design éditorial pour la Présidence de la Région du Kurdistan et les affaires médiatiques."}, "book": {"tag": "Imprimé · Couvertures", "desc": "Couvertures — typographie, illustration et composition imprimée."}, "image": {"tag": "Photographie", "desc": "Retouche photo, montages et retouche éditoriale."}, "logo": {"tag": "Identité de marque", "desc": "Logos, logotypes et identités visuelles dessinés à la main."}, "posters": {"tag": "Imprimé", "desc": "Séries d’affiches culturelles, politiques et typographiques."}, "social": {"tag": "Numérique", "desc": "Campagnes sociales, grilles et narration numérique."}, "events": {"tag": "Identité", "desc": "Matériel de cérémonie, bannières et identité d’événement."}, "business": {"tag": "Papeterie", "desc": "Cartes de visite et papeterie personnelle et client."}, "invoices": {"tag": "Papeterie", "desc": "Systèmes d’en-tête, de facture et de reçu."}, "video": {"tag": "Motion", "desc": "Montages documentaires, reels motion et couverture média."}, "other": {"tag": "Divers", "desc": "Bannières flex, expériences typographiques et petites choses."}}};

/* ===== show-less / collapse ===== */
window.I18N_EXTRA_L = {"en": {"lm.less": "Show less", "lm.collapse": "Collapse all"}, "ku": {"lm.less": "کەمتر پیشانبدە", "lm.collapse": "هەمووی کۆبکەرەوە"}, "kmr": {"lm.less": "Kêmtir nîşan bide", "lm.collapse": "Hemûyî bigire"}, "ar": {"lm.less": "عرض أقل", "lm.collapse": "طيّ الكل"}, "fr": {"lm.less": "Voir moins", "lm.collapse": "Tout réduire"}};
Object.keys(window.I18N_EXTRA_L).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_L[l]); });

/* ===== name localization + rail room cards ===== */
window.I18N_EXTRA_N = {"en": {"name.first": "Barakat", "name.last": "Qurtas", "name.full": "Barakat Qurtas", "pj.name": "Panjamor", "tip.share": "Socials"}, "ku": {"name.first": "بەرەکات", "name.last": "قورتاس", "name.full": "بەرەکات قورتاس", "pj.name": "پەنجەمۆر", "tip.share": "تۆڕەکان"}, "kmr": {"name.first": "Barakat", "name.last": "Qurtas", "name.full": "Barakat Qurtas", "pj.name": "Panjamor", "tip.share": "Tor"}, "ar": {"name.first": "بركات", "name.last": "قرطاس", "name.full": "بركات قرطاس", "pj.name": "بنجمور", "tip.share": "الشبكات"}, "fr": {"name.first": "Barakat", "name.last": "Qurtas", "name.full": "Barakat Qurtas", "pj.name": "Panjamor", "tip.share": "Réseaux"}};
Object.keys(window.I18N_EXTRA_N).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_N[l]); });
window.ROOMCARD_I18N = {"ku": {"design": {"tag": "پۆرتفۆلیۆ", "count": "٧٠٠+ کار", "desc": "کاتالۆگێکی زیندوو — ئەدیتۆریاڵی فەرمی، کتێب، لۆگۆ، پۆستەر، وێنە و ڤیدیۆ."}, "blog": {"tag": "گۆڤار", "count": "٦ وتار", "desc": "تێبینی کورت لە مێزی کارەوە لەسەر تایپۆگرافی، شوێن، و پیشەی نەرمی دیزاین."}, "bio": {"tag": "دەربارە", "count": "٢٠١٤ — ئێستا", "desc": "دەیەیەک پراکتیک لە هەولێر — ئەزموون، خوێندن، خەڵات و زمانەکان."}, "contact": {"tag": "داواکارییەکان", "count": "وەڵام لە ٤٨ کاتژمێر", "desc": "پڕۆژەیەک پێشکەش بکە بە نامەیەکی وردبینانە. ئامادە بۆ پڕۆژەی هەڵبژێردراو."}}, "kmr": {"design": {"tag": "Portfolyo", "count": "700+ kar", "desc": "Katalogeke zindî — edîtoriyala fermî, pirtûk, logo, poster, wêne û vîdyo."}, "blog": {"tag": "Kovar", "count": "6 gotar", "desc": "Notên kurt ji maseyê li ser tîpografî, cî û pîşeya hêdî ya sêwirandinê."}, "bio": {"tag": "Derbarê", "count": "2014 — niha", "desc": "Deh sal pratîk li Hewlêr — ezmûn, perwerde, xelat û ziman."}, "contact": {"tag": "Daxwaz", "count": "Bersiv di 48 saetan", "desc": "Projeyek bi nameyeke baldarane pêşkêş bike. Ji bo karên bijartî amade."}}, "ar": {"design": {"tag": "بورتفوليو", "count": "٧٠٠+ عمل", "desc": "كتالوج حي — تحرير رسمي وكتب وشعارات وملصقات وصور وفيديو."}, "blog": {"tag": "مجلة", "count": "٦ مقالات", "desc": "ملاحظات قصيرة من المكتب عن الطباعة والمكان وحرفة التصميم البطيئة."}, "bio": {"tag": "نبذة", "count": "٢٠١٤ — الآن", "desc": "عقد من الممارسة في أربيل — الخبرة والتعليم والجوائز واللغات."}, "contact": {"tag": "الاستفسارات", "count": "الرد خلال ٤٨ ساعة", "desc": "قدّم مشروعك في رسالة واحدة دقيقة. متاح لمشاريع مختارة."}}, "fr": {"design": {"tag": "Portfolio", "count": "700+ travaux", "desc": "Un catalogue vivant — éditorial officiel, livres, logos, affiches, photo & vidéo."}, "blog": {"tag": "Journal", "count": "6 essais", "desc": "De brèves notes du bureau sur la typographie, le lieu et l’artisanat lent du design."}, "bio": {"tag": "À propos", "count": "2014 — auj.", "desc": "Une décennie de pratique à Hewlêr — expérience, formation, prix et langues."}, "contact": {"tag": "Demandes", "count": "Réponse sous 48 h", "desc": "Présentez un projet en une lettre soignée. Disponible pour des commandes choisies."}}};

/* ===== chat header strings ===== */
window.I18N_EXTRA_CH = {"en": {"chat.title": "Studio Assistant", "chat.status": "Online · replies instantly", "chat.ph": "Ask about services, pricing, timeline…"}, "ku": {"chat.title": "یاریدەدەری ستۆدیۆ", "chat.status": "ئۆنلاین · خێرا وەڵام دەداتەوە", "chat.ph": "پرسیار بکە دەربارەی خزمەت، نرخ، کات…"}, "kmr": {"chat.title": "Alîkarê Studyo", "chat.status": "Online · tavilê bersiv dide", "chat.ph": "Li ser karûbar, biha, dem bipirse…"}, "ar": {"chat.title": "مساعد الاستوديو", "chat.status": "متصل · يرد فورًا", "chat.ph": "اسأل عن الخدمات، الأسعار، الوقت…"}, "fr": {"chat.title": "Assistant du studio", "chat.status": "En ligne · répond aussitôt", "chat.ph": "Posez une question : services, tarifs, délais…"}};
Object.keys(window.I18N_EXTRA_CH).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_CH[l]); });

/* ===== hero services tagline ===== */
window.I18N_EXTRA_HS = {"en": {"hero.services": "Design • Printing • Advertising", "hero.ai": "Artificial Intelligence • AI"}, "ku": {"hero.services": "دیزاین • چاپ • بانگەشە", "hero.ai": "زیرەکیی دەستکرد"}, "kmr": {"hero.services": "Sêwiran • Çap • Reklam", "hero.ai": "Aqilmendiya Çêkirî"}, "ar": {"hero.services": "تصميم • طباعة • إعلان", "hero.ai": "الذكاء الاصطناعي"}, "fr": {"hero.services": "Design • Impression • Publicité", "hero.ai": "Intelligence Artificielle • IA"}};
Object.keys(window.I18N_EXTRA_HS).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_HS[l]); });

/* ===== blog reader share button ===== */
window.I18N_EXTRA_RDS = {"en":{"rd.share":"Share"},"ku":{"rd.share":"هاوبەشی"},"kmr":{"rd.share":"Parve bike"},"ar":{"rd.share":"مشاركة"},"fr":{"rd.share":"Partager"},"tr":{"rd.share":"Paylaş"},"sv":{"rd.share":"Dela"}};
Object.keys(window.I18N_EXTRA_RDS).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_RDS[l]); });

/* ===== blog reader: back + more ===== */
window.I18N_EXTRA_RD2 = {"en":{"rd.back":"Back","rd.more":"More from the journal"},"ku":{"rd.back":"گەڕانەوە","rd.more":"زیاتر لە گۆڤارەکە"},"kmr":{"rd.back":"Vegere","rd.more":"Zêdetir ji kovarê"},"ar":{"rd.back":"رجوع","rd.more":"المزيد من المدونة"},"fr":{"rd.back":"Retour","rd.more":"Plus du journal"},"tr":{"rd.back":"Geri","rd.more":"Dergiden dahası"},"sv":{"rd.back":"Tillbaka","rd.more":"Mer från journalen"}};
Object.keys(window.I18N_EXTRA_RD2).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_RD2[l]); });

/* ===== blog index: "Read more" (mobile inline card) — localized per language ===== */
window.I18N_EXTRA_RM = {"en":{"blog.readMore":"Read more"},"ku":{"blog.readMore":"خوێندنەوەی زیاتر"},"kmr":{"blog.readMore":"Bêtir bixwîne"},"ar":{"blog.readMore":"اقرأ المزيد"},"fr":{"blog.readMore":"Lire la suite"},"tr":{"blog.readMore":"Devamını oku"},"sv":{"blog.readMore":"Läs mer"}};
Object.keys(window.I18N_EXTRA_RM).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_RM[l]); });

/* ===== tabs: merged stationery + new AI ===== */
window.I18N_EXTRA_TABS = {"en":{"tab.stationery":"Stationery","tab.ai":"AI"},"ku":{"tab.stationery":"نووسراو","tab.ai":"زیرەکی"},"kmr":{"tab.stationery":"Nivîsgeh","tab.ai":"Aqil"},"ar":{"tab.stationery":"قرطاسية","tab.ai":"ذكاء"},"fr":{"tab.stationery":"Papeterie","tab.ai":"IA"},"tr":{"tab.stationery":"Kırtasiye","tab.ai":"YZ"},"sv":{"tab.stationery":"Trycksaker","tab.ai":"Artificiell intelligens"}};
Object.keys(window.I18N_EXTRA_TABS).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_TABS[l]); });

/* ===== floating Design-room CTA ===== */
window.I18N_EXTRA_CTA = {"en":{"cta.float":"Let's work together"},"ku":{"cta.float":"با پێکەوە کار بکەین"},"kmr":{"cta.float":"Em bi hev re bixebitin"},"ar":{"cta.float":"لنعمل معاً"},"fr":{"cta.float":"Travaillons ensemble"},"tr":{"cta.float":"Birlikte çalışalım"},"sv":{"cta.float":"Låt oss jobba ihop"}};
Object.keys(window.I18N_EXTRA_CTA).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_CTA[l]); });

/* ===== Latest updates bell ===== */
window.I18N_EXTRA_LAT = {"en":{"tip.latest":"Latest","latest.empty":"No new updates this week."},"ku":{"tip.latest":"نوێترین","latest.empty":"ئەم هەفتەیە نوێکاری نییە."},"kmr":{"tip.latest":"Nû","latest.empty":"Vê hefteyê nûçe tune."},"ar":{"tip.latest":"الأحدث","latest.empty":"لا تحديثات جديدة هذا الأسبوع."},"fr":{"tip.latest":"Nouveautés","latest.empty":"Aucune nouveauté cette semaine."},"tr":{"tip.latest":"Yenilikler","latest.empty":"Bu hafta yeni güncelleme yok."},"sv":{"tip.latest":"Senaste","latest.empty":"Inga nya uppdateringar denna vecka."}};
Object.keys(window.I18N_EXTRA_LAT).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_LAT[l]); });

/* ===== latest: "new" word ===== */
window.I18N_EXTRA_LATN = {"en":{"latest.new":"new"},"ku":{"latest.new":"نوێ"},"kmr":{"latest.new":"nû"},"ar":{"latest.new":"جديد"},"fr":{"latest.new":"nouveau"},"tr":{"latest.new":"yeni"},"sv":{"latest.new":"nya"}};
Object.keys(window.I18N_EXTRA_LATN).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_LATN[l]); });

/* ===== tab-header titles for the merged stationery + new AI tabs ===== */
(function(){ if(!window.TAB_META_I18N) return; var T={en:{stationery:'Stationery',ai:'AI'},ku:{stationery:'نووسراو',ai:'زیرەکی'},kmr:{stationery:'Nivîsgeh',ai:'Aqil'},ar:{stationery:'قرطاسية',ai:'ذكاء'},fr:{stationery:'Papeterie',ai:'IA'},tr:{stationery:'Kırtasiye',ai:'YZ'},sv:{stationery:'Trycksaker',ai:'Artificiell intelligens'}};
Object.keys(T).forEach(function(l){ if(window.TAB_META_I18N[l]){ window.TAB_META_I18N[l].stationery={title:T[l].stationery,desc:'',note:''}; window.TAB_META_I18N[l].ai={title:T[l].ai,desc:'',note:''}; } }); })();

/* ===== share this page ===== */
window.I18N_EXTRA_SHP = {"en":{"share.page":"Share page"},"ku":{"share.page":"هاوبەشی پەڕە"},"kmr":{"share.page":"Rûpel parve bike"},"ar":{"share.page":"مشاركة الصفحة"},"fr":{"share.page":"Partager la page"},"tr":{"share.page":"Sayfayı paylaş"},"sv":{"share.page":"Dela sidan"}};
Object.keys(window.I18N_EXTRA_SHP).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_SHP[l]); });

/* ===== tab hover cards: merged Stationery + new AI (parity with the other tabs) ===== */
(function(){
  var T = window.TABCARD_I18N; if(!T) return;
  var add = {
    ku:  { stationery:{tag:"کەرەستەی نووسین",desc:"کارتی بازرگانی، سەرپەڕە، پسووڵە و وەسڵ — سیستەمی بێدەنگی پشت ناسنامەیەک."}, ai:{tag:"زیرەکی · تاقیکردنەوە",desc:"پۆستەر، ڤیدیۆ و تاقیکردنەوەی بینراو بە یارمەتی زیرەکیی دەستکرد — بەمزووانە."} },
    kmr: { stationery:{tag:"Qirtasiye",desc:"Kartên karsaziyê, serkaxez, fatûre û meqbûz — sîstema bêdeng a li pişt brandê."}, ai:{tag:"Aqil · Ezmûn",desc:"Poster, vîdyo û ezmûnên dîtbarî bi alîkariya aqilmendiya çêkirî — di demek nêz de."} },
    ar:  { stationery:{tag:"القرطاسية",desc:"بطاقات العمل، الترويسات، الفواتير والإيصالات — النظام الهادئ خلف الهوية."}, ai:{tag:"ذكاء · تجارب",desc:"ملصقات وفيديو وتجارب بصرية بمساعدة الذكاء الاصطناعي — قريباً."} },
    fr:  { stationery:{tag:"Papeterie",desc:"Cartes de visite, en-têtes, factures et reçus — le système discret derrière une marque."}, ai:{tag:"IA · Expériences",desc:"Affiches, vidéos et expériences visuelles assistées par IA — bientôt."} }
  };
  Object.keys(add).forEach(function(l){ if(T[l]) Object.assign(T[l], add[l]); });
})();

/* ===== Brand Board room (#brandboard) — nav label + room-hero + section head ===== */
window.I18N_EXTRA_BB = {
 en:{"nav.brandboard":"Brand Board","rh.bb.num":"№ 03 · Brand Board","rh.bb.title":"The <em>Brand Board</em>","rh.bb.sub":"A free tool — your name, in Kurdish and Latin, with a palette and type pairing. Built in seconds.","bb.label":"Free Tool","bb.title":"Start your <em>identity</em>.","bb.lede":"A bilingual brand board in seconds — your name in Kurdish and Latin, a palette and a type pairing. Then let's make the real thing."},
 ku:{"nav.brandboard":"تابلۆی براند","rh.bb.num":"№ ٠٣ · تابلۆی براند","rh.bb.title":"<em>تابلۆی براند</em>","rh.bb.sub":"ئامرازێکی بێ بەرامبەر — ناوەکەت، بە کوردی و لاتین، لەگەڵ پاڵێتی ڕەنگ و جووتی فۆنت. لە چەند چرکەیەکدا.","bb.label":"ئامرازی بێ بەرامبەر","bb.title":"ناسنامەکەت <em>دەستپێبکە</em>.","bb.lede":"تابلۆیەکی براندی دووزمانی لە چەند چرکەیەکدا — ناوەکەت بە کوردی و لاتین، پاڵێت و جووتی فۆنت. دواتر با هی ڕاستەقینە دروست بکەین."},
 ar:{"nav.brandboard":"لوحة العلامة","rh.bb.num":"№ ٠٣ · لوحة العلامة","rh.bb.title":"<em>لوحة العلامة</em>","rh.bb.sub":"أداة مجانية — اسمك، بالكردية واللاتينية، مع لوحة ألوان وتناغم خطوط. في ثوانٍ.","bb.label":"أداة مجانية","bb.title":"ابدأ <em>هويتك</em>.","bb.lede":"لوحة علامة ثنائية اللغة في ثوانٍ — اسمك بالكردية واللاتينية، ألوان وتناغم خطوط. ثم لنصنع الحقيقية."},
 kmr:{"nav.brandboard":"Tabloya Brandê","rh.bb.num":"№ 03 · Tabloya Brandê","rh.bb.title":"<em>Tabloya Brandê</em>","rh.bb.sub":"Amûreke bêpere — navê te, bi kurdî û latînî, bi paletek û cotê fontan. Di çend saniyeyan de.","bb.label":"Amûra Bêpere","bb.title":"Nasnameya xwe <em>dest pê bike</em>.","bb.lede":"Tabloyek brandê ya duzimanî di çend saniyeyan de — navê te bi kurdî û latînî, palet û cotê fontan. Paşê em ya rastîn çêbikin."},
 fr:{"nav.brandboard":"Planche de marque","rh.bb.num":"№ 03 · Planche de marque","rh.bb.title":"La <em>planche de marque</em>","rh.bb.sub":"Un outil gratuit — votre nom, en kurde et en latin, avec une palette et un duo de polices. En quelques secondes.","bb.label":"Outil gratuit","bb.title":"Lancez votre <em>identité</em>.","bb.lede":"Une planche de marque bilingue en quelques secondes — votre nom en kurde et en latin, une palette et un duo de polices. Puis créons la vraie."},
 tr:{"nav.brandboard":"Marka Panosu","rh.bb.num":"№ 03 · Marka Panosu","rh.bb.title":"<em>Marka Panosu</em>","rh.bb.sub":"Ücretsiz bir araç — adınız, Kürtçe ve Latin alfabesinde, palet ve yazı tipi eşleşmesiyle. Saniyeler içinde.","bb.label":"Ücretsiz Araç","bb.title":"<em>Kimliğinizi</em> başlatın.","bb.lede":"Saniyeler içinde iki dilli bir marka panosu — adınız Kürtçe ve Latin alfabesinde, palet ve yazı tipi eşleşmesi. Sonra gerçeğini yapalım."},
 sv:{"nav.brandboard":"Varumärkestavla","rh.bb.num":"№ 03 · Varumärkestavla","rh.bb.title":"<em>Varumärkestavlan</em>","rh.bb.sub":"Ett gratis verktyg — ditt namn, på kurdiska och latin, med en palett och typsnittspar. På sekunder.","bb.label":"Gratis verktyg","bb.title":"Starta din <em>identitet</em>.","bb.lede":"En tvåspråkig varumärkestavla på sekunder — ditt namn på kurdiska och latin, en palett och ett typsnittspar. Sedan gör vi den riktiga."}
};
Object.keys(window.I18N_EXTRA_BB).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_BB[l]); });

/* ===== Selected Work room (#work) — case studies: nav + room-hero + section + view ===== */
window.I18N_EXTRA_WORK = {
 en:{"nav.work":"Selected Work","rh.work.num":"№ 02 · Selected Work","rh.work.title":"Selected <em>Work</em>","rh.work.sub":"Brand identities, in full — the brief, the marks, the palette, and the system in use.","work.label":"Case Studies","work.title":"Identities, in <em>full</em>.","work.lede":"A closer look at a few brand systems — how each one was found, drawn and made.","work.empty":"Case studies are on their way.","work.back":"All work","work.client":"Client","work.brief":"The brief","work.palette":"Palette","work.story":"The work","work.inuse":"In use","work.next":"Next project"},
 ku:{"nav.work":"کارە هەڵبژێردراوەکان","rh.work.num":"№ ٠٢ · کارە هەڵبژێردراوەکان","rh.work.title":"کارە <em>هەڵبژێردراوەکان</em>","rh.work.sub":"ناسنامەی براند، بە تەواوی — بریف، مارک، پاڵێت، و سیستەم لە بەکارهێنان.","work.label":"تاوتوێی پڕۆژە","work.title":"ناسنامە، بە <em>تەواوی</em>.","work.lede":"سەیرێکی نزیکتر بۆ چەند سیستەمێکی براند — چۆن هەریەکەیان دۆزرایەوە، کێشرا و دروستکرا.","work.empty":"تاوتوێی پڕۆژەکان لە ڕێگان.","work.back":"هەموو کارەکان","work.client":"کڕیار","work.brief":"بریف","work.palette":"پاڵێت","work.story":"کارەکە","work.inuse":"لە بەکارهێنان","work.next":"پڕۆژەی دواتر"},
 ar:{"nav.work":"أعمال مختارة","rh.work.num":"№ ٠٢ · أعمال مختارة","rh.work.title":"أعمال <em>مختارة</em>","rh.work.sub":"هويات بصرية كاملة — الموجز، العلامات، الألوان، والنظام في الاستخدام.","work.label":"دراسات حالة","work.title":"هويات، <em>بالكامل</em>.","work.lede":"نظرة أقرب على بعض أنظمة العلامات — كيف وُجد كل منها ورُسم وصُنع.","work.empty":"دراسات الحالة في الطريق.","work.back":"كل الأعمال","work.client":"العميل","work.brief":"الموجز","work.palette":"الألوان","work.story":"العمل","work.inuse":"في الاستخدام","work.next":"المشروع التالي"},
 kmr:{"nav.work":"Karên Hilbijartî","rh.work.num":"№ 02 · Karên Hilbijartî","rh.work.title":"Karên <em>Hilbijartî</em>","rh.work.sub":"Nasnameyên brandê, bi temamî — kurte, nîşan, palet, û sîstem di bikaranînê de.","work.label":"Lêkolînên Rewşê","work.title":"Nasname, bi <em>temamî</em>.","work.lede":"Nêrînek nêztir li çend sîstemên brandê — her yek çawa hat dîtin, xêzkirin û çêkirin.","work.empty":"Lêkolînên rewşê di rê de ne.","work.back":"Hemû kar","work.client":"Mişterî","work.brief":"Kurte","work.palette":"Palet","work.story":"Kar","work.inuse":"Di bikaranînê de","work.next":"Projeya pêş"},
 fr:{"nav.work":"Travaux choisis","rh.work.num":"№ 02 · Travaux choisis","rh.work.title":"Travaux <em>choisis</em>","rh.work.sub":"Des identités de marque, en entier — le brief, les marques, la palette et le système en usage.","work.label":"Études de cas","work.title":"Des identités, en <em>entier</em>.","work.lede":"Un regard de plus près sur quelques systèmes de marque — comment chacun a été trouvé, dessiné et réalisé.","work.empty":"Les études de cas arrivent.","work.back":"Tous les travaux","work.client":"Client","work.brief":"Le brief","work.palette":"Palette","work.story":"Le travail","work.inuse":"En usage","work.next":"Projet suivant"},
 tr:{"nav.work":"Seçilmiş İşler","rh.work.num":"№ 02 · Seçilmiş İşler","rh.work.title":"Seçilmiş <em>İşler</em>","rh.work.sub":"Marka kimlikleri, tam haliyle — özet, işaretler, palet ve kullanımdaki sistem.","work.label":"Vaka Çalışmaları","work.title":"Kimlikler, <em>tam</em> haliyle.","work.lede":"Birkaç marka sistemine daha yakından bir bakış — her biri nasıl bulundu, çizildi ve yapıldı.","work.empty":"Vaka çalışmaları yolda.","work.back":"Tüm işler","work.client":"Müşteri","work.brief":"Özet","work.palette":"Palet","work.story":"İş","work.inuse":"Kullanımda","work.next":"Sonraki proje"},
 sv:{"nav.work":"Utvalda arbeten","rh.work.num":"№ 02 · Utvalda arbeten","rh.work.title":"Utvalda <em>arbeten</em>","rh.work.sub":"Varumärkesidentiteter, i sin helhet — briefen, märkena, paletten och systemet i bruk.","work.label":"Fallstudier","work.title":"Identiteter, i sin <em>helhet</em>.","work.lede":"En närmare titt på några varumärkessystem — hur vart och ett hittades, ritades och gjordes.","work.empty":"Fallstudier är på väg.","work.back":"Alla arbeten","work.client":"Kund","work.brief":"Briefen","work.palette":"Palett","work.story":"Arbetet","work.inuse":"I bruk","work.next":"Nästa projekt"}
};
Object.keys(window.I18N_EXTRA_WORK).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_WORK[l]); });

/* ===== Menu relabel — evocative room names (Design · Selected Work · The Brand Board · The Journal · The Designer · Let's talk.) ===== */
window.I18N_EXTRA_NAV = {
 en:{"nav.work":"Selected Work","nav.blog":"The Journal","nav.bio":"The Designer","nav.contact":"Let's talk.","nav.brandboard":"The Brand Board"},
 ku:{"nav.work":"کارە هەڵبژێردراوەکان","nav.blog":"گۆڤارەکە","nav.bio":"دیزاینەرەکە","nav.contact":"با قسە بکەین","nav.brandboard":"تابلۆی براند"},
 ar:{"nav.work":"أعمال مختارة","nav.blog":"المجلة","nav.bio":"المصمم","nav.contact":"لنتحدث","nav.brandboard":"لوحة العلامة"},
 kmr:{"nav.work":"Karên Hilbijartî","nav.blog":"Kovar","nav.bio":"Sêwirmend","nav.contact":"Em biaxivin","nav.brandboard":"Tabloya Brandê"},
 fr:{"nav.work":"Travaux choisis","nav.blog":"Le Journal","nav.bio":"Le Designer","nav.contact":"Parlons.","nav.brandboard":"La planche de marque"},
 tr:{"nav.work":"Seçilmiş İşler","nav.blog":"Dergi","nav.bio":"Tasarımcı","nav.contact":"Konuşalım.","nav.brandboard":"Marka Panosu"},
 sv:{"nav.work":"Utvalda arbeten","nav.blog":"Tidningen","nav.bio":"Designern","nav.contact":"Låt oss prata.","nav.brandboard":"Varumärkestavlan"}
};
Object.keys(window.I18N_EXTRA_NAV).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_NAV[l]); });

/* rail-card (hover) text for Selected Work + Brand Board, per language (en/tr/sv fall back to the English defaults in enhance.js ROOMS) */
window.ROOMCARD_EXTRA = {
 ku:{work:{tag:"تاوتوێی پڕۆژە",count:"سیستەمی براند",desc:"ناسنامەی براند بە تەواوی — بریف، مارک، پاڵێت، و سیستەم لە بەکارهێنان."},brandboard:{tag:"ئامرازی بێ بەرامبەر",count:"کوردی + لاتین",desc:"ناسنامەیەکی سەرەتایی بێ بەرامبەر — ناوەکەت بە کوردی و لاتین، لەگەڵ پاڵێت و جووتی فۆنت."}},
 kmr:{work:{tag:"Lêkolînên Rewşê",count:"Sîstemên brandê",desc:"Nasnameyên brandê bi temamî — kurte, nîşan, palet, û sîstem di bikaranînê de."},brandboard:{tag:"Amûra Bêpere",count:"Kurdî + Latînî",desc:"Nasnameyek destpêkê ya bêpere — navê te bi kurdî û latînî, bi palet û cotê fontan."}},
 ar:{work:{tag:"دراسات حالة",count:"أنظمة علامات",desc:"هويات بصرية كاملة — الموجز، العلامات، الألوان، والنظام في الاستخدام."},brandboard:{tag:"أداة مجانية",count:"كردي + لاتيني",desc:"هوية بداية مجانية — اسمك بالكردية واللاتينية، مع لوحة ألوان وتناغم خطوط."}},
 fr:{work:{tag:"Études de cas",count:"Systèmes de marque",desc:"Des identités de marque en entier — le brief, les marques, la palette et le système en usage."},brandboard:{tag:"Outil gratuit",count:"Kurde + latin",desc:"Une identité de départ gratuite — votre nom en kurde et en latin, avec palette et duo de polices."}}
};
if (window.ROOMCARD_I18N) Object.keys(window.ROOMCARD_EXTRA).forEach(function(l){ window.ROOMCARD_I18N[l] = window.ROOMCARD_I18N[l] || {}; Object.assign(window.ROOMCARD_I18N[l], window.ROOMCARD_EXTRA[l]); });

/* ===== Design room featured cards — Selected Work + Brand Board ===== */
window.I18N_EXTRA_FEAT = {
 en:{"d.work.eye":"Selected Work","d.work.title":"Brand identities, in full.","d.work.sub":"The brief, the marks, the palette and the system in use — each project, up close.","d.work.go":"View case studies","d.bb.eye":"Free Tool","d.bb.title":"Make a brand board.","d.bb.sub":"Your name in Kurdish and Latin, with a palette and type pairing — free, in seconds.","d.bb.go":"Open the tool"},
 ku:{"d.work.eye":"کارە هەڵبژێردراوەکان","d.work.title":"ناسنامەی براند، بە تەواوی.","d.work.sub":"بریف، مارک، پاڵێت و سیستەم لە بەکارهێنان — هەر پڕۆژەیەک، لە نزیکەوە.","d.work.go":"بینینی تاوتوێکان","d.bb.eye":"ئامرازی بێ بەرامبەر","d.bb.title":"تابلۆیەکی براند دروست بکە.","d.bb.sub":"ناوەکەت بە کوردی و لاتین، لەگەڵ پاڵێت و جووتی فۆنت — بێ بەرامبەر، لە چەند چرکەیەکدا.","d.bb.go":"کردنەوەی ئامرازەکە"},
 ar:{"d.work.eye":"أعمال مختارة","d.work.title":"هويات بصرية، بالكامل.","d.work.sub":"الموجز، العلامات، الألوان والنظام في الاستخدام — كل مشروع عن قرب.","d.work.go":"عرض دراسات الحالة","d.bb.eye":"أداة مجانية","d.bb.title":"اصنع لوحة علامة.","d.bb.sub":"اسمك بالكردية واللاتينية، مع لوحة ألوان وتناغم خطوط — مجاناً، في ثوانٍ.","d.bb.go":"افتح الأداة"},
 kmr:{"d.work.eye":"Karên Hilbijartî","d.work.title":"Nasnameyên brandê, bi temamî.","d.work.sub":"Kurte, nîşan, palet û sîstem di bikaranînê de — her proje, ji nêz ve.","d.work.go":"Lêkolînan bibîne","d.bb.eye":"Amûra Bêpere","d.bb.title":"Tabloyek brandê çêbike.","d.bb.sub":"Navê te bi kurdî û latînî, bi palet û cotê fontan — bêpere, di çend saniyeyan de.","d.bb.go":"Amûrê veke"},
 fr:{"d.work.eye":"Travaux choisis","d.work.title":"Des identités de marque, en entier.","d.work.sub":"Le brief, les marques, la palette et le système en usage — chaque projet, de près.","d.work.go":"Voir les études de cas","d.bb.eye":"Outil gratuit","d.bb.title":"Créez une planche de marque.","d.bb.sub":"Votre nom en kurde et en latin, avec palette et duo de polices — gratuit, en quelques secondes.","d.bb.go":"Ouvrir l'outil"},
 tr:{"d.work.eye":"Seçilmiş İşler","d.work.title":"Marka kimlikleri, tam haliyle.","d.work.sub":"Özet, işaretler, palet ve kullanımdaki sistem — her proje, yakından.","d.work.go":"Vaka çalışmalarına bak","d.bb.eye":"Ücretsiz Araç","d.bb.title":"Bir marka panosu yap.","d.bb.sub":"Adınız Kürtçe ve Latin alfabesinde, palet ve yazı tipi eşleşmesiyle — ücretsiz, saniyeler içinde.","d.bb.go":"Aracı aç"},
 sv:{"d.work.eye":"Utvalda arbeten","d.work.title":"Varumärkesidentiteter, i sin helhet.","d.work.sub":"Briefen, märkena, paletten och systemet i bruk — varje projekt, på nära håll.","d.work.go":"Se fallstudier","d.bb.eye":"Gratis verktyg","d.bb.title":"Gör en varumärkestavla.","d.bb.sub":"Ditt namn på kurdiska och latin, med palett och typsnittspar — gratis, på sekunder.","d.bb.go":"Öppna verktyget"}
};
Object.keys(window.I18N_EXTRA_FEAT).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_FEAT[l]); });

/* ===== Hero lede (new dark hero) ===== */
window.I18N_EXTRA_HEROLEDE = {
 en:{"hero.lede":"I'm Barakat Qurtas — a graphic & motion designer crafting brand identities and editorial systems for over a decade."},
 ku:{"hero.lede":"من بەرەکات قورتاسم — دیزاینەری گرافیک و مۆشن، زیاتر لە دەیەیەکە ناسنامەی براند و سیستەمی ئەدیتۆریاڵ دروست دەکەم."},
 ar:{"hero.lede":"أنا بركات قرطاس — مصمم جرافيك وموشن، أصنع هويات العلامات والأنظمة التحريرية منذ أكثر من عقد."},
 kmr:{"hero.lede":"Ez Barakat Qurtas im — sêwirmendê grafîk û motion, zêdetirî dehsalekê nasname û sîstemên edîtoriyal çêdikim."},
 fr:{"hero.lede":"Je suis Barakat Qurtas — designer graphique & motion, je crée des identités de marque et des systèmes éditoriaux depuis plus de dix ans."},
 tr:{"hero.lede":"Ben Barakat Qurtas — bir grafik ve hareket tasarımcısı, on yılı aşkın süredir marka kimlikleri ve editoryal sistemler tasarlıyorum."},
 sv:{"hero.lede":"Jag är Barakat Qurtas — en grafisk och motion-designer som skapar varumärkesidentiteter och redaktionella system i över ett decennium."}
};
Object.keys(window.I18N_EXTRA_HEROLEDE).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_HEROLEDE[l]); });

/* ===== Full-screen menu (lamedia-style) ===== */
window.I18N_EXTRA_MENU = {
 en:{"profile.btn2":"Get in touch","tip.menu":"Menu","mm.cap":"Designed by hand, in Hewlêr."},
 ku:{"profile.btn2":"پەیوەندی بکە","tip.menu":"مینیو","mm.cap":"بە دەست دروستکراوە، لە هەولێر."},
 ar:{"profile.btn2":"تواصل معنا","tip.menu":"القائمة","mm.cap":"مصنوع يدويًا، في أربيل."},
 kmr:{"profile.btn2":"Têkilî daîne","tip.menu":"Menû","mm.cap":"Bi dest hatiye çêkirin, li Hewlêr."},
 fr:{"profile.btn2":"Prendre contact","tip.menu":"Menu","mm.cap":"Fait main, à Hewlêr."},
 tr:{"profile.btn2":"İletişime geç","tip.menu":"Menü","mm.cap":"Elle yapıldı, Hewlêr'de."},
 sv:{"profile.btn2":"Hör av dig","tip.menu":"Meny","mm.cap":"Gjord för hand, i Hewlêr."}
};
Object.keys(window.I18N_EXTRA_MENU).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_MENU[l]); });

/* ===== v248 — home services + software experience ===== */
window.I18N_EXTRA_MOTION248 = {
  en:{
    "svc.eye":"What I do","svc.title":"Ideas, made <em>visible</em>.","svc.lede":"A focused practice across identity, print, campaigns and motion — built as one clear visual system.",
    "svc.identity":"Brand Identity & Logo","svc.identity.desc":"Distinctive marks and flexible identity systems designed to remain clear across every touchpoint.","svc.identity.a":"Logo & wordmark design","svc.identity.b":"Typography & colour systems","svc.identity.c":"Guidelines & stationery",
    "svc.editorial":"Editorial & Print","svc.editorial.desc":"Printed matter with hierarchy, rhythm and a strong sense of place — from a single cover to a full publication.","svc.editorial.a":"Books & editorial layouts","svc.editorial.b":"Posters & cultural print","svc.editorial.c":"Packaging & production",
    "svc.campaign":"Campaigns & Social","svc.campaign.desc":"Campaign systems that stay coherent from the first key visual to the final social post or event application.","svc.campaign.a":"Advertising campaigns","svc.campaign.b":"Social media systems","svc.campaign.c":"Events & public communication",
    "svc.motion":"Motion, Image & AI","svc.motion.desc":"Image and motion work that extends the identity without losing its character, supported by careful AI-assisted exploration.","svc.motion.a":"Video editing & motion","svc.motion.b":"Photography & retouching","svc.motion.c":"AI-assisted visual development",
    "svc.cta":"Discuss a project","soft.eye":"Software experience","soft.title":"The tools behind the <em>work</em>.","soft.link":"View full experience"
  },
  ku:{
    "svc.eye":"ئەوەی دەیکەم","svc.title":"بیرۆکە، بە شێوەیەکی <em>بینراو</em>.","svc.lede":"کارێکی ورد لە ناسنامە، چاپ، کەمپەین و مۆشن — هەمووی وەک یەک سیستەمی بینراوی ڕوون.",
    "svc.identity":"ناسنامەی براند و لۆگۆ","svc.identity.desc":"نیشانەی تایبەت و سیستەمی ناسنامەی گونجاو کە لە هەموو شوێنێکدا ڕوون و یەکگرتوو دەمێنێتەوە.","svc.identity.a":"دیزاینی لۆگۆ و وۆردمارک","svc.identity.b":"سیستەمی فۆنت و ڕەنگ","svc.identity.c":"ڕێنمایی براند و نووسراو",
    "svc.editorial":"ئەدیتۆریاڵ و چاپ","svc.editorial.desc":"کارە چاپییەکان بە پلەبەندی، ڕیتم و هەستی شوێن — لە بەرگێکی تاکەوە تا بڵاوکراوەیەکی تەواو.","svc.editorial.a":"کتێب و لاپەڕەسازی","svc.editorial.b":"پۆستەر و چاپی کولتووری","svc.editorial.c":"پاکەت و بەرهەمهێنان",
    "svc.campaign":"کەمپەین و سۆشیاڵ","svc.campaign.desc":"سیستەمی کەمپەین کە لە یەکەم وێنەی سەرەکییەوە تا دوا پۆست یان ڕووداو یەکگرتوو دەمێنێتەوە.","svc.campaign.a":"کەمپەینی ڕیکلام","svc.campaign.b":"سیستەمی تۆڕە کۆمەڵایەتییەکان","svc.campaign.c":"ڕووداو و پەیوەندی گشتی",
    "svc.motion":"جوڵە، وێنە و زیرەکیی دەستکرد","svc.motion.desc":"کارکردن لە وێنە و جوڵە کە ناسنامەکە فراوان دەکات بەبێ لەدەستدانی کەسایەتییەکەی، لەگەڵ تاقیکردنەوەی وریای زیرەکیی دەستکرد.","svc.motion.a":"ئیدیتی ڤیدیۆ و مۆشن","svc.motion.b":"فۆتۆگرافی و ڕیتاچ","svc.motion.c":"پەرەپێدانی بینراو بە یارمەتی زیرەکیی دەستکرد",
    "svc.cta":"گفتوگۆ لەسەر پڕۆژە","soft.eye":"ئەزموونی بەرنامەکان","soft.title":"ئەو ئامرازانەی لە پشت <em>کارەکانن</em>.","soft.link":"بینینی ئەزموونی تەواو"
  },
  kmr:{
    "svc.eye":"Ez çi dikim","svc.title":"Raman, bi awayekî <em>dîtbar</em>.","svc.lede":"Pratîkeke hûrgulî di nasname, çap, kampanya û motionê de — wek sîstemeke dîtbarî ya zelal.",
    "svc.identity":"Nasnameya Brandê & Logo","svc.identity.desc":"Nîşanên taybet û sîstemên nasnameyê yên nerm ku li hemû xalên têkiliyê zelal dimînin.","svc.identity.a":"Sêwirana logo û wordmarkê","svc.identity.b":"Sîstemên tîpografî û rengan","svc.identity.c":"Rêbername û qirtasiye",
    "svc.editorial":"Edîtoryal & Çap","svc.editorial.desc":"Karên çapkirî bi hiyerarşî, rîtm û hesteke xurt a cihê — ji bergê yekane heta weşana temam.","svc.editorial.a":"Pirtûk û rêzkirina edîtoryal","svc.editorial.b":"Poster û çapa çandî","svc.editorial.c":"Ambalaj û hilberîn",
    "svc.campaign":"Kampanya & Civakî","svc.campaign.desc":"Sîstemên kampanyayê ku ji dîtina sereke heta posta dawî an karanîna bûyerê yekgirtî dimînin.","svc.campaign.a":"Kampanyayên reklamê","svc.campaign.b":"Sîstemên medyaya civakî","svc.campaign.c":"Bûyer û ragihandina giştî",
    "svc.motion":"Tevger, Wêne û Aqilmendiya Çêkirî","svc.motion.desc":"Karê wêne û tevgerê ku nasnameyê berfireh dike bêyî ku karaktera wê winda bike, bi lêkolîna hişmend a aqilmendiya çêkirî.","svc.motion.a":"Edîta vîdyoyê û tevger","svc.motion.b":"Fotografî û retouch","svc.motion.c":"Pêşxistina dîtbarî bi aqilmendiya çêkirî",
    "svc.cta":"Li ser projeyekê biaxive","soft.eye":"Ezmûna nermalavê","soft.title":"Amûrên li pişt <em>karê</em>.","soft.link":"Ezmûna temam bibîne"
  },
  ar:{
    "svc.eye":"ما أقدمه","svc.title":"أفكار تصبح <em>مرئية</em>.","svc.lede":"ممارسة مركزة في الهوية والطباعة والحملات والموشن — مبنية كنظام بصري واحد وواضح.",
    "svc.identity":"هوية العلامة والشعار","svc.identity.desc":"علامات مميزة وأنظمة هوية مرنة تبقى واضحة ومتناسقة في جميع نقاط التواصل.","svc.identity.a":"تصميم الشعار والعلامة النصية","svc.identity.b":"أنظمة الخطوط والألوان","svc.identity.c":"دليل الهوية والقرطاسية",
    "svc.editorial":"التحرير والطباعة","svc.editorial.desc":"مطبوعات ذات تسلسل وإيقاع وإحساس بالمكان — من غلاف واحد إلى منشور متكامل.","svc.editorial.a":"الكتب والتخطيط التحريري","svc.editorial.b":"الملصقات والطباعة الثقافية","svc.editorial.c":"التغليف والإنتاج",
    "svc.campaign":"الحملات والتواصل","svc.campaign.desc":"أنظمة حملات متماسكة من الصورة الرئيسية الأولى إلى آخر منشور أو تطبيق للفعالية.","svc.campaign.a":"الحملات الإعلانية","svc.campaign.b":"أنظمة التواصل الاجتماعي","svc.campaign.c":"الفعاليات والتواصل العام",
    "svc.motion":"الحركة والصورة والذكاء الاصطناعي","svc.motion.desc":"عمل بصري وحركي يوسع الهوية دون أن يفقد شخصيتها، مدعوماً باستكشاف مدروس بمساعدة الذكاء الاصطناعي.","svc.motion.a":"تحرير الفيديو والحركة","svc.motion.b":"التصوير والمعالجة","svc.motion.c":"تطوير بصري بمساعدة الذكاء الاصطناعي",
    "svc.cta":"ناقش مشروعاً","soft.eye":"خبرة البرامج","soft.title":"الأدوات خلف <em>العمل</em>.","soft.link":"عرض الخبرة كاملة"
  },
  fr:{
    "svc.eye":"Ce que je fais","svc.title":"Des idées rendues <em>visibles</em>.","svc.lede":"Une pratique ciblée autour de l'identité, de l'impression, des campagnes et du motion — pensée comme un système visuel clair.",
    "svc.identity":"Identité & Logo","svc.identity.desc":"Des signes distinctifs et des systèmes d'identité flexibles, clairs sur chaque point de contact.","svc.identity.a":"Logo & mot-symbole","svc.identity.b":"Systèmes typographiques & couleurs","svc.identity.c":"Guides & papeterie",
    "svc.editorial":"Éditorial & Impression","svc.editorial.desc":"Des imprimés avec hiérarchie, rythme et sens du lieu — d'une couverture à une publication complète.","svc.editorial.a":"Livres & mises en page","svc.editorial.b":"Affiches & imprimés culturels","svc.editorial.c":"Packaging & production",
    "svc.campaign":"Campagnes & Social","svc.campaign.desc":"Des systèmes cohérents du premier visuel clé au dernier post ou support événementiel.","svc.campaign.a":"Campagnes publicitaires","svc.campaign.b":"Systèmes pour réseaux sociaux","svc.campaign.c":"Événements & communication publique",
    "svc.motion":"Motion, Image & IA","svc.motion.desc":"L'image et le mouvement prolongent l'identité sans perdre son caractère, avec une exploration IA mesurée.","svc.motion.a":"Montage vidéo & motion","svc.motion.b":"Photographie & retouche","svc.motion.c":"Développement visuel assisté par IA",
    "svc.cta":"Parler d'un projet","soft.eye":"Expérience logiciels","soft.title":"Les outils derrière le <em>travail</em>.","soft.link":"Voir l'expérience complète"
  },
  tr:{
    "svc.eye":"Ne yapıyorum","svc.title":"Fikirler, <em>görünür</em> hâle gelir.","svc.lede":"Kimlik, baskı, kampanya ve motion alanlarında odaklı bir pratik — tek ve açık bir görsel sistem olarak.",
    "svc.identity":"Marka Kimliği & Logo","svc.identity.desc":"Her temas noktasında açık kalan özgün işaretler ve esnek kimlik sistemleri.","svc.identity.a":"Logo ve kelime markası","svc.identity.b":"Tipografi ve renk sistemleri","svc.identity.c":"Kılavuz ve kırtasiye",
    "svc.editorial":"Editoryal & Baskı","svc.editorial.desc":"Tek bir kapaktan tam yayına kadar hiyerarşi, ritim ve yer duygusu taşıyan basılı işler.","svc.editorial.a":"Kitap ve editoryal düzen","svc.editorial.b":"Afiş ve kültürel baskı","svc.editorial.c":"Ambalaj ve üretim",
    "svc.campaign":"Kampanya & Sosyal","svc.campaign.desc":"İlk ana görselden son sosyal gönderiye veya etkinlik uygulamasına kadar tutarlı kampanya sistemleri.","svc.campaign.a":"Reklam kampanyaları","svc.campaign.b":"Sosyal medya sistemleri","svc.campaign.c":"Etkinlik ve kamusal iletişim",
    "svc.motion":"Hareket, Görsel ve Yapay Zeka","svc.motion.desc":"Kimliğin karakterini kaybetmeden onu genişleten görsel ve hareket çalışmaları, ölçülü yapay zeka araştırmasıyla desteklenir.","svc.motion.a":"Video kurgu ve hareket","svc.motion.b":"Fotoğraf ve rötuş","svc.motion.c":"Yapay zeka destekli görsel geliştirme",
    "svc.cta":"Bir projeyi konuşalım","soft.eye":"Yazılım deneyimi","soft.title":"İşin arkasındaki <em>araçlar</em>.","soft.link":"Tüm deneyimi gör"
  },
  sv:{
    "svc.eye":"Vad jag gör","svc.title":"Idéer som blir <em>synliga</em>.","svc.lede":"En fokuserad praktik inom identitet, tryck, kampanjer och motion — byggd som ett tydligt visuellt system.",
    "svc.identity":"Varumärkesidentitet & Logo","svc.identity.desc":"Särpräglade märken och flexibla identitetssystem som förblir tydliga i varje kontaktpunkt.","svc.identity.a":"Logo & ordmärke","svc.identity.b":"Typografi- & färgsystem","svc.identity.c":"Riktlinjer & trycksaker",
    "svc.editorial":"Redaktionellt & Tryck","svc.editorial.desc":"Trycksaker med hierarki, rytm och platskänsla — från ett omslag till en hel publikation.","svc.editorial.a":"Böcker & redaktionell layout","svc.editorial.b":"Affischer & kulturtryck","svc.editorial.c":"Förpackning & produktion",
    "svc.campaign":"Kampanjer & Socialt","svc.campaign.desc":"Sammanhållna kampanjsystem från första huvudbilden till sista inlägget eller evenemanget.","svc.campaign.a":"Reklamkampanjer","svc.campaign.b":"System för sociala medier","svc.campaign.c":"Evenemang & offentlig kommunikation",
    "svc.motion":"Rörelse, Bild och Artificiell Intelligens","svc.motion.desc":"Bild och rörelse som utvecklar identiteten utan att förlora dess karaktär, med genomtänkt stöd av artificiell intelligens.","svc.motion.a":"Videoredigering & rörelse","svc.motion.b":"Fotografi & retusch","svc.motion.c":"Visuell utveckling med artificiell intelligens",
    "svc.cta":"Diskutera ett projekt","soft.eye":"Programvaruerfarenhet","soft.title":"Verktygen bakom <em>arbetet</em>.","soft.link":"Se hela erfarenheten"
  }
};
Object.keys(window.I18N_EXTRA_MOTION248).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_MOTION248[l]); });

/* ===== v319 — shorter room copy + richer pitch form + PDF bio cards ===== */
window.I18N_EXTRA_BRIEF319 = {
  en:{
    "rh.blog.num":"04 · Journal","rh.blog.title":"The <em>Journal</em>","rh.blog.sub":"Short notes on type, place and practice.","blog.label":"Journal","blog.title":"Short <em>notes</em>.","blog.lede":"Ideas from the desk, kept simple.",
    "rh.bb.num":"03 · Brand Board","rh.bb.title":"Brand <em>Board</em>","rh.bb.sub":"A quick bilingual identity starter.","bb.label":"Free Tool","bb.title":"Name, type, <em>colour</em>.","bb.lede":"Build a small board, then make the real identity.",
    "rh.work.num":"02 · Selected Work","rh.work.sub":"A few identity systems, up close.","work.label":"Case Studies","work.title":"Selected <em>systems</em>.","work.lede":"Brief, mark, palette and use — kept short.",
    "cf.refs":"References / previous examples","cf.refs.ph":"Links, moodboard, or previous work you like",
    "doc.cv.eye":"PDF · Curriculum Vitae","doc.cv.title":"Curriculum <em>Vitae</em>","doc.cv.desc":"Full CV — experience, skills and professional background.","doc.cv.meta":"Experience & skills · PDF",
    "doc.cat.eye":"PDF · Catalogue","doc.cat.title":"Selected <em>Works</em>","doc.cat.desc":"A compact catalogue of selected work, ready to flip through.","doc.cat.meta":"Portfolio catalogue · PDF"
  },
  ku:{
    "rh.blog.num":"٠٤ · گۆڤار","rh.blog.title":"<em>گۆڤار</em>","rh.blog.sub":"تێبینی کورت لەسەر تایپ، شوێن و کار.","blog.label":"گۆڤار","blog.title":"تێبینی <em>کورت</em>.","blog.lede":"بیرۆکەی کورت لە مێزی کارەوە.",
    "rh.bb.num":"٠٣ · تابلۆی براند","rh.bb.title":"<em>تابلۆی براند</em>","rh.bb.sub":"دەستپێکی خێرای ناسنامەی دووزمانی.","bb.label":"ئامرازی بێ بەرامبەر","bb.title":"ناو، فۆنت، <em>ڕەنگ</em>.","bb.lede":"تابلۆیەکی بچووک دروست بکە، دواتر ناسنامەی ڕاستەقینە.",
    "rh.work.num":"٠٢ · کارە هەڵبژێردراوەکان","rh.work.sub":"چەند سیستەمی براند، لە نزیکەوە.","work.label":"تاوتوێی پڕۆژە","work.title":"سیستەمی <em>هەڵبژێردراو</em>.","work.lede":"بریف، نیشان، پاڵێت و بەکارهێنان — بە کورتی.",
    "cf.refs":"نموونە / کاری پێشوو","cf.refs.ph":"لینک، مودبۆرد، یان کاری پێشووت کە دەتەوێت",
    "doc.cv.eye":"PDF · سیڤی","doc.cv.title":"سیڤی <em>تەواو</em>","doc.cv.desc":"سیڤی تەواو — ئەزموون، تواناکان و پاشخانی پیشەیی.","doc.cv.meta":"ئەزموون و تواناکان · PDF",
    "doc.cat.eye":"PDF · کەتەلۆگ","doc.cat.title":"کارە <em>هەڵبژێردراوەکان</em>","doc.cat.desc":"کەتەلۆگێکی پوختی کارە هەڵبژێردراوەکان.","doc.cat.meta":"کەتەلۆگی پۆرتفۆلیۆ · PDF"
  },
  kmr:{
    "rh.blog.num":"04 · Kovar","rh.blog.title":"<em>Kovar</em>","rh.blog.sub":"Notên kurt li ser nivîs, cih û kar.","blog.label":"Kovar","blog.title":"Notên <em>kurt</em>.","blog.lede":"Ramanên ji maseyê, bi awayekî sade.",
    "rh.bb.num":"03 · Tabloya Brandê","rh.bb.title":"Tabloya <em>Brandê</em>","rh.bb.sub":"Destpêkeke lez a nasnameya duzimanî.","bb.label":"Amûra Bêpere","bb.title":"Nav, tîp, <em>reng</em>.","bb.lede":"Tabloyek biçûk ava bike, paşê nasnameya rastîn çêke.",
    "rh.work.num":"02 · Karên Hilbijartî","rh.work.sub":"Çend sîstemên brandê, ji nêz ve.","work.label":"Lêkolînên Rewşê","work.title":"Sîstemên <em>hilbijartî</em>.","work.lede":"Kurte, nîşan, palet û bikaranîn — bi kurtî.",
    "cf.refs":"Referans / mînakên berê","cf.refs.ph":"Girêdan, moodboard, an karên berê yên tu hez dikî",
    "doc.cv.eye":"PDF · CV","doc.cv.title":"Curriculum <em>Vitae</em>","doc.cv.desc":"CVya temam — ezmûn, jêhatîbûn û paşxaneya pîşeyî.","doc.cv.meta":"Ezmûn û jêhatîbûn · PDF",
    "doc.cat.eye":"PDF · Katalog","doc.cat.title":"Karên <em>hilbijartî</em>","doc.cat.desc":"Katalogeke kurt a karên hilbijartî.","doc.cat.meta":"Kataloga portfolioyê · PDF"
  },
  ar:{
    "rh.blog.num":"٠٤ · المجلة","rh.blog.title":"<em>المجلة</em>","rh.blog.sub":"ملاحظات قصيرة عن الخط والمكان والعمل.","blog.label":"المجلة","blog.title":"ملاحظات <em>قصيرة</em>.","blog.lede":"أفكار من المكتب، بصيغة بسيطة.",
    "rh.bb.num":"٠٣ · لوحة العلامة","rh.bb.title":"لوحة <em>العلامة</em>","rh.bb.sub":"بداية سريعة لهوية ثنائية اللغة.","bb.label":"أداة مجانية","bb.title":"اسم، خط، <em>لون</em>.","bb.lede":"أنشئ لوحة صغيرة، ثم نصنع الهوية الحقيقية.",
    "rh.work.num":"٠٢ · أعمال مختارة","rh.work.sub":"بعض أنظمة الهوية عن قرب.","work.label":"دراسات حالة","work.title":"أنظمة <em>مختارة</em>.","work.lede":"الموجز، العلامة، الألوان والاستخدام — باختصار.",
    "cf.refs":"مراجع / أمثلة سابقة","cf.refs.ph":"روابط، لوحة مزاجية، أو أعمال سابقة تعجبك",
    "doc.cv.eye":"PDF · السيرة الذاتية","doc.cv.title":"السيرة <em>الذاتية</em>","doc.cv.desc":"السيرة الكاملة — الخبرة والمهارات والخلفية المهنية.","doc.cv.meta":"الخبرة والمهارات · PDF",
    "doc.cat.eye":"PDF · الكتالوج","doc.cat.title":"أعمال <em>مختارة</em>","doc.cat.desc":"كتالوج موجز للأعمال المختارة.","doc.cat.meta":"كتالوج الأعمال · PDF"
  },
  fr:{
    "rh.blog.num":"04 · Journal","rh.blog.title":"Le <em>Journal</em>","rh.blog.sub":"Notes courtes sur le type, le lieu et la pratique.","blog.label":"Journal","blog.title":"Notes <em>courtes</em>.","blog.lede":"Des idées du bureau, simplement.",
    "rh.bb.num":"03 · Planche de marque","rh.bb.title":"Planche de <em>marque</em>","rh.bb.sub":"Un départ rapide pour une identité bilingue.","bb.label":"Outil gratuit","bb.title":"Nom, typo, <em>couleur</em>.","bb.lede":"Créez une petite planche, puis la vraie identité.",
    "rh.work.num":"02 · Travaux choisis","rh.work.sub":"Quelques systèmes d'identité, de près.","work.label":"Études de cas","work.title":"Systèmes <em>choisis</em>.","work.lede":"Brief, signe, palette et usage — en bref.",
    "cf.refs":"Références / exemples précédents","cf.refs.ph":"Liens, moodboard ou travaux précédents que vous aimez",
    "doc.cv.eye":"PDF · Curriculum Vitae","doc.cv.title":"Curriculum <em>Vitae</em>","doc.cv.desc":"CV complet — expérience, compétences et parcours professionnel.","doc.cv.meta":"Expérience & compétences · PDF",
    "doc.cat.eye":"PDF · Catalogue","doc.cat.title":"Travaux <em>choisis</em>","doc.cat.desc":"Un catalogue compact de travaux sélectionnés.","doc.cat.meta":"Catalogue portfolio · PDF"
  },
  tr:{
    "rh.blog.num":"04 · Dergi","rh.blog.title":"<em>Dergi</em>","rh.blog.sub":"Tip, yer ve pratik üzerine kısa notlar.","blog.label":"Dergi","blog.title":"Kısa <em>notlar</em>.","blog.lede":"Masadan sade fikirler.",
    "rh.bb.num":"03 · Marka Panosu","rh.bb.title":"Marka <em>Panosu</em>","rh.bb.sub":"İki dilli kimlik için hızlı bir başlangıç.","bb.label":"Ücretsiz Araç","bb.title":"Ad, yazı, <em>renk</em>.","bb.lede":"Küçük bir pano oluşturun, sonra gerçek kimliği yapalım.",
    "rh.work.num":"02 · Seçilmiş İşler","rh.work.sub":"Birkaç kimlik sistemi, yakından.","work.label":"Vaka Çalışmaları","work.title":"Seçilmiş <em>sistemler</em>.","work.lede":"Özet, işaret, palet ve kullanım — kısa tutuldu.",
    "cf.refs":"Referanslar / önceki örnekler","cf.refs.ph":"Linkler, moodboard veya sevdiğiniz önceki işler",
    "doc.cv.eye":"PDF · Özgeçmiş","doc.cv.title":"Curriculum <em>Vitae</em>","doc.cv.desc":"Tam CV — deneyim, beceriler ve profesyonel geçmiş.","doc.cv.meta":"Deneyim ve beceriler · PDF",
    "doc.cat.eye":"PDF · Katalog","doc.cat.title":"Seçilmiş <em>İşler</em>","doc.cat.desc":"Seçilmiş işlerden kompakt bir katalog.","doc.cat.meta":"Portföy kataloğu · PDF"
  },
  sv:{
    "rh.blog.num":"04 · Journal","rh.blog.title":"<em>Journalen</em>","rh.blog.sub":"Korta notiser om typ, plats och praktik.","blog.label":"Journal","blog.title":"Korta <em>notiser</em>.","blog.lede":"Idéer från skrivbordet, enkelt hållna.",
    "rh.bb.num":"03 · Varumärkestavla","rh.bb.title":"Varumärkes<em>tavla</em>","rh.bb.sub":"En snabb start för tvåspråkig identitet.","bb.label":"Gratis verktyg","bb.title":"Namn, typ, <em>färg</em>.","bb.lede":"Bygg en liten tavla, gör sedan den riktiga identiteten.",
    "rh.work.num":"02 · Utvalda arbeten","rh.work.sub":"Några identitetssystem, på nära håll.","work.label":"Fallstudier","work.title":"Utvalda <em>system</em>.","work.lede":"Brief, märke, palett och användning — kortfattat.",
    "cf.refs":"Referenser / tidigare exempel","cf.refs.ph":"Länkar, moodboard eller tidigare arbeten du gillar",
    "doc.cv.eye":"PDF · CV","doc.cv.title":"Curriculum <em>Vitae</em>","doc.cv.desc":"Fullständig CV — erfarenhet, färdigheter och yrkesbakgrund.","doc.cv.meta":"Erfarenhet och färdigheter · PDF",
    "doc.cat.eye":"PDF · Katalog","doc.cat.title":"Utvalda <em>arbeten</em>","doc.cat.desc":"En kompakt katalog med utvalda arbeten.","doc.cat.meta":"Portföljkatalog · PDF"
  }
};
Object.keys(window.I18N_EXTRA_BRIEF319).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_BRIEF319[l]); });

/* ===== v320 — remove hardcoded English from visible UI labels ===== */
window.I18N_EXTRA_LOCALIZE320 = {
  en:{
    "profile.role":"Graphic Designer",
    "lang.en":"English","lang.ku":"Sorani Kurdish","lang.kmr":"Kurmanji Kurdish","lang.ar":"Arabic","lang.fr":"French","lang.tr":"Turkish","lang.sv":"Swedish",
    "cursor.open":"Open","cursor.view":"View","cursor.go":"Go","cursor.talk":"Talk","cursor.tool":"Tool","cursor.send":"Send","cursor.preview":"Preview",
    "menu.rooms":"Rooms / 01—06","menu.cover":"Menu Cover",
    "menu.note.design":"Selected design and visual systems","menu.note.work":"Identity case studies, from brief to system","menu.note.brandboard":"A free bilingual identity starter","menu.note.blog":"Notes on typography, place and practice","menu.note.bio":"Experience, tools, awards and biography","menu.note.contact":"Start a clear, useful conversation",
    "gallery.loading":"Loading gallery…","lm.more":"Load more",
    "svc.identity.sub":"Marks & identity systems","svc.editorial.sub":"Books, posters & production","svc.campaign.sub":"Campaigns & social systems","svc.motion":"Motion, Image & AI","svc.motion.desc":"Image and motion work that extends the identity without losing its character, supported by careful AI-assisted exploration.","svc.motion.c":"AI-assisted visual development","svc.motion.sub":"Motion, image & AI craft",
    "hero.ai":"Artificial Intelligence","hero.ai.short":"AI","tab.ai":"AI","chat.status":"Online · replies instantly"
  },
  ku:{
    "profile.role":"دیزاینەری گرافیک",
    "lang.en":"ئینگلیزی","lang.ku":"کوردیی سۆرانی","lang.kmr":"کوردیی کورمانجی","lang.ar":"عەرەبی","lang.fr":"فەرەنسی","lang.tr":"تورکی","lang.sv":"سویدی",
    "cursor.open":"کردنەوە","cursor.view":"بینین","cursor.go":"بڕۆ","cursor.talk":"قسە","cursor.tool":"ئامراز","cursor.send":"ناردن","cursor.preview":"پێشبینین",
    "menu.rooms":"ژوورەکان / ٠١—٠٦","menu.cover":"بەرگی مینیو",
    "menu.note.design":"دیزاین و سیستەمی بینراوی هەڵبژێردراو","menu.note.work":"تاوتوێی ناسنامەکان، لە بریفەوە بۆ سیستەم","menu.note.brandboard":"دەستپێکی ناسنامەی دووزمانیی بێ بەرامبەر","menu.note.blog":"تێبینی لەسەر تایپۆگرافی، شوێن و کار","menu.note.bio":"ئەزموون، ئامراز، خەڵات و بایۆگرافی","menu.note.contact":"دەستپێکردنی گفتوگۆیەکی ڕوون و بەسوود",
    "gallery.loading":"گالەری بار دەکرێت…","lm.more":"زیاتر باربکە",
    "svc.identity.sub":"نیشان و سیستەمی ناسنامە","svc.editorial.sub":"کتێب، پۆستەر و بەرهەمهێنان","svc.campaign.sub":"کەمپەین و سیستەمی سۆشیاڵ","svc.motion":"جوڵە، وێنە و زیرەکیی دەستکرد","svc.motion.desc":"کاری وێنە و جوڵە کە ناسنامەکە فراوان دەکات بەبێ لەدەستدانی کەسایەتییەکەی، لەگەڵ تاقیکردنەوەی وریای زیرەکیی دەستکرد.","svc.motion.c":"پەرەپێدانی بینراو بە یارمەتی زیرەکیی دەستکرد","svc.motion.sub":"جوڵە، وێنە و زیرەکیی دەستکرد",
    "hero.ai":"زیرەکیی دەستکرد","hero.ai.short":"زیرەکی","tab.ai":"زیرەکی","chat.status":"لەهێڵدایە · خێرا وەڵام دەداتەوە",
    "f.set":"بە دوو فۆنتی تایبەت داڕێژراوە","bp.p3":"بە کۆمەڵە بەرنامەکانی ئەدۆبی کار دەکەم و چەند بڕوانامەی ماستەرکلاسم هەیە. لەگەڵ سەرۆکایەتیی هەرێمی کوردستان و پرۆتۆکۆڵی هەرێم کارم کردووە. ئامانجم فراوانکردنی کاریگەریی داهێنەرانەمە و دامەزراندنی کۆمپانیایەکی پێشەنگی بانگەشە و بڵاوکردنەوەیە.","lp.enNote":"شارەزایی سەرەتایی · خاڵی دوولینگەو ١٠ (ئایاری ٢٠٢٦)","li.title":"بەرەکات لە لینکدین","be.title":"بەرەکات لە بیهانس",
    "doc.cv.eye":"فایل · ژیاننامەی کار","doc.cv.meta":"ئەزموون و تواناکان · فایل","doc.cat.eye":"فایل · کەتەلۆگ","doc.cat.meta":"کەتەلۆگی پۆرتفۆلیۆ · فایل"
  },
  kmr:{
    "profile.role":"Sêwirmendê Grafîk",
    "lang.en":"Îngilîzî","lang.ku":"Kurdîya Soranî","lang.kmr":"Kurdîya Kurmancî","lang.ar":"Erebî","lang.fr":"Fransî","lang.tr":"Tirkî","lang.sv":"Swêdî",
    "cursor.open":"Veke","cursor.view":"Bibîne","cursor.go":"Biçe","cursor.talk":"Biaxive","cursor.tool":"Amûr","cursor.send":"Bişîne","cursor.preview":"Pêşdîtin",
    "menu.rooms":"Ode / 01—06","menu.cover":"Bergê menuyê",
    "menu.note.design":"Sêwiran û sîstemên dîtbarî yên hilbijartî","menu.note.work":"Lêkolînên nasnameyê, ji kurteyê heta sîstemê","menu.note.brandboard":"Destpêkeke bêpere ya nasnameya duzimanî","menu.note.blog":"Not li ser tîpografî, cih û kar","menu.note.bio":"Ezmûn, amûr, xelat û jiyanname","menu.note.contact":"Dest bi axaftineke zelal û bikêr bike",
    "gallery.loading":"Galeri tê barkirin…","lm.more":"Zêdetir bar bike",
    "svc.identity.sub":"Nîşan û sîstemên nasnameyê","svc.editorial.sub":"Pirtûk, poster û hilberîn","svc.campaign.sub":"Kampanya û sîstemên civakî","svc.motion":"Tevger, Wêne û Aqilmendiya Çêkirî","svc.motion.desc":"Karê wêne û tevgerê ku nasnameyê berfireh dike bêyî ku karaktera wê winda bike, bi lêkolîna hişmend a aqilmendiya çêkirî.","svc.motion.c":"Pêşxistina dîtbarî bi aqilmendiya çêkirî","svc.motion.sub":"Tevger, wêne û aqilmendiya çêkirî",
    "hero.ai":"Aqilmendiya Çêkirî","hero.ai.short":"Aqil","tab.ai":"Aqil","chat.status":"Serhêl · tavilê bersiv dide"
  },
  ar:{
    "profile.role":"مصمم جرافيك",
    "lang.en":"الإنجليزية","lang.ku":"الكردية السورانية","lang.kmr":"الكردية الكرمانجية","lang.ar":"العربية","lang.fr":"الفرنسية","lang.tr":"التركية","lang.sv":"السويدية",
    "cursor.open":"فتح","cursor.view":"عرض","cursor.go":"اذهب","cursor.talk":"تواصل","cursor.tool":"أداة","cursor.send":"إرسال","cursor.preview":"معاينة",
    "menu.rooms":"الغرف / ٠١—٠٦","menu.cover":"غلاف القائمة",
    "menu.note.design":"تصاميم وأنظمة بصرية مختارة","menu.note.work":"دراسات هوية من الموجز إلى النظام","menu.note.brandboard":"بداية مجانية لهوية ثنائية اللغة","menu.note.blog":"ملاحظات عن الطباعة والمكان والعمل","menu.note.bio":"الخبرة والأدوات والجوائز والسيرة","menu.note.contact":"ابدأ حواراً واضحاً ومفيداً",
    "gallery.loading":"جاري تحميل المعرض…","lm.more":"تحميل المزيد",
    "svc.identity.sub":"علامات وأنظمة هوية","svc.editorial.sub":"كتب وملصقات وإنتاج","svc.campaign.sub":"حملات وأنظمة تواصل","svc.motion":"الحركة والصورة والذكاء الاصطناعي","svc.motion.desc":"عمل بصري وحركي يوسع الهوية دون أن يفقد شخصيتها، مدعوماً باستكشاف مدروس بالذكاء الاصطناعي.","svc.motion.c":"تطوير بصري بمساعدة الذكاء الاصطناعي","svc.motion.sub":"حركة وصورة وذكاء اصطناعي",
    "hero.ai":"الذكاء الاصطناعي","hero.ai.short":"ذكاء","tab.ai":"ذكاء","chat.status":"متصل · يرد فوراً",
    "f.set":"مصمم بخطين مخصصين","cf.nda":"أحتاج اتفاقية سرية قبل مشاركة التفاصيل.","bp.p3":"أعمل بحزمة أدوبي الإبداعية وأحمل عدة شهادات ماستر كلاس. تعاونت مع رئاسة إقليم كردستان وبروتوكول الإقليم. هدفي توسيع أثري الإبداعي وتأسيس شركة رائدة في الإعلان والنشر.","lp.enNote":"إتقان أساسي · نتيجة دولينغو ١٠ (أيار ٢٠٢٦)","li.title":"بركات على لينكدإن","be.title":"بركات على بيهانس",
    "doc.cv.eye":"ملف · السيرة الذاتية","doc.cv.meta":"الخبرة والمهارات · ملف","doc.cat.eye":"ملف · الكتالوج","doc.cat.meta":"كتالوج الأعمال · ملف"
  },
  fr:{
    "profile.role":"Graphiste",
    "lang.en":"Anglais","lang.ku":"Kurde sorani","lang.kmr":"Kurde kurmanji","lang.ar":"Arabe","lang.fr":"Français","lang.tr":"Turc","lang.sv":"Suédois",
    "cursor.open":"Ouvrir","cursor.view":"Voir","cursor.go":"Aller","cursor.talk":"Parler","cursor.tool":"Outil","cursor.send":"Envoyer","cursor.preview":"Aperçu",
    "menu.rooms":"Salles / 01—06","menu.cover":"Couverture du menu",
    "menu.note.design":"Designs et systèmes visuels choisis","menu.note.work":"Études d'identité, du brief au système","menu.note.brandboard":"Un départ gratuit pour une identité bilingue","menu.note.blog":"Notes sur la typographie, le lieu et la pratique","menu.note.bio":"Expérience, outils, prix et biographie","menu.note.contact":"Commencer une conversation claire et utile",
    "gallery.loading":"Chargement de la galerie…","lm.more":"Charger plus",
    "svc.identity.sub":"Signes et systèmes d'identité","svc.editorial.sub":"Livres, affiches et production","svc.campaign.sub":"Campagnes et systèmes sociaux","svc.motion":"Motion, image et IA","svc.motion.desc":"L'image et le mouvement prolongent l'identité sans perdre son caractère, avec une exploration assistée par IA.","svc.motion.c":"Développement visuel assisté par IA","svc.motion.sub":"Motion, image et IA",
    "hero.ai":"Intelligence artificielle","hero.ai.short":"IA","tab.ai":"IA","chat.status":"En ligne · répond aussitôt"
  },
  tr:{
    "profile.role":"Grafik tasarımcı",
    "lang.en":"İngilizce","lang.ku":"Sorani Kürtçe","lang.kmr":"Kurmanci Kürtçe","lang.ar":"Arapça","lang.fr":"Fransızca","lang.tr":"Türkçe","lang.sv":"İsveççe",
    "cursor.open":"Aç","cursor.view":"Gör","cursor.go":"Git","cursor.talk":"Konuş","cursor.tool":"Araç","cursor.send":"Gönder","cursor.preview":"Önizle",
    "menu.rooms":"Odalar / 01—06","menu.cover":"Menü kapağı",
    "menu.note.design":"Seçilmiş tasarım ve görsel sistemler","menu.note.work":"Özetten sisteme kimlik incelemeleri","menu.note.brandboard":"Ücretsiz iki dilli kimlik başlangıcı","menu.note.blog":"Tipografi, yer ve pratik üzerine notlar","menu.note.bio":"Deneyim, araçlar, ödüller ve biyografi","menu.note.contact":"Açık ve yararlı bir konuşma başlat",
    "gallery.loading":"Galeri yükleniyor…","lm.more":"Daha fazla yükle",
    "svc.identity.sub":"İşaretler ve kimlik sistemleri","svc.editorial.sub":"Kitaplar, afişler ve üretim","svc.campaign.sub":"Kampanyalar ve sosyal sistemler","svc.motion":"Hareket, görsel ve yapay zeka","svc.motion.desc":"Kimliğin karakterini kaybetmeden onu genişleten görsel ve hareket çalışmaları, ölçülü yapay zeka araştırmasıyla desteklenir.","svc.motion.c":"Yapay zeka destekli görsel geliştirme","svc.motion.sub":"Hareket, görsel ve yapay zeka",
    "hero.ai":"Yapay zeka","hero.ai.short":"YZ","tab.ai":"YZ","chat.status":"Çevrimiçi · anında yanıt verir"
  },
  sv:{
    "profile.role":"Grafisk formgivare",
    "lang.en":"Engelska","lang.ku":"Sorani-kurdiska","lang.kmr":"Kurmanji-kurdiska","lang.ar":"Arabiska","lang.fr":"Franska","lang.tr":"Turkiska","lang.sv":"Svenska",
    "cursor.open":"Öppna","cursor.view":"Visa","cursor.go":"Gå","cursor.talk":"Prata","cursor.tool":"Verktyg","cursor.send":"Skicka","cursor.preview":"Förhandsvisa",
    "menu.rooms":"Rum / 01—06","menu.cover":"Menyomslag",
    "menu.note.design":"Utvalda design- och visuella system","menu.note.work":"Identitetsstudier, från brief till system","menu.note.brandboard":"En gratis start för tvåspråkig identitet","menu.note.blog":"Anteckningar om typografi, plats och praktik","menu.note.bio":"Erfarenhet, verktyg, priser och biografi","menu.note.contact":"Starta ett tydligt och nyttigt samtal",
    "gallery.loading":"Galleriet laddas…","lm.more":"Ladda mer",
    "svc.identity.sub":"Märken och identitetssystem","svc.editorial.sub":"Böcker, affischer och produktion","svc.campaign.sub":"Kampanjer och sociala system","svc.motion":"Rörelse, bild och artificiell intelligens","svc.motion.desc":"Bild och rörelse som utvecklar identiteten utan att förlora dess karaktär, med genomtänkt stöd av artificiell intelligens.","svc.motion.c":"Visuell utveckling med artificiell intelligens","svc.motion.sub":"Rörelse, bild och artificiell intelligens",
    "hero.ai":"Artificiell intelligens","hero.ai.short":"Artificiell intelligens","tab.ai":"Artificiell intelligens","chat.status":"Uppkopplad · svarar direkt"
  }
};
Object.keys(window.I18N_EXTRA_LOCALIZE320).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_LOCALIZE320[l]); });

/* ===== v324 — richer Brand Board room copy ===== */
window.I18N_EXTRA_BRANDBOARD324 = {
  en:{
    "rh.bb.sub":"A full starter studio for name, logo direction, colour, type, voice and launch rules.",
    "bb.label":"Brand Studio","bb.title":"Build a <em>brand system</em>.","bb.lede":"Shape a working board for your business: name, promise, logo direction, palette, type, voice, mockups and launch checklist.",
    "d.bb.eye":"Brand Studio","d.bb.title":"Build a brand system.","d.bb.sub":"A richer board for business owners: logo direction, colours, fonts, voice, mockups and launch rules.","d.bb.go":"Open the studio",
    "menu.note.brandboard":"Branding studio with logo, colour, type and launch direction"
  },
  ku:{
    "rh.bb.sub":"ستۆدیۆیەکی دەستپێکی تەواو بۆ ناو، ئاراستەی لۆگۆ، ڕەنگ، فۆنت، دەنگ و یاسای دەستپێکردن.",
    "bb.label":"ستۆدیۆی براند","bb.title":"سیستەمی <em>براند</em> دروست بکە.","bb.lede":"تابلۆیەکی کارا بۆ پیشەکەت: ناو، بەڵێن، ئاراستەی لۆگۆ، پاڵێت، فۆنت، دەنگ، پێشبینین و لیستی دەستپێکردن.",
    "d.bb.eye":"ستۆدیۆی براند","d.bb.title":"سیستەمی براند دروست بکە.","d.bb.sub":"تابلۆیەکی دەوڵەمەندتر بۆ خاوەن پیشەکان: ئاراستەی لۆگۆ، ڕەنگ، فۆنت، دەنگ، پێشبینین و یاسای دەستپێکردن.","d.bb.go":"کردنەوەی ستۆدیۆ",
    "menu.note.brandboard":"ستۆدیۆی براندینگ لەگەڵ لۆگۆ، ڕەنگ، فۆنت و ئاراستەی دەستپێکردن"
  },
  kmr:{
    "rh.bb.sub":"Studyo yekî tevahî yê destpêkê ji bo nav, arasteya logo, reng, font, deng û rêbazên destpêkê.",
    "bb.label":"Studyo ya Brandê","bb.title":"Sîstema <em>brandê</em> ava bike.","bb.lede":"Tabloyek karbar ji bo karê te: nav, soz, arasteya logo, palet, font, deng, mockup û lîsteya destpêkê.",
    "d.bb.eye":"Studyo ya Brandê","d.bb.title":"Sîstema brandê ava bike.","d.bb.sub":"Tabloyek dewlemendtir ji bo xwediyên kar: arasteya logo, reng, font, deng, mockup û rêbazên destpêkê.","d.bb.go":"Studyo veke",
    "menu.note.brandboard":"Studyo ya brandingê bi logo, reng, font û arasteya destpêkê"
  },
  ar:{
    "rh.bb.sub":"استوديو بداية كامل للاسم، اتجاه الشعار، اللون، الخط، الصوت وقواعد الإطلاق.",
    "bb.label":"استوديو العلامة","bb.title":"ابن <em>نظام علامة</em>.","bb.lede":"لوحة عملية لعملك: الاسم، الوعد، اتجاه الشعار، الألوان، الخط، الصوت، النماذج وقائمة الإطلاق.",
    "d.bb.eye":"استوديو العلامة","d.bb.title":"ابن نظام علامة.","d.bb.sub":"لوحة أغنى لأصحاب الأعمال: اتجاه الشعار، الألوان، الخطوط، الصوت، النماذج وقواعد الإطلاق.","d.bb.go":"افتح الاستوديو",
    "menu.note.brandboard":"استوديو للعلامة مع الشعار واللون والخط واتجاه الإطلاق"
  },
  fr:{
    "rh.bb.sub":"Un studio de départ complet pour nom, direction logo, couleur, typo, voix et règles de lancement.",
    "bb.label":"Studio de marque","bb.title":"Construisez un <em>système de marque</em>.","bb.lede":"Une planche utile pour votre activité : nom, promesse, direction logo, palette, typo, voix, maquettes et checklist.",
    "d.bb.eye":"Studio de marque","d.bb.title":"Construisez un système de marque.","d.bb.sub":"Une planche plus riche pour les entrepreneurs : logo, couleurs, polices, voix, maquettes et règles de lancement.","d.bb.go":"Ouvrir le studio",
    "menu.note.brandboard":"Studio de marque avec logo, couleur, typo et direction de lancement"
  },
  tr:{
    "rh.bb.sub":"İsim, logo yönü, renk, yazı, ses ve lansman kuralları için tam bir başlangıç stüdyosu.",
    "bb.label":"Marka Stüdyosu","bb.title":"Bir <em>marka sistemi</em> kurun.","bb.lede":"İşiniz için çalışan pano: isim, vaat, logo yönü, palet, yazı, ses, maketler ve lansman listesi.",
    "d.bb.eye":"Marka Stüdyosu","d.bb.title":"Bir marka sistemi kurun.","d.bb.sub":"İş sahipleri için daha zengin pano: logo yönü, renkler, yazılar, ses, maketler ve lansman kuralları.","d.bb.go":"Stüdyoyu aç",
    "menu.note.brandboard":"Logo, renk, yazı ve lansman yönü olan marka stüdyosu"
  },
  sv:{
    "rh.bb.sub":"En komplett startstudio för namn, logoriktning, färg, typografi, röst och lanseringsregler.",
    "bb.label":"Varumärkesstudio","bb.title":"Bygg ett <em>varumärkessystem</em>.","bb.lede":"En fungerande tavla för din verksamhet: namn, löfte, logoriktning, palett, typografi, röst, mockups och checklista.",
    "d.bb.eye":"Varumärkesstudio","d.bb.title":"Bygg ett varumärkessystem.","d.bb.sub":"En rikare tavla för företagare: logoriktning, färger, typsnitt, röst, mockups och lanseringsregler.","d.bb.go":"Öppna studion",
    "menu.note.brandboard":"Varumärkesstudio med logo, färg, typografi och lanseringsriktning"
  }
};
Object.keys(window.I18N_EXTRA_BRANDBOARD324).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_BRANDBOARD324[l]); });
if (window.TAB_META_I18N) {
  var BQ_AI_TAB_TITLES = { ku:'زیرەکی', kmr:'Aqil', ar:'ذكاء', fr:'IA', tr:'YZ', sv:'Artificiell intelligens' };
  Object.keys(BQ_AI_TAB_TITLES).forEach(function(l){
    if (window.TAB_META_I18N[l] && window.TAB_META_I18N[l].ai) window.TAB_META_I18N[l].ai.title = BQ_AI_TAB_TITLES[l];
  });
  if (window.TAB_META_I18N.ku && window.TAB_META_I18N.ku.image) window.TAB_META_I18N.ku.image.desc = 'دەستکاریی لایتروم، کۆمپۆزیت، و ڕیتاچی ئەدیتۆریاڵ.';
  if (window.TAB_META_I18N.ar && window.TAB_META_I18N.ar.image) window.TAB_META_I18N.ar.image.desc = 'تحرير لايت روم والتركيب والتنقيح التحريري.';
}
if (window.TABCARD_I18N) {
  var BQ_AI_CARDS = {
    ku:{ tag:'زیرەکی · تاقیکردنەوە', desc:'پۆستەر، ڤیدیۆ و تاقیکردنەوەی بینراو بە یارمەتی زیرەکیی دەستکرد — بەمزووانە.' },
    kmr:{ tag:'Aqil · Ezmûn', desc:'Poster, vîdyo û ezmûnên dîtbarî bi alîkariya aqilmendiya çêkirî — di demek nêz de.' },
    ar:{ tag:'ذكاء · تجارب', desc:'ملصقات وفيديو وتجارب بصرية بمساعدة الذكاء الاصطناعي — قريباً.' },
    fr:{ tag:'IA · Expériences', desc:'Affiches, vidéos et expériences visuelles assistées par IA — bientôt.' },
    tr:{ tag:'YZ · Denemeler', desc:'Yapay zeka destekli afişler, videolar ve görsel denemeler — yakında.' },
    sv:{ tag:'Artificiell intelligens · Experiment', desc:'Affischer, video och visuella experiment med artificiell intelligens — snart.' }
  };
  Object.keys(BQ_AI_CARDS).forEach(function(l){ if (window.TABCARD_I18N[l]) window.TABCARD_I18N[l].ai = BQ_AI_CARDS[l]; });
}

/* ===== v328 — richer Selected Work labels ===== */
window.I18N_EXTRA_WORK328 = {
  en:{ "work.cover":"Cover","work.media":"{n} visuals","work.open":"Open case","work.role":"Role","work.year":"Year","work.type":"Type","work.nomedia":"The project details are being prepared." },
  ku:{ "work.cover":"وێنەی سەرەکی","work.media":"{n} وێنە","work.open":"کردنەوەی تاوتوێ","work.role":"ڕۆڵ","work.year":"ساڵ","work.type":"جۆر","work.nomedia":"وردەکارییەکانی پڕۆژەکە ئامادە دەکرێن." },
  kmr:{ "work.cover":"Wêneyê bergê","work.media":"{n} wêne","work.open":"Lêkolînê veke","work.role":"Rol","work.year":"Sal","work.type":"Cure","work.nomedia":"Hûrgiliyên projeyê tên amadekirin." },
  ar:{ "work.cover":"الغلاف","work.media":"{n} صور","work.open":"فتح الدراسة","work.role":"الدور","work.year":"السنة","work.type":"النوع","work.nomedia":"يجري إعداد تفاصيل المشروع." },
  fr:{ "work.cover":"Couverture","work.media":"{n} images","work.open":"Ouvrir l'étude","work.role":"Rôle","work.year":"Année","work.type":"Type","work.nomedia":"Les détails du projet sont en préparation." },
  tr:{ "work.cover":"Kapak","work.media":"{n} görsel","work.open":"Vakayı aç","work.role":"Rol","work.year":"Yıl","work.type":"Tür","work.nomedia":"Proje detayları hazırlanıyor." },
  sv:{ "work.cover":"Omslag","work.media":"{n} bilder","work.open":"Öppna studie","work.role":"Roll","work.year":"År","work.type":"Typ","work.nomedia":"Projektdetaljerna förbereds." }
};
Object.keys(window.I18N_EXTRA_WORK328).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_WORK328[l]); });

/* ===== v332 — Panjamor as an independent studio room ===== */
window.I18N_EXTRA_PANJAMOR332 = {
  en:{
    "nav.panjamor":"Panjamor","menu.rooms":"Rooms / 01—07","menu.note.panjamor":"Brand, print and launch studio","meta.title.panjamor":"Panjamor Office Studio — Barakat Qurtas",
    "pj.open":"Open studio","pj.room.eye":"Panjamor Office Studio","pj.room.title":"Brand, print and launch systems with a real fingerprint.","pj.room.sub":"A studio for business owners who need a name, logo direction, colours, type, printed matter and launch material to feel like one living system.","pj.room.primary":"Start a project","pj.room.secondary":"See the portfolio",
    "pj.services.eye":"Studio scope","pj.services.title":"Everything a small brand needs to look <em>ready</em>.","pj.services.sub":"Not only a logo. Panjamor connects strategy, visual identity, print, social launch and production details so the brand can leave the studio already usable.",
    "pj.s1.t":"Identity direction","pj.s1.d":"Name checks, logo direction, Kurdish and Latin lockups, colour palette, type pairing and a clean mini-guide.","pj.s2.t":"Print system","pj.s2.d":"Business cards, letterheads, invoices, packaging notes, signage and production-ready files.","pj.s3.t":"Launch kit","pj.s3.d":"Opening posts, campaign visuals, profile assets, poster direction and clear wording for the first announcement.","pj.s4.t":"Owner handover","pj.s4.d":"A tidy folder, export rules, usage notes and a checklist so the business can keep using the brand correctly.",
    "pj.process.eye":"Process","pj.process.title":"From first talk to files in hand.","pj.p1.t":"Listen","pj.p1.d":"The business, audience, budget and deadline are written down before drawing begins.","pj.p2.t":"Draw","pj.p2.d":"The mark, type, colour and layout system are explored by hand and refined on screen.","pj.p3.t":"Test","pj.p3.d":"The identity is tested on real cards, posts, signs, labels and documents.","pj.p4.t":"Deliver","pj.p4.d":"Final files, print-ready exports and simple rules are handed over in one clear package.",
    "pj.proof.eye":"The fingerprint","pj.proof.title":"A brand should feel real before it goes public.","pj.proof.sub":"The final board is built around real use: shop signs, invoices, social images, print material and the first customer touchpoints.","pj.proof.a":"Bilingual identity files","pj.proof.b":"Print and social exports","pj.proof.c":"Clean owner handover",
    "pj.cta.eye":"Ready when the idea is serious","pj.cta.title":"Bring the project. Panjamor will shape the system.","pj.cta.sub":"Send the business name, field, budget, deadline and any references. The reply will be practical, not vague.","pj.cta.btn":"Write the brief"
  },
  ku:{
    "nav.panjamor":"پەنجەمۆر","menu.rooms":"ژوورەکان / ٠١—٠٧","menu.note.panjamor":"ستۆدیۆی براند، چاپ و دەستپێکردن","meta.title.panjamor":"ستۆدیۆی ئۆفیسی پەنجەمۆر — بەرەکات قورتاس",
    "pj.open":"کردنەوەی ستۆدیۆ","pj.room.eye":"ستۆدیۆی ئۆفیسی پەنجەمۆر","pj.room.title":"سیستەمی براند، چاپ و دەستپێکردن بە پەنجەمۆری ڕاستەقینە.","pj.room.sub":"ستۆدیۆیەک بۆ خاوەن پیشەکان کە پێویستیان بە ناو، ئاراستەی لۆگۆ، ڕەنگ، فۆنت، چاپەمەنی و کەرەستەی دەستپێکردنە هەموویان وەک یەک سیستەمی زیندوو کار بکەن.","pj.room.primary":"دەستپێکردنی پڕۆژە","pj.room.secondary":"بینینی پۆرتفۆلیۆ",
    "pj.services.eye":"سنووری ستۆدیۆ","pj.services.title":"هەموو ئەوەی براندێکی بچووک پێویستی پێیەتی تا <em>ئامادە</em> بێت.","pj.services.sub":"تەنیا لۆگۆ نییە. پەنجەمۆر ستراتیژی، ناسنامەی بینراو، چاپ، دەستپێکردنی سۆشیاڵ و وردەکاریی بەرهەمهێنان پێکەوە دەبەستێت تا براندەکە لە ستۆدیۆوە کارپێکراو بێتە دەرەوە.",
    "pj.s1.t":"ئاراستەی ناسنامە","pj.s1.d":"پشکنینی ناو، ئاراستەی لۆگۆ، لاکەپی کوردی و لاتین، پاڵێتی ڕەنگ، جووتی فۆنت و ڕێبەری بچووک.","pj.s2.t":"سیستەمی چاپ","pj.s2.d":"کارتی بازرگانی، سەرپەڕە، پسووڵە، تێبینی پاکێج، تابلو و فایلە ئامادەکانی چاپ.","pj.s3.t":"کیتی دەستپێکردن","pj.s3.d":"پۆستی کردنەوە، وێنەی کەمپەین، ئاسێتی پڕۆفایل، ئاراستەی پۆستەر و دەقی ڕوونی ڕاگەیاندنی یەکەم.","pj.s4.t":"ڕادەستکردن بە خاوەن کار","pj.s4.d":"فۆڵدەری پاک، یاسای هەناردەکردن، تێبینی بەکارهێنان و لیستی پشکنین تا پیشەکە بتوانێت بە ڕاستی بەکاری بهێنێت.",
    "pj.process.eye":"پرۆسە","pj.process.title":"لە یەکەم قسەوە تا فایلەکانی ڕادەست.","pj.p1.t":"گوێگرتن","pj.p1.d":"پیشەکە، بینەر، بودجە و کاتی تەواوبوون پێش دەستکردن بە کێشان دەنووسرێن.","pj.p2.t":"کێشان","pj.p2.d":"نیشان، فۆنت، ڕەنگ و سیستەمی ڕێکخستن بە دەست دەگەڕێنرێن و لەسەر شاشە پوخت دەکرێنەوە.","pj.p3.t":"تاقیکردنەوە","pj.p3.d":"ناسنامەکە لەسەر کارتی ڕاستەقینە، پۆست، تابلو، لیبڵ و بەڵگەنامە تاقی دەکرێتەوە.","pj.p4.t":"ڕادەستکردن","pj.p4.d":"فایلە کۆتاییەکان، هەناردەی ئامادەی چاپ و یاسا سادەکان لە پاکەتێکی ڕووندا ڕادەست دەکرێن.",
    "pj.proof.eye":"پەنجەمۆر","pj.proof.title":"بران دەبێت پێش بڵاوبوونەوە هەستی ڕاستەقینەی هەبێت.","pj.proof.sub":"تابلۆی کۆتایی لەسەر بەکارهێنانی ڕاستەقینە دروست دەکرێت: تابلوی دوکان، پسووڵە، وێنەی سۆشیاڵ، چاپەمەنی و یەکەم خاڵی پەیوەندی لەگەڵ کڕیار.","pj.proof.a":"فایلەکانی ناسنامەی دووزمانی","pj.proof.b":"هەناردەی چاپ و سۆشیاڵ","pj.proof.c":"ڕادەستکردنی پاک بۆ خاوەن کار",
    "pj.cta.eye":"کاتێک بیرۆکەکە جددییە","pj.cta.title":"پڕۆژەکە بهێنە. پەنجەمۆر سیستەمەکە دەشێوێنێت.","pj.cta.sub":"ناوی پیشەکە، بواری کار، بودجە، کاتی تەواوبوون و هەر نموونەیەک هەیە بنێرە. وەڵامەکە کرداری دەبێت، نە ناڕوون.","pj.cta.btn":"نووسینی بریف"
  },
  kmr:{
    "nav.panjamor":"Panjamor","menu.rooms":"Ode / 01—07","menu.note.panjamor":"Studyo ya brand, çap û destpêkê","meta.title.panjamor":"Studyo Ofîsa Panjamor — Barakat Qurtas",
    "pj.open":"Studyo veke","pj.room.eye":"Studyo Ofîsa Panjamor","pj.room.title":"Sîstemên brand, çap û destpêkê bi mora rastîn.","pj.room.sub":"Studyoyek ji bo xwediyên kar ku nav, arasteya logo, reng, font, materyalên çapê û materyalên destpêkê dixwazin wek sîstemeke zindî bixebitin.","pj.room.primary":"Projeyê dest pê bike","pj.room.secondary":"Portfolyo bibîne",
    "pj.services.eye":"Qada studyoyê","pj.services.title":"Her tiştê ku brandeke biçûk hewce dike da ku <em>amade</em> xuya bike.","pj.services.sub":"Ne tenê logo. Panjamor stratejî, nasnameya dîtbarî, çap, destpêka civakî û hûrgiliyên hilberînê girê dide da brand amade derkeve.",
    "pj.s1.t":"Arasteya nasnameyê","pj.s1.d":"Kontrola nav, arasteya logo, kilîtên kurdî û latînî, paleta reng, cotê font û rêbereke paqij.","pj.s2.t":"Sîstema çapê","pj.s2.d":"Kartên karsaziyê, serkaxez, fatûre, notên pakêtê, nîşan û pelên amade yên çapê.","pj.s3.t":"Kîta destpêkê","pj.s3.d":"Postên vekirinê, wêneyên kampanyayê, assetên profîlê, arasteya posterê û nivîsa zelal a ragihandina yekem.","pj.s4.t":"Radestkirina xwediyê kar","pj.s4.d":"Peldankeke rêk, rêbazên eksportê, notên bikaranînê û lîsteya kontrolê da kar brandê rast bi kar bîne.",
    "pj.process.eye":"Pêvajo","pj.process.title":"Ji axaftina yekem heta pelên di dest de.","pj.p1.t":"Guhdarî","pj.p1.d":"Kar, temaşevan, budce û dem berî xêzkirinê tên nivîsîn.","pj.p2.t":"Xêzkirin","pj.p2.d":"Nîşan, tîp, reng û sîstema rêzkirinê bi destan tê ceribandin û li ser ekranê tê paqijkirin.","pj.p3.t":"Ceribandin","pj.p3.d":"Nasname li ser kart, post, nîşan, label û belgeyên rastîn tê ceribandin.","pj.p4.t":"Radestkirin","pj.p4.d":"Pelên dawî, eksportên amade yên çapê û rêbazên sade di pakêteke zelal de tên radestkirin.",
    "pj.proof.eye":"Mor","pj.proof.title":"Divê brand berî derketina gelê rastîn hîs bike.","pj.proof.sub":"Tabloya dawî li ser bikaranîna rastîn tê avakirin: nîşanên dikanê, fatûre, wêneyên civakî, materyalên çapê û têkiliyên yekem ên mişterî.","pj.proof.a":"Pelên nasnameya duzimanî","pj.proof.b":"Eksportên çap û civakî","pj.proof.c":"Radestkirina paqij ji xwediyê kar re",
    "pj.cta.eye":"Dema fikir cidî be","pj.cta.title":"Projeyê bîne. Panjamor sîstemê ava dike.","pj.cta.sub":"Navê kar, qada xebatê, budce, dem û referansên heyî bişîne. Bersiv dê pratîk be, ne nezelal.","pj.cta.btn":"Kurteyê binivîse"
  },
  ar:{
    "nav.panjamor":"بنجمور","menu.rooms":"الغرف / ٠١—٠٧","menu.note.panjamor":"استوديو للعلامة والطباعة والإطلاق","meta.title.panjamor":"استوديو مكتب بنجمور — بركات قرطاس",
    "pj.open":"افتح الاستوديو","pj.room.eye":"استوديو مكتب بنجمور","pj.room.title":"أنظمة علامة وطباعة وإطلاق ببصمة حقيقية.","pj.room.sub":"استوديو لأصحاب الأعمال الذين يحتاجون إلى اسم، اتجاه شعار، ألوان، خطوط، مواد مطبوعة ومواد إطلاق تبدو كنظام واحد حي.","pj.room.primary":"ابدأ مشروعاً","pj.room.secondary":"شاهد الأعمال",
    "pj.services.eye":"نطاق الاستوديو","pj.services.title":"كل ما تحتاجه العلامة الصغيرة لتبدو <em>جاهزة</em>.","pj.services.sub":"ليس شعاراً فقط. بنجمور يربط الاستراتيجية والهوية البصرية والطباعة وإطلاق التواصل وتفاصيل الإنتاج كي تخرج العلامة قابلة للاستخدام.",
    "pj.s1.t":"اتجاه الهوية","pj.s1.d":"فحص الاسم، اتجاه الشعار، صيغ كردية ولاتينية، لوحة ألوان، تناغم خطوط ودليل صغير واضح.","pj.s2.t":"نظام الطباعة","pj.s2.d":"بطاقات عمل، ترويسات، فواتير، ملاحظات تغليف، لافتات وملفات جاهزة للطباعة.","pj.s3.t":"عدة الإطلاق","pj.s3.d":"منشورات الافتتاح، مرئيات الحملة، عناصر الحسابات، اتجاه الملصق ونص واضح لأول إعلان.","pj.s4.t":"تسليم المالك","pj.s4.d":"مجلد مرتب، قواعد تصدير، ملاحظات استخدام وقائمة تحقق ليستمر العمل في استخدام العلامة بشكل صحيح.",
    "pj.process.eye":"العملية","pj.process.title":"من أول حديث إلى الملفات في اليد.","pj.p1.t":"نستمع","pj.p1.d":"يُكتب العمل والجمهور والميزانية والموعد قبل أن يبدأ الرسم.","pj.p2.t":"نرسم","pj.p2.d":"تُستكشف العلامة والخط واللون ونظام التخطيط باليد ثم تُنقح على الشاشة.","pj.p3.t":"نختبر","pj.p3.d":"تُختبر الهوية على بطاقات ومنشورات ولافتات وملصقات ووثائق حقيقية.","pj.p4.t":"نسلّم","pj.p4.d":"تُسلّم الملفات النهائية وتصديرات الطباعة والقواعد البسيطة في حزمة واضحة.",
    "pj.proof.eye":"البصمة","pj.proof.title":"ينبغي أن تشعر العلامة بأنها حقيقية قبل نشرها.","pj.proof.sub":"تُبنى اللوحة النهائية حول الاستخدام الفعلي: لافتات المحل، الفواتير، صور التواصل، المواد المطبوعة وأول نقاط تواصل مع العميل.","pj.proof.a":"ملفات هوية ثنائية اللغة","pj.proof.b":"تصديرات للطباعة والتواصل","pj.proof.c":"تسليم واضح لصاحب العمل",
    "pj.cta.eye":"عندما تكون الفكرة جدية","pj.cta.title":"أحضر المشروع. بنجمور يصوغ النظام.","pj.cta.sub":"أرسل اسم العمل، المجال، الميزانية، الموعد وأي مراجع. سيكون الرد عملياً لا غامضاً.","pj.cta.btn":"اكتب الموجز"
  },
  fr:{
    "nav.panjamor":"Panjamor","menu.rooms":"Salles / 01—07","menu.note.panjamor":"Studio de marque, print et lancement","meta.title.panjamor":"Studio bureau Panjamor — Barakat Qurtas",
    "pj.open":"Ouvrir le studio","pj.room.eye":"Studio bureau Panjamor","pj.room.title":"Systèmes de marque, d'impression et de lancement avec une vraie empreinte.","pj.room.sub":"Un studio pour entrepreneurs qui ont besoin d'un nom, d'une direction logo, de couleurs, de typographies, d'imprimés et de supports de lancement comme un seul système vivant.","pj.room.primary":"Lancer un projet","pj.room.secondary":"Voir le portfolio",
    "pj.services.eye":"Portée du studio","pj.services.title":"Tout ce qu'une petite marque doit avoir pour paraître <em>prête</em>.","pj.services.sub":"Pas seulement un logo. Panjamor relie stratégie, identité visuelle, print, lancement social et détails de production pour livrer une marque déjà utilisable.",
    "pj.s1.t":"Direction d'identité","pj.s1.d":"Vérification du nom, direction logo, versions kurde et latine, palette, duo typographique et mini-guide clair.","pj.s2.t":"Système imprimé","pj.s2.d":"Cartes, en-têtes, factures, notes packaging, signalétique et fichiers prêts pour production.","pj.s3.t":"Kit de lancement","pj.s3.d":"Posts d'ouverture, visuels de campagne, assets de profil, direction affiche et texte clair pour la première annonce.","pj.s4.t":"Remise au propriétaire","pj.s4.d":"Un dossier propre, règles d'export, notes d'usage et checklist pour utiliser la marque correctement.",
    "pj.process.eye":"Processus","pj.process.title":"Du premier échange aux fichiers livrés.","pj.p1.t":"Écouter","pj.p1.d":"Activité, public, budget et délai sont notés avant le dessin.","pj.p2.t":"Dessiner","pj.p2.d":"Le signe, la typo, la couleur et le système de mise en page sont explorés à la main puis affinés à l'écran.","pj.p3.t":"Tester","pj.p3.d":"L'identité est testée sur cartes, posts, enseignes, étiquettes et documents réels.","pj.p4.t":"Livrer","pj.p4.d":"Fichiers finaux, exports print et règles simples sont remis dans un paquet clair.",
    "pj.proof.eye":"L'empreinte","pj.proof.title":"Une marque doit sembler réelle avant d'être publique.","pj.proof.sub":"La planche finale est pensée pour l'usage réel : enseignes, factures, images sociales, imprimés et premiers points de contact client.","pj.proof.a":"Fichiers d'identité bilingues","pj.proof.b":"Exports print et social","pj.proof.c":"Remise propre au propriétaire",
    "pj.cta.eye":"Quand l'idée est sérieuse","pj.cta.title":"Apportez le projet. Panjamor façonne le système.","pj.cta.sub":"Envoyez le nom, le domaine, le budget, le délai et vos références. La réponse sera pratique, pas vague.","pj.cta.btn":"Écrire le brief"
  },
  tr:{
    "nav.panjamor":"Panjamor","menu.rooms":"Odalar / 01—07","menu.note.panjamor":"Marka, baskı ve lansman stüdyosu","meta.title.panjamor":"Panjamor Ofis Stüdyosu — Barakat Qurtas",
    "pj.open":"Stüdyoyu aç","pj.room.eye":"Panjamor Ofis Stüdyosu","pj.room.title":"Gerçek bir iz taşıyan marka, baskı ve lansman sistemleri.","pj.room.sub":"İsim, logo yönü, renk, yazı, basılı işler ve lansman malzemelerini tek yaşayan sistem gibi isteyen iş sahipleri için stüdyo.","pj.room.primary":"Proje başlat","pj.room.secondary":"Portföyü gör",
    "pj.services.eye":"Stüdyo kapsamı","pj.services.title":"Küçük bir markanın <em>hazır</em> görünmesi için gereken her şey.","pj.services.sub":"Sadece logo değil. Panjamor strateji, görsel kimlik, baskı, sosyal lansman ve üretim detaylarını bağlar; marka stüdyodan kullanılabilir çıkar.",
    "pj.s1.t":"Kimlik yönü","pj.s1.d":"İsim kontrolü, logo yönü, Kürtçe ve Latin kilitler, renk paleti, yazı eşleşmesi ve temiz mini kılavuz.","pj.s2.t":"Baskı sistemi","pj.s2.d":"Kartvizit, antetli kağıt, fatura, ambalaj notu, tabela ve baskıya hazır dosyalar.","pj.s3.t":"Lansman kiti","pj.s3.d":"Açılış gönderileri, kampanya görselleri, profil öğeleri, afiş yönü ve ilk duyuru metni.","pj.s4.t":"Sahibe teslim","pj.s4.d":"Düzenli klasör, dışa aktarım kuralları, kullanım notları ve markayı doğru kullanmak için kontrol listesi.",
    "pj.process.eye":"Süreç","pj.process.title":"İlk konuşmadan eldeki dosyalara.","pj.p1.t":"Dinle","pj.p1.d":"İş, kitle, bütçe ve teslim tarihi çizimden önce yazılır.","pj.p2.t":"Çiz","pj.p2.d":"İşaret, yazı, renk ve düzen sistemi elde araştırılır, ekranda rafine edilir.","pj.p3.t":"Test et","pj.p3.d":"Kimlik gerçek kart, gönderi, tabela, etiket ve belgelerde denenir.","pj.p4.t":"Teslim et","pj.p4.d":"Final dosyalar, baskı çıktıları ve basit kurallar tek açık pakette teslim edilir.",
    "pj.proof.eye":"İz","pj.proof.title":"Bir marka yayımlanmadan önce gerçek hissettirmeli.","pj.proof.sub":"Final pano gerçek kullanıma göre kurulur: mağaza tabelası, fatura, sosyal görsel, baskı malzemesi ve ilk müşteri temasları.","pj.proof.a":"İki dilli kimlik dosyaları","pj.proof.b":"Baskı ve sosyal çıktılar","pj.proof.c":"Temiz sahip teslimi",
    "pj.cta.eye":"Fikir ciddi olduğunda hazır","pj.cta.title":"Projeyi getirin. Panjamor sistemi şekillendirir.","pj.cta.sub":"İş adını, alanı, bütçeyi, tarihi ve referansları gönderin. Yanıt pratik olacak, belirsiz değil.","pj.cta.btn":"Özeti yaz"
  },
  sv:{
    "nav.panjamor":"Panjamor","menu.rooms":"Rum / 01—07","menu.note.panjamor":"Studio för varumärke, tryck och lansering","meta.title.panjamor":"Panjamor kontorsstudio — Barakat Qurtas",
    "pj.open":"Öppna studion","pj.room.eye":"Panjamor kontorsstudio","pj.room.title":"Varumärkes-, tryck- och lanseringssystem med ett verkligt avtryck.","pj.room.sub":"En studio för företagare som behöver namn, logoriktning, färg, typografi, trycksaker och lanseringsmaterial som ett sammanhållet levande system.","pj.room.primary":"Starta projekt","pj.room.secondary":"Se portfolion",
    "pj.services.eye":"Studions omfattning","pj.services.title":"Allt en liten varumärkesidé behöver för att kännas <em>klar</em>.","pj.services.sub":"Inte bara en logo. Panjamor kopplar strategi, visuell identitet, tryck, social lansering och produktionsdetaljer så varumärket lämnar studion användbart.",
    "pj.s1.t":"Identitetsriktning","pj.s1.d":"Namnkontroll, logoriktning, kurdiska och latinska låsningar, färgpalett, typsnittspar och tydlig miniguide.","pj.s2.t":"Trycksystem","pj.s2.d":"Visitkort, brevhuvud, fakturor, förpackningsnoter, skyltning och produktionsklara filer.","pj.s3.t":"Lanseringskit","pj.s3.d":"Öppningsinlägg, kampanjbilder, profilmaterial, affischriktning och tydlig text för första tillkännagivandet.","pj.s4.t":"Överlämning","pj.s4.d":"En ren mapp, exportregler, användningsnoter och checklista så verksamheten kan använda märket korrekt.",
    "pj.process.eye":"Process","pj.process.title":"Från första samtal till filer i handen.","pj.p1.t":"Lyssna","pj.p1.d":"Verksamhet, publik, budget och deadline skrivs ned innan ritandet börjar.","pj.p2.t":"Rita","pj.p2.d":"Märke, typografi, färg och layoutsystem utforskas för hand och förfinas på skärm.","pj.p3.t":"Testa","pj.p3.d":"Identiteten testas på riktiga kort, inlägg, skyltar, etiketter och dokument.","pj.p4.t":"Leverera","pj.p4.d":"Slutfiler, tryckklara exporter och enkla regler lämnas över i ett tydligt paket.",
    "pj.proof.eye":"Avtrycket","pj.proof.title":"Ett varumärke ska kännas verkligt innan det blir offentligt.","pj.proof.sub":"Den slutliga tavlan byggs kring verklig användning: butiksskyltar, fakturor, sociala bilder, trycksaker och första kundmöten.","pj.proof.a":"Tvåspråkiga identitetsfiler","pj.proof.b":"Tryck- och sociala exporter","pj.proof.c":"Ren överlämning till ägare",
    "pj.cta.eye":"Redo när idén är seriös","pj.cta.title":"Ta med projektet. Panjamor formar systemet.","pj.cta.sub":"Skicka företagsnamn, område, budget, deadline och referenser. Svaret blir praktiskt, inte vagt.","pj.cta.btn":"Skriv briefen"
  }
};
Object.keys(window.I18N_EXTRA_PANJAMOR332).forEach(function(l){ if(window.I18N[l]) Object.assign(window.I18N[l], window.I18N_EXTRA_PANJAMOR332[l]); });
window.ROOMCARD_I18N = window.ROOMCARD_I18N || {};
window.ROOMCARD_PANJAMOR332 = {
  en:{ panjamor:{ tag:"Studio", count:"Brand + print", desc:"An office studio for identity, print, launch material and owner-ready handover." } },
  ku:{ panjamor:{ tag:"ستۆدیۆ", count:"براند + چاپ", desc:"ستۆدیۆیەکی ئۆفیس بۆ ناسنامە، چاپ، کەرەستەی دەستپێکردن و ڕادەستکردنی ئامادە بۆ خاوەن کار." } },
  kmr:{ panjamor:{ tag:"Studyo", count:"Brand + çap", desc:"Studyoya ofîsê ji bo nasname, çap, materyalên destpêkê û radestkirina amade." } },
  ar:{ panjamor:{ tag:"استوديو", count:"علامة + طباعة", desc:"استوديو مكتبي للهوية والطباعة ومواد الإطلاق وتسليم جاهز لصاحب العمل." } },
  fr:{ panjamor:{ tag:"Studio", count:"Marque + print", desc:"Un studio bureau pour identité, imprimés, lancement et remise prête au propriétaire." } },
  tr:{ panjamor:{ tag:"Stüdyo", count:"Marka + baskı", desc:"Kimlik, baskı, lansman malzemesi ve sahibine hazır teslim için ofis stüdyosu." } },
  sv:{ panjamor:{ tag:"Studio", count:"Varumärke + tryck", desc:"Kontorsstudio för identitet, tryck, lanseringsmaterial och färdig överlämning." } }
};
Object.keys(window.ROOMCARD_PANJAMOR332).forEach(function(l){
  window.ROOMCARD_I18N[l] = window.ROOMCARD_I18N[l] || {};
  Object.assign(window.ROOMCARD_I18N[l], window.ROOMCARD_PANJAMOR332[l]);
});
