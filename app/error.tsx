'use client';
export default function ErrorBoundary({reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <main className="error-boundary">
  <section className="panel error-boundary-card" role="alert">
   <p className="eyebrow">ERROR INESPERADO</p>
   <h1>Algo salió mal</h1>
   <p>Ocurrió un error al mostrar esta pantalla. Reintentá; tus datos guardados no se pierden.</p>
   <button className="primary" type="button" onClick={reset}>Reintentar</button>
  </section>
 </main>;
}
