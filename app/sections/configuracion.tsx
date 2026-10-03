"use client";
import dynamic from 'next/dynamic';
import {SectionLoading} from '../ui-v2';
import {SettingsWorkspace,CouponRedeem,ExchangeRateSettings,IntegrationSettings} from '../suite';
import {SubscriptionPanel} from '../subscription-panel';
import {NewCompany} from '../workspace-guide';
import {PrivacyPanel} from '../privacy-panel';
import type {User} from '../workspace-types';
const DeletionDangerZone=dynamic(()=>import('../deletion-danger-zone').then(m=>m.DeletionDangerZone),{loading:()=> <SectionLoading label="Cargando la configuración…"/>});

// Configuración por bloques (issue #152): empresa · facturación/cotización ·
// integraciones · suscripción · seguridad, con la zona de peligro aparte. El
// nav de anclas separa las áreas sin crear rutas ni tabs nuevas; cada bloque
// conserva sus componentes y contratos (#42, #139).
type ConfiguracionSectionProps = {
  user: User | null;
  subscriptionError: string;
  refreshSubscription: () => Promise<void> | void;
  exitDemoSimulation: () => void;
  deletionSignedOut: () => void;
};

function SettingsBlock({id,title,description,children,aside,full=false}:{id:string;title:string;description:string;children:React.ReactNode;aside?:React.ReactNode;full?:boolean}){
  return (
    <section id={id} className="settings-block" aria-labelledby={`${id}-title`}>
      <header className="settings-block-heading">
        <div><h2 id={`${id}-title`}>{title}</h2><p>{description}</p></div>
        <a className="text-button settings-block-top" href="#settings-nav">Volver arriba</a>
      </header>
      {full?<div className="settings-column">{children}</div>:<div className="settings-layout">
        <div className="settings-column">{children}</div>
        {aside?<div className="settings-column settings-side-column">{aside}</div>:null}
      </div>}
    </section>
  );
}

export function ConfiguracionSection({user, subscriptionError, refreshSubscription, exitDemoSimulation, deletionSignedOut}: ConfiguracionSectionProps){
  const demo = !!user?.demo_owner_user_id || user?.organization_slug === 'scale-demo-controles-20260908';
  return (
    <div id="settings-nav" className="settings-page settings-slice">
      <nav className="settings-nav" aria-label="Bloques de configuración">
        <span className="settings-nav-label">Ir a</span>
        <a href="#settings-company">Empresa</a>
        <a href="#settings-billing">Facturación y cotización</a>
        <a href="#settings-integrations">Integraciones</a>
        <a href="#settings-subscription">Suscripción</a>
        <a href="#settings-security">Seguridad</a>
        <a className="danger" href="#settings-danger">Zona de peligro</a>
      </nav>

      <SettingsBlock id="settings-company" title="Empresa" description="Identidad de la empresa, valores predeterminados de los formularios y tus otras empresas." aside={user?<NewCompany/>:null}>
        <SettingsWorkspace/>
      </SettingsBlock>

      <SettingsBlock id="settings-billing" title="Facturación y cotización" description="Referencia del dólar y cupones de suscripción. La facturación de tus clientes vive en Comercial y Finanzas.">
        <ExchangeRateSettings/>
        {!user?.demo_owner_user_id&&['owner','admin'].includes(user?.role||'')?<CouponRedeem role={user?.role||''} onRedeemed={refreshSubscription}/>:null}
      </SettingsBlock>

      <SettingsBlock id="settings-integrations" title="Integraciones" description="Estado de los servicios externos que pueden complementar tu flujo." full>
        <IntegrationSettings/>
      </SettingsBlock>

      <SettingsBlock id="settings-subscription" title="Suscripción" description="Estado, prueba y pago de Scale OS para esta empresa." full>
        <SubscriptionPanel key={user?.organization_id} state={user?.subscription||null} error={subscriptionError} onRefresh={refreshSubscription} organizationName={user?.organization_name}/>
      </SettingsBlock>

      <SettingsBlock id="settings-security" title="Seguridad" description="Protección de datos, consentimientos y pedidos de titulares (Ley 7593/2025)." full>
        {user?<PrivacyPanel key={String(user.organization_id)} user={user}/>:null}
      </SettingsBlock>

      <section id="settings-danger" className="settings-block settings-danger-block" aria-labelledby="settings-danger-title">
        <header className="settings-block-heading settings-danger-heading">
          <div><h2 id="settings-danger-title">Zona de peligro</h2><p>Acciones irreversibles sobre tu cuenta o tu empresa. Se piden confirmaciones extra.</p></div>
          <a className="text-button settings-block-top" href="#settings-nav">Volver arriba</a>
        </header>
        <div className="settings-danger-wrap">
          {user?<DeletionDangerZone key={String(user.organization_id)} organizationId={String(user.organization_id)} organizationName={user.organization_name} demo={demo} onDemoExit={exitDemoSimulation} onAccountDeleted={deletionSignedOut} onOrganizationDeleted={deletionSignedOut}/>:null}
        </div>
      </section>
    </div>
  );
}
