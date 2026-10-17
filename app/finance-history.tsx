'use client';
import {useCallback,useEffect,useState} from 'react';
import {api,Dialog} from './operations';
import {ActorIdentity} from './actor-identity';
import {ErrorBlock,LoadingBlock,MoneyText} from './ui-v2';
import {listDateFull,listDateShort} from './list-format';
import {financeHistory,type FinanceHistoryPayload} from './finance-detail-data';
export type FinanceHistoryKind='salary'|'plan';
export const financeHistoryUrl=(kind:FinanceHistoryKind,id:string)=>`/api/agency/${kind==='salary'?'collaborators':'clients'}/${id}/${kind==='salary'?'salary-history':'plan-history'}`;
export function useFinanceHistory(kind:FinanceHistoryKind,id:string){
 const [data,setData]=useState<FinanceHistoryPayload|null>(null),[error,setError]=useState(''),[version,setVersion]=useState(0);
 const reload=useCallback(()=>setVersion(value=>value+1),[]);
 useEffect(()=>{let active=true;setData(null);setError('');void api<unknown>(financeHistoryUrl(kind,id)).then(response=>{const parsed=financeHistory(response);if(!parsed)throw Error('El historial recibió datos inválidos.');if(active)setData(parsed);}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No se pudo cargar el historial.');});return()=>{active=false;};},[kind,id,version]);
 return {data,error,reload};
}
/** Same chronology for the salary and commercial-plan editors and read-only views. */
export function FinanceHistoryPanel({data,error,onRetry}:{data:FinanceHistoryPayload|null;error:string;onRetry:()=>void}){
 if(error)return <ErrorBlock title="No se pudo cargar el historial" description={error} onRetry={onRetry}/>;
 if(!data)return <LoadingBlock label="Cargando historial…" lines={2}/>;
 return <section className="finance-history" aria-label="Cronología de cambios"><h3 className="finance-detail-title">Cronología de cambios</h3>{!data.records.length?<p className="field-help">Todavía no hay cambios registrados.</p>:<ol className="finance-history-list">{data.records.map(row=><li className="finance-history-entry" key={row.id}>
  <header><strong>{row.source==='legacy-baseline'?'Valor anterior importado':'Cambio registrado'}</strong><time dateTime={row.created_at}>{listDateFull(row.created_at)}</time></header>
  <div className="finance-history-amounts"><span>Antes: {row.before_amount===null?'Sin dato previo':<MoneyText valor={row.before_amount} currency={row.before_currency||row.currency}/>}</span><span>Después: <MoneyText valor={row.after_amount} currency={row.currency}/></span></div>
  {row.before_plan_name||row.after_plan_name?<p className="field-help">Plan: {row.before_plan_name||'Sin dato previo'} → {row.after_plan_name||'Sin plan'}</p>:null}
  <p className="field-help">{row.history_known&&row.effective_from?<>Vigente desde <time dateTime={row.effective_from}>{listDateShort(row.effective_from)}</time></>:'Vigencia anterior no registrada; no se reconstruye una fecha desconocida.'}</p>
  <p className="finance-history-reason">{row.reason||'Sin motivo registrado'}</p>
  <ActorIdentity name={row.actor_name} photoUrl={row.actor_photo_url} verified={!!row.actor_name} imported={!row.actor_name}/>
 </li>)}</ol>}</section>;
}
export function FinanceHistoryDialog({kind,id,name,close}:{kind:FinanceHistoryKind;id:string;name:string;close:()=>void}){
 const history=useFinanceHistory(kind,id);
 return <Dialog title={`${kind==='salary'?'Historial salarial':'Historial del plan'} · ${name}`} close={close}><FinanceHistoryPanel data={history.data} error={history.error} onRetry={history.reload}/></Dialog>;
}
