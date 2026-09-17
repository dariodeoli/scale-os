'use client';

import {useEffect,useState} from 'react';
import {LogOut,Smartphone} from 'lucide-react';
import {api} from './operations';

type Session={id:string;created_at:string;expires_at:string;current:boolean};
const when=(value:string)=>new Intl.DateTimeFormat('es-PY',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));

export function AccountSecurity({onClosed}:{onClosed:()=>void}){
 const [sessions,setSessions]=useState<Session[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState('');
 async function load(){try{setError('');setSessions((await api<{sessions:Session[]}>('/api/auth/account/sessions')).sessions);}catch(e){setError(e instanceof Error?e.message:'No se pudieron cargar tus sesiones.');}}
 useEffect(()=>{void load();},[]);
 async function closeSession(id:string,current:boolean){setBusy(id);setError('');try{await api(`/api/auth/account/sessions/${id}`,{},'DELETE');if(current){onClosed();return;}await load();setNotice('Sesión cerrada.');}catch(e){setError(e instanceof Error?e.message:'No se pudo cerrar la sesión.');}finally{setBusy('');}}
 return <section className="my-profile-security" aria-busy={Boolean(busy)}>
  <div><h3>Seguridad de cuenta</h3><p className="my-profile-help">Tus sesiones son independientes de los accesos de cada empresa. Las eliminaciones permanentes se gestionan desde Configuración, en Zona de peligro.</p></div>
  <div className="account-session-list">{sessions.map(session=><article key={session.id} className="account-session-row"><Smartphone size={18} aria-hidden="true"/><div><strong>{session.current?'Esta sesión':'Sesión activa'}</strong><small>Inició {when(session.created_at)} · vence {when(session.expires_at)}</small></div><button type="button" className="icon-button" title={session.current?'Cerrar esta sesión':'Cerrar sesión'} aria-label={session.current?'Cerrar esta sesión':'Cerrar sesión'} disabled={Boolean(busy)} onClick={()=>void closeSession(session.id,session.current)}><LogOut size={16}/></button></article>)}</div>
  {!sessions.length&&!error&&<p className="my-profile-help">No hay otras sesiones activas.</p>}
  {notice&&<p role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}
 </section>;
}
