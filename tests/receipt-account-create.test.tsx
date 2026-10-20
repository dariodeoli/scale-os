import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import type {EditorHandle} from '../app/operations';
Object.assign(globalThis,{React,window:new EventTarget()});require.extensions['.css']=()=>{};
const reactDOM=require('react-dom');reactDOM.createPortal=(children:React.ReactNode)=>children;
Object.defineProperty(globalThis,'document',{configurable:true,value:{activeElement:null,body:{style:{overflow:''}},addEventListener(){},removeEventListener(){}}});
const {FinanceCollections}=require('../app/finance-collections') as typeof import('../app/finance-collections');
const {Editor,Dialog}=require('../app/operations') as typeof import('../app/operations');
const {AccountForm}=require('../app/workspace-forms') as typeof import('../app/workspace-forms');
const {AmountInput,SelectCustom}=require('../app/profile-controls') as typeof import('../app/profile-controls');
const {CompanyCurrencyProvider}=require('../app/currency-provider') as typeof import('../app/currency-provider');
const {clearDataCache}=require('../app/data-cache') as typeof import('../app/data-cache');
const tick=()=>new Promise(resolve=>setImmediate(resolve)),event=()=>({preventDefault(){},persist(){}});
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const user={id:'1',organization_id:'1',role:'finance'} as any;
const account={id:'101',name:'Cuenta nueva',account_type:'cash',currency:'USD',active:true,balance:'0',institution:null,account_number:null,holder_name:null,custodian_user_id:null};
function routes(path:string){if(path.includes('/context'))return {clients:[{id:'201',name:'Cliente'}],projects:[],plans:[],accounts:[],invoices:[]};if(path.includes('/receipts?'))return {receipts:[],hasMore:false};if(path.endsWith('/custodians'))return {members:[]};return {receivables:[]};}
async function mount(currentUser=user){let view!:ReactTestRenderer;await act(async()=>{view=create(<CompanyCurrencyProvider organizationId="1" defaultCurrency="USD"><FinanceCollections user={currentUser}/></CompanyCurrencyProvider>);await tick();});await act(async()=>{view.root.findAllByType('button').find(button=>button.children.includes('Recibir pago'))!.props.onClick();await tick();});return view;}
const receipt=(view:ReactTestRenderer)=>view.root.findByType(Editor);
const values=(view:ReactTestRenderer)=>receipt(view).props.formHandle.current.getValues();
async function fillDraft(view:ReactTestRenderer){await act(async()=>{view.root.findByType(AmountInput).props.onChange('100.25');view.root.findAllByType(SelectCustom).find(select=>select.props.label.startsWith('Cliente'))!.props.onChange('201');await receipt(view).findAllByType('input').find(input=>input.props.name==='reference')!.props.onChange({target:{name:'reference',value:'Pago conservado'},type:'change'});});}
async function openAccount(view:ReactTestRenderer){await act(async()=>{view.root.findAllByType('button').find(button=>button.children.includes('Agregar cuenta'))!.props.onClick();await tick();});}
async function fillAccount(view:ReactTestRenderer,currency='USD'){await act(async()=>{const form=view.root.findByType(AccountForm);await form.findAllByType('input').find(input=>input.props.name==='name')!.props.onChange({target:{name:'name',value:'Cuenta nueva'},type:'change'});form.findAllByType(SelectCustom).find(select=>select.props.label==='Tipo de cuenta')!.props.onChange('cash');form.findAllByType(SelectCustom).find(select=>select.props.label==='Moneda')!.props.onChange(currency);});}
test('inline account creation uses the real canonical form once and selects the new account without resetting the receipt',async()=>{
 clearDataCache();const before=globalThis.fetch,writes:{path:string;body:any}[]=[];let resolveAccount:((response:Response)=>void)|undefined;
 globalThis.fetch=async(input,init)=>{const path=String(input);if(init?.method==='POST'){writes.push({path,body:JSON.parse(String(init.body))});if(path.endsWith('/accounts'))return new Promise<Response>(resolve=>{resolveAccount=resolve;});return response({payment:{id:'301'}});}return response(routes(path));};let view!:ReactTestRenderer;
 try{view=await mount();await fillDraft(view);const draft=values(view),originalEditor=receipt(view);await openAccount(view);assert.equal(receipt(view),originalEditor,'opening a child popup keeps the same canonical receipt Editor');await fillAccount(view);
  await act(async()=>{const form=view.root.findByType(AccountForm).findByType('form');const first=form.props.onSubmit(event()),second=form.props.onSubmit(event());await tick();assert.equal(writes.length,1,'single-flight begins before async validation');resolveAccount!(response({account},201));await Promise.all([first,second]);await tick();});
  assert.equal(view.root.findAllByType(AccountForm).length,0);assert.deepEqual(values(view),{...draft,accountId:'101'});assert.equal(writes[0].body.currency,'USD');
  await act(async()=>{await receipt(view).findByType('form').props.onSubmit(event());await tick();});assert.equal(writes.length,2);assert(writes[1].path.endsWith('/payments'));assert.equal(writes[1].body.accountId,'101');assert.equal(writes[1].body.amount,'100.25');assert.equal(writes[1].body.clientId,'201');assert.equal(writes[1].body.reference,'Pago conservado');assert.equal(writes[1].body.requestId,draft.requestId,'account popup does not rotate the receipt idempotency key');
 }finally{act(()=>view?.unmount());globalThis.fetch=before;clearDataCache();}
});
test('account validation/server errors and cancel preserve receipt draft and existing field errors',async()=>{
 clearDataCache();const before=globalThis.fetch;let posts=0;globalThis.fetch=async(input,init)=>{if(init?.method==='POST'){posts++;return response({error:'No se pudo crear esta cuenta'},400);}return response(routes(String(input)));};let view!:ReactTestRenderer;
 try{view=await mount();await fillDraft(view);await act(async()=>{await receipt(view).findByType('form').props.onSubmit(event());await tick();});assert.match(JSON.stringify(view.toJSON()),/Completá cuenta de ingreso/);const draft=values(view);await openAccount(view);await fillAccount(view);await act(async()=>{await view.root.findByType(AccountForm).findByType('form').props.onSubmit(event());await tick();});assert.equal(posts,1);assert.match(JSON.stringify(view.toJSON()),/No se pudo crear esta cuenta/);assert.deepEqual(values(view),draft);
  await act(async()=>view.root.findAllByType(Dialog).find(dialog=>dialog.props.title==='Nueva cuenta')!.props.close());assert.deepEqual(values(view),draft);assert.match(JSON.stringify(view.toJSON()),/Completá cuenta de ingreso/);assert.equal(posts,1);
 }finally{act(()=>view?.unmount());globalThis.fetch=before;clearDataCache();}
});
test('a different account currency requires an explicit review and never reinterprets the existing amount',async()=>{
 clearDataCache();const before=globalThis.fetch;globalThis.fetch=async(input,init)=>init?.method==='POST'?response({account:{...account,currency:'PYG'}},201):response(routes(String(input)));let view!:ReactTestRenderer;
 try{view=await mount();await fillDraft(view);const draft=values(view);await openAccount(view);await fillAccount(view,'PYG');await act(async()=>{await view.root.findByType(AccountForm).findByType('form').props.onSubmit(event());await tick();});assert.match(JSON.stringify(view.toJSON()),/Revisar moneda del cobro/);assert.deepEqual(values(view),draft);
  await act(async()=>view.root.findAllByType('button').find(button=>button.children.includes('Usar cuenta y revisar importe'))!.props.onClick());assert.deepEqual(values(view),{...draft,accountId:'101',amount:''});assert.equal(view.root.findByType(AmountInput).props.currency,'PYG');
 }finally{act(()=>view?.unmount());globalThis.fetch=before;clearDataCache();}
});
test('accounts permission denial hides inline creation and never loads custodians',async()=>{
 clearDataCache();const before=globalThis.fetch,calls:string[]=[];globalThis.fetch=async(input)=>{calls.push(String(input));return response(routes(String(input)));};let view!:ReactTestRenderer;
 try{view=await mount({...user,capabilities:{'accounts.manage':false}});assert.equal(view.root.findAllByType('button').some(button=>button.children.includes('Agregar cuenta')),false);assert(!calls.some(path=>path.endsWith('/custodians')));}
 finally{act(()=>view?.unmount());globalThis.fetch=before;clearDataCache();}
});
test('Editor patches retain checkbox strings, derived values and unrelated validation errors',async()=>{
 const handle=React.createRef<EditorHandle>();let view!:ReactTestRenderer,saved=0;
 try{await act(async()=>{view=create(<Editor formHandle={handle} fields={[{key:'name',label:'Nombre'},{key:'same',label:'Usar nombre',type:'checkbox'},{key:'representative',label:'Representante',valueFrom:values=>values.same==='true'?values.name:undefined},{key:'note',label:'Motivo'}]} defaults={{name:'Cliente',same:'false',representative:'Nombre independiente',note:''}} save={async()=>{saved++;}}/>);});
  await act(async()=>{await view.root.findByType('form').props.onSubmit(event());});assert.match(JSON.stringify(view.toJSON()),/Completá motivo/);
  await act(async()=>handle.current!.patchValues({name:'Cliente actualizado',same:'true'}));assert.equal(handle.current!.getValues().same,'true');assert.equal(handle.current!.getValues().representative,'Cliente actualizado');assert.match(JSON.stringify(view.toJSON()),/Completá motivo/);assert.equal(view.root.findAllByType('input').find(input=>input.props.type==='checkbox')!.props.checked,true);
  const copy=handle.current!.getValues();copy.name='Modificación externa';assert.equal(handle.current!.getValues().name,'Cliente actualizado','getValues gives a copy');assert.equal(saved,0);
 }finally{act(()=>view?.unmount());}
});
test('receipt selectors and a saved receipt preserve distinct client, receiver and custodian photos',async()=>{
 clearDataCache();const before=globalThis.fetch,writes:{path:string;body:any}[]=[];let saved=false;
 const photos={client:'https://photos.example.invalid/client.png',receiver:'https://photos.example.invalid/receiver.png',custodian:'https://photos.example.invalid/custodian.png'};
 const receiptAccount={...account,id:'101',currency:'PYG',name:'Cuenta con custodia',custodian_user_id:'1',custodian_name:'Custodia real',custodian_photo_url:photos.custodian};
 globalThis.fetch=async(input,init)=>{const path=String(input);if(init?.method==='POST'){writes.push({path,body:JSON.parse(String(init.body))});saved=true;return response({payment:{id:'301'}});}if(path.includes('/context'))return response({clients:saved?[]:[{id:'201',name:'Cliente con logo',logo_url:photos.client}],projects:[],plans:[],accounts:[receiptAccount],invoices:[],receivers:[{id:'1',full_name:'Custodia real',photo_url:photos.custodian},{id:'2',full_name:'Receptora real',photo_url:photos.receiver}]});if(path.includes('/receipts?'))return response({receipts:saved?[{id:'301',invoice_id:null,client_id:'201',client_name:'Cliente con logo',client_logo_url:photos.client,account_id:'101',account_name:receiptAccount.name,amount:'120',currency:'PYG',received_on:'2026-10-01',reference:'',received_by_name:'Receptora real',received_by_photo_url:photos.receiver,custodian_name:'Custodia real',custodian_photo_url:photos.custodian}]:[],hasMore:false});return response(routes(path));};let view!:ReactTestRenderer;
 const imageSources=()=>view.root.findAllByType('img').map(img=>img.props.src);
 try{view=await mount();await act(async()=>{const selects=view.root.findAllByType(SelectCustom);selects.find(select=>select.props.label.startsWith('Cliente'))!.props.onChange('201');selects.find(select=>select.props.label==='Cuenta de ingreso')!.props.onChange('101');selects.find(select=>select.props.label.startsWith('Quién recibió'))!.props.onChange('2');view.root.findByType(AmountInput).props.onChange('120');await tick();});
  for(const photo of Object.values(photos))assert(imageSources().includes(photo),`selected form identity ${photo} remains visible even with Add account allowed`);
  await act(async()=>{await receipt(view).findByType('form').props.onSubmit(event());await tick();});assert.equal(writes.length,1);assert.equal(writes[0].body.receivedByUserId,'2');assert.equal(writes[0].body.clientId,'201');assert.equal(writes[0].body.accountId,'101');
  for(const photo of Object.values(photos))assert(imageSources().includes(photo),`saved identity ${photo} is present after page reload without client context`);
  assert.match(JSON.stringify(view.toJSON()),/Receptora real/);assert.match(JSON.stringify(view.toJSON()),/Custodia real/);
 }finally{act(()=>view?.unmount());globalThis.fetch=before;clearDataCache();}
});
test('shared person capsules show supplied safe photos by default and honor explicit unverified identity',async()=>{
 const {PersonContainer}=require('../app/person-container') as typeof import('../app/person-container');let view!:ReactTestRenderer;
 try{await act(async()=>{view=create(<PersonContainer name="Persona con ficha" photoUrl="https://photos.example.invalid/person.png"/>);});assert.equal(view.root.findByType('img').props.src,'https://photos.example.invalid/person.png');await act(async()=>view.update(<PersonContainer name="Identidad no verificada" photoUrl="https://photos.example.invalid/person.png" verified={false}/>));assert.equal(view.root.findAllByType('img').length,0);await act(async()=>view.update(<PersonContainer name="URL insegura" photoUrl="javascript:alert(1)"/>));assert.equal(view.root.findAllByType('img').length,0);}finally{act(()=>view?.unmount());}
});
test('authoritative cleared receiver photo does not revive an older session image',async()=>{
 clearDataCache();const before=globalThis.fetch,oldPhoto='https://photos.example.invalid/old-session.png';let view!:ReactTestRenderer;
 globalThis.fetch=async input=>{const path=String(input);if(path.includes('/context'))return response({clients:[],projects:[],plans:[],accounts:[],invoices:[],receivers:[{id:'1',full_name:'Identidad actual',photo_url:null}]});return response(routes(path));};
 try{view=await mount({...user,full_name:'Nombre anterior',photo_url:oldPhoto});const receiver=view.root.findAllByType(SelectCustom).find(select=>select.props.label.startsWith('Quién recibió'))!;assert.equal(receiver.props.value,'');assert.equal(receiver.props.choices[0].label,'Identidad actual');assert.equal(receiver.props.choices[0].photoUrl,null);assert.equal(view.root.findAllByType('img').some(img=>img.props.src===oldPhoto),false,'the actual selected receiver uses initials after its authoritative photo was removed');assert.equal(view.root.findAllByType('form').length,1);}finally{act(()=>view?.unmount());globalThis.fetch=before;clearDataCache();}
});
