'use client';
import {useEffect,useRef,useState} from 'react';
import {currencyChoices} from './currencies';
import {api,money} from './operations';
import {AmountInput} from './profile-controls';
import {decimalInput} from './field-rules';
import './reports-workspace.css';

type DiscountType='none'|'percent'|'fixed';
export type CommercialAmendment={id:string;effectiveOn:string;activationDate:string|null;planName:string;planVersionSnapshot:string;monthlyPrice:string;currency:string;discountType:DiscountType;discountValue:string|null;discountTerms:string|null;extrasDeliverables:string|null;createdAt:string};
export type ClientCommercialLifecycleRecord={clientId:string;version:string;archived:boolean;amendments:CommercialAmendment[]};
type Response={commercial:ClientCommercialLifecycleRecord};
type Draft={effectiveOn:string;activationDate:string;planName:string;planVersionSnapshot:string;monthlyPrice:string;currency:string;discountType:DiscountType;discountValue:string;discountTerms:string;extrasDeliverables:string};
const readRoles=['owner','admin','finance'],writeRoles=['owner','admin'];
const discounts:Record<DiscountType,string>={none:'Sin descuento',percent:'Porcentaje',fixed:'Importe fijo'};
const currencies:readonly string[]=currencyChoices.map(currency=>currency.value);
const validId=(id:string|number)=>/^[1-9]\d{0,18}$/.test(String(id))&&!(typeof id==='number'&&!Number.isSafeInteger(id));
function today(){const parts=new Intl.DateTimeFormat('en',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(type=>parts.find(part=>part.type===type)!.value).join('-');}
function validDate(value:string,maximum:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'1900-01-01'||value>maximum)return false;const date=new Date(`${value}T12:00:00Z`);return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;}
function freshDraft():Draft{return{effectiveOn:today(),activationDate:'',planName:'',planVersionSnapshot:'',monthlyPrice:'',currency:'PYG',discountType:'none',discountValue:'',discountTerms:'',extrasDeliverables:''};}
function amendmentLabel(amendment:CommercialAmendment){if(amendment.discountType==='none')return 'Sin descuento';const value=amendment.discountType==='percent'?`${amendment.discountValue||'0'}%`:money(amendment.discountValue||'0',amendment.currency);return `${discounts[amendment.discountType]} · ${value}`;}

export function ClientCommercialLifecycle({id,role,onSaved}:{id:string|number;role:string;onSaved?:()=>void|Promise<void>}){
 if(!readRoles.includes(role))return null;
 if(!validId(id))return <p role="alert">Cliente inválido.</p>;
 return <CommercialLifecycleEditor key={`${id}:${role}`} id={String(id)} writable={writeRoles.includes(role)} onSaved={onSaved}/>;
}
function CommercialLifecycleEditor({id,writable,onSaved}:{id:string;writable:boolean;onSaved?:()=>void|Promise<void>}){
 const [data,setData]=useState<Response|null>(null),[draft,setDraft]=useState<Draft>(freshDraft),[adding,setAdding]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[retry,setRetry]=useState(0),[saving,setSaving]=useState(false);
 const locked=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{let alive=true;setData(null);setError('');setNotice('');setAdding(false);void api<Response>(`/api/agency/clients/${id}/commercial-lifecycle`).then(result=>{
  if(!result?.commercial||result.commercial.clientId!==id||typeof result.commercial.version!=='string'||!Array.isArray(result.commercial.amendments))throw Error('No se pudo validar la ficha comercial del cliente.');
  if(alive)setData(result);
 }).catch(reason=>{if(alive)setError(reason instanceof Error?reason.message:'No se pudo cargar la ficha comercial.');});return()=>{alive=false;};},[id,retry]);
 const record=data?.commercial,editable=writable&&!record?.archived;
 function resetDraft(){setDraft(freshDraft());setError('');setNotice('');}
 function update<K extends keyof Draft>(key:K,value:Draft[K]){setDraft(current=>({...current,[key]:value}));}
 async function save(event:React.FormEvent){event.preventDefault();if(!record||!editable||saving||locked.current)return;
  const maximum=today(),price=Number(draft.monthlyPrice),discount=Number(draft.discountValue);
  if(!validDate(draft.effectiveOn,maximum)||draft.activationDate&&!validDate(draft.activationDate,maximum)){setError('Ingresá fechas reales válidas, no futuras.');return;}
  if(!draft.planName.trim()||!draft.planVersionSnapshot.trim()){setError('Indicá el nombre y la versión del plan contratados.');return;}
  if(!Number.isFinite(price)||price<0){setError('Ingresá un precio mensual válido.');return;}
  if(!currencies.includes(draft.currency)){setError('Elegí una moneda válida.');return;}
  if(draft.discountType!=='none'&&(!Number.isFinite(discount)||discount<=0||(draft.discountType==='percent'&&discount>100))){setError(draft.discountType==='percent'?'El descuento porcentual debe ser mayor a 0 y hasta 100.':'Ingresá un descuento válido mayor a 0.');return;}
  locked.current=true;setSaving(true);setError('');setNotice('');
  try{const result=await api<Response>(`/api/agency/clients/${id}/commercial-lifecycle/amendments`,{expectedVersion:record.version,effectiveOn:draft.effectiveOn,activationDate:draft.activationDate||null,planName:draft.planName.trim(),planVersionSnapshot:draft.planVersionSnapshot.trim(),monthlyPrice:draft.monthlyPrice,currency:draft.currency,discountType:draft.discountType,discountValue:draft.discountType==='none'?null:draft.discountValue,discountTerms:draft.discountTerms.trim()||null,extrasDeliverables:draft.extrasDeliverables.trim()||null});
   if(!mounted.current)return;
   if(!result?.commercial||result.commercial.clientId!==id||typeof result.commercial.version!=='string'||!Array.isArray(result.commercial.amendments))throw Error('No se pudo verificar la enmienda guardada. Recargá la ficha antes de volver a editar.');
   setData(result);setAdding(false);resetDraft();setNotice('Enmienda comercial registrada. El historial previo no se modifica.');
   if(onSaved)try{await onSaved();}catch{if(mounted.current)setError('La enmienda se guardó, pero no se pudo actualizar la vista. Recargala.');}
  }catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:'No se pudo registrar la enmienda. Recargá la ficha si otra persona la actualizó.');}
  finally{locked.current=false;if(mounted.current)setSaving(false);}
 }
 return <section className="client-reporting" aria-label="Ciclo comercial del cliente" aria-busy={saving||!data&&!error}>
  <h3>Ciclo comercial</h3>
  <p className="reports-note">Cada cambio se registra como una enmienda nueva. Las condiciones históricas se conservan tal como se contrataron.</p>
  {!data&&!error?<p role="status">Cargando ciclo comercial…</p>:null}
  {data? <>
   {!writable?<p>Solo lectura: Finanzas puede consultar el historial comercial, no modificarlo.</p>:record?.archived?<p>El cliente está archivado. Esta ficha es de solo lectura.</p>:null}
   {record?.amendments.length?<div className="reports-table-scroll"><table><caption>Historial de condiciones contratadas</caption><thead><tr><th>Vigente desde</th><th>Cliente desde</th><th>Plan</th><th>Mensual</th><th>Descuento</th><th>Extras y entregables</th></tr></thead><tbody>{record.amendments.map(amendment=><tr key={amendment.id}><td><time dateTime={amendment.effectiveOn}>{amendment.effectiveOn}</time></td><td>{amendment.activationDate?<time dateTime={amendment.activationDate}>{amendment.activationDate}</time>:'Sin fecha registrada'}</td><td><b>{amendment.planName}</b><small>Versión contratada: {amendment.planVersionSnapshot}</small></td><td>{money(amendment.monthlyPrice,amendment.currency)}</td><td>{amendmentLabel(amendment)}{amendment.discountTerms?<small>{amendment.discountTerms}</small>:null}</td><td>{amendment.extrasDeliverables||'Sin extras registrados'}</td></tr>)}</tbody></table></div>:<p className="reports-warning" role="status">Todavía no hay condiciones comerciales registradas para este cliente.</p>}
   {editable&&!adding?<div className="client-reporting-actions"><button type="button" onClick={()=>{resetDraft();setAdding(true);}}>Registrar enmienda comercial</button></div>:null}
   {editable&&adding?<form className="client-reporting-fields" noValidate aria-busy={saving} onSubmit={save}>
    <label>Vigente desde<input type="date" min="1900-01-01" max={today()} value={draft.effectiveOn} disabled={saving} onChange={event=>update('effectiveOn',event.target.value)}/></label>
    <label>Cliente desde (opcional)<input type="date" min="1900-01-01" max={today()} value={draft.activationDate} disabled={saving} onChange={event=>update('activationDate',event.target.value)}/></label>
    <label>Nombre del plan<input value={draft.planName} disabled={saving} onChange={event=>update('planName',event.target.value)}/></label>
    <label>Versión contratada<input value={draft.planVersionSnapshot} disabled={saving} onChange={event=>update('planVersionSnapshot',event.target.value)}/></label>
    <label>Precio mensual contratado<AmountInput value={draft.monthlyPrice} currency={draft.currency} disabled={saving} onChange={value=>update('monthlyPrice',value)}/></label>
    <label>Moneda<select value={draft.currency} disabled={saving} onChange={event=>update('currency',event.target.value)}>{currencyChoices.map(currency=><option key={currency.value} value={currency.value}>{currency.label}</option>)}</select></label>
    <label>Tipo de descuento<select value={draft.discountType} disabled={saving} onChange={event=>update('discountType',event.target.value as DiscountType)}>{(Object.keys(discounts) as DiscountType[]).map(type=><option key={type} value={type}>{discounts[type]}</option>)}</select></label>
    {draft.discountType!=='none'?<label>Valor del descuento<input type="text" inputMode="decimal" autoComplete="off" value={draft.discountValue} disabled={saving} onChange={event=>update('discountValue',decimalInput(event.target.value))}/></label>:null}
    <label className="ops-wide">Términos del descuento (opcional)<textarea value={draft.discountTerms} disabled={saving} onChange={event=>update('discountTerms',event.target.value)}/></label>
    <label className="ops-wide">Extras y entregables personalizados (opcional)<textarea value={draft.extrasDeliverables} disabled={saving} onChange={event=>update('extrasDeliverables',event.target.value)}/></label>
    <div className="client-reporting-actions ops-wide"><button type="button" disabled={saving} onClick={()=>{resetDraft();setAdding(false);}}>Cancelar</button><button type="submit" disabled={saving}>{saving?'Registrando…':'Registrar enmienda'}</button></div>
   </form>:null}
  </>:null}
  {error?<p className="reports-error" role="alert">{error}</p>:null}{notice?<p role="status">{notice}</p>:null}
  {error?<div className="client-reporting-actions"><button type="button" disabled={saving} onClick={()=>setRetry(value=>value+1)}>Recargar ficha (descarta cambios)</button></div>:null}
 </section>;
}
