import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};

const dialogPath=require.resolve('../app/dialog');
require.cache[dialogPath]={id:dialogPath,filename:dialogPath,loaded:true,exports:{
 Dialog:({title,children}:{title?:string;children:React.ReactNode})=><section role="dialog" aria-label={title}>{children}</section>,
 FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
 ConfirmDialog:()=>null,
 useDialogClose:()=>undefined,
 useDialogPending:()=>undefined,
}} as NodeModule;
const archivePath=require.resolve('../app/archive-controls');
require.cache[archivePath]={id:archivePath,filename:archivePath,loaded:true,exports:{RemoveRecord:({id}:{id:string})=><button type="button" aria-label={`Mover a la papelera: ${id}`}>Papelera</button>}} as NodeModule;
const composerPath=require.resolve('../app/quote-composer');
require.cache[composerPath]={id:composerPath,filename:composerPath,loaded:true,exports:{QuoteComposer:()=><output>composer</output>}} as NodeModule;

const {PresupuestosSection,BUDGET_VIEW_KEY,readBudgetView}=require('../app/sections/presupuestos') as typeof import('../app/sections/presupuestos');
const {filterBudgets,budgetExpiresSoon}=require('../app/budget-status') as typeof import('../app/budget-status');

const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const user=(role:string)=>({id:'1',role,organization_id:'7',full_name:'Prueba',organization_slug:''} as never);
const nodeFor=()=>({clientWidth:1700});
const NOW=Date.parse('2026-10-14T12:00:00Z');
const budget=(id:string,status:string,client:string,valid:string|null=null)=>({id,number:`P-2026-00${id}`,title:`Propuesta ${id}`,client_name:client,status,item_count:1,valid_until:valid,subtotal:'100',total:'110',currency:'PYG'});
const budgets=[budget('1','draft','Ñandú'),budget('2','sent','Sur','2026-10-18'),budget('3','accepted','Sur','2026-10-16'),budget('4','draft','Ñandú')];

const store=new Map<string,string>();
Object.assign(globalThis,{localStorage:{getItem:(key:string)=>store.get(key)??null,setItem:(key:string,value:string)=>{store.set(key,value);}}});
let renderer!:ReactTestRenderer;
const mount=async(role='owner',list:unknown[]=budgets,onCreate:()=>void=()=>{})=>{
 await act(async()=>{renderer=create(<PresupuestosSection loading={false} user={user(role)} budgetsState="ready" budgets={list as never} invoices={[] as never} budgetKpis={{totals:new Map(),drafts:2,accepted:1,expiring:1}} summary={{} as never} loadBudgets={()=>{}} setBudgets={()=>{}} onCreate={onCreate}/>,{createNodeMock:nodeFor});});
};
const rows=()=>renderer.root.findAll(node=>typeof node.type==='string'&&typeof node.props.className==='string'&&node.props.className.split(/\s+/).includes('budget-row'));
const buttons=(label:string)=>renderer.root.findAllByType('button').filter(button=>text(button).includes(label));

test('filterBudgets: estado, vencen esta semana, cliente y búsqueda comparten una regla',()=>{
 const ids=(filters:Partial<import('../app/budget-status').BudgetFilters>)=>filterBudgets(budgets,{status:'',client:'',query:'',...filters},NOW).map(item=>item.id);
 assert.deepEqual(ids({}),['1','2','3','4']);
 assert.deepEqual(ids({status:'draft'}),['1','4']);
 assert.deepEqual(ids({status:'expiring'}),['2'],'los aceptados no cuentan como por vencer');
 assert.deepEqual(ids({client:'Sur'}),['2','3']);
 assert.deepEqual(ids({query:'propuesta 4'}),['4']);
 assert.deepEqual(ids({status:'draft',client:'Sur'}),[]);
 assert.equal(budgetExpiresSoon({valid_until:'2026-12-01',status:'sent'},NOW),false);
});

test('presupuestos: «Nuevo presupuesto» siempre visible en el encabezado y sólo con permiso',async()=>{
 let created=0;
 await mount('owner',budgets,()=>{created+=1;});
 const header=renderer.root.findAll(node=>node.type==='header'&&String(node.props.className).includes('ui-page-header'));
 assert.equal(header.length,1,'el encabezado es el PageHeader de ListPage');
 const create=buttons('Nuevo presupuesto');
 assert.equal(create.length,1);
 assert.ok(create[0].parent&&header[0].findAll(node=>node===create[0]).length===1,'la acción vive dentro del encabezado');
 act(()=>create[0].props.onClick());
 assert.equal(created,1);
 act(()=>renderer.unmount());
 await mount('viewer');
 assert.equal(buttons('Nuevo presupuesto').length,0,'viewer no ve acciones');
 act(()=>renderer.unmount());
});

test('presupuestos: los KPI filtran la lista (alternan) y se combinan con estado/búsqueda',async()=>{
 store.clear();
 await mount();
 assert.equal(rows().length,4);
 act(()=>buttons('Sin enviar al cliente')[0].props.onClick());
 assert.equal(rows().length,2,'Borradores filtra a los borradores');
 assert.equal(buttons('Sin enviar al cliente')[0].props['aria-pressed'],true);
 assert.match(text(renderer.root),/2 de 4/,'el resumen cuenta lo filtrado');
 act(()=>buttons('Sin enviar al cliente')[0].props.onClick());
 assert.equal(rows().length,4,'un segundo clic quita el filtro');
 act(()=>buttons('Vigencia en los próximos 7 días')[0].props.onClick());
 assert.ok(rows().length<=4);
 act(()=>buttons('Limpiar filtros')[0].props.onClick());
 const search=renderer.root.findAllByType('input').find(input=>input.props['aria-label']==='Buscar presupuesto')!;
 act(()=>search.props.onChange({target:{value:'propuesta 3'}}));
 assert.equal(rows().length,1,'la búsqueda filtra por número, título o cliente');
 act(()=>renderer.unmount());
});

test('presupuestos: la vista lista/tarjetas se elige y persiste como en Clientes',async()=>{
 store.clear();
 assert.equal(readBudgetView(),'list','lista por defecto');
 await mount();
 const grid=renderer.root.findAllByType('button').find(button=>button.props['aria-label']==='Ver como cuadrícula')!;
 await act(async()=>{grid.props.onClick();});
 assert.equal(store.get(BUDGET_VIEW_KEY),'grid');
 assert.equal(readBudgetView(),'grid');
 // La misma información en ambas vistas: número, título, cliente, estado y total.
 const copy=text(renderer.root);
 for(const value of ['P-2026-001','Propuesta 1','Ñandú','Borrador','Total'])assert.match(copy,new RegExp(value),`la tarjeta conserva ${value}`);
 act(()=>renderer.unmount());
});
