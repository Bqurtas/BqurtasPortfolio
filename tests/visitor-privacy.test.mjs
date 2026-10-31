import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { VISITOR_PRIVACY_JS, PRIVACY_COPY } from '../functions/_visitor-privacy.js';
import { APPEARANCE_JS } from '../functions/_appearance.js';

function events() {
  const listeners = new Map();
  return { addEventListener(name, fn) { listeners.set(name,[...(listeners.get(name)||[]),fn]); },
    dispatchEvent(event) { for (const fn of listeners.get(event.type)||[]) fn(event); } };
}
function fixture({ saved, privateBrowser=false, blockedStorage=false } = {}) {
  let now = 0, timerId = 0;
  const timers = new Map();
  const advance = ms => { now += ms; for (const [id, timer] of timers) { if (timer.at <= now) { timers.delete(id); timer.fn(); } } };
  const storage = new Map([['bq_cookie_ok','1']]); if (saved) storage.set('bq_analytics_consent',saved);
  const choiceButtons = ['denied','allowed'].map(value=>({...events(),dataset:{privacyChoice:value},focus(){},disabled:false}));
  const browserNote={hidden:true}; const labels=Array.from({length:6},(_,i)=>({dataset:{privacyCopy:String(i)},textContent:''}));
  const classes=new Set();
  const card={...events(),hidden:true,inert:true,classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)},setAttribute(k,v){this[k]=v;},
    querySelectorAll:s=>s==='[data-privacy-copy]'?labels:choiceButtons,
    querySelector:s=>s.includes('allowed')?choiceButtons[1]:s==='.privacy-browser'?browserNote:choiceButtons[0]};
  const opener={textContent:'',isConnected:true,focus(){this.focused=true;}};
  const document={...events(),readyState:'complete',currentScript:{nonce:'test-nonce'},documentElement:{dataset:{lang:'en'}},activeElement:opener,
    createElement:()=>({}),head:{appendChild(s){assert.equal(s.nonce,'test-nonce');}},getElementById:()=>card,
    querySelector:()=>opener,querySelectorAll:()=>[opener]};
  const window={...events()};
  const context={window,document,navigator:{globalPrivacyControl:privateBrowser},localStorage:{getItem:k=>{if(blockedStorage)throw Error();return storage.get(k);},setItem:(k,v)=>{if(blockedStorage)throw Error();storage.set(k,v);}},CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}},
    setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(VISITOR_PRIVACY_JS,context);
  return {window,document,card,storage,choiceButtons,opener,labels,browserNote,advance};
}
test('the initial notice hides after 15 seconds without granting consent; reopened settings remain available',()=>{
  const page=fixture();
  page.advance(14999); assert.equal(page.card.hidden,false);
  page.advance(1); assert.equal(page.card.hidden,true); assert.equal(page.card.inert,true);
  assert.equal(page.window.__bqPrivacy.choice(),null);
  assert.equal(page.storage.has('bq_analytics_consent'),false);
  page.window.__bqPrivacy.show(); page.advance(30000); assert.equal(page.card.hidden,false);
  const early=fixture(); early.advance(5000); early.window.__bqPrivacy.show(); early.advance(30000);
  assert.equal(early.card.hidden,false,'opening preferences cancels the original timer');
});
test('the legacy notice is not permission; both choices persist and preferences can be reopened',()=>{
  const page=fixture(); assert.equal(page.card.hidden,false); assert.equal(page.window.__bqPrivacy.choice(),null);
  page.choiceButtons[0].dispatchEvent({type:'click'});
  assert.equal(page.window.__bqPrivacy.choice(),'denied'); assert.equal(page.card.hidden,true); assert.equal(page.card.inert,true);
  assert.deepEqual(JSON.parse(page.storage.get('bq_analytics_consent')),{version:2,choice:'denied'});
  page.window.__bqPrivacy.show(); assert.equal(page.card.hidden,false);
  page.choiceButtons[1].dispatchEvent({type:'click'}); assert.equal(page.window.__bqPrivacy.choice(),'allowed'); assert.equal(page.opener.focused,true);
  assert.equal(fixture({saved:'denied'}).card.hidden,true);
});
test('browser privacy overrides permission and no storage still keeps the current choice',()=>{
  const page=fixture({saved:'allowed',privateBrowser:true});
  assert.equal(page.window.__bqPrivacy.choice(),'denied'); assert.equal(page.choiceButtons[1].disabled,true);
  page.window.__bqPrivacy.show(); assert.equal(page.browserNote.hidden,false);
  const restricted=fixture({blockedStorage:true}); restricted.window.__bqPrivacy.choose('denied');
  assert.equal(restricted.window.__bqPrivacy.choice(),'denied'); assert.equal(restricted.card.hidden,true);
});
test('dismissal is not permission and withdrawal in another tab is immediate',()=>{
  const page=fixture(); page.card.dispatchEvent({type:'keydown',key:'Escape'});
  assert.equal(page.window.__bqPrivacy.choice(),null);
  page.window.__bqPrivacy.choose('allowed');
  page.window.dispatchEvent({type:'storage',key:'bq_analytics_consent',newValue:'denied'});
  assert.equal(page.window.__bqPrivacy.choice(),'denied');
  page.document.documentElement.dataset.lang='ku'; page.document.dispatchEvent({type:'bq:language'});
  assert.equal(page.labels[0].textContent,PRIVACY_COPY.ku[0]);
});
test('every supported language includes all privacy choices',()=>{
  for (const lang of ['en','ku','kmr','ar','fr','tr','sv']) {
    assert.equal(PRIVACY_COPY[lang].length,6); assert.ok(PRIVACY_COPY[lang].every(Boolean));
    assert.match(PRIVACY_COPY[lang][1],/Cloudflare/);
    assert.match(PRIVACY_COPY[lang][1],/Umami Cloud/);
  }
});
test('Cloudflare-only permission never silently authorizes Umami; refusals survive policy updates',()=>{
  for (const saved of ['allowed',JSON.stringify({version:1,choice:'allowed'}),JSON.stringify({version:99,choice:'allowed'}),'broken']) {
    const page=fixture({saved});
    assert.equal(page.window.__bqPrivacy.choice(),null);
    assert.equal(page.card.hidden,false,'a new explicit choice is needed');
  }
  for (const saved of ['denied',JSON.stringify({version:1,choice:'denied'})]) {
    const page=fixture({saved});
    assert.equal(page.window.__bqPrivacy.choice(),'denied');
    assert.equal(page.card.hidden,true,'do not ask a visitor who already refused');
  }
  const allowed=fixture({saved:JSON.stringify({version:2,choice:'allowed'})});
  assert.equal(allowed.window.__bqPrivacy.choice(),'allowed');
  assert.equal(allowed.card.hidden,true);
  allowed.window.dispatchEvent({type:'storage',key:'bq_analytics_consent',newValue:'allowed'});
  assert.equal(allowed.window.__bqPrivacy.choice(),null,'an old tab cannot grant broader permission');
});
test('standalone pages default to light even on dark devices and remember only a chosen override',()=>{
  for (const saved of [null,'unexpected','dark','light']) {
    const storage=new Map(); if(saved)storage.set('bq_theme3',saved);
    const button={...events(),setAttribute(){}}; const root={dataset:{},style:{}};
    const context={document:{documentElement:root,readyState:'complete',querySelector:()=>null,querySelectorAll:()=>[button]},
      localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},matchMedia:()=>{throw Error('system theme must not choose the site theme');}};
    vm.runInNewContext(APPEARANCE_JS,context);
    assert.equal(root.dataset.theme,saved==='dark'?'dark':'light');
    assert.equal(storage.get('bq_theme3'),saved||undefined,'initial rendering does not invent a manual preference');
    button.dispatchEvent({type:'click'}); assert.equal(storage.get('bq_theme3'),saved==='dark'?'light':'dark');
    assert.equal(storage.get('bq_light_v1'),'1','a manual archive choice survives the main page’s legacy light-default migration');
  }
});
test('main entry is English unless the visitor explicitly opens a translated route',async()=>{
  const html=await readFile(new URL('../preview_site/index.html',import.meta.url),'utf8');
  const boot=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('var langs ='));
  for(const pathname of ['/','/bio','/ku/bio']) {
    const root={dataset:{theme:'light'},style:{},classList:{add(){},toggle(){}}};
    const store=new Map([['bq_lang','ar']]);
    vm.runInNewContext(boot,{document:{documentElement:root,querySelector:()=>null},location:{pathname},window:{matchMedia:()=>({matches:false,addEventListener(){}})},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)}});
    assert.equal(root.dataset.lang,pathname==='/ku/bio'?'ku':'en');
    assert.equal(root.dataset.theme,'light');
  }
});
