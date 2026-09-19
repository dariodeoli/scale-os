'use client';
import {useEffect,useState} from 'react';
import {api} from './operations';
import {downloadReportsCsv} from './reports-csv';
import {WeeklyAutomatic} from './weekly-automatic';
import './reports-workspace.css';
import {SelectCustom} from './profile-controls';
import {listDateShort} from './list-format';
import {printReportsPdf} from './reports-print';

export type ReportMonth={month:string;isPartial:boolean;clients:{active:number|null;added:number|null;lost:number|null;retentionPercent:number|null;averageTenureDays:number|null;tenureKnown:number;types:{kind:string;count:number}[];plans:{planId:string|number|null;name:string|null;count:number}[]};financial:{currency:string;invoiced:string;collected:string;invoiceCount:number;billedClients:number;averageTicket:string|null;averageRevenuePerClient:string|null}[]};
export type ReportsData={asOf:string;month:string;historySince:string|null;months:ReportMonth[]};
const kinds:Record<string,string>={unknown:'Sin clasificar',company:'Empresa',professional:'Profesional',individual:'Persona particular',other:'Otro'};
const reportDateFormat=new Intl.DateTimeFormat('es-PY',{timeZone:'America/Asuncion',dateStyle:'long'});
const reportCutoffFormat=new Intl.DateTimeFormat('es-PY',{timeZone:'America/Asuncion',dateStyle:'long',timeStyle:'short',hourCycle:'h23'});
function reportDate(value:string|null,withTime=false){const date=value?new Date(value):null;return date&&!Number.isNaN(date.getTime())?(withTime?reportCutoffFormat:reportDateFormat).format(date):'sin fecha confirmada';}
const validMonth=(value:string)=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value)&&value>='1900-01'&&value<='9998-12';
function currentMonth(){const parts=new Intl.DateTimeFormat('en',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit'}).formatToParts(new Date());return `${parts.find(p=>p.type==='year')!.value}-${parts.find(p=>p.type==='month')!.value}`;}
function previousMonth(value:string){const [year,month]=value.split('-').map(Number);return month===1?`${year-1}-12`:`${year}-${String(month-1).padStart(2,'0')}`;}
function decimal(value:string|number|null){if(value===null)return null;const text=String(value);if(!/^-?\d+(\.\d+)?$/.test(text))return null;const scale=text.split('.')[1]?.length||0;return {units:BigInt(text.replace('.','')),scale};}
function power(scale:number){return BigInt('1'+'0'.repeat(scale));}
function printed(units:bigint,scale:number){const negative=units<BigInt(0),digits=(negative?-units:units).toString().padStart(scale+1,'0');const integer=scale?digits.slice(0,-scale):digits;return `${negative?'-':''}${integer.replace(/\B(?=(\d{3})+(?!\d))/g,'.')}${scale?','+digits.slice(-scale):''}`;}
/** Formats server decimal strings without converting money to binary Number. */
export function reportMoney(value:string|null|undefined,currency:string){const parsed=decimal(value??null);return parsed?`${currency} ${printed(parsed.units,parsed.scale)}`:'Sin datos';}
export function reportDelta(current:string|number|null,prior:string|number|null,partial=false){
 if(partial)return 'Sin comparación: mes parcial';
 const a=decimal(current),b=decimal(prior);if(!a||!b)return 'Sin comparación: faltan datos';
 const scale=Math.max(a.scale,b.scale),now=a.units*power(scale-a.scale),before=b.units*power(scale-b.scale),diff=now-before;
 const absolute=`${diff>BigInt(0)?'+':''}${printed(diff,scale)}`;
 if(before===BigInt(0))return `${absolute} · porcentaje no disponible (base cero)`;
 const base=before<BigInt(0)?-before:before,absoluteDiff=diff<BigInt(0)?-diff:diff;
 const percent=(absoluteDiff*BigInt(10000)+base/BigInt(2))/base;
 return `${absolute} · ${diff<BigInt(0)?'-':diff>BigInt(0)?'+':''}${printed(percent,2)} %`;
}
function shiftMonth(value:string,offset:number){const [year,month]=value.split('-').map(Number);const total=year*12+month-1+offset,shiftedYear=Math.floor(total/12),shiftedMonth=total-shiftedYear*12+1;return shiftedYear>=1900&&shiftedYear<=9998?`${shiftedYear}-${String(shiftedMonth).padStart(2,'0')}`:null;}
function decimalText(units:bigint,scale:number){const negative=units<BigInt(0),digits=(negative?-units:units).toString().padStart(scale+1,'0');return `${negative?'-':''}${scale?digits.slice(0,-scale):digits}${scale?'.'+digits.slice(-scale):''}`;}
function roundedRatio(numerator:bigint,denominator:bigint,scale:number){if(denominator===BigInt(0))return BigInt(0);const negative=numerator<BigInt(0),absolute=negative?-numerator:numerator,rounded=(absolute*power(scale)+denominator/BigInt(2))/denominator;return negative?-rounded:rounded;}
function monthOf(value:string|null){if(!value)return null;const date=new Date(value);return Number.isNaN(date.getTime())?null:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit'}).format(date);}
function monthLabel(value:string){return listDateShort(`${value}-01`)||value;}
/** Only months with at least one registered figure are shown; an empty month is not zero. */
export const hasMonthData=(row:ReportMonth)=>row.clients.active!==null||row.clients.added!==null||row.clients.lost!==null||row.clients.retentionPercent!==null||row.clients.averageTenureDays!==null||row.financial.some(item=>item.invoiced!==null||item.collected!==null||item.invoiceCount!==null||item.billedClients!==null)||row.clients.types.length>0||row.clients.plans.length>0;
type WindowValue={value:string|number;partial:boolean};
export type ReportComparisonRow={label:string;current:string;previous:string;change:string};
export type ReportComparison={available:boolean;currentStart:string;currentEnd:string;previousStart:string|null;previousEnd:string|null;rows:ReportComparisonRow[]};
function lastWithActive(rows:ReportMonth[]):WindowValue|null{for(let index=rows.length-1;index>=0;index-=1){const row=rows[index];if(row.clients.active!==null)return {value:row.clients.active,partial:row.isPartial};}return null;}
function sumCounts(rows:ReportMonth[],key:'added'|'lost'):WindowValue|null{let total=0,any=false,partial=false;for(const row of rows){const value=row.clients[key];if(value===null)continue;total+=value;any=true;partial=partial||row.isPartial;}return any?{value:total,partial}:null;}
function sumMoney(rows:ReportMonth[],currency:string,key:'invoiced'|'collected'):WindowValue|null{let units=BigInt(0),scale=0,any=false,partial=false;for(const row of rows){const parsed=decimal(row.financial.find(item=>item.currency===currency)?.[key]??null);if(!parsed)continue;if(parsed.scale>scale){units*=power(parsed.scale-scale);scale=parsed.scale;}units+=parsed.units*power(scale-parsed.scale);any=true;partial=partial||row.isPartial;}return any?{value:decimalText(units,scale),partial}:null;}
function ticketAverage(rows:ReportMonth[],currency:string):WindowValue|null{let units=BigInt(0),scale=0,count=0,any=false,partial=false;for(const row of rows){const item=row.financial.find(entry=>entry.currency===currency),parsed=decimal(item?.invoiced??null);if(!parsed)continue;if(parsed.scale>scale){units*=power(parsed.scale-scale);scale=parsed.scale;}units+=parsed.units*power(scale-parsed.scale);if(item?.invoiceCount!=null)count+=item.invoiceCount;any=true;partial=partial||row.isPartial;}if(!any||count<=0)return null;return {value:decimalText(roundedRatio(units,BigInt(count)*power(scale),2),2),partial};}
/** Visible window against the equal window immediately before it; partial months never compare. */
export function reportComparison(data:ReportsData,previousData:ReportsData|null,currency:string,months:number):ReportComparison{
 const end=data.month,currentStart=shiftMonth(end,-(months-1)),previousEnd=previousData?previousData.month:shiftMonth(end,-months),previousStart=previousEnd?shiftMonth(previousEnd,-(months-1)):null;
 const currentRows=data.months.filter(row=>row.month<=end&&(!currentStart||row.month>=currentStart)).sort((a,b)=>a.month.localeCompare(b.month));
 const previousRows=previousData?previousData.months.filter(row=>row.month<=(previousEnd||data.month)&&(!previousStart||row.month>=previousStart)).sort((a,b)=>a.month.localeCompare(b.month)):[];
 const previousWithData=previousRows.filter(hasMonthData),historyMonth=monthOf(data.historySince);
 const available=!!previousData&&previousWithData.length>0&&!previousWithData.every(row=>row.isPartial)&&(!historyMonth||!previousStart||historyMonth<previousStart);
 const build=(label:string,current:WindowValue|null,previous:WindowValue|null,format:(value:string|number|null)=>string):ReportComparisonRow=>({label,current:format(current?.value??null),previous:format(previous?.value??null),change:reportDelta(current?.value??null,previous?.value??null,!!(current?.partial||previous?.partial))});
 const showNumber=(value:string|number|null)=>typeof value==='number'?count(value):value===null?'Sin datos':String(value),showMoney=(value:string|number|null)=>reportMoney(value===null?null:String(value),currency);
 return {available,currentStart:currentStart||end,currentEnd:end,previousStart,previousEnd:previousEnd||null,rows:[
  build('Clientes activos (último mes con datos)',lastWithActive(currentRows),lastWithActive(previousRows),showNumber),
  build('Clientes incorporados (suma del período)',sumCounts(currentRows,'added'),sumCounts(previousRows,'added'),showNumber),
  build('Bajas de actividad (suma del período)',sumCounts(currentRows,'lost'),sumCounts(previousRows,'lost'),showNumber),
  build('Facturación (suma del período)',sumMoney(currentRows,currency,'invoiced'),sumMoney(previousRows,currency,'invoiced'),showMoney),
  build('Cobros (suma del período)',sumMoney(currentRows,currency,'collected'),sumMoney(previousRows,currency,'collected'),showMoney),
  build('Ticket promedio por factura',ticketAverage(currentRows,currency),ticketAverage(previousRows,currency),showMoney),
 ]};
}
function ReportsChart({months,currency}:{months:ReportMonth[];currency:string}){
 const series=months.map(row=>{const financial=row.financial.find(item=>item.currency===currency);return {month:row.month,partial:row.isPartial,invoiced:decimal(financial?.invoiced??null),collected:decimal(financial?.collected??null)};}).filter(row=>row.invoiced!==null||row.collected!==null);
 if(!currency||!series.length)return null;
 const biggest=series.reduce((top,row)=>{for(const value of [row.invoiced,row.collected]){if(!value)continue;const scale=Math.max(top.scale,value.scale);const candidate=value.units*power(scale-value.scale);const current=top.units*power(scale-top.scale);if(candidate>current){top={units:value.units,scale:value.scale};}}return top;},{units:BigInt(0),scale:0});
 const heightOf=(value:{units:bigint;scale:number}|null)=>value===null||biggest.units===BigInt(0)?0:Math.max(2,Math.min(100,Number(value.units*power(biggest.scale-value.scale)*BigInt(100)/biggest.units)));
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
export const count=(value:number|null|undefined)=>value==null?'Sin datos':String(value);
function Distribution({title,rows,total}:{title:string;rows:{name:string;count:number}[];total:number|null}){
 return <section className="reports-distribution"><h3>{title}</h3><p>Porcentaje sobre todos los clientes activos, incluidos los no clasificados y sin plan.</p>{rows.length?<ul>{rows.map((row,index)=>{const share=total!==null&&total>0?row.count/total*100:null;return <li key={`${row.name}-${index}`}><span>{row.name}</span><strong>{row.count} · {share===null?'Sin porcentaje':`${share.toFixed(1).replace('.',',')} %`}</strong>{share!==null?<span className="reports-bar" aria-hidden="true"><span style={{width:`${Math.min(100,Math.max(0,share))}%`}}/></span>:null}</li>;})}</ul>:<p>Sin distribución registrada para este mes.</p>}</section>;
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
 const [result,setResult]=useState<{key:string;data:ReportsData}|null>(null),[previousResult,setPreviousResult]=useState<{key:string;data:ReportsData}|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [exportError,setExportError]=useState('');
 const queryKey=`${month}:${months}:${retry}`;
 useEffect(()=>{
  let alive=true;setResult(null);setPreviousResult(null);setError('');setExportError('');
  void api<ReportsData>(`/api/agency/reports?month=${month}&months=${months}`).then(data=>{
   if(!data||data.month!==month||!Array.isArray(data.months))throw Error('La respuesta del reporte no corresponde al mes solicitado.');
   if(alive)setResult({key:queryKey,data});
   const previousWindowMonth=shiftMonth(month,-months);
   if(!alive||!previousWindowMonth)return;
   void api<ReportsData>(`/api/agency/reports?month=${previousWindowMonth}&months=${months}`).then(previous=>{
    if(!previous||previous.month!==previousWindowMonth||!Array.isArray(previous.months))return;
    if(alive)setPreviousResult({key:queryKey,data:previous});
   }).catch(()=>{});
  }).catch(e=>{if(alive)setError(e instanceof Error?e.message:'No se pudo cargar el reporte.');});
  return()=>{alive=false;};
 },[month,months,retry,queryKey]);
  const data=result?.key===queryKey?result.data:null;
  const previousData=previousResult?.key===queryKey?previousResult.data:null;
  // The table lists the newest month first, oldest at the bottom; the chart
  // keeps chronological order (oldest on the left).
  const loadedMonths=(data?.months||[]).filter(hasMonthData);
  const rows=loadedMonths.slice().sort((a,b)=>b.month.localeCompare(a.month));
  const chartMonths=loadedMonths.slice().sort((a,b)=>a.month.localeCompare(b.month));
 const currencies=Array.from(new Set(rows.flatMap(row=>row.financial.map(item=>item.currency)))).sort();
 const selectedCurrency=currencies.includes(currency)?currency:currencies[0]||'';
 const comparison=data?reportComparison(data,previousData,selectedCurrency,months):null;
 const selected=rows.find(row=>row.month===month),prior=rows.find(row=>row.month===previousMonth(month));
 const financial=selected?.financial.find(row=>row.currency===selectedCurrency),previousFinancial=prior?.financial.find(row=>row.currency===selectedCurrency);
 const partial=!!(selected?.isPartial||prior?.isPartial);
 const tiles=selected?[
  {label:'Clientes activos',value:count(selected.clients.active),change:reportDelta(selected.clients.active,prior?.clients.active??null,partial)},
  {label:'Clientes incorporados',value:count(selected.clients.added),change:reportDelta(selected.clients.added,prior?.clients.added??null,partial)},
  {label:'Bajas de actividad',value:count(selected.clients.lost),change:reportDelta(selected.clients.lost,prior?.clients.lost??null,partial)},
  {label:'Retención',value:selected.clients.retentionPercent===null?'Sin datos':`${selected.clients.retentionPercent} %`,change:`Diferencia en puntos porcentuales / relativa: ${reportDelta(selected.clients.retentionPercent,prior?.clients.retentionPercent??null,partial)}`},
  {label:'Facturado · incluye impuestos',value:reportMoney(financial?.invoiced,selectedCurrency),change:reportDelta(financial?.invoiced??null,previousFinancial?.invoiced??null,partial)},
  {label:'Cobrado · neto de reversiones',value:reportMoney(financial?.collected,selectedCurrency),change:reportDelta(financial?.collected??null,previousFinancial?.collected??null,partial)},
  {label:'Ticket promedio por factura',value:reportMoney(financial?.averageTicket,selectedCurrency),change:reportDelta(financial?.averageTicket??null,previousFinancial?.averageTicket??null,partial)},
  {label:'Facturado promedio por cliente facturado',value:reportMoney(financial?.averageRevenuePerClient,selectedCurrency),change:reportDelta(financial?.averageRevenuePerClient??null,previousFinancial?.averageRevenuePerClient??null,partial)},
 ]:[];
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
    <div className="reports-distributions"><Distribution title="Tipos de clientes activos" total={selected.clients.active} rows={selected.clients.types.map(row=>({name:kinds[row.kind]||'Sin clasificar',count:row.count}))}/><Distribution title="Planes por cantidad de clientes activos" total={selected.clients.active} rows={selected.clients.plans.map(row=>({name:row.planId===null?'Sin plan registrado':row.name||'Plan sin nombre',count:row.count}))}/></div>
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
