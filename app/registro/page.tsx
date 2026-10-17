"use client";

import {FormEvent,useEffect,useState} from 'react';
import Link from 'next/link';
import {AvisoPrivacidad,ConsentimientoDatos,registroConsentimiento} from 'owncoding-ui';
import {founderPricingNote} from '../founder-pricing';
import {AccessLayout} from '../access-layout';
import {GoogleSignIn} from '../google-sign-in';
import {PasswordField} from '../password-field';
import {EmailField} from '../email-field';
import {TextField} from '../text-field';
import {emailValid} from '../field-rules';
import {SelectCustom} from '../profile-controls';
import {PRIVACY_NOTICE} from '../privacy-notice';
import {registerPrivacyConsent} from '../privacy-data';

export default function Registration(){
 const [step,setStep]=useState<1|2|3>(1),[error,setError]=useState(''),[notice,setNotice]=useState(''),[submitting,setSubmitting]=useState(false);
 const [googleTicket,setGoogleTicket]=useState('');
 const [email,setEmail]=useState(''),[company,setCompany]=useState(''),[currency,setCurrency]=useState<'USD'|'PYG'>('USD'),[consent,setConsent]=useState(false),[privacyConsent,setPrivacyConsent]=useState(false),[privacyError,setPrivacyError]=useState(''),[fullName,setFullName]=useState(''),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState('');
 useEffect(()=>{const params=new URLSearchParams(window.location.search),pending=params.get('pendingRegistration')||'';setError(params.get('error')||'');if(pending){setGoogleTicket(pending);setStep(2);const clean=new URL(window.location.href);clean.searchParams.delete('pendingRegistration');window.history.replaceState({},'',clean.pathname+clean.search+clean.hash);}},[]);
 const clearFeedback=()=>{setError('');setNotice('');};
 const validEmail=()=>emailValid(email);
 // Consentimiento de datos personales (Ley 7593/2025, Refs #113): casilla
 // explícita, nunca premarcada, con la versión del aviso a la vista. Se envía
 // al registro y, además, se registra en el API de #112 (o en la cola local
 // documentada) con canal y fecha reales. El alta en el API ya graba el
 // consentimiento (`registerTrial` → `grantConsent`); el registro adicional es
 // complementario: en el alta por correo todavía no hay sesión (401), así que su
 // fallo nunca puede presentar como fallida una cuenta que sí se creó.
 const privacyRecord=()=>registroConsentimiento({finalidad:'cuenta-y-prestacion',aceptado:true,version:PRIVACY_NOTICE.version,canal:'registro-cuenta',titular:email.trim().toLowerCase()});
 function nextFromEmail(event:FormEvent<HTMLFormElement>){event.preventDefault();clearFeedback();if(!validEmail()){setError('Ingresá un correo válido para continuar.');return;}setStep(2);}
 function validateAgency(){clearFeedback();if(company.trim().length<2){setError('Indicá el nombre de tu agencia para continuar.');return false;}if(!consent){setError('Aceptá las condiciones de la prueba y suscripción para continuar.');return false;}if(!privacyConsent){setPrivacyError('Necesitamos tu aceptación para crear la cuenta y tratar tus datos con esa finalidad.');return false;}return true;}
 function continueWithGoogle(){clearFeedback();window.location.assign('/core-api/api/auth/google/start?signup=1');}
 async function completeGoogleRegistration(){
  if(!validateAgency())return;
  setSubmitting(true);
  try{const response=await fetch('/core-api/api/auth/google/registration/complete',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket:googleTicket,company:company.trim(),currency,consent:true,privacy:privacyRecord()}),referrerPolicy:'no-referrer'}),data=await response.json().catch(()=>null);if(!response.ok)throw Error(data?.error||'No se pudo crear la cuenta. Intentá nuevamente.');await registerPrivacyConsent({finalidad:'cuenta-y-prestacion',canal:'registro-google'}).catch(()=>{});window.location.assign(data?.redirect||'/produccion');}
  catch(cause){setError(cause instanceof Error?cause.message:'No se pudo crear la cuenta.');}finally{setSubmitting(false);}
 }
 async function registerWithPassword(){
  if(!validateAgency())return;
  if(!validEmail()){setStep(1);setError('Ingresá un correo válido para continuar.');return;}
  if(password!==confirmPassword){setError('Las contraseñas no coinciden.');return;}
  setSubmitting(true);
  try{const response=await fetch('/core-api/api/auth/password/register',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim(),password,full_name:fullName.trim(),company:company.trim(),currency,consent:true,privacy:privacyRecord()}),referrerPolicy:'no-referrer'}),data=await response.json().catch(()=>null);if(!response.ok)throw Error(data?.error||'No se pudo crear la cuenta. Intentá nuevamente.');await registerPrivacyConsent({finalidad:'cuenta-y-prestacion',canal:'registro-cuenta',titular:email.trim().toLowerCase()}).catch(()=>{});setNotice(data?.message||'Revisá tu correo para verificar tu cuenta.');}
  catch(cause){setError(cause instanceof Error?cause.message:'No se pudo crear la cuenta.');}finally{setSubmitting(false);}
 }
 return <AccessLayout eyebrow="Tu agencia, tu espacio" cardClassName="registration-card" links={<><Link href="/">Ya tengo cuenta</Link><a href="https://sistema.scaleparaguay.com/demo">Explorar demo</a></>}>
  <ol className="flex gap-2" aria-label="Progreso del registro">
   {([['Identidad',1],['Agencia',2],['Acceso',3]] as const).map(([label,value])=>
    <li key={label} aria-current={step===value?'step':undefined} className={`flex min-w-0 items-center justify-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] sm:flex-1 ${step===value?'flex-1 border-fono text-fore':'flex-none sm:flex-1 '+(step>value?'border-ok/40 text-ok':'border-ink-600 text-mute')}`}>
     <span className="grid size-5 shrink-0 place-items-center rounded-md border border-current text-[10px] font-bold tabular-nums" aria-hidden="true">{step>value?'✓':value}</span>
     <b className={`font-semibold ${step===value?'':'max-sm:sr-only'}`}>{label}</b>
    </li>)}
  </ol>
  {notice?<section className="grid gap-3" aria-live="polite"><h1 className="text-2xl font-bold tracking-tight text-fore">Revisá tu correo</h1><p className="text-sm text-mute">{notice}</p><Link className="secondary" href="/">Ir a iniciar sesión</Link></section>:<>
   {step===1&&<form onSubmit={nextFromEmail} className="registration-step grid gap-3"><h1 className="text-2xl font-bold tracking-tight text-fore">Empecemos con tu identidad.</h1><p className="text-sm text-mute">Primero verificamos cómo querés identificarte. Después configurás tu agencia.</p><GoogleSignIn onClick={continueWithGoogle} label="Continuar con Google"/><small className="text-[11.5px] text-mute">Google confirma tu correo antes de que creemos la agencia.</small><div className="flex items-center gap-3 text-[10px] uppercase tracking-[.13em] text-mute" aria-hidden="true"><span className="h-px flex-1 bg-ink-600"/><span>o con correo</span><span className="h-px flex-1 bg-ink-600"/></div><label className="grid gap-1.5 text-xs text-mute">Correo de trabajo<EmailField value={email} onChange={setEmail} placeholder="tu@agencia.com" required/></label><AvisoPrivacidad compact finalidad="Privacidad de tus datos." detalle="No pedimos tarjeta durante la prueba ni usamos este correo para publicidad." politicaUrl="/privacidad" derechosUrl="/privacidad#derechos"/><button className="primary" type="submit">Continuar con correo</button></form>}
   {step===2&&<section className="registration-step grid gap-3"><h1 className="text-2xl font-bold tracking-tight text-fore">Configurá tu agencia.</h1><p className="text-sm text-mute">{googleTicket?'Tu identidad de Google ya está verificada. Completá estos datos para crear la agencia.':'Esto se puede editar más adelante desde Configuración.'}</p><div className="registration-agency-fields"><label className="grid gap-1.5 text-xs text-mute">Nombre de tu agencia<TextField value={company} onChange={setCompany} minLength={2} maxLength={160} autoComplete="organization" autoFocus placeholder="Tu agencia"/></label><SelectCustom label="Moneda de la suscripción" choices={[{value:'USD',label:'US$10 al mes'},{value:'PYG',label:'Gs. 50.000 al mes'}]} value={currency} onChange={value=>setCurrency(value as 'USD'|'PYG')}/></div><p className="rounded-lg border border-ink-600 px-3 py-2 text-[11.5px] text-mute" id="founder-conditions"><strong className="text-fore">Precio de lanzamiento por agencia.</strong> Todos los integrantes están incluidos. {founderPricingNote}</p><details className="rounded-lg border border-ink-600 px-3 py-2 text-[11.5px] text-mute"><summary className="cursor-pointer text-fore">Ver condiciones de la prueba</summary><p className="mt-2" id="trial-conditions">Los 30 días empiezan al crear la agencia, sin tarjeta. Después se aplica la moneda elegida. Hay 2 días de gracia; al tercer día sin pago se suspende el uso sin borrar los datos. Volver a registrarte no reinicia la prueba.</p></details><label className="flex items-start gap-2 text-[11.5px] text-mute"><input checked={consent} onChange={event=>setConsent(event.target.checked)} type="checkbox" aria-describedby="trial-conditions founder-conditions"/><span>Acepto estas condiciones de la prueba y suscripción.</span></label><ConsentimientoDatos checked={privacyConsent} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>{setPrivacyConsent(event.target.checked);setPrivacyError('');}} finalidad="Acepto el tratamiento de mis datos personales para crear mi cuenta y prestarme el servicio." detalle="Correo, nombre y datos de la agencia; los usamos para autenticarte, prestarte soporte y enviarte avisos operativos." politicaUrl="/privacidad" version={PRIVACY_NOTICE.version} error={privacyError||undefined}/>{googleTicket?<button className="primary" type="button" disabled={submitting} onClick={()=>{void completeGoogleRegistration();}}>{submitting?'Creando tu agencia…':'Crear mi agencia con Google'}</button>:<button className="primary" type="button" onClick={()=>{if(validateAgency())setStep(3);}}>Continuar con correo</button>}<button className="text-button" type="button" onClick={()=>{clearFeedback();setGoogleTicket('');setStep(1);}}>← Volver al inicio</button></section>}
   {step===3&&<form onSubmit={event=>{event.preventDefault();void registerWithPassword();}} className="registration-step grid gap-3"><h1 className="text-2xl font-bold tracking-tight text-fore">Protegé tu acceso.</h1><p className="text-sm text-mute">Ya casi está. Elegí una contraseña para entrar con tu correo.</p><label className="grid gap-1.5 text-xs text-mute">Nombre y apellido <small className="text-mute">Opcional</small><TextField value={fullName} onChange={setFullName} maxLength={120} autoComplete="name" placeholder="Cómo te llamamos"/></label><PasswordField label="Contraseña" name="password" value={password} onChange={setPassword} autoComplete="new-password" placeholder="8+ caracteres" required minLength={8}/><PasswordField label="Repetí tu contraseña" name="confirm_password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" placeholder="Repetí la contraseña" required minLength={8}/><p className="text-[11.5px] text-mute">Usá al menos 8 caracteres; no hacen falta mayúsculas, números ni símbolos.</p><p className="text-[11.5px] text-mute">Al crear la cuenta registramos tu aceptación del Aviso de Privacidad {PRIVACY_NOTICE.version} ({PRIVACY_NOTICE.fechaLabel}). Podés revocarla desde «Mis datos», en tu perfil.</p><button className="primary" type="submit" disabled={submitting}>{submitting?'Creando tu agencia…':'Crear mi agencia'}</button><button className="text-button" type="button" onClick={()=>{clearFeedback();setStep(2);}}>← Volver a la agencia</button></form>}
   {error?<p role="alert" className="error">{error}</p>:null}
  </>}
 </AccessLayout>;
}
