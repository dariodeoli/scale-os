'use client';
import {useEffect,useState} from 'react';
import {api} from './operations';
import {AmountInput} from './profile-controls';

type MoneyCurrency='PYG'|'USD';
type Terms={planId:string;planName:string;recurringAmount:string|number;currency:MoneyCurrency;startsOn:string;endsOn:string|null;cadence:'monthly'|'interval'|'once';intervalMonths:number;invoiceRequired:boolean;commissionRecipientId:string|null;commissionRecipientName:string|null;commissionMode:'none'|'percentage'|'fixed';commissionValue:string|number|null;updatedAt:string};
type TermsResponse={clientId:string;archived:boolean;terms:Terms|null;plans:{id:string;name:string;currency:MoneyCurrency}[];collaborators:{id:string;full_name:string}[]};
const isDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T12:00:00Z`))&&new Date(`${value}T12:00:00Z`).toISOString().slice(0,10)===value;

export function ClientPlanTerms({id,role,refresh}:{id:string;role:string;refresh:()=>void|Promise<void>}){
 const allowed=['owner','admin'].includes(role);
 const [data,setData]=useState<TermsResponse|null>(null),[loadError,setLoadError]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [planId,setPlanId]=useState(''),[amount,setAmount]=useState(''),[currency,setCurrency]=useState<MoneyCurrency>('PYG'),[cadence,setCadence]=useState<'monthly'|'interval'|'once'>('monthly'),[intervalMonths,setIntervalMonths]=useState('1'),[startsOn,setStartsOn]=useState(''),[endsOn,setEndsOn]=useState(''),[invoiceRequired,setInvoiceRequired]=useState('true');
 useEffect(()=>{if(!allowed)return;let alive=true;setLoadError('');setNotice('');void api<TermsResponse>(`/api/agency/clients/${id}/commercial-terms`).then(value=>{if(!alive)return;setData(value);const terms=value.terms;setPlanId(terms?.planId||'');setAmount(terms?String(terms.recurringAmount):'');setCurrency(terms?.currency||'PYG');setStartsOn(terms?.startsOn||'');setEndsOn(terms?.endsOn||'');setCadence(terms?.cadence||'monthly');setIntervalMonths(String(terms?.intervalMonths||1));setInvoiceRequired(terms?String(terms.invoiceRequired):'true');}).catch(cause=>{if(alive)setLoadError(cause instanceof Error?cause.message:'No se pudo cargar el plan y pago del cliente.');});return()=>{alive=false;};},[id,allowed]);
 if(!allowed)return null;
 async function save(event:React.FormEvent){event.preventDefault();if(busy||!data)return;setBusy(true);setError('');setNotice('');
  try{
   if(planId!==''&&!/^[1-9]\d{0,18}$/.test(planId))throw Error('Elegí un plan de la lista.');
   if(!/^[1-9]\d*$/.test(amount))throw Error('Ingresá un importe mensual entero positivo.');
   if(!isDate(startsOn))throw Error('Completá la fecha real de inicio comercial.');
   const interval=cadence==='interval'?Number(intervalMonths||1):1;
   if(!Number.isInteger(interval)||interval<1||interval>24)throw Error('El intervalo debe ser entre 1 y 24 meses.');
   if(endsOn&&(!isDate(endsOn)||endsOn<startsOn))throw Error('La fecha de fin debe ser válida y posterior al inicio.');
   const terms=data.terms;
   const payload={planId,recurringAmount:amount,currency,startsOn,endsOn:endsOn||null,cadence,intervalMonths:interval,invoiceRequired:invoiceRequired==='true',commissionRecipientId:terms?.commissionMode==='none'?null:terms?.commissionRecipientId||null,commissionMode:terms?.commissionMode||'none',commissionValue:terms?.commissionMode==='none'?null:terms?.commissionValue??null};
   await api(`/api/agency/clients/${id}/commercial-terms`,payload,'PATCH');
   const updated=await api<TermsResponse>(`/api/agency/clients/${id}/commercial-terms`);
   const next=updated.terms;setData(updated);setPlanId(next?.planId||'');setAmount(next?String(next.recurringAmount):'');setCurrency(next?.currency||'PYG');setCadence(next?.cadence||'monthly');setIntervalMonths(String(next?.intervalMonths||1));setStartsOn(next?.startsOn||'');setEndsOn(next?.endsOn||'');setInvoiceRequired(next?String(next.invoiceRequired):'true');
   setNotice('Plan y pago guardados.');
   if(refresh)try{await refresh();}catch{}
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo guardar el plan y pago.');}finally{setBusy(false);}
 }
 if(loadError)return <p className="error" role="alert">{loadError}</p>;
 if(!data)return <p role="status">Cargando plan y pago…</p>;
 if(data.archived)return <p className="form-note">El cliente está archivado. El plan y pago queda en solo lectura.</p>;
 return <details className="ops-profile-section ops-wide" open>
  <summary>Plan y pago</summary>
  <form className="form-stack ops-form-grid" noValidate aria-busy={busy} onSubmit={save}>
   <label>Plan<select value={planId} disabled={busy} onChange={event=>setPlanId(event.target.value)}><option value="">Plan personalizado (precio manual)</option>{data.plans.map(plan=><option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
   <label>Cuánto paga por mes<AmountInput integerOnly value={amount} currency={currency} disabled={busy} onChange={setAmount}/><small className="field-help">Solo administración y finanzas pueden ver este importe.</small></label>
   <label>Moneda<select value={currency} disabled={busy} onChange={event=>setCurrency(event.target.value as MoneyCurrency)}><option value="PYG">PYG · Guaraníes</option><option value="USD">USD · Dólares</option></select></label>
   <label>Frecuencia de cobro<select value={cadence} disabled={busy} onChange={event=>setCadence(event.target.value as 'monthly'|'interval'|'once')}><option value="monthly">Fijo mensual</option><option value="interval">Cada varios meses</option><option value="once">Única vez (no recurrente)</option></select><small className="field-help">Solo el fijo mensual se proyecta en la previsión financiera.</small></label>{cadence==='interval'?<label>Cada cuántos meses<select value={intervalMonths} disabled={busy} onChange={event=>setIntervalMonths(event.target.value)}>{[2,3,4,6,12].map(n=><option key={n} value={n}>{n} meses</option>)}</select></label>:null}<label>Inicio comercial<input type="date" value={startsOn} disabled={busy} onChange={event=>setStartsOn(event.target.value)}/></label>
   <label>Fin del plan · Opcional<input type="date" value={endsOn} disabled={busy} onChange={event=>setEndsOn(event.target.value)}/></label>
   <label>Factura comercial del cliente<select value={invoiceRequired} disabled={busy} onChange={event=>setInvoiceRequired(event.target.value)}><option value="true">Sí</option><option value="false">No</option></select></label>
   {error&&<p className="error ops-wide" role="alert">{error}</p>}
   {notice&&<p className="ops-wide" role="status">{notice}</p>}
   <div className="inline-actions ops-wide"><button type="submit" className="primary" disabled={busy}>{busy?'Guardando…':'Guardar plan y pago'}</button></div>
  </form>
 </details>;
}
