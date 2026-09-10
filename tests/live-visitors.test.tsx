import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
const {LiveVisitors}=require('../app/live-visitors') as typeof import('../app/live-visitors');

async function run(){
 const original={fetch:globalThis.fetch,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval,now:Date.now};
 let now=100000,visibility='visible',calls=0,mode='success';
 const listeners=new Set<()=>void>(),intervals=new Map<number,()=>void>();let timerId=0;
 const pending:{resolve:(value:Response)=>void;signal:AbortSignal}[]=[];
 Date.now=()=>now;
 Object.defineProperty(globalThis,'document',{configurable:true,value:{get visibilityState(){return visibility;},addEventListener(_name:string,fn:()=>void){listeners.add(fn);},removeEventListener(_name:string,fn:()=>void){listeners.delete(fn);}}});
 globalThis.setInterval=((fn:()=>void,ms:number)=>{assert.equal(ms,30000);intervals.set(++timerId,fn);return timerId;}) as unknown as typeof setInterval;
 globalThis.clearInterval=((id:number)=>{intervals.delete(id);}) as unknown as typeof clearInterval;
 const data=(org='1',active=2)=>({organization_id:org,estimated:true,synthetic:false,window_seconds:90,refresh_seconds:30,sites:[{site:'scale-os-landing',label:'Landing de Scale OS',active}]});
 const response=(value:unknown,status=200)=>({ok:status===200,status,json:async()=>value} as Response);
 globalThis.fetch=async(url,init)=>{
  calls++;assert.equal(url,'/core-api/api/agency/live-visitors');assert.equal(init?.cache,'no-store');assert.equal(init?.credentials,'include');
  if(mode==='pending')return new Promise(resolve=>pending.push({resolve,signal:init?.signal as AbortSignal}));
  if(mode==='error')return response({},503);
  if(mode==='wrong-tenant')return response(data('2'));
  if(mode==='synthetic')return response({...data(),synthetic:true});
  if(mode==='empty')return response({...data(),sites:[]});
  return response(data());
 };
 let renderer:ReactTestRenderer;
 const render=async(role='owner',organizationId='1',demo=false)=>{await act(async()=>{const tree=<LiveVisitors role={role} organizationId={organizationId} demo={demo}/>;if(renderer)renderer.update(tree);else renderer=create(tree);});};
 const text=()=>JSON.stringify(renderer!.toJSON());
 const tick=async()=>{now+=30000;await act(async()=>{intervals.forEach(fn=>fn());});};
 try{
  await render('viewer');assert.equal(renderer!.toJSON(),null);assert.equal(calls,0);
  await render('owner','demo',true);assert(text().includes('Ejemplo ficticio'));assert(text().includes('No consulta ni modifica'));assert.equal(calls,0);assert.equal(intervals.size,0);
  await render();assert.equal(calls,1);assert(text().includes('Landing de Scale OS'));assert.equal(intervals.size,1);
  await act(async()=>{listeners.forEach(fn=>fn());});assert.equal(calls,1,'visibility toggles cannot flood requests');
  visibility='hidden';await tick();assert.equal(calls,1);visibility='visible';await act(async()=>{listeners.forEach(fn=>fn());});assert.equal(calls,2);
  mode='error';await tick();assert(text().includes('temporalmente no disponible'));assert(!text().includes('Landing de Scale OS'),'stale values are removed on failure');
  mode='success';await tick();assert(text().includes('Landing de Scale OS'));
  mode='wrong-tenant';await tick();assert(text().includes('temporalmente no disponible'));assert(!text().includes('Landing de Scale OS'));
  mode='synthetic';await tick();assert(text().includes('temporalmente no disponible'),'real UI rejects demo payload');
  mode='empty';await tick();assert(text().includes('No hay sitios vinculados'));
  mode='pending';await tick();const before=calls;await tick();assert.equal(calls,before,'no overlapping polls');
  await render('owner','2');assert(pending[0].signal.aborted,'tenant change aborts old poll');assert(!text().includes('Landing de Scale OS'));
  await act(async()=>{pending[0].resolve(response(data('1',999)));});assert(!text().includes('999'),'late previous-tenant data cannot reappear');
  await render('viewer','2');assert.equal(renderer!.toJSON(),null);assert(pending[1].signal.aborted);assert.equal(intervals.size,0);assert.equal(listeners.size,0);
  await act(async()=>{pending[1].resolve(response(data('2')));});
  mode='success';await render('admin');assert(text().includes('Landing de Scale OS'));
  await act(async()=>{renderer.unmount();});assert.equal(intervals.size,0);assert.equal(listeners.size,0);
 }finally{
  globalThis.fetch=original.fetch;globalThis.setInterval=original.setInterval;globalThis.clearInterval=original.clearInterval;Date.now=original.now;
 }
 console.log('PASS: visitor UI roles, demo without requests, visible 30s polling, error/empty states, abort/unmount, tenant switch and late-response isolation');
}
void run().catch(error=>{console.error(error);process.exitCode=1;});
