'use client';
import {useEffect,useRef,useState} from 'react';
import {api} from './operations';
import './reports-workspace.css';

type CustomerKind='unknown'|'company'|'professional'|'individual'|'other';
export type ClientReportingRecord={clientId:string;customerKind:CustomerKind;servicePlanId:string|null;relationshipStartedOn:string|null;version:string;updatedAt:string;archived:boolean};
type Response={reporting:ClientReportingRecord;plans:{id:string;name:string}[]};
const kinds:Record<CustomerKind,string>={unknown:'Sin clasificar',company:'Empresa',professional:'Profesional',individual:'Persona particular',other:'Otro'};
const readRoles=['owner','admin','management','sales','finance'],writeRoles=['owner','admin','management','sales'];
function today(){const parts=new Intl.DateTimeFormat('en',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(type=>parts.find(part=>part.type===type)!.value).join('-');}
// Main keys the containing detail by organization. This key additionally clears
// drafts and ignores pending responses when the client or effective role changes.
export function ClientReporting({id,role,onSaved}:{id:string|number;role:string;onSaved?:()=>void|Promise<void>}){
 if(!readRoles.includes(role))return null;
 if(!/^[1-9]\d{0,18}$/.test(String(id))||typeof id==='number'&&!Number.isSafeInteger(id))return <p role="alert">Cliente inválido.</p>;
 return <ReportingEditor key={`${id}:${role}`} id={String(id)} writable={writeRoles.includes(role)} onSaved={onSaved}/>;
}
function ReportingEditor({id,writable,onSaved}:{id:string;writable:boolean;onSaved?:()=>void|Promise<void>}){
 const [data,setData]=useState<Response|null>(null),[draft,setDraft]=useState({customerKind:'unknown' as CustomerKind,servicePlanId:'',relationshipStartedOn:''});
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[retry,setRetry]=useState(0),[saving,setSaving]=useState(false);
 const locked=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 function apply(record:ClientReportingRecord){setDraft({customerKind:record.customerKind,servicePlanId:record.servicePlanId||'',relationshipStartedOn:record.relationshipStartedOn||''});}
 useEffect(()=>{
  let alive=true;setData(null);setError('');setNotice('');
  void api<Response>(`/api/agency/clients/${id}/reporting`).then(result=>{
   if(!result?.reporting||result.reporting.clientId!==id||typeof result.reporting.version!=='string'||!Array.isArray(result.plans))throw Error('No se pudo validar la ficha de reportes del cliente.');
   if(alive){setData(result);apply(result.reporting);}
  }).catch(e=>{if(alive)setError(e instanceof Error?e.message:'No se pudo cargar la ficha.');});
  return()=>{alive=false;};
 },[id,retry]);
 const record=data?.reporting;
 const changes:Record<string,string|null>={};
 if(record){
  if(draft.customerKind!==record.customerKind)changes.customerKind=draft.customerKind;
  if((draft.servicePlanId||null)!==record.servicePlanId)changes.servicePlanId=draft.servicePlanId||null;
  if((draft.relationshipStartedOn||null)!==record.relationshipStartedOn)changes.relationshipStartedOn=draft.relationshipStartedOn||null;
 }
 const dirty=Object.keys(changes).length>0,editable=writable&&!record?.archived;
 async function save(){
  if(!record||!editable||!dirty||locked.current)return;
  if(draft.relationshipStartedOn){const date=new Date(`${draft.relationshipStartedOn}T12:00:00Z`);if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.relationshipStartedOn)||draft.relationshipStartedOn<'1900-01-01'||draft.relationshipStartedOn>today()||Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==draft.relationshipStartedOn){setError('Ingresá una fecha real válida, no futura, o dejá el campo vacío.');return;}}
  locked.current=true;setSaving(true);setError('');setNotice('');
  try{
   const result=await api<Response>(`/api/agency/clients/${id}/reporting`,{expectedVersion:record.version,...changes},'PATCH');
   if(!mounted.current)return;
   if(!result?.reporting||result.reporting.clientId!==id||typeof result.reporting.version!=='string'||!Array.isArray(result.plans))throw Error('No se pudo verificar el guardado. Recargá la ficha antes de volver a editar.');
   setData(result);apply(result.reporting);setNotice('Datos para reportes guardados.');
   if(onSaved)try{await onSaved();}catch{if(mounted.current)setError('Los datos se guardaron, pero no se pudo actualizar la vista. Recargá la ficha.');}
  }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'No se pudo guardar. Recargá la ficha si cambió su versión.');}
  finally{locked.current=false;if(mounted.current)setSaving(false);}
 }
 return <section className="client-reporting" aria-label="Datos del cliente para reportes" aria-busy={saving||!data&&!error}>
  <h3>Datos para reportes</h3>
  <p className="reports-note">Registrá solo información conocida. Estos campos no reconstruyen automáticamente estados pasados. Si no conocés la fecha real de inicio, dejala vacía.</p>
  {!data&&!error?<p role="status">Cargando datos del cliente…</p>:null}
  {data?<>
   {!writable?<p>Solo lectura: Finanzas puede consultar estos datos, no modificarlos.</p>:data.reporting.archived?<p>El cliente está archivado. Esta ficha es de solo lectura.</p>:null}
   <div className="client-reporting-fields">
    <label>Tipo de cliente<select value={draft.customerKind} disabled={!editable||saving} onChange={e=>{if(Object.hasOwn(kinds,e.target.value))setDraft(value=>({...value,customerKind:e.target.value as CustomerKind}));}}>{(Object.keys(kinds) as CustomerKind[]).map(kind=><option key={kind} value={kind}>{kinds[kind]}</option>)}</select></label>
    <label>Plan de servicio<select value={draft.servicePlanId} disabled={!editable||saving} onChange={e=>setDraft(value=>({...value,servicePlanId:e.target.value}))}><option value="">Sin plan registrado</option>{draft.servicePlanId&&!data.plans.some(plan=>plan.id===draft.servicePlanId)?<option value={draft.servicePlanId} disabled>Plan registrado #{draft.servicePlanId} (no disponible)</option>:null}{data.plans.map(plan=><option value={plan.id} key={plan.id}>{plan.name}</option>)}</select></label>
    <label>Fecha real de inicio (opcional)<input type="date" min="1900-01-01" max={today()} value={draft.relationshipStartedOn} disabled={!editable||saving} onChange={e=>setDraft(value=>({...value,relationshipStartedOn:e.target.value}))}/></label>
   </div>
  </>:null}
  {error?<p className="reports-error" role="alert">{error}</p>:null}{notice?<p role="status">{notice}</p>:null}
  <div className="client-reporting-actions">{data&&editable?<button type="button" disabled={saving||!dirty} onClick={save}>{saving?'Guardando…':'Guardar datos para reportes'}</button>:null}{error?<button type="button" disabled={saving} onClick={()=>setRetry(value=>value+1)}>Recargar ficha (descarta cambios)</button>:null}</div>
 </section>;
}
