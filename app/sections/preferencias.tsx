"use client";
import {Settings} from 'lucide-react';
import {SelectCustom} from '../profile-controls';
import type {StartupPreference,WorkspacePreferences} from '../workspace-preferences';
import {startupChoices} from '../workspace-preferences';
import type {User} from '../workspace-types';

// Preferencias del espacio (locales por usuario y empresa).
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type PreferenciasSectionProps = {
  user: User | null;
  preferencesReady: boolean;
  preferences: WorkspacePreferences;
  preferenceWarning: string;
  updatePreferences: (change: Partial<WorkspacePreferences>) => void;
};
export function PreferenciasSection({user, preferencesReady, preferences, preferenceWarning, updatePreferences}: PreferenciasSectionProps){
  return (
    <section className="panel settings-card preferences-card" aria-labelledby="workspace-preferences-title"><div className="settings-card-heading"><span className="settings-card-icon" aria-hidden="true"><Settings size={18}/></span><div><h2 id="workspace-preferences-title">Preferencias del espacio</h2><p>Se guardan solo para vos en {user?.organization_name||'esta empresa'}, en este navegador.</p></div></div>
          <div className="preferences-row">{preferencesReady?<SelectCustom label="Al entrar a Scale OS" value={startupChoices(user?.role||'').some(choice=>choice.value===preferences.startup)?preferences.startup:'summary'} choices={startupChoices(user?.role||'')} onChange={startup=>updatePreferences({startup:startup as StartupPreference})}/>:<p role="status">Cargando preferencias…</p>}<p className="form-note">Se aplica en tu próxima entrada al inicio. Los enlaces a secciones, piezas y otros destinos conservan su destino.</p></div>
          {preferenceWarning&&<p role="status" className="settings-notice">{preferenceWarning}</p>}
        </section>
  );
}
