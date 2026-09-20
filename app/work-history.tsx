"use client";
import {useEffect,useState} from 'react';
import {api,Editor} from './operations';
import {listDateShort} from './list-format';
import {Dialog} from './dialog';
import {SelectCustom} from './profile-controls';
import {ActorIdentity} from './actor-identity';
import './productivity.css';
import './work-history.css';
import {History,Pencil,Plus} from 'lucide-react';
import {roleCan} from './capabilities';
type Row={id:string;[key:string]:unknown};
const str=(r:Row,k:string)=>String(r[k]??'');
export function WorkHistory({role}:{role:string}){
 const [rows,setRows]=useState<Row[]>([]),[people,setPeople]=useState<Row[]>([]),[who,setWho]=useState(''),[source,setSource]=useState(false),[error,setError]=useState('');
 // Seeing the whole team's history is the same capability the API asks for (work-orders.manage).
 const managers=roleCan(role,'work-orders.manage');
 const [limit,setLimit]=useState('10'),[offset,setOffset]=useState(0),[hasMore,setHasMore]=useState(false),[loading,setLoading]=useState(true);
 const [identityVersion,setIdentityVersion]=useState(0);
 useEffect(()=>{const reload=()=>setIdentityVersion(v=>v+1);window.addEventListener('scale:identity-changed',reload);return()=>window.removeEventListener('scale:identity-changed',reload);},[]);
 useEffect(()=>{if(!managers)return;let alive=true;const load=()=>{void api<{people:Row[]}>('/api/agency/productivity/people').then(d=>{if(alive)setPeople(d.people);}).catch(()=>{});};load();window.addEventListener('scale:identity-changed',load);return()=>{alive=false;window.removeEventListener('scale:identity-changed',load);};},[managers]);
 useEffect(()=>{setError('');setLoading(true);setRows([]);let alive=true;const query=new URLSearchParams({limit,offset:String(offset)});if(who&&!source)query.set('userId',who);void api<{records:Row[];page:{hasMore:boolean}}>(`/api/agency/productivity/${source?'source-events':'history'}?${query}`).then(d=>{if(alive){setRows(d.records);setHasMore(d.page.hasMore);}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[who,source,limit,offset,identityVersion]);
 return <section className="panel work-history"><div className="panel-heading"><h2>Historial de trabajo</h2><button className="text-button" onClick={()=>{setOffset(0);setSource(v=>!v);}}><History size={14}/>{source?'Ver actividad en Scale OS':'Ver historial importado de Trello'}</button></div>
  <p className="form-note">{source?'Fuente externa: conserva autor y fecha originales. No otorga accesos ni atribuye estas acciones a cuentas de Scale OS.':managers?'Cambios operativos del equipo. No incluye sueldos ni movimientos financieros.':'Tus cambios operativos.'}</p>
  <div className="history-filters">{!source&&managers&&<SelectCustom label="Persona" value={who} onChange={v=>{setWho(v);setOffset(0);}} choices={[{value:'',label:'Todo el equipo'},...people.map(p=>({value:String(p.id),label:str(p,'full_name')||str(p,'email')}))]}/>}
  <SelectCustom label="Registros por página" value={limit} onChange={v=>{setLimit(v);setOffset(0);}} choices={['10','50','100'].map(value=>({value,label:value}))}/></div>
  {error&&<p className="error" role="alert">{error}</p>}<div aria-busy={loading}>{loading?<p role="status">Cargando actividad…</p>:rows.map(r=><article className="activity-line" key={r.id}><div className="history-author"><ActorIdentity name={str(r,source?'source_author':'actor_name')} photoUrl={str(r,'actor_photo_url')} verified={r.actor_verified===true} imported={source} timestamp={str(r,source?'occurred_at':'created_at')}/></div><p>{str(r,source?'body':'title')}</p>{!source&&<small>{str(r,'action')==='INSERT'?'Creó':str(r,'action')==='DELETE'?'Eliminó':'Actualizó'}{r.previous_status!==r.next_status?` · ${str(r,'previous_status')} → ${str(r,'next_status')}`:''}</small>}</article>)}{!loading&&!rows.length&&!error&&<p className="empty-copy">Sin actividad registrada.</p>}</div>
  <div className="history-pagination"><span role="status">{!loading&&rows.length?`${offset+1}–${offset+rows.length}`:''}</span><button className="secondary" disabled={loading||offset===0} onClick={()=>setOffset(Math.max(0,offset-Number(limit)))}>Anterior</button><button className="secondary" disabled={loading||!!error||!hasMore} onClick={()=>setOffset(offset+Number(limit))}>Siguiente</button></div>
 </section>;
}
export function InternalTasks({role}:{role:string}){
 const [rows,setRows]=useState<Row[]>([]),[edit,setEdit]=useState<Row|'new'|null>(null),[error,setError]=useState('');
 const canEdit=roleCan(role,'work-orders.edit');
 async function load(){setRows((await api<{records:Row[]}>('/api/agency/productivity/internal-tasks')).records);}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
 const record=edit&&edit!=='new'?edit:null;
 return <details className="panel"><summary>Pendientes internos · {rows.filter(r=>r.status!=='done').length}</summary><p className="form-note">Trabajo de la agencia, separado de los proyectos de clientes y sin efecto financiero.</p>{canEdit&&<button className="text-button" onClick={()=>setEdit('new')}><Plus size={14}/>Agregar tarea interna</button>}{error&&<p className="error">{error}</p>}{rows.map(r=><article className="activity-line" key={r.id}><b>{str(r,'title')}</b><small>{{pending:'Pendiente',in_progress:'En curso',done:'Lista'}[str(r,'status')]} · {listDateShort(str(r,'due_date'))||'Sin fecha'}</small><p>{str(r,'description')}</p>{canEdit&&<button className="text-button" onClick={()=>setEdit(r)}><Pencil size={14}/>Editar tarea</button>}</article>)}
 {edit&&<Dialog title={record?'Editar tarea interna':'Nueva tarea interna'} close={()=>setEdit(null)}><Editor fields={[{key:'title',label:'Título'},{key:'description',label:'Detalle',type:'textarea',optional:true},{key:'due_date',label:'Fecha',type:'date',optional:true},...(record?[{key:'status',label:'Estado',choices:[{value:'pending',label:'Pendiente'},{value:'in_progress',label:'En curso'},{value:'done',label:'Lista'}]}]:[])]} defaults={{title:record?str(record,'title'):'',description:record?str(record,'description'):'',due_date:record?str(record,'due_date').slice(0,10):'',status:record?str(record,'status'):'pending'}} save={async v=>{await api(`/api/agency/productivity/internal-tasks${record?'/'+record.id:''}`,v,record?'PATCH':'POST');setEdit(null);await load();}}/></Dialog>}
 </details>;
}
