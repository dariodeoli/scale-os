"use client";
import dynamic from 'next/dynamic';
import type {User} from '../workspace-types';
const ReportsWorkspace=dynamic(()=>import('../reports-workspace').then(m=>m.ReportsWorkspace));

// Informes mensuales.
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type InformesSectionProps = {
  user: User | null;
};
export function InformesSection({user}: InformesSectionProps){
  return (
    <ReportsWorkspace key={user?.organization_id} role={user?.role||'viewer'} organizationName={user?.organization_name||''}/>
  );
}
