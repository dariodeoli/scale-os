"use client";
import {Select} from 'owncoding-ui';
import {Settings,SlidersHorizontal} from 'lucide-react';
import {startupChoices} from '../workspace-preferences';
import type {StartupPreference,WorkspacePreferences} from '../workspace-preferences';
import type {User} from '../workspace-types';
import {Kpi,KpiStrip,LoadingBlock,PageHeader,StateChip} from '../ui-v2';

// Preferencias del espacio (locales por usuario y empresa).
// Rediseño v2 (issue #46): mismos datos y callbacks que el módulo extraído en #47.
type PreferenciasSectionProps = {
  user: User | null;
  preferencesReady: boolean;
  preferences: WorkspacePreferences;
  preferenceWarning: string;
  updatePreferences: (change: Partial<WorkspacePreferences>) => void;
};

const CARD='rounded-xl border border-ink-600 bg-ink-800 p-4';

export function PreferenciasSection({user, preferencesReady, preferences, preferenceWarning, updatePreferences}: PreferenciasSectionProps){
 const role=user?.role||'viewer';
 const choices=startupChoices(role);
 const startup=choices.some(choice=>choice.value===preferences.startup)?preferences.startup:'summary';
 const startupLabel=choices.find(choice=>choice.value===startup)?.label||'Resumen';
 const filters=preferences.production;
 const filterCount=[filters.clientId?1:0,filters.mine?1:0,filters.week?1:0].reduce((total,value)=>total+value,0);
 return <section className="grid gap-4" aria-labelledby="workspace-preferences-title">
  <PageHeader eyebrow="Configuración" title="Preferencias del espacio" subtitle={`Se guardan solo para vos en ${user?.organization_name||'esta empresa'}, en este navegador.`}/>
  <KpiStrip>
   <Kpi label="Inicio configurado" valor={startupLabel} hint="Solo se aplica al entrar a la raíz"/>
   <Kpi label="Filtros del tablero" valor={filterCount} hint="Se editan desde Producción"/>
   <Kpi label="Alcance" valor="Este navegador" hint="No se sincroniza entre dispositivos"/>
  </KpiStrip>
  {preferenceWarning?<p role="status" className={CARD+' text-xs text-warn'}>{preferenceWarning}</p>:null}
  <div className={`${CARD} grid gap-4`}>
   <div className="flex items-start gap-3">
    <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink-600 text-mute" aria-hidden="true"><Settings size={18}/></span>
    <div className="min-w-0">
     <h2 id="workspace-preferences-title" className="text-[17px] font-semibold tracking-tight text-fore">Inicio del espacio</h2>
     <p className="mt-1 text-xs text-mute">Elegí qué ves al entrar a Scale OS. Los enlaces explícitos, los retornos de autenticación y la facturación siempre ganan.</p>
    </div>
   </div>
   {preferencesReady?
    <div className="w-full max-w-md">
     <Select aria-label="Al entrar a Scale OS" value={startup} onChange={(event:{target:{value:string}})=>updatePreferences({startup:event.target.value as StartupPreference})}>
      {choices.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}
     </Select>
    </div>
   :<LoadingBlock label="Cargando preferencias…" lines={1}/>}
   <p className="text-[11.5px] text-mute">La preferencia se guarda por usuario y empresa en el almacenamiento local del navegador. Si el almacenamiento falla, el cambio es temporal y el panel sigue funcionando.</p>
  </div>
  <div className={`${CARD} grid gap-3`}>
   <div className="flex items-start gap-3">
    <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink-600 text-mute" aria-hidden="true"><SlidersHorizontal size={18}/></span>
    <div className="min-w-0">
     <h2 className="text-[17px] font-semibold tracking-tight text-fore">Filtros guardados del tablero</h2>
     <p className="mt-1 text-xs text-mute">Se aplican a Producción con la semana de lunes a domingo según la hora local de tu dispositivo. Se editan desde el tablero.</p>
    </div>
   </div>
   <div className="flex flex-wrap items-center gap-2">
    <StateChip tone={filters.mine?'info':'mute'}>{filters.mine?'Solo mis órdenes':'Todo el equipo'}</StateChip>
    <StateChip tone={filters.week?'info':'mute'}>{filters.week?'Semana actual':'Todas las fechas'}</StateChip>
    <StateChip tone={filters.clientId?'info':'mute'} title={filters.clientId?`Cliente guardado ${filters.clientId}`:'Sin cliente guardado'}>{filters.clientId?'Con cliente guardado':'Todos los clientes'}</StateChip>
   </div>
   {filters.clientId?<p className="text-[11.5px] text-mute">Hay un cliente guardado en los filtros. Si ya no existe, el tablero te lo indica para que lo restablezcas.</p>:null}
  </div>
 </section>;
}
