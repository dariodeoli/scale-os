"use client";
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {ActorIdentity} from './actor-identity';
import './weekly-report.css';

export const weeklyCategories={videos:'Videos finales',re_edits:'Reediciones',designed_photos:'Fotos diseñadas',productions:'Producciones'};
export const weeklyStages={completed:'Terminado',in_progress:'En curso',planned:'Previsto'};
type Category=keyof typeof weeklyCategories;
type Stage=keyof typeof weeklyStages;
type Metrics=Record<Category,Record<Stage,number|null>>&{raw_clips:number|null;production_days:number|null;declared_hours:number|null};
type Report={user_id:string;week:string;metrics:Metrics;notes:string;version:number;updated_at:string;actor_name?:string;actor_photo_url?:string;actor_verified?:boolean};
type Result={records:Report[];week:string;scope:string;source:'declared';canViewTeam:boolean;canEdit:boolean};
const categories=Object.keys(weeklyCategories) as Category[];
const stages=Object.keys(weeklyStages) as Stage[];
export function emptyWeeklyMetrics():Metrics{
 return {...Object.fromEntries(categories.map(c=>[c,{completed:null,in_progress:null,planned:null}])),raw_clips:null,production_days:null,declared_hours:null} as Metrics;
}
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
async function request(week:string,scope:string,payload?:unknown):Promise<Result>{
 const response=await fetch(`/core-api/api/agency/weekly-reports?${new URLSearchParams({week,scope})}`,{
  credentials:'include',cache:'no-store',method:payload===undefined?'GET':'PUT',
  ...(payload===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),
 });
 const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo completar el reporte');return data;
}
export function WeeklyReport({organizationId}:{organizationId:string}){
 return <WeeklyReportPanel key={organizationId}/>;
}
function WeeklyReportPanel(){
 const [week,setWeek]=useState(currentWeek),[scope,setScope]=useState('own'),[result,setResult]=useState<Result|null>(null);
 const [metrics,setMetrics]=useState(emptyWeeklyMetrics),[notes,setNotes]=useState(''),[version,setVersion]=useState(0);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [reload,setReload]=useState(0);const flight=useRef(false);
 useEffect(()=>{
  let alive=true;setLoading(true);setResult(null);setError('');setNotice('');
  request(week,scope).then(data=>{if(!alive)return;setResult(data);const r=data.records[0];setMetrics(scope==='own'&&r?r.metrics:emptyWeeklyMetrics());setNotes(scope==='own'&&r?r.notes:'');setVersion(scope==='own'&&r?r.version:0);setDirty(false);}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;};
 },[week,scope,reload]);
 async function save(event:FormEvent){
  event.preventDefault();if(flight.current)return;flight.current=true;setSaving(true);setError('');setNotice('');
  try{const data=await request(week,'own',{metrics,notes,version});setResult(data);setVersion(data.records[0].version);setDirty(false);setNotice('Reporte declarado guardado.');}
  catch(e){setError(e instanceof Error?e.message:'No se pudo guardar');}finally{flight.current=false;setSaving(false);}
 }
 const count=(value:number|null)=>value===null?'Sin declarar':String(value);
 return <section className="panel weekly-report"><h2>Resumen semanal</h2>
  <p>Declarado por cada colaborador. No se calcula desde las piezas ni desde la conexión al sistema.</p>
  <div className="weekly-report-controls"><label>Elegí un día de la semana<input type="date" value={week} disabled={saving||dirty} onChange={e=>{const w=weekMonday(e.target.value);if(w)setWeek(w);}}/></label>
   {result?.canViewTeam&&<label>Ver<select value={scope} disabled={saving||dirty} onChange={e=>setScope(e.target.value)}><option value="own">Mi reporte</option><option value="team">Reportes del equipo</option></select></label>}
  </div><p>Del {week} al {lastDay(week)} · lunes a domingo.</p>
  {loading&&<p role="status">Cargando reporte…</p>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {!loading&&!result&&<button className="secondary" onClick={()=>setReload(v=>v+1)}>Reintentar</button>}
  {!loading&&result&&scope==='own'&&<form onSubmit={save}>
   <p>Contá solo tu participación. Una misma entrega va en un solo estado al cierre de la semana. Las reediciones se declaran aparte, sin sumarlas como videos nuevos. En blanco significa sin declarar; 0 significa ninguno.</p>
   <fieldset disabled={saving||!result.canEdit}><legend>Trabajo de la semana</legend>
    <div className="weekly-report-categories">{categories.map(category=><fieldset key={category}><legend>{weeklyCategories[category]}</legend><div className="weekly-report-counts">{stages.map(stage=><label key={stage}>{weeklyStages[stage]}<input aria-label={`${weeklyCategories[category]} · ${weeklyStages[stage]}`} type="number" min="0" max="100000" step="1" value={metrics[category][stage]??''} onChange={e=>{const value=e.target.value===''?null:Number(e.target.value);setMetrics(m=>({...m,[category]:{...m[category],[stage]:value}}));setDirty(true);}}/></label>)}</div></fieldset>)}</div>
    <div className="weekly-report-counts">{(['raw_clips','production_days','declared_hours'] as const).map(key=><label key={key}>{{raw_clips:'Clips brutos grabados',production_days:'Días de producción',declared_hours:'Horas de trabajo declaradas'}[key]}<input type="number" min="0" max={key==='production_days'?7:key==='declared_hours'?168:1000000} step={key==='declared_hours'?'.01':'1'} value={metrics[key]??''} onChange={e=>{setMetrics(m=>({...m,[key]:e.target.value===''?null:Number(e.target.value)}));setDirty(true);}}/></label>)}</div>
    <p>Los clips brutos no son videos finales. Declarar solo tus horas de esta semana; no copiar el total compartido de una pieza. No se calculan horas multiplicando días por un promedio.</p>
    <label>Detalle del trabajo<textarea maxLength={3000} rows={4} value={notes} onChange={e=>{setNotes(e.target.value);setDirty(true);}}/></label>
   </fieldset>
   {result.canEdit?<div className="weekly-report-controls"><button className="primary" disabled={saving||!dirty}>{saving?'Guardando…':'Guardar reporte'}</button>{dirty&&<button type="button" className="secondary" disabled={saving} onClick={()=>{setDirty(false);setReload(v=>v+1);}}>Descartar cambios y recargar</button>}</div>:<p>Tu permiso permite consultar este reporte.</p>}
   {dirty&&<p>Guardá o descartá los cambios antes de cambiar de semana.</p>}
  </form>}
  {!loading&&result&&scope==='team'&&<><p>Solo se muestran reportes enviados; la ausencia de un reporte no significa cero trabajo. No se suman entregas entre personas porque pueden haber colaborado en la misma pieza.</p>{!result.records.length&&<p>No hay reportes declarados para esta semana.</p>}{result.records.map(r=><article className="weekly-report-person" key={r.user_id}>
   <ActorIdentity name={r.actor_name} photoUrl={r.actor_photo_url} verified={r.actor_verified===true} timestamp={r.updated_at}/><p>Última actualización · datos declarados</p>
   <div className="weekly-report-table"><table><caption>Trabajo declarado de la semana</caption><thead><tr><th scope="col">Categoría</th>{stages.map(s=><th scope="col" key={s}>{weeklyStages[s]}</th>)}</tr></thead><tbody>{categories.map(c=><tr key={c}><th scope="row">{weeklyCategories[c]}</th>{stages.map(s=><td key={s}>{count(r.metrics[c][s])}</td>)}</tr>)}</tbody></table></div>
   <p>Clips brutos: {count(r.metrics.raw_clips)} · Días de producción: {count(r.metrics.production_days)} · Horas declaradas: {count(r.metrics.declared_hours)}</p><p className="weekly-report-notes">{r.notes}</p>
  </article>)}</>}
 </section>;
}
