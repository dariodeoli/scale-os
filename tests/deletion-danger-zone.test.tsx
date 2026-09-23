import React from 'react';
import assert from 'node:assert/strict';
import {afterEach,test} from 'node:test';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';
import {workspaceSource} from './workspace-source';

require.extensions['.css']=()=>{};
const {DeletionDangerZone,DELETION_PREVIEW_STORAGE_KEY}=require('../app/deletion-danger-zone') as typeof import('../app/deletion-danger-zone');

type PendingRequest={url:string;init:RequestInit;resolve:(response:Response)=>void};
type PendingTimer={id:number;callback:()=>void;active:boolean;kind:'timeout'|'interval'};
class MemoryStorage implements Storage{
 private values=new Map<string,string>();
 get length(){return this.values.size;}
 clear(){this.values.clear();}
 getItem(key:string){return this.values.get(key)??null;}
 key(index:number){return Array.from(this.values.keys())[index]??null;}
 removeItem(key:string){this.values.delete(key);}
 setItem(key:string,value:string){this.values.set(key,String(value));}
}
const requests:PendingRequest[]=[];
const storage=new MemoryStorage();
let assigned='',replaced='',focused:string[]=[];
let timers:PendingTimer[]=[],timerSequence=0;
const browser=new EventTarget() as Window&typeof globalThis;
Object.assign(browser,{
 location:{href:'https://app.example/configuracion',search:'',assign:(value:string)=>{assigned=value;}},
 history:{state:null,replaceState:(_state:unknown,_title:string,value:string)=>{replaced=value;}},
 sessionStorage:storage,
 requestAnimationFrame:(callback:FrameRequestCallback)=>{callback(0);return 1;},
 setTimeout:(callback:()=>void)=>{const timer={id:++timerSequence,callback,active:true,kind:'timeout' as const};timers.push(timer);return timer.id;},
 clearTimeout:(id:number)=>{const timer=timers.find(item=>item.id===id);if(timer)timer.active=false;},
 setInterval:(callback:()=>void)=>{const timer={id:++timerSequence,callback,active:true,kind:'interval' as const};timers.push(timer);return timer.id;},
 clearInterval:(id:number)=>{const timer=timers.find(item=>item.id===id);if(timer)timer.active=false;},
});
Object.assign(globalThis,{React,window:browser,sessionStorage:storage,requestAnimationFrame:browser.requestAnimationFrame});
globalThis.fetch=(input,init)=>new Promise<Response>(resolve=>requests.push({url:String(input),init:init||{},resolve}));

const future='2099-09-14T12:00:00.000Z';
const accountPreview=(overrides:Partial<import('../app/deletion-danger-zone').AccountDeletionPreview>={})=>({
 id:'account-preview',action:'account.delete' as const,organizationId:null,confirmation:'Eliminar',expiresAt:future,
 memberships:[{organizationId:'7',name:'Scale Lab',role:'owner',activeMemberCount:3,activeOwnerCount:2,consequence:'membership_deactivation'}],
 blockers:[],account:{willBeAnonymized:true,sessionsWillBeRevoked:true,tenantDataWillBeRetained:true},executable:true,...overrides,
});
const organizationPreview=(overrides:Partial<import('../app/deletion-danger-zone').OrganizationDeletionPreview>={})=>({
 id:'organization-preview',action:'organization.delete' as const,organizationId:'7',confirmation:'Eliminar',expiresAt:future,
 organization:{id:'7',name:'Scale Lab',activeMemberCount:3},
 consequences:{organizationWillBeSoftDeleted:true,allMemberAccessWillBeDeactivated:true,organizationSessionsWillBeRevoked:true,tenantDataWillBeRetained:true},executable:true,...overrides,
});
const proof=(action:'account.delete'|'organization.delete',method:'password'|'google'|'email'='password',expiresAt=future)=>({proof:`proof-${action}`,method,action,organizationId:action==='account.delete'?null:'7',expiresAt});

let renderer:ReactTestRenderer|null=null,accountDeleted=0,organizationDeleted=0,demoExited=0;
const textOf=(value:unknown):string=>typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.map(textOf).join(' '):React.isValidElement<{children?:React.ReactNode}>(value)?textOf(value.props.children):value&&typeof value==='object'&&'children' in value?textOf((value as ReactTestInstance).children):'';
const treeText=()=>textOf(renderer!.root).replace(/\s+/g,' ').trim();
const buttons=()=>renderer!.root.findAllByType('button');
const button=(label:string)=>buttons().find(item=>textOf(item.children).includes(label));
const form=(className:string)=>renderer!.root.findByProps({className});
const input=(type?:string)=>renderer!.root.findAllByType('input').find(item=>type?item.props.type===type:item.props.type!=='password')!;
const emailCodeInput=()=>renderer!.root.findAllByType('input').find(item=>item.props.autoComplete==='one-time-code')!;
const submitEvent=()=>({preventDefault(){}});
const createNodeMock=(element:React.ReactElement<{autoComplete?:string;className?:string}>)=>({focus(){focused.push(element.props.autoComplete==='current-password'?'password':element.props.className?.includes('deletion-google')?'google':element.props.autoComplete==='off'?'confirmation':'other');}});
async function mount({demo=false}:{demo?:boolean}={}){
 requests.length=0;storage.clear();assigned='';replaced='';focused=[];timers=[];timerSequence=0;accountDeleted=0;organizationDeleted=0;demoExited=0;
 Object.assign(browser.location,{href:'https://app.example/configuracion',search:''});
 await act(async()=>{renderer=create(<DeletionDangerZone organizationId="7" organizationName="Scale Lab" demo={demo} onDemoExit={()=>{demoExited++;}} onAccountDeleted={()=>{accountDeleted++;}} onOrganizationDeleted={()=>{organizationDeleted++;}}/>,{createNodeMock});});
}
async function respond(request:PendingRequest,data:unknown,status=200){await act(async()=>request.resolve(new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}})));}
async function previewAccount(value=accountPreview()){button('Revisar eliminación de mi cuenta')!.props.onClick();await respond(requests.at(-1)!,{preview:value});}
async function previewOrganization(value=organizationPreview()){button('Revisar eliminación de Scale Lab')!.props.onClick();await respond(requests.at(-1)!,{preview:value});}
async function passwordAuth(action:'account.delete'|'organization.delete',result=proof(action)){
 const passwordInput=input('password');act(()=>passwordInput.props.onChange({target:{value:'secreto'}}));
 form('deletion-auth-form').props.onSubmit(submitEvent());
 const request=requests.at(-1)!;assert.equal(request.url,'/core-api/api/auth/account/recent-auth/password');
 assert.equal(request.init.credentials,'include');assert.deepEqual(JSON.parse(String(request.init.body)),{previewId:action==='account.delete'?'account-preview':'organization-preview',password:'secreto'});
 await respond(request,result);
}
async function finishCountdown(){
 for(let second=10;second>0;second--){const timer=timers.find(item=>item.active&&item.kind==='interval');assert(timer,'recent auth starts a security countdown');await act(async()=>timer.callback());}
}
async function staleAccount(){
 await mount();await previewAccount();await passwordAuth('account.delete');
 await finishCountdown();const confirmation=input();act(()=>confirmation.props.onChange({target:{value:'Eliminar'}}));
 form('deletion-confirm-form').props.onSubmit(submitEvent());await respond(requests.at(-1)!,{code:'DELETION_PREVIEW_STALE',error:'La empresa o sus miembros cambiaron.'},409);
}

afterEach(()=>{renderer?.unmount();renderer=null;});

test('Settings owns permanent deletion and the legacy recoverable closure action is neutralized',()=>{
 const workspace=workspaceSource();
 const security=readFileSync(new URL('../app/account-security.tsx',import.meta.url),'utf8');
 assert.match(workspace,/active==='Configuración'[\s\S]*?<DeletionDangerZone/);
 assert.match(workspace,/onAccountDeleted=\{deletionSignedOut\} onOrganizationDeleted=\{deletionSignedOut\}/);
 assert.doesNotMatch(workspace,/deletedOrganizationId|function organizationDeleted/);
 assert.doesNotMatch(security,/\/api\/auth\/account\/closure|requestClosure|CERRAR MI CUENTA/);
 assert.match(security,/Zona de peligro/);
});

test('account preview renders every server membership, consequence and blocker without enabling re-auth',async()=>{
 await mount();
 await previewAccount(accountPreview({
  memberships:[
   {organizationId:'7',name:'Scale Lab',role:'owner',activeMemberCount:3,activeOwnerCount:1,consequence:'membership_deactivation'},
   {organizationId:'8',name:'Solo Studio',role:'admin',activeMemberCount:1,activeOwnerCount:0,consequence:'organization_soft_delete'},
  ],
  blockers:[{code:'LAST_ACTIVE_OWNER',organizationId:'7',organizationName:'Scale Lab',message:'Transferí la propiedad de “Scale Lab” antes de eliminar tu cuenta.'}],executable:false,
 }));
 const content=treeText();
 assert.match(content,/Tu identidad personal será anonimizada/);assert.match(content,/Todas tus sesiones serán cerradas/);assert.match(content,/Los datos de las empresas se conservarán/);
 assert.match(content,/Scale Lab/);assert.match(content,/3 miembros activos/);assert.match(content,/1 dueños activos/);assert.match(content,/Tu acceso se desactivará/);
 assert.match(content,/Solo Studio/);assert.match(content,/La empresa se desactivará porque sos su único miembro activo/);assert.match(content,/Transferí la propiedad/);
 assert.equal(renderer!.root.findAllByProps({className:'deletion-auth-form'}).length,0);assert.equal(button('Eliminar mi cuenta'),undefined);
});

test('demo simulation replaces deletion controls and delegates exit to the landing/logout flow',async()=>{
 await mount({demo:true});
 assert.match(treeText(),/Simulación Demo/);assert.match(treeText(),/El Demo no elimina cuentas ni empresas/);
 assert.equal(button('Revisar eliminación de mi cuenta'),undefined);assert.equal(button('Revisar eliminación de Scale Lab'),undefined);
 act(()=>button('Salir y reiniciar simulación')!.props.onClick());
 assert.equal(demoExited,1);assert.equal(requests.length,0,'The demo exit control delegates cleanup to its workspace owner.');
 const workspace=workspaceSource();
 assert.match(workspace,/async function exitDemoSimulation\(\)[\s\S]*?request\("\/api\/auth\/logout", \{ method: "POST" \}\)[\s\S]*?window\.location\.assign\('\/'\)/);
 assert.match(workspace,/const demo = !!user\?\.demo_owner_user_id \|\| user\?\.organization_slug === 'scale-demo-controles-20260908';/);
 assert.match(workspace,/<DeletionDangerZone[\s\S]*?demo=\{demo\}[\s\S]*?onDemoExit=\{exitDemoSimulation\}/);
});

test('company preview uses server counts/consequences and exact confirmation after password re-auth',async()=>{
 await mount();await previewOrganization();
 const content=treeText();assert.match(content,/3 miembros activos según la vista previa del servidor/);assert.match(content,/Se desactivará el acceso de todos sus miembros/);assert.match(content,/Se cerrarán las sesiones vinculadas/);assert.match(content,/Los datos de la empresa se conservarán/);
 assert.equal(input().props.disabled,true,'confirmation stays disabled before re-auth');
 await passwordAuth('organization.delete');
 const confirmation=input();act(()=>confirmation.props.onChange({target:{value:'eliminar'}}));assert.equal(button('Eliminar esta empresa')!.props.disabled,true);
 act(()=>confirmation.props.onChange({target:{value:'Eliminar'}}));assert.equal(button('Eliminar esta empresa')!.props.disabled,true,'the exact text remains blocked during the security countdown');
 assert.match(treeText(),/esperá 10 s para eliminar/);await finishCountdown();assert.equal(button('Eliminar esta empresa')!.props.disabled,false);
 form('deletion-confirm-form').props.onSubmit(submitEvent());const request=requests.at(-1)!;
 assert.equal(request.url,'/core-api/api/auth/organizations/7/deletion');assert.deepEqual(JSON.parse(String(request.init.body)),{previewId:'organization-preview',recentAuthProof:'proof-organization.delete',confirmation:'Eliminar'});
 await respond(request,{ok:true,deleted:true});assert.equal(organizationDeleted,1);assert.equal(accountDeleted,0);
});

test('typed Google-start failure stays in the SPA and uses stale-preview recovery',async()=>{
 await mount();await previewAccount();
 const passwordInput=input('password');act(()=>passwordInput.props.onChange({target:{value:'not-stored'}}));form('deletion-auth-form').props.onSubmit(submitEvent());
 await respond(requests.at(-1)!,{code:'PASSWORD_REAUTH_UNAVAILABLE',error:'Esta cuenta debe confirmar su identidad con Google.'},409);
 assert.match(treeText(),/Google sin contraseña/);assert.match(treeText(),/Confirmá tu identidad con Google/);assert.equal(renderer!.root.findAllByProps({role:'timer'}).length,0,'the countdown starts only after a valid recent-auth proof');act(()=>button('Confirmar con Google')!.props.onClick());
 const request=requests.at(-1)!;assert.equal(request.url,'/core-api/api/auth/account/recent-auth/google/start?previewId=account-preview');assert.equal(request.init.credentials,'include');assert.equal(request.init.redirect,'manual');
 await respond(request,{code:'DELETION_PREVIEW_STALE',error:'La vista previa cambió.'},409);
 assert.equal(assigned,'');assert.equal(storage.getItem(DELETION_PREVIEW_STORAGE_KEY),null);assert.match(treeText(),/vista previa venció o cambió/);assert(button('Actualizar vista previa'));
});

test('successful Google-start preflight stores only the preview and then triggers navigation',async()=>{
 await mount();await previewAccount();
 const passwordInput=input('password');act(()=>passwordInput.props.onChange({target:{value:'not-stored'}}));form('deletion-auth-form').props.onSubmit(submitEvent());
 await respond(requests.at(-1)!,{code:'PASSWORD_REAUTH_UNAVAILABLE',error:'Esta cuenta debe confirmar su identidad con Google.'},409);
 act(()=>button('Confirmar con Google')!.props.onClick());const request=requests.at(-1)!;
 assert.equal(assigned,'','navigation waits for the manual redirect preflight');await respond(request,{},302);
 assert.equal(assigned,'/core-api/api/auth/account/recent-auth/google/start?previewId=account-preview');
 const stored=storage.getItem(DELETION_PREVIEW_STORAGE_KEY)!;assert.match(stored,/account-preview/);assert.doesNotMatch(stored,/not-stored|proof/);
});

test('Google ticket completion consumes URL/storage and resumes only its matching preview',async()=>{
 requests.length=0;storage.clear();assigned='';replaced='';accountDeleted=0;organizationDeleted=0;
 storage.setItem(DELETION_PREVIEW_STORAGE_KEY,JSON.stringify({preview:organizationPreview()}));
 Object.assign(browser.location,{href:'https://app.example/configuracion?recentAuthTicket=ticket-1',search:'?recentAuthTicket=ticket-1'});
 await act(async()=>{renderer=create(<DeletionDangerZone organizationId="7" organizationName="Scale Lab" onAccountDeleted={()=>{accountDeleted++;}} onOrganizationDeleted={()=>{organizationDeleted++;}}/>,{createNodeMock});});
 assert.equal(replaced,'/configuracion');assert.equal(storage.getItem(DELETION_PREVIEW_STORAGE_KEY),null);
 assert.equal(requests[0].url,'/core-api/api/auth/account/recent-auth/google/complete');assert.deepEqual(JSON.parse(String(requests[0].init.body)),{ticket:'ticket-1'});
 await respond(requests[0],proof('organization.delete','google'));
 assert.match(treeText(),/Identidad confirmada con Google/);assert.match(treeText(),/Eliminar/);assert.equal(input().props.disabled,false);
});

test('stale refresh clears the old preview and credentials while the new preview is pending',async()=>{
 await staleAccount();assert.match(treeText(),/vista previa venció o cambió/);assert(button('Actualizar vista previa'));
 act(()=>button('Actualizar vista previa')!.props.onClick());assert.equal(requests.at(-1)!.url,'/core-api/api/auth/account/deletion/preview');
 assert.equal(renderer!.root.findAllByProps({className:'deletion-auth-form'}).length,0);assert.equal(renderer!.root.findAllByProps({className:'deletion-confirm-form'}).length,0);
 assert.equal(button('Preparando vista previa')!.props.disabled,true);
 await respond(requests.at(-1)!,{preview:accountPreview({id:'fresh-account-preview'})});
 assert.equal(renderer!.root.findAllByProps({className:'deletion-auth-form'}).length,1);assert.equal(input().props.disabled,true,'a refreshed preview never inherits the old proof');
});

test('failed stale refresh keeps every re-auth and execution control non-actionable',async()=>{
 await staleAccount();act(()=>button('Actualizar vista previa')!.props.onClick());const request=requests.at(-1)!;
 await respond(request,{error:'No se pudo actualizar la vista previa.'},500);
 assert.match(treeText(),/No se pudo actualizar la vista previa/);assert.equal(renderer!.root.findAllByProps({className:'deletion-auth-form'}).length,0);assert.equal(renderer!.root.findAllByProps({className:'deletion-confirm-form'}).length,0);
 assert.equal(button('Revisar eliminación de mi cuenta')!.props.disabled,false);
});

test('expired password proof disables confirmation and returns focus to password re-auth',async()=>{
 await mount();await previewAccount();await passwordAuth('account.delete',proof('account.delete','password',new Date(Date.now()+1000).toISOString()));
 assert.equal(input().props.disabled,false);focused=[];
 const timer=timers.find(item=>item.active&&item.kind==='timeout')!;assert(timer,'proof expiry schedules a timer');act(()=>timer.callback());
 assert.equal(input().props.disabled,true);assert.equal(renderer!.root.findAllByProps({role:'timer'}).length,0,'proof expiry clears the countdown');assert.equal(focused.at(-1),'password');assert.match(treeText(),/confirmación de identidad venció/);
});

test('account deletion posts the bound proof and invokes signed-out callback once',async()=>{
 await mount();await previewAccount();await passwordAuth('account.delete');
 const confirmation=input();act(()=>confirmation.props.onChange({target:{value:'Eliminar'}}));await finishCountdown();form('deletion-confirm-form').props.onSubmit(submitEvent());
 const request=requests.at(-1)!;assert.equal(request.url,'/core-api/api/auth/account/deletion');assert.deepEqual(JSON.parse(String(request.init.body)),{previewId:'account-preview',recentAuthProof:'proof-account.delete',confirmation:'Eliminar'});
 await respond(request,{ok:true,deleted:true});assert.equal(accountDeleted,1);assert.equal(organizationDeleted,0);
});

test('email re-auth requests and verifies a code without persisting the code or proof',async()=>{
 await mount();await previewAccount();act(()=>button('Recibir código por correo')!.props.onClick());
 const request=requests.at(-1)!;assert.equal(request.url,'/core-api/api/auth/account/recent-auth/email/request');assert.deepEqual(JSON.parse(String(request.init.body)),{previewId:'account-preview'});
 await respond(request,{ok:true});assert.match(treeText(),/Enviamos un código de verificación/);
 const code=emailCodeInput();act(()=>code.props.onChange({target:{value:'123456'}}));form('deletion-auth-form deletion-email-form').props.onSubmit(submitEvent());
 const verify=requests.at(-1)!;assert.equal(verify.url,'/core-api/api/auth/account/recent-auth/email/complete');assert.deepEqual(JSON.parse(String(verify.init.body)),{previewId:'account-preview',code:'123456'});
 await respond(verify,proof('account.delete','email'));
 assert.match(treeText(),/Identidad confirmada con código enviado a tu correo/);assert.equal(storage.getItem(DELETION_PREVIEW_STORAGE_KEY),null);assert.equal(storage.length,0,'email codes and recent-auth proofs never enter session storage');
 const confirmation=input();act(()=>confirmation.props.onChange({target:{value:'Eliminar'}}));assert.equal(button('Eliminar mi cuenta')!.props.disabled,true);await finishCountdown();assert.equal(button('Eliminar mi cuenta')!.props.disabled,false);
 form('deletion-confirm-form').props.onSubmit(submitEvent());const deletion=requests.at(-1)!;assert.deepEqual(JSON.parse(String(deletion.init.body)),{previewId:'account-preview',recentAuthProof:'proof-account.delete',confirmation:'Eliminar'});
});
