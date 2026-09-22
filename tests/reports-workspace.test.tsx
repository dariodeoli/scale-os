import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import type {ReportMonth,ReportsData} from '../app/reports-data';
const {SelectCustom}=require('../app/profile-controls') as typeof import('../app/profile-controls');

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {ReportsWorkspace}=require('../app/reports-workspace') as typeof import('../app/reports-workspace');
const {reportMoney,reportDelta}=require('../app/reports-data') as typeof import('../app/reports-data');
type Request={url:string;init:RequestInit;resolve:(response:Response)=>void};
const requests:Request[]=[];
globalThis.fetch=(input,init)=>new Promise<Response>(resolve=>requests.push({url:String(input),init:init||{},resolve}));
let renderer:ReactTestRenderer;
const latest=()=>requests[requests.length-1];
const rendered=()=>JSON.stringify(renderer.toJSON());
function text(node:any=renderer.toJSON()):string{return typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?.map(text).join('')||'';}
async function respond(request:Request,data:unknown,status=200){await act(async()=>{request.resolve(new Response(JSON.stringify(data),{status}));});}
function row(month:string,active:number|null=4,isPartial=false):ReportMonth{return {month,isPartial,clients:{active,added:1,lost:1,retentionPercent:75,averageTenureDays:100,tenureKnown:3,types:[{kind:'company',count:1},{kind:'unknown',count:3}],plans:[{planId:'2',name:'Mensual',count:1},{planId:null,name:null,count:3}]},financial:[{currency:'USD',invoiced:'9007199254740993.1234',collected:'-10.00',invoiceCount:2,billedClients:1,averageTicket:'4503599627370496.56',averageRevenuePerClient:'9007199254740993.12'},{currency:'PYG',invoiced:'50000',collected:'40000',invoiceCount:1,billedClients:1,averageTicket:'50000',averageRevenuePerClient:'50000'}]};}
function moneyEntry(currency:string,invoiced:string,collected:string,invoiceCount:number):ReportMonth['financial'][number]{return {currency,invoiced,collected,invoiceCount,billedClients:0,averageTicket:null,averageRevenuePerClient:null};}
function compareRow(month:string,values:{active:number|null;added:number|null;lost:number|null;isPartial?:boolean;financial?:ReportMonth['financial']}):ReportMonth{return {month,isPartial:!!values.isPartial,clients:{active:values.active,added:values.added,lost:values.lost,retentionPercent:null,averageTenureDays:null,tenureKnown:0,types:[],plans:[]},financial:values.financial||[]};}
function fixture(month:string,rows=[row('2020-05'),row(month)]):ReportsData{return {asOf:'2026-09-10T15:00:00Z',month,historySince:'2020-01-01T03:00:00Z',months:rows};}
function month(value:string){act(()=>renderer.root.findAllByProps({type:'month'})[0].props.onChange({target:{value}}));}
function history(value:number){act(()=>renderer.root.findAllByType('button').find(button=>button.props.title===`Últimos ${value} meses`)!.props.onClick());}

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
 for(const role of ['management','production','viewer','editor','']){
  act(()=>{renderer=create(<ReportsWorkspace role={role} organizationName="Scale"/>);});
   assert.match(text(),/No tenés permiso/);act(()=>renderer.unmount());
 }
 assert.equal(requests.length,0,'unauthorized roles never fetch');
 for(const role of ['owner','admin','finance','sales']){
  act(()=>{renderer=create(<ReportsWorkspace role={role} organizationName="Scale"/>);});
   assert.equal(latest().init.credentials,'include');
  assert.ok(requests.some(r=>/^\/core-api\/api\/agency\/reports\?month=\d{4}-\d{2}&months=12$/.test(r.url)),'monthly report request fires');
  const input=renderer.root.findAllByProps({type:'month'})[0];
  assert.equal(input.props.max,input.props.value,'current Asuncion month is the maximum');
  const before:number=requests.length;month('9998-12');month('2020-13');month('');
  assert.equal(requests.length,before,'invalid and future months never fetch');
  act(()=>renderer.unmount());
 }
  act(()=>{renderer=create(<ReportsWorkspace key="org1" role="owner" organizationName="Scale"/>);});
  const staleInitial=requests.find(r=>r.url?.includes('/reports?'))!;month('2020-06');
 const june=latest();assert.match(june.url,/month=2020-06&months=12/);
 await respond(june,fixture('2020-06'));
  assert.equal(renderer.root.findAllByType('h2')[0].children[0],'Evolución mensual');
 assert.match(text(),/Mes a consultar/);
 assert.match(text(),/Datos al 10 sept 26 · 12:00 \(hora de Asunción\)/);
 assert.match(text(),/Histórico confiable desde: 01 ene 20 · 00:00/);
 assert.doesNotMatch(text(),/2026-09-10T15:00:00Z|2020-01-01T03:00:00Z/,'timestamps are displayed as readable local dates');
 assert.match(text(),/Bajas de actividad/);assert.doesNotMatch(text(),/Clientes perdidos/);
 assert.match(text(),/pausa, cancelación o archivo/);assert.match(text(),/reactivaron durante el mismo mes/);
 assert.match(text(),/fechas desconocidas se excluyen/);assert.match(text(),/no nuevas contrataciones/);
 assert.match(text(),/Tipos de clientes activos/);assert.match(text(),/Planes por cantidad de clientes activos/);
 const occurrences=(value:string)=>text().split(value).length-1;
 assert.equal(occurrences('1 · 25,0 %'),2,'las dos distribuciones muestran su cuota');
 assert.equal(occurrences('3 · 75,0 %'),2,'las dos distribuciones muestran su cuota');
 assert.equal(renderer.root.findAll(node=>node.type==='div'&&node.props.role==='progressbar').length,4,'cada fila con cuota dibuja su barra');
 assert.equal(renderer.root.findAllByType('tbody').at(-1)!.findAllByType('tr').length,2,'el histórico lista un mes por fila');
 assert.match(text(),/Evolución mensual · PYG/);
 assert(renderer.root.findAllByType('table').length>=1,'el histórico es una tabla real');
 act(()=>renderer.root.findAllByType(SelectCustom)[0].props.onChange('USD'));
 assert.match(text(),/USD 9\.007\.199\.254\.740\.993,1234/);
 assert.doesNotMatch(text(),/PYG 50\.000/,'financial currencies are not summed or displayed together');
 assert(renderer.root.findAllByProps({label:'Facturado · incluye impuestos',hint:'0,0000 · 0,00 %'}).length>0,'el tile de facturado muestra su variación');
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
 act(()=>renderer.root.findAllByType("button").find(node=>String(node.props.children).includes("Reintentar"))!.props.onClick());
 await respond(latest(),{...fixture('2020-06',[{...row('2020-06',null),financial:[]}]),historySince:null});
 assert.match(text(),/Histórico confiable desde: sin fecha confirmada/);
 assert.match(text(),/Sin datos/);assert.match(text(),/Sin porcentaje/);
 assert.equal(renderer.root.findAllByType(SelectCustom)[0].props.disabled,true);
  history(6);const previousTenant=latest();
  const tenantRequests=requests.length;
  act(()=>renderer.update(<ReportsWorkspace key="org2" role="owner" organizationName="Scale"/>));
  const newTenant=requests.slice(tenantRequests).find(r=>r.url?.includes('/reports?'))!;assert(renderer.root.findAllByProps({'aria-label':'Cargando reportes…'}).length>0,'la carga se anuncia');
 await respond(previousTenant,fixture('2020-06',[row('2020-06',999)]));
 assert.doesNotMatch(text(),/999/,'integration organization key isolates same-role tenants');
 const newMonth=new URL(newTenant.url,'https://fixture.invalid').searchParams.get('month')!;
 await respond(newTenant,{...fixture(newMonth,[]),asOf:'2026-09-10T01:15:00Z',historySince:'2026-09-01T01:00:00Z'});assert.match(text(),/Sin meses registrados/);
 assert.match(text(),/Datos al 09 sept 26 · 22:15/,'cutoff respects the previous local day');
 assert.match(text(),/Histórico confiable desde: 31 ago 26 · 22:00/,'coverage date respects Asuncion rather than UTC');
  act(()=>renderer.update(<ReportsWorkspace key="org2" role="viewer" organizationName="Scale"/>));
  assert.equal(renderer.root.findAllByType('table').length,0,'permission removal clears private report');
  act(()=>renderer.unmount());

  // Previous equal window: a second API call, real per-currency variations,
  // explicit unavailable state and partial-month suppression.
  const compareCurrent:ReportsData={asOf:'2026-09-10T15:00:00Z',month:'2020-06',historySince:'2018-01-01T03:00:00Z',months:[
   compareRow('2020-05',{active:5,added:2,lost:0,financial:[moneyEntry('USD','100.00','80.00',2),moneyEntry('PYG','1000000','800000',1)]}),
   compareRow('2020-06',{active:6,added:3,lost:1,financial:[moneyEntry('USD','300.50','200.00',3),moneyEntry('PYG','3000000','2000000',1)]}),
  ]};
  const comparePrevious:ReportsData={asOf:'2026-09-10T15:00:00Z',month:'2019-06',historySince:'2018-01-01T03:00:00Z',months:[
   compareRow('2018-08',{active:3,added:0,lost:2,financial:[moneyEntry('USD','200.00','250.00',4),moneyEntry('PYG','500000','500000',2)]}),
   compareRow('2019-06',{active:4,added:1,lost:0,financial:[moneyEntry('USD','0.00','0.00',0),moneyEntry('PYG','0','0',0)]}),
  ]};
  const compareBlockStart=requests.length;
  act(()=>{renderer=create(<ReportsWorkspace key="org-compare" role="owner" organizationName="Scale"/>);});
  month('2020-06');const compareCurrentRequest=latest();
  assert.match(compareCurrentRequest.url,/month=2020-06&months=12/);
  await respond(compareCurrentRequest,compareCurrent);
  assert.match(text(),/Comparativa del período visible contra el anterior/);
  assert.match(text(),/Sin comparación: no hay período anterior con datos/,'the comparison waits for its own previous-window response');
  const comparePreviousRequest=latest();
  assert.match(comparePreviousRequest.url,/month=2019-06&months=12$/,'the previous equal window is requested from the same API');
  assert.equal(requests.slice(compareBlockStart).filter(request=>request.url.includes('month=2019-06')).length,1,'the stale initial response never fires a previous window');
  await respond(comparePreviousRequest,comparePrevious);
  const comparisonText=()=>text(renderer.root.findAll(node=>node.type==='div'&&typeof node.props.className==='string'&&node.props.className.includes('rounded-xl')&&text(node).includes('Comparativa del período visible'))[0]);
  assert.match(comparisonText(),/Período visible: 01-jul – 01-jun · período anterior: 01-jul – 01-jun \(12 meses por período\)/,'both windows are described with dd-MMM dates');
  act(()=>renderer.root.findAllByType(SelectCustom)[0].props.onChange('USD'));
  const usdComparison=comparisonText();
  assert.match(usdComparison,/Clientes activos \(último mes con datos\)/);
  assert.match(usdComparison,/\+2 · \+50,00 %/,'active clients use the end-of-window snapshot');
  assert.match(usdComparison,/\+4 · \+400,00 %/,'incorporated clients sum the whole window');
  assert.match(usdComparison,/-1 · -50,00 %/,'lost clients keep the sign');
  assert.match(usdComparison,/USD 400,50/);assert.match(usdComparison,/USD 200,00/);
  assert.match(usdComparison,/\+200,50 · \+100,25 %/,'invoiced totals sum the window before comparing');
  assert.match(usdComparison,/\+30,00 · \+12,00 %/,'collected totals compare with their own base');
  assert.match(usdComparison,/USD 80,10/);assert.match(usdComparison,/USD 50,00/);
  assert.match(usdComparison,/\+30,10 · \+60,20 %/,'average ticket divides total invoiced by invoices, rounded half-up');
  assert.doesNotMatch(usdComparison,/PYG/,'the selected currency never mixes with others');
  act(()=>renderer.root.findAllByType(SelectCustom)[0].props.onChange('PYG'));
  const pygComparison=comparisonText();
  assert.match(pygComparison,/PYG 4\.000\.000/);assert.match(pygComparison,/PYG 500\.000/);assert.match(pygComparison,/PYG 2\.000\.000/);
  assert.doesNotMatch(pygComparison,/USD/,'switching currency rebuilds the comparison rows');
  history(6);const partialCurrentRequest=latest();assert.match(partialCurrentRequest.url,/months=6$/);
  await respond(partialCurrentRequest,{...compareCurrent,months:[
   compareRow('2020-05',{active:5,added:2,lost:0,isPartial:true,financial:[moneyEntry('USD','100.00','80.00',2),moneyEntry('PYG','1000000','800000',1)]}),
   compareRow('2020-06',{active:6,added:3,lost:1,financial:[moneyEntry('USD','300.50','200.00',3),moneyEntry('PYG','3000000','2000000',1)]}),
  ]});
  const partialPreviousRequest=latest();assert.match(partialPreviousRequest.url,/month=2019-12&months=6$/);
  await respond(partialPreviousRequest,{asOf:'2026-09-10T15:00:00Z',month:'2019-12',historySince:'2018-01-01T03:00:00Z',months:[
   compareRow('2019-10',{active:4,added:1,lost:0,financial:[moneyEntry('USD','200.00','250.00',4),moneyEntry('PYG','500000','500000',2)]}),
  ]});
  act(()=>renderer.root.findAllByType(SelectCustom)[0].props.onChange('USD'));
  const partialComparison=comparisonText();
  assert.match(partialComparison,/\+2 · \+50,00 %/,'the snapshot still compares when the newest month is complete');
  assert.match(partialComparison,/Sin comparación: mes parcial/,'partial months suppress the sums they feed');
  assert.doesNotMatch(partialComparison,/\+400,00 %/);
  history(24);const emptyCurrentRequest=latest();assert.match(emptyCurrentRequest.url,/months=24$/);
  await respond(emptyCurrentRequest,{...compareCurrent,historySince:'2015-01-01T03:00:00Z'});
  const emptyPreviousRequest=latest();assert.match(emptyPreviousRequest.url,/month=2018-06&months=24$/);
  await respond(emptyPreviousRequest,{asOf:'2026-09-10T15:00:00Z',month:'2018-06',historySince:'2015-01-01T03:00:00Z',months:[]});
  assert.match(comparisonText(),/Sin comparación: no hay período anterior con datos/,'an empty previous window renders the explicit state');
  history(12);const historyCurrentRequest=latest();assert.match(historyCurrentRequest.url,/months=12$/);
  await respond(historyCurrentRequest,{...compareCurrent,historySince:'2018-07-15T03:00:00Z'});
  const historyPreviousRequest=latest();assert.match(historyPreviousRequest.url,/month=2019-06&months=12$/);
  await respond(historyPreviousRequest,{asOf:'2026-09-10T15:00:00Z',month:'2019-06',historySince:'2018-07-15T03:00:00Z',months:[
   compareRow('2019-05',{active:4,added:1,lost:0,financial:[moneyEntry('USD','200.00','250.00',4)]}),
  ]});
  assert.match(comparisonText(),/Sin comparación: no hay período anterior con datos/,'history starting inside the previous window suppresses the comparison');
  month('1900-01');const edgeRequest=latest();assert.match(edgeRequest.url,/month=1900-01&months=12/);
  const beforeEdge=requests.length;
  await respond(edgeRequest,{asOf:'2026-09-10T15:00:00Z',month:'1900-01',historySince:'1900-01-01T03:00:00Z',months:[compareRow('1900-01',{active:1,added:1,lost:0,financial:[moneyEntry('USD','10.00','10.00',1)]})]});
  assert.equal(requests.length,beforeEdge,'no previous window before the supported month range');
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
