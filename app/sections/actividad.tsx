"use client";
import dynamic from 'next/dynamic';
import {ActivityWorkspace} from '../suite';
import type {User} from '../workspace-types';
const UsagePanel=dynamic(()=>import('../presence').then(m=>m.UsagePanel));

// Actividad del equipo (uso del dueño + feed).
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type ActividadSectionProps = {
  user: User | null;
};
export function ActividadSection({user}: ActividadSectionProps){
  return (
    <>
      {user?.role==='owner'&&<UsagePanel/>}
      <ActivityWorkspace/>
    </>
  );
}
