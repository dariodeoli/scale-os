"use client";
import {useEffect,useRef,useState} from 'react';
import {Dialog} from './dialog';
import {Editor,api} from './operations';
import {ProfilePhoto} from './profile-photo';
import {notify} from './feedback';
import {AccountSecurity} from './account-security';
import './my-profile.css';
type Profile={email:string;full_name?:string|null;photo_url?:string|null;identity_scope?:'personal'|'demo'|'personal_readonly'};
export function MyProfile({profile,close,refresh}:{profile:Profile;close:()=>void;refresh:()=>Promise<void>}){
 const [current,setCurrent]=useState<Profile|null>(null),[error,setError]=useState(''),[warning,setWarning]=useState(''),[retry,setRetry]=useState(0);
 const [photoSaving,setPhotoSaving]=useState(false);
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{let alive=true;setError('');void api<{profile:Profile}>('/api/agency/productivity/profile').then(d=>{if(alive)setCurrent(d.profile);}).catch(e=>{if(alive)setError(e instanceof Error?e.message:'No se pudo cargar tu perfil.');});return()=>{alive=false;};},[retry]);
 const name=current?.full_name||profile.email.split('@')[0];
 async function save(values:Record<string,string>,closeOnSuccess=false){
  const data=await api<{profile:Profile}>('/api/agency/productivity/profile',values,'PATCH');
  if(!mounted.current)return;
  setCurrent(data.profile);setWarning('');window.dispatchEvent(new Event('scale:identity-changed'));
  if(closeOnSuccess)close();
  // Persistence succeeded. A later session refresh must not make either form
  // report a failed save or keep the name editor open waiting on the network.
  try{await refresh();}catch{
   const message='Tu perfil se guardó, pero no se pudo actualizar el resto del panel. Recargá la página para ver los cambios.';
   if(mounted.current)setWarning(message);
   notify({tone:'warning',message});
  }
 }
 return <Dialog title="Mi perfil" close={close} busy={photoSaving}><div className="my-profile-content my-profile-editor">
  {error&&<div className="my-profile-load-error" role="alert"><p>{error}</p><button className="secondary" type="button" onClick={()=>setRetry(value=>value+1)}>Reintentar carga</button></div>}
  {!current&&!error&&<p role="status">Cargando tu perfil…</p>}
  {current&&<><div className="my-profile-identity">
   <h3>{name}</h3>
   <dl className="my-profile-login"><dt>Correo de acceso</dt><dd>{current.email||profile.email}</dd></dl>
   <p className="my-profile-help">Tu correo de acceso no se modifica desde acá.</p>
  </div>
  {current.identity_scope==='personal_readonly'?<div className="my-profile-photo">{current.photo_url&&<img src={current.photo_url} alt={`Foto de ${name}`} width={96} height={96} style={{borderRadius:'50%',objectFit:'cover'}}/>}<p>Tu perfil está unificado con tus empresas. Para cambiar el nombre o la foto, seleccioná tu empresa real; la demo no modifica tus datos personales.</p></div>:<><div className="my-profile-photo">
   <ProfilePhoto photo={current.photo_url||null} name={name} save={async photo=>{setPhotoSaving(true);try{await save({...(!current.full_name?{full_name:name}:{}),photo_url:photo});}finally{if(mounted.current)setPhotoSaving(false);}}}/>
  </div>
  <div className="my-profile-name">
   <Editor fields={[{key:'full_name',label:'Nombre completo'}]} defaults={{full_name:name}} columns={false} label="Guardar nombre" save={async v=>{await save({full_name:v.full_name},true);}}/>
   <p className="my-profile-help">Al guardar el nombre, esta ventana se cierra. La foto se guarda por separado.</p>
  </div></>}
  {current.identity_scope!=='demo'&&<div className="my-profile-google"><strong>Acceso con Google</strong><p>Podés usar Google para entrar a esta misma cuenta si elegís el mismo correo. Google también puede actualizar tu nombre y foto.</p><a className="secondary" href="/core-api/api/auth/google/start?connect=1">Conectar Google</a></div>}
  {current.identity_scope!=='demo'&&<AccountSecurity email={current.email||profile.email} onClosed={close}/>}
  <div className="my-profile-scope"><strong>{current.identity_scope==='demo'?'Solo en este demo':'Identidad personal'}</strong><p>{current.identity_scope==='demo'?'Tu nombre y foto en este demo. Los cambios no modifican tu perfil en empresas reales.':'Tu nombre y foto personales se comparten entre tus empresas. El cargo, sueldo y acceso se mantienen separados en cada empresa.'}</p></div>
  {warning&&<p className="my-profile-warning" role="status">{warning}</p>}
  </>}
 </div></Dialog>;
}
