"use client";
import dynamic from 'next/dynamic';
import {ListPage,SectionLoading} from '../ui-v2';
import {ActivityWorkspace} from '../suite';
import type {User} from '../workspace-types';
const UsagePanel=dynamic(()=>import('../presence').then(m=>m.UsagePanel),{loading:()=> <SectionLoading label="Cargando la actividad…"/>});

// Actividad del equipo (uso del dueño + feed).
// Extraído de app/scale-workspace.tsx (issue #47).
type ActividadSectionProps = {
  user: User | null;
};
export function ActividadSection({user}: ActividadSectionProps){
  return (
    <ListPage aria-label="Actividad">
      {/* Reorganización IA: el registro de cambios (lo que todos vienen a
          revisar) va primero; el uso del equipo, solo del dueño, queda debajo. */}
      <ActivityWorkspace/>
      {user?.role==='owner'&&<UsagePanel/>}
    </ListPage>
  );
}
