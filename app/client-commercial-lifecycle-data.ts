'use client';
// Capa de datos del ciclo comercial (SOS-COM, spec #43 §1.4): validaciones,
// payload de enmienda y hook de fetch/estado. El contrato del API exige
// precio > 0, descuentos coherentes y fechas no futuras (America/Asuncion).
import {useEffect,useRef,useState} from 'react';
import {api,money} from './operations';
import {currencyChoices} from './currencies';
import {todayAsuncion} from './client-format';

export type DiscountType='none'|'percent'|'fixed';
export type CommercialAmendment={id:string;effectiveOn:string;activationDate:string|null;planName:string;planVersionSnapshot:string;monthlyPrice:string;currency:string;discountType:DiscountType;discountValue:string|null;discountTerms:string|null;extrasDeliverables:string|null;createdAt:string};
export type ClientCommercialLifecycleRecord={clientId:string;version:string;archived:boolean;amendments:CommercialAmendment[]};
export type CommercialLifecycleResponse={commercial:ClientCommercialLifecycleRecord};
export type CommercialAmendmentDraft={effectiveOn:string;activationDate:string;planName:string;planVersionSnapshot:string;monthlyPrice:string;currency:string;discountType:DiscountType;discountValue:string;discountTerms:string;extrasDeliverables:string};

export const DISCOUNT_LABELS:Record<DiscountType,string>={none:'Sin descuento',percent:'Porcentaje',fixed:'Importe fijo'};
export const DISCOUNT_TYPE_CHOICES=(Object.keys(DISCOUNT_LABELS) as DiscountType[]).map(type=>({value:type,label:DISCOUNT_LABELS[type]}));
export const COMMERCIAL_CURRENCIES:readonly string[]=currencyChoices.map(currency=>currency.value);
export const AMENDMENT_MIN_DATE='1900-01-01';

export const validClientId=(id:string|number)=>/^[1-9]\d{0,18}$/.test(String(id))&&!(typeof id==='number'&&!Number.isSafeInteger(id));

/** Fecha real (YYYY-MM-DD), dentro de rango y no futura según Asunción. */
export function validPastDate(value:string,maximum=todayAsuncion()):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<AMENDMENT_MIN_DATE||value>maximum)return false;
 const date=new Date(`${value}T12:00:00Z`);
 return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
}

export function freshAmendmentDraft(today=todayAsuncion()):CommercialAmendmentDraft{return{effectiveOn:today,activationDate:'',planName:'',planVersionSnapshot:'',monthlyPrice:'',currency:'PYG',discountType:'none',discountValue:'',discountTerms:'',extrasDeliverables:''};}

export function amendmentLabel(amendment:CommercialAmendment){
 if(amendment.discountType==='none')return 'Sin descuento';
 const value=amendment.discountType==='percent'?`${amendment.discountValue||'0'}%`:money(amendment.discountValue||'0',amendment.currency);
 return `${DISCOUNT_LABELS[amendment.discountType]} · ${value}`;
}

/** Mensaje de error del borrador de enmienda, o null si es válido. */
export function validateAmendmentDraft(draft:CommercialAmendmentDraft,maximum=todayAsuncion()):string|null{
 if(!validPastDate(draft.effectiveOn,maximum)||draft.activationDate&&!validPastDate(draft.activationDate,maximum))return 'Ingresá fechas reales válidas, no futuras.';
 if(!draft.planName.trim()||!draft.planVersionSnapshot.trim())return 'Indicá el nombre y la versión del plan contratados.';
 const price=Number(draft.monthlyPrice);
 if(!Number.isFinite(price)||price<=0)return 'El precio mensual debe ser mayor a cero.';
 if(!COMMERCIAL_CURRENCIES.includes(draft.currency))return 'Elegí una moneda válida.';
 const discount=Number(draft.discountValue);
 if(draft.discountType!=='none'&&(!Number.isFinite(discount)||discount<=0||(draft.discountType==='percent'&&discount>100)))return draft.discountType==='percent'?'El descuento porcentual debe ser mayor a 0 y hasta 100.':'Ingresá un descuento válido mayor a 0.';
 return null;
}

/** Cuerpo real del POST de enmienda (sin expectedVersion, que lo agrega el hook). */
export function amendmentPayload(draft:CommercialAmendmentDraft){
 return {effectiveOn:draft.effectiveOn,activationDate:draft.activationDate||null,planName:draft.planName.trim(),planVersionSnapshot:draft.planVersionSnapshot.trim(),monthlyPrice:draft.monthlyPrice,currency:draft.currency,discountType:draft.discountType,discountValue:draft.discountType==='none'?null:draft.discountValue,discountTerms:draft.discountTerms.trim()||null,extrasDeliverables:draft.extrasDeliverables.trim()||null};
}

export function validLifecycleResponse(result:unknown,id:string):result is CommercialLifecycleResponse{
 const commercial=(result as CommercialLifecycleResponse|null)?.commercial;
 return !!commercial&&commercial.clientId===id&&typeof commercial.version==='string'&&Array.isArray(commercial.amendments);
}

type HookOptions={id:string;writable:boolean;onSaved?:()=>void|Promise<void>};
/** Fetch/estado del ciclo comercial; el componente solo pinta. */
export function useCommercialLifecycleData({id,writable,onSaved}:HookOptions){
 const [data,setData]=useState<CommercialLifecycleResponse|null>(null),[draft,setDraft]=useState<CommercialAmendmentDraft>(freshAmendmentDraft),[adding,setAdding]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[retry,setRetry]=useState(0),[saving,setSaving]=useState(false);
 const locked=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{let alive=true;setData(null);setError('');setNotice('');setAdding(false);void api<CommercialLifecycleResponse>(`/api/agency/clients/${id}/commercial-lifecycle`).then(result=>{
  if(!validLifecycleResponse(result,id))throw Error('No se pudo validar la ficha comercial del cliente.');
  if(alive)setData(result);
 }).catch(reason=>{if(alive)setError(reason instanceof Error?reason.message:'No se pudo cargar la ficha comercial.');});return()=>{alive=false;};},[id,retry]);
 const record=data?.commercial,editable=writable&&!record?.archived;
 function resetDraft(){setDraft(freshAmendmentDraft());setError('');setNotice('');}
 function update<K extends keyof CommercialAmendmentDraft>(key:K,value:CommercialAmendmentDraft[K]){setDraft(current=>({...current,[key]:value}));}
 async function save(event:React.FormEvent){event.preventDefault();if(!record||!editable||saving||locked.current)return;
  const validation=validateAmendmentDraft(draft);
  if(validation){setError(validation);return;}
  locked.current=true;setSaving(true);setError('');setNotice('');
  try{const result=await api<CommercialLifecycleResponse>(`/api/agency/clients/${id}/commercial-lifecycle/amendments`,{expectedVersion:record.version,...amendmentPayload(draft)});
   if(!mounted.current)return;
   if(!validLifecycleResponse(result,id))throw Error('No se pudo verificar la enmienda guardada. Recargá la ficha antes de volver a editar.');
   setData(result);setAdding(false);resetDraft();setNotice('Enmienda comercial registrada. El historial previo no se modifica.');
   if(onSaved)try{await onSaved();}catch{if(mounted.current)setError('La enmienda se guardó, pero no se pudo actualizar la vista. Recargala.');}
  }catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:'No se pudo registrar la enmienda. Recargá la ficha si otra persona la actualizó.');}
  finally{locked.current=false;if(mounted.current)setSaving(false);}
 }
 return {data,record,editable,adding,setAdding,draft,update,error,notice,saving,resetDraft,reload:()=>setRetry(value=>value+1),save};
}
