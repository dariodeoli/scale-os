'use client';
import {Button} from './ui/button';

import {useEffect} from 'react';
import {WorkspaceFooter} from './workspace-footer';
import {reportClientError} from './client-error-reporter';
export default function ErrorBoundary({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 // Panel global «Errores»: el boundary reporta el error (sin PII, con tope por página).
 useEffect(()=>{reportClientError(error,'boundary');},[error]);
 return <main className="error-boundary">
  <section className="panel error-boundary-card" role="alert">
   <p className="eyebrow">ERROR INESPERADO</p>
   <h1>Algo salió mal</h1>
   <p>Ocurrió un error al mostrar esta pantalla. Reintentá; tus datos guardados no se pierden.</p>
   <Button variant="primary" className="primary" type="button" onClick={reset}>Reintentar</Button>
  </section>
  <WorkspaceFooter/>
 </main>;
}
