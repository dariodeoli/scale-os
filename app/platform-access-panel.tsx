'use client';
import {useEffect,useState} from 'react';
import {platformApi} from './platform-admin-api';
import {Dialog} from './dialog';
import {ArrowUpRight,Eye,ShieldCheck,Trash2} from 'lucide-react';
import './platform-access.css';

type PlatformUser={id:number;email:string;active_agencies:number;platform_admin:boolean;platform_role:'admin'|'viewer'|null};
type UsersResponse={users:PlatformUser[];limit:number;offset:number};
type DeleteResponse={deleted:{userId:number;self:boolean;agencies:number[]}};
const roleLabels:Record<string,string>={admin:'Admin global',viewer:'Solo lectura'};

export function PlatformAccessPanel({currentUserId,platformRole}:{currentUserId:string;platformRole:string|null}){
 const [users,setUsers]=useState<PlatformUser[]|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [confirming,setConfirming]=useState<PlatformUser|null>(null),[typed,setTyped]=useState('');
 const writable=platformRole==='admin';
 async function load(){setBusy(true);setError('');try{const data=await platformApi<UsersResponse>('/api/platform/users?limit=100');setUsers(data.users);}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo cargar la administración global.');}finally{setBusy(false);}}
 useEffect(()=>{void load();},[]);
 async function setAccess(target:PlatformUser,platform_access:'admin'|'viewer'|'none'){setBusy(true);setError('');setNotice('');try{await platformApi(`/api/platform/users/${target.id}`,{method:'PATCH',body:JSON.stringify({platform_access})});setNotice(`${target.email}: acceso global actualizado.`);await load();}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo actualizar el acceso global.');}finally{setBusy(false);}}
 function openDelete(target:PlatformUser){setConfirming(target);setTyped('');}
 async function remove(){if(!confirming||typed!==confirming.email)return;const target=confirming;setBusy(true);setError('');setNotice('');try{const result=await platformApi<DeleteResponse>(`/api/platform/users/${target.id}`,{method:'DELETE'});setConfirming(null);setTyped('');if(result.deleted.self){setNotice('Tu cuenta fue eliminada. La sesión se cerrará.');if(typeof window!=='undefined')window.setTimeout(()=>window.location.reload(),2500);return;}setNotice(`Usuario eliminado${result.deleted.agencies.length?` junto con ${result.deleted.agencies.length} agencia(s) completa(s)`:''}.`);await load();}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo eliminar el usuario.');}finally{setBusy(false);}}
 const selfRow=(person:PlatformUser)=>String(person.id)===currentUserId;
 return <section className="panel platform-access" aria-busy={busy}>
  <div className="panel-heading"><div><p className="eyebrow">SCALE OS</p><h2>Administración global</h2></div><a className="text-button" href="https://admin.scaleparaguay.com/" target="_blank" rel="noreferrer">Panel completo<ArrowUpRight size={14}/></a></div>
  <p className="form-note">{writable?'Gestioná quién administra Scale OS, quién solo puede ver y qué cuentas se eliminan. Cada cambio queda auditado.':'Solo lectura: podés consultar la administración global, no modificarla.'}</p>
  {error&&<p className="error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {!users?<p role="status">Cargando usuarios…</p>:users.length?<ul className="platform-access-list">{users.map(person=><li key={person.id} className="platform-access-row">
   <div className="platform-access-person"><b>{person.email}</b><small>{person.active_agencies} agencias activas · {person.platform_role?roleLabels[person.platform_role]:'Acceso de agencia'}{selfRow(person)?' · Vos':''}</small></div>
   <div className="platform-access-actions">
    {selfRow(person)?<>{writable?<button className="text-button danger" disabled={busy} onClick={()=>openDelete(person)}><Trash2 size={14}/>Eliminar mi cuenta</button>:<span className="platform-access-badge admin"><ShieldCheck size={13}/>{roleLabels[person.platform_role||'admin']}</span>}</>:writable?<>
     {person.platform_role==='admin'?<span className="platform-access-badge admin"><ShieldCheck size={13}/>Admin global</span>:<button className="text-button" disabled={busy} onClick={()=>void setAccess(person,'admin')}><ShieldCheck size={14}/>Hacer admin global</button>}
     {person.platform_role==='viewer'?<span className="platform-access-badge viewer"><Eye size={13}/>Solo lectura</span>:<button className="text-button" disabled={busy} onClick={()=>void setAccess(person,'viewer')}><Eye size={14}/>Solo lectura</button>}
     {person.platform_role&&<button className="text-button" disabled={busy} onClick={()=>void setAccess(person,'none')}>Quitar acceso</button>}
     <button className="text-button danger" disabled={busy} onClick={()=>openDelete(person)}><Trash2 size={14}/>Eliminar usuario</button>
    </>:<span className="platform-access-badge">{person.platform_role?roleLabels[person.platform_role]:'Acceso de agencia'}</span>}
   </div>
  </li>)}</ul>:<p className="empty-copy">No hay usuarios para mostrar.</p>}
  {confirming&&<Dialog title={selfRow(confirming)?'Eliminar mi cuenta':'Eliminar usuario'} close={()=>{setConfirming(null);setTyped('');}}>
   <p className="form-note">{selfRow(confirming)?'Se eliminará tu usuario y las agencias que poseas. Solo vos podés eliminar tu propia cuenta. Esta acción es irreversible.':'Se eliminará el usuario y, si es dueño, sus agencias completas. Esta acción es irreversible.'}</p>
   <label className="platform-access-confirm">Escribí <strong>{confirming.email}</strong> para confirmar<input value={typed} disabled={busy} autoComplete="off" onChange={event=>setTyped(event.target.value)}/></label>
   <div className="inline-actions"><button className="primary" disabled={busy||typed!==confirming.email} onClick={()=>void remove()}>{busy?'Eliminando…':'Eliminar definitivamente'}</button></div>
  </Dialog>}
 </section>;
}
