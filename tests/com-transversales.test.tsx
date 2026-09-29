import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

// §15 transversales (owncoding-ui v0.51.0) en la vertical COM (#85):
// cuatro estados con acción/reintento, cero éxito falso, microcopy es-PY,
// formato único y copias locales reemplazadas por objetos de la librería.
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};

const dialogPath=require.resolve('../app/dialog');
require.cache[dialogPath]={id:dialogPath,filename:dialogPath,loaded:true,exports:{
 Dialog:({title,children}:{title?:string;children:React.ReactNode})=><section role="dialog" aria-label={title}>{children}</section>,
 FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
 useDialogClose:()=>undefined,
 useDialogPending:()=>undefined,
}} as NodeModule;
const suitePath=require.resolve('../app/suite');
require.cache[suitePath]={id:suitePath,filename:suitePath,loaded:true,exports:{
 RecordEditor:()=>null,
 BudgetActions:()=><button type="button">Abrir presupuesto</button>,
}} as NodeModule;
const archivePath=require.resolve('../app/archive-controls');
require.cache[archivePath]={id:archivePath,filename:archivePath,loaded:true,exports:{
 RemoveRecord:({name}:{name:string})=><button type="button" aria-label={`Mover a la papelera: ${name}`}>Papelera</button>,
}} as NodeModule;
const growthPath=require.resolve('../app/growth-dashboard');
require.cache[growthPath]={id:growthPath,filename:growthPath,loaded:true,exports:{GrowthDashboard:({events}:{events:unknown[]})=><div data-events={events.length}>Tablero de crecimiento</div>}} as NodeModule;
const visitorsPath=require.resolve('../app/live-visitors');
require.cache[visitorsPath]={id:visitorsPath,filename:visitorsPath,loaded:true,exports:{LiveVisitors:()=><div>Viendo ahora</div>}} as NodeModule;
const dndPath=require.resolve('@dnd-kit/core');
require.cache[dndPath]={id:dndPath,filename:dndPath,loaded:true,exports:{
 DndContext:({children}:{children:React.ReactNode})=><div>{children}</div>,
 useDraggable:()=>({setNodeRef(){},attributes:{},listeners:{},isDragging:false}),
 useDroppable:()=>({setNodeRef(){},isOver:false}),useSensor:()=>({}),useSensors:()=>[],PointerSensor(){},KeyboardSensor(){},
 pointerWithin:()=>[],rectIntersection:()=>[],
}} as NodeModule;

const {ClientesSection}=require('../app/sections/clientes') as typeof import('../app/sections/clientes');
const {PipelineSection}=require('../app/sections/pipeline') as typeof import('../app/sections/pipeline');
const {MetricasSection}=require('../app/sections/metricas') as typeof import('../app/sections/metricas');
import type {User} from '../app/workspace-types';

type Pending={url:string;init:RequestInit;resolve:(response:Response)=>void};
let requests:Pending[]=[];
globalThis.fetch=(input,init={})=>new Promise<Response>(resolve=>{requests.push({url:String(input),init,resolve});});
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const user=(role='owner')=>({id:'1',role,organization_id:'7',full_name:'Prueba',organization_slug:''} as unknown as User);
const button=(renderer:ReactTestRenderer,label:string)=>renderer.root.findAllByType('button').find(candidate=>text(candidate).includes(label));
const flush=async(data:unknown,status=200)=>{const pending=requests.shift()!;await act(async()=>{pending.resolve(new Response(JSON.stringify(data),{status}));});};
const nodeFor=()=>({clientWidth:1400});

test('clientes: el fallo de la lectura muestra error con reintento, nunca un directorio vacío',async()=>{
 let loaded=0;
 let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<ClientesSection
  dataState="error" user={user()} clientView="list" clientStatusFilter="" setClientStatusFilter={()=>{}}
  clientSearch="" setClientSearch={()=>{}} archiveBusy="" bulkBusy={false} selectedClients={[]} setSelectedClients={()=>{}}
  canSeeBilling={false} canManageClients clients={[]} displayedClients={[]} liveClients={[]}
  archivedClients={[]} paymentStatuses={[]} clientHubStats={new Map()} commercialSummary={null} commercialState="idle"
  directoryKpis={{active:0,paused:0,activeProjects:0,deliveries:0}} cobrosKpis={{alDia:0,porVencer:0,enMora:0,sinFactura:0}}
  load={async()=>{loaded+=1;}} setClientArchive={async()=>{}} toggleClientSelected={()=>{}} selectVisibleClients={()=>{}} batchClients={async()=>{}}
  setDetail={()=>{}}/>,{createNodeMock:nodeFor});});
 const copy=text(renderer.root);
 assert.match(copy,/No se pudieron cargar los clientes/,'el error tiene su estado propio');
 assert.match(copy,/Revisá la conexión y volvé a intentar/,'microcopy accionable');
 assert.doesNotMatch(copy,/Todavía no hay clientes/,'un fallo no se disfraza de directorio vacío');
 act(()=>button(renderer,'Reintentar')!.props.onClick());
 assert.equal(loaded,1,'el reintento vuelve a leer');
 act(()=>renderer.unmount());

 // Con la última lista cargada el aviso es de actualización, no un vacío.
 await act(async()=>{renderer=create(<ClientesSection
  dataState="error" user={user()} clientView="list" clientStatusFilter="" setClientStatusFilter={()=>{}}
  clientSearch="" setClientSearch={()=>{}} archiveBusy="" bulkBusy={false} selectedClients={[]} setSelectedClients={()=>{}}
  canSeeBilling={false} canManageClients clients={[{id:'9',name:'Cliente',active:true,email:'',phone:'',tax_id:''} as never]} displayedClients={[{id:'9',name:'Cliente',active:true,email:'',phone:'',tax_id:''} as never]} liveClients={[{id:'9',name:'Cliente',active:true,email:'',phone:'',tax_id:''} as never]}
  archivedClients={[]} paymentStatuses={[]} clientHubStats={new Map()} commercialSummary={null} commercialState="idle"
  directoryKpis={{active:1,paused:0,activeProjects:0,deliveries:0}} cobrosKpis={{alDia:0,porVencer:0,enMora:0,sinFactura:0}}
  load={async()=>{loaded+=1;}} setClientArchive={async()=>{}} toggleClientSelected={()=>{}} selectVisibleClients={()=>{}} batchClients={async()=>{}}
  setDetail={()=>{}}/>,{createNodeMock:nodeFor});});
 assert.match(text(renderer.root),/No se pudieron actualizar los clientes. Se muestra la última lista cargada/);
 act(()=>renderer.unmount());
});

test('clientes: archivar en lote pide confirmación, informa el resultado real y deja el error inline',async()=>{
 const calls:boolean[]=[];
 let renderer!:ReactTestRenderer;
 const client={id:'9',name:'Cliente sin plan',active:true,created_at:'2025-01-10',email:'',phone:'',tax_id:'',logo_url:null,color_key:'violet',has_recurring_price:false};
 const mount=(batch:(archived:boolean)=>Promise<void>) => act(async()=>{renderer=create(<ClientesSection
  dataState="ready" user={user()} clientView="list" clientStatusFilter="" setClientStatusFilter={()=>{}}
  clientSearch="" setClientSearch={()=>{}} archiveBusy="" bulkBusy={false} selectedClients={['9']} setSelectedClients={()=>{}}
  canSeeBilling={false} canManageClients clients={[client as never]} displayedClients={[client as never]} liveClients={[client as never]}
  archivedClients={[]} paymentStatuses={[]} clientHubStats={new Map()} commercialSummary={null} commercialState="idle"
  directoryKpis={{active:1,paused:0,activeProjects:0,deliveries:0}} cobrosKpis={{alDia:0,porVencer:0,enMora:0,sinFactura:0}}
  load={async()=>{}} setClientArchive={async()=>{}} toggleClientSelected={()=>{}} selectVisibleClients={()=>{}} batchClients={async archived=>{calls.push(archived);await batch(archived);}}
  setDetail={()=>{}}/>,{createNodeMock:nodeFor});});
 // Fallo del API: el diálogo queda abierto con el error a la vista.
 await mount(async()=>{throw new Error('El lote no se pudo aplicar.');});
 act(()=>button(renderer,'Archivar')!.props.onClick());
 const dialog=()=>renderer.root.findAllByProps({role:'dialog'})[0];
 assert.ok(dialog(),'archivar abre confirmación');
 assert.match(text(dialog()),/Quedará en la Papelera|quedarán en la Papelera/,'la confirmación explica el destino');
 assert.equal(calls.length,0,'nada se archiva sin confirmar');
 await act(async()=>{button(renderer,'Confirmar: archivar')!.props.onClick();});
 assert.deepEqual(calls,[true],'confirmar llama al contrato del lote');
 assert.match(text(dialog()),/El lote no se pudo aplicar/,'el error del API queda inline en el diálogo');
 assert.ok(dialog(),'el diálogo no se cierra sobre un error');
 act(()=>renderer.unmount());
 // Éxito: el diálogo se cierra al confirmar.
 calls.length=0;
 await mount(async()=>{});
 act(()=>button(renderer,'Archivar')!.props.onClick());
 await act(async()=>{button(renderer,'Confirmar: archivar')!.props.onClick();});
 assert.equal(renderer.root.findAllByProps({role:'dialog'}).length,0,'el diálogo se cierra al terminar');
 act(()=>renderer.unmount());
});

test('pipeline: la tarjeta no inventa monto ni probabilidad y el ponderado sale de la definición única',async()=>{
 requests=[];let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<PipelineSection user={user()}/>);});
 await flush({records:[{id:'10',name:'Lead sin datos',stage:'lead',amount:'',currency:'PYG',probability:''}]});
 await flush({stages:[{id:'1',slug:'lead',label:'Lead',position:0,active:true,kind:'open'},{id:'2',slug:'won',label:'Ganado',position:1,active:true,kind:'won'}]});
 const card=renderer.root.findAllByType('article').find(node=>text(node).includes('Lead sin datos'))!;
 const cardText=text(card);
 assert.match(cardText,/Sin probabilidad cargada/,'la probabilidad ausente se dice');
 assert.doesNotMatch(cardText,/0%/,'nunca se inventa una probabilidad 0');
 assert.match(cardText,/—/,'el monto ausente deja el vacío explícito');
 const copy=text(renderer.root);
 assert.doesNotMatch(copy,/Gs\. 0\b/,'nunca se inventa un monto 0 en los totales');
 assert.doesNotMatch(copy,/ponderado/,'sin montos no se inventa un ponderado en la columna');
 act(()=>renderer.unmount());
});

test('métricas: cargando, error con reintento y vacío con acción',async()=>{
 let renderer!:ReactTestRenderer,retries=0;
 const mount=(state:'loading'|'error'|'ready',metrics:unknown[])=>act(async()=>{renderer=create(<MetricasSection user={user('owner')} metrics={metrics as never} state={state} error="Sin conexión" onRetry={()=>{retries+=1;}}/>);});
 await mount('loading',[]);
 assert.ok(renderer.root.findAllByProps({role:'status'}).some(node=>node.props['aria-label']==='Cargando métricas…'),'estado de carga propio');
 assert.equal(button(renderer,'Volver a consultar'),undefined,'mientras carga no se ofrece el vacío');
 act(()=>renderer.unmount());
 await mount('error',[]);
 assert.match(text(renderer.root),/No se pudieron cargar las métricas/);
 assert.match(text(renderer.root),/Sin conexión/,'el error real se muestra');
 act(()=>button(renderer,'Reintentar')!.props.onClick());
 assert.equal(retries,1,'el reintento vuelve a leer');
 act(()=>renderer.unmount());
 await mount('ready',[]);
 assert.match(text(renderer.root),/Todavía no hay eventos de captación/);
 act(()=>button(renderer,'Volver a consultar')!.props.onClick());
 assert.equal(retries,2,'el vacío ofrece la acción real');
 act(()=>renderer.unmount());
 await mount('error',[{name:'page_view',event_date:'2026-09-22',count:3}]);
 assert.match(text(renderer.root),/No se pudieron actualizar las métricas/,'con última lectura el aviso es de actualización');
 assert.match(text(renderer.root),/Tablero de crecimiento/,'la última lectura real se conserva');
 act(()=>renderer.unmount());
});

test('copias locales reemplazadas por la librería (§15.5) y resultado con el tono correcto',()=>{
 const due=read('app/list-format.tsx');
 assert.match(due,/from 'owncoding-ui'/,'el vencimiento usa la librería');
 assert.doesNotMatch(due,/Intl\.DateTimeFormat/,'sin copia local del cálculo de días');
 const clientFormat=read('app/client-format.ts');
 assert.match(clientFormat,/import \{diasHasta\} from 'owncoding-ui\/utils'/);
 assert.doesNotMatch(clientFormat,/asuncionDay/,'sin copia local del día de Asunción');
 const dashboard=read('app/growth-dashboard.tsx');
 assert.match(dashboard,/formatoNumero\(current\)/,'los conteos usan el formato único');
 assert.doesNotMatch(dashboard,/toLocaleString/,'sin formato a mano por pantalla');
 const suite=read('app/suite.tsx');
 assert.match(suite,/setNotice\('Factura creada o recuperada\. La encontrás en Finanzas\.'\)/,'el resultado de la factura sale como aviso ok, no como error');
 assert.match(suite,/\{notice&&<Aviso tono="ok" role="status" compact>\{notice\}<\/Aviso>\}/,'el resultado positivo usa el aviso de la librería');
 assert.match(suite,/\{error&&<Aviso tono="error" compact role="alert">\{error\}<\/Aviso>\}/,'los errores del detalle y de la factura usan el aviso de la librería');
 assert.match(suite,/\{planError&&<Aviso tono="error" compact role="alert">\{planError\}<\/Aviso>\}/,'los términos comerciales también');
 const pipeline=read('app/sections/pipeline.tsx');
 assert.match(pipeline,/weightedAmounts\(rows\)/,'la columna y los totales comparten el ponderado');
 const summary=read('app/pipeline-summary.ts');
 assert.match(summary,/export function weightedAmounts/,'la definición única vive en pipeline-summary');
});

test('la expectativa contratada se deriva una sola vez para Clientes y Resumen (§15.5)',async()=>{
 const {billingExpectationState}=await import('../app/control-center-data');
 const conContratos={activeClients:1,activeProspects:2,expectedMonthlyBilling:[{currency:'PYG',total:'1'}]};
 assert.equal(billingExpectationState(null,'ready'),'cargando');
 assert.equal(billingExpectationState(null,'loading'),'cargando');
 assert.equal(billingExpectationState(conContratos,'error'),'error');
 assert.equal(billingExpectationState({activeClients:1,activeProspects:0},'ready'),'sin-dato');
 assert.equal(billingExpectationState({activeClients:1,activeProspects:0,expectedMonthlyBilling:[]},'ready'),'sin-contratos');
 assert.equal(billingExpectationState(conContratos,'ready'),'listo','con montos queda listo');
 const clientes=read('app/sections/clientes.tsx');
 const control=read('app/control-center.tsx');
 for(const [file,source] of [['clientes',clientes],['control-center',control]] as const){
  assert.match(source,/billingExpectationState\(/,`${file} lee la derivación compartida`);
  assert.doesNotMatch(source,/'Sin contratos activos'/,`${file} no vuelve al titular de tres líneas`);
 }
 assert.match(control,/<StateChip tone="mute" title="No hay contratos comerciales activos">Sin contratos<\/StateChip>/,'el Resumen comercial usa el chip secundario');
});

test('los fallos de transporte hablan es-PY y no filtran jerga técnica',async()=>{
 const {transporteError}=await import('../app/workspace-request');
 assert.equal(transporteError(new TypeError('Failed to fetch')).message,'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.');
 assert.equal(transporteError(new Error('fetch failed')).message.includes('fetch'),false,'sin inglés en la cara del usuario');
 const timeout=new Error('The operation was aborted due to timeout');timeout.name='TimeoutError';
 assert.equal(transporteError(timeout).message,'El servidor tardó demasiado en responder. Reintentá.');
 assert.equal(transporteError(new Error('Tu rol no permite esta operación')).message,'Tu rol no permite esta operación','la causa real del servidor pasa tal cual');
 assert.equal(transporteError(undefined).message,'No se pudo completar la operación. Reintentá.');
 const operations=read('app/operations.tsx');
 assert.match(operations,/throw transporteError\(cause\)/,'el api() compartido traduce el fallo de red');
 assert.match(operations,/El servidor devolvió una respuesta inválida\. Reintentá\./,'una respuesta no-JSON no se parsea como data');
});

test('hasDueWarning conserva el contrato de vencimiento con la implementación de la librería',async()=>{
 const {hasDueWarning}=await import('../app/list-format');
 const hoy=new Date('2026-09-18T15:00:00Z');
 assert.equal(typeof hasDueWarning('2026-09-15',7),'boolean');
 assert.equal(hasDueWarning('2026-09-15'),true,'vencido pinta');
 assert.equal(hasDueWarning('2026-09-20'),true,'dentro de la semana pinta');
 assert.equal(hasDueWarning('2026-12-01'),false,'lejos no pinta');
 assert.equal(hasDueWarning(null),false);
 assert.equal(hasDueWarning(undefined),false);
 assert.equal(hasDueWarning(''),false);
 assert.equal(hasDueWarning('invalid'),false);
 assert.equal(hasDueWarning(hoy.toISOString().slice(0,10)),true,'hoy pinta');
});

console.log('PASS: §15 en COM — estados honestos con reintento, confirmación de lote destructivo, tarjetas sin datos inventados, cuatro estados de métricas y copias locales reemplazadas por la librería.');
