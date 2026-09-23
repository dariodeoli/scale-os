"use client";
// Avisos del equipo v2 (issue #46): preferencias de notificaciones y
// programaciones mensuales con Tailwind + primitivas, sin hoja propia.
import {ActorIdentity} from './actor-identity';
import {useEffect,useState} from 'react';
import {NotificationInbox} from './notification-inbox';
import {api,Editor} from './operations';
import {Dialog} from './dialog';
import {notify} from './feedback';
import {EmptyBlock,ErrorBlock,LoadingBlock,StateChip} from './ui-v2';
import {CalendarClock,PauseCircle,PlayCircle} from 'lucide-react';
const error=(e:unknown)=>e instanceof Error?e.message:'No se pudieron cargar los avisos.';
export function NotificationBell({openOrder}:{openOrder:(id:string,anchor?:string)=>void}){
 const [prefs,setPrefs]=useState(false);
 return <><NotificationInbox openOrder={openOrder} openPreferences={()=>setPrefs(true)}/>{prefs&&<Preferences close={()=>setPrefs(false)}/>}</>;
}
function Preferences({close}:{close:()=>void}){
 const [values,setValues]=useState<Record<string,string>|null>(null),[message,setMessage]=useState('');
 useEffect(()=>{let alive=true;void api<{preferences:Record<string,boolean>}>('/api/agency/notifications/preferences').then(d=>{if(alive)setValues(Object.fromEntries(Object.entries(d.preferences).map(([k,v])=>[k,String(v)])));}).catch(e=>{if(alive)setMessage(error(e));});return()=>{alive=false;};},[]);
 return <Dialog title="Preferencias de notificaciones" close={close}><div className="grid gap-3"><p className="text-sm text-mute">Estas preferencias solo afectan tu usuario en esta empresa. Los correos operativos son opcionales; no cambian las invitaciones ni la recuperación de contraseña.</p>{message?<p role="alert" className="rounded-lg border-l-[3px] border-bad bg-bad/10 px-3 py-2 text-[13px] text-fore">{message}</p>:null}{values?<Editor fields={[['email_enabled','Recibir también por correo'],['assignment','Asignaciones'],['comment','Comentarios y menciones por @correo'],['due','Entregas pendientes']].map(([key,label])=>({key,label,choices:[{value:'true',label:'Sí'},{value:'false',label:'No'}]}))} defaults={values} save={async v=>{await api('/api/agency/notifications/preferences',Object.fromEntries(Object.entries(v).map(([k,val])=>[k,val==='true'])),'PATCH');close();}}/>:<LoadingBlock label="Cargando preferencias…" lines={2}/>}</div></Dialog>;
}

type Schedule={actor_name?:string;actor_photo_url?:string;actor_verified?:boolean;id:string;template_name:string;project_name:string;next_month:string;active:boolean};
export function MonthlySchedules({projects,templates,people}:{projects:{id:string;name:string;client_name:string}[];templates:{id:string;name:string}[];people:{value:string;label:string}[]}){
 const [open,setOpen]=useState(false),[creating,setCreating]=useState(false),[rows,setRows]=useState<Schedule[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 async function load(){setRows((await api<{schedules:Schedule[]}>('/api/agency/schedules')).schedules);}
 useEffect(()=>{if(!open)return;setLoading(true);void load().catch(e=>setMessage(error(e))).finally(()=>setLoading(false));},[open]);
 return <><button className="text-button" onClick={()=>setOpen(true)}><CalendarClock size={14}/>Programar generación automática</button>{open&&<Dialog title="Producción mensual automática" close={()=>setOpen(false)}><div className="grid gap-3">
  <p className="text-sm text-mute">Crea las piezas de la plantilla cada mes. No genera facturas ni cobros. Si la tanda ya existe, no la duplica. Podés pausar una programación en cualquier momento.</p>
  {message?<ErrorBlock title="No pudimos cargar las programaciones" description={message} onRetry={()=>void load().catch(e=>setMessage(error(e)))}/>:null}
  <div><button className="secondary" onClick={()=>setCreating(v=>!v)}>{creating?'Cancelar nueva programación':'Nueva programación'}</button></div>
  {creating&&<Editor fields={[{key:'template_id',label:'Plantilla',choices:templates.map(t=>({value:String(t.id),label:t.name}))},{key:'project_id',label:'Proyecto',choices:projects.map(p=>({value:String(p.id),label:p.client_name+' · '+p.name}))},{key:'next_month',label:'Primer mes (AAAA-MM)'},{key:'assigned_user_id',label:'Responsable',choices:people,optional:true}]} defaults={{template_id:'',project_id:'',next_month:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7),assigned_user_id:''}} save={async v=>{if(!/^\d{4}-\d{2}$/.test(v.next_month))throw Error('Ingresá el mes como AAAA-MM.');await api('/api/agency/schedules',{...v,next_month:v.next_month+'-01'});await load();setCreating(false);}}/>}
  {loading?<LoadingBlock label="Cargando programaciones…" lines={2}/>:rows.length?<div className="grid gap-2">{rows.map(r=><article className="grid min-w-0 gap-2 rounded-xl border border-ink-600 bg-ink-800 p-3.5" key={r.id}>
   <div className="flex min-w-0 flex-wrap items-center gap-2"><b className="min-w-0 break-words text-[13.5px] text-fore">{r.template_name} · {r.project_name}</b><StateChip tone={r.active?'ok':'mute'}>{r.active?'Activa':'Pausada'}</StateChip></div>
   {r.actor_name?<p className="text-xs text-mute">Programado por <ActorIdentity name={r.actor_name} photoUrl={r.actor_photo_url} verified={r.actor_verified===true}/></p>:null}
   <p className="whitespace-nowrap text-xs tabular-nums text-mute">Próximo mes {r.next_month.slice(0,7)}</p>
   <div className="flex justify-end"><button className={"text-button "+(r.active?'warn':'positive')} disabled={busy} onClick={async()=>{setBusy(true);try{await api('/api/agency/schedules/'+r.id,{active:!r.active},'PATCH');await load();}catch(e){notify({tone:'error',message:error(e)});}finally{setBusy(false);}}}>{r.active?<PauseCircle size={14}/>:<PlayCircle size={14}/>}{r.active?'Pausar':'Reactivar'}</button></div>
  </article>)}</div>:!creating?<EmptyBlock compact title="Todavía no hay programaciones activas" description="Creá una para generar las piezas de la plantilla cada mes."/>:null}
 </div></Dialog>}</>;
}
