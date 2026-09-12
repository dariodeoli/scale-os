import {WorkspaceFooter} from '../workspace-footer';
import './portal.css';

export default function ClientPortalLayout({children}:{children:React.ReactNode}){
 return <div className="client-portal-shell">{children}<WorkspaceFooter/></div>;
}
