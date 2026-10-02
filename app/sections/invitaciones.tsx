"use client";
import dynamic from 'next/dynamic';
import type {User} from '../workspace-types';
import {EmptyBlock,SectionLoading} from '../ui-v2';
const InviteLinks=dynamic(()=>import('../invite-links').then(m=>m.InviteLinks),{loading:()=> <SectionLoading label="Cargando invitaciones…"/>});

// Invitaciones y solicitudes de acceso.
// Rediseño v2 (issue #46): la empresa real usa InviteLinks; la demo explica el alcance.
type InvitacionesSectionProps = {
  user: User | null;
};
export function InvitacionesSection({user}: InvitacionesSectionProps){
  if(user?.demo_owner_user_id) return <section className="grid gap-4" aria-label="Invitaciones y solicitudes">
    {/* #143: el bloqueo por demo es un vacío compacto, no una pantalla completa. */}
    <EmptyBlock compact title="El Demo no crea accesos externos" description="Probá los permisos desde la barra superior: los cambios de rol se aplican en el momento y no envían invitaciones. En tu empresa real, cada enlace queda auditado con quién lo creó y quién ingresó."/>
  </section>;
  return (
    <InviteLinks role={user?.role||'viewer'}/>
  );
}
