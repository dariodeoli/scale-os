import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import type {BalanceDetails,FinanceHistoryPayload} from '../app/finance-detail-data';
Object.assign(globalThis,{React,window:new EventTarget()});require.extensions['.css']=()=>{};
const reactDOM=require('react-dom');reactDOM.createPortal=(children:React.ReactNode)=>children;
Object.defineProperty(globalThis,'document',{configurable:true,value:{activeElement:null,body:{style:{overflow:''}},addEventListener(){},removeEventListener(){}}});
const {BalanceSection}=require('../app/finance-balance') as typeof import('../app/finance-balance');
const {FinanceClientsSection}=require('../app/finance-clients') as typeof import('../app/finance-clients');
const {FinancePersonnelSection}=require('../app/finance-personnel') as typeof import('../app/finance-personnel');
const {AmountInput}=require('../app/profile-controls') as typeof import('../app/profile-controls');
const {Editor}=require('../app/operations') as typeof import('../app/operations');
const {clearDataCache}=require('../app/data-cache') as typeof import('../app/data-cache');
const {currentForecastMonth}=require('../app/forecast-data') as typeof import('../app/forecast-data');
const month=currentForecastMonth(),tick=()=>new Promise(resolve=>setImmediate(resolve));
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const detail:BalanceDetails={month,clients:{records:[{client_id:'1',client_name:'Cliente sin factura',client_active:true,client_logo_url:'https://example.com/client.png',plan_id:'4',plan_name:'Plan Growth',currency:'USD',contracted_amount:'1000',invoice_required:false,received_in_month:'250',applied_to_month_invoices:'0',unallocated_received_in_month:'50',registered_outstanding:'1300'},{client_id:'2',client_name:'Cliente con factura',client_active:true,client_logo_url:null,plan_id:null,plan_name:null,currency:'USD',contracted_amount:'0',invoice_required:true,received_in_month:'0',applied_to_month_invoices:'0',unallocated_received_in_month:'0',registered_outstanding:'0'}]},personnel:{records:[{collaborator_id:'3',name:'Persona USD',photo_url:'https://example.com/person.png',currency:'USD',base_amount:'100.25',override_amount:'-10',expected_amount:'90.25',paid_in_month:'25.10',outstanding_amount:'65.15',history_known:false,salary_source:'fixed',salary_editable:true,salary_revision:'1'}]},totals:[{currency:'USD',contracted_amount:'1000',received_in_month:'250',registered_outstanding:'1300',expected_receipts:'500'}]};
const baseline={id:'1',created_at:'2026-10-17T12:00:00Z',effective_from:null,actor_name:null,actor_photo_url:null,reason:'Valor importado',before_amount:null,after_amount:'100.25',before_currency:null,currency:'USD',source:'legacy-baseline',history_known:false};
test('Balance shows one aligned client/person table, truthful monthly cash and invoice requirements',async()=>{
 clearDataCache();const before=globalThis.fetch;
 globalThis.fetch=async(input)=>{const path=String(input);if(path.includes('/balance-details'))return response(detail);if(path.includes('/treasury'))return response({month,period:null,accounts:[],movements:[]});if(path.includes('/expenses?'))return response({expenses:[]});if(path.includes('/planned-expenses'))return response({records:[]});return response({error:'Forecast intentionally unavailable'},503);};
 let view!:ReactTestRenderer;
 try{await act(async()=>{view=create(<BalanceSection user={{id:'1',organization_id:'1',role:'owner'} as any}/>);await tick();});
  const tables=view.root.findAllByProps({role:'table'});assert.equal(tables.length,2);
  const clients=tables.find(table=>table.props['aria-label']==='Clientes y contratos del mes')!;
  assert.deepEqual(clients.findAllByProps({role:'columnheader'}).map(header=>header.children.join('')),['Cliente','Plan','Contratado','Pagado en mes','Factura','Acciones']);
  const rows=clients.findAllByProps({role:'row'});assert.equal(new Set(rows.map(row=>row.props.className.match(/grid-cols-\[[^\s]+/)[0])).size,1,'all header and data tracks use the same template');
  assert.equal(clients.findAll(node=>node.type==='img'&&node.props.src==='https://example.com/client.png').length,1);
  assert.equal(clients.findAll(node=>node.type==='span'&&String(node.props.className).includes('foto-perfil-circulo')).length,2);
  const noInvoice=clients.findAllByProps({role:'img','aria-label':'No pide factura'})[0];assert(noInvoice);assert.match(String(noInvoice.props.className),/bad/);assert.equal(noInvoice.props.title,'No pide factura');assert.equal(noInvoice.props.tabIndex,0);
  const text=JSON.stringify(view.toJSON());assert.match(text,/Persona USD/);assert.match(text,/Plan Growth/);assert.match(text,/Pendiente registrado/);assert.match(text,/1\.300/);assert.match(text,/no indica cancelación/);assert.doesNotMatch(text,/Sin factura|Al día|Saldado/);assert(text.indexOf('balance-clients-title')<text.indexOf('Resumen contratado y cobrado'),'comparison panels precede cash and summary blocks');
  const paymentCell=clients.findAll(node=>node.type==='span'&&String(node.props.title).includes('Aplicado a facturas emitidas en este mes'))[0];assert.match(paymentCell.props.title,/250/);assert.match(paymentCell.props.title,/mes:.*0/);
 }finally{act(()=>view?.unmount());globalThis.fetch=before;clearDataCache();}
});
test('compact panels keep exact currency totals, real overpayment, named plan icons and salary detail',async()=>{
 let clients!:ReactTestRenderer,team!:ReactTestRenderer;
 const member=detail.personnel.records[0];
 try{await act(async()=>{
  clients=create(<FinanceClientsSection clients={[{...detail.clients.records[0],plan_name:'Silver',contracted_amount:'0.10',received_in_month:'0.20'},{...detail.clients.records[0],client_id:'20',plan_name:'Personalizado',contracted_amount:'0.20',received_in_month:'0.10'},{...detail.clients.records[0],client_id:'21',currency:'PYG',plan_name:'Otro plan real',contracted_amount:'9000000',received_in_month:'10000000'}]} month={month} role="owner" canManageTerms={false} canHistory={false} onReload={()=>{}}/>);
  team=create(<FinancePersonnelSection members={[{...member,base_amount:'0.10',paid_in_month:'0.20'},{...member,collaborator_id:'30',base_amount:'0.20',paid_in_month:'0.30'},{...member,collaborator_id:'31',currency:'PYG',base_amount:'5000000',paid_in_month:'6000000'}]} month={month} canSalary onReload={()=>{}}/>);
 });
 const clientTotals=clients.root.findByProps({'aria-label':'Totales de clientes por moneda'});
 const salaryTotals=team.root.findByProps({'aria-label':'Totales del equipo por moneda'});
 const text=(node:any):string=>typeof node==='string'?node:(node.children||[]).map(text).join('');
 assert.match(text(clientTotals),/Contratado · USD.*0,30/);
 assert.match(text(clientTotals),/Recibido en mes · USD.*0,30/);
 assert.match(text(salaryTotals),/Salario base · USD.*0,30/);
 assert.match(text(salaryTotals),/Pagado en mes · USD.*0,50/);
 assert.match(text(salaryTotals),/Pagado en mes · PYG.*6\.000\.000/,'real payout is not capped at salary base');
 for(const name of ['Silver','Personalizado','Otro plan real']){const icon=clients.root.findByProps({role:'img','aria-label':name});assert.equal(icon.props.title,name);assert.equal(icon.props.tabIndex,0);assert.equal(icon.findByProps({className:'sr-only'}).children.join(''),name);}
 assert.match(clients.root.findByProps({role:'img','aria-label':'Silver'}).findByType('svg').props.className,/lucide-gem/);
 assert.match(clients.root.findByProps({role:'img','aria-label':'Personalizado'}).findByType('svg').props.className,/lucide-sliders-horizontal/);
 const table=team.root.findByProps({role:'table'});assert.deepEqual(table.findAllByProps({role:'columnheader'}).map(header=>header.children.join('')),['Persona','Salario base','Pagado en mes','Acciones']);
 const detailCell=team.root.findAll(node=>node.type==='span'&&String(node.props.title).includes('Ajuste del mes:'))[0];assert.equal(detailCell.props.tabIndex,0);assert.match(detailCell.props.title,/Cierre previsto:.*90,25/);
 }finally{act(()=>{clients?.unmount();team?.unmount();});}
});

test('salary changes use canonical Editor with revision, reason and effective date, retain retry UUID and open chronology',async()=>{
 clearDataCache();const before=globalThis.fetch,writes:{path:string;body:any}[]=[];let fail=true;
 let history:FinanceHistoryPayload={revision:'1',records:[baseline]};
 globalThis.fetch=async(input,init)=>{const path=String(input);if(init?.method==='POST'){const body=JSON.parse(String(init.body));writes.push({path,body});if(fail)return response({error:'Respuesta temporal interrumpida'},503);history={revision:'2',records:[{...baseline,id:'2',effective_from:`${month}-01`,before_amount:'100.25',before_currency:'USD',after_amount:body.amount,reason:body.reason,source:'salary-change',history_known:true,actor_name:'Dueño'},baseline]};return response(history,201);}return response(history);};
 let view!:ReactTestRenderer;let reloads=0;
 try{await act(async()=>{view=create(<FinancePersonnelSection members={detail.personnel.records} month={month} canSalary onReload={()=>{reloads++;}}/>);await tick();});
  await act(async()=>{view.root.findAllByType('button').find(button=>button.props['aria-label']==='Editar salario: Persona USD')!.props.onClick();await tick();});
  const editor=view.root.findByType(Editor);assert.equal(editor.props.fields[0].currency,'USD');assert.equal(editor.props.fields[0].integer,undefined);
  await act(async()=>{view.root.findByType(AmountInput).props.onChange('1200.25');await view.root.findByType('textarea').props.onChange({target:{name:'reason',value:'Actualización anual acordada'},type:'change'});});
  const submit=()=>act(async()=>{await view.root.findByType('form').props.onSubmit({preventDefault(){},persist(){}});await tick();});
  await submit();assert.equal(writes.length,1);assert.match(JSON.stringify(view.toJSON()),/Respuesta temporal interrumpida/);fail=false;await submit();assert.equal(writes.length,2);assert.equal(writes[0].body.requestId,writes[1].body.requestId);assert.equal(writes[1].body.expectedRevision,'1');assert.equal(writes[1].body.effectiveFrom,`${month}-01`);assert.equal(writes[1].body.amount,'1200.25');assert.equal(writes[1].body.reason,'Actualización anual acordada');assert.equal(writes[1].body.compensationType,undefined,'editar el mensual nunca cambia la modalidad ni el fee');assert.equal(reloads,1);assert.match(JSON.stringify(view.toJSON()),/Historial salarial/);assert.match(JSON.stringify(view.toJSON()),/Vigencia anterior no registrada/);assert.match(JSON.stringify(view.toJSON()),/Dueño/);
 }finally{act(()=>view?.unmount());globalThis.fetch=before;clearDataCache();}
});
test('effective salary denial hides all individual amounts and actions even if a payload contains them',async()=>{
 let view!:ReactTestRenderer;try{await act(async()=>{view=create(<FinancePersonnelSection members={detail.personnel.records} month={month} canSalary={false} onReload={()=>{}}/>);});const text=JSON.stringify(view.toJSON());assert.match(text,/Persona USD/);assert.doesNotMatch(text,/100\.25|90\.25|25\.10|65\.15|Editar salario|Historial salarial/);assert.equal(view.root.findAllByType('button').length,0);}finally{act(()=>view?.unmount());}
});
test('a monthly salary in PYG is editable independently from a payment/fee currency in USD',async()=>{
 clearDataCache();const before=globalThis.fetch;globalThis.fetch=async()=>response({revision:'1',records:[baseline]});let view!:ReactTestRenderer;
 const monthly={...detail.personnel.records[0],currency:'PYG',base_amount:'1200000',override_amount:'0',expected_amount:'1200000',paid_in_month:'0',outstanding_amount:'1200000',salary_source:'monthly' as const,salary_editable:true};
 const dollars={...detail.personnel.records[0],base_amount:'0',override_amount:'0',expected_amount:'0',paid_in_month:'100',outstanding_amount:'0',salary_source:'none' as const,salary_editable:false};
 try{await act(async()=>{view=create(<FinancePersonnelSection members={[monthly,dollars]} month={month} canSalary onReload={()=>{}}/>);});
  const buttons=view.root.findAllByType('button').filter(button=>button.props['aria-label']==='Editar salario: Persona USD');assert.equal(buttons.length,1,'una fila de pagos en otra moneda no ofrece un cambio de salario equivocado');
  await act(async()=>{buttons[0].props.onClick();await tick();});assert.equal(view.root.findByType(AmountInput).props.currency,'PYG');assert.equal(view.root.findByType(AmountInput).props.value,'1200000');assert.match(JSON.stringify(view.toJSON()),/Conserva la modalidad/);
 }finally{act(()=>view?.unmount());globalThis.fetch=before;clearDataCache();}
});
test('an old balance row cannot acquire a fresh revision and overwrite another user salary change',async()=>{
 clearDataCache();const before=globalThis.fetch;let writes=0,reloads=0;globalThis.fetch=async(_input,init)=>{if(init?.method==='POST')writes++;return response({revision:'2',records:[{...baseline,id:'2',after_amount:'1500',history_known:true,effective_from:`${month}-01`},baseline]});};let view!:ReactTestRenderer;
 try{await act(async()=>{view=create(<FinancePersonnelSection members={detail.personnel.records} month={month} canSalary onReload={()=>{reloads++;}}/>);});await act(async()=>{view.root.findAllByType('button').find(button=>button.props['aria-label']==='Editar salario: Persona USD')!.props.onClick();await tick();});assert.equal(view.root.findAllByType(Editor).length,0);assert.match(JSON.stringify(view.toJSON()),/El salario cambió desde que abriste el balance/);assert.equal(writes,0);await act(async()=>view.root.findAllByType('button').find(button=>button.children.includes('Reintentar'))!.props.onClick());assert.equal(reloads,1);}
 finally{act(()=>view?.unmount());globalThis.fetch=before;clearDataCache();}
});
test('both salary capture dialogs render the canonical payroll purpose and privacy link',async()=>{
 const before=globalThis.fetch;globalThis.fetch=async input=>response(String(input).includes('/salary-overrides')?{override:null}:{revision:'1',records:[baseline]});
 try{for(const label of ['Editar salario: Persona USD','Ajuste del mes: Persona USD']){clearDataCache();let view!:ReactTestRenderer;try{await act(async()=>{view=create(<FinancePersonnelSection members={detail.personnel.records} month={month} canSalary onReload={()=>{}}/>);});await act(async()=>{view.root.findAllByType('button').find(button=>button.props['aria-label']===label)!.props.onClick();await tick();});assert.match(JSON.stringify(view.toJSON()),/Finalidad: Previsión y pago de remuneraciones/);const links=view.root.findAllByType('a').filter(link=>link.props.href==='/privacidad#payroll');assert.equal(links.length,1,label+' has its own canonical notice');assert.equal(links[0].children.join(''),'Aviso de Privacidad');}finally{act(()=>view?.unmount());}}}
 finally{globalThis.fetch=before;clearDataCache();}
});

test('inactive clients default hidden; explicit review preserves logos, original agreements and all cash totals',async()=>{
 let view!:ReactTestRenderer;
 const active={...detail.clients.records[0],contracted_amount:'100',received_in_month:'25'};
 const inactive={...detail.clients.records[0],client_id:'inactive',client_name:'Cliente inactivo',client_active:false,contracted_amount:'900',received_in_month:'75',registered_outstanding:'800'};
 const content=()=>JSON.stringify(view.toJSON());
 try{
  await act(async()=>{view=create(<FinanceClientsSection clients={[active,inactive]} month={month} role="sales" canManageTerms={false} canHistory={false} onReload={()=>{}}/>);});
  assert.doesNotMatch(content(),/Cliente inactivo/);assert.match(content(),/cliente\(s\) inactivo\(s\)/);assert.match(content(),/Sus cobros y deudas se conservan/);
  const text=(node:any):string=>typeof node==='string'?node:(node.children||[]).map(text).join('');
  const amounts=()=>view.root.findByProps({'aria-label':'Totales de clientes por moneda'}).findAllByType('dd').map(text);
  assert.equal(amounts().length,2);assert.match(amounts()[0],/100/);assert.doesNotMatch(amounts()[0],/1\.000/);assert.match(amounts()[1],/100/,'received includes hidden inactive receipt');
  const toggle=view.root.findAllByType('button').find(node=>node.props['aria-pressed']===false)!;
  await act(async()=>toggle.props.onClick());
  assert.match(content(),/Cliente inactivo/);assert.match(content(),/Estado actual: inactivo/);assert.match(content(),/900/,'original agreed value remains reviewable');
  assert.equal(view.root.findAll(node=>node.type==='img'&&node.props.src===inactive.client_logo_url).length,2);
  assert.equal(view.root.findAll(node=>node.type==='button'&&/^Editar plan|Historial del plan/.test(node.props['aria-label']||'')).length,0,'review does not expand permissions');
  assert.match(amounts()[0],/100/,'review toggle does not add inactive projections to active contracted');
  await act(async()=>view.update(<FinanceClientsSection clients={[active,inactive]} month="2026-08" role="sales" canManageTerms={false} canHistory={false} onReload={()=>{}}/>));
  assert.doesNotMatch(content(),/Cliente inactivo/,'period change resets optional review');
 }finally{act(()=>view?.unmount());}
});
test('missing activity on an old API stays visible with attention instead of silently deleting financial rows',async()=>{
 let view!:ReactTestRenderer;
 try{await act(async()=>{view=create(<FinanceClientsSection clients={[{...detail.clients.records[0],client_active:null}]} month={month} role="owner" canManageTerms={false} canHistory={false} onReload={()=>{}}/>);});
 assert.match(JSON.stringify(view.toJSON()),/Cliente sin factura/);assert.match(JSON.stringify(view.toJSON()),/Por confirmar/);assert.match(JSON.stringify(view.toJSON()),/pendiente de confirmar/);
 }finally{act(()=>view?.unmount());}
});
