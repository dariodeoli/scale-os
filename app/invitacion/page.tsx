"use client";
import {useEffect,useState} from 'react';
import {teamRoleLabels} from '../team-directory';
import {AccessLayout} from '../access-layout';
import {StateChip} from '../ui-v2';
import {listDateFull} from '../list-format';
import {PasswordField} from '../password-field';
import {EmailField} from '../email-field';
type Preview={organization_name:string;role:string;mode:'single'|'approval';expires_at?:string};
type State={status:'loading'|'missing'|'invalid'|'pending'|'previous-error'|'unavailable'|'connection'|'expired'|'revoked'|'used'}|{status:'ready';info:Preview;token:string};
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
 expired:{heading:'Enlace vencido',message:'Terminó el plazo para usar esta invitación. Pedí un nuevo enlace al equipo.'},
 revoked:{heading:'Enlace revocado',message:'El equipo desactivó esta invitación. Contactá al dueño para solicitar un nuevo enlace.'},
 used:{heading:'Enlace ya utilizado',message:'Esta invitación de un solo uso ya fue utilizada. Si ya tenés acceso, ingresá a tu cuenta; si no, pedí otro enlace al equipo.'},
 connection:{heading:'No pudimos comprobar la invitación',message:'No pudimos obtener una respuesta válida del servicio. Esto no confirma que el enlace haya vencido. Revisá tu conexión e intentá nuevamente.'},
};

export default function InvitationPage(){
 const [state,setState]=useState<State>({status:'loading'});
 const [attempt,setAttempt]=useState(0);
 const [passwordOpen,setPasswordOpen]=useState(false),[passwordError,setPasswordError]=useState(''),[passwordNotice,setPasswordNotice]=useState(''),[passwordBusy,setPasswordBusy]=useState(false),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[email,setEmail]=useState('');
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
    if(response.status===410){
     const detail=await response.json().catch(()=>null);
     if(!active||controller.signal.aborted)return;
     const reason=detail?.link_status;
     setState({status:reason==='expired'||reason==='revoked'||reason==='used'?reason:'unavailable'});return;
    }
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
 const labels:Record<State['status'],string>={ready:'Enlace activo',expired:'Enlace vencido',revoked:'Enlace revocado',used:'Enlace ya utilizado',loading:'Comprobando enlace',connection:'Estado sin verificar',missing:'Falta el enlace',invalid:'Enlace inválido',pending:'Solicitud pendiente',unavailable:'Enlace no disponible','previous-error':'Volvé a comprobar el enlace'};
 const expiration=state.status==='ready'&&state.info.expires_at?new Date(state.info.expires_at):null;
 async function registerWithPassword(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(state.status!=='ready')return;
  const values=new FormData(event.currentTarget),password=String(values.get('password')||''),confirm=String(values.get('confirm')||'');
  setPasswordError('');setPasswordNotice('');
  if(password!==confirm){setPasswordError('Las contraseñas no coinciden.');return;}
  setPasswordBusy(true);
  try{
   const response=await fetch('/core-api/api/auth/password/invitations/register',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:state.token,email,password,full_name:values.get('full_name')}),referrerPolicy:'no-referrer'});
   const data=await response.json().catch(()=>null);
   if(!response.ok)throw Error(data?.error||'No se pudo crear la cuenta.');
   setPasswordNotice(data?.message||'Revisá tu correo para verificar tu cuenta.');
  }catch(cause){setPasswordError(cause instanceof Error?cause.message:'No se pudo crear la cuenta.');}
  finally{setPasswordBusy(false);}
 }
 return <AccessLayout eyebrow="Scale OS · Acceso de equipo" busy={state.status==='loading'}>
  <div className="grid gap-3">
   <h1 className="text-2xl font-bold tracking-tight text-fore">{notice?.heading||'Invitación al equipo'}</h1>
   <p role="status" aria-live="polite" className="flex flex-wrap items-center gap-2 text-xs text-mute">
    <StateChip tone={state.status==='ready'?'ok':state.status==='loading'?'mute':'bad'}>{labels[state.status]}</StateChip>
    {expiration&&!Number.isNaN(expiration.getTime())?<span className="whitespace-nowrap">Vence: <time dateTime={expiration.toISOString()}>{listDateFull(expiration.toISOString())}</time> · hora de Asunción</span>:null}
   </p>
   {state.status==='ready'?<>
    <p className="text-sm text-mute">Te invitaron a trabajar en este espacio.</p>
    <div className="grid gap-1 rounded-lg border border-ink-600 px-3 py-2">
     <strong className="break-words text-sm text-fore">{state.info.organization_name}</strong>
     <span className="text-xs text-mute">Permiso asignado: <b className="text-fore">{teamRoleLabels[state.info.role]}</b></span>
    </div>
    <p className="text-sm text-mute">{state.info.mode==='single'?'Este enlace habilita una sola cuenta.':'Podés solicitar acceso; el dueño lo aprobará antes de habilitarte.'}</p>
    <p className="text-xs text-mute">Elegí cómo querés verificar tu correo para continuar.</p>
    <div className="grid gap-2">
     <a className="primary login-button" referrerPolicy="no-referrer" href={'/core-api/api/auth/google/start?invite='+encodeURIComponent(state.token)}>Continuar con Google</a>
     {!passwordOpen?<button type="button" className="secondary login-button" onClick={()=>{setPasswordOpen(true);setPasswordError('');setPasswordNotice('');}}>Crear cuenta con correo</button>:
      <form className="grid gap-3" onSubmit={registerWithPassword}>
       <label className="grid gap-1.5 text-xs text-mute">Nombre y apellido<input name="full_name" maxLength={120} autoComplete="name" placeholder="Cómo te llamamos" className="h-11 rounded-lg border border-ink-500 bg-ink-800 px-3 text-base text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 md:h-9 md:text-sm"/></label>
       <label className="grid gap-1.5 text-xs text-mute">Correo<EmailField value={email} onChange={setEmail} required placeholder="tu@correo.com"/></label>
       <PasswordField label="Contraseña" name="password" value={password} onChange={setPassword} autoComplete="new-password" placeholder="8+ caracteres" required minLength={8}/>
       <PasswordField label="Repetí tu contraseña" name="confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" placeholder="Repetí la contraseña" required minLength={8}/>
       <p className="text-[11.5px] text-mute">8+ caracteres; sin requisitos de mayúsculas, números ni símbolos.</p>
       <button className="primary login-button" disabled={passwordBusy}>{passwordBusy?'Creando cuenta…':'Verificar mi correo y continuar'}</button>
       {passwordError?<p className="error" role="alert">{passwordError}</p>:null}
       {passwordNotice?<p className="success" role="status">{passwordNotice}</p>:null}
      </form>}
    </div>
   </>:<div className="grid gap-3" role="status" aria-live="polite">
    <p className="text-sm text-mute">{notice?.message}</p>
    {state.status==='connection'?<button type="button" className="primary login-button" onClick={()=>{setState({status:'loading'});setAttempt(value=>value+1);}}>Reintentar comprobación</button>:null}
   </div>}
   <p className="text-[11.5px] text-mute"><a href="https://app.scaleparaguay.com/" referrerPolicy="no-referrer">{state.status==='pending'?'Consultar mi acceso':'Ir al inicio de sesión'}</a></p>
  </div>
 </AccessLayout>;
}
