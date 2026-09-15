'use client';
import {useEffect,useState} from 'react';
import {ActorIdentity} from './actor-identity';

export const automaticTypeLabels:Record<string,string>={video:'Videos',reedicion:'Reediciones',foto:'Fotos',produccion:'Producciones',entregable:'Entregables',untyped:'Sin tipo'};
export const automaticTypes=Object.keys(automaticTypeLabels);
export type AutomaticEntry={user_id:string;counts:Record<string,number>;actor_name?:string|null;actor_photo_url?:string|null;actor_verified?:boolean};
export type WeeklyAutomaticResult={week:string;scope:string;automatic:AutomaticEntry[]};
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
 return <section className="panel weekly-automatic" aria-label="Producción semanal automática">
  <h2>Producción semanal</h2>
  <p className="form-note">Terminadas de la semana, calculadas automáticamente desde los cambios de estado. Cada pieza cuenta una sola vez, en la semana en que pasó a terminada, atribuida a quien ejecutó el cambio. Sin horas: se cuentan piezas, no tiempo trabajado.</p>
  <div className="reports-filters"><label>Semana<input type="date" value={week} onChange={e=>{const w=weekMonday(e.target.value);if(w)setWeek(w);}}/></label></div>
  <p className="reports-note">Del {week} al {lastDay(week)} · lunes a domingo · {scope==='team'?'todo el equipo':'tu trabajo'}.</p>
  {loading&&<p role="status">Cargando producción semanal…</p>}
  {error&&<div role="alert" className="reports-error"><p>{error}</p><button type="button" className="secondary" onClick={()=>setReload(v=>v+1)}>Reintentar</button></div>}
  {!loading&&!error&&!rows.length&&<p className="form-note">Sin piezas terminadas en esta semana.</p>}
  {!loading&&!error&&rows.length>0&&<div className="reports-table-scroll"><table>
   <caption>Piezas terminadas por tipo · {scope==='team'?'todo el equipo':'tu trabajo'}</caption>
   <thead><tr><th scope="col">{scope==='team'?'Colaborador':'Trabajo'}</th>{automaticTypes.map(type=><th scope="col" key={type}>{automaticTypeLabels[type]}</th>)}</tr></thead>
   <tbody>{rows.map(entry=><tr key={entry.user_id}><th scope="row"><ActorIdentity name={entry.actor_name} photoUrl={entry.actor_photo_url} verified={entry.actor_verified===true}/></th>{automaticTypes.map(type=><td key={type}>{entry.counts[type]??0}</td>)}</tr>)}</tbody>
  </table></div>}
 </section>;
}
