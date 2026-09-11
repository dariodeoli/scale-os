'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {founderPricingNote} from './founder-pricing';
import './subscription-panel.css';

export type SubscriptionState={
 status:'unmanaged'|'demo'|'trialing'|'active'|'grace'|'suspended';
 hasAccess:boolean;
 currency:'USD'|'PYG';
 amount:10|50000;
 trialEndsAt:string|null;
 dueAt:string|null;
 suspendAt:string|null;
 daysRemaining:number|null;
 /** Server-authorized owner only; this UI flag is not an authorization boundary. */
 canManage:boolean;
 checkoutReady:boolean;
};
export type SubscriptionPanelProps={
 state:SubscriptionState|null;
 onRefresh?:()=>void|Promise<void>;
 loading?:boolean;
 error?:string|null;
 embedded?:boolean;
};
const prices={USD:'US$ 10',PYG:'Gs. 50.000'} as const;
const titles={unmanaged:'Sin suscripción gestionada',demo:'Demo · sin cobros',trialing:'Prueba gratuita',active:'Suscripción activa',grace:'Pago pendiente · período de gracia',suspended:'Acceso suspendido'};
const managed=(state:SubscriptionState)=>!['unmanaged','demo'].includes(state.status);
function dateLabel(value:string|null){
 if(!value)return 'Por confirmar';
 const parsed=new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T12:00:00Z`:value);
 return Number.isNaN(parsed.getTime())?'Por confirmar':parsed.toLocaleDateString('es-PY',{timeZone:'America/Asuncion',day:'2-digit',month:'2-digit',year:'numeric'});
}
function remaining(state:SubscriptionState){
 if(state.daysRemaining===null||!Number.isFinite(state.daysRemaining))return 'Plazo pendiente de confirmación.';
 const days=Math.max(0,Math.floor(state.daysRemaining));
 return `${days} ${days===1?'día':'días'} de ${state.status==='grace'?'gracia':'prueba'} restantes.`;
}
function description(state:SubscriptionState){
 switch(state.status){
  case 'unmanaged':return 'Esta empresa no tiene una suscripción gestionada desde este panel.';
  case 'demo':return 'Esta es una demostración aislada. No se cobran suscripciones en el demo.';
  case 'trialing':return `30 días gratis. ${remaining(state)}`;
  case 'active':return `Plan mensual de ${prices[state.currency]} por agencia, según el estado informado por el servidor.`;
  case 'grace':return `${remaining(state)} Tenés 2 días de gracia después del vencimiento.`;
  case 'suspended':return 'El acceso se bloquea desde el tercer día de atraso. Tus datos no se borran por esta suspensión.';
 }
}

// Main owns GET /api/billing/subscription and the suspended workspace gate.
// Mount with key={organizationId}; never reuse in-flight billing across tenants.
export function SubscriptionPanel({state,onRefresh,loading=false,error,embedded=false}:SubscriptionPanelProps){
 const heading=useId();
 const [accepted,setAccepted]=useState(false),[actionError,setActionError]=useState('');
 const [verification,setVerification]=useState('');
 const [pending,setPending]=useState<'checkout'|'portal'|'refresh'|null>(null);
 const locked=useRef(false),mounted=useRef(true),latest=useRef(state);
 latest.current=state;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const currency=state?.currency??'USD';
 const busy=loading||pending!==null;
 const canCheckout=!!state&&managed(state)&&state.status!=='active'&&state.canManage===true&&state.checkoutReady===true&&!error&&!loading;
 const canPortal=!!state&&['active','grace','suspended'].includes(state.status)&&state.canManage===true&&state.checkoutReady===true&&!error&&!loading;
 async function refresh(){
  if(!onRefresh||locked.current||loading)return;
  locked.current=true;setPending('refresh');setActionError('');setVerification('');
  try{await onRefresh();}catch(e){if(mounted.current)setActionError(e instanceof Error?e.message:'No se pudo actualizar la suscripción.');}
  finally{locked.current=false;if(mounted.current)setPending(null);}
 }
 async function redirect(kind:'checkout'|'portal'){
  if(!state||locked.current||!mounted.current||(kind==='checkout'?(!canCheckout||!accepted):!canPortal))return;
  const snapshot=state;
  locked.current=true;setPending(kind);setActionError('');setVerification('');
  try{
   // Reuse the standard /core-api helper, loading its workspace dependencies only
   // on an explicit action. No tenant-private reads occur here, even suspended.
   const {api}=await import('./operations');
   if(!mounted.current||latest.current!==snapshot)return;
   const response=await api<{url?:unknown;completed?:boolean}>(`/api/billing/${kind}`,kind==='checkout'?{currency:snapshot.currency}:{},'POST');
   if(!mounted.current||latest.current!==snapshot)return;
   if(kind==='checkout'&&response?.completed===true){
    setVerification('Stripe indica que la sesión ya finalizó. Esto no confirma por sí solo el pago.');
    if(onRefresh){
     setPending('refresh');
     try{await onRefresh();}catch(e){if(mounted.current)setActionError(e instanceof Error?e.message:'No se pudo verificar la suscripción. Reintentá actualizar el estado.');}
    }else setVerification('Stripe indica que la sesión ya finalizó. Actualizá el estado de la suscripción para verificar el pago; todavía no se confirmó desde este panel.');
    return;
   }
   if(typeof response?.url!=='string'||!/^https:\/\//.test(response.url)||/[\\\u0000-\u0020\u007f]/.test(response.url))throw Error('Stripe devolvió un enlace no permitido. No se abrió ningún pago.');
   const target=new URL(response.url);
   const host=kind==='checkout'?'checkout.stripe.com':'billing.stripe.com';
   if(target.protocol!=='https:'||target.hostname!==host||target.username||target.password||target.port)throw Error('Stripe devolvió un enlace no permitido. No se abrió ningún pago.');
   window.location.assign(target.href);
  }catch(e){if(mounted.current&&latest.current===snapshot)setActionError(e instanceof Error?e.message:'No se pudo abrir Stripe. Intentá nuevamente.');}
  finally{locked.current=false;if(mounted.current)setPending(null);}
 }
 return <section className="subscription-panel" data-embedded={embedded||undefined} aria-labelledby={heading} aria-busy={busy}>
  <h2 id={heading} hidden={embedded}>Suscripción de Scale OS</h2>
  {loading?<p role="status">Cargando suscripción…</p>:error||!state?<p className="subscription-error" role="alert">{error||'No se pudo cargar la suscripción. No se confirmó ningún pago.'}</p>:<>
   <div className={`subscription-status subscription-status--${state.status}`}><h3>{titles[state.status]}</h3><p>{description(state)}</p></div>
   {!state.hasAccess&&state.status!=='suspended'?<p className="subscription-error" role="alert">El servidor informa que el acceso está bloqueado.</p>:null}
   {managed(state)?<>
    <p>Después de los 30 días gratis: <strong>US$ 10 o Gs. 50.000 por mes, por agencia</strong>. Son precios de lanzamiento por moneda, no una conversión.</p>
    <p><strong>Beneficio para clientes fundadores.</strong> {founderPricingNote}</p>
    <p>Todos los integrantes y todos los módulos están incluidos. No hay cobro por usuario. Los permisos de cada rol se mantienen: el plan no amplía los accesos de los integrantes.</p>
    <p className="subscription-fixed-price">Tu moneda de registro es <strong>{state.currency}</strong>: <strong>{prices[state.currency]} por mes, por agencia</strong>. La moneda se mantiene para esta suscripción; no se puede cambiar desde este panel.</p>
    <p>Hay 2 días de gracia; desde el tercer día se suspende el acceso sin borrar tus datos.</p>
    <dl className="subscription-dates">
     {state.status==='trialing'?<div><dt>Fin de prueba</dt><dd>{dateLabel(state.trialEndsAt)}</dd></div>:null}
     <div><dt>Vencimiento</dt><dd>{dateLabel(state.dueAt)}</dd></div>
     {['grace','suspended'].includes(state.status)?<div><dt>Suspensión {state.status==='suspended'?'desde':'prevista'}</dt><dd>{dateLabel(state.suspendAt)}</dd></div>:null}
    </dl>
    {!state.canManage?<p className="subscription-owner-help">Contactá al dueño de esta empresa para gestionar la suscripción.</p>:<>
     {!state.checkoutReady?<p className="subscription-setup" role="status">La configuración de Stripe está pendiente. El pago en línea y el portal todavía no están disponibles. No se realizó ningún cobro desde este panel.</p>:null}
     {state.status!=='active'?<>
      <label className="subscription-consent"><input type="checkbox" checked={accepted} disabled={busy||!state.checkoutReady} onChange={event=>setAccepted(event.target.checked)}/><span>Entiendo que la suscripción de mi agencia es recurrente, de {prices[currency]} por mes en la moneda de registro, con todos los integrantes y módulos incluidos, sin cobro por usuario. Revisaré y confirmaré las condiciones y el primer cobro en Stripe.</span></label>
      <button type="button" className="subscription-primary" disabled={busy||!canCheckout||!accepted} onClick={()=>redirect('checkout')}>{pending==='checkout'?'Abriendo Stripe…':`Continuar en Stripe · ${prices[currency]}/mes por agencia`}</button>
     </>:null}
     {['active','grace','suspended'].includes(state.status)?<button type="button" className="subscription-secondary" disabled={busy||!canPortal} onClick={()=>redirect('portal')}>{pending==='portal'?'Abriendo portal…':'Gestionar suscripción en Stripe'}</button>:null}
     <p className="subscription-help">Abrir Stripe no confirma un pago. Al volver, actualizá el estado para consultar la confirmación del servidor.</p>
    </>}
   </>:null}
  </>}
  {actionError?<p className="subscription-error" role="alert">{actionError}</p>:null}
  {verification?<p className="subscription-help" role="status">{verification}</p>:null}
  {onRefresh?<button type="button" className="subscription-secondary" disabled={busy} onClick={refresh}>{pending==='refresh'?'Actualizando…':error||!state||actionError?'Reintentar':'Actualizar estado'}</button>:null}
 </section>;
}

export function SubscriptionNotice({state,onOpen}:{state:SubscriptionState|null;onOpen:()=>void}){
 if(!state||['unmanaged','demo'].includes(state.status))return null;
 if(state.status==='active'&&state.hasAccess)return <section className="subscription-notice subscription-notice--active" aria-label="Estado de la suscripción"><button type="button" className="subscription-secondary" onClick={onOpen}>Suscripción activa · {state.canManage?'Gestionar':'Ver estado'}</button></section>;
 return <section className={`subscription-notice subscription-status--${state.status}`} aria-label="Estado de la suscripción">
  <div><strong>{titles[state.status]}</strong><p>{description(state)}</p>{!state.canManage?<p>Contactá al dueño de esta empresa.</p>:null}</div>
  <button type="button" className="subscription-secondary" onClick={onOpen}>Ver suscripción</button>
 </section>;
}
