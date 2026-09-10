"use client";
import {useEffect,useState} from 'react';
import {api,Editor} from './operations';
import {Dialog} from './dialog';
import {SelectCustom} from './profile-controls';
type Row={id:string;[key:string]:unknown};
const str=(r:Row,k:string)=>String(r[k]??'');
export function WorkHistory({role}:{role:string}){
 const [rows,setRows]=useState<Row[]>([]),[people,setPeople]=useState<Row[]>([]),[who,setWho]=useState(''),[source,setSource]=useState(false),[error,setError]=useState('');
 const managers=['owner','admin','management','production'].includes(role);
 useEffect(()=>{if(managers)void api<{people:Row[]}>('/api/agency/productivity/people').then(d=>setPeople(d.people)).catch(()=>{});},[managers]);
 useEffect(()=>{setError('');let alive=true;void api<{records:Row[]}>(source?'/api/agency/productivity/source-events':`/api/agency/productivity/history${who?'?userId='+encodeURIComponent(who):''}`).then(d=>{if(alive)setRows(d.records);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[who,source]);
 return <section className="panel"><div className="panel-heading"><h2>Historial de trabajo</h2><button className="text-button" onClick={()=>{setRows([]);setSource(v=>!v);}}>{source?'Ver actividad en Scale OS':'Ver historial importado de Trello'}</button></div>
  <p className="form-note">{source?'Fuente externa: conserva autor y fecha originales. No otorga accesos ni atribuye estas acciones a cuentas de Scale OS.':managers?'Últimos 100 cambios operativos. No incluye sueldos ni movimientos financieros.':'Tus últimos 100 cambios operativos.'}</p>
  {!source&&managers&&<SelectCustom label="Persona" value={who} onChange={setWho} choices={[{value:'',label:'Todo el equipo'},...people.map(p=>({value:String(p.id),label:str(p,'email')}))]}/>}
  {error&&<p className="error">{error}</p>}{rows.map(r=><article className="activity-line" key={r.id}><b>{str(r,source?'source_author':'actor_name')||'Sistema'}</b><small>{new Date(str(r,source?'occurred_at':'created_at')).toLocaleString('es-PY')}</small><p>{str(r,source?'body':'title')}</p>{!source&&<small>{str(r,'action')==='INSERT'?'Creó':str(r,'action')==='DELETE'?'Eliminó':'Actualizó'}{r.previous_status!==r.next_status?` · ${str(r,'previous_status')} → ${str(r,'next_status')}`:''}</small>}</article>)}{!rows.length&&!error&&<p className="empty-copy">Sin actividad registrada.</p>}
 </section>;
}
export function InternalTasks({role}:{role:string}){
 const [rows,setRows]=useState<Row[]>([]),[edit,setEdit]=useState<Row|'new'|null>(null),[error,setError]=useState('');
 const canEdit=['owner','admin','management','production','editor'].includes(role);
 async function load(){setRows((await api<{records:Row[]}>('/api/agency/productivity/internal-tasks')).records);}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
 const record=edit&&edit!=='new'?edit:null;
 return <details className="panel"><summary>Pendientes internos · {rows.filter(r=>r.status!=='done').length}</summary><p className="form-note">Trabajo de la agencia, separado de los proyectos de clientes y sin efecto financiero.</p>{canEdit&&<button className="text-button" onClick={()=>setEdit('new')}>Agregar tarea interna</button>}{error&&<p className="error">{error}</p>}{rows.map(r=><article className="activity-line" key={r.id}><b>{str(r,'title')}</b><small>{{pending:'Pendiente',in_progress:'En curso',done:'Lista'}[str(r,'status')]} · {str(r,'due_date').slice(0,10)||'Sin fecha'}</small><p>{str(r,'description')}</p>{canEdit&&<button className="text-button" onClick={()=>setEdit(r)}>Editar tarea</button>}</article>)}
 {edit&&<Dialog title={record?str(record,'title'):'Nueva tarea interna'} close={()=>setEdit(null)}><Editor fields={[{key:'title',label:'Título'},{key:'description',label:'Detalle',type:'textarea',optional:true},{key:'due_date',label:'Fecha',type:'date',optional:true},...(record?[{key:'status',label:'Estado',choices:[{value:'pending',label:'Pendiente'},{value:'in_progress',label:'En curso'},{value:'done',label:'Lista'}]}]:[])]} defaults={{title:record?str(record,'title'):'',description:record?str(record,'description'):'',due_date:record?str(record,'due_date').slice(0,10):'',status:record?str(record,'status'):'pending'}} save={async v=>{await api(`/api/agency/productivity/internal-tasks${record?'/'+record.id:''}`,v,record?'PATCH':'POST');setEdit(null);await load();}}/></Dialog>}
 </details>;
}
