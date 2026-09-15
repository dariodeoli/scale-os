import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import type {ReportMonth,ReportsData} from '../app/reports-workspace';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {ReportsWorkspace,reportMoney,reportDelta}=require('../app/reports-workspace') as typeof import('../app/reports-workspace');
type Request={url:string;init:RequestInit;resolve:(response:Response)=>void};
const requests:Request[]=[];
globalThis.fetch=(input,init)=>new Promise<Response>(resolve=>requests.push({url:String(input),init:init||{},resolve}));
let renderer:ReactTestRenderer;
const latest=()=>requests[requests.length-1];
const rendered=()=>JSON.stringify(renderer.toJSON());
function text(node:any=renderer.toJSON()):string{return typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?.map(text).join('')||'';}
async function respond(request:Request,data:unknown,status=200){await act(async()=>{request.resolve(new Response(JSON.stringify(data),{status}));});}
function row(month:string,active:number|null=4,isPartial=false):ReportMonth{return {month,isPartial,clients:{active,added:1,lost:1,retentionPercent:75,averageTenureDays:100,tenureKnown:3,types:[{kind:'company',count:1},{kind:'unknown',count:3}],plans:[{planId:'2',name:'Mensual',count:1},{planId:null,name:null,count:3}]},financial:[{currency:'USD',invoiced:'9007199254740993.1234',collected:'-10.00',invoiceCount:2,billedClients:1,averageTicket:'4503599627370496.56',averageRevenuePerClient:'9007199254740993.12'},{currency:'PYG',invoiced:'50000',collected:'40000',invoiceCount:1,billedClients:1,averageTicket:'50000',averageRevenuePerClient:'50000'}]};}
function fixture(month:string,rows=[row('2020-05'),row(month)]):ReportsData{return {asOf:'2026-09-10T15:00:00Z',month,historySince:'2020-01-01T03:00:00Z',months:rows};}
function month(value:string){act(()=>renderer.root.findByProps({type:'month'}).props.onChange({target:{value}}));}
function history(value:number){act(()=>renderer.root.findAllByType('select')[0].props.onChange({target:{value:String(value)}}));}

async function run(){
 assert.equal(reportMoney('9007199254740993.1234','USD'),'USD 9.007.199.254.740.993,1234');
 assert.equal(reportMoney('-0.0100','USD'),'USD -0,0100');
 assert.equal(reportMoney(null,'USD'),'Sin datos');
 assert.equal(reportMoney('0','PYG'),'PYG 0');
 assert.equal(reportDelta('9007199254740993.12','9007199254740992.11'),'+1,01 · +0,00 %');
 assert.equal(reportDelta('3','2'),'+1 · +50,00 %');
 assert.equal(reportDelta('-5','-10'),'+5 · +50,00 %');
 assert.equal(reportDelta('2','0'),'+2 · porcentaje no disponible (base cero)');
 assert.equal(reportDelta(null,0),'Sin comparación: faltan datos');
 assert.equal(reportDelta(2,1,true),'Sin comparación: mes parcial');
 for(const role of ['management','sales','production','viewer','editor','']){
  act(()=>{renderer=create(<ReportsWorkspace role={role}/>);});
  assert.match(text(),/No tenés permiso/);act(()=>renderer.unmount());
 }
 assert.equal(requests.length,0,'unauthorized roles never fetch');
 for(const role of ['owner','admin','finance']){
  act(()=>{renderer=create(<ReportsWorkspace role={role}/>);});
  assert.equal(latest().init.credentials,'include');
  assert.match(latest().url,/^\/core-api\/api\/agency\/reports\?month=\d{4}-\d{2}&months=12$/);
  const input=renderer.root.findByProps({type:'month'});
  assert.equal(input.props.max,input.props.value,'current Asuncion month is the maximum');
  const before:number=requests.length;month('9998-12');month('2020-13');month('');
  assert.equal(requests.length,before,'invalid and future months never fetch');
  act(()=>renderer.unmount());
 }
 act(()=>{renderer=create(<ReportsWorkspace key="org1" role="owner"/>);});
 const staleInitial=latest();month('2020-06');
 const june=latest();assert.match(june.url,/month=2020-06&months=12/);
 await respond(june,fixture('2020-06'));
 assert.equal(renderer.root.findByType('h2').children[0],'Evolución mensual');
 assert.match(text(),/Mes a consultar/);
 assert.match(text(),/10 de septiembre de 2026(?:, | a las )12:00 \(hora de Asunción\)/);
 assert.match(text(),/Histórico confiable desde: 1 de enero de 2020/);
 assert.doesNotMatch(text(),/2026-09-10T15:00:00Z|2020-01-01T03:00:00Z/,'timestamps are displayed as readable local dates');
 assert.match(text(),/Bajas de actividad/);assert.doesNotMatch(text(),/Clientes perdidos/);
 assert.match(text(),/pausa, cancelación o archivo/);assert.match(text(),/reactivaron durante el mismo mes/);
 assert.match(text(),/fechas desconocidas se excluyen/);assert.match(text(),/no nuevas contrataciones/);
 const distributions=renderer.root.findAllByProps({className:'reports-distribution'});
 assert.equal(distributions.length,2);
 for(const group of distributions){
  assert.equal(group.findAllByType('strong')[0].children.join(''),'1 · 25,0 %');
  assert.equal(group.findAllByType('strong')[1].children.join(''),'3 · 75,0 %');
  assert.equal(group.findAllByProps({className:'reports-bar'})[0].findByType('span').props['aria-hidden'],'true');
 }
 assert.equal(renderer.root.findByType('tbody').findAllByType('tr').length,2);
 assert.match(renderer.root.findByType('caption').children.join(''),/^Evolución mensual · PYG/);
 assert.equal(renderer.root.findByProps({className:'reports-table-scroll'}).props.tabIndex,0);
 act(()=>renderer.root.findAllByType('select')[1].props.onChange({target:{value:'USD'}}));
 assert.match(text(),/USD 9\.007\.199\.254\.740\.993,1234/);
 assert.doesNotMatch(text(),/PYG 50\.000/,'financial currencies are not summed or displayed together');
 const tile=renderer.root.findAllByType('article').find(article=>article.findByType('h3').children[0]==='Facturado · incluye impuestos')!;
 assert.equal(tile.findByType('p').children[0],'0,0000 · 0,00 %');
 await respond(staleInitial,fixture(new URL(staleInitial.url,'https://fixture.invalid').searchParams.get('month')!,[row('2020-06',999)]));
 assert.doesNotMatch(text(),/999/,'out-of-order initial response ignored');

 history(6);const staleSix=latest();assert.match(staleSix.url,/months=6$/);assert.doesNotMatch(text(),/USD 9/,'old report hidden immediately');
 history(24);const twentyFour=latest();assert.match(twentyFour.url,/months=24$/);
 await respond(twentyFour,fixture('2020-06',[row('2020-05',4,true),row('2020-06')]));
 assert.match(text(),/Mes en curso o cobertura incompleta/);
 assert.match(text(),/Sin comparación: mes parcial/,'past incomplete coverage also disables comparisons');
 await respond(staleSix,{error:'old failure'},500);assert.doesNotMatch(text(),/old failure/);
 history(12);await respond(latest(),{error:'No autorizado'},403);
 assert.match(text(),/No autorizado/);assert.equal(renderer.root.findAllByType('table').length,0);
 act(()=>renderer.root.findByType('button').props.onClick());
 await respond(latest(),{...fixture('2020-06',[{...row('2020-06',null),financial:[]}]),historySince:null});
 assert.match(text(),/Histórico confiable desde: sin fecha confirmada/);
 assert.match(text(),/Sin datos/);assert.match(text(),/Sin porcentaje/);
 assert.equal(renderer.root.findAllByType('select')[1].props.disabled,true);
 history(6);const previousTenant=latest();
 act(()=>renderer.update(<ReportsWorkspace key="org2" role="owner"/>));
 const newTenant=latest();assert.match(text(),/Cargando reportes/);
 await respond(previousTenant,fixture('2020-06',[row('2020-06',999)]));
 assert.doesNotMatch(text(),/999/,'integration organization key isolates same-role tenants');
 const newMonth=new URL(newTenant.url,'https://fixture.invalid').searchParams.get('month')!;
 await respond(newTenant,{...fixture(newMonth,[]),asOf:'2026-09-10T01:15:00Z',historySince:'2026-09-01T01:00:00Z'});assert.match(text(),/Sin meses registrados/);
 assert.match(text(),/9 de septiembre de 2026(?:, | a las )22:15/,'cutoff respects the previous local day');
 assert.match(text(),/Histórico confiable desde: 31 de agosto de 2026/,'coverage date respects Asuncion rather than UTC');
 act(()=>renderer.update(<ReportsWorkspace key="org2" role="viewer"/>));
 assert.equal(renderer.root.findAllByType('table').length,0,'permission removal clears private report');
 act(()=>renderer.unmount());

 const css=readFileSync(new URL('../app/reports-workspace.css',import.meta.url),'utf8');
 assert.match(css,/minmax\(min\(100%,180px\),1fr\)/);
 assert.match(css,/minmax\(min\(100%,210px\),1fr\)/);
 assert.match(css,/min-height:44px/);assert.match(css,/font-size:16px/);
 assert.match(css,/\.reports-table-scroll\{[^}]*min-width:0;max-width:100%;overflow-x:auto/);
 assert.match(css,/:focus-visible/);assert.doesNotMatch(css,/100vw|min-width:\s*(?:320|360|390)px/);
 console.log('PASS reports: roles/no fetch, exact money/deltas, unknown-inclusive percentages, partial coverage, currency/month/range, historical table, failures/retry, stale response and tenant-key isolation, mobile CSS contracts');
}
void run();
