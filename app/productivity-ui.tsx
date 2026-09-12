"use client";
import {urgencyField,UrgencyBadge} from './urgency';
import {useEffect,useState} from 'react';
import {api,Editor,money,type Field} from './operations';
import {Dialog} from './dialog';
import {SelectCustom} from './profile-controls';
import {notify} from './feedback';
import {completeSave} from './save-completion';
import {ClientReviewControl} from './daily-controls';
import {ClientAppearance,ClientIdentity} from './client-identity';
import './productivity.css';
import {MonthlySchedules} from './notifications-ui';
import {ClientLinks,whatsappUrl} from './client-links';
import {ClientReporting} from './client-reporting';
import {ProjectPresence} from './presence';
import {ActorIdentity} from './actor-identity';
import {RecordAssignees} from './record-assignees';
import {WorkChecklist} from './work-checklist';
type Row={id:string;[key:string]:unknown};
export type WorkItem={id:string;title:string;status:string;project_id:string;due_date?:string|null;assigned_user_id?:string|null;assigned_user_ids?:string[];updated_at?:string;client_name?:string;project_name?:string};
const s=(r:Row,k:string)=>String(r[k]??'');
const driveLinks=(value:unknown,legacy?:string)=>{const links=Array.isArray(value)?value.map(item=>typeof item==='string'?item:String((item as {url?:string}).url||'')).filter(Boolean):[];return links.length?links:(legacy?[legacy]:[]);};
const errorText=(e:unknown)=>e instanceof Error?e.message:'No se pudo completar';
const states=[{value:'blocked',label:'Bloqueado'},{value:'to_record',label:'Por grabar'},{value:'recorded',label:'Grabado'},{value:'editing',label:'Editando'},{value:'review',label:'Listo para revisión'}];
const managers=['owner','admin','management','production'];
const makers=[...managers,'editor'];
const localDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function usePeople(){const [people,setPeople]=useState<Row[]>([]);useEffect(()=>{let alive=true;const load=()=>{void api<{people:Row[]}>('/api/agency/productivity/people').then(d=>{if(alive)setPeople(d.people);}).catch(()=>{});};load();window.addEventListener('scale:identity-changed',load);return()=>{alive=false;window.removeEventListener('scale:identity-changed',load);};},[]);return [{value:'',label:'Sin asignar'},...people.map(p=>({value:String(p.id),label:s(p,'full_name')||s(p,'email')}))];}

export function WorkDetail({id,organizationId,role,close,refresh}:{id:string;organizationId:string;role:string;close:()=>void;refresh:()=>Promise<void>}){
 const [data,setData]=useState<{order:Row;comments:Row[];history:Row[]}|null>(null),[error,setError]=useState(''),[tab,setTab]=useState('Detalle'),[busy,setBusy]=useState(false);
 async function load(){setData(await api(`/api/agency/productivity/orders/${id}`));}
 useEffect(()=>{void load().catch(e=>setError(errorText(e)));},[id]);
 async function action(path:string){setBusy(true);try{await api(path,{});await refresh();await load();notify({tone:'success',message:'Acción guardada.'});}catch(e){setError(errorText(e));}finally{setBusy(false);}}
 const order=data?.order,editable=makers.includes(role);
 const fields:Field[]=[urgencyField,{key:'title',label:'Título'},{key:'description',label:'Descripción y notas',type:'textarea',optional:true},{key:'drive_links',label:'Enlaces de archivo o carpeta de Drive',type:'textarea',optional:true,wide:true},{key:'due_date',label:'Entrega',type:'date',optional:true},{key:'estimated_hours',label:'Horas estimadas',type:'number',optional:true},{key:'actual_hours',label:'Horas trabajadas',type:'number',optional:true}];
 return <Dialog variant="drawer" title={order?s(order,'title'):'Detalle de la pieza'} close={close}>
  {error&&<p className="error" role="alert">{error}</p>}
  {!order?<p>Cargando pieza…</p>:<>
   <ProjectPresence projectId={s(order,'project_id')}/><UrgencyBadge value={order.urgency}/>
   <ClientIdentity name={s(order,'client_name')} logo={s(order,'client_logo_url')} color={s(order,'client_color_key')}/>
   <p className="form-note">{states.find(x=>x.value===order.status)?.label||s(order,'status')} · Actualizada {new Date(s(order,'updated_at')).toLocaleString('es-PY')}</p>
   <div className="choice-list">{['Detalle','Comentarios','Historial'].map(t=><button className={tab===t?'choice active':'choice'} onClick={()=>setTab(t)} key={t}>{t}{t==='Comentarios'?` (${data.comments.length})`:''}</button>)}</div>
   <div hidden={tab!=='Detalle'}>
    {editable?<RecordAssignees kind="work-orders" id={id} organizationId={organizationId} role={role} updatedAt={s(order,'updated_at')} refresh={()=>completeSave(close,refresh)}>{save=><Editor key={s(order,'updated_at')} fields={fields} defaults={Object.fromEntries(fields.map(f=>[f.key,f.key==='due_date'?s(order,f.key).slice(0,10):f.key==='drive_links'?driveLinks(order.drive_links,s(order,'drive_url')).join('\n'):s(order,f.key)]))} save={save}/>}</RecordAssignees>:<><RecordAssignees kind="work-orders" id={id} organizationId={organizationId} role={role} refresh={refresh}/><p>{s(order,'description')||'Sin descripción'}</p></>}
    <WorkChecklist id={id} organizationId={organizationId} role={role} refresh={refresh}/>
    {driveLinks(order.drive_links,s(order,'drive_url')).map((url,index)=><a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="text-button">Abrir enlace {index+1} de Drive ↗</a>)}
    {editable&&<div className="quick-actions"><button className="secondary" disabled={busy||['approved','published','review'].includes(s(order,'status'))} onClick={async()=>{setBusy(true);try{await api(`/api/agency/work-orders/${id}`,{status:'review'},'PATCH');await load();await refresh();}catch(e){setError(errorText(e));}finally{setBusy(false);}}}>Listo para revisión</button><button className="text-button" disabled={busy} onClick={()=>void action(`/api/agency/productivity/orders/${id}/duplicate`)}>Duplicar pieza</button>
     {managers.includes(role)&&order.status==='review'&&<button className="secondary" disabled={busy} onClick={()=>void action(`/api/agency/work-orders/${id}/approve`)} title="Registra una aprobación interna. Al completar los niveles del proyecto, la pieza queda aprobada.">Aprobar siguiente nivel</button>}
     {managers.includes(role)&&order.status==='approved'&&<button className="secondary" disabled={busy} onClick={()=>void action(`/api/agency/work-orders/${id}/publish`)}>Marcar publicada</button>}
    </div>}
    {managers.includes(role)&&<ClientReviewControl orderId={id}/>}
   </div>
   {tab==='Comentarios'&&<><p className="form-note">Comentarios internos de esta pieza; no se envían al cliente.</p>{editable&&<Editor resetOnSave cancelLabel={false} label="Publicar comentario" fields={[{key:'body',label:'Agregar comentario',type:'textarea'}]} defaults={{body:''}} save={async v=>{await api(`/api/agency/productivity/orders/${id}/comments`,v);await completeSave(()=>{},load);}}/>}{data.comments.map(c=><article className="activity-line" key={c.id}><ActorIdentity name={s(c,'actor_name')||s(c,'author_email')} photoUrl={s(c,'actor_photo_url')} verified={c.actor_verified===true} timestamp={s(c,'created_at')}/><p>{s(c,'body')}</p></article>)}{!data.comments.length&&<p className="empty-copy">Todavía no hay comentarios.</p>}</>}
   {tab==='Historial'&&<><p>Niveles aprobados: {s(order,'approval_step')||'0'}</p>{data.history.map(h=><article className="activity-line" key={h.id}><ActorIdentity name={s(h,'actor_name')} photoUrl={s(h,'actor_photo_url')} verified={h.actor_verified===true} timestamp={s(h,'created_at')}/><p>{s(h,'action')==='INSERT'?'Creó la pieza':'Actualizó la pieza'}</p>{h.previous_status!==h.next_status&&<p>{s(h,'previous_status')||'Nueva'} → {s(h,'next_status')}</p>}</article>)}{!data.history.length&&<p>Sin cambios registrados.</p>}</>}
  </>}
 </Dialog>;
}

export function ClientDetail({id,role,close,refresh,createProject,openOrder}:{id:string;role:string;close:()=>void;refresh:()=>Promise<void>;createProject:(id:string)=>void;openOrder:(id:string)=>void}){
 const [data,setData]=useState<{client:Row;projects:Row[];orders:Row[];invoices?:Row[];payments?:Row[];budgets?:Row[]}|null>(null),[error,setError]=useState(''),[tab,setTab]=useState('Producción');
 async function reload(){setData(await api(`/api/agency/productivity/clients/${id}`));await refresh();}
 useEffect(()=>{void api<typeof data>(`/api/agency/productivity/clients/${id}`).then(setData).catch(e=>setError(errorText(e)));},[id]);
 return <Dialog variant="drawer" title={data?s(data.client,'name'):'Ficha de cliente'} close={close}>{error&&<p className="error">{error}</p>}{data?<>
  {['owner','admin','management','sales'].includes(role)?<ClientAppearance id={id} name={s(data.client,'name')} logo={s(data.client,'logo_url')} color={s(data.client,'color_key')} refresh={reload}/>:<ClientIdentity name={s(data.client,'name')} logo={s(data.client,'logo_url')} color={s(data.client,'color_key')}/>}
  <p>{s(data.client,'email')} · {s(data.client,'phone')}</p>{whatsappUrl(s(data.client,'phone'))&&<a className="text-button client-whatsapp" href={whatsappUrl(s(data.client,'phone'))!} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>}<p>{s(data.client,'notes')}</p>
  <ClientLinks id={id} value={data.client.social_links} phone={s(data.client,'phone')} canEdit={['owner','admin','management','sales'].includes(role)} refresh={reload}/>
  <ClientReporting key={id} id={id} role={role} onSaved={reload}/>
  {managers.includes(role)&&<button className="primary" onClick={()=>createProject(id)}>Nuevo proyecto para este cliente</button>}
  <div className="choice-list">{['Producción',...(data.budgets?['Presupuestos']:[]),...(data.invoices?['Cobros']:[])].map(t=><button key={t} className={tab===t?'choice active':'choice'} onClick={()=>setTab(t)}>{t}</button>)}</div>
  {tab==='Producción'&&<><h3>Proyectos ({data.projects.length})</h3>{data.projects.map(p=><article className="activity-line" key={p.id}><b>{s(p,'name')}</b>{driveLinks(p.drive_links,s(p,'drive_url')).map((url,index)=><a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer">Drive {index+1} ↗</a>)}</article>)}<h3>Piezas recientes</h3>{data.orders.map(o=><button className="work-list-row" key={o.id} onClick={()=>openOrder(String(o.id))}><b>{s(o,'title')}</b><span>{s(o,'status')}</span></button>)}{!data.projects.length&&<p className="empty-copy">Este cliente aún no tiene proyectos.</p>}</>}
  {tab==='Presupuestos'&&data.budgets?.map(b=><article className="activity-line" key={b.id}><b>{s(b,'number')} · {s(b,'title')}</b><span>{s(b,'status')} · {money(s(b,'total'),s(b,'currency'))}</span></article>)}
  {tab==='Cobros'&&<><h3>Facturas y pendientes</h3>{data.invoices?.map(i=><article className="activity-line" key={i.id}><b>{s(i,'number')}</b><span>Cobrado {money(s(i,'paid_amount'),s(i,'currency'))} · Pendiente {money(Math.max(0,Number(i.total)-Number(i.paid_amount)),s(i,'currency'))}</span></article>)}<h3>Quién recibió y dónde</h3>{data.payments?.map(p=><article className="activity-line" key={p.id}><b>{money(s(p,'amount'),s(p,'currency'))} · {s(p,'account_name')}</b><ActorIdentity name={s(p,'actor_name')||s(p,'received_by_email')||'Sin persona registrada'} photoUrl={s(p,'actor_photo_url')} verified={p.actor_verified===true}/><small>{s(p,'received_on').slice(0,10)}</small></article>)}</>}
  <p className="form-note">Historial de hasta 100 registros por categoría. Los movimientos financieros solo aparecen con permiso.</p>
 </>:<p>Cargando cliente…</p>}</Dialog>;
}

export function WorkPlanner({orders,userId,role,projects,openOrder,refresh,navigate,initialView}:{initialView?:string;orders:WorkItem[];userId:string;role:string;projects:{id:string;name:string;client_name:string}[];openOrder:(id:string)=>void;refresh:()=>Promise<void>;navigate:(label:string)=>void}){
 const [view,setView]=useState(initialView||'Mi día'),[selected,setSelected]=useState<string[]>([]),[month,setMonth]=useState(localDay().slice(0,7)),[templatesOpen,setTemplatesOpen]=useState(false),[batch,setBatch]=useState(false);
 const today=localDay(),mine=orders.filter(o=>(String(o.assigned_user_id)===String(userId)||o.assigned_user_ids?.some(id=>String(id)===String(userId)))&&!['approved','published'].includes(o.status));
 const visible=(view==='Mi día'?mine:view==='Calendario'?orders.filter(o=>o.due_date?.slice(0,7)===month):orders).slice().sort((a,b)=>(a.due_date||'9999').localeCompare(b.due_date||'9999'));
 return <section className="panel work-planner"><div className="panel-heading"><h2>{view==='Mi día'?'Trabajo diario':view}</h2>{!initialView&&<div className="choice-list compact">{['Mi día','Calendario','Lista y lotes'].map(v=><button key={v} className={view===v?'choice active':'choice'} onClick={()=>setView(v)}>{v}</button>)}</div>}</div>
  {view==='Mi día'&&<><p className="form-note">{mine.filter(o=>o.due_date&&o.due_date.slice(0,10)<=today).length} entregas para hoy o vencidas · {mine.length} piezas asignadas pendientes</p>{['owner','admin','finance'].includes(role)&&<div className="quick-actions"><button className="text-button" onClick={()=>navigate('Mora')}>Revisar cobros pendientes →</button><button className="text-button" onClick={()=>navigate('Pagos')}>Disponibilidad y efectivo →</button></div>}</>}
  {view==='Calendario'&&<label>Mes de entrega<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>}
  {view==='Lista y lotes'&&makers.includes(role)&&<div className="quick-actions"><button className="secondary" disabled={!selected.length} onClick={()=>setBatch(true)}>Cambiar {selected.length} piezas</button><button className="text-button" onClick={()=>setSelected([])}>Quitar selección</button>{managers.includes(role)&&<button className="text-button" onClick={()=>setTemplatesOpen(true)}>Plantillas mensuales</button>}</div>}
  <div className="work-planner-list">{visible.slice(0,100).map(o=><div className="work-list-row" key={o.id}>{view==='Lista y lotes'&&makers.includes(role)&&<input type="checkbox" aria-label={`Seleccionar ${o.title}`} checked={selected.includes(String(o.id))} disabled={['approved','published'].includes(o.status)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,String(o.id)]:ids.filter(id=>id!==String(o.id)))}/>}<button className="text-button" onClick={()=>openOrder(String(o.id))}>{o.title}<small>{o.client_name} · {o.project_name}</small></button><time>{o.due_date?.slice(0,10)||'Sin fecha'}</time><span>{states.find(s=>s.value===o.status)?.label||o.status}</span></div>)}</div>
  {!visible.length&&<p className="empty-copy">{view==='Mi día'?'No tenés piezas pendientes asignadas. Podés elegir el tablero general desde el selector de vista.':'No hay piezas para esta vista.'}</p>}
  {visible.length>100&&<p className="form-note">Mostrando 100 de {visible.length}. Filtrá por mes para acotar la lista.</p>}
  {batch&&<BatchEditor orders={orders.filter(o=>selected.includes(String(o.id)))} close={()=>setBatch(false)} done={async()=>{await refresh();setSelected([]);setBatch(false);}}/>}
  {templatesOpen&&<MonthlyTemplates projects={projects} close={()=>setTemplatesOpen(false)} refresh={refresh}/>}
 </section>;
}
function BatchEditor({orders,close,done}:{orders:WorkItem[];close:()=>void;done:()=>Promise<void>}){
 const [field,setField]=useState('due_date');const people=usePeople();
 return <Dialog title={`Actualizar ${orders.length} piezas`} close={close}><p>Se aplica todo el lote o ninguno. No incluye aprobaciones, publicaciones ni cobros.</p><SelectCustom label="Qué cambiar" value={field} onChange={setField} choices={[{value:'due_date',label:'Fecha de entrega'},{value:'assigned_user_id',label:'Responsable'},{value:'status',label:'Estado de producción'}]}/><Editor key={field} fields={[{key:'value',label:'Nuevo valor',...(field==='due_date'?{type:'date' as const}:{choices:field==='status'?states:people})}]} defaults={{value:field==='status'?'to_record':''}} save={async v=>{const result=await api<{updated:number}>('/api/agency/productivity/batch',{ids:orders.map(o=>o.id),versions:Object.fromEntries(orders.map(o=>[o.id,o.updated_at])),change:{[field]:v.value}});notify({tone:'success',message:`${result.updated} piezas actualizadas.`});await done();}}/></Dialog>;
}
function MonthlyTemplates({projects,close,refresh}:{projects:{id:string;name:string;client_name:string}[];close:()=>void;refresh:()=>Promise<void>}){
 const [templates,setTemplates]=useState<Row[]>([]),[creating,setCreating]=useState(false),[notice,setNotice]=useState('');const people=usePeople();
 async function load(){setTemplates((await api<{templates:Row[]}>('/api/agency/productivity/templates')).templates);}
 useEffect(()=>{void load().catch(e=>setNotice(errorText(e)));},[]);
 return <Dialog title="Plantillas mensuales de producción" close={close}><p>Generá una tanda en un proyecto existente. Repetir la misma plantilla, proyecto y mes no crea duplicados. No genera facturas ni cobros.</p><button className="text-button" onClick={()=>setCreating(v=>!v)}>{creating?'Usar una plantilla':'Crear plantilla'}</button>{notice&&<p role="status">{notice}</p>}
 {creating?<><p className="form-note">Una pieza por línea: título | día del mes | horas estimadas | checklist opcional.</p><Editor fields={[{key:'name',label:'Nombre de la plantilla'},{key:'lines',label:'Piezas',type:'textarea'}]} defaults={{name:'',lines:''}} save={async v=>{const items=v.lines.split('\n').filter(l=>l.trim()).map(l=>{const [title,day,hours,...rest]=l.split('|').map(x=>x.trim());return{title,day:Number(day),hours:Number(hours||0),checklist:rest.join(' | ')};});await api('/api/agency/productivity/templates',{name:v.name,items});await load();setCreating(false);}}/></>:<Editor key={templates.length} fields={[{key:'template',label:'Plantilla',choices:templates.map(t=>({value:String(t.id),label:s(t,'name')}))},{key:'project_id',label:'Proyecto',choices:projects.map(p=>({value:String(p.id),label:`${p.client_name} · ${p.name}`}))},{key:'month',label:'Mes (AAAA-MM)'},{key:'assigned_user_id',label:'Responsable inicial',choices:people,optional:true}]} defaults={{template:'',project_id:'',month:localDay().slice(0,7),assigned_user_id:''}} save={async v=>{if(!v.template||!v.project_id)throw Error('Elegí plantilla y proyecto.');const r=await api<{created:number;alreadyGenerated:boolean}>(`/api/agency/productivity/templates/${v.template}/generate`,v);await refresh();setNotice(r.alreadyGenerated?'Ese mes ya fue generado para esta plantilla y proyecto.':`${r.created} piezas creadas para ${v.month}.`);}}/>}
 <MonthlySchedules projects={projects} templates={templates.map(t=>({id:String(t.id),name:s(t,'name')}))} people={people}/>
 </Dialog>;
}
