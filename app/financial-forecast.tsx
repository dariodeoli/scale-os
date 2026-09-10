"use client";
import {useEffect,useState} from 'react';
import {dataFetch} from './data-cache';
import {feedbackEvent} from './feedback';
import './financial-forecast.css';

export type ForecastRow={currency:string;issued_total:string;accepted_uninvoiced_total:string;expected_total:string;invoice_count:number;budget_count:number;undated_budget_count:number};
export type ForecastData={month:string;time_zone:string;records:ForecastRow[];definition:{issued:string;accepted_uninvoiced:string;exclusions:string}};
const amount=(value:string,currency:string)=>new Intl.NumberFormat('es-PY',{style:'currency',currency,maximumFractionDigits:currency==='PYG'?0:2}).format(Number(value));
export function currentForecastMonth(now=new Date()) {
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit'}).formatToParts(now);
 return `${parts.find(p=>p.type==='year')!.value}-${parts.find(p=>p.type==='month')!.value}`;
}

export function FinancialForecast({role,organizationId}:{role:string;organizationId:string|number}) {
 const allowed=['owner','admin','finance'].includes(role);
 return allowed?<ForecastPanel key={String(organizationId)}/>:null;
}

function ForecastPanel() {
 const [month,setMonth]=useState(()=>currentForecastMonth()),[data,setData]=useState<ForecastData|null>(null),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{
  const update=()=>setRefresh(value=>value+1);
  window.addEventListener(feedbackEvent,update);
  return ()=>window.removeEventListener(feedbackEvent,update);
 },[]);
 useEffect(()=>{
  let active=true;
  setData(null);setError('');
  void dataFetch(`/core-api/api/agency/forecast?month=${encodeURIComponent(month)}`,{credentials:'include'}).then(async response=>{
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||'No se pudo cargar la previsión');
   if(active)setData(result as ForecastData);
  }).catch(error=>{if(active)setError(error instanceof Error?error.message:'No se pudo cargar la previsión');});
  return ()=>{active=false;};
 },[month,refresh]);
 const undated=data?.records.reduce((sum,row)=>sum+row.undated_budget_count,0)||0;
 return <section className="panel financial-forecast" aria-label="Facturación esperada">
  <div className="panel-heading"><h2>Facturación esperada</h2><label>Mes<input type="month" value={month} min="1900-01" max="9998-12" onChange={event=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value))setMonth(event.target.value);}}/></label></div>
  <p className="form-note">Emitido + aceptado sin factura. Estimación por mes de aceptación; no es una previsión de cobros.</p>
  {error?<p className="error" role="alert">{error} <button type="button" className="text-button" onClick={()=>setRefresh(value=>value+1)}>Reintentar</button></p>:!data?<p role="status">Cargando previsión…</p>:data.records.length?<div className="forecast-currencies">{data.records.map(row=><article className="forecast-currency" key={row.currency}>
   <span>{row.currency} · total esperado</span><strong>{amount(row.expected_total,row.currency)}</strong>
   <dl><div><dt>Emitido ({row.invoice_count})</dt><dd>{amount(row.issued_total,row.currency)}</dd></div><div><dt>Aceptado sin factura ({row.budget_count})</dt><dd>{amount(row.accepted_uninvoiced_total,row.currency)}</dd></div></dl>
  </article>)}</div>:<p className="empty-copy">Sin facturas emitidas ni presupuestos aceptados pendientes para este mes.</p>}
  {undated>0?<p role="status">{undated} presupuesto(s) aceptado(s) sin fecha: excluidos del total mensual.</p>:null}
  {data?<details><summary>Cómo se calcula</summary><p>{data.definition.issued}</p><p>{data.definition.accepted_uninvoiced}</p><p>{data.definition.exclusions}</p><p>Zona horaria: {data.time_zone}. No se suman monedas distintas.</p></details>:null}
 </section>;
}
