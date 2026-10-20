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
 globalThis.fetch=async(input,init)=>{const path=String(input);calls.push({path,body:init?.body?JSON.parse(String(init.body)):null});if(path.endsWith('/config'))return respond(config);if(path.endsWith('/preview'))return respond({preview:{title:'Modelo contractual',html:'<!doctype html><html><body>Modelo contractual</body></html>',missing:[],simulated:true,draft:true}});if(path.endsWith('/models'))return respond({models:[{key:'monthly',name:'Servicios mensuales',agreement_type:'Servicios',body:'Modelo contractual {{agreement.scope}}',required_fields:[]}]});if(path.endsWith('/from-model'))return respond({template:{...template,id:'imported',name:'Importado'}});if(path.endsWith('/templates'))return respond({templates:[template],variables:['company.legal_name','agreement.scope']});return respond({contracts:[]});};let renderer:ReactTestRenderer|undefined;
 try{await act(async()=>{renderer=create(<ContractsWorkspace organizationId="org-a" userId="u1"/>);await tick();});const button=(label:string)=>renderer!.root.findAllByType('button').find(node=>node.children.join('')===label)!;await act(async()=>{button('Elegir modelo').props.onClick();await tick();});await act(async()=>{await new Promise(resolve=>setTimeout(resolve,160));});assert.match(JSON.stringify(renderer!.toJSON()),/Modelo contractual/);assert.equal(calls.filter(call=>call.path.endsWith('/from-model')).length,0);await act(async()=>{button('Usar plantilla').props.onClick();await tick();});assert.deepEqual(calls.find(call=>call.path.endsWith('/from-model'))?.body,{model_key:'monthly'});const admin=renderer!.root.findAllByType('button').map(node=>node.children.join(''));assert.ok(admin.includes('Editar Servicios'));assert.ok(admin.includes('Editar Importado'));}finally{act(()=>renderer?.unmount());globalThis.fetch=previous;}
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
   const header=renderer!.root.findByType(PageHeader);const primary=header.findAllByType('button');assert.deepEqual(primary.map(node=>node.children.join('')),['Nuevo contrato']);assert.equal(primary[0].props['data-ui-variant'],'primary');assert.equal(primary[0].props.disabled,false);
   const management=renderer!.root.findByType('details');assert.equal(management.findByType('summary').children.join(''),'Administrar plantillas');assert.equal(management.props.open,count===0);assert.deepEqual(management.findAllByType('button').slice(0,2).map(node=>node.children.join('')),['Elegir modelo','Nueva plantilla']);assert.ok(management.findAllByType('button').every(node=>node.props['data-ui-variant']==='secondary'));assert.equal(management.findAllByType('button').length,count+2);
   if(count===0){assert.match(JSON.stringify(renderer!.toJSON()),/modelos también están disponibles/);await act(async()=>{primary[0].props.onClick();await tick();});assert.equal(renderer!.root.findAllByProps({'aria-label':'Nuevo contrato'}).length,1);assert.ok(calls.every(call=>call.startsWith('GET ')));}
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
 globalThis.fetch=async(input,init)=>{const path=String(input);if(!['GET','HEAD'].includes((init?.method||'GET').toUpperCase()))writes.push(path);if(path.endsWith('/config'))return respond({...config,capabilities:{...config.capabilities,assist:true}});if(path.endsWith('/templates'))return respond({templates:[template],variables:['company.legal_name']});if(path.endsWith('/assist'))return failReview?respond({error:'El proveedor de IA no pudo completar la revisión.'},503):respond({suggestion:'Revisar campos',requires_review:true});if(path.endsWith('/versions'))return respond({versions:[]});if(path.endsWith('/c1'))return respond({contract:record});return respond({contracts:[record]});};
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

test('counterparty type preserves client and collaborator selections without submitting both; selectors carry canonical identity',async()=>{
 const {SelectCustom}=require('../app/profile-controls') as typeof import('../app/profile-controls');const {Editor}=require('../app/operations') as typeof import('../app/operations');
 const previous=globalThis.fetch;let submitted:Record<string,string>|undefined;let renderer:ReactTestRenderer|undefined;
 globalThis.fetch=async(input,init)=>{const path=String(input);if(path.endsWith('/config'))return respond({...config,clients:[{id:'12',name:'Cliente Demo',legal_name:'Empresa Demo SA',logo_url:'/logo-cliente'}],collaborators:[{id:'21',name:'Colaborador Demo',photo_url:'/foto-colaborador'}]});if(path.endsWith('/models'))return respond({models:[]});if(path.endsWith('/templates'))return respond({templates:[template],variables:[]});if(path.endsWith('/versions'))return respond({versions:[]});if(init?.method==='POST'){submitted=JSON.parse(String(init.body));return respond({contract:{id:'c1',title:'Acuerdo',body:'Texto',template_id:'t1',variables:{},sources:{},revision:1}});}return respond({contracts:[]});};
 try{await act(async()=>{renderer=create(<ContractsWorkspace organizationId="org1" userId="user1"/>);await tick();});act(()=>renderer!.root.findAllByType('button').find(n=>n.children.join('')==='Nuevo contrato')!.props.onClick());await act(async()=>{await tick();});const select=(label:string)=>renderer!.root.findAllByType(SelectCustom).find(n=>n.props.label===label)!;
  assert.equal(select('Cliente').props.variant,'entity');assert.equal(select('Cliente').props.choices[1].photoUrl,'/logo-cliente');assert.equal(select('Cliente').props.choices[1].secondary,'Empresa Demo SA');act(()=>select('Cliente').props.onChange('12'));
  const link=renderer!.root.findAllByType('a').find(n=>n.props.href==='/clientes?client=12');assert.ok(link,'missing legal data has one canonical client ficha link');
  act(()=>select('Tipo de contraparte').props.onChange('collaborator'));assert.equal(select('Colaborador').props.choices[1].photoUrl,'/foto-colaborador');act(()=>select('Colaborador').props.onChange('21'));
  act(()=>select('Tipo de contraparte').props.onChange('client'));assert.equal(select('Cliente').props.value,'12','switching does not discard client');
  act(()=>select('Tipo de contraparte').props.onChange('collaborator'));assert.equal(select('Colaborador').props.value,'21');await act(async()=>{await renderer!.root.findByType(Editor).props.save({title:'Acuerdo',template_id:'t1',bank_account_id:''});});
  assert.equal(submitted?.collaborator_id,'21');assert.equal(submitted?.client_id,undefined,'only the explicit active counterparty is sent');assert.equal(submitted?.budget_id,undefined);assert.equal(submitted?.plan_id,undefined);
 }finally{act(()=>renderer?.unmount());globalThis.fetch=previous;}
});

test('new contract offers all built-in models without pre-import and retries creation without duplicating template',async()=>{
 const {Editor}=require('../app/operations') as typeof import('../app/operations');const previous=globalThis.fetch;let renderer:ReactTestRenderer|undefined;let imports=0,creates=0;
 globalThis.fetch=async(input,init)=>{const path=String(input);if(path.endsWith('/config'))return respond(config);if(path.endsWith('/templates'))return respond({templates:[],variables:[]});if(path.endsWith('/models'))return respond({models:[{key:'one',name:'Mensual',body:'Modelo uno',required_fields:[]},{key:'two',name:'Proyecto',body:'Modelo dos',required_fields:[]}]});if(path.endsWith('/from-model')){imports++;assert.deepEqual(JSON.parse(String(init?.body)),{model_key:'two'});return respond({template:{...template,id:'imported-two'}});}if(path.endsWith('/versions'))return respond({versions:[]});if(init?.method==='POST'){creates++;assert.equal(JSON.parse(String(init.body)).template_id,'imported-two');if(creates===1)return respond({error:'Fallo de creación recuperable'},503);return respond({contract:{id:'c2',title:'Proyecto',body:'Modelo dos',template_id:'imported-two',variables:{},sources:{},revision:1}});}return respond({contracts:[]});};
 try{await act(async()=>{renderer=create(<ContractsWorkspace organizationId="org1" userId="user1"/>);await tick();});await act(async()=>{renderer!.root.findAllByType('button').find(n=>n.children.join('')==='Nuevo contrato')!.props.onClick();await tick();});
  const editor=()=>renderer!.root.findByType(Editor);assert.deepEqual(editor().props.fields.find((f:{key:string})=>f.key==='template_id').choices.map((c:{value:string})=>c.value),['model:one','model:two']);assert.equal(imports,0,'viewing models never imports a template');
  const values={title:'Proyecto',template_id:'model:two',bank_account_id:''};await act(async()=>{await assert.rejects(()=>editor().props.save(values),/Fallo de creación/);});assert.equal(imports,1);await act(async()=>{await editor().props.save(values);});assert.equal(imports,1,'retries reuse the imported snapshot');assert.equal(creates,2);
 }finally{act(()=>renderer?.unmount());globalThis.fetch=previous;}
});

test('print preview uses sandboxed server HTML and discards stale source responses',async()=>{
 const {ContractPrintPreview}=require('../app/contracts-preview') as typeof import('../app/contracts-preview');const previous=globalThis.fetch;let renderer:ReactTestRenderer|undefined;const pending:{request:Record<string,unknown>;resolve:(r:Response)=>void;signal?:AbortSignal|null}[]=[];
 globalThis.fetch=async(_input,init)=>new Promise<Response>(resolve=>pending.push({request:JSON.parse(String(init?.body)),resolve,signal:init?.signal}));
 try{await act(async()=>{renderer=create(<ContractPrintPreview request={{model_key:'one',sample:true}}/>);await new Promise(resolve=>setTimeout(resolve,160));});assert.deepEqual(pending[0].request,{model_key:'one',sample:true});await act(async()=>{renderer!.update(<ContractPrintPreview request={{template_id:'t1',client_id:'12',title:'Contrato actual'}}/>);await new Promise(resolve=>setTimeout(resolve,160));});assert.equal(pending[0].signal?.aborted,true);
  const preview=(name:string)=>respond({preview:{title:name,html:`<!doctype html><html><body>${name}</body></html>`,missing:['counterparty.address'],simulated:false,draft:true}});await act(async()=>{pending[1].resolve(preview('Actual'));await tick();});assert.equal(renderer!.root.findByType('iframe').props.sandbox,'');assert.match(renderer!.root.findByType('iframe').props.srcDoc,/Actual/);assert.match(JSON.stringify(renderer!.toJSON()),/Domicilio del cliente/);
  await act(async()=>{pending[0].resolve(preview('Viejo'));await tick();});assert.doesNotMatch(renderer!.root.findByType('iframe').props.srcDoc,/Viejo/);
 }finally{act(()=>renderer?.unmount());globalThis.fetch=previous;}
});

test('readonly printable preview sends only its saved document identity',async()=>{
 const previous=globalThis.fetch;let renderer:ReactTestRenderer|undefined;let previewRequest:unknown;const record={id:'c1',title:'Solo lectura',template_id:'t1',revision:3,body:'Original guardado',variables:{},sources:{}};
 globalThis.fetch=async(input,init)=>{const path=String(input);if(path.endsWith('/config'))return respond({...config,capabilities:{...config.capabilities,edit:false,create:false,templates_manage:false,issue:false}});if(path.endsWith('/templates'))return respond({templates:[template],variables:[]});if(path.endsWith('/versions'))return respond({versions:[]});if(path.endsWith('/preview')){previewRequest=JSON.parse(String(init?.body));return respond({preview:{title:record.title,html:'<!doctype html><p>Original guardado</p>',missing:[],simulated:false,draft:true}});}if(path.endsWith('/c1'))return respond({contract:record});return respond({contracts:[record]});};
 try{await act(async()=>{renderer=create(<ContractsWorkspace organizationId="org1" userId="user1"/>);await tick();});await act(async()=>{renderer!.root.findAllByType('button').find(n=>n.children.join('')==='Abrir contrato')!.props.onClick();await tick();});await act(async()=>{await new Promise(resolve=>setTimeout(resolve,160));});assert.deepEqual(previewRequest,{contract_id:'c1'});assert.match(renderer!.root.findByType('iframe').props.srcDoc,/Original guardado/);
 }finally{act(()=>renderer?.unmount());globalThis.fetch=previous;}
});

test('applying a local text edit previews that draft without saving or issuing it',async()=>{
 const {Editor}=require('../app/operations') as typeof import('../app/operations');const previous=globalThis.fetch;let renderer:ReactTestRenderer|undefined;const previews:Record<string,unknown>[]=[],writes:string[]=[];const record={id:'c1',title:'Guardado',template_id:'t1',revision:3,body:'Original guardado',variables:{},sources:{}};
 globalThis.fetch=async(input,init)=>{const path=String(input);if(path.endsWith('/config'))return respond(config);if(path.endsWith('/templates'))return respond({templates:[template],variables:[]});if(path.endsWith('/versions'))return respond({versions:[]});if(path.endsWith('/preview')){const draft=JSON.parse(String(init?.body));previews.push(draft);return respond({preview:{title:draft.title,html:`<!doctype html><p>${draft.body}</p>`,missing:[],simulated:false,draft:true}});}if(path.endsWith('/c1')){if(init?.method&&init.method!=='GET')writes.push(path);return respond({contract:record});}return respond({contracts:[record]});};
 try{await act(async()=>{renderer=create(<ContractsWorkspace organizationId="org1" userId="user1"/>);await tick();});await act(async()=>{renderer!.root.findAllByType('button').find(n=>n.children.join('')==='Abrir contrato')!.props.onClick();await tick();});await act(async()=>{await renderer!.root.findByType(Editor).props.save({...renderer!.root.findByType(Editor).props.defaults,title:'Nuevo local',body:'Texto local aplicado'});await tick();});await act(async()=>{await new Promise(resolve=>setTimeout(resolve,160));});assert.equal(previews.at(-1)?.body,'Texto local aplicado');assert.equal(previews.at(-1)?.title,'Nuevo local');assert.equal(previews.at(-1)?.expected_revision,3);assert.match(renderer!.root.findByType('iframe').props.srcDoc,/Texto local aplicado/);assert.deepEqual(writes,[]);assert.equal(renderer!.root.findAllByType('button').find(n=>n.children.join('')==='Emitir versión revisada')!.props.disabled,true);
 }finally{act(()=>renderer?.unmount());globalThis.fetch=previous;}
});
