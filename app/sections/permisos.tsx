"use client";
import {PermissionsMatrixPanel} from '../permissions-matrix';
import type {User} from '../workspace-types';

// Matriz de roles y permisos.
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type PermisosSectionProps = {
  user: User | null;
};
export function PermisosSection({user}: PermisosSectionProps){
  return (
    <PermissionsMatrixPanel role={user?.role||'viewer'}/>
  );
}
