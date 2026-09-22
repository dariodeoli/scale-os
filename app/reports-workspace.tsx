'use client';
import {useEffect,useState} from 'react';
import {downloadReportsCsv} from './reports-csv';
import {WeeklyAutomatic} from './weekly-automatic';
import './reports-workspace.css';
import {SelectCustom} from './profile-controls';
import {listDateShort} from './list-format';
import {printReportsPdf} from './reports-print';
import {
  count,
  chartBarPercent,
  chartSeries,
  biggestDecimal,
  currentMonth,
  distributionShare,
  hasMonthData,
  monthLabel,
  previousMonth,
  printed,
  reportComparison,
  reportCurrencies,
  reportDate,
  reportDelta,
  reportKindLabel,
  reportMoney,
  reportTiles,
  validMonth,
  type Decimal,
  type ReportMonth,
  type ReportsData,
} from './reports-data';
import {useReportsWindow} from './use-reports';

// La descomposición del shell (#47) sigue importando el tipo desde este módulo.
export type {ReportMonth, ReportsData} from './reports-data';

function ReportsChart({months,currency}:{months:ReportMonth[];currency:string}){
 const series=chartSeries(months,currency);
 if(!currency||!series.length)return null;
 const biggest=biggestDecimal(series);
 const heightOf=(value:Decimal|null)=>chartBarPercent(value,biggest);
 return <div className="reports-chart" role="img" aria-label={`Facturado y cobrado mensual en ${currency}`}>
  {series.map(row=><figure key={row.month}>
   <div className="chart-bars">
    <span className={`chart-bar${row.partial?' is-partial':''}`} title={`${listDateShort(`${row.month}-01`)} · Facturado ${row.invoiced?`${currency} ${printed(row.invoiced.units,row.invoiced.scale)}`:'sin datos'}`} style={{height:`${heightOf(row.invoiced)}%`}}/>
    <span className={`chart-bar collected${row.partial?' is-partial':''}`} title={`${listDateShort(`${row.month}-01`)} · Cobrado ${row.collected?`${currency} ${printed(row.collected.units,row.collected.scale)}`:'sin datos'}`} style={{height:`${heightOf(row.collected)}%`}}/>
   </div>
   <figcaption>{listDateShort(`${row.month}-01`)}{row.partial?' · parcial':''}</figcaption>
  </figure>)}
 </div>;
}
function Distribution({title,rows,total}:{title:string;rows:{name:string;count:number}[];total:number|null}){
 return <section className="reports-distribution"><h3>{title}</h3><p>Porcentaje sobre todos los clientes activos, incluidos los no clasificados y sin plan.</p>{rows.length?<ul>{rows.map((row,index)=>{const share=distributionShare(row.count,total);return <li key={`${row.name}-${index}`}><span>{row.name}</span><strong>{row.count} · {share===null?'Sin porcentaje':`${share.toFixed(1).replace('.',',')} %`}</strong>{share!==null?<span className="reports-bar" aria-hidden="true"><span style={{width:`${Math.min(100,Math.max(0,share))}%`}}/></span>:null}</li>;})}</ul>:<p>Sin distribución registrada para este mes.</p>}</section>;
}
// Main must key this component by authenticated organization ID. Role changes
// unmount the authorized view; no GET is issued for an unauthorized role.
export function ReportsWorkspace({role,organizationName}:{role:string;organizationName:string}){return ['owner','admin','finance','sales'].includes(role)?<><ReportsPanel key={role} organizationName={organizationName}/><WeeklyAutomatic role={role}/></>:<p>No tenés permiso para consultar reportes.</p>;}
function LiveVisitorsWidget(){
 const [visitors,setVisitors]=useState<number|null>(null),[prior,setPrior]=useState<number|null>(null),[trend,setTrend]=useState<'up'|'down'|null>(null);
 useEffect(()=>{
  let alive=true,timer:ReturnType<typeof setInterval>|null=null;
  const fetch_live=async()=>{
   try{const resp=await fetch('/core-api/api/public/live-visitors/count',{method:'GET',credentials:'omit',cache:'no-store',headers:{'Accept':'application/json'}});if(resp.ok&&alive){const data=await resp.json();if(typeof data?.active_sessions==='number'){const value=data.active_sessions;setVisitors(current=>{if(current!==null&&current!==value){setPrior(current);setTrend(value>current?'up':'down');}return value;});setPrior(current=>current===null?value:current);}}}catch{}
  };
  void fetch_live();
  timer=setInterval(fetch_live,30000);
  return()=>{alive=false;if(timer)clearInterval(timer);};
 },[]);
 const changePercent=prior&&visitors&&prior!==0?Math.round(((visitors-prior)/prior)*100):null;
 return <article className="reports-tiles live-visitors" role="region" aria-label="Visitantes en vivo del landing">
  <article>
   <div className="live-visitors-copy">
    <h3>Visitantes en vivo</h3>
    <p>Personas actualmente en el landing de Scale OS</p>
   </div>
   <div className="live-visitors-figure">
    <strong>{visitors===null?'—':visitors}</strong>
    <span className={`live-visitors-trend${trend==='down'?' down':''}`}>
     {trend==='up'&&changePercent!==null?`↑ +${changePercent}%`:trend==='down'&&changePercent!==null?`↓ ${changePercent}%`:'—'}
    </span>
   </div>
  </article>
 </article>;
}
function ReportsPanel({organizationName}:{organizationName:string}){
 const [month,setMonth]=useState(currentMonth),[months,setMonths]=useState(12),[currency,setCurrency]=useState('');
 const [retry,setRetry]=useState(0);
 const [exportError,setExportError]=useState('');
 const {data,previousData,error}=useReportsWindow(month,months,retry);
 useEffect(()=>{setExportError('');},[month,months,retry]);
 // The table lists the newest month first, oldest at the bottom; the chart
 // keeps chronological order (oldest on the left).
 const loadedMonths=(data?.months||[]).filter(hasMonthData);
 const rows=loadedMonths.slice().sort((a,b)=>b.month.localeCompare(a.month));
 const chartMonths=loadedMonths.slice().sort((a,b)=>a.month.localeCompare(b.month));
 const currencies=reportCurrencies(rows);
 const selectedCurrency=currencies.includes(currency)?currency:currencies[0]||'';
 const comparison=data?reportComparison(data,previousData,selectedCurrency,months):null;
 const selected=rows.find(row=>row.month===month),prior=rows.find(row=>row.month===previousMonth(month));
 const partial=!!(selected?.isPartial||prior?.isPartial);
 const tiles=reportTiles(selected,prior,selectedCurrency);
 return <section className="reports-workspace" aria-label="Reportes de la agencia">
  <h2>Evolución mensual</h2>
  <LiveVisitorsWidget/>
  <p>Importes registrados, no utilidad ni rentabilidad. Las monedas se consultan por separado.</p>
  <div className="reports-filters">
   <label>Mes a consultar<input type="month" value={month} min="1900-01" max={currentMonth()} onChange={e=>{if(validMonth(e.target.value)&&e.target.value<=currentMonth())setMonth(e.target.value);}}/></label>
   <label><SelectCustom label="Histórico" choices={[6,12,24].map(value=>({value:String(value),label:'Últimos '+value+' meses'}))} value={String(months)} onChange={value=>{const monthsValue=Number(value);if([6,12,24].includes(monthsValue))setMonths(monthsValue);}}/></label>
   <label><SelectCustom label="Moneda" choices={currencies.length?currencies.map(value=>({value,label:value})):[{value:'',label:'Sin datos monetarios'}]} value={selectedCurrency} disabled={!currencies.length} onChange={setCurrency}/></label>
  </div>
  {error?<div role="alert" className="reports-error"><p>{error}</p><button type="button" onClick={()=>setRetry(value=>value+1)}>Reintentar</button></div>:!data?<p role="status">Cargando reportes…</p>:<>
   <p className="reports-note">Datos al {reportDate(data.asOf,true)} (hora de Asunción). Histórico confiable desde: {reportDate(data.historySince)}.</p>
   <div className="reports-actions"><button type="button" disabled={!rows.length} onClick={()=>{
    if(!data||!rows.length)return;
    setExportError('');
    try{downloadReportsCsv(data,selectedCurrency);}catch{setExportError('No se pudo descargar el CSV. Intentá nuevamente.');}
   }}>Exportar histórico CSV{selectedCurrency?` · ${selectedCurrency}`:''}</button><button type="button" disabled={!rows.length} onClick={()=>{
    if(!data||!rows.length)return;
    setExportError('');
    try{printReportsPdf({data,previousData,currency:selectedCurrency,organizationName});}catch{setExportError('No se pudo exportar el PDF. Intentá nuevamente.');}
   }}>Exportar PDF{selectedCurrency?` · ${selectedCurrency}`:''}</button></div>
   <p className="reports-note">Exporta los meses cargados de la moneda seleccionada. CSV UTF-8, separado por punto y coma; decimales con punto, sin separador de miles. Celdas vacías: sin datos. Para conservar todos los dígitos, importá los importes como texto en tu planilla.</p>
   {exportError?<p role="alert">{exportError}</p>:null}
   {partial?<p role="status" className="reports-warning">Mes en curso o cobertura incompleta en el mes seleccionado o anterior; no comparar como meses completos. Se omite la comparación mensual.</p>:null}
   {data&&comparison&&rows.length?<section className="reports-comparison">
    <h3>Comparativa del período visible contra el anterior</h3>
    <p className="reports-note">Período visible: {monthLabel(comparison.currentStart)} – {monthLabel(comparison.currentEnd)} · período anterior: {comparison.previousStart&&comparison.previousEnd?`${monthLabel(comparison.previousStart)} – ${monthLabel(comparison.previousEnd)}`:'sin período anterior disponible'} ({months} meses por período).</p>
    {comparison.available?<div className="reports-comparison-scroll" role="region" aria-label={`Comparativa del período visible contra el anterior${selectedCurrency?` en ${selectedCurrency}`:''}, desplazable horizontalmente`} tabIndex={0}><table>
     <thead><tr>{['Métrica','Período visible','Período anterior','Variación'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead>
     <tbody>{comparison.rows.map(row=><tr key={row.label}><th scope="row">{row.label}</th><td>{row.current}</td><td>{row.previous}</td><td>{row.change}</td></tr>)}</tbody>
    </table></div>:<p role="status">Sin comparación: no hay período anterior con datos.</p>}
   </section>:null}
   {!selected?<p>Sin datos para el mes seleccionado.</p>:<>
    <div className="reports-tiles">{tiles.map(tile=><article key={tile.label}><h3>{tile.label}</h3><strong>{tile.value}</strong><p>{tile.change}</p></article>)}</div>
     <ReportsChart months={chartMonths} currency={selectedCurrency}/>
    <p className="reports-note">Barras: facturado (violeta) y cobrado (verde) por mes, en la moneda seleccionada. Los meses parciales se atenúan; la escala es relativa al valor máximo cargado, sin mezclar monedas.</p>
    <p>Antigüedad promedio de clientes activos: <strong>{count(selected.clients.averageTenureDays)}{selected.clients.averageTenureDays===null?'':' días'}</strong>. Fechas conocidas: {selected.clients.tenureKnown} de {count(selected.clients.active)} clientes activos. Las fechas desconocidas se excluyen del promedio.</p>
    <p className="reports-note">Bajas de actividad: clientes que dejaron de estar activos por pausa, cancelación o archivo, incluso si se reactivaron durante el mismo mes. No implica una pérdida definitiva.</p>
    <div className="reports-distributions"><Distribution title="Tipos de clientes activos" total={selected.clients.active} rows={selected.clients.types.map(row=>({name:reportKindLabel(row.kind),count:row.count}))}/><Distribution title="Planes por cantidad de clientes activos" total={selected.clients.active} rows={selected.clients.plans.map(row=>({name:row.planId===null?'Sin plan registrado':row.name||'Plan sin nombre',count:row.count}))}/></div>
    <p className="reports-note">La distribución de planes muestra clientes activos, no nuevas contrataciones. “Sin clasificar” y “Sin plan registrado” identifican datos desconocidos, no categorías supuestas.</p>
   </>}
   <div className="reports-table-scroll" role="region" aria-label="Histórico mensual, desplazable horizontalmente" tabIndex={0}><table>
    <caption>Evolución mensual · {selectedCurrency||'sin moneda disponible'}. “Sin datos” no significa cero.</caption>
    <thead><tr>{['Mes','Activos','Incorporados','Bajas de actividad','Retención %','Antigüedad (días)','Fechas conocidas','Facturado con impuestos','Cobrado neto','Facturas','Clientes facturados','Ticket por factura','Promedio por cliente facturado'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead>
    <tbody>{rows.map(row=>{const money=row.financial.find(item=>item.currency===selectedCurrency);return <tr key={row.month}><th scope="row">{row.month}{row.isPartial?' · parcial':''}</th><td>{count(row.clients.active)}</td><td>{count(row.clients.added)}</td><td>{count(row.clients.lost)}</td><td>{count(row.clients.retentionPercent)}</td><td>{count(row.clients.averageTenureDays)}</td><td>{row.clients.tenureKnown}</td><td>{reportMoney(money?.invoiced,selectedCurrency)}</td><td>{reportMoney(money?.collected,selectedCurrency)}</td><td>{count(money?.invoiceCount)}</td><td>{count(money?.billedClients)}</td><td>{reportMoney(money?.averageTicket,selectedCurrency)}</td><td>{reportMoney(money?.averageRevenuePerClient,selectedCurrency)}</td></tr>;})}</tbody>
   </table>{!rows.length?<p>Sin meses registrados.</p>:null}</div>
   <p className="reports-note">Comparaciones contra el mes calendario anterior: diferencia absoluta y variación porcentual sobre el valor absoluto anterior. Sin porcentaje cuando la base es cero; sin comparación si falta información o alguno de los meses es parcial. La antigüedad usa solo fechas de inicio conocidas.</p>
  </>}
 </section>;
}
