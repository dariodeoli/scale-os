"use client";
import dynamic from 'next/dynamic';
import {SectionLoading} from '../ui-v2';
import {SettingsWorkspace,CouponRedeem} from '../suite';
import {SubscriptionPanel} from '../subscription-panel';
import {NewCompany} from '../workspace-guide';
import type {User} from '../workspace-types';
const DeletionDangerZone=dynamic(()=>import('../deletion-danger-zone').then(m=>m.DeletionDangerZone),{loading:()=> <SectionLoading label="Cargando la configuración…"/>});

// Configuración de la empresa (referencia #42, arquetipo ajustes).
// Dos columnas (principal + lateral) con tarjetas por tema y la zona
// destructiva separada al final; los módulos de ajustes que aún no se rediseñan
// se embeben tal como están (SettingsWorkspace, suscripción, cupón, empresa).
type ConfiguracionSectionProps = {
  user: User | null;
  subscriptionError: string;
  refreshSubscription: () => Promise<void> | void;
  exitDemoSimulation: () => void;
  deletionSignedOut: () => void;
};
export function ConfiguracionSection({user, subscriptionError, refreshSubscription, exitDemoSimulation, deletionSignedOut}: ConfiguracionSectionProps){
  const demo = !!user?.demo_owner_user_id || user?.organization_slug === 'scale-demo-controles-20260908';
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="min-w-0"><SettingsWorkspace/></div>
      <div className="grid min-w-0 content-start gap-4">
        <div id="settings-subscription"><SubscriptionPanel key={user?.organization_id} state={user?.subscription||null} error={subscriptionError} onRefresh={refreshSubscription} organizationName={user?.organization_name}/></div>
        {!user?.demo_owner_user_id&&['owner','admin'].includes(user?.role||'')&&<CouponRedeem role={user?.role||''} onRedeemed={refreshSubscription}/>}
        {!user?.demo_owner_user_id&&<NewCompany/>}
      </div>
      {user&&<div className="min-w-0 lg:col-span-2">
        <DeletionDangerZone key={String(user.organization_id)} organizationId={String(user.organization_id)} organizationName={user.organization_name} demo={demo} onDemoExit={exitDemoSimulation} onAccountDeleted={deletionSignedOut} onOrganizationDeleted={deletionSignedOut}/>
      </div>}
    </div>
  );
}
