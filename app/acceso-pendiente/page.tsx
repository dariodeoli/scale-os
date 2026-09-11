"use client";
import {useEffect,useRef,useState} from 'react';
import {teamRoleLabels} from '../team-directory';
async function withDeadline<T>(controller:AbortController,operation:(signal:AbortSignal)=>Promise<T>):Promise<T>{
 const transport=new AbortController();let timeout:ReturnType<typeof setTimeout>|undefined;
 let cancel=()=>{};
 const interrupted=new Promise<never>((_resolve,reject)=>{
  cancel=()=>{transport.abort();reject(new Error('Consulta cancelada'));};
  controller.signal.addEventListener('abort',cancel,{once:true});
  timeout=setTimeout(()=>{transport.abort();reject(new Error('La conexión tardó demasiado. Volveremos a comprobar tu acceso.'));},10000);
 });
 try{return await Promise.race([operation(transport.signal),interrupted]);}
 finally{clearTimeout(timeout);controller.signal.removeEventListener('abort',cancel);}
}
export default function PendingAccess(){
 const [data,setData]=useState<{organization_name:string;email:string;role:string;status:string}|null>(null),[error,setError]=useState('');
 const [loggingOut,setLoggingOut]=useState(false),[logoutError,setLogoutError]=useState('');
 const logoutRequest=useRef<AbortController|null>(null);
 useEffect(()=>{
  let active=true,request:AbortController|null=null;
  const check=async()=>{
   if(!active||request||document.visibilityState!=='visible'||logoutRequest.current)return;
   const controller=new AbortController();request=controller;
   try{
    const d=await withDeadline(controller,async signal=>{
     const r=await fetch('/core-api/api/invitations/status',{cache:'no-store',credentials:'include',signal}),value=await r.json();
     if(!r.ok)throw Error(value.error||'No se pudo comprobar la solicitud');
     return value;
    });
    if(!['pending','approved','rejected','unavailable'].includes(d.status))throw Error('No se pudo comprobar la solicitud');
    if(active&&!controller.signal.aborted){setData(d);setError('');}
   }catch(e){if(active&&!controller.signal.aborted){setData(null);setError(e instanceof Error?e.message:'No se pudo comprobar la solicitud');}}
   finally{if(request===controller)request=null;}
  };
  const visible=()=>{if(document.visibilityState==='visible')void check();};
  void check();const timer=setInterval(visible,15000);document.addEventListener('visibilitychange',visible);
  return()=>{active=false;request?.abort();logoutRequest.current?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[]);
 async function logout(){
  if(logoutRequest.current)return;
  const controller=new AbortController();logoutRequest.current=controller;setLoggingOut(true);setLogoutError('');
  try{
   const r=await withDeadline(controller,signal=>fetch('/core-api/api/auth/logout',{method:'POST',credentials:'include',signal}));
   if(!r.ok)throw Error('No se pudo cerrar sesión. Intentá de nuevo.');
   if(!controller.signal.aborted)window.location.assign('/');
  }catch{if(!controller.signal.aborted)setLogoutError('No se pudo cerrar sesión. Intentá de nuevo.');}
  finally{if(logoutRequest.current===controller)logoutRequest.current=null;if(!controller.signal.aborted)setLoggingOut(false);}
 }
 const statusTitle=error?'No pudimos comprobar tu acceso':!data?'Comprobando tu solicitud…':data.status==='approved'?'Tu acceso está listo':['rejected','unavailable'].includes(data.status)?'Acceso no habilitado':'Acceso pendiente de aprobación';
 return <main className="login-page"><section className="login-card"><img src="/brand/icon-192.png" width={56} height={56} alt="Scale OS"/><div role="status" aria-live="polite" aria-atomic="true"><h1>{statusTitle}</h1></div><h2>{data?.organization_name||'Tu equipo en Scale OS'}</h2>{data&&<p>{data.email}<br/>Permiso {data.status==='approved'?'habilitado':'solicitado'}: <strong>{teamRoleLabels[data.role]||data.role}</strong></p>}{data?.status==='approved'?<a className="primary" href="/produccion">Entrar a Scale OS</a>:<p>{data?.status==='unavailable'?'La invitación ya no está disponible o tu acceso dejó de estar habilitado. Esta solicitud no puede aprobarse. Pedí al administrador que revise tu acceso y, si corresponde, te envíe un enlace nuevo.':data?.status==='rejected'?'Tu solicitud no fue aprobada. Contactá al administrador de la empresa.':'Una vez que la administración apruebe tu solicitud, podrás utilizar Scale OS según el permiso autorizado. Esta pantalla comprueba el estado automáticamente.'}</p>}{error&&<p role="alert">{error}</p>}{logoutError&&<p role="alert">{logoutError}</p>}<button className="secondary" disabled={loggingOut} onClick={logout}>{loggingOut?'Cerrando sesión…':'Cerrar sesión'}</button></section></main>;
}
