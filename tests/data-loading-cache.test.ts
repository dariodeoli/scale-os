import assert from 'node:assert/strict';
import test from 'node:test';
import {clearDataCache,dataFetch,setDataScope} from '../app/data-cache';
import {prefetchSectionData} from '../app/data-prefetch';
import {workspaceSource} from './workspace-source';

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

test('a 200 with a non-JSON body never becomes empty workspace state',async()=>{
 const {readFileSync}=await import('node:fs');
 const workspace=workspaceSource();
 assert(workspace.includes('if (text.trim()) throw new Error("El servidor devolvió una respuesta inválida. Reintentá.");'),'a non-empty non-JSON 200 must throw instead of returning an empty object');
 assert(workspace.includes("if(!Array.isArray(clientData?.clients)||!Array.isArray(projectData?.projects)||!Array.isArray(orderData?.workOrders)||!summaryData?.summary)throw new Error('El servidor devolvió datos incompletos. Reintentá.');"),'the main load validates every array before setting state');
 assert(workspace.includes('const listOf=<T,>(value:unknown):T[]=>Array.isArray(value)?value as T[]:[];'),'secondary loaders coerce non-arrays');
});

test('navegar no repite datos frescos: el shell pide solo lo que la sección necesita y venció',async()=>{
 const {readFileSync}=await import('node:fs');
 const workspace=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
 assert(workspace.includes("const SECTION_DATA:Record<string,readonly ShellResource[]>={"),'el shell declara qué recursos necesita cada sección');
 assert(workspace.includes("Resumen:['clients','projects','orders','summary']"),'Resumen declara sus datos compartidos');
 assert(workspace.includes('const DATA_FRESH_MS=120000;'),'lo ya cargado tiene una ventana de frescura explícita');
 assert(/async function load\(identity:User\|null=user,resources:readonly ShellResource\[\]=SHELL_RESOURCES\)/.test(workspace),'load acepta un subconjunto de recursos');
 assert(workspace.includes('dataFreshness.current.clients=Date.now()'),'cada recurso marca su frescura al llegar');
 assert(workspace.includes('const stale=needed.filter(resource=>Date.now()-dataFreshness.current[resource]>DATA_FRESH_MS);'),'al navegar solo se miran los recursos vencidos');
 assert(workspace.includes('if(!stale.length)return;'),'sin recursos vencidos la navegación no pide nada');
 assert(workspace.includes('void load(user,stale)'),'el refresco de navegación queda acotado a lo vencido');
 const presence=readFileSync(new URL('../app/presence.tsx',import.meta.url),'utf8');
 assert(presence.includes('const peopleInflight=new Map<string,Promise<ProjectPeopleState>>();'),'la presencia comparte un único pedido en vuelo por consulta');
 assert(presence.includes('function publishPeople(state:ProjectPeopleState)'),'todas las cápsulas se actualizan desde el mismo resultado');
 assert(presence.includes('if(!force&&readPeople(path))return;'),'una consulta de presencia fresca no se repite');
 const clientes=readFileSync(new URL('../app/sections/clientes.tsx',import.meta.url),'utf8');
 const resumen=readFileSync(new URL('../app/sections/resumen.tsx',import.meta.url),'utf8');
 assert(clientes.includes('Cargando clientes…')&&resumen.includes('Cargando el panel…'),'las secciones muestran esqueleto mientras llega el primer dato');
});
