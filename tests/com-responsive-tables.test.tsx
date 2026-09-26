import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};

// Ronda 14 (#62): la tabla densa sólo se muestra si entra (useDenseTableFit);
// en anchos medios la sección usa su vista tarjeta. Los mocks del diálogo,
// compositor, papelera y dnd-kit son los mismos que usa comercial-sections.
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

// Mediciones puras del contrato antes de instalar el mock del hook.
const dense=require('../app/use-dense-table') as typeof import('../app/use-dense-table');

type Pending={url:string;init:RequestInit;resolve:(response:Response)=>void};
const requests:Pending[]=[];
globalThis.fetch=(input,init={})=>new Promise<Response>(resolve=>{requests.push({url:String(input),init,resolve});});
const settle=async()=>{await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});};
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const buttonWith=(renderer:ReactTestRenderer,label:string)=>renderer.root.findAllByType('button').find(button=>text(button).includes(label));
const user=(role:string)=>({id:'1',role,organization_id:'7',full_name:'Prueba',organization_slug:''} as never);

test('el ancho mínimo del contrato denso suma pistas, espacios y padding',()=>{
 // 75rem de pistas + 5 espacios de 8 px + padding lateral = 1248 px (Clientes).
 assert.equal(dense.denseTableMinWidth(75,6),75*16+5*8+8);
 // 93rem de pistas + 7 espacios + padding = 1552 px (Presupuestos).
 assert.equal(dense.denseTableMinWidth(93,8),93*16+7*8+8);
 assert.equal(dense.CLIENT_TABLE_MIN_WIDTH,1248);
 assert.equal(dense.BUDGET_TABLE_MIN_WIDTH,1552);
 assert.equal(dense.denseTableFits(1247,dense.CLIENT_TABLE_MIN_WIDTH),false,'un píxel menos ya no entra');
 assert.equal(dense.denseTableFits(1552,dense.BUDGET_TABLE_MIN_WIDTH),true,'el ancho exacto sí entra');
});

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
 const node={clientWidth:dense.CLIENT_TABLE_MIN_WIDTH-1};
 const Probe=()=>{const {ref,fits}=dense.useDenseTableFit(dense.CLIENT_TABLE_MIN_WIDTH);return <section data-testid="probe" ref={ref as never} data-fits={String(fits)}/>;};
 let renderer!:ReactTestRenderer;
 // react-test-renderer exige createNodeMock para entregar el nodo al ref.
 await act(async()=>{renderer=create(<Probe/>,{createNodeMock:()=>node});});
 const probe=()=>renderer.root.findByProps({'data-testid':'probe'});
 assert.equal(probe().props['data-fits'],'false','un contenedor más angosto usa tarjetas');
 assert.equal(FakeObserver.instances.length,1,'un observador por montaje');
 Object.defineProperty(node,'clientWidth',{value:dense.CLIENT_TABLE_MIN_WIDTH,configurable:true,writable:true});
 await act(async()=>{FakeObserver.instances.at(-1)!.callback();});
 assert.equal(probe().props['data-fits'],'true','con el ancho mínimo vuelve la tabla densa');
 act(()=>renderer.unmount());
 delete (globalThis as {ResizeObserver?:unknown}).ResizeObserver;
});

test('las secciones COM cambian a tarjetas cuando la tabla no entra (#62)',()=>{
 const clientes=read('app/sections/clientes.tsx');
 assert.match(clientes,/useDenseTableFit\(CLIENT_TABLE_MIN_WIDTH\)/,'Clientes mide su contenedor');
 assert.match(clientes,/const dense = tableFits && clientView !== 'grid'/,'con la tabla fuera de ancho manda la tarjeta');
 assert.match(clientes,/ListGrid label="Clientes"[\s\S]*?className="com-table-fixed-actions"/,'la tabla viva fija su columna de acciones');
 assert.match(clientes,/ListGrid label="Clientes archivados"[\s\S]*?className="com-table-fixed-actions"/,'la lista archivada usa el mismo contrato');
 assert.match(clientes,/planCta=\{client\.has_recurring_price !== true \? 'icon' : undefined\}/,'el CTA de plan entra como icono en la fila densa');
 assert.match(clientes,/planCta=\{client\.has_recurring_price !== true \? 'text' : undefined\}/,'y como texto en la tarjeta');
 assert.match(clientes,/has_recurring_price !== true && !canManageTerms/,'sin permiso queda el aviso honesto, nunca un botón muerto');
 const presupuestos=read('app/sections/presupuestos.tsx');
 assert.match(presupuestos,/useDenseTableFit\(BUDGET_TABLE_MIN_WIDTH\)/,'Presupuestos mide su contenedor');
 assert.match(presupuestos,/tableFits \? \([\s\S]*?ListGrid label="Presupuestos"[\s\S]*?className="com-table-fixed-actions"[\s\S]*?\) : \([\s\S]*?budget-hub-grid/,'la tabla sólo entra completa; si no, tarjetas');
 assert.match(presupuestos,/minWidthClass="min-w-\[93rem\]"/,'el ancho mínimo declarado coincide con la plantilla');
 assert.match(presupuestos,/function BudgetTile/,'la tarjeta de presupuesto vive en la sección');
 const toolbar=read('app/client-directory-toolbar.tsx');
 assert.match(toolbar,/useDenseTableFit<HTMLDivElement>\(CLIENT_TABLE_MIN_WIDTH\)/,'el toolbar mide el mismo ancho que la sección');
 assert.match(toolbar,/\{tableFits \? <ViewSwitch value=\{view\} onChange=\{onViewChange\}\/> : null\}/,'sin tabla densa el selector de vista no se muestra');
});

test('la columna de acciones queda fija al borde del scroll silencioso',()=>{
 const css=read('app/com-tables.css');
 assert.match(css,/\.com-table-fixed-actions \[role="row"\]>:is\(\[role="cell"\],\[role="columnheader"\]\):last-child\{/,'la última celda es la que se fija');
 assert.match(css,/position:sticky/,'la celda usa sticky');
 assert.match(css,/right:0/,'pegada al borde derecho del scroll');
 assert.match(css,/background:var\(--com-sticky-bg\)/,'con fondo opaco que tapa el contenido que pasa por debajo');
 assert.match(css,/\.archived-capsule \.com-table-fixed-actions\{--com-sticky-bg:/,'la cápsula de archivados conserva su fondo');
 const workspace=read('app/scale-workspace.tsx');
 assert.match(workspace,/import '\.\/com-tables\.css'/,'el shell carga la estrategia de tablas COM');
});

// Hook mock: las secciones leen `fits` para decidir tabla o tarjeta.
let hookFits=true;
const hookPath=require.resolve('../app/use-dense-table');
require.cache[hookPath]={id:hookPath,filename:hookPath,loaded:true,exports:{
 useDenseTableFit:()=>({ref:{current:null},fits:hookFits}),
 CLIENT_TABLE_MIN_WIDTH:dense.CLIENT_TABLE_MIN_WIDTH,
 BUDGET_TABLE_MIN_WIDTH:dense.BUDGET_TABLE_MIN_WIDTH,
 denseTableFits:dense.denseTableFits,
 denseTableMinWidth:dense.denseTableMinWidth,
}} as NodeModule;
const {PresupuestosSection}=require('../app/sections/presupuestos') as typeof import('../app/sections/presupuestos');
const {ClientesSection}=require('../app/sections/clientes') as typeof import('../app/sections/clientes');

const budgets=[
 {id:'1',number:'P-2026-001',title:'Campaña de lanzamiento',client_name:'Cooperativa del Sur',status:'sent',item_count:3,valid_until:'2026-09-25',subtotal:'1000',total:'1100',currency:'BRL'},
 {id:'2',number:'P-2026-002',title:'Retainer mensual',client_name:'Estudio Ñandú',status:'accepted',item_count:1,valid_until:null,subtotal:'500',total:'550',currency:'PYG'},
];
let renderer!:ReactTestRenderer;
const mountBudgets=async(role:string,list:unknown[],onCreate?:()=>void)=>{
 await act(async()=>{
  renderer=create(<PresupuestosSection loading={false} user={user(role)} budgetsState="ready" budgets={list as never} invoices={[] as never} budgetKpis={{totals:new Map(),drafts:0,accepted:0,expiring:0}} summary={{} as never} loadBudgets={()=>{}} setBudgets={()=>{}} onCreate={onCreate}/>);
 });
};

test('presupuestos: tarjetas completas en anchos medios y tabla densa cuando entra',async()=>{
 hookFits=false;
 await mountBudgets('owner',budgets);
 assert.equal(renderer.root.findAllByProps({role:'table'}).length,0,'sin ancho no hay tabla');
 const cards=renderer.root.findAll(node=>typeof node.props.className==='string'&&node.props.className.includes('budget-hub-card'));
 assert.equal(cards.length,2,'una tarjeta por presupuesto');
 const copy=text(renderer.root);
 for(const value of ['P-2026-001','Campaña de lanzamiento','Cooperativa del Sur','Enviado','Vigencia','Sin IVA','Total','IVA incl.'])assert.match(copy,new RegExp(value),`la tarjeta conserva ${value}`);
 assert.match(copy,/BRL[^0-9]*1\.000,00/,'el monto sale del formateador compartido');
 assert.equal(renderer.root.findAllByType('input').filter(input=>input.props.type==='checkbox').length,2,'cada tarjeta permite seleccionar en lote');
 act(()=>renderer.unmount());

 // viewer: tarjetas sin casillas ni acciones de gestión.
 await mountBudgets('viewer',budgets.slice(0,1));
 assert.equal(renderer.root.findAllByType('input').filter(input=>input.props.type==='checkbox').length,0,'viewer no selecciona');
 assert.equal(buttonWith(renderer,'Mover a la papelera'),undefined,'viewer no ve la papelera por fila');
 act(()=>renderer.unmount());

 // Con ancho suficiente vuelve la tabla densa con la misma plantilla del encabezado.
 hookFits=true;
 await mountBudgets('owner',budgets);
 assert.equal(renderer.root.findAllByProps({role:'table'}).length,1,'con ancho entra la tabla accesible');
 assert.equal(renderer.root.findAllByProps({role:'cell'}).length,16,'la tabla conserva sus ocho celdas por fila');
 assert.equal(renderer.root.findAll(node=>typeof node.props.className==='string'&&node.props.className.includes('budget-hub-card')).length,0,'sin tarjetas cuando la tabla entra');
 act(()=>renderer.unmount());
});

test('presupuestos vacío: el CTA contextual sólo aparece con permiso',async()=>{
 let created=0;
 hookFits=true;
 await mountBudgets('owner',[],()=>{created+=1;});
 assert.match(text(renderer.root),/Todavía no hay presupuestos/);
 const create=buttonWith(renderer,'Nuevo presupuesto');
 assert.ok(create,'owner recibe el CTA de alta');
 act(()=>{create!.props.onClick();});
 assert.equal(created,1,'el CTA abre el alta del shell');
 act(()=>renderer.unmount());

 await mountBudgets('viewer',[],()=>{created+=1;});
 assert.equal(buttonWith(renderer,'Nuevo presupuesto'),undefined,'viewer no ve acciones');
 assert.match(text(renderer.root),/Cuando el equipo cree una propuesta/,'el vacío conserva la explicación honesta');
 act(()=>renderer.unmount());
});

const client=(extra:Record<string,unknown>={})=>({id:'9',name:'Cliente sin plan',active:true,created_at:'2025-01-10',email:'',phone:'',tax_id:'',logo_url:null,color_key:'violet',has_recurring_price:false,...extra} as never);
const mountClientes=async(role:string,list:unknown[],canManageClients=false,canSeeBilling=false)=>{
 await act(async()=>{
  renderer=create(<ClientesSection
   dataState="ready" user={user(role)} clientView="list" clientStatusFilter="" setClientStatusFilter={()=>{}}
   clientSearch="" setClientSearch={()=>{}} archiveBusy="" bulkBusy={false} selectedClients={[]} setSelectedClients={()=>{}}
   canSeeBilling={canSeeBilling} canManageClients={canManageClients} clients={list as never} displayedClients={list as never} liveClients={list as never}
   archivedClients={[]} paymentStatuses={[]} clientHubStats={new Map()} commercialSummary={null} commercialState="idle"
   directoryKpis={{active:1,paused:0,activeProjects:0,deliveries:0}} cobrosKpis={{alDia:0,porVencer:0,enMora:0,sinFactura:0}}
   load={async()=>{}} setClientArchive={async()=>{}} toggleClientSelected={()=>{}} selectVisibleClients={()=>{}} batchClients={async()=>{}}
   setDetail={()=>{}}/>);
 });
};

test('clientes: tarjetas cuando la tabla no entra y CTA "Cargar plan" por rol',async()=>{
 hookFits=false;
 await mountClientes('owner',[client()]);
 assert.equal(renderer.root.findAllByProps({role:'table'}).length,0,'sin ancho no hay tabla');
 assert.equal(renderer.root.findAll(node=>typeof node.props.className==='string'&&node.props.className.includes('client-hub-card')).length,1,'la tarjeta reemplaza a la fila');
 assert.ok(buttonWith(renderer,'Cargar plan'),'quien gestiona términos recibe el CTA contextual');
 act(()=>renderer.unmount());

 // viewer: sin CTA ni acciones.
 await mountClientes('viewer',[client()]);
 assert.equal(buttonWith(renderer,'Cargar plan'),undefined,'sin permiso no hay CTA');
 assert.equal(buttonWith(renderer,'Archivar'),undefined,'viewer no gestiona clientes');
 act(()=>renderer.unmount());

 // finance: ve cobros pero no gestiona términos; queda el aviso honesto.
 await mountClientes('finance',[client()],false,true);
 assert.equal(buttonWith(renderer,'Cargar plan'),undefined,'finanzas no edita términos comerciales');
 assert.equal(renderer.root.findAll(node=>String(node.props.className||'').includes('client-price-missing')).length,1,'el aviso de precio faltante queda visible');
 act(()=>renderer.unmount());

 // Con ancho suficiente, la fila densa reemplaza a la tarjeta.
 hookFits=true;
 await mountClientes('owner',[client()]);
 assert.equal(renderer.root.findAllByProps({role:'table'}).length,1,'con ancho entra la tabla del directorio');
 assert.equal(renderer.root.findAll(node=>String(node.props.className||'').includes('client-hub-card')).length,0,'sin tarjetas cuando la tabla entra');
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
