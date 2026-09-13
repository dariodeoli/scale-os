"use client";

import {FormEvent,useEffect,useState} from 'react';
import Link from 'next/link';
import {founderPricingNote} from '../founder-pricing';
import {AccessLayout} from '../access-layout';
import {GoogleSignIn} from '../google-sign-in';
import {PasswordField} from '../password-field';
import './registration.css';

export default function Registration(){
 const [step,setStep]=useState<1|2|3>(1),[error,setError]=useState(''),[notice,setNotice]=useState(''),[submitting,setSubmitting]=useState(false);
 const [email,setEmail]=useState(''),[company,setCompany]=useState(''),[currency,setCurrency]=useState<'USD'|'PYG'>('USD'),[consent,setConsent]=useState(false),[fullName,setFullName]=useState(''),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState('');
 useEffect(()=>{setError(new URLSearchParams(window.location.search).get('error')||'');},[]);
 const clearFeedback=()=>{setError('');setNotice('');};
 const validEmail=()=>/^\S+@\S+\.\S+$/.test(email.trim());
 function nextFromEmail(event:FormEvent<HTMLFormElement>){event.preventDefault();clearFeedback();if(!validEmail()){setError('Ingresá un correo válido para continuar.');return;}setStep(2);}
 function validateAgency(){clearFeedback();if(company.trim().length<2){setError('Indicá el nombre de tu agencia para continuar.');return false;}if(!consent){setError('Aceptá las condiciones de la prueba y suscripción para continuar.');return false;}return true;}
 function continueWithGoogle(){if(!validateAgency())return;const params=new URLSearchParams({signup:'1',company:company.trim(),currency,consent:'1'});window.location.assign(`https://admin.scaleparaguay.com/api/auth/google/start?${params}`);}
 async function registerWithPassword(){
  if(!validateAgency())return;
  if(!validEmail()){setStep(1);setError('Ingresá un correo válido para continuar.');return;}
  if(password!==confirmPassword){setError('Las contraseñas no coinciden.');return;}
  setSubmitting(true);
  try{const response=await fetch('/core-api/api/auth/password/register',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim(),password,full_name:fullName.trim(),company:company.trim(),currency,consent:true}),referrerPolicy:'no-referrer'}),data=await response.json().catch(()=>null);if(!response.ok)throw Error(data?.error||'No se pudo crear la cuenta. Intentá nuevamente.');setNotice(data?.message||'Revisá tu correo para verificar tu cuenta.');}
  catch(cause){setError(cause instanceof Error?cause.message:'No se pudo crear la cuenta.');}finally{setSubmitting(false);}
 }
 return <AccessLayout pageClassName="registration-page" cardClassName="registration-card" eyebrow="TU AGENCIA, TU ESPACIO">
  <ol className="registration-progress" aria-label="Progreso del registro"><li className={step>=1?'current':''}><span>1</span><b>Correo</b></li><li className={step>=2?'current':''}><span>2</span><b>Agencia</b></li><li className={step>=3?'current':''}><span>3</span><b>Acceso</b></li></ol>
  {notice?<section className="registration-complete" aria-live="polite"><h1>Revisá tu correo</h1><p>{notice}</p><Link className="secondary" href="/">Ir a iniciar sesión</Link></section>:<>
   {step===1&&<form onSubmit={nextFromEmail} className="registration-step"><h1>Empecemos con tu correo.</h1><p>Primero verificamos cómo querés identificarte. Después configurás tu agencia.</p><label>Correo de trabajo<input value={email} onChange={event=>setEmail(event.target.value)} type="email" autoComplete="email" autoFocus placeholder="tu@agencia.com" required/></label><p className="form-note">Usamos este correo para confirmar tu cuenta. No pedimos tarjeta durante la prueba.</p><button className="primary" type="submit">Continuar</button></form>}
   {step===2&&<section className="registration-step"><h1>Configurá tu agencia.</h1><p>Esto se puede editar más adelante desde Configuración.</p><label>Nombre de tu agencia<input value={company} onChange={event=>setCompany(event.target.value)} minLength={2} maxLength={160} autoComplete="organization" autoFocus placeholder="Tu agencia"/></label><label>Moneda de la suscripción<select value={currency} onChange={event=>setCurrency(event.target.value as 'USD'|'PYG')}><option value="USD">US$10 al mes</option><option value="PYG">Gs. 50.000 al mes</option></select></label><p className="registration-terms" id="founder-conditions"><strong>Precio de lanzamiento por agencia.</strong> Todos los integrantes están incluidos. {founderPricingNote}</p><details className="registration-details"><summary>Ver condiciones de la prueba</summary><p id="trial-conditions">Los 30 días empiezan al crear la agencia, sin tarjeta. Después se aplica la moneda elegida. Hay 2 días de gracia; al tercer día sin pago se suspende el uso sin borrar los datos. Volver a registrarte no reinicia la prueba.</p></details><label className="registration-consent"><input checked={consent} onChange={event=>setConsent(event.target.checked)} type="checkbox" aria-describedby="trial-conditions founder-conditions"/><span>Acepto estas condiciones de la prueba y suscripción.</span></label><button className="primary" type="button" onClick={()=>{if(validateAgency())setStep(3);}}>Continuar con correo</button><div className="registration-divider"><span>o preferís</span></div><GoogleSignIn onClick={continueWithGoogle} label="Crear con Google"/><small>Con Google usaremos el correo confirmado por Google para activar tu prueba.</small><button className="back-link" type="button" onClick={()=>{clearFeedback();setStep(1);}}>← Volver al correo</button></section>}
   {step===3&&<form onSubmit={event=>{event.preventDefault();void registerWithPassword();}} className="registration-step"><h1>Protegé tu acceso.</h1><p>Ya casi está. Elegí una contraseña para entrar con tu correo.</p><label>Nombre y apellido <small>Opcional</small><input value={fullName} onChange={event=>setFullName(event.target.value)} maxLength={160} autoComplete="name" placeholder="Cómo te llamamos"/></label><PasswordField label="Contraseña" name="password" value={password} onChange={setPassword} autoComplete="new-password" placeholder="12+ caracteres" required/><PasswordField label="Repetí tu contraseña" name="confirm_password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" placeholder="Repetí la contraseña" required/><p className="password-hint">Usá al menos 12 caracteres, con mayúscula, minúscula, número y símbolo; sin espacios.</p><button className="primary" type="submit" disabled={submitting}>{submitting?'Creando tu agencia…':'Crear mi agencia'}</button><button className="back-link" type="button" onClick={()=>{clearFeedback();setStep(2);}}>← Volver a la agencia</button></form>}
   {error&&<p role="alert" className="error">{error}</p>}
  </>}
  <p className="registration-links"><Link href="/">Ya tengo cuenta</Link><a href="https://sistema.scaleparaguay.com/demo">Explorar la demo primero</a></p>
 </AccessLayout>;
}
