"use client";
import dynamic from 'next/dynamic';
import {useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {formatoNumero} from 'owncoding-ui/utils';
import type {MetricEvent,User} from '../workspace-types';
import {EmptyBlock,EmptyCta,ErrorBlock,FilterToolbar,Kpi,KpiStrip,ListPage,SectionLoading} from '../ui-v2';
import {SelectCustom} from '../profile-controls';
import {GROWTH_PERIODS,growthSeries} from '../growth-dashboard-data';
const GrowthDashboard=dynamic(()=>import('../growth-dashboard').then(m=>m.GrowthDashboard),{loading:()=> <SectionLoading label="Cargando métricas…"/>});

// Métricas y crecimiento (SOS-COM, campaña #41 / spec #43 §3).
// Rediseño v2: página de lista (`ListPage`) con el período en la `FilterToolbar`
// y los totales reales en un `KpiStrip`; la serie diaria y los datos del período
// viven en app/growth-dashboard.tsx. Acá también se resuelve el acceso y los
// cuatro estados reales (cargando / vacío con acción / error con reintento / lleno).
export type MetricsState = 'idle' | 'loading' | 'ready' | 'error';
type MetricasSectionProps = {
  user: User | null;
  metrics: MetricEvent[];
  state?: MetricsState;
  error?: string;
  onRetry?: () => void;
};
export function MetricasSection({user, metrics, state = 'ready', error = '', onRetry}: MetricasSectionProps){
  const [days,setDays]=useState(30);
  if(!['owner','admin'].includes(user?.role||'')) return null;
  const loaded=metrics.length>0;
  const loading=(state==='loading'||state==='idle')&&!loaded;
  const {metrics:totals}=growthSeries(metrics,days);
  return (
    <ListPage
      aria-label="Métricas y crecimiento"
      eyebrow="Captación digital"
      toolbar={loaded ? <FilterToolbar className="mb-0">
        <div className="w-full sm:w-52"><SelectCustom label="Período" choices={GROWTH_PERIODS} value={String(days)} onChange={value=>setDays(Number(value))}/></div>
      </FilterToolbar> : undefined}
      kpis={loaded ? <KpiStrip aria-label="Métricas de crecimiento" className="xl:!grid-cols-3">
        {totals.map(({name,label,current,variation},index)=><Kpi key={name} label={label} valor={formatoNumero(current)} destacado={index===0} hint={variation===null?'Sin base anterior':`${variation>0?'+':''}${formatoNumero(variation,{decimales:1})} % vs. período anterior`}/>)}
      </KpiStrip> : undefined}
    >
      {loading ? <SectionLoading label="Cargando métricas…"/> : null}
      {state==='error' && loaded ? (
        <ErrorBlock title="No se pudieron actualizar las métricas." description="Se muestra la última lectura real; reintentá para refrescar." onRetry={onRetry}/>
      ) : null}
      {state==='error' && !loaded ? (
        <ErrorBlock title="No se pudieron cargar las métricas." description={error||'Revisá la conexión y volvé a intentar; no se inventan totales.'} onRetry={onRetry}/>
      ) : null}
      {loaded ? <GrowthDashboard events={metrics} days={days}/> : state==='ready' ? (
        <EmptyBlock
          icon="chart"
          title="Todavía no hay eventos de captación."
          description="El período se calcula con los eventos reales del sitio (páginas vistas, vistas desde móvil y clics en WhatsApp). Cuando llegue el primer evento vas a ver el total, la variación y la evolución diaria."
          action={onRetry?<EmptyCta label="Volver a consultar" onClick={onRetry} icon={<RefreshCw aria-hidden="true" size={16}/>}/>:undefined}
        />
      ) : null}
    </ListPage>
  );
}
