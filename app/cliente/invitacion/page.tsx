'use client';
import {FormEvent,useEffect,useRef,useState} from 'react';
import {GoogleSignIn} from '../../google-sign-in';
import {PasswordField} from '../../password-field';
import {clientPortalApiUrl,PortalApiError,portalApi} from '../../client-portal-api';
import '../portal.css';
type Preview={organizationName:string;clientName:string;expiresAt?:string};
type InvitationStatus='loading'|'invalid'|'expired'|'revoked'|'used'|'not-found'|'unavailable'|'connection';
type InvitationState={status:Exclude<InvitationStatus,'loading'>}|{status:'loading'}|{status:'ready';preview:Preview};
const notices:Record<Exclude<InvitationStatus,'loading'>,{heading:string;message:string}>={
 invalid:{heading:'El enlace de invitación es inválido',message:'Revisá que hayas copiado el enlace completo o pedí uno nuevo.'},
 expired:{heading:'El enlace venció',message:'Terminó el plazo para activar este acceso. Pedí una nueva invitación.'},
 revoked:{heading:'El enlace fue revocado',message:'Esta invitación fue desactivada. Contactá a quien te invitó para solicitar otra.'},
 used:{heading:'El enlace ya fue utilizado',message:'Esta invitación ya activó un acceso. Si ya tenés una cuenta, ingresá al portal.'},
 'not-found':{heading:'Invitación no encontrada',message:'No encontramos esta invitación. Revisá el enlace o pedí uno nuevo.'},
 unavailable:{heading:'Invitación no disponible',message:'Este enlace ya no está disponible. Pedí una nueva invitación.'},
 connection:{heading:'No pudimos comprobar la invitación',message:'No pudimos verificar el enlace. Revisá tu conexión e intentá nuevamente.'},
};
function isPreview(value:unknown):value is Preview{return Boolean(value&&typeof value==='object'&&typeof (value as Partial<Preview>).organizationName==='string'&&typeof (value as Partial<Preview>).clientName==='string'&&(typeof (value as Partial<Preview>).expiresAt==='string'||typeof (value as Partial<Preview>).expiresAt==='undefined'));}
function previewFailure(error:unknown):Exclude<InvitationStatus,'loading'>{
 const detail=error as PortalApiError;
 if(detail?.status===404)return 'not-found';
 if(detail?.status===410)return detail.link_status==='expired'||detail.link_status==='revoked'||detail.link_status==='used'?detail.link_status:'unavailable';
 return 'connection';
}
export default function ClientInvitation(){
 const [token,setToken]=useState(''),[state,setState]=useState<InvitationState>({status:'loading'}),[fullName,setFullName]=useState(''),[password,setPassword]=useState(''),[formError,setFormError]=useState(''),[busy,setBusy]=useState(false),errorFocus=useRef<HTMLDivElement>(null);
 useEffect(()=>{const value=new URLSearchParams(window.location.search).get('token')||'';setToken(value);if(!/^[a-f0-9]{64}$/.test(value)){setState({status:'invalid'});return;}void portalApi<unknown>('/invites/preview?token='+encodeURIComponent(value),undefined,'GET').then(result=>setState(isPreview(result)?{status:'ready',preview:result}:{status:'connection'})).catch(error=>setState({status:previewFailure(error)}));},[]);
 useEffect(()=>{if(state.status!=='loading'&&state.status!=='ready')errorFocus.current?.focus();},[state.status]);
 async function submit(event:FormEvent){event.preventDefault();setBusy(true);setFormError('');try{await portalApi('/invites/accept',{token,fullName,password});window.location.assign('/cliente/entregas');}catch(error){setFormError(error instanceof Error?error.message:'No se pudo activar el acceso');}finally{setBusy(false);}}
 const preview=state.status==='ready'?state.preview:null,notice=state.status==='ready'||state.status==='loading'?null:notices[state.status],expiration=preview?.expiresAt?new Date(preview.expiresAt):null;
 return <main className="client-portal"><section className="client-portal-card narrow" aria-busy={state.status==='loading'}><p className="portal-status">INVITACIÓN AL PORTAL</p><h1 id="client-invitation-title">{notice?.heading||'Acceso a entregables'}</h1>{state.status==='loading'&&<p className="portal-muted" role="status">Comprobando la invitación…</p>}{preview&&<><p className="portal-invitation-status" data-state="ready" role="status" aria-live="polite">Enlace activo</p><p>Vas a ver las entregas publicadas de <strong>{preview.clientName}</strong> por <strong>{preview.organizationName}</strong>.</p>{expiration&&!Number.isNaN(expiration.getTime())&&<p className="portal-invitation-expiry">Vence: <time dateTime={expiration.toISOString()}>{new Intl.DateTimeFormat('es-PY',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(expiration)}</time> · hora local</p>}<p className="portal-muted">Podés continuar con la cuenta de Google asociada a esta invitación.</p><GoogleSignIn href={clientPortalApiUrl('/auth/google/start?token='+encodeURIComponent(token))}/><p className="portal-muted">o creá tu acceso con una contraseña</p><form onSubmit={submit}><label>Nombre completo<input value={fullName} onChange={event=>setFullName(event.target.value)} autoComplete="name" minLength={2} maxLength={120} required/></label><PasswordField label="Elegí una contraseña" name="password" value={password} onChange={setPassword} autoComplete="new-password" required minLength={12}/><small className="portal-muted">La cuenta queda vinculada sólo a este cliente. No otorga acceso al panel interno.</small><button disabled={busy}>{busy?'Activando…':'Activar mi acceso'}</button>{formError&&<p className="error" role="alert">{formError}</p>}</form></>}{notice&&<><p className="portal-invitation-status" data-state={state.status} role="status" aria-live="polite">{notice.heading}</p><div ref={errorFocus} className="portal-invitation-notice" role="alert" tabIndex={-1} aria-labelledby="client-invitation-title"><p>{notice.message}</p></div></>}</section></main>;
}
