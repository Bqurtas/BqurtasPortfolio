/* =====================================================================
   Brand Board — a free bilingual (Kurdish + Latin) identity starter.
   Lives as a room (#brandboard) inside the SPA; this builds the tool into
   #brandboardMount, follows the SITE language, and re-renders on change.
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
   en:{eyebrow:'FREE · NO SIGN-UP',lName:'Brand name (Latin)',lKu:'Brand name (Kurdish)',lField:'Field',lMood:'Personality',shuffle:'Shuffle',download:'Download',palette:'Palette',type:'Typefaces',apps:'In use',feels:'Feels',latin:'Latin',kurdish:'Kurdish',made:'MADE FREE WITH BQURTAS.COM',sTitle:'Keep this board',sText:"Email it to yourself and get a fuller starter kit — spacing, do's & don'ts, and a print-ready sheet.",send:'Send',sent:'Sent — check your inbox soon.',bad:'Enter a valid email.',ctaTitle:'Want the real thing?',ctaText:"This is a starting point. A real identity is researched, drawn and tested. Let's build yours.",cta:'Start a conversation →',
     moods:{warm:'Warm',elegant:'Elegant',minimal:'Minimal',bold:'Bold',earthy:'Earthy',playful:'Playful'},
     inds:{cafe:'Café',fashion:'Fashion',tech:'Tech',bookstore:'Bookstore',studio:'Studio',beauty:'Beauty',restaurant:'Restaurant',other:'Other'},
     kw:{warm:['warm','handmade','inviting'],elegant:['refined','timeless','considered'],minimal:['clean','calm','precise'],bold:['confident','modern','loud'],earthy:['natural','grounded','honest'],playful:['bright','friendly','spirited']}},
   ku:{eyebrow:'بێ بەرامبەر · بێ تۆمارکردن',lName:'ناوی براند (لاتین)',lKu:'ناوی براند (کوردی)',lField:'بوار',lMood:'کەسایەتی',shuffle:'تێکەڵکردن',download:'داگرتن',palette:'پاڵێت',type:'فۆنتەکان',apps:'لە بەکارهێنان',feels:'هەست',latin:'لاتین',kurdish:'کوردی',made:'بە بێ بەرامبەر دروستکرا بە BQURTAS.COM',sTitle:'ئەم تابلۆیە بپارێزە',sText:'بۆ خۆتی بنێرە و کیتێکی تەواوتر وەربگرە — بۆشایی، کارە دروست و هەڵەکان، و پەڕەیەکی ئامادەی چاپ.',send:'ناردن',sent:'نێردرا — بەم زووانە سندوقەکەت بپشکنە.',bad:'ئیمەیڵێکی دروست بنووسە.',ctaTitle:'شتی ڕاستەقینەت دەوێت؟',ctaText:'ئەمە خاڵی دەستپێکە. ناسنامەی ڕاستەقینە لێکۆڵینەوە و کێشان و تاقیکردنەوەی پێویستە. با هی تۆ دروست بکەین.',cta:'دەست بە گفتوگۆ بکە →',
     moods:{warm:'گەرم',elegant:'شیک',minimal:'مینیمال',bold:'جورئەتدار',earthy:'خاکی',playful:'گەشاوە'},
     inds:{cafe:'کافێ',fashion:'فاشن',tech:'تەکنەلۆجیا',bookstore:'کتێبفرۆشی',studio:'ستۆدیۆ',beauty:'جوانکاری',restaurant:'چێشتخانە',other:'تر'},
     kw:{warm:['گەرم','دەستکرد','بانگهێشتکەر'],elegant:['شیک','نەمر','وردبینانە'],minimal:['پاک','هێمن','ورد'],bold:['متمانەبەخۆ','نوێ','بەهێز'],earthy:['سروشتی','جێگیر','ڕاستگۆ'],playful:['گەشاوە','دۆستانە','بەجۆش']}},
   ar:{eyebrow:'مجاني · بلا تسجيل',lName:'اسم العلامة (لاتيني)',lKu:'اسم العلامة (كردي)',lField:'المجال',lMood:'الشخصية',shuffle:'خلط',download:'تنزيل',palette:'الألوان',type:'الخطوط',apps:'في الاستخدام',feels:'الإحساس',latin:'لاتيني',kurdish:'كردي',made:'صُنع مجاناً عبر BQURTAS.COM',sTitle:'احتفظ بهذه اللوحة',sText:'أرسلها إلى بريدك واحصل على حزمة بداية أوفى — المسافات، الصواب والخطأ، وورقة جاهزة للطباعة.',send:'إرسال',sent:'تم الإرسال — تفقّد بريدك قريباً.',bad:'أدخل بريداً صحيحاً.',ctaTitle:'تريد الأصل الحقيقي؟',ctaText:'هذه نقطة بداية. الهوية الحقيقية تُبحث وتُرسم وتُختبر. لنصنع هويتك.',cta:'لنبدأ محادثة →',
     moods:{warm:'دافئ',elegant:'أنيق',minimal:'مينيمال',bold:'جريء',earthy:'ترابي',playful:'مرح'},
     inds:{cafe:'مقهى',fashion:'أزياء',tech:'تقنية',bookstore:'مكتبة',studio:'استوديو',beauty:'تجميل',restaurant:'مطعم',other:'أخرى'},
     kw:{warm:['دافئ','يدوي','مُرحِّب'],elegant:['راقٍ','خالد','مدروس'],minimal:['نظيف','هادئ','دقيق'],bold:['واثق','عصري','صاخب'],earthy:['طبيعي','راسخ','صادق'],playful:['مشرق','ودود','حيوي']}},
   kmr:{eyebrow:'BÊPERE · BÊ TOMARKIRIN',lName:'Navê brandê (Latînî)',lKu:'Navê brandê (Kurdî)',lField:'Warê kar',lMood:'Kesayetî',shuffle:'Tevlihevkirin',download:'Daxistin',palette:'Palet',type:'Font',apps:'Di bikaranînê de',feels:'Hest',latin:'Latînî',kurdish:'Kurdî',made:'BI BÊPERE BI BQURTAS.COM HATE ÇÊKIRIN',sTitle:'Vê tabloyê biparêze',sText:'Ji xwe re bişîne û kîtek tevahîtir bistîne — valahî, rast û çewt, û rûpelek amade ji bo çapê.',send:'Bişîne',sent:'Hate şandin — di demek nêz de qutiya xwe kontrol bike.',bad:'Emailek rast binivîse.',ctaTitle:'Ya rastîn dixwazî?',ctaText:'Ev xaleke destpêkê ye. Nasnameyek rastîn tê lêkolîn, xêzkirin û ceribandin. Em ya te ava bikin.',cta:'Dest bi axaftinê bike →',
     moods:{warm:'Germ',elegant:'Şênber',minimal:'Mînîmal',bold:'Wêrek',earthy:'Axî',playful:'Geş'},
     inds:{cafe:'Qehwexane',fashion:'Moda',tech:'Teknolojî',bookstore:'Pirtûkfiroş',studio:'Studyo',beauty:'Bedewî',restaurant:'Xwaringeh',other:'Yên din'},
     kw:{warm:['germ','destçêkirî','vexwendker'],elegant:['paqij','herheyî','baldar'],minimal:['paqij','aram','rast'],bold:['piştrast','nûjen','bilind'],earthy:['xwezayî','bicî','dilrast'],playful:['geş','dostane','bicoş']}},
   fr:{eyebrow:'GRATUIT · SANS INSCRIPTION',lName:'Nom de marque (latin)',lKu:'Nom de marque (kurde)',lField:'Domaine',lMood:'Personnalité',shuffle:'Mélanger',download:'Télécharger',palette:'Palette',type:'Polices',apps:'En usage',feels:'Ressenti',latin:'Latin',kurdish:'Kurde',made:'CRÉÉ GRATUITEMENT AVEC BQURTAS.COM',sTitle:'Gardez cette planche',sText:'Envoyez-la-vous et recevez un kit plus complet — espacements, à faire et à éviter, et une fiche prête à imprimer.',send:'Envoyer',sent:'Envoyé — vérifiez votre boîte bientôt.',bad:'Saisissez un e-mail valide.',ctaTitle:'Vous voulez le vrai ?',ctaText:"C'est un point de départ. Une vraie identité se recherche, se dessine et se teste. Créons la vôtre.",cta:'Démarrer une conversation →',
     moods:{warm:'Chaleureux',elegant:'Élégant',minimal:'Minimal',bold:'Audacieux',earthy:'Terreux',playful:'Ludique'},
     inds:{cafe:'Café',fashion:'Mode',tech:'Tech',bookstore:'Librairie',studio:'Studio',beauty:'Beauté',restaurant:'Restaurant',other:'Autre'},
     kw:{warm:['chaleureux','artisanal','accueillant'],elegant:['raffiné','intemporel','réfléchi'],minimal:['épuré','calme','précis'],bold:['assuré','moderne','franc'],earthy:['naturel','ancré','honnête'],playful:['vif','amical','enjoué']}},
   tr:{eyebrow:'ÜCRETSİZ · KAYIT YOK',lName:'Marka adı (Latin)',lKu:'Marka adı (Kürtçe)',lField:'Alan',lMood:'Kişilik',shuffle:'Karıştır',download:'İndir',palette:'Palet',type:'Yazı tipleri',apps:'Kullanımda',feels:'His',latin:'Latin',kurdish:'Kürtçe',made:'BQURTAS.COM İLE ÜCRETSİZ YAPILDI',sTitle:'Bu panoyu sakla',sText:'Kendine e-postayla gönder ve daha dolu bir başlangıç kiti al — boşluklar, yapılacaklar ve yapılmayacaklar, baskıya hazır sayfa.',send:'Gönder',sent:'Gönderildi — yakında gelen kutunu kontrol et.',bad:'Geçerli bir e-posta gir.',ctaTitle:'Gerçeğini ister misin?',ctaText:'Bu bir başlangıç noktası. Gerçek bir kimlik araştırılır, çizilir ve test edilir. Seninkini kuralım.',cta:'Bir sohbet başlat →',
     moods:{warm:'Sıcak',elegant:'Zarif',minimal:'Minimal',bold:'Cesur',earthy:'Topraksı',playful:'Eğlenceli'},
     inds:{cafe:'Kafe',fashion:'Moda',tech:'Teknoloji',bookstore:'Kitapçı',studio:'Stüdyo',beauty:'Güzellik',restaurant:'Restoran',other:'Diğer'},
     kw:{warm:['sıcak','el yapımı','davetkâr'],elegant:['zarif','zamansız','özenli'],minimal:['temiz','sakin','net'],bold:['kendinden emin','modern','gür'],earthy:['doğal','sağlam','dürüst'],playful:['canlı','dostça','neşeli']}},
   sv:{eyebrow:'GRATIS · INGEN REGISTRERING',lName:'Varumärkesnamn (latin)',lKu:'Varumärkesnamn (kurdiska)',lField:'Område',lMood:'Personlighet',shuffle:'Blanda',download:'Ladda ner',palette:'Palett',type:'Typsnitt',apps:'I bruk',feels:'Känsla',latin:'Latin',kurdish:'Kurdiska',made:'GJORD GRATIS MED BQURTAS.COM',sTitle:'Spara den här tavlan',sText:'Mejla den till dig själv och få ett fylligare startkit — mellanrum, gör och gör inte, och ett tryckfärdigt blad.',send:'Skicka',sent:'Skickat — kolla din inkorg snart.',bad:'Ange en giltig e-post.',ctaTitle:'Vill du ha den riktiga?',ctaText:'Detta är en startpunkt. En riktig identitet utforskas, ritas och testas. Låt oss bygga din.',cta:'Starta ett samtal →',
     moods:{warm:'Varm',elegant:'Elegant',minimal:'Minimal',bold:'Djärv',earthy:'Jordnära',playful:'Lekfull'},
     inds:{cafe:'Kafé',fashion:'Mode',tech:'Teknik',bookstore:'Bokhandel',studio:'Studio',beauty:'Skönhet',restaurant:'Restaurang',other:'Annat'},
     kw:{warm:['varm','handgjord','inbjudande'],elegant:['förfinad','tidlös','genomtänkt'],minimal:['ren','lugn','precis'],bold:['självsäker','modern','högljudd'],earthy:['naturlig','jordnära','ärlig'],playful:['ljus','vänlig','livfull']}}
  };

  mount.innerHTML =
   '<div class="bb-stage">'
   + '<aside class="bb-controls">'
   +   '<div class="bb-field"><label id="bbLName"></label><input class="bb-input" id="bbName" maxlength="22" value="Hawar"></div>'
   +   '<div class="bb-field"><label id="bbLKu"></label><input class="bb-input ku" id="bbKu" maxlength="22" value="هەوار"></div>'
   +   '<div class="bb-field"><label id="bbLField"></label><select class="bb-select" id="bbIndustry"></select></div>'
   +   '<div class="bb-field"><label id="bbLMood"></label><div class="bb-chips" id="bbMoodChips"></div></div>'
   +   '<div class="bb-actions"><button class="bb-btn" id="bbShuffle"></button><button class="bb-btn ghost" id="bbDownload"></button></div>'
   + '</aside>'
   + '<div class="bb-board" id="bbBoard">'
   +   '<div class="bb-mark"><div class="bb-mark-latin" id="bbMarkLatin">Hawar</div><div class="bb-mark-ku" id="bbMarkKu">هەوار</div><div class="bb-mark-rule"></div></div>'
   +   '<div class="bb-row"><div class="bb-row-h" id="bbHPalette"></div><div class="bb-swatches" id="bbSwatches"></div></div>'
   +   '<div class="bb-row"><div class="bb-row-h" id="bbHType"></div><div class="bb-types">'
   +     '<div class="bb-type"><small id="bbTyLatinName"></small><div class="bb-type-latin" id="bbTyLatin">Aa Bb Cc</div></div>'
   +     '<div class="bb-type"><small id="bbTyKuName"></small><div class="bb-type-ku" id="bbTyKu">ئاوەز</div></div>'
   +   '</div></div>'
   +   '<div class="bb-row"><div class="bb-row-h" id="bbHApps"></div><div class="bb-apps">'
   +     '<div class="bb-app card"><span class="bb-app-latin" id="bbAppCard">Hawar</span></div>'
   +     '<div class="bb-app sign"><span class="bb-app-latin" id="bbAppSign">Hawar</span></div>'
   +     '<div class="bb-app ava"><span class="bb-app-latin" id="bbAppAva">H</span></div>'
   +   '</div></div>'
   +   '<div class="bb-row"><div class="bb-row-h" id="bbHKw"></div><div class="bb-keywords" id="bbKeywords"></div></div>'
   +   '<div class="bb-credit"><span class="mono" id="bbMade"></span><a href="/" data-route="design">bqurtas.com</a></div>'
   + '</div>'
   + '</div>'
   + '<div class="bb-after">'
   +   '<div class="bb-save"><h4 id="bbSTitle"></h4><p id="bbSText"></p><div class="bb-emailrow"><input id="bbEmail" type="email" placeholder="you@email.com"><button id="bbEmailBtn"></button></div><div class="bb-msg" id="bbEmailMsg"></div></div>'
   +   '<div class="bb-cta"><h4 id="bbCtaTitle"></h4><p id="bbCtaText"></p><a href="/contact" data-route="contact" id="bbCtaLink"></a></div>'
   + '</div>';

  const $ = (id) => document.getElementById(id);
  const SUPA = () => window.BQ_SUPA || { url:'https://dcnkhzrishphpismmxuu.supabase.co', key:'sb_publishable_FrR6Ur2yy-rOCgKk5D326w_j5rfBgV3' };
  const siteLang = () => { const l = document.documentElement.getAttribute('lang') || document.documentElement.dataset.lang || 'en'; return TR[l] ? l : 'en'; };
  let LANG = siteLang();
  const state = { mood:'warm', variant:0, industry:'cafe' };

  function buildMoodChips(){
    const w = $('bbMoodChips'); w.innerHTML = '';
    MOOD_KEYS.forEach((m) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'bb-chip' + (m===state.mood?' on':''); b.textContent = TR[LANG].moods[m];
      b.onclick = () => { state.mood=m; state.variant=0; buildMoodChips(); render(); };
      w.appendChild(b);
    });
  }
  function buildIndustries(){
    const s = $('bbIndustry'); s.innerHTML = '';
    INDUSTRIES.forEach((i) => { const o=document.createElement('option'); o.value=i; o.textContent=TR[LANG].inds[i]; if(i===state.industry)o.selected=true; s.appendChild(o); });
  }
  function applyLang(){
    const t = TR[LANG];
    $('bbLName').textContent=t.lName; $('bbLKu').textContent=t.lKu; $('bbLField').textContent=t.lField; $('bbLMood').textContent=t.lMood;
    $('bbShuffle').textContent=t.shuffle; $('bbDownload').textContent=t.download;
    $('bbHPalette').textContent=t.palette; $('bbHType').textContent=t.type; $('bbHApps').textContent=t.apps; $('bbHKw').textContent=t.feels;
    $('bbMade').textContent=t.made; $('bbSTitle').textContent=t.sTitle; $('bbSText').textContent=t.sText; $('bbEmailBtn').textContent=t.send;
    $('bbCtaTitle').textContent=t.ctaTitle; $('bbCtaText').textContent=t.ctaText; $('bbCtaLink').textContent=t.cta;
    buildMoodChips(); buildIndustries(); render();
  }
  function render(){
    const m = MOODS[state.mood], t = TR[LANG];
    const pal = m.p[state.variant % m.p.length];
    const [paper,ink,primary,accent] = pal;
    const b = $('bbBoard').style;
    b.setProperty('--board-paper',paper); b.setProperty('--board-ink',ink);
    b.setProperty('--board-primary',primary); b.setProperty('--board-accent',accent);
    b.setProperty('--latin',"'"+m.fonts.latin+"'"); b.setProperty('--latin-style',m.fonts.ls); b.setProperty('--ku',"'"+m.fonts.ku+"'");
    const nm = ($('bbName').value||'Brand').trim(), kn = ($('bbKu').value||'').trim();
    $('bbMarkLatin').textContent = nm;
    $('bbMarkKu').textContent = kn; $('bbMarkKu').style.display = kn ? 'block' : 'none';
    $('bbAppCard').textContent = nm; $('bbAppSign').textContent = nm; $('bbAppAva').textContent = (nm[0]||'B').toUpperCase();
    $('bbTyLatin').textContent = nm; $('bbTyKu').textContent = kn || 'ئاوەز';
    $('bbTyLatinName').textContent = t.latin+' · '+m.fonts.ln; $('bbTyKuName').textContent = t.kurdish+' · '+m.fonts.kn;
    const sw = $('bbSwatches'); sw.innerHTML = '';
    pal.forEach((hex) => { const d=document.createElement('div'); d.className='bb-sw'; d.innerHTML='<b data-css="background:'+hex+'"></b><span>'+hex.toUpperCase()+'</span>'; sw.appendChild(d); });
    const kw = $('bbKeywords'); kw.innerHTML = '';
    t.kw[state.mood].forEach((w) => { const s=document.createElement('span'); s.className='bb-kw'; s.textContent=w; kw.appendChild(s); });
  }

  $('bbName').addEventListener('input', render);
  $('bbKu').addEventListener('input', render);
  $('bbIndustry').addEventListener('change', (e) => { state.industry = e.target.value; });
  $('bbShuffle').addEventListener('click', () => {
    const m = MOODS[state.mood];
    if (m.p.length > 1) state.variant = (state.variant + 1) % m.p.length;
    else { const o = MOOD_KEYS.filter((x)=>x!==state.mood); state.mood = o[Math.floor(Math.random()*o.length)]; state.variant = 0; buildMoodChips(); }
    render();
  });
  $('bbDownload').addEventListener('click', () => {
    const board = $('bbBoard');
    const go = () => window.html2canvas(board, { backgroundColor:null, scale:2 }).then((c) => {
      const a = document.createElement('a');
      a.download = (($('bbName').value||'brand').trim().replace(/\s+/g,'-').toLowerCase()) + '-brand-board.png';
      a.href = c.toDataURL('image/png'); a.click();
    });
    if (window.html2canvas) { go(); return; }
    const s = document.createElement('script'); s.src = 'js/html2canvas.min.js'; s.onload = go; document.head.appendChild(s);
  });
  $('bbEmailBtn').addEventListener('click', () => {
    const email = ($('bbEmail').value||'').trim(); const msg = $('bbEmailMsg');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = TR[LANG].bad; return; }
    msg.textContent = '…';
    const SB = SUPA();
    fetch(SB.url + '/rest/v1/subscribers', { method:'POST', headers:{ apikey:SB.key, Authorization:'Bearer '+SB.key, 'Content-Type':'application/json', Prefer:'return=minimal' }, body: JSON.stringify({ email, lang: LANG }) })
      .then(() => { msg.textContent = TR[LANG].sent; $('bbEmail').value=''; })
      .catch(() => { msg.textContent = TR[LANG].sent; $('bbEmail').value=''; });
  });

  applyLang();

  new MutationObserver(() => { const l = siteLang(); if (l !== LANG) { LANG = l; applyLang(); } })
    .observe(document.documentElement, { attributes:true, attributeFilter:['lang','data-lang'] });
})();
