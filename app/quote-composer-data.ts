// Capa de datos del compositor de presupuestos/planes (SOS-COM, spec #43 §4-5).
// Esquemas, normalización de ítems, totales y request por modo, todo puro.
// El contrato real del API: POST/PATCH /api/agency/budgets (title, clientId,
// currency, tax_rate, notes, valid_until, sections, items) y /api/agency/plans
// (name, currency, notes, items).
import {z} from 'zod';
import {currencyCodes} from './currencies';

export type QuoteMode='create'|'budget'|'plan';

export const sectionSchema=z.object({type:z.enum(['meta','items','totals','notes','text']),title:z.string().max(120),body:z.string().max(5000),enabled:z.boolean()});
export const quoteSchema=z.object({title:z.string().min(2).max(120),clientId:z.string(),currency:z.enum(currencyCodes),tax_rate:z.string(),notes:z.string().max(2000),valid_until:z.string(),sections:z.array(sectionSchema).min(2).max(24),items:z.array(z.object({description:z.string().min(2),quantity:z.string().trim().min(1,'Cantidad inválida').refine(value=>Number(value.replace(',','.'))>0,'Cantidad inválida'),unitPrice:z.string().refine(v=>v!==''&&Number.isFinite(Number(v))&&Number(v)>=0,'Importe inválido')})).min(1).max(100)});
export type QuoteSection=z.infer<typeof sectionSchema>;
export type QuoteValues=z.infer<typeof quoteSchema>;
export type QuoteItemDraft={description:string;quantity:string;unitPrice:string};

/** Campos reales que el compositor usa del API para elegir cliente/plan. */
export type QuoteClientOption={id:string|number;name:string};
export type QuotePlanRecord={id:string|number;name:string;currency:string;items?:QuoteItemDraft[]|null;notes?:string|null;active?:boolean};

export const SECTION_TYPE_LABELS:Record<QuoteSection['type'],string>={meta:'Cliente y vigencia',items:'Detalle de ítems',totals:'Totales',notes:'Condiciones',text:'Texto personalizado'};
export const TAX_RATE_CHOICES=[{value:'0',label:'0%'},{value:'0.05',label:'5%'},{value:'0.1',label:'10%'}];

export function initialQuoteSections():QuoteSection[]{return ['meta','items','totals','notes'].map(type=>({type:type as QuoteSection['type'],title:'',body:'',enabled:true}));}

export function normalizeQuoteItems(value:unknown):QuoteItemDraft[]{
 return Array.isArray(value)?value.map(raw=>{const item=raw as Record<string,unknown>;return {description:String(item.description||''),quantity:String(item.quantity??1),unitPrice:String(item.unitPrice??item.unit_price??'0')};}):[{description:'',quantity:'1',unitPrice:'0'}];
}

/** Subtotal sin IVA y total con IVA (mismo redondeo que el resto del dominio). */
export function quoteTotals(items:readonly QuoteItemDraft[],taxRate:string|number){
 const subtotal=items.reduce((sum,item)=>sum+(Number(item.quantity)||0)*(Number(item.unitPrice)||0),0);
 const rate=Number(taxRate)||0;
 return {subtotal,total:subtotal*(1+rate)};
}

export type QuoteRequest={path:string;method:'POST'|'PATCH';body:unknown};

/** Request exacto por modo; el componente solo lo ejecuta y maneja errores. */
export function quoteRequest(mode:QuoteMode,recordId:string|null|undefined,values:QuoteValues):QuoteRequest{
 if(mode==='plan')return {path:`/api/agency/plans${recordId?`/${recordId}`:''}`,method:recordId?'PATCH':'POST',body:{name:values.title,currency:values.currency,notes:values.notes,items:values.items}};
 if(mode==='create')return {path:'/api/agency/budgets',method:'POST',body:{...values,validUntil:values.valid_until}};
 return {path:`/api/agency/budgets/${recordId}`,method:'PATCH',body:values};
}
