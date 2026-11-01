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

import { MEDIA_ARCHIVE_ROUTES } from './_media-archive-routes.js';
import { parseWorkPath, serveWorkPage } from './_work-page.js';
import { untransformedDocument } from './_untransformed.js';
import { listPublishedPosts, getPublishedPost, cmsContentDates } from './api/_cms.js';
import { readRequestBytes } from './api/_session.js';
import { rewritePublicPortrait, rewritePortraitSitemap } from './api/_portrait.js';
import { LOCALIZED_COPY } from './_localized-copy.js';
import { rewritePageSchema } from './_page-schema.js';
import { articleContent, rewriteArticleContent } from './_article-content.js';

const SITE = 'https://bqurtas.com';
const LANGS = ['ku', 'kmr', 'ar', 'fr', 'tr', 'sv'];                 // en = no prefix
const ROOMS = ['blog', 'bio', 'contact'];
const TABS  = ['logo','official','book','posters','social','events','stationery','image','video','other','certificate'];
const LOCALE = { en:'en_US', ku:'ckb_IQ', kmr:'kmr_TR', ar:'ar_IQ', fr:'fr_FR', tr:'tr_TR', sv:'sv_SE' };
// The author's name written in each language's own script — so AI engines and
// Google read & recognise him correctly per language on every blog post.
const AUTHOR_NAME = { en:'Barakat Qurtas', ku:'بەرەکات قورتاس', kmr:'Barakat Qurtas', ar:'بركات قرطاس', fr:'Barakat Qurtas', tr:'Barakat Qurtas', sv:'Barakat Qurtas' };
const BCP47 = { en:'en', ku:'ckb', kmr:'ku', ar:'ar', fr:'fr', tr:'tr', sv:'sv' };
const LANG_PREFIX = { en:'', ku:'/ku', kmr:'/kmr', ar:'/ar', fr:'/fr', tr:'/tr', sv:'/sv' };

const OG = {"en":{"home":{"t":"Barakat Qurtas | Design • Printing • Advertising • AI","d":"Kurdish graphic & motion designer in Hewlêr — branding, editorial, logos, posters, advertising & video. 1000+ works."},"blog":{"t":"The Journal — Barakat Qurtas","d":"Short notes from the desk — on typography, place, and the slow craft of design."},"bio":{"t":"The Designer — Barakat Qurtas","d":"A decade of practice in Hewlêr — the story, the work, and the people behind it."},"contact":{"t":"Let's talk. — Barakat Qurtas","d":"Pitch a project in one careful letter. I reply to every serious enquiry within 48 hours."},"official":{"t":"Official — Barakat Qurtas","d":"Editorial design for the Presidency of the Kurdistan Region."},"book":{"t":"Book Covers — Barakat Qurtas","d":"Typography, illustration, and print composition."},"image":{"t":"Photography — Barakat Qurtas","d":"Lightroom editing, composites, and editorial retouching."},"logo":{"t":"Logos — Barakat Qurtas","d":"Marks, wordmarks, and visual identities — a decade of drawn signs."},"posters":{"t":"Posters — Barakat Qurtas","d":"Cultural, political, and typographic poster series."},"social":{"t":"Social Media — Barakat Qurtas","d":"Instagram grids, campaigns, and digital storytelling."},"events":{"t":"Events — Barakat Qurtas","d":"Ceremony materials, banners, and event identity design."},"business":{"t":"Business Cards — Barakat Qurtas","d":"Personal and client stationery — both sides of the conversation."},"invoices":{"t":"Invoices — Barakat Qurtas","d":"Stationery systems — letterhead, invoice, and receipt."},"video":{"t":"Video — Barakat Qurtas","d":"Documentary edits, motion reels, and protocol media coverage."},"other":{"t":"Other Works — Barakat Qurtas","d":"Miscellaneous — flex banners, type experiments, and notes."},"stationery":{"t":"Stationery — Barakat Qurtas","d":"Business cards, letterheads, invoices & receipts — the quiet system behind a brand."},"design":{"t":"All Work — Barakat Qurtas","d":"Every discipline in one place — brand identity, editorial, books, logos, posters, advertising & video."}},"ku":{"home":{"t":"بەرەکات قورتاس | دیزاین • چاپ • بانگەشە • زیرەکیی دەستکرد","d":"دیزاینەری گرافیک و جوڵە لە هەولێر — ناسنامەی بازرگانی، ئەدیتۆریاڵ، کتێب، لۆگۆ، پۆستەر، بانگەشە و ڤیدیۆ. زیاتر لە ١٠٠٠ کار. با هی تۆشت بۆ دروست بکەین."},"blog":{"t":"گۆڤارەکە — بەرەکات قورتاس","d":"تێبینی کورت لە مێزی کارەوە — لەسەر تایپۆگرافی، شوێن، و پیشەی نەرمی دیزاین."},"bio":{"t":"دیزاینەرەکە — بەرەکات قورتاس","d":"دەیەیەک پراکتیک لە هەولێر — چیرۆکەکە، کارەکە، و ئەو کەسانەی لە پشتیەوەن."},"contact":{"t":"با قسە بکەین. — بەرەکات قورتاس","d":"پڕۆژەیەک پێشکەش بکە بە نامەیەکی وردبینانە. لە ماوەی ٤٨ کاتژمێردا وەڵامی هەموو داواکارییەکی جددی دەدەمەوە."},"official":{"t":"فەرمی — بەرەکات قورتاس","d":"دیزاینی ئەدیتۆریاڵ بۆ سەرۆکایەتیی هەرێمی کوردستان."},"book":{"t":"بەرگی کتێب — بەرەکات قورتاس","d":"تایپۆگرافی، وێنەکێشان، و پێکهاتەی چاپ."},"image":{"t":"وێنەگرافی — بەرەکات قورتاس","d":"دەستکاریی وێنە، کۆمپۆزیت، و ڕیتاچی ئەدیتۆریاڵ."},"logo":{"t":"لۆگۆ — بەرەکات قورتاس","d":"مۆر، وشە-مۆر، و ناسنامەی بینراو — دەیەیەک نیشانەی کێشراو."},"posters":{"t":"پۆستەر — بەرەکات قورتاس","d":"زنجیرە پۆستەری کلتووری، سیاسی، و تایپۆگرافی."},"social":{"t":"سۆشیال میدیا — بەرەکات قورتاس","d":"گرێدی ئینستاگرام، کەمپەین، و چیرۆکی دیجیتاڵ."},"events":{"t":"بۆنەکان — بەرەکات قورتاس","d":"کەرەستەی ڕێوڕەسم، بانێر، و دیزاینی ناسنامەی بۆنە."},"business":{"t":"کارتی بازرگانی — بەرەکات قورتاس","d":"کارتی کەسی و کڕیار — هەردوو لای گفتوگۆ."},"invoices":{"t":"پسووڵە — بەرەکات قورتاس","d":"سیستەمی نووسراو — سەرپەڕە، پسووڵە، و وەسڵ."},"video":{"t":"ڤیدیۆ — بەرەکات قورتاس","d":"مۆنتاژی دۆکیۆمێنتاری، ڕیلی جوڵە، و پۆشینی پرۆتۆکۆڵ."},"other":{"t":"کارەکانی تر — بەرەکات قورتاس","d":"جۆراوجۆر — بانێری فلێکس، تاقیکردنەوەی فۆنت، و تێبینی."},"stationery":{"t":"نووسراو — بەرەکات قورتاس","d":"کارتی بازرگانی، سەرپەڕە، پسووڵە و وەسڵ — سیستەمی بێدەنگی پشت ناسنامەیەک."},"design":{"t":"هەموو کار — بەرەکات قورتاس","d":"هەموو پیشەیەک لە یەک شوێندا — ناسنامەی بازرگانی، ئەدیتۆریاڵ، کتێب، لۆگۆ، پۆستەر، بانگەشە و ڤیدیۆ."}},"kmr":{"home":{"t":"Barakat Qurtas | Sêwiran • Çap • Reklam • Aqilmendiya Çêkirî","d":"Sêwirmendê grafîk û tevger li Hewlêr — nasname, edîtoriyal, pirtûk, logo, poster, reklam û vîdyo. Zêdetirî 1000 kar. Werin em ya te biafirînin."},"blog":{"t":"Kovar — Barakat Qurtas","d":"Notên kurt ji maseyê — li ser tîpografî, cî, û pîşeya hêdî ya sêwirandinê."},"bio":{"t":"Sêwirmend — Barakat Qurtas","d":"Deh sal pratîk li Hewlêr — çîrok, kar, û mirovên li pişt wê."},"contact":{"t":"Em biaxivin. — Barakat Qurtas","d":"Projeyek bi nameyeke baldarane pêşkêş bike. Ez di 48 saetan de bersiva her daxwazeke cidî didim."},"official":{"t":"Fermî — Barakat Qurtas","d":"Sêwirana edîtoriyal ji bo Serokatiya Herêma Kurdistanê."},"book":{"t":"Bergên Pirtûkan — Barakat Qurtas","d":"Tîpografî, wênesazî û pêkhateya çapê."},"image":{"t":"Wênekêşî — Barakat Qurtas","d":"Sererastkirina Lightroom, kompozît û retûşa edîtoriyal."},"logo":{"t":"Logo — Barakat Qurtas","d":"Nîşan, peyv-nîşan û nasnameyên dîtbarî — dehsalek nîşanên xêzkirî."},"posters":{"t":"Poster — Barakat Qurtas","d":"Rêze posterên çandî, siyasî û tîpografîk."},"social":{"t":"Medya Civakî — Barakat Qurtas","d":"Gridên Instagramê, kampanya û çîrokbêjiya dîjîtal."},"events":{"t":"Bûyer — Barakat Qurtas","d":"Materyalên merasîman, banner û sêwirana nasnameya bûyeran."},"business":{"t":"Kartên Karsaziyê — Barakat Qurtas","d":"Kartên kesane û mişterî — herdu aliyên axaftinê."},"invoices":{"t":"Fatûre — Barakat Qurtas","d":"Sîstemên nivîsgehê — serkaxez, fatûre û meqbûz."},"video":{"t":"Vîdyo — Barakat Qurtas","d":"Montaja dokumenter, reelên tevgerê û pêşkêşkirina protokolê."},"other":{"t":"Karên Din — Barakat Qurtas","d":"Cûrbecûr — bannerên flex, ezmûnên tîpê û not."},"stationery":{"t":"Nivîsgeh — Barakat Qurtas","d":"Kartên karsaziyê, serkaxez, fatûre û meqbûz — sîstema bêdeng a li pişt brandê."},"design":{"t":"Hemû Kar — Barakat Qurtas","d":"Her dîsîplîn li yek cî — nasname, edîtoriyal, pirtûk, logo, poster, reklam û vîdyo."}},"ar":{"home":{"t":"بركات قرطاس | تصميم • طباعة • إعلان • ذكاء اصطناعي","d":"مصمم جرافيك وموشن كردي في أربيل — هوية بصرية، تصميم تحريري، أغلفة كتب، شعارات، ملصقات، إعلان وفيديو. أكثر من ١٠٠٠ عمل. لنصمّم مشروعك معاً."},"blog":{"t":"المدونة — بركات قرطاس","d":"ملاحظات قصيرة من المكتب — عن الطباعة، المكان، وحرفة التصميم البطيئة."},"bio":{"t":"المصمم — بركات قرطاس","d":"عقد من الممارسة في أربيل — القصة، والعمل، والأشخاص خلفه."},"contact":{"t":"لنتحدث. — بركات قرطاس","d":"قدّم مشروعك في رسالة واحدة دقيقة. أرد على كل استفسار جدي خلال ٤٨ ساعة."},"official":{"t":"رسمي — بركات قرطاس","d":"تصميم تحريري لرئاسة إقليم كردستان."},"book":{"t":"أغلفة الكتب — بركات قرطاس","d":"الطباعة والرسم وتركيب الطبع."},"image":{"t":"التصوير — بركات قرطاس","d":"تحرير Lightroom والتركيب والتنقيح التحريري."},"logo":{"t":"الشعارات — بركات قرطاس","d":"علامات وكلمات-علامات وهويات بصرية — عقد من العلامات المرسومة."},"posters":{"t":"الملصقات — بركات قرطاس","d":"سلسلة ملصقات ثقافية وسياسية وطباعية."},"social":{"t":"وسائل التواصل — بركات قرطاس","d":"شبكات إنستغرام والحملات والسرد الرقمي."},"events":{"t":"الفعاليات — بركات قرطاس","d":"مواد المراسم واللافتات وتصميم هوية الفعاليات."},"business":{"t":"بطاقات العمل — بركات قرطاس","d":"قرطاسية شخصية وللعملاء — وجها المحادثة."},"invoices":{"t":"الفواتير — بركات قرطاس","d":"أنظمة قرطاسية — ترويسة وفاتورة وإيصال."},"video":{"t":"الفيديو — بركات قرطاس","d":"مونتاج وثائقي ومقاطع موشن وتغطية البروتوكول."},"other":{"t":"أعمال أخرى — بركات قرطاس","d":"متنوعة — لافتات فليكس وتجارب خطية وملاحظات."},"stationery":{"t":"القرطاسية — بركات قرطاس","d":"بطاقات العمل، الترويسات، الفواتير والإيصالات — النظام الهادئ خلف الهوية."},"design":{"t":"كل الأعمال — بركات قرطاس","d":"كل تخصص في مكان واحد — الهوية البصرية، التحرير، الكتب، الشعارات، الملصقات، الإعلان والفيديو."}},"fr":{"home":{"t":"Barakat Qurtas | Design • Impression • Publicité • IA","d":"Designer graphique & motion kurde à Hewlêr — identité de marque, éditorial, livres, logos, affiches, publicité & vidéo. 1000+ travaux. Créons le vôtre."},"blog":{"t":"Le Journal — Barakat Qurtas","d":"De brèves notes du bureau — sur la typographie, le lieu et l'artisanat lent du design."},"bio":{"t":"Le Designer — Barakat Qurtas","d":"Une décennie de pratique à Hewlêr — l'histoire, le travail et les gens derrière."},"contact":{"t":"Parlons. — Barakat Qurtas","d":"Présentez un projet en une lettre soignée. Je réponds à chaque demande sérieuse sous 48 h."},"official":{"t":"Officiel — Barakat Qurtas","d":"Design éditorial pour la Présidence de la Région du Kurdistan."},"book":{"t":"Couvertures — Barakat Qurtas","d":"Typographie, illustration et composition imprimée."},"image":{"t":"Photographie — Barakat Qurtas","d":"Retouche Lightroom, montages et retouche éditoriale."},"logo":{"t":"Logos — Barakat Qurtas","d":"Marques, logotypes et identités visuelles — une décennie de signes dessinés."},"posters":{"t":"Affiches — Barakat Qurtas","d":"Séries d'affiches culturelles, politiques et typographiques."},"social":{"t":"Réseaux sociaux — Barakat Qurtas","d":"Grilles Instagram, campagnes et narration numérique."},"events":{"t":"Événements — Barakat Qurtas","d":"Matériel de cérémonie, bannières et identité d'événement."},"business":{"t":"Cartes de visite — Barakat Qurtas","d":"Papeterie personnelle et client — les deux côtés de la conversation."},"invoices":{"t":"Factures — Barakat Qurtas","d":"Systèmes de papeterie — en-tête, facture et reçu."},"video":{"t":"Vidéo — Barakat Qurtas","d":"Montages documentaires, reels motion et couverture protocolaire."},"other":{"t":"Autres travaux — Barakat Qurtas","d":"Divers — bannières flex, expériences typographiques et notes."},"stationery":{"t":"Papeterie — Barakat Qurtas","d":"Cartes de visite, en-têtes, factures et reçus — le système discret derrière une marque."},"design":{"t":"Tout le travail — Barakat Qurtas","d":"Chaque discipline en un seul endroit — identité, éditorial, livres, logos, affiches, publicité et vidéo."}},"tr":{"home":{"t":"Barakat Qurtas | Tasarım • Baskı • Reklamcılık • Yapay Zeka","d":"Hewlêr'deki Kürt grafik ve hareket tasarımcısı — marka kimliği, editoryal, kitaplar, logolar, posterler, reklam ve video. 1000'den fazla çalışma. Haydi sizinkini yaratalım."},"blog":{"t":"Dergi — Barakat Qurtas","d":"Tipografi, mekan ve yavaş tasarım sanatı üzerine masadan kısa notlar."},"bio":{"t":"Tasarımcı — Barakat Qurtas","d":"Hewlêr'de on yıllık pratik; hikaye, çalışma ve arkasındaki insanlar."},"contact":{"t":"Hadi konuşalım. — Barakat Qurtas","d":"Bir projeyi dikkatli bir mektupla anlatın. Her ciddi soruya 48 saat içinde cevap veriyorum."},"official":{"t":"Resmi — Barakat Qurtas","d":"Kürdistan Bölgesi Başkanlığı için editoryal tasarım."},"book":{"t":"Kitap Kapakları — Barakat Qurtas","d":"Tipografi, illüstrasyon ve baskı kompozisyonu."},"image":{"t":"Fotoğrafçılık — Barakat Qurtas","d":"Lightroom düzenleme, kompozitler ve editoryal rötuşlama."},"logo":{"t":"Logolar — Barakat Qurtas","d":"İşaretler, marka işaretleri ve görsel kimlikler; on yıllık çizilmiş işaretler."},"posters":{"t":"Posterler — Barakat Qurtas","d":"Kültürel, politik ve tipografik poster serisi."},"social":{"t":"Sosyal Medya — Barakat Qurtas","d":"Instagram tabloları, kampanyaları ve dijital hikaye anlatımı."},"events":{"t":"Olaylar — Barakat Qurtas","d":"Tören malzemeleri, afişler ve etkinlik kimlik tasarımı."},"business":{"t":"Kartvizitler — Barakat Qurtas","d":"Kişisel ve müşteri kırtasiye malzemeleri - konuşmanın her iki tarafı."},"invoices":{"t":"Faturalar — Barakat Qurtas","d":"Kırtasiye sistemleri – antetli kağıt, fatura ve makbuz."},"video":{"t":"Video — Barakat Qurtas","d":"Belgesel düzenlemeleri, hareketli makaralar ve protokol medya kapsamı."},"other":{"t":"Diğer Çalışmalar — Barakat Qurtas","d":"Çeşitli - esnek pankartlar, yazı deneyleri ve notlar."},"stationery":{"t":"Kırtasiye — Barakat Qurtas","d":"Kartvizitler, antetli kağıtlar, faturalar ve makbuzlar — markanın arkasındaki sessiz sistem."},"design":{"t":"Tüm İşler — Barakat Qurtas","d":"Her disiplin tek yerde — marka kimliği, editoryal, kitaplar, logolar, posterler, reklam ve video."}},"sv":{"home":{"t":"Barakat Qurtas | Design • Tryck • Reklam • Artificiell intelligens","d":"Kurdisk grafik- och rörelsedesigner i Hewlêr — varumärkesidentitet, redaktionell, böcker, logotyper, affischer, reklam och video. Över 1000 arbeten. Låt oss skapa ditt."},"blog":{"t":"Tidningen — Barakat Qurtas","d":"Korta anteckningar från skrivbordet — om typografi, plats och designens långsamma hantverk."},"bio":{"t":"Designern — Barakat Qurtas","d":"Ett decennium av praktik i Hewlêr — historien, verket och människorna bakom det."},"contact":{"t":"Låt oss prata. — Barakat Qurtas","d":"Beskriv ett projekt i ett genomtänkt brev. Jag svarar på alla seriösa förfrågningar inom 48 timmar."},"official":{"t":"Officiell — Barakat Qurtas","d":"Redaktionell design för ordförandeskapet i Kurdistan-regionen."},"book":{"t":"Bokomslag — Barakat Qurtas","d":"Typografi, illustration och tryckkomposition."},"image":{"t":"Fotografi — Barakat Qurtas","d":"Lightroom-redigering, kompositer och redaktionell retuschering."},"logo":{"t":"Logotyper — Barakat Qurtas","d":"Märken, ordmärken och visuella identiteter — ett decennium av ritade skyltar."},"posters":{"t":"Affischer — Barakat Qurtas","d":"Kulturella, politiska och typografiska affischserier."},"social":{"t":"Sociala medier — Barakat Qurtas","d":"Instagram-rutnät, kampanjer och digitalt berättande."},"events":{"t":"Händelser — Barakat Qurtas","d":"Ceremonimaterial, banderoller och evenemangsidentitetsdesign."},"business":{"t":"Visitkort — Barakat Qurtas","d":"Personligt brevpapper och kundbrev - båda sidor av samtalet."},"invoices":{"t":"Fakturor — Barakat Qurtas","d":"Papperssystem — brevhuvud, faktura och kvitto."},"video":{"t":"Video — Barakat Qurtas","d":"Dokumentärredigeringar, rörelserullar och protokollmediebevakning."},"other":{"t":"Andra verk — Barakat Qurtas","d":"Övrigt — flex banners, typexperiment och anteckningar."},"stationery":{"t":"Trycksaker — Barakat Qurtas","d":"Visitkort, brevhuvuden, fakturor och kvitton — det tysta systemet bakom ett varumärke."},"design":{"t":"Allt arbete — Barakat Qurtas","d":"Varje disciplin på ett ställe — varumärke, redaktionellt, böcker, logotyper, affischer, reklam och video."}}};


// Search-facing homepage copy is intentionally explicit about service + place.
// Keep the existing route metadata above for portfolio rooms, while making every
// language homepage useful to both people and search/answer engines before JS.
const HOME_SEO = {
  en: { t: 'Graphic Designer in Erbil, Kurdistan | Barakat Qurtas', d: 'Barakat Qurtas is a Kurdish graphic designer in Erbil, Kurdistan, Iraq, creating brand identities, logos, posters, books, advertising and motion design.' },
  ku: { t: 'دیزاینەری گرافیک لە هەولێر و کوردستان | بەرەکات قورتاس', d: 'بەرەکات قورتاس دیزاینەرێکی گرافیکی کوردە لە هەولێری کوردستان، عێراق؛ پسپۆڕ لە براند، لۆگۆ، پۆستەر، بەرگی کتێب، بانگەشە و مووشن گرافیک.' },
  kmr: { t: 'Sêwirmendê Grafîk li Hewlêr û Kurdistanê | Barakat Qurtas', d: 'Barakat Qurtas sêwirmendekî grafîk ê Kurd e li Hewlêr, Kurdistan, Iraq; pisporê nasnameya brandê, logo, poster, pirtûk, reklam û motion design.' },
  ar: { t: 'مصمم جرافيك في أربيل وكردستان | بركات قرطاس', d: 'بركات قرطاس مصمم جرافيك كردي في أربيل، كردستان العراق، متخصص في الهوية البصرية والشعارات والملصقات وأغلفة الكتب والإعلان والموشن جرافيك.' },
  tr: { t: 'Erbil ve Kürdistan Grafik Tasarımcısı | Barakat Qurtas', d: 'Barakat Qurtas; Erbil, Irak Kürdistanı’nda marka kimliği, logo, afiş, kitap kapağı, reklam ve motion tasarım konusunda uzman Kürt grafik tasarımcıdır.' },
  fr: { t: 'Graphiste à Erbil, Kurdistan | Barakat Qurtas', d: 'Barakat Qurtas est un graphiste kurde basé à Erbil, au Kurdistan irakien, spécialisé en identité de marque, logos, affiches, édition, publicité et motion design.' },
  sv: { t: 'Grafisk designer i Erbil, Kurdistan | Barakat Qurtas', d: 'Barakat Qurtas är en kurdisk grafisk designer i Erbil, irakiska Kurdistan, specialiserad på varumärken, logotyper, affischer, böcker, reklam och motion design.' }
};
Object.keys(HOME_SEO).forEach((lang) => { if (OG[lang]) OG[lang].home = HOME_SEO[lang]; });

const CERTIFICATE_SEO = {
  en: { t: 'Certificates — Barakat Qurtas', d: 'Certificates, recognition and professional credentials from the studio archive.' },
  ku: { t: 'بڕوانامەکان — بەرەکات قورتاس', d: 'بڕوانامەکان و پێزانینە پیشەییەکان لە ئەرشیفی ستۆدیۆ.' },
  kmr: { t: 'Sertîfîka — Barakat Qurtas', d: 'Sertîfîka û nasnameyên pîşeyî ji arşîva stûdyoyê.' },
  ar: { t: 'الشهادات — بركات قرطاس', d: 'الشهادات والتقدير والمؤهلات المهنية من أرشيف الاستوديو.' },
  fr: { t: 'Certificats — Barakat Qurtas', d: 'Certificats, distinctions et qualifications professionnelles des archives du studio.' },
  tr: { t: 'Sertifikalar — Barakat Qurtas', d: 'Stüdyo arşivinden sertifikalar, takdir belgeleri ve mesleki yeterlilikler.' },
  sv: { t: 'Certifikat — Barakat Qurtas', d: 'Certifikat, utmärkelser och yrkesmeriter från studions arkiv.' }
};
Object.entries(CERTIFICATE_SEO).forEach(([lang, meta]) => { OG[lang].certificate = meta; });

const HOME_KEYWORDS = {
  en: 'graphic designer Erbil, graphic designer Kurdistan, Kurdish graphic designer, graphic designer Iraq, logo designer Erbil, branding Kurdistan, motion designer Iraq, Barakat Qurtas, Bqurtas',
  ku: 'دیزاینەری گرافیک لە هەولێر, دیزاینەری گرافیک کوردستان, گرافیک دیزاینەر عێراق, دیزاینی لۆگۆ هەولێر, بەرەکات قورتاس, بەرکەت قورتاس',
  kmr: 'sêwirmendê grafîk Hewlêr, sêwirana grafîk Kurdistan, logo Hewlêr, Barakat Qurtas, Bqurtas',
  ar: 'مصمم جرافيك أربيل, مصمم جرافيك كردستان, مصمم جرافيك العراق, تصميم شعار أربيل, هوية بصرية كردستان, بركات قرطاس',
  tr: 'Erbil grafik tasarımcı, Kürdistan grafik tasarımcı, Irak grafik tasarım, Erbil logo tasarımı, Barakat Qurtas',
  fr: 'graphiste Erbil, graphiste Kurdistan, identité visuelle Irak, création logo Erbil, Barakat Qurtas',
  sv: 'grafisk designer Erbil, grafisk designer Kurdistan, varumärkesidentitet Irak, Barakat Qurtas'
};


function resolve(pathname) {
  let seg = pathname.replace(/^\/+|\/+$/g, '').split('/');
  let lang = 'en';
  if (LANGS.includes(seg[0])) { lang = seg[0]; seg = seg.slice(1); }
  const first = seg[0] || '';
  const prefix = lang === 'en' ? '' : '/' + lang;
  if (first === '') return { lang, key: 'home', canon: SITE + (prefix || '/') };   // the hero / landing
  if (first === 'design') {
    const tab = seg[1];
    if (!tab && seg.length === 1) return { lang, key: 'design', canon: SITE + prefix + '/design' };
    if (seg.length === 2 && TABS.includes(tab)) return { lang, key: tab, canon: SITE + prefix + '/design/' + tab };
    return null;
  }
  /* Published post IDs are positive integers. Keep them as strings so a large ID is
     never rounded by JavaScript, and put a finite ceiling on the route space
     so arbitrary digit strings cannot become crawlable application pages. */
  if (first === 'blog' && seg.length === 2 && /^[1-9]\d{0,17}$/.test(seg[1])) return { lang, key: 'blogpost', slug: seg[1], canon: SITE + prefix + '/blog/' + seg[1] };
  if (seg.length === 1 && ROOMS.includes(first)) return { lang, key: first, canon: SITE + prefix + '/' + first };
  return null;
}

function routePath(r) {
  if (!r || r.key === 'home') return '/';
  if (r.key === 'design') return '/design';
  if (TABS.includes(r.key)) return '/design/' + r.key;
  if (r.key === 'blogpost') return '/blog/' + r.slug;
  if (ROOMS.includes(r.key)) return '/' + r.key;
  return '/';
}

function retiredRedirectPath(pathname) {
  let seg = pathname.replace(/^\/+|\/+$/g, '').split('/');
  let lang = 'en';
  if (LANGS.includes(seg[0])) { lang = seg[0]; seg = seg.slice(1); }
  const prefix = LANG_PREFIX[lang] || '';
  const first = seg[0] || '';
  if (first === 'work') return prefix + '/design';
  if (seg.length === 1 && ['panjamor', 'pencemor', 'brandboard'].includes(first)) return prefix + '/contact';
  if (seg.length === 2 && first === 'design' && ['business', 'invoices'].includes(seg[1])) {
    return prefix + '/design/stationery';
  }
  return '';
}

function isPassthroughPath(pathname, request) {
  if (/^\/(?:api|assets|font-assets|uploads|css|js|vendor|\.well-known|mail|autodiscover)(?:\/|$)/i.test(pathname)) return true;
  if (['/index.html', '/404.html', '/favicon.ico', '/llms.txt', '/robots.txt', '/security.txt', '/site.webmanifest', '/sitemap-images.xml', '/sitemap-gallery.xml', '/sitemap-media.xml'].includes(pathname)) return true;
  const acceptsHtml = /(?:^|,)\s*text\/html(?:\s*;|\s*,|$)/i.test(request.headers.get('Accept') || '');
  return !acceptsHtml && /\.[a-z0-9]{2,10}$/i.test(pathname);
}

const documentSecurityHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
});

const noStoreDocumentHeaders = (extra = {}) => new Headers({
  ...documentSecurityHeaders(),
  'Cache-Control': 'no-store, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Cloudflare-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  ...extra
});

async function serveNotFound(request, url, env) {
  const headers = noStoreDocumentHeaders({
    'Content-Type': 'text/html; charset=UTF-8',
    'Content-Security-Policy': "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:",
    'X-Robots-Tag': 'noindex, nofollow'
  });
  if (request.method === 'HEAD') return new Response(null, { status: 404, headers });
  if (env && env.ASSETS) {
    try {
      const page = await env.ASSETS.fetch(new URL('/404.html', url.origin));
      return new Response(page.body, { status: 404, headers });
    } catch (e) {}
  }
  return new Response('<!doctype html><title>Not found</title><h1>404 — Not found</h1>', { status: 404, headers });
}

function serveUnavailable(request) {
  const headers = noStoreDocumentHeaders({
    'Content-Type': 'text/html; charset=UTF-8',
    'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    'Retry-After': '60',
    'X-Robots-Tag': 'noindex, nofollow'
  });
  const body = request.method === 'HEAD'
    ? null
    : '<!doctype html><meta name="robots" content="noindex,nofollow"><title>Temporarily unavailable</title><h1>503 — Temporarily unavailable</h1>';
  return new Response(body, { status: 503, headers });
}

function localizedUrl(lang, r) {
  const path = routePath(r);
  const prefix = LANG_PREFIX[lang] || '';
  const suffix = prefix + (path === '/' ? '' : path);
  return SITE + (suffix || '/');
}

const xmlEsc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function blogPostSitemapBlocks(posts) {
  // Posts published later through the dashboard appear automatically.
  const langs = ['en', ...LANGS];
  const seen = new Set();
  const altLinks = (id) => langs.map((lang) => {
    const href = localizedUrl(lang, { key: 'blogpost', slug: id });
    const hreflang = BCP47[lang] || lang;
    return '    <xhtml:link rel="alternate" hreflang="' + xmlEsc(hreflang) + '" href="' + xmlEsc(href) + '" />';
  }).concat('    <xhtml:link rel="alternate" hreflang="x-default" href="' + xmlEsc(localizedUrl('en', { key: 'blogpost', slug: id })) + '" />').join('\n');
  return posts.map((p) => {
    const id = String(p && p.id != null ? p.id : '').trim();
    if (!/^[1-9]\d{0,17}$/.test(id) || seen.has(id)) return '';
    seen.add(id);
    const lastmod = cmsContentDates(p).dateModified;
    return langs.map((lang) => {
      const loc = localizedUrl(lang, { key: 'blogpost', slug: id });
      return [
        '  <url>',
        '    <loc>' + xmlEsc(loc) + '</loc>',
        ...(lastmod ? ['    <lastmod>' + xmlEsc(lastmod) + '</lastmod>'] : []),
        '    <changefreq>monthly</changefreq>',
        '    <priority>0.7</priority>',
        altLinks(id),
        '  </url>'
      ].join('\n');
    }).join('\n');
  }).filter(Boolean).join('\n');
}

const sitemapHeaders = () => new Headers({
  ...documentSecurityHeaders(),
  'Content-Type': 'application/xml; charset=UTF-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Cloudflare-CDN-Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'X-Content-Type-Options': 'nosniff'
});

async function serveSitemap(request, url, env, next) {
  if (!env || !env.ASSETS) return next();
  const base = await env.ASSETS.fetch(new URL('/sitemap.xml', url.origin));
  if (!base.ok) return serveUnavailable(request);
  let body = await base.text();
  // Never expose the old generated numeric entries if the live lookup fails.
  // Omitting a post briefly is safer than advertising known soft-404 URLs.
  body = body.replace(
    /[ \t]*<url>(?:(?!<\/url>)[\s\S])*?<loc>[^<]*\/blog\/\d+<\/loc>[\s\S]*?<\/url>\s*/gi,
    ''
  );
  try {
    const live = await listPublishedPosts(env.DB);
    if (!Array.isArray(live)) throw new Error('invalid-post-list');
    // Rebuild from published D1 rows so drafts and retired IDs stay out of the sitemap.
    const blocks = blogPostSitemapBlocks(live);
    if (blocks) body = body.replace(/\s*<\/urlset>\s*$/i, '\n' + blocks + '\n</urlset>\n');
  } catch (e) { console.warn('sitemap posts query threw', String(e)); }
  /* Build the headers rather than inheriting the static asset's. The body
     leaving here is not the body that came out of ASSETS — blog posts get
     appended — so the asset's ETag and Content-Length describe something else,
     and its Age / CF-Cache-Status describe a fetch the client never made. */
  return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers: sitemapHeaders() });
}

const setContent = (v) => ({ element(el) { el.setAttribute('content', v); } });
const setHref    = (v) => ({ element(el) { el.setAttribute('href', v); } });
const setText    = (v) => ({ element(el) { el.setInnerContent(v); } });
const setLangAttr = (v) => ({ element(el) {
  el.setAttribute('lang', BCP47[v] || v);
  el.setAttribute('dir', v === 'ku' || v === 'ar' ? 'rtl' : 'ltr');
  el.setAttribute('data-lang', v);
} });

const MAIL_AUTOCONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<clientConfig version="1.1">
  <emailProvider id="bqurtas.com">
    <domain>bqurtas.com</domain>
    <displayName>Barakat Qurtas</displayName>
    <displayShortName>bqurtas</displayShortName>
    <incomingServer type="imap">
      <hostname>mail.spacemail.com</hostname>
      <port>993</port>
      <socketType>SSL</socketType>
      <username>%EMAILADDRESS%</username>
      <authentication>password-cleartext</authentication>
    </incomingServer>
    <incomingServer type="pop3">
      <hostname>mail.spacemail.com</hostname>
      <port>995</port>
      <socketType>SSL</socketType>
      <username>%EMAILADDRESS%</username>
      <authentication>password-cleartext</authentication>
      <pop3>
        <leaveMessagesOnServer>true</leaveMessagesOnServer>
      </pop3>
    </incomingServer>
    <outgoingServer type="smtp">
      <hostname>mail.spacemail.com</hostname>
      <port>465</port>
      <socketType>SSL</socketType>
      <username>%EMAILADDRESS%</username>
      <authentication>password-cleartext</authentication>
    </outgoingServer>
    <outgoingServer type="smtp">
      <hostname>mail.spacemail.com</hostname>
      <port>587</port>
      <socketType>STARTTLS</socketType>
      <username>%EMAILADDRESS%</username>
      <authentication>password-cleartext</authentication>
    </outgoingServer>
  </emailProvider>
</clientConfig>`;

function mailXmlHeaders(type) {
  return {
    ...documentSecurityHeaders(),
    'Content-Type': type,
    'Cache-Control': 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex'
  };
}

function mailAutodiscoverXml(login) {
  const user = String(login || 'hello@bqurtas.com').trim() || 'hello@bqurtas.com';
  const safe = xmlEsc(user);
  return `<?xml version="1.0" encoding="utf-8"?>
<Autodiscover xmlns="http://schemas.microsoft.com/exchange/autodiscover/responseschema/2006">
  <Response xmlns="http://schemas.microsoft.com/exchange/autodiscover/outlook/responseschema/2006a">
    <Account>
      <AccountType>email</AccountType>
      <Action>settings</Action>
      <Protocol>
        <Type>IMAP</Type>
        <Server>mail.spacemail.com</Server>
        <Port>993</Port>
        <DomainRequired>off</DomainRequired>
        <SPA>off</SPA>
        <SSL>on</SSL>
        <AuthRequired>on</AuthRequired>
        <LoginName>${safe}</LoginName>
      </Protocol>
      <Protocol>
        <Type>SMTP</Type>
        <Server>mail.spacemail.com</Server>
        <Port>465</Port>
        <DomainRequired>off</DomainRequired>
        <SPA>off</SPA>
        <SSL>on</SSL>
        <AuthRequired>on</AuthRequired>
        <LoginName>${safe}</LoginName>
      </Protocol>
    </Account>
  </Response>
</Autodiscover>`;
}

async function serveAutodiscover(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: mailXmlHeaders('text/xml; charset=utf-8') });
  }
  if (!['GET', 'HEAD', 'POST'].includes(request.method)) {
    return new Response(null, {
      status: 405,
      headers: { ...mailXmlHeaders('text/plain; charset=utf-8'), Allow: 'GET, HEAD, POST, OPTIONS' }
    });
  }
  let login = 'hello@bqurtas.com';
  if (request.method === 'POST') {
    try {
      const body = new TextDecoder().decode(await readRequestBytes(request, 16_384));
      const m = body.match(/<EMailAddress>\s*([^<]+)\s*<\/EMailAddress>/i);
      if (m && /@bqurtas\.com$/i.test(m[1].trim())) login = m[1].trim();
    } catch (error) {
      if (error?.status === 413) return new Response(null, { status: 413, headers: mailXmlHeaders('text/plain; charset=utf-8') });
    }
  } else {
    const url = new URL(request.url);
    const q = url.searchParams.get('Email') || url.searchParams.get('email');
    if (q && /@bqurtas\.com$/i.test(q.trim())) login = q.trim();
  }
  const xml = mailAutodiscoverXml(login);
  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers: mailXmlHeaders('text/xml; charset=utf-8') });
  }
  return new Response(xml, { status: 200, headers: mailXmlHeaders('text/xml; charset=utf-8') });
}

function serveAutoconfig(request) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return new Response(null, {
      status: 405,
      headers: { ...mailXmlHeaders('text/plain; charset=utf-8'), Allow: 'GET, HEAD, OPTIONS' }
    });
  }
  if (request.method === 'OPTIONS' || request.method === 'HEAD') {
    return new Response(null, {
      status: request.method === 'OPTIONS' ? 204 : 200,
      headers: mailXmlHeaders('application/xml; charset=utf-8')
    });
  }
  return new Response(MAIL_AUTOCONFIG_XML, {
    status: 200,
    headers: mailXmlHeaders('application/xml; charset=utf-8')
  });
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  if (/^\/autodiscover\/autodiscover\.xml$/i.test(url.pathname)) {
    return serveAutodiscover(request);
  }
  if (
    /^\/\.well-known\/autoconfig\/mail\/config-v1\.1\.xml$/i.test(url.pathname) ||
    /^\/mail\/config-v1\.1\.xml$/i.test(url.pathname)
  ) {
    return serveAutoconfig(request);
  }
  // Google Search Console ownership token — served from the function because
  // Pages' pretty-URL normalisation 308-redirects any static *.html path,
  // and Google's verifier requires a plain 200 at the exact URL.
  if (url.pathname === '/googlece435b444cb43243.html') {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response(null, { status: 405, headers: noStoreDocumentHeaders({ Allow: 'GET, HEAD' }) });
    }
    return new Response(request.method === 'HEAD' ? null : 'google-site-verification: googlece435b444cb43243.html', {
      status: 200,
      headers: noStoreDocumentHeaders({ 'Content-Type': 'text/html; charset=UTF-8' })
    });
  }
  if (url.hostname === 'www.bqurtas.com') {
    url.hostname = 'bqurtas.com';
    return Response.redirect(url.toString(), 301);
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response(null, {
      status: 405,
      headers: noStoreDocumentHeaders({ Allow: 'GET, HEAD' })
    });
  }
  if (url.pathname === '/sitemap.xml') return serveSitemap(request, url, env, next);
  // The image sitemap is a static file, but the CDN edge kept serving stale
  // HITs after deploys (Google would read an old copy). Serve it through the
  // function with no-store — freshness over speed, same policy as sitemap.xml.
  if (['/sitemap-images.xml', '/sitemap-media.xml', '/sitemap-gallery.xml'].includes(url.pathname) && env && env.ASSETS) {
    // Retain the old media alias, but each generated sitemap has its own body.
    const sitemapPath = url.pathname === '/sitemap-media.xml' ? '/sitemap-images.xml' : url.pathname;
    const r = await env.ASSETS.fetch(new URL(sitemapPath, url.origin));
    if (!r.ok) return serveUnavailable(request);
    if (sitemapPath === '/sitemap-images.xml' && request.method !== 'HEAD') {
      const xml = await rewritePortraitSitemap(await r.text(), env.DB);
      return new Response(xml, { status: 200, headers: sitemapHeaders() });
    }
    return new Response(request.method === 'HEAD' ? null : r.body, { status: 200, headers: sitemapHeaders() });
  }
  // Only generated archive pages may reach static delivery. An unknown path
  // must remain a real 404 even if Pages' fallback policy changes later.
  if (/^\/archive(?:\/|$)/i.test(url.pathname)) {
    const candidate = url.pathname.endsWith('/index.html')
      ? url.pathname.slice(0, -'index.html'.length)
      : url.pathname.replace(/\/?$/, '/');
    if (!MEDIA_ARCHIVE_ROUTES.has(candidate)) return serveNotFound(request, url, env);
    if (url.pathname !== candidate) {
      url.pathname = candidate;
      return Response.redirect(url.toString(), 301);
    }
    return untransformedDocument(request, await next());
  }
  const redirectPath = retiredRedirectPath(url.pathname);
  if (redirectPath) {
    url.pathname = redirectPath;
    return Response.redirect(url.toString(), 301);
  }
  /* One server-rendered page per work: /design/book/7. Language-prefixed and
     trailing-slash variants fold into the single English canonical URL. */
  const work = parseWorkPath(url.pathname);
  if (work) {
    if (work.redirect) {
      url.pathname = work.redirect;
      return Response.redirect(url.toString(), 301);
    }
    if (work.status === 404) return serveNotFound(request, url, env);
    return untransformedDocument(request, await serveWorkPage(request, url, env, work, {
      next,
      notFound: () => serveNotFound(request, url, env),
      unavailable: () => serveUnavailable(request),
      securityHeaders: documentSecurityHeaders
    }));
  }
  const r = resolve(url.pathname);
  if (!r) {
    if (isPassthroughPath(url.pathname, request)) return next();
    return serveNotFound(request, url, env);
  }
  if (!env || !env.ASSETS) return next();

  let meta, img, imgType = 'image/jpeg';
  let publishedPost = null;
  let postJsonLd = '';   // per-post BlogPosting schema (filled for real blog posts)
  if (r.key === 'blogpost') {
    // Share metadata reads the same published D1 row as the journal.
    const id = r.slug;
    let post = null;
    let lookupFailed = false;
    try {
      post = await getPublishedPost(env.DB, id);
      if (post !== null && (!post || typeof post !== 'object' || Array.isArray(post))) lookupFailed = true;
      if (lookupFailed) post = null;
    } catch (e) { lookupFailed = true; console.warn('blogpost lookup threw', id, String(e)); }
    /* A post id that does not exist, or is not published, is not a page.
       /blog/999999999999 was answering 200 with index,follow, which invites
       Google to index an unbounded number of empty URLs. Only a lookup that
       actually failed receives a temporary, noindex 503 — returning a generic
       200 would turn an outage into a soft 404 and teach crawlers bad state. */
    if (!post && !lookupFailed) return serveNotFound(request, url, env);
    if (!post && lookupFailed) return serveUnavailable(request);
    if (post) {
      publishedPost = post;
      const article = articleContent(post, r.lang, LOCALIZED_COPY[r.lang]);
      const blogD = (OG[r.lang] && OG[r.lang].blog && OG[r.lang].blog.d) || OG.en.blog.d;
      const headline = article.title.trim() || 'Journal';
      meta = { t: headline + ' — Barakat Qurtas',
               d: article.subtitle.trim() || blogD };
      img = article.cover || SITE + '/assets/covers/' + r.lang + '-blog.jpg?v=3';
      imgType = /\.png(\?|$)/i.test(img) ? 'image/png' : /\.webp(\?|$)/i.test(img) ? 'image/webp' : 'image/jpeg';
      // Machine-readable BlogPosting so AI engines + Google attribute every post
      // to Barakat — author named in the page's own language, linked to #person.
      const ld = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        '@id': r.canon + '#article',
        headline: headline,
        description: meta.d,
        image: img,
        ...cmsContentDates(post),
        inLanguage: BCP47[r.lang] || 'en',
        url: r.canon,
        mainEntityOfPage: { '@type': 'WebPage', '@id': r.canon + '#webpage' },
        author: { '@type': 'Person', '@id': SITE + '/#person', name: AUTHOR_NAME[r.lang] || AUTHOR_NAME.en, url: SITE + '/' },
        publisher: { '@id': SITE + '/#person' },
        isPartOf: { '@id': SITE + '/#website' }
      };
      postJsonLd = '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>';
    } else {
      meta = (OG[r.lang] && OG[r.lang].blog) || OG.en.blog;
      img  = SITE + '/assets/covers/' + r.lang + '-blog.jpg?v=3';
    }
  } else {
    meta = (OG[r.lang] && OG[r.lang][r.key]) || OG.en[r.key] || OG.en.home;
    img  = SITE + '/assets/covers/' + r.lang + '-' + r.key + '.jpg?v=3';
  }

  // A unique CSP nonce is meaningful only when the HTML response itself is not
  // reused. Fingerprinted assets retain their own long immutable cache.
  const FRESH = 'no-store, max-age=0';
  /* Per-request nonce -> a strong, XSS-effective Content-Security-Policy with NO
     'unsafe-inline' and NO 'unsafe-eval'. Every <script> in the shell gets this
     nonce below; 'strict-dynamic' then trusts scripts loaded by those nonce'd
     bootstraps. Inline styles were moved to CSS/data-css helpers, so style-src
     can stay strict too. */
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const CSP = [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'",
    "frame-ancestors 'self'", "form-action 'self'", "upgrade-insecure-requests",
    "script-src 'nonce-" + nonce + "' 'strict-dynamic' 'self'",
    "style-src 'nonce-" + nonce + "' 'self'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https://raw.githubusercontent.com",
    "media-src 'self' blob: https://raw.githubusercontent.com",
    "connect-src 'self' https://api.github.com https://raw.githubusercontent.com https://gateway.umami.is/api/send",
    "frame-src 'self'",
    "worker-src 'self' blob:"
  ].join('; ');
  const withFresh = (res) => {
    const headers = new Headers(res.headers);
    /* These values describe the untouched static shell. The route, language,
       nonce and metadata change its representation on every request. */
    for (const name of ['ETag', 'Last-Modified', 'Content-Length', 'Content-MD5', 'Age', 'CF-Cache-Status']) headers.delete(name);
    for (const [name, value] of Object.entries(documentSecurityHeaders())) headers.set(name, value);
    headers.set('Cache-Control', FRESH);
    headers.set('CDN-Cache-Control', 'no-store');   // Cloudflare edge: don't cache the HTML shell
    /* Cloudflare reads its own vendor directive ahead of CDN-Cache-Control and
       ahead of Cache-Control, so this is the strongest thing an origin can say.
       Measured before adding it: three requests to / returned the same CSP
       nonce with cf-cache-status HIT and Age climbing past 9400 — the shell was
       two and a half hours old and still advertising main?v=531 while the build
       had moved to 533. Every deploy was invisible. */
    headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
    headers.set('Pragma', 'no-cache');
    headers.set('Content-Security-Policy', CSP);
    // env.ASSETS.fetch returns the shell with Pages' default wildcard CORS; the
    // _headers override only applies to directly-served files, not this internal
    // fetch — so pin it here too. The HTML shell is same-origin only; no wildcard.
    headers.set('Access-Control-Allow-Origin', 'https://bqurtas.com');
    headers.set('Content-Language', BCP47[r.lang] || r.lang);
    return new Response(request.method === 'HEAD' ? null : res.body, { status: res.status, statusText: res.statusText, headers });
  };
  const addNonce = { element(el) { el.setAttribute('nonce', nonce); } };

  try {
    const shell = await env.ASSETS.fetch(new URL('/index.html', url.origin));
    if (!shell.ok) return serveUnavailable(request);
    const rewriter = new HTMLRewriter()
      .on('script',                           addNonce)
      .on('style',                            addNonce)
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
      .on('link[data-alt-lang="en"]',          setHref(localizedUrl('en', r)))
      .on('link[data-alt-lang="ku"]',          setHref(localizedUrl('ku', r)))
      .on('link[data-alt-lang="kmr"]',         setHref(localizedUrl('kmr', r)))
      .on('link[data-alt-lang="ar"]',          setHref(localizedUrl('ar', r)))
      .on('link[data-alt-lang="fr"]',          setHref(localizedUrl('fr', r)))
      .on('link[data-alt-lang="tr"]',          setHref(localizedUrl('tr', r)))
      .on('link[data-alt-lang="sv"]',          setHref(localizedUrl('sv', r)))
      .on('link[data-alt-lang="x-default"]',   setHref(localizedUrl('en', r)))
      .on('head', { element(el) {
        if (postJsonLd) el.append(postJsonLd.replace('<script ', '<script nonce="' + nonce + '" '), { html: true });
      } });
    /* Each room's hero title is a real h1 in the markup now, so the ARIA
       heading role this used to stamp on the active one is no longer needed. */
    const activeRoom = r.key === 'blogpost' ? 'blog' : r.key;

    /* Serve each route with ITS room already open.
       The shell ships with Design visible and every other room carrying
       is-hidden, and the router only swaps them once JavaScript has run. A
       crawler fetching /bio therefore received the biography inside a hidden
       element and the Design room as the page's visible content — which is why
       the inner routes were not being indexed on their own terms while the
       Behance profile was. The meta was already rewritten per route here; the
       body was not. Now it is, so the HTML a crawler is handed shows the
       content that route is about. The bootstrap script sets the same room from
       the path, so nothing changes for a visitor. */
    const openRoom = ROOMS.includes(activeRoom) ? activeRoom : 'design';
    const ALL_ROOMS = ['design'].concat(ROOMS);
    for (const room of ALL_ROOMS) {
      rewriter.on('#' + room + '.room', room === openRoom
        ? { element(el) {
              const cls = (el.getAttribute('class') || '')
                .split(/\s+/).filter((c) => c && c !== 'is-hidden').join(' ');
              el.setAttribute('class', cls);
            } }
        : { element(el) {
              const cls = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
              if (!cls.includes('is-hidden')) cls.push('is-hidden');
              el.setAttribute('class', cls.join(' '));
            } });
    }
    rewriter.on('html', { element(el) {
      el.setAttribute('data-room', openRoom);
      el.setAttribute('data-initial-route', r.key === 'home' ? 'home' : openRoom);
      el.setAttribute('data-rendered-lang', r.lang);
    } });
    const homeKeywords = r.key === 'home' ? (HOME_KEYWORDS[r.lang] || HOME_KEYWORDS.en) : null;
    if (homeKeywords) rewriter.on('meta[name="keywords"]', setContent(homeKeywords));
    // Use the same authored strings as the browser on every locale/room. The
    // former local-SEO selectors no longer existed after the homepage redesign,
    // leaving all translated URLs with an English body until JavaScript ran.
    const copy = LOCALIZED_COPY[r.lang] || LOCALIZED_COPY.en;
    rewriter.on('[data-i18n]', { element(el) {
      const value = copy[el.getAttribute('data-i18n')];
      if (value !== undefined) el.setInnerContent(value, { html: true });
    } });
    for (const [source, target] of [['data-i18n-ph', 'placeholder'], ['data-i18n-aria', 'aria-label']]) {
      rewriter.on('[' + source + ']', { element(el) {
        const value = copy[el.getAttribute(source)];
        if (value !== undefined) el.setAttribute(target, value);
      } });
    }
    rewriter.on('[data-i18n-opt]', { element(el) {
      const value = copy[el.getAttribute('data-i18n-opt')];
      if (value !== undefined) el.setInnerContent(value);
    } });
    rewritePageSchema(rewriter, r, meta, LOCALIZED_COPY[r.lang] || LOCALIZED_COPY.en);
    if (publishedPost) rewriteArticleContent(rewriter, publishedPost, r.lang, { nonce, dictionary: copy });
    await rewritePublicPortrait(rewriter, env.DB);
    const out = rewriter.transform(shell);
    return withFresh(out);
  } catch (e) {
    try {
      const shell = await env.ASSETS.fetch(new URL('/index.html', url.origin));
      if (!shell.ok) return serveUnavailable(request);
      return withFresh(new HTMLRewriter()
        .on('script', addNonce)
        .on('style', addNonce)
        .transform(shell));
    } catch (_) { return next(); }
  }
}
