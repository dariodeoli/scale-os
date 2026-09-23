import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import type {SubscriptionState,SubscriptionPanelProps} from '../app/subscription-panel';
import {founderPricingNote} from '../app/founder-pricing';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const {SubscriptionPanel,SubscriptionNotice}=require('../app/subscription-panel') as typeof import('../app/subscription-panel');
const state:SubscriptionState={status:'trialing',hasAccess:true,currency:'USD',amount:10,trialEndsAt:'2026-10-10',dueAt:'2026-10-10',suspendAt:'2026-10-13',daysRemaining:30,canManage:true,checkoutReady:true,billingReadiness:'ready'};
const originalFetch=globalThis.fetch,originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
const redirects:string[]=[],requests:Array<{url:string;init?:RequestInit}>=[];
const browserLocation={href:'https://scale.invalid/',assign:(url:string)=>redirects.push(url)};
Object.defineProperty(globalThis,'window',{configurable:true,value:{location:browserLocation,history:{state:null,replaceState:(_state:unknown,_title:string,url:URL|string)=>{browserLocation.href=String(url);}}}});
let response=async()=>new Response(JSON.stringify({url:'https://checkout.stripe.com/c/pay/cs_test_local'}));
globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
 const url=String(input);assert(['/core-api/api/billing/checkout','/core-api/api/billing/portal'].includes(url),'No private agency reads, external calls or polling');
 assert.equal(init?.method,'POST');assert.equal(init?.credentials,'include');requests.push({url,init});return response();
}) as typeof fetch;
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {promise,resolve};}
async function main(){
 let renderer:ReactTestRenderer|undefined,refreshes=0;
 const text=()=>JSON.stringify(renderer!.toJSON());
 const buttons=()=>renderer!.root.findAllByType('button');
 const byClass=(className:string)=>renderer!.root.findAll(node=>typeof node.props.className==='string'&&node.props.className.split(/\s+/).includes(className))[0];
 const findButton=(label:string)=>buttons().find(b=>b.children.join('').includes(label))!;
 const click=async(label:string)=>{await act(async()=>{await findButton(label).props.onClick();});};
 const render=async(next:SubscriptionState|null,extra:Partial<SubscriptionPanelProps>={})=>{
  if(renderer)await act(async()=>{renderer!.unmount();});
  await act(async()=>{renderer=create(<SubscriptionPanel state={next} onRefresh={async()=>{refreshes++;}} {...extra}/>);});
 };
 const consent=async()=>{await act(async()=>{renderer!.root.findByProps({type:'checkbox'}).props.onChange({target:{checked:true}});});};
 try{
  for(const [status,label] of [['unmanaged','Sin suscripción gestionada'],['demo','Demo · sin cobros'],['trialing','Prueba gratuita'],['active','Suscripción activa'],['grace','período de gracia'],['suspended','Acceso suspendido']] as const){
   await render({...state,status,hasAccess:status!=='suspended'});assert(text().includes(label));
   if(status==='unmanaged'||status==='demo'){assert(!findButton('Activar'));assert(!findButton('Gestionar'));assert.equal(renderer!.root.findAllByType('input').length,0);}
   if(status==='suspended')assert(text().includes('datos no se borran'));
  }
  assert.equal(requests.length,0,'Mounting any status, including suspended, must never fetch');
  await render(state,{embedded:true});
  assert.equal(renderer!.root.findByType('h2').props.hidden,true);
  assert.equal(byClass('subscription-panel').props['data-embedded'],true);
  assert.equal(byClass('subscription-panel').props['aria-labelledby'],renderer!.root.findByType('h2').props.id);
  await render(state);assert(text().includes('30 días de prueba restantes'));assert(text().includes('10 oct 26'));
  assert.equal(renderer!.root.findByType('h2').props.hidden,false);
  const statusBadge=byClass('subscription-badge');assert.equal(statusBadge.props.role,'status');assert.equal(statusBadge.children.join(''),'Estado actual');
  assert(text().includes('US$ 10 o Gs. 50.000 por mes, por agencia'));assert(text().includes('no una conversión'));assert(text().includes('2 días de gracia'));
  assert(text().includes(founderPricingNote));
  assert(text().includes('Todos los integrantes y todos los módulos están incluidos'));
  assert(text().includes('No hay cobro por usuario'));assert(text().includes('Los permisos de cada rol se mantienen'));
  assert(byClass('subscription-consent').findByType('span').children.join('').includes('sin cobro por usuario'));
  assert(findButton('Activar suscripción mensual'));
  assert(text().includes('USD 10/mes'));assert(text().includes('Gs. 50.000/mes'));
  await render({...state,daysRemaining:0});assert(text().includes('0 días de prueba restantes'));
  await render({...state,daysRemaining:null,trialEndsAt:'invalid'});assert(text().includes('pendiente de confirmación'));assert(text().includes('Por confirmar'));assert(!text().includes('Invalid Date'));
  const asuncionDay=(offset:number)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+offset*86_400_000));
  await render({...state,status:'active',dueAt:asuncionDay(30)});assert(text().includes('Días para vencer'));assert(text().includes('Faltan 30 días'));
  await render({...state,status:'active',dueAt:asuncionDay(1)});assert(text().includes('Faltan 1 día'));assert(!text().includes('Faltan 1 días'));
  await render({...state,dueAt:asuncionDay(0)});assert(text().includes('Vence hoy'));assert(text().includes('días de prueba restantes'),'Trial days and plan expiry countdown coexist');
  await render({...state,status:'grace',dueAt:asuncionDay(-3)});assert(text().includes('Vencido hace 3 días'));
  await render({...state,status:'active',dueAt:null});assert(text().includes('Días para vencer'));
  for(const status of ['trialing','active','grace','suspended'] as const){
   await render({...state,status,canManage:false});assert(text().includes('Contactá al dueño'));
   assert.equal(renderer!.root.findAllByProps({type:'checkbox'}).length,0);assert(!findButton('Activar'));assert(!findButton('Gestionar'));
  }
  assert.equal(requests.length,0);
  await render({...state,checkoutReady:false,billingReadiness:'disabled'},{organizationName:'Agencia Horizonte'});assert(text().includes('cobro en línea todavía no fue habilitado'));assert.equal(byClass('subscription-setup').props['data-billing-readiness'],'disabled');
  const manual=renderer!.root.findByType('a');assert(manual.props.href.startsWith('https://wa.me/595993391354?text='));assert(manual.props.href.includes(encodeURIComponent('Agencia Horizonte')));assert.equal(manual.props.target,'_blank');assert.equal(manual.props.rel,'noopener noreferrer');
  assert(text().includes('Activación con pago coordinado'));assert(!findButton('Activar suscripción mensual'),'Assisted activation replaces the dead checkout');
  assert(text().includes('310056630007'));assert(text().includes('SCALE STRATEGY GROUP E.A.S.'));assert(text().includes('80168807-8'));assert(text().includes('Banco Continental'));assert(text().includes('Enviar comprobante por WhatsApp'));
  assert(text().includes('Canjealo en Configuración')||text().includes('Cupones'));assert(text().includes('libera el mes'));
  assert.equal(renderer!.root.findAllByProps({type:'checkbox'}).length,0,'Assisted activation does not ask for checkout consent');
  await render({...state,checkoutReady:false,billingReadiness:'configuration_pending'});assert(text().includes('Falta validar la configuración de Stripe'));
  await render({...state,checkoutReady:false,billingReadiness:'webhook_pending'});assert(text().includes('falta comprobar una entrega firmada del webhook'));
  await render({...state,checkoutReady:false});assert(text().includes('configuración de Stripe está pendiente'));
  assert(text().includes('Enviar comprobante por WhatsApp'));assert.equal(requests.length,0);
  await render({...state,status:'active',checkoutReady:false});assert.equal(findButton('Gestionar').props.disabled,true);assert(!text().includes('Enviar comprobante por WhatsApp'),'An active subscription does not offer assisted activation');
  await click('Gestionar');assert.equal(requests.length,0);

  await render(null,{loading:true});assert(text().includes('Cargando suscripción'));assert.equal(findButton('Reintentar').props.disabled,true);
  await render(null,{error:'No se pudo consultar el estado'});assert(text().includes('No se pudo consultar el estado'));assert(!text().includes('Suscripción activa'));
  await click('Reintentar');assert.equal(refreshes,1);assert.equal(requests.length,0);
  await render(null,{onRefresh:async()=>{throw Error('Seguimos sin conexión');}});await click('Reintentar');assert(text().includes('Seguimos sin conexión'));

  await render(state);assert.equal(findButton('Activar').props.disabled,true);
  await click('Activar');assert.equal(requests.length,0,'Consent is required even if handler is called directly');
  await consent();assert.equal(findButton('Activar').props.disabled,false);
  const usdSegments=renderer!.root.findAllByProps({type:'radio'});assert.equal(usdSegments.length,2);assert.equal(usdSegments[0].props.checked,true);assert.equal(usdSegments[1].props.checked,false);assert(usdSegments.every(input=>input.props.disabled),'Backend contract locks signup currency');
  await click('Activar');assert.deepEqual(JSON.parse(String(requests.at(-1)!.init!.body)),{currency:'USD'});
  await render({...state,currency:'PYG',amount:50000});
  assert(text().includes('queda fija para esta suscripción'));assert(findButton('Activar suscripción mensual'));
  assert(byClass('subscription-consent').findByType('span').children.join('').includes('Gs. 50.000 por mes'));
  const pygSegments=renderer!.root.findAllByProps({type:'radio'});assert.equal(pygSegments.length,2);assert.equal(pygSegments[0].props.checked,false);assert.equal(pygSegments[1].props.checked,true);
  await consent();await click('Activar');
  assert.deepEqual(JSON.parse(String(requests.at(-1)!.init!.body)),{currency:'PYG'});
  assert.deepEqual(redirects,['https://checkout.stripe.com/c/pay/cs_test_local','https://checkout.stripe.com/c/pay/cs_test_local']);
  assert(text().includes('Prueba gratuita'));assert(!text().includes('Suscripción activa'),'A redirect does not mark payment as confirmed');

  response=async()=>new Response(JSON.stringify({url:'https://billing.stripe.com/p/session/test_local'}));
  await render({...state,status:'active'});assert(!findButton('Activar'));await click('Gestionar');
  assert.equal(requests.at(-1)!.url,'/core-api/api/billing/portal');assert.deepEqual(JSON.parse(String(requests.at(-1)!.init!.body)),{});
  assert.equal(redirects.at(-1),'https://billing.stripe.com/p/session/test_local');
  const redirected=redirects.length;
  for(const url of ['http://checkout.stripe.com/c/pay/x','https://checkout.stripe.com.evil.invalid/pay','https://evil.invalid/?next=https://checkout.stripe.com','https://checkout.stripe.com@evil.invalid/x','https://user:secret@checkout.stripe.com/x','https://checkout.stripe.com:444/x','javascript:alert(1)','//checkout.stripe.com/x','https://billing.stripe.com/p/session/wrong-endpoint','https://check\nout.stripe.com/x','https://checkout.stripe.com\\@evil.invalid/x',null]){
   response=async()=>new Response(JSON.stringify({url}));await render(state);await consent();await click('Activar');
   assert.equal(redirects.length,redirected);assert(text().includes('enlace de pago no permitido'));
  }
  response=async()=>new Response(JSON.stringify({url:'https://checkout.stripe.com/c/pay/not-a-portal'}));
  await render({...state,status:'active'});await click('Gestionar');assert.equal(redirects.length,redirected);
  response=async()=>new Response(JSON.stringify({error:'Stripe no está configurado'}),{status:503});
  await render(state);await consent();await click('Activar');assert(text().includes('Stripe no está configurado'));assert.equal(findButton('Activar').props.disabled,false);
  assert(!text().includes('Suscripción activa'));
  response=async()=>new Response(JSON.stringify({url:'https://checkout.stripe.com/c/pay/retry'}));
  await click('Activar');assert.equal(redirects.at(-1),'https://checkout.stripe.com/c/pay/retry');
  await render({...state,status:'suspended',hasAccess:false});await consent();await click('Activar');
  assert.equal(requests.at(-1)!.url,'/core-api/api/billing/checkout','Suspended owners can reach billing without private tenant reads');
  assert(text().includes('Acceso suspendido'),'Opening checkout does not lift the access gate');
  for(const payload of ['not-json','null','{}']){
   const before=redirects.length;response=async()=>new Response(payload);
   await render(state);await consent();await click('Activar');
   assert.equal(redirects.length,before);assert(renderer!.root.findAllByProps({role:'alert'}).length>0);assert(!text().includes('Suscripción activa'));
  }
  response=async()=>{throw Error('Sin conexión');};await render(state);await consent();await click('Activar');assert(text().includes('Sin conexión'));

  const completedRedirects=redirects.length,completedRefreshes=refreshes;
  response=async()=>new Response(JSON.stringify({completed:true}));
  await render({...state,status:'suspended',hasAccess:false});await consent();await click('Activar');
  assert.equal(refreshes,completedRefreshes+1);assert.equal(redirects.length,completedRedirects);
  assert(text().includes('checkout ya finalizó'));assert(text().includes('no confirma por sí solo el pago'));
  assert(text().includes('Acceso suspendido'));assert(!text().includes('Suscripción activa'));
  await render(state,{onRefresh:async()=>{throw Error('Verificación no disponible');}});await consent();await click('Activar');
  assert(text().includes('Verificación no disponible'));assert(findButton('Reintentar'));assert(!text().includes('Suscripción activa'));
  await render(state,{onRefresh:undefined});await consent();await click('Activar');assert(text().includes('Actualizá el estado de la suscripción'));assert.equal(redirects.length,completedRedirects);
  response=async()=>new Response(JSON.stringify({expired:true,error:'La sesión de pago venció. Reintentá.'}),{status:409});
  await render(state);await consent();const expiredCount=requests.length;await click('Activar');
  assert.equal(requests.length,expiredCount+1,'Expired checkout is not retried automatically');
  assert.equal(redirects.length,completedRedirects);assert(text().includes('sesión de pago venció'));assert.equal(findButton('Activar').props.disabled,false);
  response=async()=>new Response(JSON.stringify({url:'https://checkout.stripe.com/c/pay/after-expiry'}));await click('Activar');assert.equal(redirects.at(-1),'https://checkout.stripe.com/c/pay/after-expiry');

  const slow=deferred<Response>();response=()=>slow.promise;
  await render(state);await consent();const checkout=findButton('Activar');let pending:Promise<void>;
  const count=requests.length;
  await act(async()=>{pending=checkout.props.onClick();});assert.equal(requests.length,count+1);
  await act(async()=>{await checkout.props.onClick();});assert.equal(requests.length,count+1,'Repeated click must not create a second checkout');
  const beforeStale=redirects.length;
  await act(async()=>{renderer!.update(<SubscriptionPanel state={{...state,canManage:false}}/>);});
  await act(async()=>{slow.resolve(new Response(JSON.stringify({url:'https://checkout.stripe.com/c/pay/stale'})));await pending;});
  assert.equal(redirects.length,beforeStale,'Changed server state invalidates late checkout');
  const abandoned=deferred<Response>();response=()=>abandoned.promise;
  await render(state);await consent();await act(async()=>{pending=findButton('Activar').props.onClick();});
  await act(async()=>{renderer!.unmount();renderer=undefined;});
  await act(async()=>{abandoned.resolve(new Response(JSON.stringify({url:'https://checkout.stripe.com/c/pay/abandoned'})));await pending;});
  assert.equal(redirects.length,beforeStale,'Unmounted panel never redirects');

  const beforeAvailability=requests.length;
  for(const portalReady of [false,undefined]){
   await render({...state,portalReady});
   assert(findButton('Activar'));assert(!findButton('Gestionar'));
  }
  for(const status of ['active','grace','suspended'] as const){
   await render({...state,status});assert(findButton('Gestionar'),'Older servers retain their non-trial portal UI');
   await render({...state,status,portalReady:false});assert(!findButton('Gestionar'),'Explicit false overrides the legacy fallback');
  }
  await render({...state,portalReady:true,canManage:false});
  assert(text().includes('Contactá al dueño'));assert(!findButton('Gestionar'));assert(!findButton('Activar'));
  await render({...state,portalReady:true,checkoutReady:false});
  assert.equal(findButton('Gestionar').props.disabled,true);await click('Gestionar');
  assert.equal(requests.length,beforeAvailability,'Availability renders and disabled actions never contact Stripe');
  response=async()=>new Response(JSON.stringify({url:'https://billing.stripe.com/p/session/bound-trial'}));
  await render({...state,portalReady:true});
  assert(text().includes('Prueba gratuita'));assert(text().includes('Fin de prueba'));assert(!text().includes('Suscripción activa'));
  assert.equal(findButton('Gestionar').props.disabled,false);assert(!findButton('Activar'));
  assert.equal(renderer!.root.findAllByProps({type:'checkbox'}).length,0,'Linked trials do not offer a duplicate subscription');
  await click('Gestionar');
  assert.equal(requests.at(-1)!.url,'/core-api/api/billing/portal');assert.deepEqual(JSON.parse(String(requests.at(-1)!.init!.body)),{});
  assert.equal(redirects.at(-1),'https://billing.stripe.com/p/session/bound-trial');assert(text().includes('Prueba gratuita'));
  const slowPortal=deferred<Response>();response=()=>slowPortal.promise;
  await render({...state,portalReady:true});const beforePortalRedirect=redirects.length;
  await act(async()=>{pending=findButton('Gestionar').props.onClick();});
  await act(async()=>{renderer!.update(<SubscriptionPanel state={{...state,portalReady:false}}/>);});
  await act(async()=>{slowPortal.resolve(new Response(JSON.stringify({url:'https://billing.stripe.com/p/session/stale'})));await pending;});
  assert.equal(redirects.length,beforePortalRedirect,'Revoked portal availability invalidates a late response');
  await act(async()=>{renderer!.unmount();renderer=undefined;});

  const returnRefreshes=refreshes;
  browserLocation.href='https://scale.invalid/?scaleBilling=success';
  await render(state);
  assert(text().includes('Verificando la suscripción con Scale'));assert.equal(refreshes,returnRefreshes+1,'Browser return refetches authoritative Scale state');
  assert.equal(browserLocation.href,'https://scale.invalid/','Return marker is consumed without granting access');
  assert(text().includes('Prueba gratuita'));assert(!text().includes('Suscripción activa'));
  browserLocation.href='https://scale.invalid/?billing=cancelled';
  await render(state);
  assert(text().includes('activación fue cancelada'));assert(text().includes('no realizó ningún cambio'));
  assert.equal(refreshes,returnRefreshes+1,'Cancellation does not poll or mutate subscription state');

  let opened=0;
  await act(async()=>{renderer=create(<SubscriptionNotice state={state} onOpen={()=>opened++}/>);});
  assert.equal(renderer!.toJSON(),null,'A healthy trial stays out of the workspace header');
  await act(async()=>{renderer!.update(<SubscriptionNotice state={{...state,daysRemaining:5}} onOpen={()=>opened++}/>);});
  assert(text().includes('Prueba · faltan 5 días'));await click('Prueba');assert.equal(opened,1);
  for(const status of ['demo','unmanaged'] as const){await act(async()=>{renderer!.update(<SubscriptionNotice state={{...state,status}} onOpen={()=>opened++}/>);});assert.equal(renderer!.toJSON(),null);}
  await act(async()=>{renderer!.update(<SubscriptionNotice state={{...state,status:'active'}} onOpen={()=>opened++}/>);});
  assert.equal(renderer!.toJSON(),null,'An active subscription does not use header space');
  await act(async()=>{renderer!.update(<SubscriptionNotice state={{...state,status:'active',canManage:false}} onOpen={()=>opened++}/>);});assert.equal(renderer!.toJSON(),null);
  await act(async()=>{renderer!.update(<SubscriptionNotice state={{...state,status:'suspended',canManage:false,hasAccess:false}} onOpen={()=>opened++}/>);});
  assert(text().includes('Acceso suspendido'));await click('Acceso suspendido');assert.equal(opened,2);
  const source=readFileSync(new URL('../app/subscription-panel.tsx',import.meta.url),'utf8');
  const classDecl=(name:string)=>{const match=source.match(new RegExp(`const ${name}='([^']*)'`));return match?match[1]:'';};
  const primary=classDecl('PRIMARY'),secondary=classDecl('SECONDARY');
  for(const cls of [primary,secondary]){assert(cls.includes('min-h-11'),'los botones conservan 44 px');assert(cls.includes('min-w-11'));assert(cls.includes('max-w-full'));assert(cls.includes('whitespace-normal'));}
  assert(source.includes('subscription-secondary inline-flex min-h-11 min-w-0 max-w-full'),'el aviso compacto conserva su target de 44 px y no recorta');
  assert(source.includes('whitespace-nowrap')&&source.includes('subscription-notice'),'el aviso del encabezado no envuelve su etiqueta');
  assert(source.includes('!p-0')&&source.includes('!h-5')&&source.includes('!w-5'),'el checkbox de consentimiento conserva su tamaño propio');
  assert(source.includes("!state.canManage?<p"),'el aviso al dueño se reserva a quien no gestiona');
  assert(source.includes('min-h-11 min-w-0 items-center justify-center')&&source.includes('subscription-currency-segments'),'los segmentos de moneda conservan 44 px');
  assert(primary.includes('text-onbrand'),'el botón primario usa el texto sobre marca');
  assert(classDecl('STATE_BOX').includes('text-fore')&&source.includes("bg-warn/10"),'los avisos de estado usan el token de advertencia con texto legible');
  assert(source.includes("trialing:'border-fono/30 bg-fono/10 text-fono-light'")&&source.includes("active:'border-ok/30 bg-ok/10 text-ok'")&&source.includes("grace:'border-warn/40 bg-warn/10 text-warn'")&&source.includes("suspended:'border-bad/30 bg-bad/10 text-bad'"),'cada estado usa su token semántico con contraste AA');
  assert(!/transition\s*:\s*all\b/.test(source),'las transiciones nombran las propiedades afectadas');
  const workspace=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
  assert(workspace.includes("query.get('scaleBilling')||query.get('billing')"));assert(workspace.includes("if(billing==='success'||billing==='cancelled')setSubscriptionOpen(true)"));
  // El contraste de los pares fijos vive en los tokens de `ui-system.test.mjs`;
  // este panel usa los mismos tokens semánticos (fono/ok/warn/bad) vía Tailwind.
  console.log('PASS: PagaYa/direct checkout handoff, fixed segmented USD/PYG display, authoritative return polling without client entitlement, expired/idempotent retry, active/owner guards, allowlisted redirects, six states, mobile targets and semantic tokens');
 }finally{if(renderer)await act(async()=>{renderer!.unmount();});globalThis.fetch=originalFetch;if(originalWindow)Object.defineProperty(globalThis,'window',originalWindow);else Reflect.deleteProperty(globalThis,'window');}
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
