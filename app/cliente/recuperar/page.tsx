'use client';
import {useSingleFlightSubmit} from '../../use-single-flight-submit';
import {PendingFields} from '../../ui/form-state';

import {useEffect,useMemo,useRef,useState} from 'react';
import {portalApi} from '../../client-portal-api';
import {PasswordField} from '../../password-field';
import {EmailField} from '../../email-field';
import '../portal.css';

export default function ClientPasswordRecovery(){
 const resetToken=useMemo(()=>typeof window==='undefined'?'':new URLSearchParams(window.location.search).get('resetToken')||'',[]);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');
 const submission=useSingleFlightSubmit(submit),busy=submission.pending,errorFocus=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{if(error&&!busy)errorFocus.current?.focus();},[error,busy]);
 const isReset=Boolean(resetToken);
 async function submit(){
  setError('');setMessage('');
  try{
   if(isReset){
    if(password!==confirmation)throw Error('Las contraseñas no coinciden.');
    await portalApi('/auth/password/reset',{token:resetToken,password,email});
    setMessage('Tu contraseña se actualizó. Ya podés ingresar.');
   }else{
    const response=await portalApi<{message:string}>('/auth/password/request',{email});
    setMessage(response.message);
   }
  }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo completar la operación.');}
 }
 return <main className="client-portal"><section className="client-portal-card narrow"><p className="portal-status">SCALE OS · PORTAL DEL CLIENTE</p><h1>{isReset?'Elegí una contraseña nueva':'Recuperar contraseña'}</h1><p className="portal-muted">{isReset?'Usá una clave de al menos 8 caracteres; no hacen falta mayúsculas ni símbolos.':'Te enviaremos un enlace seguro si ese correo tiene acceso al portal.'}</p><PendingFields pending={busy}><form onSubmit={submission.onSubmit}>{isReset?<><label>Correo<EmailField value={email} onChange={setEmail} required/></label><PasswordField label="Nueva contraseña" name="password" value={password} onChange={setPassword} autoComplete="new-password" required minLength={8}/><PasswordField label="Confirmar contraseña" name="confirm" value={confirmation} onChange={setConfirmation} autoComplete="new-password" required minLength={8}/></>:<label>Correo<EmailField value={email} onChange={setEmail} required/></label>}{error&&<p ref={errorFocus} tabIndex={-1} className="error" role="alert">{error}</p>}{message&&<p className="success" role="status">{message}</p>}<button disabled={busy}>{busy?(isReset?'Guardando…':'Enviando…'):(isReset?'Guardar contraseña':'Enviar enlace')}</button><a className="portal-recovery-link" aria-disabled={busy||undefined} tabIndex={busy?-1:undefined} onClick={event=>{if(busy)event.preventDefault();}} href="/cliente/ingresar">Volver a ingresar</a></form></PendingFields></section></main>;
}
