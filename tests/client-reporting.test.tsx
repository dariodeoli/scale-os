import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import type {ClientReportingRecord} from '../app/client-reporting';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {ClientReporting}=require('../app/client-reporting') as typeof import('../app/client-reporting');
type Request={url:string;init:RequestInit;resolve:(response:Response)=>void};
const requests:Request[]=[];
globalThis.fetch=(input,init)=>new Promise<Response>(resolve=>requests.push({url:String(input),init:init||{},resolve}));
let renderer:ReactTestRenderer;
const latest=()=>requests[requests.length-1];
const rendered=()=>JSON.stringify(renderer.toJSON());
const record=(id='1',overrides:Partial<ClientReportingRecord>={}):ClientReportingRecord=>({clientId:id,customerKind:'unknown',servicePlanId:null,relationshipStartedOn:null,version:'9007199254740993',updatedAt:'2026-09-10T12:00:00Z',archived:false,...overrides});
const fixture=(id='1',overrides:Partial<ClientReportingRecord>={})=>({reporting:record(id,overrides),plans:[{id:'7',name:'Mensual'}]});
async function respond(request:Request,data:unknown,status=200){await act(async()=>{request.resolve(new Response(JSON.stringify(data),{status}));});}
function kind(value:string){act(()=>renderer.root.findAllByType('select')[0].props.onChange({target:{value}}));}
function plan(value:string){act(()=>renderer.root.findAllByType('select')[1].props.onChange({target:{value}}));}
function date(value:string){act(()=>renderer.root.findByProps({type:'date'}).props.onChange({target:{value}}));}
function save(){act(()=>{void renderer.root.findAllByType('button')[0].props.onClick();});}
async function run(){
 for(const role of ['viewer','editor','production','']){
  act(()=>{renderer=create(<ClientReporting id="1" role={role}/>);});assert.equal(renderer.toJSON(),null);act(()=>renderer.unmount());
 }
 for(const id of ['../2','0',Number.MAX_SAFE_INTEGER+1]){
  act(()=>{renderer=create(<ClientReporting id={id} role="owner"/>);});assert.match(rendered(),/Cliente inválido/);act(()=>renderer.unmount());
 }
 assert.equal(requests.length,0,'forbidden roles and invalid IDs do not fetch');
 for(const role of ['owner','admin','management','sales','finance']){
  act(()=>{renderer=create(<ClientReporting id="1" role={role}/>);});
  assert.equal(latest().url,'/core-api/api/agency/clients/1/reporting');
  assert.equal(latest().init.credentials,'include');
  await respond(latest(),fixture());
  assert.equal(renderer.root.findAllByType('select')[0].props.value,'unknown');
  assert.equal(renderer.root.findByProps({type:'date'}).props.value,'','unknown relationship date is never fabricated');
  assert.match(rendered(),/no reconstruyen automáticamente estados pasados/);
  if(role==='finance'){
   assert.equal(renderer.root.findAllByType('button').length,0);
   for(const control of [...renderer.root.findAllByType('select'),...renderer.root.findAllByType('input')])assert.equal(control.props.disabled,true);
  }else assert.equal(renderer.root.findByType('button').props.disabled,true,'explicit save requires a change');
  act(()=>renderer.unmount());
 }
 let saved=0;
 act(()=>{renderer=create(<ClientReporting id="1" role="sales" onSaved={()=>{saved++;}}/>);});
 await respond(latest(),fixture());
 kind('professional');plan('7');date('2020-02-29');
 const beforeSave=requests.length;save();save();
 assert.equal(requests.length,beforeSave+1,'rapid double save sends only one PATCH');
 assert.equal(latest().init.method,'PATCH');
 assert.deepEqual(JSON.parse(String(latest().init.body)),{expectedVersion:'9007199254740993',customerKind:'professional',servicePlanId:'7',relationshipStartedOn:'2020-02-29'});
 assert.equal(saved,0,'not saved until server acknowledges');
 await respond(latest(),fixture('1',{customerKind:'professional',servicePlanId:'7',relationshipStartedOn:'2020-02-29',version:'9007199254740994'}));
 assert.equal(saved,1);assert.match(rendered(),/Datos para reportes guardados/);
 assert.equal(renderer.root.findByType('button').props.disabled,true);
 plan('');date('');save();
 assert.deepEqual(JSON.parse(String(latest().init.body)),{expectedVersion:'9007199254740994',servicePlanId:null,relationshipStartedOn:null});
 await respond(latest(),fixture('1',{customerKind:'professional',version:'9007199254740995'}));
 for(const invalid of ['2020-02-30','9998-01-01','1899-12-31']){
  date(invalid);const before:number=requests.length;save();assert.equal(requests.length,before);assert.match(rendered(),/fecha real válida/);
 }
 date('');kind('company');save();
 await respond(latest(),{error:'El cliente cambió. Actualizá los datos antes de guardar.'},409);
 assert.equal(renderer.root.findAllByType('select')[0].props.value,'company','conflict preserves draft until explicit reload');
 assert.match(rendered(),/El cliente cambió/);assert.equal(saved,2,'409 never calls onSaved');
 act(()=>renderer.root.findAllByType('button')[1].props.onClick());
 await respond(latest(),fixture('1',{customerKind:'other',version:'9007199254740996',servicePlanId:'99'}));
 assert.equal(renderer.root.findAllByType('select')[0].props.value,'other');
 assert.match(rendered(),/no disponible/,'an unavailable saved plan remains visible without guessing a replacement');
 kind('company');save();
 assert.deepEqual(JSON.parse(String(latest().init.body)),{expectedVersion:'9007199254740996',customerKind:'company'},'unchanged inactive plan is not resubmitted');
 await respond(latest(),fixture('1',{customerKind:'company',servicePlanId:'99',version:'9007199254740997'}));
 act(()=>renderer.unmount());

 act(()=>{renderer=create(<ClientReporting id="1" role="owner"/>);});
 const oldClient=latest();act(()=>renderer.update(<ClientReporting id="2" role="owner"/>));
 const nextClient=latest();await respond(oldClient,fixture('1',{customerKind:'company'}));
 assert.equal(renderer.root.findAllByType('select').length,0,'late previous-client response ignored');
 await respond(nextClient,fixture('2',{archived:true}));
 assert.equal(renderer.root.findAllByType('button').length,0);assert.match(rendered(),/cliente está archivado/);
 act(()=>renderer.update(<ClientReporting key="org1" id="1" role="owner"/>));
 const oldTenant=latest();act(()=>renderer.update(<ClientReporting key="org2" id="1" role="owner"/>));
 const newTenant=latest();await respond(oldTenant,fixture('1',{customerKind:'company'}));
 assert.equal(renderer.root.findAllByType('select').length,0,'same client ID in another tenant is isolated with integration key');
 await respond(newTenant,{error:'Sin acceso'},403);assert.match(rendered(),/Sin acceso/);
 act(()=>renderer.root.findByType('button').props.onClick());
 await respond(latest(),fixture('9'));assert.match(rendered(),/No se pudo validar/,'unexpected client response is rejected');
 act(()=>renderer.root.findByType('button').props.onClick());await respond(latest(),fixture());
 kind('company');save();const lateSave=latest();const savedBefore=saved;
 act(()=>renderer.update(<ClientReporting id="1" role="viewer" onSaved={()=>{saved++;}}/>));
 await respond(lateSave,fixture('1',{customerKind:'company'}));
 assert.equal(renderer.toJSON(),null);assert.equal(saved,savedBefore);
 act(()=>renderer.unmount());

 act(()=>{renderer=create(<ClientReporting id="1" role="owner" onSaved={()=>{throw Error('refresh failed');}}/>);});
 await respond(latest(),fixture());kind('other');save();
 await respond(latest(),fixture('1',{customerKind:'other',version:'9007199254740994'}));
 assert.match(rendered(),/Los datos se guardaron, pero no se pudo actualizar/,'a refresh failure does not falsely deny the completed save');
 act(()=>renderer.unmount());
 console.log('PASS client reporting: role gating/no fetch, exact camelCase/version contract, explicit save/nulls, dates, duplicate-save prevention, conflict/reload, inactive plan preservation, archived/finance read-only, stale client/tenant responses, callback errors');
}
void run();
