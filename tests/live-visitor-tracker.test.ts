import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {randomUUID} from 'node:crypto';

const html=readFileSync('public/scale-os.html','utf8');
const script=html.split('// BEGIN LIVE VISITORS:')[1]?.split('// END LIVE VISITORS')[0];
assert(script,'isolated live visitor script exists');
const executable=script.slice(script.indexOf('\n'));
// The agency handoff carries the same tested runtime, with only site/host/path configuration changed.
const handoff=readFileSync('backend/LIVE-VISITORS-INTEGRATION.md','utf8');
const agency=handoff.split('```html\n<script>\n')[1]?.split('\n</script>')[0];
assert(agency,'agency website snippet exists');
const normalize=(source:string)=>source.split('\n').filter(line=>!line.trim().startsWith('//')).join('\n').trim();
assert.equal(normalize(agency),normalize(executable)
 .replace("const site='scale-os-landing';","const site='scale-website';")
 .replace("const allowedOrigins=['https://sistema.scaleparaguay.com'];","const allowedOrigins=['https://scaleparaguay.com','https://www.scaleparaguay.com'];")
 .replace("const endpoint='https://sistema.scaleparaguay.com/core-api/api/public/live-visitors/heartbeat';","const endpoint='https://admin.scaleparaguay.com/api/public/live-visitors/heartbeat';")
 .replace("['/','/scale-os.html']","['/','/index.html']"));
let now=10000000,cookieValue='',cookieExpiry=0,locked=false,calls:{body:{site:string;session_id:string};init:RequestInit}[]=[],status=202,blocked=false;
const fakeDate=class extends Date{static now(){return now;}};
function tab(options:{origin?:string;path?:string;locks?:boolean;visible?:boolean}={}){
 const listeners=new Map<string,()=>void>(),intervals=new Map<number,()=>void>(),timeouts=new Map<number,()=>void>();let timer=0;
 const doc={visibilityState:options.visible===false?'hidden':'visible',
  get cookie(){return !blocked&&cookieExpiry>now?cookieValue:'';},
  set cookie(value:string){assert(value.includes('Max-Age=90; Path=/; Secure; SameSite=Strict'));assert(!value.includes('Domain='));if(!blocked){cookieValue=value.split(';')[0];cookieExpiry=now+90000;}},
  addEventListener(event:string,fn:()=>void){listeners.set(event,fn);}};
 const win:{top?:unknown;addEventListener:(event:string,fn:()=>void)=>void}={addEventListener:(event,fn)=>listeners.set(event,fn)};win.top=win;
 runInNewContext(executable,{
  window:win,document:doc,location:{origin:options.origin||'https://sistema.scaleparaguay.com',pathname:options.path||'/'},
  navigator:{locks:options.locks===false?undefined:{request:async(_name:string,_opts:unknown,fn:(lock:object|null)=>unknown)=>{if(locked)return fn(null);locked=true;try{return fn({});}finally{locked=false;}}}},
  crypto:{randomUUID},Date:fakeDate,AbortController,
  setInterval:(fn:()=>void,ms:number)=>{assert.equal(ms,30000);intervals.set(++timer,fn);return timer;},clearInterval:(id:number)=>intervals.delete(id),
  setTimeout:(fn:()=>void,ms:number)=>{assert.equal(ms,8000);timeouts.set(++timer,fn);return timer;},clearTimeout:(id:number)=>timeouts.delete(id),
  fetch:async(url:string,init:RequestInit)=>{assert.equal(url,'https://sistema.scaleparaguay.com/core-api/api/public/live-visitors/heartbeat');assert.equal(doc.visibilityState,'visible');assert.equal(init.credentials,'omit');assert.equal(init.cache,'no-store');assert.equal(init.keepalive,undefined);const body=JSON.parse(String(init.body));assert.deepEqual(Object.keys(body).sort(),['session_id','site']);calls.push({body,init});return {ok:status===202,status};},
 });
 return {doc,listeners,intervals,timeouts};
}
const flush=()=>new Promise<void>(resolve=>setImmediate(resolve));
async function run(){
 const a=tab(),b=tab();await flush();assert.equal(calls.length,1,'two visible tabs share one heartbeat and identifier');const first=calls[0].body.session_id;
 assert.equal(calls[0].body.site,'scale-os-landing');assert(cookieValue.startsWith('__Host-scale_live_v1='));
 now+=30000;a.intervals.forEach(fn=>fn());b.intervals.forEach(fn=>fn());await flush();assert.equal(calls.length,2);assert.equal(calls[1].body.session_id,first);
 a.doc.visibilityState='hidden';a.listeners.get('visibilitychange')?.();
 now+=30000;a.intervals.forEach(fn=>fn());b.intervals.forEach(fn=>fn());await flush();assert.equal(calls.length,3);assert.equal(calls[2].body.session_id,first);
 b.doc.visibilityState='hidden';now+=30000;a.intervals.forEach(fn=>fn());b.intervals.forEach(fn=>fn());await flush();assert.equal(calls.length,3,'hidden tabs send nothing');
 now+=90000;b.doc.visibilityState='visible';b.listeners.get('visibilitychange')?.();await flush();assert.equal(calls.length,4);assert.notEqual(calls[3].body.session_id,first,'new session after 90s idle');
 // Continuous activity rotates the ID at 15 minutes without persistent storage.
 const continuous=calls[3].body.session_id;
 for(let i=0;i<30;i++){now+=30000;b.intervals.forEach(fn=>fn());await flush();}
 assert.notEqual(calls.at(-1)?.body.session_id,continuous);
 const before=calls.length;tab({origin:'https://app.scaleparaguay.com'});tab({origin:'https://evil.example'});tab({path:'/demo'});tab({path:'/pipeline'});tab({locks:false});await flush();assert.equal(calls.length,before,'no capture in demo, app, unbound sites or without tab coordination');
 b.listeners.get('pagehide')?.();assert.equal(b.intervals.size,0);
 now+=90000;b.listeners.get('pageshow')?.();await flush();assert.equal(calls.length,before+1,'BFCache restoration restarts visible capture');
 now+=30000;status=429;b.intervals.forEach(fn=>fn());await flush();const limited=calls.length;
 now+=30000;b.intervals.forEach(fn=>fn());await flush();assert.equal(calls.length,limited,'429 backs off');
 now+=30000;status=202;b.intervals.forEach(fn=>fn());await flush();assert.equal(calls.length,limited+1);
 now+=90000;blocked=true;tab();await flush();assert.equal(calls.length,limited+1,'blocked cookies do not fall back to one ID per tab');
 assert(!/localStorage|sessionStorage/.test(executable.replace(/\/\/[^\n]*/g,'')));
 console.log('PASS: executed landing tracker in isolated browsers: shared-tab session, visibility, 90s expiry, 15min rotation, demo/host guards, blocked-cookie fallback, BFCache and rate backoff');
}
void run().catch(error=>{console.error(error);process.exitCode=1;});
