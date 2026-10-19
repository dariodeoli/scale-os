import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
Object.assign(globalThis,{React,window:new EventTarget()});require.extensions['.css']=()=>{};
require('react-dom').createPortal=(children:React.ReactNode)=>children;
Object.defineProperty(globalThis,'document',{configurable:true,value:{activeElement:null,body:{style:{overflow:''}},addEventListener(){},removeEventListener(){}}});
const {BalanceSection}=require('../app/finance-balance');
const {MonthPicker,adjacentMonth,balanceMonthValid}=require('../app/month-picker');
const {Editor}=require('../app/operations');
const {clearDataCache}=require('../app/data-cache');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const json=(data:unknown)=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
test('month arithmetic and policy reject partial or out of range selections',()=>{
 assert.equal(adjacentMonth('2026-12',1),'2027-01');assert.equal(adjacentMonth('2027-01',-1),'2026-12');assert.equal(adjacentMonth('1900-01',-1),null);assert.equal(adjacentMonth('9998-12',1),null);
 for(const value of ['','2026-','2026-13','1899-12','9999-01'])assert.equal(balanceMonthValid(value),false);
});
test('balance fetches selected month and period confirmation captures its exact month/revision',async()=>{
 clearDataCache();const previous=globalThis.fetch,requests:string[]=[],writes:{path:string;body:unknown}[]=[];let view!:ReactTestRenderer;
 globalThis.fetch=async(input,init)=>{const path=String(input);requests.push(path);if(init?.method==='POST'){writes.push({path,body:JSON.parse(String(init.body))});return json({ok:true});}const month=new URL(path,'https://fixture.invalid').searchParams.get('month');if(path.includes('/treasury'))return json({month,period:{status:month==='2027-01'?'closed':'open',revision:month==='2027-01'?7:3},accounts:[],movements:[]});if(path.includes('/balance-details'))return json({month,clients:{records:[]},personnel:{records:[]},totals:[]});if(path.includes('/expenses?'))return json({expenses:[]});if(path.includes('/planned-expenses'))return json({records:[]});return json({month,records:[]});};
 try{await act(async()=>{view=create(<BalanceSection user={{id:'1',organization_id:'1',role:'owner'}}/>);await tick();});
 await act(async()=>{view.root.findByType(MonthPicker).props.onChange('2027-01');await tick();});
 assert(requests.some(path=>path.includes('/treasury?month=2027-01')));assert(requests.some(path=>path.includes('/balance-details?month=2027-01')));
 const reopen=view.root.findAll(node=>node.type==='button'&&node.children.join('')==='Reabrir mes')[0];assert(reopen);await act(async()=>reopen.props.onClick());
 const save=view.root.findByType(Editor).props.save;
 await act(async()=>{view.root.findByType(MonthPicker).props.onChange('2027-02');await tick();});assert.equal(view.root.findAllByType(Editor).length,0,'changing month dismisses an obsolete confirmation');
 await act(async()=>{await save({reason:'Corrección auditada'});await tick();});
 assert.match(writes[0].path,/periods\/2027-01\/reopen$/);assert.deepEqual(writes[0].body,{reason:'Corrección auditada',expectedRevision:7});
 }finally{act(()=>view?.unmount());globalThis.fetch=previous;clearDataCache();}
});
