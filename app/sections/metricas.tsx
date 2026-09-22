"use client";
import dynamic from 'next/dynamic';
import type {MetricEvent,User} from '../workspace-types';
const GrowthDashboard=dynamic(()=>import('../growth-dashboard').then(m=>m.GrowthDashboard));

// Métricas y crecimiento.
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type MetricasSectionProps = {
  user: User | null;
  metrics: MetricEvent[];
};
export function MetricasSection({user, metrics}: MetricasSectionProps){
  return (
    ['owner','admin'].includes(user?.role||'')&&<div className="ops-stack"><GrowthDashboard events={metrics}/></div>
  );
}
