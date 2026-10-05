import assert from 'node:assert/strict';
import {after,before,mock,test} from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {NextRequest} from 'next/server';
import {middleware} from '../middleware';
import {ANALYTICS_COLLECT,ANALYTICS_HOSTS,ANALYTICS_LOADER,analyticsConfig} from '../app/public-analytics';
import {analyticsBootstrap,analyticsLoader,requestAnalyticsConfig} from '../app/public-analytics-server';
import {GET as loaderGet} from '../app/public-analytics/loader.js/route';
import {POST as collectPost} from '../app/public-analytics/collect/route';
import {GET as landingGet} from '../app/public-landing/route';

const hosts=Object.keys(ANALYTICS_HOSTS);
const ids=['12345678-1234-4234-8234-123456789001','12345678-1234-4234-8234-123456789002','12345678-1234-4234-8234-123456789003'];
const env:NodeJS.ProcessEnv={UMAMI_ORIGIN:'https://stats.example.com'};
hosts.forEach((host,i)=>env[ANALYTICS_HOSTS[host as keyof typeof ANALYTICS_HOSTS]]=ids[i]);
const keys=Object.keys(env);
const originalEnv=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
before(()=>{
 Object.assign(process.env,env);
 mock.timers.enable({apis:['Date'],now:Date.parse('2026-10-05T15:00:00Z')});
 mock.method(globalThis,'fetch',()=>{throw new Error('Unexpected network request: tests must be network-free');});
});
after(()=>{
 for(const key of keys){if(originalEnv[key]===undefined)delete process.env[key];else process.env[key]=originalEnv[key];}
 mock.restoreAll();mock.timers.reset();
});
const request=(host:string,path=ANALYTICS_LOADER,extra:Record<string,string>={})=>new Request(`https://${host}${path}`,{headers:{host,...extra}});
const post=(host:string,body:unknown,extra:Record<string,string>={})=>new Request(`https://${host}${ANALYTICS_COLLECT}`,{
 method:'POST',headers:{host,origin:`https://${host}`,'content-type':'application/json','user-agent':'Mozilla/5.0',...extra},body:JSON.stringify(body),
});

function browser(url:string,dnt?:string){
 const location=new URL(url),sent:{url:string;options:RequestInit}[]=[],scripts:any[]=[];
 const listeners:Record<string,()=>void>={};
 const history={pushState(_data:unknown,_title:string,path:string){const next=new URL(path,location);location.href=next.href;},replaceState(_data:unknown,_title:string,path:string){this.pushState(_data,_title,path);}};
 const window:any={location,navigator:{doNotTrack:dnt},history,addEventListener(name:string,fn:()=>void){listeners[name]=fn;}};
 const context={window,fetch:(url:string,options:RequestInit)=>{sent.push({url,options});return Promise.resolve();},document:{createElement(){return {};},head:{appendChild(script:unknown){scripts.push(script);}}}};
 return {context,window,location,sent,scripts,listeners};
}

test('Umami: only the three exact public hosts with valid per-surface configuration',()=>{
 hosts.forEach((host,i)=>assert.deepEqual(analyticsConfig(host,env),{host,origin:env.UMAMI_ORIGIN,website:ids[i]}));
 for(const host of ['app.scaleparaguay.com','admin.scaleparaguay.com','cliente.scaleparaguay.com','preview.scaleparaguay.com','localhost','127.0.0.1','scaleparaguay.com','sistema.scaleparaguay.com:3000','blog.scaleparaguay.com.evil.com','toString'])assert.equal(analyticsConfig(host,env),null,host);
 for(const origin of [undefined,'','invalid','http://stats.example.com','https://localhost','https://127.0.0.1','https://[::1]','https://stats.local','https://stats.example.com:444','https://user:pass@stats.example.com','https://stats.example.com/path','https://stats.example.com/?token=secret','https://stats.example.com/#hash','https://sistema.scaleparaguay.com'])assert.equal(analyticsConfig(hosts[0],{...env,UMAMI_ORIGIN:origin}),null,String(origin));
 for(const id of [undefined,'','invalid','<script>','00000000-0000-0000-0000-000000000000'])assert.equal(analyticsConfig(hosts[0],{...env,UMAMI_LANDING_WEBSITE_ID:id}),null,String(id));
 assert.ok(analyticsConfig(hosts[0],{...env,UMAMI_COMPANY_BLOG_WEBSITE_ID:undefined}),'one disabled surface does not disable another');
});

test('Umami: runtime headers fail closed, DNT blocks, forwarded hosts cannot enable tracking',()=>{
 assert.equal(requestAnalyticsConfig(new Headers({'x-forwarded-host':hosts[0]})),null);
 for(const dnt of ['1','yes','YES'])assert.equal(requestAnalyticsConfig(new Headers({host:hosts[0],dnt})),null);
 assert.ok(requestAnalyticsConfig(new Headers({host:hosts[0],dnt:'0'})));
 const before=process.env.UMAMI_ORIGIN;
 delete process.env.UMAMI_ORIGIN;
 assert.equal(requestAnalyticsConfig(new Headers({host:hosts[0]})),null);
 process.env.UMAMI_ORIGIN=before;
});

test('Umami: bootstrap checks actual HTTPS host and all browser DNT signals before loading',()=>{
 const config=analyticsConfig(hosts[0],env)!;
 for(const url of [`https://${hosts[0]}/`,`https://${hosts[0]}/?token=secret#private`]){
  const b=browser(url);runInNewContext(analyticsBootstrap(config),b.context);
  assert.equal(b.scripts.length,1);assert.equal(b.scripts[0].src,ANALYTICS_LOADER);assert.equal(b.scripts[0].referrerPolicy,'no-referrer');
 }
 for(const url of ['https://app.scaleparaguay.com/',`http://${hosts[0]}/`,`https://${hosts[0]}:444/`]){
  const b=browser(url);runInNewContext(analyticsBootstrap(config),b.context);assert.equal(b.scripts.length,0);
 }
 for(const source of ['navigator','ms','window']){
  const b=browser(`https://${hosts[0]}/`);
  if(source==='navigator')b.window.navigator.doNotTrack='1';
  if(source==='ms')b.window.navigator.msDoNotTrack='1';
  if(source==='window')b.window.doNotTrack='yes';
  runInNewContext(analyticsBootstrap(config),b.context);assert.equal(b.scripts.length,0);
 }
});

test('Umami: loader sends pathname only, deduplicates query/hash changes and guards navigation',()=>{
 const source=analyticsLoader(analyticsConfig(hosts[1],env)!);
 const b=browser(`https://${hosts[1]}/?token=secret#private`);
 runInNewContext(source,b.context);runInNewContext(source,b.context);
 assert.equal(b.sent.length,1);
 b.window.history.replaceState(null,'','/?search=private#fragment');assert.equal(b.sent.length,1);
 b.window.history.pushState(null,'','/atencion-al-cliente-que-ordena-la-operacion?client=secret#hidden');
 assert.equal(b.sent.length,2);
 b.window.history.pushState(null,'','/que-publicar-en-instagram');assert.equal(b.sent.length,2,'future posts are not tracked');
 b.window.history.pushState(null,'','/trabajar-por-entregas-sin-perder-el-hilo');assert.equal(b.sent.length,2,'drafts are not tracked');
 b.window.history.pushState(null,'','/cliente/entregas/123');assert.equal(b.sent.length,2,'private paths are not tracked');
 b.location.pathname='/';b.listeners.popstate();assert.equal(b.sent.length,3);
 b.window.navigator.doNotTrack='1';b.window.history.pushState(null,'','/atencion-al-cliente-que-ordena-la-operacion');assert.equal(b.sent.length,3,'DNT is checked for every pageview');
 for(const sent of b.sent){
  assert.equal(sent.url,ANALYTICS_COLLECT);
  assert.deepEqual(Object.keys(JSON.parse(sent.options.body as string)),['path']);
  assert.doesNotMatch(sent.options.body as string,/[?#]|secret|private|hidden/);
  assert.equal(sent.options.credentials,'omit');assert.equal(sent.options.referrerPolicy,'no-referrer');
 }
 const disabled=browser(`https://${hosts[1]}/`,'1');runInNewContext(source,disabled.context);assert.equal(disabled.sent.length,0);
 const privateHost=browser('https://app.scaleparaguay.com/');runInNewContext(source,privateHost.context);assert.equal(privateHost.sent.length,0);
 const landing=browser(`https://${hosts[0]}/demo`);runInNewContext(analyticsLoader(analyticsConfig(hosts[0],env)!),landing.context);assert.equal(landing.sent.length,0);
});

test('Umami: loader endpoint emits nothing with missing config, private hosts or DNT',async()=>{
 assert.equal(loaderGet(request('app.scaleparaguay.com')).status,204);
 assert.equal(loaderGet(request(hosts[0],ANALYTICS_LOADER,{dnt:'1'})).status,204);
 const origin=process.env.UMAMI_ORIGIN;delete process.env.UMAMI_ORIGIN;
 const disabled=loaderGet(request(hosts[0]));assert.equal(await disabled.text(),'');assert.equal(disabled.status,204);
 process.env.UMAMI_ORIGIN=origin;
 const enabled=loaderGet(request(hosts[0]));assert.equal(enabled.status,200);assert.match(enabled.headers.get('cache-control')||'',/no-store/);
 assert.match(enabled.headers.get('content-type')||'',/javascript/);
 assert.doesNotMatch(await enabled.text(),/stats\.example|website|identify|document\.referrer|location\.search|location\.hash/);
});

test('Umami: proxy reconstructs pageviews and never forwards identity, cookies, IP or custom data',async t=>{
 const calls:{url:string;options:RequestInit}[]=[];
 t.mock.method(globalThis,'fetch',async(url:string,options:RequestInit)=>{calls.push({url,options});return new Response('{"sessionId":"secret"}',{headers:{'set-cookie':'secret=1'}});});
 for(const [i,host] of hosts.entries()){
  const response=await collectPost(post(host,{path:'/'},{cookie:'private=1',authorization:'Bearer secret','x-forwarded-for':'1.2.3.4'}));
  assert.equal(response.status,204);assert.equal(await response.text(),'');assert.equal(response.headers.get('set-cookie'),null);
  const call=calls[i];assert.equal(call.url,'https://stats.example.com/api/send');
  assert.deepEqual(JSON.parse(call.options.body as string),{type:'event',payload:{website:ids[i],hostname:host,url:'/'}});
  assert.deepEqual(call.options.headers,{'Content-Type':'application/json','User-Agent':'Mozilla/5.0'});
  assert.equal(call.options.redirect,'error');assert.equal(call.options.credentials,'omit');assert.ok(call.options.signal);
 }
});

test('Umami: invalid or private payloads cannot send, including identify/custom events and oversized input',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response();});
 for(const host of ['app.scaleparaguay.com','admin.scaleparaguay.com','cliente.scaleparaguay.com','localhost'])assert.equal((await collectPost(post(host,{path:'/'}))).status,204);
 for(const body of [{path:'/?secret=1'},{path:'/#hidden'},{path:'https://evil.com/'},{path:'//evil.com/'},{path:'/demo'},{path:'/' ,id:'user'},{path:'/',data:{secret:'1'}},{path:'/',type:'identify'},null,[],{path:1}])assert.equal((await collectPost(post(hosts[0],body))).status,400);
 for(const path of ['/que-publicar-en-instagram','/trabajar-por-entregas-sin-perder-el-hilo','/cliente/entregas/123'])assert.equal((await collectPost(post(hosts[1],{path}))).status,400);
 assert.equal((await collectPost(post(hosts[0],{path:'/'},{origin:'https://evil.com'}))).status,400);
 assert.equal((await collectPost(post(hosts[0],{path:'/'},{dnt:'1'}))).status,204);
 assert.equal((await collectPost(post(hosts[0],{path:'/'},{'content-type':'text/plain'}))).status,400);
 assert.equal((await collectPost(post(hosts[0],{path:'x'.repeat(3000)}))).status,413);
 assert.equal(calls,0);
});

test('Umami: upstream failure remains invisible to users',async t=>{
 t.mock.method(globalThis,'fetch',async()=>{throw new Error('offline');});
 assert.equal((await collectPost(post(hosts[0],{path:'/'}))).status,204);
});

test('Umami: landing HTML is unchanged when disabled and only public middleware routes serve analytics',async()=>{
 const original=readFileSync('public/scale-os.html','utf8');
 assert.equal(await (await landingGet(request(hosts[0],'/',{dnt:'1'}))).text(),original);
 const origin=process.env.UMAMI_ORIGIN;delete process.env.UMAMI_ORIGIN;
 assert.equal(await (await landingGet(request(hosts[0],'/'))).text(),original);
 process.env.UMAMI_ORIGIN=origin;
 const enabled=await landingGet(request(hosts[0],'/'));assert.match(await enabled.text(),/public-analytics\/loader\.js/);
 assert.match(enabled.headers.get('cache-control')||'',/no-store/);
 assert.equal((await landingGet(request('app.scaleparaguay.com','/'))).status,404);
 for(const host of [...hosts,'app.scaleparaguay.com','admin.scaleparaguay.com','cliente.scaleparaguay.com','preview.scaleparaguay.com','localhost']){
  for(const path of [ANALYTICS_LOADER,ANALYTICS_COLLECT]){
   const response=middleware(new NextRequest(`https://${host}${path}`,{headers:{host}}));
   assert.equal(response.status,hosts.includes(host)?200:404);
  }
 }
 const layout=readFileSync('app/blog/layout.tsx','utf8');
 assert.match(layout,/requestAnalyticsConfig\(await headers\(\)\)/);assert.match(layout,/config\?<script/,'blog script is server-gated');
 const csp=readFileSync('next.config.mjs','utf8');assert.match(csp,/script-src 'self' 'unsafe-inline'/);assert.match(csp,/connect-src 'self' https:\/\/api\.scaleparaguay\.com/);assert.doesNotMatch(csp,/umami|stats\.example/);
});
