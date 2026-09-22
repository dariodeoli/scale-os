'use client';

import {useId,type ReactNode} from 'react';
import {currencyCodes,type Currency} from './currencies';
import {comparePlans,planAmount,numberLabel,type ComparablePlan} from './plan-comparison-data';
import './plan-comparison.css';
// La lógica de datos vive en ./plan-comparison-data (funciones puras); se
// reexporta para no romper imports existentes.
export {comparePlans,planAmount,roundedAmount,amount,numberLabel} from './plan-comparison-data';
export type {ComparablePlan,PlanItem} from './plan-comparison-data';

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
