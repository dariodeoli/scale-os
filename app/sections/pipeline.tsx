"use client";
import dynamic from 'next/dynamic';
import {CatalogWorkspace} from '../suite';
import type {MetricEvent,User} from '../workspace-types';
const LiveVisitors=dynamic(()=>import('../live-visitors').then(m=>m.LiveVisitors));
const GrowthDashboard=dynamic(()=>import('../growth-dashboard').then(m=>m.GrowthDashboard));

// Pipeline comercial.
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type PipelineSectionProps = {
  user: User | null;
  metrics: MetricEvent[];
};
export function PipelineSection({user, metrics}: PipelineSectionProps){
  return (
    <div className="ops-stack"><CatalogWorkspace key="leads" kind="leads" role={user?.role||'viewer'}/>{user&&<LiveVisitors organizationId={String(user.organization_id)} role={user.role} demo={!!user.demo_owner_user_id||user.organization_slug==='scale-demo-controles-20260908'}/>} {['owner','admin'].includes(user?.role||'')&&<GrowthDashboard events={metrics}/>}</div>
  );
}
