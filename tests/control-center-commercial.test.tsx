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
const financial={cash:[],receivables:[],collections:[],inventory:[],alerts:[]};
const commercial={activeClients:8,activeProspects:3,expectedMonthlyBilling:[{currency:'PYG',total:'1500000'},{currency:'USD',total:'400'}]};
async function mount(role:string){clearDataCache();setDataScope(`user:org:${role}`);requests=[];await act(async()=>{renderer=create(<ControlCenter role={role} orders={[]} refresh={async()=>{}} navigate={()=>{}}/>);});}
async function run(){
 await mount('owner');assert.deepEqual(requests.map(request=>request.url),['/core-api/api/agency/dashboard','/core-api/api/agency/dashboard/commercial']);await respond(requests[0],financial);await respond(requests[1],commercial);assert.match(text(),/Clientes activos/);assert.match(text(),/Prospectos activos/);assert.match(text(),/USD/);assert.match(text(),/no es el forecast/);act(()=>renderer.unmount());
 await mount('sales');assert.deepEqual(requests.map(request=>request.url),['/core-api/api/agency/dashboard/commercial'],'sales never requests the financial dashboard');await respond(requests[0],commercial);assert.match(text(),/No disponible para tu rol/);assert.doesNotMatch(text(),/USD.*400/,'withheld expected billing is never rendered from an overbroad response');act(()=>renderer.unmount());
 await mount('finance');await respond(requests[0],financial);await respond(requests[1],{activeClients:0,activeProspects:0});assert.match(text(),/No disponible/);assert.doesNotMatch(text(),/>0</,'missing commercial billing is not fabricated as zero');act(()=>renderer.unmount());
 await mount('viewer');assert.equal(requests.length,0,'roles without commercial access do not fetch or render the summary');act(()=>renderer.unmount());
 console.log('PASS commercial control center: role-scoped endpoint, active client/prospect counts, per-currency expected billing, no deceptive zero or leakage');
}
void run();
