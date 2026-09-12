'use client';
import {FormEvent,useEffect,useState} from 'react';
import {portalApi} from '../../client-portal-api';
import '../portal.css';
export default function ClientLogin(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const value=new URLSearchParams(window.location.search).get('error');if(value)setError(value);},[]);
 async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{await portalApi('/auth/login',{email,password});window.location.assign('/cliente/entregas');}catch(e){setError(e instanceof Error?e.message:'No se pudo ingresar');}finally{setBusy(false);}}
 return <main className="client-portal"><section className="client-portal-card narrow"><p className="portal-status">SCALE OS · PORTAL DEL CLIENTE</p><h1>Ver entregables</h1><p className="portal-muted">Ingresá con el correo y contraseña que configuraste al aceptar la invitación.</p><a className="button secondary" href="/core-api/api/client-portal/auth/google/start">Continuar con Google</a><p className="portal-muted">o ingresá con tu contraseña</p><form onSubmit={submit}><label>Correo<input type="email" value={email} onChange={event=>setEmail(event.target.value)} autoComplete="email" required/></label><label>Contraseña<input type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="current-password" minLength={12} required/></label>{error&&<p className="error" role="alert">{error}</p>}<button disabled={busy}>{busy?'Ingresando…':'Ingresar'}</button></form></section></main>;
}
