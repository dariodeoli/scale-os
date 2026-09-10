import React from 'react';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const {BoardPresence,ProjectCardPresence,ProjectPresence,PresenceTracker,PresenceAvatars}=require('../app/presence') as typeof import('../app/presence');

async function main(){
 const saved={fetch:globalThis.fetch,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,now:Date.now};
 const descriptors=Object.fromEntries(['document','window','crypto'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 let now=100000,visibility='visible',nextTimer=0;
 const intervals=new Map<number,()=>void>(),timeouts=new Map<number,()=>void>();
 const docListeners=new Map<string,Set<()=>void>>(),winListeners=new Map<string,Set<()=>void>>();
 const add=(map:Map<string,Set<()=>void>>,name:string,fn:()=>void)=>{if(!map.has(name))map.set(name,new Set());map.get(name)!.add(fn);};
 const remove=(map:Map<string,Set<()=>void>>,name:string,fn:()=>void)=>{map.get(name)?.delete(fn);};
 const fire=(map:Map<string,Set<()=>void>>,name:string)=>map.get(name)?.forEach(fn=>fn());
 const reads:{url:string;signal?:AbortSignal|null}[]=[],beats:{project_id:string|null;active:boolean;visible:boolean}[]=[];
 let mode='success',viewEvents=0;
 type Pending={url:string;resolve:(value:Response)=>void;signal?:AbortSignal|null};const pending:Pending[]=[];
 const people=[{id:'a',project_id:'1',name:'Ana Pérez',photo_url:'https://example.invalid/ana.png',active:false},{id:'b',project_id:'1',name:'Bruno Díaz',photo_url:null,active:true},{id:'c',project_id:'2',name:'Carla',active:false}];
 const response=(rows=people,status=200)=>({ok:status===200,json:async()=>({people:rows})} as Response);
 Date.now=()=>now;
 globalThis.setInterval=((fn:()=>void,ms:number)=>{assert.equal(ms,30000);intervals.set(++nextTimer,fn);return nextTimer;}) as unknown as typeof setInterval;
 globalThis.clearInterval=((id:number)=>{intervals.delete(id);}) as unknown as typeof clearInterval;
 globalThis.setTimeout=((fn:()=>void)=>{timeouts.set(++nextTimer,fn);return nextTimer;}) as unknown as typeof setTimeout;
 globalThis.clearTimeout=((id:number)=>{timeouts.delete(id);}) as unknown as typeof clearTimeout;
 Object.defineProperty(globalThis,'document',{configurable:true,value:{get visibilityState(){return visibility;},addEventListener:(name:string,fn:()=>void)=>add(docListeners,name,fn),removeEventListener:(name:string,fn:()=>void)=>remove(docListeners,name,fn)}});
 Object.defineProperty(globalThis,'window',{configurable:true,value:{setInterval:globalThis.setInterval,addEventListener:(name:string,fn:()=>void)=>add(winListeners,name,fn),removeEventListener:(name:string,fn:()=>void)=>remove(winListeners,name,fn),dispatchEvent:(event:Event)=>{if(event.type==='scale:project-view')viewEvents++;fire(winListeners,event.type);return true;}}});
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:{randomUUID}});
 globalThis.fetch=async(path,init)=>{
  const url=String(path);assert.equal(init?.cache,'no-store');assert.equal(init?.credentials,'include');
  if(init?.method==='POST'){assert(url.endsWith('/heartbeat'));beats.push(JSON.parse(String(init.body)));return response([]);}
  reads.push({url,signal:init?.signal});
  if(mode==='pending')return new Promise(resolve=>pending.push({url,resolve,signal:init?.signal}));
  if(mode==='error')return response([],503);
  if(mode==='empty')return response([]);
  if(url.includes('/project?'))return response(people.filter(p=>p.project_id===new URL(url,'https://test').searchParams.get('projectId')));
  return response();
 };
 let renderer:ReactTestRenderer|undefined;
 const render=async(tree:React.ReactElement)=>{await act(async()=>{if(renderer)renderer.update(tree);else renderer=create(tree);});};
 const unmount=async()=>{await act(async()=>{renderer?.unmount();renderer=undefined;});};
 const tick=async()=>{now+=30000;await act(async()=>{intervals.forEach(fn=>fn());});};
 const text=()=>JSON.stringify(renderer?.toJSON());
 const board=(ids=['2','1','1'],count=30)=><BoardPresence projectIds={ids}>{Array.from({length:count},(_,i)=><ProjectCardPresence key={i} projectId={String(i%3+1)}/>)}</BoardPresence>;
 const failures:string[]=[];
 async function check(name:string,test:()=>Promise<void>){try{await test();console.log('PASS: '+name);}catch(error){failures.push(name+': '+String(error));}finally{await unmount();mode='success';visibility='visible';pending.splice(0);}}
 try{
  await check('one batch poll per board; cards never register project views',async()=>{
   const before=reads.length;await render(board());assert.equal(reads.length,before+1);assert(reads.at(-1)!.url.endsWith('projects?ids=1%2C2'));
   assert.equal(intervals.size,1);assert.equal(beats.length,0);assert.equal(viewEvents,0);
   assert.equal(renderer!.root.findAllByProps({className:'card-presence'}).length,20,'third project has no presence');
   await render(board(['1','2']));assert.equal(reads.length,before+1,'order/duplicate changes do not restart polling');
   await tick();assert.equal(reads.length,before+2,'30 cards add only one poll');
   mode='empty';await tick();assert.equal(renderer!.root.findAllByProps({className:'card-presence'}).length,0,'empty response is not synthetic activity');
   assert.equal(beats.length,0);assert.equal(viewEvents,0);
  });
  await check('visibility changes do not multiply polling; hidden boards do not poll',async()=>{
   const before=reads.length;await render(board());assert.equal(reads.length,before+1);
   for(let i=0;i<4;i++){visibility='hidden';await act(async()=>{fire(docListeners,'visibilitychange');});visibility='visible';await act(async()=>{fire(docListeners,'visibilitychange');});}
   assert.equal(reads.length,before+1,'returning within 30s does not send another request');
   visibility='hidden';await tick();assert.equal(reads.length,before+1);
   visibility='visible';await act(async()=>{fire(docListeners,'visibilitychange');});assert.equal(reads.length,before+2);
  });
  await check('batch cap, empty board and failed polling remove avatars',async()=>{
   const before=reads.length;await render(board([]));assert.equal(reads.length,before);assert.equal(intervals.size,0);
   await render(board(Array.from({length:150},(_,i)=>String(i+1))));assert.equal(new URL(reads.at(-1)!.url,'https://test').searchParams.get('ids')!.split(',').length,100);
   mode='error';await tick();assert.equal(renderer!.root.findAllByProps({className:'card-presence'}).length,0);
  });
  await check('pending batch never overlaps; filter changes cancel and ignore late data',async()=>{
   mode='pending';await render(board());const old=pending[0],before=reads.length;
   await tick();assert.equal(reads.length,before);
   await render(board(['2']));assert(old.signal?.aborted,'old batch request aborted');
   await act(async()=>old.resolve(response()));assert(!text().includes('Ana Pérez'));
   const latest=pending[1];await unmount();assert(latest.signal?.aborted,'unmount aborts pending batch');
   await act(async()=>latest.resolve(response()));
  });
  await check('avatars: failed/missing photos, changed URL, overflow and active flags',async()=>{
   await render(<PresenceAvatars people={people}/>);
   const images=()=>renderer!.root.findAllByType('img');assert.equal(images().length,1);
   assert.equal(images()[0].props.alt,'');await act(async()=>images()[0].props.onError());assert.equal(images().length,0);assert(text().includes('AP'));assert(text().includes('BD'));
   assert.equal(renderer!.root.findAllByType('i').filter(icon=>icon.props['data-active']).length,1,'only explicit true renders an active dot');
   await render(<PresenceAvatars people={[{...people[0],photo_url:'https://example.invalid/new.png'}]}/>);assert.equal(images().length,1);
   await render(<PresenceAvatars people={Array.from({length:6},(_,i)=>({id:String(i),name:'Persona '+i}))}/>);assert.equal(renderer!.root.findAllByProps({className:'presence-person'}).length,4);assert(text().includes('+'));assert.equal(renderer!.root.findByProps({className:'presence-more'}).props.title,'Persona 4, Persona 5');
   assert(renderer!.root.findAllByType('i').every(icon=>icon.props['data-active']===false));
   await render(<PresenceAvatars people={[{id:'empty',name:'   ',photo_url:null}]}/>);assert(text().includes('?'),'blank name still has a visible fallback');
  });
  await check('mounting tracker/board is not activity or a project view',async()=>{
   const before=beats.length,eventsBefore=viewEvents;
   await render(<><PresenceTracker/>{board()}</>);
   assert.equal(beats.length,before+1);assert.equal(beats.at(-1)!.project_id,null);assert.equal(beats.at(-1)!.active,false,'initial mount is not user interaction');assert.equal(viewEvents,eventsBefore);
   await act(async()=>{fire(winListeners,'pointerdown');});await tick();assert.equal(beats.at(-1)!.active,true);assert.equal(beats.at(-1)!.project_id,null,'interacting with a board does not mean viewing every card');
   await tick();assert.equal(beats.at(-1)!.active,false,'activity expires after 60s without input');
  });
  await check('only actual project detail registers a view; switch clears old avatars',async()=>{
   const before=viewEvents;await render(<ProjectPresence projectId="1"/>);assert.equal(viewEvents,before+1);assert(text().includes('Ana Pérez'));
   mode='pending';await render(<ProjectPresence projectId="2"/>);assert(!text().includes('Ana Pérez'),'previous project people removed while next request pending');
   const call=pending[0];await unmount();await act(async()=>call.resolve(response()));
   const beatStart=beats.length;await render(<PresenceTracker/>);assert.equal(beats[beatStart].project_id,null,'detail unmount clears project view registration');
  });
  assert.equal(intervals.size,0);assert.equal(timeouts.size,0);
  assert.equal(Array.from(docListeners.values()).reduce((n,set)=>n+set.size,0),0);
  assert.equal(Array.from(winListeners.values()).reduce((n,set)=>n+set.size,0),0);
 }finally{
  await unmount();Object.assign(globalThis,{fetch:saved.fetch,setInterval:saved.setInterval,clearInterval:saved.clearInterval,setTimeout:saved.setTimeout,clearTimeout:saved.clearTimeout});Date.now=saved.now;
  for(const key of ['document','window','crypto']){const descriptor=descriptors[key];if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}
 }
 assert.deepEqual(failures,[]);
 console.log('PASS: local project presence QA complete; no browser or real API requests');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
