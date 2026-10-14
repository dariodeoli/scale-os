import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {CompanyCurrencyProvider} from '../app/currency-provider';

// Regresión del smoke e2e local: en una agencia en USD, «Gastos planificados»
// arrancaba en Guaraníes (PYG fijo) en vez de la moneda de la empresa.
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
Object.defineProperty(globalThis,'window',{configurable:true,value:new EventTarget()});
const reactDOM=require('react-dom');reactDOM.createPortal=(children:React.ReactNode)=>children;
Object.defineProperty(globalThis,'document',{configurable:true,value:{activeElement:null,body:{style:{overflow:''}},addEventListener(){},removeEventListener(){}}});
const {FinancialForecast}=require('../app/financial-forecast') as typeof import('../app/financial-forecast');
const {CurrencyField}=require('../app/ui-v2') as typeof import('../app/ui-v2');

const forecast={month:'2026-10',time_zone:'America/Asuncion',records:[],contracted_recurring:{records:[]},invoiced:{records:[]},collected_actual:{records:[]},personnel:{included_headcount:0,records:[]},commission_forecast:{records:[]},planned_expenses:{records:[]},projection:{records:[]},opening_balance:{records:[]},contracted_clients:{records:[]},definition:{}};
globalThis.fetch=(async(input:RequestInfo|URL)=>{
 const url=String(input);
 const body=url.includes('/api/agency/forecast')?forecast:url.includes('/api/agency/accounts')?{accounts:[]}:url.includes('/api/agency/expenses')?{expenses:[]}:url.includes('/api/agency/planned-expenses')?{month:'2026-10',expenses:[]}:{};
 return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
}) as typeof fetch;

async function expenseCurrency(defaultCurrency:string){
 let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<CompanyCurrencyProvider organizationId="qa" defaultCurrency={defaultCurrency}><FinancialForecast role="owner" organizationId="qa"/></CompanyCurrencyProvider>);});
 for(let tick=0;tick<5;tick++)await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});
 const field=renderer.root.findAllByType(CurrencyField).find(node=>node.props.id==='forecast-expense-currency');
 assert(field,'el formulario de gasto planificado está a la vista');
 const value=field.props.value;
 act(()=>renderer.unmount());
 return value;
}
(async()=>{
 assert.equal(await expenseCurrency('USD'),'USD','una agencia en USD planifica en USD por defecto');
 assert.equal(await expenseCurrency('EUR'),'EUR');
 assert.equal(await expenseCurrency('PYG'),'PYG');
 console.log('PASS: la previsión planifica gastos en la moneda de la empresa');
})().catch(error=>{console.error(error);process.exit(1);});
