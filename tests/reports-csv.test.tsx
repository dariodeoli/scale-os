import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {reportsCsv} from '../app/reports-csv';
import type {ReportMonth,ReportsData} from '../app/reports-workspace';

function row(month:string):ReportMonth{return {month,isPartial:true,clients:{active:null,added:0,lost:1,retentionPercent:null,averageTenureDays:12.5,tenureKnown:2,types:[],plans:[]},financial:[
 {currency:'USD',invoiced:'9007199254740993.123400',collected:'-0.0100',invoiceCount:2,billedClients:1,averageTicket:null,averageRevenuePerClient:'0.00'},
 {currency:'PYG',invoiced:'50000',collected:'40000',invoiceCount:1,billedClients:1,averageTicket:'50000',averageRevenuePerClient:'50000'}]};}
function data(month='2020-06'):ReportsData{return {month,asOf:'2026-09-11T12:00:00Z',historySince:null,months:[row(month),{...row('2020-05'),financial:[]}]};}
// Parse quoted CSV independently, including embedded delimiters, quotes and newlines.
function parse(csv:string){
 const rows:string[][]=[];let fields:string[]=[],field='',quoted=false;
 for(let i=1;i<csv.length;i++){
  const char=csv[i];
  if(char==='"'){if(quoted&&csv[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&char===';'){fields.push(field);field='';}
  else if(!quoted&&char==='\r'&&csv[i+1]==='\n'){fields.push(field);rows.push(fields);fields=[];field='';i++;}
  else field+=char;
 }
 assert.equal(quoted,false);return rows;
}

test('CSV preserves exact selected-currency decimals, missing values, partial months and coverage without mutating data',()=>{
 const source=data(),before=JSON.stringify(source),csv=reportsCsv(source,'USD'),rows=parse(csv);
 assert.equal(csv.charCodeAt(0),0xFEFF);
 assert.equal(rows.length,3);assert(rows.every(r=>r.length===17));
 assert.equal(rows[1][0],'2020-05');assert.equal(rows[2][0],'2020-06');
 assert.deepEqual(rows[2].slice(1,6),['Sí','USD','','0','1']);
 assert.equal(rows[2][9],'9007199254740993.123400');assert.equal(rows[2][10],'-0.0100');
 assert.equal(rows[2][13],'');assert.equal(rows[2][14],'0.00');
 assert.equal(rows[2][15],source.asOf);assert.equal(rows[2][16],'');
 assert(rows[1].slice(9,15).every(value=>value===''),'missing currency stays unknown, not zero');
 assert(!csv.includes('50000'));assert.equal(JSON.stringify(source),before);
 assert.equal(parse(reportsCsv(source,'PYG'))[2][9],'50000');
 assert.equal(parse(reportsCsv({...source,months:[]},'USD')).length,1);
});

test('CSV escapes formula text, quotes and separators, and rejects formulas in numeric fields',()=>{
 for(const attack of ['=1+1','+SUM(A1)','-1+1','@SUM(A1)',' \t=1+1','\tformula','\rformula','\nformula']){
  const source=data();source.asOf=attack;source.historySince='Texto; "citado"\r\nsegunda línea';
  source.months=[row('2020-06')];source.months[0].financial[0].invoiced=attack;
  const rows=parse(reportsCsv(source,'USD'));
  assert.equal(rows[1][9],'','malformed numeric values must not become spreadsheet formulas');
  assert.equal(rows[1][15],"'"+attack);assert.equal(rows[1][16],source.historySince);
  assert.equal(parse(reportsCsv(source,attack))[1][2],"'"+attack);
 }
});

test('report CSV download uses loaded data only, respects roles and filters, and recovers from download errors',async()=>{
 const originalReact=Object.getOwnPropertyDescriptor(globalThis,'React'),originalDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
 const originalFetch=globalThis.fetch,originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL,originalTimeout=globalThis.setTimeout;
 const css=require.extensions['.css'];require.extensions['.css']=()=>{};
 Object.assign(globalThis,{React});
 const {ReportsWorkspace}=require('../app/reports-workspace') as typeof import('../app/reports-workspace');
 const requests:{url:string;resolve:(response:Response)=>void}[]=[],blobs:Blob[]=[],filenames:string[]=[],revoked:string[]=[],cleanup:(()=>void)[]=[];
 let failDownload=false,removed=0,renderer:ReactTestRenderer|undefined;
 globalThis.fetch=(url)=>new Promise<Response>(resolve=>requests.push({url:String(url),resolve}));
 URL.createObjectURL=(blob)=>{if(failDownload)throw Error('download unavailable');blobs.push(blob as Blob);return 'blob:csv-'+blobs.length;};
 URL.revokeObjectURL=url=>{revoked.push(url);};
 globalThis.setTimeout=((fn:()=>void,ms?:number)=>{if(ms===1000){cleanup.push(fn);return 0;}return originalTimeout(fn,ms);}) as typeof setTimeout;
 Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{appendChild(){}},createElement(tag:string){assert.equal(tag,'a');return {href:'',download:'',click(){filenames.push(this.download);},remove(){removed++;}};}}});
 const button=()=>renderer!.root.findAllByType('button').find(b=>String(b.props.children).startsWith('Exportar histórico CSV'));
  const respond=async()=>{const req=requests.filter(r=>r.url?.includes('/reports?')).at(-1)!,month=new URL(req.url,'https://fixture.invalid').searchParams.get('month')!;await act(async()=>req.resolve(new Response(JSON.stringify(data(month)))));};
 try{
  for(const role of ['viewer','editor','production','sales','management']){
   await act(async()=>{renderer=create(<ReportsWorkspace role={role}/>);});assert.equal(button(),undefined);await act(async()=>renderer!.unmount());
  }
  assert.equal(requests.length,0);
  for(const role of ['owner','admin','finance']){
   await act(async()=>{renderer=create(<ReportsWorkspace role={role}/>);});assert.equal(button(),undefined);
   await respond();
   await act(async()=>renderer!.root.findAllByType('select')[1].props.onChange({target:{value:'USD'}}));
   const count:number=requests.length;
   await act(async()=>button()!.props.onClick());
   assert.equal(requests.length,count,'export never makes an API request');
   assert.match(filenames.at(-1)!,/^scale-os-informes-\d{4}-\d{2}-USD\.csv$/);
   assert.equal(blobs.at(-1)!.type,'text/csv;charset=utf-8');
   assert((await blobs.at(-1)!.text()).includes('9007199254740993.123400'));
   assert(!JSON.stringify(renderer!.toJSON()).includes('No se pudo descargar'));
   await act(async()=>renderer!.unmount());
  }
  await act(async()=>{renderer=create(<ReportsWorkspace role="owner"/>);});await respond();
  failDownload=true;await act(async()=>button()!.props.onClick());
  assert(JSON.stringify(renderer!.toJSON()).includes('No se pudo descargar el CSV'));
  failDownload=false;await act(async()=>button()!.props.onClick());
  assert(!JSON.stringify(renderer!.toJSON()).includes('No se pudo descargar el CSV'));
  await act(async()=>renderer!.root.findAllByType('select')[0].props.onChange({target:{value:'6'}}));
  assert.equal(button(),undefined,'changed filters hide stale export immediately');
  const req=requests.at(-1)!;await act(async()=>req.resolve(new Response(JSON.stringify({error:'Sin acceso'}),{status:403})));
  assert.equal(button(),undefined,'failed report fetch offers no export');
  await act(async()=>renderer!.root.findByType('button').props.onClick());
  const empty=requests.at(-1)!,month=new URL(empty.url,'https://fixture.invalid').searchParams.get('month')!;
  await act(async()=>empty.resolve(new Response(JSON.stringify({...data(month),months:[]}))));
  assert.equal(button()!.props.disabled,true);
  await act(async()=>renderer!.update(<ReportsWorkspace role="viewer"/>));assert.equal(button(),undefined);
  assert.equal(revoked.length,0);cleanup.forEach(fn=>fn());
  assert.equal(revoked.length,blobs.length);assert.equal(removed,blobs.length);
 }finally{
  if(renderer)await act(async()=>renderer!.unmount());
  globalThis.fetch=originalFetch;globalThis.setTimeout=originalTimeout;URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;
  if(css)require.extensions['.css']=css;else delete require.extensions['.css'];
  for(const [key,descriptor] of [['React',originalReact],['document',originalDocument]] as const){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}
 }
});
