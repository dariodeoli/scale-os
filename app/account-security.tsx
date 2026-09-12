'use client';

import {useEffect,useState} from 'react';
import {LogOut,ShieldAlert,Smartphone,Trash2} from 'lucide-react';
import {api} from './operations';

type Session={id:string;created_at:string;expires_at:string;current:boolean};
const when=(value:string)=>new Intl.DateTimeFormat('es-PY',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));

export function AccountSecurity({email,onClosed}:{email:string;onClosed:()=>void}){
 const [sessions,setSessions]=useState<Session[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
 async function load(){try{setError('');setSessions((await api<{sessions:Session[]}>('/api/auth/account/sessions')).sessions);}catch(e){setError(e instanceof Error?e.message:'No se pudieron cargar tus sesiones.');}}
 useEffect(()=>{void load();},[]);
 async function closeSession(id:string,current:boolean){setBusy(id);setError('');try{await api(`/api/auth/account/sessions/${id}`,{},'DELETE');if(current){onClosed();return;}await load();setNotice('Sesión cerrada.');}catch(e){setError(e instanceof Error?e.message:'No se pudo cerrar la sesión.');}finally{setBusy('');}}
 async function requestClosure(event:React.FormEvent){event.preventDefault();setBusy('closure');setError('');try{const result=await api<{recoverableUntil:string}>('/api/auth/account/closure',{password,confirmation});setNotice(`Cuenta cerrada. Podés recuperarla hasta ${when(result.recoverableUntil)}.`);onClosed();window.location.assign(`/recuperar-cuenta?email=${encodeURIComponent(email)}`);}catch(e){setError(e instanceof Error?e.message:'No se pudo solicitar el cierre.');}finally{setBusy('');}}
 return <section className="my-profile-security" aria-busy={Boolean(busy)}>
  <div><h3>Seguridad de cuenta</h3><p className="my-profile-help">Tus sesiones son independientes de los accesos de cada empresa.</p></div>
  <div className="account-session-list">{sessions.map(session=><article key={session.id} className="account-session-row"><Smartphone size={18} aria-hidden="true"/><div><strong>{session.current?'Esta sesión':'Sesión activa'}</strong><small>Inició {when(session.created_at)} · vence {when(session.expires_at)}</small></div><button type="button" className="icon-button" title={session.current?'Cerrar esta sesión':'Cerrar sesión'} aria-label={session.current?'Cerrar esta sesión':'Cerrar sesión'} disabled={Boolean(busy)} onClick={()=>void closeSession(session.id,session.current)}><LogOut size={16}/></button></article>)}</div>
  {!sessions.length&&!error&&<p className="my-profile-help">No hay otras sesiones activas.</p>}
  <details className="account-closure"><summary><ShieldAlert size={18} aria-hidden="true"/>Cerrar mi cuenta</summary><p>Se cerrarán tus sesiones y el acceso quedará deshabilitado. Tus registros financieros e historial se conservan por auditoría. Podés recuperarla durante 30 días con tu correo y contraseña.</p><form onSubmit={requestClosure}><label>Contraseña actual<input type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} required/></label><label>Escribí <strong>CERRAR MI CUENTA</strong><input value={confirmation} onChange={event=>setConfirmation(event.target.value)} required/></label><button className="danger" disabled={busy==='closure'}><Trash2 size={16}/>{busy==='closure'?'Cerrando…':'Cerrar cuenta'}</button></form></details>
  {notice&&<p role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}
 </section>;
}
