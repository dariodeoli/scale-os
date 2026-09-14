import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {useForm} from 'react-hook-form';
import {CompanyCurrencyProvider,useCompanyCurrency} from '../app/currency-provider';
import type {ForecastData} from '../app/financial-forecast';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {FinancialForecast,currentForecastMonth,formatWholeMoney}=require('../app/financial-forecast') as typeof import('../app/financial-forecast');
const events=new EventTarget();Object.defineProperty(globalThis,'window',{configurable:true,value:events});
let preference:ReturnType<typeof useCompanyCurrency>;
function Form(){const {currency}=useCompanyCurrency();const form=useForm({defaultValues:{currency}});return <output>{form.watch('currency')}</output>;}
function Preference(){preference=useCompanyCurrency();return <span>{preference.currency}</span>;}
const preferenceTree=(org:string,currency:string,open=true)=><CompanyCurrencyProvider organizationId={org} defaultCurrency={currency}><Preference/>{open?<Form/>:null}</CompanyCurrencyProvider>;
let preferenceRenderer!:ReactTestRenderer;
act(()=>{preferenceRenderer=create(preferenceTree('one','EUR'));});
assert.equal(preferenceRenderer.root.findByType('output').children[0],'EUR');
act(()=>preference.setCurrency('BRL'));
assert.equal(preferenceRenderer.root.findByType('span').children[0],'BRL');
assert.equal(preferenceRenderer.root.findByType('output').children[0],'EUR','an open form keeps its currency');
act(()=>preferenceRenderer.update(preferenceTree('one','EUR',false)));act(()=>preferenceRenderer.update(preferenceTree('one','EUR')));
assert.equal(preferenceRenderer.root.findByType('output').children[0],'BRL','new forms use the updated preference');
act(()=>preferenceRenderer.update(preferenceTree('two','MXN')));assert.equal(preferenceRenderer.root.findByType('output').children[0],'MXN','tenant change resets preference and forms');
act(()=>preferenceRenderer.update(preferenceTree('three','invalid')));assert.equal(preferenceRenderer.root.findByType('output').children[0],'PYG');act(()=>preferenceRenderer.unmount());
assert.equal(currentForecastMonth(new Date('2026-10-01T02:59:59Z')),'2026-09');assert.equal(currentForecastMonth(new Date('2026-10-01T03:00:00Z')),'2026-10');assert.match(formatWholeMoney('1234567','PYG'),/1\.234\.567/);assert.match(formatWholeMoney(1234567,'USD'),/1,234,567/);assert.equal(formatWholeMoney('100.50','USD'),'Sin dato');
type Request={url:string;init:RequestInit;resolve:(response:Response)=>void};const requests:Request[]=[];globalThis.fetch=(input,init)=>new Promise<Response>(resolve=>requests.push({url:String(input),init:init||{},resolve}));
const fixture:ForecastData={month:'2026-09',time_zone:'America/Asuncion',records:[{currency:'USD',issued_total:100,accepted_uninvoiced_total:'20',expected_total:'120',invoice_count:1,budget_count:'1',undated_budget_count:0},{currency:'PYG',issued_total:'5000',accepted_uninvoiced_total:'0',expected_total:'5000',invoice_count:'1',budget_count:0,undated_budget_count:'1'}],contracted_recurring:{month:'2026-09',records:[{currency:'PYG',amount:'1000'}]},invoiced:{month:'2026-09',records:[{currency:'USD',amount:100},{currency:'PYG',amount:'5000'}]},collected_actual:{month:'2026-09',records:[{currency:'USD',amount:80}]},personnel:{month:'2026-09',included_headcount:'2',records:[{currency:'PYG',included_headcount:1,base_count:0,base_amount:'0',override_count:1,override_amount:'1200',expected_end_of_month_expense:'1200'},{currency:'USD',included_headcount:'1',base_count:1,base_amount:200,override_count:0,override_amount:'0',expected_end_of_month_expense:'200'}]},commission_forecast:{month:'2026-09',records:[{currency:'PYG',amount:10}]},planned_expenses:{month:'2026-09',records:[{currency:'PYG',amount:'3000'}]},definition:{issued:'Emitido con impuestos.',accepted_uninvoiced:'Mes de aceptación.',exclusions:'Sin oportunidades comerciales.',contracted_recurring:'Contratos.',invoiced:'Facturas.',collected_actual:'Cobros.',personnel:'Solo salarios mensuales.',commission_forecast:'Comisiones.',planned_expenses:'Gastos.'}};
let renderer:ReactTestRenderer;const rendered=()=>JSON.stringify(renderer.toJSON());async function respond(request:Request,data:unknown,status=200){await act(async()=>{request.resolve(new Response(JSON.stringify(data),{status}));});}
async function run(){
 for(const role of ['management','sales','production','editor','viewer']){await act(async()=>{renderer=create(<FinancialForecast role={role} organizationId="one"/>);});assert.equal(renderer.toJSON(),null);act(()=>renderer.unmount());}assert.equal(requests.length,0,'restricted roles do not request financial data');
 await act(async()=>{renderer=create(<FinancialForecast role="finance" organizationId="one"/>);});await act(async()=>{});assert.equal(requests[0].url,'/core-api/api/agency/forecast?month=2026-09');await respond(requests[0],fixture);assert.match(rendered(),/Recurrente contratado/);assert.match(rendered(),/1\.000/,'contracted total comes from top-level aggregate');assert.match(rendered(),/Cobrado/);assert.match(rendered(),/80/,'numeric canonical transport is accepted');assert.match(rendered(),/Gastos planificados/);assert.equal(renderer.root.findAllByProps({className:'forecast-currency'}).length,5,'segregated aggregates remain per currency');
 const selects=renderer.root.findAllByType('select');act(()=>selects[0].props.onChange({target:{value:'recurring'}}));act(()=>selects[1].props.onChange({target:{value:'Herramientas'}}));act(()=>renderer.root.findByProps({placeholder:'Sin separadores'}).props.onChange({target:{value:'3500'}}));act(()=>selects[2].props.onChange({target:{value:'USD'}}));act(()=>renderer.root.findAllByType('input').at(-1)!.props.onChange({target:{value:'Licencia'}}));
 act(()=>{void renderer.root.findByType('form').props.onSubmit({preventDefault(){}});});const post=requests.at(-1)!;assert.equal(post.url,'/core-api/api/agency/planned-expenses');assert.equal(post.init.method,'POST');assert.deepEqual(JSON.parse(String(post.init.body)),{cadence:'recurring',effectiveMonth:'2026-09',category:'Herramientas',amount:'3500',currency:'USD',note:'Licencia'},'planned expense POST uses only the canonical six-field payload');await respond(post,{expense:{id:'1'}});assert.equal(requests.at(-1)!.url,'/core-api/api/agency/forecast?month=2026-09','save refreshes canonical forecast aggregates');await respond(requests.at(-1)!,fixture);
 act(()=>renderer.root.findByProps({type:'month'}).props.onChange({target:{value:'2026-10'}}));assert.match(requests.at(-1)!.url,/month=2026-10/);await respond(requests.at(-1)!,{...fixture,month:'2026-10',records:[],contracted_recurring:{month:'2026-10',records:[]},invoiced:{month:'2026-10',records:[]},collected_actual:{month:'2026-10',records:[]},commission_forecast:{month:'2026-10',records:[]},planned_expenses:{month:'2026-10',records:[]}});assert.match(rendered(),/Sin facturas emitidas/);act(()=>renderer.unmount());
 console.log('PASS financial forecast: role gating, canonical numeric/string response transport, top-level segregated aggregates, per-currency rendering, exact planned-expense POST, and refresh');
}
void run();
