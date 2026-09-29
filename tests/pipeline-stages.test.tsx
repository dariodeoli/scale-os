import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
// The shared Dialog uses a portal and focus stack; the section tests mock it and drive the props.
const dialogPath=require.resolve('../app/dialog');
require.cache[dialogPath]={id:dialogPath,filename:dialogPath,loaded:true,exports:{
 Dialog:({title,children}:{title?:string;children:React.ReactNode})=><section role="dialog" aria-label={title}>{children}</section>,
 FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
 useDialogClose:()=>undefined,
 useDialogPending:()=>undefined,
}} as NodeModule;
// Paneles laterales: fuera del alcance de este contrato (leen su propio endpoint).
const growthPath=require.resolve('../app/growth-dashboard');
require.cache[growthPath]={id:growthPath,filename:growthPath,loaded:true,exports:{GrowthDashboard:()=><div>Tablero de crecimiento</div>}} as NodeModule;
const visitorsPath=require.resolve('../app/live-visitors');
require.cache[visitorsPath]={id:visitorsPath,filename:visitorsPath,loaded:true,exports:{LiveVisitors:()=><div>Viendo ahora</div>}} as NodeModule;
// dnd-kit: el contexto expone el arrastre como un botón para poder dispararlo.
let dragEvent:unknown={active:{id:'10'},over:{id:'stage-cierre'}};
const dndPath=require.resolve('@dnd-kit/core');
require.cache[dndPath]={id:dndPath,filename:dndPath,loaded:true,exports:{
 DndContext:({children,onDragEnd}:{children:React.ReactNode;onDragEnd:(event:unknown)=>void})=><div>{children}<button type="button" data-drag onClick={()=>onDragEnd(dragEvent)}>arrastrar</button></div>,
 useDraggable:()=>({setNodeRef(){},attributes:{},listeners:{},isDragging:false}),
 useDroppable:()=>({setNodeRef(){},isOver:false}),useSensor:()=>({}),useSensors:()=>[],PointerSensor(){},KeyboardSensor(){},
 pointerWithin:()=>[],rectIntersection:()=>[],
}} as NodeModule;

const {LEAD_LIST_FIELDS}=require('../app/shell-data') as typeof import('../app/shell-data');
const {PipelineSection}=require('../app/sections/pipeline') as typeof import('../app/sections/pipeline');
import type {User} from '../app/workspace-types';
type Pending={url:string;init:RequestInit;resolve:(response:Response)=>void};
const requests:Pending[]=[];
globalThis.fetch=(input,init={})=>new Promise<Response>(resolve=>{requests.push({url:String(input),init,resolve});});
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const user=(role='owner')=>({id:'1',role,organization_id:'7',full_name:'Prueba',organization_slug:''} as unknown as User);
let renderer:ReactTestRenderer;
async function mount(){await act(async()=>{renderer=create(<PipelineSection user={user()}/>);});}
async function flush(data:unknown,status=200){const pending=requests.shift();assert(pending,'expected a pending request');await act(async()=>{pending!.resolve(new Response(JSON.stringify(data),{status}));});}
const stageRow=(slug:string)=>renderer.root.findAllByType('li').find(node=>text(node).includes(slug))!;
const buttonIn=(node:ReactTestInstance|undefined,label:string)=>node?.findAllByType('button').find(candidate=>text(candidate).includes(label))!;
const baseStages=[
 {id:'1',slug:'lead',label:'Nuevo lead',position:0,active:true,kind:'open'},
 {id:'2',slug:'diagnostico',label:'Diagnóstico',position:1,active:true,kind:'open'},
 {id:'3',slug:'cierre',label:'Cierre ganado',position:2,active:true,kind:'won'},
 {id:'4',slug:'propuesta',label:'Propuesta',position:3,active:false,kind:'open'},
];

async function run(){
 await mount();
 assert.equal(requests.length,2);
 assert.equal(requests[0].url,`/core-api/api/agency/leads?limit=300&fields=${LEAD_LIST_FIELDS}`);assert.equal(requests[1].url,'/core-api/api/agency/pipeline-stages');
 await flush({records:[
  {id:'10',name:'Cliente activo',stage:'diagnostico',amount:'100',currency:'PYG',probability:30},
  {id:'11',name:'Cliente histórico',stage:'propuesta',amount:'50',currency:'PYG',probability:40},
 ]});
 await flush({stages:baseStages});
 const column=(label:string)=>renderer.root.findAll(node=>String(node.props?.['aria-label']||'').startsWith(`${label} ·`));
 assert.equal(String(column('Diagnóstico')[0].props['aria-label']),'Diagnóstico · 1 oportunidades');
 assert.equal(String(column('Cierre ganado')[0].props['aria-label']),'Cierre ganado · 0 oportunidades');
 assert.match(String(column('Nuevo lead')[0].props['aria-label']),/0 oportunidades/,'API stages replace the fixed fallback');
 assert.match(text(column('Propuesta')[0]),/Propuesta · desactivada/,'an inactive stage keeps its historical leads in a read-only column');
 assert.match(text(renderer.root),/Cliente histórico/);assert.match(text(renderer.root),/Cliente activo/);
 // Dragging into an active custom stage sends its slug only: the server preserves the probability.
 const boardHandle=()=>renderer.root.findAll(node=>typeof node.props.onDragEnd==='function')[0];
 const rowsIn=(stage:string)=>({records:[{id:'10',name:'Cliente activo',stage,amount:'100',currency:'PYG',probability:30,email:'hola@cliente.com'}]});
 let board=boardHandle();
 await act(async()=>{board.props.onDragEnd({active:{id:'10'},over:{id:'stage-diagnostico'}});});
 assert.equal(requests[0].url,'/core-api/api/agency/leads/10');assert.equal(requests[0].init.method,'PATCH');
 assert.deepEqual(JSON.parse(String(requests[0].init.body)),{stage:'diagnostico'});
 await flush({record:{}});await flush(rowsIn('diagnostico'));
 // A won stage pins the probability at 100; read-only columns reject drops without a request.
 board=boardHandle();
 await act(async()=>{board.props.onDragEnd({active:{id:'10'},over:{id:'stage-cierre'}});});
 assert.deepEqual(JSON.parse(String(requests[0].init.body)),{stage:'cierre',probability:100});
 await flush({record:{}});await flush(rowsIn('cierre'));
 const before=requests.length;
 await act(async()=>{board.props.onDragEnd({active:{id:'10'},over:{id:'stage-propuesta'}});});
 assert.equal(requests.length,before,'read-only stage columns reject drops');
 act(()=>renderer.root.findAllByType('button').find(node=>text(node).includes('Etapas'))!.props.onClick());
 const createForm=renderer.root.findAll(node=>node.findAllByType('button').some(button=>text(button).includes('Crear etapa')))[0];
 act(()=>createForm.findAllByType('input')[0].props.onChange({target:{value:'Visita técnica'}}));
 act(()=>{createForm.findAllByType('form')[0].props.onSubmit({preventDefault(){}});});
 assert.equal(requests[0].url,'/core-api/api/agency/pipeline-stages');assert.equal(requests[0].init.method,'POST');
 assert.deepEqual(JSON.parse(String(requests[0].init.body)),{label:'Visita técnica',kind:'open'});
 await flush({stage:{id:'5',slug:'visita-tecnica',label:'Visita técnica',position:4,active:true,kind:'open'}});
 assert.equal(requests[0].url,'/core-api/api/agency/pipeline-stages');assert.equal(requests[0].init.method,'GET','stage mutations reload the stage list');
 assert.equal(requests[1].url,`/core-api/api/agency/leads?limit=300&fields=${LEAD_LIST_FIELDS}`,'stage mutations also reload the rows');
 await flush({stages:[...baseStages,{id:'5',slug:'visita-tecnica',label:'Visita técnica',position:4,active:true,kind:'open'}]});
 await flush(rowsIn('diagnostico'));
 assert.match(text(renderer.root),/Visita técnica/);
 act(()=>renderer.root.findByProps({'aria-label':'Nombre de etapa diagnostico'}).props.onChange({target:{value:'Diagnóstico 2'}}));
 act(()=>buttonIn(stageRow('diagnostico'),'Guardar').props.onClick());
 assert.equal(requests[0].url,'/core-api/api/agency/pipeline-stages/2');assert.equal(requests[0].init.method,'PATCH');
 assert.deepEqual(JSON.parse(String(requests[0].init.body)),{label:'Diagnóstico 2',active:true,position:1});
 await flush({stage:{id:'2',slug:'diagnostico',label:'Diagnóstico 2',position:1,active:true,kind:'open'}});
 await flush({stages:[...baseStages.map(stage=>stage.slug==='diagnostico'?{...stage,label:'Diagnóstico 2'}:stage),{id:'5',slug:'visita-tecnica',label:'Visita técnica',position:4,active:true,kind:'open'}]});
 await flush(rowsIn('diagnostico'));
 assert.match(text(renderer.root),/Diagnóstico 2/);
 act(()=>buttonIn(stageRow('visita-tecnica'),'Eliminar').props.onClick());
 assert(buttonIn(stageRow('visita-tecnica'),'Confirmar'),'delete asks for confirmation before calling the API');
 await act(async()=>{buttonIn(stageRow('visita-tecnica'),'Confirmar').props.onClick();});
 assert.equal(requests[0].url,'/core-api/api/agency/pipeline-stages/5');assert.equal(requests[0].init.method,'DELETE');
 await flush({ok:true,deactivated:true,slug:'visita-tecnica'});
 await flush({stages:baseStages});await flush(rowsIn('diagnostico'));
 assert.match(text(renderer.root),/Etapa desactivada/,'a used stage reports deactivation instead of deletion');
 act(()=>renderer.unmount());
 // Fallback: a failed stage read keeps the fixed board and warns with retry (#85).
 await mount();
 assert.equal(requests[0].url,`/core-api/api/agency/leads?limit=300&fields=${LEAD_LIST_FIELDS}`);assert.equal(requests[1].url,'/core-api/api/agency/pipeline-stages');
 await flush({records:[{id:'10',name:'Cliente activo',stage:'lead',amount:'100',currency:'PYG',probability:30}]});
 await flush({error:'Sin conexión'},500);
 const fallback=(label:string)=>String(renderer.root.findAll(node=>String(node.props?.['aria-label']||'').startsWith(`${label} ·`))[0]?.props?.['aria-label']||'');
 for(const [label,count] of [['Nuevo lead','1'],['Contactado','0'],['Perdido','0']] as const)assert.equal(fallback(label),`${label} · ${count} oportunidades`,`${label} keeps the fixed board`);
 assert.match(text(renderer.root),/No se pudieron leer las etapas de esta empresa\. Sin conexión/,'the failed stage read is stated with its real message');
 assert.match(text(renderer.root),/Reintentar/,'the stage fallback offers a retry');
 act(()=>renderer.unmount());
 console.log('PASS: pipeline stages load from the API with a safe fallback and an honest warning, active columns accept drops with slug-only PATCH, won stages pin probability, inactive columns keep historical leads, and Etapas create/edit/delete call the contract endpoints with confirmation.');
}
void run();
