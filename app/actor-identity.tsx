"use client";
import {listDateFull} from './list-format';
import {FotoPerfil} from './foto-perfil';
import './actor-identity.css';

export type ActorIdentityProps={name?:string|null;photoUrl?:string|null;verified?:boolean;imported?:boolean;timestamp?:string|null};
export {actorInitials,safePhoto} from './identity-photo-policy';
import {safePhoto} from './identity-photo-policy';
/**
 * Correo técnico de una demo (`…@demo.example.invalid`, `…@scale-demo.example.invalid`):
 * identificador interno del fixture, nunca una identidad visible (#151).
 */
export function isTechnicalDemoEmail(value?:string|null){
 return /^[^@\s]+@(?:scale-)?demo\.example\.invalid$/i.test(String(value||'').trim());
}
/**
 * Nombre visible de una persona: vacío cae al texto base; un correo técnico del
 * demo se reemplaza por una etiqueta humana en vez de mostrarse crudo (#151).
 */
export function personDisplayName(name?:string|null,emptyLabel='Sistema'){
 const value=name?.trim();
 if(!value)return emptyLabel;
 return isTechnicalDemoEmail(value)?'Persona del demo':value;
}
export function ActorIdentity({name,photoUrl,verified=false,imported=false,timestamp}:ActorIdentityProps){
 const label=personDisplayName(name,imported?'Autor importado':'Sistema');
 const photo=verified&&!imported?safePhoto(photoUrl):'';
 // Keying the image state to both author and URL also retries a changed photo.
 const date=timestamp?new Date(timestamp):null;
 const validDate=date&&!Number.isNaN(date.getTime())?date:null;
 return <span className="actor-identity"><ActorAvatar key={`${label}\n${photo}`} name={label} photo={photo}/><span className="actor-identity-details"><span className="actor-identity-name" title={label}>{label}</span>{validDate&&<time className="actor-identity-time" dateTime={validDate.toISOString()}>{listDateFull(validDate.toISOString())}</time>}{imported&&<span className="actor-identity-source">Autor de registro importado</span>}</span></span>;
}
/** Avatar de una identidad: el objeto único de foto de perfil (#107). */
export function ActorAvatar({name,photo}:{name:string;photo:string}){
 return <FotoPerfil nombre={name} foto={photo} tamano="lg"/>;
}
