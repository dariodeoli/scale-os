import React from 'react';
import assert from 'node:assert/strict';
import {afterEach,test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';

// Isolate the shared footer, which is maintained independently of this page.
const footerId=require.resolve('../app/workspace-footer');
require.cache[footerId]={id:footerId,filename:footerId,loaded:true,exports:{WorkspaceFooter:()=>null}} as NodeModule;
Object.assign(globalThis,{React});
const InvitationPage=require('../app/invitacion/page').default;
const token='a'.repeat(43),originalFetch=globalThis.fetch;
const originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
let renderer:ReactTestRenderer|undefined;
const valid={organization_name:'Equipo de prueba',role:'viewer',mode:'single'};
const response=(status=200,data:unknown=valid)=>new Response(JSON.stringify(data),{status});
async function mount(search:string,fetcher:typeof fetch){
 Object.assign(globalThis,{window:{location:{search}},fetch:fetcher});
 await act(async()=>{renderer=create(<InvitationPage/>);});
}
const heading=()=>renderer!.root.findByType('h1').props.children;
const oauth=()=>renderer!.root.findAllByType('a').filter(a=>a.props.children==='Continuar con Google');
const text=()=>JSON.stringify(renderer!.toJSON());
afterEach(async()=>{
 if(renderer)await act(async()=>renderer!.unmount());
 renderer=undefined;globalThis.fetch=originalFetch;
 if(originalWindow)Object.defineProperty(globalThis,'window',originalWindow);else Reflect.deleteProperty(globalThis,'window');
});

test('token takes precedence over stale error and pending on every refresh; OAuth keeps admin host',async()=>{
 let calls=0;
 for(let refresh=0;refresh<2;refresh++){
  await mount(`?token=${token}&error=old-private-error&pending=1`,async(url,options)=>{
   calls++;assert.equal(url,`/core-api/api/invitations/preview?token=${token}`);
   assert.equal(options?.cache,'no-store');assert.equal(options?.referrerPolicy,'no-referrer');
   return response();
  });
  assert.equal(heading(),'Invitación al equipo');assert(!text().includes('old-private-error'));
  assert.equal(oauth()[0].props.href,`https://admin.scaleparaguay.com/api/auth/google/start?invite=${token}`);
  assert.equal(oauth()[0].props.referrerPolicy,'no-referrer');
  await act(async()=>renderer!.unmount());renderer=undefined;
 }
 assert.equal(calls,2);
});

test('missing, malformed, historical callback and pending states do not fetch or authorize OAuth',async()=>{
 for(const [query,expected] of [['','Falta el enlace de invitación'],['?token=short','Enlace de invitación incompleto o inválido'],['?error=private-error','Retomá tu invitación'],['?pending=1','Solicitud pendiente de aprobación'],['?pending=0','Falta el enlace de invitación']]){
  await mount(query,async()=>{throw Error('Must not fetch');});
  assert.equal(heading(),expected);assert.equal(oauth().length,0);assert(!text().includes('private-error'));
  await act(async()=>renderer!.unmount());renderer=undefined;
 }
});

test('loading blocks OAuth; authoritative 410 is unavailable without echoing server errors',async()=>{
 let resolve!:(value:Response)=>void;
 await mount(`?token=${token}`,()=>new Promise(r=>{resolve=r;}));
 assert.equal(heading(),'Comprobando invitación');assert.equal(oauth().length,0);
 assert.equal(renderer!.root.findByType('section').props['aria-busy'],true);
 await act(async()=>resolve(response(410,{error:'private-server-detail'})));
 assert.equal(heading(),'Invitación no disponible');assert.equal(oauth().length,0);
 assert(!text().includes('private-server-detail'));assert.equal(renderer!.root.findAllByType('button').length,0);
});

test('network, HTTP and malformed preview failures remain unverified and allow retry',async()=>{
 const failures:(()=>Promise<Response>)[]=[async()=>{throw Error('private-network-detail');},async()=>response(503),async()=>response(429),async()=>new Response('<html>'),async()=>response(200,null),async()=>response(200,{...valid,role:'__proto__'}),async()=>response(200,{...valid,mode:'unknown'}),async()=>response(200,{...valid,organization_name:''})];
 for(const failure of failures){
  let calls=0;
  await mount(`?token=${token}`,async()=>++calls===1?failure():response(200,{...valid,mode:'approval'}));
  assert.equal(heading(),'No pudimos comprobar la invitación');assert.equal(oauth().length,0);
  assert(!text().includes('private-network-detail'));
  await act(async()=>renderer!.root.findByType('button').props.onClick());
  assert.equal(calls,2);assert.equal(oauth().length,1);assert(text().includes('Podés solicitar acceso'));
  await act(async()=>renderer!.unmount());renderer=undefined;
 }
});

test('timeout aborts, retry uses a new request, and late success cannot replace the retry result',async()=>{
 const realSetTimeout=globalThis.setTimeout,realClearTimeout=globalThis.clearTimeout;
 let expire!:()=>void,resolveOld!:(value:Response)=>void,oldSignal:AbortSignal|undefined;
 let calls=0;
 try{
  globalThis.setTimeout=((callback:()=>void,delay:number)=>{assert.equal(delay,10000);expire=callback;return 123;}) as unknown as typeof setTimeout;
  globalThis.clearTimeout=(()=>{}) as typeof clearTimeout;
  await mount(`?token=${token}`,async(_url,options)=>{
   if(++calls===1){oldSignal=options!.signal as AbortSignal;return new Promise(r=>{resolveOld=r;});}
   return response(410);
  });
  await act(async()=>expire());assert.equal(oldSignal!.aborted,true);
  assert.equal(heading(),'No pudimos comprobar la invitación');assert.equal(oauth().length,0);
  await act(async()=>renderer!.root.findByType('button').props.onClick());
  await act(async()=>resolveOld(response()));
  assert.equal(heading(),'Invitación no disponible');assert.equal(oauth().length,0);
 }finally{globalThis.setTimeout=realSetTimeout;globalThis.clearTimeout=realClearTimeout;}
});

test('unmount aborts an outstanding preview',async()=>{
 let signal:AbortSignal|undefined,resolve!:(value:Response)=>void;
 await mount(`?token=${token}`,async(_url,options)=>{signal=options!.signal as AbortSignal;return new Promise(r=>{resolve=r;});});
 await act(async()=>renderer!.unmount());renderer=undefined;
 assert.equal(signal!.aborted,true);
 await act(async()=>resolve(response()));
});
