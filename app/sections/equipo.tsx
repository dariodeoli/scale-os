"use client";
import dynamic from 'next/dynamic';
import {SectionLoading} from '../ui-v2';
import type {User} from '../workspace-types';
const OperationsWorkspace=dynamic(()=>import('../operations').then(m=>m.OperationsWorkspace),{loading:()=> <SectionLoading label="Cargando equipo…"/>});

// Equipo (personas, accesos y remuneraciones).
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type EquipoSectionProps = {
  user: User | null;
};
export function EquipoSection({user}: EquipoSectionProps){
  return (
    <OperationsWorkspace key="people" role={user?.role||'viewer'} currentEmail={user?.email||''} organizationName={user?.organization_name||''}/>
  );
}
