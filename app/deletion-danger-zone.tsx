'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {Building2,KeyRound,ShieldAlert,Trash2,UserRoundX} from 'lucide-react';
import './deletion-danger-zone.css';

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
 |'GOOGLE_REAUTH_INVALID';
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
type RecentAuthProof={proof:string;method:'password'|'google';action:DeletionAction;organizationId:string|null;expiresAt:string};
type ResumeState={preview:DeletionPreview;auth:RecentAuthProof};
type ApiFailure=Error&{code?:DeletionErrorCode;status?:number};

export const DELETION_PREVIEW_STORAGE_KEY='scale:pending-deletion-preview';
const previewRecoveryCodes=new Set<DeletionErrorCode>(['DELETION_PREVIEW_STALE','DELETION_PREVIEW_INVALID','DELETION_SCOPE_MISMATCH']);
const consequenceLabels:Record<string,string>={
 organization_soft_delete:'La empresa se eliminará de forma lógica porque sos su único miembro activo.',
 membership_deactivation:'Tu acceso se desactivará; la empresa y sus datos seguirán disponibles para los demás miembros.',
};
const roleLabels:Record<string,string>={owner:'Dueño',admin:'Administración',management:'Gerencia',manager:'Gerencia',finance:'Finanzas',sales:'Comercial',editor:'Edición',production:'Producción',viewer:'Lectura'};
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
 return isRecord(value)&&typeof value.proof==='string'&&(value.method==='password'||value.method==='google')&&(value.action==='account.delete'||value.action==='organization.delete')&&
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
 return Number.isNaN(date.getTime())?'por unos minutos':`hasta ${new Intl.DateTimeFormat('es-PY',{timeStyle:'short'}).format(date)}`;
}

function AccountConsequences({preview}:{preview:AccountDeletionPreview}){
 const account=preview.account;
 return <div className="deletion-preview-details">
  <h4>Qué pasará con tu cuenta</h4>
  <ul className="deletion-consequence-list">
   <li>{account.willBeAnonymized?'Tu identidad personal será anonimizada.':'Tu identidad personal no será anonimizada.'}</li>
   <li>{account.sessionsWillBeRevoked?'Todas tus sesiones serán cerradas.':'Tus sesiones no serán cerradas.'}</li>
   <li>{account.tenantDataWillBeRetained?'Los datos de las empresas se conservarán.':'Los datos de las empresas no se conservarán.'}</li>
  </ul>
  <h4>Impacto en tus empresas</h4>
  <div className="deletion-memberships" role="list">
   {preview.memberships.map(membership=><article key={membership.organizationId} role="listitem">
    <strong>{membership.name}</strong>
    <p>{roleLabels[membership.role]||membership.role} · {membership.activeMemberCount} miembros activos · {membership.activeOwnerCount} dueños activos</p>
    <p>{consequenceLabels[membership.consequence]||membership.consequence}</p>
   </article>)}
   {!preview.memberships.length&&<p>La vista previa no informó accesos activos a empresas.</p>}
  </div>
  {!!preview.blockers.length&&<div className="deletion-blockers" role="alert"><strong>No se puede continuar</strong><ul>{preview.blockers.map(blocker=><li key={`${blocker.code}:${blocker.organizationId}`}><b>{blocker.organizationName}</b>: {blocker.message}</li>)}</ul></div>}
 </div>;
}

function OrganizationConsequences({preview}:{preview:OrganizationDeletionPreview}){
 const consequences=preview.consequences;
 return <div className="deletion-preview-details">
  <h4>{preview.organization.name}</h4>
  <p>{preview.organization.activeMemberCount} miembros activos según la vista previa del servidor.</p>
  <ul className="deletion-consequence-list">
   <li>{consequences.organizationWillBeSoftDeleted?'La empresa será eliminada de forma lógica.':'La empresa no será eliminada de forma lógica.'}</li>
   <li>{consequences.allMemberAccessWillBeDeactivated?'Se desactivará el acceso de todos sus miembros.':'No se desactivará el acceso de todos sus miembros.'}</li>
   <li>{consequences.organizationSessionsWillBeRevoked?'Se cerrarán las sesiones vinculadas a esta empresa.':'No se cerrarán las sesiones vinculadas a esta empresa.'}</li>
   <li>{consequences.tenantDataWillBeRetained?'Los datos de la empresa se conservarán.':'Los datos de la empresa no se conservarán.'}</li>
  </ul>
 </div>;
}

function DeletionFlow({kind,organizationId,organizationName,resume,onSuccess}:{kind:'account'|'organization';organizationId:string;organizationName:string;resume:ResumeState|null;onSuccess:()=>void|Promise<void>}){
 const action:DeletionAction=kind==='account'?'account.delete':'organization.delete';
 const headingId=useId(),passwordId=useId(),confirmationId=useId();
 const previewFocus=useRef<HTMLDivElement>(null),passwordFocus=useRef<HTMLInputElement>(null),googleFocus=useRef<HTMLButtonElement>(null),confirmationFocus=useRef<HTMLInputElement>(null),refreshFocus=useRef<HTMLButtonElement>(null);
 const focusReauthAfterClear=useRef(false);
 const [preview,setPreview]=useState<DeletionPreview|null>(null),[auth,setAuth]=useState<RecentAuthProof|null>(null);
 const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [busy,setBusy]=useState<'preview'|'auth'|'delete'|''>(''),[googleOnly,setGoogleOnly]=useState(false),[stale,setStale]=useState(false);
 const expectedOrganizationId=kind==='organization'?organizationId:null;
 const matches=(candidate:{action:DeletionAction;organizationId:string|null})=>candidate.action===action&&sameScope(candidate.organizationId,expectedOrganizationId);

 useEffect(()=>{
  if(!resume||!matches(resume.preview)||!matches(resume.auth))return;
  setPreview(resume.preview);setAuth(resume.auth);setGoogleOnly(resume.auth.method==='google');setStale(false);setError('');setNotice(`Identidad confirmada con ${resume.auth.method==='google'?'Google':'contraseña'} ${formatExpiry(resume.auth.expiresAt)}.`);
  requestAnimationFrame(()=>confirmationFocus.current?.focus());
 },[resume,action,organizationId]);

 useEffect(()=>{
  if(auth||!focusReauthAfterClear.current||!preview||stale)return;
  focusReauthAfterClear.current=false;
  requestAnimationFrame(()=>{(googleOnly?googleFocus.current:passwordFocus.current)?.focus();});
 },[auth,googleOnly,preview,stale]);

 useEffect(()=>{
  if(!preview||stale)return;
  const delay=new Date(preview.expiresAt).getTime()-Date.now();
  const expire=()=>{focusReauthAfterClear.current=false;setStale(true);setAuth(null);setPassword('');setConfirmation('');setError('La vista previa venció. Actualizala antes de continuar.');requestAnimationFrame(()=>refreshFocus.current?.focus());};
  if(delay<=0){expire();return;}
  if(delay>2_147_483_647)return;
  const timer=window.setTimeout(expire,delay);
  return()=>window.clearTimeout(timer);
 },[preview,stale]);

 useEffect(()=>{
  if(!auth)return;
  const delay=new Date(auth.expiresAt).getTime()-Date.now();
  const expire=()=>{focusReauthAfterClear.current=true;setAuth(null);setConfirmation('');setError('La confirmación de identidad venció. Volvé a confirmar tu identidad.');};
  if(delay<=0){expire();return;}
  if(delay>2_147_483_647)return;
  const timer=window.setTimeout(expire,delay);
  return()=>window.clearTimeout(timer);
 },[auth]);

 function resetForPreview(){focusReauthAfterClear.current=false;setPreview(null);setAuth(null);setPassword('');setConfirmation('');setGoogleOnly(false);setStale(false);setNotice('');}
 function handleFailure(cause:unknown){
  const failure=cause as ApiFailure;
  if(failure.code&&previewRecoveryCodes.has(failure.code)){focusReauthAfterClear.current=false;setStale(true);setAuth(null);setPassword('');setConfirmation('');setError('La vista previa venció o cambió. Actualizala antes de continuar.');requestAnimationFrame(()=>refreshFocus.current?.focus());return;}
  if(failure.code==='RECENT_AUTH_REQUIRED'||failure.code==='RECENT_AUTH_INVALID'){focusReauthAfterClear.current=true;setAuth(null);setConfirmation('');setError('La confirmación de identidad venció. Volvé a confirmar tu identidad.');return;}
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
   setAuth(result);setPassword('');setNotice(`Identidad confirmada con contraseña ${formatExpiry(result.expiresAt)}.`);requestAnimationFrame(()=>confirmationFocus.current?.focus());
  }catch(cause){
   setPassword('');const failure=cause as ApiFailure;
   if(failure.code==='PASSWORD_REAUTH_UNAVAILABLE'){setGoogleOnly(true);setError('Esta cuenta usa Google. Confirmá tu identidad con Google para continuar.');}
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
 async function execute(event:React.FormEvent){
  event.preventDefault();if(!preview||!auth||!preview.executable||confirmation!==preview.confirmation||!matches(auth))return;
  setBusy('delete');setError('');
  try{
   const path=kind==='account'?'/api/auth/account/deletion':`/api/auth/organizations/${encodeURIComponent(organizationId)}/deletion`;
   await deletionRequest(path,{previewId:preview.id,recentAuthProof:auth.proof,confirmation});
   try{sessionStorage.removeItem(DELETION_PREVIEW_STORAGE_KEY);}catch{/* Best-effort cleanup. */}
   setNotice(kind==='account'?'Tu cuenta fue eliminada.':'La empresa fue eliminada.');
   await onSuccess();
  }catch(cause){handleFailure(cause);}finally{setBusy('');}
 }
 const title=kind==='account'?'Eliminar mi cuenta':'Eliminar esta empresa';
 return <article className="deletion-flow" aria-labelledby={headingId} aria-busy={Boolean(busy)}>
  <div className="deletion-flow-heading"><span aria-hidden="true">{kind==='account'?<UserRoundX size={20}/>:<Building2 size={20}/>}</span><div><h3 id={headingId}>{title}</h3><p>{kind==='account'?'Elimina tu acceso personal y cierra todas tus sesiones.':'Elimina la empresa abierta y desactiva el acceso de todos sus miembros.'}</p></div></div>
  {!preview&&<button type="button" className="secondary deletion-review" disabled={busy==='preview'} onClick={()=>void fetchPreview()}>{busy==='preview'?'Preparando vista previa…':kind==='account'?'Revisar eliminación de mi cuenta':`Revisar eliminación de ${organizationName}`}</button>}
  {preview&&<div className="deletion-progress" ref={previewFocus} tabIndex={-1}>
   <div className="deletion-step"><span>1</span><div><strong>Revisá la vista previa del servidor</strong><small>Válida {formatExpiry(preview.expiresAt)}.</small></div></div>
   {preview.action==='account.delete'?<AccountConsequences preview={preview}/>:<OrganizationConsequences preview={preview}/>}
   {stale&&<button ref={refreshFocus} type="button" className="secondary" disabled={busy==='preview'} onClick={()=>void fetchPreview()}>{busy==='preview'?'Actualizando…':'Actualizar vista previa'}</button>}
   {preview.executable&&!stale&&<>
    <div className="deletion-step"><span>2</span><div><strong>Confirmá tu identidad</strong><small>La verificación queda vinculada únicamente a esta vista previa.</small></div></div>
    {!auth&&!googleOnly&&<form className="deletion-auth-form" onSubmit={confirmPassword}><label htmlFor={passwordId}>Contraseña actual</label><div className="deletion-inline-field"><input ref={passwordFocus} id={passwordId} type="password" autoComplete="current-password" value={password} disabled={busy==='auth'} onChange={event=>setPassword(event.target.value)} required/><button className="secondary" disabled={busy==='auth'||!password}>{busy==='auth'?'Verificando…':'Verificar contraseña'}</button></div></form>}
    {!auth&&googleOnly&&<button ref={googleFocus} type="button" className="secondary deletion-google" disabled={Boolean(busy)} onClick={()=>void startGoogle()}><KeyRound size={17} aria-hidden="true"/>{busy==='auth'?'Iniciando Google…':'Confirmar con Google'}</button>}
    {auth&&<p className="deletion-auth-ok" role="status"><KeyRound size={16} aria-hidden="true"/>Identidad confirmada con {auth.method==='google'?'Google':'contraseña'}.</p>}
    <div className="deletion-step"><span>3</span><div><strong>Escribí la confirmación exacta</strong><small>El botón final solo se habilita cuando el texto coincide.</small></div></div>
    <form className="deletion-confirm-form" onSubmit={execute}>
     <label htmlFor={confirmationId}>Escribí <strong>{preview.confirmation}</strong></label>
     <input ref={confirmationFocus} id={confirmationId} value={confirmation} disabled={!auth||busy==='delete'} aria-describedby={`${confirmationId}-help`} autoComplete="off" onChange={event=>setConfirmation(event.target.value)} required/>
     <small id={`${confirmationId}-help`}>Se respetan mayúsculas, espacios y acentos.</small>
     <button className="danger deletion-execute" disabled={!auth||busy==='delete'||confirmation!==preview.confirmation}><Trash2 size={17} aria-hidden="true"/>{busy==='delete'?'Eliminando…':title}</button>
    </form>
   </>}
  </div>}
  {notice&&<p className="deletion-notice" role="status">{notice}</p>}
  {error&&<p className="deletion-error" role="alert">{error}</p>}
 </article>;
}

export function DeletionDangerZone({organizationId,organizationName,onAccountDeleted,onOrganizationDeleted}:{organizationId:string;organizationName:string;onAccountDeleted:()=>void|Promise<void>;onOrganizationDeleted:()=>void|Promise<void>}){
 const [resume,setResume]=useState<ResumeState|null>(null),[resumeBusy,setResumeBusy]=useState(false),[resumeError,setResumeError]=useState('');
 useEffect(()=>{
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
 },[organizationId]);
 return <section className="panel settings-card deletion-danger-zone" aria-labelledby="deletion-danger-title" aria-busy={resumeBusy}>
  <div className="settings-card-heading deletion-zone-heading"><span className="settings-card-icon" aria-hidden="true"><ShieldAlert size={18}/></span><div><h2 id="deletion-danger-title">Zona de peligro</h2><p>Estas acciones son permanentes. Scale OS siempre prepara una vista previa del servidor antes de pedir tu identidad y la confirmación final.</p></div></div>
  {resumeBusy&&<p className="deletion-resume" role="status">Completando la verificación con Google…</p>}
  {resumeError&&<p className="deletion-error" role="alert">{resumeError}</p>}
  <div className="deletion-flow-grid">
   <DeletionFlow kind="organization" organizationId={organizationId} organizationName={organizationName} resume={resume} onSuccess={onOrganizationDeleted}/>
   <DeletionFlow kind="account" organizationId={organizationId} organizationName={organizationName} resume={resume} onSuccess={onAccountDeleted}/>
  </div>
 </section>;
}
