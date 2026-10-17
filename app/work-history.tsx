"use client";
import {Button} from './ui/button';

import {useEffect,useState} from 'react';
import {api} from './operations';
import {EmployeeTasks,type EmployeeTasksProps} from './employee-tasks';
import {Nota} from 'owncoding-ui';
import {EmptyBlock,ErrorBlock,FilterToolbar,ListGrid,ListRow,LoadingBlock,type Column} from './ui-v2';
import {SelectCustom} from './profile-controls';
import {ActorIdentity} from './actor-identity';
import {workStatusLabel} from './productivity-ui';
import './productivity.css';
import {History} from 'lucide-react';
import {roleCan} from './capabilities';
type Row={id:string;[key:string]:unknown};
const str=(r:Row,k:string)=>String(r[k]??'');
/** Estados de una tarea interna; un valor nuevo se dice "Sin estado", no se inventa. */
const internalTaskStatuses:Record<string,string>={pending:'Pendiente',in_progress:'En curso',done:'Lista'};
export const internalTaskStatusLabel=(status:string)=>internalTaskStatuses[status]||'Sin estado';
/** Estados de proyecto del Historial (mismos textos que la ficha del proyecto). */
const projectStatusLabels:Record<string,string>={active:'Activo',paused:'Pausado',completed:'Completado',cancelled:'Cancelado'};
/** Etiqueta del cambio de estado según la entidad de la fila (nunca un slug crudo). */
const historyStatusLabel=(table:string,status:string)=>{
 if(!status)return '';
 if(table==='agency_work_orders')return workStatusLabel(status);
 if(table==='agency_projects')return projectStatusLabels[status]||status;
 if(table==='agency_internal_tasks')return internalTaskStatuses[status]||status;
 return status;
};
// Una sola plantilla para el encabezado y las filas del historial (lista finita v2).
const HISTORY_TEMPLATE='grid-cols-[minmax(12rem,1.1fr)_minmax(14rem,2fr)_minmax(10rem,1fr)]';
const HISTORY_COLUMNS:Column[]=[{key:'person',label:'Persona'},{key:'record',label:'Registro'},{key:'change',label:'Cambio'}];
/** Límite histórico conservado para consumidores; el dashboard usa paginación del API. */
export const INTERNAL_TASKS_WINDOW=50;
export function WorkHistory({role,navigate}:{role:string;navigate?:(module:string)=>void}){
 const [rows,setRows]=useState<Row[]>([]),[people,setPeople]=useState<Row[]>([]),[who,setWho]=useState(''),[source,setSource]=useState(false),[error,setError]=useState('');
 // Seeing the whole team's history is the same capability the API asks for (work-orders.manage).
 const managers=roleCan(role,'work-orders.manage');
 const [limit,setLimit]=useState('10'),[offset,setOffset]=useState(0),[hasMore,setHasMore]=useState(false),[total,setTotal]=useState<number|null>(null),[loading,setLoading]=useState(true);
 const [identityVersion,setIdentityVersion]=useState(0);
 const [peopleError,setPeopleError]=useState(''),[peopleVersion,setPeopleVersion]=useState(0);
 useEffect(()=>{const reload=()=>setIdentityVersion(v=>v+1);window.addEventListener('scale:identity-changed',reload);return()=>window.removeEventListener('scale:identity-changed',reload);},[]);
 useEffect(()=>{if(!managers)return;let alive=true;const load=()=>{void api<{people:Row[]}>('/api/agency/productivity/people').then(d=>{if(alive){setPeople(d.people);setPeopleError('');}}).catch(cause=>{if(alive)setPeopleError(cause instanceof Error?cause.message:'No se pudo cargar el equipo.');});};load();window.addEventListener('scale:identity-changed',load);return()=>{alive=false;window.removeEventListener('scale:identity-changed',load);};},[managers,peopleVersion]);
 useEffect(()=>{setError('');setLoading(true);setRows([]);let alive=true;const query=new URLSearchParams({limit,offset:String(offset)});if(who&&!source)query.set('userId',who);void api<{records:Row[];page:{hasMore:boolean;total?:number}}>(`/api/agency/productivity/${source?'source-events':'history'}?${query}`).then(d=>{if(alive){setRows(d.records);setHasMore(d.page.hasMore);setTotal(typeof d.page.total==='number'?d.page.total:null);}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[who,source,limit,offset,identityVersion]);
 const range=!loading&&rows.length?`${offset+1}–${offset+rows.length}`:'';
 return <section className="grid min-w-0 gap-4 rounded-xl border border-ink-600 bg-ink-800 p-5 max-md:p-4" aria-label="Historial de trabajo">
  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
    <p className="min-w-0 flex-1 truncate text-xs leading-5 text-mute" title={source?'Fuente externa: conserva autor y fecha originales. No otorga accesos ni atribuye estas acciones a cuentas de Scale OS.':managers?'Cambios operativos del equipo. No incluye sueldos ni movimientos financieros.':'Tus cambios operativos.'}>{source?'Fuente externa: conserva autor y fecha originales. No otorga accesos ni atribuye estas acciones a cuentas de Scale OS.':managers?'Cambios operativos del equipo. No incluye sueldos ni movimientos financieros.':'Tus cambios operativos.'}</p>
    <button className="text-button shrink-0" onClick={()=>{setOffset(0);setSource(v=>!v);}}><History size={14}/>{source?'Ver actividad en Scale OS':'Ver historial importado de Trello'}</button>
  </div>
  <FilterToolbar className="mb-0" summary={range}>
   {!source&&managers?<div className="[&>div]:lg:!flex [&>div]:lg:items-center [&>div]:lg:gap-2 [&_.ops-label]:lg:mb-0 [&_.ops-label]:lg:whitespace-nowrap"><SelectCustom label="Persona" value={who} onChange={v=>{setWho(v);setOffset(0);}} choices={[{value:'',label:'Todo el equipo'},...people.map(p=>({value:String(p.id),label:str(p,'full_name')||str(p,'email'),photoUrl:str(p,'photo_url'),kind:'person' as const}))]}/></div>:null}
   <div className="[&>div]:lg:!flex [&>div]:lg:items-center [&>div]:lg:gap-2 [&_.ops-label]:lg:mb-0 [&_.ops-label]:lg:whitespace-nowrap"><SelectCustom label="Registros por página" value={limit} onChange={v=>{setLimit(v);setOffset(0);}} choices={['10','50','100'].map(value=>({value,label:value}))}/></div>
   {peopleError?<Nota tono="warn" className="w-full basis-full">No se pudo cargar la lista del equipo: {peopleError} <button type="button" className="text-button" onClick={()=>setPeopleVersion(v=>v+1)}>Reintentar</button></Nota>:null}
  </FilterToolbar>
  {error?<ErrorBlock title="No se pudo cargar el historial." description={error} onRetry={()=>setIdentityVersion(v=>v+1)}/>:null}
  {loading&&!error?<LoadingBlock label="Cargando actividad…" lines={4}/>:null}
  {!loading&&!error&&rows.length?<ListGrid label={source?'Historial importado':'Historial de trabajo'} template={HISTORY_TEMPLATE} columns={HISTORY_COLUMNS} minWidthClass="min-w-[40rem]">{rows.map(r=>{const text=str(r,source?'body':'title');const verb=str(r,'action')==='INSERT'?'Creó':str(r,'action')==='DELETE'?'Eliminó':'Actualizó';const moved=!source&&r.previous_status!==r.next_status;const from=historyStatusLabel(str(r,'table_name'),str(r,'previous_status'))||'Nueva',to=historyStatusLabel(str(r,'table_name'),str(r,'next_status'));return <ListRow key={r.id} template={HISTORY_TEMPLATE} className="work-history-row">
   <div role="cell" className="min-w-0"><ActorIdentity name={str(r,source?'source_author':'actor_name')} photoUrl={str(r,'actor_photo_url')} verified={r.actor_verified===true} imported={source} timestamp={str(r,source?'occurred_at':'created_at')}/></div>
   <p role="cell" className="m-0 truncate text-[13px] font-semibold text-fore" title={text}>{text||'—'}</p>
   <p role="cell" className="m-0 truncate text-xs text-mute" title={source?undefined:`${verb}${moved?` · ${from} → ${to}`:''}`}>{source?'—':<>{verb}{moved?<> · {from} → <b className="text-fore">{to}</b></>:null}</>}</p>
  </ListRow>;})}</ListGrid>:null}
  {!loading&&!error&&!rows.length?<EmptyBlock title="Sin actividad registrada." description={source?'No hay historial importado para mostrar.':'Los cambios operativos del equipo van a aparecer acá.'} action={!source&&navigate?<Button type="button" variant="outline" onClick={()=>navigate('Producción')}>Abrir Producción</Button>:undefined}/>:null}
  <div className="flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3">
   <span className="mr-auto text-xs tabular-nums text-mute" role="status">{range?`${range}${total!==null?` de ${total}`:''}`:total!==null?`0 de ${total}`:''}</span>
   <Button type="button" variant="outline" disabled={loading||offset===0} onClick={()=>setOffset(Math.max(0,offset-Number(limit)))}>Anterior</Button>
   <Button type="button" variant="outline" disabled={loading||!!error||!hasMore} onClick={()=>setOffset(offset+Number(limit))}>Siguiente</Button>
  </div>
 </section>;
}
export function InternalTasks(props:EmployeeTasksProps){return <EmployeeTasks {...props}/>;}
