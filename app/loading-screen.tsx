"use client";
import {Button} from './ui/button';

import {useEffect, useState} from 'react';
import {PersonContainer} from './person-container';
import {WorkspaceBrand} from './workspace-brand';

/** Pasado este tiempo la carga deja de ser «normal» y se ofrece recargar. */
export const LOADING_SLOW_MS=10000;

// Pantalla de carga única del espacio de trabajo (issue #64): marca estática y
// UNA sola animación, la barra debajo del nombre. Cuando la sesión ya se conoce
// muestra la identidad (nombre, rol y avatar); si todavía no hay usuario, cae a
// la variante neutra sin datos. No hay orbe ni anillo giratorio alrededor del
// logo: la marca es la misma del shell (`WorkspaceBrand`) y no se anima.
// Rediseño: sin tarjeta pesada, aparece con un fundido corto (las cargas
// rápidas no parpadean) y, si tarda más de lo normal, ofrece recargar.
export function LoadingScreen({name,photoUrl,roleLabel}:{name?:string;photoUrl?:string;roleLabel?:string}){
 const hasIdentity=Boolean(name);
 const [slow,setSlow]=useState(false);
 useEffect(()=>{const timer=setTimeout(()=>setSlow(true),LOADING_SLOW_MS);return ()=>clearTimeout(timer);},[]);
 return (
  <div className="loading-page">
   <div className="loading-stage flex w-full max-w-[20rem] min-w-0 flex-col items-center gap-6 text-center" data-loading-card>
    {/* La región viva anuncia solo el estado; el aviso de carga lenta y su botón
        quedan fuera para que el lector no repita un control dentro del anuncio. */}
    <div className="flex w-full min-w-0 flex-col items-center gap-6" role="status" aria-live="polite">
     <span className="loading-brand"><WorkspaceBrand/></span>
     {hasIdentity ? <span className="max-w-full rounded-full border border-ink-600 bg-ink-800/80 py-1.5 pl-1.5 pr-4 shadow-[0_10px_30px_rgb(37_28_41_/_8%)]"><PersonContainer name={name!} photoUrl={photoUrl} secondary={roleLabel} verified/></span> : null}
     <div className="flex w-full min-w-0 flex-col items-center gap-2.5">
      <span className="h-1.5 w-40 overflow-hidden rounded-full bg-ink-700" aria-hidden="true"><span className="loading-bar-fill block h-full w-1/2 rounded-full bg-fono"/></span>
      <p className="text-[12px] text-mute">{hasIdentity?'Cargando tu espacio…':'Un momento, estamos preparando todo…'}</p>
     </div>
    </div>
    {slow ? <div className="grid justify-items-center gap-2" data-loading-slow>
     <p className="text-[12px] text-mute">Está tardando más de lo normal. Revisá tu conexión.</p>
     <Button variant="secondary" type="button" className="secondary" onClick={()=>window.location.reload()}>Recargar</Button>
    </div> : null}
   </div>
  </div>
 );
}
