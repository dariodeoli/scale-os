"use client";
import dynamic from 'next/dynamic';
import type {User} from '../workspace-types';
const OperationsWorkspace=dynamic(()=>import('../operations').then(m=>m.OperationsWorkspace));

// Comisiones y referidos (dominio FIN; hoy en el grupo Equipo).
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type ComisionesSectionProps = {
  user: User | null;
};
export function ComisionesSection({user}: ComisionesSectionProps){
  return (
    <OperationsWorkspace key="commissions" mode="commissions" role={user?.role||'viewer'}/>
  );
}
