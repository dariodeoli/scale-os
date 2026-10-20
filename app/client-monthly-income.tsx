'use client';
import {useEffect,useRef,useState} from 'react';
import {api,Dialog,Editor,type Field} from './operations';
import {Button} from './ui/button';
import {MonthPicker} from './month-picker';
import {currentForecastMonth} from './forecast-data';
import {useCompanyCurrency} from './currency-provider';
import {currencyChoices} from './currencies';
import {ErrorBlock,LoadingBlock,MoneyText} from './ui-v2';
import {monthlyIncome,monthlyIncomeUrl,monthlyIncomeAmountError,type ClientMonthlyIncome,type MonthlyIncomeEntry} from './client-monthly-income-data';
import './client-monthly-income.css';

type Props={clientId:string;name:string;month?:string;onSaved?:()=>void|Promise<void>};
type Edit={kind:'base'|'extra'|'remove';entry?:MonthlyIncomeEntry;revision:string}|null;
/** The same editor opens from client sheets, price editors and the monthly balance. */
export function ClientMonthlyIncomeButton(props:Props){
 const [open,setOpen]=useState(false);
 return <><Button type="button" variant="secondary" onClick={()=>setOpen(true)}>Importe del mes y extras</Button>{open?<ClientMonthlyIncomeDialog {...props} close={()=>setOpen(false)}/>:null}</>;
}
export function ClientMonthlyIncomeDialog({clientId,name,month:initialMonth,close,onSaved}:Props&{close:()=>void}){
 return <ClientMonthlyIncomeSession key={clientId} clientId={clientId} name={name} initialMonth={initialMonth||currentForecastMonth()} close={close} onSaved={onSaved}/>;
}
function ClientMonthlyIncomeSession({clientId,name,initialMonth,close,onSaved}:Omit<Props,'month'>&{initialMonth:string;close:()=>void}){
 const {currency:companyCurrency}=useCompanyCurrency();
 const [month,setMonth]=useState(initialMonth),[data,setData]=useState<ClientMonthlyIncome|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[reload,setReload]=useState(0),[editing,setEditing]=useState<Edit>(null),[busy,setBusy]=useState(false);
 const request=useRef<{signature:string;id:string}|null>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{let active=true;const controller=new AbortController();setData(null);setError('');void api<unknown>(monthlyIncomeUrl(clientId,month),undefined,'GET',{signal:controller.signal}).then(value=>{const parsed=monthlyIncome(value,clientId,month);if(!parsed)throw Error('No se pudo validar el ingreso mensual del cliente.');if(active)setData(parsed);}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No se pudo cargar el ingreso mensual.');});return()=>{active=false;controller.abort();};},[clientId,month,reload]);
 const canManage=!!data?.canManage&&!data.periodClosed&&!data.archived;
 const start=(kind:'base'|'extra'|'remove',entry?:MonthlyIncomeEntry)=>{if(!data||!canManage)return;setEditing({kind,entry,revision:data.revision});request.current=null;setNotice('');};
 const fields:Field[]=editing?.kind==='remove'?[{key:'reason',label:'Motivo de la eliminación',type:'textarea',maxLength:1000,validate:value=>value.trim().length>=5?null:'Explicá el motivo con al menos cinco caracteres.'}]:[
  {key:'label',label:editing?.kind==='base'?'Concepto del importe mensual':'Servicio extra',maxLength:120,span:6},
  {key:'amount',label:'Importe',type:'money',integer:true,currencyFrom:values=>values.currency,span:3,validate:value=>monthlyIncomeAmountError(value,editing?.kind==='base'?'base':'extra')},
  {key:'currency',label:'Moneda',choices:currencyChoices,span:3,validate:value=>editing?.kind==='base'&&data?.entries.some(entry=>entry.kind==='base'&&entry.currency===value&&entry.id!==editing.entry?.id)?'Ya hay una base manual en esta moneda. Editá ese registro.':null},
  {key:'reason',label:'Motivo / detalle del acuerdo',type:'textarea',maxLength:1000,wide:true,validate:value=>value.trim().length>=5?null:'Explicá el acuerdo con al menos cinco caracteres.'},
 ];
 async function save(values:Record<string,string>){
  if(!editing||!canManage||busy)return;
  const payload=editing.kind==='remove'?{reason:values.reason.trim(),expectedRevision:editing.revision}:{month,kind:editing.kind,label:values.label.trim(),amount:values.amount,currency:values.currency,reason:values.reason.trim(),expectedRevision:editing.revision};
  const path=monthlyIncomeUrl(clientId)+(editing.entry?`/${encodeURIComponent(editing.entry.id)}`:'');
  const method=editing.kind==='remove'?'DELETE':editing.entry?'PATCH':'POST';
  const signature=JSON.stringify({path,method,payload});if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()};
  setBusy(true);
  try{
   const result=await api<unknown>(path,{...payload,requestId:request.current.id},method);
   const parsed=monthlyIncome(result,clientId,month);if(!parsed)throw Error('La operación respondió sin un estado mensual verificable. Recargá antes de volver a guardar.');
   if(!mounted.current)return;setData(parsed);setEditing(null);request.current=null;setNotice(editing.kind==='remove'?'Registro eliminado. Si era una base manual, vuelve a regir el plan del mes.':'Ingreso mensual guardado. No se registró ningún cobro ni movimiento de caja.');
   if(onSaved)try{await onSaved();}catch{if(mounted.current)setError('El ingreso se guardó, pero no se pudo actualizar la vista de origen. Cerrá y volvé a abrirla.');}
  }finally{if(mounted.current)setBusy(false);}
 }
 return <Dialog title={`Importe del mes y extras · ${name}`} close={close} busy={busy}>
  <div className="client-monthly-income">
   {error?<ErrorBlock title="No se pudo cargar el ingreso mensual" description={error} onRetry={()=>{setEditing(null);setReload(value=>value+1);}}/>:null}
   {notice?<p role="status" className="form-note">{notice}</p>:null}
   <MonthPicker label="Mes del ingreso del cliente" value={month} onChange={value=>{if(busy)return;if(editing){setNotice('Guardá o cancelá la edición antes de cambiar de mes.');return;}setMonth(value);setNotice('');}}/>
   <p className="form-note">No hace falta un plan. Podés acordar una base para este mes y sumar servicios extras. La base manual reemplaza la del plan sólo en este mes; los extras se suman una vez. Registrar un ingreso previsto no significa que el cliente ya pagó.</p>
   {!data&&!error?<LoadingBlock label="Cargando importe mensual y extras…" lines={3}/>:null}
   {data?<>
    <div className="client-monthly-totals" aria-label="Totales mensuales del cliente">{data.totals.length?data.totals.map(total=><dl key={total.currency}><div><dt>Base · {total.currency}</dt><dd><MoneyText valor={total.baseAmount} currency={total.currency}/></dd></div><div><dt>Extras</dt><dd><MoneyText valor={total.extrasAmount} currency={total.currency}/></dd></div><div><dt>Total del mes</dt><dd><MoneyText valor={total.totalAmount} currency={total.currency}/></dd></div></dl>):<p className="form-note">Sin importe acordado para este mes.</p>}</div>
    {data.periodClosed?<p role="status" className="form-note">Mes cerrado o protegido por un cierre posterior: los importes se conservan en modo de consulta.</p>:data.archived?<p className="form-note">Restaurá el cliente antes de editar sus ingresos.</p>:!data.canManage?<p className="form-note">Tu acceso permite consultar estos importes, pero no modificarlos.</p>:null}
    <div className="client-monthly-entries" aria-label="Acuerdos y extras del mes">{data.entries.map(entry=><article key={entry.id} className="client-monthly-entry"><div><strong>{entry.label}</strong><small>{entry.kind==='base'?'Base manual de este mes':'Extra del mes'}</small></div><MoneyText valor={entry.amount} currency={entry.currency}/>{canManage?<div className="client-monthly-actions"><Button type="button" variant="ghost" onClick={()=>start(entry.kind,entry)}>Editar</Button><Button type="button" variant="ghost" onClick={()=>start('remove',entry)}>Eliminar</Button></div>:null}</article>)}</div>
    {!editing&&canManage?<div className="client-monthly-actions"><Button type="button" variant="secondary" onClick={()=>start('base')}>Acordar importe del mes</Button><Button type="button" onClick={()=>start('extra')}>Agregar servicio extra</Button></div>:null}
    {editing?<section className="client-monthly-editor" aria-label={editing.kind==='remove'?'Eliminar ingreso mensual':editing.kind==='base'?'Editar importe del mes':'Editar servicio extra'}><h3>{editing.kind==='remove'?`Eliminar ${editing.entry?.label}`:editing.kind==='base'?'Importe base del mes':'Servicio extra del mes'}</h3>{editing.kind==='remove'?<p className="form-note">Se conserva la auditoría del cambio. Eliminar una base manual restaura el importe del plan si existía.</p>:null}<Editor key={`${month}:${editing.kind}:${editing.entry?.id||'new'}:${editing.revision}`} columns fields={fields} defaults={{label:editing.entry?.label||'',amount:editing.entry?String(editing.entry.amount):'',currency:editing.entry?.currency||data.totals[0]?.currency||companyCurrency,reason:''}} label={editing.kind==='remove'?'Eliminar registro':'Guardar ingreso del mes'} save={save}/><div className="client-monthly-actions"><Button type="button" variant="ghost" disabled={busy} onClick={()=>setEditing(null)}>Cancelar edición</Button><Button type="button" variant="ghost" disabled={busy} onClick={()=>{setEditing(null);setReload(value=>value+1);}}>Descartar borrador y recargar</Button></div></section>:null}
   </>:null}
  </div>
 </Dialog>;
}
