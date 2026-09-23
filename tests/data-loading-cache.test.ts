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


test('hotfix: transporte sin doble prefijo, navegación por sección y marco a 360',async()=>{
 const {readFileSync}=await import('node:fs');
 const request=readFileSync(new URL('../app/workspace-request.ts',import.meta.url),'utf8');
 assert(request.includes('const core = "/core-api"')&&request.includes('path.startsWith('),'el transporte no duplica el prefijo /core-api (shellDataUrl ya lo trae)');
 const operations=readFileSync(new URL('../app/operations.tsx',import.meta.url),'utf8');
 assert(operations.includes('path.startsWith("/core-api/") ? path : '),'api() también acepta rutas ya prefijadas');
 const workspace=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
 assert(workspace.includes('},[pathname,requestedSection,signedIn]);'),'el efecto de navegación depende de la sección activa');
 assert(workspace.includes("if(resource==='orders'&&!loaded)setOrders(current=>current.length?[]:current);"),'una proyección distinta no reusa la lista cargada (el tablero no rompe al entrar)');
 assert(workspace.includes('const lastDataSection=useRef(requestedSection);'),'la sección activa se recuerda para detectar el cambio');
 const shellData=readFileSync(new URL('../app/shell-data.ts',import.meta.url),'utf8');
 assert(shellData.includes('ORDER_FIELDS_BOARD = \'id,project_id,project_name,client_name,title,description,status,work_type,'),'la proyección del tablero incluye work_type');
 const globals=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
 assert(!globals.includes('width:254px'),'la geometría legada del riel no aplasta el contenido a 360');
 assert(!globals.includes('desktop-sidebar{width:220px}'),'el ancho legado del riel no pelea con Tailwind');
 const ui=readFileSync(new URL('../app/ui-system.css',import.meta.url),'utf8');
 assert(ui.includes('.control-shell .panel{border-radius:var(--radius-md);padding:var(--ui-panel-padding);min-width:0}'),'los paneles no crecen más allá de su columna');
 assert(ui.includes('.finance-grid)>*{min-width:0}'),'los contenedores apilados no heredan el min-content del contenido');
});

test('Producción no pide órdenes al shell: el tablero las carga por columna',async()=>{
 const {readFileSync}=await import('node:fs');
 const {sectionScope,ORDER_FIELDS_BOARD}=await import('../app/shell-data');
 const scope=sectionScope('Producción');
 assert.equal(scope.orders,undefined,'el shell no pide órdenes para Producción (sin lecturas duplicadas)');
 assert.ok(scope.clients&&scope.projects,'el tablero conserva clientes y proyectos para filtros y tarjetas');
 assert.ok(scope.summary,'y el resumen para el chrome');
 assert.match(ORDER_FIELDS_BOARD,/work_type/,'la proyección de la tarjeta incluye work_type');
 const board=readFileSync(new URL('../app/board-data.ts',import.meta.url),'utf8');
 assert(board.includes('counts=1'),'el tablero pide los conteos exactos por etapa');
 assert(board.includes('status='),'y una ventana por columna');
 assert(board.includes('boardCountsUrl')&&board.includes('boardColumnUrl'),'las URLs del tablero viven en board-data');
 const hook=readFileSync(new URL('../app/use-board-data.ts',import.meta.url),'utf8');
 assert(hook.includes("from './shell-data'"),'el tablero usa la proyección compartida de shell-data');
 assert(!readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8').includes('loadBoardColumns'),'el shell no duplica la carga del tablero');
});
