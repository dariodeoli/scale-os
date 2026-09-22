'use client';
// Rediseño v2 (campaña #41 / spec #43 §1.4): historial comercial como tabla
// compartida (`DataTable`: tabla en escritorio, tarjetas en móvil) y enmienda
// con campos por tipo. La lógica vive en ./client-commercial-lifecycle-data.
import {Button,DataTable,EmptyState,FormField,Input,MoneyInput,Select,Textarea,Aviso} from 'owncoding-ui';
import {LoadingBlock} from './ui-v2';
import {money} from './operations';
import {currencyChoices} from './currencies';
import {listDateFull} from './list-format';
import {todayAsuncion} from './client-format';
import {DISCOUNT_TYPE_CHOICES,amendmentLabel,useCommercialLifecycleData,validClientId} from './client-commercial-lifecycle-data';
// Se reexporta lo que otros módulos/tests ya importaban de acá.
export type {CommercialAmendment,ClientCommercialLifecycleRecord,CommercialAmendmentDraft,DiscountType} from './client-commercial-lifecycle-data';
export {validPastDate,freshAmendmentDraft,amendmentLabel,validateAmendmentDraft,amendmentPayload,validClientId,validLifecycleResponse} from './client-commercial-lifecycle-data';

const readRoles=['owner','admin','finance'],writeRoles=['owner','admin'];

export function ClientCommercialLifecycle({id,role,onSaved}:{id:string|number;role:string;onSaved?:()=>void|Promise<void>}){
 if(!readRoles.includes(role))return null;
 if(!validClientId(id))return <Aviso tono="error" role="alert">Cliente inválido.</Aviso>;
 return <CommercialLifecycleEditor key={`${id}:${role}`} id={String(id)} writable={writeRoles.includes(role)} onSaved={onSaved}/>;
}

function CommercialLifecycleEditor({id,writable,onSaved}:{id:string;writable:boolean;onSaved?:()=>void|Promise<void>}){
 const {data,record,editable,adding,setAdding,draft,update,error,notice,saving,resetDraft,reload,save}=useCommercialLifecycleData({id,writable,onSaved});
 return <section className="grid gap-4" aria-label="Ciclo comercial del cliente" aria-busy={saving||(!data&&!error)}>
  <h3 className="text-base font-bold text-fore">Ciclo comercial</h3>
  <p className="max-w-[76ch] text-xs leading-5 text-mute">Cada cambio se registra como una enmienda nueva. Las condiciones históricas se conservan tal como se contrataron.</p>
  {!data&&!error?<LoadingBlock label="Cargando ciclo comercial…" lines={3}/>:null}
  {data?<>
   {!writable?<p className="text-sm text-mute">Solo lectura: Finanzas puede consultar el historial comercial, no modificarlo.</p>:record?.archived?<p className="text-sm text-mute">El cliente está archivado. Esta ficha es de solo lectura.</p>:null}
   {record?.amendments.length
    ?<DataTable
      className="min-w-0"
      columns={[
       {key:'effectiveOn',label:'Vigente desde',render:(row:{amendment:Parameters<typeof amendmentLabel>[0]})=><time dateTime={row.amendment.effectiveOn} className="whitespace-nowrap">{listDateFull(row.amendment.effectiveOn)}</time>},
       {key:'activationDate',label:'Cliente desde',render:(row:{amendment:Parameters<typeof amendmentLabel>[0]})=>row.amendment.activationDate?<time dateTime={row.amendment.activationDate} className="whitespace-nowrap">{listDateFull(row.amendment.activationDate)}</time>:<span className="text-mute">Sin fecha registrada</span>},
       {key:'plan',label:'Plan',render:(row:{amendment:Parameters<typeof amendmentLabel>[0]})=><div className="grid gap-0.5"><strong className="text-fore">{row.amendment.planName}</strong><small className="text-[11px] text-mute">Versión contratada: {row.amendment.planVersionSnapshot}</small></div>},
       {key:'monthlyPrice',label:'Mensual',align:'right',render:(row:{amendment:Parameters<typeof amendmentLabel>[0]})=><span className="whitespace-nowrap font-semibold tabular-nums text-fore">{money(row.amendment.monthlyPrice,row.amendment.currency)}</span>},
       {key:'discount',label:'Descuento',render:(row:{amendment:Parameters<typeof amendmentLabel>[0]})=><div className="grid gap-0.5"><span className="whitespace-nowrap text-fore">{amendmentLabel(row.amendment)}</span>{row.amendment.discountTerms?<small className="text-[11px] text-mute">{row.amendment.discountTerms}</small>:null}</div>},
       {key:'extras',label:'Extras y entregables',render:(row:{amendment:Parameters<typeof amendmentLabel>[0]})=><span className="text-fore">{row.amendment.extrasDeliverables||'Sin extras registrados'}</span>},
      ]}
      rows={record.amendments.map(amendment=>({id:amendment.id,amendment}))}
      emptyLabel="Todavía no hay condiciones comerciales registradas para este cliente."
      mobileCard={(row: {id: string; amendment: Parameters<typeof amendmentLabel>[0]})=>{const amendment=row.amendment;return <div className="grid gap-2 rounded-lg border border-ink-600 bg-ink-800 p-3 text-sm">
       <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold text-mute">{listDateFull(amendment.effectiveOn)}</span>
        <strong className="tabular-nums text-fore">{money(amendment.monthlyPrice,amendment.currency)}</strong>
       </div>
       <p className="font-semibold text-fore">{amendment.planName}</p>
       <p className="text-xs text-mute">Versión contratada: {amendment.planVersionSnapshot}</p>
       <p className="text-xs text-mute">Cliente desde: {amendment.activationDate?listDateFull(amendment.activationDate):'Sin fecha registrada'}</p>
       <p className="text-xs text-mute">Descuento: {amendmentLabel(amendment)}{amendment.discountTerms?` · ${amendment.discountTerms}`:''}</p>
       <p className="text-xs text-mute">Extras: {amendment.extrasDeliverables||'Sin extras registrados'}</p>
      </div>;}}
     />
    :<EmptyState compact icon="receipt" title="Todavía no hay condiciones comerciales registradas para este cliente." description="Registrá la primera enmienda para dejar el historial por escrito."/>}
   {editable&&!adding?<div><Button type="button" onClick={()=>{resetDraft();setAdding(true);}}>Registrar enmienda comercial</Button></div>:null}
   {editable&&adding?<form className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" noValidate aria-busy={saving} onSubmit={save}>
    <FormField label="Vigente desde" htmlFor="lifecycle-effective-on"><Input id="lifecycle-effective-on" type="date" className="w-40" min="1900-01-01" max={todayAsuncion()} value={draft.effectiveOn} disabled={saving} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>update('effectiveOn',event.target.value)}/></FormField>
    <FormField label="Cliente desde (opcional)" htmlFor="lifecycle-activation-date"><Input id="lifecycle-activation-date" type="date" className="w-40" min="1900-01-01" max={todayAsuncion()} value={draft.activationDate} disabled={saving} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>update('activationDate',event.target.value)}/></FormField>
    <FormField label="Nombre del plan" htmlFor="lifecycle-plan-name"><Input id="lifecycle-plan-name" value={draft.planName} disabled={saving} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>update('planName',event.target.value)}/></FormField>
    <FormField label="Versión contratada" htmlFor="lifecycle-plan-version"><Input id="lifecycle-plan-version" value={draft.planVersionSnapshot} disabled={saving} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>update('planVersionSnapshot',event.target.value)}/></FormField>
    <FormField label="Precio mensual contratado" htmlFor="lifecycle-monthly-price"><MoneyInput id="lifecycle-monthly-price" className="w-44" currency={draft.currency} value={draft.monthlyPrice} disabled={saving} onValueChange={(value: unknown)=>update('monthlyPrice',String(value))}/></FormField>
    <FormField label="Moneda" htmlFor="lifecycle-currency"><Select id="lifecycle-currency" className="w-40" value={draft.currency} disabled={saving} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>update('currency',event.target.value)}>{currencyChoices.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}</Select></FormField>
    <FormField label="Tipo de descuento" htmlFor="lifecycle-discount-type"><Select id="lifecycle-discount-type" value={draft.discountType} disabled={saving} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>update('discountType',event.target.value as typeof draft.discountType)}>{DISCOUNT_TYPE_CHOICES.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}</Select></FormField>
    {draft.discountType!=='none'?<FormField label="Valor del descuento" htmlFor="lifecycle-discount-value"><Input id="lifecycle-discount-value" type="text" inputMode="decimal" autoComplete="off" className="w-36" value={draft.discountValue} disabled={saving} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>update('discountValue',event.target.value)}/></FormField>:null}
    <FormField label="Términos del descuento (opcional)" htmlFor="lifecycle-discount-terms"><Textarea id="lifecycle-discount-terms" rows={3} value={draft.discountTerms} disabled={saving} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>update('discountTerms',event.target.value)}/></FormField>
    <FormField label="Extras y entregables personalizados (opcional)" htmlFor="lifecycle-extras"><Textarea id="lifecycle-extras" rows={3} value={draft.extrasDeliverables} disabled={saving} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>update('extrasDeliverables',event.target.value)}/></FormField>
    <div className="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-3">
     <Button type="button" variant="outline" disabled={saving} onClick={()=>{resetDraft();setAdding(false);}}>Cancelar</Button>
     <Button type="submit" disabled={saving}>{saving?'Registrando…':'Registrar enmienda'}</Button>
    </div>
   </form>:null}
  </>:null}
  {error?<Aviso tono="error" role="alert">{error}</Aviso>:null}
  {notice?<p role="status" className="text-sm font-semibold text-ok">{notice}</p>:null}
  {error?<div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={saving} onClick={reload}>Recargar ficha (descarta cambios)</Button></div>:null}
 </section>;
}
