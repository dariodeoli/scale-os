'use client';
// Capa de datos de la ficha de reportes/términos comerciales (SOS-COM, spec #43 §1.4).
// Funciones puras + hook de fetch/estado; el componente queda como vista.
import {useEffect,useRef,useState} from 'react';
import {api} from './operations';
import {currencyCodes,type Currency} from './currencies';
import {todayAsuncion} from './client-format';

export type CustomerKind='unknown'|'company'|'professional'|'individual'|'other';
// Los términos comerciales usan las mismas seis monedas que el resto del API.
export type MoneyCurrency=Currency;
export type SafeWhole=string|number;
export type CommissionMode='none'|'percentage'|'fixed';
export type ClientReportingRecord={clientId:string;customerKind:CustomerKind;servicePlanId:string|null;relationshipStartedOn:string|null;version:string;updatedAt:string;archived:boolean};
export type CommercialTerms={clientId:string;planId:string;planName:string;recurringAmount:SafeWhole;currency:MoneyCurrency;startsOn:string;endsOn:string|null;invoiceRequired:boolean;commissionRecipientId:string|null;commissionRecipientName:string|null;commissionMode:CommissionMode;commissionValue:SafeWhole|null;updatedAt:string};
export type ReportingResponse={reporting:ClientReportingRecord;plans:{id:string;name:string}[]};
export type TermsResponse={clientId:string;archived:boolean;terms:CommercialTerms|null;plans:{id:string;name:string;currency:MoneyCurrency}[];collaborators:{id:string;full_name:string}[]};
export type ReportingDraft={customerKind:CustomerKind;servicePlanId:string;relationshipStartedOn:string};
export type TermsDraft={planId:string;recurringAmount:string;currency:MoneyCurrency;startsOn:string;endsOn:string;invoiceRequired:''|'true'|'false';commissionRecipientId:string;commissionMode:CommissionMode;commissionValue:string};

export const CUSTOMER_KINDS:Record<CustomerKind,string>={unknown:'Sin clasificar',company:'Empresa',professional:'Profesional',individual:'Persona particular',other:'Otro'};
export const CUSTOMER_KIND_CHOICES=(Object.keys(CUSTOMER_KINDS) as CustomerKind[]).map(kind=>({value:kind,label:CUSTOMER_KINDS[kind]}));
export const COMMISSION_MODE_CHOICES:{value:CommissionMode;label:string}[]=[{value:'none',label:'Sin comisión'},{value:'percentage',label:'Porcentaje'},{value:'fixed',label:'Importe fijo'}];
export const RELATIONSHIP_MIN_DATE='1900-01-01';

export const isCurrency=(value:unknown):value is MoneyCurrency=>typeof value==='string'&&currencyCodes.includes(value as Currency);
export const isWholeTransport=(value:unknown,allowZero=true):value is SafeWhole=>typeof value==='number'?Number.isSafeInteger(value)&&(allowZero?value>=0:value>0):typeof value==='string'&&new RegExp(allowZero?'^(?:0|[1-9]\\d*)$':'^[1-9]\\d*$').test(value)&&Number.isSafeInteger(Number(value));
export const isPositiveInput=(value:string)=>isWholeTransport(value,false);
export const isDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;

export function validTerms(value:unknown):value is CommercialTerms{return !!value&&typeof value==='object'&&typeof (value as CommercialTerms).clientId==='string'&&typeof (value as CommercialTerms).planId==='string'&&typeof (value as CommercialTerms).planName==='string'&&isWholeTransport((value as CommercialTerms).recurringAmount,false)&&isCurrency((value as CommercialTerms).currency)&&typeof (value as CommercialTerms).startsOn==='string'&&(typeof (value as CommercialTerms).endsOn==='string'||(value as CommercialTerms).endsOn===null)&&typeof (value as CommercialTerms).invoiceRequired==='boolean'&&['percentage','fixed','none'].includes((value as CommercialTerms).commissionMode)&&((value as CommercialTerms).commissionMode==='none'?(value as CommercialTerms).commissionRecipientId===null&&(value as CommercialTerms).commissionRecipientName===null&&(value as CommercialTerms).commissionValue===null:typeof (value as CommercialTerms).commissionRecipientId==='string'&&typeof (value as CommercialTerms).commissionRecipientName==='string'&&isWholeTransport((value as CommercialTerms).commissionValue,false));}
export function validTermsResponse(value:unknown,id:string):value is TermsResponse{return !!value&&typeof value==='object'&&(value as TermsResponse).clientId===id&&typeof (value as TermsResponse).archived==='boolean'&&((value as TermsResponse).terms===null||validTerms((value as TermsResponse).terms))&&Array.isArray((value as TermsResponse).plans)&&Array.isArray((value as TermsResponse).collaborators);}

export function termsDraft(terms:CommercialTerms|null,reporting:ClientReportingRecord):TermsDraft{return terms?{planId:terms.planId,recurringAmount:String(terms.recurringAmount),currency:terms.currency,startsOn:terms.startsOn,endsOn:terms.endsOn||'',invoiceRequired:String(terms.invoiceRequired) as 'true'|'false',commissionRecipientId:terms.commissionRecipientId||'',commissionMode:terms.commissionMode,commissionValue:terms.commissionValue===null?'':String(terms.commissionValue)}:{planId:reporting.servicePlanId||'',recurringAmount:'',currency:'PYG',startsOn:reporting.relationshipStartedOn||'',endsOn:'',invoiceRequired:'',commissionRecipientId:'',commissionMode:'none',commissionValue:''};}
export function sameTerms(draft:TermsDraft,terms:CommercialTerms|null,reporting:ClientReportingRecord){const initial=termsDraft(terms,reporting);return (Object.keys(initial) as (keyof TermsDraft)[]).every(key=>draft[key]===initial[key]);}
export function completeTerms(draft:TermsDraft){return {planId:draft.planId,recurringAmount:draft.recurringAmount,currency:draft.currency,startsOn:draft.startsOn,endsOn:draft.endsOn||null,invoiceRequired:draft.invoiceRequired==='true',commissionRecipientId:draft.commissionMode==='none'?null:draft.commissionRecipientId,commissionMode:draft.commissionMode,commissionValue:draft.commissionMode==='none'?null:draft.commissionValue};}

/** Solo los campos de reportes que cambiaron respecto del registro. */
export function reportingChanges(draft:ReportingDraft,record:ClientReportingRecord):Record<string,unknown>{
 const changes:Record<string,unknown>={};
 if(draft.customerKind!==record.customerKind)changes.customerKind=draft.customerKind;
 if((draft.servicePlanId||null)!==record.servicePlanId)changes.servicePlanId=draft.servicePlanId||null;
 if((draft.relationshipStartedOn||null)!==record.relationshipStartedOn)changes.relationshipStartedOn=draft.relationshipStartedOn||null;
 return changes;
}

/** Mensaje de error de la fecha de inicio, o null si es válida/opcional. */
export function validateRelationshipDate(value:string,maximum=todayAsuncion()):string|null{
 if(!value)return null;
 if(!isDate(value)||value<RELATIONSHIP_MIN_DATE||value>maximum)return 'Ingresá una fecha real válida, no futura, o dejá el campo vacío.';
 return null;
}

/** Mensaje de error del borrador de términos, o null si está completo. */
export function validateTermsDraft(terms:TermsDraft):string|null{
 const valid=/^[1-9]\d{0,18}$/.test(terms.planId)&&isPositiveInput(terms.recurringAmount)&&isDate(terms.startsOn)&&(!terms.endsOn||(isDate(terms.endsOn)&&terms.endsOn>=terms.startsOn))&&terms.invoiceRequired!==''&&(terms.commissionMode==='none'||(/^[1-9]\d{0,18}$/.test(terms.commissionRecipientId)&&isPositiveInput(terms.commissionValue)&&(terms.commissionMode!=='percentage'||Number(terms.commissionValue)<=100)));
 return valid?null:'Completá plan, monto, inicio y factura con importes enteros positivos; si definís comisión, elegí destinatario y un valor de hasta 100%.';
}

type HookOptions={id:string;financial:boolean;writable:boolean;onSaved?:()=>void|Promise<void>};
/** Fetch/estado de reportes + términos comerciales; el componente solo pinta. */
export function useClientReportingData({id,financial,writable,onSaved}:HookOptions){
 const [data,setData]=useState<ReportingResponse|null>(null),[termData,setTermData]=useState<TermsResponse|null>(null),[draft,setDraft]=useState<ReportingDraft>({customerKind:'unknown',servicePlanId:'',relationshipStartedOn:''}),[terms,setTerms]=useState<TermsDraft>({planId:'',recurringAmount:'',currency:'PYG',startsOn:'',endsOn:'',invoiceRequired:'',commissionRecipientId:'',commissionMode:'none',commissionValue:''});
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[retry,setRetry]=useState(0),[saving,setSaving]=useState(false);
 const locked=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 function apply(reporting:ClientReportingRecord,responseTerms:TermsResponse|null){setDraft({customerKind:reporting.customerKind,servicePlanId:reporting.servicePlanId||'',relationshipStartedOn:reporting.relationshipStartedOn||''});setTerms(termsDraft(responseTerms?.terms||null,reporting));}
 useEffect(()=>{let alive=true;setData(null);setTermData(null);setError('');setNotice('');void Promise.all([api<ReportingResponse>(`/api/agency/clients/${id}/reporting`),financial?api<TermsResponse>(`/api/agency/clients/${id}/commercial-terms`):Promise.resolve(null)]).then(([reporting,commercial])=>{if(!reporting?.reporting||reporting.reporting.clientId!==id||typeof reporting.reporting.version!=='string'||!Array.isArray(reporting.plans)||financial&&!validTermsResponse(commercial,id))throw Error('No se pudo validar la ficha de reportes del cliente.');if(alive){setData(reporting);setTermData(commercial);apply(reporting.reporting,commercial);}}).catch(e=>{if(alive)setError(e instanceof Error?e.message:'No se pudo cargar la ficha.');});return()=>{alive=false;};},[id,retry,financial]);
 const record=data?.reporting,commercial=termData?.terms;
 const changes:Record<string,unknown>=record?reportingChanges(draft,record):{};
 const termsDirty=financial&&!!record&&!!termData&&!sameTerms(terms,commercial||null,record),dirty=Object.keys(changes).length>0||termsDirty,editable=writable&&!record?.archived,termsEditable=financial&&writable&&!record?.archived;
 async function save(){
  if(!record||!editable||!dirty||locked.current)return;
  const dateError=validateRelationshipDate(draft.relationshipStartedOn);
  if(dateError){setError(dateError);return;}
  if(termsDirty){const termsError=validateTermsDraft(terms);if(termsError){setError(termsError);return;}}
  locked.current=true;setSaving(true);setError('');setNotice('');
  try {let nextReporting=data,nextTerms=termData;if(Object.keys(changes).length){nextReporting=await api<ReportingResponse>(`/api/agency/clients/${id}/reporting`,{expectedVersion:record.version,...changes},'PATCH');if(!nextReporting?.reporting||nextReporting.reporting.clientId!==id||typeof nextReporting.reporting.version!=='string'||!Array.isArray(nextReporting.plans))throw Error('No se pudo verificar el guardado de reportes.');}if(termsDirty){nextTerms=await api<TermsResponse>(`/api/agency/clients/${id}/commercial-terms`,completeTerms(terms),'PATCH');if(!validTermsResponse(nextTerms,id)||!nextTerms.terms)throw Error('No se pudo verificar el guardado de términos.');}if(!mounted.current)return;setData(nextReporting);setTermData(nextTerms);apply(nextReporting.reporting,nextTerms);setNotice('Datos para reportes guardados.');if(onSaved)try{await onSaved();}catch{if(mounted.current)setError('Los datos se guardaron, pero no se pudo actualizar la vista. Recargá la ficha.');}}
  catch(e){if(mounted.current)setError(e instanceof Error?e.message:'No se pudo guardar. Recargá la ficha si cambió su versión.');}finally{locked.current=false;if(mounted.current)setSaving(false);}
 }
 return {data,termData,record,commercial,draft,setDraft,terms,setTerms,error,notice,saving,dirty,editable,termsEditable,reload:()=>setRetry(value=>value+1),save};
}
