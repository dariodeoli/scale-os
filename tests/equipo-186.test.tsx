import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {teamSource,teamWorkspaceSource,teamSheetSource} from './team-source';

require.extensions['.css']=()=>{};
Object.assign(globalThis,{React,window:new EventTarget()});
// #186: la ficha única de persona (Perfil · Acceso · Remuneración) y el listado
// de Equipo. Se usan el Editor/PersonSheet/ListGrid reales; solo se duplican el
// portal del diálogo y el campo de foto (sin canvas ni cropper).
const CloseContext=React.createContext<(()=>void)|undefined>(undefined);
function DialogStub({children,close}:{children:React.ReactNode;close:()=>void}){return <CloseContext.Provider value={close}><section role="dialog">{children}</section></CloseContext.Provider>;}
function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
mock('../app/person-photo',{PersonPhotoField:()=><span data-photo-field="true"/>});
mock('../app/dialog',{Dialog:DialogStub,ConfirmDialog:()=>null,FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,useDialogPending:()=>{},useDialogClose:()=>React.useContext(CloseContext)});
const {TeamPersonSheet}=require('../app/team-person-sheet') as typeof import('../app/team-person-sheet');
const {PeopleWorkspace}=require('../app/team-workspace') as typeof import('../app/team-workspace');

const AMOUNT='4500000';
const person={id:'7',full_name:'Ana Pérez',email:'ana@example.invalid',photo_url:null,job_title:'Diseñadora',compensation_type:'fixed',compensation_amount:AMOUNT,currency:'PYG',invoices_company:true,started_on:'2026-01-05',ended_on:null,payment_day:5,active:true,notes:null,user_id:'u1',access_email:'ana@example.invalid'};
const member={id:'u1',email:'ana@example.invalid',role:'sales',active:true,removed_at:null,full_name:'Ana Pérez',photo_url:null};
const textOf=(node:any):string=>typeof node==='string'?node:node?.children?.map(textOf).join('')||'';
const content=(renderer:ReactTestRenderer)=>JSON.stringify(renderer.toJSON());
const tab=(renderer:ReactTestRenderer,label:string)=>renderer.root.findAllByType('button').find(button=>textOf(button)===label);
const hasButton=(renderer:ReactTestRenderer,label:string)=>Boolean(renderer.root.findAllByType('button').find(button=>textOf(button).includes(label)));
async function sheet(role:string,capabilities?:Record<string,boolean>){
  let renderer!:ReactTestRenderer;
  await act(async()=>{renderer=create(<TeamPersonSheet role={role} capabilities={capabilities} currentEmail="yo@example.invalid" person={person} member={member} ambiguous={false} seedEmail="" tab="perfil" defaultCurrency="PYG" load={async()=>{}} onCreated={()=>{}} close={()=>{}}/>);});
  return renderer;
}
async function open(renderer:ReactTestRenderer,label:string){await act(async()=>{tab(renderer,label)!.props.onClick();});}

test('sin salary.view la pestaña Remuneración no existe ni se monta: ningún campo ni monto llega al DOM',async()=>{
  const renderer=await sheet('management');
  assert(tab(renderer,'Perfil')&&tab(renderer,'Acceso'),'gerencia ve Perfil y Acceso');
  assert.equal(Boolean(tab(renderer,'Remuneración')),false,'gerencia no tiene la pestaña Remuneración');
  await open(renderer,'Acceso');
  const html=content(renderer);
  for(const forbidden of ['Remuneración','Importe acordado','Día de pago','Emite factura','Guardar remuneración',AMOUNT,'Fijo mensual'])assert.equal(html.includes(forbidden),false,`gerencia no debe ver «${forbidden}»`);
  act(()=>renderer.unmount());
});

test('con salary.view la ficha monta Remuneración con su propio guardado; el perfil no mezcla datos salariales',async()=>{
  const renderer=await sheet('owner');
  assert(tab(renderer,'Remuneración'),'el dueño ve la pestaña Remuneración');
  assert(hasButton(renderer,'Guardar perfil'),'el perfil se guarda por separado');
  assert.equal(content(renderer).includes('Importe acordado'),false,'la pestaña no visitada no se monta');
  await open(renderer,'Remuneración');
  assert(hasButton(renderer,'Guardar remuneración')&&content(renderer).includes('Importe acordado'));
  await open(renderer,'Acceso');
  assert(hasButton(renderer,'Guardar acceso'),'el acceso tiene su propio «Guardar acceso» (sin guardado a medias)');
  act(()=>renderer.unmount());
});

test('finanzas ve la remuneración pero no administra accesos; la ficha de los demás roles solo tiene Perfil',async()=>{
  const finance=await sheet('finance');
  assert(tab(finance,'Remuneración'),'finanzas ve remuneraciones');
  assert.equal(Boolean(tab(finance,'Acceso')),false,'finanzas no administra accesos');
  act(()=>finance.unmount());
  const viewer=await sheet('viewer');
  assert.equal(Boolean(tab(viewer,'Remuneración')||tab(viewer,'Acceso')),false);
  assert.equal(content(viewer).includes(AMOUNT),false);
  act(()=>viewer.unmount());
});

async function workspace(role:string,collaborators:unknown[]){
  const original=globalThis.fetch;
  globalThis.fetch=(async()=>new Response(JSON.stringify({collaborators,members:[member],archivedProfiles:[]}),{status:200})) as typeof fetch;
  let renderer!:ReactTestRenderer;
  await act(async()=>{renderer=create(<PeopleWorkspace role={role} currentEmail="yo@example.invalid"/>);});
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});
  globalThis.fetch=original;
  return renderer;
}

test('el listado de Equipo no dibuja datos salariales para gerencia y nunca el monto individual',async()=>{
  // La API sirve estos campos en null a los roles sin salary.view.
  const masked={...person,compensation_amount:null,payment_day:null,invoices_company:null};
  const management=await workspace('management',[masked]);
  const html=content(management);
  assert(html.includes('Ana Pérez')&&html.includes('Persona')&&html.includes('Acceso'),'gerencia ve el equipo y los accesos');
  for(const forbidden of ['Sin salario definido','Fijo mensual',AMOUNT,'Remuneración'])assert.equal(html.includes(forbidden),false,`gerencia no debe ver «${forbidden}»`);
  act(()=>management.unmount());
  const owner=await workspace('owner',[person]);
  assert(content(owner).includes('Fijo mensual'),'quien ve salarios ve la modalidad');
  assert.equal(content(owner).includes(AMOUNT),false,'ni siquiera el dueño ve el monto individual en la lista');
  act(()=>owner.unmount());
});

test('los avisos de Equipo salen por notify() y no por <p role="status"> (E4)',()=>{
  const source=teamSource();
  assert.doesNotMatch(source.split('export function ProjectComments')[0].split('export function OperationsWorkspace')[1]||'',/<p role="status">/);
  assert.doesNotMatch(teamWorkspaceSource(),/setNotice|<p role="status">\{notice\}/);
  assert.doesNotMatch(teamSheetSource(),/setNotice|<p role="status">\{notice\}/);
  assert.match(teamSheetSource(),/notify\(extra\)/,'los avisos de acceso del perfil viajan por notify');
  assert.match(teamSheetSource(),/notify\(\{tone:'warning',message:'El proveedor no pudo enviar el correo\.'\}\)/);
});


test('salary.view efectivo false oculta remuneración incluso para finance y no pide historial',async()=>{
 const original=globalThis.fetch,calls:string[]=[];
 globalThis.fetch=(async(input:RequestInfo|URL)=>{calls.push(String(input));throw Error('unexpected salary query');}) as typeof fetch;
 try{
  const renderer=await sheet('finance',{'salary.view':false});
  assert.equal(Boolean(tab(renderer,'Remuneración')),false);
  for(const forbidden of ['Remuneración','Importe acordado','Sin salario definido','Guardar remuneración',AMOUNT])assert.equal(content(renderer).includes(forbidden),false,forbidden);
  assert.deepEqual(calls,[],'denied tab does not mount salary effects or any private query');
  act(()=>renderer.unmount());
 }finally{globalThis.fetch=original;}
});

test('override efectivo true habilita salario fuera del rol por defecto y owner ignora false',async()=>{
 for(const [role,capabilities]of [['viewer',{'salary.view':true}],['owner',{'salary.view':false,'members.manage':false}]] as const){
  const renderer=await sheet(role,capabilities);
  assert(tab(renderer,'Remuneración'),role+' keeps effective salary permission');
  await open(renderer,'Remuneración');assert(content(renderer).includes('Importe acordado'));
  if(role==='owner')assert(tab(renderer,'Acceso'),'owner cannot lose access management by an override');
  act(()=>renderer.unmount());
 }
});

test('OperationsWorkspace usa overrides para entrar a Equipo, sin salario ficticio al revocarlo',async()=>{
 const {OperationsWorkspace}=require('../app/operations') as typeof import('../app/operations');
 const {canOpenPeopleWorkspace}=require('../app/capabilities') as typeof import('../app/capabilities');
 assert.equal(canOpenPeopleWorkspace('finance',{'salary.view':false}),false);
 assert.equal(canOpenPeopleWorkspace('viewer',{'salary.view':true}),true);
 assert.equal(canOpenPeopleWorkspace('viewer',{'members.manage':true}),true);
 assert.equal(canOpenPeopleWorkspace('owner',{'salary.view':false,'members.manage':false}),true);
 const original=globalThis.fetch,calls:string[]=[];
 globalThis.fetch=(async(input:RequestInfo|URL)=>{calls.push(String(input));return new Response(JSON.stringify({collaborators:[{...person,compensation_amount:null}],members:[member],directory:[{id:'7',full_name:person.full_name,photo_url:null,role:'finance'}]}),{status:200});}) as typeof fetch;
 try{
  let renderer!:ReactTestRenderer;
  await act(async()=>{renderer=create(<OperationsWorkspace role="finance" capabilities={{'salary.view':false}} currentUserId="me"/>);});
  assert.equal(renderer.root.findAllByType(PeopleWorkspace).length,0,'restricted role uses the directory, not the salary workspace');
  assert(!content(renderer).includes('Sin salario definido')&&!content(renderer).includes('Remuneración')&&!content(renderer).includes(AMOUNT));
  assert(calls.every(path=>path.endsWith('/api/agency/team')),'no history or salary endpoint');
  act(()=>renderer.unmount());
  await act(async()=>{renderer=create(<OperationsWorkspace role="viewer" capabilities={{'salary.view':true}}/>);});
  assert.equal(renderer.root.findAllByType(PeopleWorkspace).length,1,'effective true reaches PeopleWorkspace');
  assert.equal(renderer.root.findByType(PeopleWorkspace).props.capabilities['salary.view'],true,'override propagates across the wrapper');
  act(()=>renderer.unmount());
 }finally{globalThis.fetch=original;}
});

test('revocar salario elimina una pestaña ya visitada y conserva el borrador de perfil',async()=>{
 const original=globalThis.fetch,writes:Record<string,unknown>[]=[];
 globalThis.fetch=(async(_input:RequestInfo|URL,init?:RequestInit)=>{writes.push(JSON.parse(String(init?.body)));return new Response(JSON.stringify({collaborator:person}),{status:200});}) as typeof fetch;
 try{
  const renderer=await sheet('finance',{'salary.view':true,'members.manage':true});
  const name=renderer.root.findAllByType('input').find(input=>input.props.name==='full_name')!;
  await act(async()=>{name.props.onChange({target:{name:'full_name',value:'Borrador conservado'},type:'change'});});
  await open(renderer,'Remuneración');assert(content(renderer).includes('Importe acordado'));
  await act(async()=>{renderer.update(<TeamPersonSheet role="finance" capabilities={{'salary.view':false,'members.manage':true}} currentEmail="yo@example.invalid" person={person} member={member} ambiguous={false} seedEmail="" tab="perfil" defaultCurrency="PYG" load={async()=>{}} onCreated={()=>{}} close={()=>{}}/>);});
  assert.equal(Boolean(tab(renderer,'Remuneración')),false);assert.equal(content(renderer).includes('Importe acordado'),false);
  const profileForm=renderer.root.findAllByType('form').find(form=>form.findAll(node=>node.type==='input'&&node.props.name==='full_name').length)!;
  await act(async()=>{await profileForm.props.onSubmit({preventDefault(){}});});
  assert.equal(writes.length,1);assert.equal(writes[0].full_name,'Borrador conservado');assert(!Object.hasOwn(writes[0],'compensation_amount'),'profile save never restores salary fields');
  act(()=>renderer.unmount());
 }finally{globalThis.fetch=original;}
});
