'use client';
import {useEffect,useState} from 'react';
import {api,Editor,type Field} from './operations';

type MoneyCurrency='PYG'|'USD';
type Terms={planId:string;planName:string;recurringAmount:string|number;currency:MoneyCurrency;startsOn:string;invoiceRequired:boolean;commissionRecipientId:string|null;commissionRecipientName:string|null;commissionMode:'none'|'percentage'|'fixed';commissionValue:string|number|null;updatedAt:string};
type TermsResponse={clientId:string;archived:boolean;terms:Terms|null;plans:{id:string;name:string;currency:MoneyCurrency}[];collaborators:{id:string;full_name:string}[]};
const isDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T12:00:00Z`))&&new Date(`${value}T12:00:00Z`).toISOString().slice(0,10)===value;

export function ClientPlanTerms({id,role,refresh}:{id:string;role:string;refresh:()=>void|Promise<void>}){
  const [data,setData]=useState<TermsResponse|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const allowed=['owner','admin'].includes(role);
  useEffect(()=>{if(!allowed)return;let alive=true;setError('');setNotice('');void api<TermsResponse>(`/api/agency/clients/${id}/commercial-terms`).then(value=>{if(alive)setData(value);}).catch(cause=>{if(alive)setError(cause instanceof Error?cause.message:'No se pudo cargar el plan y pago del cliente.');});return()=>{alive=false;};},[id,allowed]);
  if(!allowed)return null;
  if(error)return <p className="error" role="alert">{error}</p>;
  if(!data)return <p role="status">Cargando plan y pago…</p>;
  if(data.archived)return <p className="form-note">El cliente está archivado. El plan y pago queda en solo lectura.</p>;
  const terms=data.terms;
  const fields:Field[]=[
    {key:'planId',label:'Plan',choices:data.plans.map(plan=>({value:String(plan.id),label:plan.name})),section:'Plan y pago'},
    {key:'recurringAmount',label:'Cuánto paga por mes',type:'money',integer:true,currencyKey:'currency',section:'Plan y pago',help:'Solo administración y finanzas pueden ver este importe.'},
    {key:'currency',label:'Moneda',choices:[{value:'PYG',label:'PYG · Guaraníes'},{value:'USD',label:'USD · Dólares'}],section:'Plan y pago'},
    {key:'startsOn',label:'Inicio comercial',type:'date',section:'Plan y pago'},
    {key:'invoiceRequired',label:'Factura comercial del cliente',choices:[{value:'true',label:'Sí'},{value:'false',label:'No'}],section:'Plan y pago'},
  ];
  const defaults={planId:terms?.planId||'',recurringAmount:terms?String(terms.recurringAmount):'',currency:terms?.currency||'PYG',startsOn:terms?.startsOn||'',invoiceRequired:terms?String(terms.invoiceRequired):''};
  return <>{notice&&<p role="status">{notice}</p>}<Editor key={terms?.updatedAt||'new'} columns fields={fields} defaults={defaults} save={async values=>{
    if(!/^[1-9]\d{0,18}$/.test(values.planId))throw Error('Elegí un plan de la lista.');
    if(!/^[1-9]\d*$/.test(values.recurringAmount))throw Error('Ingresá un importe mensual entero positivo.');
    if(!isDate(values.startsOn))throw Error('Completá la fecha real de inicio comercial.');
    const payload={planId:values.planId,recurringAmount:values.recurringAmount,currency:values.currency,startsOn:values.startsOn,invoiceRequired:values.invoiceRequired==='true',commissionRecipientId:terms?.commissionMode==='none'?null:terms?.commissionRecipientId||null,commissionMode:terms?.commissionMode||'none',commissionValue:terms?.commissionMode==='none'?null:terms?.commissionValue??null};
    await api(`/api/agency/clients/${id}/commercial-terms`,payload,'PATCH');
    const updated=await api<TermsResponse>(`/api/agency/clients/${id}/commercial-terms`);
    setData(updated);setNotice('Plan y pago guardados.');
    if(refresh)try{await refresh();}catch{}
  }}/></>;
}
