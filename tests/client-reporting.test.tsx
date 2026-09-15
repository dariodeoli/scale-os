import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import type {ClientReportingRecord,CommercialTerms} from '../app/client-reporting';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {ClientReporting}=require('../app/client-reporting') as typeof import('../app/client-reporting');
type Request={url:string;init:RequestInit;resolve:(response:Response)=>void};
const requests:Request[]=[];
globalThis.fetch=(input,init)=>new Promise<Response>(resolve=>requests.push({url:String(input),init:init||{},resolve}));
let renderer:ReactTestRenderer;
const record=(id='1',overrides:Partial<ClientReportingRecord>={}):ClientReportingRecord=>({clientId:id,customerKind:'unknown',servicePlanId:'7',relationshipStartedOn:'2024-01-15',version:'9007199254740993',updatedAt:'2026-09-10T12:00:00Z',archived:false,...overrides});
const reporting=(id='1',overrides:Partial<ClientReportingRecord>={})=>({reporting:record(id,overrides),plans:[{id:'7',name:'Mensual'}]});
const terms:CommercialTerms={clientId:'1',planId:'7',planName:'Mensual',recurringAmount:'1200000',currency:'PYG',startsOn:'2024-01-15',invoiceRequired:true,commissionRecipientId:'9',commissionRecipientName:'Ana',commissionMode:'percentage',commissionValue:'10',updatedAt:'2026-09-10T12:00:00Z'};
const commercial=(value:CommercialTerms|null=terms)=>({clientId:'1',archived:false,terms:value,plans:[{id:'7',name:'Mensual',currency:'PYG' as const}],collaborators:[{id:'9',full_name:'Ana'}]});
async function respond(request:Request,data:unknown,status=200){await act(async()=>{request.resolve(new Response(JSON.stringify(data),{status}));});}
async function load(report=reporting(),term=commercial()){await act(async()=>{});const start=requests.length-2;assert.equal(requests[start].url,'/core-api/api/agency/clients/1/reporting');assert.equal(requests[start+1].url,'/core-api/api/agency/clients/1/commercial-terms');assert.equal(requests[start].init.credentials,'include');assert.equal(requests[start+1].init.credentials,'include');await respond(requests[start],report);await respond(requests[start+1],term);}
const json=(request:Request)=>JSON.parse(String(request.init.body));
async function run(){
 for(const role of ['viewer','editor','production','']){act(()=>{renderer=create(<ClientReporting id="1" role={role}/>);});assert.equal(renderer.toJSON(),null);act(()=>renderer.unmount());}
 for(const id of ['../2','0',Number.MAX_SAFE_INTEGER+1]){act(()=>{renderer=create(<ClientReporting id={id} role="owner"/>);});assert.match(JSON.stringify(renderer.toJSON()),/Cliente inválido/);act(()=>renderer.unmount());}
 assert.equal(requests.length,0,'forbidden roles and invalid IDs never fetch');
 await act(async()=>{renderer=create(<ClientReporting id="1" role="finance"/>);});await load();assert.match(JSON.stringify(renderer.toJSON()),/Solo lectura/);assert.match(JSON.stringify(renderer.toJSON()),/Términos comerciales efectivos/);for(const control of [...renderer.root.findAllByType('select'),...renderer.root.findAllByType('input')])assert.equal(control.props.disabled,true);act(()=>renderer.unmount());
 await act(async()=>{renderer=create(<ClientReporting id="1" role="sales"/>);});await load(reporting('1',{servicePlanId:null,relationshipStartedOn:null}),commercial(null));assert.match(JSON.stringify(renderer.toJSON()),/Todavía no hay términos comerciales efectivos/);assert.equal(renderer.root.findAllByType('select').length,7,'editor is present even without saved terms');
 const selects=renderer.root.findAllByType('select');const inputs=renderer.root.findAllByType('input');
  act(()=>selects[2].props.onChange({target:{value:'7'}}));act(()=>inputs.find(input=>input.props.placeholder==='1.000.000')!.props.onChange({target:{value:'2500000'}}));act(()=>inputs.filter(input=>input.props.type==='date')[1].props.onChange({target:{value:'2024-02-01'}}));act(()=>selects[4].props.onChange({target:{value:'false'}}));act(()=>selects[5].props.onChange({target:{value:'9'}}));act(()=>inputs.find(input=>input.props.placeholder==='0-100')!.props.onChange({target:{value:'25'}}));
 act(()=>{void renderer.root.findByType('button').props.onClick();});const termPatch=requests.at(-1)!;assert.equal(termPatch.url,'/core-api/api/agency/clients/1/commercial-terms');assert.equal(termPatch.init.method,'PATCH');assert.deepEqual(json(termPatch),{planId:'7',recurringAmount:'2500000',currency:'PYG',startsOn:'2024-02-01',invoiceRequired:false,commissionRecipientId:'9',commissionMode:'percentage',commissionValue:'25'},'terms PATCH is the complete canonical eight-field payload');await respond(termPatch,commercial({...terms,recurringAmount:'2500000',startsOn:'2024-02-01',invoiceRequired:false,commissionValue:'25'}));
 act(()=>selects[0].props.onChange({target:{value:'company'}}));act(()=>{void renderer.root.findByType('button').props.onClick();});const reportingPatch=requests.at(-1)!;assert.equal(reportingPatch.url,'/core-api/api/agency/clients/1/reporting');assert.deepEqual(json(reportingPatch),{expectedVersion:'9007199254740993',customerKind:'company'},'reporting PATCH keeps its versioned contract and never embeds commercial terms');await respond(reportingPatch,reporting('1',{customerKind:'company'}));
 assert.match(JSON.stringify(renderer.toJSON()),/Datos para reportes guardados/);act(()=>renderer.unmount());
 console.log('PASS client reporting: role safety, separate reporting/commercial-terms GETs, read-only finance, editor without terms, exact eight-field terms PATCH, and preserved reporting version PATCH');
}
void run();
