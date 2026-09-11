import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {useForm} from 'react-hook-form';
import {CompanyCurrencyProvider,useCompanyCurrency} from '../app/currency-provider';
import type {ForecastData} from '../app/financial-forecast';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {FinancialForecast,currentForecastMonth}=require('../app/financial-forecast') as typeof import('../app/financial-forecast');
const events=new EventTarget();
Object.defineProperty(globalThis,'window',{configurable:true,value:events});
let preference:ReturnType<typeof useCompanyCurrency>;
function Form(){const {currency}=useCompanyCurrency();const form=useForm({defaultValues:{currency}});return <output>{form.watch('currency')}</output>;}
function Preference(){preference=useCompanyCurrency();return <span>{preference.currency}</span>;}
let renderer:ReactTestRenderer;
const tree=(org:string,currency:string,open=true)=><CompanyCurrencyProvider organizationId={org} defaultCurrency={currency}><Preference/>{open?<Form/>:null}</CompanyCurrencyProvider>;
act(()=>{renderer=create(tree('one','EUR'));});
assert.equal(renderer!.root.findByType('output').children[0],'EUR');
act(()=>preference.setCurrency('BRL'));
assert.equal(renderer!.root.findByType('span').children[0],'BRL');
assert.equal(renderer!.root.findByType('output').children[0],'EUR','an open form keeps its currency');
act(()=>renderer.update(tree('one','EUR',false)));
act(()=>renderer.update(tree('one','EUR')));
assert.equal(renderer!.root.findByType('output').children[0],'BRL','new forms use the updated preference');
act(()=>renderer.update(tree('two','MXN')));
assert.equal(renderer!.root.findByType('output').children[0],'MXN','tenant change resets preference and forms');
act(()=>renderer.update(tree('three','invalid')));
assert.equal(renderer!.root.findByType('output').children[0],'PYG');
act(()=>renderer.unmount());

assert.equal(currentForecastMonth(new Date('2026-10-01T02:59:59Z')),'2026-09');
assert.equal(currentForecastMonth(new Date('2026-10-01T03:00:00Z')),'2026-10');
type Request={url:string;resolve:(response:Response)=>void};
const requests:Request[]=[];
globalThis.fetch=(input)=>new Promise<Response>(resolve=>requests.push({url:String(input),resolve}));
const fixture:ForecastData={month:'2026-09',time_zone:'America/Asuncion',records:[
 {currency:'USD',issued_total:'100.10',accepted_uninvoiced_total:'20.20',expected_total:'120.30',invoice_count:1,budget_count:1,undated_budget_count:0},
 {currency:'PYG',issued_total:'5000',accepted_uninvoiced_total:'0',expected_total:'5000',invoice_count:1,budget_count:0,undated_budget_count:1}
],definition:{issued:'Emitido con impuestos.',accepted_uninvoiced:'Mes de aceptación.',exclusions:'Sin oportunidades comerciales.'}};
async function respond(request:Request,data:unknown,status=200){await act(async()=>{request.resolve(new Response(JSON.stringify(data),{status}));});}
const rendered=()=>JSON.stringify(renderer.toJSON());
async function run(){
 for(const role of ['management','sales','production','editor','viewer']){
  await act(async()=>{renderer=create(<FinancialForecast role={role} organizationId="one"/>);});
  assert.equal(renderer!.toJSON(),null);act(()=>renderer.unmount());
 }
 assert.equal(requests.length,0,'restricted roles do not request financial data');
 await act(async()=>{renderer=create(<FinancialForecast role="finance" organizationId="one"/>);});
 assert.match(rendered(),/Cargando previsión/);
 await respond(requests[0],fixture);
 assert.equal(renderer!.root.findAllByProps({className:'forecast-currency'}).length,2);
 assert.match(rendered(),/USD 100,10/);
 assert.match(rendered(),/USD 120,30/);
 assert.match(rendered(),/PYG 5\.000/);
 assert.match(rendered(),/sin fecha/);
 assert.match(rendered(),/No se suman monedas distintas/);
 act(()=>renderer.root.findByType('input').props.onChange({target:{value:'2026-10'}}));
 assert.match(requests[1].url,/month=2026-10/);
 assert.equal(renderer!.root.findAllByProps({className:'forecast-currency'}).length,0,'previous month is cleared while loading');
 await respond(requests[1],{...fixture,month:'2026-10',records:[]});
 assert.match(rendered(),/Sin facturas emitidas/);
 act(()=>{events.dispatchEvent(new Event('scale:feedback'));});
 await respond(requests[2],{error:'Sin acceso'},403);
 assert.match(rendered(),/Sin acceso/);
 assert.doesNotMatch(rendered(),/Sin facturas emitidas/,'failure is not presented as zero');
 act(()=>renderer.root.findByType('button').props.onClick());
 const stale=requests[3];
 await act(async()=>renderer.update(<FinancialForecast role="owner" organizationId="two"/>));
 assert.match(rendered(),/Cargando previsión/);
 await respond(stale,fixture);
 assert.equal(renderer!.root.findAllByProps({className:'forecast-currency'}).length,0,'old tenant response ignored');
 await respond(requests[4],{...fixture,records:[]});
 assert.match(rendered(),/Sin facturas emitidas/);
 act(()=>renderer.update(<FinancialForecast role="viewer" organizationId="two"/>));
 assert.equal(renderer!.toJSON(),null,'role removal clears the widget');
 act(()=>renderer.unmount());
 console.log('PASS: currency preference, open/new forms, tenant switch; forecast role gating, loading, separate currencies, empty, error/retry, month switch and stale tenant response');
}
void run();
