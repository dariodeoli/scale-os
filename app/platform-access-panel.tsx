'use client';
import {useEffect,useState} from 'react';
import {platformApi} from './platform-admin-api';
import {Dialog} from './dialog';
import {ArrowUpRight,Building2,Eye,ShieldCheck,Trash2,Users} from 'lucide-react';
import './platform-access.css';

type PlatformUser={id:number;email:string;active_agencies:number;platform_admin:boolean;platform_role:'admin'|'viewer'|null};
type PlatformAgency={id:number;name:string;slug:string;active:boolean;active_users:number;subscription_status:string|null};
type UsersResponse={users:PlatformUser[];limit:number;offset:number};
type AgenciesResponse={agencies:PlatformAgency[];limit:number;offset:number};
type DeleteResponse={deleted:{userId:number;self:boolean;agencies:number[]}};
const roleLabels:Record<string,string>={admin:'Admin global',viewer:'Solo lectura'};

export function PlatformAccessPanel({currentUserId,platformRole}:{currentUserId:string;platformRole:string|null}){
 const [users,setUsers]=useState<PlatformUser[]|null>(null),[agencies,setAgencies]=useState<PlatformAgency[]|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [confirming,setConfirming]=useState<{kind:'user';person:PlatformUser}|{kind:'agency';agency:PlatformAgency}|null>(null),[typed,setTyped]=useState(''),[confirmPassword,setConfirmPassword]=useState('');
 const writable=platformRole==='admin';
 async function load(){setBusy(true);setError('');try{const [userData,agencyData]=await Promise.all([platformApi<UsersResponse>('/api/platform/users?limit=100'),platformApi<AgenciesResponse>('/api/platform/agencies?limit=100')]);setUsers(userData.users);setAgencies(agencyData.agencies);}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo cargar la administración global.');}finally{setBusy(false);}}
 useEffect(()=>{void load();},[]);
 async function setAccess(target:PlatformUser,platform_access:'admin'|'viewer'|'none'){setBusy(true);setError('');setNotice('');try{await platformApi(`/api/platform/users/${target.id}`,{method:'PATCH',body:JSON.stringify({platform_access})});setNotice(`${target.email}: acceso global actualizado.`);await load();}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo actualizar el acceso global.');}finally{setBusy(false);}}
 function openDelete(target:{kind:'user';person:PlatformUser}|{kind:'agency';agency:PlatformAgency}){setConfirming(target);setTyped('');}
 async function remove(){if(busy||!confirming)return;const targetLabel=confirming.kind==='user'?confirming.person.email:confirming.agency.name;if(typed!==targetLabel)return;
  if(!confirmPassword){setError('Ingresá tu contraseña actual para confirmar la eliminación.');return;}
  setBusy(true);setError('');setNotice('');
  const action=confirming.kind==='user'?'platform.user.delete':'platform.agency.delete';
  const targetId=confirming.kind==='user'?confirming.person.id:confirming.agency.id;
  let proofPayload:{previewId:string;confirmation:string;recentAuthProof:string};
  try{
   const preview=await platformApi<{preview:{id:string}}>('/api/platform/destructive/preview',{method:'POST',body:JSON.stringify({action,targetId})});
   const auth=await platformApi<{proof:string}>('/api/auth/account/recent-auth/password',{method:'POST',body:JSON.stringify({previewId:preview.preview.id,password:confirmPassword})});
   proofPayload={previewId:preview.preview.id,confirmation:typed,recentAuthProof:auth.proof};
  }catch(cause){
   const code=(cause as {code?:string}).code;
   setError(code==='PASSWORD_REAUTH_FAILED'?'No pudimos confirmar tu contraseña. Revisala y volvé a intentar.':code==='PASSWORD_REAUTH_UNAVAILABLE'?'Esta cuenta confirma su identidad con Google. Completá la verificación desde la zona de eliminación de tu cuenta.':cause instanceof Error?cause.message:'No se pudo confirmar tu identidad.');
   setBusy(false);return;
  }
  try{
  if(confirming.kind==='user'){
   const result=await platformApi<DeleteResponse>(`/api/platform/users/${confirming.person.id}`,{method:'DELETE',body:JSON.stringify(proofPayload)});
   if(result.deleted.self){setConfirming(null);setTyped('');setNotice('Tu cuenta fue eliminada. La sesión se cerrará.');if(typeof window!=='undefined')window.setTimeout(()=>window.location.reload(),2500);return;}
   setNotice(`Usuario eliminado${result.deleted.agencies.length?` junto con ${result.deleted.agencies.length} agencia(s) completa(s)`:''}.`);
  }else{
   await platformApi(`/api/platform/agencies/${confirming.agency.id}`,{method:'DELETE',body:JSON.stringify(proofPayload)});
   setNotice(`Agencia ${confirming.agency.name} eliminada.`);
  }
  setConfirming(null);setTyped('');setConfirmPassword('');await load();
 }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo completar la eliminación.');}finally{setBusy(false);}}
 const selfRow=(person:PlatformUser)=>String(person.id)===currentUserId;
 const adminCount=users?.filter(person=>person.platform_role==='admin').length??0;
 const viewerCount=users?.filter(person=>person.platform_role==='viewer').length??0;
 return <section className="panel platform-access" aria-busy={busy}>
  <div className="panel-heading"><div><p className="eyebrow">SCALE OS</p><h2>Administración global</h2></div><a className="text-button" href="https://admin.scaleparaguay.com/" target="_blank" rel="noreferrer">Panel completo<ArrowUpRight size={14}/></a></div>
  <p className="form-note">{writable?'Gestioná quién administra Scale OS, quién solo puede ver y qué cuentas y agencias se eliminan. Cada cambio queda auditado.':'Solo lectura: podés consultar la administración global, no modificarla.'}</p>
  {error&&<p className="error" role="alert">{error}{busy?null:<button type="button" className="text-button" onClick={()=>void load()}>Reintentar</button>}</p>}{notice&&<p role="status">{notice}</p>}
  <div className="kpi-strip">
   <article className="kpi-card"><span><Users size={14}/>Usuarios</span><strong>{users?users.length:'—'}</strong></article>
   <article className="kpi-card"><span><ShieldCheck size={14}/>Admins globales</span><strong>{users?adminCount:'—'}</strong></article>
   <article className="kpi-card"><span><Eye size={14}/>Solo lectura</span><strong>{users?viewerCount:'—'}</strong></article>
   <article className="kpi-card"><span><Building2 size={14}/>Agencias</span><strong>{agencies?agencies.length:'—'}</strong></article>
  </div>
  <h3>Usuarios</h3>
  {!users?<p role="status">Cargando usuarios…</p>:users.length?<ul className="platform-access-list"><li className="platform-access-head" aria-hidden="true"><span>Usuario</span><span>Acciones</span></li>{users.map(person=><li key={person.id} className="platform-access-row">
   <div className="platform-access-person"><b title={person.email}>{person.email}</b><small>{person.active_agencies} agencias activas · {person.platform_role?roleLabels[person.platform_role]:'Acceso de agencia'}{selfRow(person)?' · Vos':''}</small></div>
   <div className="platform-access-actions">
    {selfRow(person)?<>{writable?<button className="text-button danger" disabled={busy} onClick={()=>openDelete({kind:'user',person})}><Trash2 size={14}/>Eliminar mi cuenta</button>:<span className="platform-access-badge admin"><ShieldCheck size={13}/>{roleLabels[person.platform_role||'admin']}</span>}</>:writable?<>
     {person.platform_role==='admin'?<span className="platform-access-badge admin"><ShieldCheck size={13}/>Admin global</span>:<button className="text-button" disabled={busy} onClick={()=>void setAccess(person,'admin')}><ShieldCheck size={14}/>Hacer admin global</button>}
     {person.platform_role==='viewer'?<span className="platform-access-badge viewer"><Eye size={13}/>Solo lectura</span>:<button className="text-button" disabled={busy} onClick={()=>void setAccess(person,'viewer')}><Eye size={14}/>Solo lectura</button>}
     {person.platform_role&&<button className="text-button" disabled={busy} onClick={()=>void setAccess(person,'none')}>Quitar acceso</button>}
     <button className="text-button danger" disabled={busy} onClick={()=>openDelete({kind:'user',person})}><Trash2 size={14}/>Eliminar usuario</button>
    </>:<span className="platform-access-badge">{person.platform_role?roleLabels[person.platform_role]:'Acceso de agencia'}</span>}
   </div>
  </li>)}</ul>:<p className="empty-copy">No hay usuarios para mostrar.</p>}
  <h3>Agencias</h3>
  {!agencies?<p role="status">Cargando agencias…</p>:agencies.length?<ul className="platform-access-list"><li className="platform-access-head" aria-hidden="true"><span>Agencia</span><span>Acciones</span></li>{agencies.map(agency=><li key={agency.id} className="platform-access-row">
   <div className="platform-access-person"><b title={agency.name}>{agency.name}</b><small>{agency.slug} · {agency.active_users} usuarios{agency.active?` · ${agency.subscription_status||'Activa'}`:' · Inactiva'}</small></div>
   <div className="platform-access-actions">{writable?<button className="text-button danger" disabled={busy} onClick={()=>openDelete({kind:'agency',agency})}><Trash2 size={14}/>Eliminar agencia</button>:<span className="platform-access-badge">{agency.active?'Activa':'Inactiva'}</span>}</div>
  </li>)}</ul>:<p className="empty-copy">No hay agencias para mostrar.</p>}
  {confirming&&<Dialog title={confirming.kind==='user'?(selfRow(confirming.person)?'Eliminar mi cuenta':'Eliminar usuario'):'Eliminar agencia'} busy={busy} close={()=>{if(busy)return;setConfirming(null);setTyped('');setConfirmPassword('');}}>
   <p className="form-note">{confirming.kind==='user'?selfRow(confirming.person)?'Se eliminará tu usuario y las agencias que poseas. Solo vos podés eliminar tu propia cuenta. Esta acción es irreversible.':'Se eliminará el usuario y, si es dueño, sus agencias completas. Esta acción es irreversible.':'Se eliminará la agencia con todos sus datos. Esta acción es irreversible.'}</p>
   <label className="platform-access-confirm">Escribí <strong>{confirming.kind==='user'?confirming.person.email:confirming.agency.name}</strong> para confirmar<input value={typed} disabled={busy} autoComplete="off" onChange={event=>setTyped(event.target.value)}/></label>
   <label className="platform-access-confirm">Confirmá tu identidad con tu contraseña actual<input type="password" value={confirmPassword} disabled={busy} autoComplete="current-password" maxLength={128} onChange={event=>setConfirmPassword(event.target.value)}/></label>
   <div className="inline-actions"><button className="primary" disabled={busy||!confirmPassword||typed!==(confirming.kind==='user'?confirming.person.email:confirming.agency.name)} onClick={()=>void remove()}>{busy?'Eliminando…':'Eliminar definitivamente'}</button></div>
  </Dialog>}
 </section>;
}
