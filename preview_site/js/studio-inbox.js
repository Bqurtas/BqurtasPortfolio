/* Contact enquiries are private Cloudflare D1 records, never browser-local
   visitor drafts. This view is mounted only inside the authenticated Studio. */
(function studioInbox() {
  'use strict';
  const copy = {
    en: { note:'Contact enquiries are saved privately in your Cloudflare studio inbox. Reply using your email app.', loading:'Loading enquiries…', empty:'No enquiries yet.', error:'Could not load the inbox. Your enquiries remain saved; try again.', connect:'Connect the editor in Works or Content to open the private inbox.', expired:'Your session expired. Sign in again.', refresh:'Newest enquiries', older:'Older enquiries', read:'Mark as read', readDone:'Read', reply:'Reply by email', total:'Total', unread:'Unread', company:'Company', phone:'Phone', project_type:'Project', budget:'Budget', timeline:'Timeline', heard_about:'Found the studio through', references:'References', nda:'Confidentiality requested', yes:'Yes' },
    ku: { note:'پەیامەکانی کۆنتاکت بە تایبەتی لە سندووقی ستۆدیۆکەت لە Cloudflare پاشەکەوت دەکرێن. بە ئەپی ئیمەیڵەکەت وەڵام بدەوە.', loading:'پەیامەکان بار دەکرێن…', empty:'هێشتا پەیام نییە.', error:'سندووقەکە بار نەکرا. پەیامەکانت پاشەکەوتن؛ دووبارە هەوڵ بدەوە.', connect:'بۆ کردنەوەی سندووقی تایبەت، ئەدیتەر لە کارەکان یان ناوەڕۆک ببەستەوە.', expired:'سێشنەکەت بەسەرچووە. دووبارە بچۆ ژوورەوە.', refresh:'نوێترین پەیامەکان', older:'پەیامە کۆنترەکان', read:'وەک خوێندراوە دیاری بکە', readDone:'خوێندراوە', reply:'وەڵام بە ئیمەیڵ', total:'کۆی گشتی', unread:'نەخوێندراوە', company:'کۆمپانیا', phone:'تەلەفۆن', project_type:'پڕۆژە', budget:'بودجە', timeline:'کات', heard_about:'سەرچاوەی ناسین', references:'سەرچاوەکان', nda:'داوای نهێنی', yes:'بەڵێ' },
    kmr: { note:'Peyamên têkiliyê bi taybetî di qutiya stûdyoya Cloudflare de tên tomarkirin. Bi sepana e-nameyê bersiv bide.', loading:'Peyam tên barkirin…', empty:'Hêj peyam tune.', error:'Qutiya peyaman nehat barkirin. Peyam hatine parastin; dîsa biceribîne.', connect:'Ji bo qutiya taybetî, edîtorê di Kar an Naverokê de girêde.', expired:'Dema rûniştinê qediya. Dîsa têkeve.', refresh:'Peyamên nû', older:'Peyamên kevintir', read:'Wek xwendî nîşan bide', readDone:'Xwendî', reply:'Bi e-nameyê bersiv bide', total:'Hemû', unread:'Nexwendî', company:'Şirket', phone:'Telefon', project_type:'Proje', budget:'Bûdce', timeline:'Dem', heard_about:'Çavkaniya nasînê', references:'Referans', nda:'Daxwaza nepenîtiyê', yes:'Erê' },
    ar: { note:'تُحفظ رسائل التواصل بصورة خاصة في صندوق الاستوديو على Cloudflare. أجب باستخدام تطبيق البريد.', loading:'جارٍ تحميل الرسائل…', empty:'لا رسائل بعد.', error:'تعذّر تحميل الصندوق. رسائلك محفوظة؛ حاول مجدداً.', connect:'اربط المحرر في الأعمال أو المحتوى لفتح الصندوق الخاص.', expired:'انتهت الجلسة. سجّل الدخول مجدداً.', refresh:'أحدث الرسائل', older:'رسائل أقدم', read:'تحديد كمقروءة', readDone:'مقروءة', reply:'الرد بالبريد', total:'المجموع', unread:'غير مقروءة', company:'الشركة', phone:'الهاتف', project_type:'المشروع', budget:'الميزانية', timeline:'الجدول الزمني', heard_about:'مصدر التعارف', references:'المراجع', nda:'طلب السرية', yes:'نعم' },
    fr: { note:'Les demandes sont enregistrées dans votre boîte privée Cloudflare. Répondez avec votre messagerie.', loading:'Chargement des demandes…', empty:'Aucune demande.', error:'Impossible de charger la boîte. Vos demandes sont conservées ; réessayez.', connect:'Connectez l’éditeur dans Travaux ou Contenu pour ouvrir la boîte privée.', expired:'Votre session a expiré. Reconnectez-vous.', refresh:'Demandes récentes', older:'Demandes précédentes', read:'Marquer comme lue', readDone:'Lue', reply:'Répondre par e-mail', total:'Total', unread:'Non lues', company:'Entreprise', phone:'Téléphone', project_type:'Projet', budget:'Budget', timeline:'Calendrier', heard_about:'Source', references:'Références', nda:'Confidentialité demandée', yes:'Oui' },
    tr: { note:'İletişim mesajları özel Cloudflare stüdyo gelen kutunuza kaydedilir. E-posta uygulamanızla yanıtlayın.', loading:'Mesajlar yükleniyor…', empty:'Henüz mesaj yok.', error:'Gelen kutusu yüklenemedi. Mesajlarınız kayıtlı; yeniden deneyin.', connect:'Özel gelen kutusu için İşler veya İçerik bölümünden editörü bağlayın.', expired:'Oturum süresi doldu. Yeniden giriş yapın.', refresh:'En yeni mesajlar', older:'Eski mesajlar', read:'Okundu olarak işaretle', readDone:'Okundu', reply:'E-postayla yanıtla', total:'Toplam', unread:'Okunmamış', company:'Şirket', phone:'Telefon', project_type:'Proje', budget:'Bütçe', timeline:'Takvim', heard_about:'Kaynak', references:'Referanslar', nda:'Gizlilik talebi', yes:'Evet' },
    sv: { note:'Kontaktförfrågningar sparas privat i studions Cloudflare-inkorg. Svara med din e-postapp.', loading:'Läser in förfrågningar…', empty:'Inga förfrågningar ännu.', error:'Inkorgen kunde inte läsas in. Dina förfrågningar är sparade; försök igen.', connect:'Anslut redigeraren under Verk eller Innehåll för att öppna inkorgen.', expired:'Sessionen har löpt ut. Logga in igen.', refresh:'Senaste förfrågningar', older:'Äldre förfrågningar', read:'Markera som läst', readDone:'Läst', reply:'Svara via e-post', total:'Totalt', unread:'Olästa', company:'Företag', phone:'Telefon', project_type:'Projekt', budget:'Budget', timeline:'Tidsplan', heard_about:'Källa', references:'Referenser', nda:'Sekretess begärd', yes:'Ja' }
  };
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  const button = (text, handler) => {
    const node = element('button', 'dash-btn', text);
    node.type = 'button'; node.addEventListener('click', handler);
    return node;
  };
  async function render({ root, lang = 'en', getToken, onSessionRequired, onCount } = {}) {
    if (!root) return;
    const words = copy[lang] || copy.en;
    const box = element('div', 'studio-inbox');
    const note = element('p', 'dash-note', words.note);
    const status = element('p', 'dash-dim mono'); status.setAttribute('role', 'status');
    const list = element('div', 'dash-leads');
    const controls = element('div', 'dash-pager');
    box.append(note, status, list, controls); root.replaceChildren(box);
    let requestNumber = 0;
    const token = typeof getToken === 'function' ? getToken : () => '';
    if (!token()) { status.textContent = words.connect; return; }
    const call = async payload => {
      const response = await fetch('/api/inbox', { method:'POST', credentials:'same-origin', cache:'no-store',
        headers:{ 'Content-Type':'application/json', 'x-edit-token':token() },
        body:JSON.stringify(payload), signal:AbortSignal.timeout(15000) });
      const result = await response.json();
      if (result.error === 'session-required') {
        if (typeof onSessionRequired === 'function') onSessionRequired();
        throw new Error('session-required');
      }
      if (!response.ok || result.ok !== true) throw new Error(result.error === 'unauthorized' ? 'unauthorized' : 'inbox-unavailable');
      return result;
    };
    const failure = error => error?.message === 'session-required' ? words.expired : error?.message === 'unauthorized' ? words.connect : words.error;
    const load = async (before = null) => {
      const current = ++requestNumber;
      status.textContent = words.loading;
      controls.replaceChildren(); list.replaceChildren();
      try {
        const result = await call({ action:'list', ...(before ? { before } : {}) });
        if (!box.isConnected || current !== requestNumber) return;
        if (!Array.isArray(result.items)) throw new Error('inbox-unavailable');
        if (typeof onCount === 'function') onCount(result.total);
        status.textContent = result.items.length ? `${words.total}: ${result.total} · ${words.unread}: ${result.unread}` : words.empty;
        result.items.forEach(item => {
          const card = element('article', 'dash-lead');
          card.style.overflowWrap = 'anywhere';
          const head = element('div', 'dash-lead-top');
          head.style.flexWrap = 'wrap'; head.style.gap = '8px 16px';
          head.append(element('strong', '', item.name));
          const date = element('time', 'mono', new Date(item.created_at).toLocaleString()); date.dateTime = item.created_at;
          head.append(date); card.append(head);
          card.append(element('span', 'mono dash-lead-mail', item.email));
          const message = element('p', '', item.message); message.style.whiteSpace = 'pre-wrap'; message.style.overflowWrap = 'anywhere'; card.append(message);
          for (const key of ['company', 'phone', 'project_type', 'budget', 'timeline', 'heard_about', 'references']) {
            if (!item[key]) continue;
            const detail = element('p', 'dash-lead-meta'); detail.style.overflowWrap = 'anywhere';
            detail.append(element('strong', '', `${words[key]}: `), document.createTextNode(item[key])); card.append(detail);
          }
          if (item.nda) card.append(element('p', 'dash-lead-meta', `${words.nda}: ${words.yes}`));
          const actions = element('div', 'dash-pager');
          const reply = element('a', 'dash-btn', words.reply); reply.href = `mailto:${encodeURIComponent(item.email)}`; actions.append(reply);
          if (item.read_at) actions.append(element('span', 'mono', words.readDone));
          else {
            const read = button(words.read, async () => {
              read.disabled = true;
              try { await call({ action:'read', id:item.id }); if (box.isConnected) load(before); }
              catch (error) { if (box.isConnected) { read.disabled = false; status.textContent = failure(error); } }
            }); actions.append(read);
          }
          card.append(actions); list.append(card);
        });
        controls.append(button(words.refresh, () => load()));
        if (Number.isSafeInteger(result.next) && result.next > 0) controls.append(button(words.older, () => load(result.next)));
      } catch (error) {
        if (!box.isConnected || current !== requestNumber) return;
        status.textContent = failure(error); controls.append(button(words.refresh, () => load()));
      }
    };
    await load();
  }
  window.BQStudioInbox = Object.freeze({ render });
})();
