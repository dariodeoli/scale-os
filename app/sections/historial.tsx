"use client";
import dynamic from 'next/dynamic';
import type {User} from '../workspace-types';
const WorkHistory=dynamic(()=>import('../work-history').then(m=>m.WorkHistory));

// Historial de trabajo.
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type HistorialSectionProps = {
  user: User | null;
};
export function HistorialSection({user}: HistorialSectionProps){
  return (
    <WorkHistory role={user?.role||'viewer'}/>
  );
}
