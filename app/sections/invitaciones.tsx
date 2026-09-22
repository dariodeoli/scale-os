"use client";
import dynamic from 'next/dynamic';
import type {User} from '../workspace-types';
const InviteLinks=dynamic(()=>import('../invite-links').then(m=>m.InviteLinks));

// Invitaciones y solicitudes de acceso.
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type InvitacionesSectionProps = {
  user: User | null;
};
export function InvitacionesSection({user}: InvitacionesSectionProps){
  return (
    (user?.demo_owner_user_id?<section className="panel"><h2>Invitaciones y solicitudes</h2><p>En tu empresa real podés generar enlaces de un uso o enlaces con aprobación. El Demo no crea accesos externos. Probá los permisos desde la barra superior.</p></section>:<InviteLinks role={user?.role||'viewer'}/>)
  );
}
