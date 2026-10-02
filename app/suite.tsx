"use client";
import {urgencyField} from './urgency';
import {isWholeTransport} from './amount-format';
import {currencyChoices} from "./currencies";
import {useCompanyCurrency} from './currency-provider';
import {ActorIdentity} from './actor-identity';
import {RecordAssignees} from './record-assignees';
import {ClientReviewControl} from './daily-controls';
import {ProjectPresence} from './presence';
import {clientStatuses} from './client-status';
import {ClientAppearance,ClientIdentity} from './client-identity';
import {useEffect,useState} from 'react';
import {EmptyBlock,LoadingBlock,ActionMenu,type RecordMenuItem} from './ui-v2';
export type {RecordMenuItem} from './ui-v2';
import {Building2,ChartNoAxesCombined,CircleDollarSign,Eye,Link2Off,Pencil,Ticket} from 'lucide-react';
import {api,Dialog,Editor,Field} from './operations';
import {roleCan} from './capabilities';
import {Aviso,AvisoPrivacidad,normalizarNombre} from 'owncoding-ui';
import {PHONE_HELP} from './field-rules';
import {QuoteComposer} from './quote-composer';
import {completeSave} from './save-completion';
import {canRemoveRecord,RemoveRecord,RemoveRecordDialog} from './archive-controls';
import {driveLinksText} from './drive-links';
import {listDateShort} from './list-format';
import {PRIVACY_POLICY_URL,PRIVACY_RIGHTS_URL,PRIVACY_CLIENT_FINALITY,PRIVACY_CLIENT_DETAIL} from './privacy-links';
import './settings-slice.css';
type Row={id:string;[key:string]:unknown};
const str=(r:Row,k:string)=>String(r[k]??'');
const err=(e:unknown)=>e instanceof Error?e.message:'No se pudo completar';
const currencies=currencyChoices;
const isDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));
type PlanTerms={planId:string;planName:string;recurringAmount:string|number;currency:'PYG'|'USD';startsOn:string;endsOn:string|null;cadence:'monthly'|'interval'|'once';intervalMonths:number;invoiceRequired:boolean;commissionRecipientId:string|null;commissionMode:'none'|'percentage'|'fixed';commissionValue:string|number|null;updatedAt:string};
type PlanTermsResponse={clientId:string;archived:boolean;terms:PlanTerms|null;plans:{id:string;name:string}[];collaborators:{id:string;full_name:string}[]};
export function RecordEditor({kind,recordId,name,refresh,role,canManageTerms,planCta,actions=['edit','remove'],menu=false,extraMenuItems=[]}:{kind:'clients'|'projects'|'work-orders';recordId:string;name?:string;refresh:()=>Promise<void>;role:string;canManageTerms?:boolean;planCta?:'text'|'icon';actions?:ReadonlyArray<'edit'|'remove'>;menu?:boolean;extraMenuItems?:RecordMenuItem[]}){
 const [record,setRecord]=useState<Row|null>(null),[error,setError]=useState('');
 const [planData,setPlanData]=useState<PlanTermsResponse|null>(null),[planError,setPlanError]=useState('');
 const [removeOpen,setRemoveOpen]=useState(false);
 const permitted=kind==='clients'?['owner','admin','management','sales','finance','collaborator']:kind==='projects'?['owner','admin','management','production','collaborator']:['owner','admin','management','production','editor','collaborator'];
 // Misma capacidad que valida el PATCH de /commercial-terms (commercial-terms.manage).
 const canPlan=kind==='clients'&&(canManageTerms??roleCan(role,'commercial-terms.manage'));
 async function open(){setError('');setPlanError('');setPlanData(null);try{const loaded=(await api<{record:Row}>(`/api/agency/${kind}/${recordId}`)).record;setRecord(loaded);if(canPlan)try{setPlanData(await api<PlanTermsResponse>(`/api/agency/clients/${recordId}/commercial-terms`));}catch(e){setPlanError(err(e));}}catch(e){setError(err(e));}}
 if(!permitted.includes(role))return null;
 const fields:Field[]=kind==='clients'?[{key:'name',label:'Nombre'},{key:'email',label:'Correo',type:'email',optional:true},{key:'phone',label:'Teléfono',type:'phone',optional:true,help:PHONE_HELP},{key:'lifecycle_status',label:'Estado del servicio',choices:clientStatuses,help:'Pausar o cancelar el cliente pausa o cancela sus proyectos activos.'},{key:'tax_id',label:'RUC',optional:true,lookup:{label:'Buscar datos por RUC',run:async ruc=>{const data=await api<{record:{name:string;tax_id:string}|null}>('/api/agency/ruc-lookup',{ruc});if(!data.record)throw Error('No encontramos una ficha publicada para ese RUC.');return {tax_id:data.record.tax_id,legal_name:normalizarNombre(data.record.name,{apellidosPrimero:'sifen'})};}}},{key:'legal_name',label:'Razón social',optional:true},{key:'notes',label:'Notas',type:'textarea',optional:true}]:kind==='projects'?[{key:'name',label:'Proyecto',section:'Datos del proyecto'},{key:'status',label:'Estado',section:'Datos del proyecto',choices:[{value:'active',label:'Activo'},{value:'paused',label:'Pausado'},{value:'completed',label:'Completado'},{value:'cancelled',label:'Cancelado'}]},{key:'approval_levels',label:'Niveles de aprobación',section:'Datos del proyecto',help:'Cantidad de aprobaciones internas consecutivas (1 a 3) antes de aprobar una pieza. No cambia permisos ni representa urgencia.',choices:[1,2,3].map(n=>({value:String(n),label:String(n)}))},{key:'start_date',label:'Inicio',type:'date',optional:true,section:'Fechas'},{key:'due_date',label:'Entrega',type:'date',optional:true,section:'Fechas'},urgencyField,{key:'drive_links',label:'Enlaces de archivo o carpeta de Drive',type:'textarea',optional:true,wide:true,section:'Enlaces'}]:[{key:'title',label:'Pieza o tarea'},{key:'due_date',label:'Entrega',type:'date',optional:true},{key:'due_time',label:'Hora de entrega',type:'time',optional:true},{key:'work_type',label:'Tipo de trabajo',optional:true,choices:[{value:'',label:'Sin clasificar'},{value:'video',label:'Video'},{value:'reedicion',label:'Reedición'},{value:'foto',label:'Foto'},{value:'produccion',label:'Producción'},{value:'entregable',label:'Entregable'}]},urgencyField,{key:'estimated_hours',label:'Horas estimadas',type:'number',optional:true},{key:'actual_hours',label:'Horas reales',type:'number',optional:true},{key:'drive_links',label:'Enlaces de archivo o carpeta de Drive',type:'textarea',optional:true,wide:true},{key:'description',label:'Brief y notas',type:'textarea',optional:true}];
  const dialogTitles={clients:'Editar cliente',projects:'Editar proyecto','work-orders':'Editar pieza'} as const;
  const planFields:Field[]=canPlan&&planData?[
   {key:'plan_plan_id',label:'Plan',optional:true,choices:[{value:'',label:'Plan personalizado (precio manual)'},...planData.plans.map(plan=>({value:String(plan.id),label:plan.name}))],section:'Plan y pago'},
   {key:'plan_amount',label:'Cuánto paga por mes',type:'money',integer:true,currencyKey:'plan_currency',section:'Plan y pago',help:'Solo los roles que gestionan los términos comerciales editan este importe; finanzas lo consulta en la ficha.'},
   {key:'plan_currency',label:'Moneda',choices:[{value:'PYG',label:'PYG · Guaraníes'},{value:'USD',label:'USD · Dólares'}],section:'Plan y pago'},
   {key:'plan_cadence',label:'Frecuencia de cobro',choices:[{value:'monthly',label:'Fijo mensual'},{value:'interval',label:'Cada varios meses'},{value:'once',label:'Única vez (no recurrente)'}],section:'Plan y pago',help:'Solo el fijo mensual se proyecta en la previsión financiera.'},
   {key:'plan_interval',label:'Cada cuántos meses',choices:['2','3','4','6','12'].map(value=>({value,label:`${value} meses`})),section:'Plan y pago',help:'Aplica solo con "Cada varios meses".'},
   {key:'plan_starts_on',label:'Inicio comercial',type:'date',section:'Plan y pago'},
   {key:'plan_ends_on',label:'Fin del plan · Opcional',type:'date',optional:true,section:'Plan y pago'},
   {key:'plan_invoice_required',label:'Factura comercial del cliente',choices:[{value:'true',label:'Sí'},{value:'false',label:'No'}],section:'Plan y pago'},
  ]:[];
  const clientDefaults:Record<string,string>=record?{name:str(record,'name'),email:str(record,'email'),phone:str(record,'phone'),lifecycle_status:str(record,'lifecycle_status'),tax_id:str(record,'tax_id'),legal_name:str(record,'legal_name'),notes:str(record,'notes')}:{};
  const terms=planData?.terms;
  const planDefaults:Record<string,string>=canPlan&&planData?{plan_plan_id:terms?.planId||'',plan_amount:terms?String(terms.recurringAmount):'',plan_currency:terms?.currency||'PYG',plan_cadence:terms?.cadence||'monthly',plan_interval:['2','3','4','6','12'].includes(String(terms?.intervalMonths||''))?String(terms?.intervalMonths):'3',plan_starts_on:terms?.startsOn||'',plan_ends_on:terms?.endsOn||'',plan_invoice_required:terms?String(terms.invoiceRequired):'true'}:{};
  const clientFields=kind==='clients'?[...fields,...planFields]:fields;
  // Menú ⋯ (#140): una sola vía de acciones por fila; editar/archivar/papelera
  // viven acá y la acción rápida queda a la vista. El CTA de plan se mantiene
  // visible cuando falta el precio (es el trabajo pendiente de la fila).
  const menuItems:RecordMenuItem[]=[
   ...(actions.includes('edit')?[{id:'edit',label:dialogTitles[kind],icono:'edit',onClick:open}]:[]),
   ...extraMenuItems,
   ...(actions.includes('remove')&&canRemoveRecord(kind,role)?[{id:'remove',label:'Mover a la papelera',icono:'trash',peligro:true,onClick:()=>setRemoveOpen(true)}]:[]),
  ];
 return <>{planCta&&canPlan?planCta==='icon'?<button className="icon-button" type="button" title={`Cargar plan y pago: ${name||'cliente'}`} aria-label={`Cargar plan y pago: ${name||'cliente'}`} onClick={open}><CircleDollarSign size={16}/></button>:<button className="text-button" type="button" title={`Cargar plan y pago: ${name||'cliente'}`} onClick={open}><CircleDollarSign size={14} aria-hidden="true"/>Cargar plan</button>:null}{menu&&menuItems.length?<ActionMenu label={`Acciones: ${name||kind}`} items={menuItems}/>:<>{actions.includes('edit')?<button className="icon-button" type="button" title="Editar" aria-label={`Editar ${name||'registro'}`} onClick={open}><Pencil size={16}/></button>:null}{actions.includes('remove')?<RemoveRecord kind={kind} id={recordId} name={name||`Registro #${recordId}`} role={role} done={refresh}/>:null}</>}{removeOpen?<RemoveRecordDialog kind={kind} id={recordId} name={name||`Registro #${recordId}`} role={role} done={refresh} open onClose={()=>setRemoveOpen(false)}/>:null}{kind==='work-orders'&&['owner','admin','management','production','collaborator'].includes(role)&&<ClientReviewControl orderId={recordId}/>}{error&&<Aviso tono="error" compact role="alert">{error}</Aviso>}{record&&<Dialog title={dialogTitles[kind]} close={()=>setRecord(null)}>{kind==='clients'?<ClientAppearance id={recordId} name={str(record,'name')} logo={str(record,'logo_url')} color={str(record,'color_key')} showIdentity={false} refresh={async()=>{await refresh();await open();}}/>:<ClientIdentity name={str(record,'client_name')} logo={str(record,'client_logo_url')} color={str(record,'client_color_key')}/>}{kind==='clients'&&<AvisoPrivacidad finalidad={PRIVACY_CLIENT_FINALITY} detalle={PRIVACY_CLIENT_DETAIL} politicaUrl={PRIVACY_POLICY_URL} derechosUrl={PRIVACY_RIGHTS_URL} compact className="mb-3"/>}{kind==='projects'&&<ProjectPresence projectId={recordId}/>}{kind!=='clients'?<RecordAssignees kind={kind} id={recordId} role={role} updatedAt={str(record,'updated_at')} refresh={()=>completeSave(()=>setRecord(null),refresh)}>{save=><Editor columns fields={fields} defaults={Object.fromEntries(fields.map(f=>[f.key,f.key==='drive_links'?driveLinksText(record.drive_links,str(record,'drive_url')):f.type==='date'?str(record,f.key).slice(0,10):f.type==='time'?str(record,f.key).slice(0,5):str(record,f.key)]))} save={save}/>}</RecordAssignees>:<>{planError&&<Aviso tono="error" compact role="alert">{planError}</Aviso>}<Editor key={`${str(record,'updated_at')}:${canPlan?planData?terms?.updatedAt||'loaded':'loading':'off'}`} columns fields={clientFields} label='Guardar' defaults={{...clientDefaults,...planDefaults}} save={async v=>{const clientPayload={name:v.name,email:v.email,phone:v.phone,lifecycle_status:v.lifecycle_status,tax_id:v.tax_id,legal_name:v.legal_name,notes:v.notes};await api(`/api/agency/clients/${recordId}`,clientPayload,'PATCH');if(canPlan&&planData){if(!isWholeTransport(v.plan_amount,false))throw Error('Ingresá un importe mensual entero positivo.');if(!isDate(v.plan_starts_on))throw Error('Completá la fecha real de inicio comercial.');if(v.plan_ends_on&&(!isDate(v.plan_ends_on)||v.plan_ends_on<v.plan_starts_on))throw Error('La fecha de fin debe ser válida y posterior al inicio.');const activeTerms=planData.terms;await api(`/api/agency/clients/${recordId}/commercial-terms`,{planId:v.plan_plan_id,recurringAmount:v.plan_amount,currency:v.plan_currency,startsOn:v.plan_starts_on,endsOn:v.plan_ends_on||null,cadence:v.plan_cadence,intervalMonths:Number(v.plan_interval||1),invoiceRequired:v.plan_invoice_required==='true',commissionRecipientId:activeTerms?.commissionMode==='none'?null:activeTerms?.commissionRecipientId||null,commissionMode:activeTerms?.commissionMode||'none',commissionValue:activeTerms?.commissionMode==='none'?null:activeTerms?.commissionValue??null},'PATCH');}await completeSave(()=>setRecord(null),refresh);}}/></>}{kind==='work-orders'&&['owner','admin','management','production','collaborator'].includes(role)&&['review','approved'].includes(str(record,'status'))&&<button className="secondary" onClick={async()=>{try{await api(`/api/agency/work-orders/${recordId}/${record.status==='review'?'approve':'publish'}`,{});await refresh();await open();}catch(e){setError(err(e));}}}>{record.status==='review'?`Aprobar siguiente nivel (completados: ${str(record,'approval_step')})`:'Marcar publicado'}</button>}{error&&<Aviso tono="error" compact role="alert">{error}</Aviso>}</Dialog>}</>;
}
export function BudgetActions({id,refresh,role,canInvoice,variant='text',label}:{id:string;refresh:()=>Promise<void>;role?:string;canInvoice?:boolean;variant?:'text'|'icon';label?:string}){const [record,setRecord]=useState<Row|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[publicUrl,setPublicUrl]=useState(''),[confirming,setConfirming]=useState<'revoke'|'invoice'|''>('');const invoiceAllowed=canInvoice??roleCan(role,'invoices.manage');const shared=Boolean(publicUrl)||record?.share_enabled===true;const open=async()=>{setError('');setNotice('');try{const d=await api<{budget:Row;items:unknown[]}>(`/api/agency/budgets/${id}`);setRecord({...d.budget,items:d.items});setConfirming('');}catch(e){setError(err(e));}};return <>{variant==='icon'?<button className="icon-button" type="button" title={label?`Abrir presupuesto: ${label}`:'Abrir presupuesto'} aria-label={label?`Abrir presupuesto: ${label}`:'Abrir presupuesto'} onClick={()=>void open()}><Eye size={16}/></button>:<button className="text-button" onClick={()=>void open()}><Eye size={14}/>Abrir presupuesto</button>}{error&&<Aviso tono="error" role="alert" compact>{error}</Aviso>}{notice&&<Aviso tono="ok" role="status" compact>{notice}</Aviso>}{record&&<Dialog title={str(record,'number')} close={()=>setRecord(null)}><div className="inline-actions"><a className="secondary" href={`/core-api/api/agency/budgets/${id}/pdf`} target="_blank" rel="noreferrer">Descargar PDF</a><button className="secondary" onClick={async()=>{setError('');setNotice('');try{setPublicUrl((await api<{url:string}>(`/api/agency/budgets/${id}/share`,{})).url);await refresh();}catch(e){setError(err(e));}}}>Habilitar enlace público</button>{shared?confirming==='revoke'?<><span role="alert">¿Desactivar el enlace público?</span><button className="secondary danger" onClick={async()=>{setError('');try{await api(`/api/agency/budgets/${id}/revoke`,{});setPublicUrl('');setConfirming('');await refresh();}catch(e){setError(err(e));}}}>Confirmar</button><button className="secondary" onClick={()=>setConfirming('')}>Cancelar</button></>:<button className="text-button danger" onClick={()=>setConfirming('revoke')}><Link2Off size={14}/>Desactivar enlace</button>:null}</div>{publicUrl&&<p><a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a></p>}{error&&<Aviso tono="error" role="alert" compact>{error}</Aviso>}{record.status==='accepted'?<><p>{str(record,'accepted_by')?`Aceptado por ${str(record,'accepted_by')}. El contenido está protegido.`:'Aceptado. El contenido está protegido.'}</p>{invoiceAllowed?<>{confirming==='invoice'?<><span role="alert">¿Crear la factura de este presupuesto?</span><button className="primary" onClick={async()=>{setError('');try{await api(`/api/agency/budgets/${id}/invoice`,{});setConfirming('');setNotice('Factura creada o recuperada. La encontrás en Finanzas.');}catch(e){setError(err(e));}}}>Confirmar</button><button className="secondary" onClick={()=>setConfirming('')}>Cancelar</button></>:<button className="primary" onClick={()=>setConfirming('invoice')}>Crear factura</button>}</>:null}</>:<QuoteComposer mode="budget" record={record} done={async()=>{await completeSave(()=>setRecord(null),refresh);}}/>}</Dialog>}</>;}
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
 const dayLabel=(value:string)=>{const [y,m,d]=value.split('-').map(Number);if(!Number.isInteger(y))return value;return new Intl.DateTimeFormat('es-PY',{weekday:'short',day:'numeric',month:'short'}).format(new Date(Date.UTC(y,m-1,d,12)));};
 return <section className="panel activity-feed"><p className="mb-3 text-xs tabular-nums text-mute" role="status">{total===null?`Mostrando ${rows.length} cambios registrados por el servidor`:`Mostrando ${rows.length} de ${total} cambios registrados por el servidor en esta empresa`}</p>{error&&<p className="error">{error}</p>}{groups.map(group=><section className="activity-day" key={str(group[0],'created_at').slice(0,10)}><h3 className="activity-day-title">{dayLabel(str(group[0],'created_at').slice(0,10))} <span>{group.length}</span></h3><div className="activity-day-rows">{group.map(r=><div className="activity-feed-row" key={r.id}><ActorIdentity name={str(r,'actor_name')} photoUrl={str(r,'actor_photo_url')} verified={r.actor_verified===true} timestamp={str(r,'created_at')}/><p title={`${str(r,'table_name').replace('agency_','')} · ${str(r,'operation')}`}><b>{str(r,'table_name').replace('agency_','')}</b> · {str(r,'operation')}</p><small>Registro {str(r,'record_id')}</small></div>)}</div></section>)}{hasMore?<div className="inline-actions activity-more"><button className="secondary" disabled={loadingMore} onClick={()=>void more()}>{loadingMore?'Cargando…':'Cargar 20 más'}</button></div>:null}{!rows.length&&!error?(loaded?<EmptyBlock title="Sin actividad registrada" description="Los cambios de esta empresa aparecen acá a medida que el equipo opera."/>:<LoadingBlock label="Cargando registros…" lines={4}/>):null}</section>;}
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
   <div className="settings-integration-list" role="list" aria-label="Estado de integraciones">
    <div className="settings-integration-head" role="presentation"><span>Integración</span><span>Estado</span></div>
    <article role="listitem"><div><strong>Google y Drive</strong><p title="Usá tu correo invitado para entrar y agregá enlaces de Drive en cada registro.">Usá tu correo invitado para entrar y agregá enlaces de Drive en cada registro.</p></div><span className="settings-status">No configurado</span></article>
    <article role="listitem"><div><strong>WhatsApp, Instagram y Meta</strong><p title="Requieren una conexión y permisos de Meta antes de poder usarse.">Requieren una conexión y permisos de Meta antes de poder usarse.</p></div><span className="settings-status">No configurado</span></article>
   </div>
   <details className="settings-disclosure"><summary>Qué está disponible hoy</summary><p>Este panel no conecta cuentas ni envía mensajes. Los enlaces de Drive se gestionan desde los registros que los usan.</p></details>
  </section>;
}
