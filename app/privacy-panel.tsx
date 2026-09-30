"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {BadgeCheck,CircleX,Download,Landmark,Plus,RefreshCw,ShieldCheck,ShieldOff} from 'lucide-react';
import {api,Dialog,Editor,type Field} from './operations';
import {dueTone,listDateFull,listDateShort} from './list-format';
import {EmptyBlock,ErrorBlock,Kpi,KpiStrip,ListGrid,ListRow,LoadingBlock,StateChip} from './ui-v2';
import {roleCan} from './capabilities';
import {notify} from './feedback';
import type {User} from './workspace-types';

// Protección de datos (Ley 7593/2025, scale-os#112): cola de solicitudes de
// titulares con SLA ≤30 días, consentimientos verificables y retención declarada.
// Consume los endpoints de `backend/personal-data.js`; los textos jurídicos y la
// vista «Mis datos» del titular viven en SOS-DSN (#113).

type Purpose={id:string;label:string;description:string};
type Notice={version:string;url:string;responsible:string;contact:string;purposes:Purpose[]};
type PrivacyRequest={
 id:string;subject_kind:string;subject_id:string|null;subject_name:string;subject_email:string|null;
 request_type:string;status:string;details:string|null;resolution:string|null;rejection_reason:string|null;
 received_at:string;due_at:string;resolved_at:string|null;overdue:boolean;days_left:number;
 resolution_action:string|null;
};
type ConsentRow={
 id:string;subject_kind:string;subject_id:string;purpose:string;basis:string;notice_version:string;
 source:string;granted_at:string;revoked_at:string|null;revoke_reason:string|null;
};
type RetentionPolicy={id:string;label:string;entity:string;action:string;retentionDays:number;basis:string;notes:string};
type RetentionRun={id:string;mode:string;candidates:number;affected:number;started_at:string;finished_at:string|null};
type QueueData={requests:PrivacyRequest[];counts:Record<string,number>;notice:Notice};
type ConsentsData={consents:ConsentRow[];notice:Notice};
type RetentionData={policies:RetentionPolicy[];runs:RetentionRun[]};

const REQUEST_TYPES:{value:string;label:string}[]=[
 {value:'access',label:'Acceso (copia de los datos)'},
 {value:'portability',label:'Portabilidad'},
 {value:'rectification',label:'Rectificación'},
 {value:'suppression',label:'Supresión'},
 {value:'opposition',label:'Oposición'},
];
const SUBJECT_KINDS:{value:string;label:string}[]=[
 {value:'client',label:'Cliente'},
 {value:'lead',label:'Oportunidad'},
 {value:'user',label:'Integrante del equipo'},
 {value:'portal_user',label:'Usuario del portal'},
 {value:'other',label:'Titular externo (sin ficha)'},
];
const STATUS_LABELS:Record<string,string>={received:'Recibida',identity_verified:'Identidad verificada',in_review:'En revisión',resolved:'Resuelta',rejected:'Rechazada',cancelled:'Cancelada'};
const STATUS_TONES:Record<string, 'ok'|'warn'|'bad'|'info'|'mute'>={received:'warn',identity_verified:'info',in_review:'info',resolved:'ok',rejected:'bad',cancelled:'mute'};
const RESOLVE_ACTIONS:Record<string,{value:string;label:string}[]> = {
 access:[{value:'export_delivered',label:'Copia entregada'},{value:'none',label:'Sin datos para entregar'}],
 portability:[{value:'export_delivered',label:'Copia entregada'},{value:'none',label:'Sin datos para entregar'}],
 rectification:[{value:'corrected',label:'Datos corregidos'},{value:'none',label:'Sin cambios'}],
 suppression:[{value:'blocked',label:'Bloqueo (conserva registros fiscales)'},{value:'anonymized',label:'Anonimización'}],
 opposition:[{value:'opposed',label:'Oposición aplicada (revoca finalidades)'}],
};
const statusLabel=(status:string)=>STATUS_LABELS[status]||status;
const typeLabel=(type:string)=>REQUEST_TYPES.find(option=>option.value===type)?.label||type;
const typeShort=(type:string)=>typeLabel(type).split(' (')[0];
const kindLabel=(kind:string)=>SUBJECT_KINDS.find(option=>option.value===kind)?.label||kind;
const purposeLabel=(id:string)=>({account:'Cuenta y acceso',service:'Prestación del servicio',billing:'Facturación y cobros',portal:'Portal del cliente',contact:'Contacto y consultas'}[id]||id);
const basisLabel=(basis:string)=>({consent:'Consentimiento',contract:'Contrato',legal_obligation:'Obligación legal',vital_interests:'Intereses vitales',public_interest:'Interés público',legitimate_interest:'Interés legítimo'}[basis]||basis);
const slaLabel=(request:PrivacyRequest)=>{
 if(['resolved','rejected','cancelled'].includes(request.status))return request.resolved_at?listDateShort(request.resolved_at):'—';
 if(request.days_left<0)return `Vencida hace ${Math.abs(request.days_left)} d`;
 return `Vence en ${request.days_left} d`;
};
const errorText=(cause:unknown)=>cause instanceof Error?cause.message:'No se pudo completar la operación.';

const QUEUE_TEMPLATE='grid-cols-[minmax(13rem,1.5fr)_minmax(9rem,0.9fr)_minmax(8.5rem,0.8fr)_minmax(7.5rem,0.7fr)_minmax(9.5rem,1fr)]';
const QUEUE_COLUMNS=[{key:'titular',label:'Titular'},{key:'tipo',label:'Solicitud'},{key:'estado',label:'Estado'},{key:'sla',label:'Plazo'},{key:'actions',label:'Acciones',align:'end' as const}];
const CONSENT_TEMPLATE='grid-cols-[minmax(11rem,1.2fr)_minmax(9rem,0.9fr)_minmax(7rem,0.7fr)_minmax(9rem,0.9fr)_minmax(7.5rem,0.7fr)_minmax(6.5rem,0.6fr)]';
const CONSENT_COLUMNS=[{key:'titular',label:'Titular'},{key:'finalidad',label:'Finalidad'},{key:'version',label:'Aviso'},{key:'origen',label:'Origen'},{key:'fecha',label:'Otorgado'},{key:'actions',label:'Acciones',align:'end' as const}];

function Section({title,children,action}:{title:string;children:ReactNode;action?:ReactNode}){
 return <section className="min-w-0 rounded-xl border border-ink-600 bg-ink-800">
  <div className="flex flex-wrap items-center gap-2 border-b border-ink-600 px-4 py-3">
   <h3 className="min-w-0 flex-1 text-sm font-semibold text-fore">{title}</h3>
   {action}
  </div>
  <div className="min-w-0 p-4">{children}</div>
 </section>;
}

export function PrivacyPanel({user}:{user:User|null}){
 const allowed=!!user&&roleCan(user.role,'privacy.manage')&&!user.demo_owner_user_id&&user.organization_slug!=='scale-demo-controles-20260908';
 const [queue,setQueue]=useState<QueueData|null>(null);
 const [consents,setConsents]=useState<ConsentsData|null>(null);
 const [retention,setRetention]=useState<RetentionData|null>(null);
 const [filter,setFilter]=useState('open');
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [creating,setCreating]=useState(false);
 const [resolving,setResolving]=useState<PrivacyRequest|null>(null);
 const [rejecting,setRejecting]=useState<PrivacyRequest|null>(null);
 const [reloadKey,setReloadKey]=useState(0);

 async function load(){
  if(!allowed)return;
  setLoading(true);setError('');
  try{
   const [queueData,consentData,retentionData]=await Promise.all([
    api<QueueData>(`/api/privacy/requests?status=${filter==='all'?'':filter}${filter==='all'?'':'&limit=200'}`),
    api<ConsentsData>('/api/privacy/consents?state=active&limit=200'),
    api<RetentionData>('/api/privacy/retention'),
   ]);
   setQueue(queueData);setConsents(consentData);setRetention(retentionData);
  }catch(cause){setError(errorText(cause));}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[allowed,filter,reloadKey]);

 function refresh(message:string){notify({tone:'success',message});setReloadKey(value=>value+1);}

 async function mutate(path:string,body:unknown,method:string,message:string){
  setBusy(true);setError('');
  try{await api(path,body,method);refresh(message);return true;}
  catch(cause){setError(errorText(cause));return false;}
  finally{setBusy(false);}
 }

 async function createRequest(values:Record<string,string>){
  const payload:Record<string,unknown>={request_type:values.request_type,details:values.details};
  if(values.subject_kind==='other'){payload.subject_kind='other';payload.subject_name=values.subject_name;payload.subject_email=values.subject_email||undefined;}
  else{payload.subject_kind=values.subject_kind;payload.subject_id=values.subject_id;}
  if(!await mutate('/api/privacy/requests',payload,'POST','Solicitud registrada. El plazo de 30 días empieza a correr.'))return;
  setCreating(false);
 }
 async function resolveRequest(values:Record<string,string>){
  if(!resolving)return;
  const payload:Record<string,unknown>={action:'resolve',resolution:values.resolution,resolution_action:values.resolution_action};
  if(resolving.request_type==='opposition'&&values.purpose)payload.purposes=[values.purpose];
  if(!await mutate(`/api/privacy/requests/${resolving.id}`,payload,'PATCH','Solicitud resuelta y auditable.'))return;
  setResolving(null);
 }
 async function rejectRequest(values:Record<string,string>){
  if(!rejecting)return;
  if(!await mutate(`/api/privacy/requests/${rejecting.id}`,{action:'reject',rejection_reason:values.rejection_reason},'PATCH','Solicitud rechazada con motivo.'))return;
  setRejecting(null);
 }
 async function revokeConsent(row:ConsentRow){
  await mutate('/api/privacy/consents/revoke',{subject_kind:row.subject_kind,subject_id:row.subject_id,purpose:row.purpose},'POST','Consentimiento revocado.');
 }

 if(!allowed)return null;
 const counts=queue?.counts||{};
 const open=Number(counts.received||0)+Number(counts.identity_verified||0)+Number(counts.in_review||0);
 const purposes=queue?.notice?.purposes||[];
 const newFields:Field[]=[
  {key:'subject_kind',label:'Tipo de titular',choices:SUBJECT_KINDS},
  {key:'subject_id',label:'Identificador del titular',help:'Número de la ficha en Scale OS (clientes, oportunidades, equipo o portal).'},
  {key:'subject_name',label:'Nombre del titular',optional:true,help:'Obligatorio solo para titulares externos.'},
  {key:'subject_email',label:'Correo de contacto',type:'email',optional:true},
  {key:'request_type',label:'Derecho solicitado',choices:REQUEST_TYPES},
  {key:'details',label:'Detalle o canal de la solicitud',type:'textarea',optional:true},
 ];
 const resolveFields:Field[]=resolving?[
  {key:'resolution',label:'Cómo se resolvió',type:'textarea'},
  {key:'resolution_action',label:'Acción aplicada',choices:RESOLVE_ACTIONS[resolving.request_type]||[{value:'none',label:'Sin acción'}]},
  ...(resolving.request_type==='opposition'?[{key:'purpose',label:'Finalidad a revocar',choices:purposes.map(purpose=>({value:purpose.id,label:purpose.label})),optional:true} as Field]:[]),
 ]:[];
 const rejectFields:Field[]=[{key:'rejection_reason',label:'Motivo del rechazo',type:'textarea'}];

 return <div className="grid min-w-0 gap-4" aria-busy={loading||busy}>
  <Section title="Solicitudes de titulares (Ley 7593/2025)"
   action={<div className="flex flex-wrap items-center gap-2">
    <label className="flex items-center gap-2 text-[11.5px] text-mute">Ver
     <select className="h-8 rounded-lg border border-ink-500 bg-ink-900 px-2 text-[12px] text-fore" value={filter} onChange={event=>setFilter(event.target.value)} aria-label="Filtrar solicitudes por estado">
      <option value="open">Abiertas</option><option value="all">Todas</option><option value="resolved">Resueltas</option><option value="rejected">Rechazadas</option>
     </select>
    </label>
    <button type="button" className="secondary" disabled={busy} onClick={()=>setReloadKey(value=>value+1)} title="Actualizar la cola" aria-label="Actualizar la cola"><RefreshCw size={15}/>Actualizar</button>
    <button type="button" className="primary" disabled={busy} onClick={()=>setCreating(true)}><Plus size={15}/>Nueva solicitud</button>
   </div>}>
   <p className="mb-3 flex items-start gap-2 text-xs text-mute"><ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0"/><span className="min-w-0">La respuesta a cada derecho es gratuita y vence a los 30 días naturales. Cada acción queda en la bitácora de datos personales.{queue?<> Aviso vigente: <b className="text-fore">{queue.notice.version}</b> · <a className="text-fono underline-offset-2 hover:underline" href={queue.notice.url} target="_blank" rel="noreferrer">Política de privacidad</a></>:null}</span></p>
   {error?<ErrorBlock title="No pudimos completar la gestión" description={error} onRetry={()=>void load()}/>:null}
   {loading&&!queue?<LoadingBlock label="Cargando la cola…" lines={4}/>:!queue?<EmptyBlock title="Sin datos de la cola" description="El API no devolvió solicitudes de titulares." action={<button type="button" className="secondary" onClick={()=>setReloadKey(value=>value+1)}>Reintentar</button>}/>:<>
    <KpiStrip className="mb-4">
     <Kpi label="Abiertas" valor={open} hint="Dentro del plazo de 30 días" destacado/>
     <Kpi label="Vencidas" valor={Number(counts.overdue||0)} hint="Deben resolverse ya"/>
     <Kpi label="Resueltas" valor={Number(counts.resolved||0)} hint="Con resolución registrada"/>
     <Kpi label="Rechazadas" valor={Number(counts.rejected||0)} hint="Con motivo comunicado"/>
    </KpiStrip>
    {queue.requests.length?<ListGrid label="Solicitudes de titulares" template={QUEUE_TEMPLATE} columns={QUEUE_COLUMNS} minWidthClass="min-w-[64rem]" pinnedActions>
     {queue.requests.map(request=><ListRow key={request.id} template={QUEUE_TEMPLATE}>
      <div className="min-w-0">
       <b className="block truncate text-[13.5px] font-semibold leading-[1.2] text-fore" title={request.subject_name}>{request.subject_name}</b>
       <small className="block truncate text-[11.5px] text-mute" title={`${kindLabel(request.subject_kind)}${request.subject_id?` · #${request.subject_id}`:''}${request.subject_email?` · ${request.subject_email}`:''}`}>{kindLabel(request.subject_kind)}{request.subject_id?` · #${request.subject_id}`:''}{request.subject_email?` · ${request.subject_email}`:''}</small>
      </div>
      <div className="min-w-0"><span className="block truncate text-[12.5px] text-fore" title={typeLabel(request.request_type)}>{typeShort(request.request_type)}</span><small className="text-[11px] text-mute">#{request.id}</small></div>
      <div className="flex min-w-0 items-center"><StateChip tone={STATUS_TONES[request.status]||'mute'} title={statusLabel(request.status)}>{statusLabel(request.status)}</StateChip></div>
      <div className="min-w-0 whitespace-nowrap text-[12px] tabular-nums text-mute" title={`Recibida el ${listDateFull(request.received_at)||''}${request.resolved_at?` · Resuelta el ${listDateFull(request.resolved_at)||''}`:''}`} data-tone={!['resolved','rejected','cancelled'].includes(request.status)&&dueTone(request.due_at,3)?'warn':undefined}>{slaLabel(request)}<small className="mt-0.5 block text-[10.5px]">Recibida {listDateShort(request.received_at)}</small></div>
      <div className="flex min-w-0 items-center justify-end gap-1 whitespace-nowrap">
       {request.subject_kind!=='other'&&request.subject_id?<a className="icon-button" href={`/core-api/api/privacy/requests/${request.id}/export`} target="_blank" rel="noreferrer" title="Descargar copia del titular" aria-label={`Descargar copia del titular de la solicitud #${request.id}`}><Download size={16}/></a>:null}
       {request.status==='received'?<button type="button" className="icon-button" disabled={busy} title="Verificar identidad" aria-label={`Verificar identidad de la solicitud #${request.id}`} onClick={()=>void mutate(`/api/privacy/requests/${request.id}`,{action:'verify'},'PATCH','Identidad verificada.')}><BadgeCheck size={16}/></button>:null}
       {['received','identity_verified','in_review'].includes(request.status)?<>
        <button type="button" className="text-button" disabled={busy} onClick={()=>setResolving(request)}><ShieldCheck size={15}/>Resolver</button>
        <button type="button" className="icon-button" disabled={busy} title="Rechazar con motivo" aria-label={`Rechazar la solicitud #${request.id}`} onClick={()=>setRejecting(request)}><CircleX size={16}/></button>
       </>:null}
      </div>
     </ListRow>)}
    </ListGrid>:<EmptyBlock compact title="No hay solicitudes en esta vista" description="Cuando un titular pida acceso, rectificación, supresión, oposición o portabilidad, aparece acá con su plazo."/>}
   </>}
  </Section>

  <Section title="Consentimientos registrados">
   {consents?.consents.length?<ListGrid label="Consentimientos vigentes" template={CONSENT_TEMPLATE} columns={CONSENT_COLUMNS} minWidthClass="min-w-[68rem]">
    {consents.consents.map(row=><ListRow key={row.id} template={CONSENT_TEMPLATE}>
     <div className="min-w-0"><b className="block truncate text-[13px] font-semibold text-fore" title={`${kindLabel(row.subject_kind)} #${row.subject_id}`}>{kindLabel(row.subject_kind)} #{row.subject_id}</b><small className="block truncate text-[11px] text-mute" title={`Origen: ${row.source}`}>Origen: {row.source}</small></div>
     <span className="truncate text-[12.5px] text-fore" title={purposeLabel(row.purpose)}>{purposeLabel(row.purpose)}</span>
     <span className="truncate text-[11.5px] text-mute" title={`${row.notice_version} · ${basisLabel(row.basis)}`}>{row.notice_version}<small className="block text-[10.5px]">{basisLabel(row.basis)}</small></span>
     <span className="truncate text-[11.5px] text-mute" title={row.source}>{row.source}</span>
     <span className="whitespace-nowrap text-[11.5px] tabular-nums text-mute">{listDateShort(row.granted_at)||'—'}</span>
     <div className="flex items-center justify-end"><button type="button" className="text-button" disabled={busy} title="Revocar este consentimiento" aria-label={`Revocar el consentimiento de ${purposeLabel(row.purpose)} de ${kindLabel(row.subject_kind)} #${row.subject_id}`} onClick={()=>void revokeConsent(row)}><ShieldOff size={15}/>Revocar</button></div>
    </ListRow>)}
   </ListGrid>:<EmptyBlock compact title="Sin consentimientos vigentes" description="Los consentimientos capturados en registro, invitaciones, CRM, landing y portal aparecen acá."/>}
  </Section>

  <Section title="Retención y minimización">
   {retention?.policies.length?<>
    <ListGrid label="Política de retención" template="grid-cols-[minmax(13rem,1.4fr)_minmax(7rem,0.7fr)_minmax(7rem,0.7fr)_minmax(16rem,1.6fr)]" columns={[{key:'entidad',label:'Entidad'},{key:'accion',label:'Acción'},{key:'plazo',label:'Plazo'},{key:'base',label:'Base y notas'}]} minWidthClass="min-w-[52rem]">
     {retention.policies.map(policy=><ListRow key={policy.id} template="grid-cols-[minmax(13rem,1.4fr)_minmax(7rem,0.7fr)_minmax(7rem,0.7fr)_minmax(16rem,1.6fr)]">
      <div className="min-w-0"><b className="block truncate text-[13px] font-semibold text-fore" title={policy.label}>{policy.label}</b><small className="block font-mono text-[10.5px] uppercase tracking-[.08em] text-mute">{policy.entity}</small></div>
      <span className="whitespace-nowrap text-[12px] text-fore">{policy.action==='purge'?'Purga':'Anonimiza'}</span>
      <span className="whitespace-nowrap text-[12px] tabular-nums text-mute">{policy.retentionDays} días</span>
      <span className="min-w-0 truncate text-[11.5px] text-mute" title={`${policy.basis}. ${policy.notes}`}>{policy.basis}<small className="block truncate text-[10.5px]">{policy.notes}</small></span>
     </ListRow>)}
    </ListGrid>
    <p className="mt-3 flex items-start gap-2 text-[11.5px] text-mute"><Landmark size={15} aria-hidden="true" className="mt-0.5 shrink-0"/>El job corre en modo <b className="text-fore">reporte</b> hasta que el dueño apruebe los plazos del RAT y habilite <code>PRIVACY_RETENTION_MODE=execute</code>. Ninguna corrida borra registros fiscales.</p>
    {retention.runs?.length?<p className="mt-2 text-[11px] text-mute">Última corrida: {listDateFull(retention.runs[0].finished_at||retention.runs[0].started_at)} · modo {retention.runs[0].mode} · {retention.runs[0].candidates} candidatos · {retention.runs[0].affected} aplicados.</p>:null}
   </>:<EmptyBlock compact title="Sin política cargada" description="El API no devolvió políticas de retención."/>}
  </Section>

  {creating?<Dialog title="Nueva solicitud de titular" close={()=>setCreating(false)}>
   <Editor fields={newFields} defaults={{subject_kind:'client',subject_id:'',subject_name:'',subject_email:'',request_type:'access',details:''}} label="Registrar solicitud" closeOnSave save={createRequest}/>
   <p className="mt-2 text-[11px] text-mute">Para un titular con ficha, el identificador es el número que aparece en Clientes, Pipeline, Equipo o el portal. Si no tiene ficha, elegí «Titular externo».</p>
  </Dialog>:null}
  {resolving?<Dialog title={`Resolver solicitud #${resolving.id} · ${typeShort(resolving.request_type)}`} close={()=>setResolving(null)}>
   <Editor fields={resolveFields} defaults={{resolution:'',resolution_action:(RESOLVE_ACTIONS[resolving.request_type]||[{value:'none'}])[0].value,purpose:purposes[0]?.id||''}} label="Resolver" closeOnSave save={resolveRequest}/>
   <p className="mt-2 text-[11px] text-mute">La resolución queda fechada y auditada; una supresión se aplica como bloqueo o anonimización.</p>
  </Dialog>:null}
  {rejecting?<Dialog title={`Rechazar solicitud #${rejecting.id}`} close={()=>setRejecting(null)}>
   <Editor fields={rejectFields} defaults={{rejection_reason:''}} label="Rechazar" closeOnSave save={rejectRequest}/>
  </Dialog>:null}
 </div>;
}
