/* =====================================================================
   Brand Board Studio — bilingual identity starter.
   Builds the full room UI into #brandboardMount and follows site language.
   ===================================================================== */
(function () {
  const mount = document.getElementById('brandboardMount');
  if (!mount) return;

  const MOODS = {
    warm:    { fonts:{latin:'Fraunces',ls:'italic',ku:'Noto Naskh Arabic',ln:'Fraunces',kn:'Noto Naskh'}, p:[['#efe7dc','#2a211b','#bd4a2c','#d98e5a'],['#f0e7d8','#33241a','#a8432a','#c98a4e']] },
    elegant: { fonts:{latin:'Fraunces',ls:'italic',ku:'Noto Naskh Arabic',ln:'Fraunces',kn:'Noto Naskh'}, p:[['#ede7db','#1f2a30','#9c7b46','#5b6e6a'],['#e9e4d9','#232b2e','#b8924f','#6e7e78']] },
    minimal: { fonts:{latin:'Manrope',ls:'normal',ku:'Noto Kufi Arabic',ln:'Manrope',kn:'Noto Kufi'}, p:[['#f4f2ec','#1a1a18','#3f3f3a','#c0542e'],['#f2f1eb','#161614','#4a4a44','#2e6e7a']] },
    bold:    { fonts:{latin:'Fraunces',ls:'normal',ku:'Noto Kufi Arabic',ln:'Fraunces',kn:'Noto Kufi'}, p:[['#f4f1e7','#101010','#e63a2e','#1c6e8c'],['#f3efe4','#121212','#1c6e8c','#e63a2e']] },
    earthy:  { fonts:{latin:'Manrope',ls:'normal',ku:'Noto Naskh Arabic',ln:'Manrope',kn:'Noto Naskh'}, p:[['#ece6d8','#33301f','#6e6a3a','#a8895b'],['#e8e2d2','#2e2c1e','#5a5a30','#9a7b4e']] },
    playful: { fonts:{latin:'Manrope',ls:'normal',ku:'Noto Kufi Arabic',ln:'Manrope',kn:'Noto Kufi'}, p:[['#f6efe2','#23323a','#e8623d','#1e9e89'],['#f4eee0','#2a2a2a','#e0a23a','#2e8e9e']] }
  };
  const MOOD_KEYS = Object.keys(MOODS);
  const INDUSTRIES = ['cafe','fashion','tech','bookstore','studio','beauty','restaurant','other'];

  const TR = {
    en:{
      eyebrow:'BRAND STUDIO · FREE',title:'Build a working brand system.',intro:'Name, promise, logo direction, colour, type, voice, mockups and a launch checklist in one living board.',
      lName:'Brand name (Latin)',lKu:'Brand name (Kurdish)',lOffer:'What do you sell?',lAudience:'Who is it for?',lPromise:'Brand promise',lField:'Field',lMood:'Personality',
      shuffle:'New direction',download:'Download board',ready:'Brand readiness',readyHint:'Complete the brief fields to make the board sharper.',
      brief:'Strategy',logo:'Logo lab',palette:'Colour system',type:'Type system',apps:'Touchpoints',voice:'Voice',check:'Launch checklist',kit:'Starter kit',
      latin:'Latin',kurdish:'Kurdish',made:'MADE FREE WITH BQURTAS.COM',scoreNote:'starter strength',primary:'Primary',accent:'Accent',paper:'Paper',ink:'Ink',
      wordmark:'Wordmark',monogram:'Monogram',seal:'Seal',social:'Social',sign:'Signage',card:'Card',pack:'Pack',toneGood:'Use',toneAvoid:'Avoid',
      sTitle:'Keep this system',sText:'Email it to yourself and save the current direction before you talk to a designer, printer or partner.',send:'Send',sent:'Sent. Check your inbox soon.',bad:'Enter a valid email.',
      ctaTitle:'Need the real identity?',ctaText:'This board gives direction. The finished identity needs research, drawing, testing, files and rules for real use.',cta:'Start a serious brief →',
      placeholder:{offer:'specialty coffee and handmade sweets',audience:'city people who love quiet places',promise:'warm service with a memorable local feeling'},
      moods:{warm:'Warm',elegant:'Elegant',minimal:'Minimal',bold:'Bold',earthy:'Earthy',playful:'Playful'},
      inds:{cafe:'Café',fashion:'Fashion',tech:'Tech',bookstore:'Bookstore',studio:'Studio',beauty:'Beauty',restaurant:'Restaurant',other:'Other'},
      kw:{warm:['warm','handmade','inviting'],elegant:['refined','timeless','considered'],minimal:['clean','calm','precise'],bold:['confident','modern','clear'],earthy:['natural','grounded','honest'],playful:['bright','friendly','spirited']},
      insight:{cafe:'Make the sign visible, the menu calm and the packaging memorable.',fashion:'Let the mark work on tags, bags, photos and small labels.',tech:'Keep the system clear in app icons, pitch decks and product UI.',bookstore:'Give the name a literary rhythm and a quiet reading mood.',studio:'Show craft, process and trust without making the identity noisy.',beauty:'Balance softness with premium detail and repeatable packaging rules.',restaurant:'Make the mark legible at night, on menus and on delivery material.',other:'Start with a clear promise, then make every touchpoint repeat it.'},
      tagline:{cafe:'A quieter cup, remembered.',fashion:'Made to be worn, kept and named.',tech:'Useful tools, clearly made.',bookstore:'Books, chosen with a human eye.',studio:'Work with a visible hand.',beauty:'Care you can see and feel.',restaurant:'A place people return to.',other:'A name with a system behind it.'},
      position:function(n,o,a,p,ind){ return n+' is a '+ind+' brand for '+a+'. It offers '+o+', with a promise of '+p+'.'; },
      say:{warm:['personal','fresh','nearby'],elegant:['measured','quiet','premium'],minimal:['direct','useful','spare'],bold:['clear','brave','fast'],earthy:['honest','local','natural'],playful:['bright','human','light']},
      avoid:{warm:['cold','generic','overdecorated'],elegant:['cheap','crowded','loud'],minimal:['empty','unclear','flat'],bold:['aggressive','messy','forced'],earthy:['dusty','heavy','old'],playful:['childish','random','plastic']},
      checklist:['Logo readable small','One main colour chosen','Font pair tested','Social avatar ready','Print card direction','Launch message clear'],
      kitItems:['Logo idea','Colour roles','Type pair','Voice words','Social mockup','Print direction']
    },
    ku:{
      eyebrow:'ستۆدیۆی براند · بێ بەرامبەر',title:'سیستەمی کارای براند دروست بکە.',intro:'ناو، بەڵێن، ئاراستەی لۆگۆ، ڕەنگ، فۆنت، دەنگ، پێشبینین و لیستی دەستپێکردن لە یەک تابلۆدا.',
      lName:'ناوی براند (لاتین)',lKu:'ناوی براند (کوردی)',lOffer:'چی دەفرۆشیت؟',lAudience:'بۆ کێیە؟',lPromise:'بەڵێنی براند',lField:'بوار',lMood:'کەسایەتی',
      shuffle:'ئاراستەی نوێ',download:'داگرتنی تابلۆ',ready:'ئامادەیی براند',readyHint:'خانەکانی بریف پڕ بکەوە تا تابلۆکە وردتر بێت.',
      brief:'ستراتیژی',logo:'لابراتواری لۆگۆ',palette:'سیستەمی ڕەنگ',type:'سیستەمی فۆنت',apps:'شوێنی بەکارهێنان',voice:'دەنگی براند',check:'لیستی دەستپێکردن',kit:'کیتی دەستپێک',
      latin:'لاتین',kurdish:'کوردی',made:'بە بێ بەرامبەر دروستکرا بە BQURTAS.COM',scoreNote:'هێزی دەستپێک',primary:'سەرەکی',accent:'هاوڕەنگ',paper:'بنەما',ink:'نووسین',
      wordmark:'وشە-نیشان',monogram:'یەکپیت',seal:'مۆر',social:'سۆشیاڵ',sign:'تابلۆ',card:'کارت',pack:'پاکەت',toneGood:'بەکاربێنە',toneAvoid:'دووربە',
      sTitle:'ئەم سیستەمە بپارێزە',sText:'بۆ خۆتی بنێرە تا پێش قسەکردن لەگەڵ دیزاینەر، چاپخانە یان هاوبەش، ئاراستەکە لەدەست نەچێت.',send:'ناردن',sent:'نێردرا. بەم زووانە سندوقەکەت بپشکنە.',bad:'ئیمەیڵێکی دروست بنووسە.',
      ctaTitle:'ناسنامەی ڕاستەقینەت دەوێت؟',ctaText:'ئەم تابلۆیە ئاراستە دەدات. ناسنامەی تەواو پێویستی بە لێکۆڵینەوە، کێشان، تاقیکردنەوە، فایل و یاسای بەکارهێنان هەیە.',cta:'بریفێکی جدی بنێرە →',
      placeholder:{offer:'کافێی تایبەت و شیرینی دەستکرد',audience:'خەڵکی شار کە شوێنی ئارامیان دەوێت',promise:'خزمەتگوزاری گەرم و هەستێکی ناوخۆیی یادگار'},
      moods:{warm:'گەرم',elegant:'شیک',minimal:'مینیمال',bold:'جورئەتدار',earthy:'خاکی',playful:'گەشاوە'},
      inds:{cafe:'کافێ',fashion:'فاشن',tech:'تەکنەلۆجیا',bookstore:'کتێبفرۆشی',studio:'ستۆدیۆ',beauty:'جوانکاری',restaurant:'چێشتخانە',other:'تر'},
      kw:{warm:['گەرم','دەستکرد','بانگهێشتکەر'],elegant:['شیک','نەمر','وردبینانە'],minimal:['پاک','هێمن','ورد'],bold:['متمانەبەخۆ','نوێ','ڕوون'],earthy:['سروشتی','جێگیر','ڕاستگۆ'],playful:['گەشاوە','دۆستانە','بەجۆش']},
      insight:{cafe:'تابلۆکە ڕوون بکە، مێنیو هێمن و پاکەتەکان یادگار بن.',fashion:'نیشانەکە با لە تاگ، جانتا، وێنە و لێبڵی بچووکیش کار بکات.',tech:'سیستەمەکە لە ئایکۆن، پێشکەشکردن و ڕووکاری بەرهەمدا ڕوون بهێڵەوە.',bookstore:'ناوەکە ڕیتمی ئەدەبی و هەستێکی ئارامی خوێندنەوەی هەبێت.',studio:'پیشەگەرێتی، پرۆسە و متمانە پیشان بدە، بێ ئەوەی ناسنامەکە قەرەباڵغ بێت.',beauty:'نەرمی لەگەڵ وردەکاری گرانبەها و یاسای پاکەتکردن هاوسەنگ بکە.',restaurant:'نیشانەکە لە شەو، لە مێنیو و لە ماددەی گەیاندندا خوێندراو بێت.',other:'لە بەڵێنێکی ڕوون دەستپێبکە، پاشان هەموو شوێنێک ئەوە دووبارە بکاتەوە.'},
      tagline:{cafe:'کوپێکی ئارامتر، یادگارتر.',fashion:'دروستکراو بۆ پۆشین و مانەوە.',tech:'ئامرازی بەسوود، بە ڕوونی دروستکراو.',bookstore:'کتێب بە چاوی مرۆڤ هەڵبژێردراو.',studio:'کارێک بە دەستی دیار.',beauty:'چاودێرییەک کە دەبینرێت و هەست پێدەکرێت.',restaurant:'شوێنێک خەڵک بۆی دەگەڕێتەوە.',other:'ناوێک کە سیستەمی لەپشتە.'},
      position:function(n,o,a,p,ind){ return n+' براندێکی '+ind+' ـە بۆ '+a+'. '+o+' پێشکەش دەکات، بە بەڵێنی '+p+'.'; },
      say:{warm:['نزیک','تازە','خۆشەویست'],elegant:['هێمن','ورد','گران'],minimal:['ڕاستەوخۆ','بەسوود','پاک'],bold:['ڕوون','بوێر','خێرا'],earthy:['ڕاستگۆ','ناوخۆیی','سروشتی'],playful:['گەش','مرۆڤانە','سووک']},
      avoid:{warm:['سارد','گشتی','زۆر ڕازاوە'],elegant:['هەرزان','قەرەباڵغ','هاوار'],minimal:['بەتاڵ','ناڕوون','بێگیان'],bold:['توند','تێکەڵ','زۆرەملێ'],earthy:['کۆنباو','قورس','بێ ڕۆح'],playful:['منداڵانە','هەڕەمەکی','پلاستیکی']},
      checklist:['لۆگۆ لە بچووکدا خوێندراوە','یەک ڕەنگی سەرەکی هەڵبژێردرا','جووتی فۆنت تاقیکرایەوە','وێنەی سۆشیاڵ ئامادەیە','ئاراستەی کارتی چاپ هەیە','پەیامی دەستپێکردن ڕوونە'],
      kitItems:['بیرۆکەی لۆگۆ','ڕۆڵی ڕەنگەکان','جووتی فۆنت','وشەی دەنگ','پێشبینینی سۆشیاڵ','ئاراستەی چاپ']
    },
    ar:{
      eyebrow:'استوديو علامة · مجاني',title:'ابن نظام علامة قابل للاستخدام.',intro:'الاسم، الوعد، اتجاه الشعار، اللون، الخط، الصوت، النماذج وقائمة الإطلاق في لوحة واحدة.',
      lName:'اسم العلامة (لاتيني)',lKu:'اسم العلامة (كردي)',lOffer:'ماذا تبيع؟',lAudience:'لمن؟',lPromise:'وعد العلامة',lField:'المجال',lMood:'الشخصية',
      shuffle:'اتجاه جديد',download:'تنزيل اللوحة',ready:'جاهزية العلامة',readyHint:'املأ حقول الموجز لتصبح اللوحة أدق.',
      brief:'الاستراتيجية',logo:'مختبر الشعار',palette:'نظام الألوان',type:'نظام الخطوط',apps:'نقاط الظهور',voice:'صوت العلامة',check:'قائمة الإطلاق',kit:'حزمة البداية',
      latin:'لاتيني',kurdish:'كردي',made:'صُنع مجاناً عبر BQURTAS.COM',scoreNote:'قوة البداية',primary:'أساسي',accent:'مساند',paper:'أرضية',ink:'نص',
      wordmark:'الشعار النصي',monogram:'الحرف',seal:'الختم',social:'اجتماعي',sign:'لافتة',card:'بطاقة',pack:'تغليف',toneGood:'استخدم',toneAvoid:'تجنب',
      sTitle:'احتفظ بهذا النظام',sText:'أرسله إلى بريدك واحفظ الاتجاه قبل الحديث مع مصمم أو مطبعة أو شريك.',send:'إرسال',sent:'تم الإرسال. تفقد بريدك قريباً.',bad:'أدخل بريداً صحيحاً.',
      ctaTitle:'تحتاج الهوية الحقيقية؟',ctaText:'هذه اللوحة تعطي الاتجاه. الهوية النهائية تحتاج بحثاً ورسماً واختباراً وملفات وقواعد استخدام.',cta:'أرسل موجزاً جدياً →',
      placeholder:{offer:'قهوة مختصة وحلويات يدوية',audience:'أهل المدينة الذين يحبون الأماكن الهادئة',promise:'خدمة دافئة وإحساس محلي لا ينسى'},
      moods:{warm:'دافئ',elegant:'أنيق',minimal:'مينيمال',bold:'جريء',earthy:'ترابي',playful:'مرح'},
      inds:{cafe:'مقهى',fashion:'أزياء',tech:'تقنية',bookstore:'مكتبة',studio:'استوديو',beauty:'تجميل',restaurant:'مطعم',other:'أخرى'},
      kw:{warm:['دافئ','يدوي','مُرحِّب'],elegant:['راقٍ','خالد','مدروس'],minimal:['نظيف','هادئ','دقيق'],bold:['واثق','عصري','واضح'],earthy:['طبيعي','راسخ','صادق'],playful:['مشرق','ودود','حيوي']},
      insight:{cafe:'اجعل اللافتة واضحة، والقائمة هادئة، والتغليف قابلاً للتذكر.',fashion:'ليعمل الشعار على البطاقات والأكياس والصور والملصقات الصغيرة.',tech:'حافظ على وضوح النظام في الأيقونة والعرض وواجهة المنتج.',bookstore:'امنح الاسم إيقاعاً أدبياً ومزاج قراءة هادئاً.',studio:'أظهر الحرفة والعملية والثقة دون ازدحام.',beauty:'وازن النعومة مع التفاصيل الراقية وقواعد التغليف.',restaurant:'ليكن الشعار مقروءاً ليلاً، على القائمة ومواد التوصيل.',other:'ابدأ بوعد واضح ثم كرره في كل نقطة ظهور.'},
      tagline:{cafe:'كوب أهدأ، يبقى في الذاكرة.',fashion:'مصنوع ليلبس ويحفظ ويُسمى.',tech:'أدوات نافعة، مصنوعة بوضوح.',bookstore:'كتب مختارة بعين إنسانية.',studio:'عمل بيد ظاهرة.',beauty:'عناية تُرى وتُحس.',restaurant:'مكان يعود إليه الناس.',other:'اسم وراءه نظام.'},
      position:function(n,o,a,p,ind){ return n+' علامة في مجال '+ind+' لـ '+a+'. تقدم '+o+'، بوعد '+p+'.'; },
      say:{warm:['قريب','طازج','إنساني'],elegant:['هادئ','دقيق','فاخر'],minimal:['مباشر','نافع','نظيف'],bold:['واضح','جريء','سريع'],earthy:['صادق','محلي','طبيعي'],playful:['مشرق','خفيف','ودود']},
      avoid:{warm:['بارد','عام','مزخرف جداً'],elegant:['رخيص','مزدحم','صاخب'],minimal:['فارغ','غامض','باهت'],bold:['عدواني','فوضوي','مصطنع'],earthy:['قديم','ثقيل','مغبر'],playful:['طفولي','عشوائي','بلاستيكي']},
      checklist:['الشعار مقروء صغيراً','لون أساسي واحد محدد','ثنائي الخطوط مختبر','صورة التواصل جاهزة','اتجاه البطاقة مطبوع','رسالة الإطلاق واضحة'],
      kitItems:['فكرة الشعار','أدوار الألوان','ثنائي الخط','كلمات الصوت','نموذج اجتماعي','اتجاه الطباعة']
    },
    kmr:{
      eyebrow:'Studyo ya brandê · Bêpere',title:'Sîstemeke brandê ya bikêr ava bike.',intro:'Nav, soz, arasteya logo, reng, font, deng, mockup û lîsteya destpêkê di yek tabloyê de.',
      lName:'Navê brandê (Latînî)',lKu:'Navê brandê (Kurdî)',lOffer:'Tu çi difiroşî?',lAudience:'Ji bo kê ye?',lPromise:'Soza brandê',lField:'Warê kar',lMood:'Kesayetî',
      shuffle:'Arasteya nû',download:'Tabloyê daxîne',ready:'Amadetiya brandê',readyHint:'Qadên kurteyê tijî bike da tablo zelaltir bibe.',
      brief:'Stratejî',logo:'Laboratuwara logo',palette:'Sîstema rengan',type:'Sîstema fontan',apps:'Cihên bikaranînê',voice:'Dengê brandê',check:'Lîsteya destpêkê',kit:'Kîta destpêkê',
      latin:'Latînî',kurdish:'Kurdî',made:'BI BÊPERE BI BQURTAS.COM HATE ÇÊKIRIN',scoreNote:'hêza destpêkê',primary:'Sereke',accent:'Alîkar',paper:'Bingeh',ink:'Nivîs',
      wordmark:'Nîşana peyvê',monogram:'Yek tîp',seal:'Mor',social:'Civakî',sign:'Tablo',card:'Kart',pack:'Pakêt',toneGood:'Bi kar bîne',toneAvoid:'Dûr bikeve',
      sTitle:'Vê sîstemê biparêze',sText:'Ji xwe re bişîne û berî axaftina bi sêwirmend, çapxane an hevkarê re arasteyê biparêze.',send:'Bişîne',sent:'Hate şandin. Zû qutiya xwe kontrol bike.',bad:'Emailek rast binivîse.',
      ctaTitle:'Nasnameya rastîn dixwazî?',ctaText:'Ev tablo araste dide. Nasnameya dawî lêkolîn, xêzkirin, ceribandin, pel û rêbazên bikaranînê dixwaze.',cta:'Kurteyek cidî bişîne →',
      placeholder:{offer:'qehweya taybet û şîrîniya destçêkirî',audience:'mirovên bajêr ku cihên aram hez dikin',promise:'xizmeteke germ û hesteke herêmî ya bîranînê'},
      moods:{warm:'Germ',elegant:'Şênber',minimal:'Mînîmal',bold:'Wêrek',earthy:'Axî',playful:'Geş'},
      inds:{cafe:'Qehwexane',fashion:'Moda',tech:'Teknolojî',bookstore:'Pirtûkfiroş',studio:'Studyo',beauty:'Bedewî',restaurant:'Xwaringeh',other:'Yên din'},
      kw:{warm:['germ','destçêkirî','vexwendker'],elegant:['paqij','herheyî','baldar'],minimal:['paqij','aram','rast'],bold:['piştrast','nûjen','zelal'],earthy:['xwezayî','bicî','dilrast'],playful:['geş','dostane','bicoş']},
      insight:{cafe:'Tabloyê xuyakirî, menuyê aram û pakêtê bîranînbar bike.',fashion:'Logo divê li tag, çente, wêne û labelên biçûk jî kar bike.',tech:'Sîstemê di îkon, pêşkêşî û rûyê hilberê de zelal bihêle.',bookstore:'Navê brandê bi rîtmeke edebî û hesteke xwendinê ya aram bide.',studio:'Karzanî, pêvajo û baweriyê nîşan bide bê qerebalixî.',beauty:'Nermî bi hûrgiliyên giranbiha û rêbazên pakêtê re hevseng bike.',restaurant:'Logo şevê, li menu û tiştên şandinê de xwendbar be.',other:'Bi sozeke zelal dest pê bike, paşê li her cihî wê dubare bike.'},
      tagline:{cafe:'Kasek aramtir, bîranîntir.',fashion:'Ji bo lixwekirin û mayînê.',tech:'Amûrên bikêr, bi zelalî hatine çêkirin.',bookstore:'Pirtûk bi çavekî mirovî hilbijartî.',studio:'Kar bi destekî xuya.',beauty:'Xemgîniyek ku tê dîtin û hîskirin.',restaurant:'Cihek ku mirov vedigerin.',other:'Navek ku sîstem li pişt e.'},
      position:function(n,o,a,p,ind){ return n+' brandeke '+ind+' ye ji bo '+a+'. '+o+' pêşkêş dike, bi soza '+p+'.'; },
      say:{warm:['nêz','teze','mirovî'],elegant:['aram','hûr','giranbiha'],minimal:['rast','bikêr','paqij'],bold:['zelal','wêrek','lez'],earthy:['dilrast','herêmî','xwezayî'],playful:['geş','sivik','dostane']},
      avoid:{warm:['sar','giştî','pir xemilandî'],elegant:['erzan','qerebalix','bilind'],minimal:['vala','nezelal','bêcan'],bold:['tund','tevlihev','zorê'],earthy:['kevnar','giran','bêruh'],playful:['zarokî','rasthatî','plastîkî']},
      checklist:['Logo biçûk xwendbar e','Rengek sereke hatiye hilbijartin','Cota fontan hatiye ceribandin','Avatarê civakî amade ye','Arasteya karta çapê heye','Peyama destpêkê zelal e'],
      kitItems:['Ramana logo','Rolên rengan','Cota fontan','Peyvên dengê','Mockupa civakî','Arasteya çapê']
    },
    fr:{
      eyebrow:'Studio de marque · gratuit',title:'Construisez un système de marque utilisable.',intro:'Nom, promesse, direction logo, couleur, typographie, voix, maquettes et checklist de lancement dans une seule planche.',
      lName:'Nom de marque (latin)',lKu:'Nom de marque (kurde)',lOffer:'Que vendez-vous ?',lAudience:'Pour qui ?',lPromise:'Promesse de marque',lField:'Domaine',lMood:'Personnalité',
      shuffle:'Nouvelle direction',download:'Télécharger la planche',ready:'Préparation de marque',readyHint:'Complétez le brief pour rendre la planche plus précise.',
      brief:'Stratégie',logo:'Laboratoire logo',palette:'Système couleur',type:'Système typographique',apps:'Points de contact',voice:'Voix',check:'Checklist de lancement',kit:'Kit de départ',
      latin:'Latin',kurdish:'Kurde',made:'CRÉÉ GRATUITEMENT AVEC BQURTAS.COM',scoreNote:'force de départ',primary:'Primaire',accent:'Accent',paper:'Fond',ink:'Texte',
      wordmark:'Mot-symbole',monogram:'Monogramme',seal:'Sceau',social:'Social',sign:'Enseigne',card:'Carte',pack:'Pack',toneGood:'Utiliser',toneAvoid:'Éviter',
      sTitle:'Gardez ce système',sText:'Envoyez-le-vous pour conserver la direction avant de parler à un designer, imprimeur ou partenaire.',send:'Envoyer',sent:'Envoyé. Vérifiez bientôt votre boîte.',bad:'Saisissez un e-mail valide.',
      ctaTitle:'Besoin de la vraie identité ?',ctaText:'Cette planche donne une direction. L’identité finale demande recherche, dessin, tests, fichiers et règles d’usage.',cta:'Envoyer un brief sérieux →',
      placeholder:{offer:'café de spécialité et douceurs artisanales',audience:'des citadins qui aiment les lieux calmes',promise:'un service chaleureux et une sensation locale mémorable'},
      moods:{warm:'Chaleureux',elegant:'Élégant',minimal:'Minimal',bold:'Audacieux',earthy:'Terreux',playful:'Ludique'},
      inds:{cafe:'Café',fashion:'Mode',tech:'Tech',bookstore:'Librairie',studio:'Studio',beauty:'Beauté',restaurant:'Restaurant',other:'Autre'},
      kw:{warm:['chaleureux','artisanal','accueillant'],elegant:['raffiné','intemporel','réfléchi'],minimal:['épuré','calme','précis'],bold:['assuré','moderne','clair'],earthy:['naturel','ancré','honnête'],playful:['vif','amical','vivant']},
      insight:{cafe:'Rendez l’enseigne visible, le menu calme et le packaging mémorable.',fashion:'Le signe doit vivre sur étiquettes, sacs, photos et petits labels.',tech:'Gardez le système clair dans l’icône, le pitch et l’interface produit.',bookstore:'Donnez au nom un rythme littéraire et une humeur de lecture calme.',studio:'Montrez le métier, le processus et la confiance sans bruit visuel.',beauty:'Équilibrez douceur, détail premium et règles de packaging.',restaurant:'Le signe doit rester lisible la nuit, au menu et en livraison.',other:'Commencez par une promesse claire puis répétez-la partout.'},
      tagline:{cafe:'Une tasse plus calme, qui reste.',fashion:'Fait pour être porté, gardé, nommé.',tech:'Des outils utiles, clairement faits.',bookstore:'Des livres choisis par un regard humain.',studio:'Un travail avec une main visible.',beauty:'Un soin qui se voit et se sent.',restaurant:'Un lieu où l’on revient.',other:'Un nom avec un système derrière.'},
      position:function(n,o,a,p,ind){ return n+' est une marque '+ind+' pour '+a+'. Elle propose '+o+', avec la promesse suivante : '+p+'.'; },
      say:{warm:['proche','frais','humain'],elegant:['mesuré','calme','premium'],minimal:['direct','utile','net'],bold:['clair','brave','rapide'],earthy:['honnête','local','naturel'],playful:['lumineux','léger','amical']},
      avoid:{warm:['froid','générique','trop décoré'],elegant:['cheap','chargé','bruyant'],minimal:['vide','flou','plat'],bold:['agressif','désordonné','forcé'],earthy:['poussiéreux','lourd','ancien'],playful:['enfantin','aléatoire','plastique']},
      checklist:['Logo lisible en petit','Couleur principale choisie','Duo typo testé','Avatar social prêt','Direction carte imprimée','Message de lancement clair'],
      kitItems:['Idée logo','Rôles couleur','Duo typo','Mots de voix','Maquette sociale','Direction print']
    },
    tr:{
      eyebrow:'Marka stüdyosu · ücretsiz',title:'Kullanılabilir bir marka sistemi kurun.',intro:'İsim, vaat, logo yönü, renk, yazı, ses, maketler ve lansman listesi tek panoda.',
      lName:'Marka adı (Latin)',lKu:'Marka adı (Kürtçe)',lOffer:'Ne satıyorsunuz?',lAudience:'Kimin için?',lPromise:'Marka vaadi',lField:'Alan',lMood:'Kişilik',
      shuffle:'Yeni yön',download:'Panoyu indir',ready:'Marka hazırlığı',readyHint:'Panoyu keskinleştirmek için brief alanlarını doldurun.',
      brief:'Strateji',logo:'Logo laboratuvarı',palette:'Renk sistemi',type:'Yazı sistemi',apps:'Temas noktaları',voice:'Ses',check:'Lansman listesi',kit:'Başlangıç kiti',
      latin:'Latin',kurdish:'Kürtçe',made:'BQURTAS.COM İLE ÜCRETSİZ YAPILDI',scoreNote:'başlangıç gücü',primary:'Birincil',accent:'Vurgu',paper:'Zemin',ink:'Metin',
      wordmark:'Kelime işareti',monogram:'Monogram',seal:'Mühür',social:'Sosyal',sign:'Tabela',card:'Kart',pack:'Paket',toneGood:'Kullan',toneAvoid:'Kaçın',
      sTitle:'Bu sistemi sakla',sText:'Bir tasarımcı, matbaa veya ortakla konuşmadan önce yönü korumak için kendine e-postala.',send:'Gönder',sent:'Gönderildi. Yakında gelen kutunu kontrol et.',bad:'Geçerli bir e-posta gir.',
      ctaTitle:'Gerçek kimlik mi gerekiyor?',ctaText:'Bu pano yön verir. Bitmiş kimlik araştırma, çizim, test, dosyalar ve kullanım kuralları ister.',cta:'Ciddi bir brief gönder →',
      placeholder:{offer:'özel kahve ve el yapımı tatlılar',audience:'sakin yerleri seven şehir insanları',promise:'sıcak hizmet ve akılda kalan yerel his'},
      moods:{warm:'Sıcak',elegant:'Zarif',minimal:'Minimal',bold:'Cesur',earthy:'Topraksı',playful:'Eğlenceli'},
      inds:{cafe:'Kafe',fashion:'Moda',tech:'Teknoloji',bookstore:'Kitapçı',studio:'Stüdyo',beauty:'Güzellik',restaurant:'Restoran',other:'Diğer'},
      kw:{warm:['sıcak','el yapımı','davetkâr'],elegant:['zarif','zamansız','özenli'],minimal:['temiz','sakin','net'],bold:['kendinden emin','modern','açık'],earthy:['doğal','sağlam','dürüst'],playful:['canlı','dostça','enerjik']},
      insight:{cafe:'Tabelayı görünür, menüyü sakin, ambalajı akılda kalır yapın.',fashion:'İşaret etiket, çanta, fotoğraf ve küçük label üzerinde çalışmalı.',tech:'Sistemi ikon, sunum ve ürün arayüzünde net tutun.',bookstore:'İsme edebi bir ritim ve sakin okuma havası verin.',studio:'Zanaati, süreci ve güveni görsel gürültü olmadan gösterin.',beauty:'Yumuşaklığı premium detay ve ambalaj kurallarıyla dengeleyin.',restaurant:'İşaret gece, menüde ve teslimat malzemesinde okunur olmalı.',other:'Net bir vaatle başlayın, sonra her temas noktasında tekrarlayın.'},
      tagline:{cafe:'Daha sakin, hatırlanan bir fincan.',fashion:'Giyilmek, saklanmak ve adlandırılmak için.',tech:'Faydalı araçlar, açıkça yapılmış.',bookstore:'İnsan gözüyle seçilen kitaplar.',studio:'Görünür bir elle yapılan iş.',beauty:'Görülen ve hissedilen bakım.',restaurant:'İnsanların döndüğü yer.',other:'Arkasında sistem olan bir isim.'},
      position:function(n,o,a,p,ind){ return n+', '+a+' için bir '+ind+' markasıdır. '+o+' sunar; vaadi '+p+'.'; },
      say:{warm:['yakın','taze','insani'],elegant:['ölçülü','sakin','premium'],minimal:['doğrudan','yararlı','temiz'],bold:['açık','cesur','hızlı'],earthy:['dürüst','yerel','doğal'],playful:['parlak','hafif','dostça']},
      avoid:{warm:['soğuk','genel','fazla süslü'],elegant:['ucuz','kalabalık','gürültülü'],minimal:['boş','belirsiz','düz'],bold:['agresif','dağınık','zoraki'],earthy:['eski','ağır','tozlu'],playful:['çocukça','rastgele','plastik']},
      checklist:['Logo küçükken okunur','Bir ana renk seçildi','Yazı çifti test edildi','Sosyal avatar hazır','Baskı kart yönü var','Lansman mesajı açık'],
      kitItems:['Logo fikri','Renk rolleri','Yazı çifti','Ses kelimeleri','Sosyal maket','Baskı yönü']
    },
    sv:{
      eyebrow:'Varumärkesstudio · gratis',title:'Bygg ett fungerande varumärkessystem.',intro:'Namn, löfte, logoriktning, färg, typografi, röst, mockups och lanseringslista i en levande tavla.',
      lName:'Varumärkesnamn (latin)',lKu:'Varumärkesnamn (kurdiska)',lOffer:'Vad säljer du?',lAudience:'För vem?',lPromise:'Varumärkeslöfte',lField:'Område',lMood:'Personlighet',
      shuffle:'Ny riktning',download:'Ladda ner tavlan',ready:'Varumärkesberedskap',readyHint:'Fyll i briefen för att göra tavlan skarpare.',
      brief:'Strategi',logo:'Logolabb',palette:'Färgsystem',type:'Typsystem',apps:'Kontaktpunkter',voice:'Röst',check:'Lanseringslista',kit:'Startkit',
      latin:'Latin',kurdish:'Kurdiska',made:'GJORD GRATIS MED BQURTAS.COM',scoreNote:'startstyrka',primary:'Primär',accent:'Accent',paper:'Grund',ink:'Text',
      wordmark:'Ordmärke',monogram:'Monogram',seal:'Sigill',social:'Socialt',sign:'Skylt',card:'Kort',pack:'Pack',toneGood:'Använd',toneAvoid:'Undvik',
      sTitle:'Spara systemet',sText:'Mejla det till dig själv och behåll riktningen innan du pratar med formgivare, tryckeri eller partner.',send:'Skicka',sent:'Skickat. Kolla inkorgen snart.',bad:'Ange en giltig e-post.',
      ctaTitle:'Behöver du den riktiga identiteten?',ctaText:'Tavlan ger riktning. Den färdiga identiteten kräver research, teckning, test, filer och regler för bruk.',cta:'Skicka en seriös brief →',
      placeholder:{offer:'specialkaffe och handgjorda sötsaker',audience:'stadsbor som tycker om lugna platser',promise:'varm service och en minnesvärd lokal känsla'},
      moods:{warm:'Varm',elegant:'Elegant',minimal:'Minimal',bold:'Djärv',earthy:'Jordnära',playful:'Lekfull'},
      inds:{cafe:'Kafé',fashion:'Mode',tech:'Teknik',bookstore:'Bokhandel',studio:'Studio',beauty:'Skönhet',restaurant:'Restaurang',other:'Annat'},
      kw:{warm:['varm','handgjord','inbjudande'],elegant:['förfinad','tidlös','genomtänkt'],minimal:['ren','lugn','precis'],bold:['självsäker','modern','tydlig'],earthy:['naturlig','jordnära','ärlig'],playful:['ljus','vänlig','livfull']},
      insight:{cafe:'Gör skylten synlig, menyn lugn och förpackningen minnesvärd.',fashion:'Märket ska fungera på etiketter, påsar, bilder och små labels.',tech:'Håll systemet tydligt i ikon, pitch och produktgränssnitt.',bookstore:'Ge namnet en litterär rytm och en lugn läskänsla.',studio:'Visa hantverk, process och tillit utan visuell röra.',beauty:'Balansera mjukhet med premiumdetalj och förpackningsregler.',restaurant:'Märket ska vara läsbart på kvällen, i menyn och vid leverans.',other:'Börja med ett tydligt löfte och upprepa det överallt.'},
      tagline:{cafe:'En lugnare kopp, värd att minnas.',fashion:'Gjort för att bäras, sparas och namnges.',tech:'Nyttiga verktyg, tydligt gjorda.',bookstore:'Böcker valda med mänskligt öga.',studio:'Arbete med en synlig hand.',beauty:'Omsorg som syns och känns.',restaurant:'En plats människor återvänder till.',other:'Ett namn med system bakom sig.'},
      position:function(n,o,a,p,ind){ return n+' är ett '+ind+'-varumärke för '+a+'. Det erbjuder '+o+', med löftet '+p+'.'; },
      say:{warm:['nära','fräsch','mänsklig'],elegant:['mätt','lugn','premium'],minimal:['direkt','nyttig','ren'],bold:['tydlig','modig','snabb'],earthy:['ärlig','lokal','naturlig'],playful:['ljus','lätt','vänlig']},
      avoid:{warm:['kall','generisk','överdekorerad'],elegant:['billig','trång','högljudd'],minimal:['tom','oklar','platt'],bold:['aggressiv','rörig','forcerad'],earthy:['dammig','tung','gammal'],playful:['barnslig','slumpmässig','plastig']},
      checklist:['Logon läsbar liten','En huvudfärg vald','Typpar testat','Social avatar klar','Tryckt kort riktat','Lanseringsbudskap tydligt'],
      kitItems:['Logoidé','Färgroller','Typpar','Röstande ord','Social mockup','Tryckriktning']
    }
  };

  const DEFAULTS = {
    en:{name:'Hawar',ku:'هەوار'},
    ku:{name:'Hawar',ku:'هەوار'},
    ar:{name:'Hawar',ku:'هەوار'},
    kmr:{name:'Hawar',ku:'هەوار'},
    fr:{name:'Hawar',ku:'هەوار'},
    tr:{name:'Hawar',ku:'هەوار'},
    sv:{name:'Hawar',ku:'هەوار'}
  };

  mount.innerHTML =
    '<div class="bb-stage">'
  +   '<aside class="bb-controls">'
  +     '<div class="bb-control-head"><span class="mono" id="bbEyebrow"></span><h3 id="bbControlTitle"></h3><p id="bbControlText"></p></div>'
  +     '<div class="bb-field"><label id="bbLName"></label><input class="bb-input" id="bbName" maxlength="26"></div>'
  +     '<div class="bb-field"><label id="bbLKu"></label><input class="bb-input ku" id="bbKu" maxlength="26"></div>'
  +     '<div class="bb-field"><label id="bbLOffer"></label><textarea class="bb-input bb-area" id="bbOffer" maxlength="80"></textarea></div>'
  +     '<div class="bb-field"><label id="bbLAudience"></label><textarea class="bb-input bb-area" id="bbAudience" maxlength="80"></textarea></div>'
  +     '<div class="bb-field"><label id="bbLPromise"></label><textarea class="bb-input bb-area" id="bbPromise" maxlength="80"></textarea></div>'
  +     '<div class="bb-field"><label id="bbLField"></label><select class="bb-select" id="bbIndustry"></select></div>'
  +     '<div class="bb-field"><label id="bbLMood"></label><div class="bb-chips" id="bbMoodChips"></div></div>'
  +     '<div class="bb-readiness"><div><span id="bbReadyLabel"></span><b id="bbScore"></b></div><span class="bb-scorebar"><span id="bbScoreFill" data-css="width:0%"></span></span><p id="bbReadyHint"></p></div>'
  +     '<div class="bb-actions"><button class="bb-btn" id="bbShuffle"></button><button class="bb-btn ghost" id="bbDownload"></button></div>'
  +   '</aside>'
  +   '<div class="bb-board-wrap">'
  +     '<div class="bb-board" id="bbBoard">'
  +       '<section class="bb-cover">'
  +         '<div class="bb-cover-top"><span class="mono" id="bbBoardKicker"></span><span class="mono" id="bbScoreNote"></span></div>'
  +         '<div class="bb-mark"><div class="bb-mark-latin" id="bbMarkLatin"></div><div class="bb-mark-ku" id="bbMarkKu"></div><div class="bb-mark-rule"></div></div>'
  +         '<div class="bb-cover-grid"><span id="bbCoverIndustry"></span><span id="bbCoverMood"></span><span id="bbCoverTagline"></span></div>'
  +       '</section>'
  +       '<section class="bb-row bb-strategy"><div class="bb-row-h" id="bbHBrief"></div><div class="bb-strategy-grid"><div><small id="bbStrategyLabel"></small><p id="bbPositioning"></p></div><div><small id="bbInsightLabel"></small><p id="bbIndustryInsight"></p></div></div></section>'
  +       '<section class="bb-row"><div class="bb-row-h" id="bbHLogo"></div><div class="bb-logo-lab"><div class="bb-logo-card word"><small id="bbWordmarkLabel"></small><b id="bbLogoWord"></b></div><div class="bb-logo-card mono"><small id="bbMonoLabel"></small><b id="bbLogoMono"></b></div><div class="bb-logo-card seal"><small id="bbSealLabel"></small><b id="bbLogoSeal"></b><span id="bbLogoSealKu"></span></div></div></section>'
  +       '<section class="bb-row"><div class="bb-row-h" id="bbHPalette"></div><div class="bb-swatches" id="bbSwatches"></div></section>'
  +       '<section class="bb-row"><div class="bb-row-h" id="bbHType"></div><div class="bb-types"><div class="bb-type"><small id="bbTyLatinName"></small><div class="bb-type-latin" id="bbTyLatin"></div><p id="bbTyLatinUse"></p></div><div class="bb-type"><small id="bbTyKuName"></small><div class="bb-type-ku" id="bbTyKu"></div><p id="bbTyKuUse"></p></div></div></section>'
  +       '<section class="bb-row"><div class="bb-row-h" id="bbHApps"></div><div class="bb-apps"><div class="bb-app sign"><span id="bbAppSign"></span></div><div class="bb-app card"><span id="bbAppCard"></span><em id="bbAppCardSub"></em></div><div class="bb-app social"><span id="bbAppAva"></span></div><div class="bb-app pack"><span id="bbAppPack"></span></div></div></section>'
  +       '<section class="bb-row"><div class="bb-row-h" id="bbHVoice"></div><div class="bb-voice-grid"><div><small id="bbToneGood"></small><div class="bb-keywords" id="bbVoiceSay"></div></div><div><small id="bbToneAvoid"></small><div class="bb-keywords avoid" id="bbVoiceAvoid"></div></div></div></section>'
  +       '<section class="bb-row"><div class="bb-row-h" id="bbHCheck"></div><div class="bb-checklist" id="bbChecklist"></div></section>'
  +       '<section class="bb-row"><div class="bb-row-h" id="bbHKit"></div><div class="bb-kit" id="bbKit"></div></section>'
  +       '<div class="bb-credit"><span class="mono" id="bbMade"></span><a href="/" data-route="design">bqurtas.com</a></div>'
  +     '</div>'
  +   '</div>'
  + '</div>'
  + '<div class="bb-after">'
  +   '<div class="bb-save"><h4 id="bbSTitle"></h4><p id="bbSText"></p><div class="bb-emailrow"><input id="bbEmail" type="email" placeholder="you@email.com"><button id="bbEmailBtn"></button></div><div class="bb-msg" id="bbEmailMsg"></div></div>'
  +   '<div class="bb-cta"><h4 id="bbCtaTitle"></h4><p id="bbCtaText"></p><a href="/contact" data-route="contact" id="bbCtaLink"></a></div>'
  + '</div>';

  const $ = (id) => document.getElementById(id);
  const SUPA = () => window.BQ_SUPA || { url:'https://dcnkhzrishphpismmxuu.supabase.co', key:'sb_publishable_FrR6Ur2yy-rOCgKk5D326w_j5rfBgV3' };
  const siteLang = () => {
    const l = document.documentElement.getAttribute('lang') || document.documentElement.dataset.lang || 'en';
    if (l === 'ckb') return 'ku';
    return TR[l] ? l : 'en';
  };
  let LANG = siteLang();
  const state = { mood:'warm', variant:0, industry:'cafe' };

  function lang(){ return TR[LANG] || TR.en; }
  function val(id, fallback){ return ($(id).value || fallback || '').trim(); }
  function firstChar(s){
    const chars = Array.from((s || '').replace(/\s+/g,''));
    return (chars[0] || 'B').toLocaleUpperCase();
  }
  function setText(id, text){ const el = $(id); if (el) el.textContent = text; }
  function list(id, items, cls){
    const el = $(id);
    el.innerHTML = '';
    items.forEach((item) => {
      const span = document.createElement('span');
      span.className = cls || 'bb-kw';
      span.textContent = item;
      el.appendChild(span);
    });
  }
  function buildMoodChips(){
    const wrap = $('bbMoodChips');
    wrap.innerHTML = '';
    MOOD_KEYS.forEach((m) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bb-chip' + (m === state.mood ? ' on' : '');
      b.textContent = lang().moods[m];
      b.addEventListener('click', () => {
        state.mood = m;
        state.variant = 0;
        buildMoodChips();
        render();
      });
      wrap.appendChild(b);
    });
  }
  function buildIndustries(){
    const select = $('bbIndustry');
    select.innerHTML = '';
    INDUSTRIES.forEach((key) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = lang().inds[key];
      option.selected = key === state.industry;
      select.appendChild(option);
    });
  }
  function applyLang(){
    const t = lang(), d = DEFAULTS[LANG] || DEFAULTS.en;
    setText('bbEyebrow', t.eyebrow); setText('bbControlTitle', t.title); setText('bbControlText', t.intro);
    setText('bbLName', t.lName); setText('bbLKu', t.lKu); setText('bbLOffer', t.lOffer); setText('bbLAudience', t.lAudience); setText('bbLPromise', t.lPromise);
    setText('bbLField', t.lField); setText('bbLMood', t.lMood); setText('bbShuffle', t.shuffle); setText('bbDownload', t.download);
    setText('bbReadyLabel', t.ready); setText('bbReadyHint', t.readyHint);
    $('bbName').placeholder = d.name; $('bbKu').placeholder = d.ku;
    $('bbOffer').placeholder = t.placeholder.offer; $('bbAudience').placeholder = t.placeholder.audience; $('bbPromise').placeholder = t.placeholder.promise;
    if (!$('bbName').value) $('bbName').value = d.name;
    if (!$('bbKu').value) $('bbKu').value = d.ku;
    setText('bbHBrief', t.brief); setText('bbHLogo', t.logo); setText('bbHPalette', t.palette); setText('bbHType', t.type); setText('bbHApps', t.apps);
    setText('bbHVoice', t.voice); setText('bbHCheck', t.check); setText('bbHKit', t.kit);
    setText('bbStrategyLabel', t.brief); setText('bbInsightLabel', t.inds[state.industry]); setText('bbWordmarkLabel', t.wordmark); setText('bbMonoLabel', t.monogram); setText('bbSealLabel', t.seal);
    setText('bbToneGood', t.toneGood); setText('bbToneAvoid', t.toneAvoid);
    setText('bbMade', t.made); setText('bbSTitle', t.sTitle); setText('bbSText', t.sText); setText('bbEmailBtn', t.send);
    setText('bbCtaTitle', t.ctaTitle); setText('bbCtaText', t.ctaText); setText('bbCtaLink', t.cta);
    buildMoodChips(); buildIndustries(); render();
  }
  function renderScore(){
    const t = lang();
    const filled = ['bbName','bbKu','bbOffer','bbAudience','bbPromise'].reduce((n, id) => n + (val(id).length > 2 ? 1 : 0), 0);
    const score = Math.min(96, 46 + filled * 9 + (state.industry !== 'other' ? 5 : 0));
    setText('bbScore', score + '%');
    setText('bbScoreNote', score + '% · ' + t.scoreNote);
    $('bbScoreFill').setAttribute('data-css', 'width:' + score + '%');
    try { $('bbScoreFill').style.setProperty('width', score + '%'); } catch (e) {}
  }
  function renderSwatches(pal){
    const t = lang();
    const roles = [t.paper, t.ink, t.primary, t.accent];
    const sw = $('bbSwatches');
    sw.innerHTML = '';
    pal.forEach((hex, i) => {
      const card = document.createElement('div');
      card.className = 'bb-sw';
      const b = document.createElement('b');
      b.setAttribute('data-css', 'background:' + hex);
      const role = document.createElement('small');
      role.textContent = roles[i];
      const code = document.createElement('span');
      code.textContent = hex.toUpperCase();
      card.appendChild(b); card.appendChild(role); card.appendChild(code);
      sw.appendChild(card);
    });
  }
  function renderChecklist(){
    const t = lang(), wrap = $('bbChecklist');
    wrap.innerHTML = '';
    t.checklist.forEach((item, index) => {
      const row = document.createElement('span');
      row.className = 'bb-check';
      row.innerHTML = '<i class="fa-solid fa-check"></i>';
      const text = document.createElement('b');
      text.textContent = item;
      row.appendChild(text);
      if (index % 2 === 1) row.classList.add('soft');
      wrap.appendChild(row);
    });
  }
  function renderKit(){
    const wrap = $('bbKit');
    wrap.innerHTML = '';
    lang().kitItems.forEach((item, index) => {
      const part = document.createElement('span');
      part.className = 'bb-kit-item mono';
      part.textContent = String(index + 1).padStart(2,'0') + ' · ' + item;
      wrap.appendChild(part);
    });
  }
  function render(){
    const t = lang(), m = MOODS[state.mood];
    const pal = m.p[state.variant % m.p.length];
    const [paper, ink, primary, accent] = pal;
    const board = $('bbBoard');
    const style = board.style;
    style.setProperty('--board-paper', paper); style.setProperty('--board-ink', ink);
    style.setProperty('--board-primary', primary); style.setProperty('--board-accent', accent);
    style.setProperty('--latin', "'" + m.fonts.latin + "'"); style.setProperty('--latin-style', m.fonts.ls); style.setProperty('--ku', "'" + m.fonts.ku + "'");
    board.setAttribute('data-mood', state.mood);

    const name = val('bbName', (DEFAULTS[LANG] || DEFAULTS.en).name);
    const ku = val('bbKu', (DEFAULTS[LANG] || DEFAULTS.en).ku);
    const offer = val('bbOffer', t.placeholder.offer);
    const audience = val('bbAudience', t.placeholder.audience);
    const promise = val('bbPromise', t.placeholder.promise);
    const industry = t.inds[state.industry] || t.inds.other;
    const tagline = t.tagline[state.industry] || t.tagline.other;

    setText('bbBoardKicker', t.eyebrow);
    setText('bbMarkLatin', name);
    setText('bbMarkKu', ku);
    $('bbMarkKu').style.display = ku ? 'block' : 'none';
    setText('bbCoverIndustry', industry);
    setText('bbCoverMood', t.moods[state.mood]);
    setText('bbCoverTagline', tagline);
    setText('bbInsightLabel', industry);
    setText('bbPositioning', t.position(name, offer, audience, promise, industry));
    setText('bbIndustryInsight', t.insight[state.industry] || t.insight.other);

    setText('bbLogoWord', name);
    setText('bbLogoMono', firstChar(name));
    setText('bbLogoSeal', firstChar(name));
    setText('bbLogoSealKu', ku || name);
    setText('bbTyLatin', name + ' Aa Bb Cc');
    setText('bbTyKu', ku || 'ئاوەز');
    setText('bbTyLatinName', t.latin + ' · ' + m.fonts.ln);
    setText('bbTyKuName', t.kurdish + ' · ' + m.fonts.kn);
    setText('bbTyLatinUse', t.kw[state.mood].join(' · '));
    setText('bbTyKuUse', tagline);

    setText('bbAppSign', name);
    setText('bbAppCard', name);
    setText('bbAppCardSub', industry);
    setText('bbAppAva', firstChar(name));
    setText('bbAppPack', ku || name);

    renderSwatches(pal);
    list('bbVoiceSay', t.say[state.mood]);
    list('bbVoiceAvoid', t.avoid[state.mood]);
    renderChecklist();
    renderKit();
    renderScore();
  }

  ['bbName','bbKu','bbOffer','bbAudience','bbPromise'].forEach((id) => $(id).addEventListener('input', render));
  $('bbIndustry').addEventListener('change', (e) => { state.industry = e.target.value; render(); });
  $('bbShuffle').addEventListener('click', () => {
    const mood = MOODS[state.mood];
    if (mood.p.length > 1 && state.variant < mood.p.length - 1) state.variant += 1;
    else {
      const next = MOOD_KEYS.filter((x) => x !== state.mood);
      state.mood = next[Math.floor(Math.random() * next.length)];
      state.variant = 0;
      buildMoodChips();
    }
    render();
  });
  $('bbDownload').addEventListener('click', () => {
    const board = $('bbBoard');
    const go = () => window.html2canvas(board, { backgroundColor:null, scale:2 }).then((canvas) => {
      const a = document.createElement('a');
      a.download = (val('bbName','brand').replace(/\s+/g,'-').toLowerCase()) + '-brand-system.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    });
    if (window.html2canvas) { go(); return; }
    const script = document.createElement('script');
    script.src = 'js/html2canvas.min.js';
    script.onload = go;
    document.head.appendChild(script);
  });
  $('bbEmailBtn').addEventListener('click', () => {
    const email = ($('bbEmail').value || '').trim();
    const msg = $('bbEmailMsg');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = lang().bad; return; }
    msg.textContent = '...';
    const SB = SUPA();
    fetch(SB.url + '/rest/v1/subscribers', {
      method:'POST',
      headers:{ apikey:SB.key, Authorization:'Bearer ' + SB.key, 'Content-Type':'application/json', Prefer:'return=minimal' },
      body:JSON.stringify({ email, lang:LANG, source:'brandboard' })
    }).then(() => {
      msg.textContent = lang().sent;
      $('bbEmail').value = '';
    }).catch(() => {
      msg.textContent = lang().sent;
      $('bbEmail').value = '';
    });
  });

  applyLang();
  new MutationObserver(() => {
    const next = siteLang();
    if (next !== LANG) { LANG = next; applyLang(); }
  }).observe(document.documentElement, { attributes:true, attributeFilter:['lang','data-lang'] });
})();
