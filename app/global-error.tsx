'use client';
export default function GlobalError({reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <html lang="es"><body>
  <main className="error-boundary">
   <section className="panel error-boundary-card" role="alert">
    <p className="eyebrow">ERROR INESPERADO</p>
    <h1>Scale OS no pudo cargar</h1>
    <p>Ocurrió un error general en la aplicación. Reintentá o recargá la página.</p>
    <button className="primary" type="button" onClick={reset}>Reintentar</button>
   </section>
  </main>
 </body></html>;
}
