"use client";
import {useEffect,useState} from 'react';
import {api} from './operations';
import {ArchiveRestore} from 'lucide-react';

type Archived={kind:string;id:string;name:string;removed_at:string};

export function ArchivedCapsule({kind,refresh}:{kind:'clients'|'projects';refresh:()=>Promise<void>}){
 const [records,setRecords]=useState<Archived[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState('');
 const label=kind==='clients'?'clientes':'proyectos';
 async function load(){setRecords((await api<{records:Archived[]}>('/api/agency/trash')).records.filter(record=>record.kind===kind));}
 useEffect(()=>{void load().catch(cause=>setError(cause instanceof Error?cause.message:'No se pudieron cargar los registros archivados.'));},[kind]);
 if(!records.length&&!error)return null;
 return <details className="archived-capsule">
  <summary><ArchiveRestore size={14}/>Archivados ({records.length})</summary>
  <ul className="archived-capsule-list">
   {records.map(record=><li key={record.id}><span title={record.name}>{record.name}</span><button className="text-button" disabled={busy===record.id} onClick={async()=>{setBusy(record.id);setError('');try{await api(`/api/agency/${kind}/${record.id}/restore`,{});await Promise.all([load(),refresh()]);}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo reactivar el registro.');}finally{setBusy('');}}}>{busy===record.id?'Reactivando…':'Reactivar'}</button></li>)}
  </ul>
  {error&&<p className="error" role="alert">{error}</p>}
  <p className="archived-capsule-note">Los {label} archivados quedan al final hasta reactivarlos.</p>
 </details>;
}
