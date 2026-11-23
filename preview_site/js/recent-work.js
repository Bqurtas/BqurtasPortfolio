import { buildRecentPublications, selectRecentPublications, RECENT_COLLECTIONS } from './recent-publications.js';

/* One open folio, backed by the same catalogue as the portfolio and Behance.
   Publication batches retain every member; the preview is deliberately bounded. */
const section = document.getElementById('recent-work');
if (section) {
  const COPY = {
    en: { eyebrow:'Recent work',title:'The latest,',titleEm:'unfolded.',intro:'A single piece. A complete story. A closer look.',all:'Everything',caseStudies:'Case studies',films:'Films',visuals:'Design & image',note:'Different forms. The same practice.',index:'Publication index',more:'Explore more releases',portfolio:'The complete portfolio',formats:'Work format',loading:'Opening the folio…',empty:'No publications in this format yet.',error:'The folio could not open. Explore the complete portfolio below.',open:'Open the work',openCase:'Explore the case study',previous:'Previous detail',next:'Next detail',detail:'View detail',works:'{n} works',pages:'{n} pages',single:'Single work',film:'Film',caseStudy:'Case study',publication:'Published',position:'Detail {n} of {total}',range:'Choose a detail',selected:'{title}. {position}',series:'Publication group',external:'Opens on Behance',retry:'Try again' },
    ku: { eyebrow:'نوێترین کارەکان',title:'نوێترین کار،',titleEm:'بە وردەکارییەوە.',intro:'تاکە کارێک. چیرۆکێکی تەواو. بینینێکی نزیکتر.',all:'هەمووی',caseStudies:'کەیس ستەدی',films:'ڤیدیۆ',visuals:'دیزاین و وێنە',note:'چەندین شێوە. یەک دنیای داهێنان.',index:'پێڕستی بڵاوکراوەکان',more:'بڵاوکراوەی زیاتر ببینە',portfolio:'هەموو کارەکانی پۆرتفۆلیۆ',formats:'جۆری کار',loading:'فۆلیۆکە دەکرێتەوە…',empty:'هێشتا بڵاوکراوەیەک لەم جۆرە نییە.',error:'فۆلیۆکە نەکرایەوە. لە خوارەوە هەموو کارەکان ببینە.',open:'کارەکە بکەرەوە',openCase:'کەیس ستەدییەکە ببینە',previous:'وردەکاریی پێشوو',next:'وردەکاریی دواتر',detail:'بینینی وردەکاری',works:'{n} کار',pages:'{n} پەڕە',single:'تاکە کار',film:'ڤیدیۆ',caseStudy:'کەیس ستەدی',publication:'بڵاوکراوەتەوە',position:'وردەکاریی {n} لە {total}',range:'وردەکارییەک هەڵبژێرە',selected:'{title}. {position}',series:'کۆمەڵەی بڵاوکراوەکان',external:'لە بیهاینس دەکرێتەوە',retry:'دووبارە هەوڵ بدەوە' },
    kmr: { eyebrow:'Karên herî nû',title:'Karên nû,',titleEm:'bi hûrgilî.',intro:'Karek. Çîrokeke temam. Nêrîneke nêzîktir.',all:'Hemû',caseStudies:'Lêkolînên projeyan',films:'Vîdyo',visuals:'Dîzayn û wêne',note:'Gelek şêwe. Yek pratîk.',index:'Pêrista weşanan',more:'Weşanên din bibîne',portfolio:'Hemû karên portfolyoyê',formats:'Cureya kar',loading:'Folyo tê vekirin…',empty:'Di vê cureyê de hîn weşan tune ne.',error:'Folyo venebû. Li jêr hemû karan bibîne.',open:'Kar veke',openCase:'Projeyê bibîne',previous:'Hûrgiliya berê',next:'Hûrgiliya paş',detail:'Hûrgiliyê bibîne',works:'{n} kar',pages:'{n} rûpel',single:'Karek',film:'Vîdyo',caseStudy:'Lêkolîna projeyê',publication:'Hat weşandin',position:'Hûrgilî {n} ji {total}',range:'Hûrgiliyê hilbijêre',selected:'{title}. {position}',series:'Koma weşanan',external:'Li Behance vedibe',retry:'Dîsa biceribîne' },
    ar: { eyebrow:'أحدث الأعمال',title:'الأحدث،',titleEm:'بكل تفاصيله.',intro:'عمل واحد. قصة كاملة. نظرة أقرب.',all:'الكل',caseStudies:'دراسات حالة',films:'فيديو',visuals:'تصميم وصورة',note:'أشكال متعددة. ممارسة واحدة.',index:'فهرس المنشورات',more:'اكتشف المزيد من الأعمال',portfolio:'معرض الأعمال الكامل',formats:'نوع العمل',loading:'جارٍ فتح الملف…',empty:'لا توجد منشورات بهذا النوع بعد.',error:'تعذر فتح الملف. تصفح جميع الأعمال أدناه.',open:'افتح العمل',openCase:'استكشف دراسة الحالة',previous:'التفصيل السابق',next:'التفصيل التالي',detail:'عرض التفصيل',works:'{n} أعمال',pages:'{n} صفحات',single:'عمل منفرد',film:'فيديو',caseStudy:'دراسة حالة',publication:'نُشر في',position:'التفصيل {n} من {total}',range:'اختر تفصيلاً',selected:'{title}. {position}',series:'مجموعة منشورات',external:'يفتح على بيهانس',retry:'حاول مجددًا' },
    fr: { eyebrow:'Travaux récents',title:'Les dernières',titleEm:'créations, en détail.',intro:'Une pièce. Une histoire entière. Un regard plus proche.',all:'Tout',caseStudies:'Études de cas',films:'Films',visuals:'Design et image',note:'Plusieurs formes. Une même pratique.',index:'Index des publications',more:'Explorer davantage',portfolio:'Le portfolio complet',formats:'Format du travail',loading:'Ouverture du folio…',empty:'Aucune publication dans ce format.',error:'Le folio est indisponible. Découvrez le portfolio ci-dessous.',open:'Ouvrir le travail',openCase:'Explorer le projet',previous:'Détail précédent',next:'Détail suivant',detail:'Voir le détail',works:'{n} créations',pages:'{n} pages',single:'Pièce unique',film:'Film',caseStudy:'Étude de cas',publication:'Publié le',position:'Détail {n} sur {total}',range:'Choisir un détail',selected:'{title}. {position}',series:'Groupe de publications',external:'Ouvre sur Behance',retry:'Réessayer' },
    tr: { eyebrow:'En yeni işler',title:'En yeniler,',titleEm:'tüm ayrıntılarıyla.',intro:'Tek bir iş. Tam bir hikâye. Daha yakından.',all:'Tümü',caseStudies:'Proje incelemeleri',films:'Filmler',visuals:'Tasarım ve görsel',note:'Farklı biçimler. Aynı üretim.',index:'Yayın dizini',more:'Daha fazlasını keşfet',portfolio:'Tüm portfolyo',formats:'İşin biçimi',loading:'Folyo açılıyor…',empty:'Bu biçimde henüz yayın yok.',error:'Folyo açılamadı. Aşağıdan tüm işleri keşfedin.',open:'İşi aç',openCase:'Projeyi keşfet',previous:'Önceki ayrıntı',next:'Sonraki ayrıntı',detail:'Ayrıntıyı gör',works:'{n} iş',pages:'{n} sayfa',single:'Tek iş',film:'Film',caseStudy:'Proje incelemesi',publication:'Yayın tarihi',position:'Ayrıntı {n} / {total}',range:'Bir ayrıntı seç',selected:'{title}. {position}',series:'Yayın grubu',external:'Behance üzerinde açılır',retry:'Yeniden dene' },
    sv: { eyebrow:'Senaste arbeten',title:'Det senaste,',titleEm:'i varje detalj.',intro:'Ett verk. En hel berättelse. En närmare blick.',all:'Allt',caseStudies:'Projektstudier',films:'Filmer',visuals:'Design och bild',note:'Olika former. Samma praktik.',index:'Publiceringsindex',more:'Utforska fler arbeten',portfolio:'Hela portfolion',formats:'Arbetsformat',loading:'Öppnar folion…',empty:'Inga publikationer i detta format ännu.',error:'Folion kunde inte öppnas. Utforska portfolion nedan.',open:'Öppna arbetet',openCase:'Utforska projektet',previous:'Föregående detalj',next:'Nästa detalj',detail:'Visa detalj',works:'{n} verk',pages:'{n} sidor',single:'Enskilt verk',film:'Film',caseStudy:'Projektstudie',publication:'Publicerad',position:'Detalj {n} av {total}',range:'Välj en detalj',selected:'{title}. {position}',series:'Publiceringsgrupp',external:'Öppnas på Behance',retry:'Försök igen' }
  };
  const EXHIBITION_COPY = {
    en:{title:'New work.',titleEm:'New perspectives.',intro:'From the first impression to the smallest detail.',index:'The release reel',loading:'Arranging the exhibition…',more:'More to discover',note:'Choose a work. Step inside.'},
    ku:{title:'کارە نوێکان،',titleEm:'دیدێکی نوێ.',intro:'لە یەکەم نیگاوە، تا بچووکترین وردەکاری.',index:'ڕیزەی بڵاوکراوەکان',loading:'پێشانگاکە ئامادە دەکرێت…',more:'زیاتر بدۆزەرەوە',note:'کارێک هەڵبژێرە. بچۆ ناو دنیایەکەیەوە.'},
    kmr:{title:'Karên nû.',titleEm:'Dîtinên nû.',intro:'Ji nêrîna yekem heta hûrgiliya herî biçûk.',index:'Rêza weşanan',loading:'Pêşangeh tê amadekirin…',more:'Zêdetir keşf bike',note:'Karekî hilbijêre. Bikeve nav cîhana wî.'},
    ar:{title:'أعمال جديدة،',titleEm:'رؤى جديدة.',intro:'من الانطباع الأول إلى أدق التفاصيل.',index:'شريط المنشورات',loading:'جارٍ تجهيز المعرض…',more:'المزيد لاكتشافه',note:'اختر عملاً. ادخل عالمه.'},
    fr:{title:'Nouveaux projets.',titleEm:'Nouveaux regards.',intro:'De la première impression au plus petit détail.',index:'Le fil des publications',loading:'Installation de l’exposition…',more:'Poursuivre la découverte',note:'Choisissez une œuvre. Entrez dans son univers.'},
    tr:{title:'Yeni işler.',titleEm:'Yeni bakışlar.',intro:'İlk izlenimden en küçük ayrıntıya.',index:'Yayın şeridi',loading:'Sergi hazırlanıyor…',more:'Daha fazlasını keşfet',note:'Bir iş seç. Dünyasına gir.'},
    sv:{title:'Nya arbeten.',titleEm:'Nya perspektiv.',intro:'Från första intrycket till minsta detalj.',index:'Publikationsrullen',loading:'Utställningen förbereds…',more:'Mer att upptäcka',note:'Välj ett verk. Kliv in i dess värld.'}
  };
  const SLIDE_COPY = {
    en:{prevWork:'Previous work',nextWork:'Next work',upNext:'Up next',pause:'Pause the slideshow',play:'Play the slideshow',goTo:'Show work {n}'},
    ku:{prevWork:'کاری پێشوو',nextWork:'کاری دواتر',upNext:'دواتر',pause:'سلایدشۆ بوەستێنە',play:'سلایدشۆ دەست پێ بکەوە',goTo:'کاری {n} پیشان بدە'},
    kmr:{prevWork:'Karê berê',nextWork:'Karê paş',upNext:'Paşê',pause:'Slaytê rawestîne',play:'Slaytê bidomîne',goTo:'Karê {n} nîşan bide'},
    ar:{prevWork:'العمل السابق',nextWork:'العمل التالي',upNext:'التالي',pause:'إيقاف العرض',play:'تشغيل العرض',goTo:'اعرض العمل {n}'},
    fr:{prevWork:'Projet précédent',nextWork:'Projet suivant',upNext:'À suivre',pause:'Mettre en pause',play:'Lancer le diaporama',goTo:'Afficher le projet {n}'},
    tr:{prevWork:'Önceki iş',nextWork:'Sonraki iş',upNext:'Sıradaki',pause:'Slaytı duraklat',play:'Slaytı oynat',goTo:'{n}. işi göster'},
    sv:{prevWork:'Föregående arbete',nextWork:'Nästa arbete',upNext:'Härnäst',pause:'Pausa bildspelet',play:'Spela bildspelet',goTo:'Visa arbete {n}'}
  };
  Object.keys(COPY).forEach(key=>Object.assign(COPY[key],EXHIBITION_COPY[key],SLIDE_COPY[key]));
  const $ = selector => section.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const language = () => document.documentElement.dataset.lang || document.documentElement.lang || 'en';
  const copy = () => COPY[language()] || COPY.en;
  const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
  const number = value => String(value).padStart(2, '0');
  const localizedPath = href => href.startsWith('/') && !href.startsWith('//') ? `${language() === 'en' ? '' : '/' + language()}${href}` : href;
  const date = value => {
    try { return new Intl.DateTimeFormat(({ku:'ckb-IQ',kmr:'ku-Latn',ar:'ar-IQ',en:'en-GB'})[language()] || language(), {day:'2-digit',month:'short',year:'numeric',calendar:'gregory',numberingSystem:'latn',timeZone:'Asia/Baghdad'}).format(new Date(value)); }
    catch { return value.slice(0, 10); }
  };
  const collection = item => window.GAL_I18N?.[language()]?.[item.coll]?.title || RECENT_COLLECTIONS[item.coll]?.title || item.title || item.coll;
  const title = edition => edition.kind === 'case-study' ? edition.title : collection(edition);
  const memberTitle = member => member.coll === 'behance' ? member.title : `${collection(member)} ${number(member.index)}`;
  const countLabel = edition => edition.kind === 'case-study' ? edition.pageCount ? fill(copy().pages,{n:edition.pageCount}) : copy().caseStudy : edition.count > 1 ? fill(copy().works,{n:edition.count}) : edition.kind === 'video' ? copy().film : copy().single;
  const nodes = { index:$('[data-recent-index]'),wall:$('[data-recent-wall]'),screen:$('[data-recent-screen]'),queue:$('[data-recent-queue]'),stage:$('[data-recent-stage]'),caption:$('[data-recent-caption]'),thumbs:$('[data-recent-thumbnails]'),viewer:$('[data-recent-viewer]'),more:$('[data-recent-more]'),status:$('[data-recent-status]'),toggle:$('[data-recent-toggle]') };
  let editions = [], filter = 'all', selected = '', memberIndex = 0, shown = new Set(), loadState = 'loading';
  let direction = 1, paused = false, walk = null, frameKey = '', railKey = '', motion = null;
  const rtl = () => document.documentElement.dir === 'rtl';
  const filtered = () => selectRecentPublications(editions, {filter,limit:Infinity,balanced:false});
  // The slideshow walks the releases that are out on the rail, in order.
  const slides = () => filtered().filter(item => shown.has(item.id));
  const current = () => editions.find(item => item.id === selected);
  const stopFilm = () => nodes.stage.querySelectorAll('video').forEach(video => video.pause());
  const image = (src, alt, width, height, className = '', lazy = true) => `<img src="${esc(src)}" alt="${esc(alt)}"${width > 0 && height > 0 ? ` width="${width}" height="${height}"` : ''} class="${className}" ${lazy ? 'loading="lazy"' : 'fetchpriority="low"'} decoding="async">`;
  // The stage is built once. Slides change inside it, so the counter, the
  // arrows and the artwork can each move on their own.
  nodes.stage.innerHTML = '<div class="recent-stage-meta"><span data-recent-kind></span><span data-recent-date></span></div><div class="recent-art-mount" data-recent-mount></div><div class="recent-counter" dir="ltr" aria-hidden="true"><span class="recent-counter-now" data-recent-count></span><span class="recent-counter-all" data-recent-total></span></div><div class="recent-arrows"><button type="button" class="recent-arrow" data-recent-go="-1"><span aria-hidden="true">←</span></button><button type="button" class="recent-arrow" data-recent-go="1"><span aria-hidden="true">→</span></button></div>';
  const mount = $('[data-recent-mount]');
  const updateStaticCopy = () => {
    section.querySelectorAll('[data-recent-copy]').forEach(node => { node.textContent = copy()[node.dataset.recentCopy] || ''; });
    section.querySelectorAll('[data-recent-label]').forEach(node => node.setAttribute('aria-label',copy()[node.dataset.recentLabel] || ''));
    section.querySelectorAll('[data-recent-go]').forEach(node => node.setAttribute('aria-label',copy()[node.dataset.recentGo === '1' ? 'nextWork' : 'prevWork']));
    nodes.toggle.setAttribute('aria-label',copy()[paused ? 'play' : 'pause']);
    nodes.toggle.setAttribute('aria-pressed',String(paused));
    $('[data-recent-portfolio]').href = localizedPath('/design');
  };
  const updateStatus = () => {
    const edition = current();
    nodes.status.textContent = edition ? fill(copy().selected, {title:title(edition),position:fill(copy().position,{n:memberIndex + 1,total:edition.count})}) : '';
  };
  // The screen never moves. The releases still to come wait beside it as slim
  // covers, the next one nearest, and one bar per release keeps the clock.
  const cover = (edition, index) => `<button type="button" class="recent-entry" data-recent-edition="${esc(edition.id)}" data-recent-panel="${esc(edition.id)}" aria-controls="recentWorkPreview" aria-label="${esc(fill(copy().goTo,{n:index + 1}) + ' — ' + title(edition))}"><span class="recent-entry-thumb">${image(edition.cover,'',edition.width,edition.height,'',false)}</span><span class="recent-entry-no" dir="ltr" aria-hidden="true">${number(index + 1)}</span>${edition.kind === 'video' ? '<span class="recent-play-mark" aria-hidden="true">▶</span>' : ''}</button>`;
  const renderQueue = () => {
    const list = slides(), at = list.findIndex(item => item.id === selected);
    const waiting = at < 0 ? list : [...list.slice(at + 1),...list.slice(0,at)];
    nodes.queue.style.setProperty('--n',String(waiting.length));
    nodes.queue.innerHTML = waiting.map(edition => cover(edition,list.indexOf(edition))).join('');
  };
  const renderIndex = () => {
    const list = slides();
    const key = `${language()}|${loadState}|${list.map(item => item.id).join(',')}`;
    if (key !== railKey) {
      railKey = key;
      nodes.index.innerHTML = list.map((edition, index) => `<button type="button" class="recent-bar" data-recent-edition="${esc(edition.id)}" aria-label="${esc(fill(copy().goTo,{n:index + 1}) + ' — ' + title(edition))}"><i aria-hidden="true"></i></button>`).join('');
      nodes.wall.hidden = !list.length;
      $('[data-recent-state]').innerHTML = list.length ? '' : `<p class="recent-state">${esc(copy()[loadState === 'error' ? 'error' : loadState === 'loading' ? 'loading' : 'empty'])}</p>${loadState === 'error' ? `<button type="button" class="recent-retry" data-recent-retry>${esc(copy().retry)}</button>` : ''}`;
    }
    nodes.more.hidden = list.length >= filtered().length;
    const at = list.findIndex(item => item.id === selected);
    [...nodes.index.children].forEach((bar, index) => {
      bar.classList.toggle('is-current',index === at);
      bar.classList.toggle('is-past',index < at);
      bar.setAttribute('aria-pressed',String(index === at));
    });
  };
  const compactDetails = { get matches() { return section.hasAttribute('data-narrow'); } };
  const renderContacts = (edition) => {
    const multi = edition.count > 1;
    // A long batch is never truncated. A moving contact window, next/previous
    // and an accessible range reach every member without hundreds of images.
    if (multi) {
      const windowSize=compactDetails.matches ? 3 : 7;
      const start = Math.max(0,Math.min(memberIndex-Math.floor(windowSize/2),edition.count-windowSize));
      const visible = edition.members.slice(start,start+windowSize);
      nodes.thumbs.innerHTML = `<div class="recent-detail-controls"><button type="button" data-recent-step="-1" aria-label="${esc(copy().previous)}"${memberIndex === 0 ? ' disabled' : ''}><span aria-hidden="true">←</span></button><span class="recent-contact-count" dir="ltr">${number(memberIndex+1)} <i>/</i> ${number(edition.count)}</span><button type="button" data-recent-step="1" aria-label="${esc(copy().next)}"${memberIndex === edition.count-1 ? ' disabled' : ''}><span aria-hidden="true">→</span></button></div><div class="recent-thumbs">${visible.map((item,i) => `<button type="button" data-recent-member="${start+i}" aria-label="${esc(copy().detail + ' ' + (start+i+1))}" aria-pressed="${start+i === memberIndex}">${image(item.poster || item.src,'',item.width,item.height)}${item.type === 'video' ? '<span aria-hidden="true">▶</span>' : ''}</button>`).join('')}</div>${edition.count > 7 ? `<input class="recent-detail-range" type="range" min="1" max="${edition.count}" value="${memberIndex+1}" aria-label="${esc(copy().range)}" aria-valuetext="${esc(fill(copy().position,{n:memberIndex+1,total:edition.count}))}">` : ''}`;
    } else nodes.thumbs.innerHTML = '';
  };
  // Builds the slide for the stage and hands back the moment to put it there.
  const slide = (edition, member, href, external) => {
    let node;
    if (member.type === 'video') {
      node = document.createElement('div');
      node.className = 'recent-slide recent-slide--film';
      node.innerHTML = `<video class="recent-art recent-film" controls playsinline preload="none"${member.poster ? ` poster="${esc(member.poster)}"` : ''} aria-label="${esc(memberTitle(member))}"><source src="${esc(member.url)}"></video>`;
    } else {
      node = document.createElement('a');
      node.className = 'recent-slide recent-art-link';
      node.href = href;
      node.dataset.recentOpen = '';
      node.draggable = false;
      if (external) { node.target = '_blank'; node.rel = 'noopener noreferrer'; }
      node.setAttribute('aria-label',edition.kind === 'case-study' ? copy().openCase : memberTitle(member));
      node.innerHTML = `${image(member.src,memberTitle(member),member.width,member.height,'recent-art',false).replace('decoding="async"','decoding="sync"')}<span class="recent-enlarge" aria-hidden="true">↗</span>`;
      node.firstElementChild.draggable = false;
    }
    return node;
  };
  // A soft cross-fade, for the details of one release.
  const fadeTo = node => {
    [...mount.children].forEach(old => { old.classList.add('is-leaving'); old.inert = true; setTimeout(() => old.remove(), 700); });
    node.classList.add('is-arriving');
    mount.append(node);
  };
  const place = node => { mount.replaceChildren(node); };
  const finishMotion = () => { const active = motion; motion = null; active?.finish(); };
  // Rectangles are read on screen but written as CSS lengths inside the wall.
  // The sheet is scaled to fit its paper (smaller on short windows, larger on
  // big screens), so every reading is taken back to the wall's own units.
  // Without this the travelling poster sat a little off its final place and
  // slipped back when the real one took over.
  const box = (node, frame) => { const r = node.getBoundingClientRect(); return {x:(r.left - frame.left) / frame.sx,y:(r.top - frame.top) / frame.sy,w:r.width / frame.sx,h:r.height / frame.sy}; };
  // The chosen cover leaves the queue, crosses into the screen and opens over
  // the work that was there, while the rest of the queue closes up behind it.
  // One clipped layer does it with transforms only, so nothing is re-laid out
  // and the picture never jumps: it is the same picture from cover to stage.
  const travel = (edition, member, node) => {
    const seen = nodes.wall.getBoundingClientRect();
    const frame = {left:seen.left,top:seen.top,width:nodes.wall.offsetWidth,height:nodes.wall.offsetHeight};
    frame.sx = seen.width / frame.width || 1; frame.sy = seen.height / frame.height || 1;
    const before = new Map([...nodes.queue.children].map(item => [item.dataset.recentPanel,box(item,frame)]));
    const from = before.get(edition.id);
    renderQueue();
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden || !nodes.wall.animate || frame.width < 1;
    if (!from || still) { place(node); return; }
    const screen = box(nodes.screen,frame), stageBox = box(mount,frame);
    const timing = {duration:1150,easing:'cubic-bezier(.62,0,.2,1)',fill:'both'};
    const runs = [];
    const beside = from.x + from.w <= screen.x + 1 ? 1 : from.x >= screen.x + screen.w - 1 ? -1 : 0;
    // The queue closes up; the work that just left the screen joins its far end.
    [...nodes.queue.children].forEach(item => {
      const was = before.get(item.dataset.recentPanel), now = box(item,frame);
      // A cover that only moves up one place slides; one that would have to
      // cross its neighbours fades into its new place instead.
      const far = was && Math.hypot(was.x - now.x,was.y - now.y) > Math.max(was.w,was.h) * 1.6;
      runs.push(was && far
        ? item.animate([{opacity:0},{opacity:0,offset:.4},{opacity:1}],timing)
        : was
        ? item.animate([{transform:`translate(${(was.x - now.x).toFixed(1)}px,${(was.y - now.y).toFixed(1)}px)`},{transform:'none'}],timing)
        : item.animate([{opacity:0,transform:`translate(${beside ? -beside * 22 : 0}px,${beside ? 0 : 14}px)`},{opacity:0,transform:`translate(${beside ? -beside * 22 : 0}px,${beside ? 0 : 14}px)`,offset:.45},{opacity:1,transform:'none'}],timing));
    });
    const layer = document.createElement('div');
    layer.className = 'recent-travel';
    layer.setAttribute('aria-hidden','true');
    const px = value => `${value.toFixed(1)}px`;
    const radius = getComputedStyle(nodes.screen).borderTopLeftRadius;
    const picture = `<img src="${esc(member.poster || member.src)}" alt="" decoding="sync">`;
    const scene = `<span class="recent-travel-scene"><span class="recent-travel-pane" style="left:${px(screen.x)};top:${px(screen.y)};width:${px(screen.w)};height:${px(screen.h)};border-radius:${radius}"><span class="recent-travel-art" style="left:${px(stageBox.x - screen.x)};top:${px(stageBox.y - screen.y)};width:${px(stageBox.w)};height:${px(stageBox.h)}">${picture}</span></span></span>`;
    const blade = `<span class="recent-travel-blade" style="left:${px(from.x)};top:${px(from.y)};width:${px(from.w)};height:${px(from.h)}"><img src="${esc(edition.cover)}" alt="" decoding="sync"></span>`;
    layer.innerHTML = scene + blade;
    nodes.wall.append(layer);
    const sceneNode = layer.firstElementChild, bladeNode = layer.lastElementChild;
    const W = frame.width, H = frame.height;
    if (beside) {
      // Beside the screen: the cover keeps its own size and sweeps across the
      // screen like a blade. Behind it lies the new work, complete and still;
      // ahead of it the old one. It thins away as it reaches the far side.
      const end = beside > 0 ? screen.x + screen.w - from.w : screen.x;
      const seam = t => beside > 0 ? from.x + (end - from.x) * t + from.w * (.5 + .5 * t) : from.x + (end - from.x) * t + from.w * (.5 - .5 * t);
      const cut = t => beside > 0
        ? `inset(0 ${px(Math.max(0,W - seam(t)))} 0 0)`
        : `inset(0 0 0 ${px(Math.max(0,seam(t)))})`;
      runs.push(sceneNode.animate([{clipPath:cut(0)},{clipPath:cut(1)}],timing));
      runs.push(bladeNode.animate([{opacity:1,transform:'none'},{opacity:1,offset:.52},{opacity:0,offset:.9},{opacity:0,transform:`translateX(${px(end - from.x)})`}],timing));
    } else {
      // Below the screen (phones): the cover's own frame opens into the screen.
      const slit = (r, round) => `inset(${px(r.y)} ${px(W - r.x - r.w)} ${px(H - r.y - r.h)} ${px(r.x)} round ${round})`;
      runs.push(sceneNode.animate([{clipPath:slit(from,getComputedStyle(nodes.queue.firstElementChild || nodes.screen).borderTopLeftRadius)},{clipPath:slit(screen,radius)}],timing));
      runs.push(bladeNode.animate([{opacity:1},{opacity:0,offset:.32},{opacity:0}],timing));
    }
    const own = motion = {finish(settled) {
      runs.forEach(run => { run.onfinish = null; if (!settled) run.cancel(); });
      place(node);
      // Keep the layer over the stage until the real picture is decoded, so
      // the hand-over never shows an empty frame.
      const real = node.querySelector('img.recent-art');
      const drop = () => layer.remove();
      if (settled && real?.decode) real.decode().then(drop,drop); else drop();
    }};
    runs[runs.length - 1].onfinish = () => { if (motion === own) { motion = null; own.finish(true); } };
  };
  const renderDetail = (mode = 'fade') => {
    stopFilm();
    const edition = current();
    nodes.stage.hidden = !edition;
    if (!edition) {
      finishMotion(); frameKey = ''; mount.replaceChildren(); renderQueue();
      nodes.caption.innerHTML = ''; nodes.thumbs.innerHTML = ''; updateStatus(); return;
    }
    memberIndex = Math.max(0, Math.min(memberIndex, edition.members.length - 1));
    const member = edition.members[memberIndex];
    const multi = edition.count > 1;
    const list = slides(), at = list.findIndex(item => item.id === edition.id);
    nodes.viewer.dataset.kind = edition.kind;
    nodes.viewer.classList.toggle('is-multiple',multi);
    nodes.viewer.classList.toggle('is-single-slide',list.length < 2);
    nodes.stage.id = 'recentWorkPreview';
    nodes.stage.setAttribute('role','group');
    nodes.stage.setAttribute('aria-label',`${title(edition)} — ${fill(copy().position,{n:memberIndex+1,total:edition.count})}`);
    const href = localizedPath(member.href || edition.href);
    const external = Boolean(edition.external);
    const kindLabel = edition.kind === 'case-study' ? copy().caseStudy : edition.kind === 'video' && !multi ? copy().film : multi ? copy().series : copy().single;
    $('[data-recent-kind]').textContent = kindLabel === countLabel(edition) ? kindLabel : `${kindLabel} · ${countLabel(edition)}`;
    $('[data-recent-date]').innerHTML = `<time datetime="${esc(edition.date)}">${esc(date(edition.date))}</time>`;
    const count = number(at + 1), countNode = $('[data-recent-count]');
    if (countNode.dataset.value !== count) {
      countNode.dataset.value = count;
      countNode.style.setProperty('--dir',String(direction));
      countNode.innerHTML = [...count].map((digit, i) => `<b style="--i:${i}">${digit}</b>`).join('');
    }
    $('[data-recent-total]').textContent = `/ ${number(list.length)}`;
    nodes.caption.innerHTML = `<div class="recent-caption-copy"><h3 dir="auto">${esc(edition.kind === 'case-study' ? edition.title : memberTitle(member))}</h3></div><a class="recent-open" data-recent-open href="${esc(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}${external ? ` aria-label="${esc(copy().openCase + ' — ' + copy().external)}"` : ''}><span>${esc(edition.kind === 'case-study' ? copy().openCase : copy().open)}</span><span aria-hidden="true">↗</span></a>`;
    renderContacts(edition);
    updateStatus();
    const key = `${edition.id}|${memberIndex}|${href}|${language()}`;
    if (key === frameKey) { if (mode !== 'travel' && !motion) renderQueue(); return; }
    frameKey = key;
    finishMotion();
    const node = slide(edition, member, href, external);
    if (mode !== 'travel') {
      renderQueue();
      if (mode === 'fade' && mount.childElementCount) fadeTo(node); else place(node);
      return;
    }
    // Start only once both pictures are ready, so the cover never opens empty.
    let started = false;
    const own = motion = {finish() { started = true; renderQueue(); place(node); }};
    const start = () => { if (started || motion !== own) return; started = true; motion = null; travel(edition, member, node); };
    const wait = [edition.cover, member.poster || member.src].filter(Boolean).map(src => new Promise(done => { const probe = new Image(); probe.onload = probe.onerror = done; probe.src = src; if (probe.complete) done(); }));
    Promise.all(wait).then(start);
    setTimeout(start,1200);
  };
  const render = () => { updateStaticCopy(); renderIndex(); renderDetail('place'); };
  const choose = (id, way) => {
    if (selected === id) return;
    const list = slides();
    const from = list.findIndex(item => item.id === selected), to = list.findIndex(item => item.id === id);
    direction = way || (to >= from ? 1 : -1);
    selected = id; memberIndex = 0; shown.add(id); renderIndex(); renderDetail('travel');
  };
  const go = (step, way = step) => {
    const list = slides();
    if (list.length < 2) return false;
    const at = Math.max(0,list.findIndex(item => item.id === selected));
    choose(list[(at + step + list.length) % list.length].id, way);
    return true;
  };
  const initialSelection = () => {
    const first = selectRecentPublications(editions,{filter,limit:6,balanced:filter === 'all'});
    shown = new Set(first.map(item => item.id));
    if (!shown.has(selected)) { selected = first[0]?.id || ''; memberIndex = 0; }
  };
  const getJSON = async path => {
    const response = await fetch(path,{credentials:'same-origin',signal:AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error('Catalogue unavailable');
    return response.json();
  };
  let cataloguePromise;
  const load = () => {
    if (cataloguePromise) return cataloguePromise;
    loadState = 'loading'; renderIndex();
    const galleryScript = document.querySelector('script[src*="gallery.v420.min.js"]');
    const version = galleryScript ? new URL(galleryScript.src).searchParams.get('v') : '';
    const manifestURL = '/assets/gallery-manifest.json' + (version ? '?v=' + encodeURIComponent(version) : '');
    const behanceURL = document.getElementById('behance')?.dataset.behanceSrc || '/assets/behance/projects.json';
    cataloguePromise = Promise.allSettled([getJSON(manifestURL),getJSON(behanceURL)]).then(results => {
      const manifest = results[0].status === 'fulfilled' ? results[0].value : {images:[],videos:[]};
      const behance = results[1].status === 'fulfilled' ? results[1].value : {projects:[]};
      if (results.every(result => result.status === 'rejected')) throw new Error('Catalogues unavailable');
      const accept = catalogue => {
        editions = buildRecentPublications(manifest,catalogue);
        loadState = 'ready'; initialSelection(); render(); walk?.restart();
        $('.recent-folio').setAttribute('aria-busy','false');
        window.dispatchEvent(new CustomEvent('bq:recent-publications',{detail:{editions}}));
      };
      accept(behance);
      // Fresh RSS covers join immediately, as they do in the Behance room.
      // Local full case studies win over the temporary cover-only record.
      getJSON('/api/behance-feed').then(fresh => {
        if (!Array.isArray(fresh?.projects) || !fresh.projects.length) return;
        const oldSelected = selected, oldMember = memberIndex;
        accept({...behance,projects:[...(behance.projects || []),...fresh.projects.map(project=>({...project,live:true}))]});
        if (editions.some(edition=>edition.id === oldSelected)) { selected=oldSelected; memberIndex=oldMember; shown.add(selected); render(); }
      }).catch(()=>{});
      return {manifest,behance,editions};
    }).catch(() => {
      loadState='error'; cataloguePromise=null; render(); $('.recent-folio').setAttribute('aria-busy','false');
      return {manifest:{images:[],videos:[]},behance:{projects:[]},editions:[]};
    });
    window.__bqRecentCatalogue = cataloguePromise;
    return cataloguePromise;
  };
  // After a choice made by hand the show waits before it walks on by itself.
  const settle = event => { if (event?.pointerType === 'mouse' || event?.detail === 0) walk?.restart(); else walk?.holdFor(9000); };
  let dragged = false;
  section.addEventListener('click',event => {
    if (dragged && event.target.closest('.recent-art-mount')) { event.preventDefault(); dragged = false; return; }
    const format = event.target.closest('[data-recent-filter]');
    if (format) {
      filter=format.dataset.recentFilter;
      section.querySelectorAll('[data-recent-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button === format)));
      direction = 1; initialSelection(); renderIndex(); renderDetail('fade'); walk?.restart(); return;
    }
    if (event.target.closest('[data-recent-toggle]')) { paused = !paused; updateStaticCopy(); walk?.restart(); return; }
    const step = event.target.closest('[data-recent-go]');
    if (step) { go(Number(step.dataset.recentGo)); settle(event); return; }
    const entry=event.target.closest('[data-recent-edition]');
    if (entry) { choose(entry.dataset.recentEdition); settle(event); return; }
    const thumb=event.target.closest('[data-recent-member]');
    const detail=event.target.closest('[data-recent-step]');
    if (thumb || detail) {
      const edition=current(); if (!edition) return;
      const before=memberIndex;
      memberIndex=Math.max(0,Math.min(edition.count-1,thumb ? Number(thumb.dataset.recentMember) : memberIndex+Number(detail.dataset.recentStep)));
      direction = memberIndex >= before ? 1 : -1;
      renderDetail(); settle(event);
      // Replacing the contact sheet must preserve keyboard focus on the
      // corresponding control, including when it becomes disabled at an edge.
      const replacement=thumb ? nodes.thumbs.querySelector(`[data-recent-member="${memberIndex}"]`) : nodes.thumbs.querySelector(`[data-recent-step="${detail.dataset.recentStep}"]:not(:disabled)`) || nodes.thumbs.querySelector(`[data-recent-member="${memberIndex}"]`);
      if (event.detail === 0) replacement?.focus({preventScroll:true});
      return;
    }
    if (event.target.closest('[data-recent-more]')) {
      filtered().filter(edition=>!shown.has(edition.id)).slice(0,6).forEach(edition=>shown.add(edition.id)); renderIndex(); renderDetail('place'); walk?.restart(); return;
    }
    if (event.target.closest('[data-recent-retry]')) { load(); return; }
    const portfolio=event.target.closest('[data-recent-portfolio]');
    if (portfolio && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      const target=document.querySelector('.section.work');
      if (target && window.__bqScrollPaperTarget) { event.preventDefault(); window.__bqScrollPaperTarget(target,{behavior:'smooth',block:'start'}); }
      return;
    }
    const open=event.target.closest('[data-recent-open]');
    const edition=current(), member=edition?.members[memberIndex];
    if (!open || !member || edition.source !== 'gallery' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const gallery=window.BQ_GALLERY;
    if (!gallery || !window.__bqOpenLightboxPool) return;
    const pool=gallery.items(member.coll), index=pool.findIndex(item=>item.index === member.index);
    if (index >= 0) {
      const lightboxPool=pool.map(item=>({full:item.url,raw:item.rawUrl,type:item.type,title:memberTitle(item)}));
      event.preventDefault(); window.__bqOpenLightboxPool(lightboxPool,index);
    }
  });
  // By hand: a sideways swipe or drag on the artwork, and the arrow keys.
  let drag = null;
  mount.addEventListener('pointerdown',event => {
    dragged = false;
    if (event.button > 0 || event.target.closest('video')) return;
    drag = {id:event.pointerId,x:event.clientX,y:event.clientY};
  });
  window.addEventListener('pointerup',event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    drag = null;
    if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    dragged = true;
    setTimeout(() => { dragged = false; },400);
    const step = (dx < 0 ? 1 : -1) * (rtl() ? -1 : 1);
    if (go(step)) settle(event);
  },{passive:true});
  window.addEventListener('pointercancel',() => { drag = null; },{passive:true});
  nodes.viewer.addEventListener('keydown',event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.target.closest('input, video, .recent-contact-sheet') || event.metaKey || event.ctrlKey || event.altKey) return;
    const step = (event.key === 'ArrowRight' ? 1 : -1) * (rtl() ? -1 : 1);
    if (go(step)) event.preventDefault();
  });
  // A film that is playing keeps its slide until it stops.
  nodes.stage.addEventListener('play',() => walk?.holdFor(3600000),true);
  ['pause','ended'].forEach(type => nodes.stage.addEventListener(type,() => walk?.holdFor(2500),true));
  if (window.__bqStageWalk) walk = window.__bqStageWalk({
    stage:nodes.viewer,
    count:() => paused ? 0 : slides().length,
    current:() => Math.max(0,slides().findIndex(item => item.id === selected)),
    select:index => { const list = slides(); if (list[index]) choose(list[index].id,1); },
    line:index => nodes.index.children[index]?.querySelector('i'),
    dwell:6000
  });
  // Commit a range selection only on change, so re-rendering cannot interrupt
  // pointer capture or keyboard adjustment while the slider is being moved.
  nodes.thumbs.addEventListener('change',event=>{
    if (!event.target.matches('.recent-detail-range')) return;
    memberIndex=Number(event.target.value)-1; renderDetail();
    nodes.thumbs.querySelector('.recent-detail-range')?.focus({preventScroll:true});
  });
  document.addEventListener('bq:language',render);
  document.addEventListener('visibilitychange',()=>{ if (document.hidden) stopFilm(); });
  document.addEventListener('bq:route',stopFilm);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries=>{ if (!entries[0].isIntersecting) stopFilm(); },{threshold:.08}).observe(section);
  document.querySelector('[data-recent-jump]')?.addEventListener('click',event=>{
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !window.__bqScrollPaperTarget) return;
    event.preventDefault(); window.__bqScrollPaperTarget(section,{behavior:'smooth',block:'start'});
  });
  // Large screens enlarge every sheet by one shared factor. The wall is sized
  // for the reference window and left to that factor, so this sheet grows with
  // its neighbours instead of staying small beside them.
  const followGrow = () => section.style.setProperty('--ex-grow',String(Math.max(1,Number(window.__bqViewportGrow) || 1)));
  followGrow();
  window.addEventListener('resize',followGrow,{passive:true});
  // The narrow composition follows the sheet's own inner width (in its own
  // units), so a phone and an enlarged upright tablet share it.
  const shell = $('.recent-shell');
  const followWidth = () => {
    const narrow = shell.clientWidth > 0 && shell.clientWidth < 700;
    if (narrow === section.hasAttribute('data-narrow')) return;
    section.toggleAttribute('data-narrow',narrow);
    if (current()) { renderContacts(current()); }
  };
  followWidth();
  if (typeof ResizeObserver === 'function') new ResizeObserver(followWidth).observe(shell);
  updateStaticCopy(); load();
}

/* The statement: one sentence set large, with four real works sitting in the
   line as small pictures. It shares this module only for the catalogue the
   recent-work sheet has already fetched. */
const statement = document.querySelector('[data-statement]');
if (statement) {
  const LINES = {
    en: 'From Erbil {} I shape identities, {} books and images {} that stay in the mind long after the page {} is closed.',
    ku: 'لە هەولێرەوە {} ناسنامە، {} کتێب و وێنە دروست دەکەم {} کە دوای داخستنی لاپەڕەکەش {} لە بیردا دەمێننەوە.',
    kmr: 'Ji Hewlêrê {} ez nasname, {} pirtûk û wêneyan çêdikim {} ku piştî girtina rûpelê jî {} di bîrê de dimînin.',
    ar: 'من أربيل {} أصمّم هويات، {} كتبًا وصورًا {} تبقى في الذاكرة طويلًا بعد أن {} تُطوى الصفحة.',
    fr: 'Depuis Erbil, {} je façonne des identités, {} des livres et des images {} qui restent en mémoire bien après que la page {} s’est refermée.',
    tr: 'Erbil’den {} kimlikler, {} kitaplar ve görseller tasarlıyorum; {} sayfa kapandıktan çok sonra da {} akılda kalanlar.',
    sv: 'Från Erbil {} formar jag identiteter, {} böcker och bilder {} som stannar i minnet långt efter att sidan {} har stängts.'
  };
  const FOLDERS = ['LogoDesign','Book','Poster','Photos'];
  const FRAMES = 3;
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sheet = statement.closest('.statement');
  // Each gap in the line holds a short reel of works from one discipline,
  // drawn afresh on every visit, so the sentence never shows the same set twice.
  let reels = [], tokens = [], painted = -1, frame = 0;
  const draw = () => {
    const lang = document.documentElement.dataset.lang || document.documentElement.lang || 'en';
    const parts = (LINES[lang] || LINES.en).split('{}');
    statement.setAttribute('aria-label',parts.map(part => part.trim()).join(' ').replace(/\s+([,;.])/g,'$1'));
    statement.innerHTML = parts.map((part, index) => {
      const words = part.trim().split(/\s+/).filter(Boolean).map(word => `<span class="statement-word" data-token>${safe(word)}</span>`).join(' ');
      const reel = reels[index];
      const picture = index < parts.length - 1 && reel?.length ? ` <span class="statement-pic" data-token aria-hidden="true"><span class="statement-reel" style="--n:${reel.length}">${reel.map(src => `<img src="${safe(src)}" alt="" loading="lazy" decoding="async">`).join('')}</span></span> ` : ' ';
      return words + picture;
    }).join('');
    tokens = [...statement.querySelectorAll('[data-token]')];
    painted = -1;
    paint();
  };
  // Reading progress: the last part of the sheet's rise, then the stretch of
  // scroll it holds the page alone before the next sheet starts to arrive.
  const progress = () => {
    if (!sheet) return 1;
    const view = window.innerHeight || 1, top = sheet.getBoundingClientRect().top;
    const rise = Math.min(1,Math.max(0,1 - (top - 20) / (view * .45)));
    const next = sheet.nextElementSibling;
    const hold = parseFloat(getComputedStyle(sheet).marginBottom) || 0;
    if (!next || hold < 40) return rise;
    const held = Math.min(1,Math.max(0,1 - (next.getBoundingClientRect().top - view) / hold));
    return rise * .22 + held * .78;
  };
  const paint = () => {
    frame = 0;
    if (!tokens.length) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const value = reduce ? 1 : progress();
    if (Math.abs(value - painted) < .002) return;
    painted = value;
    // The fill runs a little past the last word, so the line is whole before
    // the next sheet appears.
    const reach = value * (tokens.length + 1.5);
    tokens.forEach((token, index) => {
      const lit = Math.min(1,Math.max(0,reach - index));
      if (token.classList.contains('statement-pic')) {
        token.classList.toggle('is-open',lit > .15);
        // Once open, the reel turns on through its other works as the
        // reading goes on.
        const turn = Math.max(0,(reach - index - 1) / Math.max(1,tokens.length - index) * FRAMES * 1.6);
        const reel = token.firstElementChild, count = reel.childElementCount;
        reel.style.setProperty('--at',String(Math.min(count - 1,Math.floor(turn))));
      } else token.style.opacity = (.14 + lit * .86).toFixed(3);
    });
  };
  const queue = () => { if (!frame) frame = requestAnimationFrame(paint); };
  // The sentence names books, so the sheet shows them: one cover at a time,
  // flat, under the line, the next one every few seconds while it is in view.
  const BOOK_EVERY = 3500;
  const books = document.createElement('div');
  books.className = 'statement-books';
  books.setAttribute('aria-hidden','true');
  books.innerHTML = '<img alt="" decoding="async"><img alt="" decoding="async">';
  let bookList = [], bookAt = -1, bookTimer = 0, bookBusy = false, bookInView = false;
  const bookPlace = () => { if (statement.nextElementSibling !== books) statement.insertAdjacentElement('afterend',books); };
  const bookWait = () => { window.clearTimeout(bookTimer); bookTimer = 0; };
  const bookTurn = () => {
    bookWait();
    if (bookBusy || !bookList.length || !bookInView || document.hidden) return;
    const at = (bookAt + 1) % bookList.length, src = bookList[at];
    const [one, two] = books.children, back = one.classList.contains('is-front') ? two : one;
    const probe = new Image();
    probe.decoding = 'async';
    probe.src = src;
    bookBusy = true;
    // A cover changes only once it is fully decoded, so no blank frame shows.
    (probe.decode ? probe.decode() : Promise.resolve()).then(() => {
      bookAt = at;
      back.src = src;
      one.classList.toggle('is-front',back === one);
      two.classList.toggle('is-front',back === two);
      books.classList.add('is-ready');
      return BOOK_EVERY;
    },() => { bookAt = at; return 250; }).then(wait => {
      bookBusy = false;
      if (bookInView && !document.hidden) bookTimer = window.setTimeout(bookTurn,wait);
    });
  };
  if (sheet && typeof IntersectionObserver === 'function') {
    new IntersectionObserver(entries => {
      bookInView = entries.some(entry => entry.isIntersecting);
      if (!bookInView) bookWait(); else if (!bookTimer) bookTurn();
    },{threshold:.2}).observe(sheet);
  } else bookInView = true;
  document.addEventListener('visibilitychange',() => { if (document.hidden) bookWait(); else if (!bookTimer) bookTurn(); });
  statement.classList.add('is-live');
  draw();
  bookPlace();
  document.addEventListener('bq:language',draw);
  window.addEventListener('scroll',queue,{passive:true});
  window.addEventListener('resize',queue,{passive:true});
  (window.__bqRecentCatalogue || Promise.resolve(null)).then(result => {
    const records = (result?.manifest?.images || []).filter(record => record && /^[A-Za-z0-9]+\/[^/\\]+\.(?:webp|png|jpe?g|avif)$/i.test(record.path || ''));
    reels = FOLDERS.map(folder => {
      const pool = records.filter(record => record.path.startsWith(folder + '/'));
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i],pool[j]] = [pool[j],pool[i]]; }
      return pool.slice(0,FRAMES).map(record => '/assets/thumbs/' + record.path);
    });
    if (reels.some(reel => reel.length)) draw();
    // Every book cover, in a new order on each visit, at full resolution.
    bookList = records.filter(record => record.path.startsWith('Book/'))
      .map(record => '/media/Book/' + encodeURIComponent(record.path.slice(5)));
    for (let i = bookList.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bookList[i],bookList[j]] = [bookList[j],bookList[i]]; }
    bookTurn();
  });
}
