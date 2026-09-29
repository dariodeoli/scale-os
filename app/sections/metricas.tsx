"use client";
import dynamic from 'next/dynamic';
import {RefreshCw} from 'lucide-react';
import type {MetricEvent,User} from '../workspace-types';
import {EmptyBlock,EmptyCta,ErrorBlock,SectionLoading} from '../ui-v2';
const GrowthDashboard=dynamic(()=>import('../growth-dashboard').then(m=>m.GrowthDashboard),{loading:()=> <SectionLoading label="Cargando métricas…"/>});

// Métricas y crecimiento (SOS-COM, campaña #41 / spec #43 §3).
// Rediseño v2: el tablero vive en app/growth-dashboard.tsx (KPIs, serie diaria y
// datos del período); acá se resuelve el acceso y los cuatro estados reales
// (cargando / vacío con acción / error con reintento / lleno).
export type MetricsState = 'idle' | 'loading' | 'ready' | 'error';
type MetricasSectionProps = {
  user: User | null;
  metrics: MetricEvent[];
  state?: MetricsState;
  error?: string;
  onRetry?: () => void;
};
export function MetricasSection({user, metrics, state = 'ready', error = '', onRetry}: MetricasSectionProps){
  if(!['owner','admin'].includes(user?.role||'')) return null;
  const loaded=metrics.length>0;
  const loading=(state==='loading'||state==='idle')&&!loaded;
  return (
    <section className="grid gap-4" aria-label="Métricas y crecimiento">
      {loading ? <SectionLoading label="Cargando métricas…"/> : null}
      {state==='error' && loaded ? (
        <ErrorBlock title="No se pudieron actualizar las métricas." description="Se muestra la última lectura real; reintentá para refrescar." onRetry={onRetry}/>
      ) : null}
      {state==='error' && !loaded ? (
        <ErrorBlock title="No se pudieron cargar las métricas." description={error||'Revisá la conexión y volvé a intentar; no se inventan totales.'} onRetry={onRetry}/>
      ) : null}
      {loaded ? <GrowthDashboard events={metrics}/> : state==='ready' ? (
        <EmptyBlock
          icon="chart"
          title="Todavía no hay eventos de captación."
          description="El período se calcula con los eventos reales del sitio (páginas vistas, vistas desde móvil y clics en WhatsApp). Cuando llegue el primer evento vas a ver el total, la variación y la evolución diaria."
          action={onRetry?<EmptyCta label="Volver a consultar" onClick={onRetry} icon={<RefreshCw aria-hidden="true" size={16}/>}/>:undefined}
        />
      ) : null}
    </section>
  );
}
