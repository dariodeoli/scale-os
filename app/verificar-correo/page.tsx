"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {WorkspaceBrand} from '../workspace-brand';
import {WorkspaceFooter} from '../workspace-footer';
import '../registro/registration.css';

type State='checking'|'done'|'error'|'missing';
export default function VerifyEmailPage(){
 const [state,setState]=useState<State>('checking'),[message,setMessage]=useState('Comprobando tu enlace de verificación…');
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search),token=params.get('verifyToken')||'';
  if(!/^[a-f0-9]{64}$/.test(token)){setState('missing');setMessage('Este enlace de verificación no es válido. Solicitá uno nuevo desde el registro.');return;}
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
 return <main className="registration-page"><section className="registration-card" aria-busy={state==='checking'}>
  <WorkspaceBrand/><p className="eyebrow">SCALE OS · ACCESO SEGURO</p><h1>{state==='done'?'Correo verificado':'Verificación de correo'}</h1>
  <p role="status" className={state==='error'||state==='missing'?'error':'success'}>{message}</p>
  {(state==='error'||state==='missing')&&<p className="registration-links"><Link href="/registro">Volver al registro</Link><Link href="/">Ir al inicio de sesión</Link></p>}
  <WorkspaceFooter/>
 </section></main>;
}
