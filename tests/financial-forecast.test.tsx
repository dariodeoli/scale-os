import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {useForm} from 'react-hook-form';
import {CompanyCurrencyProvider,useCompanyCurrency} from '../app/currency-provider';
import type {ForecastData} from '../app/financial-forecast';
const {SelectCustom}=require('../app/profile-controls') as typeof import('../app/profile-controls');

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {FinancialForecast,currentForecastMonth,formatWholeMoney,formatSignedMoney}=require('../app/financial-forecast') as typeof import('../app/financial-forecast');
const events=new EventTarget();Object.defineProperty(globalThis,'window',{configurable:true,value:events});
// El diálogo del salario se monta con portal: se captura para poder afirmar su
// contrato (moneda de la ficha y payload del PATCH) sin un DOM real.
const reactDOM=require('react-dom');reactDOM.createPortal=(children:React.ReactNode)=>children;
Object.defineProperty(globalThis,'document',{configurable:true,value:{activeElement:null,body:{style:{overflow:''}},addEventListener(){},removeEventListener(){}}});
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
 assert.equal(currentForecastMonth(new Date('2026-10-01T02:59:59Z')),'2026-09');assert.equal(currentForecastMonth(new Date('2026-10-01T03:00:00Z')),'2026-10');assert.match(formatWholeMoney('1234567','PYG'),/1\.234\.567/);assert.match(formatWholeMoney(1234567,'USD'),/1,234,567/);assert.equal(formatWholeMoney('100.50','USD'),'Sin dato');assert.match(formatSignedMoney('-740','USD'),/^−.*740$/);assert.match(formatSignedMoney(2060,'USD'),/2,060/);
type Request={url:string;init:RequestInit;resolve:(response:Response)=>void};const requests:Request[]=[];globalThis.fetch=(input,init)=>new Promise<Response>(resolve=>requests.push({url:String(input),init:init||{},resolve}));
const fixture:ForecastData={month:'2026-09',time_zone:'America/Asuncion',records:[{currency:'USD',issued_total:100,accepted_uninvoiced_total:'20',expected_total:'120',invoice_count:1,budget_count:'1',undated_budget_count:0},{currency:'PYG',issued_total:'5000',accepted_uninvoiced_total:'0',expected_total:'5000',invoice_count:'1',budget_count:0,undated_budget_count:'1'}],contracted_recurring:{month:'2026-09',records:[{currency:'PYG',amount:'1000'}]},invoiced:{month:'2026-09',records:[{currency:'USD',amount:100},{currency:'PYG',amount:'5000'}]},collected_actual:{month:'2026-09',records:[{currency:'USD',amount:80}]},personnel:{month:'2026-09',included_headcount:'2',records:[{currency:'PYG',included_headcount:1,base_count:0,base_amount:'0',override_count:1,override_amount:'1200',expected_end_of_month_expense:'1200',members:[{collaborator_id:'9',user_id:null,name:'Salario variable',photo_url:null,compensation_type:'variable',currency:'PYG',base_amount:'0',override_amount:'1200'}]},{currency:'USD',included_headcount:'1',base_count:1,base_amount:200,override_count:0,override_amount:'0',expected_end_of_month_expense:'200',members:[{collaborator_id:'10',user_id:null,name:'Salario USD',photo_url:null,compensation_type:'fixed',currency:'USD',base_amount:200,override_amount:'0'}]}]},commission_forecast:{month:'2026-09',records:[{currency:'PYG',amount:10}]},planned_expenses:{month:'2026-09',records:[{currency:'PYG',amount:'3000',expense_count:3,fixed_count:2,variable_count:1}]},definition:{issued:'Emitido con impuestos.',accepted_uninvoiced:'Mes de aceptación.',exclusions:'Sin oportunidades comerciales.',contracted_recurring:'Contratos.',invoiced:'Facturas.',collected_actual:'Cobros.',personnel:'Solo salarios mensuales.',commission_forecast:'Comisiones.',planned_expenses:'Gastos.'}};
let renderer:ReactTestRenderer;const rendered=()=>JSON.stringify(renderer.toJSON());async function respond(request:Request,data:unknown,status=200){await act(async()=>{request.resolve(new Response(JSON.stringify(data),{status}));});}
async function run(){
 for(const role of ['management','sales','production','editor','viewer','collaborator']){await act(async()=>{renderer=create(<FinancialForecast role={role} organizationId="one"/>);});assert.equal(renderer.toJSON(),null);act(()=>renderer.unmount());}assert.equal(requests.length,0,'restricted roles do not request financial data');
 await act(async()=>{renderer=create(<FinancialForecast role="finance" organizationId="one"/>);});await act(async()=>{});assert.equal(requests[0].url,'/core-api/api/agency/forecast?month=2026-09');await respond(requests[0],fixture);assert.match(rendered(),/Recurrente contratado/);assert.match(rendered(),/1\.000/,'contracted total comes from top-level aggregate');assert.match(rendered(),/Cobrado/);assert.match(rendered(),/80/,'numeric canonical transport is accepted');assert.match(rendered(),/Gastos planificados/);assert.equal(renderer.root.findAllByProps({className:'forecast-currency'}).length,5,'segregated aggregates remain per currency');
 assert.equal(renderer.root.findAllByProps({className:'forecast-person-actions'}).length,2,'salary.view roles keep the per-person salary actions');
 const selects=renderer.root.findAllByType(SelectCustom);assert.equal(selects.find(select=>select.props.value==='variable')!==undefined,true,'kind select defaults to variable');act(()=>selects[0].props.onChange('recurring'));act(()=>selects[1].props.onChange('Herramientas'));act(()=>selects[2].props.onChange('fixed'));act(()=>renderer.root.findAllByProps({placeholder:'Sin separadores'})[0].props.onChange({target:{value:'3500'}}));act(()=>selects[3].props.onChange('USD'));act(()=>renderer.root.findAllByType('input').find(input=>input.props.maxLength===280)!.props.onChange({target:{value:'Licencia'}}));
 act(()=>{void renderer.root.findAllByType('form')[0].props.onSubmit({preventDefault(){}});});const post=requests.at(-1)!;assert.equal(post.url,'/core-api/api/agency/planned-expenses');assert.equal(post.init.method,'POST');assert.deepEqual(JSON.parse(String(post.init.body)),{cadence:'recurring',effectiveMonth:'2026-09',category:'Herramientas',amount:'3500',currency:'USD',kind:'fixed',note:'Licencia'},'planned expense POST carries the canonical payload with kind');await respond(post,{expense:{id:'1'}});assert.equal(requests.at(-1)!.url,'/core-api/api/agency/forecast?month=2026-09','save refreshes canonical forecast aggregates');await respond(requests.at(-1)!,fixture);assert.equal(JSON.stringify(renderer.root.findByProps({className:'planned-expenses-kinds'}).children),JSON.stringify(['2',' fijos · ','1',' variables']),'planned expense list shows the fixed versus variable split');
 assert.match(rendered(),/Gastos reales del mes/);
 const accountsRequest=requests.filter(request=>request.url==='/core-api/api/agency/accounts'&&!request.init.method).at(-1)!;await respond(accountsRequest,{accounts:[{id:'5',name:'Gastos PYG',currency:'PYG',active:true}]});
 const expensesRequest=requests.filter(request=>request.url.startsWith('/core-api/api/agency/expenses?month=2026-09')&&!request.init.method).at(-1)!;await respond(expensesRequest,{month:'2026-09',expenses:[{id:'1',account_id:'5',account_name:'Gastos PYG',category:'Herramientas',kind:'fixed',amount:'1500',currency:'PYG',paid_on:'2026-09-12',reference:'Licencia',created_by_email:'finanzas@example.invalid'}]});
 assert.match(rendered(),/Herramientas/);assert.match(rendered(),/1\.500/);assert.equal((rendered().match(/Gastos reales/g)||[]).length>=2,true,'the real-expense row joins the per-currency summary beside planned expenses');
 const realForm=renderer.root.findAllByType('form')[1];
 act(()=>renderer.root.findAllByType(SelectCustom).find(select=>select.props.value==='')!.props.onChange('5'));
 const realInputs=realForm.findAllByType('input');
 act(()=>realInputs[0].props.onChange({target:{value:'999'}}));act(()=>realInputs[1].props.onChange({target:{value:'2026-09-10'}}));act(()=>realInputs[2].props.onChange({target:{value:'Dominio'}}));
 act(()=>{void realForm.props.onSubmit({preventDefault(){}});});
 const realPost=requests.at(-1)!;assert.equal(realPost.url,'/core-api/api/agency/expenses');assert.equal(realPost.init.method,'POST');assert.deepEqual(JSON.parse(String(realPost.init.body)),{accountId:'5',category:'Operación',kind:'variable',amount:'999',currency:'PYG',paidOn:'2026-09-10',reference:'Dominio'},'real expense POST carries the canonical payload');await respond(realPost,{expense:{id:'2'}});
 act(()=>renderer.root.findByProps({type:'month'}).props.onChange({target:{value:'2026-10'}}));assert.match(requests.at(-1)!.url,/month=2026-10/);await respond(requests.at(-1)!,{...fixture,month:'2026-10',records:[],contracted_recurring:{month:'2026-10',records:[]},invoiced:{month:'2026-10',records:[]},collected_actual:{month:'2026-10',records:[]},commission_forecast:{month:'2026-10',records:[]},planned_expenses:{month:'2026-10',records:[]}});assert.match(rendered(),/Sin facturas emitidas/);act(()=>renderer.unmount());
 const contractedFixture:ForecastData={...fixture,contracted_clients:{month:'2026-09',records:[{client_id:'7',client_name:'Contrato sin factura',currency:'USD',contracted_amount:300,invoiced_amount:0,invoice_required:true,missing_invoice:true},{client_id:'1',client_name:'Forecast fixture',currency:'PYG',contracted_amount:1000,invoiced_amount:2000,invoice_required:true,missing_invoice:false}]},definition:{...fixture.definition,opening_balance:'Saldo de cuentas activas.',projected_cash:'Caja proyectada.',projected_result:'Resultado estimado.',contracted_clients:'Contratos por cliente.'}};
 const multiFixture:ForecastData={...contractedFixture,months:3,opening_balance:{month:'2026-09',records:[{currency:'PYG',amount:500},{currency:'USD',amount:1800}]},projection:{months:3,records:[{month:'2026-09',currency:'USD',projected_cash:1860,projected_result:60,collected:0,expected:260,personnel:200,planned_expenses:0,commission_forecast:0},{month:'2026-10',currency:'USD',projected_cash:1960,projected_result:2209,collected:500,expected:2609,personnel:200,planned_expenses:200,commission_forecast:0},{month:'2026-11',currency:'USD',projected_cash:2060,projected_result:100,collected:300,expected:300,personnel:200,planned_expenses:0,commission_forecast:0},{month:'2026-09',currency:'PYG',projected_cash:-740,projected_result:260,collected:500,expected:2000,personnel:1250,planned_expenses:390,commission_forecast:100},{month:'2026-10',currency:'PYG',projected_cash:-3229,projected_result:-2489,collected:0,expected:0,personnel:1999,planned_expenses:390,commission_forecast:100},{month:'2026-11',currency:'PYG',projected_cash:-5718,projected_result:-2489,collected:0,expected:0,personnel:1999,planned_expenses:390,commission_forecast:100}]}};
 await act(async()=>{renderer=create(<FinancialForecast role="finance" organizationId="one"/>);});await act(async()=>{});
 assert.equal(requests.at(-1)!.url,'/core-api/api/agency/forecast?month=2026-09');await respond(requests.at(-1)!,contractedFixture);
 assert.match(rendered(),/Contratos vs facturación del mes/);assert.match(rendered(),/Sin factura/,'missing invoice renders the chip');assert.match(rendered(),/Forecast fixture/);assert.match(rendered(),/2\.000/,'invoiced amount renders whole money');
 const horizonButtons=renderer.root.findAllByType('button').filter(button=>button.props['aria-pressed']===true||button.props['aria-pressed']===false);
 assert.equal(horizonButtons.length,4,'four horizon options');assert.equal(horizonButtons[0].props['aria-pressed'],true,'one month is the default horizon');
 assert.equal(renderer.root.findAllByType(SelectCustom).length,7,'horizon buttons keep the expense form selects in place');
 act(()=>horizonButtons[1].props.onClick());
 assert.equal(requests.at(-1)!.url,'/core-api/api/agency/forecast?month=2026-09&months=3','horizon changes fetch months');await respond(requests.at(-1)!,multiFixture);
 assert.match(rendered(),/Proyección de caja y resultado/);assert.match(rendered(),/1,860/);assert.match(rendered(),/2,060/);assert.match(rendered(),/−/,'negative projection renders a minus sign');assert.match(rendered(),/01-sept/);
 assert.equal(renderer.root.findAllByType('table').length,2,'one compact table per currency');
 assert.match(rendered(),/Sin factura/,'contracted clients remain visible in the horizon view');
 assert.equal(renderer.root.findAllByType(SelectCustom).length,0,'month tools hide in the horizon view');
 act(()=>renderer.root.findAllByType('button').filter(button=>button.props['aria-pressed']===true||button.props['aria-pressed']===false)[0].props.onClick());
 assert.equal(requests.at(-1)!.url,'/core-api/api/agency/forecast?month=2026-09','back to one month drops the months parameter');await respond(requests.at(-1)!,contractedFixture);
 assert.match(rendered(),/Recurrente contratado/);act(()=>renderer.unmount());
 // salary.view: el API manda null en los importes por persona. La pantalla debe
 // aceptar el payload, mostrar "Sin dato" y nunca fabricar un sueldo en cero,
 // conservando el agregado de planificación por moneda.
 const maskedFixture:ForecastData={...contractedFixture,personnel:{month:'2026-09',included_headcount:'2',records:[{currency:'PYG',included_headcount:1,base_count:1,base_amount:'1000',override_count:0,override_amount:'0',expected_end_of_month_expense:'1000',members:[{collaborator_id:'9',user_id:null,name:'Salario oculto',photo_url:null,compensation_type:'fixed',currency:'PYG',base_amount:null,override_amount:null}]},{currency:'USD',included_headcount:'1',base_count:0,base_amount:'0',override_count:1,override_amount:'50',expected_end_of_month_expense:'50',members:[{collaborator_id:'10',user_id:null,name:'Ajuste oculto',photo_url:null,compensation_type:'variable',currency:'USD',base_amount:null,override_amount:null}]}]}};
 await act(async()=>{renderer=create(<FinancialForecast role="finance" organizationId="one"/>);});await act(async()=>{});
 assert.equal(requests.at(-1)!.url,'/core-api/api/agency/forecast?month=2026-09');await respond(requests.at(-1)!,maskedFixture);
 assert.doesNotMatch(rendered(),/datos inválidos/,'masked per-person salaries are a valid payload');
 assert.match(rendered(),/Salario oculto/,'the person stays visible without their salary');
 assert.match(rendered(),/Ajuste oculto/,'the adjustment row stays visible without the amount');
 assert.doesNotMatch(rendered(),/Sin salario fijo/,'a masked salary is not a zero salary');
 assert.doesNotMatch(rendered(),/Ajuste del mes<\/small><strong>/,'a masked adjustment never renders an amount');
 const maskedBases=renderer.root.findAllByProps({className:'forecast-person-base'});
 assert.equal(maskedBases.length,2,'one base-salary cell per masked member');
 assert.equal(maskedBases.every(cell=>cell.findByType('strong').children[0]==='Sin dato'),true,'a masked base salary shows Sin dato');
 const maskedTotals=renderer.root.findAllByProps({className:'forecast-person-total'});
 assert.equal(maskedTotals.length,2,'one month-close cell per masked member');
 assert.equal(maskedTotals.every(cell=>cell.findByType('strong').children[0]==='Sin dato'),true,'a masked month close shows Sin dato, never a fabricated zero');
 assert.equal(renderer.root.findAllByProps({className:'forecast-person-actions'}).length,0,'a masked salary offers no blind salary edit');
 assert.match(rendered(),/1\.000/,'the per-currency planning aggregate stays without salary.view');
 act(()=>renderer.unmount());

 // Seis monedas: un mes en EUR viaja completo (registros, personal, contratos, cobros,
 // gastos planificados y reales) sin caer en "datos inválidos", y el salario se guarda
 // en la moneda de la ficha (sin el par legacy monthly_salary_* limitado a PYG|USD).
 const eurFixture:ForecastData={...contractedFixture,
  records:[{currency:'EUR',issued_total:1000,accepted_uninvoiced_total:0,expected_total:1000,invoice_count:1,budget_count:0,undated_budget_count:0}],
  contracted_recurring:{month:'2026-09',records:[{currency:'EUR',amount:500}]},
  invoiced:{month:'2026-09',records:[{currency:'EUR',amount:1000}]},
  collected_actual:{month:'2026-09',records:[{currency:'EUR',amount:200}]},
  commission_forecast:{month:'2026-09',records:[{currency:'EUR',amount:50}]},
  planned_expenses:{month:'2026-09',records:[{currency:'EUR',amount:100,expense_count:1,fixed_count:1,variable_count:0}]},
  personnel:{month:'2026-09',included_headcount:'1',records:[{currency:'EUR',included_headcount:1,base_count:1,base_amount:'1234',override_count:0,override_amount:'0',expected_end_of_month_expense:'1234',members:[{collaborator_id:'11',user_id:null,name:'Salario EUR',photo_url:null,compensation_type:'fixed',currency:'EUR',base_amount:'1234',override_amount:'0'}]}]},
  contracted_clients:{month:'2026-09',records:[{client_id:'1',client_name:'Cliente EUR',currency:'EUR',contracted_amount:500,invoiced_amount:1000,invoice_required:true,missing_invoice:false}]}};
 await act(async()=>{renderer=create(<FinancialForecast role="finance" organizationId="one"/>);});await act(async()=>{});
 await respond(requests.at(-1)!,eurFixture);
 assert.doesNotMatch(rendered(),/datos inválidos/,'an EUR month is valid money');
 assert.match(rendered(),/EUR[^0-9]*1,000/,'EUR records render with their code');
 assert.match(rendered(),/Cliente EUR/,'contracted clients in EUR stay visible');
 const currencySelect=renderer.root.findAllByType(SelectCustom).find(select=>select.props.label==='Moneda')!;
 assert.equal(currencySelect.props.choices.length,6,'the planned-expense currency select offers the six company currencies');
 act(()=>currencySelect.props.onChange('EUR'));
 assert.equal(renderer.root.findAllByType(SelectCustom).find(select=>select.props.label==='Moneda')!.props.value,'EUR','picking EUR in the selector is not silently reset to PYG');
 // Cuentas y gastos reales en EUR: la lectura ya no los descarta.
 const eurAccounts=requests.filter(request=>request.url==='/core-api/api/agency/accounts'&&!request.init.method).at(-1)!;
 await respond(eurAccounts,{accounts:[{id:'7',name:'Cuenta EUR',currency:'EUR',active:true}]});
 const eurExpenses=requests.filter(request=>request.url.startsWith('/core-api/api/agency/expenses?month=2026-09')&&!request.init.method).at(-1)!;
 await respond(eurExpenses,{month:'2026-09',expenses:[{id:'3',account_id:'7',account_name:'Cuenta EUR',category:'Herramientas',kind:'fixed',amount:'150',currency:'EUR',paid_on:'2026-09-12',reference:'Licencia EUR',created_by_email:'fin@example.invalid'}]});
 assert.match(rendered(),/Licencia EUR/,'an EUR real expense stays in the month list');
 assert.match(rendered(),/EUR[^0-9]*150/,'the EUR real expense renders its amount');
 // El salario se guarda en la moneda de la ficha, sin el par limitado a PYG|USD.
 const salaryButton=renderer.root.findAllByType('button').find(button=>button.props.title==='Editar salario')!;
 act(()=>salaryButton.props.onClick());
 const salaryFields=renderer.root.findAllByProps({className:'amount-field'});
 assert.equal(salaryFields.at(-1)!.props['data-currency'],'EUR','the salary field draws the record currency');
 act(()=>{void renderer.root.findAllByType('form').at(-1)!.props.onSubmit({preventDefault(){}});});
 const salaryPatch=requests.at(-1)!;
 assert.equal(salaryPatch.url,'/core-api/api/agency/collaborators/11');
 assert.equal(salaryPatch.init.method,'PATCH');
 assert.deepEqual(JSON.parse(String(salaryPatch.init.body)),{compensation_type:'fixed',compensation_amount:'1234'},'the salary keeps the record currency and skips the 2-currency legacy pair');
 await respond(salaryPatch,{collaborator:{id:'11'}});
 act(()=>renderer.unmount());
 console.log('PASS financial forecast: role gating, canonical numeric/string response transport, top-level segregated aggregates, per-currency rendering, exact planned-expense POST, refresh, horizon selection with multi-month projection tables, contracted versus invoiced per client, masked per-person salaries (salary.view), and the six company currencies with the salary kept in the record currency');
}
void run();
