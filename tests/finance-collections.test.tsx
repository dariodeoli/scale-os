import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {create,act,type ReactTestRenderer} from 'react-test-renderer';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
const {FinanceCollections}=require('../app/finance-collections') as typeof import('../app/finance-collections');
const {clearDataCache}=require('../app/data-cache') as typeof import('../app/data-cache');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const user={id:'1',organization_id:'1',role:'finance'} as import('../app/workspace-types').User;
test('collections with an effective payments denial never loads financial catalogs',async()=>{
 const before=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return response({});};let renderer:ReactTestRenderer|undefined;
 try{await act(async()=>{renderer=create(<FinanceCollections user={{...user,capabilities:{'payments.manage':false}}}/>);await tick();});assert.equal(calls,0);assert.equal(renderer!.toJSON(),null);}finally{act(()=>renderer?.unmount());globalThis.fetch=before;}
});
test('collections failure offers retry and a successful empty response enables receipt entry',async()=>{
 clearDataCache();const before=globalThis.fetch;let fail=true;const calls:string[]=[];
 globalThis.fetch=async input=>{const path=String(input);calls.push(path);if(fail)return response({error:'Acceso temporalmente no disponible'},503);if(path.endsWith('/context'))return response({clients:[],projects:[],plans:[],accounts:[],invoices:[]});if(path.includes('/receipts?'))return response({receipts:[],hasMore:false});return response({receivables:[]});};let renderer:ReactTestRenderer|undefined;
 try{await act(async()=>{renderer=create(<FinanceCollections user={user}/>);await tick();});assert.match(JSON.stringify(renderer!.toJSON()),/Acceso temporalmente no disponible/);const retry=renderer!.root.findAllByType('button').find(button=>button.children.includes('Reintentar'));assert(retry);fail=false;await act(async()=>{retry.props.onClick();await tick();});assert.match(JSON.stringify(renderer!.toJSON()),/Sin cobros registrados/);assert.equal(renderer!.root.findAllByType('button').find(button=>button.children.includes('Recibir pago'))!.props.disabled,false);assert(calls.every(path=>path.startsWith('/core-api/api/agency/')));}finally{act(()=>renderer?.unmount());globalThis.fetch=before;clearDataCache();}
});
test('receipt retries retain one UUID and links carry the server revision',async()=>{
 const ts=await import('typescript');const {readFileSync}=await import('node:fs');
 const compiled=ts.transpileModule(readFileSync(new URL('../app/finance-collections.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 let editor:{save:(values:Record<string,string>)=>Promise<void>}|undefined;const writes:{path:string;body:Record<string,unknown>}[]=[];let fail=true;
 const receipt={id:'p1',invoice_id:null,client_id:'c1',account_id:'a1',account_name:'Banco',amount:'200',currency:'PYG',received_on:'2026-10-01',reference:'',links_revision:3};
 const mockApi=async(path:string,body?:Record<string,unknown>)=>{if(body){writes.push({path,body});if(fail)throw Error('Respuesta interrumpida');return {};}if(path.includes('/context'))return {clients:[{id:'c1',name:'Cliente'}],projects:[],plans:[],accounts:[{id:'a1',name:'Banco',currency:'PYG'}],invoices:[]};if(path.includes('/receipts'))return {receipts:[receipt],hasMore:false};return {receivables:[]};};
 const exported:any={};const pass=({children}:any)=><div>{children}</div>;
 const customRequire=(name:string):unknown=>name==='react'?React:name==='./operations'?{api:mockApi,Dialog:pass,Editor:(props:any)=>{editor=props;return <div/>;}}:name==='./finance-receipt-editor'?{ReceiptPaymentDialog:(props:any)=>{editor={save:props.save};return <div/>;}}:name==='./currency-provider'?{useCompanyCurrency:()=>({currency:'PYG'})}:name.endsWith('.css')?{}:require(name.startsWith('./')?'../app/'+name.slice(2):name);
 new Function('require','exports','React',compiled)(customRequire,exported,React);let renderer:ReactTestRenderer|undefined;
 try{await act(async()=>{renderer=create(React.createElement(exported.FinanceCollections,{user}));await tick();});await act(async()=>{renderer!.root.findAllByType('button').find(button=>button.children.includes('Recibir pago'))!.props.onClick();});
 const values={accountId:'a1',amount:'200',receivedOn:'2026-10-01',reference:'',clientId:'',projectId:'',planId:''};await assert.rejects(()=>editor!.save(values));fail=false;await act(async()=>{await editor!.save(values);await tick();});assert.match(String(writes[0].body.requestId),/^[a-f0-9-]{36}$/);assert.equal(writes[0].body.requestId,writes[1].body.requestId);assert.equal(writes[0].body.mode,'unassigned');
 await act(async()=>{renderer!.root.findAllByType('button').find(button=>button.children.includes('Asociar'))!.props.onClick();});await act(async()=>{await editor!.save({clientId:'c1',projectId:'',planId:''});await tick();});assert.equal(writes.at(-1)!.body.expectedRevision,3);
 }finally{act(()=>renderer?.unmount());}
});
test('legacy invoice receipts remain paginated and expose audited date correction without reapplication actions',async()=>{
 const ts=await import('typescript');const {readFileSync}=await import('node:fs');
 const compiled=ts.transpileModule(readFileSync(new URL('../app/finance-collections.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 let editor:{save:(values:Record<string,string>)=>Promise<void>}|undefined;const writes:{path:string;body:Record<string,unknown>}[]=[];
 const legacy={id:'legacy-1',invoice_id:'invoice-1',invoice_number:'F-LEGACY-1',client_id:'c1',client_name:'Cliente',account_id:'a1',account_name:'Banco',amount:'200',currency:'PYG',received_on:'2026-10-01',reference:'Referencia histórica'};
 const mockApi=async(path:string,body?:Record<string,unknown>)=>{if(body){writes.push({path,body});return {};}if(path.includes('/context'))return {clients:[],projects:[],plans:[],accounts:[],invoices:[]};if(path.includes('/receipts'))return path.includes('offset=1')?{receipts:[{...legacy,id:'legacy-2',invoice_id:'invoice-2',invoice_number:'F-LEGACY-2'}],hasMore:false}:{receipts:[legacy],hasMore:true};return {receivables:[]};};
 const exported:any={};const pass=({children}:any)=><div>{children}</div>;
 const customRequire=(name:string):unknown=>name==='react'?React:name==='./operations'?{api:mockApi,Dialog:pass,Editor:(props:any)=>{editor=props;return <div/>;}}:name==='./finance-receipt-editor'?{ReceiptPaymentDialog:(props:any)=>{editor={save:props.save};return <div/>;}}:name==='./currency-provider'?{useCompanyCurrency:()=>({currency:'PYG'})}:name.endsWith('.css')?{}:require(name.startsWith('./')?'../app/'+name.slice(2):name);
 new Function('require','exports','React',compiled)(customRequire,exported,React);let renderer:ReactTestRenderer|undefined;
 try{await act(async()=>{renderer=create(React.createElement(exported.FinanceCollections,{user}));await tick();});assert.match(JSON.stringify(renderer!.toJSON()),/Factura F-LEGACY-1/);const buttons=()=>renderer!.root.findAllByType('button');for(const label of ['Asociar','Aplicar','Detalle'])assert.equal(buttons().some(button=>button.children.includes(label)),false,`legacy receipt never exposes ${label}`);assert.equal(buttons().filter(button=>button.children.includes('Fecha')).length,1);assert.equal(buttons().filter(button=>button.children.includes('Revertir')).length,1);
 await act(async()=>{await buttons().find(button=>button.children.includes('Cargar más cobros'))!.props.onClick();await tick();});assert.match(JSON.stringify(renderer!.toJSON()),/Factura F-LEGACY-2/);assert.equal(buttons().filter(button=>button.children.includes('Fecha')).length,2,'legacy receipts are also preserved on subsequent pages');
 await act(async()=>buttons().find(button=>button.children.includes('Fecha'))!.props.onClick());await act(async()=>{await editor!.save({reason:'Fecha cargada incorrectamente',receivedOn:'2026-09-30'});await tick();});assert.equal(writes[0].path,'/api/agency/payments/legacy-1/date-correction');assert.equal(writes[0].body.receivedOn,'2026-09-30');assert.equal(writes[0].body.reason,'Fecha cargada incorrectamente');assert.match(String(writes[0].body.requestId),/^[a-f0-9-]{36}$/);
 }finally{act(()=>renderer?.unmount());}
});
