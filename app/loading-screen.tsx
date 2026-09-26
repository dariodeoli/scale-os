"use client";
import {PersonContainer} from './person-container';
import {WorkspaceBrand} from './workspace-brand';

// Pantalla de carga única del espacio de trabajo (issue #64): marca estática y
// UNA sola animación, la barra debajo del nombre. Cuando la sesión ya se conoce
// muestra la identidad (nombre, rol y avatar); si todavía no hay usuario, cae a
// la variante neutra sin datos. No hay orbe ni anillo giratorio alrededor del
// logo: la marca es la misma del shell (`WorkspaceBrand`) y no se anima.
export function LoadingScreen({name,photoUrl,roleLabel}:{name?:string;photoUrl?:string;roleLabel?:string}){
 const hasIdentity=Boolean(name);
 return (
  <div className="loading-page" role="status" aria-live="polite">
   <div className="flex w-full max-w-[22rem] min-w-0 flex-col items-center gap-4 rounded-2xl border border-ink-600 bg-ink-800/95 px-6 py-7 text-center shadow-[0_24px_60px_rgb(37_28_41_/_12%)] max-md:px-5" data-loading-card>
    <WorkspaceBrand/>
    <div className="flex w-full min-w-0 flex-col items-center gap-3 border-t border-ink-600 pt-4">
     {hasIdentity ? <PersonContainer name={name!} photoUrl={photoUrl} secondary={roleLabel} verified/> : null}
     <span className="h-1 w-28 overflow-hidden rounded-full bg-ink-700" aria-hidden="true"><span className="loading-bar-fill block h-full w-1/2 rounded-full bg-fono"/></span>
     <p className="text-[11.5px] text-mute">{hasIdentity?'Cargando tu espacio…':'Un momento, estamos preparando todo…'}</p>
    </div>
   </div>
  </div>
 );
}
