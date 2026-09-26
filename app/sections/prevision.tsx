"use client";
import dynamic from 'next/dynamic';
import {SectionLoading} from '../ui-v2';
import type {User} from '../workspace-types';
const FinancialForecast=dynamic(()=>import('../financial-forecast').then(m=>m.FinancialForecast),{loading:()=> <SectionLoading label="Cargando la previsión…"/>});

// Previsión financiera.
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX.
// `navigate`/`onCreateInvoice` (ronda 14, #62) dan salida a los estados vacíos:
// ver clientes o equipo y registrar la primera factura sin duplicar modales.
type PrevisionSectionProps = {
  user: User | null;
  navigate?: (label: string) => void;
  onCreateInvoice?: () => void;
};
export function PrevisionSection({user,navigate,onCreateInvoice}: PrevisionSectionProps){
  return (
    user&&<FinancialForecast role={user.role} organizationId={user.organization_id} navigate={navigate} onCreateInvoice={onCreateInvoice}/>
  );
}
