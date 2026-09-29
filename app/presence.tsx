"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {Dialog} from './dialog';
import {ActorIdentity,actorInitials} from './actor-identity';
import './presence.css';
import {Eye} from 'lucide-react';
import {listDateFull} from './list-format';
import {EmptyBlock,ListGrid,ListRow,LoadingBlock,StateChip} from './ui-v2';
const views=new Map<symbol,string>();
const currentProject=()=>Array.from(views.values()).at(-1)||null;
export type PresentPerson={id:string;name:string;photo_url?:string|null;active?:boolean;project_id?:string};
const BoardPeople=createContext<PresentPerson[]>([]);
type ProjectPeopleState={path:string;people:PresentPerson[];available:boolean};
// Presencia compartida por consulta: la topbar, el tablero y las tarjetas del
// mismo proyecto piden lo mismo una sola vez (antes cada cápsula disparaba su
// propia llamada) y todas se actualizan juntas.
const PRESENCE_TTL=25000;
const peopleCache=new Map<string,{at:number;state:ProjectPeopleState}>();
const peopleInflight=new Map<string,Promise<ProjectPeopleState>>();
const peopleListeners=new Map<string,Set<()=>void>>();
const listenersFor=(path:string)=>peopleListeners.get(path)??new Set<()=>void>();
function subscribePeople(path:string,listener:()=>void){const set=listenersFor(path);set.add(listener);peopleListeners.set(path,set);return()=>{set.delete(listener);if(!set.size)peopleListeners.delete(path);};}
function readPeople(path:string){const hit=peopleCache.get(path);return hit&&Date.now()-hit.at<PRESENCE_TTL?hit.state:null;}
function publishPeople(state:ProjectPeopleState){peopleCache.set(state.path,{at:Date.now(),state});listenersFor(state.path).forEach(listener=>listener());}
async function fetchPeople(path:string,signal?:AbortSignal):Promise<ProjectPeopleState>{
 const inflight=peopleInflight.get(path);if(inflight)return inflight;
 const work=request<{people:PresentPerson[]}>(path,undefined,signal).then(data=>{
  if(!Array.isArray(data.people))throw new Error('Presencia inválida');
  return {path,people:data.people,available:true};
 }).finally(()=>{peopleInflight.delete(path);});
 peopleInflight.set(path,work);return work;
}
function useProjectPeople(path:string){
 const [state,setState]=useState<ProjectPeopleState>(()=>readPeople(path)||{path,people:[],available:true});
 useEffect(()=>{
  if(!path){setState({path,people:[],available:true});return;}
  let alive=true,loading=false,lastAttempt=-Infinity,controller:AbortController|undefined;
  const cached=readPeople(path);setState(cached||{path,people:[],available:true});
  const unsubscribe=subscribePeople(path,()=>{const shared=readPeople(path);if(shared&&alive)setState(shared);});
  const load=async(force=false)=>{
   if(!alive||loading||document.visibilityState!=='visible')return;
   if(!force&&readPeople(path))return;
   if(!force&&Date.now()-lastAttempt<PRESENCE_TTL)return;
   loading=true;lastAttempt=Date.now();controller=new AbortController();
   const timeout=setTimeout(()=>controller?.abort(),8000);
   try{publishPeople(await fetchPeople(path,controller.signal));}
   catch{if(alive&&!peopleCache.has(path))setState({path,people:[],available:false});}
   finally{clearTimeout(timeout);loading=false;}
  };
  void load();const timer=setInterval(()=>void load(true),30000);
  const visibility=()=>{if(document.visibilityState==='visible')void load();else controller?.abort();};
  document.addEventListener('visibilitychange',visibility);
  return()=>{alive=false;clearInterval(timer);controller?.abort();document.removeEventListener('visibilitychange',visibility);unsubscribe();};
 },[path]);
 // Never render the previous project's people during the render before effects run.
 return state.path===path?state:{path,people:[],available:true};
}
export function BoardPresence({projectIds,children}:{projectIds:string[];children:ReactNode}){
 const key=Array.from(new Set(projectIds.filter(Boolean).map(String))).sort().slice(0,100).join(',');
 const {people}=useProjectPeople(key?'projects?ids='+encodeURIComponent(key):'');
 return <BoardPeople.Provider value={people}>{children}</BoardPeople.Provider>;
}
function PersonPhoto({person}:{person:PresentPerson}){const [broken,setBroken]=useState(false);useEffect(()=>setBroken(false),[person.photo_url]);return person.photo_url&&!broken?<img src={person.photo_url} alt="" loading="lazy" onError={()=>setBroken(true)}/>:<span aria-hidden="true">{actorInitials(person.name)}</span>;}
export function PresenceAvatars({people,alwaysGreen=false}:{people:PresentPerson[];alwaysGreen?:boolean}){return <span className="presence-avatars">{people.slice(0,4).map(person=><span className="presence-person" key={person.id} title={`${person.name} · ${person.active?'Activo en este proyecto':'Viendo este proyecto'}`} aria-label={`${person.name} · ${person.active?'Activo en este proyecto':'Viendo este proyecto'}`}><PersonPhoto person={person}/><i data-active={alwaysGreen||!!person.active}/></span>)}{people.length>4&&<span className="presence-more" title={people.slice(4).map(p=>p.name).join(', ')}>+{people.length-4}</span>}</span>;}
export function ProjectCardPresence({projectId}:{projectId:string}){const people=useContext(BoardPeople).filter(person=>String(person.project_id)===String(projectId));return people.length?<div className="card-presence"><PresenceAvatars people={people}/><small>Viendo ahora</small></div>:null;}
async function request<T>(path:string,body?:unknown,signal?:AbortSignal):Promise<T>{const res=await fetch('/core-api/api/agency/presence/'+path,{method:body?'POST':'GET',credentials:'include',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,keepalive:!!body,signal});const data=await res.json();if(!res.ok)throw new Error(data.error||'No disponible');return data;}
type UsagePerson={id:string;name:string;actor_name?:string;actor_photo_url?:string|null;online?:boolean;active?:boolean};
export function WorkspacePresence({projectIds,role,compact=false}:{projectIds:string[];role:string;compact?:boolean}){
 const key=Array.from(new Set(projectIds.filter(Boolean).map(String))).sort().slice(0,100).join(',');
 const [team,setTeam]=useState<PresentPerson[]|null|undefined>(undefined);
 const owner=role==='owner';
 // El dueño ve el estado a nivel empresa (`usage`); la presencia por proyecto
 // recién se pide si `usage` falla. Antes se pedían las dos cosas en paralelo al
 // arrancar (una lectura de hasta 100 proyectos que el dueño no usa): menos
 // lecturas de arranque (issue #67).
 const projects=useProjectPeople(owner&&team!==null?'':(key?'projects?ids='+encodeURIComponent(key):''));
 // Only the owner endpoint can reveal company-wide online status. Everyone else
 // sees the same limited, project-scoped presence that is already public in work.
 useEffect(()=>{
  if(role!=='owner'){setTeam(null);return;}
  let alive=true,controller:AbortController|undefined;
  const load=async()=>{controller=new AbortController();try{const data=await request<{people:UsagePerson[]}>('usage',undefined,controller.signal);if(alive)setTeam((data.people||[]).filter(person=>person.online).map(person=>({id:String(person.id),name:person.actor_name||person.name,photo_url:person.actor_photo_url,active:person.active})));}catch{if(alive)setTeam(null);}};
  void load();const timer=window.setInterval(load,30000);return()=>{alive=false;controller?.abort();clearInterval(timer);};
 },[role]);
 const people=(owner&&team)||projects.people;
 const exact=Boolean(owner&&team);
 if(!people.length)return null;
 const names=people.map(person=>person.name).join(', ');
 const label=exact?`${names} · ${people.length} en línea`:`${names} · viendo proyectos ahora`;
 if(compact)return <div className="workspace-presence workspace-presence-compact" title={label} aria-label={label}><PresenceAvatars people={people} alwaysGreen={exact}/></div>;
 return <div className="workspace-presence" title={label} aria-label={label}><span className="presence-dot" aria-hidden="true"/><PresenceAvatars people={people}/><small>{exact?`${people.length} en línea`:`${people.length} viendo`}</small></div>;
}
export function PresenceTracker(){
 useEffect(()=>{
  const tab=crypto.randomUUID();let lastInput=-Infinity,sending=false,stopped=false,lastPulse=-Infinity;
  const touch=()=>{lastInput=Date.now();};
  const pulse=async()=>{if(sending||stopped||Date.now()-lastPulse<2000)return;lastPulse=Date.now();sending=true;try{await request('heartbeat',{tab_id:tab,project_id:currentProject(),visible:document.visibilityState==='visible',active:document.visibilityState==='visible'&&Date.now()-lastInput<60000});}catch{/* Presence must never interrupt work. */}finally{sending=false;}};
  const events=['pointerdown','keydown','scroll','touchstart'] as const;
  events.forEach(event=>window.addEventListener(event,touch,{passive:true}));
  document.addEventListener('visibilitychange',pulse);window.addEventListener('scale:project-view',pulse);
  void pulse();const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void pulse();},30000);
  return()=>{stopped=true;clearInterval(timer);events.forEach(event=>window.removeEventListener(event,touch));document.removeEventListener('visibilitychange',pulse);window.removeEventListener('scale:project-view',pulse);void request('heartbeat',{tab_id:tab,project_id:null,visible:false,active:false}).catch(()=>{});};
 },[]);return null;
}
export function ProjectPresence({projectId}:{projectId:string}){
 const {people,available}=useProjectPeople('project?projectId='+encodeURIComponent(projectId));
 useEffect(()=>{const key=Symbol();views.set(key,projectId);window.dispatchEvent(new Event('scale:project-view'));return()=>{views.delete(key);window.dispatchEvent(new Event('scale:project-view'));};},[projectId]);
 return <div className="project-presence">{available&&people.length>0&&<PresenceAvatars people={people}/>}<span>{available?(people.length?`${people.map(p=>p.name).join(', ')} · viendo este proyecto`:'Sin vistas recientes de este proyecto'):'Presencia temporalmente no disponible'}</span><small>Se actualiza cada 30 s · No mide horas trabajadas</small></div>;
}
type Person={id:string;name:string;email:string;actor_name?:string;actor_photo_url?:string;actor_verified?:boolean;last_seen_at:string|null;sessions:number;active_seconds:number;online:boolean;active:boolean};
type Visit={first_seen_at:string;last_seen_at:string;active_seconds:number};
const USAGE_TEMPLATE='grid-cols-[minmax(11rem,1.6fr)_6.5rem_9rem_minmax(12rem,1.2fr)_8rem]';
const USAGE_COLUMNS=[{key:'person',label:'Persona'},{key:'state',label:'Estado'},{key:'seen',label:'Última conexión'},{key:'activity',label:'Actividad (30 días)'},{key:'actions',label:'Acciones'}];
const when=(value:string|null)=>listDateFull(value)||'Sin actividad registrada';
const duration=(seconds:number)=>seconds<60?`${seconds} s`:`${Math.floor(seconds/3600)} h ${Math.floor(seconds%3600/60)} min`;
export function UsagePanel(){
 const [people,setPeople]=useState<Person[]>([]),[error,setError]=useState(''),[selected,setSelected]=useState<Person|null>(null),[visits,setVisits]=useState<Visit[]>([]),[historyError,setHistoryError]=useState(''),[loading,setLoading]=useState(false),[listLoading,setListLoading]=useState(true),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let alive=true;const load=()=>{if(document.visibilityState!=='visible')return;void request<{people:Person[]}>('usage').then(d=>{if(alive){setPeople(d.people);setError('');}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setListLoading(false);});};load();const timer=setInterval(load,30000);return()=>{alive=false;clearInterval(timer);};},[attempt]);
 useEffect(()=>{if(!selected)return;let alive=true;setVisits([]);setHistoryError('');setLoading(true);void request<{records:Visit[]}>('usage?userId='+encodeURIComponent(selected.id)).then(d=>{if(alive)setVisits(d.records);}).catch(e=>{if(alive)setHistoryError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[selected]);
 return <section className="panel usage-panel"><div className="mb-3 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1"><h2 className="text-[17px] font-semibold tracking-tight text-fore">Uso del equipo</h2><p className="min-w-0 text-xs text-mute" title="Solo para dueños · últimos 30 días. Se registra desde la activación de esta función; no reconstruye accesos anteriores. Tiempo activo estimado: ventana visible e interacción reciente; no equivale a horas trabajadas. Una sesión puede abarcar varios días; recargar no cuenta como otro ingreso.">Últimos 30 días · tiempo activo estimado, no horas trabajadas.</p></div>{listLoading&&!people.length&&<LoadingBlock label="Cargando uso del equipo…" lines={3}/>}{error?<p className="error" role="alert">{error} <button type="button" className="text-button" onClick={()=>{setListLoading(true);setError('');setAttempt(value=>value+1);}}>Reintentar</button></p>:null}{people.length?<ListGrid label="Uso del equipo" template={USAGE_TEMPLATE} columns={USAGE_COLUMNS} minWidthClass="min-w-[46rem]">{people.map(p=><ListRow key={p.id} template={USAGE_TEMPLATE}><ActorIdentity name={p.actor_name||p.name} photoUrl={p.actor_photo_url} verified={p.actor_verified===true}/><span><StateChip tone={p.online?(p.active?'ok':'warn'):'mute'}>{p.online?(p.active?'En línea':'Inactivo'):'Desconectado'}</StateChip></span><span className="list-date whitespace-nowrap text-[11.5px] text-mute" title="Última conexión">{when(p.last_seen_at)}</span><span className="whitespace-nowrap text-[11.5px] tabular-nums text-mute">{p.sessions} sesiones · {duration(p.active_seconds)} activos aprox.</span><span className="flex justify-end"><button type="button" className="text-button" title={`Ver accesos: ${p.actor_name||p.name}`} onClick={()=>setSelected(p)}><Eye size={14}/>Ver accesos</button></span></ListRow>)}</ListGrid>:null}{!listLoading&&!people.length&&!error?<EmptyBlock compact title="Sin actividad registrada" description="Cuando la persona vuelva a entrar vas a ver su uso acá."/>:null}{selected&&<Dialog title={`Accesos · ${selected.name}`} close={()=>setSelected(null)}><p className="form-note">Últimas 10 sesiones registradas en esta empresa.</p>{loading&&<LoadingBlock label="Cargando accesos…" lines={4}/>}{historyError&&<p role="alert">{historyError}</p>}{visits.map(v=><article className="activity-line" key={v.first_seen_at}><b>Inicio: {when(v.first_seen_at)}</b><small>Última actividad: {when(v.last_seen_at)}</small><p>Tiempo activo estimado: {duration(v.active_seconds)}</p></article>)}{!loading&&!visits.length&&!historyError&&<EmptyBlock title="Sin sesiones registradas" description="Cuando la persona vuelva a entrar vas a ver sus accesos acá."/>}</Dialog>}</section>;
}
