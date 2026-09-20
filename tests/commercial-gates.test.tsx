import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
// Sin DOM el diálogo se renderiza en línea: el test valida el gate, no el portal.
const dialogId=require.resolve('../app/dialog');
require.cache[dialogId]={id:dialogId,filename:dialogId,loaded:true,exports:{
  Dialog:({children}:{children:React.ReactNode})=><section role="dialog">{children}</section>,
  FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
  useDialogClose:()=>undefined,
  useDialogPending:()=>{},
  useOverlay:()=>({requestClose:()=>{}}),
}} as NodeModule;

const {RecordEditor,BudgetActions}=require('../app/suite') as typeof import('../app/suite');
const {roleCan}=require('../app/capabilities') as typeof import('../app/capabilities');
const {WorkPlanner,workStatusLabel}=require('../app/productivity-ui') as typeof import('../app/productivity-ui');

type Pending={url:string;init:RequestInit;resolve:(response:Response)=>void};
const requests:Pending[]=[];
globalThis.fetch=(input,init)=>new Promise<Response>(resolve=>requests.push({url:String(input),init:init||{},resolve}));
const settle=async()=>{await act(async()=>{});};
function respond(request:Pending|undefined,data:unknown,status=200){assert(request,'expected a pending request');request!.resolve(new Response(JSON.stringify(data),{status}));}
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(child=>text(child)).join('');
const buttonWith=(renderer:ReactTestRenderer,label:string)=>renderer.root.findAllByType('button').find(button=>text(button).includes(label));

test('front gates mirror the API capability defaults',()=>{
 for(const role of ['owner','admin','management','sales'])assert.equal(roleCan(role,'commercial-terms.manage'),true,`${role} manages commercial terms`);
 for(const role of ['finance','production','collaborator','editor','viewer'])assert.equal(roleCan(role,'commercial-terms.manage'),false,`${role} never writes commercial terms`);
 for(const role of ['owner','admin','management','finance','sales'])assert.equal(roleCan(role,'invoices.manage'),true,`${role} manages invoices`);
 for(const role of ['production','collaborator','editor','viewer'])assert.equal(roleCan(role,'invoices.manage'),false,`${role} never creates invoices`);
 assert.equal(roleCan('sales','invoices.manage'),true);
 assert.equal(roleCan(null,'invoices.manage'),false);
});

test('client editor shows Plan y pago only for commercial-terms roles and never calls the terms API otherwise',async()=>{
 const allowed=['owner','admin','management','sales'];
 const permitted=['owner','admin','management','sales','finance','collaborator'];
 for(const role of [...permitted,'production','editor','viewer']){
  requests.length=0;
  let renderer!:ReactTestRenderer;
  await act(async()=>{renderer=create(<RecordEditor kind="clients" recordId="1" name="ACME" role={role} refresh={async()=>{}}/>);});
  if(!permitted.includes(role)){assert.equal(renderer.toJSON(),null,`${role} cannot edit clients`);continue;}
  const edit=renderer.root.findAllByType('button').find(button=>button.props.title==='Editar');
  assert(edit,`${role} keeps the client editor`);
  act(()=>{edit!.props.onClick();});
  await settle();
  respond(requests.find(request=>request.url.endsWith('/api/agency/clients/1')),{record:{id:'1',name:'ACME',legal_name:'',tax_id:'',lifecycle_status:'active',updated_at:'2026-09-20T12:00:00Z'}});
  await settle();
  const terms=requests.find(request=>request.url.endsWith('/api/agency/clients/1/commercial-terms'));
  if(allowed.includes(role)){
   assert(terms,`${role} fetches commercial terms to edit them`);
   respond(terms,{clientId:'1',archived:false,terms:null,plans:[],collaborators:[]});
   await settle();
   const rendered=text(renderer.root);
   assert(rendered.includes('Plan y pago'),`${role} sees Plan y pago`);
   assert(rendered.includes('Cuánto paga por mes'),`${role} edits the monthly amount`);
  }else{
   assert.equal(terms,undefined,`${role} never requests commercial terms`);
   const rendered=text(renderer.root);
   assert(!rendered.includes('Plan y pago')&&!rendered.includes('Cuánto paga por mes'),`${role} never sees Plan y pago`);
  }
  act(()=>renderer.unmount());
  await settle();
 }
});

test('budget invoice control appears only for invoices.manage roles and always asks for confirmation',async()=>{
 const allowed=['owner','admin','management','finance','sales'];
 for(const role of [...allowed,'production','collaborator']){
  requests.length=0;
  let renderer!:ReactTestRenderer;
  await act(async()=>{renderer=create(<BudgetActions id="9" role={role} refresh={async()=>{}}/>);});
  const open=buttonWith(renderer,'Abrir presupuesto');
  assert(open,`${role} opens the budget`);
  act(()=>{open!.props.onClick();});
  await settle();
  respond(requests.at(-1),{budget:{id:'9',number:'P-9',title:'Propuesta',status:'accepted',accepted_by:'Cliente',currency:'PYG',total:'100'},items:[]});
  await settle();
  const rendered=text(renderer.root);
  assert(rendered.includes('Aceptado por Cliente'),`${role} reads the accepted budget`);
  if(allowed.includes(role)){
   assert(rendered.includes('Crear factura'),`${role} can create the invoice`);
   act(()=>{buttonWith(renderer,'Crear factura')!.props.onClick();});
   await settle();
   assert(text(renderer.root).includes('¿Crear la factura de este presupuesto?'),'the invoice asks for confirmation');
   assert.equal(requests.filter(request=>request.url.endsWith('/invoice')).length,0,'no invoice before confirming');
   act(()=>{buttonWith(renderer,'Confirmar')!.props.onClick();});
   await settle();
   assert.equal(requests.at(-1)?.url,'/core-api/api/agency/budgets/9/invoice','confirmation posts the invoice');
   respond(requests.at(-1),{invoice:{id:'1'}});
   await settle();
  }else{
   assert(!text(renderer.root).includes('Crear factura'),`${role} never sees the invoice control`);
  }
  act(()=>renderer.unmount());
  await settle();
 }
});

test('piece statuses cover the API dictionary and never render raw slugs',async()=>{
 for(const [id,label] of [['blocked','Bloqueado'],['to_record','Por grabar'],['recorded','Grabado'],['editing','Editando'],['review','Revisión'],['approved','Aprobado'],['published','Publicado']])assert.equal(workStatusLabel(id),label,`${id} has its canonical label`);
 assert.equal(workStatusLabel('unknown'),'unknown','unknown states stay visible as-is');
 requests.length=0;
 let renderer!:ReactTestRenderer;
 const orders=[
  {id:'1',title:'Pieza aprobada',status:'approved',project_id:'1',client_name:'ACME',project_name:'Campaña'},
  {id:'2',title:'Pieza publicada',status:'published',project_id:'1',client_name:'ACME',project_name:'Campaña'},
 ];
 await act(async()=>{renderer=create(<WorkPlanner orders={orders} userId="7" role="owner" projects={[]} openOrder={()=>{}} refresh={async()=>{}} navigate={()=>{}} initialView="Lista y lotes"/>);});
 await settle();
 const rendered=text(renderer.root);
 assert(rendered.includes('Aprobado')&&rendered.includes('Publicado'),'approved and published render with their labels');
 assert(!/approved|published/.test(rendered),'raw slugs never reach the planner');
 assert.equal(requests.length,0,'the planner does not depend on extra fetches for the dictionary');
 act(()=>renderer.unmount());
});
