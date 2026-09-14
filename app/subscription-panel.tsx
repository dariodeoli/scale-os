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
 /** Safe, non-secret explanation for why payment is or is not available. */
 billingReadiness?:'disabled'|'configuration_pending'|'webhook_pending'|'ready';
 /** Optional during rollout; availability, not proof of payment or permission. */
 portalReady?:boolean;
};
export type SubscriptionPanelProps={
 state:SubscriptionState|null;
 onRefresh?:()=>void|Promise<void>;
 loading?:boolean;
 error?:string|null;
 embedded?:boolean;
};
const prices={USD:'US$ 10',PYG:'Gs. 50.000'} as const;
const monthlyLabels={USD:'USD 10/mes',PYG:'Gs. 50.000/mes'} as const;
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
function readinessMessage(readiness:SubscriptionState['billingReadiness']){
 switch(readiness){
  case 'webhook_pending':return 'Las claves y precios están cargados, pero falta comprobar una entrega firmada del webhook de Stripe. El pago en línea sigue desactivado y no se realizó ningún cobro.';
  case 'configuration_pending':return 'Falta validar la configuración de Stripe (claves, precios u origen seguro). El pago en línea y el portal siguen desactivados; no se realizó ningún cobro.';
  case 'disabled':return 'El cobro en línea todavía no fue habilitado para esta instalación. La prueba conserva sus fechas y no se realizó ningún cobro.';
  default:return 'La configuración de Stripe está pendiente. El pago en línea y el portal todavía no están disponibles. No se realizó ningún cobro desde este panel.';
 }
}

// Main owns GET /api/billing/subscription and the suspended workspace gate.
// Mount with key={organizationId}; never reuse in-flight billing across tenants.
export function SubscriptionPanel({state,onRefresh,loading=false,error,embedded=false}:SubscriptionPanelProps){
 const heading=useId();
 const [accepted,setAccepted]=useState(false),[actionError,setActionError]=useState('');
 const [verification,setVerification]=useState('');
 const [pending,setPending]=useState<'checkout'|'portal'|'refresh'|null>(null);
 const locked=useRef(false),mounted=useRef(true),latest=useRef(state),refreshHandler=useRef(onRefresh);
 latest.current=state;
 refreshHandler.current=onRefresh;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{
  if(typeof window==='undefined'||typeof window.location?.href!=='string')return;
  const url=new URL(window.location.href),result=url.searchParams.get('scaleBilling')||url.searchParams.get('billing');
  if(result!=='success'&&result!=='cancelled')return;
  url.searchParams.delete('scaleBilling');url.searchParams.delete('billing');
  window.history.replaceState(window.history.state,'',url);
  if(result==='cancelled'){
   setVerification('La activación fue cancelada. Scale no realizó ningún cambio en tu suscripción.');
   return;
  }
  let disposed=false,timer:ReturnType<typeof setTimeout>|undefined,attempts=0;
  locked.current=true;setPending('refresh');
  const verify=async()=>{
   if(disposed||!mounted.current)return;
   if(latest.current?.status==='active'){
    locked.current=false;setPending(null);setActionError('');
    setVerification('Suscripción activa confirmada por Scale.');
    return;
   }
   const handler=refreshHandler.current;
   if(!handler){locked.current=false;setPending(null);setVerification('Verificando la suscripción con Scale. Actualizá el estado para continuar.');return;}
   setVerification('Verificando la suscripción con Scale…');
   attempts++;
   try{await handler();if(!disposed&&mounted.current)setActionError('');}
   catch(e){if(disposed||!mounted.current)return;setActionError(e instanceof Error?e.message:'No se pudo verificar la suscripción.');}
   if(disposed||!mounted.current)return;
   if(attempts>=12){locked.current=false;setPending(null);setVerification('Scale todavía está verificando el pago. Podés reintentar la actualización sin volver a pagar.');return;}
   timer=setTimeout(()=>void verify(),2500);
  };
  void verify();
  return()=>{disposed=true;locked.current=false;if(timer)clearTimeout(timer);};
 },[]);
 const currency=state?.currency??'USD';
 const busy=loading||pending!==null;
 // Older servers omit portalReady. Preserve their existing non-trial portal UI;
 // a trial needs an explicit true, and an explicit false always takes precedence.
 const showPortal=!!state&&(state.portalReady===true||state.portalReady===undefined&&['active','grace','suspended'].includes(state.status));
 const showCheckout=!!state&&state.status!=='active'&&state.portalReady!==true;
 const canCheckout=!!state&&managed(state)&&showCheckout&&state.canManage===true&&state.checkoutReady===true&&!error&&!loading;
 const canPortal=!!state&&managed(state)&&showPortal&&state.canManage===true&&state.checkoutReady===true&&!error&&!loading;
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
    setVerification('El checkout ya finalizó. Esto no confirma por sí solo el pago.');
    if(onRefresh){
     setPending('refresh');
     try{await onRefresh();}catch(e){if(mounted.current)setActionError(e instanceof Error?e.message:'No se pudo verificar la suscripción. Reintentá actualizar el estado.');}
    }else setVerification('El checkout ya finalizó. Actualizá el estado de la suscripción para verificar el pago; todavía no se confirmó desde este panel.');
    return;
   }
   if(typeof response?.url!=='string'||!/^https:\/\//.test(response.url)||/[\\\u0000-\u0020\u007f]/.test(response.url))throw Error('El servidor devolvió un enlace de pago no permitido. No se abrió ningún pago.');
   let target:URL;try{target=new URL(response.url);}catch{throw Error('El servidor devolvió un enlace de pago no permitido. No se abrió ningún pago.');}
   const host=kind==='checkout'?'checkout.stripe.com':'billing.stripe.com';
   if(target.protocol!=='https:'||target.hostname!==host||target.username||target.password||target.port)throw Error('El servidor devolvió un enlace de pago no permitido. No se abrió ningún pago.');
   window.location.assign(target.href);
  }catch(e){if(mounted.current&&latest.current===snapshot)setActionError(e instanceof Error?e.message:'No se pudo abrir el checkout. Intentá nuevamente.');}
  finally{locked.current=false;if(mounted.current)setPending(null);}
 }
 return <section className="subscription-panel" data-embedded={embedded||undefined} aria-labelledby={heading} aria-busy={busy}>
  <h2 id={heading} hidden={embedded}>Suscripción de Scale OS</h2>
  {loading?<div className="subscription-panel-state" role="status" aria-live="polite" aria-atomic="true"><strong>Cargando suscripción…</strong><span>Consultando el estado autorizado por el servidor.</span></div>:error||!state?<div className="subscription-panel-state subscription-panel-state--error" role="alert"><strong>{error||'No se pudo cargar la suscripción. No se confirmó ningún pago.'}</strong>{onRefresh?<span>Podés reintentar la actualización.</span>:null}</div>:<>
   <header className={`subscription-status subscription-status--${state.status}`}>
    <span className="subscription-badge" role="status">Estado actual</span>
    <div><h3>{titles[state.status]}</h3><p>{description(state)}</p></div>
   </header>
   {!state.hasAccess&&state.status!=='suspended'?<p className="subscription-error" role="alert">El servidor informa que el acceso está bloqueado.</p>:null}
   {managed(state)?<>
    <dl className="subscription-dates" aria-label="Fechas de la suscripción">
     <div><dt>Plan</dt><dd>{monthlyLabels[currency]}</dd></div>
     {state.status==='trialing'?<div><dt>Fin de prueba</dt><dd>{dateLabel(state.trialEndsAt)}</dd></div>:null}
     <div><dt>Vencimiento</dt><dd>{dateLabel(state.dueAt)}</dd></div>
     {['grace','suspended'].includes(state.status)?<div><dt>Suspensión {state.status==='suspended'?'desde':'prevista'}</dt><dd>{dateLabel(state.suspendAt)}</dd></div>:null}
    </dl>
    <div className="subscription-explainer">
     <p>Después de los 30 días gratis: <strong>US$ 10 o Gs. 50.000 por mes, por agencia</strong>. Son precios de lanzamiento por moneda, no una conversión.</p>
     <p><strong>Beneficio para clientes fundadores.</strong> {founderPricingNote}</p>
     <p>Todos los integrantes y todos los módulos están incluidos. No hay cobro por usuario. Los permisos de cada rol se mantienen: el plan no amplía los accesos de los integrantes.</p>
     <p>Hay 2 días de gracia; desde el tercer día se suspende el acceso sin borrar tus datos.</p>
    </div>
    <fieldset className="subscription-currency" aria-describedby={`${heading}-currency-help`}>
     <legend>Moneda mensual</legend>
     <div className="subscription-currency-segments">
      {(Object.keys(monthlyLabels) as Array<keyof typeof monthlyLabels>).map(code=><label key={code} data-selected={code===currency||undefined}><input type="radio" name={`${heading}-currency`} checked={code===currency} disabled readOnly/><span>{monthlyLabels[code]}</span></label>)}
     </div>
     <small id={`${heading}-currency-help`}>La moneda elegida al registrar la empresa queda fija para esta suscripción.</small>
    </fieldset>
    {!state.canManage?<p className="subscription-owner-help">Contactá al dueño de esta empresa para gestionar la suscripción.</p>:<>
     {!state.checkoutReady?<p className="subscription-setup" role="status" data-billing-readiness={state.billingReadiness||'unknown'}>{readinessMessage(state.billingReadiness)}</p>:null}
     <div className="subscription-actions">
     {showCheckout?<div className="subscription-checkout">
      <label className="subscription-consent"><input type="checkbox" checked={accepted} disabled={busy||!state.checkoutReady} onChange={event=>setAccepted(event.target.checked)}/><span>Entiendo que la suscripción de mi agencia es recurrente, de {prices[currency]} por mes en la moneda de registro, con todos los integrantes y módulos incluidos, sin cobro por usuario. Revisaré y confirmaré las condiciones y el primer cobro en el checkout seguro.</span></label>
      <button type="button" className="subscription-primary" disabled={busy||!canCheckout||!accepted} onClick={()=>redirect('checkout')}>{pending==='checkout'?'Abriendo checkout…':'Activar suscripción mensual'}</button>
     </div>:null}
     {showPortal?<button type="button" className="subscription-secondary" disabled={busy||!canPortal} onClick={()=>redirect('portal')}>{pending==='portal'?'Abriendo portal…':'Gestionar suscripción en Stripe'}</button>:null}
     <p className="subscription-help">Abrir el checkout no confirma un pago. Al volver, Scale mostrará “verificando” y consultará el estado autorizado por el servidor.</p>
     </div>
    </>}
   </>:null}
  </>}
  {actionError?<p className="subscription-error" role="alert">{actionError}</p>:null}
  {verification?<p className="subscription-help subscription-feedback" role="status" aria-live="polite" aria-atomic="true">{verification}</p>:null}
  {onRefresh?<div className="subscription-refresh"><button type="button" className="subscription-secondary" disabled={busy} onClick={refresh}>{pending==='refresh'?'Actualizando…':error||!state||actionError?'Reintentar':'Actualizar estado'}</button></div>:null}
 </section>;
}

export function SubscriptionNotice({state,onOpen}:{state:SubscriptionState|null;onOpen:()=>void}){
 if(!state||['unmanaged','demo'].includes(state.status))return null;
 // A healthy trial should not occupy a page-wide banner. It becomes visible in
 // the compact workspace header only when attention is actually needed.
 const days=state.daysRemaining===null?null:Math.max(0,Math.floor(state.daysRemaining));
 if(state.status==='active'&&state.hasAccess)return null;
 if(state.status==='trialing'&&(days===null||days>5))return null;
 const label=state.status==='trialing'?`Prueba · ${days===0?'vence hoy':`faltan ${days} ${days===1?'día':'días'}`}`:state.status==='grace'?`Pago pendiente · ${remaining(state)}`:'Acceso suspendido';
 return <section className={`subscription-notice subscription-notice--compact subscription-status--${state.status}`} aria-label={`Estado de la suscripción: ${label}`}>
  <button type="button" className="subscription-secondary" onClick={onOpen} title="Ver suscripción">{label}</button>
 </section>;
}
