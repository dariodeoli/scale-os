import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const dialogId=require.resolve('../app/dialog');
require.cache[dialogId]={id:dialogId,filename:dialogId,loaded:true,exports:{
  Dialog:({children}:{children:React.ReactNode})=><section role="dialog">{children}</section>,
  FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
  useDialogClose:()=>undefined,
  useDialogPending:()=>{},
  useOverlay:()=>({requestClose:()=>{}}),
}} as NodeModule;

const {WorkPlanner,workStatusLabel}=require('../app/productivity-ui') as typeof import('../app/productivity-ui');

type Pending={url:string;init:RequestInit;resolve:(response:Response)=>void};
const requests:Pending[]=[];
globalThis.fetch=(input,init)=>new Promise<Response>(resolve=>requests.push({url:String(input),init:init||{},resolve}));
const settle=async()=>{await act(async()=>{});};
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(child=>text(child)).join('');

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
