'use client';
import {FormEvent,useEffect,useState} from 'react';
import {portalApi} from '../../client-portal-api';
import {GoogleSignIn} from '../../google-sign-in';
import {PasswordField} from '../../password-field';
import '../portal.css';
export default function ClientLogin(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const value=new URLSearchParams(window.location.search).get('error');if(value)setError(value);},[]);
 async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{await portalApi('/auth/login',{email,password});window.location.assign('/cliente/entregas');}catch(e){setError(e instanceof Error?e.message:'No se pudo ingresar');}finally{setBusy(false);}}
 return <main className="client-portal"><section className="client-portal-card narrow"><p className="portal-status">SCALE OS · PORTAL DEL CLIENTE</p><h1>Ver entregables</h1><p className="portal-muted">Ingresá con el correo y contraseña que configuraste al aceptar la invitación.</p><form onSubmit={submit}><label>Correo<input type="email" value={email} onChange={event=>setEmail(event.target.value)} autoComplete="email" required/></label><PasswordField label="Contraseña" name="password" value={password} onChange={setPassword} autoComplete="current-password" required/>{error&&<p className="error" role="alert">{error}</p>}<button disabled={busy}>{busy?'Ingresando…':'Ingresar'}</button><a className="portal-recovery-link" href="/cliente/recuperar">¿Olvidaste tu contraseña?</a></form><div className="portal-alternate-login"><GoogleSignIn compact href="/core-api/api/client-portal/auth/google/start"/></div></section></main>;
}
