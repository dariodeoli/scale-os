"use client";
import dynamic from 'next/dynamic';
import type {User} from '../workspace-types';
const FinancialForecast=dynamic(()=>import('../financial-forecast').then(m=>m.FinancialForecast));

// Previsión financiera.
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type PrevisionSectionProps = {
  user: User | null;
};
export function PrevisionSection({user}: PrevisionSectionProps){
  return (
    user&&<FinancialForecast role={user.role} organizationId={user.organization_id}/>
  );
}
