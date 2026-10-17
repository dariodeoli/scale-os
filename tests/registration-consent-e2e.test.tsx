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
// El control de tema pertenece al marco; estos casos verifican el alta sin DOM.
const themeId=require.resolve('../app/theme-toggle');
require.cache[themeId]={id:themeId,filename:themeId,loaded:true,exports:{ThemeToggle:()=>null}} as NodeModule;
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
 const calls:string[]=[],bodies:Record<string,any>[]=[];
 globalThis.fetch=(async(url:string,init?:RequestInit)=>{calls.push(String(url));if(init?.body)bodies.push(JSON.parse(String(init.body)));
  if(['/core-api/api/auth/me','/core-api/api/invitations/status'].includes(String(url)))return json(401,{error:'No autenticado'});
  if(String(url)==='/core-api/api/auth/password/register'&&JSON.parse(String(init?.body)).intent==='resolve')return json(200,{requiresAgency:true});
  if(String(url)==='/core-api/api/auth/password/register')return json(202,{message:'Revisá tu correo para verificar tu cuenta y activar la prueba de 30 días.'});
  if(String(url)==='/core-api/api/privacy/consents')return json(401,{error:'Sesión requerida'});
  throw Error(`fetch inesperado ${url}`);
 }) as typeof fetch;
 await act(async()=>{renderer=create(<Registration/>);});
 await act(async()=>renderer!.root.findByType(EmailField).props.onChange('duena@agencia.test'));
 await act(async()=>renderer!.root.findByType(PasswordField).props.onChange('ClaveLocal-2026!'));
 await act(async()=>renderer!.root.findByType('form').props.onSubmit({preventDefault(){}}));
 for(const field of renderer!.root.findAllByType(PasswordField))await act(async()=>field.props.onChange('ClaveLocal-2026!'));
 await act(async()=>renderer!.root.findByType('form').props.onSubmit({preventDefault(){}}));
 await fillAgency();
 await act(async()=>buttonNamed('Crear mi agencia').props.onClick());
 assert.deepEqual(calls.slice(0,4),['/core-api/api/auth/me','/core-api/api/invitations/status','/core-api/api/auth/password/register','/core-api/api/auth/password/register'],'resuelve identidad antes del alta');
 assert.equal(bodies.shift()!.intent,'resolve');
 assert.equal(bodies[0].consent,true,'la aceptación de las condiciones viaja en el alta');
 assert.equal(bodies[0].privacy.aceptado,true,'la aceptación de datos viaja en el alta');
 assert.equal(bodies[0].privacy.finalidad,'cuenta-y-prestacion');
 assert.equal(bodies[0].privacy.version,require('../app/privacy-notice').PRIVACY_NOTICE.version);
 assert(text().includes('Revisá tu correo'),'la pantalla confirma el alta');
 assert(!text().includes('No se pudo registrar el consentimiento'),'el registro complementario nunca tapa el alta exitosa');
});

test('alta con Google: un 400 del registro complementario no bloquea la redirección al espacio',async()=>{
 const assigned=stubWindow('?pendingRegistration=ticket-1');
 globalThis.fetch=(async(url:string)=>{
  if(['/core-api/api/auth/me','/core-api/api/invitations/status'].includes(String(url)))return json(401,{error:'No autenticado'});
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

async function mountAnonymous(handler:(url:string,init?:RequestInit)=>Promise<Response>){
 globalThis.fetch=(async(url:string,init?:RequestInit)=>['/core-api/api/auth/me','/core-api/api/invitations/status'].includes(String(url))?json(401,{error:'No autenticado'}):handler(String(url),init)) as typeof fetch;
 await act(async()=>{renderer=create(<Registration/>);});
}
async function resolveIdentity(password='ClaveLocal-2026!'){
 await act(async()=>renderer!.root.findByType(EmailField).props.onChange('persona@agencia.test'));
 await act(async()=>renderer!.root.findByType(PasswordField).props.onChange(password));
 await act(async()=>renderer!.root.findByType('form').props.onSubmit({preventDefault(){}}));
}

test('sesión existente entra al shell normal sin formulario ni alta',async()=>{
 const assigned=stubWindow('?pendingRegistration=ticket-obsoleto');const calls:string[]=[];
 globalThis.fetch=(async(url:string)=>{calls.push(String(url));return json(200,{user:{id:1,organization_id:9}});}) as typeof fetch;
 await act(async()=>{renderer=create(<Registration/>);});
 assert.deepEqual(assigned,['/']);assert.deepEqual(calls,['/core-api/api/auth/me']);
 assert.equal(renderer!.root.findAllByType(EmailField).length,0);
 assert(!text().includes('Configurá tu agencia.'));
});

test('identidad existente autentica contraseña histórica antes de solicitar agencia',async()=>{
 const assigned=stubWindow('');const bodies:Record<string,unknown>[]=[];
 await mountAnonymous(async(_url,init)=>{bodies.push(JSON.parse(String(init?.body)));return json(200,{existing:true,redirect:'/?chooseCompany=1'});});
 await resolveIdentity('old');
 assert.deepEqual(assigned,['/?chooseCompany=1']);assert.equal(bodies.length,1);
 assert.equal(bodies[0].intent,'resolve');assert.equal(bodies[0].company,undefined);assert.equal(bodies[0].privacy,undefined);
 assert(!text().includes('Configurá tu agencia.'));
});

test('contraseña incorrecta mantiene identidad y permite reintentar sin ficha',async()=>{
 const assigned=stubWindow('');let attempts=0;
 await mountAnonymous(async()=>++attempts===1?json(401,{error:'Credenciales inválidas'}):json(200,{existing:true,redirect:'/'}));
 await resolveIdentity();assert(text().includes('Credenciales inválidas'));assert(!text().includes('Nombre de tu agencia'));
 assert.equal(buttonNamed('Continuar con correo').props.disabled,false);
 await act(async()=>renderer!.root.findByType('form').props.onSubmit({preventDefault(){}}));
 assert.deepEqual(assigned,['/']);assert.equal(attempts,2);
});

test('fallo de sesión bloquea alta hasta un reintento válido',async()=>{
 stubWindow('');let attempts=0;
 globalThis.fetch=(async()=>++attempts===1?json(503,{error:'Temporal'}):json(401,{error:'No autenticado'})) as typeof fetch;
 await act(async()=>{renderer=create(<Registration/>);});
 assert.equal(renderer!.root.findAllByType(EmailField).length,0);
 await act(async()=>buttonNamed('Reintentar').props.onClick());
 assert.equal(renderer!.root.findAllByType(EmailField).length,1);
});

test('un doble envío de identidad no duplica solicitudes',async()=>{
 stubWindow('');let attempts=0,finish:(response:Response)=>void=()=>{};
 await mountAnonymous(async()=>{attempts++;return new Promise<Response>(resolve=>{finish=resolve;});});
 await act(async()=>renderer!.root.findByType(EmailField).props.onChange('persona@agencia.test'));
 await act(async()=>renderer!.root.findByType(PasswordField).props.onChange('ClaveLocal-2026!'));
 const submit=renderer!.root.findByType('form').props.onSubmit;
 await act(async()=>{void submit({preventDefault(){}});void submit({preventDefault(){}});});
 assert.equal(attempts,1);assert(buttonNamed('Comprobando acceso').props.disabled);
 await act(async()=>{finish(json(200,{requiresAgency:true}));});
 assert(text().includes('Protegé tu acceso.'));assert(!text().includes('Nombre de tu agencia'));
});

test('nuevo acceso exige confirmar contraseña antes de agencia y consentimiento',async()=>{
 stubWindow('');await mountAnonymous(async()=>json(200,{requiresAgency:true}));await resolveIdentity();
 assert(text().includes('Protegé tu acceso.'));
 await act(async()=>renderer!.root.findByType('form').props.onSubmit({preventDefault(){}}));
 assert(text().includes('Las contraseñas no coinciden.'));assert(!text().includes('Nombre de tu agencia'));
 for(const field of renderer!.root.findAllByType(PasswordField))await act(async()=>field.props.onChange('ClaveLocal-2026!'));
 await act(async()=>renderer!.root.findByType('form').props.onSubmit({preventDefault(){}}));
 const checkboxes=renderer!.root.findAll(node=>node.type==='input'&&node.props.type==='checkbox');
 assert.equal(checkboxes.length,2);assert(checkboxes.every(node=>node.props.checked===false));
 await act(async()=>buttonNamed('Crear mi agencia').props.onClick());assert(text().includes('Indicá el nombre'));
});

test('destinos del API sólo permiten shell, selector y accesos conocidos',()=>{
 const {registrationAuthDestination:target}=require('../app/registration-access');
 for(const value of['/','/produccion','/?chooseCompany=1','/acceso-pendiente'])assert.equal(target(value),value);
 for(const value of['https://example.test','//example.test','/\\example.test','javascript:alert(1)','/?chooseCompany=1&next=https://example.test',null])assert.equal(target(value),'/');
});

test('sesión demo permite crear cuenta real y no activa el atajo de sesión',async()=>{
 const assigned=stubWindow('');
 globalThis.fetch=(async()=>json(200,{user:{id:1,demo_owner_user_id:1}})) as typeof fetch;
 await act(async()=>{renderer=create(<Registration/>);});
 assert.deepEqual(assigned,[]);assert.equal(renderer!.root.findAllByType(EmailField).length,1);
 const {isRealRegistrationSession:real}=require('../app/registration-access');
 for(const demo of[{demo_owner_user_id:1},{demo_source_id:1},{is_demo_guest:true},{is_demo_template:true},{organization_slug:'scale-demo-controles-20260908'}])assert.equal(real({id:1,...demo}),false);
});

test('sesión de invitación pendiente vuelve a su estado sin pedir agencia',async()=>{
 const assigned=stubWindow('');
 globalThis.fetch=(async(url:string)=>String(url).endsWith('/auth/me')?json(401,{}):json(200,{status:'pending'})) as typeof fetch;
 await act(async()=>{renderer=create(<Registration/>);});
 assert.deepEqual(assigned,['/acceso-pendiente']);assert.equal(renderer!.root.findAllByType(EmailField).length,0);
});

test('carrera en alta final de identidad existente vuelve al login sin consentimiento adicional',async()=>{
 const assigned=stubWindow('');const paths:string[]=[];
 await mountAnonymous(async(url,init)=>{paths.push(url);const body=JSON.parse(String(init?.body));return json(200,body.intent==='resolve'?{requiresAgency:true}:{existing:true,redirect:'/'});});
 await resolveIdentity();
 for(const field of renderer!.root.findAllByType(PasswordField))await act(async()=>field.props.onChange('ClaveLocal-2026!'));
 await act(async()=>renderer!.root.findByType('form').props.onSubmit({preventDefault(){}}));
 await fillAgency();await act(async()=>buttonNamed('Crear mi agencia').props.onClick());
 assert.deepEqual(assigned,['/']);assert(paths.every(path=>path==='/core-api/api/auth/password/register'));
 assert(!text().includes('Revisá tu correo'));
});

test('ticket de Google vencido conserva datos y permite reintentar sin crear otro flujo',async()=>{
 const assigned=stubWindow('?pendingRegistration=ticket-vencido');let attempts=0;
 await mountAnonymous(async url=>url.endsWith('/google/registration/complete')?++attempts===1?json(410,{error:'Ticket vencido'}):json(200,{existing:true,redirect:'/'}):json(400,{}));
 await fillAgency();await act(async()=>buttonNamed('Crear mi agencia con Google').props.onClick());
 assert(text().includes('Ticket vencido'));assert.equal(buttonNamed('Crear mi agencia con Google').props.disabled,false);
 assert.equal(renderer!.root.findByType(TextField).props.value,'Agencia Local QA');
 await act(async()=>buttonNamed('Crear mi agencia con Google').props.onClick());assert.deepEqual(assigned,['/']);
});
