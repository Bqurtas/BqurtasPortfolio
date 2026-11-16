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
  Object.keys(COPY).forEach(key=>Object.assign(COPY[key],EXHIBITION_COPY[key]));
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
  const nodes = { index:$('[data-recent-index]'),stage:$('[data-recent-stage]'),caption:$('[data-recent-caption]'),thumbs:$('[data-recent-thumbnails]'),viewer:$('[data-recent-viewer]'),more:$('[data-recent-more]'),status:$('[data-recent-status]') };
  let editions = [], filter = 'all', selected = '', memberIndex = 0, shown = new Set(), loadState = 'loading';
  const filtered = () => selectRecentPublications(editions, {filter,limit:Infinity,balanced:false});
  const current = () => editions.find(item => item.id === selected);
  const stopFilm = () => nodes.stage.querySelector('video')?.pause();
  const image = (src, alt, width, height, className = '', lazy = true) => `<img src="${esc(src)}" alt="${esc(alt)}"${width > 0 && height > 0 ? ` width="${width}" height="${height}"` : ''} class="${className}" ${lazy ? 'loading="lazy"' : 'fetchpriority="low"'} decoding="async">`;
  const updateStaticCopy = () => {
    section.querySelectorAll('[data-recent-copy]').forEach(node => { node.textContent = copy()[node.dataset.recentCopy] || ''; });
    section.querySelectorAll('[data-recent-label]').forEach(node => node.setAttribute('aria-label',copy()[node.dataset.recentLabel] || ''));
    $('[data-recent-portfolio]').href = localizedPath('/design');
  };
  const updateStatus = () => {
    const edition = current();
    nodes.status.textContent = edition ? fill(copy().selected, {title:title(edition),position:fill(copy().position,{n:memberIndex + 1,total:edition.count})}) : '';
  };
  // The wall keeps its panels between selections, so choosing a work widens
  // its panel instead of rebuilding the row. The stage is one persistent node
  // that moves into whichever panel is open.
  let wallKey = '';
  const panel = (edition, index) => `<div class="recent-panel" data-recent-panel="${esc(edition.id)}"><button type="button" class="recent-entry" data-recent-edition="${esc(edition.id)}" aria-controls="recentWorkPreview" aria-label="${esc(title(edition) + ' — ' + countLabel(edition) + ' — ' + date(edition.date))}"><span class="recent-entry-thumb">${image(edition.cover,'',edition.width,edition.height)}</span><span class="recent-entry-no" dir="ltr" aria-hidden="true">${number(index + 1)}</span>${edition.kind === 'video' ? '<span class="recent-play-mark" aria-hidden="true">▶</span>' : ''}</button></div>`;
  const renderIndex = () => {
    const all = filtered(), list = all.filter(item => shown.has(item.id));
    $('[data-recent-total]').textContent = number(all.length);
    const key = `${language()}|${loadState}|${list.map(item => item.id).join(',')}`;
    if (key !== wallKey) {
      wallKey = key;
      nodes.stage.remove();
      nodes.index.innerHTML = list.length ? list.map(panel).join('') : `<p class="recent-state">${esc(copy()[loadState === 'error' ? 'error' : loadState === 'loading' ? 'loading' : 'empty'])}</p>${loadState === 'error' ? `<button type="button" class="recent-retry" data-recent-retry>${esc(copy().retry)}</button>` : ''}`;
    }
    nodes.more.hidden = list.length >= all.length;
    nodes.index.querySelectorAll('[data-recent-panel]').forEach(node => {
      const open = node.dataset.recentPanel === selected, entry = node.firstElementChild;
      node.classList.toggle('is-open',open);
      entry.setAttribute('aria-pressed',String(open));
      entry.tabIndex = open ? -1 : 0;
      if (open && nodes.stage.parentElement !== node) { nodes.stage.hidden = false; node.append(nodes.stage); }
    });
    // Keep the open panel inside the wall's own frame without moving the page.
    const active = nodes.index.querySelector('.is-open');
    if (active && nodes.index.scrollWidth > nodes.index.clientWidth + 1) {
      const bounds=active.getBoundingClientRect(), frame=nodes.index.getBoundingClientRect();
      if (bounds.left < frame.left || bounds.right > frame.right) nodes.index.scrollLeft += (bounds.left + bounds.right - frame.left - frame.right) / 2;
    }
  };
  const compactDetails = window.matchMedia('(max-width: 600px)');
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
  const renderDetail = () => {
    stopFilm();
    const edition = current();
    if (!edition) {
      nodes.stage.innerHTML = '';
      nodes.caption.innerHTML = ''; nodes.thumbs.innerHTML = ''; updateStatus(); return;
    }
    memberIndex = Math.max(0, Math.min(memberIndex, edition.members.length - 1));
    const member = edition.members[memberIndex];
    const multi = edition.count > 1;
    const publications=filtered(), publicationIndex=publications.findIndex(item=>item.id === edition.id);
    nodes.viewer.dataset.kind = edition.kind;
    nodes.viewer.classList.toggle('is-multiple',multi);
    nodes.stage.id = 'recentWorkPreview';
    nodes.stage.setAttribute('role','group');
    nodes.stage.setAttribute('aria-label',`${title(edition)} — ${fill(copy().position,{n:memberIndex+1,total:edition.count})}`);
    const href = localizedPath(member.href || edition.href);
    const external = edition.external ? ' target="_blank" rel="noopener noreferrer"' : '';
    const media = member.type === 'video'
      ? `<video class="recent-art recent-film" controls playsinline preload="none"${member.poster ? ` poster="${esc(member.poster)}"` : ''} aria-label="${esc(memberTitle(member))}"><source src="${esc(member.url)}"></video>`
      : `<a class="recent-art-link" href="${esc(href)}" data-recent-open${external} aria-label="${esc(edition.kind === 'case-study' ? copy().openCase : memberTitle(member))}">${image(member.src,memberTitle(member),member.width,member.height,'recent-art',false)}<span class="recent-enlarge" aria-hidden="true">↗</span></a>`;
    const kindLabel = edition.kind === 'case-study' ? copy().caseStudy : edition.kind === 'video' && !multi ? copy().film : multi ? copy().series : copy().single;
    nodes.stage.innerHTML = `<div class="recent-stage-meta"><span class="recent-stage-count" dir="ltr" aria-hidden="true"><b>${number(publicationIndex+1)}</b><i>/</i>${number(publications.length)}</span><span class="recent-stage-date"><time datetime="${esc(edition.date)}">${esc(date(edition.date))}</time></span></div><div class="recent-art-mount">${media}</div>`;
    nodes.caption.innerHTML = `<div class="recent-caption-copy"><span class="recent-kind">${esc(kindLabel)}${kindLabel === countLabel(edition) ? '' : ` <span aria-hidden="true">·</span> ${esc(countLabel(edition))}`}</span><h3 dir="auto">${esc(edition.kind === 'case-study' ? edition.title : memberTitle(member))}</h3></div><a class="recent-open" data-recent-open href="${esc(href)}"${external}${edition.external ? ` aria-label="${esc(copy().openCase + ' — ' + copy().external)}"` : ''}><span>${esc(edition.kind === 'case-study' ? copy().openCase : copy().open)}</span><span aria-hidden="true">↗</span></a>`;
    renderContacts(edition);
    updateStatus();
  };
  const render = () => { updateStaticCopy(); renderIndex(); renderDetail(); };
  const choose = id => {
    if (selected === id) return;
    selected = id; memberIndex = 0; shown.add(id); renderIndex(); renderDetail();
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
        loadState = 'ready'; initialSelection(); render();
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
  section.addEventListener('click',event => {
    const format = event.target.closest('[data-recent-filter]');
    if (format) {
      filter=format.dataset.recentFilter;
      section.querySelectorAll('[data-recent-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button === format)));
      initialSelection(); renderIndex(); renderDetail(); return;
    }
    const entry=event.target.closest('[data-recent-edition]');
    if (entry) {
      choose(entry.dataset.recentEdition);
      if (event.detail === 0) nodes.stage.querySelector('a,video')?.focus({preventScroll:true});
      return;
    }
    const thumb=event.target.closest('[data-recent-member]');
    const step=event.target.closest('[data-recent-step]');
    if (thumb || step) {
      const edition=current(); if (!edition) return;
      memberIndex=Math.max(0,Math.min(edition.count-1,thumb ? Number(thumb.dataset.recentMember) : memberIndex+Number(step.dataset.recentStep)));
      renderDetail();
      // Replacing the contact sheet must preserve keyboard focus on the
      // corresponding control, including when it becomes disabled at an edge.
      const replacement=thumb ? nodes.thumbs.querySelector(`[data-recent-member="${memberIndex}"]`) : nodes.thumbs.querySelector(`[data-recent-step="${step.dataset.recentStep}"]:not(:disabled)`) || nodes.thumbs.querySelector(`[data-recent-member="${memberIndex}"]`);
      if (event.detail === 0) replacement?.focus({preventScroll:true});
      return;
    }
    if (event.target.closest('[data-recent-more]')) {
      filtered().filter(edition=>!shown.has(edition.id)).slice(0,6).forEach(edition=>shown.add(edition.id)); renderIndex(); return;
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
  // Commit a range selection only on change, so re-rendering cannot interrupt
  // pointer capture or keyboard adjustment while the slider is being moved.
  nodes.thumbs.addEventListener('change',event=>{
    if (!event.target.matches('.recent-detail-range')) return;
    memberIndex=Number(event.target.value)-1; renderDetail();
    nodes.thumbs.querySelector('.recent-detail-range')?.focus({preventScroll:true});
  });
  compactDetails.addEventListener?.('change',()=>{ if (current()) renderContacts(current()); });
  document.addEventListener('bq:language',render);
  document.addEventListener('visibilitychange',()=>{ if (document.hidden) stopFilm(); });
  document.addEventListener('bq:route',stopFilm);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries=>{ if (!entries[0].isIntersecting) stopFilm(); },{threshold:.08}).observe(section);
  document.querySelector('[data-recent-jump]')?.addEventListener('click',event=>{
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !window.__bqScrollPaperTarget) return;
    event.preventDefault(); window.__bqScrollPaperTarget(section,{behavior:'smooth',block:'start'});
  });
  updateStaticCopy(); load();
}
