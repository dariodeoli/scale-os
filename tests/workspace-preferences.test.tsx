import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {defaultWorkspacePreferences,parseWorkspacePreferences,startupChoices,startupDestination,workspacePreferenceKey} from '../app/workspace-preferences';
import {useStartupPreference,useWorkspacePreferences} from '../app/use-workspace-preferences';
import {workspaceSource} from './workspace-source';

const origin='https://workspace.invalid';
function environment(href=origin+'/') {
 globalThis.fetch=async()=>{throw Error('Offline fixture');};
 const storage=new Map<string,string>(),writes:string[]=[];
 const events=new EventTarget();
 const win={location:{href},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),
  localStorage:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>{writes.push(key);storage.set(key,value);}}};
 Object.defineProperty(globalThis,'window',{configurable:true,value:win});
 return {win,storage,writes,events};
}
test('versioned preferences validate input and use collision-free user+org keys',()=>{
 assert.equal(workspacePreferenceKey('','2'),'');assert.equal(workspacePreferenceKey('1',' '),'');
 assert.notEqual(workspacePreferenceKey('a:b','c'),workspacePreferenceKey('a','b:c'));
 for(const raw of [null,'bad','null','[]','{"version":2}'])assert.deepEqual(parseWorkspacePreferences(raw),defaultWorkspacePreferences());
 assert.deepEqual(parseWorkspacePreferences(JSON.stringify({version:1,startup:'https://evil.invalid',production:{clientId:'../2',mine:'true',week:1}})),defaultWorkspacePreferences());
 assert.deepEqual(parseWorkspacePreferences(JSON.stringify({version:1,startup:'my-day',production:{clientId:'123',mine:true,week:true}})),{version:1,startup:'my-day',production:{clientId:'123',mine:true,week:true}});
 for(const role of ['owner','admin','management','finance','sales','production','editor','viewer','collaborator'])assert.equal(startupChoices(role).length,3);
 assert.deepEqual(startupChoices('unknown'),[]);
});
test('only untouched bare root can resolve a permitted startup',()=>{
 assert.equal(startupDestination(origin+'/',origin+'/','my-day','editor'),'/produccion?vista=Mi%20d%C3%ADa');
 for(const path of ['/resumen','/produccion','/clientes/123','/?order=10','/?vista=Mi%20d%C3%ADa','/?billing=success','/?authError=denied','/?unknown=1','/#billing','/?','/#']){
  assert.equal(startupDestination(origin+path,origin+'/','production','owner'),null,path+' initial');
  assert.equal(startupDestination(origin+'/',origin+path,'production','owner'),null,path+' current');
 }
 assert.equal(startupDestination(origin+'/',origin+'/','production','unknown'),null);
 assert.equal(startupDestination(origin+'/','https://elsewhere.invalid/','production','owner'),null);
});
test('hook restores every user/org independently; no old preference frame or automatic writes',()=>{
 const env=environment();let result!:ReturnType<typeof useWorkspacePreferences>;
 const frames:{key:string;startup:string;ready:boolean}[]=[];
 function Probe({user,org}:{user:string;org:string}){result=useWorkspacePreferences(user,org);frames.push({key:result.key,startup:result.preferences.startup,ready:result.ready});return null;}
 let renderer!:ReactTestRenderer;
 act(()=>{renderer=create(<Probe user="1" org="1"/>);});
 assert.equal(env.writes.length,0);
 act(()=>result.update({startup:'production',production:{clientId:'12',mine:true,week:true}}));
 const oldUpdate=result.update;
 for(const [user,org] of [['1','2'],['2','1'],['2','2']]){
  const offset=frames.length;act(()=>renderer.update(<Probe user={user} org={org}/>));
  assert.deepEqual(frames[offset],{key:workspacePreferenceKey(user,org),startup:'summary',ready:false});
  assert.deepEqual(result.preferences,defaultWorkspacePreferences());
  act(()=>result.update({startup:'my-day'}));
 }
 const writes=env.writes.length;act(()=>oldUpdate({startup:'summary'}));assert.equal(env.writes.length,writes,'stale callback rejected');
 act(()=>renderer.update(<Probe user="" org=""/>));
 assert(!result.ready);assert.deepEqual(result.preferences,defaultWorkspacePreferences());
 act(()=>renderer.update(<Probe user="1" org="1"/>));
 assert.equal(result.preferences.startup,'production');assert.deepEqual(result.preferences.production,{clientId:'12',mine:true,week:true});
 assert.equal(env.writes.length,writes,'logout/login only reads, preserving storage');
 act(()=>renderer.unmount());
 act(()=>{renderer=create(<Probe user="1" org="1"/>);});
 assert.equal(result.preferences.startup,'production','survives full remount');act(()=>renderer.unmount());
});
test('blocked storage keeps current-session choices and warns without throwing',()=>{
 const env=environment();env.win.localStorage.getItem=()=>{throw Error('blocked');};env.win.localStorage.setItem=()=>{throw Error('blocked');};
 let result!:ReturnType<typeof useWorkspacePreferences>;
 function Probe(){result=useWorkspacePreferences('1','1');return null;}
 let renderer!:ReactTestRenderer;act(()=>{renderer=create(<Probe/>);});
 assert(result.warning);assert(result.ready);
 act(()=>result.update({startup:'my-day'}));assert.equal(result.preferences.startup,'my-day');assert(result.warning);
 act(()=>result.update({production:{clientId:'12',mine:true,week:false}}));assert.equal(result.preferences.startup,'my-day');
 act(()=>renderer.unmount());
});
test('startup waits for data; consumes once, including suspended entries and later account changes',()=>{
 const env=environment(),destinations:string[]=[];
 type Props={ready:boolean;scope?:string;enabled?:boolean;path?:string};
 function Probe({ready,scope='user:org',enabled=true,path='/'}:Props){useStartupPreference({scope,ready,enabled,pathname:path,role:'owner',startup:'production',replace:path=>destinations.push(path)});return null;}
 let renderer!:ReactTestRenderer;
 act(()=>{renderer=create(<Probe ready={false}/>);});assert.deepEqual(destinations,[]);
 act(()=>renderer.update(<Probe ready/>));assert.deepEqual(destinations,['/produccion']);
 act(()=>renderer.update(<Probe ready={false} scope=""/>));
 act(()=>renderer.update(<Probe ready scope="another:org"/>));assert.equal(destinations.length,1,'same Home never redirects again');
 act(()=>renderer.unmount());destinations.length=0;
 act(()=>{renderer=create(<Probe ready enabled={false}/>);});
 act(()=>renderer.update(<Probe ready enabled/>));assert.deepEqual(destinations,[],'suspension recovery never triggers startup');
 act(()=>renderer.unmount());
 act(()=>{renderer=create(<Probe ready={false}/>);});
 env.win.location.href=origin+'/clientes';act(()=>renderer.update(<Probe ready={false} path="/clientes"/>));
 env.win.location.href=origin+'/';act(()=>renderer.update(<Probe ready/>));assert.deepEqual(destinations,[],'user navigation cancels pending startup');
 act(()=>renderer.unmount());
});
test('render capture survives auth cleanup and strict-like setup/cleanup/setup replay',()=>{
 // react-test-renderer 18 does not replay Strict Effects. Replay each effect's
 // lifecycle explicitly while preserving actual React refs/state in this hook.
 const runtime=require('react') as typeof React;
 const originalEffect=runtime.useEffect;
 runtime.useEffect=(effect,deps)=>originalEffect(()=>{const cleanup=effect();if(typeof cleanup==='function')cleanup();return effect();},deps);
 try{
  for(const entry of [origin+'/?authError=denied',origin+'/']){
   const env=environment(entry),destinations:string[]=[];
   const Probe=({ready}:{ready:boolean})=>{
    useStartupPreference({scope:'1:1',ready,enabled:true,pathname:'/',role:'owner',startup:'production',replace:path=>destinations.push(path)});
    runtime.useEffect(()=>{env.win.location.href=origin+'/';},[]);
    return null;
   };
   let renderer!:ReactTestRenderer;act(()=>{renderer=create(<React.StrictMode><Probe ready={false}/></React.StrictMode>);});
   act(()=>renderer.update(<React.StrictMode><Probe ready/></React.StrictMode>));
   assert.deepEqual(destinations,entry.includes('?')?[]:['/produccion']);
   act(()=>renderer.unmount());
  }
 }finally{runtime.useEffect=originalEffect;}
});
test('Home wiring gates startup on current operational data and preserves explicit views',()=>{
 const home=workspaceSource();
 assert(home.includes('startupDataScope===preferenceScope'));
 assert(home.includes('enabled:operationalAccess'));
 assert(home.includes('ready:preferencesReady&&preferencesStartupReady&&!loading'),'startup waits for authoritative preferences without blocking cached controls');
 assert.equal((home.match(/load\(data\.user,sectionScope\(/g)||[]).length,2,'bootstrap and password login capture authenticated identity');
 assert(home.includes('setStartupDataScope(loadedScope)'));
 assert(!/setDetail\(null\);setProductionClientId/.test(home),'path changes no longer reset saved filters');
 const logout=home.slice(home.indexOf('async function logout()'),home.indexOf('async function onDragEnd'));
 assert(!logout.includes('updatePreferences'));assert(logout.includes('clearSessionState()'));
  const cleanup=home.slice(home.indexOf('function clearScopedShellData()'),home.indexOf('function clearSessionState()'));
 assert(cleanup.includes("setStartupDataScope('')"));assert(!cleanup.includes('updatePreferences'));
 assert(home.includes("active==='Preferencias'"));
 const preferencias=readFileSync(new URL('../app/sections/preferencias.tsx',import.meta.url),'utf8'),produccion=readFileSync(new URL('../app/sections/produccion.tsx',import.meta.url),'utf8');
 assert(preferencias.includes('preferencesReady?'),'la sección Preferencias espera las preferencias cargadas antes de mostrar los selectores');
 assert(preferencias.includes('<SelectCustom'));
 assert(home.includes('productionFiltersDialogScope===preferenceScope'));
 assert(home.includes('filterProductionOrders(orders, projects, selectedProductionClient,{...preferences.production'));
 assert(home.includes('userId:String(user?.id||\'\'),today:productionToday'));
 assert(produccion.includes('key={productionView} initialView={productionView} orders={boardData.plannerOrders}'),'saved board filters do not reinterpret explicit planner views');
 assert(preferencias.includes('label="Al entrar a Scale OS"'));
 assert(home.includes('Vencen esta semana (hora local)'));
 assert(home.includes('production:defaultWorkspacePreferences().production'));
});

const answer=(preferences=defaultWorkspacePreferences(),stored=true,user='1',org='1',status=200)=>new Response(JSON.stringify({preferences,stored,user_id:user,organization_id:org}),{status,headers:{'Content-Type':'application/json'}});
const settle=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {resolve,promise};}
function mountPreferences(){let result!:ReturnType<typeof useWorkspacePreferences>;const Probe=({user='1',org='1'}:{user?:string;org?:string})=>{result=useWorkspacePreferences(user,org);return null;};let renderer!:ReactTestRenderer;act(()=>{renderer=create(<Probe/>);});return {get result(){return result;},renderer,Probe};}

test('cache hydrates controls immediately; stored server preferences resolve startup without bootstrap PATCH',async()=>{
 const env=environment();env.storage.set(workspacePreferenceKey('1','1'),JSON.stringify({...defaultWorkspacePreferences(),startup:'production'}));const read=deferred<Response>(),calls:RequestInit[]=[];
 globalThis.fetch=async(_,init)=>{calls.push(init!);return read.promise;};const mounted=mountPreferences();
 try{assert.equal(mounted.result.ready,true);assert.equal(mounted.result.startupReady,false);assert.equal(mounted.result.preferences.startup,'production');read.resolve(answer({...defaultWorkspacePreferences(),startup:'my-day'}));await settle();assert.equal(mounted.result.startupReady,true);assert.equal(mounted.result.preferences.startup,'my-day');assert.deepEqual(calls.map(call=>call.method),['GET']);assert.equal(calls[0].credentials,'include');assert.equal(calls[0].cache,'no-store');assert.equal((calls[0].headers as Record<string,string>)['X-Scale-Preference-Scope'],'1:1');}finally{act(()=>mounted.renderer.unmount());}
});

test('late GET cannot erase an edit; PATCH requests serialize and coalesce the last snapshot',async()=>{
 environment();const read=deferred<Response>(),first=deferred<Response>(),second=deferred<Response>(),patches:WorkspacePreferencesForTest[]=[];
 type WorkspacePreferencesForTest=ReturnType<typeof defaultWorkspacePreferences>;
 globalThis.fetch=async(_,init)=>{if(init!.method==='GET')return read.promise;patches.push(JSON.parse(String(init!.body)));return patches.length===1?first.promise:second.promise;};const mounted=mountPreferences();
 try{act(()=>mounted.result.update({startup:'production'}));act(()=>mounted.result.update({startup:'my-day',production:{clientId:'12',mine:true,week:true}}));assert.equal(patches.length,1,'one request in flight');read.resolve(answer());await settle();assert.equal(mounted.result.preferences.startup,'my-day');first.resolve(answer(patches[0]));await settle();assert.equal(mounted.result.preferences.startup,'my-day','older save response does not flash old values');assert.equal(patches.length,2);assert.equal(patches[1].startup,'my-day');assert.equal(patches[1].production.clientId,'12');second.resolve(answer(patches[1]));await settle();assert.equal(mounted.result.saving,false);assert.equal(mounted.result.warning,'');}finally{act(()=>mounted.renderer.unmount());}
});

test('failed saves survive remount, never auto-overwrite server and retry preserves the complete pending choice',async()=>{
 const env=environment();let writes=0;globalThis.fetch=async(_,init)=>{if(init!.method==='GET')return answer();writes++;return new Response(JSON.stringify({error:'Unavailable'}),{status:503});};let mounted=mountPreferences();
 try{await settle();act(()=>mounted.result.update({startup:'my-day'}));await settle();assert.match(mounted.result.warning,/No se pudieron guardar/);assert.equal(mounted.result.preferences.startup,'my-day');assert.equal(JSON.parse(env.storage.get(workspacePreferenceKey('1','1'))!).pendingSync,true);act(()=>mounted.renderer.unmount());mounted=mountPreferences();await settle();assert.equal(writes,1,'bootstrap never autosaves pending local edits');assert.equal(mounted.result.preferences.startup,'my-day');assert.match(mounted.result.warning,/pendientes/);globalThis.fetch=async(_,init)=>{writes++;return answer(JSON.parse(String(init!.body)));};act(()=>{mounted.result.retry();mounted.result.retry();});await settle();assert.equal(writes,2,'retry is single flight');assert.equal(mounted.result.warning,'');assert.equal(JSON.parse(env.storage.get(workspacePreferenceKey('1','1'))!).pendingSync,false);}finally{act(()=>mounted.renderer.unmount());}
});

test('legacy cache imports once with absence CAS; a competing device wins without overwrite',async()=>{
 for(const competing of [false,true]){
  const env=environment();env.storage.set(workspacePreferenceKey('1','1'),JSON.stringify({...defaultWorkspacePreferences(),startup:'production'}));const calls:RequestInit[]=[];
  globalThis.fetch=async(_,init)=>{calls.push(init!);if(init!.method==='PATCH')return competing?new Response(JSON.stringify({error:'Already stored'}),{status:412}):answer(JSON.parse(String(init!.body)));return calls.length===1?answer(defaultWorkspacePreferences(),false):answer({...defaultWorkspacePreferences(),startup:'my-day'});};const mounted=mountPreferences();
  try{await settle();await settle();assert.equal(calls.filter(call=>call.method==='PATCH').length,1);assert.equal((calls[1].headers as Record<string,string>)['If-None-Match'],'*');assert.equal(mounted.result.preferences.startup,competing?'my-day':'production');assert.equal(mounted.result.startupReady,true);}finally{act(()=>mounted.renderer.unmount());}
 }
});

test('tenant switch ignores old reads and rejects retained callbacks before any new write',async()=>{
 environment();const old=deferred<Response>(),calls:string[]=[];globalThis.fetch=async(_,init)=>{const scope=(init!.headers as Record<string,string>)['X-Scale-Preference-Scope'];calls.push(`${init!.method}:${scope}`);return scope==='1:1'?old.promise:answer({...defaultWorkspacePreferences(),startup:'production'},true,'1','2');};const mounted=mountPreferences(),staleUpdate=mounted.result.update;
 try{act(()=>mounted.renderer.update(<mounted.Probe org="2"/>));await settle();assert.equal(mounted.result.preferences.startup,'production');act(()=>staleUpdate({startup:'my-day'}));old.resolve(answer({...defaultWorkspacePreferences(),startup:'my-day'}));await settle();assert.equal(mounted.result.preferences.startup,'production');assert.deepEqual(calls,['GET:1:1','GET:1:2']);}finally{act(()=>mounted.renderer.unmount());}
});

test('startup does not redirect late after pointer or keyboard interaction',()=>{
 for(const event of ['pointerdown','keydown']){
  const env=environment(),destinations:string[]=[];const Probe=({ready}:{ready:boolean})=>{useStartupPreference({scope:'1:1',ready,enabled:true,pathname:'/',role:'owner',startup:'production',replace:path=>destinations.push(path)});return null;};let renderer!:ReactTestRenderer;act(()=>{renderer=create(<Probe ready={false}/>);});env.events.dispatchEvent(new Event(event));act(()=>renderer.update(<Probe ready/>));assert.deepEqual(destinations,[]);act(()=>renderer.unmount());
 }
});

test('preference transport aborts a stalled GET after a finite timeout',async context=>{
 const {workspacePreferenceRequest}=await import('../app/use-workspace-preferences');context.mock.timers.enable({apis:['setTimeout']});const previous=globalThis.fetch;
 globalThis.fetch=async(_,init)=>new Promise((_,reject)=>{init!.signal!.addEventListener('abort',()=>reject(Error('aborted')));});
 try{const request=workspacePreferenceRequest('1','1');const rejected=assert.rejects(request,/aborted/);context.mock.timers.tick(5000);await rejected;}finally{globalThis.fetch=previous;context.mock.timers.reset();}
});

test('a request surviving unmount completes before the next mounted editor saves its latest choice',async()=>{
 environment();const first=deferred<Response>();const patches:ReturnType<typeof defaultWorkspacePreferences>[]=[];
 globalThis.fetch=async(_,init)=>{if(init!.method==='GET')return answer();patches.push(JSON.parse(String(init!.body)));return patches.length===1?first.promise:answer(patches.at(-1)!);};let mounted=mountPreferences();
 try{await settle();act(()=>mounted.result.update({startup:'production'}));act(()=>mounted.renderer.unmount());mounted=mountPreferences();await settle();act(()=>mounted.result.update({startup:'my-day'}));assert.equal(patches.length,1);first.resolve(answer(patches[0]));await settle();await settle();assert.equal(patches.length,2);assert.equal(patches[1].startup,'my-day');assert.equal(mounted.result.preferences.startup,'my-day');assert.equal(mounted.result.saving,false);}finally{act(()=>mounted.renderer.unmount());}
});

test('fresh defaults and modern clean caches never produce an automatic PATCH',async()=>{
 for(const cache of [null,JSON.stringify({...defaultWorkspacePreferences(),pendingSync:false})]){
  const env=environment();if(cache)env.storage.set(workspacePreferenceKey('1','1'),cache);const methods:string[]=[];globalThis.fetch=async(_,init)=>{methods.push(init!.method!);return answer(defaultWorkspacePreferences(),false);};const mounted=mountPreferences();try{await settle();assert.deepEqual(methods,['GET']);}finally{act(()=>mounted.renderer.unmount());}
 }
});

test('preferences expose retry and remove duplicate read-only filter chips',()=>{
 Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
 const {PreferenciasSection}=require('../app/sections/preferencias') as typeof import('../app/sections/preferencias');
 const {StateChip}=require('../app/ui-v2') as typeof import('../app/ui-v2');let retries=0;let renderer!:ReactTestRenderer;
 act(()=>{renderer=create(<PreferenciasSection user={null} preferencesReady preferences={defaultWorkspacePreferences()} preferenceWarning="Sin conexión" retryPreferences={()=>{retries++;}} preferencesSaving={false} updatePreferences={()=>{}}/>);});
 try{assert.equal(renderer.root.findAllByType(StateChip).length,0);const retry=renderer.root.findAllByType('button').find(node=>node.children.join('')==='Reintentar sincronización');assert.ok(retry);act(()=>retry!.props.onClick());assert.equal(retries,1);assert.match(JSON.stringify(renderer.toJSON()),/se guarda en tu cuenta por usuario y empresa/);assert.doesNotMatch(JSON.stringify(renderer.toJSON()),/no se sincroniza entre dispositivos/);}finally{act(()=>renderer.unmount());}
});

test('GET failure keeps cached controls usable, resolves startup fallback and exposes a working retry',async()=>{
 const env=environment();env.storage.set(workspacePreferenceKey('1','1'),JSON.stringify({...defaultWorkspacePreferences(),startup:'production',pendingSync:false}));globalThis.fetch=async()=>new Response(JSON.stringify({error:'Offline'}),{status:503});const mounted=mountPreferences();
 try{await settle();assert.equal(mounted.result.ready,true);assert.equal(mounted.result.startupReady,true);assert.equal(mounted.result.preferences.startup,'production');assert.match(mounted.result.warning,/No se pudieron cargar/);globalThis.fetch=async()=>answer({...defaultWorkspacePreferences(),startup:'my-day'});act(()=>mounted.result.retry());await settle();assert.equal(mounted.result.preferences.startup,'my-day');assert.equal(mounted.result.warning,'');}finally{act(()=>mounted.renderer.unmount());}
});

test('transport rejects preferences returned for another authenticated scope',async()=>{
 const {workspacePreferenceRequest}=await import('../app/use-workspace-preferences');const previous=globalThis.fetch;globalThis.fetch=async()=>answer(defaultWorkspacePreferences(),true,'2','9');try{await assert.rejects(workspacePreferenceRequest('1','1'),/La sesión cambió/);}finally{globalThis.fetch=previous;}
});
