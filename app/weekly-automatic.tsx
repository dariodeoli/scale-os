'use client';
import {useEffect,useState,type ChangeEvent,type ReactNode} from 'react';
import {ActorIdentity} from './actor-identity';
import {listDateShort} from './list-format';
import {Card,DataTable,EmptyState,ErrorState,FilaDato,FormField,Input,Nota} from 'owncoding-ui';
import {LoadingBlock} from './ui-v2';

export const automaticTypeLabels:Record<string,string>={video:'Videos',reedicion:'Reediciones',foto:'Fotos',produccion:'Producciones',entregable:'Entregables',untyped:'Sin tipo'};
export const automaticTypes=Object.keys(automaticTypeLabels);
export type AutomaticProject={project_id:number;project_name:string|null;count:number;orders:number};
export type AutomaticEntry={user_id:string;counts:Record<string,number>;orders:number;projects:AutomaticProject[];actor_name?:string|null;actor_photo_url?:string|null;actor_verified?:boolean};
export type WeeklyAutomaticResult={week:string;scope:string;automatic:AutomaticEntry[]};
function projectLabel(project:AutomaticProject){return project.project_name??(project.project_id===0?'Sin proyecto':'Proyecto eliminado');}
export function weekMonday(day:string){
 const date=new Date(day+'T12:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==day)return '';
 date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));return date.toISOString().slice(0,10);
}
function currentWeek(){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const get=(key:string)=>parts.find(p=>p.type===key)!.value;
 return weekMonday(`${get('year')}-${get('month')}-${get('day')}`);
}
function lastDay(week:string){const d=new Date(week+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+6);return d.toISOString().slice(0,10);}
async function request(week:string,scope:string):Promise<WeeklyAutomaticResult>{
 const response=await fetch(`/core-api/api/agency/weekly-reports?${new URLSearchParams({week,scope})}`,{credentials:'include',cache:'no-store'});
 const data=await response.json();
 if(!response.ok)throw Error(data.error||'No se pudo cargar la producción semanal');
 return data;
}
type WeeklyRow={id:string;who:ReactNode;orders:number;projects:ReactNode;[type:string]:ReactNode|number};
export function WeeklyAutomatic({role}:{role:string}){
 const scope=role==='owner'?'team':'own';
 const [week,setWeek]=useState(currentWeek);
 const [result,setResult]=useState<WeeklyAutomaticResult|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[reload,setReload]=useState(0);
 useEffect(()=>{
  let alive=true;setLoading(true);setResult(null);setError('');
  request(week,scope).then(data=>{if(alive)setResult(data);}).catch(e=>{if(alive)setError(e instanceof Error?e.message:'No se pudo cargar la producción semanal.');}).finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;};
 },[week,scope,reload]);
 const rows=result?.automatic??[];
 const projectsCell=(entry:AutomaticEntry)=>entry.projects?.length?<span className="grid gap-0.5 text-xs text-mute">{entry.projects.map(project=><span key={project.project_id}>{projectLabel(project)} · {project.count}{project.orders>0?` · ${project.orders} órdenes`:''}</span>)}</span>:'—';
 return <Card className="grid gap-3" aria-label="Producción semanal automática">
  <div className="grid gap-1">
   <h2 className="text-lg font-semibold tracking-tight text-fore">Producción semanal</h2>
   <p className="text-xs text-mute">Terminadas de la semana, calculadas automáticamente desde los cambios de estado. Cada pieza cuenta una sola vez, en la semana en que pasó a terminada, atribuida a quien ejecutó el cambio. Sin horas: se cuentan piezas, no tiempo trabajado. Órdenes: piezas en las que se trabajó durante la semana, terminadas o no. Proyectos: distribución de las piezas terminadas por proyecto.</p>
  </div>
  <div className="flex flex-wrap items-end gap-3">
   <FormField label="Semana"><Input type="date" className="w-44" value={week} onChange={(event:ChangeEvent<HTMLInputElement>)=>{const monday=weekMonday((event.target as HTMLInputElement).value);if(monday)setWeek(monday);}}/></FormField>
  </div>
  <Nota tono="neutro">Del {listDateShort(week)||week} al {listDateShort(lastDay(week))||lastDay(week)} · lunes a domingo · {scope==='team'?'todo el equipo':'tu trabajo'}.</Nota>
  {loading?<LoadingBlock label="Cargando producción semanal…" lines={3}/>:null}
  {error?<ErrorState title="No se pudo cargar la producción semanal" description={error} onRetry={()=>setReload(v=>v+1)}/>:null}
  {!loading&&!error&&!rows.length?<EmptyState compact title="Sin piezas terminadas en esta semana."/>:null}
  {!loading&&!error&&rows.length>0?<DataTable
   columns={[{key:'who',label:scope==='team'?'Colaborador':'Trabajo'},...automaticTypes.map(type=>({key:type,label:automaticTypeLabels[type],align:'right' as const})),{key:'orders',label:'Órdenes',align:'right' as const},{key:'projects',label:'Proyectos'}]}
   rows={rows.map(entry=>({
    id:entry.user_id,
    who:<ActorIdentity name={entry.actor_name} photoUrl={entry.actor_photo_url} verified={entry.actor_verified===true}/>,
    orders:entry.orders??0,
    projects:projectsCell(entry),
    ...Object.fromEntries(automaticTypes.map(type=>[type,String(entry.counts[type]??0)])),
   }))}
   mobileCard={(row:WeeklyRow)=><div className="grid gap-1 rounded-lg border border-ink-600 bg-ink-900 p-3">
    <span className="text-sm font-semibold text-fore">{row.who}</span>
    <FilaDato etiqueta="Órdenes" valor={row.orders}/>
    {automaticTypes.map(type=><FilaDato key={type} etiqueta={automaticTypeLabels[type]} valor={row[type]??0}/>)}
    <div className="grid gap-0.5">
     <span className="text-xs text-mute">Proyectos</span>
     {row.projects}
    </div>
   </div>}
  />:null}
 </Card>;
}
