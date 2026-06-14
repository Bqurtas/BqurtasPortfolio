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

const SITE = 'https://bqurtas.com';
const SUPA = 'https://dcnkhzrishphpismmxuu.supabase.co';             // blog posts live here
const SUPA_KEY = 'sb_publishable_FrR6Ur2yy-rOCgKk5D326w_j5rfBgV3';   // publishable (read-only, safe in client)
const LANGS = ['ku', 'kmr', 'ar', 'fr', 'tr', 'sv'];                 // en = no prefix
const ROOMS = ['blog', 'bio', 'contact'];
const TABS  = ['official','book','image','logo','posters','social','events','stationery','ai','business','invoices','video','other'];
const LOCALE = { en:'en_US', ku:'ckb_IQ', kmr:'kmr_TR', ar:'ar_IQ', fr:'fr_FR', tr:'tr_TR', sv:'sv_SE' };

const OG = {"en":{"home":{"t":"Barakat Qurtas | Design • Printing • Advertising • AI","d":"Kurdish graphic & motion designer in Hewlêr — branding, editorial, logos, posters, advertising & video. 1000+ works."},"blog":{"t":"The Journal — Barakat Qurtas","d":"Short notes from the desk — on typography, place, and the slow craft of design."},"bio":{"t":"The Designer — Barakat Qurtas","d":"A decade of practice in Hewlêr — the story, the work, and the people behind it."},"contact":{"t":"Let's talk. — Barakat Qurtas","d":"Pitch a project in one careful letter. I reply to every serious enquiry within 48 hours."},"official":{"t":"Official — Barakat Qurtas","d":"Editorial design for the Presidency of the Kurdistan Region."},"book":{"t":"Book Covers — Barakat Qurtas","d":"Typography, illustration, and print composition."},"image":{"t":"Photography — Barakat Qurtas","d":"Lightroom editing, composites, and editorial retouching."},"logo":{"t":"Logos — Barakat Qurtas","d":"Marks, wordmarks, and visual identities — a decade of drawn signs."},"posters":{"t":"Posters — Barakat Qurtas","d":"Cultural, political, and typographic poster series."},"social":{"t":"Social Media — Barakat Qurtas","d":"Instagram grids, campaigns, and digital storytelling."},"events":{"t":"Events — Barakat Qurtas","d":"Ceremony materials, banners, and event identity design."},"business":{"t":"Business Cards — Barakat Qurtas","d":"Personal and client stationery — both sides of the conversation."},"invoices":{"t":"Invoices — Barakat Qurtas","d":"Stationery systems — letterhead, invoice, and receipt."},"video":{"t":"Video — Barakat Qurtas","d":"Documentary edits, motion reels, and protocol media coverage."},"other":{"t":"Other Works — Barakat Qurtas","d":"Miscellaneous — flex banners, type experiments, and notes."},"panjamor":{"t":"Panjamor — Barakat Qurtas","d":"A studio for brand identity, editorial, and print — where every piece carries a real mark of care. Your project, signed by hand."},"stationery":{"t":"Stationery — Barakat Qurtas","d":"Business cards, letterheads, invoices & receipts — the quiet system behind a brand."},"ai":{"t":"AI — Barakat Qurtas","d":"AI-assisted posters, video, and visual experiments — a new tool in an old craft."},"design":{"t":"All Work — Barakat Qurtas","d":"Every discipline in one place — brand identity, editorial, books, logos, posters, advertising & video."}},"ku":{"home":{"t":"بەرەکات قورتاس | دیزاین • چاپ • بانگەشە • ئای","d":"دیزاینەری گرافیک و مۆشن لە هەولێر — ناسنامەی بازرگانی، ئەدیتۆریاڵ، کتێب، لۆگۆ، پۆستەر، بانگەشە و ڤیدیۆ. زیاتر لە ١٠٠٠ کار. با هی تۆشت بۆ دروست بکەین."},"blog":{"t":"گۆڤارەکە — بەرەکات قورتاس","d":"تێبینی کورت لە مێزی کارەوە — لەسەر تایپۆگرافی، شوێن، و پیشەی نەرمی دیزاین."},"bio":{"t":"دیزاینەرەکە — بەرەکات قورتاس","d":"دەیەیەک پراکتیک لە هەولێر — چیرۆکەکە، کارەکە، و ئەو کەسانەی لە پشتیەوەن."},"contact":{"t":"با قسە بکەین. — بەرەکات قورتاس","d":"پڕۆژەیەک پێشکەش بکە بە نامەیەکی وردبینانە. لە ماوەی ٤٨ کاتژمێردا وەڵامی هەموو داواکارییەکی جددی دەدەمەوە."},"official":{"t":"فەرمی — بەرەکات قورتاس","d":"دیزاینی ئەدیتۆریاڵ بۆ سەرۆکایەتیی هەرێمی کوردستان."},"book":{"t":"بەرگی کتێب — بەرەکات قورتاس","d":"تایپۆگرافی، وێنەکێشان، و پێکهاتەی چاپ."},"image":{"t":"وێنەگرافی — بەرەکات قورتاس","d":"دەستکاریی Lightroom، کۆمپۆزیت، و ڕیتاچی ئەدیتۆریاڵ."},"logo":{"t":"لۆگۆ — بەرەکات قورتاس","d":"مۆر، وشە-مۆر، و ناسنامەی بینراو — دەیەیەک نیشانەی کێشراو."},"posters":{"t":"پۆستەر — بەرەکات قورتاس","d":"زنجیرە پۆستەری کلتووری، سیاسی، و تایپۆگرافی."},"social":{"t":"سۆشیال میدیا — بەرەکات قورتاس","d":"گرێدی ئینستاگرام، کەمپەین، و چیرۆکی دیجیتاڵ."},"events":{"t":"بۆنەکان — بەرەکات قورتاس","d":"کەرەستەی ڕێوڕەسم، بانێر، و دیزاینی ناسنامەی بۆنە."},"business":{"t":"کارتی بازرگانی — بەرەکات قورتاس","d":"کارتی کەسی و کڕیار — هەردوو لای گفتوگۆ."},"invoices":{"t":"پسووڵە — بەرەکات قورتاس","d":"سیستەمی نووسراو — سەرپەڕە، پسووڵە، و وەسڵ."},"video":{"t":"ڤیدیۆ — بەرەکات قورتاس","d":"مۆنتاژی دۆکیۆمێنتاری، ڕیلی مۆشن، و پۆشینی پرۆتۆکۆڵ."},"other":{"t":"کارەکانی تر — بەرەکات قورتاس","d":"جۆراوجۆر — بانێری فلێکس، تاقیکردنەوەی فۆنت، و تێبینی."},"panjamor":{"t":"پەنجەمۆر — بەرەکات قورتاس","d":"ستۆدیۆیەک بۆ ناسنامەی بران، ئەدیتۆریاڵ و چاپ — لەوێ هەر بەرهەمێک مۆری ڕاستەقینەی خۆشەویستی هەڵدەگرێت. پڕۆژەکەت، بە دەست واژووکراو."},"stationery":{"t":"نووسراو — بەرەکات قورتاس","d":"کارتی بازرگانی، سەرپەڕە، پسووڵە و وەسڵ — سیستەمی بێدەنگی پشت ناسنامەیەک."},"ai":{"t":"AI — بەرەکات قورتاس","d":"پۆستەر، ڤیدیۆ و تاقیکردنەوەی بینراوی بە یارمەتی AI — ئامرازێکی نوێ لە پیشەیەکی کۆن."},"design":{"t":"هەموو کار — بەرەکات قورتاس","d":"هەموو پیشەیەک لە یەک شوێندا — ناسنامەی بازرگانی، ئەدیتۆریاڵ، کتێب، لۆگۆ، پۆستەر، بانگەشە و ڤیدیۆ."}},"kmr":{"home":{"t":"Barakat Qurtas | Sêwiran • Çap • Reklam • AI","d":"Sêwirmendê grafîk û motion li Hewlêr — nasname, edîtoriyal, pirtûk, logo, poster, reklam û vîdyo. Zêdetirî 1000 kar. Werin em ya te biafirînin."},"blog":{"t":"Kovar — Barakat Qurtas","d":"Notên kurt ji maseyê — li ser tîpografî, cî, û pîşeya hêdî ya sêwirandinê."},"bio":{"t":"Sêwirmend — Barakat Qurtas","d":"Deh sal pratîk li Hewlêr — çîrok, kar, û mirovên li pişt wê."},"contact":{"t":"Em biaxivin. — Barakat Qurtas","d":"Projeyek bi nameyeke baldarane pêşkêş bike. Ez di 48 saetan de bersiva her daxwazeke cidî didim."},"official":{"t":"Fermî — Barakat Qurtas","d":"Sêwirana edîtoriyal ji bo Serokatiya Herêma Kurdistanê."},"book":{"t":"Bergên Pirtûkan — Barakat Qurtas","d":"Tîpografî, wênesazî û pêkhateya çapê."},"image":{"t":"Wênekêşî — Barakat Qurtas","d":"Sererastkirina Lightroom, kompozît û retûşa edîtoriyal."},"logo":{"t":"Logo — Barakat Qurtas","d":"Nîşan, peyv-nîşan û nasnameyên dîtbarî — dehsalek nîşanên xêzkirî."},"posters":{"t":"Poster — Barakat Qurtas","d":"Rêze posterên çandî, siyasî û tîpografîk."},"social":{"t":"Medya Civakî — Barakat Qurtas","d":"Gridên Instagramê, kampanya û çîrokbêjiya dîjîtal."},"events":{"t":"Bûyer — Barakat Qurtas","d":"Materyalên merasîman, banner û sêwirana nasnameya bûyeran."},"business":{"t":"Kartên Karsaziyê — Barakat Qurtas","d":"Kartên kesane û mişterî — herdu aliyên axaftinê."},"invoices":{"t":"Fatûre — Barakat Qurtas","d":"Sîstemên nivîsgehê — serkaxez, fatûre û meqbûz."},"video":{"t":"Vîdyo — Barakat Qurtas","d":"Montaja dokumenter, reelên motion û pêşkêşkirina protokolê."},"other":{"t":"Karên Din — Barakat Qurtas","d":"Cûrbecûr — bannerên flex, ezmûnên tîpê û not."},"panjamor":{"t":"Panjamor — Barakat Qurtas","d":"Studyoyek ji bo nasnameya brandê, edîtoriyal û çapê — li wir her parçeyek nîşaneke rastîn a baldariyê hildigire. Projeya te, bi destan îmzekirî."},"stationery":{"t":"Nivîsgeh — Barakat Qurtas","d":"Kartên karsaziyê, serkaxez, fatûre û meqbûz — sîstema bêdeng a li pişt brandê."},"ai":{"t":"AI — Barakat Qurtas","d":"Poster, vîdyo û ezmûnên dîtbarî bi alîkariya AI — amûreke nû di pîşeyeke kevn de."},"design":{"t":"Hemû Kar — Barakat Qurtas","d":"Her dîsîplîn li yek cî — nasname, edîtoriyal, pirtûk, logo, poster, reklam û vîdyo."}},"ar":{"home":{"t":"بركات قرطاس | تصميم • طباعة • إعلان • ذكاء اصطناعي","d":"مصمم جرافيك وموشن كردي في أربيل — هوية بصرية، تصميم تحريري، أغلفة كتب، شعارات، ملصقات، إعلان وفيديو. أكثر من ١٠٠٠ عمل. لنصمّم مشروعك معاً."},"blog":{"t":"المدونة — بركات قرطاس","d":"ملاحظات قصيرة من المكتب — عن الطباعة، المكان، وحرفة التصميم البطيئة."},"bio":{"t":"المصمم — بركات قرطاس","d":"عقد من الممارسة في أربيل — القصة، والعمل، والأشخاص خلفه."},"contact":{"t":"لنتحدث. — بركات قرطاس","d":"قدّم مشروعك في رسالة واحدة دقيقة. أرد على كل استفسار جدي خلال ٤٨ ساعة."},"official":{"t":"رسمي — بركات قرطاس","d":"تصميم تحريري لرئاسة إقليم كردستان."},"book":{"t":"أغلفة الكتب — بركات قرطاس","d":"الطباعة والرسم وتركيب الطبع."},"image":{"t":"التصوير — بركات قرطاس","d":"تحرير Lightroom والتركيب والتنقيح التحريري."},"logo":{"t":"الشعارات — بركات قرطاس","d":"علامات وكلمات-علامات وهويات بصرية — عقد من العلامات المرسومة."},"posters":{"t":"الملصقات — بركات قرطاس","d":"سلسلة ملصقات ثقافية وسياسية وطباعية."},"social":{"t":"وسائل التواصل — بركات قرطاس","d":"شبكات إنستغرام والحملات والسرد الرقمي."},"events":{"t":"الفعاليات — بركات قرطاس","d":"مواد المراسم واللافتات وتصميم هوية الفعاليات."},"business":{"t":"بطاقات العمل — بركات قرطاس","d":"قرطاسية شخصية وللعملاء — وجها المحادثة."},"invoices":{"t":"الفواتير — بركات قرطاس","d":"أنظمة قرطاسية — ترويسة وفاتورة وإيصال."},"video":{"t":"الفيديو — بركات قرطاس","d":"مونتاج وثائقي ومقاطع موشن وتغطية البروتوكول."},"other":{"t":"أعمال أخرى — بركات قرطاس","d":"متنوعة — لافتات فليكس وتجارب خطية وملاحظات."},"panjamor":{"t":"بنجمور — بركات قرطاس","d":"استوديو للهوية البصرية والتصميم التحريري والطباعة — حيث يحمل كل عمل بصمة عناية حقيقية. مشروعك، موقّع باليد."},"stationery":{"t":"القرطاسية — بركات قرطاس","d":"بطاقات العمل، الترويسات، الفواتير والإيصالات — النظام الهادئ خلف الهوية."},"ai":{"t":"الذكاء الاصطناعي — بركات قرطاس","d":"ملصقات وفيديو وتجارب بصرية بمساعدة الذكاء الاصطناعي — أداة جديدة في حرفة قديمة."},"design":{"t":"كل الأعمال — بركات قرطاس","d":"كل تخصص في مكان واحد — الهوية البصرية، التحرير، الكتب، الشعارات، الملصقات، الإعلان والفيديو."}},"fr":{"home":{"t":"Barakat Qurtas | Design • Impression • Publicité • IA","d":"Designer graphique & motion kurde à Hewlêr — identité de marque, éditorial, livres, logos, affiches, publicité & vidéo. 1000+ travaux. Créons le vôtre."},"blog":{"t":"Le Journal — Barakat Qurtas","d":"De brèves notes du bureau — sur la typographie, le lieu et l'artisanat lent du design."},"bio":{"t":"Le Designer — Barakat Qurtas","d":"Une décennie de pratique à Hewlêr — l'histoire, le travail et les gens derrière."},"contact":{"t":"Parlons. — Barakat Qurtas","d":"Présentez un projet en une lettre soignée. Je réponds à chaque demande sérieuse sous 48 h."},"official":{"t":"Officiel — Barakat Qurtas","d":"Design éditorial pour la Présidence de la Région du Kurdistan."},"book":{"t":"Couvertures — Barakat Qurtas","d":"Typographie, illustration et composition imprimée."},"image":{"t":"Photographie — Barakat Qurtas","d":"Retouche Lightroom, montages et retouche éditoriale."},"logo":{"t":"Logos — Barakat Qurtas","d":"Marques, logotypes et identités visuelles — une décennie de signes dessinés."},"posters":{"t":"Affiches — Barakat Qurtas","d":"Séries d'affiches culturelles, politiques et typographiques."},"social":{"t":"Réseaux sociaux — Barakat Qurtas","d":"Grilles Instagram, campagnes et narration numérique."},"events":{"t":"Événements — Barakat Qurtas","d":"Matériel de cérémonie, bannières et identité d'événement."},"business":{"t":"Cartes de visite — Barakat Qurtas","d":"Papeterie personnelle et client — les deux côtés de la conversation."},"invoices":{"t":"Factures — Barakat Qurtas","d":"Systèmes de papeterie — en-tête, facture et reçu."},"video":{"t":"Vidéo — Barakat Qurtas","d":"Montages documentaires, reels motion et couverture protocolaire."},"other":{"t":"Autres travaux — Barakat Qurtas","d":"Divers — bannières flex, expériences typographiques et notes."},"panjamor":{"t":"Panjamor — Barakat Qurtas","d":"Un studio d'identité de marque, d'édition et d'impression — où chaque pièce porte une véritable marque de soin. Votre projet, signé à la main."},"stationery":{"t":"Papeterie — Barakat Qurtas","d":"Cartes de visite, en-têtes, factures et reçus — le système discret derrière une marque."},"ai":{"t":"IA — Barakat Qurtas","d":"Affiches, vidéos et expériences visuelles assistées par IA — un nouvel outil dans un art ancien."},"design":{"t":"Tout le travail — Barakat Qurtas","d":"Chaque discipline en un seul endroit — identité, éditorial, livres, logos, affiches, publicité et vidéo."}},"tr":{"home":{"t":"Barakat Qurtas | Tasarım • Baskı • Reklamcılık • AI","d":"Hewlêr'deki Kürt grafik ve hareket tasarımcısı — marka kimliği, editoryal, kitaplar, logolar, posterler, reklam ve video. 1000'den fazla çalışma. Haydi sizinkini yaratalım."},"blog":{"t":"Dergi — Barakat Qurtas","d":"Tipografi, mekan ve yavaş tasarım sanatı üzerine masadan kısa notlar."},"bio":{"t":"Tasarımcı — Barakat Qurtas","d":"Hewlêr'de on yıllık pratik; hikaye, çalışma ve arkasındaki insanlar."},"contact":{"t":"Hadi konuşalım. — Barakat Qurtas","d":"Bir projeyi dikkatli bir mektupla anlatın. Her ciddi soruya 48 saat içinde cevap veriyorum."},"official":{"t":"Resmi — Barakat Qurtas","d":"Kürdistan Bölgesi Başkanlığı için editoryal tasarım."},"book":{"t":"Kitap Kapakları — Barakat Qurtas","d":"Tipografi, illüstrasyon ve baskı kompozisyonu."},"image":{"t":"Fotoğrafçılık — Barakat Qurtas","d":"Lightroom düzenleme, kompozitler ve editoryal rötuşlama."},"logo":{"t":"Logolar — Barakat Qurtas","d":"İşaretler, marka işaretleri ve görsel kimlikler; on yıllık çizilmiş işaretler."},"posters":{"t":"Posterler — Barakat Qurtas","d":"Kültürel, politik ve tipografik poster serisi."},"social":{"t":"Sosyal Medya — Barakat Qurtas","d":"Instagram tabloları, kampanyaları ve dijital hikaye anlatımı."},"events":{"t":"Olaylar — Barakat Qurtas","d":"Tören malzemeleri, afişler ve etkinlik kimlik tasarımı."},"business":{"t":"Kartvizitler — Barakat Qurtas","d":"Kişisel ve müşteri kırtasiye malzemeleri - konuşmanın her iki tarafı."},"invoices":{"t":"Faturalar — Barakat Qurtas","d":"Kırtasiye sistemleri – antetli kağıt, fatura ve makbuz."},"video":{"t":"Video — Barakat Qurtas","d":"Belgesel düzenlemeleri, hareketli makaralar ve protokol medya kapsamı."},"other":{"t":"Diğer Çalışmalar — Barakat Qurtas","d":"Çeşitli - esnek pankartlar, yazı deneyleri ve notlar."},"panjamor":{"t":"Panjamor — Barakat Qurtas","d":"Marka kimliği, editöryel ve baskı için bir stüdyo — her parçanın gerçek bir özen izi taşıdığı yer. Projeniz, elle imzalanmış."},"stationery":{"t":"Kırtasiye — Barakat Qurtas","d":"Kartvizitler, antetli kağıtlar, faturalar ve makbuzlar — markanın arkasındaki sessiz sistem."},"ai":{"t":"AI — Barakat Qurtas","d":"AI destekli posterler, video ve görsel denemeler — eski bir zanaatta yeni bir araç."},"design":{"t":"Tüm İşler — Barakat Qurtas","d":"Her disiplin tek yerde — marka kimliği, editoryal, kitaplar, logolar, posterler, reklam ve video."}},"sv":{"home":{"t":"Barakat Qurtas | Design • Tryck • Reklam • AI","d":"Kurdisk grafik- och rörelsedesigner i Hewlêr — varumärkesidentitet, redaktionell, böcker, logotyper, affischer, reklam och video. 1000+ fungerar. Låt oss skapa din."},"blog":{"t":"Tidningen — Barakat Qurtas","d":"Korta anteckningar från skrivbordet — om typografi, plats och designens långsamma hantverk."},"bio":{"t":"Designern — Barakat Qurtas","d":"Ett decennium av praktik i Hewlêr — historien, verket och människorna bakom det."},"contact":{"t":"Låt oss prata. — Barakat Qurtas","d":"Pitch ett projekt i ett noggrant brev. Jag svarar på alla seriösa förfrågningar inom 48 timmar."},"official":{"t":"Officiell — Barakat Qurtas","d":"Redaktionell design för ordförandeskapet i Kurdistan-regionen."},"book":{"t":"Bokomslag — Barakat Qurtas","d":"Typografi, illustration och tryckkomposition."},"image":{"t":"Fotografi — Barakat Qurtas","d":"Lightroom-redigering, kompositer och redaktionell retuschering."},"logo":{"t":"Logotyper — Barakat Qurtas","d":"Märken, ordmärken och visuella identiteter — ett decennium av ritade skyltar."},"posters":{"t":"Affischer — Barakat Qurtas","d":"Kulturella, politiska och typografiska affischserier."},"social":{"t":"Sociala medier — Barakat Qurtas","d":"Instagram-rutnät, kampanjer och digitalt berättande."},"events":{"t":"Händelser — Barakat Qurtas","d":"Ceremonimaterial, banderoller och evenemangsidentitetsdesign."},"business":{"t":"Visitkort — Barakat Qurtas","d":"Personligt brevpapper och kundbrev - båda sidor av samtalet."},"invoices":{"t":"Fakturor — Barakat Qurtas","d":"Papperssystem — brevhuvud, faktura och kvitto."},"video":{"t":"Video — Barakat Qurtas","d":"Dokumentärredigeringar, rörelserullar och protokollmediebevakning."},"other":{"t":"Andra verk — Barakat Qurtas","d":"Övrigt — flex banners, typexperiment och anteckningar."},"panjamor":{"t":"Panjamor — Barakat Qurtas","d":"En studio för varumärkesidentitet, redaktionellt och tryck — där varje verk bär ett äkta märke av omsorg. Ditt projekt, signerat för hand."},"stationery":{"t":"Trycksaker — Barakat Qurtas","d":"Visitkort, brevhuvuden, fakturor och kvitton — det tysta systemet bakom ett varumärke."},"ai":{"t":"AI — Barakat Qurtas","d":"AI-assisterade affischer, video och visuella experiment — ett nytt verktyg i ett gammalt hantverk."},"design":{"t":"Allt arbete — Barakat Qurtas","d":"Varje disciplin på ett ställe — varumärke, redaktionellt, böcker, logotyper, affischer, reklam och video."}}};

function resolve(pathname) {
  let seg = pathname.replace(/^\/+|\/+$/g, '').split('/');
  let lang = 'en';
  if (LANGS.includes(seg[0])) { lang = seg[0]; seg = seg.slice(1); }
  const first = seg[0] || '';
  const prefix = lang === 'en' ? '' : '/' + lang;
  if (first === '') return { lang, key: 'home', canon: SITE + (prefix || '/') };   // the hero / landing
  if (first === 'design') {
    const tab = seg[1];
    if (tab && TABS.includes(tab)) return { lang, key: tab, canon: SITE + prefix + '/design/' + tab };
    return { lang, key: 'design', canon: SITE + prefix + '/design' };   // the All Work room — its own cover
  }
  if (first === 'panjamor' || first === 'pencemor') return { lang, key: 'panjamor', canon: SITE + prefix + '/panjamor' };
  if (first === 'blog' && seg[1]) return { lang, key: 'blogpost', slug: seg[1], canon: SITE + prefix + '/blog/' + seg[1] };
  if (ROOMS.includes(first)) return { lang, key: first, canon: SITE + prefix + '/' + first };
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

  let meta, img, imgType = 'image/jpeg';
  if (r.key === 'blogpost') {
    // a single blog post — fetch it from Supabase so the share shows ITS cover + title
    const id = parseInt(r.slug, 10);
    let post = null;
    if (id) {
      try {
        const res = await fetch(SUPA + '/rest/v1/posts?id=eq.' + id + '&select=title,subtitle,cover,i18n&limit=1',
          { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY } });
        if (res.ok) { const rows = await res.json(); post = Array.isArray(rows) ? rows[0] : null; }
      } catch (e) {}
    }
    if (post) {
      const tr = (post.i18n && post.i18n[r.lang]) || {};
      const blogD = (OG[r.lang] && OG[r.lang].blog && OG[r.lang].blog.d) || OG.en.blog.d;
      meta = { t: String(tr.title || post.title || 'Journal').trim() + ' — Barakat Qurtas',
               d: String(tr.subtitle || post.subtitle || blogD).trim() };
      img  = (post.cover && /^https?:\/\//.test(post.cover)) ? post.cover : (SITE + '/assets/covers/' + r.lang + '-blog.jpg?v=3');
      imgType = /\.png(\?|$)/i.test(img) ? 'image/png' : /\.webp(\?|$)/i.test(img) ? 'image/webp' : 'image/jpeg';
    } else {
      meta = (OG[r.lang] && OG[r.lang].blog) || OG.en.blog;
      img  = SITE + '/assets/covers/' + r.lang + '-blog.jpg?v=3';
    }
  } else {
    meta = (OG[r.lang] && OG[r.lang][r.key]) || OG.en[r.key] || OG.en.home;
    img  = SITE + '/assets/covers/' + r.lang + '-' + r.key + '.jpg?v=3';
  }

  // the HTML shell must always revalidate so a deploy's new ?v= asset links are
  // picked up immediately (the ?v-versioned CSS/JS/images keep their long cache)
  const FRESH = 'public, max-age=0, must-revalidate';
  /* Per-request nonce → a strong, XSS-effective Content-Security-Policy with NO
     'unsafe-inline' for scripts. Every <script> in the shell gets this nonce
     below; 'strict-dynamic' then trusts whatever those scripts load (GA, Pixel,
     Umami…). 'unsafe-inline' https: are ignored by modern browsers (they honour
     the nonce) but keep very old browsers working. */
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const CSP = [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'",
    "frame-ancestors 'self'", "form-action 'self'", "upgrade-insecure-requests",
    "script-src 'nonce-" + nonce + "' 'strict-dynamic' 'unsafe-inline' https:",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "font-src 'self' data: https://cdn.jsdelivr.net",
    "img-src 'self' data: blob: https://cdn.jsdelivr.net https://raw.githubusercontent.com https://images.weserv.nl https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com",
    "media-src 'self' blob: https://cdn.jsdelivr.net https://raw.githubusercontent.com",
    "connect-src 'self' https://cloud.umami.is https://api.umami.is https://gateway.umami.is https://*.supabase.co https://api.github.com https://api.web3forms.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://cdn.jsdelivr.net https://raw.githubusercontent.com",
    "frame-src 'self'",
    "worker-src 'self' blob:"
  ].join('; ');
  const withFresh = (res) => {
    const headers = new Headers(res.headers);
    headers.set('Cache-Control', FRESH);
    headers.set('Content-Security-Policy', CSP);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  };
  const addNonce = { element(el) { el.setAttribute('nonce', nonce); } };

  try {
    const shell = await env.ASSETS.fetch(new URL('/index.html', url.origin));
    const out = new HTMLRewriter()
      .on('script',                           addNonce)
      .on('html',                             setLangAttr(r.lang))
      .on('title',                            setText(meta.t))
      .on('meta[name="description"]',         setContent(meta.d))
      .on('meta[property="og:title"]',        setContent(meta.t))
      .on('meta[property="og:description"]',  setContent(meta.d))
      .on('meta[property="og:image"]',        setContent(img))
      .on('meta[property="og:image:type"]',   setContent(imgType))
      .on('meta[property="og:image:alt"]',    setContent(meta.t))
      .on('meta[property="og:url"]',          setContent(r.canon))
      .on('meta[property="og:locale"]',       setContent(LOCALE[r.lang] || 'en_US'))
      .on('meta[name="twitter:title"]',       setContent(meta.t))
      .on('meta[name="twitter:description"]', setContent(meta.d))
      .on('meta[name="twitter:image"]',       setContent(img))
      .on('link[rel="canonical"]',            setHref(r.canon))
      .transform(shell);
    return withFresh(out);
  } catch (e) {
    try {
      const shell = await env.ASSETS.fetch(new URL('/index.html', url.origin));
      return withFresh(new HTMLRewriter().on('script', addNonce).transform(shell));
    } catch (_) { return next(); }
  }
}
