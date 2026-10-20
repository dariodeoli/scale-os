import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
Object.assign(globalThis,{React,window:new EventTarget()});require.extensions['.css']=()=>{};
Object.defineProperty(globalThis,'document',{configurable:true,value:{activeElement:null,body:{style:{overflow:''}},addEventListener(){},removeEventListener(){}}});
require('react-dom').createPortal=(children:React.ReactNode)=>children;
const {AccountForm}=require('../app/workspace-forms') as typeof import('../app/workspace-forms');
const {Editor}=require('../app/operations') as typeof import('../app/operations');
const {SelectCustom}=require('../app/profile-controls') as typeof import('../app/profile-controls');
const {LookupField}=require('../app/ui/smart-field') as typeof import('../app/ui/smart-field');
const {AuditActor}=require('../app/actor-identity') as typeof import('../app/actor-identity');
const {FinanceHistoryPanel}=require('../app/finance-history') as typeof import('../app/finance-history');
const {BalanceSection}=require('../app/finance-balance') as typeof import('../app/finance-balance');
const tick=()=>new Promise(resolve=>setImmediate(resolve)),submit=()=>({preventDefault(){},persist(){}});
const input=(view:ReactTestRenderer,name:string)=>view.root.findAllByType('input').find(node=>node.props.name===name)!;
async function type(view:ReactTestRenderer,name:string,value:string){await act(async()=>{await input(view,name).props.onChange({target:{name,value},type:'change'});});}
test('account suggestions preserve manual labels, strict idempotent POST and persisted PATCH fields',async()=>{
 let view!:ReactTestRenderer;const writes:any[]=[];
 const request=async(path:string,init?:RequestInit)=>{writes.push({path,body:JSON.parse(String(init?.body)),method:init?.method});return {account:{id:'4'}} as any;};
 try{
  await act(async()=>{view=create(<AccountForm custodians={[]} request={request} done={()=>{}}/>);});
  await type(view,'accountNumber','123456789');await act(async()=>{await view.root.findByType('form').props.onSubmit(submit());await tick();});assert.match(writes[0].body.name,/6789/);
  await type(view,'name','Mi cuenta operativa');await type(view,'accountNumber','987654321');
  await type(view,'alias','Operativa');await type(view,'holderName','Titular declarado');
  await act(async()=>{view.root.findAllByType(SelectCustom).find(node=>node.props.label==='Modalidad bancaria')!.props.onChange('checking');await view.root.findByType('form').props.onSubmit(submit());await tick();});
  assert.equal(writes.length,2);assert.equal(writes[1].method,'POST');assert.equal(writes[1].body.accountSubtype,'checking');assert.equal(writes[1].body.alias,'Operativa');assert.equal(writes[1].body.name,'Mi cuenta operativa');assert.match(writes[1].body.requestId,/^[a-f0-9-]{36}$/);
  await act(async()=>view.unmount());
  await act(async()=>{view=create(<AccountForm account={{id:'4',name:'Guardado',account_type:'bank',currency:'PYG',institution:'Banco Familiar',account_number:'123',holder_name:'Titular',holder_tax_id:'8001234',account_subtype:'savings',alias:'Principal',revision:7,active:true,balance:'0',custodian_user_id:null}} custodians={[]} request={request} done={()=>{}}/>);});
  await type(view,'holderName','Titular corregido');await act(async()=>{await view.root.findByType('form').props.onSubmit(submit());await tick();});
  assert.equal(writes.at(-1).method,'PATCH');assert.equal(writes.at(-1).path,'/api/agency/accounts/4');assert.equal(writes.at(-1).body.expectedRevision,7);assert.equal(writes.at(-1).body.name,'Guardado');assert.equal(writes.at(-1).body.holderTaxId,'8001234');assert.equal(writes.at(-1).body.accountSubtype,'savings');
 }finally{act(()=>view?.unmount());}
});
test('lookup Enter never submits the form and ignores repeat, composition and pending requests',async()=>{
 let calls=0,view!:ReactTestRenderer;const event=(extra={})=>({key:'Enter',defaultPrevented:false,repeat:false,nativeEvent:{isComposing:false},preventDefault(){this.defaultPrevented=true;},stopPropagation(){},...extra});
 try{await act(async()=>{view=create(<LookupField label="RUC" lookupLabel="Consultar" onLookup={()=>{calls++;}}/>);});
  const first=event();view.root.findByType('input').props.onKeyDown(first);assert(first.defaultPrevented);assert.equal(calls,1);
  view.root.findByType('input').props.onKeyDown(event({repeat:true}));view.root.findByType('input').props.onKeyDown(event({nativeEvent:{isComposing:true}}));assert.equal(calls,1);
  await act(async()=>view.update(<LookupField label="RUC" lookupLabel="Consultar" state="loading" onLookup={()=>{calls++;}}/>));const pending=event();view.root.findByType('input').props.onKeyDown(pending);assert(pending.defaultPrevented);assert.equal(calls,1);
 }finally{act(()=>view?.unmount());}
});
test('dependent selectors preserve loaded associations until client changes, month validation and required defaults',async()=>{
 let view!:ReactTestRenderer;const ref=React.createRef<any>();
 try{await act(async()=>{view=create(<Editor formHandle={ref} fields={[{key:'clientId',label:'Cliente',choices:[{value:'1',label:'Uno'},{value:'2',label:'Dos'}]},{key:'projectId',label:'Proyecto',optional:true,resetOnChange:['clientId'],choicesFrom:v=>[{value:'',label:'Sin proyecto'},...(v.clientId==='1'?[{value:'11',label:'Proyecto Uno'}]:[])]},{key:'period',label:'Mes',type:'month',optional:true},{key:'optional',label:'Opcional',optional:true,choices:[]}]} defaults={{clientId:'1',projectId:'11',period:'2026-10'}} save={async()=>{}}/>);});
  assert.equal(ref.current.getValues().projectId,'11');assert.equal(ref.current.getValues().optional,'');await act(async()=>ref.current.patchValues({period:'2026-11'}));assert.equal(ref.current.getValues().projectId,'11');
  await act(async()=>ref.current.patchValues({clientId:'2'}));assert.equal(ref.current.getValues().projectId,'');
  await act(async()=>{ref.current.patchValues({period:'2026-99'});await view.root.findByType('form').props.onSubmit(submit());});assert.match(JSON.stringify(view.toJSON()),/mes válido/);
 }finally{act(()=>view?.unmount());}
});
test('management cannot mount Balance even with a forged positive override; unknown audit actors are explicit',async()=>{
 let view!:ReactTestRenderer;try{await act(async()=>{view=create(<BalanceSection user={{id:'1',organization_id:'1',role:'management',capabilities:{'finance.balance.view':true,'salary.view':true}} as any}/>);});assert.equal(view.toJSON(),null);await act(async()=>view.update(<AuditActor name={null} photoUrl="https://example.invalid/fake.png" verified timestamp="2026-10-20T16:32:00Z"/>));assert.match(JSON.stringify(view.toJSON()),/Autor no identificado/);assert.equal(view.root.findAllByType('img').length,0);assert.match(view.root.findByType('time').props.children,/13:32/);
 }finally{act(()=>view?.unmount());}
});
test('monthly review defaults remain unverified, paginates, uses real revision and never records money',async()=>{
 const {PaymentReviewPanel}=require('../app/payment-review-panel') as typeof import('../app/payment-review-panel');
 const {clearDataCache}=require('../app/data-cache') as typeof import('../app/data-cache');
 const {currentForecastMonth}=require('../app/forecast-data') as typeof import('../app/forecast-data');
 const month=currentForecastMonth(),before=globalThis.fetch;let view!:ReactTestRenderer;const calls:{path:string;body:any}[]=[],received:string[][]=[];
 const row=(id:string)=>({client_id:id,name:'Cliente '+id,verification_status:'pending_review',verification_month:month,revision:7,note:'',evidence:{payments:[],opening_receivables:[],monthly_income:[],commercial_terms:[]},missing:{agreement:true,payment_evidence:true}});
 globalThis.fetch=async(input,init)=>{const path=String(input),body=init?.body?JSON.parse(String(init.body)):null;calls.push({path,body});return new Response(JSON.stringify(body?{}:{clients:[row(path.includes('offset=1')?'2':'1')],hasMore:!path.includes('offset=1')}),{status:200,headers:{'Content-Type':'application/json'}});};clearDataCache();
 try{await act(async()=>{view=create(<PaymentReviewPanel onReceive={(id,month)=>received.push([id,month])}/>);await tick();});assert.match(JSON.stringify(view.toJSON()),/Pago por verificar/);assert.doesNotMatch(JSON.stringify(view.toJSON()),/Sin mora/);
  const button=(label:string)=>view.root.findAllByType('button').find(node=>node.children.includes(label))!;
  await act(async()=>{await button('Cargar más clientes para revisar').props.onClick();await tick();});assert.match(JSON.stringify(view.toJSON()),/Cliente 2/);assert(calls.some(call=>call.path.includes('offset=1')));
  await act(async()=>button('Recibir pago').props.onClick());assert.deepEqual(received,[['1',month]]);
  await act(async()=>button('Regularizar').props.onClick());assert.match(JSON.stringify(view.toJSON()),/evidencia de pago/);await act(async()=>{await view.root.findByType(Editor).props.save({status:'reviewed',note:'Comprobantes pendientes de conciliación'});await tick();});
  const write=calls.find(call=>call.body)!;assert.match(write.path,/payment-reviews\/1$/);assert.equal(write.body.expectedRevision,7);assert.equal(write.body.month,month);assert.equal(write.body.status,'reviewed');assert.match(write.body.requestId,/^[a-f0-9-]{36}$/);assert.equal(calls.filter(call=>call.body).length,1);assert(!calls.some(call=>/\/payments(?:$|\?)/.test(call.path)));
 }finally{act(()=>view?.unmount());globalThis.fetch=before;clearDataCache();}
});

test('review labels require this month and never equate a review with paid',()=>{
 const {paymentReviewLabel,paymentReviewedForMonth}=require('../app/payment-verification') as typeof import('../app/payment-verification');
 assert.equal(paymentReviewLabel({},'2026-10'),'Pago por verificar');
 assert.equal(paymentReviewLabel({verification_status:'reviewed',verification_month:'2026-09'},'2026-10'),'Pago por verificar');
 assert.equal(paymentReviewedForMonth({verification_status:'reviewed',verification_month:'2026-10'},'2026-10'),true);
 assert.equal(paymentReviewLabel({verification_status:'reviewed',verification_month:'2026-10'},'2026-10'),'Revisado · sin saldo registrado');
});
test('existing USD receipts offer only same-currency monthly associations even when company uses PYG',async()=>{
 const ts=await import('typescript');const {readFileSync}=await import('node:fs');const compiled=ts.transpileModule(readFileSync(new URL('../app/finance-collections.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 let props:any,view!:ReactTestRenderer;const calls:string[]=[];const receipt={id:'1',invoice_id:null,client_id:'2',account_id:'3',account_name:'Banco USD',currency:'USD',amount:'100',received_on:'2026-10-01',reference:'',period:'2026-10',links_revision:4};
 const ctx={clients:[{id:'2',name:'Cliente'}],projects:[],plans:[],accounts:[{id:'3',name:'Banco USD',currency:'USD'}],invoices:[]};
 const mockApi=async(path:string)=>{calls.push(path);if(path.includes('/context'))return ctx;if(path.includes('/receipts'))return {receipts:[receipt],hasMore:false};if(path.includes('/monthly-income'))return {clientId:'2',month:'2026-10',revision:'0',canManage:true,entries:[{id:'4',kind:'extra',label:'Extra USD',amount:'100',currency:'USD',version:0,createdAt:'2026-10-01'},{id:'5',kind:'extra',label:'Extra PYG',amount:'100',currency:'PYG',version:0,createdAt:'2026-10-01'}],totals:[]};return {receivables:[]};};
 const exported:any={};const customRequire=(name:string):unknown=>name==='react'?React:name==='./operations'?{api:mockApi,Dialog:({children}:any)=><div>{children}</div>,Editor:(value:any)=>{props=value;return <div/>;}}:name==='./payment-review-panel'?{PaymentReviewPanel:()=>null}:name==='./currency-provider'?{useCompanyCurrency:()=>({currency:'PYG'})}:name.endsWith('.css')?{}:require(name.startsWith('./')?'../app/'+name.slice(2):name);new Function('require','exports','React',compiled)(customRequire,exported,React);
 try{await act(async()=>{view=create(React.createElement(exported.FinanceCollections,{user:{id:'1',organization_id:'1',role:'finance'}}));await tick();});await act(async()=>view.root.findAllByType('button').find(node=>node.children.includes('Asociar'))!.props.onClick());await act(async()=>{props.onValuesChange({clientId:'2',period:'2026-10'});await tick();});const choices=props.fields.find((field:any)=>field.key==='monthlyIncomeEntryId').choices;assert(choices.some((choice:any)=>choice.value==='4'));assert(!choices.some((choice:any)=>choice.value==='5'));assert(calls.some(path=>path.includes('/clients/2/monthly-income?month=2026-10')));
 }finally{act(()=>view?.unmount());}
});
