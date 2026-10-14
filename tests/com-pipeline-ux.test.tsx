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
 ConfirmDialog:({open=true,title,children,confirmLabel='Confirmar',onConfirm,onCancel}:{open?:boolean;title?:string;children?:React.ReactNode;confirmLabel?:string;onConfirm?:()=>void;onCancel?:()=>void})=>open?<section role="dialog" aria-label={title}>{children}<button type="button" onClick={onCancel}>Cancelar</button><button type="button" onClick={onConfirm}>{confirmLabel}</button></section>:null,
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
const {listDateShort}=require('../app/list-format') as typeof import('../app/list-format');

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
 assert.deepEqual(ids('Abierto'),['move','convert','edit','delete'],'el menu ofrece convertir en cualquier etapa, ademas de editar y papelera');
 assert.deepEqual(ids('Ganado ya cliente'),['move','edit','delete'],'un lead ya convertido no ofrece convertir');
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
 // 5. Filtros (#182): la búsqueda y la etapa acotan el tablero Y la lista, y los indicadores dicen que cuentan el filtro.
 const leads=[
  {id:'1',name:'Acme SA',stage:'lead',amount:'100',currency:'USD',probability:10,email:'ventas@acme.com'},
  {id:'2',name:'Beta',stage:'contacted',amount:'200',currency:'PYG',probability:60,phone:'+595 981 123456',updated_at:'2026-10-10T15:00:00Z',client_id:'9'},
  {id:'3',name:'Gamma',stage:'lead',amount:'300',currency:'PYG',probability:20,notes:'pedir presupuesto Acme'},
 ];
 const control=(renderer:ReactTestRenderer,predicate:(node:ReactTestInstance)=>boolean)=>renderer.root.findAll(node=>typeof node.props?.onChange==='function'&&predicate(node))[0];
 const setSearch=(renderer:ReactTestRenderer,value:string)=>act(()=>{control(renderer,node=>node.props.ariaLabel==='Buscar oportunidades').props.onChange({target:{value}});});
 const setStageFilter=(renderer:ReactTestRenderer,value:string)=>act(()=>{control(renderer,node=>node.props.id==='pipeline-etapa').props.onChange({target:{value}});});
 const setView=(renderer:ReactTestRenderer,value:'grid'|'list')=>act(()=>{control(renderer,node=>node.props.value==='grid'||node.props.value==='list').props.onChange(value);});
 const cardNames=(renderer:ReactTestRenderer)=>renderer.root.findAllByType('article').map(card=>text(card.findAll(node=>node.type==='h3'||(node.type==='button'&&String(node.props['aria-label']||'').startsWith('Ver oportunidad'))).slice(0,1)[0]));
 const listRowsOf=(renderer:ReactTestRenderer)=>renderer.root.findAll(node=>typeof node.type==='string'&&node.props['data-lead-row']!==undefined);
 renderer=await mount('owner',leads);
 assert.deepEqual(cardNames(renderer).sort(),['Acme SA','Beta','Gamma'],'sin filtro el tablero muestra todo');
 await setSearch(renderer,'ACME');
 assert.deepEqual(cardNames(renderer).sort(),['Acme SA','Gamma'],'la búsqueda alcanza nombre, correo y notas');
 assert.match(text(renderer.root),/2 de 3 oportunidades · indicadores y totales del filtro/,'el resumen dice que los indicadores cuentan el filtro');
 await setView(renderer,'list');
 assert.deepEqual(listRowsOf(renderer).map(row=>row.props['data-lead-row']).sort(),['1','3'],'la misma búsqueda acota la lista');
 await setSearch(renderer,'');
 await setStageFilter(renderer,'contacted');
 assert.deepEqual(listRowsOf(renderer).map(row=>row.props['data-lead-row']),['2'],'la etapa acota la lista');
 await setView(renderer,'grid');
 assert.deepEqual(cardNames(renderer),['Beta'],'la etapa acota el tablero');
 assert.equal(renderer.root.findAll(node=>String(node.props?.['aria-label']||'').startsWith('Nuevo lead ·')).length,0,'la etapa elegida deja solo su columna');
 act(()=>renderer.unmount());

 // 6. Tarjeta y lista muestran la misma información real (y solo la real).
 renderer=await mount('owner',leads);
 const beta=renderer.root.findAllByType('article').find(card=>text(card).includes('Beta'))!;
 const acme=renderer.root.findAllByType('article').find(card=>text(card).includes('Acme SA'))!;
 const labels=(node:ReactTestInstance)=>node.findAll(n=>typeof n.props?.['aria-label']==='string').map(n=>String(n.props['aria-label']));
 const day=listDateShort('2026-10-10T15:00:00Z')!;
 assert.ok(day,'la fecha corta sale de list-format');
 for(const fragment of [/Gs[^0-9]*200/,/60%/,/Cliente vinculado/,new RegExp(`Actualizado ${day}`)])assert.match(text(beta),fragment,`la tarjeta muestra ${fragment}`);
 assert.ok(labels(beta).includes('WhatsApp: Beta')&&labels(beta).includes('Llamar: Beta'),'WhatsApp y llamada con teléfono');
 assert.equal(labels(acme).some(label=>/WhatsApp|Llamar/.test(label)),false,'sin teléfono no hay WhatsApp ni llamada');
 assert.doesNotMatch(text(acme),/ventas@acme\.com/,'la tarjeta no expone correos');
 await setView(renderer,'list');
 const betaRow=listRowsOf(renderer).find(row=>row.props['data-lead-row']==='2')!;
 for(const fragment of [/Gs[^0-9]*200/,/60%/,/Vinculado/,new RegExp(day)])assert.match(text(betaRow),fragment,`la lista muestra ${fragment}`);
 assert.ok(labels(betaRow).includes('WhatsApp: Beta')&&labels(betaRow).includes('Llamar: Beta'),'la lista conserva las acciones de contacto');
 assert.match(text(listRowsOf(renderer).find(row=>row.props['data-lead-row']==='1')!),/US\$|USD/,'el monto conserva su moneda');
 act(()=>renderer.unmount());

 // 7. Lote en la lista: mover a etapa con una llamada por oportunidad y cambio optimista; lo que falla vuelve y sigue seleccionado.
 renderer=await mount('owner',leads);
 await setView(renderer,'list');
 const check=(name:string)=>renderer.root.findAllByType('input').find(input=>input.props['aria-label']===`Seleccionar ${name}`)!;
 act(()=>check('Acme SA').props.onChange());act(()=>check('Gamma').props.onChange());
 assert.match(text(renderer.root),/2 seleccionados/,'contador de seleccionados');
 const button=(label:string)=>renderer.root.findAllByType('button').find(candidate=>text(candidate).includes(label))!;
 act(()=>button('Mover a etapa').props.onClick());
 assert.match(String(dialogs(renderer)[0].props['aria-label']),/Mover 2 oportunidades/);
 act(()=>{renderer.root.findAll(node=>typeof node.type!=='string'&&node.props.label==='Etapa de destino'&&typeof node.props.onChange==='function')[0].props.onChange('contacted');});
 await act(async()=>{dialogs(renderer)[0].findByType('form').props.onSubmit({preventDefault(){}});});
 assert.deepEqual(requests.map(request=>`${request.init.method} ${request.url}`).sort(),['PATCH /core-api/api/agency/leads/1','PATCH /core-api/api/agency/leads/3'],'una llamada por oportunidad');
 assert.deepEqual(requests.map(request=>JSON.parse(String(request.init.body))),[{stage:'contacted'},{stage:'contacted'}]);
 assert.match(text(listRowsOf(renderer).find(row=>row.props['data-lead-row']==='1')!),/Contactado/,'el cambio es optimista');
 const first=requests.shift()!,second=requests.shift()!;
 const [ok,bad]=first.url.endsWith('/1')?[first,second]:[second,first];
 await act(async()=>{ok.resolve(new Response('{}',{status:200}));bad.resolve(new Response(JSON.stringify({error:'sin permiso'}),{status:500}));});
 await act(async()=>{});
 assert.match(text(listRowsOf(renderer).find(row=>row.props['data-lead-row']==='3')!),/Nuevo lead/,'la que falló vuelve a su etapa');
 assert.match(text(renderer.root),/1 seleccionado(?!s)/,'la que falló queda seleccionada para reintentar');
 await flush({records:leads});
 act(()=>renderer.unmount());

 // 8. Lote: eliminar pide confirmación y llama DELETE por oportunidad.
 renderer=await mount('owner',leads);
 await setView(renderer,'list');
 act(()=>renderer.root.findAllByType('input').find(input=>input.props['aria-label']==='Seleccionar Beta')!.props.onChange());
 act(()=>renderer.root.findAllByType('button').find(candidate=>text(candidate).includes('Eliminar'))!.props.onClick());
 assert.equal(requests.length,0,'abrir la confirmación no llama al API');
 assert.match(text(dialogs(renderer)[0]),/Beta/);
 await act(async()=>{dialogs(renderer)[0].findAllByType('button').find(candidate=>text(candidate).includes('Confirmar'))!.props.onClick();});
 assert.equal(requests[0].url,'/core-api/api/agency/leads/2');assert.equal(requests[0].init.method,'DELETE');
 await flush({});
 await flush({records:leads.filter(lead=>lead.id!=='2')});
 assert.equal(listRowsOf(renderer).length,2);
 act(()=>renderer.unmount());

 // 9. viewer: filtros y vista sí; selección, lote y acciones no.
 renderer=await mount('viewer',leads);
 await setView(renderer,'list');
 assert.equal(listRowsOf(renderer).length,3);
 assert.equal(renderer.root.findAllByType('input').filter(input=>input.props.type==='checkbox').length,0,'viewer no selecciona');
 assert.doesNotMatch(text(renderer.root),/Seleccionar visibles|Mover a etapa|Eliminar|Nueva oportunidad/);
 assert.equal(labels(renderer.root).some(label=>/WhatsApp|Llamar|Acciones de la oportunidad/.test(label)),false,'viewer no ve acciones');
 await setSearch(renderer,'beta');
 assert.equal(listRowsOf(renderer).length,1,'el viewer sí filtra');
 act(()=>renderer.unmount());
 console.log('PASS: pipeline UX (#182): mover a etapa por menu con el mismo PATCH, convertir visible solo en ganado y con capacidad, columnas vacias con alta por etapa y totales sin recorte, filtros en tablero y lista, misma informacion en tarjeta y fila, lote optimista y viewer sin acciones.');
}
void run();
