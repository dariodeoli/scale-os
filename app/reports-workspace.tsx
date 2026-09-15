'use client';
import {useEffect,useState} from 'react';
import {api} from './operations';
import {downloadReportsCsv} from './reports-csv';
import './reports-workspace.css';

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
const count=(value:number|null|undefined)=>value==null?'Sin datos':String(value);
function Distribution({title,rows,total}:{title:string;rows:{name:string;count:number}[];total:number|null}){
 return <section className="reports-distribution"><h3>{title}</h3><p>Porcentaje sobre todos los clientes activos, incluidos los no clasificados y sin plan.</p>{rows.length?<ul>{rows.map((row,index)=>{const share=total!==null&&total>0?row.count/total*100:null;return <li key={`${row.name}-${index}`}><span>{row.name}</span><strong>{row.count} · {share===null?'Sin porcentaje':`${share.toFixed(1).replace('.',',')} %`}</strong>{share!==null?<span className="reports-bar" aria-hidden="true"><span style={{width:`${Math.min(100,Math.max(0,share))}%`}}/></span>:null}</li>;})}</ul>:<p>Sin distribución registrada para este mes.</p>}</section>;
}
// Main must key this component by authenticated organization ID. Role changes
// unmount the authorized view; no GET is issued for an unauthorized role.
export function ReportsWorkspace({role}:{role:string}){return ['owner','admin','finance'].includes(role)?<ReportsPanel key={role}/>:<p>No tenés permiso para consultar reportes.</p>;}
function LiveVisitorsWidget(){
 const [visitors,setVisitors]=useState<number|null>(null),[prior,setPrior]=useState<number|null>(null),[trend,setTrend]=useState<'up'|'down'|null>(null);
 useEffect(()=>{
  let alive=true,timer:ReturnType<typeof setInterval>|null=null;
  const fetch_live=async()=>{
   try{const resp=await fetch('/core-api/api/public/live-visitors/count',{method:'GET',credentials:'omit',cache:'no-store',headers:{'Accept':'application/json'}});if(resp.ok&&alive){const data=await resp.json();if(typeof data?.active_sessions==='number'){const prev=visitors;setVisitors(data.active_sessions);if(prev!==null&&prev!==data.active_sessions){setPrior(prev);setTrend(data.active_sessions>prev?'up':'down');}else if(prior===null)setPrior(data.active_sessions);}}}catch{}
  };
  void fetch_live();
  timer=setInterval(fetch_live,30000);
  return()=>{alive=false;if(timer)clearInterval(timer);};
 },[visitors,prior]);
 const changePercent=prior&&visitors&&prior!==0?Math.round(((visitors-prior)/prior)*100):null;
 return <article className="reports-tiles" style={{gridTemplateColumns:'1fr',marginBottom:'20px'}} role="region" aria-label="Visitantes en vivo del landing">
  <article style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px'}}>
   <div>
    <h3 style={{marginBottom:'6px'}}>Visitantes en vivo</h3>
    <p style={{margin:0,fontSize:'13px',color:'var(--text-muted,var(--muted,#6f6474))'}}>Personas actualmente en el landing de Scale OS</p>
   </div>
   <div style={{textAlign:'right'}}>
    <strong style={{fontSize:'28px',display:'block',color:'#14d981',fontVariantNumeric:'tabular-nums'}}>{visitors===null?'—':visitors}</strong>
    <span style={{fontSize:'11px',color:'#14d981',display:'inline-flex',alignItems:'center',gap:'4px'}}>
     ●
     {trend==='up'&&changePercent!==null?<span style={{color:'#14d981'}}>↑ +{changePercent}%</span>:trend==='down'&&changePercent!==null?<span style={{color:'#f97316'}}>↓ {changePercent}%</span>:<span>—</span>}
    </span>
   </div>
  </article>
 </article>;
}
function ReportsPanel(){
 const [month,setMonth]=useState(currentMonth),[months,setMonths]=useState(12),[currency,setCurrency]=useState('');
 const [result,setResult]=useState<{key:string;data:ReportsData}|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [exportError,setExportError]=useState('');
 const queryKey=`${month}:${months}:${retry}`;
 useEffect(()=>{
  let alive=true;setResult(null);setError('');setExportError('');
  void api<ReportsData>(`/api/agency/reports?month=${month}&months=${months}`).then(data=>{
   if(!data||data.month!==month||!Array.isArray(data.months))throw Error('La respuesta del reporte no corresponde al mes solicitado.');
   if(alive)setResult({key:queryKey,data});
  }).catch(e=>{if(alive)setError(e instanceof Error?e.message:'No se pudo cargar el reporte.');});
  return()=>{alive=false;};
 },[month,months,retry,queryKey]);
 const data=result?.key===queryKey?result.data:null;
 const rows=data?.months.slice().sort((a,b)=>a.month.localeCompare(b.month))||[];
 const currencies=Array.from(new Set(rows.flatMap(row=>row.financial.map(item=>item.currency)))).sort();
 const selectedCurrency=currencies.includes(currency)?currency:currencies[0]||'';
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
   <label>Histórico<select value={months} onChange={e=>{const value=Number(e.target.value);if([6,12,24].includes(value))setMonths(value);}}>{[6,12,24].map(value=><option key={value} value={value}>Últimos {value} meses</option>)}</select></label>
   <label>Moneda<select value={selectedCurrency} disabled={!currencies.length} onChange={e=>setCurrency(e.target.value)}>{currencies.length?currencies.map(value=><option key={value}>{value}</option>):<option value="">Sin datos monetarios</option>}</select></label>
  </div>
  {error?<div role="alert" className="reports-error"><p>{error}</p><button type="button" onClick={()=>setRetry(value=>value+1)}>Reintentar</button></div>:!data?<p role="status">Cargando reportes…</p>:<>
   <p className="reports-note">Datos al {reportDate(data.asOf,true)} (hora de Asunción). Histórico confiable desde: {reportDate(data.historySince)}.</p>
   <div><button type="button" disabled={!rows.length} onClick={()=>{
    if(!data||!rows.length)return;
    setExportError('');
    try{downloadReportsCsv(data,selectedCurrency);}catch{setExportError('No se pudo descargar el CSV. Intentá nuevamente.');}
   }}>Exportar histórico CSV{selectedCurrency?` · ${selectedCurrency}`:''}</button></div>
   <p className="reports-note">Exporta los meses cargados de la moneda seleccionada. CSV UTF-8, separado por punto y coma; decimales con punto, sin separador de miles. Celdas vacías: sin datos. Para conservar todos los dígitos, importá los importes como texto en tu planilla.</p>
   {exportError?<p role="alert">{exportError}</p>:null}
   {partial?<p role="status" className="reports-warning">Mes en curso o cobertura incompleta en el mes seleccionado o anterior; no comparar como meses completos. Se omite la comparación mensual.</p>:null}
   {!selected?<p>Sin datos para el mes seleccionado.</p>:<>
    <div className="reports-tiles">{tiles.map(tile=><article key={tile.label}><h3>{tile.label}</h3><strong>{tile.value}</strong><p>{tile.change}</p></article>)}</div>
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
