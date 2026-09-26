import test from 'node:test';
import assert from 'node:assert/strict';
import type {ReportMonth,ReportsData} from '../app/reports-data';
require.extensions['.css']=()=>{};
const {printReportsPdf}=require('../app/reports-print') as typeof import('../app/reports-print');

function moneyEntry(currency:string,invoiced:string,collected:string,invoiceCount:number):ReportMonth['financial'][number]{return {currency,invoiced,collected,invoiceCount,billedClients:0,averageTicket:null,averageRevenuePerClient:null};}
function row(month:string,values:{active:number|null;added:number|null;lost:number|null;isPartial?:boolean;financial?:ReportMonth['financial']}):ReportMonth{return {month,isPartial:!!values.isPartial,clients:{active:values.active,added:values.added,lost:values.lost,retentionPercent:null,averageTenureDays:null,tenureKnown:0,types:[],plans:[]},financial:values.financial||[]};}
const current:ReportsData={asOf:'2026-09-10T15:00:00Z',month:'2020-06',historySince:'2018-01-01T03:00:00Z',months:[
 row('2020-05',{active:5,added:2,lost:0,financial:[moneyEntry('USD','100.00','80.00',2),moneyEntry('PYG','1000000','800000',1)]}),
 row('2020-06',{active:6,added:3,lost:1,financial:[moneyEntry('USD','300.50','200.00',3),moneyEntry('PYG','3000000','2000000',1)]}),
]};
const previous:ReportsData={asOf:'2026-09-10T15:00:00Z',month:'2019-06',historySince:'2018-01-01T03:00:00Z',months:[
 row('2019-06',{active:3,added:1,lost:0,financial:[moneyEntry('USD','0.00','0.00',0),moneyEntry('PYG','0','0',0)]}),
 row('2019-12',{active:4,added:0,lost:2,financial:[moneyEntry('USD','200.00','250.00',4),moneyEntry('PYG','500000','500000',2)]}),
]};
function withWindow<T>(popup:unknown,run:()=>T):T{
 const original=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.assign(globalThis,{window:{open:()=>popup,dispatchEvent:()=>{}}});
 try{return run();}finally{if(original)Object.defineProperty(globalThis,'window',original);else Reflect.deleteProperty(globalThis,'window');}
}

test('blocked popup warns with the shared toast and never throws',()=>{
 const events:{tone:string;message:string}[]=[];
 const original=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.assign(globalThis,{window:{open:()=>null,dispatchEvent:(event:{detail:{tone:string;message:string}})=>{events.push(event.detail);}}});
 try{
  assert.doesNotThrow(()=>printReportsPdf({data:current,previousData:previous,currency:'USD',organizationName:'Scale'}));
 }finally{if(original)Object.defineProperty(globalThis,'window',original);else Reflect.deleteProperty(globalThis,'window');}
 assert.equal(events.length,1);
 assert.equal(events[0].tone,'warning');
 assert.match(events[0].message,/Permití ventanas emergentes para exportar el PDF/);
});

test('popup writes an escaped, currency-separated report and prints on load',()=>{
 let written='',closed=false;
 withWindow({document:{write(value:string){written+=value;},close(){closed=true;}}},()=>{
  printReportsPdf({data:current,previousData:previous,currency:'USD',organizationName:'<script>alert(1)</script> & Co'});
 });
 assert.equal(closed,true);
 assert(written.includes('<!doctype html>'));
 assert(written.includes('@page{size:A4;margin:16mm}'));
 assert(written.includes('font-family:Arial,Outfit,sans-serif'));
 assert(written.includes('font-variant-numeric:tabular-nums'));
 assert(written.includes('window.onload=()=>window.print()'));
 assert(written.includes('&lt;script&gt;alert(1)&lt;/script&gt; &amp; Co'));
 assert(!written.includes('<script>alert(1)</script>'),'injected markup never survives escaping');
 assert(written.includes('<h1>Informes</h1>'));
 assert(written.includes('Período: 1 may. 2020 — 30 jun. 2020'),'el PDF declara el rango completo con año');
 assert(written.match(/Generado: \d{2} [a-z]{3,4} \d{2} · \d{2}:\d{2} \(hora de Asunción\)/));
 assert(written.includes('Comparativa del período visible contra el anterior · USD'));
 assert(written.includes('Período visible: 1 jul. 2019 — 30 jun. 2020 · período anterior: 1 jul. 2018 — 30 jun. 2019'),'la comparación del PDF usa el mismo rango con año');
 assert(written.includes('USD 400,50'));assert(written.includes('USD 200,00'));
 assert(written.includes('Detalle mensual · USD'));
 assert(written.includes('Ticket por factura'));
 assert(written.includes('USD 300,50'));assert(written.includes('USD 100,00'));
 assert(!written.includes('PYG 4.000.000')&&!written.includes('PYG 500.000'),'only the selected currency is exported');
 assert(written.includes('no utilidad'));
 assert(written.includes('Sin datos'));
});

test('missing previous window prints the explicit state and keeps the monthly detail',()=>{
 let written='';
 withWindow({document:{write(value:string){written+=value;},close(){}}},()=>{
  printReportsPdf({data:current,previousData:null,currency:'USD',organizationName:'Scale'});
 });
 assert(written.includes('Sin comparación: no hay período anterior con datos'));
 assert(!written.includes('Comparativa del período visible contra el anterior · USD</h2><table'));
 assert(written.includes('USD 300,50'),'the monthly detail still prints without a comparison');
});
