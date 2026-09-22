"use client";
import dynamic from 'next/dynamic';
import type {User} from '../workspace-types';
const StudioWorkspace=dynamic(()=>import('../studio-workspace').then(m=>m.StudioWorkspace));

// Estudio y reservas.
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type EstudioSectionProps = {
  user: User | null;
};
export function EstudioSection({user}: EstudioSectionProps){
  return (
    <StudioWorkspace key={String(user?.organization_id)} role={user?.role||'viewer'}/>
  );
}
