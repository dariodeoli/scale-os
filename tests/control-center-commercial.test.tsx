import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {clearDataCache,setDataScope} from '../app/data-cache';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {ControlCenter}=require('../app/control-center') as typeof import('../app/control-center');
type Request={url:string;resolve:(response:Response)=>void};
let requests:Request[]=[];let renderer:ReactTestRenderer;
globalThis.fetch=input=>new Promise<Response>(resolve=>requests.push({url:String(input),resolve}));
const text=()=>JSON.stringify(renderer.toJSON());
async function respond(request:Request,data:unknown,status=200){await act(async()=>{request.resolve(new Response(JSON.stringify(data),{status}));});}
const financial={cash:[],receivables:[],collections:[],inventory:[],expenses:[],personnel:[],expected:[],alerts:[]};
const commercial={active_clients:8,active_prospects:3,contracted_billing:{available:true,records:[{currency:'PYG',net_monthly:'1500000'},{currency:'PYG',net_monthly:'250000'},{currency:'USD',net_monthly:'400'}]}};
const salesCommercial={active_clients:8,active_prospects:3,contracted_billing:{available:false,reason:'permission'}};
async function mount(role:string){clearDataCache();setDataScope(`user:org:${role}`);requests=[];await act(async()=>{renderer=create(<ControlCenter role={role} orders={[]} refresh={async()=>{}} navigate={()=>{}} signals={{unanswered_budgets:null,unverified_inventory:null,upcoming_deliveries:null}}/>);});}
async function run(){
 await mount('owner');assert.deepEqual(requests.map(request=>request.url),['/core-api/api/agency/dashboard','/core-api/api/agency/control-center']);await respond(requests[0],financial);await respond(requests[1],commercial);assert.match(text(),/Clientes activos/);assert.match(text(),/Prospectos activos/);assert.match(text(),/USD/);assert.match(text(),/1\.750\.000/,'contracts are totaled per currency');assert.match(text(),/no es el forecast/);act(()=>renderer.unmount());
 await mount('admin');assert.deepEqual(requests.map(request=>request.url),['/core-api/api/agency/dashboard','/core-api/api/agency/control-center']);await respond(requests[0],financial);await respond(requests[1],commercial);assert.match(text(),/1\.750\.000/,'admins retain the per-currency contracted billing aggregation');act(()=>renderer.unmount());
 await mount('sales');assert.deepEqual(requests.map(request=>request.url),['/core-api/api/agency/work-orders?due=overdue&limit=30&fields=id,title,status,project_id,project_name,client_name,due_date','/core-api/api/agency/control-center'],'sales nunca pide el dashboard financiero: pide los vencidos exactos y el resumen comercial');await respond(requests[0],{workOrders:[{id:'9',title:'Pieza vencida',status:'editing',due_date:'2026-09-01',client_name:'ACME',project_name:'Campaña'},{id:'10',title:'Otra vencida',status:'blocked',due_date:'2026-09-02',client_name:'ACME',project_name:'Campaña'}],page:{hasMore:false}});await respond(requests[1],salesCommercial);assert.match(text(),/Pendientes vencidos/,'las alertas exactas se muestran sin finanzas');assert.match(text(),/Pieza vencida/);assert.match(text(),/ACME · Campaña/,'el contexto cliente · proyecto viaja en la alerta');assert.match(text(),/No disponible para tu rol/);assert.doesNotMatch(text(),/No se pudo validar el resumen comercial/,'the canonical permission state is not treated as malformed data');assert.doesNotMatch(text(),/USD.*400/,'withheld expected billing is never rendered from an overbroad response');act(()=>renderer.unmount());
 await mount('finance');await respond(requests[0],financial);await respond(requests[1],{active_clients:0,active_prospects:0,contracted_billing:null});assert.match(text(),/No disponible/);assert.doesNotMatch(text(),/>0</,'unavailable commercial billing is not fabricated as zero');act(()=>renderer.unmount());
 await mount('owner');await respond(requests[0],financial);await respond(requests[1],{activeClients:8,activeProspects:3});assert.match(text(),/No se pudo validar el resumen comercial/,'legacy camelCase data is rejected instead of rendered as a valid canonical response');act(()=>renderer.unmount());
 await mount('viewer');assert.deepEqual(requests.map(request=>request.url),['/core-api/api/agency/work-orders?due=overdue&limit=30&fields=id,title,status,project_id,project_name,client_name,due_date'],'viewer no pide dashboard ni comercial: solo los vencidos visibles');await respond(requests[0],{workOrders:[],page:{hasMore:false}});assert.doesNotMatch(text(),/Clientes activos/,'sin finanzas no se renderiza el resumen comercial');act(()=>renderer.unmount());
 console.log('PASS commercial control center: canonical route, snake_case response, currency-aware contracted billing totals, unavailable values, alertas exactas sin finanzas y role boundaries');
}
void run();
