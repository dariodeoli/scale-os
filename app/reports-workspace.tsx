'use client';
import {useEffect,useState,type ChangeEvent} from 'react';
import {downloadReportsCsv} from './reports-csv';
import {WeeklyAutomatic} from './weekly-automatic';
import {SelectCustom} from './profile-controls';
import {listDateFull,listDateShort} from './list-format';
import {printReportsPdf} from './reports-print';
import {
  biggestDecimal,
  chartBarPercent,
  chartSeries,
  count,
  currentMonth,
  distributionShare,
  hasMonthData,
  monthLabel,
  previousMonth,
  printed,
  reportComparison,
  reportCurrencies,
  reportKindLabel,
  reportMoney,
  reportTiles,
  validMonth,
  type Decimal,
  type ReportMonth,
  type ReportsData,
} from './reports-data';
import {useReportsWindow} from './use-reports';
import {
  Aviso,
  BarraProgreso,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  FilaDato,
  FormField,
  Input,
  Nota,
  SegmentedField,
  cn,
} from 'owncoding-ui';
import {Kpi,KpiStrip,LoadingBlock,PageHeader} from './ui-v2';

// La descomposición del shell (#47) sigue importando el tipo desde este módulo.
export type {ReportMonth, ReportsData} from './reports-data';

const HISTORY_OPTIONS: [string, string][] = [[6, 'Últimos 6 meses'], [12, 'Últimos 12 meses'], [24, 'Últimos 24 meses']].map(([value, label]) => [String(value), String(label)]);

function ReportsChart({months,currency}:{months:ReportMonth[];currency:string}){
 const series=chartSeries(months,currency);
 if(!currency||!series.length)return null;
 const biggest=biggestDecimal(series);
 const heightOf=(value:Decimal|null)=>chartBarPercent(value,biggest);
 return <div className="reports-chart overflow-x-auto" role="img" aria-label={`Facturado y cobrado mensual en ${currency}`}>
  <div className="flex min-w-full items-end gap-2 pb-1">
   {series.map(row=><figure className="flex min-w-10 flex-1 flex-col items-center gap-1.5" key={row.month}>
    <div className="flex h-[120px] items-end justify-center gap-[3px]">
     <span className={cn('w-2.5 rounded-t bg-fono-light',row.partial&&'opacity-50')} title={`${listDateShort(`${row.month}-01`)} · Facturado ${row.invoiced?`${currency} ${printed(row.invoiced.units,row.invoiced.scale)}`:'sin datos'}`} style={{height:`${heightOf(row.invoiced)}%`}}/>
     <span className={cn('w-2.5 rounded-t bg-ok',row.partial&&'opacity-50')} title={`${listDateShort(`${row.month}-01`)} · Cobrado ${row.collected?`${currency} ${printed(row.collected.units,row.collected.scale)}`:'sin datos'}`} style={{height:`${heightOf(row.collected)}%`}}/>
    </div>
    <figcaption className="whitespace-nowrap text-[10px] text-mute">{listDateShort(`${row.month}-01`)}{row.partial?' · parcial':''}</figcaption>
   </figure>)}
  </div>
 </div>;
}
function Distribution({title,rows,total}:{title:string;rows:{name:string;count:number}[];total:number|null}){
 return <div className="grid gap-2">
  <h4 className="text-[15px] font-semibold tracking-tight text-fore">{title}</h4>
  <p className="text-xs text-mute">Porcentaje sobre todos los clientes activos, incluidos los no clasificados y sin plan.</p>
  {rows.length?<ul className="grid gap-2">{rows.map((row,index)=>{const share=distributionShare(row.count,total);return <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-xs" key={`${row.name}-${index}`}>
   <span className="min-w-0 text-fore">{row.name}</span>
   <strong className="whitespace-nowrap tabular-nums text-fore">{row.count} · {share===null?'Sin porcentaje':`${share.toFixed(1).replace('.',',')} %`}</strong>
   {share!==null?<BarraProgreso className="col-span-2" valor={share} max={100} alto="sm" etiqueta={`${row.name}: ${share.toFixed(1)} %`}/>:null}
  </li>;})}</ul>:<EmptyState compact title="Sin distribución registrada para este mes."/>}
 </div>;
}
// Main must key this component by authenticated organization ID. Role changes
// unmount the authorized view; no GET is issued for an unauthorized role.
export function ReportsWorkspace({role,organizationName}:{role:string;organizationName:string}){return ['owner','admin','finance','sales'].includes(role)?<><ReportsPanel key={role} organizationName={organizationName}/><WeeklyAutomatic role={role}/></>:<p className="text-sm text-mute">No tenés permiso para consultar reportes.</p>;}
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
 return <Card className="flex flex-wrap items-center justify-between gap-4" role="region" aria-label="Visitantes en vivo del landing">
  <div className="grid gap-1">
   <h3 className="text-[17px] font-semibold tracking-tight text-fore">Visitantes en vivo</h3>
   <p className="text-xs text-mute">Personas actualmente en el landing de Scale OS</p>
  </div>
  <div className="text-right">
   <strong className="block text-2xl font-semibold tabular-nums text-ok">{visitors===null?'—':visitors}</strong>
   <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-xs',trend==='down'?'text-warn':'text-ok')}>
    <span className={cn('h-2 w-2 rounded-full',trend==='down'?'bg-warn':'bg-ok')} aria-hidden="true"/>
    {trend==='up'&&changePercent!==null?`↑ +${changePercent}%`:trend==='down'&&changePercent!==null?`↓ ${changePercent}%`:'—'}
   </span>
  </div>
 </Card>;
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
 return <section className="grid gap-4" aria-label="Reportes de la agencia">
  <PageHeader eyebrow="Informes" title="Evolución mensual" subtitle="Importes registrados, no utilidad ni rentabilidad. Las monedas se consultan por separado."/>
  <LiveVisitorsWidget/>
  <div className="flex flex-wrap items-end gap-3">
   <FormField label="Mes a consultar"><Input type="month" className="w-44" value={month} min="1900-01" max={currentMonth()} onChange={(e:ChangeEvent<HTMLInputElement>)=>{if(validMonth((e.target as HTMLInputElement).value)&&(e.target as HTMLInputElement).value<=currentMonth())setMonth((e.target as HTMLInputElement).value);}}/></FormField>
   <div className="grid gap-1.5">
    <span className="text-[11px] font-medium uppercase tracking-wider text-mute">Histórico</span>
    <SegmentedField className="[&>button]:min-h-11 md:[&>button]:min-h-8" ariaLabel="Meses de histórico" value={String(months)} options={HISTORY_OPTIONS} onChange={(value:string)=>{const monthsValue=Number(value);if([6,12,24].includes(monthsValue))setMonths(monthsValue);}}/>
   </div>
   <div className="w-40"><SelectCustom label="Moneda" choices={currencies.length?currencies.map(value=>({value,label:value})):[{value:'',label:'Sin datos monetarios'}]} value={selectedCurrency} disabled={!currencies.length} onChange={setCurrency}/></div>
  </div>
  {error?<ErrorState title="No se pudo cargar el reporte" description={error} onRetry={()=>setRetry(value=>value+1)}/>
  :!data?<LoadingBlock label="Cargando reportes…" lines={4}/>
  :<>
   <Nota tono="neutro">Datos al {listDateFull(data.asOf)||'sin fecha confirmada'} (hora de Asunción). Histórico confiable desde: {listDateFull(data.historySince)||'sin fecha confirmada'}.</Nota>
   <div className="flex flex-wrap gap-2">
    <Button variant="outline" disabled={!rows.length} onClick={()=>{
     if(!rows.length)return;
     setExportError('');
     try{downloadReportsCsv(data,selectedCurrency);}catch{setExportError('No se pudo descargar el CSV. Intentá nuevamente.');}
    }}>Exportar histórico CSV{selectedCurrency?` · ${selectedCurrency}`:''}</Button>
    <Button variant="outline" disabled={!rows.length} onClick={()=>{
     if(!rows.length)return;
     setExportError('');
     try{printReportsPdf({data,previousData,currency:selectedCurrency,organizationName});}catch{setExportError('No se pudo exportar el PDF. Intentá nuevamente.');}
    }}>Exportar PDF{selectedCurrency?` · ${selectedCurrency}`:''}</Button>
   </div>
   <p className="text-xs text-mute">Exporta los meses cargados de la moneda seleccionada. CSV UTF-8, separado por punto y coma; decimales con punto, sin separador de miles. Celdas vacías: sin datos. Para conservar todos los dígitos, importá los importes como texto en tu planilla.</p>
   {exportError?<Aviso tono="error">{exportError}</Aviso>:null}
   {partial?<Nota tono="warn">Mes en curso o cobertura incompleta en el mes seleccionado o anterior; no comparar como meses completos. Se omite la comparación mensual.</Nota>:null}
   {rows.length?<Card className="grid gap-3 p-4">
    <h3 className="text-[17px] font-semibold tracking-tight text-fore">Comparativa del período visible contra el anterior</h3>
    <p className="text-xs text-mute">Período visible: {monthLabel(comparison!.currentStart)} – {monthLabel(comparison!.currentEnd)} · período anterior: {comparison!.previousStart&&comparison!.previousEnd?`${monthLabel(comparison!.previousStart)} – ${monthLabel(comparison!.previousEnd)}`:'sin período anterior disponible'} ({months} meses por período).</p>
    {comparison!.available?<DataTable
     columns={[{key:'label',label:'Métrica'},{key:'current',label:'Período visible'},{key:'previous',label:'Período anterior'},{key:'change',label:'Variación'}]}
     rows={comparison!.rows.map((row,index)=>({id:String(index),label:row.label,current:row.current,previous:row.previous,change:row.change}))}
     mobileCard={(row:{id:string;label:string;current:string;previous:string;change:string})=><div className="grid gap-1 rounded-lg border border-ink-600 bg-ink-900 p-3">
      <b className="text-sm font-semibold text-fore">{row.label}</b>
      <FilaDato etiqueta="Período visible" valor={row.current}/>
      <FilaDato etiqueta="Período anterior" valor={row.previous}/>
      <FilaDato etiqueta="Variación" valor={row.change}/>
     </div>}
    />:<EmptyState compact title="Sin comparación: no hay período anterior con datos."/>}
   </Card>:null}
   {!selected?<EmptyState compact title="Sin datos para el mes seleccionado."/>:<>
    <KpiStrip>{tiles.map(tile=><Kpi key={tile.label} label={tile.label} valor={tile.value} hint={tile.change}/>)}</KpiStrip>
    <ReportsChart months={chartMonths} currency={selectedCurrency}/>
    <p className="text-xs text-mute">Barras: facturado (violeta) y cobrado (verde) por mes, en la moneda seleccionada. Los meses parciales se atenúan; la escala es relativa al valor máximo cargado, sin mezclar monedas.</p>
    <p className="text-sm text-fore">Antigüedad promedio de clientes activos: <strong className="tabular-nums">{count(selected.clients.averageTenureDays)}{selected.clients.averageTenureDays===null?'':' días'}</strong>. Fechas conocidas: {selected.clients.tenureKnown} de {count(selected.clients.active)} clientes activos. Las fechas desconocidas se excluyen del promedio.</p>
    <p className="text-xs text-mute">Bajas de actividad: clientes que dejaron de estar activos por pausa, cancelación o archivo, incluso si se reactivaron durante el mismo mes. No implica una pérdida definitiva.</p>
    <div className="grid gap-4 lg:grid-cols-2">
     <Card><Distribution title="Tipos de clientes activos" total={selected.clients.active} rows={selected.clients.types.map(row=>({name:reportKindLabel(row.kind),count:row.count}))}/></Card>
     <Card><Distribution title="Planes por cantidad de clientes activos" total={selected.clients.active} rows={selected.clients.plans.map(row=>({name:row.planId===null?'Sin plan registrado':row.name||'Plan sin nombre',count:row.count}))}/></Card>
    </div>
    <p className="text-xs text-mute">La distribución de planes muestra clientes activos, no nuevas contrataciones. “Sin clasificar” y “Sin plan registrado” identifican datos desconocidos, no categorías supuestas.</p>
   </>}
   <div className="grid gap-2">
    <p className="text-sm font-semibold text-fore">Evolución mensual · {selectedCurrency||'sin moneda disponible'}</p>
    <p className="text-xs text-mute">“Sin datos” no significa cero.</p>
    <DataTable
     columns={[
      {key:'month',label:'Mes',render:(row:{month:string})=><span className="whitespace-nowrap">{row.month}</span>},
      {key:'active',label:'Activos',align:'right'},
      {key:'added',label:'Incorporados',align:'right'},
      {key:'lost',label:'Bajas de actividad',align:'right'},
      {key:'retention',label:'Retención %',align:'right'},
      {key:'tenure',label:'Antigüedad (días)',align:'right'},
      {key:'tenureKnown',label:'Fechas conocidas',align:'right'},
      {key:'invoiced',label:'Facturado con impuestos',align:'right'},
      {key:'collected',label:'Cobrado neto',align:'right'},
      {key:'invoices',label:'Facturas',align:'right'},
      {key:'billed',label:'Clientes facturados',align:'right'},
      {key:'ticket',label:'Ticket por factura',align:'right'},
      {key:'average',label:'Promedio por cliente facturado',align:'right'},
     ]}
     rows={rows.map(row=>{const money=row.financial.find(item=>item.currency===selectedCurrency);return {
      id:row.month,
      month:row.month+(row.isPartial?' · parcial':''),
      active:count(row.clients.active),
      added:count(row.clients.added),
      lost:count(row.clients.lost),
      retention:count(row.clients.retentionPercent),
      tenure:count(row.clients.averageTenureDays),
      tenureKnown:String(row.clients.tenureKnown),
      invoiced:reportMoney(money?.invoiced,selectedCurrency),
      collected:reportMoney(money?.collected,selectedCurrency),
      invoices:count(money?.invoiceCount),
      billed:count(money?.billedClients),
      ticket:reportMoney(money?.averageTicket,selectedCurrency),
      average:reportMoney(money?.averageRevenuePerClient,selectedCurrency),
     };})}
     emptyLabel="Sin meses registrados."
     mobileCard={(row:any)=><div className="grid gap-1 rounded-lg border border-ink-600 bg-ink-900 p-3">
      <b className="text-sm font-semibold text-fore">{row.month}</b>
      <FilaDato etiqueta="Activos" valor={row.active}/>
      <FilaDato etiqueta="Incorporados" valor={row.added}/>
      <FilaDato etiqueta="Bajas de actividad" valor={row.lost}/>
      <FilaDato etiqueta="Retención %" valor={row.retention}/>
      <FilaDato etiqueta="Antigüedad (días)" valor={row.tenure}/>
      <FilaDato etiqueta="Fechas conocidas" valor={row.tenureKnown}/>
      <FilaDato etiqueta="Facturado con impuestos" valor={row.invoiced}/>
      <FilaDato etiqueta="Cobrado neto" valor={row.collected}/>
      <FilaDato etiqueta="Facturas" valor={row.invoices}/>
      <FilaDato etiqueta="Clientes facturados" valor={row.billed}/>
      <FilaDato etiqueta="Ticket por factura" valor={row.ticket}/>
      <FilaDato etiqueta="Promedio por cliente facturado" valor={row.average}/>
     </div>}
    />
   </div>
   <p className="text-xs text-mute">Comparaciones contra el mes calendario anterior: diferencia absoluta y variación porcentual sobre el valor absoluto anterior. Sin porcentaje cuando la base es cero; sin comparación si falta información o alguno de los meses es parcial. La antigüedad usa solo fechas de inicio conocidas.</p>
  </>}
 </section>;
}
