import {WorkspaceFooter} from '../workspace-footer';
import {PRIVACY_RIGHTS_CHANNEL} from '../privacy-notice';
import './portal.css';

// Portal del cliente: el pie institucional enlaza el aviso público y el canal
// de derechos queda alcanzable desde cualquier pantalla del portal
// (Ley 7593/2025, Refs #113). Sin datos personales visibles ni en la URL.
export default function ClientPortalLayout({children}:{children:React.ReactNode}){
 return <div className="client-portal-shell">{children}
  <p className="portal-privacy">Tus datos personales: <a href="/privacidad">Política de Privacidad</a> · Derechos por <a href={PRIVACY_RIGHTS_CHANNEL.whatsappUrl} target="_blank" rel="noreferrer">{PRIVACY_RIGHTS_CHANNEL.whatsappLabel}</a> · respuesta en {PRIVACY_RIGHTS_CHANNEL.slaDias} días corridos</p>
  <WorkspaceFooter/>
 </div>;
}
