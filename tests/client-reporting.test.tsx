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
let nextRevision=1;
async function respond(request:Request,data:unknown,status=200){await act(async()=>{request.resolve(new Response(JSON.stringify(data),{status}));});if(request.url.endsWith('/commercial-terms')&&request.init.method==='PATCH'&&status===200){const history=requests.at(-1)!;assert(history.url.endsWith('/plan-history'),'refresh revision after successful append');await respond(history,{records:[],revision:String(nextRevision++)});const refreshed=requests.at(-1)!;assert(refreshed.url.endsWith('/commercial-terms')&&(refreshed.init.method??'GET')==='GET','revision is captured before refreshing the new draft');await respond(refreshed,data);}}
async function load(report=reporting(),term=commercial(),history:unknown={records:[],revision:'0'},historyStatus=200){
 await act(async()=>{});const start=requests.length-2;
 assert.equal(requests[start].url,'/core-api/api/agency/clients/1/reporting');
 const second=requests[start+1];
 if(second.url.endsWith('/plan-history')){await respond(second,history,historyStatus);const termsRequest=requests.at(-1)!;assert(termsRequest.url.endsWith('/commercial-terms'));await respond(requests[start],report);await respond(termsRequest,term);}
 else {assert.equal(second.url,'/core-api/api/agency/clients/1/commercial-terms');await respond(requests[start],report);await respond(second,term);}
 assert.equal(requests[start].init.credentials,'include');assert.equal(second.init.credentials,'include');
}
const json=(request:Request)=>JSON.parse(String(request.init.body));
const jsonTerms=(request:Request)=>{const body=json(request);assert.match(body.requestId,/^[a-f0-9-]{36}$/);assert.match(body.expectedRevision,/^(0|[1-9]\d*)$/);assert.match(body.effectiveFrom,/^\d{4}-\d{2}-01$/);assert.equal(body.reason,'Acuerdo comercial de prueba');const {requestId,expectedRevision,effectiveFrom,reason,...terms}=body;return terms;};
const setAudit=(effectiveFrom='2024-02-01')=>{change('client-reporting-effective',effectiveFrom);change('client-reporting-reason','Acuerdo comercial de prueba');};
const currencyOptions=()=>renderer.root.findAllByType('option').filter(option=>['PYG','USD','EUR','BRL','ARS','MXN'].includes(option.props.value));
async function run(){
 for(const role of ['viewer','editor','production','']){act(()=>{renderer=create(<ClientReporting id="1" role={role}/>);});assert.equal(renderer.toJSON(),null);act(()=>renderer.unmount());}
 for(const id of ['../2','0',Number.MAX_SAFE_INTEGER+1]){act(()=>{renderer=create(<ClientReporting id={id} role="owner"/>);});assert.match(plain(),/Cliente inválido/);act(()=>renderer.unmount());}
 assert.equal(requests.length,0,'forbidden roles and invalid IDs never fetch');
  await act(async()=>{renderer=create(<ClientReporting id="1" role="finance"/>);});await load();assert.match(plain(),/Solo lectura/);assert.match(plain(),/Términos comerciales efectivos/);for(const control of [...renderer.root.findAllByType('select'),...renderer.root.findAllByType('input')])assert.equal(control.props.disabled,true);act(()=>renderer.unmount());
  await act(async()=>{renderer=create(<ClientReporting id="1" role="sales"/>);});await act(async()=>{});const salesStart=requests.length-1;assert.equal(requests[salesStart].url,'/core-api/api/agency/clients/1/reporting');assert.equal(requests.length,salesStart+1,'non-financial roles never fetch commercial-terms');await respond(requests[salesStart],reporting('1',{servicePlanId:null,relationshipStartedOn:null}));assert.equal(renderer.root.findAllByType('select').length,2,'non-financial roles see only the reporting fields');const salesTree=plain();assert.ok(!salesTree.includes('Monto recurrente')&&!salesTree.includes('Términos comerciales efectivos'),'cuánto paga nunca se renderiza para gerencia o ventas');change('client-reporting-kind','company');act(()=>{void saveButton().props.onClick();});const reportingOnly=requests.at(-1)!;assert.equal(reportingOnly.url,'/core-api/api/agency/clients/1/reporting');assert.deepEqual(json(reportingOnly),{expectedVersion:'9007199254740993',customerKind:'company'},'reporting PATCH keeps its versioned contract and never embeds commercial terms');await respond(reportingOnly,reporting('1',{customerKind:'company'}));assert.match(plain(),/Datos para reportes guardados/);act(()=>renderer.unmount());
  await act(async()=>{renderer=create(<ClientReporting id="1" role="owner"/>);});await load(reporting('1',{servicePlanId:null,relationshipStartedOn:null}),commercial(null));assert.match(plain(),/Todavía no hay términos comerciales efectivos/);assert.equal(renderer.root.findAllByType('select').length,6,'editor is present even without saved terms and commission is optional');
  change('client-reporting-terms-plan','7');setMoney('client-reporting-amount','2500000');change('client-reporting-starts','2024-02-01');change('client-reporting-ends','2024-03-31');change('client-reporting-invoice','false');change('client-reporting-commission-mode','percentage');change('client-reporting-commission-recipient','9');change('client-reporting-commission-value','25');
  setAudit();act(()=>{void saveButton().props.onClick();});const termPatch=requests.at(-1)!;assert.equal(termPatch.url,'/core-api/api/agency/clients/1/commercial-terms');assert.equal(termPatch.init.method,'PATCH');assert.deepEqual(jsonTerms(termPatch),{planId:'7',recurringAmount:'2500000',currency:'PYG',startsOn:'2024-02-01',endsOn:'2024-03-31',invoiceRequired:false,commissionRecipientId:'9',commissionMode:'percentage',commissionValue:'25'},'terms PATCH is the complete canonical nine-field payload');await respond(termPatch,commercial({...terms,recurringAmount:'2500000',startsOn:'2024-02-01',endsOn:'2024-03-31',invoiceRequired:false,commissionValue:'25'}));
  change('client-reporting-kind','company');act(()=>{void saveButton().props.onClick();});const reportingPatch=requests.at(-1)!;assert.equal(reportingPatch.url,'/core-api/api/agency/clients/1/reporting');assert.deepEqual(json(reportingPatch),{expectedVersion:'9007199254740993',customerKind:'company'},'reporting PATCH keeps its versioned contract and never embeds commercial terms');await respond(reportingPatch,reporting('1',{customerKind:'company'}));
  change('client-reporting-commission-mode','none');setAudit('2024-03-01');act(()=>{void saveButton().props.onClick();});const nonePatch=requests.at(-1)!;assert.equal(nonePatch.url,'/core-api/api/agency/clients/1/commercial-terms');assert.deepEqual(jsonTerms(nonePatch),{planId:'7',recurringAmount:'2500000',currency:'PYG',startsOn:'2024-02-01',endsOn:'2024-03-31',invoiceRequired:false,commissionRecipientId:null,commissionMode:'none',commissionValue:null},'a contract without commission saves plan, amount and end date alone');await respond(nonePatch,commercial({...terms,recurringAmount:'2500000',startsOn:'2024-02-01',endsOn:'2024-03-31',invoiceRequired:false,commissionMode:'none',commissionRecipientId:null,commissionRecipientName:null,commissionValue:null}));
  assert.match(plain(),/Sin comisión/);
  assert.match(plain(),/Datos para reportes guardados/);act(()=>renderer.unmount());
  // Seis monedas: el editor ofrece las seis y un término en EUR se lee completo.
  await act(async()=>{renderer=create(<ClientReporting id="1" role="owner"/>);});
  await load(reporting(),commercial({...terms,currency:'EUR',recurringAmount:'2500000'}));
  assert.equal(currencyOptions().length,6,'the currency select offers the six company currencies');
  assert.equal(control('client-reporting-currency').props.value,'EUR','an EUR term keeps its currency in the editor');
  assert.match(plain(),/EUR[^0-9]*2\.500\.000,00/,'an EUR term renders its amount with the shared v2 money cell');
  change('client-reporting-currency','BRL');setAudit();
  act(()=>{void saveButton().props.onClick();});
  const brlPatch=requests.at(-1)!;
  assert.equal(brlPatch.url,'/core-api/api/agency/clients/1/commercial-terms');
  assert.deepEqual(jsonTerms(brlPatch),{planId:'7',recurringAmount:'2500000',currency:'BRL',startsOn:'2024-01-15',endsOn:null,invoiceRequired:true,commissionRecipientId:'9',commissionMode:'percentage',commissionValue:'10'},'a terms PATCH carries any of the six currencies');
  await respond(brlPatch,commercial({...terms,currency:'BRL',recurringAmount:'2500000'}));
  assert.match(plain(),/BRL[^0-9]*2\.500\.000,00/,'a BRL term renders its amount with the shared v2 money cell');
  act(()=>renderer.unmount());
  // Un historial inválido no convierte una edición económica en un PATCH parcial de reportes.
  await act(async()=>{renderer=create(<ClientReporting id="1" role="owner"/>);});
  await load(reporting(),commercial(),{});
  change('client-reporting-kind','company');setMoney('client-reporting-amount','2000000');setAudit();
  const beforeFailed=requests.length;
  act(()=>{void saveButton().props.onClick();});
  assert.equal(requests.length,beforeFailed,'missing revision blocks both reporting and terms writes');
  assert.match(plain(),/revisión del plan/);
  setMoney('client-reporting-amount','1200000');
  act(()=>{void saveButton().props.onClick();});
  assert(requests.at(-1)!.url.endsWith('/reporting'),'classification-only remains independent of financial history');
  await respond(requests.at(-1)!,reporting('1',{customerKind:'company'}));
  act(()=>renderer.unmount());
  // Misma solicitud tras error de red: el servidor puede reconocer el commit sin duplicarlo.
  await act(async()=>{renderer=create(<ClientReporting id="1" role="owner"/>);});
  await load(reporting(),Object.assign(commercial(),{revision:'8'}));setMoney('client-reporting-amount','2000000');setAudit();
  act(()=>{void saveButton().props.onClick();});const firstAttempt=requests.at(-1)!;
  const firstBody=json(firstAttempt);assert.equal(firstBody.expectedRevision,'8','the draft uses the atomic terms revision, not an older history token');
  await respond(firstAttempt,{error:'Error de conexión simulado'},503);
  act(()=>{void saveButton().props.onClick();});const repeated=requests.at(-1)!;
  assert.equal(json(repeated).requestId,firstBody.requestId);
  await respond(repeated,commercial({...terms,recurringAmount:'2000000'}));
  setMoney('client-reporting-amount','3000000');setAudit();
  act(()=>{void saveButton().props.onClick();});const changed=requests.at(-1)!;
  assert.notEqual(json(changed).requestId,firstBody.requestId);
  assert.notEqual(json(changed).expectedRevision,'0','another edit uses the refreshed revision');
  await respond(changed,commercial({...terms,recurringAmount:'3000000'}));
  act(()=>renderer.unmount());
  await act(async()=>{renderer=create(<ClientReporting id="1" role="owner"/>);});
  await load(reporting(),commercial({...terms,currency:'USD',commissionMode:'fixed'}));
  setMoney('client-reporting-amount','1200.00');setMoney('client-reporting-commission-value','50.00');setAudit();
  act(()=>{void saveButton().props.onClick();});const wholeMoney=requests.at(-1)!;
  assert(wholeMoney.url.endsWith('/commercial-terms'));
  assert.equal(json(wholeMoney).recurringAmount,'1200');assert.equal(json(wholeMoney).commissionValue,'50');
  await respond(wholeMoney,commercial({...terms,currency:'USD',recurringAmount:'1200',commissionMode:'fixed',commissionValue:'50'}));
  setMoney('client-reporting-amount','1200.00');setMoney('client-reporting-commission-value','50.00');
  assert.equal(saveButton().props.disabled,true,'representar el mismo importe con ceros decimales no crea otro cambio');
  setMoney('client-reporting-amount','1200.25');setAudit();const beforeCents=requests.length;
  act(()=>{void saveButton().props.onClick();});
  assert.equal(requests.length,beforeCents,'fracciones reales siguen bloqueadas antes de cualquier PATCH');
  assert.match(plain(),/enteros positivos/);
  act(()=>renderer.unmount());
  console.log('PASS client reporting: role safety, financial-only commercial terms, reporting-only sales save, read-only finance, owner editor without terms, exact nine-field terms PATCH with end date, optional commission, preserved reporting version PATCH, and the six company currencies in the terms editor');
}
void run();
