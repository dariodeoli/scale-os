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

const {LEAD_LIST_FIELDS,BUDGET_LIST_FIELDS}=require('../app/shell-data') as typeof import('../app/shell-data');
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
 assert.equal(requests[0].url,`/core-api/api/agency/leads?fields=${LEAD_LIST_FIELDS}`);
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
 assert.equal(reload.url,`/core-api/api/agency/leads?fields=${LEAD_LIST_FIELDS}`,'el movimiento recarga la lista proyectada');
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
 assert.equal(failedReload.url,`/core-api/api/agency/leads?fields=${LEAD_LIST_FIELDS}`);
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

test('presupuestos: lote con tope, confirmación y refresco',async()=>{
 let renderer!:ReactTestRenderer;
 const feedback:{message:string;tone:string}[]=[];
 const win=new EventTarget();
 (globalThis as {window?:unknown}).window=win;
 win.addEventListener('scale:feedback',event=>feedback.push((event as CustomEvent<{message:string;tone:string}>).detail));
 const budget=(index:number)=>({id:String(index+1),number:`P-2026-${String(index+1).padStart(3,'0')}`,title:`Propuesta ${index+1}`,client_name:'Cliente de prueba',status:'draft',item_count:1,valid_until:null,subtotal:'100',total:'110',currency:'PYG'});
 const budgets=Array.from({length:51},(_,index)=>budget(index));
 const refreshed:unknown[]=[];
 const mount=(role:string,list:unknown[])=>act(async()=>{renderer=create(<PresupuestosSection loading={false} user={user(role)} budgetsState="ready" budgets={list as never} invoices={[] as never} budgetKpis={{totals:new Map(),drafts:list.length,accepted:0,expiring:0}} summary={{} as never} loadBudgets={()=>{}} setBudgets={value=>refreshed.push(value)}/>);});
 const copy=()=>text(renderer.root);
 const button=(label:string)=>renderer.root.findAllByType('button').find(candidate=>text(candidate).includes(label))!;
 const boxes=()=>renderer.root.findAllByType('input').filter(input=>input.props.type==='checkbox');

 // owner: barra, casillas por fila con target de 44 px y tope por llamada.
 await mount('owner',budgets);
 assert.match(copy(),/Seleccioná varios para operar en lote · máximo 50/);
 assert.equal(boxes().length,51,'una casilla por fila');
 assert.ok(renderer.root.findAll(node=>typeof node.props.className==='string'&&node.props.className.startsWith('select-check')).every(node=>node.props.className.includes('h-11 w-11')),'las casillas reservan un target de 44 px');
 act(()=>button('Seleccionar visibles').props.onClick());
 assert.match(copy(),/50 de 50 seleccionados/,'la selección visible se recorta al tope del endpoint');
 assert.match(feedback.at(-1)!.message,/hasta 50 presupuestos/);
 assert.ok(boxes().slice(0,50).every(box=>box.props.checked),'quedan seleccionados los primeros 50');
 assert.equal(boxes()[50].props.checked,false,'el 51 no entra en el lote');
 act(()=>boxes()[0].props.onChange());
 assert.match(copy(),/49 de 50 seleccionados/);
 act(()=>boxes()[50].props.onChange());
 assert.match(copy(),/50 de 50 seleccionados/,'se puede sumar otro al liberar un lugar');

 // Confirmación explícita antes de mover y POST al endpoint del lote.
 act(()=>button('Mover a la papelera').props.onClick());
 const dialog=renderer.root.findByProps({role:'dialog'});
 assert.match(text(dialog),/50 presupuestos/);
 assert.match(text(dialog),/El enlace público dejará de funcionar/);
 requests=[];
 await act(async()=>{button('Confirmar: mover a papelera').props.onClick();});
 const batch=pending();
 assert.equal(batch.url,'/core-api/api/agency/budgets/batch');
 assert.equal(String(batch.init.method||'POST').toUpperCase(),'POST');
 assert.equal((JSON.parse(String(batch.init.body)) as {ids:string[]}).ids.length,50);
 await act(async()=>{batch.resolve(new Response(JSON.stringify({updated:50}),{status:200}));});
 const list=pending();
 assert.equal(list.url,`/core-api/api/agency/budgets?fields=${BUDGET_LIST_FIELDS}`,'el refresco usa la lista proyectada del contrato');
 await act(async()=>{list.resolve(new Response(JSON.stringify({budgets:[budget(50)]}),{status:200}));});
 assert.equal(refreshed.length,1,'el refresco baja al estado del shell');
 assert.equal(feedback.at(-1)!.message,'50 presupuestos movidos a la papelera.');
 assert.equal(feedback.at(-1)!.tone,'success');
 assert.equal(renderer.root.findAllByProps({role:'dialog'}).length,0,'el diálogo se cierra al terminar');
 assert.match(copy(),/Seleccioná varios para operar en lote/,'la selección se limpia');
 act(()=>renderer.unmount());

 // viewer: sin barra ni casillas (la capacidad manda).
 requests=[];
 await mount('viewer',budgets.slice(0,2));
 assert.equal(boxes().length,0,'viewer no selecciona');
 assert.equal(copy().includes('Seleccionar visibles'),false);
 assert.equal(copy().includes('Mover a la papelera'),false);
 act(()=>renderer.unmount());
 delete (globalThis as {window?:unknown}).window;
});

test('accesibilidad AA COM: celdas con rol, anuncios en castellano y movimiento reducido (#60)',async()=>{
 let renderer!:ReactTestRenderer;
 const clientes=read('app/sections/clientes.tsx');
 const presupuestos=read('app/sections/presupuestos.tsx');
 const pipeline=read('app/sections/pipeline.tsx');
 const composer=read('app/quote-composer.tsx');
 const dashboard=read('app/growth-dashboard.tsx');
 // Listas: cada celda declara su rol (axe `aria-required-children`); la última
 // celda de acciones sale de `ListActions` (primitiva común, #63).
 assert.equal((clientes.match(/role="cell"/g)||[]).length,5,'la fila de clientes declara sus cinco celdas propias');
 assert.match(clientes,/<ListActions/,'la sexta celda de clientes es la primitiva fija');
 assert.equal((presupuestos.match(/role="cell"/g)||[]).length,7,'la fila de presupuestos declara sus siete celdas propias');
 assert.match(presupuestos,/<ListActions/,'la octava celda de presupuestos es la primitiva fija');
 await act(async()=>{renderer=create(<PresupuestosSection loading={false} user={user('owner')} budgetsState="ready" budgets={[{id:'1',number:'P-1',title:'Propuesta',client_name:'Cliente',status:'sent',item_count:1,valid_until:null,subtotal:'100',total:'110',currency:'PYG'},{id:'2',number:'P-2',title:'Otra',client_name:'Cliente',status:'draft',item_count:1,valid_until:null,subtotal:'100',total:'110',currency:'PYG'}] as never} invoices={[] as never} budgetKpis={{totals:new Map(),drafts:1,accepted:0,expiring:0}} summary={{} as never} loadBudgets={()=>{}} setBudgets={()=>{}}/>);});
 assert.equal(renderer.root.findAllByProps({role:'cell'}).length,16,'las filas renderizadas exponen celdas, no hijos sueltos');
 act(()=>renderer.unmount());
 // Arrastre: anuncios e instrucciones en castellano, con la alternativa por botones.
 for(const [name,source] of [['pipeline',pipeline],['compositor',composer]] as const){
  assert.match(source,/accessibility=\{/,`${name}: el DndContext recibe la accesibilidad`);
  assert.match(source,/screenReaderInstructions/,`${name}: instrucciones para lectores de pantalla`);
  assert.match(source,/onDragStart[\s\S]*onDragOver[\s\S]*onDragEnd[\s\S]*onDragCancel/,`${name}: anuncia levantar, mover, soltar y cancelar`);
  assert.match(source,/Levantaste/,'anuncio en castellano');
  assert.match(source,/motion-reduce:transition-none/,'las transiciones se apagan con movimiento reducido');
 }
 assert.match(pipeline,/se movió a \$\{stageName\(over\.id\)\}/,'el tablero nombra la etapa destino');
 assert.match(composer,/Subir y Bajar/,'el compositor recuerda la alternativa por teclado');
 assert.match(composer,/itemLabel/,'las asas distinguen ítem de sección');
 assert.match(dashboard,/motion-reduce:transition-none/,'las barras de crecimiento respetan movimiento reducido');
 // Targets: casilla de 44 px en móvil y 32 px en la fila densa de escritorio.
 assert.match(presupuestos,/select-check flex h-11 w-11 shrink-0 items-center justify-center md:h-8 md:w-8/,'la casilla del presupuesto reserva el target por densidad');
 assert.match(read('app/client-directory.css'),/\.client-hub-row \.select-check[^{]*\{min-width:44px;min-height:44px/,'la casilla de clientes reserva 44 px en la fila');
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

test('recorte de payload: la ventana de 300 órdenes no alcanza a las secciones COM',async()=>{
 const {ORDER_WINDOW,shellDataUrl,sectionScope}=await import('../app/shell-data');
 assert.equal(ORDER_WINDOW,300,'la ventana del shell es explícita');
 assert.equal(shellDataUrl('orders',{limit:ORDER_WINDOW}),'/core-api/api/agency/work-orders?limit=300','la URL lleva el recorte');
 assert.equal(shellDataUrl('orders'),'/core-api/api/agency/work-orders','sin recorte pide la lista completa');
 for(const section of ['Pipeline','Presupuestos','Métricas']){
  const scope=sectionScope(section);
  assert.equal(scope.orders?.limit,ORDER_WINDOW,`${section} pide la ventana de órdenes`);
  assert.ok(scope.clients&&scope.projects,`${section} conserva clientes y proyectos para el buscador y la presencia`);
 }
 assert.equal(sectionScope('Producción').orders,undefined,'Producción no pide órdenes: el tablero las carga por columna (board-data)');
 // #71: Resumen usa la ventana del shell para buscador/alertas/planificador y
 // el resumen para los conteos exactos por etapa.
 assert.equal(sectionScope('Resumen').orders?.limit,ORDER_WINDOW,'Resumen pide la ventana de órdenes');
 assert.ok(sectionScope('Resumen').summary,'Resumen pide el resumen con los conteos por etapa');
 // Las secciones COM no leen órdenes: listas, KPIs y totales salen de sus propios recursos.
 for(const file of ['app/sections/pipeline.tsx','app/sections/presupuestos.tsx','app/sections/metricas.tsx']){
  const source=read(file);
  assert.doesNotMatch(source,/\bwork-orders\b|\borders\b/ ,`${file} no lee órdenes`);
  assert.doesNotMatch(source,/shellDataUrl|sectionScope|ORDER_WINDOW/,`${file} no depende del recorte del shell`);
 }
 const pipeline=read('app/sections/pipeline.tsx');
 assert.match(pipeline,/projectedList\('leads','\/api\/agency\/leads',LEAD_LIST_FIELDS/,'el tablero lee las oportunidades con proyección optimista (#67/#71)');
 assert.match(pipeline,/api<\{stages:RawRow\[\]\}>\('\/api\/agency\/pipeline-stages'\)/,'y todas las etapas');
 const presupuestos=read('app/sections/presupuestos.tsx');
 assert.match(presupuestos,/projectedList\('budgets','\/api\/agency\/budgets',BUDGET_LIST_FIELDS/,'la lista de presupuestos adopta la proyección (#67/#71)');
 assert.match(read('app/scale-workspace.tsx'),/projectedList\('budgets',"\/api\/agency\/budgets",BUDGET_LIST_FIELDS/,'el shell también proyecta la carga inicial de presupuestos');
});

test('más de 300 ítems: listas, KPIs y totales siguen completos',async()=>{
 // Pipeline: 350 oportunidades repartidas en dos etapas activas.
 const {pipelineSummary,stageTotals}=await import('../app/pipeline-summary');
 const leads=Array.from({length:350},(_,index)=>({id:String(index+1),name:`Lead ${index+1}`,stage:index%2===0?'lead':'contacted',amount:'1000',currency:index%3===0?'USD':'PYG',probability:50}));
 const summary=pipelineSummary(leads as never);
 assert.equal(summary.open,350,'ninguna oportunidad se pierde en el resumen');
 assert.equal(summary.amounts.PYG+summary.amounts.USD,350*1000,'los montos abiertos suman completo');
 const stages=[{slug:'lead',label:'Lead',position:0,active:true,kind:'open' as const},{slug:'contacted',label:'Contactado',position:1,active:true,kind:'open' as const}];
 const totals=stageTotals(leads as never,stages);
 assert.equal(totals.reduce((count,entry)=>count+entry.count,0),350,'las columnas cuentan las 350 filas');
 assert.equal(totals[0].weighted.USD+totals[0].weighted.PYG+totals[1].weighted.USD+totals[1].weighted.PYG,350*1000*0.5,'los ponderados no se truncan');
 // Tablero: monta con 350 oportunidades y conserva los conteos de las columnas.
 requests=[];let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<PipelineSection user={user('owner')} metrics={[]}/>);});
 await flush({records:leads});
 await flush({stages:[{id:'1',slug:'lead',label:'Lead',position:0,active:true,kind:'open'},{id:'2',slug:'contacted',label:'Contactado',position:1,active:true,kind:'open'}]});
 const board=text(renderer.root);
 assert.match(board,/350/,'los KPIs cuentan las 350 oportunidades');
 const columns=renderer.root.findAll(node=>String(node.props?.['aria-label']||'').startsWith('Lead ·'));
 assert.match(String(columns[0].props['aria-label']),/175 oportunidades/,'la columna conserva su conteo completo');
 act(()=>renderer.unmount());
 // Métricas: 310 eventos dentro de la ventana suman completo.
 const {growthSeries}=await import('../app/growth-dashboard-data');
 const today=new Date(2026,8,22);
 const events=Array.from({length:310},()=>({name:'page_view',event_date:'2026-09-20',count:1}));
 const series=growthSeries(events as never,30,today);
 assert.equal(series.sum('page_view'),310,'los eventos de la ventana suman completo');
 assert.equal(series.points.length,30,'la serie conserva todos los días');
 // Presupuestos: 350 filas renderizadas con sus KPIs.
 const budgets=Array.from({length:350},(_,index)=>({id:String(index+1),number:`P-2026-${String(index+1).padStart(3,'0')}`,title:`Presupuesto ${index+1}`,client_name:'Cooperativa del Sur',status:'sent',item_count:1,valid_until:'2026-10-30',subtotal:'1000',total:'1100',currency:'PYG'}));
 await act(async()=>{renderer=create(<PresupuestosSection loading={false} user={user('owner')} budgetsState="ready" budgets={budgets as never} invoices={[] as never} budgetKpis={{totals:new Map([['PYG',350*1100]]),drafts:0,accepted:0,expiring:350}} summary={{} as never} loadBudgets={()=>{}} setBudgets={()=>{}}/>);});
 assert.equal(renderer.root.findAllByProps({role:'rowgroup'})[0].children.length,350,'la lista renderiza las 350 filas');
 assert.match(text(renderer.root),/350/,'el KPI usa la lista completa');
 assert.match(text(renderer.root),/Total sin IVA/,'el total agregado sigue presente');
 assert.equal(renderer.root.findAllByProps({role:'table'}).length,1,'una sola tabla accesible');
 act(()=>renderer.unmount());
});

console.log('PASS: secciones comerciales v2 — planes, pipeline, presupuestos y métricas con estados, roles, datos reales y móvil sin colapsar');
