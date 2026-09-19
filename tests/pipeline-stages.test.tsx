import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
// The shared Dialog uses a portal and focus stack; suite tests mock it and drive the props.
const dialogPath=require.resolve('../app/dialog');
require.cache[dialogPath]={id:dialogPath,filename:dialogPath,loaded:true,exports:{
 Dialog:({title,children}:{title?:string;children:React.ReactNode})=><section role="dialog" aria-label={title}>{children}</section>,
 FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
 useDialogClose:()=>undefined,
 useDialogPending:()=>undefined,
}} as NodeModule;
const {CatalogWorkspace}=require('../app/suite') as typeof import('../app/suite');
type Pending={url:string;init:RequestInit;resolve:(response:Response)=>void};
const requests:Pending[]=[];
globalThis.fetch=(input,init={})=>new Promise<Response>(resolve=>{requests.push({url:String(input),init,resolve});});
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
let renderer:ReactTestRenderer;
async function mount(){await act(async()=>{renderer=create(<CatalogWorkspace kind="leads" role="owner"/>);});}
async function flush(data:unknown,status=200){const pending=requests.shift();assert(pending,'expected a pending request');await act(async()=>{pending!.resolve(new Response(JSON.stringify(data),{status}));});}
const stageRow=(slug:string)=>renderer.root.findAll(node=>String(node.props.className||'').split(' ').includes('stage-row')&&text(node).includes(slug))[0];
const buttonIn=(node:ReactTestInstance,label:string)=>node.findAllByType('button').find(candidate=>text(candidate)===label)!;
const baseStages=[
 {id:'1',slug:'lead',label:'Nuevo lead',position:0,active:true,kind:'open'},
 {id:'2',slug:'diagnostico',label:'Diagnóstico',position:1,active:true,kind:'open'},
 {id:'3',slug:'cierre',label:'Cierre ganado',position:2,active:true,kind:'won'},
 {id:'4',slug:'propuesta',label:'Propuesta',position:3,active:false,kind:'open'},
];

async function run(){
 await mount();
 assert.equal(requests.length,2);
 assert.equal(requests[0].url,'/core-api/api/agency/leads');assert.equal(requests[1].url,'/core-api/api/agency/pipeline-stages');
 await flush({records:[
  {id:'10',name:'Cliente activo',stage:'diagnostico',amount:'100',currency:'PYG',probability:30},
  {id:'11',name:'Cliente histórico',stage:'propuesta',amount:'50',currency:'PYG',probability:40},
 ]});
 await flush({stages:baseStages});
 assert.match(text(renderer.root),/Diagnóstico · 1/);assert.match(text(renderer.root),/Cierre ganado · 0/);
 assert.match(text(renderer.root),/Nuevo lead · 0/,'API stages replace the fixed fallback');
 assert.match(text(renderer.root),/Propuesta · desactivada · 1/,'an inactive stage keeps its historical leads in a read-only column');
 assert.match(text(renderer.root),/Cliente histórico/);assert.match(text(renderer.root),/Cliente activo/);
 // Dragging into an active custom stage sends its slug only: the server preserves the probability.
 const boardHandle=()=>renderer.root.findAll(node=>typeof node.props.onDragEnd==='function')[0];
 let board=boardHandle();
 await act(async()=>{board.props.onDragEnd({active:{id:'10'},over:{id:'stage-diagnostico'}});});
 assert.equal(requests[0].url,'/core-api/api/agency/leads/10');assert.equal(requests[0].init.method,'PATCH');
 assert.deepEqual(JSON.parse(String(requests[0].init.body)),{stage:'diagnostico'});
 await flush({record:{}});await flush({records:[]});
 // A won stage pins the probability at 100; read-only columns reject drops without a request.
 board=boardHandle();
 await act(async()=>{board.props.onDragEnd({active:{id:'10'},over:{id:'stage-cierre'}});});
 assert.deepEqual(JSON.parse(String(requests[0].init.body)),{stage:'cierre',probability:100});
 await flush({record:{}});await flush({records:[]});
 const before=requests.length;
 await act(async()=>{board.props.onDragEnd({active:{id:'10'},over:{id:'stage-propuesta'}});});
 assert.equal(requests.length,before,'read-only stage columns reject drops');
 act(()=>renderer.root.findAllByType('button').find(node=>text(node)==='Etapas')!.props.onClick());
 const createForm=renderer.root.findAllByProps({className:'stage-create'})[0];
 act(()=>createForm.findAllByType('input')[0].props.onChange({target:{value:'Visita técnica'}}));
 act(()=>{createForm.props.onSubmit({preventDefault(){}});});
 assert.equal(requests[0].url,'/core-api/api/agency/pipeline-stages');assert.equal(requests[0].init.method,'POST');
 assert.deepEqual(JSON.parse(String(requests[0].init.body)),{label:'Visita técnica',kind:'open'});
 await flush({stage:{id:'5',slug:'visita-tecnica',label:'Visita técnica',position:4,active:true,kind:'open'}});
 assert.equal(requests[0].url,'/core-api/api/agency/pipeline-stages');assert.equal(requests[0].init.method,'GET','stage mutations reload the stage list');
 assert.equal(requests[1].url,'/core-api/api/agency/leads','stage mutations also reload the rows');
 await flush({stages:[...baseStages,{id:'5',slug:'visita-tecnica',label:'Visita técnica',position:4,active:true,kind:'open'}]});
 await flush({records:[]});
 assert.match(text(renderer.root),/Visita técnica/);
 act(()=>renderer.root.findByProps({'aria-label':'Nombre de etapa diagnostico'}).props.onChange({target:{value:'Diagnóstico 2'}}));
 act(()=>buttonIn(stageRow('diagnostico'),'Guardar').props.onClick());
 assert.equal(requests[0].url,'/core-api/api/agency/pipeline-stages/2');assert.equal(requests[0].init.method,'PATCH');
 assert.deepEqual(JSON.parse(String(requests[0].init.body)),{label:'Diagnóstico 2',active:true,position:1});
 await flush({stage:{id:'2',slug:'diagnostico',label:'Diagnóstico 2',position:1,active:true,kind:'open'}});
 await flush({stages:[...baseStages.map(stage=>stage.slug==='diagnostico'?{...stage,label:'Diagnóstico 2'}:stage),{id:'5',slug:'visita-tecnica',label:'Visita técnica',position:4,active:true,kind:'open'}]});
 await flush({records:[]});
 assert.match(text(renderer.root),/Diagnóstico 2/);
 act(()=>buttonIn(stageRow('visita-tecnica'),'Eliminar').props.onClick());
 assert(buttonIn(stageRow('visita-tecnica'),'Confirmar'),'delete asks for confirmation before calling the API');
 await act(async()=>{buttonIn(stageRow('visita-tecnica'),'Confirmar').props.onClick();});
 assert.equal(requests[0].url,'/core-api/api/agency/pipeline-stages/5');assert.equal(requests[0].init.method,'DELETE');
 await flush({ok:true,deactivated:true,slug:'visita-tecnica'});
 await flush({stages:baseStages});await flush({records:[]});
 assert.match(text(renderer.root),/Etapa desactivada/,'a used stage reports deactivation instead of deletion');
 act(()=>renderer.unmount());
 // Fallback: a failed stage read keeps the fixed board instead of an empty pipeline.
 await mount();
 assert.equal(requests[0].url,'/core-api/api/agency/leads');assert.equal(requests[1].url,'/core-api/api/agency/pipeline-stages');
 await flush({records:[]});
 await flush({error:'Sin conexión'},500);
 assert.match(text(renderer.root),/Nuevo lead · 0/);assert.match(text(renderer.root),/Contactado · 0/);assert.match(text(renderer.root),/Perdido · 0/);
 assert.doesNotMatch(text(renderer.root),/Sin conexión/,'the failed stage read never replaces the board with an error');
 act(()=>renderer.unmount());
 console.log('PASS: pipeline stages load from the API with a safe fallback, active columns accept drops with slug-only PATCH, won stages pin probability, inactive columns keep historical leads, and Etapas create/edit/delete call the contract endpoints with confirmation.');
}
void run();
