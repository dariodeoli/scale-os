import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {create,act,type ReactTestRenderer} from 'react-test-renderer';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import type {Field} from '../app/operations';
Object.assign(globalThis,{React,window:new EventTarget()});require.extensions['.css']=()=>{};
const {Editor}=require('../app/operations') as typeof import('../app/operations');
const {AmountInput}=require('../app/profile-controls') as typeof import('../app/profile-controls');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const user={id:'1',organization_id:'1',role:'owner'};
type EditorProps={fields:Field[];defaults:Record<string,string>;save:(values:Record<string,string>)=>Promise<void>};
type Write={path:string;body:Record<string,unknown>};
const accounts=[{id:'101',name:'Banco USD',currency:'USD',account_type:'bank',current_balance:'0',opening_balance:'0',closing_balance:'0',inflows:'0',outflows:'0'},{id:'102',name:'Caja PYG',currency:'PYG',account_type:'cash',current_balance:'0',opening_balance:'0',closing_balance:'0',inflows:'0',outflows:'0'}];
const receipt={id:'401',invoice_id:null,client_id:'201',account_id:'101',account_name:'Banco USD',currency:'USD',amount:'500',received_on:'2026-10-17',reference:''};
const debt={id:'301',client_id:'201',client_name:'Cliente',amount:'500',paid_amount:'0',outstanding_amount:'500',currency:'USD',period:'2026-09-01',due_on:'2026-09-10',reason:'Servicios anteriores'};
async function harness(component:'finance-collections'|'finance-balance'){
 let editor:EditorProps|undefined;const writes:Write[]=[];
 const api=async(path:string,body?:Record<string,unknown>)=>{if(body){writes.push({path,body});return {};}if(path.includes('/context'))return {clients:[{id:'201',name:'Cliente'}],projects:[],plans:[],accounts,invoices:[]};if(path.includes('/receipts'))return {receipts:[receipt],hasMore:false};if(path.includes('/opening-receivables'))return {receivables:[debt]};if(path.includes('/applications'))return {applications:[],available_amount:'500'};if(path.includes('/treasury'))return {month:'2026-10',period:null,accounts,movements:[]};if(path.includes('/planned-expenses'))return {records:[]};if(path.includes('/expenses'))return {expenses:[]};throw Error('Unexpected test read '+path);};
 const source=readFileSync(new URL('../app/'+component+'.tsx',import.meta.url),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const pass=({children}:any)=><div>{children}</div>,exports:any={};
 const customRequire=(name:string):unknown=>name==='react'?React:name==='./operations'?{api,Dialog:pass,Editor:(props:EditorProps)=>{editor=props;return <div/>;}}:name==='./currency-provider'?{useCompanyCurrency:()=>({currency:'USD'})}:name==='./use-forecast'?{useForecast:()=>({data:null,error:'',reload(){}})}:name.endsWith('.css')?{}:require(name.startsWith('./')?'../app/'+name.slice(2):name);
 new Function('require','exports','React',compiled)(customRequire,exports,React);
 let renderer!:ReactTestRenderer;await act(async()=>{renderer=create(React.createElement(component==='finance-collections'?exports.FinanceCollections:exports.BalanceSection,{user}));await tick();});
 return {renderer,writes,getEditor:()=>{assert(editor);return editor;},open:async(label:string)=>{await act(async()=>{const button=renderer.root.findAllByType('button').find(button=>button.children.includes(label));assert(button,label+' exists');button.props.onClick();await tick();});return editor!;}};
}
async function realSubmit(props:EditorProps,currency:'USD'|'PYG',overrides:Record<string,string>={}){
 let renderer!:ReactTestRenderer;const saved:Record<string,string>[]=[];
 await act(async()=>{renderer=create(<Editor {...props} defaults={{...props.defaults,...overrides}} save={async values=>{saved.push(values);await props.save(values);}}/>);});
 try{
  assert.equal(renderer.root.findByType(AmountInput).props.value,'','new money values stay empty; zero is a placeholder');
  assert.equal(renderer.root.findByType(AmountInput).props.currency,currency);
  const input=renderer.root.findAllByType('input').find(node=>node.props.id?.endsWith('-amount'))!;assert(input);
  assert.equal(input.props.inputMode,currency==='PYG'?'numeric':'decimal');
  await act(async()=>{input.props.onChange({currentTarget:{value:'100.25',selectionStart:6}});await tick();});
  await act(async()=>{await renderer.root.findByType('form').props.onSubmit({preventDefault(){},persist(){}});await tick();});
  return {saved,rendered:JSON.stringify(renderer.toJSON())};
 }finally{act(()=>renderer.unmount());}
}
test('real Editor submits USD cents for receipts, prior debt and applications; PYG input remains integral',async()=>{
 for(const [label,overrides,path] of [['Recibir pago',{accountId:'101',receivedOn:'2026-10-17'},'/api/agency/payments'],['Cargar deuda anterior',{clientId:'201',currency:'USD',period:'2026-09',dueOn:'2026-09-10',reason:'Mes anterior'},'/api/agency/finance/opening-receivables'],['Aplicar',{target:'debt:301'},'/api/agency/payments/401/applications']] as const){
  const h=await harness('finance-collections');try{const props=await h.open(label);const result=await realSubmit(props,'USD',overrides);assert.equal(result.saved.length,1,label+' must pass real schema validation');assert.equal(result.saved[0].amount,'100.25');assert.equal(h.writes[0].path,path);assert.equal(h.writes[0].body.amount,'100.25');}finally{act(()=>h.renderer.unmount());}
 }
 const h=await harness('finance-collections');try{const props=await h.open('Recibir pago');const result=await realSubmit(props,'PYG',{accountId:'102',receivedOn:'2026-10-17'});assert.equal(result.saved[0].amount,'100');assert.equal(h.writes[0].body.amount,'100');}finally{act(()=>h.renderer.unmount());}
});
test('real Editor permits USD cents for paid expenses and account openings while planned expenses remain whole',async()=>{
 for(const [label,overrides,path] of [['Registrar gasto',{category:'Servicio',kind:'variable',accountId:'101',paidOn:'2026-10-17'},'/api/agency/expenses'],['Registrar saldo de apertura',{openedOn:'2026-10-17',reason:'Saldo inicial'},'/api/agency/finance/account-openings']] as const){
  const h=await harness('finance-balance');try{const props=await h.open(label);const result=await realSubmit(props,'USD',overrides);assert.equal(result.saved.length,1,label+' must accept cents');assert.equal(result.saved[0].amount,'100.25');assert.equal(h.writes[0].path,path);assert.equal(h.writes[0].body.amount,'100.25');}finally{act(()=>h.renderer.unmount());}
 }
 const h=await harness('finance-balance');try{const props=await h.open('Planificar gasto');const result=await realSubmit(props,'USD',{category:'Servicio',kind:'fixed',currency:'USD',cadence:'monthly'});assert.equal(result.saved.length,0,'planned forecast expenses retain their whole-money contract');assert.equal(h.writes.length,0);assert.match(result.rendered,/Ingresá un número entero/);}finally{act(()=>h.renderer.unmount());}
});
