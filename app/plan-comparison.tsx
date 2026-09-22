'use client';
// Rediseño v2 (campaña #41 / spec #43 §5): comparador de planes con utilidades
// Tailwind y la tabla compartida de la sección (encabezado + plantilla única).
// La normalización de ítems/totales vive en ./plan-comparison-data.
import {useId,type ReactNode} from 'react';
import {currencyCodes,type Currency} from './currencies';
import {comparePlans,planAmount,numberLabel,type ComparablePlan} from './plan-comparison-data';
// La lógica de datos vive en ./plan-comparison-data (funciones puras); se
// reexporta para no romper imports existentes.
export {comparePlans,planAmount,roundedAmount,amount,numberLabel} from './plan-comparison-data';
export type {ComparablePlan,PlanItem} from './plan-comparison-data';

const cell='border-b border-r border-ink-600 px-3 py-3 text-left align-top text-[13px] leading-relaxed [overflow-wrap:anywhere] last:border-r-0';
const head='border-b border-r border-ink-600 bg-ink-900 px-3 py-3 text-left align-top last:border-r-0';
const rowHead=`${cell} sticky left-0 z-[2] w-44 bg-ink-900 font-bold text-fore`;

function Deliverables({description}:{description:string}){
 const parts=description.split(';');
 // A semicolon list is presentation only: one priced package remains one item.
 return parts.length>1?<ul className="list-disc pl-4">{parts.map((part,index)=><li key={index}>{part.trim()}{index<parts.length-1?';':''}</li>)}</ul>:<p className="whitespace-pre-wrap">{description}</p>;
}

export function PlanComparison({plans:records,actions}:{plans:ComparablePlan[];actions?:(plan:ComparablePlan)=>ReactNode}){
 const hint=useId(),plans=comparePlans(records);
 if(!plans.length)return null;
 return <div className="min-w-0 max-w-full text-fore">
  <p id={hint} className="max-w-[76ch] text-xs leading-5 text-mute">Todos los entregables y precios guardados, sin IVA. El IVA se define en el presupuesto. Cada plan conserva su moneda. Desplazá la tabla horizontalmente para comparar.</p>
  <div className="mt-3 max-w-full overflow-x-auto rounded-xl border border-ink-600 bg-ink-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fono/60" role="region" aria-label="Comparación de planes" aria-describedby={hint} tabIndex={0}>
   <table className="w-full table-fixed border-separate border-spacing-0 tabular-nums" style={{minWidth:`${11+plans.length*17}rem`}}>
    <caption className="border-b border-ink-600 bg-ink-900 px-3 py-3 text-left text-xs font-semibold text-mute">Planes, precios y entregables incluidos</caption>
    <thead><tr>
     <th scope="col" className={`${head} sticky left-0 z-[3] w-44`}>Comparar</th>
     {plans.map(({record,currency,items})=><th scope="col" key={record.id} className={`${head} sticky top-0 z-[1]`}>
      <h3 className="whitespace-normal text-sm font-bold leading-snug text-fore">{String(record.name||'Plan sin nombre')}</h3>
      <span className="mt-1 block text-[11px] font-medium leading-4 text-mute">{currencyCodes.includes(currency as Currency)?currency:'Moneda no disponible'} · {items.length} {items.length===1?'ítem':'ítems'}</span>
      {record.active===false&&<span className="mt-1 block text-[11px] font-medium leading-4 text-mute">Archivado</span>}
      {actions&&<div className="mt-2 flex flex-wrap gap-1.5">{actions(record)}</div>}
     </th>)}
    </tr></thead>
    <tbody>
     <tr data-plan-total>
      <th scope="row" className={`${rowHead} border-t-2 border-t-fono/60`}>Total de ítems <small className="mt-1 block text-[11px] font-medium text-mute">Sin IVA</small></th>
      {plans.map(plan=><td key={plan.record.id} className={`${cell} border-t-2 border-t-fono/60 bg-fono/10`}><strong className="text-base font-bold tracking-tight text-fore">{planAmount(plan.total,plan.currency)}</strong>{!plan.items.length&&<small className="mt-1 block text-[11px] font-medium text-mute">Sin ítems guardados</small>}</td>)}
     </tr>
     <tr>
      <th scope="row" className={rowHead}>Entregables incluidos</th>
      {plans.map(plan=><td key={plan.record.id} className={cell}>{plan.items.length?<ol className="grid gap-2">{plan.items.map((item,index)=><li key={index} data-plan-item className="grid gap-2 border-b border-ink-600/60 pb-2 text-xs leading-relaxed last:border-0 last:pb-0">
       <Deliverables description={item.description}/>
       <div data-plan-item-price className="grid gap-0.5 rounded-lg border border-ink-600 bg-ink-900 p-2 text-[11px] text-mute">
        <span className="whitespace-nowrap">Cantidad del ítem: {item.quantity===null?'No disponible':numberLabel(item.quantity)}</span>
        <span className="whitespace-nowrap">Precio unitario: {planAmount(item.price,plan.currency)}</span>
        <strong className="whitespace-nowrap text-xs text-fore">Subtotal: {planAmount(item.subtotal,plan.currency)}</strong>
       </div>
      </li>)}</ol>:<span className="text-[11px] font-medium text-mute">Sin entregables guardados.</span>}</td>)}
     </tr>
     <tr>
      <th scope="row" className={rowHead}>Condiciones y fuente</th>
      {plans.map(({record})=><td className={`${cell} whitespace-pre-wrap text-xs leading-relaxed text-mute`} key={record.id}>{String(record.notes||'Sin notas guardadas.')}</td>)}
     </tr>
    </tbody>
   </table>
  </div>
 </div>;
}
