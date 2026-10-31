
(function visitorPrivacy() {
  if (window.__bqPrivacy) return;
  const key = 'bq_analytics_consent';
  const copy = {"en":["Your privacy","Language and appearance stay on this device. With your permission, Cloudflare and Umami Cloud process page visits and basic connection/device data without tracking cookies. Form content and URL parameters are excluded. Change your choice here anytime.","Allow statistics","No thanks","Privacy settings","Your browser’s privacy preference keeps statistics off."],"ku":["تایبەتمەندیی تۆ","زمان و ڕووکار لەم ئامێرە دەپارێزرێن. بە ڕەزامەندی تۆ، Cloudflare و Umami Cloud ئاماری سەردانی پەڕەکان و زانیاریی سەرەتایی پەیوەندی و ئامێر پرۆسێس دەکەن، بێ کوکیی بەدواداچوون. ناوەڕۆکی فۆڕم و پارامەتەرەکانی لینک نانێردرێن. هەرکات دەتوانیت لێرە هەڵبژاردنەکەت بگۆڕیت.","ڕێگەدان بە ئامار","نەخێر، سوپاس","ڕێکخستنی تایبەتمەندی","هەڵبژاردنی پاراستنی تایبەتمەندیی براوزەرەکەت ئامار ناچالاک دەکات."],"kmr":["Taybetiya te","Ziman û rûkar li ser vê amûrê dimînin. Bi destûra te, Cloudflare û Umami Cloud serdanên rûpelan û agahiyên bingehîn ên girêdanê û amûrê bê çerezên şopandinê diparêzin û analîz dikin. Naveroka forman û parametreyên URL nayên şandin. Tu dikarî her dem vebijarka xwe li vir biguherînî.","Destûr bide statîstîkan","Na, spas","Mîhengên taybetiyê","Vebijarka taybetiyê ya geroka te statîstîkan digire."],"ar":["خصوصيتك","تُحفظ اللغة والمظهر على هذا الجهاز. بموافقتك، تعالج Cloudflare وUmami Cloud زيارات الصفحات وبيانات الاتصال والجهاز الأساسية دون ملفات تتبع. لا تُرسل محتويات النماذج أو معاملات الروابط. يمكنك تغيير اختيارك هنا في أي وقت.","السماح بالإحصاءات","لا، شكرًا","إعدادات الخصوصية","تفضيل الخصوصية في متصفحك يبقي الإحصاءات معطلة."],"fr":["Votre confidentialité","La langue et le thème restent sur cet appareil. Avec votre accord, Cloudflare et Umami Cloud traitent les visites et les données de base de connexion et d’appareil, sans cookies de suivi. Le contenu des formulaires et les paramètres des URL sont exclus. Vous pouvez modifier votre choix ici à tout moment.","Autoriser les statistiques","Non merci","Confidentialité","La préférence de confidentialité de votre navigateur désactive les statistiques."],"tr":["Gizliliğiniz","Dil ve görünüm bu cihazda saklanır. İzninizle Cloudflare ve Umami Cloud, sayfa ziyaretlerini ve temel bağlantı/cihaz verilerini takip çerezi olmadan işler. Form içerikleri ve URL parametreleri gönderilmez. Seçiminizi buradan istediğiniz zaman değiştirebilirsiniz.","İstatistiklere izin ver","Hayır, teşekkürler","Gizlilik ayarları","Tarayıcınızın gizlilik tercihi istatistikleri kapalı tutar."],"sv":["Din integritet","Språk och utseende sparas på den här enheten. Med ditt samtycke behandlar Cloudflare och Umami Cloud sidbesök och grundläggande anslutnings- och enhetsdata utan spårningskakor. Formulärinnehåll och URL-parametrar skickas inte. Du kan ändra ditt val här när som helst.","Tillåt statistik","Nej tack","Integritetsinställningar","Webbläsarens integritetsval håller statistiken avstängd."]};
  const nonce = document.currentScript && document.currentScript.nonce;
  let choice = null, card, returnFocus, dismissTimer;
  // v1 allowed only Cloudflare. Do not silently extend that permission to Umami.
  // A previous refusal remains a refusal across policy versions.
  function savedChoice(value) {
    if (value === 'denied') return 'denied';
    try {
      const saved = JSON.parse(value);
      if (saved && saved.choice === 'denied') return 'denied';
      return saved && saved.version === 2 && saved.choice === 'allowed' ? 'allowed' : null;
    } catch (e) { return null; }
  }
  try { choice = savedChoice(localStorage.getItem(key)); } catch (e) {}
  const privateBrowser = () => [navigator.doNotTrack,window.doNotTrack,navigator.msDoNotTrack].some(value => /^(1|yes)$/i.test(value || '')) || navigator.globalPrivacyControl === true;
  const state = () => privateBrowser() ? 'denied' : choice;
  function localize() {
    if (!card) return;
    const lang = document.documentElement.dataset.lang || 'en';
    const labels = copy[lang] || copy.en;
    card.querySelectorAll('[data-privacy-copy]').forEach(el => { el.textContent = labels[Number(el.dataset.privacyCopy)]; });
    document.querySelectorAll('[data-privacy-open]').forEach(el => { el.textContent = labels[4]; });
    card.querySelector('[data-privacy-choice="allowed"]').disabled = privateBrowser();
    card.querySelector('.privacy-browser').hidden = !privateBrowser();
  }
  function show(manual) {
    if (!card) return;
    clearTimeout(dismissTimer);
    localize(); card.hidden = false; card.inert = false;
    card.classList.add('is-shown'); card.setAttribute('aria-hidden','false');
    if (manual) { returnFocus = document.activeElement; card.querySelector('button').focus(); }
    // The initial notice hides without changing consent. Reopened settings stay available.
    else dismissTimer = setTimeout(hide, 15000);
  }
  function hide() {
    clearTimeout(dismissTimer);
    if (!card) return;
    card.hidden = true; card.inert = true;
    card.classList.remove('is-shown'); card.setAttribute('aria-hidden','true');
    if (returnFocus && returnFocus.isConnected) returnFocus.focus();
    returnFocus = null;
  }
  function choose(value) {
    if (value !== 'allowed' && value !== 'denied') return;
    choice = privateBrowser() ? 'denied' : value;
    try { localStorage.setItem(key,JSON.stringify({version:2,choice})); } catch(e) {}
    hide(); document.dispatchEvent(new CustomEvent('bq:privacy',{detail:{choice:state()}}));
  }
  window.__bqPrivacy = { choice:state, choose, show:() => show(true) };
  function mount() {
    const style = document.createElement('style');
    if (nonce) style.nonce = nonce;
    style.textContent = "\nhtml body #cookieCard#cookieCard.cookie-card{box-sizing:border-box;position:fixed;z-index:1200;top:auto!important;left:50%!important;right:auto!important;bottom:calc(var(--bq-dock-top,6px) + 16px)!important;width:min(400px,calc(100vw - 32px))!important;max-width:calc(100vw - 32px)!important;max-height:calc(100svh - var(--bq-dock-top,70px) - 32px);overflow:auto;padding:20px!important;display:block;border:1px solid var(--line,#d8d9d1);border-radius:16px!important;background:var(--bg,var(--paper,#f5f4f0))!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;color:var(--ink,#232421);box-shadow:0 12px 36px #00000014;opacity:1;transform:translateX(-50%)!important;pointer-events:auto;font-family:inherit;text-transform:none;letter-spacing:normal}\nhtml body #cookieCard#cookieCard[hidden]{display:none!important}\nhtml body #cookieCard#cookieCard .cookie-card-title{display:block;margin:0 0 8px;font-size:15px!important;font-weight:650;line-height:1.4!important;color:inherit}\nhtml body #cookieCard#cookieCard .cookie-card-text,html body #cookieCard#cookieCard .privacy-browser{margin:0;font-size:13px!important;line-height:1.65!important;color:var(--ink-soft,var(--muted,#5b5d57))}\nhtml body #cookieCard#cookieCard .privacy-browser:not([hidden]){margin-top:10px}\n.privacy-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.privacy-actions button{flex:1 1 120px;min-height:44px;padding:10px 12px;border:1px solid var(--line,#d8d9d1);border-radius:9px;background:transparent;color:inherit;font-family:inherit;font-size:12px;font-weight:600;line-height:1.4;cursor:pointer}.privacy-actions button:hover{background:var(--surface,#00000006)}.privacy-actions button:focus-visible,[data-privacy-open]:focus-visible{outline:2px solid currentColor!important;outline-offset:3px!important}.privacy-actions button:disabled{opacity:.5;cursor:not-allowed}[data-privacy-open]{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;max-width:100%;white-space:normal;border-radius:6px;font-family:Manrope,\"Noto Naskh Arabic\",system-ui,sans-serif;font-size:13px;font-weight:500;font-style:normal;line-height:1.45;letter-spacing:normal;text-transform:none;text-decoration:none;text-align:center;color:inherit;background:none;border:0;padding:8px 10px;cursor:pointer}\n@media(max-width:820px){html body #cookieCard#cookieCard.cookie-card{left:16px!important;right:16px!important;transform:none!important;bottom:calc(var(--bq-dock-top,env(safe-area-inset-bottom,0px)) + 16px)!important;width:auto!important}}\n@media(max-height:450px){html body #cookieCard#cookieCard.cookie-card{bottom:12px!important;max-height:calc(100svh - 24px);max-width:min(400px,calc(100vw - 100px))!important}}\nhtml:root[data-theme] body .footer.footer-v249 .footer-bottom{display:grid!important;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)!important;grid-template-areas:none!important;align-items:center!important;justify-content:stretch!important}\nhtml:root[data-theme] body .footer.footer-v249 .footer-bottom > span:first-child{grid-area:auto!important;grid-column:1!important;grid-row:1!important;justify-self:start!important;text-align:start!important}\nhtml:root[data-theme] body .footer.footer-v249 .footer-bottom > span:last-child{grid-area:auto!important;grid-column:3!important;grid-row:1!important;justify-self:end!important;text-align:end!important}\nhtml:root[data-theme] body .footer.footer-v249 .footer-bottom [data-privacy-open]{grid-area:auto!important;grid-column:2!important;grid-row:1!important;justify-self:center!important;justify-content:center!important;align-items:center!important;width:max-content!important;max-width:100%!important;text-align:center!important;text-decoration:none!important;text-transform:none!important;letter-spacing:normal!important;font-family:Manrope,\"Noto Naskh Arabic\",system-ui,sans-serif!important;font-size:13px!important;font-weight:500!important;font-style:normal!important}\n@media(max-width:820px){\nhtml:root[data-theme] body .footer.footer-v249 .footer-bottom{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}\nhtml:root[data-theme] body .footer.footer-v249 .footer-bottom > span:last-child{grid-column:2!important}\nhtml:root[data-theme] body .footer.footer-v249 .footer-bottom [data-privacy-open]{grid-column:1 / -1!important;grid-row:2!important;justify-self:center!important;width:100%!important;max-width:none!important;text-align:center!important}\n}\n";
    document.head.appendChild(style);
    card = document.getElementById('cookieCard');
    if (!card) { const host = document.createElement('div'); host.innerHTML = "<section class=\"cookie-card\" id=\"cookieCard\" role=\"dialog\" aria-modal=\"false\" aria-labelledby=\"privacyTitle\" aria-describedby=\"privacyText\" aria-hidden=\"true\" hidden inert>\n  <div class=\"cookie-card-body\">\n    <strong class=\"cookie-card-title\" id=\"privacyTitle\" data-privacy-copy=\"0\">Your privacy</strong>\n    <p class=\"cookie-card-text\" id=\"privacyText\" data-privacy-copy=\"1\">Language and appearance stay on this device. With your permission, Cloudflare and Umami Cloud process page visits and basic connection/device data without tracking cookies. Form content and URL parameters are excluded. Change your choice here anytime.</p>\n    <p class=\"privacy-browser\" data-privacy-copy=\"5\" hidden>Your browser’s privacy preference keeps statistics off.</p>\n    <div class=\"privacy-actions\"><button type=\"button\" data-privacy-choice=\"denied\" data-privacy-copy=\"3\">No thanks</button><button type=\"button\" data-privacy-choice=\"allowed\" data-privacy-copy=\"2\">Allow statistics</button></div>\n  </div>\n</section>"; card = host.firstElementChild; document.body.appendChild(card); }
    if (!document.querySelector('[data-privacy-open]')) {
      const footer = document.querySelector('footer');
      if (footer) { const button = document.createElement('button'); button.type = 'button'; button.setAttribute('data-privacy-open',''); footer.appendChild(button); }
    }
    card.querySelectorAll('[data-privacy-choice]').forEach(button => button.addEventListener('click',() => choose(button.dataset.privacyChoice)));
    document.addEventListener('click',event => { if (event.target.closest && event.target.closest('[data-privacy-open]')) { event.preventDefault(); show(true); } });
    card.addEventListener('keydown',event => { if (event.key === 'Escape') hide(); });
    document.addEventListener('bq:language',localize);
    window.addEventListener('storage',event => {
      if (event.key !== key && event.key !== null) return;
      choice = savedChoice(event.newValue);
      document.dispatchEvent(new CustomEvent('bq:privacy',{detail:{choice:state()}}));
      hide();
    });
    localize();
    if (!choice && !privateBrowser()) show(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount();
})();
/* First-party, cookieless visit counting, plus optional Umami Cloud pageviews. */
(function () {
  'use strict';
  // Preview and development visits must never enter production statistics.
  if (location.protocol !== 'https:' || location.hostname !== 'bqurtas.com') return;
  if (window.__bqFirstPartyAnalytics) return;
  window.__bqFirstPartyAnalytics = true;
  const collections = ["general","book","official","posters","social","logo","tickerlogo","events","business","invoices","image","other","certificate","flex","video"];
  const tabs = ["logo","official","book","posters","social","events","stationery","image","video","other","certificate"];
  const archives = ["/archive/","/archive/books/","/archive/books/2/","/archive/books/3/","/archive/books/4/","/archive/books/5/","/archive/business-cards/","/archive/certificates/","/archive/design/","/archive/design/2/","/archive/design/3/","/archive/design/4/","/archive/events/","/archive/flex/","/archive/invoices/","/archive/logos/","/archive/logos/2/","/archive/official/","/archive/official/2/","/archive/official/3/","/archive/official/4/","/archive/official/5/","/archive/official/6/","/archive/official/7/","/archive/other/","/archive/other/2/","/archive/photos/","/archive/photos/2/","/archive/photos/3/","/archive/photos/4/","/archive/photos/5/","/archive/photos/6/","/archive/photos/7/","/archive/posters/","/archive/social/","/archive/ticker-logos/","/archive/videos/","/archive/videos/2/"];
  const pending = new Set();
  let lastPath = '', first = true, timer;
  const permitted = () => window.__bqPrivacy?.choice() === 'allowed' &&
    ![navigator.doNotTrack,window.doNotTrack,navigator.msDoNotTrack].some(value => /^(1|yes)$/i.test(value || '')) && navigator.globalPrivacyControl !== true;
  function publicPath() {
    // Studio can open without changing the URL. Never inspect or transmit its
    // title, inputs, URL parameters, hashes, user identifiers or credentials.
    if (/^#studio/i.test(location.hash || '') || document.querySelector?.('#dash.is-open')) return '';
    const path = location.pathname;
    if (typeof path !== 'string' || path.length > 160) return '';
    const route = path.replace(/^\/(?:ku|kmr|ar|fr|tr|sv)(?=\/|$)/, '').replace(/\/$/, '') || '/';
    if (['/', '/design', '/blog', '/bio', '/contact'].includes(route) || archives.includes(route + '/') || /^\/blog\/[1-9]\d{0,17}$/.test(route)) return path;
    const match = /^\/design\/([a-z]+)(?:\/([1-9]\d{0,17}))?$/.exec(route);
    return match && (collections.includes(match[1]) || (!match[2] && tabs.includes(match[1]))) ? path : '';
  }
  function referrerOrigin() {
    try {
      const ref = new URL(document.referrer);
      return /^https?:$/.test(ref.protocol) ? ref.origin : '';
    } catch (e) { return ''; }
  }
  function stop() {
    clearTimeout(timer);
    for (const controller of pending) controller.abort();
    pending.clear();
  }
  function umamiPageview(path, language) {
    if (!permitted() || typeof AbortController !== 'function') return;
    const controller = new AbortController();
    pending.add(controller);
    const timeout = setTimeout(() => controller.abort(), 4000);
    // Official Cloud collection API; no third-party script, autotracking,
    // cookies, distinct IDs, document titles, referrers or custom event data.
    // The browser supplies its normal network address/User-Agent to Umami.
    const data = JSON.stringify({ type:'event', payload:{
      website:'f58c1ade-02c7-4c2e-95b3-2bcbf2e354fa', hostname:'bqurtas.com', url:path, language
    } });
    const done = () => { clearTimeout(timeout); pending.delete(controller); };
    try {
      fetch('https://gateway.umami.is/api/send', {
        method:'POST', body:data, headers:{'Content-Type':'application/json'},
        mode:'cors', credentials:'omit', referrerPolicy:'no-referrer',
        redirect:'error', cache:'no-store', signal:controller.signal
      }).then(done, done);
    } catch (e) { done(); }
  }
  function hit() {
    if (!permitted()) { stop(); return; }
    const path = publicPath();
    if (!path || path === lastPath || document.visibilityState === 'hidden') return;
    lastPath = path;
    const candidate = document.documentElement.dataset?.lang || (document.documentElement.lang === 'ckb' ? 'ku' : document.documentElement.lang);
    const language = ['en','ku','kmr','ar','fr','tr','sv'].includes(candidate) ? candidate : 'en';
    const data = JSON.stringify({ p:path, r:first ? referrerOrigin() : '', l:language });
    first = false;
    try {
      if (!navigator.sendBeacon || !navigator.sendBeacon('/api/hit', data)) {
        fetch('/api/hit', { method:'POST', body:data, keepalive:true, credentials:'same-origin' }).catch(() => {});
      }
    } catch (e) {}
    umamiPageview(path, language);
  }
  function schedule() {
    clearTimeout(timer);
    if (!permitted()) { stop(); lastPath = ''; return; }
    timer = setTimeout(hit, 80);
  }
  // Journal readers update History directly instead of changing the room.
  // Preserve native return values/errors; path deduplication avoids counting
  // the router's accompanying bq:route event a second time.
  if (typeof history !== 'undefined') {
    for (const name of ['pushState', 'replaceState']) {
      const original = history[name];
      if (typeof original !== 'function') continue;
      history[name] = function () { const result = original.apply(this, arguments); schedule(); return result; };
    }
  }
  document.addEventListener('bq:privacy', schedule);
  document.addEventListener('bq:route', schedule);
  document.addEventListener('bq:language', schedule);
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once:true });
  else schedule();
})();
