import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';
import type {ClientReportingRecord,CommercialTerms} from '../app/client-reporting';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {ClientReporting}=require('../app/client-reporting') as typeof import('../app/client-reporting');
type Request={url:string;init:RequestInit;resolve:(response:Response)=>void};
const requests:Request[]=[];
globalThis.fetch=(input,init)=>new Promise<Response>(resolve=>requests.push({url:String(input),init:init||{},resolve}));
let renderer:ReactTestRenderer;
const buttonText=(node:unknown):string=>Array.isArray(node)?node.map(buttonText).join(""):typeof node==="string"?node:"";
const saveButton=()=>renderer.root.findAllByType("button").find(node=>buttonText(node.props.children).includes("Guardar"))!;
const plain=()=>JSON.stringify(renderer.toJSON());
const control=(id:string):ReactTestInstance=>{
 const node=[...renderer.root.findAllByType('select'),...renderer.root.findAllByType('input'),...renderer.root.findAllByType('textarea')].find(item=>item.props.id===id);
 assert.ok(node,`missing control ${id}`);
 return node!;
};
const change=(id:string,value:string)=>act(()=>control(id).props.onChange({target:{value}}));
const money=(id:string):ReactTestInstance=>{
 const node=renderer.root.findAll(item=>typeof item.props?.onValueChange==='function'&&item.props?.id===id)[0];
 assert.ok(node,`missing money control ${id}`);
 return node!;
};
const setMoney=(id:string,value:string)=>act(()=>money(id).props.onValueChange(value));
const record=(id='1',overrides:Partial<ClientReportingRecord>={}):ClientReportingRecord=>({clientId:id,customerKind:'unknown',servicePlanId:'7',relationshipStartedOn:'2024-01-15',version:'9007199254740993',updatedAt:'2026-09-10T12:00:00Z',archived:false,...overrides});
const reporting=(id='1',overrides:Partial<ClientReportingRecord>={})=>({reporting:record(id,overrides),plans:[{id:'7',name:'Mensual'}]});
const terms:CommercialTerms={clientId:'1',planId:'7',planName:'Mensual',recurringAmount:'1200000',currency:'PYG',startsOn:'2024-01-15',endsOn:null,invoiceRequired:true,commissionRecipientId:'9',commissionRecipientName:'Ana',commissionMode:'percentage',commissionValue:'10',updatedAt:'2026-09-10T12:00:00Z'};
const commercial=(value:CommercialTerms|null=terms)=>({clientId:'1',archived:false,terms:value,plans:[{id:'7',name:'Mensual',currency:'PYG' as const}],collaborators:[{id:'9',full_name:'Ana'}]});
async function respond(request:Request,data:unknown,status=200){await act(async()=>{request.resolve(new Response(JSON.stringify(data),{status}));});}
async function load(report=reporting(),term=commercial()){await act(async()=>{});const start=requests.length-2;assert.equal(requests[start].url,'/core-api/api/agency/clients/1/reporting');assert.equal(requests[start+1].url,'/core-api/api/agency/clients/1/commercial-terms');assert.equal(requests[start].init.credentials,'include');assert.equal(requests[start+1].init.credentials,'include');await respond(requests[start],report);await respond(requests[start+1],term);}
const json=(request:Request)=>JSON.parse(String(request.init.body));
const currencyOptions=()=>renderer.root.findAllByType('option').filter(option=>['PYG','USD','EUR','BRL','ARS','MXN'].includes(option.props.value));
async function run(){
 for(const role of ['viewer','editor','production','']){act(()=>{renderer=create(<ClientReporting id="1" role={role}/>);});assert.equal(renderer.toJSON(),null);act(()=>renderer.unmount());}
 for(const id of ['../2','0',Number.MAX_SAFE_INTEGER+1]){act(()=>{renderer=create(<ClientReporting id={id} role="owner"/>);});assert.match(plain(),/Cliente inválido/);act(()=>renderer.unmount());}
 assert.equal(requests.length,0,'forbidden roles and invalid IDs never fetch');
  await act(async()=>{renderer=create(<ClientReporting id="1" role="finance"/>);});await load();assert.match(plain(),/Solo lectura/);assert.match(plain(),/Términos comerciales efectivos/);for(const control of [...renderer.root.findAllByType('select'),...renderer.root.findAllByType('input')])assert.equal(control.props.disabled,true);act(()=>renderer.unmount());
  await act(async()=>{renderer=create(<ClientReporting id="1" role="sales"/>);});await act(async()=>{});const salesStart=requests.length-1;assert.equal(requests[salesStart].url,'/core-api/api/agency/clients/1/reporting');assert.equal(requests.length,salesStart+1,'non-financial roles never fetch commercial-terms');await respond(requests[salesStart],reporting('1',{servicePlanId:null,relationshipStartedOn:null}));assert.equal(renderer.root.findAllByType('select').length,2,'non-financial roles see only the reporting fields');const salesTree=plain();assert.ok(!salesTree.includes('Monto recurrente')&&!salesTree.includes('Términos comerciales efectivos'),'cuánto paga nunca se renderiza para gerencia o ventas');change('client-reporting-kind','company');act(()=>{void saveButton().props.onClick();});const reportingOnly=requests.at(-1)!;assert.equal(reportingOnly.url,'/core-api/api/agency/clients/1/reporting');assert.deepEqual(json(reportingOnly),{expectedVersion:'9007199254740993',customerKind:'company'},'reporting PATCH keeps its versioned contract and never embeds commercial terms');await respond(reportingOnly,reporting('1',{customerKind:'company'}));assert.match(plain(),/Datos para reportes guardados/);act(()=>renderer.unmount());
  await act(async()=>{renderer=create(<ClientReporting id="1" role="owner"/>);});await load(reporting('1',{servicePlanId:null,relationshipStartedOn:null}),commercial(null));assert.match(plain(),/Todavía no hay términos comerciales efectivos/);assert.equal(renderer.root.findAllByType('select').length,6,'editor is present even without saved terms and commission is optional');
  change('client-reporting-terms-plan','7');setMoney('client-reporting-amount','2500000');change('client-reporting-starts','2024-02-01');change('client-reporting-ends','2024-03-31');change('client-reporting-invoice','false');change('client-reporting-commission-mode','percentage');change('client-reporting-commission-recipient','9');change('client-reporting-commission-value','25');
  act(()=>{void saveButton().props.onClick();});const termPatch=requests.at(-1)!;assert.equal(termPatch.url,'/core-api/api/agency/clients/1/commercial-terms');assert.equal(termPatch.init.method,'PATCH');assert.deepEqual(json(termPatch),{planId:'7',recurringAmount:'2500000',currency:'PYG',startsOn:'2024-02-01',endsOn:'2024-03-31',invoiceRequired:false,commissionRecipientId:'9',commissionMode:'percentage',commissionValue:'25'},'terms PATCH is the complete canonical nine-field payload');await respond(termPatch,commercial({...terms,recurringAmount:'2500000',startsOn:'2024-02-01',endsOn:'2024-03-31',invoiceRequired:false,commissionValue:'25'}));
  change('client-reporting-kind','company');act(()=>{void saveButton().props.onClick();});const reportingPatch=requests.at(-1)!;assert.equal(reportingPatch.url,'/core-api/api/agency/clients/1/reporting');assert.deepEqual(json(reportingPatch),{expectedVersion:'9007199254740993',customerKind:'company'},'reporting PATCH keeps its versioned contract and never embeds commercial terms');await respond(reportingPatch,reporting('1',{customerKind:'company'}));
  change('client-reporting-commission-mode','none');act(()=>{void saveButton().props.onClick();});const nonePatch=requests.at(-1)!;assert.equal(nonePatch.url,'/core-api/api/agency/clients/1/commercial-terms');assert.deepEqual(json(nonePatch),{planId:'7',recurringAmount:'2500000',currency:'PYG',startsOn:'2024-02-01',endsOn:'2024-03-31',invoiceRequired:false,commissionRecipientId:null,commissionMode:'none',commissionValue:null},'a contract without commission saves plan, amount and end date alone');await respond(nonePatch,commercial({...terms,recurringAmount:'2500000',startsOn:'2024-02-01',endsOn:'2024-03-31',invoiceRequired:false,commissionMode:'none',commissionRecipientId:null,commissionRecipientName:null,commissionValue:null}));
  assert.match(plain(),/Sin comisión/);
  assert.match(plain(),/Datos para reportes guardados/);act(()=>renderer.unmount());
  // Seis monedas: el editor ofrece las seis y un término en EUR se lee completo.
  await act(async()=>{renderer=create(<ClientReporting id="1" role="owner"/>);});
  await load(reporting(),commercial({...terms,currency:'EUR',recurringAmount:'2500000'}));
  assert.equal(currencyOptions().length,6,'the currency select offers the six company currencies');
  assert.equal(control('client-reporting-currency').props.value,'EUR','an EUR term keeps its currency in the editor');
  assert.match(plain(),/EUR[^0-9]*2,500,000/,'an EUR term renders its amount');
  change('client-reporting-currency','BRL');
  act(()=>{void saveButton().props.onClick();});
  const brlPatch=requests.at(-1)!;
  assert.equal(brlPatch.url,'/core-api/api/agency/clients/1/commercial-terms');
  assert.deepEqual(json(brlPatch),{planId:'7',recurringAmount:'2500000',currency:'BRL',startsOn:'2024-01-15',endsOn:null,invoiceRequired:true,commissionRecipientId:'9',commissionMode:'percentage',commissionValue:'10'},'a terms PATCH carries any of the six currencies');
  await respond(brlPatch,commercial({...terms,currency:'BRL',recurringAmount:'2500000'}));
  assert.match(plain(),/BRL[^0-9]*2,500,000/,'a BRL term renders its amount');
  act(()=>renderer.unmount());
  console.log('PASS client reporting: role safety, financial-only commercial terms, reporting-only sales save, read-only finance, owner editor without terms, exact nine-field terms PATCH with end date, optional commission, preserved reporting version PATCH, and the six company currencies in the terms editor');
}
void run();
