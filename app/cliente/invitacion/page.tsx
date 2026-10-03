'use client';
import {FormEvent,useEffect,useRef,useState} from 'react';
import {esToken,extractTokenFromUrl,registroConsentimiento} from 'owncoding-ui';
import {GoogleSignIn} from '../../google-sign-in';
import {PasswordField} from '../../password-field';
import {clientPortalApiUrl,PortalApiError,portalApi} from '../../client-portal-api';
import {PRIVACY_NOTICE,PRIVACY_NOTICE_URL} from '../../privacy-notice';
import {queuePrivacyConsent,registerPrivacyConsent} from '../../privacy-data';
import '../portal.css';
type Preview={organizationName:string;clientName:string;expiresAt?:string};
type InvitationStatus='loading'|'invalid'|'expired'|'revoked'|'used'|'not-found'|'unavailable'|'connection'|'server-error';
type InvitationState={status:'server-error';message:string}|{status:Exclude<InvitationStatus,'loading'|'server-error'>}|{status:'loading'}|{status:'ready';preview:Preview};
const notices:Record<Exclude<InvitationStatus,'loading'|'server-error'>,{heading:string;message:string}>={
 invalid:{heading:'El enlace de invitación es inválido',message:'Revisá que hayas copiado el enlace completo o pedí uno nuevo.'},
 expired:{heading:'El enlace venció',message:'Terminó el plazo para activar este acceso. Pedí una nueva invitación.'},
 revoked:{heading:'El enlace fue revocado',message:'Esta invitación fue desactivada. Contactá a quien te invitó para solicitar otra.'},
 used:{heading:'El enlace ya fue utilizado',message:'Esta invitación ya activó un acceso. Si ya tenés una cuenta, ingresá al portal.'},
 'not-found':{heading:'Invitación no encontrada',message:'No encontramos esta invitación. Revisá el enlace o pedí uno nuevo.'},
 unavailable:{heading:'Invitación no disponible',message:'Este enlace ya no está disponible. Pedí una nueva invitación.'},
 connection:{heading:'No pudimos comprobar la invitación',message:'No pudimos verificar el enlace. Revisá tu conexión e intentá nuevamente.'},
};
function isPreview(value:unknown):value is Preview{return Boolean(value&&typeof value==='object'&&typeof (value as Partial<Preview>).organizationName==='string'&&typeof (value as Partial<Preview>).clientName==='string'&&(typeof (value as Partial<Preview>).expiresAt==='string'||typeof (value as Partial<Preview>).expiresAt==='undefined'));}
function previewFailure(error:unknown):Exclude<InvitationStatus,'loading'|'server-error'>{
 const detail=error as PortalApiError;
 if(detail?.status===404)return 'not-found';
 if(detail?.status===410)return detail.link_status==='expired'||detail.link_status==='revoked'||detail.link_status==='used'?detail.link_status:'unavailable';
 return 'connection';
}
export default function ClientInvitation(){
 const [token,setToken]=useState(''),[state,setState]=useState<InvitationState>({status:'loading'}),[fullName,setFullName]=useState(''),[password,setPassword]=useState(''),[formError,setFormError]=useState(''),[busy,setBusy]=useState(false),errorFocus=useRef<HTMLDivElement>(null);
 // Consentimiento del portal (Ley 7593/2025, Refs #113): el portal conserva su
 // sistema visual propio (decisión 17-09), así que la casilla se dibuja con
 // las clases del portal; la versión y el registro salen de la fuente única.
 const [dataConsent,setDataConsent]=useState(false),[consentError,setConsentError]=useState('');
 const consentRecord=()=>registroConsentimiento({finalidad:'portal-cliente',aceptado:true,version:PRIVACY_NOTICE.version,canal:'invitacion-portal'});
 useEffect(()=>{
  // Un fallo de Google vuelve con `?error=` y sin token: sin esto la pantalla
  // decía «enlace inválido» en vez del motivo real (#153). El harness de tests
  // no expone `location.href`, así que la lectura se guarda.
  const rawLocation=(typeof window!=='undefined'&&(window.location?.href||window.location?.search))||'';
  let failure='';
  if(rawLocation){try{failure=(new URL(rawLocation,'https://app.scaleparaguay.com').searchParams.get('error')||'').trim().replace(/\s+/g,' ').slice(0,200);}catch{failure='';}}
  const value=extractTokenFromUrl(window.location.href||window.location.search);setToken(value);
  if(failure){setState({status:'server-error',message:failure});return;}
  if(!esToken(value)){setState({status:'invalid'});return;}
  void portalApi<unknown>('/invites/preview?token='+encodeURIComponent(value),undefined,'GET').then(result=>setState(isPreview(result)?{status:'ready',preview:result}:{status:'connection'})).catch(error=>setState({status:previewFailure(error)}));
 },[]);
 useEffect(()=>{if(state.status!=='loading'&&state.status!=='ready')errorFocus.current?.focus();},[state.status]);
 async function submit(event:FormEvent){event.preventDefault();if(!dataConsent){setConsentError('Aceptá el tratamiento de tus datos para activar el acceso.');return;}setBusy(true);setFormError('');try{await portalApi('/invites/accept',{token,fullName,password,privacy:consentRecord()});await registerPrivacyConsent({finalidad:'portal-cliente',canal:'invitacion-portal'}).catch(()=>{});window.location.assign('/cliente/entregas');}catch(error){setFormError(error instanceof Error?error.message:'No se pudo activar el acceso');}finally{setBusy(false);}}
 function continueWithGoogle(event:{preventDefault:()=>void}){if(!dataConsent){event.preventDefault();setConsentError('Aceptá el tratamiento de tus datos para continuar con Google.');return;}queuePrivacyConsent({finalidad:'portal-cliente',canal:'invitacion-portal-google'});}
 const serverError=state.status==='server-error'?state.message:null;
 const preview=state.status==='ready'?state.preview:null;
 const notice=state.status==='server-error'||state.status==='ready'||state.status==='loading'?null:notices[state.status];
 const expiration=preview?.expiresAt?new Date(preview.expiresAt):null;
 return <main className="client-portal"><section className="client-portal-card narrow" aria-busy={state.status==='loading'}><p className="portal-status">INVITACIÓN AL PORTAL</p><h1 id="client-invitation-title">{notice?.heading||(serverError?'No pudimos completar el acceso':'Acceso a entregables')}</h1>{state.status==='loading'&&<p className="portal-muted" role="status">Comprobando la invitación…</p>}{preview&&<><p className="portal-invitation-status" data-state="ready" role="status" aria-live="polite">Enlace activo</p><p>Vas a ver las entregas publicadas de <strong>{preview.clientName}</strong> por <strong>{preview.organizationName}</strong>.</p>{expiration&&!Number.isNaN(expiration.getTime())&&<p className="portal-invitation-expiry">Vence: <time dateTime={expiration.toISOString()}>{new Intl.DateTimeFormat('es-PY',{timeZone:'America/Asuncion',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(expiration)}</time> · hora de Asunción</p>}<p className="portal-muted">Podés continuar con la cuenta de Google asociada a esta invitación o crear tu acceso con una contraseña.</p><label className="portal-consent"><input type="checkbox" checked={dataConsent} onChange={event=>{setDataConsent(event.target.checked);setConsentError('');}}/><span>Acepto que Scale OS trate mis datos para crear este acceso y mostrarme las entregas de este cliente. Leé la <a href="/privacidad" target="_blank" rel="noreferrer">Política de Privacidad</a> (Aviso {PRIVACY_NOTICE.version}, {PRIVACY_NOTICE.fechaLabel}).</span></label>{consentError&&<p className="error" role="alert">{consentError}</p>}<GoogleSignIn href={clientPortalApiUrl('/auth/google/start?token='+encodeURIComponent(token))} onClick={continueWithGoogle}/><form onSubmit={submit}><label>Nombre completo<input value={fullName} onChange={event=>setFullName(event.target.value)} autoComplete="name" minLength={2} maxLength={120} required/></label><PasswordField label="Elegí una contraseña" name="password" value={password} onChange={setPassword} autoComplete="new-password" required minLength={8}/><small className="portal-muted">La cuenta queda vinculada sólo a este cliente. No otorga acceso al panel interno.</small><button disabled={busy}>{busy?'Activando…':'Activar mi acceso'}</button>{formError&&<p className="error" role="alert">{formError}</p>}</form></>}{notice&&<><p className="portal-invitation-status" data-state={state.status} role="status" aria-live="polite">{notice.heading}</p><div ref={errorFocus} className="portal-invitation-notice" role="alert" tabIndex={-1} aria-labelledby="client-invitation-title"><p>{notice.message}</p></div></>}{serverError&&<><p className="portal-invitation-status" data-state="unavailable" role="status" aria-live="polite">Acceso no completado</p><div ref={errorFocus} className="portal-invitation-notice" role="alert" tabIndex={-1} aria-labelledby="client-invitation-title"><p>{serverError}</p></div></>}</section></main>;
}
