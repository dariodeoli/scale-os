"use client";
import {useEffect,useState} from 'react';
import {teamRoleLabels} from '../team-directory';
import {WorkspaceFooter} from '../workspace-footer';
type Preview={organization_name:string;role:string;mode:'single'|'approval'};
type State={status:'loading'|'missing'|'invalid'|'pending'|'previous-error'|'unavailable'|'connection'}|{status:'ready';info:Preview;token:string};
function isPreview(value:unknown):value is Preview{
 if(!value||typeof value!=='object')return false;
 const info=value as Partial<Preview>;
 return typeof info.organization_name==='string'&&Boolean(info.organization_name.trim())&&typeof info.role==='string'&&Object.hasOwn(teamRoleLabels,info.role)&&(info.mode==='single'||info.mode==='approval');
}
const notices={
 loading:{heading:'Comprobando invitación',message:'Estamos verificando que el enlace esté disponible antes de continuar con Google.'},
 missing:{heading:'Falta el enlace de invitación',message:'Abrí el enlace completo que te compartió el equipo para comprobar tu invitación.'},
 invalid:{heading:'Enlace de invitación incompleto o inválido',message:'Revisá que hayas copiado el enlace completo o pedí uno nuevo al equipo.'},
 pending:{heading:'Solicitud pendiente de aprobación',message:'Si ya enviaste tu solicitud, un administrador debe aprobarla desde Equipo. Ingresá para consultar su estado actual.'},
 'previous-error':{heading:'Retomá tu invitación',message:'La dirección contiene un aviso de un intento anterior. No confirma el estado actual del enlace. Volvé a abrir la invitación original para verificarla e intentar nuevamente.'},
 unavailable:{heading:'Invitación no disponible',message:'El enlace ya no está disponible: pudo vencer, usarse o ser revocado. Pedí una nueva invitación al equipo.'},
 connection:{heading:'No pudimos comprobar la invitación',message:'No pudimos obtener una respuesta válida del servicio. Esto no confirma que el enlace haya vencido. Revisá tu conexión e intentá nuevamente.'},
};

export default function InvitationPage(){
 const [state,setState]=useState<State>({status:'loading'});
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const query=new URLSearchParams(window.location.search),token=query.get('token')||'';
  // Query errors describe an earlier callback, never a fresh preview result.
  if(!token){setState({status:query.get('pending')==='1'?'pending':query.has('error')?'previous-error':'missing'});return;}
  if(!/^[-\w]{43}$/.test(token)){setState({status:'invalid'});return;}
  const controller=new AbortController();
  let active=true;
  setState({status:'loading'});
  const timeout=setTimeout(()=>{
   controller.abort();
   if(active)setState({status:'connection'});
  },10000);
  void (async()=>{
   try{
    const response=await fetch('/core-api/api/invitations/preview?token='+encodeURIComponent(token),{cache:'no-store',signal:controller.signal,referrerPolicy:'no-referrer'});
    if(!active||controller.signal.aborted)return;
    if(response.status===410){setState({status:'unavailable'});return;}
    if(!response.ok){setState({status:'connection'});return;}
    const info:unknown=await response.json();
    if(!active||controller.signal.aborted)return;
    setState(isPreview(info)?{status:'ready',info,token}:{status:'connection'});
   }catch{
    if(active&&!controller.signal.aborted)setState({status:'connection'});
   }finally{clearTimeout(timeout);}
  })();
  return()=>{active=false;clearTimeout(timeout);controller.abort();};
 },[attempt]);
 const notice=state.status==='ready'?null:notices[state.status];
 return <main className="login-page invite-page"><section className="login-card invite-card" aria-busy={state.status==='loading'}>
  <div className="login-brand"><img src="/brand/icon-192.png" width={56} height={56} alt="Scale OS"/></div>
  <p className="invite-eyebrow">Scale OS · Acceso de equipo</p>
  <h1>{notice?.heading||'Invitación al equipo'}</h1>
  {state.status==='ready'?<>
   <p className="login-copy">Te invitaron a trabajar en este espacio.</p>
   <div className="invite-summary"><strong>{state.info.organization_name}</strong><span>Permiso asignado: <b>{teamRoleLabels[state.info.role]}</b></span></div>
   <p className="login-copy">{state.info.mode==='single'?'Este enlace habilita una sola cuenta.':'Podés solicitar acceso; el dueño lo aprobará antes de habilitarte.'}</p>
   <a className="primary login-button" referrerPolicy="no-referrer" href={'https://admin.scaleparaguay.com/api/auth/google/start?invite='+encodeURIComponent(state.token)}>Continuar con Google</a>
  </>:<div className="auth-notice" role="status" aria-live="polite">
   <p>{notice?.message}</p>
   {state.status==='connection'&&<button type="button" className="primary login-button" onClick={()=>{setState({status:'loading'});setAttempt(value=>value+1);}}>Reintentar comprobación</button>}
  </div>}
  <p className="invite-footer"><a href="https://app.scaleparaguay.com/" referrerPolicy="no-referrer">{state.status==='pending'?'Consultar mi acceso':'Ir al inicio de sesión'}</a></p>
  <WorkspaceFooter/>
 </section></main>;
}
