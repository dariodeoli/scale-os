import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import type {ClientCommercialLifecycleRecord} from '../app/client-commercial-lifecycle';
const {SelectCustom}=require('../app/profile-controls') as typeof import('../app/profile-controls');

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {ClientCommercialLifecycle}=require('../app/client-commercial-lifecycle') as typeof import('../app/client-commercial-lifecycle');
type Request={url:string;init:RequestInit;resolve:(response:Response)=>void};
const requests:Request[]=[];
globalThis.fetch=(input,init)=>new Promise<Response>(resolve=>requests.push({url:String(input),init:init||{},resolve}));
let renderer:ReactTestRenderer;
const latest=()=>requests.at(-1)!;
const rendered=()=>JSON.stringify(renderer.toJSON());
const record=(id='1',overrides:Partial<ClientCommercialLifecycleRecord>={}):ClientCommercialLifecycleRecord=>({clientId:id,version:'9007199254740993',archived:false,amendments:[{id:'501',effectiveOn:'2026-09-01',activationDate:'2024-02-29',planName:'Contenido mensual',planVersionSnapshot:'v3.2',monthlyPrice:'1250000',currency:'PYG',discountType:'percent',discountValue:'10',discountTerms:'Por seis meses',extrasDeliverables:'Dos reels extra',createdAt:'2026-09-01T12:00:00Z'}],...overrides});
const fixture=(id='1',overrides:Partial<ClientCommercialLifecycleRecord>={})=>({commercial:record(id,overrides)});
async function respond(request:Request,data:unknown,status=200){await act(async()=>{request.resolve(new Response(JSON.stringify(data),{status}));});}
function inputs(){return renderer.root.findAllByType('input');}
function setInput(label:string,value:string){const input=inputs().find(item=>{let owner=item.parent;while(owner&&typeof owner.type==='function')owner=owner.parent;if(owner?.type==='span'){owner=owner.parent;while(owner&&typeof owner.type==='function')owner=owner.parent;}return owner?.props.children?.[0]===label;});assert(input,`missing ${label}`);act(()=>input!.props.onChange({target:{value}}));}
async function run(){
 for(const role of ['viewer','editor','production','management','sales','']){act(()=>{renderer=create(<ClientCommercialLifecycle id="1" role={role}/>);});assert.equal(renderer.toJSON(),null);act(()=>renderer.unmount());}
 for(const id of ['../2','0',Number.MAX_SAFE_INTEGER+1]){act(()=>{renderer=create(<ClientCommercialLifecycle id={id} role="owner"/>);});assert.match(rendered(),/Cliente inválido/);act(()=>renderer.unmount());}
 assert.equal(requests.length,0,'forbidden roles and invalid IDs do not fetch');
 act(()=>{renderer=create(<ClientCommercialLifecycle id="1" role="finance"/>);});assert.equal(latest().url,'/core-api/api/agency/clients/1/commercial-lifecycle');await respond(latest(),fixture());assert.match(rendered(),/Solo lectura/);assert.equal(renderer.root.findAllByType('button').length,0);act(()=>renderer.unmount());
 act(()=>{renderer=create(<ClientCommercialLifecycle id="1" role="owner"/>);});await respond(latest(),fixture());assert.match(rendered(),/Contenido mensual/);assert.match(rendered(),/Gs\./);act(()=>renderer.root.findByType('button').props.onClick());
 setInput('Vigente desde','2026-09-14');setInput('Cliente desde (opcional)','2024-02-29');setInput('Nombre del plan','Gestión comercial');setInput('Versión contratada','v4.0');setInput('Precio mensual contratado','2000');
 const selects=renderer.root.findAllByType(SelectCustom);act(()=>selects[0].props.onChange('USD'));act(()=>selects[1].props.onChange('percent'));setInput('Valor del descuento','15');
 const before=requests.length;await act(async()=>{renderer.root.findAllByType('form')[0].props.onSubmit({preventDefault(){}});});assert.equal(requests.length,before+1,'one immutable amendment POST is issued');assert.equal(latest().init.method,'POST');assert.deepEqual(JSON.parse(String(latest().init.body)),{expectedVersion:'9007199254740993',effectiveOn:'2026-09-14',activationDate:'2024-02-29',planName:'Gestión comercial',planVersionSnapshot:'v4.0',monthlyPrice:'2000',currency:'USD',discountType:'percent',discountValue:'15',discountTerms:null,extrasDeliverables:null});
 await respond(latest(),fixture('1',{version:'9007199254740994',amendments:[...record().amendments,{...record().amendments[0],id:'502',planName:'Gestión comercial',planVersionSnapshot:'v4.0',monthlyPrice:'2000',currency:'USD'}]}));assert.match(rendered(),/El historial previo no se modifica/);assert.equal(renderer.root.findAllByType('form').length,0);
 act(()=>renderer.root.findByType('button').props.onClick());setInput('Nombre del plan','Borrador conservado');setInput('Versión contratada','v5.0');setInput('Precio mensual contratado','3000');const form=renderer.root.findAllByType('form')[0];await act(async()=>{form.props.onSubmit({preventDefault(){}});});await respond(latest(),{error:'El cliente cambió. Actualizá los datos antes de guardar.'},409);assert.match(rendered(),/El cliente cambió/);assert.equal(inputs().find(item=>item.parent?.props.children?.[0]==='Nombre del plan')!.props.value,'Borrador conservado','conflict preserves draft');
 act(()=>renderer.root.findAllByType('button').at(-1)!.props.onClick());await respond(latest(),fixture('1',{version:'9007199254740995'}));assert.equal(renderer.root.findAllByType('form').length,0,'reload discards conflicted amendment draft');act(()=>renderer.unmount());
 act(()=>{renderer=create(<ClientCommercialLifecycle id="1" role="owner"/>);});const old=latest();act(()=>renderer.update(<ClientCommercialLifecycle id="2" role="owner"/>));const next=latest();await respond(old,fixture('1'));assert.equal(renderer.root.findAllByType('button').length,0,'late previous client response is ignored');await respond(next,fixture('2',{archived:true}));assert.match(rendered(),/cliente está archivado/);assert.equal(renderer.root.findAllByType('button').length,0);act(()=>renderer.unmount());
 console.log('PASS commercial lifecycle: role gating, immutable amendment payload, version concurrency, retained conflict draft, read-only finance, archived and stale client isolation');
}
void run();
