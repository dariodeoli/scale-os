import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {sections,sectionPath} from '../app/navigation';
import {visibleModule} from '../app/workspace-access';
import {founderPricingNote} from '../app/founder-pricing';
import {workspaceGuideScope,workspaceGuideStorageKey,type WorkspaceGuideIdentity} from '../app/workspace-guide-data';

Object.assign(globalThis,{React});
// Isolate the shared portal/editor and API; these tests never use a browser or network.
function DialogStub({title,children,close}:{title:string;children:React.ReactNode;close:()=>void}){return <section role="dialog" aria-label={title}>{children}<button onClick={close}>Cerrar</button></section>;}
type EditorProps={fields:{key:string;choices?:{value:string;label:string}[]}[];defaults:Record<string,string>;save:(values:Record<string,string>)=>Promise<void>};
function EditorStub(_props:EditorProps){return <div data-editor/>;}
const calls:{path:string;body:unknown}[]=[];
const operationsPath=require.resolve('../app/operations');
const originalOperations=require.cache[operationsPath];
const mockedOperations=new (require('node:module'))(operationsPath);
mockedOperations.exports={Dialog:DialogStub,Editor:EditorStub,api:async(path:string,body:unknown)=>{calls.push({path,body});return {organization:{id:'42'}};}};
require.cache[operationsPath]=mockedOperations;
const companySettingsPath=require.resolve('../app/company-settings');
require.cache[companySettingsPath]={id:companySettingsPath,filename:companySettingsPath,loaded:true,exports:{CompanySettings:()=>null}} as NodeModule;
const {WorkspaceGuide,NewCompany}=require('../app/workspace-guide') as typeof import('../app/workspace-guide');
if(originalOperations)require.cache[operationsPath]=originalOperations;else delete require.cache[operationsPath];
let renderer:ReactTestRenderer;
const label=(node:any)=>node.children.filter((child:unknown)=>typeof child==='string').join('');
const button=(name:string)=>renderer.root.findAllByType('button').find(node=>label(node)===name)!;
const names=()=>renderer.root.findByProps({className:'ops-job-list'}).findAllByType('button').map(node=>label(node));
const open=()=>act(()=>button('Guía del panel').props.onClick());
const close=()=>act(()=>renderer.unmount());

test('guide uses every canonical section except embedded Metrics and preserves all eight role filters',()=>{
 for(const role of ['owner','admin','management','finance','sales','production','editor','viewer']){
  act(()=>{renderer=create(<WorkspaceGuide role={role} navigate={()=>{throw Error('must not navigate on mount');}}/>);});
  assert.equal(renderer.root.findAllByProps({role:'dialog'}).length,0);
  open();
  const available=names();
  assert.deepEqual(available,sections.filter(([label])=>label!=='Métricas'&&visibleModule(label,role)).map(([label])=>label),role);
  assert.equal(available.length,new Set(available).size);
  assert(available.includes('Producción'));
  assert.equal(available.includes('Informes'),['owner','admin','finance','sales'].includes(role));
  assert.equal(available.includes('Historial de trabajo'),['owner','admin','finance'].includes(role));
  assert.equal(available.includes('Invitaciones'),['owner','admin'].includes(role));
  assert(!available.includes('Métricas'));
  close();
 }
 assert.equal(calls.length,0,'opening and reading the guide does not fetch or mutate data');
});

test('canonical list stays live when a section is added; no duplicated hard-coded inventory',()=>{
 const mutable=sections as unknown as [string,string][];
 mutable.push(['Sección de prueba','fixture-only']);
 try{
  act(()=>{renderer=create(<WorkspaceGuide role="owner" navigate={()=>{}}/>);});open();
  assert(names().includes('Sección de prueba'));
 }finally{close();mutable.pop();}
});

test('new destinations use their canonical names and close the guide after navigation',()=>{
 const navigated:string[]=[];
 act(()=>{renderer=create(<WorkspaceGuide role="owner" navigate={name=>navigated.push(name)}/>);});
 for(const [label,path] of [['Producción','/produccion'],['Informes','/informes'],['Invitaciones','/equipo/invitaciones'],['Historial de trabajo','/equipo/historial']]){
  open();act(()=>button(label).props.onClick());
  assert.equal(navigated[navigated.length-1],label);assert.equal(sectionPath(label),path);
  assert.equal(renderer.root.findAllByProps({role:'dialog'}).length,0);
 }
 open();act(()=>button('Cerrar').props.onClick());
 assert.equal(renderer.root.findAllByProps({role:'dialog'}).length,0);
 assert.equal(navigated.length,4,'dismissal does not navigate');close();
});

test('changing role while open immediately removes restricted destinations and onboarding still respects access',()=>{
 act(()=>{renderer=create(<WorkspaceGuide role="owner" navigate={()=>{}}/>);});open();
 assert(button('Abrir Configuración'));
 act(()=>renderer.update(<WorkspaceGuide role="viewer" navigate={()=>{}}/>));
 assert.equal(renderer.root.findAllByProps({role:'dialog'}).length,0,'role change closes the old guide before reopening');
 open();
 assert(!names().includes('Informes'));assert(!names().includes('Invitaciones'));assert(!button('Abrir Configuración'));
 assert(!button('Abrir Presupuestos'));
 assert(button('Abrir Producción'));assert(button('Abrir Clientes'));assert(button('Abrir Proyectos'));
 assert(!JSON.stringify(renderer.toJSON()).includes('Invitá'));
 close();assert.equal(calls.length,0);
});

test('all eight roles receive actions matching edit capabilities, not just module visibility',()=>{
 const expected:Record<string,string[]>={
  owner:['Configuración','Invitaciones','Clientes','Proyectos','Producción','Presupuestos'],
  admin:['Configuración','Invitaciones','Clientes','Proyectos','Producción','Presupuestos'],
  management:['Clientes','Proyectos','Producción','Presupuestos'],
  finance:['Presupuestos','Finanzas','Informes'],sales:['Clientes','Presupuestos','Pipeline'],
  production:['Proyectos','Producción'],editor:['Producción'],viewer:['Clientes','Proyectos','Producción'],
 };
 for(const [role,modules] of Object.entries(expected)){
  const navigated:string[]=[];
  act(()=>{renderer=create(<WorkspaceGuide role={role} navigate={module=>navigated.push(module)}/>);});open();
   const actions=renderer.root.findAllByType('button').map(node=>label(node)).filter(text=>text.startsWith('Abrir '));
  assert.deepEqual(actions,modules.map(module=>`Abrir ${module}`),role);
  const content=JSON.stringify(renderer.toJSON());
  if(!['owner','admin'].includes(role))assert(!content.includes('Invitá'),role);
  if(['finance','production','editor','viewer'].includes(role))assert(!content.includes('Agregá un cliente'),role);
  if(['finance','sales','editor','viewer'].includes(role))assert(!content.includes('agregá una orden'),role);
  act(()=>button(`Abrir ${modules[0]}`).props.onClick());
  assert.deepEqual(navigated,[modules[0]]);assert.equal(renderer.root.findAllByProps({role:'dialog'}).length,0);
  close();
 }
 assert.equal(calls.length,0);
});

test('card is opt-in, inline, locally discardable and the manual guide remains available',()=>{
 const originalStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const stored=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>stored.get(key)||null,setItem:(key:string,value:string)=>stored.set(key,value)}});
 const identity={role:'owner',userId:'1',organizationId:'10'};
 const navigated:string[]=[];
 const props={...identity,navigate:(module:string)=>navigated.push(module)};
 try{
  act(()=>{renderer=create(<WorkspaceGuide {...props} variant="card"/>);});
  assert(button('Ver primeros pasos'));assert(!button('Abrir Configuración'));
  assert.equal(renderer.root.findAllByProps({role:'dialog'}).length,0);assert.equal(stored.size,0);
  act(()=>button('Ver primeros pasos').props.onClick());assert(button('Abrir Configuración'));
  assert.equal(renderer.root.findAllByProps({role:'dialog'}).length,0);
  act(()=>button('Cerrar pasos').props.onClick());assert(!button('Abrir Configuración'));
  act(()=>button('Ocultar primeros pasos').props.onClick());assert.equal(renderer.toJSON(),null);
  assert.deepEqual(Array.from(stored),[[workspaceGuideStorageKey(workspaceGuideScope(identity)),'dismissed']]);
  close();act(()=>{renderer=create(<WorkspaceGuide {...props} variant="card"/>);});assert.equal(renderer.toJSON(),null);close();
  act(()=>{renderer=create(<WorkspaceGuide {...props}/>);});open();assert(button('Abrir Configuración'));close();
  assert.deepEqual(navigated,[]);assert.equal(calls.length,0);
 }finally{
  if(originalStorage)Object.defineProperty(globalThis,'localStorage',originalStorage);else Reflect.deleteProperty(globalThis,'localStorage');
 }
});

test('card dismissal and open state are isolated by user, organization, role and demo',()=>{
 const originalStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const stored=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>stored.get(key)||null,setItem:(key:string,value:string)=>stored.set(key,value)}});
 const identity={role:'owner',userId:'1',organizationId:'10',demo:false};
 const navigate=()=>{};
 try{
  act(()=>{renderer=create(<WorkspaceGuide {...identity} variant="card" navigate={navigate}/>);});
  act(()=>button('Ocultar primeros pasos').props.onClick());
  for(const change of [{userId:'2'},{organizationId:'20'},{role:'viewer'},{demo:true}]){
   act(()=>renderer.update(<WorkspaceGuide {...identity} {...change} variant="card" navigate={navigate}/>));
   assert(button('Ver primeros pasos'));assert(!button('Abrir Configuración'));
   act(()=>button('Ver primeros pasos').props.onClick());
   act(()=>renderer.update(<WorkspaceGuide {...identity} variant="card" navigate={navigate}/>));assert.equal(renderer.toJSON(),null);
  }
  close();assert.equal(stored.size,1,'mounting a new scope must not persist another scope’s dismissal');
 }finally{
  if(originalStorage)Object.defineProperty(globalThis,'localStorage',originalStorage);else Reflect.deleteProperty(globalThis,'localStorage');
 }
});

test('unavailable storage does not prevent opening, navigating or dismissing',()=>{
 const originalStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,get:()=>{throw Error('Storage denied');}});
 const navigated:string[]=[];
 try{
  act(()=>{renderer=create(<WorkspaceGuide role="viewer" userId="1" organizationId="10" variant="card" navigate={module=>navigated.push(module)}/>);});
  act(()=>button('Ver primeros pasos').props.onClick());act(()=>button('Abrir Clientes').props.onClick());
  assert.deepEqual(navigated,['Clientes']);assert(button('Ver primeros pasos'));
  act(()=>button('Ocultar primeros pasos').props.onClick());assert.equal(renderer.toJSON(),null);close();
  assert.equal(calls.length,0);
 }finally{
  if(originalStorage)Object.defineProperty(globalThis,'localStorage',originalStorage);else Reflect.deleteProperty(globalThis,'localStorage');
 }
});

test('guide replaces stale evidence with unknown/error and labels demo examples without completion',()=>{
 const identity:WorkspaceGuideIdentity={role:'owner',userId:'1',organizationId:'10'};
 const data={scope:workspaceGuideScope(identity),status:'ready' as const,counts:{clients:1,projects:1,orders:1}};
 const props={...identity,navigate:()=>{}};
 const content=()=>JSON.stringify(renderer.toJSON());
 act(()=>{renderer=create(<WorkspaceGuide {...props} data={data}/>);});open();
 assert(content().includes('Registros disponibles'));
 act(()=>renderer.update(<WorkspaceGuide {...props} data={{...data,status:'error'}}/>));
 assert(content().includes('No se pudieron actualizar'));assert(!content().includes('Registros disponibles'));assert(!content().includes('Sin registros todavía'));
 act(()=>renderer.update(<WorkspaceGuide {...props} organizationId="20" data={data}/>));open();
 assert(content().includes('Datos aún no disponibles'));assert(!content().includes('Registros disponibles'));
 act(()=>renderer.update(<WorkspaceGuide {...props} demo data={data}/>));open();
 assert(content().includes('Datos de ejemplo:'));assert(content().includes('Datos aún no disponibles'));
 act(()=>renderer.update(<WorkspaceGuide {...props} demo data={{...data,scope:workspaceGuideScope({...identity,demo:true})}}/>));
 assert(content().includes('Datos de ejemplo disponibles'));
 assert(!content().includes('Registros disponibles'));assert(!content().includes('✅'));assert(!content().includes('Completado'));
 assert(content().includes('La demo no crea invitaciones externas.'));
 close();assert.equal(calls.length,0);
});

test('NewCompany retains founder copy, fixed currencies and explicit create-then-switch behavior',async()=>{
 act(()=>{renderer=create(<NewCompany/>);});
 assert(JSON.stringify(renderer.toJSON()).includes(founderPricingNote));
 assert(JSON.stringify(renderer.toJSON()).includes('30 días gratis'));
 assert.equal(calls.length,0);
 act(()=>button('Crear otra empresa').props.onClick());
 const editor=renderer.root.findByType(EditorStub).props as EditorProps;
 assert.deepEqual(editor.fields.map(field=>field.key),['name','slug','billingCurrency']);
 assert.deepEqual(editor.fields[2].choices,[{value:'USD',label:'US$10 al mes'},{value:'PYG',label:'G. 50.000 al mes'}]);
 assert.deepEqual(editor.defaults,{name:'',slug:'',billingCurrency:'USD'});
 const originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),redirects:string[]=[];
 Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{assign:(path:string)=>redirects.push(path)}}});
 try{
  const values={name:'Empresa ficticia',slug:'fixture-only',billingCurrency:'PYG'};
  await act(async()=>{await editor.save(values);});
  assert.deepEqual(calls,[{path:'/api/auth/organizations',body:values},{path:'/api/auth/switch-organization',body:{organizationId:'42'}}]);
  assert.deepEqual(redirects,['/']);
 }finally{
  if(originalWindow)Object.defineProperty(globalThis,'window',originalWindow);else Reflect.deleteProperty(globalThis,'window');
  close();
 }
});
