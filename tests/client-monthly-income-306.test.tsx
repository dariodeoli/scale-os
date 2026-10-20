import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {monthlyIncome,monthlyIncomeAmountError} from '../app/client-monthly-income-data';
import {balanceCurrencyRows,type TreasuryBalance} from '../app/finance-balance-data';
import type {ForecastData} from '../app/forecast-data';
Object.assign(globalThis,{React,window:new EventTarget()});require.extensions['.css']=()=>{};
const dialogId=require.resolve('../app/dialog');require.cache[dialogId]={id:dialogId,filename:dialogId,loaded:true,exports:{Dialog:({children,title}:any)=><section role="dialog" aria-label={title}>{children}</section>,FormActions:({children}:any)=><div>{children}</div>,useDialogClose:()=>undefined,useDialogPending:()=>{}}} as NodeModule;
const {ClientMonthlyIncomeDialog}=require('../app/client-monthly-income') as typeof import('../app/client-monthly-income');
const {Editor}=require('../app/operations') as typeof import('../app/operations');
const {clearDataCache}=require('../app/data-cache') as typeof import('../app/data-cache');
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const state=(revision='10')=>({clientId:'7',month:'2026-10',revision,canManage:true,periodClosed:false,archived:false,entries:[],totals:[{currency:'PYG',baseAmount:0,extrasAmount:0,totalAmount:0}]});

test('monthly income reads reject another client/month, malformed totals and unsupported amounts',()=>{
 const data=state();assert(monthlyIncome(data,'7','2026-10'));assert.equal(monthlyIncome(data,'8','2026-10'),null);assert.equal(monthlyIncome(data,'7','2026-11'),null);
 assert.equal(monthlyIncome({...data,totals:[{currency:'PYG',baseAmount:100,extrasAmount:20,totalAmount:100}]},'7','2026-10'),null);
 assert.equal(monthlyIncome({...data,periodClosed:'false'},'7','2026-10'),null);
 assert.equal(monthlyIncome({...data,totals:[{currency:'PYG',baseAmount:1.5,extrasAmount:0,totalAmount:1.5}]},'7','2026-10'),null);
 assert.equal(monthlyIncomeAmountError('0','base'),null);assert.match(monthlyIncomeAmountError('0','extra')!,/mayor a cero/);assert(monthlyIncomeAmountError('2.5','extra'));assert(monthlyIncomeAmountError('9007199254740993','base'));
});
test('one extra for a client without a plan keeps revision and UUID on retry and never writes a receipt',async()=>{
 clearDataCache();const before=globalThis.fetch;const writes:{url:string;method:string;body:any}[]=[];let fail=true,refreshes=0;
 globalThis.fetch=async(input,init={})=>{const url=String(input);if(init.method==='POST'){const body=JSON.parse(String(init.body));writes.push({url,method:String(init.method),body});if(fail)return response({error:'Respuesta interrumpida'},503);return response({...state('11'),entries:[{id:'31',month:'2026-10',kind:'extra',label:body.label,amount:body.amount,currency:body.currency,version:1,createdAt:'2026-10-20T12:00:00Z'}],totals:[{currency:'PYG',baseAmount:0,extrasAmount:450000,totalAmount:450000}]},201);}return response(state());};
 let view!:ReactTestRenderer;
 try{
  await act(async()=>{view=create(<ClientMonthlyIncomeDialog clientId="7" name="Cliente sin plan" month="2026-10" close={()=>{}} onSaved={()=>{refreshes++;}}/>);await tick();});
  assert.match(JSON.stringify(view.toJSON()),/No hace falta un plan/);
  await act(async()=>view.root.findAllByType('button').find(n=>n.children.includes('Agregar servicio extra'))!.props.onClick());
  const draft={label:'Filmación adicional',amount:'450000',currency:'PYG',reason:'Servicio adicional acordado'};
  await assert.rejects(()=>view.root.findByType(Editor).props.save(draft),/Respuesta interrumpida/);
  assert.equal(view.root.findByType(Editor).props.defaults.amount,'','failed save does not fabricate a new server amount');
  fail=false;await act(async()=>{await view.root.findByType(Editor).props.save(draft);await tick();});
  assert.equal(writes.length,2);assert.equal(writes[0].body.requestId,writes[1].body.requestId);assert.equal(writes[1].body.expectedRevision,'10');assert.equal(writes[1].body.month,'2026-10');assert.equal(writes[1].body.kind,'extra');assert.equal(writes[1].body.amount,'450000');assert.equal(refreshes,1);assert(writes.every(x=>x.url.endsWith('/clients/7/monthly-income')));assert.match(JSON.stringify(view.toJSON()),/Filmación adicional/);assert.match(JSON.stringify(view.toJSON()),/No se registró ningún cobro/);
 }finally{act(()=>view?.unmount());globalThis.fetch=before;clearDataCache();}
});
test('closed months stay readable and expose no monetary mutation editor',async()=>{
 clearDataCache();const before=globalThis.fetch;globalThis.fetch=async()=>response({...state(),canManage:false,periodClosed:true});let view!:ReactTestRenderer;
 try{await act(async()=>{view=create(<ClientMonthlyIncomeDialog clientId="7" name="Cliente" month="2026-10" close={()=>{}}/>);await tick();});assert.match(JSON.stringify(view.toJSON()),/Mes cerrado/);assert.equal(view.root.findAllByType(Editor).length,0);assert(!view.root.findAllByType('button').some(n=>n.children.includes('Agregar servicio extra')));}finally{act(()=>view?.unmount());globalThis.fetch=before;clearDataCache();}
});
test('editing and removing manual monthly base use their entry and leave the global plan outside the write',async()=>{
 clearDataCache();const before=globalThis.fetch;const writes:any[]=[];const entry={id:'40',kind:'base',label:'Acuerdo octubre',amount:1000000,currency:'PYG',version:2,createdAt:'2026-10-20T12:00:00Z'};
 const existing={...state('12'),entries:[entry],totals:[{currency:'PYG',baseAmount:1000000,extrasAmount:0,totalAmount:1000000}]};
 globalThis.fetch=async(input,init={})=>{if(init.method==='DELETE'){writes.push({url:String(input),body:JSON.parse(String(init.body))});return response({...state('13'),totals:[{currency:'PYG',baseAmount:700000,extrasAmount:0,totalAmount:700000}]});}return response(existing);};let view!:ReactTestRenderer;
 try{await act(async()=>{view=create(<ClientMonthlyIncomeDialog clientId="7" name="Cliente" month="2026-10" close={()=>{}}/>);await tick();});await act(async()=>view.root.findAllByType('button').find(n=>n.children.includes('Eliminar'))!.props.onClick());await act(async()=>{await view.root.findByType(Editor).props.save({reason:'Restaurar plan acordado'});await tick();});assert.equal(writes[0].url,'/core-api/api/agency/clients/7/monthly-income/40');assert.equal(writes[0].body.expectedRevision,'12');assert.equal(writes[0].body.reason,'Restaurar plan acordado');assert.equal(writes[0].body.planId,undefined);assert.match(JSON.stringify(view.toJSON()),/vuelve a regir el plan/);}finally{act(()=>view?.unmount());globalThis.fetch=before;clearDataCache();}
});
test('planned result and cash result do not combine contract, invoice and receipt amounts',()=>{
 const treasury:TreasuryBalance={month:'2026-10',period:null,accounts:[{id:'1',name:'Banco',account_type:'bank',currency:'PYG',opening_balance:'0',closing_balance:'50',current_balance:'50',inflows:'100',outflows:'50'}],movements:[['payment','100'],['expense','-10'],['payout','-20'],['transfer_in','999']].map(([movement_type,amount],i)=>({account_id:'1',movement_type,movement_id:String(i),booked_on:'2026-10-01',amount,reference:''}))};
 const forecast={contracted_recurring:{records:[{currency:'PYG',amount:'900'}]},invoiced:{records:[{currency:'PYG',amount:'700'}]},collected_actual:{records:[{currency:'PYG',amount:'100'}]},planned_expenses:{records:[{currency:'PYG',amount:'30'}]},personnel:{records:[{currency:'PYG',expected_end_of_month_expense:'50'}]}} as ForecastData;
 const result=balanceCurrencyRows(treasury,forecast,true)[0];assert.equal(result.plannedResult,'820');assert.equal(result.net,'70');assert.equal(result.contracted,'900');assert.equal(balanceCurrencyRows(treasury,forecast,false)[0].plannedResult,null);
});
