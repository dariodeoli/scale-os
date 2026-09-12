"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {WorkspaceBrand} from '../workspace-brand';
import {founderPricingNote} from '../founder-pricing';
import {WorkspaceFooter} from '../workspace-footer';
import './registration.css';

export default function Registration(){
 const [error,setError]=useState('');
 useEffect(()=>{setError(new URLSearchParams(window.location.search).get('error')||'');},[]);
 return <main className="registration-page"><section className="registration-card">
  <Link href="https://sistema.scaleparaguay.com/" aria-label="Scale OS · Volver al sitio"><WorkspaceBrand/></Link>
  <p className="eyebrow">TU AGENCIA, TU ESPACIO</p>
  <h1>Probá Scale OS gratis.</h1>
  <p>Tu agencia, tu equipo y tus datos en un espacio privado. Tenés 30 días sin tarjeta para empezar.</p>
  <form action="https://admin.scaleparaguay.com/api/auth/google/start" method="get">
   <input type="hidden" name="signup" value="1"/>
   <label>Nombre de tu agencia<input name="company" required minLength={2} maxLength={160} autoComplete="organization" placeholder="Tu agencia"/></label>
   <label>Moneda de la suscripción<select name="currency" defaultValue="USD"><option value="USD">US$10 al mes</option><option value="PYG">G. 50.000 al mes</option></select></label>
   <p className="registration-terms" id="founder-conditions"><strong>Precio de lanzamiento por agencia.</strong> US$10 o G. 50.000 al mes, con todos los integrantes incluidos. {founderPricingNote}</p>
   <details className="registration-details"><summary>Condiciones de la prueba</summary><p id="trial-conditions">Los 30 días empiezan al crear la agencia, sin tarjeta. Después se aplica la moneda elegida. Hay 2 días de gracia; al tercer día sin pago se suspende el uso sin borrar los datos. Volver a registrarte no reinicia la prueba.</p></details>
   <label className="registration-consent"><input name="consent" type="checkbox" value="1" required aria-describedby="trial-conditions founder-conditions"/><span>Acepto estas condiciones de la prueba y suscripción.</span></label>
   <button className="primary" type="submit">Continuar con Google</button>
   <small>Google verifica tu correo. No se cobrará nada al iniciar la prueba; el pago recurrente se autoriza por separado al suscribirte.</small>
   {error&&<p role="alert" className="error">{error}</p>}
  </form>
  <p className="registration-links"><Link href="/">Ya tengo cuenta</Link><a href="https://sistema.scaleparaguay.com/demo">Explorar la demo primero</a></p>
  <WorkspaceFooter/>
 </section></main>;
}
