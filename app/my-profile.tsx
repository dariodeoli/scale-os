"use client";
import {Button} from './ui/button';

import {Aviso} from 'owncoding-ui';
import {useEffect,useRef,useState} from 'react';
import {Editor,api} from './operations';
import {PersonPhotoField} from './person-photo';
import {PersonSheet,type SheetTab} from './person-sheet';
import {FotoPerfil} from './foto-perfil';
import {notify} from './feedback';
import {AccountSecurity} from './account-security';
import {LoadingBlock,StateChip} from './ui-v2';
import {MyDataPanel} from './my-data';
import {PRIVACY_NOTICE,PRIVACY_RIGHTS_CHANNEL} from './privacy-notice';

type Profile={email:string;full_name?:string|null;photo_url?:string|null;identity_scope?:'personal'|'demo'|'personal_readonly';google_connected?:boolean};

const CARD='grid grid-cols-[minmax(0,1fr)] gap-2 rounded-xl border border-ink-600 bg-ink-800 p-4';
const KICKER='font-mono text-[10px] uppercase tracking-[.13em] text-mute';
const FOCUS='focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-ink-800';
const DISCLOSURE=`min-h-11 cursor-pointer list-none rounded-lg px-2 py-2 text-sm font-medium text-fore transition-colors hover:bg-ink-700 ${FOCUS}`;
const ACTION=`min-h-11 ${FOCUS}`;
const EDITOR_CONTROLS='grid gap-2 px-2 pb-3 pt-2 [&_button]:min-h-11 [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-brand [&_button]:focus-visible:ring-offset-2 [&_button]:focus-visible:ring-offset-ink-800';

// Mi perfil (issue #46): mismo comportamiento y textos, superficie v2. Los
// editores siguen siendo los compartidos (`PersonSheet`, `Editor`, `PersonPhotoField`).
export function MyProfile({profile,close,refresh}:{profile:Profile;close:()=>void;refresh:()=>Promise<void>}){
 const [current,setCurrent]=useState<Profile|null>(null),[error,setError]=useState(''),[warning,setWarning]=useState(''),[retry,setRetry]=useState(0);
 const [photoSaving,setPhotoSaving]=useState(false),[dataOpen,setDataOpen]=useState(false);
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{let alive=true;setError('');void api<{profile:Profile}>('/api/agency/productivity/profile').then(d=>{if(alive)setCurrent(d.profile);}).catch(e=>{if(alive)setError(e instanceof Error?e.message:'No se pudo cargar tu perfil.');});return()=>{alive=false;};},[retry]);
 const localPart=profile.email.split('@')[0];
 const name=current?.full_name||(!/^(?:persona|visitante)[-_]/i.test(localPart)?localPart:'Integrante');
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
 const identity=current?<section className={CARD} data-profile-section="identity" aria-labelledby="my-profile-identity-title">
    <p className={KICKER}>{current.identity_scope==='demo'?'Perfil del demo':'Identidad personal'}</p>
    <div className="flex min-w-0 items-center gap-3">
     <FotoPerfil nombre={name} foto={current.photo_url} tamano="2xl"/>
     <div className="min-w-0">
      <h3 id="my-profile-identity-title" className="truncate text-[15px] font-semibold text-fore">{name}</h3>
      {current.identity_scope==='demo'?<p className="break-words text-[12px] text-mute">Acceso de demostración · sin correo real</p>:<p className="break-words text-[12px] text-mute">{current.email||profile.email}</p>}
     </div>
    </div>
    <p className="text-[11.5px] text-mute">{current.identity_scope==='demo'?'Los cambios de este perfil no modifican tus empresas reales.':'Tu correo de acceso se mantiene protegido. Nombre y foto se comparten entre tus empresas.'}</p>
   </section>:null;
 const profileTab=current?<>
   {identity}
   {current.identity_scope==='personal_readonly'?<div className={CARD} data-profile-section="readonly">
    <strong className="text-[13.5px] text-fore">Edición disponible en tu empresa real</strong>
    <p className="text-xs text-mute">Este perfil está unificado con tus empresas. Seleccioná tu empresa real para cambiar el nombre o la foto; la demo no modifica tus datos personales.</p>
   </div>:<section className={`${CARD} gap-3`} data-profile-section="edit" aria-labelledby="my-profile-edit-title">
    <p id="my-profile-edit-title" className={KICKER}>Editar perfil</p>
    <div data-profile-section="photo" className="grid min-w-0 gap-2">
     {/* Misma foto que la ficha de Equipo: un solo componente para todas las personas. */}
     <PersonPhotoField photo={current.photo_url||null} name={name} save={async photo=>{setPhotoSaving(true);try{await save({...(!current.full_name?{full_name:name}:{}),photo_url:photo});}finally{if(mounted.current)setPhotoSaving(false);}}}/>
     <p className="text-[11.5px] text-mute">Usamos la foto para identificarte ante tu equipo; podés quitarla cuando quieras.</p>
    </div>
    <div data-profile-section="name" className={EDITOR_CONTROLS}>
     <Editor fields={[{key:'full_name',label:'Nombre completo'}]} defaults={{full_name:name}} columns={false} label="Guardar nombre" save={async v=>{await save({full_name:v.full_name},true);}}/>
     <p className="text-[11.5px] text-mute">Al guardar el nombre, esta ventana se cierra. La foto se guarda por separado.</p>
    </div>
   </section>}
   {warning?<p className="text-xs text-warn">{warning}</p>:null}
  </>:null;
 const accessTab=current&&current.identity_scope!=='demo'?<section className={`${CARD} gap-1`} data-profile-section="account" aria-labelledby="my-profile-account-title">
    <p id="my-profile-account-title" className={KICKER}>Acceso y seguridad</p>
    <div className="grid gap-2 border-b border-ink-600 px-2 py-3">
     <div className="flex flex-wrap items-center justify-between gap-2">
      <strong className="text-[13.5px] text-fore">Google</strong>
      {current.google_connected?<StateChip tone="ok">Conectado</StateChip>:<a className={`secondary ${ACTION}`} href="/core-api/api/auth/google/start?connect=1">Conectar Google</a>}
     </div>
     <p className="max-w-prose text-xs text-mute">Usá Google para ingresar a esta cuenta con el mismo correo. Google puede actualizar tu nombre y foto.</p>
    </div>
    <div data-profile-section="access" className="px-2 pb-3 pt-2"><AccountSecurity onClosed={close}/></div>
   </section>:null;
 const dataTab=<section className={`${CARD} gap-1`} data-profile-section="data" aria-labelledby="my-profile-data-title">
    <p id="my-profile-data-title" className={KICKER}>Mis datos y privacidad</p>
    <div className="grid gap-2 px-2 py-3">
     <p className="max-w-prose text-xs leading-5 text-mute">Aviso de Privacidad {PRIVACY_NOTICE.version} · {PRIVACY_NOTICE.fechaLabel}. Desde «Mis datos» podés ver el resumen y las finalidades, descargar una copia, pedir rectificación, supresión u oposición y revocar consentimientos. La respuesta llega dentro de {PRIVACY_RIGHTS_CHANNEL.slaDias} días corridos.</p>
     <div className="flex flex-wrap items-center gap-2">
      <Button className={`secondary ${ACTION}`} type="button" onClick={()=>setDataOpen(true)}>Abrir Mis datos</Button>
      <a className={`text-button ${ACTION}`} href="/privacidad">Política de Privacidad</a>
     </div>
    </div>
   </section>;
 // Misma ficha que Equipo, en modo propio: perfil, acceso/seguridad y mis datos.
 // «Remuneración» no existe en este modo (ni su contenido ni sus datos).
 const tabs:SheetTab[]=[{id:'perfil',label:'Perfil',content:profileTab}];
 if(accessTab)tabs.push({id:'acceso',label:'Acceso',content:accessTab});
 tabs.push({id:'datos',label:'Mis datos',content:dataTab});
 return <>
  <PersonSheet mode="self" title="Mi perfil" close={close} busy={photoSaving} tabs={current?tabs:[{id:'perfil',label:'Perfil',content:<div className="grid grid-cols-[minmax(0,1fr)] gap-4">
   {error?<Aviso tono="error" como="div" className="grid justify-items-start gap-2"><p className="break-words text-sm">{error}</p><Button className={`secondary ${ACTION}`} type="button" onClick={()=>setRetry(value=>value+1)}>Reintentar carga</Button></Aviso>:null}
   {!error?<LoadingBlock label="Cargando tu perfil…" lines={3}/>:null}
  </div>}]}/>
  {dataOpen?<MyDataPanel profile={{email:current?.email||profile.email,full_name:current?.full_name||profile.full_name||null}} close={()=>setDataOpen(false)}/>:null}
 </>;
}
