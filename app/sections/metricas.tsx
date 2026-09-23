"use client";
import dynamic from 'next/dynamic';
import type {MetricEvent,User} from '../workspace-types';
import {EmptyBlock} from '../ui-v2';
const GrowthDashboard=dynamic(()=>import('../growth-dashboard').then(m=>m.GrowthDashboard));

// Métricas y crecimiento (SOS-COM, campaña #41 / spec #43 §3).
// Rediseño v2: el tablero vive en app/growth-dashboard.tsx (KPIs, serie diaria y
// datos del período); acá se resuelve el acceso y el estado sin eventos.
type MetricasSectionProps = {
  user: User | null;
  metrics: MetricEvent[];
};
export function MetricasSection({user, metrics}: MetricasSectionProps){
  if(!['owner','admin'].includes(user?.role||'')) return null;
  return (
    <section className="grid gap-4" aria-label="Métricas y crecimiento">
      {metrics.length ? <GrowthDashboard events={metrics}/> : (
        <EmptyBlock
          icon="chart"
          title="Todavía no hay eventos de captación."
          description="El período se calcula con los eventos reales del sitio (páginas vistas, vistas desde móvil y clics en WhatsApp). Cuando llegue el primer evento vas a ver el total, la variación y la evolución diaria."
        />
      )}
    </section>
  );
}
