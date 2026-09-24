"use client";
// Rediseño v2 (campaña #41 / spec #43 §3): KPIs con `Stat`, serie con barras
// Tailwind y datos diarios con `DataTable` (tabla en escritorio, tarjetas en
// móvil). La lógica vive en ./growth-dashboard-data.
import {useState} from 'react';
import {Card,DataTable,Nota,Select,Stat} from 'owncoding-ui';
import {growthSeries,type GrowthEvent} from './growth-dashboard-data';
// La lógica de datos vive en ./growth-dashboard-data (funciones puras); se
// reexporta para no romper imports existentes.
export type {GrowthEvent} from './growth-dashboard-data';
export {growthSeries,growthWindow,growthSum,growthVariation,metricSeries} from './growth-dashboard-data';

const PERIODS=[{value:'7',label:'Últimos 7 días'},{value:'30',label:'Últimos 30 días'},{value:'90',label:'Últimos 90 días'}];

export function GrowthDashboard({events}:{events:GrowthEvent[]}){
 const [days,setDays]=useState(30),{sum,points,metrics}=growthSeries(events,days),max=Math.max(1,...points.map(point=>point.count));
 return <Card className="grid gap-4">
  <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
   <div className="min-w-0">
    <p className="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Captación digital</p>
    <h2 className="mt-1 text-[17px] font-bold tracking-tight text-fore">Visitas y crecimiento</h2>
   </div>
   <label className="flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-mute">
    Período
    <Select aria-label="Período" className="w-44" value={String(days)} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>setDays(Number(event.target.value))}>
     {PERIODS.map(period=><option key={period.value} value={period.value}>{period.label}</option>)}
    </Select>
   </label>
  </header>
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
   {metrics.map(({name,label,current,variation})=><Stat key={name} label={label} valor={current.toLocaleString('es-PY')} delta={variation??undefined} sub={variation===null?'Sin base anterior':'vs. período anterior'}/>)}
  </div>
  <section aria-labelledby="growth-evolution">
   <h3 id="growth-evolution" className="text-sm font-bold text-fore">Evolución diaria · páginas vistas</h3>
   <div role="img" aria-label={`Páginas vistas durante ${days} días. ${sum('page_view')} en total.`} className="mt-2 flex h-40 items-end gap-[3px] rounded-t-lg border border-b-ink-500 border-ink-600 bg-ink-900 px-2 pt-2">
    {points.map(point=><div key={point.day} className="min-w-0 flex-1 rounded-t bg-fono transition hover:brightness-110" style={{height:`${Math.max(1,point.count/max*100)}%`}} title={`${point.day}: ${point.count} vistas`}/>)}
   </div>
   <div className="mt-1 flex justify-between gap-2 text-[11px] tabular-nums text-mute"><span>{points[0]?.day}</span><span>{points.at(-1)?.day}</span></div>
  </section>
  <Nota tono="info" compact>Son eventos registrados, no personas únicas ni usuarios conectados. Las vistas móviles no se suman al total de páginas. Las comprobaciones de despliegue quedan excluidas.</Nota>
  <details className="text-sm text-fore">
   <summary className="cursor-pointer font-semibold">Ver datos diarios</summary>
   <div className="mt-2">
    <DataTable
     columns={[{key:'day',label:'Fecha'},{key:'count',label:'Páginas vistas',align:'right'}]}
     rows={points.map(point=>({id:point.day,day:point.day,count:point.count}))}
     emptyLabel="Sin datos diarios para el período."
     mobileCard={(row: {day: string; count: number})=><div className="flex items-center justify-between gap-3 rounded-lg border border-ink-600 p-3"><span className="font-mono text-[11px] font-semibold text-mute">{row.day}</span><strong className="tabular-nums text-fore">{row.count}</strong></div>}
    />
   </div>
  </details>
 </Card>;
}
