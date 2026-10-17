"use client";
import {Notice as Aviso} from '../ui/notice';


import {Settings,SlidersHorizontal} from 'lucide-react';
import {startupChoices} from '../workspace-preferences';
import type {StartupPreference,WorkspacePreferences} from '../workspace-preferences';
import type {User} from '../workspace-types';
import {ListPage,LoadingBlock} from '../ui-v2';
import {Button} from '../ui/button';
import {SelectCustom} from '../profile-controls';

// Preferencias de la cuenta por usuario y empresa; caché local de respaldo.
// Rediseño v2 (issue #46): mismos datos y callbacks que el módulo extraído en #47.
type PreferenciasSectionProps = {
  user: User | null;
  preferencesReady: boolean;
  preferences: WorkspacePreferences;
  preferenceWarning: string;
  retryPreferences: () => void;
  preferencesSaving: boolean;
  updatePreferences: (change: Partial<WorkspacePreferences>) => void;
};

const CARD='rounded-xl border border-ink-600 bg-ink-800 p-4';

export function PreferenciasSection({user, preferencesReady, preferences, preferenceWarning, retryPreferences, preferencesSaving, updatePreferences}: PreferenciasSectionProps){
 const role=user?.role||'viewer';
 const choices=startupChoices(role);
 const startup=choices.some(choice=>choice.value===preferences.startup)?preferences.startup:'summary';
 const startupLabel=choices.find(choice=>choice.value===startup)?.label||'Resumen';
 const filters=preferences.production;
 const filterCount=[filters.clientId?1:0,filters.mine?1:0,filters.week?1:0].reduce((total,value)=>total+value,0);
 // Reorganización IA: sin tira de KPIs que repetía lo que dicen las dos
 // tarjetas (inicio elegido, filtros y alcance); las tarjetas van lado a lado.
 return <ListPage aria-label="Preferencias del espacio">
  {preferenceWarning?<Aviso tono="warn">{preferenceWarning} <Button type="button" variant="secondary" disabled={preferencesSaving} onClick={retryPreferences}>Reintentar sincronización</Button></Aviso>:null}
  {preferencesSaving?<p role="status" className="form-note">Guardando preferencias…</p>:null}
  <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
  <div className={`${CARD} grid gap-4`}>
   <div className="flex items-start gap-3">
    <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink-600 text-mute" aria-hidden="true"><Settings size={18}/></span>
    <div className="min-w-0">
     <h2 id="workspace-preferences-title" className="m-0 text-[17px] font-semibold tracking-tight text-fore">Inicio del espacio</h2>
     <p className="m-0 mt-1 text-xs text-mute">Elegí qué ves al entrar a Scale OS. Los enlaces explícitos, los retornos de autenticación y la facturación siempre ganan.</p>
    </div>
   </div>
   {preferencesReady?
    <div className="w-full max-w-md">
     <SelectCustom label="Al entrar a Scale OS" value={startup} choices={choices.map(choice=>({value:choice.value,label:choice.label}))} onChange={value=>updatePreferences({startup:value as StartupPreference})}/>
    </div>
   :<LoadingBlock label="Cargando preferencias…" lines={1}/>}
   <p className="m-0 text-[11.5px] text-mute">Inicio actual: <b className="font-semibold text-fore">{startupLabel}</b> (solo al entrar a la raíz). La preferencia se guarda en tu cuenta por usuario y empresa y se recupera en otros dispositivos. Una copia local permite seguir trabajando si falla la conexión; cualquier cambio pendiente se informa para reintentar.</p>
  </div>
  <div className={`${CARD} grid gap-3`}>
   <div className="flex items-start gap-3">
    <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink-600 text-mute" aria-hidden="true"><SlidersHorizontal size={18}/></span>
    <div className="min-w-0">
     <h2 className="m-0 text-[17px] font-semibold tracking-tight text-fore">Filtros guardados del tablero <span className="text-xs font-medium tabular-nums text-mute">· {filterCount} activo{filterCount===1?'':'s'}</span></h2>
     <p className="m-0 mt-1 text-xs text-mute">Se aplican a Producción con la semana de lunes a domingo según la hora local de tu dispositivo. Se editan desde el tablero.</p>
    </div>
   </div>
   {filters.clientId?<p className="m-0 text-[11.5px] text-mute">Hay un cliente guardado en los filtros. Si ya no existe, el tablero te lo indica para que lo restablezcas.</p>:null}
  </div>
  </div>
 </ListPage>;
}
