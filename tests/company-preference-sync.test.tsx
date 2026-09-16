import React from 'react';
import assert from 'node:assert/strict';
import {test,type TestContext} from 'node:test';
import {act,create,type ReactTestRenderer,type ReactTestInstance} from 'react-test-renderer';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
// Mount both production components and their real api/dataFetch path. Only the
// dialog shell and network/browser environment are doubles; no copied loaders.
const dialogId=require.resolve('../app/dialog');
require.cache[dialogId]={id:dialogId,filename:dialogId,loaded:true,exports:{
 Dialog:({children}:{children:React.ReactNode})=><section>{children}</section>,
}} as NodeModule;
const {CompanySelector}=require('../app/operations') as typeof import('../app/operations');
const {CompanySettings}=require('../app/company-settings') as typeof import('../app/company-settings');
const eventName='scale:default-company-changed';
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');

async function harness(t:TestContext){
 let stored=1,delayReads=false,failWrite=false;
 const reads:{resolve:()=>void;reject:()=>void}[]=[],writes:number[]=[],requests:string[]=[];
 const events=new EventTarget();
 let emitted=0;
 events.addEventListener(eventName,()=>{emitted++;});
 Object.assign(globalThis,{window:events,sessionStorage:{getItem:()=> '1',setItem:()=>{}}});
 t.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  const path=String(input);requests.push(path);
  if(path==='/core-api/api/auth/default-organization'){
   assert.equal(init?.method,'POST');
   const id=Number(JSON.parse(String(init?.body)).organizationId);writes.push(id);
   if(failWrite)return new Response(JSON.stringify({error:'No se pudo guardar'}),{status:403});
   assert([1,2].includes(id),'demo never becomes the default');stored=id;
   return Response.json({defaultOrganizationId:stored});
  }
  assert.equal(path,'/core-api/api/auth/organizations','preference never switches tenant or loads private company data');
  assert.equal(init?.method,'GET');
  // Snapshot at request start to reproduce an older response arriving last.
  const snapshot={organizations:[{id:1,name:'Agencia A',role:'owner'},{id:2,name:'Agencia B',role:'viewer'},{id:3,name:'Demo',role:'owner',isDemo:true}],currentOrganizationId:1,defaultOrganizationId:stored};
  if(delayReads)return new Promise<Response>((resolve,reject)=>reads.push({resolve:()=>resolve(Response.json(snapshot)),reject:()=>reject(Error('obsolete GET failure'))}));
  return Response.json(snapshot);
 });
 let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<><CompanySelector name="Agencia A"/><CompanySettings/></>);});
 await act(async()=>{renderer.root.findByProps({className:'workspace'}).props.onClick();});
 const settingsRows=()=>renderer.root.findAllByType('article');
 const selectorRows=()=>renderer.root.findAllByProps({className:'company-choice-row'});
 const preference=(row:ReactTestInstance)=>row.findAllByType('button').find(b=>/Predeterminada|Usar al iniciar/.test(text(b)))!;
 const settingsButton=(id:number)=>preference(settingsRows()[id-1]);
 const selectorButton=(id:number)=>preference(selectorRows()[id-1]);
  const assertPreferred=(id:number)=>{
   for(const [index,row] of Array.from(settingsRows().entries())){
    const button=preference(row);
    assert.equal(button.props['aria-pressed'],index+1===id);
    assert.equal(button.props.disabled,false,'the default star stays clickable while aria-pressed carries its state');
   }
   for(const [index,row] of Array.from(selectorRows().entries())){
    const button=preference(row);
    assert.equal(text(button),index+1===id?'Predeterminada':'Usar al iniciar sesión');
    assert.equal(button.props.disabled,index+1===id);
   }
   assert.match(text(settingsRows()[0]),/Empresa abierta/,'default changes do not switch the active tenant');
  };
 let unmounted=false;
 const unmount=async()=>{if(!unmounted){await act(async()=>renderer.unmount());unmounted=true;}};
 t.after(unmount);
 return {renderer,reads,writes,requests,events,assertPreferred,settingsButton,selectorButton,unmount,
  get stored(){return stored;},get emitted(){return emitted;},
  set delayReads(value:boolean){delayReads=value;},set failWrite(value:boolean){failWrite=value;}};
}

test('both real controls synchronize Settings → Selector → Settings using persisted GET results',async t=>{
 const h=await harness(t);h.assertPreferred(1);assert.equal(h.requests.length,2);
 assert.doesNotMatch(JSON.stringify(h.renderer.toJSON()),/Demo/,'the isolated demo never appears in real-company controls');
 await act(async()=>{h.settingsButton(2).props.onClick();});
 assert.equal(h.stored,2);h.assertPreferred(2);assert.equal(h.requests.length,5);
 await act(async()=>{await h.selectorButton(1).props.onClick();});
 assert.equal(h.stored,1);h.assertPreferred(1);assert.equal(h.requests.length,8);
 assert.deepEqual(h.writes,[2,1]);assert.equal(h.emitted,2);
});

test('failed preference writes in either control preserve both defaults without a refresh event',async t=>{
 const h=await harness(t);h.failWrite=true;
 for(const button of [h.settingsButton,h.selectorButton]){
  await act(async()=>{button(2).props.onClick();});
  h.assertPreferred(1);assert.equal(h.stored,1);assert.equal(h.emitted,0);
 }
 assert.equal(h.requests.length,4,'only initial GETs and rejected POSTs');
});

for(const oldFailure of [false,true])test(`obsolete ${oldFailure?'failed':'successful'} GETs cannot overwrite synchronized preference`,async t=>{
 const h=await harness(t);h.delayReads=true;
 await act(async()=>{h.events.dispatchEvent(new Event(eventName));});
 assert.equal(h.reads.length,2);const stale=h.reads.splice(0);
 await act(async()=>{h.settingsButton(2).props.onClick();});
 assert.equal(h.stored,2);assert.equal(h.reads.length,2);
 await act(async()=>{h.reads.splice(0).forEach(read=>read.resolve());});
 h.assertPreferred(2);
 await act(async()=>{stale.forEach(read=>oldFailure?read.reject():read.resolve());});
 h.assertPreferred(2);assert(!JSON.stringify(h.renderer.toJSON()).includes('obsolete GET failure'));
});

test('unmount removes both event listeners and ignores outstanding reads',async t=>{
 const h=await harness(t);h.delayReads=true;
 await act(async()=>{h.events.dispatchEvent(new Event(eventName));});
 assert.equal(h.reads.length,2);const requestCount=h.requests.length;
 await h.unmount();
 await act(async()=>{h.reads.splice(0).forEach(read=>read.resolve());h.events.dispatchEvent(new Event(eventName));});
 assert.equal(h.requests.length,requestCount);assert.equal(h.renderer.toJSON(),null);
});
