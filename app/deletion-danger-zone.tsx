'use client';
// Zona de peligro v2 (issue #46): Tailwind + primitivas, sin hoja propia.
// La lógica de vista previa, re-autenticación y confirmación tipada se conserva.
import {useEffect,useId,useRef,useState} from 'react';
import {Building2,KeyRound,Send,ShieldAlert,Trash2,UserRoundX} from 'lucide-react';

type DeletionAction='account.delete'|'organization.delete';
type DeletionErrorCode=
 |'LAST_ACTIVE_OWNER'
 |'DELETION_PREVIEW_STALE'
 |'DELETION_PREVIEW_INVALID'
 |'DELETION_SCOPE_MISMATCH'
 |'CONFIRMATION_MISMATCH'
 |'RECENT_AUTH_REQUIRED'
 |'RECENT_AUTH_INVALID'
 |'ORGANIZATION_DELETE_FORBIDDEN'
 |'PASSWORD_REAUTH_UNAVAILABLE'
 |'GOOGLE_REAUTH_UNAVAILABLE'
 |'GOOGLE_REAUTH_NOT_ALLOWED'
 |'GOOGLE_REAUTH_INVALID'
 |'EMAIL_REAUTH_INVALID';
type MembershipConsequence='organization_soft_delete'|'membership_deactivation'|string;
type AccountMembership={organizationId:string;name:string;role:string;activeMemberCount:number;activeOwnerCount:number;consequence:MembershipConsequence};
type AccountBlocker={code:string;organizationId:string;organizationName:string;message:string};
export type AccountDeletionPreview={
 id:string;action:'account.delete';organizationId:null;confirmation:string;expiresAt:string;
 memberships:AccountMembership[];blockers:AccountBlocker[];
 account:{willBeAnonymized:boolean;sessionsWillBeRevoked:boolean;tenantDataWillBeRetained:boolean};executable:boolean;
};
export type OrganizationDeletionPreview={
 id:string;action:'organization.delete';organizationId:string;confirmation:string;expiresAt:string;
 organization:{id:string;name:string;activeMemberCount:number};
 consequences:{organizationWillBeSoftDeleted:boolean;allMemberAccessWillBeDeactivated:boolean;organizationSessionsWillBeRevoked:boolean;tenantDataWillBeRetained:boolean};executable:boolean;
};
type DeletionPreview=AccountDeletionPreview|OrganizationDeletionPreview;
type RecentAuthProof={proof:string;method:'password'|'google'|'email';action:DeletionAction;organizationId:string|null;expiresAt:string};
type ResumeState={preview:DeletionPreview;auth:RecentAuthProof};
type ApiFailure=Error&{code?:DeletionErrorCode;status?:number};

export const DELETION_PREVIEW_STORAGE_KEY='scale:pending-deletion-preview';
const DELETION_CONFIRMATION='Eliminar';
const previewRecoveryCodes=new Set<DeletionErrorCode>(['DELETION_PREVIEW_STALE','DELETION_PREVIEW_INVALID','DELETION_SCOPE_MISMATCH']);
const consequenceLabels:Record<string,string>={
 organization_soft_delete:'La empresa se desactivará porque sos su único miembro activo; sus datos quedarán inaccesibles.',
 membership_deactivation:'Tu acceso se desactivará; la empresa y sus datos seguirán disponibles para los demás miembros.',
};
const roleLabels:Record<string,string>={owner:'Dueño',admin:'Administración',management:'Gerencia',manager:'Gerencia',finance:'Finanzas',sales:'Comercial',editor:'Edición',production:'Producción',viewer:'Lectura',collaborator:'Colaborador'};
const sameScope=(left:string|null,right:string|null)=>String(left??'')===String(right??'');
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

function validDeletionPreview(value:unknown):value is DeletionPreview{
 if(!isRecord(value)||typeof value.id!=='string'||typeof value.confirmation!=='string'||typeof value.expiresAt!=='string'||!Number.isFinite(new Date(value.expiresAt).getTime())||typeof value.executable!=='boolean')return false;
 if(value.action==='account.delete'){
  if(value.organizationId!==null||!Array.isArray(value.memberships)||!Array.isArray(value.blockers)||!isRecord(value.account))return false;
  const memberships=value.memberships.every(item=>isRecord(item)&&typeof item.organizationId==='string'&&typeof item.name==='string'&&typeof item.role==='string'&&typeof item.activeMemberCount==='number'&&typeof item.activeOwnerCount==='number'&&typeof item.consequence==='string');
  const blockers=value.blockers.every(item=>isRecord(item)&&typeof item.code==='string'&&typeof item.organizationId==='string'&&typeof item.organizationName==='string'&&typeof item.message==='string');
  return memberships&&blockers&&typeof value.account.willBeAnonymized==='boolean'&&typeof value.account.sessionsWillBeRevoked==='boolean'&&typeof value.account.tenantDataWillBeRetained==='boolean';
 }
 if(value.action!=='organization.delete'||typeof value.organizationId!=='string'||!isRecord(value.organization)||!isRecord(value.consequences))return false;
 return typeof value.organization.id==='string'&&typeof value.organization.name==='string'&&typeof value.organization.activeMemberCount==='number'&&
  typeof value.consequences.organizationWillBeSoftDeleted==='boolean'&&typeof value.consequences.allMemberAccessWillBeDeactivated==='boolean'&&
  typeof value.consequences.organizationSessionsWillBeRevoked==='boolean'&&typeof value.consequences.tenantDataWillBeRetained==='boolean';
}
function validRecentAuthProof(value:unknown):value is RecentAuthProof{
 return isRecord(value)&&typeof value.proof==='string'&&(value.method==='password'||value.method==='google'||value.method==='email')&&(value.action==='account.delete'||value.action==='organization.delete')&&
  (value.organizationId===null||typeof value.organizationId==='string')&&typeof value.expiresAt==='string'&&Number.isFinite(new Date(value.expiresAt).getTime());
}

async function deletionRequest<T>(path:string,body:unknown):Promise<T>{
 const response=await fetch(`/core-api${path}`,{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json().catch(()=>({})) as {error?:unknown;code?:unknown};
 if(!response.ok){
  const failure=Object.assign(new Error(typeof data.error==='string'?data.error:'No se pudo completar la operación.'),{status:response.status,code:typeof data.code==='string'?data.code:undefined}) as ApiFailure;
  throw failure;
 }
 return data as T;
}

async function preflightGoogleStart(path:string){
 const response=await fetch(`/core-api${path}`,{method:'GET',credentials:'include',cache:'no-store',redirect:'manual'});
 if(response.type==='opaqueredirect'||response.status>=300&&response.status<400)return;
 const data=await response.json().catch(()=>({})) as {error?:unknown;code?:unknown};
 if(!response.ok){
  throw Object.assign(new Error(typeof data.error==='string'?data.error:'No se pudo iniciar la verificación con Google.'),{status:response.status,code:typeof data.code==='string'?data.code:undefined}) as ApiFailure;
 }
 throw new Error('Google no inició la verificación. Intentá nuevamente.');
}

function cleanOAuthQuery(){
 const url=new URL(window.location.href);
 url.searchParams.delete('recentAuthTicket');url.searchParams.delete('error');
 window.history.replaceState(window.history.state,'',`${url.pathname}${url.search}${url.hash}`);
}

function formatExpiry(value:string){
 const date=new Date(value);
 return Number.isNaN(date.getTime())?'por unos minutos':`hasta ${new Intl.DateTimeFormat('es-PY',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date)}`;
}

/* Superficies v2 de la zona de peligro (una sola pieza por tipo). */
const FLOW='grid min-w-0 gap-3.5 rounded-xl border border-bad/25 bg-ink-800 p-4 shadow-xs';
const DETAILS='grid gap-2.5 rounded-lg border border-ink-600 bg-ink-700 p-3';
const STEP='flex items-start gap-2.5 pt-1';
const STEP_MARK='grid size-6 shrink-0 place-items-center rounded-full bg-bad/15 text-[11px] font-extrabold text-bad';
const INPUT='h-11 w-full min-w-0 rounded-lg border border-ink-500 bg-ink-800 px-3 text-base text-fore outline-none md:text-sm';
const FIELD_ACTION='secondary max-md:w-full';
const NOTICE='m-0 rounded-lg border border-ink-600 bg-ink-700 px-3 py-2.5 text-xs leading-5 text-mute';
const ALERT='m-0 rounded-lg border-l-[3px] border-bad bg-bad/10 px-3 py-2.5 text-xs leading-5 text-fore';

function AccountConsequences({preview}:{preview:AccountDeletionPreview}){
 const account=preview.account;
 return <div className={DETAILS}>
  <h4 className="text-[13px] font-semibold text-fore">Qué pasará con tu cuenta</h4>
  <ul className="grid list-disc gap-1.5 pl-5 text-xs leading-[1.45] text-mute">
   <li>{account.willBeAnonymized?'Tu identidad personal será anonimizada.':'Tu identidad personal no será anonimizada.'}</li>
   <li>{account.sessionsWillBeRevoked?'Todas tus sesiones serán cerradas.':'Tus sesiones no serán cerradas.'}</li>
   <li>{account.tenantDataWillBeRetained?'Los datos de las empresas se conservarán.':'Los datos de las empresas no se conservarán.'}</li>
  </ul>
  <h4 className="text-[13px] font-semibold text-fore">Impacto en tus empresas</h4>
  <div className="grid gap-2" role="list">
   {preview.memberships.map(membership=><article className="grid gap-0.5 rounded-lg border border-ink-600 bg-ink-800 p-2.5" key={membership.organizationId} role="listitem">
    <strong className="text-xs text-fore">{membership.name}</strong>
    <p className="m-0 text-[11px] leading-[1.45] text-mute [overflow-wrap:anywhere]">{roleLabels[membership.role]||membership.role} · {membership.activeMemberCount} miembros activos · {membership.activeOwnerCount} dueños activos</p>
    <p className="m-0 text-[11px] leading-[1.45] text-mute [overflow-wrap:anywhere]">{consequenceLabels[membership.consequence]||membership.consequence}</p>
   </article>)}
   {!preview.memberships.length&&<p className="m-0 text-xs text-mute">La vista previa no informó accesos activos a empresas.</p>}
  </div>
  {!!preview.blockers.length&&<div className="grid gap-1.5 rounded-lg border-l-[3px] border-bad bg-bad/10 p-2.5 text-fore" role="alert"><strong className="text-xs">No se puede continuar</strong><ul className="grid list-disc gap-1.5 pl-5 text-xs leading-[1.45]">{preview.blockers.map(blocker=><li key={`${blocker.code}:${blocker.organizationId}`}><b>{blocker.organizationName}</b>: {blocker.message}</li>)}</ul></div>}
 </div>;
}

function OrganizationConsequences({preview}:{preview:OrganizationDeletionPreview}){
 const consequences=preview.consequences;
 return <div className={DETAILS}>
  <h4 className="text-[13px] font-semibold text-fore">{preview.organization.name}</h4>
  <p className="m-0 text-xs leading-[1.45] text-mute">{preview.organization.activeMemberCount} miembros activos según la vista previa del servidor.</p>
  <ul className="grid list-disc gap-1.5 pl-5 text-xs leading-[1.45] text-mute">
   <li>{consequences.organizationWillBeSoftDeleted?'La empresa se desactivará; sus datos quedarán inaccesibles.':'La empresa no será desactivada.'}</li>
   <li>{consequences.allMemberAccessWillBeDeactivated?'Se desactivará el acceso de todos sus miembros.':'No se desactivará el acceso de todos sus miembros.'}</li>
   <li>{consequences.organizationSessionsWillBeRevoked?'Se cerrarán las sesiones vinculadas a esta empresa.':'No se cerrarán las sesiones vinculadas a esta empresa.'}</li>
   <li>{consequences.tenantDataWillBeRetained?'Los datos de la empresa se conservarán.':'Los datos de la empresa no se conservarán.'}</li>
  </ul>
 </div>;
}

function DeletionFlow({kind,organizationId,organizationName,resume,onSuccess}:{kind:'account'|'organization';organizationId:string;organizationName:string;resume:ResumeState|null;onSuccess:()=>void|Promise<void>}){
 const action:DeletionAction=kind==='account'?'account.delete':'organization.delete';
 const headingId=useId(),passwordId=useId(),emailCodeId=useId(),confirmationId=useId();
 const previewFocus=useRef<HTMLDivElement>(null),passwordFocus=useRef<HTMLInputElement>(null),emailCodeFocus=useRef<HTMLInputElement>(null),googleFocus=useRef<HTMLButtonElement>(null),confirmationFocus=useRef<HTMLInputElement>(null),refreshFocus=useRef<HTMLButtonElement>(null);
 const focusReauthAfterClear=useRef(false);
 const [preview,setPreview]=useState<DeletionPreview|null>(null),[auth,setAuth]=useState<RecentAuthProof|null>(null);
 const [password,setPassword]=useState(''),[emailCode,setEmailCode]=useState(''),[emailRequested,setEmailRequested]=useState(false),[confirmation,setConfirmation]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [busy,setBusy]=useState<'preview'|'auth'|'delete'|''>(''),[googleOnly,setGoogleOnly]=useState(false),[stale,setStale]=useState(false);
 const [confirmationWait,setConfirmationWait]=useState(0);
 const expectedOrganizationId=kind==='organization'?organizationId:null;
 const matches=(candidate:{action:DeletionAction;organizationId:string|null})=>candidate.action===action&&sameScope(candidate.organizationId,expectedOrganizationId);

 useEffect(()=>{
  if(!resume||!matches(resume.preview)||!matches(resume.auth))return;
  setPreview(resume.preview);acceptRecentAuth(resume.auth);setGoogleOnly(resume.auth.method==='google');setStale(false);setError('');
  requestAnimationFrame(()=>confirmationFocus.current?.focus());
 },[resume,action,organizationId]);

 useEffect(()=>{
  if(auth||!focusReauthAfterClear.current||!preview||stale)return;
  focusReauthAfterClear.current=false;
  requestAnimationFrame(()=>{(googleOnly?googleFocus.current:emailRequested?emailCodeFocus.current:passwordFocus.current)?.focus();});
 },[auth,googleOnly,emailRequested,preview,stale]);

 useEffect(()=>{
  if(!preview||stale)return;
  const delay=new Date(preview.expiresAt).getTime()-Date.now();
  const expire=()=>{focusReauthAfterClear.current=false;clearRecentAuth();setStale(true);setError('La vista previa venció. Actualizala antes de continuar.');requestAnimationFrame(()=>refreshFocus.current?.focus());};
  if(delay<=0){expire();return;}
  if(delay>2_147_483_647)return;
  const timer=window.setTimeout(expire,delay);
  return()=>window.clearTimeout(timer);
 },[preview,stale]);

 useEffect(()=>{
  if(!auth)return;
  const delay=new Date(auth.expiresAt).getTime()-Date.now();
  const expire=()=>{focusReauthAfterClear.current=true;clearRecentAuth();setError('La confirmación de identidad venció. Volvé a confirmar tu identidad.');};
  if(delay<=0){expire();return;}
  if(delay>2_147_483_647)return;
  const timer=window.setTimeout(expire,delay);
  return()=>window.clearTimeout(timer);
 },[auth]);

 useEffect(()=>{
  if(!auth)return;
  const timer=window.setInterval(()=>setConfirmationWait(seconds=>seconds>1?seconds-1:0),1000);
  return()=>window.clearInterval(timer);
 },[auth]);

 function clearRecentAuth(){setAuth(null);setPassword('');setEmailCode('');setEmailRequested(false);setConfirmation('');setConfirmationWait(0);}
 function authMethodLabel(method:RecentAuthProof['method']){return method==='google'?'Google':method==='email'?'código enviado a tu correo':'contraseña';}
 function acceptRecentAuth(result:RecentAuthProof){setAuth(result);setPassword('');setEmailCode('');setEmailRequested(false);setConfirmation('');setConfirmationWait(10);setNotice(`Identidad confirmada con ${authMethodLabel(result.method)} ${formatExpiry(result.expiresAt)}.`);}
 function resetForPreview(){focusReauthAfterClear.current=false;setPreview(null);clearRecentAuth();setGoogleOnly(false);setStale(false);setNotice('');}
 function handleFailure(cause:unknown){
  const failure=cause as ApiFailure;
  if(failure.code&&previewRecoveryCodes.has(failure.code)){focusReauthAfterClear.current=false;clearRecentAuth();setStale(true);setError('La vista previa venció o cambió. Actualizala antes de continuar.');requestAnimationFrame(()=>refreshFocus.current?.focus());return;}
  if(failure.code==='RECENT_AUTH_REQUIRED'||failure.code==='RECENT_AUTH_INVALID'||failure.code==='EMAIL_REAUTH_INVALID'){focusReauthAfterClear.current=true;clearRecentAuth();setError('La confirmación de identidad venció. Volvé a confirmar tu identidad.');return;}
  setError(failure instanceof Error?failure.message:'No se pudo completar la operación.');
 }
 async function fetchPreview(){
  setBusy('preview');setError('');resetForPreview();
  try{
   const path=kind==='account'?'/api/auth/account/deletion/preview':`/api/auth/organizations/${encodeURIComponent(organizationId)}/deletion/preview`;
   const data=await deletionRequest<{preview:unknown}>(path,{});
   if(!validDeletionPreview(data.preview)||!matches(data.preview))throw Object.assign(new Error('La vista previa no corresponde a esta operación.'),{code:'DELETION_SCOPE_MISMATCH'});
   setPreview(data.preview);requestAnimationFrame(()=>previewFocus.current?.focus());
  }catch(cause){handleFailure(cause);}finally{setBusy('');}
 }
 async function confirmPassword(event:React.FormEvent){
  event.preventDefault();if(!preview||!preview.executable)return;
  setBusy('auth');setError('');setNotice('');
  try{
   const result=await deletionRequest<unknown>('/api/auth/account/recent-auth/password',{previewId:preview.id,password});
   if(!validRecentAuthProof(result)||!matches(result))throw Object.assign(new Error('La confirmación no corresponde a esta operación.'),{code:'DELETION_SCOPE_MISMATCH'});
   acceptRecentAuth(result);requestAnimationFrame(()=>confirmationFocus.current?.focus());
  }catch(cause){
   setPassword('');const failure=cause as ApiFailure;
   if(failure.code==='PASSWORD_REAUTH_UNAVAILABLE'){clearRecentAuth();setGoogleOnly(true);setError('Esta cuenta usa Google sin contraseña. Confirmá tu identidad con Google o solicitá un código por correo para continuar.');}
   else handleFailure(cause);
  }finally{setBusy('');}
 }
 async function startGoogle(){
  if(!preview||!preview.executable)return;
  setBusy('auth');setError('');
  const startPath=`/api/auth/account/recent-auth/google/start?previewId=${encodeURIComponent(preview.id)}`;
  try{
   await preflightGoogleStart(startPath);
   try{sessionStorage.setItem(DELETION_PREVIEW_STORAGE_KEY,JSON.stringify({preview}));}
   catch{throw new Error('No pudimos conservar esta vista previa durante la verificación. Habilitá el almacenamiento de sesión e intentá nuevamente.');}
   window.location.assign(`/core-api${startPath}`);
  }catch(cause){handleFailure(cause);}finally{setBusy('');}
 }
 async function requestEmailCode(){
  if(!preview||!preview.executable)return;
  setBusy('auth');setError('');setNotice('');clearRecentAuth();
  try{
   await deletionRequest('/api/auth/account/recent-auth/email/request',{previewId:preview.id});
   setEmailRequested(true);setNotice('Enviamos un código de verificación a tu correo.');requestAnimationFrame(()=>emailCodeFocus.current?.focus());
  }catch(cause){handleFailure(cause);}finally{setBusy('');}
 }
 async function verifyEmailCode(event:React.FormEvent){
  event.preventDefault();if(!preview||!preview.executable||!emailCode)return;
  setBusy('auth');setError('');setNotice('');
  try{
   const result=await deletionRequest<unknown>('/api/auth/account/recent-auth/email/complete',{previewId:preview.id,code:emailCode});
   if(!validRecentAuthProof(result)||!matches(result))throw Object.assign(new Error('La confirmación no corresponde a esta operación.'),{code:'DELETION_SCOPE_MISMATCH'});
   acceptRecentAuth(result);requestAnimationFrame(()=>confirmationFocus.current?.focus());
  }catch(cause){setEmailCode('');handleFailure(cause);}finally{setBusy('');}
 }
 async function execute(event:React.FormEvent){
  event.preventDefault();if(!preview||!auth||confirmationWait>0||!preview.executable||confirmation!==DELETION_CONFIRMATION||!matches(auth))return;
  setBusy('delete');setError('');
  try{
   const path=kind==='account'?'/api/auth/account/deletion':`/api/auth/organizations/${encodeURIComponent(organizationId)}/deletion`;
   await deletionRequest(path,{previewId:preview.id,recentAuthProof:auth.proof,confirmation:DELETION_CONFIRMATION});
   try{sessionStorage.removeItem(DELETION_PREVIEW_STORAGE_KEY);}catch{/* Best-effort cleanup. */}
   setNotice(kind==='account'?'Tu cuenta fue eliminada y tu acceso se cerró.':'La empresa fue desactivada y sus datos ya no son accesibles.');
   await onSuccess();
  }catch(cause){handleFailure(cause);}finally{setBusy('');}
 }
 const title=kind==='account'?'Eliminar mi cuenta':'Eliminar esta empresa';
 return <article className={FLOW} aria-labelledby={headingId} aria-busy={Boolean(busy)}>
  <div className="flex items-start gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-bad/15 text-bad" aria-hidden="true">{kind==='account'?<UserRoundX size={20}/>:<Building2 size={20}/>}</span><div><h3 id={headingId} className="text-[15px] font-semibold text-fore">{title}</h3><p className="mt-1 text-xs leading-5 text-mute">{kind==='account'?'Esta acción es irreversible: perderás tu acceso personal y se cerrarán todas tus sesiones.':'Esta acción es irreversible: la empresa se desactivará, todos perderán acceso y sus datos quedarán inaccesibles.'}</p></div></div>
  {!preview&&<button type="button" className={`secondary deletion-review justify-self-start max-md:w-full ${busy==='preview'?'':''}`} disabled={busy==='preview'} onClick={()=>void fetchPreview()}>{busy==='preview'?'Preparando vista previa…':kind==='account'?'Revisar eliminación de mi cuenta':`Revisar eliminación de ${organizationName}`}</button>}
  {preview&&<div className="grid min-w-0 gap-3 outline-none" ref={previewFocus} tabIndex={-1}>
   <div className={STEP}><span className={STEP_MARK}>1</span><div className="grid gap-0.5"><strong className="text-[13px] text-fore">Revisá la vista previa del servidor</strong><small className="text-[11px] leading-[1.45] text-mute">Válida {formatExpiry(preview.expiresAt)}.</small></div></div>
   {preview.action==='account.delete'?<AccountConsequences preview={preview}/>:<OrganizationConsequences preview={preview}/>}
   {stale&&<button ref={refreshFocus} type="button" className={`secondary justify-self-start max-md:w-full`} disabled={busy==='preview'} onClick={()=>void fetchPreview()}>{busy==='preview'?'Actualizando…':'Actualizar vista previa'}</button>}
   {preview.executable&&!stale&&<>
    <div className={STEP}><span className={STEP_MARK}>2</span><div className="grid gap-0.5"><strong className="text-[13px] text-fore">Confirmá tu identidad</strong><small className="text-[11px] leading-[1.45] text-mute">La verificación queda vinculada únicamente a esta vista previa.</small></div></div>
    {!auth&&!googleOnly&&<form className="deletion-auth-form" onSubmit={confirmPassword}><div className="grid gap-2"><label htmlFor={passwordId} className="block text-xs font-bold text-fore">Contraseña actual</label><div className="deletion-inline-field grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 max-md:grid-cols-1"><input ref={passwordFocus} id={passwordId} type="password" autoComplete="current-password" className={INPUT} value={password} disabled={busy==='auth'} onChange={event=>setPassword(event.target.value)} required/><button className={FIELD_ACTION} disabled={busy==='auth'||!password}>{busy==='auth'?'Verificando…':'Verificar contraseña'}</button></div></div></form>}
    {!auth&&googleOnly&&<button ref={googleFocus} type="button" className="deletion-google secondary inline-flex items-center justify-center gap-2 justify-self-start max-md:w-full" disabled={Boolean(busy)} onClick={()=>void startGoogle()}><KeyRound size={17} aria-hidden="true"/>{busy==='auth'?'Iniciando Google…':'Confirmar con Google'}</button>}
    {!auth&&!emailRequested&&<button type="button" className={`secondary deletion-email-request justify-self-start max-md:w-full`} disabled={Boolean(busy)} onClick={()=>void requestEmailCode()}>{busy==='auth'?'Enviando código…':'Recibir código por correo'}</button>}
    {!auth&&emailRequested&&<form className="deletion-auth-form deletion-email-form" onSubmit={verifyEmailCode}><div className="grid gap-2"><label htmlFor={emailCodeId} className="block text-xs font-bold text-fore">Código enviado a tu correo</label><div className="deletion-inline-field grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 max-md:grid-cols-1"><input ref={emailCodeFocus} id={emailCodeId} inputMode="numeric" autoComplete="one-time-code" className={INPUT} value={emailCode} disabled={busy==='auth'} onChange={event=>setEmailCode(event.target.value)} required/><button className={FIELD_ACTION} disabled={busy==='auth'||!emailCode}>{busy==='auth'?'Verificando…':'Verificar código'}</button></div><button type="button" className="text-button" disabled={busy==='auth'} onClick={()=>void requestEmailCode()}><Send size={14}/>Reenviar código</button></div></form>}
    {auth&&<><p className="flex items-center gap-2 rounded-lg bg-ok/10 px-3 py-2.5 text-xs text-ok" role="status"><KeyRound size={16} aria-hidden="true"/>Identidad confirmada con {authMethodLabel(auth.method)}.</p>{confirmationWait>0&&<p className="m-0 rounded-lg border border-ink-600 bg-ink-700 px-3 py-2.5 text-xs tabular-nums text-mute" role="timer" aria-label={`Cuenta regresiva de seguridad: ${confirmationWait} segundos`}><span aria-hidden="true">Por seguridad, esperá {confirmationWait} s para eliminar.</span><span className="sr-only">Podrás confirmar la eliminación en {confirmationWait} segundos.</span></p>}</>}
    <div className={STEP}><span className={STEP_MARK}>3</span><div className="grid gap-0.5"><strong className="text-[13px] text-fore">Escribí la confirmación exacta</strong><small className="text-[11px] leading-[1.45] text-mute">El botón final solo se habilita cuando el texto coincide.</small></div></div>
    <form className="deletion-confirm-form" onSubmit={execute}>
     <div className="grid gap-2">
      <label htmlFor={confirmationId} className="block text-xs font-bold text-fore">Escribí <strong>{DELETION_CONFIRMATION}</strong></label>
      <input ref={confirmationFocus} id={confirmationId} className={INPUT} value={confirmation} disabled={!auth||busy==='delete'} aria-describedby={`${confirmationId}-help`} autoComplete="off" onChange={event=>setConfirmation(event.target.value)} required/>
      <small id={`${confirmationId}-help`} className="block text-[11px] text-mute">Se respetan mayúsculas, espacios y acentos.</small>
      <button className="danger deletion-execute inline-flex min-h-11 items-center justify-center gap-2 justify-self-start rounded-lg bg-bad px-3.5 text-[13px] font-bold text-onbrand disabled:cursor-not-allowed disabled:opacity-50 max-md:w-full" disabled={!auth||confirmationWait>0||busy==='delete'||confirmation!==DELETION_CONFIRMATION}><Trash2 size={17} aria-hidden="true"/>{busy==='delete'?'Eliminando…':title}</button>
     </div>
    </form>
   </>}
  </div>}
  {notice&&<p className={NOTICE} role="status">{notice}</p>}
  {error&&<p className={ALERT} role="alert">{error}</p>}
 </article>;
}

function DemoExitSimulation({onExit}:{onExit:()=>void|Promise<void>}){
 return <article className={`${FLOW} deletion-demo-simulation`} aria-labelledby="demo-exit-title">
  <div className="flex items-start gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-warn/15 text-warn" aria-hidden="true"><ShieldAlert size={20}/></span><div><h3 id="demo-exit-title" className="text-[15px] font-semibold text-fore">Salir del Demo</h3><p className="mt-1 text-xs leading-5 text-mute">El Demo no elimina cuentas ni empresas. Salir borra el estado local, cierra la sesión de simulación y vuelve al inicio público.</p></div></div>
  <button type="button" className="secondary justify-self-start max-md:w-full" onClick={()=>void onExit()}>Salir y reiniciar simulación</button>
 </article>;
}

export function DeletionDangerZone({organizationId,organizationName,onAccountDeleted,onOrganizationDeleted,demo=false,onDemoExit=async()=>undefined}:{organizationId:string;organizationName:string;onAccountDeleted:()=>void|Promise<void>;onOrganizationDeleted:()=>void|Promise<void>;demo?:boolean;onDemoExit?:()=>void|Promise<void>}){
 const [resume,setResume]=useState<ResumeState|null>(null),[resumeBusy,setResumeBusy]=useState(false),[resumeError,setResumeError]=useState('');
 useEffect(()=>{
  if(demo)return;
  const query=new URLSearchParams(window.location.search),ticket=query.get('recentAuthTicket'),oauthError=query.get('error');
  if(!ticket&&!oauthError)return;
  cleanOAuthQuery();
  if(oauthError){try{sessionStorage.removeItem(DELETION_PREVIEW_STORAGE_KEY);}catch{/* Best-effort cleanup. */}setResumeError(oauthError);return;}
  let preview:DeletionPreview|null=null;
  try{const stored=JSON.parse(sessionStorage.getItem(DELETION_PREVIEW_STORAGE_KEY)||'null') as {preview?:unknown}|null;sessionStorage.removeItem(DELETION_PREVIEW_STORAGE_KEY);if(stored&&validDeletionPreview(stored.preview))preview=stored.preview;}
  catch{try{sessionStorage.removeItem(DELETION_PREVIEW_STORAGE_KEY);}catch{/* Best-effort cleanup. */}}
  if(!preview||new Date(preview.expiresAt).getTime()<=Date.now()){setResumeError('La vista previa guardada venció o no está disponible. Generá una nueva para continuar.');return;}
  if(preview.action==='organization.delete'&&!sameScope(preview.organizationId,organizationId)){setResumeError('La vista previa pertenece a otra empresa. Generá una nueva para continuar.');return;}
  let active=true;setResumeBusy(true);setResumeError('');
  void deletionRequest<unknown>('/api/auth/account/recent-auth/google/complete',{ticket}).then(auth=>{
   if(!active)return;
   if(!validRecentAuthProof(auth)||auth.action!==preview!.action||!sameScope(auth.organizationId,preview!.organizationId)){setResumeError('La verificación de Google no corresponde a esta vista previa. Generá una nueva para continuar.');return;}
   setResume({preview:preview!,auth});
  }).catch(cause=>{if(active)setResumeError(cause instanceof Error?cause.message:'No se pudo completar la verificación con Google.');}).finally(()=>{if(active)setResumeBusy(false);});
  return()=>{active=false;};
 },[demo,organizationId]);
 return <section className="deletion-danger-zone grid gap-4 rounded-xl border border-bad/30 bg-ink-800 p-4" aria-labelledby="deletion-danger-title" aria-busy={resumeBusy}>
  <div className="flex items-start gap-3"><span className="deletion-zone-heading grid size-10 shrink-0 place-items-center rounded-lg border border-bad/30 bg-bad/10 text-bad" aria-hidden="true"><ShieldAlert size={18}/></span><div><h2 id="deletion-danger-title" className="text-[17px] font-semibold tracking-tight text-fore">{demo?'Simulación Demo':'Zona de peligro'}</h2><p className="mt-1 text-xs leading-5 text-mute">{demo?'El Demo solo permite salir o reiniciar la simulación; no genera pruebas ni acciones de eliminación.':'Estas acciones son irreversibles: perderás acceso. Scale OS prepara una vista previa del servidor antes de pedir tu identidad y la confirmación final.'}</p></div></div>
  {demo?<div className="deletion-flow-grid grid items-start gap-3 lg:grid-cols-2"><DemoExitSimulation onExit={onDemoExit}/></div>:<>
   {resumeBusy&&<p className={NOTICE} role="status">Completando la verificación con Google…</p>}
   {resumeError&&<p className={ALERT} role="alert">{resumeError}</p>}
   <div className="deletion-flow-grid grid items-start gap-3 lg:grid-cols-2">
    <DeletionFlow kind="organization" organizationId={organizationId} organizationName={organizationName} resume={resume} onSuccess={onOrganizationDeleted}/>
    <DeletionFlow kind="account" organizationId={organizationId} organizationName={organizationName} resume={resume} onSuccess={onAccountDeleted}/>
   </div>
  </>}
 </section>;
}
