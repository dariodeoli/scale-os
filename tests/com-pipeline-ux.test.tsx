import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

// Pipeline UX (SOS-COM, Refs #182): mover a etapa sin arrastrar, convertir a
// cliente visible en la etapa ganada, columnas con 0 oportunidades y totales
// sin recorte. Los paneles laterales y el DnD se simulan como en los demás
// tests del tablero.
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
const dialogPath=require.resolve('../app/dialog');
require.cache[dialogPath]={id:dialogPath,filename:dialogPath,loaded:true,exports:{
 Dialog:({title,children}:{title?:string;children:React.ReactNode})=><section role="dialog" aria-label={title}>{children}</section>,
 FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
 ConfirmDialog:({open=true,title,description,children,error,confirmLabel='Confirmar',onConfirm,onCancel}:{open?:boolean;title?:string;description?:React.ReactNode;children?:React.ReactNode;error?:React.ReactNode;confirmLabel?:string;onConfirm?:()=>void;onCancel?:()=>void})=>open?<section role="dialog" aria-label={title}>{description}{children}{error?<p role="alert">{error}</p>:null}<button type="button" onClick={onCancel}>Cancelar</button><button type="button" onClick={onConfirm}>{confirmLabel}</button></section>:null,
 useDialogClose:()=>undefined,
 useDialogPending:()=>undefined,
}} as NodeModule;
const dynamicPath=require.resolve('next/dynamic');
require.cache[dynamicPath]={id:dynamicPath,filename:dynamicPath,loaded:true,exports:{__esModule:true,default:()=>()=>null}} as NodeModule;
const growthPath=require.resolve('../app/growth-dashboard');
require.cache[growthPath]={id:growthPath,filename:growthPath,loaded:true,exports:{GrowthDashboard:()=><div>Tablero de crecimiento</div>}} as NodeModule;
const visitorsPath=require.resolve('../app/live-visitors');
require.cache[visitorsPath]={id:visitorsPath,filename:visitorsPath,loaded:true,exports:{LiveVisitors:()=><div>Viendo ahora</div>}} as NodeModule;
const dndPath=require.resolve('@dnd-kit/core');
require.cache[dndPath]={id:dndPath,filename:dndPath,loaded:true,exports:{
 DndContext:({children}:{children:React.ReactNode})=><div>{children}</div>,
 useDraggable:()=>({setNodeRef(){},attributes:{},listeners:{},isDragging:false}),
 useDroppable:()=>({setNodeRef(){},isOver:false}),useSensor:()=>({}),useSensors:()=>[],PointerSensor(){},KeyboardSensor(){},
 pointerWithin:()=>[],rectIntersection:()=>[],
}} as NodeModule;

const {LEAD_LIST_FIELDS}=require('../app/shell-data') as typeof import('../app/shell-data');
const {PipelineSection}=require('../app/sections/pipeline') as typeof import('../app/sections/pipeline');
import type {User} from '../app/workspace-types';

type Pending={url:string;init:RequestInit;resolve:(response:Response)=>void};
let requests:Pending[]=[];
globalThis.fetch=(input,init={})=>new Promise<Response>(resolve=>{requests.push({url:String(input),init,resolve});});
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const user=(role:string)=>({id:'1',role,organization_id:'7',full_name:'Prueba',organization_slug:''} as unknown as User);
async function flush(data:unknown,status=200){const pending=requests.shift();assert(pending,'expected a pending request');await act(async()=>{pending!.resolve(new Response(JSON.stringify(data),{status}));});}
const stages=[
 {id:'1',slug:'lead',label:'Nuevo lead',position:0,active:true,kind:'open'},
 {id:'2',slug:'contacted',label:'Contactado',position:1,active:true,kind:'open'},
 {id:'3',slug:'won',label:'Ganado',position:2,active:true,kind:'won'},
];
async function mount(role:string,records:unknown[]){
 requests=[];let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<PipelineSection user={user(role)}/>);});
 assert.equal(requests[0].url,`/core-api/api/agency/leads?limit=300&fields=${LEAD_LIST_FIELDS}`);
 await flush({records});await flush({stages});
 return renderer;
}
const menuOf=(renderer:ReactTestRenderer,name:string)=>renderer.root.findAll(node=>typeof node.type!=='string'&&node.props.label===`Acciones de la oportunidad: ${name}`&&Array.isArray(node.props.items))[0];
const quickConvert=(renderer:ReactTestRenderer)=>renderer.root.findAllByType('button').filter(button=>String(button.props['aria-label']||'').startsWith('Convertir a cliente:'));
const dialogs=(renderer:ReactTestRenderer)=>renderer.root.findAllByProps({role:'dialog'});

async function run(){
 // 1. Mover a etapa desde el menu: mismo PATCH que el arrastre (solo el slug en etapas abiertas).
 let renderer=await mount('owner',[{id:'10',name:'Lead movil',stage:'lead',amount:'100',currency:'PYG',probability:10}]);
 const move=menuOf(renderer,'Lead movil').props.items.find((item:{id:string})=>item.id==='move');
 assert.equal(move.label,'Mover a etapa…');
 act(()=>{move.onClick();});
 assert.equal(dialogs(renderer).length,1,'el menu abre el selector de etapa');
 const picker=renderer.root.findAll(node=>typeof node.type!=='string'&&node.props.label==='Etapa de destino'&&typeof node.props.onChange==='function')[0];
 act(()=>{picker.props.onChange('contacted');});
 await act(async()=>{dialogs(renderer)[0].findByType('form').props.onSubmit({preventDefault(){}});});
 assert.equal(requests[0].url,'/core-api/api/agency/leads/10');assert.equal(requests[0].init.method,'PATCH');
 assert.deepEqual(JSON.parse(String(requests[0].init.body)),{stage:'contacted'});
 assert.match(String(renderer.root.findAll(node=>String(node.props?.['aria-label']||'').startsWith('Contactado ·'))[0].props['aria-label']),/1 oportunidades/,'el movimiento es optimista');
 await flush({record:{}});await flush({records:[{id:'10',name:'Lead movil',stage:'contacted',amount:'100',currency:'PYG',probability:10}]});
 assert.equal(dialogs(renderer).length,0);
 act(()=>renderer.unmount());

 // 2. Convertir: accion rapida solo en la etapa ganada y solo con capacidad; el menu la ofrece en cualquier etapa.
 const rows=[
  {id:'20',name:'Ganado sin cliente',stage:'won',amount:'1',currency:'PYG',probability:100,client_id:null},
  {id:'21',name:'Ganado ya cliente',stage:'won',amount:'1',currency:'PYG',probability:100,client_id:'5'},
  {id:'22',name:'Abierto',stage:'lead',amount:'1',currency:'PYG',probability:10},
 ];
 renderer=await mount('owner',rows);
 assert.deepEqual(quickConvert(renderer).map(button=>button.props['aria-label']),['Convertir a cliente: Ganado sin cliente'],'solo la tarjeta ganada y sin cliente muestra la accion rapida');
 const ids=(name:string)=>menuOf(renderer,name).props.items.map((item:{id:string})=>item.id);
 assert.deepEqual(ids('Abierto'),['move','convert'],'el menu ofrece convertir en cualquier etapa');
 assert.deepEqual(ids('Ganado ya cliente'),['move'],'un lead ya convertido no ofrece convertir');
 await act(async()=>{quickConvert(renderer)[0].props.onClick();});
 assert.match(text(renderer.root),/¿Convertir a Ganado sin cliente en cliente\?/,'la accion pide confirmacion no bloqueante');
 await act(async()=>{dialogs(renderer)[0].findByType('form').props.onSubmit({preventDefault(){}});});
 assert.equal(requests[0].url,'/core-api/api/agency/leads/20/convert');assert.equal(requests[0].init.method,'POST');
 await flush({record:{}});await flush({records:rows});
 act(()=>renderer.unmount());
 renderer=await mount('viewer',rows);
 assert.equal(quickConvert(renderer).length,0,'viewer no ve convertir');
 assert.equal(menuOf(renderer,'Abierto'),undefined,'viewer no ve el menu de acciones');
 assert.doesNotMatch(text(renderer.root),/Mover a etapa|Nueva oportunidad/);
 act(()=>renderer.unmount());

 // 3. Sin oportunidades: las etapas siguen visibles y cada columna crea en su etapa.
 renderer=await mount('owner',[]);
 for(const label of ['Nuevo lead','Contactado','Ganado'])assert.match(String(renderer.root.findAll(node=>String(node.props?.['aria-label']||'').startsWith(`${label} ·`))[0]?.props['aria-label']),/0 oportunidades/,`${label} se dibuja vacia`);
 assert.doesNotMatch(text(renderer.root),/Todavía no hay oportunidades/,'el vacio global solo aparece sin etapas');
 const create1=renderer.root.findAllByType('button').find(button=>button.props['aria-label']==='Nueva oportunidad en Contactado')!;
 act(()=>{create1.props.onClick();});
 const stageField=renderer.root.findAll(node=>typeof node.type!=='string'&&node.props.label==='Etapa'&&typeof node.props.onChange==='function')[0];
 assert.equal(stageField.props.value,'contacted','el alta arranca en la etapa de la columna');
 act(()=>renderer.unmount());
 renderer=await mount('viewer',[]);
 assert.equal(renderer.root.findAllByType('button').filter(button=>String(button.props['aria-label']||'').startsWith('Nueva oportunidad en')).length,0,'viewer no crea desde la columna');
 act(()=>renderer.unmount());

 // 4. Totales por etapa: montos nowrap y la etiqueta es la que baja de linea.
 renderer=await mount('owner',[{id:'30',name:'Con monto',stage:'lead',amount:'123456789',currency:'PYG',probability:50}]);
 const totals=renderer.root.findAll(node=>node.type==='span'&&String(node.props.title||'').includes('ponderado y abierto'))[0];
 assert.match(String(totals.props.className),/flex-wrap/);assert.doesNotMatch(String(totals.props.className),/truncate/);
 assert.match(String(totals.findAll(node=>node.type==='span'&&/whitespace-nowrap/.test(String(node.props.className||'')))[0].props.className),/tabular-nums/);
 act(()=>renderer.unmount());
 console.log('PASS: pipeline UX (#182): mover a etapa por menu con el mismo PATCH, convertir visible solo en ganado y con capacidad, columnas vacias con alta por etapa y totales sin recorte.');
}
void run();
