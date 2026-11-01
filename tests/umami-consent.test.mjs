import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { ANALYTICS_CLIENT_JS } from '../functions/_analytics-client.js';

const client = ANALYTICS_CLIENT_JS.slice(ANALYTICS_CLIENT_JS.indexOf('/* First-party, cookieless visit counting'));
const endpoint = 'https://gateway.umami.is/api/send';

function fixture({ consent=null, url='https://bqurtas.com/', dnt='0', gpc=false, dash=false } = {}) {
  let now=0, nextTimer=0;
  const timers=new Map(), listeners=new Map(), beacons=[], requests=[];
  const addEventListener=(name,fn)=>listeners.set(name,[...(listeners.get(name)||[]),fn]);
  const emit=name=>{for(const fn of listeners.get(name)||[]) fn({type:name});};
  const location=new URL(url);
  const privacy={value:consent,choice(){return this.value;}};
  const document={readyState:'complete',visibilityState:'visible',referrer:'https://referrer.example/private?email=secret@example.com#private',
    title:'PRIVATE EDITOR CONTENT',documentElement:{dataset:{lang:'en'},lang:'en'},
    querySelector:()=>dash?{}:null,addEventListener};
  const navigator={doNotTrack:dnt,globalPrivacyControl:gpc,sendBeacon(url,data){beacons.push({url,data:JSON.parse(data)});return true;}};
  const window={__bqPrivacy:privacy,addEventListener};
  const history={pushState(state,title,path){location.href=new URL(path,location).href;return 'native-result';},replaceState(state,title,path){location.href=new URL(path,location).href;}};
  const context={window,document,navigator,location,history,URL,AbortController,
    setTimeout(fn,ms){const id=++nextTimer;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),
    fetch(url,options){
      const item={url,options,payload:JSON.parse(options.body)};requests.push(item);
      return new Promise((resolve,reject)=>{item.resolve=resolve;item.reject=reject;options.signal?.addEventListener('abort',()=>reject(new Error('aborted')));});
    }};
  vm.runInNewContext(client,context);
  return {document,navigator,window,location,history,privacy,beacons,requests,emit,context,
    choose(value){privacy.value=value;emit('bq:privacy');},
    advance(ms=80){now+=ms;for(const [id,timer] of [...timers])if(timer.at<=now){timers.delete(id);timer.fn();}}};
}

test('both analytics providers wait for an explicit choice and record only the current public page',()=>{
  for(const consent of [null,'denied']) {
    const page=fixture({consent});page.advance();
    page.history.pushState(null,'','/bio?email=secret@example.com#section');page.advance();
    assert.equal(page.requests.length,0);assert.equal(page.beacons.length,0);
    page.choose('allowed');page.advance();
    assert.equal(page.beacons.length,1);assert.equal(page.requests.length,1);
    const request=page.requests[0];
    assert.equal(request.url,endpoint);
    assert.deepEqual(request.payload,{type:'event',payload:{website:'f58c1ade-02c7-4c2e-95b3-2bcbf2e354fa',hostname:'bqurtas.com',url:'/bio',language:'en'}});
    assert.equal(request.options.credentials,'omit');assert.equal(request.options.referrerPolicy,'no-referrer');
    assert.equal(request.options.redirect,'error');assert.equal(request.options.mode,'cors');
    assert.deepEqual(Object.keys(request.options.headers),['Content-Type']);
    assert.doesNotMatch(request.options.body,/secret|PRIVATE|referrer|screen|title|Authorization|#section/);
    assert.equal(page.beacons[0].data.r,'https://referrer.example','first-party referrals also omit paths and parameters');
  }
});

test('DNT and GPC override even current consent, including signals changed while a visit is queued',()=>{
  for(const options of [{dnt:'1'},{dnt:'yes'},{gpc:true}]) {
    const page=fixture({consent:'allowed',...options});page.advance();
    assert.equal(page.requests.length,0);assert.equal(page.beacons.length,0);
  }
  const page=fixture({consent:'allowed'});page.navigator.globalPrivacyControl=true;page.advance();
  assert.equal(page.requests.length,0);assert.equal(page.beacons.length,0);
  const oldBrowser=fixture({consent:'allowed'});oldBrowser.window.doNotTrack='1';oldBrowser.advance();
  assert.equal(oldBrowser.requests.length,0);
});

test('consent withdrawal cancels queued views and aborts an in-flight Cloud request without retries',async()=>{
  const queued=fixture({consent:'allowed'});queued.choose('denied');queued.advance(5000);
  assert.equal(queued.requests.length,0);assert.equal(queued.beacons.length,0);
  const page=fixture({consent:'allowed'});page.advance();
  const first=page.requests[0];assert.equal(first.options.signal.aborted,false);
  page.history.pushState(null,'','/contact');page.choose('denied');
  assert.equal(first.options.signal.aborted,true,'withdrawal aborts immediately, before another timer');
  await Promise.resolve();page.advance(5000);
  assert.equal(page.requests.length,1);assert.equal(page.beacons.length,1);
  page.choose('allowed');page.advance();
  assert.equal(page.requests.length,2);assert.equal(page.requests[1].payload.payload.url,'/contact');
});

test('SPA history, locale and route events are deduplicated; hidden documents wait until visible',()=>{
  const page=fixture({consent:'allowed',url:'https://bqurtas.com/blog'});page.advance();
  assert.equal(page.history.pushState(null,'private title','/blog/27?token=private'),'native-result');
  page.emit('bq:route');page.emit('bq:language');page.advance();
  assert.deepEqual(page.requests.map(item=>item.payload.payload.url),['/blog','/blog/27']);
  page.history.replaceState(null,'','/ku/bio');page.document.visibilityState='hidden';page.advance();
  assert.equal(page.requests.length,2);
  page.document.visibilityState='visible';page.document.documentElement.dataset.lang='ku';page.emit('visibilitychange');page.advance();
  assert.equal(page.requests[2].payload.payload.language,'ku');
  vm.runInNewContext(client,page.context);page.emit('bq:route');page.advance();
  assert.equal(page.requests.length,3,'a repeated bootstrap adds no duplicate visits');
});

test('Studio, unknown paths and nonproduction hosts are never tracked by either provider',()=>{
  for(const options of [
    {url:'https://bqurtas.com/#studio'}, {dash:true}, {url:'https://bqurtas.com/api/content'},
    {url:'https://bqurtas.com/private/person@example.com'}, {url:'https://bqurtas.com/blog/0001'},
    {url:'http://localhost:8093/'}, {url:'http://127.0.0.1:8083/'},
    {url:'https://preview.bqurtasportfolio.pages.dev/'}, {url:'https://www.bqurtas.com/'}
  ]) {
    const page=fixture({consent:'allowed',...options});page.advance();
    assert.equal(page.requests.length,0,JSON.stringify(options));assert.equal(page.beacons.length,0);
  }
});

test('standalone canonical pages share consent-gated collection and reject unknown archive paths',()=>{
  for(const path of ['/archive/','/archive/photos/2/','/design/book/1','/ku/design/stationery','/sv/contact']) {
    const page=fixture({consent:'allowed',url:'https://bqurtas.com'+path});page.advance();
    assert.equal(page.requests[0].payload.payload.url,path);
  }
  const page=fixture({consent:'allowed',url:'https://bqurtas.com/archive/private/'});page.advance();
  assert.equal(page.requests.length,0);
});

test('an unavailable Umami endpoint times out once and does not interrupt first-party statistics',async()=>{
  const page=fixture({consent:'allowed'});page.advance();
  assert.equal(page.beacons.length,1);assert.equal(page.requests[0].options.signal.aborted,false);
  page.advance(3999);assert.equal(page.requests[0].options.signal.aborted,false);
  page.advance(1);assert.equal(page.requests[0].options.signal.aborted,true);
  await Promise.resolve();page.advance(10000);assert.equal(page.requests.length,1);
  page.history.pushState(null,'','/design');page.advance();
  assert.equal(page.beacons.length,2);assert.equal(page.requests.length,2);
});
