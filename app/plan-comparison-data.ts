// Capa de datos del comparador de planes (SOS-COM, campaña #41 / spec #43 §5).
// Normaliza ítems y totales con la misma regla monetaria que el API
// (suite-validation.amount): precio unitario, subtotal de línea y agregado.
// Campos reales de `agency_plans`: id,name,currency,items,notes,active,created_at.
// Los ítems guardan `unitPrice` (se acepta el legado `unit_price`).
import {currencyCodes,type Currency} from './currencies';
import {money} from './operations';

export type ComparablePlanItem={description?:string;quantity?:string|number;unitPrice?:string|number;unit_price?:string|number};

export type ComparablePlan={
 id:string;
 name?:string;
 currency?:string;
 items?:(ComparablePlanItem|null)[]|null;
 notes?:string|null;
 active?:boolean;
 created_at?:string|null;
 [key:string]:unknown;
};

export type PlanItem={description:string;quantity:number|null;price:number|null;subtotal:number|null};

export const amount=(value:unknown)=>typeof value==='number'||typeof value==='string'&&value.trim()!==''?Number(value):NaN;
// Same monetary normalization as backend suite-validation.amount: unit prices,
// each line subtotal, then the aggregate. Never round only the final raw sum.
export const roundedAmount=(value:number)=>Number.isFinite(value)&&value>=0&&value<=999999999999?Math.round(value*100)/100:null;
export const numberLabel=(value:number)=>value.toLocaleString('es-PY',{maximumFractionDigits:20});
export function planAmount(value:number|null,currency:string){
 return value!==null&&Number.isFinite(value)&&currencyCodes.includes(currency as Currency)?money(value,currency):'No disponible';
}

// Preserve the unified checkout's legacy field support, zero prices and invalid
// data handling. Plans persist item prices, not the budget's chosen tax rate.
export function comparePlans(records:ComparablePlan[]){
 return records.map(record=>{
  const currency=String(record.currency??'');
  const source=Array.isArray(record.items)?record.items:[];
  const items:PlanItem[]=source.map(raw=>{
   const item=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
   const description=String(item.description??'').trim();
   const q=amount(item.quantity),p=amount(item.unitPrice??item.unit_price);
   const quantity=Number.isFinite(q)&&q>0?q:null,price=roundedAmount(p);
   const product=quantity!==null&&price!==null?quantity*price:NaN;
   const subtotal=roundedAmount(product);
   return {description:description||'Ítem sin descripción',quantity,price,subtotal};
  });
  const sum=items.reduce((total,item)=>total+(item.subtotal??0),0);
  const total=items.length&&items.every(item=>item.subtotal!==null)?roundedAmount(sum):null;
  return {record,currency,items,total};
 });
}
