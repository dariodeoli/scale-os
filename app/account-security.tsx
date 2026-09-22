'use client';

import {useEffect,useState} from 'react';
import {LogOut,Smartphone} from 'lucide-react';
import {api} from './operations';
import {StateChip} from './ui-v2';

type Session={id:string;created_at:string;expires_at:string;current:boolean};
// Reloj 24 h en zona Asunción: contrato de `tests/ux-consistency.test.ts`
// (hourCycle h23 dentro de este archivo) mientras el resto migra a list-format.
const when=(value:string)=>new Intl.DateTimeFormat('es-PY',{timeZone:'America/Asuncion',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));

// Seguridad de cuenta (issue #46): mismas llamadas y textos, superficie v2.
export function AccountSecurity({onClosed}:{onClosed:()=>void}){
 const [sessions,setSessions]=useState<Session[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState('');
 async function load(){try{setError('');setSessions((await api<{sessions:Session[]}>('/api/auth/account/sessions')).sessions);}catch(e){setError(e instanceof Error?e.message:'No se pudieron cargar tus sesiones.');}}
 useEffect(()=>{void load();},[]);
 async function closeSession(id:string,current:boolean){setBusy(id);setError('');try{await api(`/api/auth/account/sessions/${id}`,{},'DELETE');if(current){onClosed();return;}await load();setNotice('Sesión cerrada.');}catch(e){setError(e instanceof Error?e.message:'No se pudo cerrar la sesión.');}finally{setBusy('');}}
 return <section className="grid grid-cols-[minmax(0,1fr)] gap-3" aria-busy={Boolean(busy)} data-profile-section="security">
  <div className="min-w-0">
   <h3 className="text-[13.5px] font-semibold text-fore">Seguridad de cuenta</h3>
   <p className="mt-1 text-[11.5px] text-mute">Tus sesiones son independientes de los accesos de cada empresa. Las eliminaciones permanentes se gestionan desde Configuración, en Zona de peligro.</p>
  </div>
  {sessions.length?<div className="grid grid-cols-[minmax(0,1fr)] gap-2">
   {sessions.map(session=><article key={session.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-ink-600 px-3 py-2">
    <Smartphone size={18} aria-hidden="true" className="shrink-0 text-mute"/>
    <div className="min-w-0 flex-1">
     <strong className="block text-[13px] text-fore">{session.current?'Esta sesión':'Sesión activa'}</strong>
     <small className="block break-words text-[11.5px] tabular-nums text-mute">Desde {when(session.created_at)} · vence {when(session.expires_at)}</small>
    </div>
    <StateChip tone={session.current?'ok':'mute'}>{session.current?'Actual':'Otra'}</StateChip>
    <button className="text-button" disabled={Boolean(busy)} onClick={()=>void closeSession(session.id,session.current)}><LogOut size={14} aria-hidden="true"/>{session.current?'Cerrar y salir':'Cerrar sesión'}</button>
   </article>)}
  </div>:null}
  {!sessions.length&&!error?<p className="text-[11.5px] text-mute">No hay otras sesiones activas.</p>:null}
  {notice?<p role="status" className="text-xs text-ok">{notice}</p>:null}
  {error?<p className="error" role="alert">{error}</p>:null}
 </section>;
}
