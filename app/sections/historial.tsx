"use client";
import dynamic from 'next/dynamic';
import {SectionLoading} from '../ui-v2';
import type {User} from '../workspace-types';
const WorkHistory=dynamic(()=>import('../work-history').then(m=>m.WorkHistory),{loading:()=> <SectionLoading label="Cargando el historial…"/>});

// Historial de trabajo.
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type HistorialSectionProps = {
  user: User | null;
  /** Abre otro módulo desde el vacío del historial (el shell resuelve la ruta). */
  navigate?: (module: string) => void;
};
export function HistorialSection({user,navigate}: HistorialSectionProps){
  return (
    <WorkHistory role={user?.role||'viewer'} navigate={navigate}/>
  );
}
