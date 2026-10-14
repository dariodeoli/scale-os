import React from 'react';
import assert from 'node:assert/strict';
import {afterEach,test} from 'node:test';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

// Regresión del smoke e2e local: el alta ya graba el consentimiento en el API
// (`registerTrial` → `grantConsent`), pero la pantalla además lo posteaba a
// /api/privacy/consents. En el alta por correo todavía no hay sesión (401) y en
// la de Google el endpoint es de gestión (400): la cuenta se creaba igual y la
// UI mostraba «No se pudo registrar el consentimiento.» (y Google no redirigía).
const footerId=require.resolve('../app/workspace-footer');
require.cache[footerId]={id:footerId,filename:footerId,loaded:true,exports:{WorkspaceFooter:()=>null}} as NodeModule;
// next/link usa `self`/requestIdleCallback del navegador: se reemplaza por un <a>.
const linkId=require.resolve('next/link');
require.cache[linkId]={id:linkId,filename:linkId,loaded:true,exports:{__esModule:true,default:({children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=><a {...props}>{children}</a>}} as NodeModule;
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const Registration=require('../app/registro/page').default;
const {EmailField}=require('../app/email-field');
const {TextField}=require('../app/text-field');
const {PasswordField}=require('../app/password-field');

const originalFetch=globalThis.fetch,originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
let renderer:ReactTestRenderer|undefined;
const text=()=>JSON.stringify(renderer!.toJSON());
const textOf=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(textOf).join('');
const buttonNamed=(label:string)=>{const found=renderer!.root.findAll(node=>node.type==='button'&&textOf(node).includes(label))[0];assert(found,`falta el botón «${label}»`);return found;};
const json=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
function stubWindow(search:string){
 const assigned:string[]=[];
 const storage=new Map<string,string>();
 Object.defineProperty(globalThis,'window',{configurable:true,value:{
  location:{search,href:`http://localhost/registro${search}`,assign:(url:string)=>assigned.push(url)},
  history:{replaceState(){}},
  localStorage:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)},
 }});
 return assigned;
}
async function fillAgency(){
 await act(async()=>renderer!.root.findByType(TextField).props.onChange('Agencia Local QA'));
 for(const box of renderer!.root.findAll(node=>node.type==='input'&&node.props.type==='checkbox'))await act(async()=>box.props.onChange({target:{checked:true}}));
}
afterEach(async()=>{
 if(renderer)await act(async()=>renderer!.unmount());
 renderer=undefined;globalThis.fetch=originalFetch;
 if(originalWindow)Object.defineProperty(globalThis,'window',originalWindow);else Reflect.deleteProperty(globalThis,'window');
});

test('alta por correo: un 401 del registro complementario no presenta como fallida una cuenta creada',async()=>{
 stubWindow('');
 const calls:string[]=[];
 globalThis.fetch=(async(url:string)=>{calls.push(String(url));
  if(String(url)==='/core-api/api/auth/password/register')return json(202,{message:'Revisá tu correo para verificar tu cuenta y activar la prueba de 30 días.'});
  if(String(url)==='/core-api/api/privacy/consents')return json(401,{error:'Sesión requerida'});
  throw Error(`fetch inesperado ${url}`);
 }) as typeof fetch;
 await act(async()=>{renderer=create(<Registration/>);});
 await act(async()=>renderer!.root.findByType(EmailField).props.onChange('duena@agencia.test'));
 await act(async()=>renderer!.root.findByType('form').props.onSubmit({preventDefault(){}}));
 await fillAgency();
 await act(async()=>buttonNamed('Continuar con correo').props.onClick());
 for(const field of renderer!.root.findAllByType(PasswordField))await act(async()=>field.props.onChange('ClaveLocal-2026!'));
 await act(async()=>renderer!.root.findByType('form').props.onSubmit({preventDefault(){}}));
 assert.deepEqual(calls.slice(0,1),['/core-api/api/auth/password/register'],'el alta viaja al API con el consentimiento en el cuerpo');
 assert(text().includes('Revisá tu correo'),'la pantalla confirma el alta');
 assert(!text().includes('No se pudo registrar el consentimiento'),'el registro complementario nunca tapa el alta exitosa');
});

test('alta con Google: un 400 del registro complementario no bloquea la redirección al espacio',async()=>{
 const assigned=stubWindow('?pendingRegistration=ticket-1');
 globalThis.fetch=(async(url:string)=>{
  if(String(url)==='/core-api/api/auth/google/registration/complete')return json(201,{ok:true,redirect:'/produccion'});
  if(String(url)==='/core-api/api/privacy/consents')return json(400,{error:'Tipo de titular inválido'});
  throw Error(`fetch inesperado ${url}`);
 }) as typeof fetch;
 await act(async()=>{renderer=create(<Registration/>);});
 await fillAgency();
 await act(async()=>buttonNamed('Crear mi agencia con Google').props.onClick());
 assert.deepEqual(assigned,['/produccion']);
 assert(!text().includes('No se pudo registrar el consentimiento'));
});
