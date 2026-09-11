import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {sections,sectionPath} from '../app/navigation';
import {visibleModule} from '../app/workspace-access';
import {founderPricingNote} from '../app/founder-pricing';

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
const {WorkspaceGuide,NewCompany}=require('../app/workspace-guide') as typeof import('../app/workspace-guide');
if(originalOperations)require.cache[operationsPath]=originalOperations;else delete require.cache[operationsPath];
let renderer:ReactTestRenderer;
const button=(name:string)=>renderer.root.findAllByType('button').find(node=>node.children.join('')===name)!;
const names=()=>renderer.root.findByProps({className:'ops-job-list'}).findAllByType('button').map(node=>node.children.join(''));
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
  assert.equal(available.includes('Informes'),['owner','admin','finance'].includes(role));
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
 assert(!names().includes('Informes'));assert(!names().includes('Invitaciones'));assert(!button('Abrir Configuración'));
 assert.equal(button('Anterior').props.disabled,true);
 for(let step=0;step<4;step++)act(()=>button('Siguiente').props.onClick());
 assert.equal(button('Siguiente').props.disabled,true);assert(!button('Abrir Presupuestos'));
 act(()=>button('Anterior').props.onClick());assert.equal(button('Siguiente').props.disabled,false);
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
