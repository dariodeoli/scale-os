'use client';
import {currencyChoices} from './currencies';
import {money} from './operations';
import {AmountInput,SelectCustom} from './profile-controls';
import {decimalInput} from './field-rules';
import {listDateFull} from './list-format';
import {todayAsuncion} from './client-format';
import {DISCOUNT_TYPE_CHOICES,amendmentLabel,useCommercialLifecycleData,validClientId} from './client-commercial-lifecycle-data';
import './reports-workspace.css';
// La lógica de datos vive en ./client-commercial-lifecycle-data (funciones puras
// + hook); se reexporta lo que otros módulos/tests ya importaban de acá.
export type {CommercialAmendment,ClientCommercialLifecycleRecord,CommercialAmendmentDraft,DiscountType} from './client-commercial-lifecycle-data';
export {validPastDate,freshAmendmentDraft,amendmentLabel,validateAmendmentDraft,amendmentPayload,validClientId,validLifecycleResponse} from './client-commercial-lifecycle-data';

const readRoles=['owner','admin','finance'],writeRoles=['owner','admin'];

export function ClientCommercialLifecycle({id,role,onSaved}:{id:string|number;role:string;onSaved?:()=>void|Promise<void>}){
 if(!readRoles.includes(role))return null;
 if(!validClientId(id))return <p role="alert">Cliente inválido.</p>;
 return <CommercialLifecycleEditor key={`${id}:${role}`} id={String(id)} writable={writeRoles.includes(role)} onSaved={onSaved}/>;
}
function CommercialLifecycleEditor({id,writable,onSaved}:{id:string;writable:boolean;onSaved?:()=>void|Promise<void>}){
 const {data,record,editable,adding,setAdding,draft,update,error,notice,saving,resetDraft,reload,save}=useCommercialLifecycleData({id,writable,onSaved});
 return <section className="client-reporting" aria-label="Ciclo comercial del cliente" aria-busy={saving||!data&&!error}>
  <h3>Ciclo comercial</h3>
  <p className="reports-note">Cada cambio se registra como una enmienda nueva. Las condiciones históricas se conservan tal como se contrataron.</p>
  {!data&&!error?<p role="status">Cargando ciclo comercial…</p>:null}
  {data? <>
   {!writable?<p>Solo lectura: Finanzas puede consultar el historial comercial, no modificarlo.</p>:record?.archived?<p>El cliente está archivado. Esta ficha es de solo lectura.</p>:null}
   {record?.amendments.length?<div className="reports-table-scroll"><table><caption>Historial de condiciones contratadas</caption><thead><tr><th>Vigente desde</th><th>Cliente desde</th><th>Plan</th><th>Mensual</th><th>Descuento</th><th>Extras y entregables</th></tr></thead><tbody>{record.amendments.map(amendment=><tr key={amendment.id}><td><time dateTime={amendment.effectiveOn}>{listDateFull(amendment.effectiveOn)}</time></td><td>{amendment.activationDate?<time dateTime={amendment.activationDate}>{listDateFull(amendment.activationDate)}</time>:'Sin fecha registrada'}</td><td><b>{amendment.planName}</b><small>Versión contratada: {amendment.planVersionSnapshot}</small></td><td>{money(amendment.monthlyPrice,amendment.currency)}</td><td>{amendmentLabel(amendment)}{amendment.discountTerms?<small>{amendment.discountTerms}</small>:null}</td><td>{amendment.extrasDeliverables||'Sin extras registrados'}</td></tr>)}</tbody></table></div>:<p className="reports-warning" role="status">Todavía no hay condiciones comerciales registradas para este cliente.</p>}
   {editable&&!adding?<div className="client-reporting-actions"><button type="button" onClick={()=>{resetDraft();setAdding(true);}}>Registrar enmienda comercial</button></div>:null}
   {editable&&adding?<form className="client-reporting-fields" noValidate aria-busy={saving} onSubmit={save}>
    <label>Vigente desde<input type="date" min="1900-01-01" max={todayAsuncion()} value={draft.effectiveOn} disabled={saving} onChange={event=>update('effectiveOn',event.target.value)}/></label>
    <label>Cliente desde (opcional)<input type="date" min="1900-01-01" max={todayAsuncion()} value={draft.activationDate} disabled={saving} onChange={event=>update('activationDate',event.target.value)}/></label>
    <label>Nombre del plan<input value={draft.planName} disabled={saving} onChange={event=>update('planName',event.target.value)}/></label>
    <label>Versión contratada<input value={draft.planVersionSnapshot} disabled={saving} onChange={event=>update('planVersionSnapshot',event.target.value)}/></label>
    <label>Precio mensual contratado<AmountInput value={draft.monthlyPrice} currency={draft.currency} disabled={saving} onChange={value=>update('monthlyPrice',value)}/></label>
    <label><SelectCustom label="Moneda" choices={currencyChoices} value={draft.currency} disabled={saving} onChange={value=>update('currency',value)}/></label>
    <label><SelectCustom label="Tipo de descuento" choices={DISCOUNT_TYPE_CHOICES} value={draft.discountType} disabled={saving} onChange={value=>update('discountType',value as typeof draft.discountType)}/></label>
    {draft.discountType!=='none'?<label>Valor del descuento<input type="text" inputMode="decimal" autoComplete="off" value={draft.discountValue} disabled={saving} onChange={event=>update('discountValue',decimalInput(event.target.value))}/></label>:null}
    <label className="ops-wide">Términos del descuento (opcional)<textarea value={draft.discountTerms} disabled={saving} onChange={event=>update('discountTerms',event.target.value)}/></label>
    <label className="ops-wide">Extras y entregables personalizados (opcional)<textarea value={draft.extrasDeliverables} disabled={saving} onChange={event=>update('extrasDeliverables',event.target.value)}/></label>
    <div className="client-reporting-actions ops-wide"><button type="button" disabled={saving} onClick={()=>{resetDraft();setAdding(false);}}>Cancelar</button><button type="submit" disabled={saving}>{saving?'Registrando…':'Registrar enmienda'}</button></div>
   </form>:null}
  </>:null}
  {error?<p className="reports-error" role="alert">{error}</p>:null}{notice?<p role="status">{notice}</p>:null}
  {error?<div className="client-reporting-actions"><button type="button" disabled={saving} onClick={reload}>Recargar ficha (descarta cambios)</button></div>:null}
 </section>;
}
