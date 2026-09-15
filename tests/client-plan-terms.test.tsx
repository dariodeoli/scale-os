import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const termsFixture={clientId:'1',planId:'7',planName:'Mensual',recurringAmount:'1200000',currency:'PYG',startsOn:'2024-01-15',invoiceRequired:true,commissionRecipientId:'9',commissionRecipientName:'Ana',commissionMode:'percentage',commissionValue:'10',updatedAt:'2026-09-10T12:00:00Z'};
const plans=[{id:'7',name:'Mensual',currency:'PYG' as const}];
const writes:{path:string;body:any;method:string}[]=[];
let currentTerms:unknown=termsFixture,archived=false;
const mockApi=async(path:string,body?:unknown,method='POST')=>{
  if(body!==undefined){writes.push({path,body,method});return {clientId:'1',archived,terms:currentTerms,plans,collaborators:[]};}
  if(path.endsWith('/commercial-terms'))return {clientId:'1',archived,terms:currentTerms,plans,collaborators:[]};
  throw new Error('unexpected GET '+path);
};
const operationsPath=require.resolve('../app/operations');
let editorProps:any=null,editorRenders=0;
const MockEditor=(props:any)=>{editorProps=props;editorRenders++;return null;};
require.cache[operationsPath]={id:operationsPath,filename:operationsPath,loaded:true,exports:{api:mockApi,Editor:MockEditor}} as NodeModule;
const {ClientPlanTerms}=require('../app/client-plan-terms') as typeof import('../app/client-plan-terms');
let renderer:ReactTestRenderer;
const render=(role:string)=>act(async()=>{renderer=create(<ClientPlanTerms id="1" role={role} refresh={async()=>{}}/>);});
const flush=()=>act(async()=>{});
async function run(){
  for(const role of ['management','sales','finance','editor','viewer','production','']){await render(role);await flush();assert.equal(renderer.toJSON(),null,`${role} never sees plan and payment`);act(()=>renderer.unmount());}
  assert.equal(writes.length,0,'forbidden roles never fetch nor write');
  await render('owner');await flush();
  assert.deepEqual(editorProps.fields.map((field:any)=>field.key),['planId','recurringAmount','currency','startsOn','invoiceRequired']);
  assert.deepEqual(editorProps.defaults,{planId:'7',recurringAmount:'1200000',currency:'PYG',startsOn:'2024-01-15',invoiceRequired:'true'});
  let save=editorProps.save;
  await act(async()=>{await save({planId:'7',recurringAmount:'2500000',currency:'PYG',startsOn:'2024-01-15',invoiceRequired:'true'});});
  assert.equal(writes.length,1);assert.equal(writes[0].path,'/api/agency/clients/1/commercial-terms');assert.equal(writes[0].method,'PATCH');
  assert.deepEqual(writes[0].body,{planId:'7',recurringAmount:'2500000',currency:'PYG',startsOn:'2024-01-15',invoiceRequired:true,commissionRecipientId:'9',commissionMode:'percentage',commissionValue:'10'},'existing commission and dates are preserved');
  assert.match(JSON.stringify(renderer.toJSON()),/Plan y pago guardados/);
  let rejected:unknown=null;
  await act(async()=>{try{await save({planId:'',recurringAmount:'100',currency:'PYG',startsOn:'2024-01-15',invoiceRequired:'true'});}catch(cause){rejected=cause;}});
  assert(rejected instanceof Error);assert.match((rejected as Error).message,/plan/i);assert.equal(writes.length,1,'invalid plan never reaches the API');
  rejected=null;
  await act(async()=>{try{await save({planId:'7',recurringAmount:'0',currency:'PYG',startsOn:'2024-01-15',invoiceRequired:'true'});}catch(cause){rejected=cause;}});
  assert(rejected instanceof Error);assert.match((rejected as Error).message,/entero positivo/i);assert.equal(writes.length,1,'zero amount never reaches the API');
  act(()=>renderer.unmount());
  currentTerms=null;
  await render('owner');await flush();
  assert.equal(editorProps.defaults.planId,'');assert.equal(editorProps.defaults.recurringAmount,'');
  await act(async()=>{await editorProps.save({planId:'7',recurringAmount:'800000',currency:'USD',startsOn:'2026-09-01',invoiceRequired:'false'});});
  assert.deepEqual(writes.at(-1)!.body,{planId:'7',recurringAmount:'800000',currency:'USD',startsOn:'2026-09-01',invoiceRequired:false,commissionRecipientId:null,commissionMode:'none',commissionValue:null},'new terms start without commission');
  act(()=>renderer.unmount());
  currentTerms=termsFixture;archived=true;const beforeRenders=editorRenders;
  await render('owner');await flush();
  assert.match(JSON.stringify(renderer.toJSON()),/solo lectura/i);assert.equal(editorRenders,beforeRenders,'archived clients never render the editor');
  act(()=>renderer.unmount());
  console.log('PASS client plan terms: role gating, canonical terms PATCH with preserved commission, validation, new-terms payload and archived read-only');
}
void run();
