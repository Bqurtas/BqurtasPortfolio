/* =========================================================
   Barakat Qurtas — Cloudflare Pages Function
   Per-route, per-language Open Graph / Twitter covers.

   Static files (/, /assets/*, /css/*, /js/*) are served directly by Pages.
   This catch-all runs for SPA routes that have no file — optionally
   language-prefixed — and serves the app shell (index.html) with the
   <title> + OG/Twitter meta rewritten so every room, every Design tab,
   in every language, shares with its own cover:

     /blog            /design/logo            /bio
     /ku/blog         /ar/design/logo         /fr/bio
   ========================================================= */

const SITE = 'https://www.bqurtas.com';
const LANGS = ['ku', 'kmr', 'ar', 'fr'];                 // en = no prefix
const ROOMS = ['blog', 'bio', 'contact'];
const TABS  = ['official','book','image','logo','posters','social','events','business','invoices','video','other'];
const LOCALE = { en:'en_US', ku:'ckb_IQ', kmr:'kmr_TR', ar:'ar_IQ', fr:'fr_FR' };

const OG = {"en":{"home":{"t":"Barakat Qurtas","d":"Kurdish Graphic & Motion Designer"},"blog":{"t":"The Journal — Barakat Qurtas","d":"Short notes from the desk — on typography, place, and the slow craft of design."},"bio":{"t":"The Designer — Barakat Qurtas","d":"A decade of practice in Hewlêr — the story, the work, and the people behind it."},"contact":{"t":"Let's talk. — Barakat Qurtas","d":"Pitch a project in one careful letter. I reply to every serious enquiry within 48 hours."},"official":{"t":"Official — Barakat Qurtas","d":"Editorial design for the Presidency of the Kurdistan Region."},"book":{"t":"Book Covers — Barakat Qurtas","d":"Typography, illustration, and print composition."},"image":{"t":"Photography — Barakat Qurtas","d":"Lightroom editing, composites, and editorial retouching."},"logo":{"t":"Logos — Barakat Qurtas","d":"Marks, wordmarks, and visual identities — a decade of drawn signs."},"posters":{"t":"Posters — Barakat Qurtas","d":"Cultural, political, and typographic poster series."},"social":{"t":"Social Media — Barakat Qurtas","d":"Instagram grids, campaigns, and digital storytelling."},"events":{"t":"Events — Barakat Qurtas","d":"Ceremony materials, banners, and event identity design."},"business":{"t":"Business Cards — Barakat Qurtas","d":"Personal and client stationery — both sides of the conversation."},"invoices":{"t":"Invoices — Barakat Qurtas","d":"Stationery systems — letterhead, invoice, and receipt."},"video":{"t":"Video — Barakat Qurtas","d":"Documentary edits, motion reels, and protocol media coverage."},"other":{"t":"Other Works — Barakat Qurtas","d":"Miscellaneous — flex banners, type experiments, and notes."}},"ku":{"home":{"t":"بەرکەت قورتاس","d":"دیزاینەری گرافیک و مۆشن"},"blog":{"t":"گۆڤارەکە — بەرکەت قورتاس","d":"تێبینی کورت لە مێزی کارەوە — لەسەر تایپۆگرافی، شوێن، و پیشەی نەرمی دیزاین."},"bio":{"t":"دیزاینەرەکە — بەرکەت قورتاس","d":"دەیەیەک پراکتیک لە هەولێر — چیرۆکەکە، کارەکە، و ئەو کەسانەی لە پشتیەوەن."},"contact":{"t":"با قسە بکەین. — بەرکەت قورتاس","d":"پڕۆژەیەک پێشکەش بکە بە نامەیەکی وردبینانە. لە ماوەی ٤٨ کاتژمێردا وەڵامی هەموو داواکارییەکی جددی دەدەمەوە."},"official":{"t":"فەرمی — بەرکەت قورتاس","d":"دیزاینی ئەدیتۆریاڵ بۆ سەرۆکایەتیی هەرێمی کوردستان."},"book":{"t":"بەرگی کتێب — بەرکەت قورتاس","d":"تایپۆگرافی، وێنەکێشان، و پێکهاتەی چاپ."},"image":{"t":"وێنەگرافی — بەرکەت قورتاس","d":"دەستکاریی Lightroom، کۆمپۆزیت، و ڕیتاچی ئەدیتۆریاڵ."},"logo":{"t":"لۆگۆ — بەرکەت قورتاس","d":"مۆر، وشە-مۆر، و ناسنامەی بینراو — دەیەیەک نیشانەی کێشراو."},"posters":{"t":"پۆستەر — بەرکەت قورتاس","d":"زنجیرە پۆستەری کلتووری، سیاسی، و تایپۆگرافی."},"social":{"t":"سۆشیال میدیا — بەرکەت قورتاس","d":"گرێدی ئینستاگرام، کەمپەین، و چیرۆکی دیجیتاڵ."},"events":{"t":"بۆنەکان — بەرکەت قورتاس","d":"کەرەستەی ڕێوڕەسم، بانێر، و دیزاینی ناسنامەی بۆنە."},"business":{"t":"کارتی بازرگانی — بەرکەت قورتاس","d":"کارتی کەسی و کڕیار — هەردوو لای گفتوگۆ."},"invoices":{"t":"پسووڵە — بەرکەت قورتاس","d":"سیستەمی نووسراو — سەرپەڕە، پسووڵە، و وەسڵ."},"video":{"t":"ڤیدیۆ — بەرکەت قورتاس","d":"مۆنتاژی دۆکیۆمێنتاری، ڕیلی مۆشن، و پۆشینی پرۆتۆکۆڵ."},"other":{"t":"کارەکانی تر — بەرکەت قورتاس","d":"جۆراوجۆر — بانێری فلێکس، تاقیکردنەوەی فۆنت، و تێبینی."}},"kmr":{"home":{"t":"Barakat Qurtas","d":"Sêwirmendê Grafîk û Motion"},"blog":{"t":"Kovar — Barakat Qurtas","d":"Notên kurt ji maseyê — li ser tîpografî, cî, û pîşeya hêdî ya sêwirandinê."},"bio":{"t":"Sêwirmend — Barakat Qurtas","d":"Deh sal pratîk li Hewlêr — çîrok, kar, û mirovên li pişt wê."},"contact":{"t":"Em biaxivin. — Barakat Qurtas","d":"Projeyek bi nameyeke baldarane pêşkêş bike. Ez di 48 saetan de bersiva her daxwazeke cidî didim."},"official":{"t":"Fermî — Barakat Qurtas","d":"Sêwirana edîtoriyal ji bo Serokatiya Herêma Kurdistanê."},"book":{"t":"Bergên Pirtûkan — Barakat Qurtas","d":"Tîpografî, wênesazî û pêkhateya çapê."},"image":{"t":"Wênekêşî — Barakat Qurtas","d":"Sererastkirina Lightroom, kompozît û retûşa edîtoriyal."},"logo":{"t":"Logo — Barakat Qurtas","d":"Nîşan, peyv-nîşan û nasnameyên dîtbarî — dehsalek nîşanên xêzkirî."},"posters":{"t":"Poster — Barakat Qurtas","d":"Rêze posterên çandî, siyasî û tîpografîk."},"social":{"t":"Medya Civakî — Barakat Qurtas","d":"Gridên Instagramê, kampanya û çîrokbêjiya dîjîtal."},"events":{"t":"Bûyer — Barakat Qurtas","d":"Materyalên merasîman, banner û sêwirana nasnameya bûyeran."},"business":{"t":"Kartên Karsaziyê — Barakat Qurtas","d":"Kartên kesane û mişterî — herdu aliyên axaftinê."},"invoices":{"t":"Fatûre — Barakat Qurtas","d":"Sîstemên nivîsgehê — serkaxez, fatûre û meqbûz."},"video":{"t":"Vîdyo — Barakat Qurtas","d":"Montaja dokumenter, reelên motion û pêşkêşkirina protokolê."},"other":{"t":"Karên Din — Barakat Qurtas","d":"Cûrbecûr — bannerên flex, ezmûnên tîpê û not."}},"ar":{"home":{"t":"بركات قرتاس","d":"مصمم جرافيك وموشن كردي"},"blog":{"t":"المدونة — بركات قرتاس","d":"ملاحظات قصيرة من المكتب — عن الطباعة، المكان، وحرفة التصميم البطيئة."},"bio":{"t":"المصمم — بركات قرتاس","d":"عقد من الممارسة في أربيل — القصة، والعمل، والأشخاص خلفه."},"contact":{"t":"لنتحدث. — بركات قرتاس","d":"قدّم مشروعك في رسالة واحدة دقيقة. أرد على كل استفسار جدي خلال ٤٨ ساعة."},"official":{"t":"رسمي — بركات قرتاس","d":"تصميم تحريري لرئاسة إقليم كردستان."},"book":{"t":"أغلفة الكتب — بركات قرتاس","d":"الطباعة والرسم وتركيب الطبع."},"image":{"t":"التصوير — بركات قرتاس","d":"تحرير Lightroom والتركيب والتنقيح التحريري."},"logo":{"t":"الشعارات — بركات قرتاس","d":"علامات وكلمات-علامات وهويات بصرية — عقد من العلامات المرسومة."},"posters":{"t":"الملصقات — بركات قرتاس","d":"سلسلة ملصقات ثقافية وسياسية وطباعية."},"social":{"t":"وسائل التواصل — بركات قرتاس","d":"شبكات إنستغرام والحملات والسرد الرقمي."},"events":{"t":"الفعاليات — بركات قرتاس","d":"مواد المراسم واللافتات وتصميم هوية الفعاليات."},"business":{"t":"بطاقات العمل — بركات قرتاس","d":"قرطاسية شخصية وللعملاء — وجها المحادثة."},"invoices":{"t":"الفواتير — بركات قرتاس","d":"أنظمة قرطاسية — ترويسة وفاتورة وإيصال."},"video":{"t":"الفيديو — بركات قرتاس","d":"مونتاج وثائقي ومقاطع موشن وتغطية البروتوكول."},"other":{"t":"أعمال أخرى — بركات قرتاس","d":"متنوعة — لافتات فليكس وتجارب خطية وملاحظات."}},"fr":{"home":{"t":"Barakat Qurtas","d":"Designer Graphique & Motion Kurde"},"blog":{"t":"Le Journal — Barakat Qurtas","d":"De brèves notes du bureau — sur la typographie, le lieu et l'artisanat lent du design."},"bio":{"t":"Le Designer — Barakat Qurtas","d":"Une décennie de pratique à Hewlêr — l'histoire, le travail et les gens derrière."},"contact":{"t":"Parlons. — Barakat Qurtas","d":"Présentez un projet en une lettre soignée. Je réponds à chaque demande sérieuse sous 48 h."},"official":{"t":"Officiel — Barakat Qurtas","d":"Design éditorial pour la Présidence de la Région du Kurdistan."},"book":{"t":"Couvertures — Barakat Qurtas","d":"Typographie, illustration et composition imprimée."},"image":{"t":"Photographie — Barakat Qurtas","d":"Retouche Lightroom, montages et retouche éditoriale."},"logo":{"t":"Logos — Barakat Qurtas","d":"Marques, logotypes et identités visuelles — une décennie de signes dessinés."},"posters":{"t":"Affiches — Barakat Qurtas","d":"Séries d'affiches culturelles, politiques et typographiques."},"social":{"t":"Réseaux sociaux — Barakat Qurtas","d":"Grilles Instagram, campagnes et narration numérique."},"events":{"t":"Événements — Barakat Qurtas","d":"Matériel de cérémonie, bannières et identité d'événement."},"business":{"t":"Cartes de visite — Barakat Qurtas","d":"Papeterie personnelle et client — les deux côtés de la conversation."},"invoices":{"t":"Factures — Barakat Qurtas","d":"Systèmes de papeterie — en-tête, facture et reçu."},"video":{"t":"Vidéo — Barakat Qurtas","d":"Montages documentaires, reels motion et couverture protocolaire."},"other":{"t":"Autres travaux — Barakat Qurtas","d":"Divers — bannières flex, expériences typographiques et notes."}}};

function resolve(pathname) {
  let seg = pathname.replace(/^\/+|\/+$/g, '').split('/');
  let lang = 'en';
  if (LANGS.includes(seg[0])) { lang = seg[0]; seg = seg.slice(1); }
  const room = seg[0] || 'design';
  const tab  = seg[1];
  const prefix = lang === 'en' ? '' : '/' + lang;
  if (room === 'design') {
    if (tab && TABS.includes(tab)) return { lang, key: tab,    canon: SITE + prefix + '/design/' + tab };
    return { lang, key: 'home', canon: SITE + (prefix || '/') };
  }
  if (ROOMS.includes(room)) return { lang, key: room, canon: SITE + prefix + '/' + room };
  return null;   // unknown → let Pages handle (404 / SPA fallback)
}

const setContent = (v) => ({ element(el) { el.setAttribute('content', v); } });
const setHref    = (v) => ({ element(el) { el.setAttribute('href', v); } });
const setText    = (v) => ({ element(el) { el.setInnerContent(v); } });
const setLangAttr = (v) => ({ element(el) { el.setAttribute('lang', v); } });

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const r = resolve(url.pathname);
  if (!r) return next();
  if (!env || !env.ASSETS) return next();

  const meta = (OG[r.lang] && OG[r.lang][r.key]) || OG.en[r.key] || OG.en.home;
  const img  = SITE + '/assets/covers/' + r.lang + '-' + r.key + '.jpg';

  try {
    const shell = await env.ASSETS.fetch(new URL('/index.html', url.origin));
    return new HTMLRewriter()
      .on('html',                             setLangAttr(r.lang))
      .on('title',                            setText(meta.t))
      .on('meta[name="description"]',         setContent(meta.d))
      .on('meta[property="og:title"]',        setContent(meta.t))
      .on('meta[property="og:description"]',  setContent(meta.d))
      .on('meta[property="og:image"]',        setContent(img))
      .on('meta[property="og:image:type"]',   setContent('image/jpeg'))
      .on('meta[property="og:image:alt"]',    setContent(meta.t))
      .on('meta[property="og:url"]',          setContent(r.canon))
      .on('meta[property="og:locale"]',       setContent(LOCALE[r.lang] || 'en_US'))
      .on('meta[name="twitter:title"]',       setContent(meta.t))
      .on('meta[name="twitter:description"]', setContent(meta.d))
      .on('meta[name="twitter:image"]',       setContent(img))
      .on('link[rel="canonical"]',            setHref(r.canon))
      .transform(shell);
  } catch (e) {
    try { return await env.ASSETS.fetch(new URL('/index.html', url.origin)); }
    catch (_) { return next(); }
  }
}
