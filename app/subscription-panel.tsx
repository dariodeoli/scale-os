'use client';
// Panel de suscripción v2 (issue #46): Tailwind + tokens, sin hoja propia.
// La lógica de retorno de Stripe, verificación autoritativa y estados se conserva.
import {useEffect,useId,useRef,useState} from 'react';
import {whatsappUrl} from 'owncoding-ui';
import {daysUntil} from './client-format';
import {listDateFull} from './list-format';
import {founderPricingNote} from './founder-pricing';

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
 /** Optional agency name for the assisted-activation request message. */
 organizationName?:string;
};
const prices={USD:'US$ 10',PYG:'Gs. 50.000'} as const;
const monthlyLabels={USD:'USD 10/mes',PYG:'Gs. 50.000/mes'} as const;
const activationWhatsApp='595993391354';
// Bank details authorized by Scale Strategy Group for subscription transfers.
const transferAccount={holder:'SCALE STRATEGY GROUP E.A.S.',taxId:'80168807-8',bank:'Banco Continental · Caja de ahorro en guaraníes',number:'310056630007'};
function activationRequestUrl(organizationName?:string){
 const name=(organizationName||'').trim().replace(/\s+/g,' ').slice(0,120);
 const text=`Hola, quiero activar la suscripción mensual de Scale OS${name?` para la agencia "${name}"`:''} (US$ 10 o Gs. 50.000 por mes, todos los integrantes y módulos incluidos). El cobro en línea no está habilitado en esta instalación; quiero coordinar la transferencia y enviar el comprobante.`;
 return whatsappUrl(activationWhatsApp, text);
}
const titles={unmanaged:'Sin suscripción gestionada',demo:'Demo · sin cobros',trialing:'Prueba gratuita',active:'Suscripción activa',grace:'Pago pendiente · período de gracia',suspended:'Acceso suspendido'};
const managed=(state:SubscriptionState)=>!['unmanaged','demo'].includes(state.status);
function dateLabel(value:string|null){
 if(!value)return 'Por confirmar';
 const parsed=new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T12:00:00Z`:value);
 return Number.isNaN(parsed.getTime())?'Por confirmar':listDateFull(value)||'Por confirmar';
}
function remaining(state:SubscriptionState){
 if(state.daysRemaining===null||!Number.isFinite(state.daysRemaining))return 'Plazo pendiente de confirmación.';
 const days=Math.max(0,Math.floor(state.daysRemaining));
 return `${days} ${days===1?'día':'días'} de ${state.status==='grace'?'gracia':'prueba'} restantes.`;
}
function expiryCountdown(value:string|null){
 const days=daysUntil(value);
 if(days===null)return 'Por confirmar';
 if(days===0)return 'Vence hoy';
 return days>0?`Faltan ${days} ${days===1?'día':'días'}`:`Vencido hace ${-days} ${-days===1?'día':'días'}`;
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

/* Superficies v2 del panel: una sola familia de tarjetas y botones. */
const CARD='rounded-xl border border-ink-600 bg-ink-800';
const STATUS_TONE:Record<SubscriptionState['status'],string>={
 unmanaged:'border-ink-600 bg-ink-700 text-mute',
 demo:'border-ink-600 bg-ink-700 text-mute',
 trialing:'border-fono/30 bg-fono/10 text-fono-light',
 active:'border-ok/30 bg-ok/10 text-ok',
 grace:'border-warn/40 bg-warn/10 text-warn',
 suspended:'border-bad/30 bg-bad/10 text-bad',
};
const PRIMARY='subscription-primary inline-flex min-h-11 min-w-11 max-w-full items-center justify-center gap-2 whitespace-normal rounded-lg border border-fono bg-fono px-4 py-2 text-center text-[13px] font-bold leading-5 text-onbrand transition-colors [overflow-wrap:anywhere] hover:bg-fono-dark disabled:cursor-not-allowed disabled:border-ink-600 disabled:bg-ink-700 disabled:text-mute';
const SECONDARY='subscription-secondary inline-flex min-h-11 min-w-11 max-w-full items-center justify-center gap-2 whitespace-normal rounded-lg border border-ink-600 bg-ink-800 px-4 py-2 text-center text-[13px] font-bold leading-5 text-fore transition-colors [overflow-wrap:anywhere] hover:bg-ink-700 disabled:cursor-not-allowed disabled:text-mute';
const STATE_BOX='rounded-lg border border-warn/40 border-l-[3px] bg-warn/10 px-3 py-2.5 text-[13px] text-fore';

// Main owns GET /api/billing/subscription and the suspended workspace gate.
// Mount with key={organizationId}; never reuse in-flight billing across tenants.
export function SubscriptionPanel({state,onRefresh,loading=false,error,embedded=false,organizationName}:SubscriptionPanelProps){
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
 return <section className="subscription-panel min-w-0 max-w-full [overflow-wrap:anywhere]" data-embedded={embedded||undefined} aria-labelledby={heading} aria-busy={busy}>
  <h2 id={heading} hidden={embedded}>Suscripción de Scale OS</h2>
  {loading?<div className="subscription-panel-state grid gap-1 rounded-lg border border-ink-600 bg-ink-700 p-3.5" role="status" aria-live="polite" aria-atomic="true"><strong className="text-[13.5px] text-fore">Cargando suscripción…</strong><span className="text-[13px] leading-[1.45] text-mute">Consultando el estado autorizado por el servidor.</span></div>:error||!state?<div className="subscription-panel-state subscription-panel-state--error grid gap-1 rounded-lg border border-bad/40 border-l-[3px] bg-bad/10 p-3.5" role="alert"><strong className="text-[13.5px] text-bad">{error||'No se pudo cargar la suscripción. No se confirmó ningún pago.'}</strong>{onRefresh?<span className="text-[13px] leading-[1.45] text-mute">Podés reintentar la actualización.</span>:null}</div>:<div className="grid gap-4">
   <header className={`subscription-status subscription-status--${state.status} grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5 rounded-lg border border-l-[3px] p-3.5 max-md:grid-cols-1 ${STATUS_TONE[state.status]}`}>
    <span className="subscription-badge inline-flex min-h-6 items-center rounded-full border border-current/30 px-2 py-0.5 text-[11px] font-bold leading-tight [white-space:nowrap]" role="status">Estado actual</span>
    <div className="grid min-w-0 gap-1"><h3 className="text-[17px] font-semibold tracking-tight">{titles[state.status]}</h3><p className="text-[13px] leading-[1.5]">{description(state)}</p></div>
   </header>
   {!state.hasAccess&&state.status!=='suspended'?<p className="subscription-error rounded-lg border-l-[3px] border-bad bg-bad/10 px-3 py-2.5 text-[13px] text-bad" role="alert">El servidor informa que el acceso está bloqueado.</p>:null}
   {managed(state)?<>
    <dl className="subscription-dates grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Fechas de la suscripción">
     <div className="grid min-w-0 gap-0.5 rounded-lg border border-ink-600 bg-ink-700 px-3 py-2"><dt className="text-[11px] font-bold uppercase tracking-[.035em] text-mute">Plan</dt><dd className="text-sm font-bold tabular-nums text-fore">{monthlyLabels[currency]}</dd></div>
     {state.status==='trialing'?<div className="grid min-w-0 gap-0.5 rounded-lg border border-ink-600 bg-ink-700 px-3 py-2"><dt className="text-[11px] font-bold uppercase tracking-[.035em] text-mute">Fin de prueba</dt><dd className="text-sm font-bold tabular-nums text-fore">{dateLabel(state.trialEndsAt)}</dd></div>:null}
     <div className="grid min-w-0 gap-0.5 rounded-lg border border-ink-600 bg-ink-700 px-3 py-2"><dt className="text-[11px] font-bold uppercase tracking-[.035em] text-mute">Vencimiento</dt><dd className="text-sm font-bold tabular-nums text-fore">{dateLabel(state.dueAt)}</dd></div>
     <div className="grid min-w-0 gap-0.5 rounded-lg border border-ink-600 bg-ink-700 px-3 py-2"><dt className="text-[11px] font-bold uppercase tracking-[.035em] text-mute">Días para vencer</dt><dd className="text-sm font-bold tabular-nums text-fore">{expiryCountdown(state.dueAt)}</dd></div>
     {['grace','suspended'].includes(state.status)?<div className="grid min-w-0 gap-0.5 rounded-lg border border-ink-600 bg-ink-700 px-3 py-2"><dt className="text-[11px] font-bold uppercase tracking-[.035em] text-mute">Suspensión {state.status==='suspended'?'desde':'prevista'}</dt><dd className="text-sm font-bold tabular-nums text-fore">{dateLabel(state.suspendAt)}</dd></div>:null}
    </dl>
    <div className="subscription-explainer grid gap-1 border-l-2 border-ink-600 pl-3 text-[13px] leading-[1.5] text-mute">
     <p>Después de los 30 días gratis: <strong className="text-fore">US$ 10 o Gs. 50.000 por mes, por agencia</strong>. Son precios de lanzamiento por moneda, no una conversión.</p>
     <p><strong className="text-fore">Beneficio para clientes fundadores.</strong> {founderPricingNote}</p>
     <p>Todos los integrantes y todos los módulos están incluidos. No hay cobro por usuario. Los permisos de cada rol se mantienen: el plan no amplía los accesos de los integrantes.</p>
     <p>Hay 2 días de gracia; desde el tercer día se suspende el acceso sin borrar tus datos.</p>
    </div>
    <fieldset className="subscription-currency grid min-w-0 gap-2" aria-describedby={`${heading}-currency-help`}>
     <legend className="p-0 text-xs font-bold text-fore">Moneda mensual</legend>
     <div className="subscription-currency-segments grid grid-cols-[repeat(2,minmax(0,1fr))] gap-1 rounded-[10px] border border-ink-600 bg-ink-700 p-1">
      {(Object.keys(monthlyLabels) as Array<keyof typeof monthlyLabels>).map(code=><label key={code} data-selected={code===currency||undefined} className={`flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-center text-[13px] font-bold leading-[1.3] ${code===currency?'bg-fono/15 text-fono-light':'text-mute'}`}><input type="radio" name={`${heading}-currency`} checked={code===currency} disabled readOnly/><span>{monthlyLabels[code]}</span></label>)}
     </div>
     <small id={`${heading}-currency-help`} className="text-xs leading-[1.45] text-mute">La moneda elegida al registrar la empresa queda fija para esta suscripción.</small>
    </fieldset>
    {!state.canManage?<p className={`subscription-owner-help ${STATE_BOX}`}>Contactá al dueño de esta empresa para gestionar la suscripción.</p>:<>
     {!state.checkoutReady?<p className={`subscription-setup ${STATE_BOX}`} role="status" data-billing-readiness={state.billingReadiness||'unknown'}>{readinessMessage(state.billingReadiness)}</p>:null}
     <div className="subscription-actions grid gap-2.5">
     {showCheckout?(state.checkoutReady?<div className="subscription-checkout grid gap-2.5">
      <label className="subscription-consent flex min-h-11 min-w-0 items-start gap-2.5 py-1 text-[13px] leading-[1.5]"><input type="checkbox" className="!m-0 !h-5 !w-5 !min-h-5 appearance-auto !p-0 accent-fono" checked={accepted} disabled={busy||!state.checkoutReady} onChange={event=>setAccepted(event.target.checked)}/><span>Entiendo que la suscripción de mi agencia es recurrente, de {prices[currency]} por mes en la moneda de registro, con todos los integrantes y módulos incluidos, sin cobro por usuario. Revisaré y confirmaré las condiciones y el primer cobro en el checkout seguro.</span></label>
      <button type="button" className={PRIMARY} disabled={busy||!canCheckout||!accepted} onClick={()=>redirect('checkout')}>{pending==='checkout'?'Abriendo checkout…':'Activar suscripción mensual'}</button>
     </div>:<div className="subscription-manual grid gap-2.5 rounded-lg border border-ink-600 bg-ink-700 p-3">
      <p><strong className="text-fore">Activación con pago coordinado.</strong> El cobro en línea no está disponible en esta instalación, pero podés activar la suscripción igual:</p>
      <ol className="subscription-manual-steps grid list-decimal gap-1 pl-5 text-[13px] leading-[1.5]">
       <li>Si tenés un cupón, canjealo en Configuración → Cupones: suma tiempo gratis al instante.</li>
       <li>Transferí el monto del plan a la cuenta de Scale OS.</li>
       <li>Enviá el comprobante por WhatsApp: administración verifica el pago y libera el mes en tu suscripción.</li>
      </ol>
      <dl className="subscription-transfer grid gap-1 rounded-lg border border-ink-600 bg-ink-800 p-3" aria-label="Datos para la transferencia">
       <div className="flex items-baseline justify-between gap-2.5"><dt className="shrink-0 text-xs text-mute">Titular</dt><dd className="min-w-0 text-right text-[12.5px] font-semibold tabular-nums [overflow-wrap:anywhere]">{transferAccount.holder}</dd></div>
       <div className="flex items-baseline justify-between gap-2.5"><dt className="shrink-0 text-xs text-mute">RUC</dt><dd className="subscription-transfer-code min-w-0 whitespace-nowrap text-right text-[12.5px] font-semibold tabular-nums">{transferAccount.taxId}</dd></div>
       <div className="flex items-baseline justify-between gap-2.5"><dt className="shrink-0 text-xs text-mute">Banco</dt><dd className="min-w-0 text-right text-[12.5px] font-semibold tabular-nums [overflow-wrap:anywhere]">{transferAccount.bank}</dd></div>
       <div className="flex items-baseline justify-between gap-2.5"><dt className="shrink-0 text-xs text-mute">Cuenta</dt><dd className="subscription-transfer-code min-w-0 whitespace-nowrap text-right text-[12.5px] font-semibold tabular-nums">{transferAccount.number}</dd></div>
       <div className="flex items-baseline justify-between gap-2.5"><dt className="shrink-0 text-xs text-mute">Monto</dt><dd className="min-w-0 text-right text-[12.5px] font-semibold tabular-nums [overflow-wrap:anywhere]">{prices[currency]} por mes, por agencia</dd></div>
      </dl>
      <a className={`${PRIMARY} subscription-manual-link no-underline`} href={activationRequestUrl(organizationName)} target="_blank" rel="noopener noreferrer">Enviar comprobante por WhatsApp</a>
      <p className="text-xs leading-[1.45] text-mute">Este enlace abre WhatsApp con el mensaje ya escrito; no realiza ningún cobro. La cuenta recibe guaraníes; si tu plan está en dólares, coordinamos el equivalente al enviar el comprobante. Cuando administración verifique el pago, esta pantalla mostrará “Suscripción activa”.</p>
     </div>):null}
     {showPortal?<button type="button" className={SECONDARY} disabled={busy||!canPortal} onClick={()=>redirect('portal')}>{pending==='portal'?'Abriendo portal…':'Gestionar suscripción en Stripe'}</button>:null}
     {state.checkoutReady?<p className="text-xs leading-[1.45] text-mute">Abrir el checkout no confirma un pago. Al volver, Scale mostrará “verificando” y consultará el estado autorizado por el servidor.</p>:null}
     </div>
    </>}
   </>:null}
  </div>}
  {actionError?<p className="subscription-error mt-3 rounded-lg border-l-[3px] border-bad bg-bad/10 px-3 py-2.5 text-[13px] text-bad" role="alert">{actionError}</p>:null}
  {verification?<p className="subscription-feedback mt-3 border-l-2 border-fono px-3 text-xs leading-[1.45] text-mute" role="status" aria-live="polite" aria-atomic="true">{verification}</p>:null}
  {onRefresh?<div className="subscription-refresh mt-3 flex justify-start"><button type="button" className={SECONDARY} disabled={busy} onClick={refresh}>{pending==='refresh'?'Actualizando…':error||!state||actionError?'Reintentar':'Actualizar estado'}</button></div>:null}
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
 const tone=state.status==='trialing'?'bg-fono/15 text-fono-light':state.status==='grace'?'bg-warn/15 text-warn':'bg-bad/15 text-bad';
 return <section className="subscription-notice inline-flex min-w-0 items-center" aria-label={`Estado de la suscripción: ${label}`}>
  <button type="button" className={`subscription-secondary inline-flex min-h-11 min-w-0 max-w-full items-center justify-center rounded-full px-3 text-[11px] font-bold leading-tight [white-space:nowrap] hover:bg-ink-700 ${tone}`} onClick={onOpen} title="Ver suscripción">{label}</button>
 </section>;
}
