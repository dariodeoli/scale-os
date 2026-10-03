import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import type {ForecastData} from '../app/forecast-data';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const events=new EventTarget();Object.defineProperty(globalThis,'window',{configurable:true,value:events});
// Los diálogos se montan con portal: sin DOM real el portal devuelve sus hijos.
const reactDOM=require('react-dom');reactDOM.createPortal=(children:React.ReactNode)=>children;
Object.defineProperty(globalThis,'document',{configurable:true,value:{activeElement:null,body:{style:{overflow:''}},addEventListener(){},removeEventListener(){}}});
// La pantalla consulta el mes de Asunción por defecto: reloj fijo para que el
// fixture (2026-09) no dependa del mes calendario real.
const RealDate=Date;
const FIXED_NOW=RealDate.parse('2026-09-10T15:00:00Z');
class FixedDate extends RealDate{constructor(...args:unknown[]){if(args.length)super(...(args as [string|number]));else super(FIXED_NOW);}static now(){return FIXED_NOW;}}
globalThis.Date=FixedDate as DateConstructor;
const {FinancialForecast}=require('../app/financial-forecast') as typeof import('../app/financial-forecast');

type Request={url:string;init:RequestInit;resolve:(response:Response)=>void};
const requests:Request[]=[];
globalThis.fetch=(input,init)=>new Promise<Response>(resolve=>requests.push({url:String(input),init:init||{},resolve}));
let renderer:ReactTestRenderer;
const rendered=()=>JSON.stringify(renderer.toJSON());
async function respond(request:Request,data:unknown,status=200){await act(async()=>{request.resolve(new Response(JSON.stringify(data),{status}));});}
const plannedRequest=()=>requests.filter(request=>request.url.includes('/planned-expenses?month=2026-09')).at(-1)!;

const plannedRecord={id:'1',cadence:'monthly',effectiveMonth:'2026-09-01',category:'Marketing',amount:'1200',currency:'PYG',note:null,kind:'variable',created_by_email:'fin@example.invalid'};
const base:ForecastData={month:'2026-09',time_zone:'America/Asuncion',records:[],contracted_recurring:{month:'2026-09',records:[]},invoiced:{month:'2026-09',records:[]},collected_actual:{month:'2026-09',records:[]},personnel:{month:'2026-09',included_headcount:'0',records:[]},commission_forecast:{month:'2026-09',records:[]},planned_expenses:{month:'2026-09',records:[{currency:'PYG',amount:'3000',expense_count:3,fixed_count:2,variable_count:1}]},definition:{issued:'',accepted_uninvoiced:'',exclusions:'',contracted_recurring:'',invoiced:'',collected_actual:'',personnel:'',commission_forecast:'',planned_expenses:'Gastos del mes.'}};

/** #144: con totales planificados, el detalle en curso o fallido nunca es «Sin gastos planificados». */
async function run(){
 // A) Total del forecast + detalle en curso → se anuncia la carga, no el vacío.
 await act(async()=>{renderer=create(<FinancialForecast role="finance" organizationId="one"/>);});await act(async()=>{});
 await respond(requests.at(-1)!,base);
 assert.match(rendered(),/total planificado/,'el total planificado del forecast se dibuja');
 assert.equal(renderer.root.findAllByType('summary').some(node=>String(node.children).includes('Ver desglose')),true,'el detalle bimoneda vive bajo «Ver desglose»');
 // #149: gastos planificados y reales bloquean hasta completar sus obligatorios.
 const expenseButton=()=>renderer.root.findAllByType('button').find(button=>String(button.props.children).includes('Agregar gasto planificado'))!;
 assert.equal(expenseButton().props.disabled,true,'sin monto no se agrega un gasto planificado');
 const expenseAmount=renderer.root.findAll(node=>node.type==='input').find(node=>node.props.id==='forecast-expense-amount')!;
 act(()=>expenseAmount.props.onChange({target:{value:'250000'}}));
 assert.equal(expenseButton().props.disabled,false,'con monto positivo se habilita el gasto planificado');
 const realButton=()=>renderer.root.findAllByType('button').find(button=>String(button.props.children).includes('Registrar gasto real'))!;
 assert.equal(realButton().props.disabled,true,'sin cuenta ni monto no se registra un gasto real');
 assert.match(rendered(),/Cargando gastos planificados/,'mientras llega el detalle se anuncia la carga');
 assert.doesNotMatch(rendered(),/Sin gastos planificados/,'el detalle en curso no puede leerse como vacío');
 // El detalle llega: se lista y desaparecen carga y vacío.
 await respond(plannedRequest(),{month:'2026-09',records:[plannedRecord],totals:[{currency:'PYG',amount:'1200'}]});
 assert.match(rendered(),/Marketing/,'el detalle del mes se lista cuando llega');
 assert.doesNotMatch(rendered(),/Sin gastos planificados|Cargando gastos planificados/);
 act(()=>renderer.unmount());

 // B) Total del forecast + detalle vacío → aviso con reintento; el fallo tiene su error.
 await act(async()=>{renderer=create(<FinancialForecast role="finance" organizationId="one"/>);});await act(async()=>{});
 await respond(requests.at(-1)!,base);
 await respond(plannedRequest(),{month:'2026-09',records:[],totals:[]});
 assert.match(rendered(),/La previsión registra gastos planificados/,'total sin detalle se explica y no se niega');
 assert.doesNotMatch(rendered(),/Sin gastos planificados/);
 act(()=>renderer.root.findAllByType('button').find(button=>String(button.props.children).includes('Reintentar'))!.props.onClick());
 await respond(plannedRequest(),{error:'Sin permiso para gastos'},403);
 assert.match(rendered(),/No se pudieron cargar los gastos planificados/,'el fallo del detalle tiene su propio error con reintento');
 assert.doesNotMatch(rendered(),/Sin gastos planificados/);
 act(()=>renderer.unmount());

 // C) Sin totales en la previsión y sin registros → el vacío es honesto.
 await act(async()=>{renderer=create(<FinancialForecast role="finance" organizationId="one"/>);});await act(async()=>{});
 await respond(requests.at(-1)!,{...base,planned_expenses:{month:'2026-09',records:[]}});
 await respond(plannedRequest(),{month:'2026-09',records:[],totals:[]});
 assert.match(rendered(),/Sin gastos planificados para Septiembre 2026/,'sin totales ni detalle el vacío es honesto');
 assert.doesNotMatch(rendered(),/La previsión registra gastos planificados/);
 act(()=>renderer.unmount());
 console.log('PASS previsión #144: el estado vacío de gastos planificados respeta el total del forecast (carga, detalle, fallo y vacío honesto) y el detalle bimoneda vive bajo «Ver desglose»');
}
void run();
