"use client";
import dynamic from 'next/dynamic';
import {SectionLoading} from '../ui-v2';
import type {User} from '../workspace-types';
const InventoryWorkspace=dynamic(()=>import('../inventory-workspace').then(m=>m.InventoryWorkspace),{loading:()=> <SectionLoading label="Cargando inventario…"/>});

// Inventario.
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type InventarioSectionProps = {
  user: User | null;
};
export function InventarioSection({user}: InventarioSectionProps){
  return (
    <InventoryWorkspace key={String(user?.organization_id)} role={user?.role||'viewer'}/>
  );
}
