import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import PendingAccess from '../app/acceso-pendiente/page';

async function run(){
 const reactDescriptor=Object.getOwnPropertyDescriptor(globalThis,'React');
 Object.defineProperty(globalThis,'React',{configurable:true,value:React});
 const original={fetch:globalThis.fetch,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,document:Object.getOwnPropertyDescriptor(globalThis,'document'),window:Object.getOwnPropertyDescriptor(globalThis,'window')};
 let visibility='visible',nextId=0;const timers=new Map<number,()=>void>(),deadlines=new Map<number,()=>void>(),listeners=new Set<()=>void>(),redirects:string[]=[];
 const requests:{url:string;init?:RequestInit;resolve:(r:Response)=>void}[]=[];
 Object.defineProperty(globalThis,'document',{configurable:true,value:{get visibilityState(){return visibility;},addEventListener(_event:string,fn:()=>void){listeners.add(fn);},removeEventListener(_event:string,fn:()=>void){listeners.delete(fn);}}});
 Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{assign:(url:string)=>redirects.push(url)}}});
 globalThis.setInterval=((fn:()=>void,ms:number)=>{assert.equal(ms,15000);timers.set(++nextId,fn);return nextId;}) as unknown as typeof setInterval;
 globalThis.clearInterval=((id:number)=>{timers.delete(id);}) as unknown as typeof clearInterval;
 globalThis.setTimeout=((fn:()=>void,ms:number)=>{if(ms!==10000)return original.setTimeout(fn,ms);deadlines.set(++nextId,fn);return nextId;}) as unknown as typeof setTimeout;
 globalThis.clearTimeout=((id:number)=>{if(deadlines.has(id))deadlines.delete(id);else original.clearTimeout(id);}) as unknown as typeof clearTimeout;
 globalThis.fetch=((url:string,init?:RequestInit)=>new Promise<Response>(resolve=>requests.push({url,init,resolve}))) as typeof fetch;
 let renderer:ReactTestRenderer|undefined;
 const text=()=>JSON.stringify(renderer!.toJSON());
 const tick=async()=>{await act(async()=>{timers.forEach(fn=>fn());});};
 const respond=async(index:number,data:unknown,status=200)=>{await act(async()=>requests[index].resolve(new Response(JSON.stringify(data),{status})));};
 const state=(status:string)=>({organization_name:'Equipo de prueba',email:'ana@example.invalid',role:'viewer',status});
 try{
  await act(async()=>{renderer=create(<PendingAccess/>);});
  assert.equal(requests.length,1);assert.equal(requests[0].url,'/core-api/api/invitations/status');
  await tick();await tick();assert.equal(requests.length,1,'a slow check must not overlap');
  await respond(0,state('pending'));assert(text().includes('Acceso pendiente de aprobación'));assert(!text().includes('Entrar a Scale OS'));
  visibility='hidden';await tick();assert.equal(requests.length,1);
  visibility='visible';await act(async()=>listeners.forEach(fn=>fn()));assert.equal(requests.length,2,'check promptly on returning to the tab');
  await respond(1,state('approved'));assert(text().includes('Entrar a Scale OS'));assert(text().includes('Solo lectura'));
  assert.equal(renderer!.root.findByProps({role:'status'}).props['aria-live'],'polite');
  await tick();await respond(2,{error:'La sesión venció'},401);assert(!text().includes('Entrar a Scale OS'),'a failed session check clears stale approval');assert(text().includes('La sesión venció'));
  await tick();await respond(3,state('rejected'));assert(text().includes('Acceso no habilitado'));assert(!text().includes('Entrar a Scale OS'));
  await tick();await respond(4,state('unavailable'));assert(text().includes('Acceso no habilitado'));
  await tick();const pending=requests.at(-1)!;await act(async()=>renderer!.unmount());renderer=undefined;
  assert.equal(pending.init?.signal?.aborted,true);assert.equal(timers.size,0);assert.equal(listeners.size,0);assert.equal(deadlines.size,0);
  await respond(requests.length-1,state('approved'));
  await act(async()=>{renderer=create(<PendingAccess/>);});await respond(requests.length-1,state('pending'));
  await tick();const stalled=requests.at(-1)!;
  await act(async()=>{[...deadlines.values()].forEach(fn=>fn());});
  assert.equal(stalled.init?.signal?.aborted,true);assert(text().includes('tardó demasiado'));
  await tick();await respond(requests.length-1,state('pending'));
  await act(async()=>stalled.resolve(new Response(JSON.stringify(state('approved')))));
  assert(!text().includes('Entrar a Scale OS'),'timed-out late approval is ignored');
  const logout=()=>renderer!.root.findAllByType('button')[0];
  await act(async()=>{void logout().props.onClick();});assert.equal(logout().props.disabled,true);
  const failed=requests.length-1;assert.equal(requests[failed].url,'/core-api/api/auth/logout');
  await respond(failed,{error:'Sin conexión'},503);assert.equal(redirects.length,0);assert(text().includes('No se pudo cerrar sesión'));assert.equal(logout().props.disabled,false);
  await act(async()=>{void logout().props.onClick();});const stalledLogout=requests.at(-1)!;
  await act(async()=>{[...deadlines.values()].forEach(fn=>fn());});assert.equal(stalledLogout.init?.signal?.aborted,true);assert.equal(logout().props.disabled,false);assert.equal(redirects.length,0);
  await act(async()=>{void logout().props.onClick();});await respond(requests.length-1,{ok:true});assert.deepEqual(redirects,['/']);
  assert(requests.every(r=>['/core-api/api/invitations/status','/core-api/api/auth/logout'].includes(r.url)),'pending screen never requests private agency data');
 }finally{
  if(renderer)await act(async()=>renderer!.unmount());
  Object.assign(globalThis,{fetch:original.fetch,setInterval:original.setInterval,clearInterval:original.clearInterval,setTimeout:original.setTimeout,clearTimeout:original.clearTimeout});
  for(const key of ['document','window'] as const){const descriptor=original[key];if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}
  if(reactDescriptor)Object.defineProperty(globalThis,'React',reactDescriptor);else Reflect.deleteProperty(globalThis,'React');
 }
 console.log('PASS: pending access polling, hidden tab, status transitions, stale approval removal, cleanup and logout failure/retry');
}
void run().catch(e=>{console.error(e);process.exitCode=1;});
