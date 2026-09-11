"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {WorkspaceBrand} from '../workspace-brand';
import './registration.css';

export default function Registration(){
 const [error,setError]=useState('');
 useEffect(()=>{setError(new URLSearchParams(window.location.search).get('error')||'');},[]);
 return <main className="registration-page"><section className="registration-card">
  <Link href="https://sistema.scaleparaguay.com/" aria-label="Scale OS · Volver al sitio"><WorkspaceBrand/></Link>
  <p className="eyebrow">TU AGENCIA, TU ESPACIO</p>
  <h1>30 días para trabajar con todo en orden.</h1>
  <p>Creá una agencia privada con todas las herramientas de Scale OS y todos sus integrantes incluidos, sin cobro por usuario. No es la demo: los clientes y proyectos que cargues serán tuyos.</p>
  <form action="https://admin.scaleparaguay.com/api/auth/google/start" method="get">
   <input type="hidden" name="signup" value="1"/>
   <label>Nombre de tu agencia<input name="company" required minLength={2} maxLength={160} autoComplete="organization" placeholder="Tu agencia"/></label>
   <label>Moneda de la suscripción<select name="currency" defaultValue="USD"><option value="USD">US$10 al mes</option><option value="PYG">G. 50.000 al mes</option></select></label>
   <p className="registration-terms" id="trial-conditions">30 días gratis desde que se crea la agencia, sin tarjeta. Después, el precio mensual que elijas por empresa. Tendrás 2 días de gracia; al comenzar el tercer día sin pago se suspende el uso, sin borrar los datos. Podrás acceder a la suscripción para pagar y reactivar. Volver a registrarte no reinicia la prueba.</p>
   <label className="registration-consent"><input name="consent" type="checkbox" value="1" required aria-describedby="trial-conditions"/><span>Acepto estas condiciones de la prueba y suscripción.</span></label>
   <button className="primary" type="submit">Crear mi agencia con Google</button>
   <small>Google verifica tu correo. No se cobrará nada al iniciar la prueba; el pago recurrente se autoriza por separado al suscribirte.</small>
   {error&&<p role="alert" className="error">{error}</p>}
  </form>
  <p className="registration-links"><Link href="/">Ya tengo cuenta</Link><a href="https://sistema.scaleparaguay.com/demo">Explorar la demo primero</a></p>
  <small>© {new Date().getFullYear()} Scale OS. Todos los derechos reservados.</small>
 </section></main>;
}
