'use client';
// Rediseño v2 (campaña #41 / spec #43 §1.4): ficha de reportes y términos
// comerciales con objetos de la librería, estados de carga/vacío/error y
// campos por tipo. La lógica vive en ./client-reporting-data (hook + puros).
import {Button,EmptyState,FilaDato,FormField,Input,MoneyInput,Nota,Select,Aviso} from 'owncoding-ui';
import {LoadingBlock} from './ui-v2';
import {currencyChoices} from './currencies';
import {formatWholeMoney} from './amount-format';
import {soloDigitos} from 'owncoding-ui';
import {listDateFull} from './list-format';
import {todayAsuncion} from './client-format';
import {COMMISSION_MODE_CHOICES,CUSTOMER_KINDS,CUSTOMER_KIND_CHOICES,isCurrency,useClientReportingData} from './client-reporting-data';
// La lógica de datos vive en ./client-reporting-data (funciones puras + hook);
// se reexporta lo que otros módulos/tests ya importaban de acá.
export type {ClientReportingRecord,CommercialTerms,CustomerKind,MoneyCurrency,ReportingDraft,TermsDraft} from './client-reporting-data';
export {validTerms,validTermsResponse,termsDraft,sameTerms,completeTerms,reportingChanges,validateRelationshipDate,validateTermsDraft,isWholeTransport,isPositiveInput,isDate,isCurrency,CUSTOMER_KINDS} from './client-reporting-data';

const readRoles=['owner','admin','management','sales','finance'],writeRoles=['owner','admin','management','sales'],financialRoles=['owner','admin','finance'];

export function ClientReporting({id,role,onSaved}:{id:string|number;role:string;onSaved?:()=>void|Promise<void>}){
 if(!readRoles.includes(role))return null;
 if(!/^[1-9]\d{0,18}$/.test(String(id))||typeof id==='number'&&!Number.isSafeInteger(id))return <Aviso tono="error" role="alert">Cliente inválido.</Aviso>;
 return <ReportingEditor key={`${id}:${role}`} id={String(id)} writable={writeRoles.includes(role)} financial={financialRoles.includes(role)} onSaved={onSaved}/>;
}

function ReportingEditor({id,writable,financial,onSaved}:{id:string;writable:boolean;financial:boolean;onSaved?:()=>void|Promise<void>}){
 const {data,termData,record,commercial,draft,setDraft,terms,setTerms,error,notice,saving,dirty,editable,termsEditable,reload,save}=useClientReportingData({id,financial,writable,onSaved});
 const disabled=!editable||saving;
 return <section className="grid gap-4" aria-label="Datos comerciales del cliente" aria-busy={saving||(!data&&!error)}>
  <div className="flex flex-wrap items-center justify-between gap-2">
   <h3 className="text-base font-bold text-fore">Datos comerciales y reportes</h3>
   {data&&!editable?<span className="rounded-md border border-ink-600 bg-ink-700 px-2 py-0.5 text-xs font-medium text-mute">Solo lectura</span>:null}
  </div>
  <Nota tono="info" compact>Registrá solo información conocida. Estos campos no reconstruyen automáticamente estados pasados. Si no conocés la fecha real de inicio, dejala vacía.</Nota>
  {!data&&!error?<LoadingBlock label="Cargando datos del cliente…" lines={3}/>:null}
  {data?<>
   {!writable?<p className="text-sm text-mute">Solo lectura: Finanzas puede consultar estos datos, no modificarlos.</p>:record?.archived?<p className="text-sm text-mute">El cliente está archivado. Esta ficha es de solo lectura.</p>:null}
   {financial&&termData?<section className="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4" aria-labelledby="client-commercial-terms-title">
    <h4 id="client-commercial-terms-title" className="text-sm font-bold text-fore">Términos comerciales efectivos</h4>
    {commercial?<dl className="grid gap-2 text-sm">
     <div className="grid gap-1 sm:flex sm:items-start sm:justify-between sm:gap-3"><dt className="text-mute">Plan</dt><dd className="min-w-0 font-semibold [overflow-wrap:anywhere] sm:text-right">{commercial.planName}</dd></div>
     <FilaDato etiquetaComo="dt" valorComo="dd" etiqueta="Monto recurrente" valor={formatWholeMoney(commercial.recurringAmount,commercial.currency)}/>
     <FilaDato etiquetaComo="dt" valorComo="dd" etiqueta="Inicio comercial" valor={listDateFull(commercial.startsOn)}/>
     <FilaDato etiquetaComo="dt" valorComo="dd" etiqueta="Fin comercial" valor={commercial.endsOn?listDateFull(commercial.endsOn):'Sin fecha de fin'}/>
     <FilaDato etiquetaComo="dt" valorComo="dd" etiqueta="Factura comercial del cliente" valor={commercial.invoiceRequired?'Sí':'No'}/>
     <div className="grid gap-1 sm:flex sm:items-start sm:justify-between sm:gap-3"><dt className="text-mute">Comisión</dt><dd className="min-w-0 font-semibold [overflow-wrap:anywhere] sm:text-right">{commercial.commissionMode==='none'?'Sin comisión':`${commercial.commissionMode==='percentage'?`${commercial.commissionValue}%`:formatWholeMoney(commercial.commissionValue,commercial.currency)} · ${commercial.commissionRecipientName??''}`.trim()}</dd></div>
    </dl>:<EmptyState compact icon="money" title="Todavía no hay términos comerciales efectivos" description="Completá el editor para registrarlos."/>}
   </section>:null}
   <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
    <FormField label="Tipo de cliente" htmlFor="client-reporting-kind">
     <Select id="client-reporting-kind" value={draft.customerKind} disabled={disabled} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>{if(Object.hasOwn(CUSTOMER_KINDS,event.target.value))setDraft(current=>({...current,customerKind:event.target.value as keyof typeof CUSTOMER_KINDS}));}}>
      {CUSTOMER_KIND_CHOICES.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}
     </Select>
    </FormField>
    <FormField label="Plan de servicio" htmlFor="client-reporting-plan">
     <Select id="client-reporting-plan" value={draft.servicePlanId} disabled={disabled} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setDraft(current=>({...current,servicePlanId:event.target.value}))}>
      <option value="">Sin plan registrado</option>
      {data.plans.map(plan=><option key={plan.id} value={String(plan.id)}>{plan.name}</option>)}
     </Select>
    </FormField>
    <FormField label="Fecha real de inicio (opcional)" htmlFor="client-reporting-relationship">
     <Input id="client-reporting-relationship" type="date" min="1900-01-01" max={todayAsuncion()} value={draft.relationshipStartedOn} disabled={disabled} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setDraft(current=>({...current,relationshipStartedOn:event.target.value}))} className="w-40"/>
    </FormField>
    {financial&&termData?<>
     <FormField label="Plan comercial" htmlFor="client-reporting-terms-plan">
      <Select id="client-reporting-terms-plan" value={terms.planId} disabled={!termsEditable||saving} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setTerms(current=>({...current,planId:event.target.value}))}>
       <option value="">Elegí un plan</option>
       {termData.plans.map(plan=><option key={plan.id} value={String(plan.id)}>{plan.name}</option>)}
      </Select>
     </FormField>
     <FormField label="Monto recurrente entero" htmlFor="client-reporting-amount">
      <MoneyInput id="client-reporting-amount" currency={terms.currency} value={terms.recurringAmount} disabled={!termsEditable||saving} onValueChange={(value: unknown)=>setTerms(current=>({...current,recurringAmount:String(value)}))} className="w-44"/>
     </FormField>
     <FormField label="Moneda" htmlFor="client-reporting-currency">
      <Select id="client-reporting-currency" className="w-40" value={terms.currency} disabled={!termsEditable||saving} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setTerms(current=>({...current,currency:isCurrency(event.target.value)?event.target.value:'PYG'}))}>
       {currencyChoices.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}
      </Select>
     </FormField>
     <FormField label="Inicio comercial" htmlFor="client-reporting-starts">
      <Input id="client-reporting-starts" type="date" min="1900-01-01" value={terms.startsOn} disabled={!termsEditable||saving} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setTerms(current=>({...current,startsOn:event.target.value}))} className="w-40"/>
     </FormField>
     <FormField label="Fin del plan (opcional)" htmlFor="client-reporting-ends">
      <Input id="client-reporting-ends" type="date" min="1900-01-01" value={terms.endsOn} disabled={!termsEditable||saving} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setTerms(current=>({...current,endsOn:event.target.value}))} className="w-40"/>
     </FormField>
     <FormField label="Factura comercial del cliente" htmlFor="client-reporting-invoice">
      <Select id="client-reporting-invoice" value={terms.invoiceRequired} disabled={!termsEditable||saving} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setTerms(current=>({...current,invoiceRequired:event.target.value===''?'':event.target.value==='true'?'true':'false'}))}>
       <option value="">Elegí una opción</option><option value="true">Sí</option><option value="false">No</option>
      </Select>
     </FormField>
     <FormField label="Tipo de comisión" htmlFor="client-reporting-commission-mode">
      <Select id="client-reporting-commission-mode" value={terms.commissionMode} disabled={!termsEditable||saving} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setTerms(current=>({...current,commissionMode:event.target.value==='fixed'?'fixed':event.target.value==='none'?'none':'percentage'}))}>
       {COMMISSION_MODE_CHOICES.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}
      </Select>
     </FormField>
     {terms.commissionMode!=='none'?<FormField label="Destinatario de comisión" htmlFor="client-reporting-commission-recipient">
      <Select id="client-reporting-commission-recipient" value={terms.commissionRecipientId} disabled={!termsEditable||saving} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setTerms(current=>({...current,commissionRecipientId:event.target.value}))}>
       <option value="">Elegí un colaborador</option>
       {termData.collaborators.map(person=><option key={person.id} value={String(person.id)}>{person.full_name}</option>)}
      </Select>
     </FormField>:null}
     {terms.commissionMode!=='none'?<FormField label={terms.commissionMode==='percentage'?'Comisión entera (%)':'Comisión entera'} htmlFor="client-reporting-commission-value">
      {terms.commissionMode==='percentage'
       ?<Input id="client-reporting-commission-value" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3} placeholder="0-100" className="w-24" value={terms.commissionValue} disabled={!termsEditable||saving} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setTerms(current=>({...current,commissionValue:soloDigitos(event.target.value)}))}/>
       :<MoneyInput id="client-reporting-commission-value" currency={terms.currency} className="w-44" value={terms.commissionValue} disabled={!termsEditable||saving} onValueChange={(value: unknown)=>setTerms(current=>({...current,commissionValue:String(value)}))}/>}
     </FormField>:null}
    </>:null}
   </div>
  </>:null}
  {error?<Aviso tono="error" role="alert">{error}</Aviso>:null}
  {notice?<p role="status" className="text-sm font-semibold text-ok">{notice}</p>:null}
  {data&&editable?<div className="flex flex-wrap gap-2">
   <Button type="button" disabled={saving||!dirty} onClick={()=>void save()}>{saving?'Guardando…':'Guardar datos comerciales'}</Button>
  </div>:null}
  {error?<div className="flex flex-wrap gap-2">
   <Button type="button" variant="outline" disabled={saving} onClick={reload}>Recargar ficha (descarta cambios)</Button>
  </div>:null}
 </section>;
}
