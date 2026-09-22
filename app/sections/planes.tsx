"use client";
import {CatalogWorkspace} from '../suite';
import type {User} from '../workspace-types';

// Planes reutilizables.
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type PlanesSectionProps = {
  user: User | null;
};
export function PlanesSection({user}: PlanesSectionProps){
  return (
    <CatalogWorkspace key="plans" kind="plans" role={user?.role||'viewer'}/>
  );
}
