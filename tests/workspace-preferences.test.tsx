import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {defaultWorkspacePreferences,parseWorkspacePreferences,startupChoices,startupDestination,workspacePreferenceKey} from '../app/workspace-preferences';
import {useStartupPreference,useWorkspacePreferences} from '../app/use-workspace-preferences';

const origin='https://workspace.invalid';
function environment(href=origin+'/') {
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
 for(const role of ['owner','admin','management','finance','sales','production','editor','viewer'])assert.equal(startupChoices(role).length,3);
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
 const home=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
 assert(home.includes('startupDataScope===preferenceScope'));
 assert(home.includes('enabled:operationalAccess'));
 assert(home.includes('preferencesReady&&!loading'));
 assert.equal((home.match(/load\(data.user\)/g)||[]).length,2,'bootstrap and password login capture authenticated identity');
 assert(home.includes('setStartupDataScope(loadedScope)'));
 assert(!/setDetail\(null\);setProductionClientId/.test(home),'path changes no longer reset saved filters');
 const logout=home.slice(home.indexOf('async function logout()'),home.indexOf('async function onDragEnd'));
 assert(!logout.includes('updatePreferences'));assert(logout.includes('clearSessionState()'));
 const cleanup=home.slice(home.indexOf('function clearSessionState()'),home.indexOf('async function logout()'));
 assert(cleanup.includes("setStartupDataScope('')"));assert(!cleanup.includes('updatePreferences'));
 assert(home.includes('preferencesDialogScope===preferenceScope'));
 assert(home.includes('productionFiltersDialogScope===preferenceScope'));
 assert(home.includes('filterProductionOrders(orders, projects, selectedProductionClient,{...preferences.production'));
 assert(home.includes('userId:String(user?.id||\'\'),today:productionToday'));
 assert(home.includes('key={productionView} initialView={productionView} orders={orders}'),'saved board filters do not reinterpret explicit planner views');
 assert(home.includes('label="Al entrar a Scale OS"'));
 assert(home.includes('Vencen esta semana (hora local)'));
 assert(home.includes('production:defaultWorkspacePreferences().production'));
});
