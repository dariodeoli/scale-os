import React from 'react';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {test} from 'node:test';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};

// Ronda 16 (#63): el patrón de tablas densas vive en ui-v2 (ListActions +
// pinnedActions + EmptyCta + useDenseTableFit); las secciones COM lo consumen.
// Los mocks del diálogo, compositor, papelera y dnd-kit son los de siempre.
const dialogPath=require.resolve('../app/dialog');
require.cache[dialogPath]={id:dialogPath,filename:dialogPath,loaded:true,exports:{
 Dialog:({title,children}:{title?:string;children:React.ReactNode})=><section role="dialog" aria-label={title}>{children}</section>,
 FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
 useDialogClose:()=>undefined,
 useDialogPending:()=>undefined,
}} as NodeModule;
const composerPath=require.resolve('../app/quote-composer');
require.cache[composerPath]={id:composerPath,filename:composerPath,loaded:true,exports:{QuoteComposer:()=><output>composer</output>}} as NodeModule;
const archivePath=require.resolve('../app/archive-controls');
require.cache[archivePath]={id:archivePath,filename:archivePath,loaded:true,exports:{RemoveRecord:({id}:{id:string})=><button type="button" aria-label={`Mover a la papelera: ${id}`}>Papelera</button>}} as NodeModule;
const dndPath=require.resolve('@dnd-kit/core');
require.cache[dndPath]={id:dndPath,filename:dndPath,loaded:true,exports:{
 DndContext:({children}:{children:React.ReactNode})=><div>{children}</div>,
 useDraggable:()=>({setNodeRef(){},attributes:{},listeners:{},isDragging:false}),
 useDroppable:()=>({setNodeRef(){},isOver:false}),useSensor:()=>({}),useSensors:()=>[],PointerSensor(){},KeyboardSensor(){},
 pointerWithin:()=>[],rectIntersection:()=>[],
}} as NodeModule;

const dense=require('../app/ui-v2') as typeof import('../app/ui-v2');
const {CLIENT_TABLE_MIN_WIDTH}=require('../app/client-directory-data') as typeof import('../app/client-directory-data');
const {PresupuestosSection}=require('../app/sections/presupuestos') as typeof import('../app/sections/presupuestos');
const {ClientesSection}=require('../app/sections/clientes') as typeof import('../app/sections/clientes');

type Pending={url:string;init:RequestInit;resolve:(response:Response)=>void};
const requests:Pending[]=[];
globalThis.fetch=(input,init={})=>new Promise<Response>(resolve=>{requests.push({url:String(input),init,resolve});});
const settle=async()=>{await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});};
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const buttonWith=(renderer:ReactTestRenderer,label:string)=>renderer.root.findAllByType('button').find(button=>text(button).includes(label));
const user=(role:string)=>({id:'1',role,organization_id:'7',full_name:'Prueba',organization_slug:''} as never);
// react-test-renderer entrega el nodo al ref sólo con createNodeMock: el ancho
// del contenedor se declara acá y el hook real decide tabla o tarjeta.
const nodeFor=(width:number)=>({clientWidth:width});

test('el ancho mínimo del contrato denso suma pistas, espacios y padding',()=>{
 // 75rem de pistas + 5 espacios de 8 px + padding lateral = 1248 px (Clientes).
 assert.equal(dense.denseTableMinWidth(75,6),75*16+5*8+8);
 // 93rem de pistas + 7 espacios + padding = 1552 px (Presupuestos).
 assert.equal(dense.denseTableMinWidth(93,8),93*16+7*8+8);
 assert.equal(CLIENT_TABLE_MIN_WIDTH,1248);
 assert.equal(dense.denseTableFits(1247,CLIENT_TABLE_MIN_WIDTH),false,'un píxel menos ya no entra');
 assert.equal(dense.denseTableFits(1552,dense.denseTableMinWidth(93,8)),true,'el ancho exacto sí entra');
});

// Para las secciones alcanza un observer inerte: el hook mide el contenedor en
// el montaje (createNodeMock entrega el ancho declarado).
class StubObserver{observe(){}disconnect(){}}

test('useDenseTableFit mide el contenedor real con ResizeObserver',async()=>{
 class FakeObserver{
  static instances:FakeObserver[]=[];
  callback:()=>void;
  elements:unknown[]=[];
  constructor(callback:()=>void){this.callback=callback;FakeObserver.instances.push(this);}
  observe(element:unknown){this.elements.push(element);}
  disconnect(){}
 }
 (globalThis as {ResizeObserver?:unknown}).ResizeObserver=FakeObserver;
 const node=nodeFor(CLIENT_TABLE_MIN_WIDTH-1);
 const Probe=()=>{const {ref,fits}=dense.useDenseTableFit(CLIENT_TABLE_MIN_WIDTH);return <section data-testid="probe" ref={ref as never} data-fits={String(fits)}/>;};
 let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<Probe/>,{createNodeMock:()=>node});});
 const probe=()=>renderer.root.findByProps({'data-testid':'probe'});
 assert.equal(probe().props['data-fits'],'false','un contenedor más angosto usa tarjetas');
 assert.equal(FakeObserver.instances.length,1,'un observador por montaje');
 Object.defineProperty(node,'clientWidth',{value:CLIENT_TABLE_MIN_WIDTH,configurable:true,writable:true});
 await act(async()=>{FakeObserver.instances.at(-1)!.callback();});
 assert.equal(probe().props['data-fits'],'true','con el ancho mínimo vuelve la tabla densa');
 act(()=>renderer.unmount());
 (globalThis as {ResizeObserver?:unknown}).ResizeObserver=StubObserver;
});

test('la primitiva común de tablas densas vive en ui-v2 y no hay variantes COM (#63)',()=>{
 const uiV2=read('app/ui-v2.tsx');
 assert.match(uiV2,/export function ListActions/,'ListActions es la celda fija común');
 assert.match(uiV2,/pinnedActions = false/,'ListGrid expone pinnedActions');
 assert.match(uiV2,/export function EmptyCta/,'EmptyCta es el CTA canónico de vacíos');
 assert.match(uiV2,/export function useDenseTableFit/,'el medidor del contrato denso es común');
 assert.match(uiV2,/export function denseTableMinWidth/,'la cuenta del ancho mínimo es común');
 assert.equal(existsSync(new URL('../app/use-dense-table.ts',import.meta.url)),false,'no queda el hook propio de COM');
 assert.equal(existsSync(new URL('../app/com-tables.css',import.meta.url)),false,'no queda el CSS propio de COM');
 const system=read('app/ui-system.css');
 assert.match(system,/\.list-actions-head,\s*\.list-actions\{position:sticky;right:0/,'la primitiva fija la columna al borde derecho');
 assert.match(system,/--list-actions-bg/,'el fondo de la columna fija es configurable por lista');
 const workspace=read('app/scale-workspace.tsx');
 assert.doesNotMatch(workspace,/com-tables\.css/,'el shell ya no carga CSS de tablas COM');
});

test('las secciones COM consumen la primitiva común (#63)',()=>{
 const clientes=read('app/sections/clientes.tsx');
 assert.match(clientes,/useDenseTableFit\(CLIENT_TABLE_MIN_WIDTH\)/,'Clientes mide su contenedor con el hook común');
 assert.match(clientes,/const dense = tableFits && clientView !== 'grid'/,'con la tabla fuera de ancho manda la tarjeta');
 assert.match(clientes,/ListGrid label="Clientes"[\s\S]{0,220}?pinnedActions/,'la tabla viva fija su columna con la primitiva');
 assert.match(clientes,/ListGrid label="Clientes archivados"[\s\S]{0,240}?pinnedActions/,'la lista archivada usa el mismo contrato');
 assert.match(clientes,/<ListActions className="client-row-actions silent-scroll">/,'la fila usa la celda ListActions');
 assert.match(clientes,/planCta=\{client\.has_recurring_price !== true \? 'icon' : undefined\}/,'el CTA de plan entra como icono en la fila densa');
 assert.match(clientes,/planCta=\{client\.has_recurring_price !== true \? 'text' : undefined\}/,'y como texto en la tarjeta');
 assert.match(clientes,/has_recurring_price !== true && !canManageTerms/,'sin permiso queda el aviso honesto, nunca un botón muerto');
 assert.match(clientes,/<EmptyCta label="Nuevo cliente"/,'el vacío del directorio lleva el CTA canónico');
 const presupuestos=read('app/sections/presupuestos.tsx');
 assert.match(presupuestos,/useDenseTableFit\(BUDGET_TABLE_MIN_WIDTH\)/,'Presupuestos mide su contenedor con el hook común');
 assert.match(presupuestos,/tableFits \? \([\s\S]{0,260}?ListGrid label="Presupuestos"[\s\S]{0,160}?pinnedActions[\s\S]{0,80}?\) : \([\s\S]{0,80}?budget-hub-grid/,'la tabla sólo entra completa; si no, tarjetas');
 assert.match(presupuestos,/<ListActions className="\[&_button\.icon-button\]:h-8/,'la fila de presupuestos usa la celda ListActions');
 assert.match(presupuestos,/minWidthClass="min-w-\[93rem\]"/,'el ancho mínimo declarado coincide con la plantilla');
 assert.match(presupuestos,/function BudgetTile/,'la tarjeta de presupuesto vive en la sección');
 assert.match(presupuestos,/<EmptyCta label="Nuevo presupuesto"/,'el vacío de presupuestos usa el CTA canónico');
 const planes=read('app/sections/planes.tsx');
 assert.match(planes,/<EmptyCta label="Nuevo plan"/,'el vacío de planes usa el CTA canónico');
 const pipeline=read('app/sections/pipeline.tsx');
 assert.match(pipeline,/<EmptyCta label="Nueva oportunidad"/,'el vacío del pipeline usa el CTA canónico');
 const toolbar=read('app/client-directory-toolbar.tsx');
 assert.match(toolbar,/import \{ViewSwitch, useDenseTableFit\} from '\.\/ui-v2'/,'el toolbar importa la primitiva común');
 assert.match(toolbar,/\{tableFits \? <ViewSwitch value=\{view\} onChange=\{onViewChange\}\/> : null\}/,'sin tabla densa el selector de vista no se muestra');
});

const budgets=[
 {id:'1',number:'P-2026-001',title:'Campaña de lanzamiento',client_name:'Cooperativa del Sur',status:'sent',item_count:3,valid_until:'2026-09-25',subtotal:'1000',total:'1100',currency:'BRL'},
 {id:'2',number:'P-2026-002',title:'Retainer mensual',client_name:'Estudio Ñandú',status:'accepted',item_count:1,valid_until:null,subtotal:'500',total:'550',currency:'PYG'},
];
let renderer!:ReactTestRenderer;
const mountBudgets=async(role:string,list:unknown[],width:number,onCreate?:()=>void)=>{
 await act(async()=>{
  renderer=create(<PresupuestosSection loading={false} user={user(role)} budgetsState="ready" budgets={list as never} invoices={[] as never} budgetKpis={{totals:new Map(),drafts:0,accepted:0,expiring:0}} summary={{} as never} loadBudgets={()=>{}} setBudgets={()=>{}} onCreate={onCreate}/>,{createNodeMock:()=>nodeFor(width)});
 });
};

test('presupuestos: tarjetas completas en anchos medios y tabla densa cuando entra',async()=>{
 await mountBudgets('owner',budgets,900);
 assert.equal(renderer.root.findAllByProps({role:'table'}).length,0,'sin ancho no hay tabla');
 const cards=renderer.root.findAll(node=>typeof node.props.className==='string'&&node.props.className.includes('budget-hub-card'));
 assert.equal(cards.length,2,'una tarjeta por presupuesto');
 const copy=text(renderer.root);
 for(const value of ['P-2026-001','Campaña de lanzamiento','Cooperativa del Sur','Enviado','Vigencia','Sin IVA','Total','IVA incl.'])assert.match(copy,new RegExp(value),`la tarjeta conserva ${value}`);
 assert.match(copy,/BRL[^0-9]*1\.000,00/,'el monto sale del formateador compartido');
 assert.equal(renderer.root.findAllByType('input').filter(input=>input.props.type==='checkbox').length,2,'cada tarjeta permite seleccionar en lote');
 act(()=>renderer.unmount());

 // viewer: tarjetas sin casillas ni acciones de gestión.
 await mountBudgets('viewer',budgets.slice(0,1),900);
 assert.equal(renderer.root.findAllByType('input').filter(input=>input.props.type==='checkbox').length,0,'viewer no selecciona');
 assert.equal(buttonWith(renderer,'Mover a la papelera'),undefined,'viewer no ve la papelera por fila');
 act(()=>renderer.unmount());

 // Con ancho suficiente vuelve la tabla densa con la misma plantilla del encabezado.
 await mountBudgets('owner',budgets,1700);
 assert.equal(renderer.root.findAllByProps({role:'table'}).length,1,'con ancho entra la tabla accesible');
 assert.equal(renderer.root.findAllByProps({role:'cell'}).length,16,'la tabla conserva sus ocho celdas por fila');
 assert.equal(renderer.root.findAll(node=>typeof node.props.className==='string'&&node.props.className.split(/\s+/).includes('list-actions')).length,2,'las filas usan la celda fija común');
 assert.equal(renderer.root.findAll(node=>typeof node.props.className==='string'&&node.props.className.includes('budget-hub-card')).length,0,'sin tarjetas cuando la tabla entra');
 act(()=>renderer.unmount());
});

test('presupuestos vacío: el CTA canónico sólo aparece con permiso',async()=>{
 let created=0;
 await mountBudgets('owner',[],1700,()=>{created+=1;});
 assert.match(text(renderer.root),/Todavía no hay presupuestos/);
 const create=buttonWith(renderer,'Nuevo presupuesto');
 assert.ok(create,'owner recibe el CTA de alta');
 assert.equal(create!.props.className,'primary ','el vacío usa el botón canónico EmptyCta');
 act(()=>{create!.props.onClick();});
 assert.equal(created,1,'el CTA abre el alta del shell');
 act(()=>renderer.unmount());

 await mountBudgets('viewer',[],1700,()=>{created+=1;});
 assert.equal(buttonWith(renderer,'Nuevo presupuesto'),undefined,'viewer no ve acciones');
 assert.match(text(renderer.root),/Cuando el equipo cree una propuesta/,'el vacío conserva la explicación honesta');
 act(()=>renderer.unmount());
});

const client=(extra:Record<string,unknown>={})=>({id:'9',name:'Cliente sin plan',active:true,created_at:'2025-01-10',email:'',phone:'',tax_id:'',logo_url:null,color_key:'violet',has_recurring_price:false,...extra} as never);
const mountClientes=async(role:string,list:unknown[],width:number,canManageClients=false,canSeeBilling=false)=>{
 await act(async()=>{
  renderer=create(<ClientesSection
   dataState="ready" user={user(role)} clientView="list" clientStatusFilter="" setClientStatusFilter={()=>{}}
   clientSearch="" setClientSearch={()=>{}} archiveBusy="" bulkBusy={false} selectedClients={[]} setSelectedClients={()=>{}}
   canSeeBilling={canSeeBilling} canManageClients={canManageClients} clients={list as never} displayedClients={list as never} liveClients={list as never}
   archivedClients={[]} paymentStatuses={[]} clientHubStats={new Map()} commercialSummary={null} commercialState="idle"
   directoryKpis={{active:1,paused:0,activeProjects:0,deliveries:0}} cobrosKpis={{alDia:0,porVencer:0,enMora:0,sinFactura:0}}
   load={async()=>{}} setClientArchive={async()=>{}} toggleClientSelected={()=>{}} selectVisibleClients={()=>{}} batchClients={async()=>{}}
   setDetail={()=>{}}/>,{createNodeMock:()=>nodeFor(width)});
 });
};

test('clientes: tarjetas cuando la tabla no entra y CTA "Cargar plan" por rol',async()=>{
 await mountClientes('owner',[client()],900);
 assert.equal(renderer.root.findAllByProps({role:'table'}).length,0,'sin ancho no hay tabla');
 assert.equal(renderer.root.findAll(node=>typeof node.props.className==='string'&&node.props.className.includes('client-hub-card')).length,1,'la tarjeta reemplaza a la fila');
 assert.ok(buttonWith(renderer,'Cargar plan'),'quien gestiona términos recibe el CTA contextual');
 act(()=>renderer.unmount());

 // viewer: sin CTA ni acciones.
 await mountClientes('viewer',[client()],900);
 assert.equal(buttonWith(renderer,'Cargar plan'),undefined,'sin permiso no hay CTA');
 assert.equal(buttonWith(renderer,'Archivar'),undefined,'viewer no gestiona clientes');
 act(()=>renderer.unmount());

 // finance: ve cobros pero no gestiona términos; queda el aviso honesto.
 await mountClientes('finance',[client()],900,false,true);
 assert.equal(buttonWith(renderer,'Cargar plan'),undefined,'finanzas no edita términos comerciales');
 assert.equal(renderer.root.findAll(node=>String(node.props.className||'').includes('client-price-missing')).length,1,'el aviso de precio faltante queda visible');
 act(()=>renderer.unmount());

 // Con ancho suficiente, la fila densa reemplaza a la tarjeta.
 await mountClientes('owner',[client()],1400);
 assert.equal(renderer.root.findAllByProps({role:'table'}).length,1,'con ancho entra la tabla del directorio');
 assert.equal(renderer.root.findAll(node=>typeof node.props.className==='string'&&node.props.className.split(/\s+/).includes('list-actions')).length,1,'la fila densa usa la celda fija común');
 assert.equal(renderer.root.findAll(node=>String(node.props.className||'').includes('client-hub-card')).length,0,'sin tarjetas cuando la tabla entra');
 act(()=>renderer.unmount());
});

test('clientes vacío: el CTA canónico del directorio sólo aparece con permiso',async()=>{
 let created=0;
 const mountEmpty=async(role:string,canManage:boolean,onCreate:()=>void)=>{
  await act(async()=>{
   renderer=create(<ClientesSection
    dataState="ready" user={user(role)} clientView="list" clientStatusFilter="" setClientStatusFilter={()=>{}}
    clientSearch="" setClientSearch={()=>{}} archiveBusy="" bulkBusy={false} selectedClients={[]} setSelectedClients={()=>{}}
    canSeeBilling={false} canManageClients={canManage} clients={[]} displayedClients={[]} liveClients={[]}
    archivedClients={[]} paymentStatuses={[]} clientHubStats={new Map()} commercialSummary={null} commercialState="idle"
    directoryKpis={{active:0,paused:0,activeProjects:0,deliveries:0}} cobrosKpis={{alDia:0,porVencer:0,enMora:0,sinFactura:0}}
    load={async()=>{}} setClientArchive={async()=>{}} toggleClientSelected={()=>{}} selectVisibleClients={()=>{}} batchClients={async()=>{}}
    setDetail={()=>{}} onCreate={onCreate}/>,{createNodeMock:()=>nodeFor(1400)});
  });
 };
 await mountEmpty('owner',true,()=>{created+=1;});
 assert.match(text(renderer.root),/Todavía no hay clientes/);
 const createCta=buttonWith(renderer,'Nuevo cliente');
 assert.ok(createCta,'owner recibe el CTA de alta en el vacío');
 act(()=>{createCta!.props.onClick();});
 assert.equal(created,1,'el CTA abre el alta del shell');
 act(()=>renderer.unmount());

 await mountEmpty('viewer',false,()=>{created+=1;});
 assert.equal(buttonWith(renderer,'Nuevo cliente'),undefined,'viewer no ve el CTA');
 act(()=>renderer.unmount());
});

test('el editor de cliente carga el plan sólo para los roles de términos comerciales',async()=>{
 const {RecordEditor}=require('../app/suite') as typeof import('../app/suite');
 const cases:[string,boolean][]=[['owner',true],['sales',true],['management',true],['finance',false],['production',false],['viewer',false]];
 for(const [role,expected] of cases){
  requests.length=0;
  let renderer!:ReactTestRenderer;
  await act(async()=>{renderer=create(<RecordEditor kind="clients" recordId="1" name="ACME" role={role} refresh={async()=>{}} planCta="text" actions={[]}/>);});
  if(role==='viewer'||role==='production'){assert.equal(renderer.toJSON(),null,`${role} no edita clientes`);act(()=>renderer.unmount());continue;}
  const cta=buttonWith(renderer,'Cargar plan');
  assert.equal(Boolean(cta),expected,`${role}: CTA de plan esperado ${expected}`);
  assert.equal(renderer.root.findAll(node=>node.props.title==='Editar').length,0,'la variante sin acciones no monta el lápiz');
  if(expected){
   act(()=>{cta!.props.onClick();});
   await settle();
   const record=requests.find(request=>request.url.endsWith('/api/agency/clients/1'));
   assert.ok(record,`${role}: abre la ficha del cliente`);
   record!.resolve(new Response(JSON.stringify({record:{id:'1',name:'ACME',legal_name:'',tax_id:'',lifecycle_status:'active',updated_at:'2026-09-20T12:00:00Z'}}),{status:200}));
   await settle();
   const terms=requests.find(request=>request.url.endsWith('/api/agency/clients/1/commercial-terms'));
   assert.ok(terms,`${role}: trae los términos comerciales`);
   terms!.resolve(new Response(JSON.stringify({clientId:'1',archived:false,terms:null,plans:[],collaborators:[]}),{status:200}));
   await settle();
   assert.match(text(renderer.root),/Plan y pago/,'el diálogo abre con la sección de plan');
  }
  act(()=>renderer.unmount());
  await settle();
 }
});

test('la ficha del cliente deja el CTA de plan donde hoy dice "Sin plan registrado"',()=>{
 const productivity=read('app/productivity-ui.tsx');
 assert.match(productivity,/Sin plan registrado[\s\S]{0,220}?RecordEditor kind="clients"[\s\S]{0,160}?planCta="text" actions=\{\[\]\}/,'la ficha monta el CTA de plan junto al dato faltante');
 assert.match(productivity,/!summary\.terms&&roleCan\(role,'commercial-terms\.manage'\)/,'sólo los roles que gestionan términos ven la acción');
});
