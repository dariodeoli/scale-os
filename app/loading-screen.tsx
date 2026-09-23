"use client";
import {PersonContainer} from './person-container';

// Pantalla de carga del espacio de trabajo. Cuando la sesión ya se conoce
// muestra la identidad (nombre, rol y avatar) durante la espera; si todavía no
// hay usuario, cae a una variante neutra sin datos. La jerarquía es marca →
// identidad → estado, sobre una tarjeta del sistema v2 (ink tokens, claro y
// oscuro) y con una barra sobria que se apaga con `prefers-reduced-motion`.
export function LoadingScreen({name,photoUrl,roleLabel}:{name?:string;photoUrl?:string;roleLabel?:string}){
 const hasIdentity=Boolean(name);
 return (
  <div className="loading-page" role="status" aria-live="polite">
   <div className="flex w-full max-w-[22rem] min-w-0 flex-col items-center gap-4 rounded-2xl border border-ink-600 bg-ink-800/95 px-6 py-7 text-center shadow-[0_24px_60px_rgb(37_28_41_/_12%)] max-md:px-5" data-loading-card>
    <span className="loading-orb"><img src="/brand/icon-192.png" width={46} height={46} alt=""/></span>
    <span className="workspace-wordmark">scale<span>OS</span></span>
    {hasIdentity
     ? <div className="flex w-full min-w-0 flex-col items-center gap-3 border-t border-ink-600 pt-4">
        <PersonContainer name={name!} photoUrl={photoUrl} secondary={roleLabel} verified/>
        <p className="text-[11.5px] text-mute">Cargando tu espacio…</p>
       </div>
     : <p className="text-[11.5px] text-mute">Un momento, estamos preparando todo…</p>}
    <span className="h-1 w-28 overflow-hidden rounded-full bg-ink-700" aria-hidden="true"><span className="loading-bar-fill block h-full w-1/2 rounded-full bg-fono"/></span>
   </div>
  </div>
 );
}
