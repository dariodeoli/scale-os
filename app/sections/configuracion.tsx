"use client";
import dynamic from 'next/dynamic';
import {SettingsWorkspace,CouponRedeem} from '../suite';
import {SubscriptionPanel} from '../subscription-panel';
import {NewCompany} from '../workspace-guide';
import type {User} from '../workspace-types';
const DeletionDangerZone=dynamic(()=>import('../deletion-danger-zone').then(m=>m.DeletionDangerZone));

// Configuración de la empresa (delta de la referencia #42).
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type ConfiguracionSectionProps = {
  user: User | null;
  subscriptionError: string;
  refreshSubscription: () => Promise<void> | void;
  exitDemoSimulation: () => void;
  deletionSignedOut: () => void;
};
export function ConfiguracionSection({user, subscriptionError, refreshSubscription, exitDemoSimulation, deletionSignedOut}: ConfiguracionSectionProps){
  return (
    <div className="settings-page"><div className="settings-layout">
          <div className="settings-column"><SettingsWorkspace/></div>
          <div className="settings-column settings-side-column">
            <div id="settings-subscription"><SubscriptionPanel key={user?.organization_id} state={user?.subscription||null} error={subscriptionError} onRefresh={refreshSubscription} organizationName={user?.organization_name}/></div>
            {!user?.demo_owner_user_id&&['owner','admin'].includes(user?.role||'')&&<CouponRedeem role={user?.role||''} onRedeemed={refreshSubscription}/>}
            {!user?.demo_owner_user_id&&<NewCompany/>}
          </div>
          {user&&<div className="settings-danger-wrap"><DeletionDangerZone key={String(user.organization_id)} organizationId={String(user.organization_id)} organizationName={user.organization_name} demo={!!user.demo_owner_user_id||user.organization_slug==='scale-demo-controles-20260908'} onDemoExit={exitDemoSimulation} onAccountDeleted={deletionSignedOut} onOrganizationDeleted={deletionSignedOut}/></div>}
        </div></div>
  );
}
