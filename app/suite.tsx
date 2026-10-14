"use client";
import {urgencyField} from './urgency';
import {currencyChoices} from "./currencies";
import {useCompanyCurrency} from './currency-provider';
import {ActorIdentity} from './actor-identity';
import {RecordAssignees} from './record-assignees';
import {ClientReviewControl} from './daily-controls';
import {ProjectPresence} from './presence';
import {ClientIdentity} from './client-identity';
import {ClientEditorDialog} from './client-editor';
import {useEffect,useState} from 'react';
import {EmptyBlock,LoadingBlock,ActionMenu,MoneyText,StateChip,type RecordMenuItem} from './ui-v2';
import {budgetState} from './budget-status';
export type {RecordMenuItem} from './ui-v2';
import {activityEvent} from './activity-format';
import {Building2,ChartNoAxesCombined,CircleDollarSign,Copy,Eye,Link2,Link2Off,Pencil,Ticket} from 'lucide-react';
import {api,Dialog,Editor,Field} from './operations';
import {ConfirmDialog} from './dialog';
import {roleCan} from './capabilities';
import {Aviso} from 'owncoding-ui';
import {PHONE_HELP} from './field-rules';
import {QuoteComposer} from './quote-composer';
import {completeSave} from './save-completion';
import {canRemoveRecord,RemoveRecord,RemoveRecordDialog} from './archive-controls';
import {driveLinksText} from './drive-links';
import {listDateShort} from './list-format';
import './settings-slice.css';
type Row={id:string;[key:string]:unknown};
const str=(r:Row,k:string)=>String(r[k]??'');
const err=(e:unknown)=>e instanceof Error?e.message:'No se pudo completar';
const currencies=currencyChoices;
export function RecordEditor({kind,recordId,name,refresh,role,canManageTerms,planCta,actions=['edit','remove'],menu=false,extraMenuItems=[]}:{kind:'clients'|'projects'|'work-orders';recordId:string;name?:string;refresh:()=>Promise<void>;role:string;canManageTerms?:boolean;planCta?:'text'|'icon';actions?:ReadonlyArray<'edit'|'remove'>;menu?:boolean;extraMenuItems?:RecordMenuItem[]}){
 const [record,setRecord]=useState<Row|null>(null),[error,setError]=useState('');
 const [clientEditor,setClientEditor]=useState<{planFocus:boolean}|null>(null);
 const [removeOpen,setRemoveOpen]=useState(false);
 const permitted=kind==='clients'?['owner','admin','management','sales','finance','collaborator']:kind==='projects'?['owner','admin','management','production','collaborator']:['owner','admin','management','production','editor','collaborator'];
 // Misma capacidad que valida el PATCH de /commercial-terms (commercial-terms.manage).
 const canPlan=kind==='clients'&&(canManageTerms??roleCan(role,'commercial-terms.manage'));
 async function open(){setError('');try{setRecord((await api<{record:Row}>(`/api/agency/${kind}/${recordId}`)).record);}catch(e){setError(err(e));}}
 const openEdit=()=>kind==='clients'?setClientEditor({planFocus:false}):void open();
 if(!permitted.includes(role))return null;
 const fields:Field[]=kind==='clients'?[]:kind==='projects'?[{key:'name',label:'Proyecto',section:'Datos del proyecto'},{key:'status',label:'Estado',section:'Datos del proyecto',choices:[{value:'active',label:'Activo'},{value:'paused',label:'Pausado'},{value:'completed',label:'Completado'},{value:'cancelled',label:'Cancelado'}]},{key:'approval_levels',label:'Niveles de aprobación',section:'Datos del proyecto',help:'Cantidad de aprobaciones internas consecutivas (1 a 3) antes de aprobar una pieza. No cambia permisos ni representa urgencia.',choices:[1,2,3].map(n=>({value:String(n),label:String(n)}))},{key:'start_date',label:'Inicio',type:'date',optional:true,section:'Fechas'},{key:'due_date',label:'Entrega',type:'date',optional:true,section:'Fechas'},urgencyField,{key:'drive_links',label:'Enlaces de archivo o carpeta de Drive',type:'textarea',optional:true,wide:true,section:'Enlaces'}]:[{key:'title',label:'Pieza o tarea'},{key:'due_date',label:'Entrega',type:'date',optional:true},{key:'due_time',label:'Hora de entrega',type:'time',optional:true},{key:'work_type',label:'Tipo de trabajo',optional:true,choices:[{value:'',label:'Sin clasificar'},{value:'video',label:'Video'},{value:'reedicion',label:'Reedición'},{value:'foto',label:'Foto'},{value:'produccion',label:'Producción'},{value:'entregable',label:'Entregable'}]},urgencyField,{key:'estimated_hours',label:'Horas estimadas',type:'number',optional:true},{key:'actual_hours',label:'Horas reales',type:'number',optional:true},{key:'drive_links',label:'Enlaces de archivo o carpeta de Drive',type:'textarea',optional:true,wide:true},{key:'description',label:'Brief y notas',type:'textarea',optional:true}];
  const dialogTitles={clients:'Editar cliente',projects:'Editar proyecto','work-orders':'Editar pieza'} as const;
  // Menú ⋯ (#140): una sola vía de acciones por fila; editar/archivar/papelera
  // viven acá y la acción rápida queda a la vista. El CTA de plan se mantiene
  // visible cuando falta el precio (es el trabajo pendiente de la fila).
  const menuItems:RecordMenuItem[]=[
   ...(actions.includes('edit')?[{id:'edit',label:dialogTitles[kind],icono:'edit',onClick:openEdit}]:[]),
   ...extraMenuItems,
   ...(actions.includes('remove')&&canRemoveRecord(kind,role)?[{id:'remove',label:'Mover a la papelera',icono:'trash',peligro:true,onClick:()=>setRemoveOpen(true)}]:[]),
  ];
 return <>{planCta&&canPlan?planCta==='icon'?<button className="icon-button" type="button" title={`Cargar plan y pago: ${name||'cliente'}`} aria-label={`Cargar plan y pago: ${name||'cliente'}`} onClick={()=>setClientEditor({planFocus:true})}><CircleDollarSign size={16}/></button>:<button className="text-button" type="button" title={`Cargar plan y pago: ${name||'cliente'}`} onClick={()=>setClientEditor({planFocus:true})}><CircleDollarSign size={14} aria-hidden="true"/>Cargar plan</button>:null}{menu&&menuItems.length?<ActionMenu label={`Acciones: ${name||kind}`} items={menuItems}/>:<>{actions.includes('edit')?<button className="icon-button" type="button" title="Editar" aria-label={`Editar ${name||'registro'}`} onClick={openEdit}><Pencil size={16}/></button>:null}{actions.includes('remove')?<RemoveRecord kind={kind} id={recordId} name={name||`Registro #${recordId}`} role={role} done={refresh}/>:null}</>}{removeOpen?<RemoveRecordDialog kind={kind} id={recordId} name={name||`Registro #${recordId}`} role={role} done={refresh} open onClose={()=>setRemoveOpen(false)}/>:null}{kind==='work-orders'&&['owner','admin','management','production','collaborator'].includes(role)&&<ClientReviewControl orderId={recordId}/>}{error&&<Aviso tono="error" compact role="alert">{error}</Aviso>}{record&&kind!=='clients'&&<Dialog title={dialogTitles[kind]} close={()=>setRecord(null)}><ClientIdentity name={str(record,'client_name')} logo={str(record,'client_logo_url')} color={str(record,'client_color_key')}/>{kind==='projects'&&<ProjectPresence projectId={recordId}/>}<RecordAssignees kind={kind} id={recordId} role={role} updatedAt={str(record,'updated_at')} refresh={()=>completeSave(()=>setRecord(null),refresh)}>{save=><Editor columns fields={fields} defaults={Object.fromEntries(fields.map(f=>[f.key,f.key==='drive_links'?driveLinksText(record.drive_links,str(record,'drive_url')):f.type==='date'?str(record,f.key).slice(0,10):f.type==='time'?str(record,f.key).slice(0,5):str(record,f.key)]))} save={save}/>}</RecordAssignees>{kind==='work-orders'&&['owner','admin','management','production','collaborator'].includes(role)&&['review','approved'].includes(str(record,'status'))&&<button className="secondary" onClick={async()=>{try{await api(`/api/agency/work-orders/${recordId}/${record.status==='review'?'approve':'publish'}`,{});await refresh();await open();}catch(e){setError(err(e));}}}>{record.status==='review'?`Aprobar siguiente nivel (completados: ${str(record,'approval_step')})`:'Marcar publicado'}</button>}{error&&<Aviso tono="error" compact role="alert">{error}</Aviso>}</Dialog>}{clientEditor&&<ClientEditorDialog mode="edit" clientId={recordId} role={role} canManageTerms={canManageTerms} planFocus={clientEditor.planFocus} close={()=>setClientEditor(null)} refresh={refresh}/>}</>;
}
const numberOrNull=(value:unknown)=>{if(value===null||value===undefined||value==='')return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null;};
function BudgetConsult({record}:{record:Row}){
 const items=(Array.isArray(record.items)?record.items:[]) as Row[];
 const state=budgetState(record.status);
 const valid=str(record,'valid_until').slice(0,10);
 const currency=str(record,'currency')||'PYG';
 const subtotal=numberOrNull(record.subtotal),total=numberOrNull(record.total);
 const taxes=subtotal!==null&&total!==null?total-subtotal:null;
 return <section className="grid gap-3" aria-label="Detalle del presupuesto">
  <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
   <StateChip tone={state.tone}>{state.label}</StateChip>
   <span className="min-w-0 truncate text-sm text-fore" title={str(record,'client_name')}>{str(record,'client_name')||'Sin cliente'}</span>
   <span className="text-xs text-mute">Vigencia: <span className="list-date">{valid?listDateShort(valid):'Sin vigencia'}</span></span>
  </header>
  {items.length?<div className="grid gap-1">
   {items.map((item,index)=><div key={String(item.id??index)} className="flex items-baseline justify-between gap-3 border-b border-ink-600/60 pb-1.5 text-sm text-fore">
    <span className="min-w-0 [overflow-wrap:anywhere]">{String(item.description||'Ítem')}<small className="mt-0.5 block text-[11px] text-mute">{String(item.quantity??0)} × <MoneyText valor={numberOrNull(item.unit_price)} currency={currency}/></small></span>
    <MoneyText valor={numberOrNull(item.total)} currency={currency}/>
   </div>)}
  </div>:<p className="m-0 text-xs text-mute">Sin ítems guardados.</p>}
  <dl className="m-0 grid gap-1 border-t border-ink-600 pt-2">
   <div className="flex items-baseline justify-between gap-3 text-xs text-mute"><dt>Subtotal · IVA excl.</dt><dd className="m-0"><MoneyText valor={subtotal} currency={currency}/></dd></div>
   <div className="flex items-baseline justify-between gap-3 text-xs text-mute"><dt>IVA ({Math.round(Number(record.tax_rate||0)*100)}%)</dt><dd className="m-0"><MoneyText valor={taxes} currency={currency}/></dd></div>
   <div className="flex items-baseline justify-between gap-3 text-sm font-semibold text-fore"><dt>Total · IVA incl.</dt><dd className="m-0"><MoneyText valor={total} currency={currency}/></dd></div>
  </dl>
  {str(record,'notes')?<p className="m-0 text-xs leading-5 text-mute"><b className="text-fore">Condiciones: </b>{str(record,'notes')}</p>:null}
 </section>;
}
export function BudgetActions({id,refresh,role,canInvoice,variant='text',label}:{id:string;refresh:()=>Promise<void>;role?:string;canInvoice?:boolean;variant?:'text'|'icon';label?:string}){
 const [record,setRecord]=useState<Row|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[publicUrl,setPublicUrl]=useState(''),[confirming,setConfirming]=useState<'revoke'|'invoice'|'share'|''>(''),[editing,setEditing]=useState(false),[confirmBusy,setConfirmBusy]=useState(false);
 const invoiceAllowed=canInvoice??roleCan(role,'invoices.manage');
 const shared=Boolean(publicUrl)||record?.share_enabled===true;
 const valid=String(record?.valid_until||'').slice(0,10);
 const accepted=record?.status==='accepted';
 const open=async()=>{setError('');setNotice('');setEditing(false);setConfirming('');try{const d=await api<{budget:Row;items:unknown[]}>(`/api/agency/budgets/${id}`);setRecord({...d.budget,items:d.items});}catch(e){setError(err(e));}};
 const createInvoice=async()=>{setError('');setConfirmBusy(true);try{await api(`/api/agency/budgets/${id}/invoice`,{});setConfirming('');setNotice('Factura creada o recuperada. La encontrás en Finanzas.');}catch(e){setError(err(e));}finally{setConfirmBusy(false);}};
 const updateShare=async(enabled:boolean)=>{setError('');setNotice('');setConfirmBusy(true);try{
  if(enabled){setPublicUrl((await api<{url:string}>(`/api/agency/budgets/${id}/share`,{})).url);setRecord(current=>current?{...current,share_enabled:true,status:current.status==='draft'?'sent':current.status}:current);}
  else{await api(`/api/agency/budgets/${id}/revoke`,{});setPublicUrl('');setRecord(current=>current?{...current,share_enabled:false}:current);}
  setConfirming('');await refresh();
 }catch(e){setError(err(e));}finally{setConfirmBusy(false);}};
 const copyLink=async()=>{if(!publicUrl)return;try{await navigator.clipboard?.writeText(publicUrl);setNotice('Enlace copiado.');}catch{setNotice('No se pudo copiar; seleccioná el enlace y copialo a mano.');}};
 return <>{variant==='icon'?<button className="icon-button" type="button" title={label?`Abrir presupuesto: ${label}`:'Abrir presupuesto'} aria-label={label?`Abrir presupuesto: ${label}`:'Abrir presupuesto'} onClick={()=>void open()}><Eye size={16}/></button>:<button className="text-button" onClick={()=>void open()}><Eye size={14}/>Abrir presupuesto</button>}
 {!record&&error&&<Aviso tono="error" role="alert" compact>{error}</Aviso>}
 {record&&<Dialog title={str(record,'number')||'Presupuesto'} close={()=>setRecord(null)}>
  <div className="grid gap-4">
   {error&&<Aviso tono="error" role="alert" compact>{error}</Aviso>}
   {/* Acciones visibles primero (#150): consultar, descargar y compartir sin entrar al editor. */}
   <div className="inline-actions">
    <a className="secondary" href={`/core-api/api/agency/budgets/${id}/pdf`} target="_blank" rel="noreferrer">Descargar PDF</a>
    {accepted||editing?null:<button className="secondary" onClick={()=>setEditing(true)}>Editar presupuesto</button>}
    {shared
     ?<button className="text-button danger" onClick={()=>{setConfirming('revoke');setNotice('');}}><Link2Off size={14}/>Desactivar enlace</button>
     :<button className="secondary" onClick={()=>{setConfirming('share');setNotice('');}}><Link2 size={14}/>Habilitar enlace público</button>}
   </div>
   {publicUrl&&<p className="m-0 flex flex-wrap items-center gap-2 text-xs [overflow-wrap:anywhere]"><a href={publicUrl} target="_blank" rel="noreferrer" className="text-button">{publicUrl}</a><button type="button" className="text-button" onClick={()=>void copyLink()}><Copy size={12}/>Copiar enlace</button></p>}
   {confirming==='share'&&<ConfirmDialog open title="Habilitar enlace público" confirmLabel="Habilitar enlace" busy={confirmBusy} error={error} onCancel={()=>{if(!confirmBusy)setConfirming('');}} onConfirm={()=>void updateShare(true)} description={<div className="grid gap-2 text-xs leading-5" role="group" aria-label="Condiciones del enlace público">
    <p className="m-0"><b className="text-fore">Alcance.</b> Quien tenga el enlace ve el presupuesto completo (ítems, totales y condiciones) y puede aceptarlo o rechazarlo sin cuenta.</p>
    <p className="m-0"><b className="text-fore">Vencimiento.</b> {valid?`La vigencia cargada llega hasta el ${listDateShort(valid)}; desde esa fecha el enlace deja de aceptar respuestas.`:'No hay vigencia cargada: el enlace sigue activo hasta que lo desactives.'}</p>
    <p className="m-0"><b className="text-fore">Revocación.</b> Podés desactivarlo cuando quieras desde este diálogo; el enlace deja de funcionar al instante.</p>
   </div>}/>}
   {confirming==='revoke'&&<ConfirmDialog open variant="danger" title="Desactivar enlace público" confirmLabel="Confirmar" busy={confirmBusy} error={error} onCancel={()=>{if(!confirmBusy)setConfirming('');}} onConfirm={()=>void updateShare(false)} description={<p className="m-0"><b className="text-fore">¿Desactivar el enlace público?</b> El enlace deja de funcionar al instante; el presupuesto queda guardado y podés volver a habilitarlo cuando quieras.</p>}/>}
   {accepted&&<><p className="m-0 text-sm text-fore">{str(record,'accepted_by')?`Aceptado por ${str(record,'accepted_by')}. El contenido está protegido.`:'Aceptado. El contenido está protegido.'}</p>{invoiceAllowed&&<div className="inline-actions"><button className="primary" onClick={()=>setConfirming('invoice')}>Crear factura</button></div>}{confirming==='invoice'&&<ConfirmDialog open title="Crear factura" confirmLabel="Confirmar" busy={confirmBusy} error={error} onCancel={()=>{if(!confirmBusy)setConfirming('');}} onConfirm={()=>void createInvoice()} description="¿Crear la factura de este presupuesto?"/>}</>}
   {editing&&!accepted?<QuoteComposer mode="budget" record={record} done={async()=>{await completeSave(()=>setRecord(null),refresh);}}/>:<BudgetConsult record={record}/>}
   {notice&&<Aviso tono="ok" role="status" compact>{notice}</Aviso>}
  </div>
 </Dialog>}
 </>;}
export function ActivityWorkspace(){
 // Ventana de servidor (#106): el API entrega de a 20 con total honesto y el
 // front pide la página siguiente; el agrupado por día se mantiene sobre lo cargado.
 const [rows,setRows]=useState<Row[]>([]),[total,setTotal]=useState<number|null>(null),[hasMore,setHasMore]=useState(false);
 const [error,setError]=useState(''),[loaded,setLoaded]=useState(false),[loadingMore,setLoadingMore]=useState(false);
 useEffect(()=>{let alive=true;const load=()=>{setLoadingMore(true);void api<{records:Row[];total?:number;page?:{hasMore:boolean}}>('/api/agency/activity?limit=20&offset=0').then(d=>{if(alive){setRows(d.records);setTotal(typeof d.total==='number'?d.total:d.records.length);setHasMore(d.page?.hasMore===true);}}).catch(e=>{if(alive)setError(err(e));}).finally(()=>{if(alive){setLoaded(true);setLoadingMore(false);}});};load();window.addEventListener('scale:identity-changed',load);return()=>{alive=false;window.removeEventListener('scale:identity-changed',load);};},[]);
 async function more(){
  if(loadingMore||!hasMore)return;
  setLoadingMore(true);setError('');
  try{
   const next=await api<{records:Row[];total?:number;page?:{hasMore:boolean}}>('/api/agency/activity?limit=20&offset='+rows.length);
   setRows(current=>[...current,...next.records]);
   setTotal(typeof next.total==='number'?next.total:(total??0)+next.records.length);
   setHasMore(next.page?.hasMore===true);
  }catch(e){setError(err(e));}
  finally{setLoadingMore(false);}
 }
 const groups:Row[][]=[];
 for(const row of rows){const day=str(row,'created_at').slice(0,10);const last=groups[groups.length-1];if(last&&str(last[0],'created_at').slice(0,10)===day)last.push(row);else groups.push([row]);}
 const dayLabel=(value:string)=>{const [y,m,d]=value.split('-').map(Number);if(!Number.isInteger(y))return value;return new Intl.DateTimeFormat('es-PY',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,d,12)));};
 return <section className="panel activity-feed"><p className="mb-3 text-xs tabular-nums text-mute" role="status">{total===null?`Mostrando ${rows.length} cambios registrados por el servidor`:`Mostrando ${rows.length} de ${total} cambios registrados por el servidor en esta empresa`}</p>{error&&<p className="error">{error}</p>}{groups.map(group=><section className="activity-day" key={str(group[0],'created_at').slice(0,10)}><h3 className="activity-day-title">{dayLabel(str(group[0],'created_at').slice(0,10))} <span>{group.length}</span></h3><div className="activity-day-rows">{group.map(r=>{const event=activityEvent(r);const context=[event.client,event.subject].filter(Boolean).join(' · ');return <div className="activity-feed-row" key={r.id}><ActorIdentity name={str(r,'actor_name')} photoUrl={str(r,'actor_photo_url')} verified={r.actor_verified===true} timestamp={str(r,'created_at')}/><div className="activity-feed-event" title={[event.label,context,event.amount?`${event.amount} ${event.currency}`:'',event.reference,event.technical].filter(Boolean).join(' · ')}><p><b>{event.label}</b>{context?<span className="activity-feed-context"> · {context}</span>:null}{event.amount&&event.currency?<><span className="activity-feed-context"> · </span><MoneyText valor={event.amount} currency={event.currency}/></>:null}{event.reference?<span className="activity-feed-context"> · {event.reference}</span>:null}</p><small className="activity-feed-tech">{event.technical}</small></div><small className="activity-feed-record" title="Identificador técnico del registro">Registro {event.record||'—'}</small></div>;})}</div></section>)}{hasMore?<div className="inline-actions activity-more"><button className="secondary" disabled={loadingMore} onClick={()=>void more()}>{loadingMore?'Cargando…':'Cargar 20 más'}</button></div>:null}{!rows.length&&!error?(loaded?<EmptyBlock title="Sin actividad registrada" description="Los cambios de esta empresa aparecen acá a medida que el equipo opera."/>:<LoadingBlock label="Cargando registros…" lines={4}/>):null}</section>;}
const validPygRate=(value:unknown)=>{const rate=Number(value);return Number.isSafeInteger(rate)&&rate>=1000&&rate<=100000;};
const formatPygRate=(value:unknown)=>new Intl.NumberFormat('es-PY',{maximumFractionDigits:0}).format(Number(value));

export function CouponRedeem({role,onRedeemed}:{role:string;onRedeemed?:()=>void|Promise<void>}){
 const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 if(!['owner','admin'].includes(role))return null;
 async function redeem(event:React.FormEvent){event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
  try{
   const result=await api<{ok:boolean;message:string}>(`/api/billing/coupon-redeem`,{code:code.trim()},'POST');
   setNotice(result.message||'Cupón canjeado: se agregó un mes a tu suscripción.');setCode('');
   if(onRedeemed)try{await onRedeemed();}catch{}
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo canjear el cupón.');}
  finally{setBusy(false);}
 }
 return <section className="panel settings-card" aria-labelledby="coupon-redeem-title">
  <div className="settings-card-heading"><span className="settings-card-icon" aria-hidden="true"><Ticket size={18}/></span><div><h2 id="coupon-redeem-title">Cupones</h2><p>Canjeá un código de la administración global para sumar un mes gratis a tu suscripción.</p></div></div>
  <form className="form-stack" noValidate aria-busy={busy} onSubmit={redeem}>
   <label>Código del cupón<input value={code} disabled={busy} placeholder="SCALE10" maxLength={40} onChange={event=>setCode(event.target.value.toUpperCase())}/></label>
   <button className="primary" type="submit" disabled={busy||code.trim().length<3}>{busy?'Canjeando…':'Canjear cupón'}</button>
  </form>
  {error&&<p className="error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <p className="form-note">Cada cupón se puede canjear una sola vez por empresa. No cobra ni guarda datos de pago.</p>
 </section>;
}
export function SettingsWorkspace(){ const {setCurrency}=useCompanyCurrency();const [settings,setSettings]=useState<Row|null>(null),[notice,setNotice]=useState(''),[noticeTone,setNoticeTone]=useState<'ok'|'danger'>('ok');
 useEffect(()=>{let active=true;void api<{settings:Row}>('/api/agency/settings').then(s=>{if(active)setSettings(s.settings);}).catch(e=>{if(active){setNotice(err(e));setNoticeTone('danger');}});return()=>{active=false;};},[]);
 return <div className="settings-slice ops-stack">
  <section className="panel settings-card settings-company-card" aria-labelledby="company-settings-title">
   <div className="settings-card-heading"><span className="settings-card-icon" aria-hidden="true"><Building2 size={18}/></span><div><h2 id="company-settings-title">Empresa</h2><p>Datos que identifican a esta empresa y valores predeterminados para nuevos formularios.</p></div></div>
   {notice&&<Aviso tono={noticeTone}>{notice}</Aviso>}
   {settings&&<Editor columns fields={[{key:'name',label:'Nombre de la empresa'},{key:'legal_name',label:'Razón social',optional:true,section:'Datos fiscales y contacto'},{key:'tax_id',label:'RUC',optional:true,section:'Datos fiscales y contacto'},{key:'phone',label:'Teléfono',type:'phone',optional:true,section:'Datos fiscales y contacto',help:PHONE_HELP},{key:'address',label:'Dirección',optional:true,wide:true,section:'Datos fiscales y contacto'},{key:'default_currency',label:'Moneda predeterminada',choices:currencies}]} defaults={Object.fromEntries(['name','legal_name','tax_id','phone','address','default_currency'].map(k=>[k,str(settings,k)]))} save={async v=>{const result=await api<{default_currency:typeof currencies[number]['value']}>('/api/agency/settings',{...v,onboarding_completed:true},'PATCH');setCurrency(result.default_currency);setSettings({...settings,...v,default_currency:result.default_currency});setNotice('Datos guardados. La moneda predeterminada se aplicará a nuevos formularios.');setNoticeTone('ok');}}/>}
  </section>
 </div>;
}
// La cotización y las integraciones viven en el lateral de Configuración (#139):
// aprovechan el espacio bajo Suscripción sin competir con la identidad de la
// empresa, que queda como único bloque de la columna principal.
export function ExchangeRateSettings(){ const [rates,setRates]=useState<Row[]>([]),[notice,setNotice]=useState('');
 useEffect(()=>{let active=true;void api<{records:Row[]}>('/api/agency/exchange-rates').then(r=>{if(active)setRates(r.records);}).catch(e=>{if(active)setNotice(err(e));});return()=>{active=false;};},[]);
 const latestRate=rates[0],rateIsValid=latestRate&&validPygRate(latestRate.usd_to_pyg);
 return <section className="panel settings-card" aria-labelledby="exchange-settings-title">
   <div className="settings-card-heading"><span className="settings-card-icon" aria-hidden="true"><ChartNoAxesCombined size={18}/></span><div><h2 id="exchange-settings-title">Cotización USD / PYG</h2><p>Referencia por fecha; no modifica saldos ni convierte movimientos anteriores.</p></div></div>
   {notice&&<Aviso tono="danger">{notice}</Aviso>}
   {latestRate&&!rateIsValid&&<p className="form-error-summary" role="alert">La cotización guardada está fuera de rango. Se preparó G. 6.000 como referencia para que la revises y guardes.</p>}
   <Editor columns fields={[{key:'rate_date',label:'Fecha',type:'date'},{key:'usd_to_pyg',label:'Guaraníes por dólar',type:'money',help:'Solo enteros entre G. 1.000 y G. 100.000. Referencia indicada: G. 6.000/USD.'}]} key={rates.length} defaults={{rate_date:new Date().toISOString().slice(0,10),usd_to_pyg:rateIsValid?str(latestRate!,'usd_to_pyg'):'6000'}} save={async v=>{if(!validPygRate(v.usd_to_pyg))throw Error('Ingresá una cotización entera entre G. 1.000 y G. 100.000 por USD.');await api('/api/agency/exchange-rates',{...v,usd_to_pyg:Number(v.usd_to_pyg)});setRates((await api<{records:Row[]}>('/api/agency/exchange-rates')).records);}}/>
   {rates.some(r=>validPygRate(r.usd_to_pyg))&&<details className="settings-disclosure"><summary>Ver cotizaciones guardadas</summary><div className="settings-history">{rates.map((r,i)=>validPygRate(r.usd_to_pyg)?<p key={i}><span className="list-date">{listDateShort(str(r,'rate_date'))||str(r,'rate_date')}</span><strong>G. {formatPygRate(r.usd_to_pyg)}/USD</strong></p>:null)}</div></details>}
  </section>;
}
// Las integraciones son estado informativo y acompañan al lateral (#139).
export function IntegrationSettings(){ return <section className="panel settings-card" aria-labelledby="integration-settings-title">
   <div className="settings-card-heading"><span className="settings-card-icon" aria-hidden="true"><Link2Off size={18}/></span><div><h2 id="integration-settings-title">Integraciones</h2><p>Estado actual de los servicios que pueden complementar tu flujo de trabajo.</p></div></div>
   <div className="settings-integration-list">
    <div className="settings-integration-head" aria-hidden="true"><span>Integración</span><span>Estado</span></div>
    <div role="list" aria-label="Estado de integraciones">
    <article role="listitem"><div><strong>Google y Drive</strong><p title="Usá tu correo invitado para entrar y agregá enlaces de Drive en cada registro.">Usá tu correo invitado para entrar y agregá enlaces de Drive en cada registro.</p></div><span className="settings-status">No configurado</span></article>
    <article role="listitem"><div><strong>WhatsApp, Instagram y Meta</strong><p title="Requieren una conexión y permisos de Meta antes de poder usarse.">Requieren una conexión y permisos de Meta antes de poder usarse.</p></div><span className="settings-status">No configurado</span></article>
    </div>
   </div>
   <details className="settings-disclosure"><summary>Qué está disponible hoy</summary><p>Este panel no conecta cuentas ni envía mensajes. Los enlaces de Drive se gestionan desde los registros que los usan.</p></details>
  </section>;
}
