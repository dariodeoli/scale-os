'use client';
import {useEffect} from 'react';
import {APP_VERSION} from './app-version';
import {reportClientError} from './client-error-reporter';
// Superficie de recuperación global: reemplaza el layout raíz, así que no puede
// depender de la hoja de la app ni del `ProductFooter`. Mantiene el contenido
// canónico del pie (§14) en texto plano — versión real + crédito con enlace — y
// la excepción al objeto queda documentada en `docs/ADOPCION-V2.md`.
export default function GlobalError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 useEffect(()=>{reportClientError(error,'boundary');},[error]);
 return <html lang="es"><body>
  <main className="error-boundary">
   <section className="panel error-boundary-card" role="alert">
    <p className="eyebrow">ERROR INESPERADO</p>
    <h1>Scale OS no pudo cargar</h1>
    <p>Ocurrió un error general en la aplicación. Reintentá o recargá la página.</p>
    <button className="primary" type="button" onClick={reset}>Reintentar</button>
    <p className="error-boundary-version">Scale OS v{APP_VERSION} · Desarrollado por <a href="https://owncoding.dev/">Owncoding</a></p>
   </section>
  </main>
 </body></html>;
}
