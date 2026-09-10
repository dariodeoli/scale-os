"use client";
import {useEffect,useState} from 'react';
import {Dialog} from './dialog';
import './presence.css';
const views=new Map<symbol,string>();
const currentProject=()=>Array.from(views.values()).at(-1)||null;
async function request<T>(path:string,body?:unknown):Promise<T>{const res=await fetch('/core-api/api/agency/presence/'+path,{method:body?'POST':'GET',credentials:'include',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,keepalive:!!body});const data=await res.json();if(!res.ok)throw new Error(data.error||'No disponible');return data;}
export function PresenceTracker(){
 useEffect(()=>{
  const tab=crypto.randomUUID();let lastInput=Date.now(),sending=false,stopped=false;
  const touch=()=>{lastInput=Date.now();};
  const pulse=async()=>{if(sending||stopped)return;sending=true;try{await request('heartbeat',{tab_id:tab,project_id:currentProject(),visible:document.visibilityState==='visible',active:document.visibilityState==='visible'&&Date.now()-lastInput<60000});}catch{/* Presence must never interrupt work. */}finally{sending=false;}};
  const events=['pointerdown','keydown','scroll','touchstart'] as const;
  events.forEach(event=>window.addEventListener(event,touch,{passive:true}));
  document.addEventListener('visibilitychange',pulse);window.addEventListener('scale:project-view',pulse);
  void pulse();const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void pulse();},30000);
  return()=>{stopped=true;clearInterval(timer);events.forEach(event=>window.removeEventListener(event,touch));document.removeEventListener('visibilitychange',pulse);window.removeEventListener('scale:project-view',pulse);void request('heartbeat',{tab_id:tab,project_id:null,visible:false,active:false}).catch(()=>{});};
 },[]);return null;
}
export function ProjectPresence({projectId}:{projectId:string}){
 const [people,setPeople]=useState<{id:string;name:string}[]>([]),[available,setAvailable]=useState(true);
 useEffect(()=>{const key=Symbol();views.set(key,projectId);window.dispatchEvent(new Event('scale:project-view'));let alive=true;const load=()=>{if(document.visibilityState!=='visible')return;void request<{people:typeof people}>('project?projectId='+encodeURIComponent(projectId)).then(d=>{if(alive){setPeople(d.people);setAvailable(true);}}).catch(()=>{if(alive)setAvailable(false);});};load();const timer=setInterval(load,30000);return()=>{alive=false;clearInterval(timer);views.delete(key);window.dispatchEvent(new Event('scale:project-view'));};},[projectId]);
 return <p className="project-presence"><span className="presence-dot"/>{available?(people.length?`${people.map(p=>p.name).join(', ')} · viendo este proyecto`:'Sin otras vistas recientes de este proyecto'):'Presencia temporalmente no disponible'}<small>Se actualiza cada 30 s</small></p>;
}
type Person={id:string;name:string;email:string;last_seen_at:string|null;sessions:number;active_seconds:number;online:boolean;active:boolean};
type Visit={first_seen_at:string;last_seen_at:string;active_seconds:number};
const when=(value:string|null)=>value?new Date(value).toLocaleString('es-PY'):'Sin actividad registrada';
const duration=(seconds:number)=>seconds<60?`${seconds} s`:`${Math.floor(seconds/3600)} h ${Math.floor(seconds%3600/60)} min`;
export function UsagePanel(){
 const [people,setPeople]=useState<Person[]>([]),[error,setError]=useState(''),[selected,setSelected]=useState<Person|null>(null),[visits,setVisits]=useState<Visit[]>([]),[historyError,setHistoryError]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>{let alive=true;const load=()=>{if(document.visibilityState!=='visible')return;void request<{people:Person[]}>('usage').then(d=>{if(alive){setPeople(d.people);setError('');}}).catch(e=>{if(alive)setError(e.message);});};load();const timer=setInterval(load,30000);return()=>{alive=false;clearInterval(timer);};},[]);
 useEffect(()=>{if(!selected)return;let alive=true;setVisits([]);setHistoryError('');setLoading(true);void request<{records:Visit[]}>('usage?userId='+encodeURIComponent(selected.id)).then(d=>{if(alive)setVisits(d.records);}).catch(e=>{if(alive)setHistoryError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[selected]);
 return <section className="panel usage-panel"><h2>Uso del equipo</h2><p className="form-note">Solo para dueños · Últimos 30 días. Se registra desde la activación de esta función; no reconstruye accesos anteriores.</p><p className="form-note">Tiempo activo estimado: ventana visible e interacción reciente. No equivale a horas trabajadas. Una sesión puede abarcar varios días; recargar no cuenta como otro ingreso.</p>{error&&<p className="error" role="alert">{error}</p>}<div className="usage-grid">{people.map(p=><article className="ops-card" key={p.id}><div className="panel-heading"><b>{p.name}</b><span className="client-status" data-status={p.online?'active':'inactive'}>{p.online?(p.active?'En línea':'Inactivo'):'Desconectado'}</span></div><small>Última conexión: {when(p.last_seen_at)}</small><p>{p.sessions} sesiones · {duration(p.active_seconds)} activos aprox.</p><button className="text-button" onClick={()=>setSelected(p)}>Ver accesos</button></article>)}</div>{selected&&<Dialog title={`Accesos · ${selected.name}`} close={()=>setSelected(null)}><p className="form-note">Últimas 10 sesiones registradas en esta empresa.</p>{loading&&<p role="status">Cargando accesos…</p>}{historyError&&<p role="alert">{historyError}</p>}{visits.map(v=><article className="activity-line" key={v.first_seen_at}><b>Inicio: {when(v.first_seen_at)}</b><small>Última actividad: {when(v.last_seen_at)}</small><p>Tiempo activo estimado: {duration(v.active_seconds)}</p></article>)}{!loading&&!visits.length&&!historyError&&<p>Sin sesiones registradas todavía.</p>}</Dialog>}</section>;
}
