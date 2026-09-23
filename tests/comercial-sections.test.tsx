import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
// El diálogo compartido se mockea (portal + foco) y el compositor deja un
// marcador para verificar que la sección lo monta con el modo correcto.
const dialogPath=require.resolve('../app/dialog');
require.cache[dialogPath]={id:dialogPath,filename:dialogPath,loaded:true,exports:{
 Dialog:({title,children}:{title?:string;children:React.ReactNode})=><section role="dialog" aria-label={title}>{children}</section>,
 FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
 useDialogClose:()=>undefined,
 useDialogPending:()=>undefined,
}} as NodeModule;
const composerPath=require.resolve('../app/quote-composer');
require.cache[composerPath]={id:composerPath,filename:composerPath,loaded:true,exports:{QuoteComposer:({mode,record}:{mode:string;record?:{id?:string}|null})=><output>{`composer:${mode}:${record&&record.id?record.id:'new'}`}</output>}} as NodeModule;
const archivePath=require.resolve('../app/archive-controls');
require.cache[archivePath]={id:archivePath,filename:archivePath,loaded:true,exports:{RemoveRecord:({id}:{id:string})=><button type="button" aria-label={`Mover a la papelera: ${id}`}>Papelera</button>}} as NodeModule;
const growthPath=require.resolve('../app/growth-dashboard');
require.cache[growthPath]={id:growthPath,filename:growthPath,loaded:true,exports:{GrowthDashboard:({events}:{events:{count:number}[]})=><div data-events={events.length}>Tablero de crecimiento</div>}} as NodeModule;
const visitorsPath=require.resolve('../app/live-visitors');
require.cache[visitorsPath]={id:visitorsPath,filename:visitorsPath,loaded:true,exports:{LiveVisitors:()=><div>Viendo ahora</div>}} as NodeModule;
// DnD: el contexto expone el arrastre como un botón para poder dispararlo; el
// evento es configurable por test (etapa destino u `over: null`).
let dragEvent:unknown={active:{id:'10'},over:{id:'stage-won'}};
const dndPath=require.resolve('@dnd-kit/core');
require.cache[dndPath]={id:dndPath,filename:dndPath,loaded:true,exports:{
 DndContext:({children,onDragEnd}:{children:React.ReactNode;onDragEnd:(event:unknown)=>void})=><div>{children}<button type="button" data-drag onClick={()=>onDragEnd(dragEvent)}>arrastrar</button></div>,
 useDraggable:()=>({setNodeRef(){},attributes:{},listeners:{},isDragging:false}),
 useDroppable:()=>({setNodeRef(){},isOver:false}),useSensor:()=>({}),useSensors:()=>[],PointerSensor(){},KeyboardSensor(){},
 pointerWithin:()=>[],rectIntersection:()=>[],
}} as NodeModule;

const {PlanesSection}=require('../app/sections/planes') as typeof import('../app/sections/planes');
const {PipelineSection}=require('../app/sections/pipeline') as typeof import('../app/sections/pipeline');
const {PresupuestosSection}=require('../app/sections/presupuestos') as typeof import('../app/sections/presupuestos');
const {MetricasSection}=require('../app/sections/metricas') as typeof import('../app/sections/metricas');
import type {User} from '../app/workspace-types';

type Pending={url:string;init:RequestInit;resolve:(response:Response)=>void};
let requests:Pending[]=[];
globalThis.fetch=(input,init={})=>new Promise<Response>(resolve=>{requests.push({url:String(input),init,resolve});});
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const user=(role:string):User=>({id:'1',role,organization_id:'7',full_name:'Prueba',organization_slug:''} as unknown as User);
const pending=()=>requests.shift()!;
async function flush(data:unknown,status=200){const request=pending();await act(async()=>{request.resolve(new Response(JSON.stringify(data),{status}));});}

test('planes: una lectura, KPIs reales, estados y editor por rol',async()=>{
 requests=[];let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<PlanesSection user={user('owner')}/>);});
 assert.equal(requests.length,1,'una sola lectura de planes');
 assert.equal(requests[0].url,'/core-api/api/agency/plans');
 assert.equal(renderer.root.findByProps({role:'status'}).props['aria-label'],'Cargando planes…','estado de carga antes de la respuesta');
 await flush({records:[
  {id:'1',name:'Plan integral',currency:'PYG',items:[{description:'Videos',quantity:2,unitPrice:'1000000'}],notes:'Notas',active:true},
  {id:'2',name:'Retainer',currency:'USD',items:[{description:'Contenidos',quantity:1,unitPrice:'500'}],notes:'',active:false},
 ]});
 const copy=text(renderer.root);
 assert.match(copy,/Plan integral/);assert.match(copy,/Retainer/);assert.match(copy,/Archivado/);
 assert.match(copy,/Valor de ítems:[^·]*Gs[^·]*2\.000\.000/,'el KPI usa el comparador para el total');
 assert.match(copy,/Activos1/);assert.match(copy,/Archivados1/);
 // owner edita: alta disponible y el diálogo monta el compositor en modo plan.
 const buttons=()=>renderer.root.findAllByType('button');
 act(()=>buttons().find(button=>text(button).includes('Nuevo plan'))!.props.onClick());
 assert.match(text(renderer.root),/composer:plan:new/);
 act(()=>buttons().find(button=>text(button).includes('Editar'))!.props.onClick());
 assert.match(text(renderer.root),/composer:plan:1/);
 act(()=>renderer.unmount());

 // viewer: sin alta ni edición, misma lectura.
 requests=[];
 await act(async()=>{renderer=create(<PlanesSection user={user('viewer')}/>);});
 assert.equal(requests.length,1);
 await flush({records:[{id:'1',name:'Plan integral',currency:'PYG',items:[],notes:'',active:true}]});
 assert.equal(text(renderer.root).includes('Nuevo plan'),false,'viewer no ve el alta');
 assert.equal(text(renderer.root).includes('Editar'),false,'viewer no ve la edición');
 assert.equal(renderer.root.findAllByProps({role:'dialog'}).length,0);
 act(()=>renderer.unmount());

 // error: bloque con reintento y segunda lectura.
 requests=[];
 await act(async()=>{renderer=create(<PlanesSection user={user('owner')}/>);});
 await flush({error:'falló'},500);
 assert.match(text(renderer.root),/No se pudieron cargar los planes/);
 act(()=>renderer.root.findAllByType('button').find(button=>text(button).includes('Reintentar'))!.props.onClick());
 await act(async()=>{});
 assert.equal(requests.length,1,'el reintento vuelve a leer');
 await flush({records:[]});
 assert.match(text(renderer.root),/Todavía no hay planes guardados/);
 act(()=>renderer.unmount());
});

test('pipeline: KPIs, totales por etapa, tablero y mover a ganado',async()=>{
 requests=[];let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<PipelineSection user={user('owner')} metrics={[]}/>);});
 assert.equal(requests.length,2,'una lectura de oportunidades y una de etapas');
 assert.equal(requests[0].url,'/core-api/api/agency/leads');
 assert.equal(requests[1].url,'/core-api/api/agency/pipeline-stages');
 await flush({records:[
  {id:'10',name:'Cliente activo',stage:'contacted',amount:'3000000',currency:'PYG',probability:50,notes:'Origen: landing Scale OS.',email:'hola@cliente.com'},
  {id:'11',name:'Histórico',stage:'propuesta-vieja',amount:'100',currency:'USD',probability:20},
 ]});
 await flush({stages:[
  {id:'1',slug:'lead',label:'Nuevo lead',position:0,active:true,kind:'open'},
  {id:'2',slug:'contacted',label:'Contactado',position:1,active:true,kind:'open'},
  {id:'3',slug:'won',label:'Ganado',position:2,active:true,kind:'won'},
 ]});
 const copy=text(renderer.root);
 assert.match(copy,/Oportunidades abiertas/);assert.match(copy,/Ganadas/);assert.match(copy,/Consultas web/);
 assert.match(copy,/Valor abierto/);assert.match(copy,/Gs[^0-9]*3\.000\.000/,'los montos abiertos salen de los datos reales');
 assert.match(copy,/Contactado/);assert.match(copy,/propuesta-vieja · desactivada/,'las etapas desconocidas van en solo lectura');
 assert.match(copy,/1\.500\.000 ponderado/,'los totales ponderados por etapa son reales');
 assert.match(copy,/Nueva oportunidad/);
 // Mover a una etapa ganada fija 100%.
 await act(async()=>{renderer.root.findAllByProps({'data-drag':true})[0].props.onClick();});
 const move=pending();
 assert.equal(move.url,'/core-api/api/agency/leads/10');
 assert.equal(move.init.method,'PATCH');
 assert.deepEqual(JSON.parse(String(move.init.body)),{stage:'won',probability:100});
 await act(async()=>{move.resolve(new Response(JSON.stringify({}),{status:200}));});
 await act(async()=>{});
 const reload=pending();
 assert.equal(reload.url,'/core-api/api/agency/leads','el movimiento recarga la lista');
 await act(async()=>{reload.resolve(new Response(JSON.stringify({records:[]}),{status:200}));});
 assert.match(text(renderer.root),/Todavía no hay oportunidades/);
 act(()=>renderer.unmount());

 // viewer: sin alta, sin etapas y sin manija de arrastre.
 requests=[];
 await act(async()=>{renderer=create(<PipelineSection user={user('viewer')} metrics={[]}/>);});
 await flush({records:[{id:'10',name:'Lead',stage:'lead',amount:'1',currency:'PYG',probability:10}]});
 await flush({stages:[{id:'1',slug:'lead',label:'Lead',position:0,active:true,kind:'open'}]});
 const viewerCopy=text(renderer.root);
 assert.equal(viewerCopy.includes('Nueva oportunidad'),false,'viewer no ve el alta');
 assert.equal(viewerCopy.includes('Etapas'),false,'viewer no administra etapas');
 const handles=renderer.root.findAll(node=>String(node.props?.title||'').startsWith('Mover '));assert.equal(handles.length,0,`viewer no recibe la manija (${handles.map(handle=>String(handle.props?.title)).join(',')})`);
 act(()=>renderer.unmount());
});

test('pipeline: el arrastre es optimista, no revierte con la recarga caída y respeta capacidades',async()=>{
 requests=[];let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<PipelineSection user={user('owner')} metrics={[]}/>);});
 await flush({records:[{id:'10',name:'Cliente activo',stage:'contacted',amount:'3000000',currency:'PYG',probability:50}]});
 await flush({stages:[
  {id:'1',slug:'lead',label:'Nuevo lead',position:0,active:true,kind:'open'},
  {id:'2',slug:'contacted',label:'Contactado',position:1,active:true,kind:'open'},
  {id:'3',slug:'won',label:'Ganado',position:2,active:true,kind:'won'},
  {id:'4',slug:'lost',label:'Perdido',position:3,active:true,kind:'lost'},
  {id:'5',slug:'vieja',label:'Vieja',position:4,active:false,kind:'open'},
 ]});
 const column=(label:string)=>renderer.root.findAll(node=>String(node.props?.['aria-label']||'').startsWith(`${label} ·`));
 const drag=async()=>{await act(async()=>{renderer.root.findAllByProps({'data-drag':true})[0].props.onClick();});};

 // Optimista: la tarjeta cambia de columna al soltar, antes de la respuesta.
 dragEvent={active:{id:'10'},over:{id:'stage-won'}};
 await drag();
 assert.match(text(column('Ganado')[0]),/Cliente activo/,'la tarjeta se mueve al soltar, sin esperar al API');
 const move=pending();
 assert.equal(move.url,'/core-api/api/agency/leads/10');
 assert.deepEqual(JSON.parse(String(move.init.body)),{stage:'won',probability:100});
 await act(async()=>{move.resolve(new Response(JSON.stringify({}),{status:200}));});
 await act(async()=>{});
 const failedReload=pending();
 assert.equal(failedReload.url,'/core-api/api/agency/leads');
 await act(async()=>{failedReload.resolve(new Response(JSON.stringify({}),{status:500}));});
 await act(async()=>{});
 assert.match(text(column('Ganado')[0]),/Cliente activo/,'el movimiento local no revierte si la recarga falla');

 // Perdido fija 0% y un PATCH caído revierte la tarjeta a su columna previa.
 dragEvent={active:{id:'10'},over:{id:'stage-lost'}};
 await drag();
 const lostPatch=pending();
 assert.deepEqual(JSON.parse(String(lostPatch.init.body)),{stage:'lost',probability:0});
 await act(async()=>{lostPatch.resolve(new Response(JSON.stringify({}),{status:200}));});
 await act(async()=>{pending().resolve(new Response(JSON.stringify({records:[{id:'10',name:'Cliente activo',stage:'lost',amount:'3000000',currency:'PYG',probability:0}]}),{status:200}));});
 await act(async()=>{});
 assert.match(text(column('Perdido')[0]),/Cliente activo/,'la recarga confirma el movimiento');
 dragEvent={active:{id:'10'},over:{id:'stage-lead'}};
 await drag();
 assert.match(text(column('Nuevo lead')[0]),/Cliente activo/,'optimista hacia una etapa abierta');
 const openPatch=pending();
 assert.deepEqual(JSON.parse(String(openPatch.init.body)),{stage:'lead'},'una etapa abierta conserva la probabilidad cargada');
 await act(async()=>{openPatch.resolve(new Response(JSON.stringify({}),{status:500}));});
 await act(async()=>{});
 assert.match(text(column('Perdido')[0]),/Cliente activo/,'un PATCH caído devuelve la tarjeta a su columna');

 // Etapas inactivas y sueltas fuera del tablero no operan.
 const before=requests.length;
 dragEvent={active:{id:'10'},over:{id:'stage-vieja'}};
 await drag();
 dragEvent={active:{id:'10'},over:null};
 await drag();
 assert.equal(requests.length,before,'ni la etapa inactiva ni soltar afuera llaman al API');
 act(()=>renderer.unmount());

 // collaborator tiene `commercial.manage`: ve el asa y puede mover.
 requests=[];
 await act(async()=>{renderer=create(<PipelineSection user={user('collaborator')} metrics={[]}/>);});
 await flush({records:[{id:'20',name:'Lead colaborador',stage:'lead',amount:'1',currency:'PYG',probability:10}]});
 await flush({stages:[{id:'1',slug:'lead',label:'Lead',position:0,active:true,kind:'open'},{id:'2',slug:'contacted',label:'Contactado',position:1,active:true,kind:'open'}]});
 const handles=renderer.root.findAll(node=>String(node.props?.title||'').startsWith('Mover '));
 assert.equal(handles.length,1,'collaborator ve el asa porque tiene la capacidad del PATCH');
 dragEvent={active:{id:'20'},over:{id:'stage-contacted'}};
 await drag();
 const collaboratorPatch=pending();
 assert.equal(collaboratorPatch.url,'/core-api/api/agency/leads/20');
 assert.deepEqual(JSON.parse(String(collaboratorPatch.init.body)),{stage:'contacted'});
 act(()=>renderer.unmount());
});

test('arrastre: colisión por puntero, touch-action y una sola capacidad',()=>{
 const pipeline=read('app/sections/pipeline.tsx');
 assert.match(pipeline,/collisionDetection=\{detectCollision\}/,'el tablero usa la detección compuesta');
 assert.match(pipeline,/pointerWithin\(args\)/,'la columna bajo el puntero gana la colisión');
 assert.match(pipeline,/rectIntersection\(args\)/,'el teclado mantiene el fallback por rectángulo');
 assert.match(pipeline,/touchAction:'none'/,'el asa cancela el gesto del navegador para poder arrastrar en táctil');
 assert.match(pipeline,/const canMove=canEdit/,'el asa y el PATCH comparten la capacidad');
 assert.doesNotMatch(pipeline,/canMove=\['owner','admin','management','finance','sales'\]/,'no vuelve la lista de roles paralela');
 const composer=read('app/quote-composer.tsx');
 assert.match(composer,/collisionDetection=\{detectCollision\}/,'los ítems y las secciones usan la detección compuesta');
 assert.match(composer,/touchAction:'none'/,'el asa del compositor también es táctil');
});

test('presupuestos: KPIs, filas con encabezado, moneda distinta y estados',async()=>{
 let renderer!:ReactTestRenderer;
 const budgets=[
  {id:'1',number:'P-2026-001',title:'Campaña de lanzamiento',client_name:'Cooperativa del Sur',status:'sent',item_count:3,valid_until:'2026-09-25',subtotal:'1000',total:'1100',currency:'BRL'},
  {id:'2',number:'P-2026-002',title:'Retainer mensual',client_name:'Estudio Ñandú',status:'accepted',item_count:1,valid_until:null,subtotal:'500',total:'550',currency:'PYG'},
 ];
 await act(async()=>{renderer=create(<PresupuestosSection
  loading={false} user={user('owner')} budgetsState="ready" budgets={budgets as never} invoices={[] as never}
  budgetKpis={{totals:new Map([['BRL',1000],['PYG',500]]),drafts:0,accepted:1,expiring:1}} summary={{} as never}
  loadBudgets={()=>{}} setBudgets={()=>{}}
 />);});
 const copy=text(renderer.root);
 assert.match(copy,/Presupuestos/);assert.match(copy,/Borradores/);assert.match(copy,/Aceptadas/);assert.match(copy,/Vencen esta semana/);
 assert.match(copy,/Total sin IVA/);
 assert.equal(renderer.root.findAllByProps({role:'table'}).length,1,'la lista declara su tabla accesible');
 for(const column of ['Presupuesto','Cliente','Estado','Ítems','Vigencia','Sin IVA','Total','Acciones'])assert.match(copy,new RegExp(column),`encabezado ${column}`);
 assert.match(copy,/BRL[^0-9]*1\.000,00/,'un presupuesto en BRL conserva su moneda con la celda de dinero v2');
 assert.match(copy,/Aceptado/);assert.match(copy,/Enviado/);
 act(()=>renderer.unmount());

 // carga sin datos, error con reintento y vacío.
 await act(async()=>{renderer=create(<PresupuestosSection loading user={user('owner')} budgetsState="loading" budgets={[]} invoices={[]} budgetKpis={{totals:new Map(),drafts:0,accepted:0,expiring:0}} summary={{} as never} loadBudgets={()=>{}} setBudgets={()=>{}}/>);});
 assert.equal(renderer.root.findByProps({role:'status'}).props['aria-label'],'Cargando presupuestos…');
 act(()=>renderer.unmount());
 let reloaded=0;
 await act(async()=>{renderer=create(<PresupuestosSection loading={false} user={user('owner')} budgetsState="error" budgets={[]} invoices={[]} budgetKpis={{totals:new Map(),drafts:0,accepted:0,expiring:0}} summary={{} as never} loadBudgets={()=>{reloaded+=1;}} setBudgets={()=>{}}/>);});
 assert.match(text(renderer.root),/No se pudieron cargar los presupuestos/);
 act(()=>renderer.root.findAllByType('button').find(button=>text(button).includes('Reintentar'))!.props.onClick());
 assert.equal(reloaded,1);
 act(()=>renderer.unmount());
 await act(async()=>{renderer=create(<PresupuestosSection loading={false} user={user('owner')} budgetsState="ready" budgets={[]} invoices={[]} budgetKpis={{totals:new Map(),drafts:0,accepted:0,expiring:0}} summary={{} as never} loadBudgets={()=>{}} setBudgets={()=>{}}/>);});
 assert.match(text(renderer.root),/Todavía no hay presupuestos/);
 act(()=>renderer.unmount());
});

test('métricas: acceso por rol y estados sin eventos',async()=>{
 let renderer!:ReactTestRenderer;
 for(const role of ['viewer','sales','finance','management','collaborator']){act(()=>{renderer=create(<MetricasSection user={user(role)} metrics={[]}/>);});assert.equal(renderer.toJSON(),null,`${role} no ve métricas`);act(()=>renderer.unmount());}
 await act(async()=>{renderer=create(<MetricasSection user={user('owner')} metrics={[]}/>);});
 assert.match(text(renderer.root),/Todavía no hay eventos de captación/);
 act(()=>renderer.unmount());
 await act(async()=>{renderer=create(<MetricasSection user={user('admin')} metrics={[{name:'page_view',event_date:'2026-09-22',count:3}] as never}/>);});
 assert.match(text(renderer.root),/Tablero de crecimiento/);
 assert.equal(renderer.root.findByProps({'data-events':1}).props['data-events'],1);
 act(()=>renderer.unmount());
});

console.log('PASS: secciones comerciales v2 — planes, pipeline, presupuestos y métricas con estados, roles, datos reales y móvil sin colapsar');
