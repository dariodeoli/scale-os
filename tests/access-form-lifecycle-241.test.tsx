import {renderedText} from './helpers/rendered-text';
import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
mock('../app/workspace-footer',{WorkspaceFooter:()=>null});mock('../app/theme-toggle',{ThemeToggle:()=>null});
mock('next/link',{__esModule:true,default:({children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=><a {...props}>{children}</a>});
const {EmailField}=require('../app/email-field') as typeof import('../app/email-field');
const {PasswordField}=require('../app/password-field') as typeof import('../app/password-field');
const {ProviderSignIn}=require('../app/google-sign-in') as typeof import('../app/google-sign-in');
const components={login:require('../app/cliente/ingresar/page').default,recovery:require('../app/cliente/recuperar/page').default,account:require('../app/recuperar-cuenta/page').default,verify:require('../app/verificar-correo/page').default,portalInvite:require('../app/cliente/invitacion/page').default,teamInvite:require('../app/invitacion/page').default};
const response=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status});
const text=(r:ReactTestRenderer)=>JSON.stringify(r.toJSON());
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const event=()=>({preventDefault(){}});

test('Accesos manuales: bloqueo síncrono compartido, borrador/error conservados y reintento único',async()=>{
 for(const mode of ['login','recovery','account','verify'] as const){
  let r:ReactTestRenderer;const writes:{path:string;body:Record<string,string>}[]=[];let release:(response:Response)=>void=()=>{};
  Object.assign(globalThis,{window:{dispatchEvent(){return true;},location:{href:'https://qa.example.invalid/',search:'',pathname:'/',assign(){}},history:{replaceState(){}}}});
  globalThis.fetch=(async(input,init={})=>{writes.push({path:String(input),body:JSON.parse(String(init.body))});return new Promise<Response>(resolve=>{release=resolve;});}) as typeof fetch;
  const Page=components[mode];await act(async()=>{r=create(<Page/>);});
  await act(async()=>{r!.root.findByType(EmailField).props.onChange('qa@example.invalid');});
  if(mode==='login'||mode==='account')await act(async()=>{r!.root.findByType(PasswordField).props.onChange('old');});
  let first:Promise<void>,second:Promise<void>;
  await act(async()=>{first=r!.root.findByType('form').props.onSubmit(event());second=r!.root.findByType('form').props.onSubmit(event());await tick();});
  assert.equal(writes.length,1,`${mode}: una sola petición`);assert(r!.root.findAllByType('fieldset').some(field=>field.props.disabled===true));
  if(mode==='login'){
   const google=r!.root.findByType(ProviderSignIn);assert.equal(google.props.disabled,true);assert.equal(r!.root.findAllByType('a').filter(link=>String(link.props.href).includes('/auth/google')).length,0);
  }
  await act(async()=>{release(response(503,{error:'Error recuperable de acceso'}));await Promise.all([first!,second!]);});
  assert.equal(r!.root.findByType(EmailField).props.value,'qa@example.invalid');assert.match(text(r!),/Error recuperable de acceso/);
  await act(async()=>{r!.root.findByType(EmailField).props.onChange('qa-corregido@example.invalid');});
  assert.match(text(r!),/Error recuperable de acceso/,'un error general no se atribuye a un campo por adivinar su texto');
  if(mode==='login'||mode==='account'){assert.equal(r!.root.findByType(PasswordField).props.value,'old');assert.equal(r!.root.findByType(PasswordField).props.minLength,undefined,'contraseña existente no adopta mínimo de alta');}
  await act(async()=>{first=r!.root.findByType('form').props.onSubmit(event());await tick();});assert.equal(writes.length,2);
  await act(async()=>{release(response(503,{error:'Mismo error recuperable'}));await first!;r!.unmount();});
 }
});

test('Invitaciones: aceptar sin consentimiento no muta; pendiente bloquea consentimientos/OAuth y conserva datos tras error',async()=>{
 for(const mode of ['portalInvite','teamInvite'] as const){
  const token='a'.repeat(mode==='portalInvite'?64:43);let r:ReactTestRenderer,release:(response:Response)=>void=()=>{};const writes:Record<string,unknown>[]=[];
  Object.assign(globalThis,{window:{dispatchEvent(){return true;},location:{href:`https://qa.example.invalid/?token=${token}`,search:`?token=${token}`,assign(){}},localStorage:{getItem(){return null;},setItem(){}}}});
  globalThis.fetch=(async(input,init={})=>{
   if(String(input).includes('/preview?'))return response(200,mode==='portalInvite'?{organizationName:'Empresa QA',clientName:'Cliente QA'}:{organization_name:'Empresa QA',role:'viewer',mode:'single'});
   writes.push(JSON.parse(String(init.body)));return new Promise<Response>(resolve=>{release=resolve;});
  }) as typeof fetch;
  const Page=components[mode];await act(async()=>{r=create(<Page/>);});
  if(mode==='teamInvite')await act(async()=>{r!.root.findAllByType('button').find(button=>renderedText(button)==='Crear cuenta con correo')!.props.onClick();});
  await act(async()=>{r!.root.findAllByType('input').find(input=>input.props.autoComplete==='name')!.props.onChange({target:{value:'Persona QA'}});});
  if(mode==='teamInvite')await act(async()=>r!.root.findByType(EmailField).props.onChange('qa@example.invalid'));
  for(const password of r!.root.findAllByType(PasswordField))await act(async()=>password.props.onChange('ClaveLocal2026!'));
  await act(async()=>{await r!.root.findByType('form').props.onSubmit(event());});assert.equal(writes.length,0);assert.match(text(r!),/Aceptá el tratamiento/);
  await act(async()=>r!.root.findAllByType('input').find(input=>input.props.type==='checkbox')!.props.onChange({target:{checked:true}}));
  let first:Promise<void>,second:Promise<void>;
  await act(async()=>{first=r!.root.findByType('form').props.onSubmit(event());second=r!.root.findByType('form').props.onSubmit(event());await tick();});
  assert.equal(writes.length,1);assert(r!.root.findAllByType('fieldset').some(field=>field.props.disabled===true));assert.equal(writes[0].fullName??writes[0].full_name,'Persona QA','bloquear fieldset no vacía payload');
  await act(async()=>{release(response(503,{error:'Intentá nuevamente'}));await Promise.all([first!,second!]);});
  assert.match(text(r!),/Intentá nuevamente/);assert(r!.root.findAllByType(PasswordField).every(field=>field.props.value==='ClaveLocal2026!'));
  await act(async()=>r!.unmount());
 }
});

test('Google con href deshabilitado se convierte en botón nativo, conserva contenido y no puede navegar',async()=>{
 let r:ReactTestRenderer;
 await act(async()=>{r=create(<ProviderSignIn provider="google" href="/core-api/api/auth/google/start" disabled/>);});
 assert.equal(r!.root.findAllByType('a').length,0);assert.equal(r!.root.findByType('button').props.disabled,true);assert.equal(r!.root.findByType('button').props.type,'button');assert.match(text(r!),/Continuar con Google/);
 await act(async()=>r!.unmount());
});

test('Reenvío conserva respuesta genérica de privacidad y mensajes de límite sin revelar existencia',async()=>{
 let r:ReactTestRenderer;const Verify=components.verify;let status=200;
 Object.assign(globalThis,{window:{dispatchEvent(){return true;},location:{href:'https://qa.example.invalid/',search:'',pathname:'/',assign(){}},history:{replaceState(){}}}});
 globalThis.fetch=(async()=>response(status,status===200?{exists:true,email:'no-mostrar@example.invalid'}:{error:'Esperá antes de solicitar otro enlace'})) as typeof fetch;
 await act(async()=>{r=create(<Verify/>);});await act(async()=>r!.root.findByType(EmailField).props.onChange('qa@example.invalid'));
 await act(async()=>{await r!.root.findByType('form').props.onSubmit(event());});
 assert.match(text(r!),/Si hay una cuenta pendiente/);assert.doesNotMatch(text(r!),/no-mostrar|exists/);
 status=429;await act(async()=>{await r!.root.findByType('form').props.onSubmit(event());});assert.match(text(r!),/Esperá antes de solicitar otro enlace/);assert.equal(r!.root.findByType(EmailField).props.value,'qa@example.invalid');
 await act(async()=>r!.unmount());
});

test('Verificación preserva destinos autorizados y evita redirect tardío después de desmontar',async()=>{
 const Verify=components.verify;const originalTimeout=globalThis.setTimeout,originalClear=globalThis.clearTimeout;let callback:()=>void=()=>{},cancelled=false;
 const marker={} as ReturnType<typeof setTimeout>;
 globalThis.setTimeout=((action:()=>void,delay:number,...args:unknown[])=>{if(delay===650){callback=action;return marker;}return originalTimeout(action,delay,...args);}) as typeof setTimeout;
 globalThis.clearTimeout=((timer:ReturnType<typeof setTimeout>)=>{if(timer===marker){cancelled=true;return;}return originalClear(timer);}) as typeof clearTimeout;
 try{
  for(const [payload,destination,unmountFirst] of [[{pending:true},'/acceso-pendiente',false],[{trial:true},'/produccion',false],[{},'/',false],[{trial:true},'/produccion',true]] as const){
   const assigned:string[]=[];let r:ReactTestRenderer;cancelled=false;
   Object.assign(globalThis,{window:{location:{href:'https://qa.example.invalid/?token='+'a'.repeat(64),pathname:'/verificar-correo',assign:(value:string)=>assigned.push(value)},history:{replaceState(){}}}});
   globalThis.fetch=(async()=>response(200,payload)) as typeof fetch;
   await act(async()=>{r=create(<Verify/>);});assert.match(text(r!),/Correo verificado/);
   if(unmountFirst){await act(async()=>r!.unmount());assert.equal(cancelled,true);callback();assert.deepEqual(assigned,[]);}
   else{callback();assert.deepEqual(assigned,[destination]);await act(async()=>r!.unmount());}
  }
 }finally{globalThis.setTimeout=originalTimeout;globalThis.clearTimeout=originalClear;}
});
