'use client';

import {useId,type ReactNode} from 'react';
import {currencyCodes,type Currency} from './currencies';
import './plan-comparison.css';

export type ComparablePlan={id:string;[key:string]:unknown};
type PlanItem={description:string;quantity:number|null;price:number|null;subtotal:number|null};
const amount=(value:unknown)=>typeof value==='number'||typeof value==='string'&&value.trim()!==''?Number(value):NaN;
// Same monetary normalization as backend suite-validation.amount: unit prices,
// each line subtotal, then the aggregate. Never round only the final raw sum.
const roundedAmount=(value:number)=>Number.isFinite(value)&&value>=0&&value<=999999999999?Math.round(value*100)/100:null;
const numberLabel=(value:number)=>value.toLocaleString('es-PY',{maximumFractionDigits:20});
export function planAmount(value:number|null,currency:string){
 return value!==null&&Number.isFinite(value)&&currencyCodes.includes(currency as Currency)?
  new Intl.NumberFormat('es-PY',{style:'currency',currency,maximumFractionDigits:currency==='PYG'?0:2}).format(value):'No disponible';
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

function Deliverables({description}:{description:string}){
 const parts=description.split(';');
 // A semicolon list is presentation only: one priced package remains one item.
 return parts.length>1?<ul className="plan-comparison-deliverables">{parts.map((part,index)=><li key={index}>{part.trim()}{index<parts.length-1?';':''}</li>)}</ul>:<p className="plan-comparison-description">{description}</p>;
}

export function PlanComparison({plans:records,actions}:{plans:ComparablePlan[];actions?:(plan:ComparablePlan)=>ReactNode}){
 const hint=useId(),plans=comparePlans(records);
 if(!plans.length)return null;
 return <div className="plan-comparison">
  <p id={hint} className="form-note">Todos los entregables y precios guardados, sin IVA. El IVA se define en el presupuesto. Cada plan conserva su moneda. Desplazá la tabla horizontalmente para comparar.</p>
  <div className="plan-comparison-scroll" role="region" aria-label="Comparación de planes" aria-describedby={hint} tabIndex={0}>
   <table className="plan-comparison-table" style={{minWidth:`${11+plans.length*17}rem`}}>
    <caption>Planes, precios y entregables incluidos</caption>
    <thead><tr><th scope="col">Comparar</th>{plans.map(({record,currency,items})=><th scope="col" key={record.id}>
     <h3>{String(record.name||'Plan sin nombre')}</h3>
     <span className="plan-comparison-meta">{currencyCodes.includes(currency as Currency)?currency:'Moneda no disponible'} · {items.length} {items.length===1?'ítem':'ítems'}</span>
     {record.active===false&&<span className="plan-comparison-meta">Archivado</span>}
     {actions&&<div className="plan-comparison-actions">{actions(record)}</div>}
    </th>)}</tr></thead>
    <tbody>
     <tr className="plan-comparison-total"><th scope="row">Total de ítems <small>Sin IVA</small></th>{plans.map(plan=><td key={plan.record.id}><strong>{planAmount(plan.total,plan.currency)}</strong>{!plan.items.length&&<small>Sin ítems guardados</small>}</td>)}</tr>
     <tr><th scope="row">Entregables incluidos</th>{plans.map(plan=><td key={plan.record.id}>{plan.items.length?<ol className="plan-comparison-items">{plan.items.map((item,index)=><li key={index} className="plan-comparison-item">
      <Deliverables description={item.description}/>
      <div className="plan-comparison-item-price"><span>Cantidad del ítem: {item.quantity===null?'No disponible':numberLabel(item.quantity)}</span>
      <span>Precio unitario: {planAmount(item.price,plan.currency)}</span>
      <strong>Subtotal: {planAmount(item.subtotal,plan.currency)}</strong></div>
     </li>)}</ol>:<span className="plan-comparison-meta">Sin entregables guardados.</span>}</td>)}</tr>
     <tr><th scope="row">Condiciones y fuente</th>{plans.map(({record})=><td className="plan-comparison-notes" key={record.id}>{String(record.notes||'Sin notas guardadas.')}</td>)}</tr>
    </tbody>
   </table>
  </div>
 </div>;
}
