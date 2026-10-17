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

const def={issued:'',accepted_uninvoiced:'',exclusions:'',contracted_recurring:'',invoiced:'',collected_actual:'',personnel:'',commission_forecast:'',planned_expenses:'',contracted_clients:'Clientes activos.'};
const data:ForecastData={month:'2026-09',time_zone:'America/Asuncion',records:[],contracted_recurring:{month:'2026-09',records:[]},invoiced:{month:'2026-09',records:[]},collected_actual:{month:'2026-09',records:[]},commission_forecast:{month:'2026-09',records:[]},planned_expenses:{month:'2026-09',records:[]},
 contracted_clients:{month:'2026-09',records:[{client_id:'1',client_name:'Cliente Con Plan',currency:'PYG',contracted_amount:1000,invoiced_amount:0,invoice_required:false,missing_invoice:false,plan_name:'Plan Growth'},{client_id:'2',client_name:'Cliente Sin Plan',currency:'PYG',contracted_amount:0,invoiced_amount:0,invoice_required:false,missing_invoice:false,plan_name:null}]},
 personnel:{month:'2026-09',included_headcount:1,records:[{currency:'PYG',included_headcount:1,base_count:0,base_amount:0,override_count:0,override_amount:0,expected_end_of_month_expense:0,members:[{collaborator_id:'3',user_id:null,name:'Persona Sin Fijo',photo_url:null,compensation_type:'hourly',currency:'PYG',base_amount:0,override_amount:0}]}]},definition:def};

/** Previsión: todos los clientes activos con plan a la izquierda; salarios a la derecha con el nombre siempre visible. */
async function run(){
 await act(async()=>{renderer=create(<FinancialForecast role="finance" organizationId="one"/>);});await act(async()=>{});
 await respond(requests.at(-1)!,data);
 const text=rendered();
 assert.doesNotMatch(text,/Plan Growth|Cliente Sin Plan|Persona Sin Fijo/,'el detalle de clientes y personas sólo se muestra en Balance');
 assert.doesNotMatch(text,/Contratos vs facturación|Editar salario/,'no se duplican tablas ni formularios operativos en Previsión');
 assert.match(text,/Ingresos vs gastos/,'Previsión conserva sus agregados y proyección');
 act(()=>renderer.unmount());
 console.log('PASS previsión: proyección conserva agregados sin duplicar el detalle operativo trasladado a Balance (#238)');
}
run().catch(error=>{console.error(error);process.exit(1);});
