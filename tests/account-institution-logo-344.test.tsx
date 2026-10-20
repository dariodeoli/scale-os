import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {renderToStaticMarkup} from 'react-dom/server';
import {AccountInstitutionLogo} from '../app/account-institution-logo';

Object.assign(globalThis,{React});
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));
async function imageOf(renderer:ReactTestRenderer){
 for(let attempt=0;attempt<100;attempt++){
  await act(async()=>{await settle();});
  const image=renderer.root.findAllByType('img')[0];
  if(image)return String(image.props.src);
 }
 throw new Error('Catalog bank logo did not load');
}

test('saved account renders the persisted bank identity, independently of editable account name',async()=>{
 // Model the JSON returned by GET /accounts after save/reload; no image URL is
 // stored in an account because OwnCoding UI owns the canonical institution art.
 const saved=JSON.parse(JSON.stringify({name:'Operativa de la agencia',institution:'Banco Continental'}));
 let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<AccountInstitutionLogo institution={saved.institution}/>);});
 assert.equal(renderer.root.findByProps({'data-account-institution':'Banco Continental'}).props.title,'Banco Continental');
 const continental=await imageOf(renderer);
 assert.match(continental,/^data:image\//);
 // Same account label, different persisted institution: the old logo must not
 // remain when editing/reopening an account from another bank.
 await act(async()=>{renderer.update(<AccountInstitutionLogo institution="Banco Familiar"/>);});
 const familiar=await imageOf(renderer);
 assert.notEqual(familiar,continental);
 assert.equal(renderer.root.findByProps({'data-account-institution':'Banco Familiar'}).props.title,'Banco Familiar');
 await act(async()=>{renderer.update(<AccountInstitutionLogo institution=""/>);});
 assert.equal(renderer.toJSON(),null,'cash/custom account without bank does not get an invented bank logo');
 await act(async()=>{renderer.unmount();});
});

test('historical bank name remains resolvable and custom institutions retain honest fallback',async()=>{
 let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<AccountInstitutionLogo institution="Banco GNB Paraguay"/>);});
 assert.match(await imageOf(renderer),/^data:image\//);
 await act(async()=>{renderer.update(<AccountInstitutionLogo institution="Cooperativa QA local"/>);});
 assert.equal(renderer.root.findByProps({'data-account-institution':'Cooperativa QA local'}).props.title,'Cooperativa QA local');
 assert.equal(renderer.root.findAllByType('img').length,0,'unknown institution does not inherit a previous bank asset');
 assert.match(JSON.stringify(renderer.toJSON()),/Cooperativa QA local|CQ|CQL/);
 await act(async()=>{renderer.unmount();});
});


test('accounts page keeps institution identity after reload of saved accounts',()=>{
 require.extensions['.css']=()=>{};
 const {FinanzasSection}=require('../app/sections/finanzas') as typeof import('../app/sections/finanzas');
 const accounts=[{id:'1',name:'Cuenta operativa',account_type:'bank' as const,currency:'PYG' as const,balance:'0',active:true,institution:'Banco Continental',account_number:'001',holder_name:'Agencia QA',custodian_user_id:null},
  {id:'2',name:'Cuenta operativa',account_type:'bank' as const,currency:'PYG' as const,balance:'0',active:true,institution:'Banco Familiar',account_number:'002',holder_name:'Agencia QA',custodian_user_id:null}];
 const html=renderToStaticMarkup(<FinanzasSection user={null} financeState="ready" accounts={JSON.parse(JSON.stringify(accounts))} invoices={[]} transfers={[]} payments={[]} invoiceHasMore={false} paymentHasMore={false} financeEmpty={false} loadFinance={async()=>{}} loadAllInvoices={async()=>{}} loadAllPayments={async()=>{}} setModal={()=>{}} openPayment={()=>{}}/>);
 assert.match(html,/data-account-institution="Banco Continental"/);
 assert.match(html,/data-account-institution="Banco Familiar"/);
 assert.equal((html.match(/Cuenta operativa/g)||[]).length,4,'editable label and title stay unchanged for both accounts');
});
