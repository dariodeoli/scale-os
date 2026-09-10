"use client";
import {useEffect,useState} from 'react';
import {Dialog} from './dialog';
import {Editor,api} from './operations';
import {ProfilePhoto} from './profile-photo';
type Profile={email:string;full_name?:string|null;photo_url?:string|null;identity_scope?:'personal'|'demo'};
export function MyProfile({profile,close,refresh}:{profile:Profile;close:()=>void;refresh:()=>Promise<void>}){
 const [current,setCurrent]=useState<Profile|null>(null),[error,setError]=useState('');
 useEffect(()=>{let alive=true;void api<{profile:Profile}>('/api/agency/productivity/profile').then(d=>{if(alive)setCurrent(d.profile);}).catch(e=>{if(alive)setError(e instanceof Error?e.message:'No se pudo cargar tu perfil.');});return()=>{alive=false;};},[]);
 const name=current?.full_name||profile.email.split('@')[0];
 async function save(values:Record<string,string>){
  const data=await api<{profile:Profile}>('/api/agency/productivity/profile',values,'PATCH');
  setCurrent(data.profile);window.dispatchEvent(new Event('scale:identity-changed'));await refresh();
 }
 return <Dialog title="Mi perfil" close={close}><div className="my-profile-content">
  {error&&<p className="error" role="alert">{error}</p>}
  {!current&&!error&&<p role="status">Cargando tu perfil…</p>}
  {current&&<><p className="form-note">{current.identity_scope==='demo'?'Tu nombre y foto en este demo. Los cambios no modifican tu perfil en empresas reales.':'Tu nombre y foto personales se comparten entre tus empresas. El cargo, sueldo y acceso se mantienen separados en cada empresa.'}</p>
  <Editor fields={[{key:'full_name',label:'Nombre completo'}]} defaults={{full_name:name}} save={async v=>{await save({full_name:v.full_name});close();}}/>
  <ProfilePhoto photo={current.photo_url||null} name={name} save={async photo=>{await save({...(!current.full_name?{full_name:name}:{}),photo_url:photo});}}/>
  </>}
  <p>Correo de acceso: <strong>{profile.email}</strong></p><p className="form-note">El correo de Google no se modifica desde este formulario.</p>
 </div></Dialog>;
}
