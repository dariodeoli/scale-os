"use client";
import {useState} from 'react';
import {Dialog} from './dialog';
import {Editor,api} from './operations';
import {ProfilePhoto} from './profile-photo';
type Profile={email:string;full_name?:string|null;photo_url?:string|null};
export function MyProfile({profile,close,refresh}:{profile:Profile;close:()=>void;refresh:()=>Promise<void>}){
 const [name,setName]=useState(profile.full_name||profile.email.split('@')[0]);
 return <Dialog title="Mi perfil" close={close}><p className="form-note">Tu nombre y foto en esta empresa. Los permisos solo los cambia un administrador.</p>
  <Editor fields={[{key:'full_name',label:'Nombre completo'}]} defaults={{full_name:name}} save={async v=>{await api('/api/agency/productivity/profile',v,'PATCH');setName(v.full_name);await refresh();}}/>
  <ProfilePhoto photo={profile.photo_url||null} name={name} save={async photo=>{await api('/api/agency/productivity/profile',{full_name:name,photo_url:photo},'PATCH');await refresh();}}/>
  <p>Correo de acceso: <strong>{profile.email}</strong></p><p className="form-note">El correo de Google no se modifica desde este formulario.</p>
 </Dialog>;
}
