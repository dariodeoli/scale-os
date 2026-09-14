'use client';
import {FormEvent,useMemo,useState} from 'react';
import {portalApi} from '../../client-portal-api';
import '../portal.css';

export default function ClientPasswordRecovery(){
 const resetToken=useMemo(()=>typeof window==='undefined'?'':new URLSearchParams(window.location.search).get('resetToken')||'',[]);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const isReset=Boolean(resetToken);
 async function submit(event:FormEvent){
  event.preventDefault();setBusy(true);setError('');setMessage('');
  try{
   if(isReset){
    if(password!==confirmation)throw Error('Las contraseñas no coinciden.');
    await portalApi('/auth/password/reset',{token:resetToken,password,email});
    setMessage('Tu contraseña se actualizó. Ya podés ingresar.');
   }else{
    const response=await portalApi<{message:string}>('/auth/password/request',{email});
    setMessage(response.message);
   }
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo completar la operación.');}finally{setBusy(false);}
 }
 return <main className="client-portal"><section className="client-portal-card narrow"><p className="portal-status">SCALE OS · PORTAL DEL CLIENTE</p><h1>{isReset?'Elegí una contraseña nueva':'Recuperar contraseña'}</h1><p className="portal-muted">{isReset?'Usá una clave de al menos 12 caracteres con mayúscula, minúscula, número y símbolo.':'Te enviaremos un enlace seguro si ese correo tiene acceso al portal.'}</p><form onSubmit={submit}>{isReset?<><label>Correo<input type="email" value={email} onChange={event=>setEmail(event.target.value)} autoComplete="email" required/></label><label>Nueva contraseña<input type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="new-password" minLength={12} required/></label><label>Confirmar contraseña<input type="password" value={confirmation} onChange={event=>setConfirmation(event.target.value)} autoComplete="new-password" minLength={12} required/></label></>:<label>Correo<input type="email" value={email} onChange={event=>setEmail(event.target.value)} autoComplete="email" required/></label>}{error&&<p className="error" role="alert">{error}</p>}{message&&<p className="success" role="status">{message}</p>}<button disabled={busy}>{busy?(isReset?'Guardando…':'Enviando…'):(isReset?'Guardar contraseña':'Enviar enlace')}</button><a className="portal-recovery-link" href="/cliente/ingresar">Volver a ingresar</a></form></section></main>;
}
