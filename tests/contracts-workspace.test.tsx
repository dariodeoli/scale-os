import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {create,act,type ReactTestRenderer} from 'react-test-renderer';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
const dialogId=require.resolve('../app/dialog');const realDialog=require('../app/dialog');
require.cache[dialogId]={id:dialogId,filename:dialogId,loaded:true,exports:{...realDialog,Dialog:({children,title}:{children:React.ReactNode;title:string})=><section aria-label={title}>{children}</section>}} as NodeModule;
const {ContractsWorkspace}=require('../app/contracts-workspace') as typeof import('../app/contracts-workspace');
const {contractRequest,ContractRequestError,renderContractText,contractMissing,manualContractSources}=require('../app/contracts-data') as typeof import('../app/contracts-data');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const config={capabilities:{view:true,create:true,edit:true,templates_manage:true,issue:true,bank_data_view:false,assist:false},clients:[],collaborators:[],bank_accounts:[]};
const template={id:'t1',name:'Servicios',agreement_type:'Servicios',body:'Hola {{company.legal_name}}',required_fields:['company.legal_name'],revision:1};
function respond(value:unknown,status=200){return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});}
test('plain text rendering never interprets HTML and preserves missing/unknown tokens',()=>{
 const result=renderContractText('<script>{{company.legal_name}}</script> {{secret}} {{client.name}}',{'company.legal_name':'<img onerror=evil>','secret':'PRIVATE'},['company.legal_name','client.name']);
 assert.equal(result,'<script><img onerror=evil></script> {{secret}} {{client.name}}');
 assert.deepEqual(contractMissing('{{company.legal_name}} {{client.name}} {{client.name}}',{'company.legal_name':'Empresa'},['agreement.date']),['agreement.date','client.name']);
 assert.deepEqual(manualContractSources({'company.legal_name':{source:'organization'},'client.name':{source:'client'}},{'company.legal_name':'Empresa','client.name':'Ana'},{'company.legal_name':'Empresa','client.name':'Ada'}),{'company.legal_name':{source:'organization'},'client.name':{source:'manual'}});
});
test('requests use authenticated no-store proxy and expose conflict status without losing caller draft',async()=>{
 const previous=globalThis.fetch;let options:RequestInit|undefined;let path='';globalThis.fetch=async(input,init)=>{path=String(input);options=init;return respond({error:'conflict'},409);};
 try{const draft={title:'Mi edición',expected_revision:2};await assert.rejects(()=>contractRequest('/api/agency/contracts/1',draft,'PATCH'),(error:unknown)=>error instanceof ContractRequestError&&error.status===409&&/edición se conserva/.test(error.message));assert.equal(path,'/core-api/api/agency/contracts/1');assert.equal(options?.credentials,'include');assert.equal(options?.cache,'no-store');assert.equal(options?.method,'PATCH');assert.equal(draft.title,'Mi edición');}finally{globalThis.fetch=previous;}
});
test('view denial never fetches contracts or renders creation actions',async()=>{
 const previous=globalThis.fetch;const calls:string[]=[];globalThis.fetch=async input=>{calls.push(String(input));return respond({...config,capabilities:{...config.capabilities,view:false}});};let renderer:ReactTestRenderer|undefined;
 try{await act(async()=>{renderer=create(<ContractsWorkspace organizationId="org-a" userId="u1"/>);await tick();});assert.match(JSON.stringify(renderer!.toJSON()),/Sin acceso a contratos/);assert.deepEqual(calls,['/core-api/api/agency/contracts/config']);assert.equal(renderer!.root.findAllByType('button').length,0);}finally{act(()=>renderer?.unmount());globalThis.fetch=previous;}
});
test('changing organization clears old data and ignores late responses from previous organization',async()=>{
 const previous=globalThis.fetch;let release:((response:Response)=>void)|undefined;let configCalls=0;globalThis.fetch=async input=>{const path=String(input);if(path.endsWith('/config')){configCalls++;return respond(config);}if(configCalls===1&&path.endsWith('/contracts'))return new Promise<Response>(resolve=>{release=resolve;});if(path.endsWith('/templates'))return respond({templates:[template],variables:['company.legal_name']});return respond({contracts:[{id:'b',title:'Contrato empresa B',revision:1,template_id:'t1'}]});};let renderer:ReactTestRenderer|undefined;
 try{await act(async()=>{renderer=create(<ContractsWorkspace organizationId="org-a" userId="u1"/>);await tick();});await act(async()=>{renderer!.update(<ContractsWorkspace organizationId="org-b" userId="u1"/>);await tick();});assert.match(JSON.stringify(renderer!.toJSON()),/Contrato empresa B/);await act(async()=>{release!(respond({contracts:[{id:'a',title:'CONFIDENCIAL empresa A',revision:1}]}));await tick();});assert.doesNotMatch(JSON.stringify(renderer!.toJSON()),/CONFIDENCIAL/);assert.match(JSON.stringify(renderer!.toJSON()),/Contrato empresa B/);}finally{act(()=>renderer?.unmount());globalThis.fetch=previous;}
});

test('refresh fills only empty fields, preserves manual commercial data and uses explicit replace',()=>{
 const {mergeContractAutofill,contractVariableLabel}=require('../app/contracts-data') as typeof import('../app/contracts-data');
 const draft={id:'c1',title:'Contrato',body:'Texto',template_id:'t1',revision:1,variables:{'agreement.amount':'4500','agreement.scope':'Alcance negociado','company.legal_name':''},sources:{'agreement.amount':{source:'manual'},'agreement.scope':{source:'manual'}}};
 const incoming={variables:{'agreement.amount':'9999','agreement.scope':'','company.legal_name':'Empresa'},sources:{'agreement.amount':{source:'plan',record_id:'p1'},'company.legal_name':{source:'company'}}};
 const next=mergeContractAutofill(draft,incoming);assert.equal(next.variables['agreement.amount'],'4500');assert.equal(next.sources['agreement.amount'].source,'manual');assert.equal(next.variables['agreement.scope'],'Alcance negociado');assert.equal(next.variables['company.legal_name'],'Empresa');
 const replaced=mergeContractAutofill(draft,incoming,true);assert.equal(replaced.variables['agreement.amount'],'9999');assert.equal(replaced.sources['agreement.amount'].source,'plan');assert.equal(replaced.variables['agreement.scope'],'Alcance negociado');assert.equal(draft.variables['agreement.amount'],'4500');
 assert.equal(contractVariableLabel('agreement.payment_terms'),'Condiciones de pago');assert.equal(contractVariableLabel('counterparty.signer_document'),'Documento del firmante del cliente / contraparte');
});
test('model selection previews before explicit import and preserves custom templates',async()=>{
 const previous=globalThis.fetch,calls:{path:string;body:unknown}[]=[];
 globalThis.fetch=async(input,init)=>{const path=String(input);calls.push({path,body:init?.body?JSON.parse(String(init.body)):null});if(path.endsWith('/config'))return respond(config);if(path.endsWith('/models'))return respond({models:[{key:'monthly',name:'Servicios mensuales',agreement_type:'Servicios',body:'Modelo contractual {{agreement.scope}}',required_fields:[]}]});if(path.endsWith('/from-model'))return respond({template:{...template,id:'imported',name:'Importado'}});if(path.endsWith('/templates'))return respond({templates:[template],variables:['company.legal_name','agreement.scope']});return respond({contracts:[]});};let renderer:ReactTestRenderer|undefined;
 try{await act(async()=>{renderer=create(<ContractsWorkspace organizationId="org-a" userId="u1"/>);await tick();});const button=(label:string)=>renderer!.root.findAllByType('button').find(node=>node.children.join('')===label)!;await act(async()=>{button('Elegir modelo').props.onClick();await tick();});assert.match(JSON.stringify(renderer!.toJSON()),/Modelo contractual/);assert.equal(calls.filter(call=>call.path.endsWith('/from-model')).length,0);await act(async()=>{button('Usar plantilla').props.onClick();await tick();});assert.deepEqual(calls.find(call=>call.path.endsWith('/from-model'))?.body,{model_key:'monthly'});const admin=renderer!.root.findAllByType('button').map(node=>node.children.join(''));assert.ok(admin.includes('Editar Servicios'));assert.ok(admin.includes('Editar Importado'));}finally{act(()=>renderer?.unmount());globalThis.fetch=previous;}
});
test('creation filters budget by client, auto-selects client, keeps plan and budget exclusive',async()=>{
 const {SelectCustom}=require('../app/profile-controls') as typeof import('../app/profile-controls');const {Editor}=require('../app/operations') as typeof import('../app/operations');
 const previous=globalThis.fetch;let submitted:Record<string,string>|undefined;
 globalThis.fetch=async(input,init)=>{const path=String(input);if(path.endsWith('/config'))return respond({...config,clients:[{id:'a',name:'Ana'},{id:'b',name:'Bea'}],budgets:[{id:'ba',name:'Presupuesto Ana',client_id:'a'},{id:'bb',name:'Presupuesto Bea',client_id:'b'}],plans:[{id:'p1',name:'Mensual'}]});if(path.endsWith('/templates'))return respond({templates:[template],variables:['company.legal_name']});if(init?.method==='POST'){submitted=JSON.parse(String(init.body));return respond({contract:{id:'c1',title:'Contrato',template_id:'t1',revision:1,body:'Texto',variables:{},sources:{}}});}if(path.endsWith('/versions'))return respond({versions:[]});return respond({contracts:[]});};let renderer:ReactTestRenderer|undefined;
 try{await act(async()=>{renderer=create(<ContractsWorkspace organizationId="org-a" userId="u1"/>);await tick();});await act(async()=>{renderer!.root.findAllByType('button').find(node=>node.children.join('')==='Nuevo contrato')!.props.onClick();});const select=(label:string)=>renderer!.root.findAllByType(SelectCustom).find(node=>node.props.label===label)!;
 act(()=>select('Cliente').props.onChange('a'));assert.deepEqual(select('Completar desde presupuesto').props.choices.map((choice:{value:string})=>choice.value),['','ba']);act(()=>select('Cliente').props.onChange(''));act(()=>select('Completar desde presupuesto').props.onChange('bb'));assert.equal(select('Cliente').props.value,'b');act(()=>select('Completar desde plan').props.onChange('p1'));assert.equal(select('Completar desde presupuesto').props.value,'');await act(async()=>{await renderer!.root.findByType(Editor).props.save({title:'Plan negociado',template_id:'t1',bank_account_id:''});await tick();});assert.equal(submitted?.client_id,'b');assert.equal(submitted?.plan_id,'p1');assert.equal(submitted?.budget_id,undefined);assert.equal(submitted?.collaborator_id,undefined);
 }finally{act(()=>renderer?.unmount());globalThis.fetch=previous;}
});
test('editor starts with used fields and unapplied edits block field expansion, autofill and issue',async()=>{
 const {Editor}=require('../app/operations') as typeof import('../app/operations');
 const previous=globalThis.fetch;const record={id:'c1',title:'Contrato guardado',template_id:'t1',revision:1,body:'{{agreement.amount}}',variables:{'agreement.amount':'4500'},sources:{'agreement.amount':{source:'manual'}}};
 globalThis.fetch=async input=>{const path=String(input);if(path.endsWith('/config'))return respond(config);if(path.endsWith('/templates'))return respond({templates:[template],variables:['agreement.amount','company.name','agreement.scope']});if(path.endsWith('/versions'))return respond({versions:[]});if(path.endsWith('/autofill'))return respond({variables:{'agreement.amount':'9999'},sources:{'agreement.amount':{source:'plan'}}});if(path.endsWith('/c1'))return respond({contract:record});return respond({contracts:[record]});};let renderer:ReactTestRenderer|undefined;
 try{await act(async()=>{renderer=create(<ContractsWorkspace organizationId="org-a" userId="u1"/>);await tick();});const button=(label:string)=>renderer!.root.findAllByType('button').find(node=>node.children.join('')===label)!;await act(async()=>{button('Abrir contrato').props.onClick();await tick();});const editor=()=>renderer!.root.findByType(Editor);assert.equal(editor().props.fields.length,3);const expand=()=>renderer!.root.findAllByType('input').find(node=>node.props.type==='checkbox'&&node.props.checked===false&&!node.props.disabled)!;act(()=>expand().props.onChange({target:{checked:true}}));assert.equal(editor().props.fields.length,5);const expanded=renderer!.root.findAllByType('input').find(node=>node.props.checked===true)!;act(()=>expanded.props.onChange({target:{checked:false}}));assert.equal(editor().props.fields.length,3);await act(async()=>{button('Consultar datos conocidos').props.onClick();await tick();});assert.equal(button('Completar solo campos vacíos').props.disabled,false);act(()=>renderer!.root.findAllByType('div').find(node=>node.props.onChangeCapture)!.props.onChangeCapture());assert.equal(button('Completar solo campos vacíos').props.disabled,true);assert.equal(button('Reemplazar datos completos con los encontrados').props.disabled,true);assert.equal(button('Emitir versión revisada').props.disabled,true);assert.ok(renderer!.root.findAllByType('input').filter(node=>node.props.type==='checkbox').every(node=>node.props.disabled));assert.match(JSON.stringify(renderer!.toJSON()),/4500/);assert.match(JSON.stringify(renderer!.toJSON()),/Aplicá primero la edición pendiente/);
 }finally{act(()=>renderer?.unmount());globalThis.fetch=previous;}
});

test('contract creation stays the sole header action for zero, one and several templates',async()=>{
 const {PageHeader}=require('../app/ui-v2') as typeof import('../app/ui-v2');
 const previous=globalThis.fetch;
 try{for(const count of [0,1,3]){
  const templates=Array.from({length:count},(_,index)=>({...template,id:`t${index}`,name:`Servicios ${index}`}));
  const calls:string[]=[];globalThis.fetch=async(input,init)=>{const path=String(input);calls.push(`${init?.method||'GET'} ${path}`);if(path.endsWith('/config'))return respond(config);if(path.endsWith('/templates'))return respond({templates,variables:[]});return respond({contracts:[]});};let renderer:ReactTestRenderer|undefined;
  try{await act(async()=>{renderer=create(<ContractsWorkspace organizationId={`org-${count}`} userId="u1"/>);await tick();});
   const header=renderer!.root.findByType(PageHeader);const primary=header.findAllByType('button');assert.deepEqual(primary.map(node=>node.children.join('')),['Nuevo contrato']);assert.equal(primary[0].props['data-ui-variant'],'primary');assert.equal(primary[0].props.disabled,count===0);
   const management=renderer!.root.findByType('details');assert.equal(management.findByType('summary').children.join(''),'Administrar plantillas');assert.equal(management.props.open,count===0);assert.deepEqual(management.findAllByType('button').slice(0,2).map(node=>node.children.join('')),['Elegir modelo','Nueva plantilla']);assert.ok(management.findAllByType('button').every(node=>node.props['data-ui-variant']==='secondary'));assert.equal(management.findAllByType('button').length,count+2);
   if(count===0){const dependency=renderer!.root.findAllByType('p').find(node=>node.props.id===primary[0].props['aria-describedby']);assert.ok(dependency);assert.match(dependency!.children.join(''),/necesitás una plantilla/);act(()=>primary[0].props.onClick());assert.equal(renderer!.root.findAllByProps({'aria-label':'Nuevo contrato'}).length,0);assert.ok(calls.every(call=>call.startsWith('GET ')));}
   else{act(()=>primary[0].props.onClick());assert.equal(renderer!.root.findAllByProps({'aria-label':'Nuevo contrato'}).length,1);}
  }finally{act(()=>renderer?.unmount());}
 }}finally{globalThis.fetch=previous;}
});

test('empty states respect separate creation and template permissions without promising emission',async()=>{
 const previous=globalThis.fetch;
 try{for(const [canCreate,canManage] of [[false,false],[true,false],[false,true]]){
  globalThis.fetch=async input=>{const path=String(input);if(path.endsWith('/config'))return respond({...config,capabilities:{...config.capabilities,create:canCreate,templates_manage:canManage,issue:false}});if(path.endsWith('/templates'))return respond({templates:[],variables:[]});return respond({contracts:[]});};let renderer:ReactTestRenderer|undefined;
  try{await act(async()=>{renderer=create(<ContractsWorkspace organizationId="org-a" userId="u1"/>);await tick();});const labels=renderer!.root.findAllByType('button').map(node=>node.children.join(''));assert.equal(labels.includes('Nuevo contrato'),canCreate);assert.equal(labels.includes('Elegir modelo'),canManage);assert.equal(labels.includes('Nueva plantilla'),canManage);const text=JSON.stringify(renderer!.toJSON());assert.match(text,/Todavía no hay contratos/);assert.doesNotMatch(text,/Emitir versión revisada/);if(!canCreate&&!canManage)assert.match(text,/cuando tu equipo cree un borrador/);if(canCreate&&!canManage)assert.match(text,/Alguien con permiso/);
  }finally{act(()=>renderer?.unmount());}
 }}finally{globalThis.fetch=previous;}
});

test('manual template creation remains reachable in the secondary administration group',async()=>{
 const {Editor}=require('../app/operations') as typeof import('../app/operations');const previous=globalThis.fetch;let submitted:unknown;
 globalThis.fetch=async(input,init)=>{const path=String(input);if(path.endsWith('/config'))return respond(config);if(init?.method==='POST'){submitted=JSON.parse(String(init.body));return respond({template});}if(path.endsWith('/templates'))return respond({templates:[],variables:['company.legal_name']});return respond({contracts:[]});};let renderer:ReactTestRenderer|undefined;
 try{await act(async()=>{renderer=create(<ContractsWorkspace organizationId="org-a" userId="u1"/>);await tick();});act(()=>renderer!.root.findByType('details').findAllByType('button').find(node=>node.children.join('')==='Nueva plantilla')!.props.onClick());assert.equal(renderer!.root.findAllByProps({'aria-label':'Nueva plantilla'}).length,1);await act(async()=>{await renderer!.root.findByType(Editor).props.save({name:'Servicios',agreement_type:'Servicios',body:'Hola {{company.legal_name}}',required_fields:'company.legal_name'});});assert.deepEqual(submitted,{name:'Servicios',agreement_type:'Servicios',body:'Hola {{company.legal_name}}',required_fields:['company.legal_name']});assert.equal(renderer!.root.findAllByType('button').find(node=>node.children.join('')==='Nuevo contrato')!.props.disabled,false);assert.equal(renderer!.root.findByType('details').props.open,true,'creating the first template keeps its trigger visible for dialog focus restoration');
 }finally{act(()=>renderer?.unmount());globalThis.fetch=previous;}
});

test('AI review failures and discarding a suggestion preserve the contract and local edits',async()=>{
 const {Editor}=require('../app/operations') as typeof import('../app/operations');
 const previous=globalThis.fetch,record={id:'c1',title:'Contrato guardado',template_id:'t1',revision:1,body:'{{company.legal_name}}',variables:{'company.legal_name':'Empresa privada'},sources:{}};
 const writes:string[]=[];let failReview=false;let renderer:ReactTestRenderer|undefined;
 globalThis.fetch=async(input,init)=>{const path=String(input);if(init?.method==='POST')writes.push(path);if(path.endsWith('/config'))return respond({...config,capabilities:{...config.capabilities,assist:true}});if(path.endsWith('/templates'))return respond({templates:[template],variables:['company.legal_name']});if(path.endsWith('/assist'))return failReview?respond({error:'El proveedor de IA no pudo completar la revisión.'},503):respond({suggestion:'Revisar campos',requires_review:true});if(path.endsWith('/versions'))return respond({versions:[]});if(path.endsWith('/c1'))return respond({contract:record});return respond({contracts:[record]});};
 try{
  await act(async()=>{renderer=create(<ContractsWorkspace organizationId="org-a" userId="u1"/>);await tick();});
  const button=(label:string)=>renderer!.root.findAllByType('button').find(node=>node.children.join('')===label)!;
  await act(async()=>{button('Abrir contrato').props.onClick();await tick();});
  const draft=()=>renderer!.root.findByType(Editor).props.defaults;
  const initial={...draft()};
  await act(async()=>{button('Revisar campos con IA').props.onClick();await tick();});
  assert.match(JSON.stringify(renderer!.toJSON()),/Revisar campos/);assert.deepEqual(draft(),initial);
  act(()=>button('Descartar sugerencia').props.onClick());assert.equal(button('Descartar sugerencia'),undefined);assert.deepEqual(draft(),initial);
  failReview=true;await act(async()=>{button('Revisar campos con IA').props.onClick();await tick();});
  assert.match(JSON.stringify(renderer!.toJSON()),/El proveedor de IA no pudo completar/);assert.deepEqual(draft(),initial);
  await act(async()=>{await renderer!.root.findByType(Editor).props.save({...initial,title:'Borrador local'});});
  assert.equal(draft().title,'Borrador local');assert.equal(button('Revisar campos con IA').props.disabled,true);
  assert.equal(button('Emitir versión revisada').props.disabled,true);
  assert.ok(writes.every(path=>path.endsWith('/assist')),'AI never saves or issues automatically');assert.equal(writes.length,2);
 }finally{act(()=>renderer?.unmount());globalThis.fetch=previous;}
});
