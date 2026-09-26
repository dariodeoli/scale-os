"use client";
import dynamic from 'next/dynamic';
import {SectionLoading} from '../ui-v2';
import type {User} from '../workspace-types';
const ReportsWorkspace=dynamic(()=>import('../reports-workspace').then(m=>m.ReportsWorkspace),{loading:()=> <SectionLoading label="Cargando informes…"/>});

// Informes mensuales.
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX.
// `onCreateInvoice` (ronda 14, #62) da salida a los estados vacíos sin duplicar
// el modal de factura: el shell navega a Finanzas y abre el alta.
type InformesSectionProps = {
  user: User | null;
  onCreateInvoice?: () => void;
};
export function InformesSection({user,onCreateInvoice}: InformesSectionProps){
  return (
    <ReportsWorkspace key={user?.organization_id} role={user?.role||'viewer'} organizationName={user?.organization_name||''} onCreateInvoice={onCreateInvoice}/>
  );
}
