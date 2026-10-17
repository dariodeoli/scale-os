"use client";
import {CardSurface as Card} from './ui/surface';
import {DataTable} from './ui/collection';
import {Note as Nota} from './ui/notice';

// Rediseño v2 (campaña #41 / spec #43 §3): serie con barras Tailwind y datos
// diarios con `DataTable` (tabla en escritorio, tarjetas en móvil). La lógica vive en ./growth-dashboard-data.
import {fechaListaCorta} from 'owncoding-ui';
import {growthSeries,type GrowthEvent} from './growth-dashboard-data';
// La lógica de datos vive en ./growth-dashboard-data (funciones puras); se
// reexporta para no romper imports existentes.
export type {GrowthEvent} from './growth-dashboard-data';
export {growthSeries,growthWindow,growthSum,growthVariation,metricSeries} from './growth-dashboard-data';

// El período y los KPIs viven en la página (`MetricasSection`: FilterToolbar +
// KpiStrip); acá queda la serie diaria y los datos del período elegido.
export function GrowthDashboard({events,days=30}:{events:GrowthEvent[];days?:number}){
 const {sum,points}=growthSeries(events,days),max=Math.max(1,...points.map(point=>point.count));
 return <Card className="grid gap-4">
  <section aria-labelledby="growth-evolution">
   <h3 id="growth-evolution" className="m-0 text-sm font-bold text-fore">Evolución diaria · páginas vistas</h3>
   {/* La serie de 30 días conserva el gráfico propio: `GraficoBarras` de la
       librería rotula cada barra y anima la altura sin `motion-reduce` (#75). */}
   <div role="img" aria-label={`Páginas vistas durante ${days} días. ${sum('page_view')} en total.`} className="mt-2 flex h-32 items-end gap-[3px] rounded-t-lg border border-b-ink-500 border-ink-600 bg-ink-900 px-2 pt-2">
    {points.map(point=><div key={point.day} className="min-w-0 flex-1 rounded-t bg-fono transition motion-reduce:transition-none hover:brightness-110" style={{height:`${Math.max(1,point.count/max*100)}%`}} title={`${point.day}: ${point.count} vistas`}/>)}
   </div>
   <div className="mt-1 flex justify-between gap-2 text-[11px] tabular-nums text-mute"><span>{fechaListaCorta(points[0]?.day,'')}</span><span>{fechaListaCorta(points.at(-1)?.day,'')}</span></div>
  </section>
  <Nota tono="info" compact>Son eventos registrados, no personas únicas ni usuarios conectados. Las vistas móviles no se suman al total de páginas. Las comprobaciones de despliegue quedan excluidas.</Nota>
  <details className="text-sm text-fore">
   <summary className="cursor-pointer font-semibold">Ver datos diarios</summary>
   <div className="mt-2">
    <DataTable
     columns={[{key:'day',label:'Fecha'},{key:'count',label:'Páginas vistas',align:'right'}]}
     rows={points.map(point=>({id:point.day,day:fechaListaCorta(point.day),count:point.count}))}
     emptyLabel="Sin datos diarios para el período."
     mobileCard={(row: {day: string; count: number})=><div className="flex items-center justify-between gap-3 rounded-lg border border-ink-600 p-3"><span className="font-mono text-[11px] font-semibold text-mute">{row.day}</span><strong className="tabular-nums text-fore">{row.count}</strong></div>}
    />
   </div>
  </details>
 </Card>;
}
