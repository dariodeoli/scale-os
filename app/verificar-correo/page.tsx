"use client";
import {useEffect,useRef,useState} from 'react';
import {useSingleFlightSubmit} from '../use-single-flight-submit';
import {PendingFields} from '../ui/form-state';
import Link from 'next/link';
import {esToken,extractTokenFromUrl} from 'owncoding-ui/core';
import {AccessLayout} from '../access-layout';
import {api} from '../operations';
import {EmailField} from '../email-field';
import {Button as ScaleButton} from "../ui/button";


type State='checking'|'done'|'error'|'missing';
export default function VerifyEmailPage(){
 const [state,setState]=useState<State>('checking'),[message,setMessage]=useState('Comprobando tu enlace de verificación…');
 const [email,setEmail]=useState(''),[resendMessage,setResendMessage]=useState('');
 const submission=useSingleFlightSubmit(resendVerification),resending=submission.pending,feedback=useRef<HTMLParagraphElement>(null);
 const verification=useRef<Promise<{pending?:boolean;trial?:boolean}>|null>(null);
 useEffect(()=>{if(resendMessage&&!resending)feedback.current?.focus();},[resendMessage,resending]);
 async function resendVerification(){
  if(!email)return;
  setResendMessage('');
  try{
   // El API responde genérico: no revela si el correo existe (issue #22).
   await api('/api/auth/password/verification/request',{email});
   setResendMessage('Si hay una cuenta pendiente para ese correo, enviamos un nuevo enlace de verificación.');
  }catch(cause){setResendMessage(cause instanceof Error?cause.message:'No pudimos solicitar un nuevo enlace.');}
 }
 useEffect(()=>{
  // El enlace completo (o pegado desde el correo) resuelve el token con la util compartida.
  const token=extractTokenFromUrl(window.location.href);
  if(!esToken(token)){setState('missing');setMessage('Este enlace no es válido o ya venció. Pedí uno nuevo con tu correo acá abajo.');return;}
  let active=true,redirectTimer:ReturnType<typeof setTimeout>|undefined;
  // StrictMode replays effects; both subscriptions share one token-consuming request.
  if(!verification.current)verification.current=(async()=>{
    const response=await fetch('/core-api/api/auth/password/verify',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),referrerPolicy:'no-referrer'});
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw Error(data?.error||'No pudimos verificar el correo.');
    return data||{};
  })();
  void verification.current.then(data=>{
    if(!active)return;
    window.history.replaceState({},'',window.location.pathname);
    setState('done');setMessage(data.pending?'Correo verificado. Tu solicitud quedó pendiente de aprobación.':'Correo verificado. Tu acceso ya está listo.');
    redirectTimer=setTimeout(()=>{if(active)window.location.assign(data.pending?'/acceso-pendiente':data.trial?'/produccion':'/');},650);
  }).catch(cause=>{if(active){setState('error');setMessage(cause instanceof Error?cause.message:'No pudimos verificar el correo.');}});
  return()=>{active=false;clearTimeout(redirectTimer);};
 },[]);
 return <AccessLayout eyebrow="Scale OS · acceso seguro">
  <div className="grid gap-3">
   <h1 className="text-2xl font-bold tracking-tight text-fore">{state==='done'?'Correo verificado':'Verificación de correo'}</h1>
   <p role="status" className={state==='error'||state==='missing'?'text-sm text-bad':'text-sm text-ok'} aria-live="polite">{message}</p>
   {state==='error'||state==='missing'?<PendingFields pending={resending}><form className="grid gap-3" onSubmit={submission.onSubmit}>
    <label htmlFor="verify-email" className="grid gap-1.5 text-xs text-mute">Correo de la cuenta<EmailField id="verify-email" value={email} onChange={setEmail} disabled={resending}/></label>
    <ScaleButton className="primary" type="submit" disabled={!email||resending} variant="primary">{resending?'Enviando…':'Reenviar correo de verificación'}</ScaleButton>
    {resendMessage?<p ref={feedback} tabIndex={-1} role="status" className="text-xs text-mute">{resendMessage}</p>:null}
    <p className="flex flex-wrap gap-3 text-[11.5px] text-mute"><Link aria-disabled={resending||undefined} tabIndex={resending?-1:undefined} onClick={event=>{if(resending)event.preventDefault();}} className="inline-flex min-h-11 items-center" href="/registro">Volver al registro</Link><Link aria-disabled={resending||undefined} tabIndex={resending?-1:undefined} onClick={event=>{if(resending)event.preventDefault();}} className="inline-flex min-h-11 items-center" href="/">Ir al inicio de sesión</Link></p>
   </form></PendingFields>:null}
  </div>
 </AccessLayout>;
}
