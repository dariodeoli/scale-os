import assert from 'node:assert/strict';
import test from 'node:test';
import {clearDataCache,dataFetch,setDataScope} from '../app/data-cache';
import {prefetchSectionData} from '../app/data-prefetch';

const endpoint='/core-api/api/agency/leads';
const response=(value=1,status=200)=>new Response(JSON.stringify({value}),{status});
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve};}

test('intent prefetch overlaps navigation: one request, independently consumable responses, 15s expiry',async t=>{
 setDataScope('user:agency:owner');clearDataCache();
 let calls=0,now=1000;const first=deferred<Response>();
 t.mock.method(Date,'now',()=>now);
 t.mock.method(globalThis,'fetch',()=>{calls++;return calls===1?first.promise:Promise.resolve(response(calls));});
 const warming=prefetchSectionData('Pipeline','user:agency:owner');
 const navigation=dataFetch(endpoint,{credentials:'include'});
 assert.equal(calls,1);first.resolve(response());await warming;
 assert.deepEqual(await (await navigation).json(),{value:1});
 assert.deepEqual(await (await dataFetch(endpoint)).json(),{value:1});assert.equal(calls,1);
 now+=15001;await dataFetch(endpoint);assert.equal(calls,2);
});

test('no unauthorized membership or inventory versions are retained, explicit fresh reads bypass cache',async t=>{
 setDataScope('user:agency:owner');clearDataCache();let calls=0;
 t.mock.method(globalThis,'fetch',async()=>response(++calls));
 for(const path of ['/members','/team','/settings','/inventory-context','/inventory-reservations?from=a&to=b','/custodians','/productivity/people']){
  const before=calls;await dataFetch('/core-api/api/agency'+path);await dataFetch('/core-api/api/agency'+path);
  assert.equal(calls-before,2,path);
 }
 await dataFetch(endpoint);const before=calls;
 for(const init of [{cache:'no-store' as const},{cache:'reload' as const},{signal:new AbortController().signal},{credentials:'omit' as const},{headers:{Authorization:'test-only'}}])await dataFetch(endpoint,init);
 assert.equal(calls-before,5);
});

test('session, tenant, role and mutation invalidation discard pending cache fills',async t=>{
 let calls=0,pending:ReturnType<typeof deferred<Response>>|null=null;
 t.mock.method(globalThis,'fetch',()=>{calls++;return pending?pending.promise:Promise.resolve(response(calls));});
 for(const next of ['user:other:owner','user:other:viewer','','user:agency:owner']){
  setDataScope('user:agency:admin');clearDataCache();pending=deferred<Response>();
  const old=dataFetch(endpoint);setDataScope(next);pending.resolve(response(99));pending=null;await old;
  const before=calls;await dataFetch(endpoint);assert.equal(calls,before+1);
 }
 setDataScope('user:agency:owner');clearDataCache();pending=deferred<Response>();
 const old=dataFetch(endpoint);const delayed=pending;pending=null;
 await dataFetch(endpoint,{method:'PATCH',body:'{}'});delayed.resolve(response(99));await old;
 const before=calls;assert.notEqual((await (await dataFetch(endpoint)).json()).value,99);assert.equal(calls,before+1);
});

test('401, 402, 403 invalidate cached data; failures can be retried',async t=>{
 setDataScope('user:agency:owner');let calls=0,status=200;
 t.mock.method(globalThis,'fetch',async()=>response(++calls,status));
 for(const denied of [401,402,403]){
  clearDataCache();status=200;await dataFetch(endpoint);
  status=denied;await dataFetch('/core-api/api/agency/team');
  status=200;const before=calls;await dataFetch(endpoint);assert.equal(calls,before+1);
 }
 clearDataCache();status=500;await dataFetch(endpoint);status=200;
 const before=calls;assert.equal((await dataFetch(endpoint)).status,200);assert.equal(calls,before+1);
 clearDataCache();t.mock.method(globalThis,'fetch',async()=>{throw Error('offline');});
 await assert.rejects(dataFetch(endpoint),/offline/);
 t.mock.method(globalThis,'fetch',async()=>response());assert.equal((await dataFetch(endpoint)).status,200);
});

test('prefetch stays in the current scope and excludes fresh or unrelated endpoints',async t=>{
 setDataScope('user:agency:owner');clearDataCache();const urls:string[]=[];
 t.mock.method(globalThis,'fetch',async(url:RequestInfo|URL)=>{urls.push(String(url));return response();});
 await prefetchSectionData('Equipo','other:agency:owner');assert.equal(urls.length,0);
 for(const section of ['Equipo','Inventario','Configuración','Historial de trabajo','Pipeline','Invitaciones','Proyectos','Resumen'])await prefetchSectionData(section,'user:agency:owner');
 assert.equal(urls.length,8);
 assert(!urls.some(url=>/members|team|settings|reservations|context|invit|projects|summary|people/.test(url)));
 setDataScope('');await prefetchSectionData('Pipeline','user:agency:owner');assert.equal(urls.length,8);
});
