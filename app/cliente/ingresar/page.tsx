'use client';
import {useSingleFlightSubmit} from '../../use-single-flight-submit';
import {PendingFields} from '../../ui/form-state';

import {useEffect,useRef,useState} from 'react';
import {portalApi} from '../../client-portal-api';
import {GoogleSignIn} from '../../google-sign-in';
import {PasswordField} from '../../password-field';
import {EmailField} from '../../email-field';
import '../portal.css';
export default function ClientLogin(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState('');
 const submission=useSingleFlightSubmit(submit),busy=submission.pending,errorFocus=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{if(error&&!busy)errorFocus.current?.focus();},[error,busy]);
 useEffect(()=>{const value=new URLSearchParams(window.location.search).get('error');if(value)setError(value);},[]);
 async function submit(){setError('');try{await portalApi('/auth/login',{email,password});window.location.assign('/cliente/entregas');}catch(e){setError(e instanceof Error?e.message:'No se pudo ingresar');}}
 return <main className="client-portal"><section className="client-portal-card narrow"><p className="portal-status">SCALE OS · PORTAL DEL CLIENTE</p><h1>Ver entregables</h1><p className="portal-muted">Ingresá con el correo y contraseña que configuraste al aceptar la invitación.</p><PendingFields pending={busy}><form onSubmit={submission.onSubmit}><label>Correo<EmailField value={email} onChange={setEmail} required/></label><PasswordField label="Contraseña" name="password" value={password} onChange={setPassword} autoComplete="current-password" required/>{error&&<p ref={errorFocus} tabIndex={-1} className="error" role="alert">{error}</p>}<button disabled={busy}>{busy?'Ingresando…':'Ingresar'}</button><a className="portal-recovery-link" aria-disabled={busy||undefined} tabIndex={busy?-1:undefined} onClick={event=>{if(busy)event.preventDefault();}} href="/cliente/recuperar">¿Olvidaste tu contraseña?</a></form><div className="portal-alternate-login"><GoogleSignIn compact disabled={busy} href="/core-api/api/client-portal/auth/google/start"/></div></PendingFields></section></main>;
}
