"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {esToken} from 'owncoding-ui';
import {AccessLayout} from '../access-layout';
import {api} from '../operations';

type State='checking'|'done'|'error'|'missing';
export default function VerifyEmailPage(){
 const [state,setState]=useState<State>('checking'),[message,setMessage]=useState('Comprobando tu enlace de verificación…');
 const [email,setEmail]=useState(''),[resending,setResending]=useState(false),[resendMessage,setResendMessage]=useState('');
 async function resendVerification(event:React.FormEvent){
  event.preventDefault();
  if(!email||resending)return;
  setResending(true);setResendMessage('');
  try{
   // El API responde genérico: no revela si el correo existe (issue #22).
   await api('/api/auth/password/verification/request',{email});
   setResendMessage('Si hay una cuenta pendiente para ese correo, enviamos un nuevo enlace de verificación.');
  }catch(cause){setResendMessage(cause instanceof Error?cause.message:'No pudimos solicitar un nuevo enlace.');}
  finally{setResending(false);}
 }
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search),token=params.get('verifyToken')||'';
  if(!esToken(token)){setState('missing');setMessage('Este enlace no es válido o ya venció. Pedí uno nuevo con tu correo acá abajo.');return;}
  let active=true;
  void (async()=>{
   try{
    const response=await fetch('/core-api/api/auth/password/verify',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),referrerPolicy:'no-referrer'});
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw Error(data?.error||'No pudimos verificar el correo.');
    if(!active)return;
    window.history.replaceState({},'',window.location.pathname);
    setState('done');setMessage(data?.pending?'Correo verificado. Tu solicitud quedó pendiente de aprobación.':'Correo verificado. Tu acceso ya está listo.');
    window.setTimeout(()=>{window.location.assign(data?.pending?'/acceso-pendiente':data?.trial?'/produccion':'/');},650);
   }catch(cause){if(active){setState('error');setMessage(cause instanceof Error?cause.message:'No pudimos verificar el correo.');}}
  })();
  return()=>{active=false;};
 },[]);
 return <AccessLayout eyebrow="Scale OS · acceso seguro">
  <div className="grid gap-3">
   <h1 className="text-2xl font-bold tracking-tight text-fore">{state==='done'?'Correo verificado':'Verificación de correo'}</h1>
   <p role="status" className={state==='error'||state==='missing'?'text-sm text-bad':'text-sm text-ok'} aria-live="polite">{message}</p>
   {state==='error'||state==='missing'?<form className="grid gap-3" onSubmit={resendVerification}>
    <label htmlFor="verify-email" className="grid gap-1.5 text-xs text-mute">Correo de la cuenta<input id="verify-email" type="email" value={email} autoComplete="email" maxLength={200} disabled={resending} onChange={event=>setEmail(event.target.value)} className="rounded-lg border border-ink-500 bg-ink-800 px-3 text-base text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 md:h-9 md:text-sm h-11"/></label>
    <button className="primary" type="submit" disabled={!email||resending}>{resending?'Enviando…':'Reenviar correo de verificación'}</button>
    {resendMessage?<p role="status" className="text-xs text-mute">{resendMessage}</p>:null}
    <p className="flex flex-wrap gap-3 text-[11.5px] text-mute"><Link className="inline-flex min-h-11 items-center" href="/registro">Volver al registro</Link><Link className="inline-flex min-h-11 items-center" href="/">Ir al inicio de sesión</Link></p>
   </form>:null}
  </div>
 </AccessLayout>;
}
