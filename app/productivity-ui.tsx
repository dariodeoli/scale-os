"use client";
import {urgencyField,UrgencyBadge} from './urgency';
import {roleCan} from './capabilities';
import {useEffect,useState} from 'react';
import {ArrowUpRight,CalendarRange,Copy,LayoutTemplate,Pencil,X} from 'lucide-react';
import {api,Editor,money,type Field} from './operations';
import {Dialog} from './dialog';
import {SelectCustom} from './profile-controls';
import {Aviso, FilaDato, Subtabs} from 'owncoding-ui';
import {EmptyBlock, Kpi, KpiStrip, LoadingBlock, StateChip, ListGrid, ListRow, type Column} from './ui-v2';
import type {AssignedPerson} from './assigned-people';
import {notify} from './feedback';
import {completeSave} from './save-completion';
import {ClientReviewControl,ClientReviewPreview,ClientPortalAccess,ClientPortalDeliveryControl} from './daily-controls';
import {ClientAppearance,ClientIdentity} from './client-identity';
import './productivity.css';
import {MonthlySchedules} from './notifications-ui';
import {ClientLinks,clientWhatsappUrl} from './client-links';
import {WhatsAppButton} from './whatsapp-button';
import {listDateFull,listDateShort,dueTone} from './list-format';
import {ClientReporting} from './client-reporting';
import {ClientCommercialLifecycle} from './client-commercial-lifecycle';
import {clientState} from './client-status';
import {ProjectPresence} from './presence';
import {statuses} from './production-board';
import {ActorIdentity} from './actor-identity';
import {RecordAssignees} from './record-assignees';
import {WorkChecklist} from './work-checklist';
import {CommentBody,CommentComposer} from './commenting';
import {ClientRuc} from './client-ruc';
import {DriveLinks,driveLinksText} from './drive-links';
import {DueDate} from './due-date';
import {WorkOrderLinks} from './work-order-links';
type Row={id:string;[key:string]:unknown};
export type WorkItem={id:string;title:string;status:string;project_id:string;due_date?:string|null;due_time?:string|null;assigned_user_id?:string|null;assigned_user_ids?:string[];updated_at?:string;client_name?:string;project_name?:string;work_type?:string|null;urgency?:number|null;checklist_total?:number;checklist_completed?:number;estimated_hours?:string|number|null;actual_hours?:string|number|null;effective_assignees?:AssignedPerson[]};
const s=(r:Row,k:string)=>String(r[k]??'');
type ClientSummaryTerms={planName:string;recurringAmount:string|number;currency:string;cadence:string;intervalMonths:number|null;invoiceRequired:boolean};
type ClientSummary={relationshipStartedOn:string|null;terms:ClientSummaryTerms|null};
const commercialReadRoles=['owner','admin','management','sales','finance'];
const commercialFinancialRoles=['owner','admin','finance','management'];
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
// El diccionario canónico de estados de pieza vive en production-board; acá
// solo se filtra lo que la API acepta en un cambio de lote (estados abiertos).
const batchStates=statuses.filter(state=>['blocked','to_record','recorded','editing','review'].includes(state.id)).map(state=>({value:state.id,label:state.label}));
export const workStatusLabel=(value:string)=>statuses.find(state=>state.id===value)?.label||value;
const workTypeLabels:Record<string,string>={video:'Video',reedicion:'Reedición',foto:'Foto',produccion:'Producción',entregable:'Entregable'};
const workTypeChoices=[{value:'',label:'Sin clasificar'},...Object.entries(workTypeLabels).map(([value,label])=>({value,label}))];
// Plantilla única del planificador: el encabezado y las filas comparten grilla.
const PLANNER_COLUMNS:Column[]=[{key:'piece',label:'Pieza'},{key:'due',label:'Vence'},{key:'status',label:'Estado'},{key:'type',label:'Tipo'},{key:'people',label:'Responsables'},{key:'checklist',label:'Checklist',align:'end'},{key:'hours',label:'Horas'}];
const PLANNER_TEMPLATE='grid-cols-[minmax(13rem,1.6fr)_minmax(11rem,1.1fr)_7rem_7rem_minmax(9rem,1fr)_6rem_9rem]';
const managers=['owner','admin','management','production','collaborator'];
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
  const mentioned=(comment:Row)=>Array.isArray(comment.mentioned_user_ids)?comment.mentioned_user_ids.length:0;
  return <Dialog variant="drawer" title={heading} close={close}>
   {error?<Aviso tono="error" className="mb-3">{error}</Aviso>:null}
   {!order?<LoadingBlock label="Cargando pieza…" lines={4}/>:<>
    <section className="mb-4 grid min-w-0 gap-2 rounded-xl border border-ink-600 bg-ink-800/60 p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2"><ClientIdentity name={s(order,'client_name')} logo={s(order,'client_logo_url')} color={s(order,'client_color_key')}/><UrgencyBadge value={order.urgency}/></div>
      <div className="flex flex-wrap items-center gap-1.5">
        <StateChip tone={s(order,'status')==='approved'||s(order,'status')==='published'?'ok':s(order,'status')==='review'?'warn':'info'}>{workStatusLabel(s(order,'status'))}</StateChip>
        <StateChip tone="mute">{workTypeLabels[s(order,'work_type')]||'Sin clasificar'}</StateChip>
        <DueDate value={s(order,'due_date')} time={s(order,'due_time')} compact/>
      </div>
      <dl className="grid gap-1 text-xs sm:grid-cols-2">
        <FilaDato etiqueta="Horas estimadas" etiquetaComo="dt" valorComo="dd" valor={order.estimated_hours==null||order.estimated_hours===''?'—':`${order.estimated_hours} h`}/>
        <FilaDato etiqueta="Horas trabajadas" etiquetaComo="dt" valorComo="dd" valor={order.actual_hours==null||order.actual_hours===''?'—':`${order.actual_hours} h`}/>
        <FilaDato etiqueta="Niveles de aprobación completados" etiquetaComo="dt" valorComo="dd" valor={s(order,'approval_step')||'0'}/>
        <FilaDato etiqueta="Última actualización" etiquetaComo="dt" valorComo="dd" valor={<span className="whitespace-nowrap">{listDateFull(s(order,'updated_at'))}</span>}/>
      </dl>
      <ProjectPresence projectId={s(order,'project_id')}/>
    </section>
    <Subtabs className="[&>button]:min-h-11 md:[&>button]:min-h-9" value={tab} onChange={setTab} items={[['Detalle','Detalle'],['Comentarios',`Comentarios (${data.comments.length})`],['Historial','Historial']]}/>
    <div hidden={tab!=='Detalle'} className="grid gap-4">
     <div className="flex flex-wrap items-center gap-2">{editable&&!editing?<button className="secondary" type="button" onClick={()=>setEditing(true)}><Pencil size={14}/>Editar pieza</button>:null}</div>
     {editing&&editable?<RecordAssignees kind="work-orders" id={id} organizationId={organizationId} role={role} updatedAt={s(order,'updated_at')} refresh={()=>completeSave(close,refresh)}>{save=><Editor key={s(order,'updated_at')} fields={fields} defaults={Object.fromEntries(fields.map(f=>[f.key,f.key==='due_date'?s(order,f.key).slice(0,10):f.key==='due_time'?s(order,f.key).slice(0,5):f.key==='drive_links'?driveLinksText(order.drive_links,s(order,'drive_url')):s(order,f.key)]))} save={save}/>}</RecordAssignees>:<>
        <section className="grid gap-1"><h4 className="text-sm font-semibold text-fore">Descripción</h4><p className="whitespace-pre-line text-[13px] text-mute">{s(order,'description')||'Sin descripción'}</p></section>
        <section className="grid gap-1"><h4 className="text-sm font-semibold text-fore">Responsables</h4><RecordAssignees kind="work-orders" id={id} organizationId={organizationId} role="viewer" refresh={refresh}/></section>
        <section className="grid gap-1"><h4 className="text-sm font-semibold text-fore">Archivos y enlaces</h4><div className="[&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center md:[&_a]:min-h-0"><DriveLinks value={order.drive_links} legacy={s(order,'drive_url')}/></div><WorkOrderLinks orderId={id} role={role}/></section>
        <section><WorkChecklist id={id} organizationId={organizationId} role={role} refresh={refresh}/></section>
      </>}
     {editable?<section className="grid gap-2"><h4 className="text-sm font-semibold text-fore">Acciones</h4><div className="flex flex-wrap items-center gap-2"><button className="secondary" disabled={busy||['approved','published','review'].includes(s(order,'status'))} onClick={async()=>{setBusy(true);try{await api(`/api/agency/work-orders/${id}`,{status:'review'},'PATCH');await load();await refresh();}catch(e){setError(errorText(e));}finally{setBusy(false);}}}>Listo para revisión</button><button className="text-button" disabled={busy} onClick={()=>void action(`/api/agency/productivity/orders/${id}/duplicate`)}><Copy size={14}/>Duplicar pieza</button>
      {managers.includes(role)&&order.status==='review'&&<button className="secondary" disabled={busy} onClick={()=>void action(`/api/agency/work-orders/${id}/approve`)} title="Registra una aprobación interna. Al completar los niveles del proyecto, la pieza queda aprobada.">Aprobar siguiente nivel</button>}
      {managers.includes(role)&&order.status==='approved'&&<button className="secondary" disabled={busy} onClick={()=>void action(`/api/agency/work-orders/${id}/publish`)}>Marcar publicada</button>}
     </div></section>:null}
      {managers.includes(role)?<section className="grid gap-2"><h4 className="text-sm font-semibold text-fore">Cliente</h4><ClientReviewPreview title={s(order,'title')} assetUrl={s(order,'drive_url')}/><ClientReviewControl orderId={id}/><ClientPortalDeliveryControl orderId={id} title={s(order,'title')} assetUrl={s(order,'drive_url')}/></section>:null}
    </div>
   {tab==='Comentarios'?<div className="grid gap-3"><p className="text-[11px] text-mute">Comentarios internos de esta pieza; no se envían al cliente. Usá @ para mencionar a una persona.</p>{editable?<CommentComposer label="Agregar comentario" save={async (body,mentionedUserIds)=>{await api(`/api/agency/productivity/orders/${id}/comments`,{body,mentioned_user_ids:mentionedUserIds});await completeSave(()=>{},load);}}/>:null}{data.comments.map(c=><article className="grid gap-1 border-b border-ink-600/60 pb-3 last:border-0" id={`comment-${c.id}`} key={c.id}><ActorIdentity name={s(c,'actor_name')||s(c,'author_email')} photoUrl={s(c,'actor_photo_url')} verified={c.actor_verified===true} timestamp={s(c,'created_at')}/>{mentioned(c)?<StateChip tone="info" title={`Menciona a ${mentioned(c)} persona${mentioned(c)===1?'':'s'}`}>Menciona a {mentioned(c)}</StateChip>:null}<CommentBody value={s(c,'body')}/></article>)}{!data.comments.length?<EmptyBlock title="Todavía no hay comentarios." description="Escribí el primero para dejar registro interno de la pieza." compact/>:null}</div>:null}
   {tab==='Historial'?<div className="grid gap-3"><p className="text-[13px] text-fore">Niveles aprobados: <b className="tabular-nums">{s(order,'approval_step')||'0'}</b></p>{data.history.map(h=><article className="grid gap-1 border-b border-ink-600/60 pb-3 last:border-0" key={h.id}><ActorIdentity name={s(h,'actor_name')} photoUrl={s(h,'actor_photo_url')} verified={h.actor_verified===true} timestamp={s(h,'created_at')}/><p className="text-[13px] text-mute">{s(h,'action')==='INSERT'?'Creó la pieza':'Actualizó la pieza'}</p>{h.previous_status!==h.next_status?<p className="text-[13px] text-mute">{workStatusLabel(s(h,'previous_status'))||'Nueva'} → <b className="text-fore">{workStatusLabel(s(h,'next_status'))}</b></p>:null}</article>)}{!data.history.length?<EmptyBlock title="Sin cambios registrados." compact/>:null}</div>:null}
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
 return <Dialog variant="drawer" title={data?s(data.client,'name'):'Ficha de cliente'} close={close}>{error&&<p className="error" role="alert">{error}</p>}{data?<>
  {['owner','admin','management','sales','finance'].includes(role)?<><ClientAppearance id={id} name={s(data.client,'name')} logo={s(data.client,'logo_url')} color={s(data.client,'color_key')} showIdentity={false} refresh={reload}/><ClientRuc embedded refresh={reload} existing={{id,name:s(data.client,'name'),legalName:s(data.client,'legal_name'),taxId:s(data.client,'tax_id'),onUpdated:reload}}/></>:<ClientIdentity name={s(data.client,'name')} logo={s(data.client,'logo_url')} color={s(data.client,'color_key')}/>}
  <p>{s(data.client,'email')} · {s(data.client,'phone')}</p><WhatsAppButton className="client-whatsapp min-h-11 md:min-h-8" href={clientWhatsappUrl(s(data.client,'phone'))}/><p>{s(data.client,'notes')}</p>
  {summary&&<section className="client-summary" aria-label="Resumen comercial del cliente">
   <div className="client-summary-grid">
    <article><span>Estado del servicio</span><strong>{clientState({lifecycle_status:s(data.client,'lifecycle_status'),active:data.client.active!==false}).label}</strong></article>
    <article><span>Cobros</span><strong>{payStatus?payStatus.payment_status==='up_to_date'?'Al día':payStatus.payment_status==='due_soon'?`Vence ${listDateShort(payStatus.next_due_on)||'próximamente'}`:`${payStatus.days_overdue} días de mora`:'Sin datos'}</strong>{payStatus&&payStatus.currency&&Number(payStatus.outstanding_amount)>0?<small title={`Pendiente ${money(Number(payStatus.outstanding_amount),payStatus.currency)}`}>Pendiente {money(Number(payStatus.outstanding_amount),payStatus.currency)}</small>:null}</article>
    <article><span>Plan</span><strong title={summary.terms?.planName||undefined}>{summary.terms?.planName||'Sin plan registrado'}</strong></article>
    <article><span>Pago mensual</span><strong title={summary.terms?money(String(summary.terms.recurringAmount),summary.terms.currency):undefined}>{summary.terms?money(String(summary.terms.recurringAmount),summary.terms.currency):'Sin datos'}</strong></article>
    <article><span>Recurrencia</span><strong>{cadenceLabel(summary.terms)}</strong></article>
    <article><span>Cliente desde</span><strong>{monthsSinceLabel(sinceValue)||'Sin fecha registrada'}</strong>{/^\d{4}-\d{2}-\d{2}$/.test(sinceValue)?<small>{listDateFull(sinceValue)}</small>:null}</article>
    <article><span>Factura</span><strong>{summary.terms?summary.terms.invoiceRequired?'Pide factura':'No pide factura':'Sin datos'}</strong></article>
    <article><span>RUC</span><strong title={s(data.client,'tax_id')||undefined}>{s(data.client,'tax_id')||'Sin RUC registrado'}</strong>{s(data.client,'legal_name')&&s(data.client,'legal_name')!==s(data.client,'name')?<small title={s(data.client,'legal_name')}>{s(data.client,'legal_name')}</small>:null}</article>
   </div>
  </section>}
  {managers.includes(role)&&<div className="quick-actions"><button className="primary min-h-11 md:min-h-10" onClick={()=>createProject(id)}>Nuevo proyecto para este cliente</button>{roleCan(role,'portal-access.manage')&&<ClientPortalAccess clientId={id}/>}</div>}
  <div className="choice-list">{['Producción',...(data.budgets?['Presupuestos']:[]),...(data.invoices?['Cobros']:[])].map(t=><button key={t} className={`${tab===t?'choice active':'choice'} min-h-11 md:min-h-10`} onClick={()=>setTab(t)}>{t}</button>)}</div>
  {tab==='Producción'&&<><h3>Proyectos ({data.projects.length})</h3><div className="drawer-list">{data.projects.length?<div className="drawer-list-head" aria-hidden="true"><span>Proyecto</span><span>Enlaces</span></div>:null}{data.projects.map(p=><article className="activity-line" key={p.id}><b title={s(p,'name')}>{s(p,'name')}</b><DriveLinks value={p.drive_links} legacy={s(p,'drive_url')} compact/></article>)}</div><h3>Piezas recientes</h3><div className="drawer-list">{data.orders.length?<div className="drawer-list-head" aria-hidden="true"><span>Pieza</span><span>Estado</span></div>:null}{data.orders.map(o=><button className="work-list-row" key={o.id} onClick={()=>openOrder(String(o.id))}><b title={s(o,'title')}>{s(o,'title')}</b><span>{workStatusLabel(s(o,'status'))}</span></button>)}</div>{!data.projects.length&&<p className="empty-copy">Este cliente aún no tiene proyectos.</p>}</>}
  {tab==='Presupuestos'&&<div className="drawer-list"><div className="drawer-list-head" aria-hidden="true"><span>Presupuesto</span><span>Estado y total</span></div>{data.budgets?.map(b=><article className="activity-line" key={b.id}><b title={`${s(b,'number')} · ${s(b,'title')}`}>{s(b,'number')} · {s(b,'title')}</b><span title={`${s(b,'status')} · ${money(s(b,'total'),s(b,'currency'))}`}>{s(b,'status')} · {money(s(b,'total'),s(b,'currency'))}</span></article>)}</div>}
  {tab==='Cobros'&&<><h3>Facturas y pendientes</h3><div className="drawer-list">{data.invoices?.length?<div className="drawer-list-head" aria-hidden="true"><span>Factura</span><span>Cobrado y pendiente</span></div>:null}{data.invoices?.map(i=>{const detail=`Cobrado ${money(s(i,'paid_amount'),s(i,'currency'))} · Pendiente ${money(Math.max(0,Number(i.total)-Number(i.paid_amount)),s(i,'currency'))}`;return <article className="activity-line" key={i.id}><b title={s(i,'number')}>{s(i,'number')}</b><span title={detail}>{detail}</span></article>;})}</div><h3>Quién recibió y dónde</h3>{data.payments?.length?<div className="drawer-list"><div className="drawer-list-head" aria-hidden="true"><span>Cobro</span><span>Quién recibió</span></div>{data.payments.slice(0,10).map(p=><article className="activity-line" key={p.id}><b title={`${money(s(p,'amount'),s(p,'currency'))} · ${s(p,'account_name')}`}>{money(s(p,'amount'),s(p,'currency'))} · {s(p,'account_name')}</b><div className="payment-cell"><ActorIdentity name={s(p,'actor_name')||s(p,'received_by_email')||'Sin persona registrada'} photoUrl={s(p,'actor_photo_url')} verified={p.actor_verified===true}/><small title={s(p,'received_on')||undefined}>{listDateShort(s(p,'received_on'))}</small></div></article>)}</div>:null}{data.payments&&data.payments.length>10?<p className="form-note">Mostrando los últimos 10 de {data.payments.length} cobros registrados.</p>:null}</>}
  <ClientReporting key={id} id={id} role={role} onSaved={reload}/>
  <ClientCommercialLifecycle key={`commercial-${id}`} id={id} role={role} onSaved={reload}/>
  <ClientLinks id={id} value={data.client.social_links} phone={s(data.client,'phone')} canEdit={['owner','admin','management','sales'].includes(role)} refresh={reload}/>
  <p className="form-note">Historial de hasta 100 registros por categoría. Los movimientos financieros solo aparecen con permiso.</p>
 </>:<p role="status">Cargando cliente…</p>}</Dialog>;
}


export function WorkPlanner({orders,userId,role,projects,openOrder,refresh,navigate,initialView}:{initialView?:string;orders:WorkItem[];userId:string;role:string;projects:{id:string;name:string;client_name:string}[];openOrder:(id:string)=>void;refresh:()=>Promise<void>;navigate:(label:string)=>void}){
 const [view,setView]=useState(initialView||'Mi día'),[selected,setSelected]=useState<string[]>([]),[month,setMonth]=useState(localDay().slice(0,7)),[templatesOpen,setTemplatesOpen]=useState(false),[batch,setBatch]=useState(false);
 const today=localDay(),mine=orders.filter(o=>(String(o.assigned_user_id)===String(userId)||o.assigned_user_ids?.some(id=>String(id)===String(userId)))&&!['approved','published'].includes(o.status));
 const visible=(view==='Mi día'?mine:view==='Calendario'?orders.filter(o=>o.due_date?.slice(0,7)===month):orders).slice().sort((a,b)=>(a.due_date||'9999').localeCompare(b.due_date||'9999'));
 const dueToday=mine.filter(o=>o.due_date&&o.due_date.slice(0,10)<=today).length;
 const calendarDays=(()=>{const [year,m]=month.split('-').map(Number),days=new Date(Date.UTC(year,m,0)).getUTCDate(),offset=(new Date(Date.UTC(year,m-1,1)).getUTCDay()+6)%7;return {days,offset,year,m};})();
 const monthPieces=(day:number)=>{const date=`${month}-${String(day).padStart(2,'0')}`;return visible.filter(o=>o.due_date?.slice(0,10)===date);};
 const openPiece=(id:string)=>()=>openOrder(id);
 return <section className="grid min-w-0 gap-4" aria-label="Planificador de producción">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
   <h2 className="text-[17px] font-semibold tracking-tight text-fore">{view==='Mi día'?'Trabajo diario':view}</h2>
   {!initialView?<Subtabs value={view} onChange={setView} items={[['Mi día','Mi día'],['Calendario','Calendario'],['Lista y lotes','Lista y lotes']]} className="mb-0 [&>button]:min-h-11 md:[&>button]:min-h-9"/>:null}
  </div>
  {view==='Mi día'?<>
   <KpiStrip className="sm:grid-cols-2 xl:grid-cols-2">
    <Kpi label="Entregas para hoy o vencidas" valor={dueToday} hint="Piezas asignadas con entrega hasta hoy"/>
    <Kpi label="Piezas asignadas pendientes" valor={mine.length} hint="Sin aprobar ni publicar"/>
   </KpiStrip>
   {['owner','admin','finance'].includes(role)?<div className="flex flex-wrap items-center gap-2"><button type="button" className="text-button" onClick={()=>navigate('Mora')}>Revisar cobros pendientes<ArrowUpRight size={14}/></button><button type="button" className="text-button" onClick={()=>navigate('Pagos')}>Disponibilidad y efectivo<ArrowUpRight size={14}/></button></div>:null}
  </>:null}
  {view==='Calendario'?<label className="grid w-44 gap-1.5"><span className="text-[12px] font-semibold text-mute">Mes de entrega</span><input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="min-h-11"/></label>:null}
  {view==='Calendario'?<div className="grid gap-2" aria-label="Calendario de entregas del mes">
   <div className="hidden grid-cols-7 gap-1 min-[769px]:grid" aria-hidden="true">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(day=><span key={day} className="text-center text-[10px] font-bold uppercase tracking-wider text-mute">{day}</span>)}</div>
   <div className="grid grid-cols-1 gap-1 min-[769px]:grid-cols-7">{Array.from({length:calendarDays.offset},(_,index)=><div className="hidden min-h-16 rounded-lg border border-transparent min-[769px]:block" key={`blank-${index}`}/>)}{Array.from({length:calendarDays.days},(_,index)=>{const day=index+1,rows=monthPieces(day),date=`${month}-${String(day).padStart(2,'0')}`;return <div className="grid min-h-16 content-start gap-1 rounded-lg border border-ink-600/60 p-1" key={date} aria-label={date}><time className="text-[11px] tabular-nums text-mute" dateTime={date}>{day}</time>{rows.map(order=><button key={order.id} type="button" className="grid min-h-11 gap-0.5 rounded-md border border-fono/30 bg-fono/10 px-1.5 py-1 text-left text-[11px] text-fono-light min-[769px]:min-h-0" onClick={openPiece(String(order.id))}><b className="break-words">{order.title}</b><span className="text-mute">{order.client_name||''}{order.due_time?` · ${order.due_time.slice(0,5)}`:''}</span></button>)}</div>;})}</div>
  </div>:null}
  {view==='Lista y lotes'&&makers.includes(role)?<div className="flex flex-wrap items-center gap-2"><button className="secondary" disabled={!selected.length} onClick={()=>setBatch(true)}>Cambiar {selected.length} piezas</button><button className="text-button" onClick={()=>setSelected([])}><X size={14}/>Quitar selección</button>{managers.includes(role)?<button className="text-button" onClick={()=>setTemplatesOpen(true)}><CalendarRange size={14}/>Plantillas mensuales</button>:null}</div>:null}
  <ListGrid label={view==='Lista y lotes'?'Piezas en lista y lotes':'Piezas'} template={PLANNER_TEMPLATE} columns={PLANNER_COLUMNS} minWidthClass="min-w-[72rem]">
   {visible.slice(0,100).map(o=><ListRow key={o.id} template={PLANNER_TEMPLATE} data-status={o.status} className="md:!py-1.5">
    <span className="flex min-w-0 items-center gap-2">
     {view==='Lista y lotes'&&makers.includes(role)?<label className="flex h-11 min-w-11 items-center justify-center md:h-auto md:min-w-0" title="Seleccionar para operar en lote"><input type="checkbox" className="h-6 w-6 p-0 accent-fono" aria-label={`Seleccionar ${o.title}`} checked={selected.includes(String(o.id))} disabled={['approved','published'].includes(o.status)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,String(o.id)]:ids.filter(id=>id!==String(o.id)))}/></label>:null}
     <button type="button" className="flex min-h-11 min-w-0 flex-col justify-center text-left md:min-h-0" onClick={openPiece(String(o.id))}><b className="block truncate text-[13px] font-semibold text-fore" title={o.title}>{o.title}</b><small className="block truncate text-[11px] text-mute" title={`${o.client_name||''} · ${o.project_name||''}`}>{o.client_name} · {o.project_name}</small></button>
    </span>
    <span className="min-w-0 whitespace-nowrap text-[11.5px] tabular-nums text-mute" data-tone={dueTone(o.due_date)||undefined} title={o.due_date?`Entrega ${listDateShort(o.due_date)||''}${o.due_time?` · ${o.due_time.slice(0,5)} h`:''}`:undefined}>{o.due_date?<><span className="list-date">{listDateShort(o.due_date)}</span>{o.due_time?` · ${o.due_time.slice(0,5)}`:''}</>:'Sin fecha'}</span>
    <span className="min-w-0"><StateChip tone={o.status==='approved'||o.status==='published'?'ok':o.status==='review'?'warn':o.status==='blocked'?'bad':'info'}>{workStatusLabel(o.status)}</StateChip></span>
    <span className="min-w-0"><StateChip tone="mute">{workTypeLabels[String(o.work_type||'')]||'Sin clasificar'}</StateChip></span>
    <span className="min-w-0 truncate text-[11.5px] text-mute" title={(o.effective_assignees||[]).map(person=>person.full_name||person.email||'').filter(Boolean).join(', ')||undefined}>{(o.effective_assignees||[]).map(person=>person.full_name||person.email||'').filter(Boolean).join(', ')||'Sin responsables'}</span>
    <span className="whitespace-nowrap text-[11.5px] tabular-nums text-mute">{o.checklist_total?`☑ ${o.checklist_completed||0}/${o.checklist_total}`:'—'}</span>
    <span className="whitespace-nowrap text-[11.5px] tabular-nums text-mute">{[o.estimated_hours?`${o.estimated_hours} h est.`:'',o.actual_hours?`${o.actual_hours} h reales`:''].filter(Boolean).join(' · ')||'—'}</span>
   </ListRow>)}
  </ListGrid>
  {!visible.length?<EmptyBlock title={view==='Mi día'?'No tenés piezas pendientes asignadas.':'No hay piezas para esta vista.'} description={view==='Mi día'?'Podés elegir el tablero general desde el selector de vista.':'Probá con otro mes o cambiá de vista.'} icon="box"/>:null}
  {visible.length>100?<p className="text-xs text-mute" role="status">Mostrando 100 de {visible.length}. Filtrá por mes para acotar la lista.</p>:null}
  {batch?<BatchEditor orders={orders.filter(o=>selected.includes(String(o.id)))} close={()=>setBatch(false)} done={async()=>{await refresh();setSelected([]);setBatch(false);}}/>:null}
  {templatesOpen?<MonthlyTemplates projects={projects} close={()=>setTemplatesOpen(false)} refresh={refresh}/>:null}
 </section>;
}
function BatchEditor({orders,close,done}:{orders:WorkItem[];close:()=>void;done:()=>Promise<void>}){
 const [field,setField]=useState('due_date');const people=usePeople();
 return <Dialog title={`Actualizar ${orders.length} piezas`} close={close}><div className="grid gap-3"><p className="text-sm text-mute">Se aplica todo el lote o ninguno. No incluye aprobaciones, publicaciones ni cobros.</p><SelectCustom label="Qué cambiar" value={field} onChange={setField} choices={[{value:'due_date',label:'Fecha de entrega'},{value:'assigned_user_id',label:'Responsable'},{value:'status',label:'Estado de producción'}]}/><Editor key={field} fields={[{key:'value',label:'Nuevo valor',...(field==='due_date'?{type:'date' as const}:{choices:field==='status'?batchStates:people})}]} defaults={{value:field==='status'?'to_record':''}} save={async v=>{const result=await api<{updated:number}>('/api/agency/productivity/batch',{ids:orders.map(o=>o.id),versions:Object.fromEntries(orders.map(o=>[o.id,o.updated_at])),change:{[field]:v.value}});notify({tone:'success',message:`${result.updated} piezas actualizadas.`});await done();}}/></div></Dialog>;
}
function MonthlyTemplates({projects,close,refresh}:{projects:{id:string;name:string;client_name:string}[];close:()=>void;refresh:()=>Promise<void>}){
 const [templates,setTemplates]=useState<Row[]>([]),[creating,setCreating]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');const people=usePeople();
 async function load(){setTemplates((await api<{templates:Row[]}>('/api/agency/productivity/templates')).templates);}
 useEffect(()=>{void load().catch(e=>setError(errorText(e)));},[]);
 return <Dialog title="Plantillas mensuales de producción" close={close}><div className="grid gap-3"><p className="text-sm text-mute">Generá una tanda en un proyecto existente. Repetir la misma plantilla, proyecto y mes no crea duplicados. No genera facturas ni cobros.</p><button className="text-button" onClick={()=>setCreating(v=>!v)}><LayoutTemplate size={14}/>{creating?'Usar una plantilla':'Crear plantilla'}</button>{error?<Aviso tono="error">{error}</Aviso>:null}{notice?<Aviso tono="ok">{notice}</Aviso>:null}
  {creating?<><p className="text-xs text-mute">Una pieza por línea: título | día del mes | horas estimadas | checklist opcional.</p><Editor fields={[{key:'name',label:'Nombre de la plantilla'},{key:'lines',label:'Piezas',type:'textarea'}]} defaults={{name:'',lines:''}} save={async v=>{const items=v.lines.split('\n').filter(l=>l.trim()).map(l=>{const [title,day,hours,...rest]=l.split('|').map(x=>x.trim());return{title,day:Number(day),hours:Number(hours||0),checklist:rest.join(' | ')};});await api('/api/agency/productivity/templates',{name:v.name,items});await load();setCreating(false);}}/></>:<Editor key={templates.length} fields={[{key:'template',label:'Plantilla',choices:templates.map(t=>({value:String(t.id),label:s(t,'name')}))},{key:'project_id',label:'Proyecto',choices:projects.map(p=>({value:String(p.id),label:`${p.client_name} · ${p.name}`}))},{key:'month',label:'Mes (AAAA-MM)'},{key:'assigned_user_id',label:'Responsable inicial',choices:people,optional:true}]} defaults={{template:'',project_id:'',month:localDay().slice(0,7),assigned_user_id:''}} save={async v=>{if(!v.template||!v.project_id)throw Error('Elegí plantilla y proyecto.');const r=await api<{created:number;alreadyGenerated:boolean}>(`/api/agency/productivity/templates/${v.template}/generate`,v);await refresh();setNotice(r.alreadyGenerated?'Ese mes ya fue generado para esta plantilla y proyecto.':`${r.created} piezas creadas para ${v.month}.`);}}/>}
  <MonthlySchedules projects={projects} templates={templates.map(t=>({id:String(t.id),name:s(t,'name')}))} people={people}/>
 </div></Dialog>;
}
