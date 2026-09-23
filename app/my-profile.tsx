"use client";
import {useEffect,useRef,useState} from 'react';
import {Dialog} from './dialog';
import {Editor,api} from './operations';
import {ProfilePhoto} from './profile-photo';
import {notify} from './feedback';
import {AccountSecurity} from './account-security';
import {LoadingBlock,StateChip} from './ui-v2';

type Profile={email:string;full_name?:string|null;photo_url?:string|null;identity_scope?:'personal'|'demo'|'personal_readonly';google_connected?:boolean};

const CARD='grid grid-cols-[minmax(0,1fr)] gap-2 rounded-xl border border-ink-600 bg-ink-800 p-4';
const KICKER='font-mono text-[10px] uppercase tracking-[.13em] text-mute';

// Mi perfil (issue #46): mismo comportamiento y textos, superficie v2. Los
// editores siguen siendo los compartidos (`Dialog`, `Editor`, `ProfilePhoto`).
export function MyProfile({profile,close,refresh}:{profile:Profile;close:()=>void;refresh:()=>Promise<void>}){
 const [current,setCurrent]=useState<Profile|null>(null),[error,setError]=useState(''),[warning,setWarning]=useState(''),[retry,setRetry]=useState(0);
 const [photoSaving,setPhotoSaving]=useState(false),[securityOpen,setSecurityOpen]=useState(false);
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
 return <Dialog title="Mi perfil" close={close} busy={photoSaving}><div className="grid grid-cols-[minmax(0,1fr)] gap-4">
  {error?<div className={`${CARD} border-bad/40`} role="alert"><p className="break-words text-sm text-bad">{error}</p><button className="secondary justify-self-start" type="button" onClick={()=>setRetry(value=>value+1)}>Reintentar carga</button></div>:null}
  {!current&&!error?<LoadingBlock label="Cargando tu perfil…" lines={3}/>:null}
  {current?<>
   <section className={CARD} data-profile-section="identity">
    <p className={KICKER}>Identidad</p>
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]"><dt className="text-mute">Correo de acceso</dt><dd className="min-w-0 break-words text-fore">{current.email||profile.email}</dd></dl>
    <p className="text-[11.5px] text-mute">Tu correo de acceso no se modifica desde acá.</p>
   </section>
   {current.identity_scope==='personal_readonly'?<div className={CARD} data-profile-section="readonly">
    {current.photo_url?<img className="rounded-full" src={current.photo_url} alt={`Foto de ${name}`} width={64} height={64}/>:null}
    <p className="text-xs text-mute">Tu perfil está unificado con tus empresas. Para cambiar el nombre o la foto, seleccioná tu empresa real; la demo no modifica tus datos personales.</p>
   </div>:<>
    <details className={CARD} data-profile-section="photo"><summary className="cursor-pointer text-sm text-fore">Foto de perfil <span className="text-[11px] text-mute">Opcional</span></summary>
     <div className="mt-3">
      <ProfilePhoto photo={current.photo_url||null} name={name} save={async photo=>{setPhotoSaving(true);try{await save({...(!current.full_name?{full_name:name}:{}),photo_url:photo});}finally{if(mounted.current)setPhotoSaving(false);}}}/>
     </div>
    </details>
    <section className={CARD} data-profile-section="name" aria-labelledby="my-profile-data-title">
     <h4 id="my-profile-data-title" className="text-[13.5px] font-semibold text-fore">Datos personales</h4>
     <Editor fields={[{key:'full_name',label:'Nombre completo'}]} defaults={{full_name:name}} columns={false} label="Guardar nombre" save={async v=>{await save({full_name:v.full_name},true);}}/>
     <p className="text-[11.5px] text-mute">Al guardar el nombre, esta ventana se cierra. La foto se guarda por separado.</p>
    </section>
   </>}
   {current.identity_scope!=='demo'?<>
    <div className={CARD} data-profile-section="google">
     <strong className="text-[13.5px] text-fore">Acceso con Google</strong>
     <p className="text-xs text-mute">Podés usar Google para entrar a esta misma cuenta si elegís el mismo correo. Google también puede actualizar tu nombre y foto.</p>
     {current.google_connected?<p role="status" className="justify-self-start"><StateChip tone="ok">Conectado con Google</StateChip></p>:<a className="secondary justify-self-start" href="/core-api/api/auth/google/start?connect=1">Conectar Google</a>}
    </div>
    <details className={CARD} data-profile-section="access" onToggle={event=>setSecurityOpen(event.currentTarget.open)}><summary className="cursor-pointer text-sm text-fore">Seguridad de cuenta <span className="text-[11px] text-mute">Opcional</span></summary>
     {securityOpen?<div className="mt-3"><AccountSecurity onClosed={close}/></div>:null}
    </details>
   </>:null}
   <div className={CARD} data-profile-section="scope">
    <strong className="text-[13.5px] text-fore">{current.identity_scope==='demo'?'Solo en este demo':'Identidad personal'}</strong>
    <p className="text-xs text-mute">{current.identity_scope==='demo'?'Tu nombre y foto en este demo. Los cambios no modifican tu perfil en empresas reales.':'Tu nombre y foto personales se comparten entre tus empresas. El cargo, sueldo y acceso se mantienen separados en cada empresa.'}</p>
   </div>
   {warning?<p className="text-xs text-warn" role="status">{warning}</p>:null}
  </>:null}
 </div></Dialog>;
}
