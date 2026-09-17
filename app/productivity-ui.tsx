"use client";
import {urgencyField,UrgencyBadge} from './urgency';
import {useEffect,useState} from 'react';
import {ArrowUpRight,CalendarRange,Copy,LayoutTemplate,Pencil,X} from 'lucide-react';
import {api,Editor,money,type Field} from './operations';
import {Dialog} from './dialog';
import {SelectCustom} from './profile-controls';
import {notify} from './feedback';
import {completeSave} from './save-completion';
import {ClientReviewControl,ClientPortalAccess,ClientPortalDeliveryControl} from './daily-controls';
import {ClientAppearance,ClientIdentity} from './client-identity';
import './productivity.css';
import {MonthlySchedules} from './notifications-ui';
import {ClientLinks,whatsappUrl} from './client-links';
import {ClientReporting} from './client-reporting';
import {ClientCommercialLifecycle} from './client-commercial-lifecycle';
import {clientState} from './client-status';
import {ProjectPresence} from './presence';
import {ActorIdentity} from './actor-identity';
import {RecordAssignees} from './record-assignees';
import {WorkChecklist} from './work-checklist';
import {CommentBody,CommentComposer} from './commenting';
import {ClientRuc} from './client-ruc';
import {DriveLinks,driveLinksText} from './drive-links';
import {DueDate} from './due-date';
import {WorkOrderLinks} from './work-order-links';
type Row={id:string;[key:string]:unknown};
export type WorkItem={id:string;title:string;status:string;project_id:string;due_date?:string|null;due_time?:string|null;assigned_user_id?:string|null;assigned_user_ids?:string[];updated_at?:string;client_name?:string;project_name?:string};
const s=(r:Row,k:string)=>String(r[k]??'');
type ClientSummaryTerms={planName:string;recurringAmount:string|number;currency:string;cadence:string;intervalMonths:number|null;invoiceRequired:boolean};
type ClientSummary={relationshipStartedOn:string|null;terms:ClientSummaryTerms|null};
const commercialReadRoles=['owner','admin','management','sales','finance'];
const commercialFinancialRoles=['owner','admin','finance'];
function isSummaryTerms(value:unknown):value is ClientSummaryTerms{
 if(!value||typeof value!=='object')return false;
 const t=value as Record<string,unknown>;
 return typeof t.planName==='string'&&(typeof t.recurringAmount==='string'||typeof t.recurringAmount==='number')&&typeof t.currency==='string'&&typeof t.cadence==='string'&&(t.intervalMonths===null||typeof t.intervalMonths==='number')&&typeof t.invoiceRequired==='boolean';
}
function cadenceLabel(terms:ClientSummaryTerms|null){
 if(!terms)return 'Sin datos';
 if(terms.cadence==='monthly')return 'Mensual';
 if(terms.cadence==='interval'){const n=Number(terms.intervalMonths)||1;return `Cada ${n} mes${n===1?'':'es'}`;}
 if(terms.cadence==='once')return 'Única vez';
 return 'Sin datos';
}
function monthsSinceLabel(value:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const start=new Date(`${value}T12:00:00Z`),now=new Date();
 if(Number.isNaN(start.getTime())||start>now)return null;
 const months=(now.getUTCFullYear()-start.getUTCFullYear())*12+now.getUTCMonth()-start.getUTCMonth();
 return months<=0?'Este mes':`Hace ${months} mes${months===1?'':'es'}`;
}
const errorText=(e:unknown)=>e instanceof Error?e.message:'No se pudo completar';
const states=[{value:'blocked',label:'Bloqueado'},{value:'to_record',label:'Por grabar'},{value:'recorded',label:'Grabado'},{value:'editing',label:'Editando'},{value:'review',label:'Listo para revisión'}];
const workTypeLabels:Record<string,string>={video:'Video',reedicion:'Reedición',foto:'Foto',produccion:'Producción',entregable:'Entregable'};
const workTypeChoices=[{value:'',label:'Sin clasificar'},...Object.entries(workTypeLabels).map(([value,label])=>({value,label}))];
const managers=['owner','admin','management','production'];
const makers=[...managers,'editor'];
const localDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function usePeople(){const [people,setPeople]=useState<Row[]>([]);useEffect(()=>{let alive=true;const load=()=>{void api<{people:Row[]}>('/api/agency/productivity/people').then(d=>{if(alive)setPeople(d.people);}).catch(()=>{});};load();window.addEventListener('scale:identity-changed',load);return()=>{alive=false;window.removeEventListener('scale:identity-changed',load);};},[]);return [{value:'',label:'Sin asignar'},...people.map(p=>({value:String(p.id),label:s(p,'full_name')||s(p,'email')}))];}

export function WorkDetail({id,organizationId,role,close,refresh,anchor,initialEditing=false}:{id:string;organizationId:string;role:string;close:()=>void;refresh:()=>Promise<void>;anchor?:string;initialEditing?:boolean}){
 const [data,setData]=useState<{order:Row;comments:Row[];history:Row[]}|null>(null),[error,setError]=useState(''),[tab,setTab]=useState('Detalle'),[busy,setBusy]=useState(false),[editing,setEditing]=useState(false);
 async function load(){setData(await api(`/api/agency/productivity/orders/${id}`));}
 useEffect(()=>{setEditing(Boolean(initialEditing));void load().catch(e=>setError(errorText(e)));},[id]);
 useEffect(()=>{if(!anchor||!data)return;setTab('Comentarios');requestAnimationFrame(()=>{document.getElementById(anchor)?.scrollIntoView({behavior:'smooth',block:'center'});});},[anchor,data]);
 async function action(path:string){setBusy(true);try{await api(path,{});await refresh();await load();notify({tone:'success',message:'Acción guardada.'});}catch(e){setError(errorText(e));}finally{setBusy(false);}}
 const order=data?.order,editable=makers.includes(role);
 const heading=order?(editing?'Editar pieza':s(order,'title')):'Detalle de la pieza';
  const fields:Field[]=[urgencyField,{key:'title',label:'Título'},{key:'description',label:'Descripción y notas',type:'textarea',optional:true},{key:'drive_links',label:'Enlaces de archivo o carpeta de Drive',type:'textarea',optional:true,wide:true},{key:'due_date',label:'Entrega',type:'date',optional:true},{key:'due_time',label:'Hora de entrega',type:'time',optional:true},{key:'work_type',label:'Tipo de trabajo',optional:true,choices:workTypeChoices},{key:'estimated_hours',label:'Horas estimadas',type:'number',optional:true},{key:'actual_hours',label:'Horas trabajadas',type:'number',optional:true}];
  return <Dialog variant="drawer" title={heading} close={close}>
   {error&&<p className="error" role="alert">{error}</p>}
   {!order?<p>Cargando pieza…</p>:<>
    <header className="work-hero">
      <div className="work-hero-top"><ClientIdentity name={s(order,'client_name')} logo={s(order,'client_logo_url')} color={s(order,'client_color_key')}/><UrgencyBadge value={order.urgency}/></div>
      <div className="work-hero-chips">
        <span className="work-state" data-status={s(order,'status')}>{states.find(x=>x.value===order.status)?.label||s(order,'status')}</span>
        <span className="hub-chip">{workTypeLabels[s(order,'work_type')]||'Sin clasificar'}</span>
        <DueDate value={s(order,'due_date')} time={s(order,'due_time')} compact/>
        <span className="hub-chip muted">Actualizada {new Date(s(order,'updated_at')).toLocaleString('es-PY')}</span>
      </div>
      <ProjectPresence projectId={s(order,'project_id')}/>
    </header>
    <div className="choice-list work-tabs">{['Detalle','Comentarios','Historial'].map(t=><button className={tab===t?'choice active':'choice'} onClick={()=>setTab(t)} key={t}>{t}{t==='Comentarios'?` (${data.comments.length})`:''}</button>)}</div>
    <div hidden={tab!=='Detalle'} className="work-detail-stack">
     <div className="work-detail-toolbar">{editable&&!editing?<button className="secondary" type="button" onClick={()=>setEditing(true)}><Pencil size={14}/>Editar pieza</button>:null}</div>
     {editing&&editable?<RecordAssignees kind="work-orders" id={id} organizationId={organizationId} role={role} updatedAt={s(order,'updated_at')} refresh={()=>completeSave(close,refresh)}>{save=><Editor key={s(order,'updated_at')} fields={fields} defaults={Object.fromEntries(fields.map(f=>[f.key,f.key==='due_date'?s(order,f.key).slice(0,10):f.key==='due_time'?s(order,f.key).slice(0,5):f.key==='drive_links'?driveLinksText(order.drive_links,s(order,'drive_url')):s(order,f.key)]))} save={save}/>}</RecordAssignees>:<>
       <section className="work-section"><h4 className="work-section-title">Descripción</h4><p className="work-detail-description">{s(order,'description')||'Sin descripción'}</p></section>
       <section className="work-section"><h4 className="work-section-title">Responsables</h4><RecordAssignees kind="work-orders" id={id} organizationId={organizationId} role="viewer" refresh={refresh}/></section>
       <section className="work-section"><h4 className="work-section-title">Archivos y enlaces</h4><DriveLinks value={order.drive_links} legacy={s(order,'drive_url')}/><WorkOrderLinks orderId={id} role={role}/></section>
       <section className="work-section"><WorkChecklist id={id} organizationId={organizationId} role={role} refresh={refresh}/></section>
     </>}
     {editable&&<div className="quick-actions work-section"><h4 className="work-section-title">Acciones</h4><div className="inline-actions"><button className="secondary" disabled={busy||['approved','published','review'].includes(s(order,'status'))} onClick={async()=>{setBusy(true);try{await api(`/api/agency/work-orders/${id}`,{status:'review'},'PATCH');await load();await refresh();}catch(e){setError(errorText(e));}finally{setBusy(false);}}}>Listo para revisión</button><button className="text-button" disabled={busy} onClick={()=>void action(`/api/agency/productivity/orders/${id}/duplicate`)}><Copy size={14}/>Duplicar pieza</button>
      {managers.includes(role)&&order.status==='review'&&<button className="secondary" disabled={busy} onClick={()=>void action(`/api/agency/work-orders/${id}/approve`)} title="Registra una aprobación interna. Al completar los niveles del proyecto, la pieza queda aprobada.">Aprobar siguiente nivel</button>}
      {managers.includes(role)&&order.status==='approved'&&<button className="secondary" disabled={busy} onClick={()=>void action(`/api/agency/work-orders/${id}/publish`)}>Marcar publicada</button>}
     </div></div>}
     {managers.includes(role)&&<section className="work-section"><h4 className="work-section-title">Cliente</h4><ClientReviewControl orderId={id}/><ClientPortalDeliveryControl orderId={id} title={s(order,'title')} assetUrl={s(order,'drive_url')}/></section>}
    </div>
   {tab==='Comentarios'&&<><p className="form-note">Comentarios internos de esta pieza; no se envían al cliente. Usá @ para mencionar a una persona.</p>{editable&&<CommentComposer label="Agregar comentario" save={async (body,mentionedUserIds)=>{await api(`/api/agency/productivity/orders/${id}/comments`,{body,mentioned_user_ids:mentionedUserIds});await completeSave(()=>{},load);}}/>}{data.comments.map(c=><article className="activity-line" id={`comment-${c.id}`} key={c.id}><ActorIdentity name={s(c,'actor_name')||s(c,'author_email')} photoUrl={s(c,'actor_photo_url')} verified={c.actor_verified===true} timestamp={s(c,'created_at')}/><CommentBody value={s(c,'body')}/></article>)}{!data.comments.length&&<p className="empty-copy">Todavía no hay comentarios.</p>}</>}
   {tab==='Historial'&&<><p>Niveles aprobados: {s(order,'approval_step')||'0'}</p>{data.history.map(h=><article className="activity-line" key={h.id}><ActorIdentity name={s(h,'actor_name')} photoUrl={s(h,'actor_photo_url')} verified={h.actor_verified===true} timestamp={s(h,'created_at')}/><p>{s(h,'action')==='INSERT'?'Creó la pieza':'Actualizó la pieza'}</p>{h.previous_status!==h.next_status&&<p>{s(h,'previous_status')||'Nueva'} → {s(h,'next_status')}</p>}</article>)}{!data.history.length&&<p>Sin cambios registrados.</p>}</>}
  </>}
 </Dialog>;
}

export function ClientDetail({id,role,close,refresh,createProject,openOrder}:{id:string;role:string;close:()=>void;refresh:()=>Promise<void>;createProject:(id:string)=>void;openOrder:(id:string)=>void}){
 const [data,setData]=useState<{client:Row;projects:Row[];orders:Row[];invoices?:Row[];payments?:Row[];budgets?:Row[]}|null>(null),[error,setError]=useState(''),[tab,setTab]=useState('Producción');
 const [payStatus,setPayStatus]=useState<{payment_status:string;days_overdue:number;next_due_on:string|null;outstanding_amount:string;currency:string|null}|null>(null);
 const [summary,setSummary]=useState<ClientSummary|null>(null);
 async function reload(){setData(await api(`/api/agency/productivity/clients/${id}`));await refresh();}
 useEffect(()=>{void api<typeof data>(`/api/agency/productivity/clients/${id}`).then(setData).catch(e=>setError(errorText(e)));},[id]);
 useEffect(()=>{let alive=true;void api<{clients:{client_id:string;payment_status:string;days_overdue:number;next_due_on:string|null;outstanding_amount:string;currency:string|null}[]}>('/api/agency/client-payment-status').then(response=>{if(alive)setPayStatus(response.clients.find(client=>String(client.client_id)===String(id))||null);}).catch(()=>{if(alive)setPayStatus(null);});return()=>{alive=false;};},[id]);
 useEffect(()=>{
  if(!commercialReadRoles.includes(role))return;
  let alive=true;
  void Promise.all([
   api<{reporting:{relationshipStartedOn:string|null}|null}>(`/api/agency/clients/${id}/reporting`).then(r=>r?.reporting?.relationshipStartedOn||null).catch(()=>null),
   commercialFinancialRoles.includes(role)?api<{terms:unknown}|null>(`/api/agency/clients/${id}/commercial-terms`).then(r=>r?.terms||null).catch(()=>null):Promise.resolve(null),
  ]).then(([relationshipStartedOn,terms])=>{
   if(!alive)return;
   setSummary({relationshipStartedOn:typeof relationshipStartedOn==='string'?relationshipStartedOn:null,terms:isSummaryTerms(terms)?terms:null});
  });
  return()=>{alive=false;};
 },[id,role]);
 const sinceValue=summary?.relationshipStartedOn||(data?String(data.client.created_at||'').slice(0,10):'');
 return <Dialog variant="drawer" title={data?s(data.client,'name'):'Ficha de cliente'} close={close}>{error&&<p className="error">{error}</p>}{data?<>
  {['owner','admin','management','sales'].includes(role)?<><ClientAppearance id={id} name={s(data.client,'name')} logo={s(data.client,'logo_url')} color={s(data.client,'color_key')} showIdentity={false} refresh={reload}/><ClientRuc embedded refresh={reload} existing={{id,name:s(data.client,'name'),legalName:s(data.client,'legal_name'),taxId:s(data.client,'tax_id'),onUpdated:reload}}/></>:<ClientIdentity name={s(data.client,'name')} logo={s(data.client,'logo_url')} color={s(data.client,'color_key')}/>}
  <p>{s(data.client,'email')} · {s(data.client,'phone')}</p>{whatsappUrl(s(data.client,'phone'))&&<a className="text-button client-whatsapp" href={whatsappUrl(s(data.client,'phone'))!} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>}<p>{s(data.client,'notes')}</p>
  {summary&&<section className="client-summary" aria-label="Resumen comercial del cliente">
   <div className="client-summary-grid">
    <article><span>Estado del servicio</span><strong>{clientState({lifecycle_status:s(data.client,'lifecycle_status'),active:data.client.active!==false}).label}</strong></article>
    <article><span>Cobros</span><strong>{payStatus?payStatus.payment_status==='up_to_date'?'Al día':payStatus.payment_status==='due_soon'?`Vence ${payStatus.next_due_on||'próximamente'}`:`${payStatus.days_overdue} días de mora`:'Sin datos'}</strong>{payStatus&&payStatus.currency&&Number(payStatus.outstanding_amount)>0?<small>Pendiente {money(Number(payStatus.outstanding_amount),payStatus.currency)}</small>:null}</article>
    <article><span>Plan</span><strong title={summary.terms?.planName||undefined}>{summary.terms?.planName||'Sin plan registrado'}</strong></article>
    <article><span>Pago mensual</span><strong>{summary.terms?money(String(summary.terms.recurringAmount),summary.terms.currency):'Sin datos'}</strong></article>
    <article><span>Recurrencia</span><strong>{cadenceLabel(summary.terms)}</strong></article>
    <article><span>Cliente desde</span><strong>{monthsSinceLabel(sinceValue)||'Sin fecha registrada'}</strong>{/^\d{4}-\d{2}-\d{2}$/.test(sinceValue)?<small>{sinceValue}</small>:null}</article>
    <article><span>Factura</span><strong>{summary.terms?summary.terms.invoiceRequired?'Pide factura':'No pide factura':'Sin datos'}</strong></article>
    <article><span>RUC</span><strong title={s(data.client,'tax_id')||undefined}>{s(data.client,'tax_id')||'Sin RUC registrado'}</strong>{s(data.client,'legal_name')&&s(data.client,'legal_name')!==s(data.client,'name')?<small>{s(data.client,'legal_name')}</small>:null}</article>
   </div>
  </section>}
  {managers.includes(role)&&<div className="quick-actions"><button className="primary" onClick={()=>createProject(id)}>Nuevo proyecto para este cliente</button><ClientPortalAccess clientId={id}/></div>}
  <div className="choice-list">{['Producción',...(data.budgets?['Presupuestos']:[]),...(data.invoices?['Cobros']:[])].map(t=><button key={t} className={tab===t?'choice active':'choice'} onClick={()=>setTab(t)}>{t}</button>)}</div>
  {tab==='Producción'&&<><h3>Proyectos ({data.projects.length})</h3>{data.projects.map(p=><article className="activity-line" key={p.id}><b>{s(p,'name')}</b><DriveLinks value={p.drive_links} legacy={s(p,'drive_url')} compact/></article>)}<h3>Piezas recientes</h3>{data.orders.map(o=><button className="work-list-row" key={o.id} onClick={()=>openOrder(String(o.id))}><b>{s(o,'title')}</b><span>{s(o,'status')}</span></button>)}{!data.projects.length&&<p className="empty-copy">Este cliente aún no tiene proyectos.</p>}</>}
  {tab==='Presupuestos'&&data.budgets?.map(b=><article className="activity-line" key={b.id}><b>{s(b,'number')} · {s(b,'title')}</b><span>{s(b,'status')} · {money(s(b,'total'),s(b,'currency'))}</span></article>)}
  {tab==='Cobros'&&<><h3>Facturas y pendientes</h3>{data.invoices?.map(i=><article className="activity-line" key={i.id}><b>{s(i,'number')}</b><span>Cobrado {money(s(i,'paid_amount'),s(i,'currency'))} · Pendiente {money(Math.max(0,Number(i.total)-Number(i.paid_amount)),s(i,'currency'))}</span></article>)}<h3>Quién recibió y dónde</h3>{data.payments?.slice(0,10).map(p=><article className="activity-line" key={p.id}><b>{money(s(p,'amount'),s(p,'currency'))} · {s(p,'account_name')}</b><ActorIdentity name={s(p,'actor_name')||s(p,'received_by_email')||'Sin persona registrada'} photoUrl={s(p,'actor_photo_url')} verified={p.actor_verified===true}/><small>{s(p,'received_on').slice(0,10)}</small></article>)}{data.payments&&data.payments.length>10?<p className="form-note">Mostrando los últimos 10 de {data.payments.length} cobros registrados.</p>:null}</>}
  <ClientReporting key={id} id={id} role={role} onSaved={reload}/>
  <ClientCommercialLifecycle key={`commercial-${id}`} id={id} role={role} onSaved={reload}/>
  <ClientLinks id={id} value={data.client.social_links} phone={s(data.client,'phone')} canEdit={['owner','admin','management','sales'].includes(role)} refresh={reload}/>
  <p className="form-note">Historial de hasta 100 registros por categoría. Los movimientos financieros solo aparecen con permiso.</p>
 </>:<p>Cargando cliente…</p>}</Dialog>;
}

export function WorkPlanner({orders,userId,role,projects,openOrder,refresh,navigate,initialView}:{initialView?:string;orders:WorkItem[];userId:string;role:string;projects:{id:string;name:string;client_name:string}[];openOrder:(id:string)=>void;refresh:()=>Promise<void>;navigate:(label:string)=>void}){
 const [view,setView]=useState(initialView||'Mi día'),[selected,setSelected]=useState<string[]>([]),[month,setMonth]=useState(localDay().slice(0,7)),[templatesOpen,setTemplatesOpen]=useState(false),[batch,setBatch]=useState(false);
 const today=localDay(),mine=orders.filter(o=>(String(o.assigned_user_id)===String(userId)||o.assigned_user_ids?.some(id=>String(id)===String(userId)))&&!['approved','published'].includes(o.status));
 const visible=(view==='Mi día'?mine:view==='Calendario'?orders.filter(o=>o.due_date?.slice(0,7)===month):orders).slice().sort((a,b)=>(a.due_date||'9999').localeCompare(b.due_date||'9999'));
 return <section className="panel work-planner"><div className="panel-heading"><h2>{view==='Mi día'?'Trabajo diario':view}</h2>{!initialView&&<div className="choice-list compact">{['Mi día','Calendario','Lista y lotes'].map(v=><button key={v} className={view===v?'choice active':'choice'} onClick={()=>setView(v)}>{v}</button>)}</div>}</div>
  {view==='Mi día'&&<><p className="form-note">{mine.filter(o=>o.due_date&&o.due_date.slice(0,10)<=today).length} entregas para hoy o vencidas · {mine.length} piezas asignadas pendientes</p>{['owner','admin','finance'].includes(role)&&<div className="quick-actions"><button className="text-button" onClick={()=>navigate('Mora')}>Revisar cobros pendientes<ArrowUpRight size={14}/></button><button className="text-button" onClick={()=>navigate('Pagos')}>Disponibilidad y efectivo<ArrowUpRight size={14}/></button></div>}</>}
  {view==='Calendario'&&<label>Mes de entrega<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>}
  {view==='Lista y lotes'&&makers.includes(role)&&<div className="quick-actions"><button className="secondary" disabled={!selected.length} onClick={()=>setBatch(true)}>Cambiar {selected.length} piezas</button><button className="text-button" onClick={()=>setSelected([])}><X size={14}/>Quitar selección</button>{managers.includes(role)&&<button className="text-button" onClick={()=>setTemplatesOpen(true)}><CalendarRange size={14}/>Plantillas mensuales</button>}</div>}
  <div className="work-planner-list">{visible.slice(0,100).map(o=><div className="work-list-row" key={o.id}>{view==='Lista y lotes'&&makers.includes(role)&&<input type="checkbox" aria-label={`Seleccionar ${o.title}`} checked={selected.includes(String(o.id))} disabled={['approved','published'].includes(o.status)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,String(o.id)]:ids.filter(id=>id!==String(o.id)))}/>}<button className="text-button" onClick={()=>openOrder(String(o.id))}>{o.title}<small>{o.client_name} · {o.project_name}</small></button><time>{o.due_date?`${o.due_date.slice(0,10)}${o.due_time?` ${o.due_time.slice(0,5)}`:''}`:'Sin fecha'}</time><span>{states.find(s=>s.value===o.status)?.label||o.status}</span></div>)}</div>
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
 return <Dialog title="Plantillas mensuales de producción" close={close}><p>Generá una tanda en un proyecto existente. Repetir la misma plantilla, proyecto y mes no crea duplicados. No genera facturas ni cobros.</p><button className="text-button" onClick={()=>setCreating(v=>!v)}><LayoutTemplate size={14}/>{creating?'Usar una plantilla':'Crear plantilla'}</button>{notice&&<p role="status">{notice}</p>}
 {creating?<><p className="form-note">Una pieza por línea: título | día del mes | horas estimadas | checklist opcional.</p><Editor fields={[{key:'name',label:'Nombre de la plantilla'},{key:'lines',label:'Piezas',type:'textarea'}]} defaults={{name:'',lines:''}} save={async v=>{const items=v.lines.split('\n').filter(l=>l.trim()).map(l=>{const [title,day,hours,...rest]=l.split('|').map(x=>x.trim());return{title,day:Number(day),hours:Number(hours||0),checklist:rest.join(' | ')};});await api('/api/agency/productivity/templates',{name:v.name,items});await load();setCreating(false);}}/></>:<Editor key={templates.length} fields={[{key:'template',label:'Plantilla',choices:templates.map(t=>({value:String(t.id),label:s(t,'name')}))},{key:'project_id',label:'Proyecto',choices:projects.map(p=>({value:String(p.id),label:`${p.client_name} · ${p.name}`}))},{key:'month',label:'Mes (AAAA-MM)'},{key:'assigned_user_id',label:'Responsable inicial',choices:people,optional:true}]} defaults={{template:'',project_id:'',month:localDay().slice(0,7),assigned_user_id:''}} save={async v=>{if(!v.template||!v.project_id)throw Error('Elegí plantilla y proyecto.');const r=await api<{created:number;alreadyGenerated:boolean}>(`/api/agency/productivity/templates/${v.template}/generate`,v);await refresh();setNotice(r.alreadyGenerated?'Ese mes ya fue generado para esta plantilla y proyecto.':`${r.created} piezas creadas para ${v.month}.`);}}/>}
 <MonthlySchedules projects={projects} templates={templates.map(t=>({id:String(t.id),name:s(t,'name')}))} people={people}/>
 </Dialog>;
}
