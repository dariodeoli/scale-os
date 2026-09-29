"use client";
import {useEffect,useState} from 'react';
import {api,Editor} from './operations';
import {listDateShort} from './list-format';
import {Aviso,Button,Nota} from 'owncoding-ui';
import {EmptyBlock, ErrorBlock, FilterToolbar, LoadingBlock} from './ui-v2';
import {Dialog} from './dialog';
import {SelectCustom} from './profile-controls';
import {ActorIdentity} from './actor-identity';
import './productivity.css';
import {History,Pencil,Plus} from 'lucide-react';
import {roleCan} from './capabilities';
type Row={id:string;[key:string]:unknown};
const str=(r:Row,k:string)=>String(r[k]??'');
/** Estados de una tarea interna; un valor nuevo se dice "Sin estado", no se inventa. */
const internalTaskStatuses:Record<string,string>={pending:'Pendiente',in_progress:'En curso',done:'Lista'};
export const internalTaskStatusLabel=(status:string)=>internalTaskStatuses[status]||'Sin estado';
/** Tope de la lista de pendientes internos (el API no pagina): el resto se avisa. */
export const INTERNAL_TASKS_WINDOW=50;
export function WorkHistory({role,navigate}:{role:string;navigate?:(module:string)=>void}){
 const [rows,setRows]=useState<Row[]>([]),[people,setPeople]=useState<Row[]>([]),[who,setWho]=useState(''),[source,setSource]=useState(false),[error,setError]=useState('');
 // Seeing the whole team's history is the same capability the API asks for (work-orders.manage).
 const managers=roleCan(role,'work-orders.manage');
 const [limit,setLimit]=useState('10'),[offset,setOffset]=useState(0),[hasMore,setHasMore]=useState(false),[loading,setLoading]=useState(true);
 const [identityVersion,setIdentityVersion]=useState(0);
 const [peopleError,setPeopleError]=useState(''),[peopleVersion,setPeopleVersion]=useState(0);
 useEffect(()=>{const reload=()=>setIdentityVersion(v=>v+1);window.addEventListener('scale:identity-changed',reload);return()=>window.removeEventListener('scale:identity-changed',reload);},[]);
 useEffect(()=>{if(!managers)return;let alive=true;const load=()=>{void api<{people:Row[]}>('/api/agency/productivity/people').then(d=>{if(alive){setPeople(d.people);setPeopleError('');}}).catch(cause=>{if(alive)setPeopleError(cause instanceof Error?cause.message:'No se pudo cargar el equipo.');});};load();window.addEventListener('scale:identity-changed',load);return()=>{alive=false;window.removeEventListener('scale:identity-changed',load);};},[managers,peopleVersion]);
 useEffect(()=>{setError('');setLoading(true);setRows([]);let alive=true;const query=new URLSearchParams({limit,offset:String(offset)});if(who&&!source)query.set('userId',who);void api<{records:Row[];page:{hasMore:boolean}}>(`/api/agency/productivity/${source?'source-events':'history'}?${query}`).then(d=>{if(alive){setRows(d.records);setHasMore(d.page.hasMore);}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[who,source,limit,offset,identityVersion]);
 const range=!loading&&rows.length?`${offset+1}–${offset+rows.length}`:'';
 return <section className="grid min-w-0 gap-4 rounded-xl border border-ink-600 bg-ink-800 p-5 max-md:p-4" aria-label="Historial de trabajo">
  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
    <p className="min-w-0 flex-1 truncate text-xs leading-5 text-mute" title={source?'Fuente externa: conserva autor y fecha originales. No otorga accesos ni atribuye estas acciones a cuentas de Scale OS.':managers?'Cambios operativos del equipo. No incluye sueldos ni movimientos financieros.':'Tus cambios operativos.'}>{source?'Fuente externa: conserva autor y fecha originales. No otorga accesos ni atribuye estas acciones a cuentas de Scale OS.':managers?'Cambios operativos del equipo. No incluye sueldos ni movimientos financieros.':'Tus cambios operativos.'}</p>
    <button className="text-button shrink-0" onClick={()=>{setOffset(0);setSource(v=>!v);}}><History size={14}/>{source?'Ver actividad en Scale OS':'Ver historial importado de Trello'}</button>
  </div>
  <FilterToolbar className="mb-0" summary={range}>
   {!source&&managers?<div className="[&>div]:lg:!flex [&>div]:lg:items-center [&>div]:lg:gap-2 [&_.ops-label]:lg:mb-0 [&_.ops-label]:lg:whitespace-nowrap"><SelectCustom label="Persona" value={who} onChange={v=>{setWho(v);setOffset(0);}} choices={[{value:'',label:'Todo el equipo'},...people.map(p=>({value:String(p.id),label:str(p,'full_name')||str(p,'email')}))]}/></div>:null}
   <div className="[&>div]:lg:!flex [&>div]:lg:items-center [&>div]:lg:gap-2 [&_.ops-label]:lg:mb-0 [&_.ops-label]:lg:whitespace-nowrap"><SelectCustom label="Registros por página" value={limit} onChange={v=>{setLimit(v);setOffset(0);}} choices={['10','50','100'].map(value=>({value,label:value}))}/></div>
   {peopleError?<Nota tono="warn" className="w-full basis-full">No se pudo cargar la lista del equipo: {peopleError} <button type="button" className="text-button" onClick={()=>setPeopleVersion(v=>v+1)}>Reintentar</button></Nota>:null}
  </FilterToolbar>
  {error?<ErrorBlock title="No se pudo cargar el historial." description={error} onRetry={()=>setIdentityVersion(v=>v+1)}/>:null}
  {loading&&!error?<LoadingBlock label="Cargando actividad…" lines={4}/>:null}
  {!loading&&!error&&rows.length?<ol className="grid min-w-0 gap-1.5">{rows.map(r=><li className="grid min-w-0 gap-0.5 rounded-xl border border-ink-600/60 bg-ink-800/40 px-3 py-2" key={r.id}>
   <ActorIdentity name={str(r,source?'source_author':'actor_name')} photoUrl={str(r,'actor_photo_url')} verified={r.actor_verified===true} imported={source} timestamp={str(r,source?'occurred_at':'created_at')}/>
   <p className="truncate text-[13px] text-fore" title={str(r,source?'body':'title')}>{str(r,source?'body':'title')}</p>
   {!source?<p className="text-xs text-mute">{str(r,'action')==='INSERT'?'Creó':str(r,'action')==='DELETE'?'Eliminó':'Actualizó'}{r.previous_status!==r.next_status?<> · {str(r,'previous_status')||'Nueva'} → <b className="text-fore">{str(r,'next_status')}</b></>:null}</p>:null}
  </li>)}</ol>:null}
  {!loading&&!error&&!rows.length?<EmptyBlock title="Sin actividad registrada." description={source?'No hay historial importado para mostrar.':'Los cambios operativos del equipo van a aparecer acá.'} action={!source&&navigate?<Button type="button" variant="outline" onClick={()=>navigate('Producción')}>Abrir Producción</Button>:undefined}/>:null}
  <div className="flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3">
   <span className="mr-auto text-xs tabular-nums text-mute" role="status">{range}</span>
   <Button type="button" variant="outline" disabled={loading||offset===0} onClick={()=>setOffset(Math.max(0,offset-Number(limit)))}>Anterior</Button>
   <Button type="button" variant="outline" disabled={loading||!!error||!hasMore} onClick={()=>setOffset(offset+Number(limit))}>Siguiente</Button>
  </div>
 </section>;
}
export function InternalTasks({role}:{role:string}){
 const [rows,setRows]=useState<Row[]>([]),[edit,setEdit]=useState<Row|'new'|null>(null),[error,setError]=useState(''),[reload,setReload]=useState(0),[loading,setLoading]=useState(true);
 const canEdit=roleCan(role,'work-orders.edit');
 async function load(){setLoading(true);try{setRows((await api<{records:Row[]}>('/api/agency/productivity/internal-tasks')).records);setError('');}catch(cause){setError(cause instanceof Error?cause.message:'No se pudieron cargar los pendientes internos.');}finally{setLoading(false);}}
 useEffect(()=>{void load();},[reload]);
 const record=edit&&edit!=='new'?edit:null;
 const visible=rows.slice(0,INTERNAL_TASKS_WINDOW);
 return <details className="panel"><summary>Pendientes internos · {rows.filter(r=>r.status!=='done').length}</summary><p className="form-note">Trabajo de la agencia, separado de los proyectos de clientes y sin efecto financiero.</p>{canEdit&&<button className="text-button" onClick={()=>setEdit('new')}><Plus size={14}/>Agregar tarea interna</button>}{error?<Aviso tono="error">{error} <button type="button" className="text-button" onClick={()=>setReload(v=>v+1)}>Reintentar</button></Aviso>:null}{loading&&!rows.length?<LoadingBlock label="Cargando pendientes internos…" lines={2}/>:null}{!loading&&!error&&!rows.length?<p className="form-note" role="status">No hay pendientes internos cargados.</p>:null}{visible.map(r=><article className="activity-line" key={r.id}><b>{str(r,'title')}</b><small>{internalTaskStatusLabel(str(r,'status'))} · {listDateShort(str(r,'due_date'))||'Sin fecha'}</small><p>{str(r,'description')}</p>{canEdit&&<button className="text-button" onClick={()=>setEdit(r)}><Pencil size={14}/>Editar tarea</button>}</article>)}{rows.length>visible.length?<p className="form-note" role="status">Mostrando {visible.length} de {rows.length} pendientes internos.</p>:null}
 {edit&&<Dialog title={record?'Editar tarea interna':'Nueva tarea interna'} close={()=>setEdit(null)}><Editor fields={[{key:'title',label:'Título'},{key:'description',label:'Detalle',type:'textarea',optional:true},{key:'due_date',label:'Fecha',type:'date',optional:true},...(record?[{key:'status',label:'Estado',choices:[{value:'pending',label:'Pendiente'},{value:'in_progress',label:'En curso'},{value:'done',label:'Lista'}]}]:[])]} defaults={{title:record?str(record,'title'):'',description:record?str(record,'description'):'',due_date:record?str(record,'due_date').slice(0,10):'',status:record?str(record,'status'):'pending'}} save={async v=>{await api(`/api/agency/productivity/internal-tasks${record?'/'+record.id:''}`,v,record?'PATCH':'POST');setEdit(null);await load();}}/></Dialog>}
 </details>;
}
