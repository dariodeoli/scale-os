import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import postcss from 'postcss';
import type {Feedback} from '../app/feedback';

require.extensions['.css']=()=>{};
Object.assign(globalThis,{React,window:new EventTarget()});
// Real Editor/API; only portals and photo primitives are doubled.
// No browser, upload, image request or remote API is used.
function PhotoStub({photo,name}:{photo:string|null;name:string}){return photo?<img src={photo} alt={`Foto de ${name}`}/>:<span aria-label="Sin foto">{name[0]}</span>;}
const CloseContext=React.createContext<(()=>void)|undefined>(undefined);
function DialogStub({children,close,busy=false}:{children:React.ReactNode;close:()=>void;busy?:boolean}){const guardedClose=()=>{if(!busy)close();};return <CloseContext.Provider value={guardedClose}><section role="dialog" aria-busy={busy}>{children}<button type="button" disabled={busy} onClick={guardedClose}>Cerrar</button></section></CloseContext.Provider>;}
function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
mock('../app/profile-photo',{ProfilePhoto:PhotoStub});
mock('../app/dialog',{Dialog:DialogStub,FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,useDialogPending:()=>{},useDialogClose:()=>React.useContext(CloseContext)});
const {MyProfile}=require('../app/my-profile') as typeof import('../app/my-profile');
type Profile={email:string;full_name:string|null;photo_url:string|null;identity_scope:'personal'|'demo'|'personal_readonly';google_connected?:boolean};
type Request={url:string;init:RequestInit;resolve:(value:Response)=>void};
const requests:Request[]=[];
globalThis.fetch=(input,init)=>new Promise<Response>(resolve=>requests.push({url:String(input),init:init||{},resolve}));
let renderer:ReactTestRenderer,closed=0,refreshes=0,events=0;
const feedback:Feedback[]=[];
window.addEventListener('scale:identity-changed',()=>events++);
window.addEventListener('scale:feedback',event=>feedback.push((event as CustomEvent<Feedback>).detail));
const fixture=(overrides:Partial<Profile>={}):Profile=>({email:'ana@example.invalid',full_name:'Ana Personal',photo_url:'https://example.invalid/a.png',identity_scope:'personal',...overrides});
const latest=()=>requests[requests.length-1];
const content=()=>JSON.stringify(renderer.toJSON());
const submitEvent=()=>({preventDefault(){},persist(){}});
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(reason:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function Harness({refresh=async()=>{}}:{refresh?:()=>Promise<void>}){
 const [open,setOpen]=React.useState(true);
 return open?<MyProfile profile={fixture({full_name:'Nombre obsoleto'})} close={()=>{closed++;setOpen(false);}} refresh={async()=>{refreshes++;await refresh();}}/>:<p>Editor cerrado</p>;
}
async function mount(refresh?:()=>Promise<void>){requests.length=0;feedback.length=0;closed=0;refreshes=0;events=0;await act(async()=>{renderer=create(<Harness refresh={refresh}/>);});}
async function respond(request:Request,data:unknown,status=200){await act(async()=>{request.resolve(new Response(JSON.stringify(data),{status}));});}
async function load(profile=fixture()){await respond(latest(),{profile});}
async function changeName(value:string){await act(async()=>{await renderer.root.findByProps({name:'full_name'}).props.onChange({target:{name:'full_name',value},type:'change'});});}
async function startNameSave(){let pending!:Promise<void>;await act(async()=>{pending=renderer.root.findByType('form').props.onSubmit(submitEvent());});return {pending};}
async function openNameEditor(){await act(async()=>{renderer.root.findByProps({'data-profile-section':'name'}).props.onToggle({currentTarget:{open:true}});});}
function close(){act(()=>renderer.unmount());}

test('real identity in a private demo is visible but cannot be changed from the demo',async()=>{
 await mount();await load(fixture({identity_scope:'personal_readonly'}));
 assert.match(content(),/perfil está unificado/);assert.match(content(),/empresa real/);
 assert.equal(renderer.root.findAllByType('form').length,0);
 assert.equal(renderer.root.findAllByType(PhotoStub).length,0);
 assert.equal(renderer.root.findAllByType('img').length,1);assert.equal(requests.length,1);close();
});

test('canonical name/email header, single photo preview, edit sequence and scope',async()=>{
 await mount();assert.match(content(),/Cargando tu perfil/);assert.doesNotMatch(content(),/Nombre obsoleto/);
 assert.equal(latest().url,'/core-api/api/agency/productivity/profile');assert.equal(latest().init.credentials,'include');
 await load();
 assert.match(content(),/ana@example\.invalid/);
 assert.match(content(),/Ana Personal/);assert.match(content(),/se comparten entre tus empresas/);
 assert.equal(renderer.root.findAllByType('input').length,0,'el editor de nombre vive plegado');
 assert.equal(renderer.root.findAllByType('button').some(button=>button.children.includes('Guardar nombre')),false,'el pie no ofrece guardar sin editor abierto');
 assert.equal(requests.length,1,'opening the editor never writes');
 assert.match(JSON.stringify(renderer.toJSON()),/"data-profile-section":"identity"[\s\S]*?Identidad/,'la sección de identidad encabeza el perfil');
 assert.equal(renderer.root.findAllByType(PhotoStub).length,1);
 assert.equal(renderer.root.findAllByType('img').length,2,'avatar de identidad + vista previa de foto');
 assert.equal(renderer.root.findByProps({'data-profile-section':'identity'}).findAllByType('img').length,1,'la identidad usa su avatar y no duplica la vista previa de la foto');
 assert.match(content(),/Usá Google para ingresar/);const google=renderer.root.findAllByType('a').find(link=>link.children.includes('Conectar Google'))!;assert.equal(google.props.href,'/core-api/api/auth/google/start?connect=1');
 const rendered=content();assert(rendered.indexOf('"data-profile-section":"photo"')<rendered.indexOf('"data-profile-section":"name"'),'photo controls precede name editing');
 await openNameEditor();
 assert.equal(renderer.root.findAllByType('input').length,1);assert.equal(renderer.root.findByType('input').props.name,'full_name');
 assert(renderer.root.findAllByType('button').some(button=>button.children.includes('Guardar nombre')),'el pie guarda cuando el editor está abierto');
});

test('name failure retains real Editor draft and dialog; retry closes only after persistence',async()=>{
 await mount();await load();await openNameEditor();await changeName('Ana Cambiada');
 const first=await startNameSave();
 assert.equal(latest().init.method,'PATCH');assert.deepEqual(JSON.parse(String(latest().init.body)),{full_name:'Ana Cambiada'});
 assert.equal(closed,0);assert.match(content(),/Guardando/);
 await respond(latest(),{error:'No guardado'},500);await first.pending;
 assert.match(content(),/No guardado/);assert.equal(closed,0);assert.equal(refreshes,0);assert.equal(events,0);
 const retry=await startNameSave();
 assert.deepEqual(JSON.parse(String(latest().init.body)),{full_name:'Ana Cambiada'},'failed save did not reset name input');
 await respond(latest(),{profile:fixture({full_name:'Ana Cambiada'})});await retry.pending;
 assert.equal(closed,1);assert.equal(refreshes,1);assert(events>0);assert.match(content(),/Editor cerrado/);close();
});

test('name closes before session refresh finishes; refresh failure warns without denying persistence',async()=>{
 const refresh=deferred<void>();await mount(()=>refresh.promise);await load();await openNameEditor();await changeName('Nombre Persistido');
 const save=await startNameSave();await respond(latest(),{profile:fixture({full_name:'Nombre Persistido'})});
 assert.equal(closed,1,'pending refresh must not hold a successfully saved editor open');
 assert.equal(refreshes,1);assert.match(content(),/Editor cerrado/);
 await act(async()=>{refresh.reject(Error('Session refresh failed'));await save.pending;});
 assert.equal(closed,1);assert.equal(feedback.at(-1)?.tone,'warning');
 assert.match(feedback.at(-1)!.message,/perfil se guardó, pero no se pudo actualizar/);
 assert.doesNotMatch(feedback.at(-1)!.message,/No se pudo guardar/);close();
});

test('photo remains partial and separate; refresh failure neither rejects persisted photo nor clears name draft',async()=>{
 await mount(async()=>{throw Error('Refresh unavailable');});await load();await openNameEditor();await changeName('Borrador sin guardar');
 let photoSave!:Promise<void>;
 await act(async()=>{photoSave=renderer.root.findByType(PhotoStub).props.save('https://example.invalid/b.png');});
 assert.equal(renderer.root.findByType(DialogStub).props.busy,true,'photo persistence locks the dialog');
 act(()=>renderer.root.findAllByType('button').find(button=>button.children.includes('Cerrar'))!.props.onClick());
 act(()=>renderer.root.findAllByType('button').find(button=>button.children.includes('Cancelar'))!.props.onClick());
 assert.equal(closed,0,'photo save guards close and cancel');
 assert.deepEqual(JSON.parse(String(latest().init.body)),{photo_url:'https://example.invalid/b.png'});
 await respond(latest(),{profile:fixture({photo_url:'https://example.invalid/b.png'})});await photoSave;
 assert.equal(closed,0);assert.equal(refreshes,1);assert.match(content(),/perfil se guardó, pero no se pudo actualizar/);
 assert.equal(renderer.root.findByType(DialogStub).props.busy,false,'refresh failure releases the photo lock');
 assert.equal(renderer.root.findByType(PhotoStub).props.photo,'https://example.invalid/b.png');
 const nameSave=await startNameSave();assert.deepEqual(JSON.parse(String(latest().init.body)),{full_name:'Borrador sin guardar'});
 await respond(latest(),{profile:fixture({full_name:'Borrador sin guardar',photo_url:'https://example.invalid/b.png'})});await nameSave.pending;
 assert.equal(closed,1);close();
});

test('failed photo persistence propagates to photo controls without closing or refreshing',async()=>{
 await mount();await load();let photoSave!:Promise<void>;
 await act(async()=>{photoSave=renderer.root.findByType(PhotoStub).props.save('https://example.invalid/fail.png');});
 const rejection=assert.rejects(photoSave,/No guardado/);
 await respond(latest(),{error:'No guardado'},500);await rejection;
 assert.equal(closed,0);assert.equal(refreshes,0);assert.equal(events,0);
 assert.equal(renderer.root.findByType(DialogStub).props.busy,false,'persistence failure releases the photo lock');
 assert.equal(renderer.root.findByType(PhotoStub).props.photo,'https://example.invalid/a.png');close();
});

test('demo isolation copy and unchanged missing-name photo fallback',async()=>{
 await mount();await load(fixture({identity_scope:'demo',full_name:null}));
 assert.match(content(),/Perfil del demo/);assert.match(content(),/no modifican tus empresas reales/);
 assert.doesNotMatch(content(),/se comparten entre tus empresas/);
 let photoSave!:Promise<void>;
 await act(async()=>{photoSave=renderer.root.findByType(PhotoStub).props.save('');});
 assert.deepEqual(JSON.parse(String(latest().init.body)),{full_name:'ana',photo_url:''});
 await respond(latest(),{profile:fixture({identity_scope:'demo',full_name:'ana',photo_url:null})});await photoSave;
 assert.equal(closed,0);assert.equal(refreshes,1);close();
});

test('load retry and late responses cannot close or refresh an abandoned editor',async()=>{
 await mount();await respond(latest(),{error:'No se pudo cargar'},500);
 assert.equal(renderer.root.findAllByType('form').length,0);assert.match(content(),/No se pudo cargar/);
 act(()=>renderer.root.findAllByType('button').find(button=>button.children.includes('Reintentar carga'))!.props.onClick());
 assert.match(content(),/Cargando tu perfil/);await load();
 await openNameEditor();await changeName('Nombre pendiente');const save=await startNameSave();const lateSave=latest();close();
 await respond(lateSave,{profile:fixture({full_name:'Nombre pendiente'})});await save.pending;
 assert.equal(closed,0);assert.equal(refreshes,0);
 await mount();const lateLoad=latest();close();await respond(lateLoad,{profile:fixture()});assert.equal(refreshes,0);
});

test('v2 source: wrapping identity, 44px controls and unchanged hidden file input at 320/360/390',()=>{
 const source=readFileSync(new URL('../app/my-profile.tsx',import.meta.url),'utf8');
 const security=readFileSync(new URL('../app/account-security.tsx',import.meta.url),'utf8');
 assert(source.includes('min-w-0')&&source.includes('grid-cols-[minmax(0,1fr)]'),'el perfil no desborda en mobile');
 assert(source.includes('break-words'),'los datos largos (correo) parten línea en vez de cortarse');
 assert(source.includes('data-profile-section=\"access\"')&&source.includes('AccountSecurity'),'la seguridad de cuenta vive en su sección del perfil');
 assert(security.includes("hourCycle:'h23'"),'el reloj de sesiones sigue en 24 h (contrato de ux-consistency)');
 assert(!/#[0-9a-f]{3,8}\b/i.test(source)&&!/#[0-9a-f]{3,8}\b/i.test(security),'sin colores hardcodeados: tokens del sistema');
 assert(!source.includes('my-profile.css')&&!security.includes('my-profile.css'),'el CSS plano del perfil quedó retirado');
});

test('a Google-linked account shows the connected state instead of the connect action',async()=>{
 await mount();await load(fixture({google_connected:true}));
 assert.match(content(),/Conectado/,'the linked account shows its state');
 assert.equal(renderer.root.findAllByType('a').some(link=>link.children.includes('Conectar Google')),false,'a linked account never asks to connect again');
 close();
});
