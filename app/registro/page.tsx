"use client";
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {WorkspaceBrand} from '../workspace-brand';
import {founderPricingNote} from '../founder-pricing';
import {WorkspaceFooter} from '../workspace-footer';
import './registration.css';

export default function Registration(){
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [submitting,setSubmitting]=useState(false);
 const form=useRef<HTMLFormElement>(null);
 useEffect(()=>{setError(new URLSearchParams(window.location.search).get('error')||'');},[]);
 async function registerWithPassword(){
  const values=new FormData(form.current||undefined),password=String(values.get('password')||''),confirm=String(values.get('confirm_password')||'');
  setError('');setNotice('');
  if(values.get('consent')!=='1'){setError('Aceptá las condiciones de la prueba y suscripción para continuar.');return;}
  if(password!==confirm){setError('Las contraseñas no coinciden.');return;}
  setSubmitting(true);
  try{
   const response=await fetch('/core-api/api/auth/password/register',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:values.get('email'),password,full_name:values.get('full_name'),company:values.get('company'),currency:values.get('currency'),consent:true}),referrerPolicy:'no-referrer'});
   const data=await response.json().catch(()=>null);
   if(!response.ok)throw Error(data?.error||'No se pudo crear la cuenta. Intentá nuevamente.');
   setNotice(data?.message||'Revisá tu correo para verificar tu cuenta.');
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo crear la cuenta.');}
  finally{setSubmitting(false);}
 }
 return <main className="registration-page"><section className="registration-card">
  <Link href="https://sistema.scaleparaguay.com/" aria-label="Scale OS · Volver al sitio"><WorkspaceBrand/></Link>
  <p className="eyebrow">TU AGENCIA, TU ESPACIO</p>
  <h1>Probá Scale OS gratis.</h1>
  <p>Tu agencia, tu equipo y tus datos en un espacio privado. Tenés 30 días sin tarjeta para empezar.</p>
  <form ref={form} action="https://admin.scaleparaguay.com/api/auth/google/start" method="get">
   <input type="hidden" name="signup" value="1"/>
   <label>Nombre de tu agencia<input name="company" required minLength={2} maxLength={160} autoComplete="organization" placeholder="Tu agencia"/></label>
   <label>Moneda de la suscripción<select name="currency" defaultValue="USD"><option value="USD">US$10 al mes</option><option value="PYG">G. 50.000 al mes</option></select></label>
   <p className="registration-terms" id="founder-conditions"><strong>Precio de lanzamiento por agencia.</strong> US$10 o G. 50.000 al mes, con todos los integrantes incluidos. {founderPricingNote}</p>
   <details className="registration-details"><summary>Condiciones de la prueba</summary><p id="trial-conditions">Los 30 días empiezan al crear la agencia, sin tarjeta. Después se aplica la moneda elegida. Hay 2 días de gracia; al tercer día sin pago se suspende el uso sin borrar los datos. Volver a registrarte no reinicia la prueba.</p></details>
   <label className="registration-consent"><input name="consent" type="checkbox" value="1" required aria-describedby="trial-conditions founder-conditions"/><span>Acepto estas condiciones de la prueba y suscripción.</span></label>
   <button className="primary" type="submit">Continuar con Google</button>
   <div className="registration-divider"><span>o</span></div>
   <label>Nombre y apellido <small>Opcional</small><input name="full_name" maxLength={160} autoComplete="name" placeholder="Cómo te llamamos"/></label>
   <label>Correo<input name="email" type="email" autoComplete="email" placeholder="tu@agencia.com"/></label>
   <label>Contraseña<input name="password" type="password" autoComplete="new-password" placeholder="12+ caracteres"/></label>
   <label>Repetí tu contraseña<input name="confirm_password" type="password" autoComplete="new-password" placeholder="Repetí la contraseña"/></label>
   <p className="password-hint">Usá al menos 12 caracteres, con mayúscula, minúscula, número y símbolo; sin espacios.</p>
   <button className="secondary" type="button" disabled={submitting} onClick={registerWithPassword}>{submitting?'Creando cuenta…':'Crear cuenta con correo'}</button>
   <small>Google o correo: elegís cómo entrar. En ambos casos verificamos tu correo antes de activar la prueba. No se cobrará nada al iniciar; el pago recurrente se autoriza por separado al suscribirte.</small>
   {error&&<p role="alert" className="error">{error}</p>}
   {notice&&<p role="status" className="success">{notice}</p>}
  </form>
  <p className="registration-links"><Link href="/">Ya tengo cuenta</Link><a href="https://sistema.scaleparaguay.com/demo">Explorar la demo primero</a></p>
  <WorkspaceFooter/>
 </section></main>;
}
