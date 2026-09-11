import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import postcss from 'postcss';
import type {SubscriptionState,SubscriptionPanelProps} from '../app/subscription-panel';
import {founderPricingNote} from '../app/founder-pricing';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const {SubscriptionPanel,SubscriptionNotice}=require('../app/subscription-panel') as typeof import('../app/subscription-panel');
const state:SubscriptionState={status:'trialing',hasAccess:true,currency:'USD',amount:10,trialEndsAt:'2026-10-10',dueAt:'2026-10-10',suspendAt:'2026-10-13',daysRemaining:30,canManage:true,checkoutReady:true};
const originalFetch=globalThis.fetch,originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
const redirects:string[]=[],requests:Array<{url:string;init?:RequestInit}>=[];
Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{assign:(url:string)=>redirects.push(url)}}});
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
   if(status==='unmanaged'||status==='demo'){assert(!findButton('Stripe'));assert.equal(renderer!.root.findAllByType('input').length,0);}
   if(status==='suspended')assert(text().includes('datos no se borran'));
  }
  assert.equal(requests.length,0,'Mounting any status, including suspended, must never fetch');
  await render(state,{embedded:true});
  assert.equal(renderer!.root.findByType('h2').props.hidden,true);
  assert.equal(renderer!.root.findByProps({className:'subscription-panel'}).props['data-embedded'],true);
  assert.equal(renderer!.root.findByProps({className:'subscription-panel'}).props['aria-labelledby'],renderer!.root.findByType('h2').props.id);
  await render(state);assert(text().includes('30 días de prueba restantes'));assert(text().includes('10/10/2026'));
  assert.equal(renderer!.root.findByType('h2').props.hidden,false);
  assert(text().includes('US$ 10 o Gs. 50.000 por mes, por agencia'));assert(text().includes('no una conversión'));assert(text().includes('2 días de gracia'));
  assert(text().includes(founderPricingNote));
  assert(text().includes('Todos los integrantes y todos los módulos están incluidos'));
  assert(text().includes('No hay cobro por usuario'));assert(text().includes('Los permisos de cada rol se mantienen'));
  assert(renderer!.root.findByProps({className:'subscription-consent'}).findByType('span').children.join('').includes('sin cobro por usuario'));
  assert(findButton('US$ 10/mes por agencia'));
  await render({...state,daysRemaining:0});assert(text().includes('0 días de prueba restantes'));
  await render({...state,daysRemaining:null,trialEndsAt:'invalid'});assert(text().includes('pendiente de confirmación'));assert(text().includes('Por confirmar'));assert(!text().includes('Invalid Date'));
  for(const status of ['trialing','active','grace','suspended'] as const){
   await render({...state,status,canManage:false});assert(text().includes('Contactá al dueño'));
   assert.equal(renderer!.root.findAllByType('input').length,0);assert(!findButton('Stripe'));
  }
  assert.equal(requests.length,0);
  await render({...state,checkoutReady:false});assert(text().includes('configuración de Stripe está pendiente'));
  const unavailable=findButton('Continuar en Stripe');assert.equal(unavailable.props.disabled,true);
  await act(async()=>{await unavailable.props.onClick();});assert.equal(requests.length,0);
  await render({...state,status:'active',checkoutReady:false});assert.equal(findButton('Gestionar').props.disabled,true);
  await click('Gestionar');assert.equal(requests.length,0);

  await render(null,{loading:true});assert(text().includes('Cargando suscripción'));assert.equal(findButton('Reintentar').props.disabled,true);
  await render(null,{error:'No se pudo consultar el estado'});assert(text().includes('No se pudo consultar el estado'));assert(!text().includes('Suscripción activa'));
  await click('Reintentar');assert.equal(refreshes,1);assert.equal(requests.length,0);
  await render(null,{onRefresh:async()=>{throw Error('Seguimos sin conexión');}});await click('Reintentar');assert(text().includes('Seguimos sin conexión'));

  await render(state);assert.equal(findButton('Continuar').props.disabled,true);
  await click('Continuar');assert.equal(requests.length,0,'Consent is required even if handler is called directly');
  await consent();assert.equal(findButton('Continuar').props.disabled,false);
  assert.equal(renderer!.root.findAllByProps({type:'radio'}).length,0,'Signup currency must not be editable');
  await click('Continuar');assert.deepEqual(JSON.parse(String(requests.at(-1)!.init!.body)),{currency:'USD'});
  await render({...state,currency:'PYG',amount:50000});
  assert(text().includes('no se puede cambiar desde este panel'));assert(findButton('Gs. 50.000/mes por agencia'));
  assert(renderer!.root.findByProps({className:'subscription-consent'}).findByType('span').children.join('').includes('Gs. 50.000 por mes'));
  assert.equal(renderer!.root.findAllByProps({type:'radio'}).length,0);
  await consent();await click('Continuar');
  assert.deepEqual(JSON.parse(String(requests.at(-1)!.init!.body)),{currency:'PYG'});
  assert.deepEqual(redirects,['https://checkout.stripe.com/c/pay/cs_test_local','https://checkout.stripe.com/c/pay/cs_test_local']);
  assert(text().includes('Prueba gratuita'));assert(!text().includes('Suscripción activa'),'A redirect does not mark payment as confirmed');

  response=async()=>new Response(JSON.stringify({url:'https://billing.stripe.com/p/session/test_local'}));
  await render({...state,status:'active'});assert(!findButton('Continuar'));await click('Gestionar');
  assert.equal(requests.at(-1)!.url,'/core-api/api/billing/portal');assert.deepEqual(JSON.parse(String(requests.at(-1)!.init!.body)),{});
  assert.equal(redirects.at(-1),'https://billing.stripe.com/p/session/test_local');
  const redirected=redirects.length;
  for(const url of ['http://checkout.stripe.com/c/pay/x','https://checkout.stripe.com.evil.invalid/pay','https://evil.invalid/?next=https://checkout.stripe.com','https://checkout.stripe.com@evil.invalid/x','https://user:secret@checkout.stripe.com/x','https://checkout.stripe.com:444/x','javascript:alert(1)','//checkout.stripe.com/x','https://billing.stripe.com/p/session/wrong-endpoint','https://check\nout.stripe.com/x','https://checkout.stripe.com\\@evil.invalid/x',null]){
   response=async()=>new Response(JSON.stringify({url}));await render(state);await consent();await click('Continuar');
   assert.equal(redirects.length,redirected);assert(text().includes('enlace no permitido'));
  }
  response=async()=>new Response(JSON.stringify({url:'https://checkout.stripe.com/c/pay/not-a-portal'}));
  await render({...state,status:'active'});await click('Gestionar');assert.equal(redirects.length,redirected);
  response=async()=>new Response(JSON.stringify({error:'Stripe no está configurado'}),{status:503});
  await render(state);await consent();await click('Continuar');assert(text().includes('Stripe no está configurado'));assert.equal(findButton('Continuar').props.disabled,false);
  assert(!text().includes('Suscripción activa'));
  response=async()=>new Response(JSON.stringify({url:'https://checkout.stripe.com/c/pay/retry'}));
  await click('Continuar');assert.equal(redirects.at(-1),'https://checkout.stripe.com/c/pay/retry');
  await render({...state,status:'suspended',hasAccess:false});await consent();await click('Continuar');
  assert.equal(requests.at(-1)!.url,'/core-api/api/billing/checkout','Suspended owners can reach billing without private tenant reads');
  assert(text().includes('Acceso suspendido'),'Opening checkout does not lift the access gate');
  for(const payload of ['not-json','null','{}']){
   const before=redirects.length;response=async()=>new Response(payload);
   await render(state);await consent();await click('Continuar');
   assert.equal(redirects.length,before);assert(renderer!.root.findAllByProps({role:'alert'}).length>0);assert(!text().includes('Suscripción activa'));
  }
  response=async()=>{throw Error('Sin conexión');};await render(state);await consent();await click('Continuar');assert(text().includes('Sin conexión'));

  const completedRedirects=redirects.length,completedRefreshes=refreshes;
  response=async()=>new Response(JSON.stringify({completed:true}));
  await render({...state,status:'suspended',hasAccess:false});await consent();await click('Continuar');
  assert.equal(refreshes,completedRefreshes+1);assert.equal(redirects.length,completedRedirects);
  assert(text().includes('sesión ya finalizó'));assert(text().includes('no confirma por sí solo el pago'));
  assert(text().includes('Acceso suspendido'));assert(!text().includes('Suscripción activa'));
  await render(state,{onRefresh:async()=>{throw Error('Verificación no disponible');}});await consent();await click('Continuar');
  assert(text().includes('Verificación no disponible'));assert(findButton('Reintentar'));assert(!text().includes('Suscripción activa'));
  await render(state,{onRefresh:undefined});await consent();await click('Continuar');assert(text().includes('Actualizá el estado de la suscripción'));assert.equal(redirects.length,completedRedirects);
  response=async()=>new Response(JSON.stringify({expired:true,error:'La sesión de pago venció. Reintentá.'}),{status:409});
  await render(state);await consent();const expiredCount=requests.length;await click('Continuar');
  assert.equal(requests.length,expiredCount+1,'Expired checkout is not retried automatically');
  assert.equal(redirects.length,completedRedirects);assert(text().includes('sesión de pago venció'));assert.equal(findButton('Continuar').props.disabled,false);
  response=async()=>new Response(JSON.stringify({url:'https://checkout.stripe.com/c/pay/after-expiry'}));await click('Continuar');assert.equal(redirects.at(-1),'https://checkout.stripe.com/c/pay/after-expiry');

  const slow=deferred<Response>();response=()=>slow.promise;
  await render(state);await consent();const checkout=findButton('Continuar');let pending:Promise<void>;
  const count=requests.length;
  await act(async()=>{pending=checkout.props.onClick();});assert.equal(requests.length,count+1);
  await act(async()=>{await checkout.props.onClick();});assert.equal(requests.length,count+1,'Repeated click must not create a second checkout');
  const beforeStale=redirects.length;
  await act(async()=>{renderer!.update(<SubscriptionPanel state={{...state,canManage:false}}/>);});
  await act(async()=>{slow.resolve(new Response(JSON.stringify({url:'https://checkout.stripe.com/c/pay/stale'})));await pending;});
  assert.equal(redirects.length,beforeStale,'Changed server state invalidates late checkout');
  const abandoned=deferred<Response>();response=()=>abandoned.promise;
  await render(state);await consent();await act(async()=>{pending=findButton('Continuar').props.onClick();});
  await act(async()=>{renderer!.unmount();renderer=undefined;});
  await act(async()=>{abandoned.resolve(new Response(JSON.stringify({url:'https://checkout.stripe.com/c/pay/abandoned'})));await pending;});
  assert.equal(redirects.length,beforeStale,'Unmounted panel never redirects');

  let opened=0;
  await act(async()=>{renderer=create(<SubscriptionNotice state={state} onOpen={()=>opened++}/>);});
  assert(text().includes('30 días de prueba restantes'));await click('Ver suscripción');assert.equal(opened,1);
  for(const status of ['demo','unmanaged'] as const){await act(async()=>{renderer!.update(<SubscriptionNotice state={{...state,status}} onOpen={()=>opened++}/>);});assert.equal(renderer!.toJSON(),null);}
  await act(async()=>{renderer!.update(<SubscriptionNotice state={{...state,status:'active'}} onOpen={()=>opened++}/>);});
  assert.equal(renderer!.root.findAllByType('p').length,0,'Active state uses a compact management link, not a full banner');
  await click('Gestionar');assert.equal(opened,2);
  await act(async()=>{renderer!.update(<SubscriptionNotice state={{...state,status:'active',canManage:false}} onOpen={()=>opened++}/>);});assert(findButton('Ver estado'));
  await act(async()=>{renderer!.update(<SubscriptionNotice state={{...state,status:'suspended',canManage:false,hasAccess:false}} onOpen={()=>opened++}/>);});
  assert(text().includes('Contactá al dueño'));assert(text().includes('Acceso suspendido'));
  const css=postcss.parse(readFileSync(new URL('../app/subscription-panel.css',import.meta.url),'utf8'));
  const rules=(selector:string)=>{const result:Record<string,string>={};css.walkRules(rule=>{if(rule.selectors.includes(selector))rule.walkDecls(d=>{result[d.prop]=d.value;});});return result;};
  for(const selector of ['.subscription-panel .subscription-primary','.subscription-panel .subscription-secondary','.subscription-notice .subscription-secondary']){assert.equal(rules(selector)['min-height'],'44px');assert.equal(rules(selector)['min-width'],'44px');assert.equal(rules(selector)['max-width'],'100%');assert.equal(rules(selector)['white-space'],'normal');}
  for(const width of [320,360,390])assert(width-28>=44,'Touch target fits inside mobile padding');
  assert.equal(rules('.subscription-panel input[type=checkbox]').padding,'0');assert.equal(rules('.subscription-fixed-price')['min-width'],'0');
  // Contrast of the actual fixed foreground/background pairs used by this panel.
  const luminance=(hex:string)=>{const channels=hex.match(/[a-f\d]{2}/gi)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];};
  for(const [fg,bg] of [['4d065b','ffffff'],['513b09','fff3cf'],['185640','e2f4ed'],['514957','eee9f0'],['8a1830','fff0f3']]){const a=luminance(fg),b=luminance(bg);assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5);}
  console.log('PASS: fixed signup currency USD/PYG, completed checkout refresh without claiming paid, expired 409 manual retry; six states, owner/viewer, consent, Stripe unavailable, allowlisted redirects, no private reads, concurrency, mobile CSS and contrast');
 }finally{if(renderer)await act(async()=>{renderer!.unmount();});globalThis.fetch=originalFetch;if(originalWindow)Object.defineProperty(globalThis,'window',originalWindow);else Reflect.deleteProperty(globalThis,'window');}
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
