"use client";
import dynamic from 'next/dynamic';
import type {User} from '../workspace-types';
import {PageHeader} from '../ui-v2';
const InviteLinks=dynamic(()=>import('../invite-links').then(m=>m.InviteLinks));

// Invitaciones y solicitudes de acceso.
// Rediseño v2 (issue #46): la empresa real usa InviteLinks; la demo explica el alcance.
type InvitacionesSectionProps = {
  user: User | null;
};
export function InvitacionesSection({user}: InvitacionesSectionProps){
  if(user?.demo_owner_user_id) return <section className="grid gap-4" aria-label="Invitaciones y solicitudes">
    <PageHeader eyebrow="Equipo" title="Invitaciones y solicitudes" subtitle="En una empresa real podés generar enlaces de un uso o enlaces con aprobación."/>
    <div className="rounded-xl border border-ink-600 bg-ink-800 p-4">
      <p className="text-sm text-fore">El Demo no crea accesos externos.</p>
      <p className="mt-1 text-xs text-mute">Probá los permisos desde la barra superior: los cambios de rol se aplican en el momento y no envían invitaciones. En tu empresa real, cada enlace queda auditado con quién lo creó y quién ingresó.</p>
    </div>
  </section>;
  return (
    <InviteLinks role={user?.role||'viewer'}/>
  );
}
